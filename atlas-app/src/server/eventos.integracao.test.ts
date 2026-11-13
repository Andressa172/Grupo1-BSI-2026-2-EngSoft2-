// Testes de integração de RF_F9 (Alocar Recursos para Eventos), com PostgreSQL de verdade,
// passando pela rota. Só rodam com TEST_DATABASE_URL definida.
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { prepararBancoDeTeste, TEM_BANCO_DE_TESTE } from './test-utils/bancoDeTeste';

type Rota = typeof import('../app/api/eventos/route');
type RotaId = typeof import('../app/api/eventos/[id]/route');
let rota: Rota;
let rotaId: RotaId;
let limpar: () => Promise<void>;

const json = (corpo: unknown) => new Request('http://x', { method: 'POST', body: JSON.stringify(corpo) });
const jsonPut = (corpo: unknown) => new Request('http://x', { method: 'PUT', body: JSON.stringify(corpo) });
const get = (qs = '') => rota.GET(new Request(`http://x/api/eventos${qs}`));
const put = (id: number, corpo: unknown) => rotaId.PUT(jsonPut(corpo), { params: Promise.resolve({ id: String(id) }) });
const del = (id: number) => rotaId.DELETE(new Request('http://x', { method: 'DELETE' }), { params: Promise.resolve({ id: String(id) }) });

async function sql<T extends Record<string, unknown>>(texto: string, p: unknown[] = []): Promise<T[]> {
  const { Database } = await import('./db/Database');
  return (await Database.getInstancia().query(texto, p)).rows as T[];
}
const estoque = async (id: number) => Number((await sql<{ q: number }>('SELECT quantidade_estoque AS q FROM produto WHERE id=$1', [id]))[0].q);
const contar = async (tabela: string) => Number((await sql<{ n: string }>(`SELECT count(*) AS n FROM ${tabela}`))[0].n);

const amanha = () => {
  const d = new Date();
  d.setDate(d.getDate() + 1);
  return `${String(d.getDate()).padStart(2, '0')}/${String(d.getMonth() + 1).padStart(2, '0')}/${d.getFullYear()}`;
};

describe.skipIf(!TEM_BANCO_DE_TESTE)('Eventos - integração (PostgreSQL)', () => {
  let arroz: number;

  beforeAll(async () => {
    ({ limpar } = await prepararBancoDeTeste());
    rota = await import('../app/api/eventos/route');
    rotaId = await import('../app/api/eventos/[id]/route');
    arroz = (await sql<{ id: number }>("INSERT INTO produto (nome,categoria,unidade_medida,quantidade_estoque) VALUES ('Arroz','Alimento','kg',200) RETURNING id"))[0].id;
  });
  afterAll(async () => {
    await limpar();
  });

  it('fluxo básico: cria evento, aloca recurso produto e desconta do estoque', async () => {
    const r = await rota.POST(
      json({ nome: 'Festa junina', data: amanha(), recursos: [{ tipo: 'PRODUTO', produtoId: arroz, quantidade: 4 }] })
    );
    expect(r.status).toBe(201);
    expect(await estoque(arroz)).toBe(196);
    expect(await contar('evento')).toBe(1);
    expect(await contar('alocacao_recurso')).toBe(1);
    const mov = await sql<{ tipo: string }>('SELECT tipo FROM movimentacao_estoque');
    expect(mov.every((m) => m.tipo === 'SAIDA')).toBe(true);
  });

  it('recurso financeiro não mexe no estoque', async () => {
    const antes = await estoque(arroz);
    const r = await rota.POST(json({ nome: 'Campanha', data: amanha(), recursos: [{ tipo: 'FINANCEIRO', valor: 500 }] }));
    expect(r.status).toBe(201);
    expect(await estoque(arroz)).toBe(antes);
  });

  it('estoque insuficiente: nada é gravado (evento e recurso), estoque intacto', async () => {
    const antes = { e: await estoque(arroz), ev: await contar('evento'), a: await contar('alocacao_recurso') };
    const r = await rota.POST(
      json({ nome: 'Evento grande', data: amanha(), recursos: [{ tipo: 'PRODUTO', produtoId: arroz, quantidade: 999 }] })
    );
    expect(r.status).toBe(400);
    expect(await estoque(arroz)).toBe(antes.e);
    expect(await contar('evento')).toBe(antes.ev);
    expect(await contar('alocacao_recurso')).toBe(antes.a);
  });

  it('data no passado é permitida (cadastro retroativo)', async () => {
    const r = await rota.POST(json({ nome: 'Evento velho', data: '01/01/2000', recursos: [{ tipo: 'FINANCEIRO', valor: 10 }] }));
    expect(r.status).toBe(201);
  });

  it('sem recursos -> 400', async () => {
    const r = await rota.POST(json({ nome: 'Evento vazio', data: amanha(), recursos: [] }));
    expect(r.status).toBe(400);
    expect((await r.json()).erros).toHaveProperty('recursos');
  });

  it('consulta com filtro de nome e período', async () => {
    const todos = (await (await get()).json()).eventos as { nome: string }[];
    expect(todos.length).toBeGreaterThanOrEqual(2);
    const porNome = (await (await get('?nome=junina')).json()).eventos as { nome: string }[];
    expect(porNome).toHaveLength(1);
    expect(porNome[0].nome).toBe('Festa junina');
    expect((await (await get('?dataInicial=01/01/2999')).json()).eventos).toEqual([]);
  });

  it('filtro de data malicioso -> 400', async () => {
    expect((await get('?dataInicial=2026-01-01%27--')).status).toBe(400);
  });

  it('corpo inválido nunca causa 500', async () => {
    for (const l of [{}, { nome: 'x', data: amanha(), recursos: 'y' }, { nome: 'x', data: amanha(), recursos: [null] }]) {
      const r = await rota.POST(json(l));
      expect(r.status, JSON.stringify(l)).toBeLessThan(500);
    }
  });

  describe('alteração e exclusão', () => {
    it('alterar: estorna o recurso antigo e aloca o novo', async () => {
      const criado = await rota.POST(json({ nome: 'Para editar', data: amanha(), recursos: [{ tipo: 'PRODUTO', produtoId: arroz, quantidade: 2 }] }));
      const { id } = await criado.json();
      const antesEstoque = await estoque(arroz);

      const r = await put(id, { nome: 'Editado', data: amanha(), recursos: [{ tipo: 'PRODUTO', produtoId: arroz, quantidade: 5 }] });
      expect(r.status).toBe(200);
      // devolveu os 2 antigos e descontou 5 novos: líquido -3
      expect(await estoque(arroz)).toBe(antesEstoque - 3);
      expect(await contar('alocacao_recurso')).toBeGreaterThan(0);

      const lista = (await (await get()).json()).eventos as { id: number; nome: string }[];
      expect(lista.find((e) => e.id === id)?.nome).toBe('Editado');
    });

    it('alterar com estoque insuficiente: mantém o estado antigo (rollback)', async () => {
      const criado = await rota.POST(json({ nome: 'Estável', data: amanha(), recursos: [{ tipo: 'PRODUTO', produtoId: arroz, quantidade: 1 }] }));
      const { id } = await criado.json();
      const antesEstoque = await estoque(arroz);

      const r = await put(id, { nome: 'Estável', data: amanha(), recursos: [{ tipo: 'PRODUTO', produtoId: arroz, quantidade: 999999 }] });
      expect(r.status).toBe(400);
      // restaurou o 1 antigo antes de tentar o novo, e o rollback da transação desfez a restauração também
      expect(await estoque(arroz)).toBe(antesEstoque);
      const lista = (await (await get()).json()).eventos as { id: number; recursos: unknown[] }[];
      expect(lista.find((e) => e.id === id)?.recursos).toHaveLength(1);
    });

    it('alterar evento inexistente -> 404', async () => {
      const r = await put(999999, { nome: 'X', data: amanha(), recursos: [{ tipo: 'FINANCEIRO', valor: 10 }] });
      expect(r.status).toBe(404);
    });

    it('excluir: estorna o estoque e remove o evento (cascata remove os recursos)', async () => {
      const criado = await rota.POST(json({ nome: 'Para excluir', data: amanha(), recursos: [{ tipo: 'PRODUTO', produtoId: arroz, quantidade: 3 }] }));
      const { id } = await criado.json();
      const antesEstoque = await estoque(arroz);

      const r = await del(id);
      expect(r.status).toBe(200);
      expect(await estoque(arroz)).toBe(antesEstoque + 3);
      const lista = (await (await get()).json()).eventos as { id: number }[];
      expect(lista.some((e) => e.id === id)).toBe(false);
    });

    it('excluir evento inexistente -> 404', async () => {
      expect((await del(999999)).status).toBe(404);
    });
  });
});

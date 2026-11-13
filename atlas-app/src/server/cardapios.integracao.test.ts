// Testes de integração de RF_F10 (Criar Cardápio Diário), com PostgreSQL de verdade,
// passando pela rota. Só rodam com TEST_DATABASE_URL definida.
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { prepararBancoDeTeste, TEM_BANCO_DE_TESTE } from './test-utils/bancoDeTeste';

type Rota = typeof import('../app/api/cardapios/route');
type RotaId = typeof import('../app/api/cardapios/[id]/route');
let rota: Rota;
let rotaId: RotaId;
let limpar: () => Promise<void>;

const json = (corpo: unknown) => new Request('http://x', { method: 'POST', body: JSON.stringify(corpo) });
const jsonPut = (corpo: unknown) => new Request('http://x', { method: 'PUT', body: JSON.stringify(corpo) });
const get = (qs = '') => rota.GET(new Request(`http://x/api/cardapios${qs}`));
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
const depoisDeAmanha = () => {
  const d = new Date();
  d.setDate(d.getDate() + 2);
  return `${String(d.getDate()).padStart(2, '0')}/${String(d.getMonth() + 1).padStart(2, '0')}/${d.getFullYear()}`;
};
const emDias = (n: number) => {
  const d = new Date();
  d.setDate(d.getDate() + n);
  return `${String(d.getDate()).padStart(2, '0')}/${String(d.getMonth() + 1).padStart(2, '0')}/${d.getFullYear()}`;
};

describe.skipIf(!TEM_BANCO_DE_TESTE)('Cardápios - integração (PostgreSQL)', () => {
  let arroz: number;
  let materialEscolar: number;

  beforeAll(async () => {
    ({ limpar } = await prepararBancoDeTeste());
    rota = await import('../app/api/cardapios/route');
    rotaId = await import('../app/api/cardapios/[id]/route');
    arroz = (await sql<{ id: number }>("INSERT INTO produto (nome,categoria,unidade_medida,quantidade_estoque) VALUES ('Arroz','Alimento','kg',200) RETURNING id"))[0].id;
    materialEscolar = (await sql<{ id: number }>("INSERT INTO produto (nome,categoria,unidade_medida,quantidade_estoque) VALUES ('Caderno','Material','kit',20) RETURNING id"))[0].id;
  });
  afterAll(async () => {
    await limpar();
  });

  it('fluxo básico: cria cardápio e desconta estoque do alimento', async () => {
    const r = await rota.POST(json({ data: amanha(), tipoRefeicao: 'ALMOCO', itens: [{ produtoId: arroz, quantidadeUtilizada: 3 }] }));
    expect(r.status).toBe(201);
    expect(await estoque(arroz)).toBe(197);
    expect(await contar('cardapio_diario')).toBe(1);
    expect(await contar('item_cardapio')).toBe(1);
  });

  it('não permite incluir produto que não é alimento (categoria Material)', async () => {
    const antesEstoque = await estoque(materialEscolar);
    const antesCardapio = await contar('cardapio_diario');
    const r = await rota.POST(
      json({ data: depoisDeAmanha(), tipoRefeicao: 'LANCHE', itens: [{ produtoId: materialEscolar, quantidadeUtilizada: 1 }] })
    );
    expect(r.status).toBe(400);
    expect((await r.json()).erros).toHaveProperty('item.0.produtoId');
    expect(await estoque(materialEscolar)).toBe(antesEstoque);
    expect(await contar('cardapio_diario')).toBe(antesCardapio);
  });

  it('duplicidade: mesma data e tipo de refeição -> 400, nada gravado', async () => {
    const antes = await contar('cardapio_diario');
    const r = await rota.POST(json({ data: amanha(), tipoRefeicao: 'ALMOCO', itens: [{ produtoId: arroz, quantidadeUtilizada: 1 }] }));
    expect(r.status).toBe(400);
    expect((await r.json()).erros).toHaveProperty('data');
    expect(await contar('cardapio_diario')).toBe(antes);
  });

  it('estoque insuficiente: nada é gravado', async () => {
    const antes = { e: await estoque(arroz), c: await contar('cardapio_diario') };
    const r = await rota.POST(json({ data: depoisDeAmanha(), tipoRefeicao: 'JANTAR', itens: [{ produtoId: arroz, quantidadeUtilizada: 999 }] }));
    expect(r.status).toBe(400);
    expect(await estoque(arroz)).toBe(antes.e);
    expect(await contar('cardapio_diario')).toBe(antes.c);
  });

  it('data no passado é permitida (cadastro retroativo)', async () => {
    const r = await rota.POST(json({ data: '01/01/2000', tipoRefeicao: 'CAFE_DA_MANHA', itens: [{ produtoId: arroz, quantidadeUtilizada: 1 }] }));
    expect(r.status).toBe(201);
  });

  it('consulta com filtro de tipo de refeição e período', async () => {
    const todos = (await (await get()).json()).cardapios as { tipoRefeicao: string }[];
    expect(todos.length).toBeGreaterThanOrEqual(1);
    const almoco = (await (await get('?tipoRefeicao=ALMOCO')).json()).cardapios as { tipoRefeicao: string }[];
    expect(almoco.every((c) => c.tipoRefeicao === 'ALMOCO')).toBe(true);
    expect((await (await get('?dataInicial=01/01/2999')).json()).cardapios).toEqual([]);
  });

  it('a lista de produtos devolvida inclui a categoria (para o filtro de alimentos na tela)', async () => {
    const produtos = (await (await get()).json()).produtos as { categoria: string }[];
    expect(produtos.some((p) => p.categoria === 'Alimento')).toBe(true);
  });

  describe('alteração e exclusão', () => {
    it('alterar: estorna o item antigo e registra o novo', async () => {
      const criado = await rota.POST(json({ data: emDias(10), tipoRefeicao: 'ALMOCO', itens: [{ produtoId: arroz, quantidadeUtilizada: 2 }] }));
      const { id } = await criado.json();
      const antesEstoque = await estoque(arroz);

      const r = await put(id, { data: emDias(10), tipoRefeicao: 'ALMOCO', itens: [{ produtoId: arroz, quantidadeUtilizada: 5 }] });
      expect(r.status).toBe(200);
      // devolveu os 2 antigos e descontou 5 novos: líquido -3
      expect(await estoque(arroz)).toBe(antesEstoque - 3);

      const lista = (await (await get()).json()).cardapios as { id: number; itens: { quantidadeUtilizada: number }[] }[];
      expect(lista.find((c) => c.id === id)?.itens[0].quantidadeUtilizada).toBe(5);
    });

    it('alterar mantendo a mesma data/tipo não conflita consigo mesmo', async () => {
      const criado = await rota.POST(json({ data: emDias(11), tipoRefeicao: 'JANTAR', itens: [{ produtoId: arroz, quantidadeUtilizada: 1 }] }));
      const { id } = await criado.json();
      const r = await put(id, { data: emDias(11), tipoRefeicao: 'JANTAR', itens: [{ produtoId: arroz, quantidadeUtilizada: 2 }] });
      expect(r.status).toBe(200);
    });

    it('alterar para uma data/tipo já usada por outro cardápio -> 400', async () => {
      await rota.POST(json({ data: emDias(12), tipoRefeicao: 'LANCHE', itens: [{ produtoId: arroz, quantidadeUtilizada: 1 }] }));
      const outro = await rota.POST(json({ data: emDias(13), tipoRefeicao: 'LANCHE', itens: [{ produtoId: arroz, quantidadeUtilizada: 1 }] }));
      const { id } = await outro.json();

      const r = await put(id, { data: emDias(12), tipoRefeicao: 'LANCHE', itens: [{ produtoId: arroz, quantidadeUtilizada: 1 }] });
      expect(r.status).toBe(400);
      expect((await r.json()).erros).toHaveProperty('data');
    });

    it('alterar cardápio inexistente -> 404', async () => {
      const r = await put(999999, { data: emDias(14), tipoRefeicao: 'ALMOCO', itens: [{ produtoId: arroz, quantidadeUtilizada: 1 }] });
      expect(r.status).toBe(404);
    });

    it('excluir: estorna o estoque e remove o cardápio (cascata remove os itens)', async () => {
      const criado = await rota.POST(json({ data: emDias(15), tipoRefeicao: 'ALMOCO', itens: [{ produtoId: arroz, quantidadeUtilizada: 3 }] }));
      const { id } = await criado.json();
      const antesEstoque = await estoque(arroz);

      const r = await del(id);
      expect(r.status).toBe(200);
      expect(await estoque(arroz)).toBe(antesEstoque + 3);
      const lista = (await (await get()).json()).cardapios as { id: number }[];
      expect(lista.some((c) => c.id === id)).toBe(false);
    });

    it('excluir cardápio inexistente -> 404', async () => {
      expect((await del(999999)).status).toBe(404);
    });
  });
});

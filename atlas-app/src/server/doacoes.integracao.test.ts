// Testes de integração + segurança de RF_F3 (doação de produto) e RF_F11 (doação em dinheiro),
// com PostgreSQL de verdade, passando pelas rotas. Só rodam com TEST_DATABASE_URL definida.
import { afterAll, beforeAll, describe, expect, it, vi } from 'vitest';
import { prepararBancoDeTeste, TEM_BANCO_DE_TESTE } from './test-utils/bancoDeTeste';

type Rotas = {
  produto: typeof import('../app/api/doacoes/produto/route');
  dinheiro: typeof import('../app/api/doacoes/dinheiro/route');
};
let rotas: Rotas;
let limpar: () => Promise<void>;

const json = (corpo: unknown) => new Request('http://x', { method: 'POST', body: JSON.stringify(corpo) });
const crua = (texto: string) => new Request('http://x', { method: 'POST', body: texto });
const get = (rota: { GET: (r: Request) => Promise<Response> }, qs = '') => rota.GET(new Request(`http://x/api${qs}`));

async function sql<T extends Record<string, unknown>>(texto: string, p: unknown[] = []): Promise<T[]> {
  const { Database } = await import('./db/Database');
  return (await Database.getInstancia().query(texto, p)).rows as T[];
}
const estoque = async (id: number) => Number((await sql<{ q: number }>('SELECT quantidade_estoque AS q FROM produto WHERE id=$1', [id]))[0].q);
const contar = async (tabela: string) => Number((await sql<{ n: string }>(`SELECT count(*) AS n FROM ${tabela}`))[0].n);

const hoje = () => {
  const d = new Date();
  return `${String(d.getDate()).padStart(2, '0')}/${String(d.getMonth() + 1).padStart(2, '0')}/${d.getFullYear()}`;
};

describe.skipIf(!TEM_BANCO_DE_TESTE)('Doações - integração (PostgreSQL)', () => {
  let arroz: number;
  let feijao: number;
  let doador: number;
  let anonimo: number;

  beforeAll(async () => {
    ({ limpar } = await prepararBancoDeTeste());
    rotas = {
      produto: await import('../app/api/doacoes/produto/route'),
      dinheiro: await import('../app/api/doacoes/dinheiro/route'),
    };
    arroz = (await sql<{ id: number }>("INSERT INTO produto (nome,categoria,unidade_medida,quantidade_estoque) VALUES ('Arroz','Alimento','kg',10) RETURNING id"))[0].id;
    feijao = (await sql<{ id: number }>("INSERT INTO produto (nome,categoria,unidade_medida) VALUES ('Feijão','Alimento','kg') RETURNING id"))[0].id;
    doador = (await sql<{ id: number }>("INSERT INTO doador (nome,telefone) VALUES ('Carlos Doador','18 99999-0000') RETURNING id"))[0].id;
    anonimo = (await sql<{ id: number }>("INSERT INTO doador (nome,anonimo) VALUES ('Anônimo',true) RETURNING id"))[0].id;
  });
  afterAll(async () => {
    await limpar();
  });

  describe('RF_F3 - doação de produto', () => {
    it('fluxo básico: grava doação + itens + movimentação e soma no estoque', async () => {
      const r = await rotas.produto.POST(
        json({ doador: { tipo: 'existente', id: doador }, dataRecebimento: hoje(), itens: [{ produtoId: arroz, quantidade: '5' }, { produtoId: feijao, quantidade: 3, dataValidade: '01/01/2999' }] })
      );
      expect(r.status).toBe(201);
      expect(await estoque(arroz)).toBe(15);
      expect(await estoque(feijao)).toBe(3);
      const mov = await sql<{ produto_id: number; tipo: string; quantidade: number }>('SELECT * FROM movimentacao_estoque ORDER BY id');
      expect(mov).toHaveLength(2);
      expect(mov.every((m) => m.tipo === 'ENTRADA')).toBe(true);
      expect(await contar('doacao_produto')).toBe(1);
      expect(await contar('item_doacao')).toBe(2);
    });

    it('formato exato que a tela envia (ids e quantidades como texto) funciona', async () => {
      const antes = await estoque(arroz);
      const r = await rotas.produto.POST(
        json({ doador: { tipo: 'existente', id: String(doador) }, dataRecebimento: hoje(), itens: [{ produtoId: String(arroz), quantidade: '4', dataValidade: '' }] })
      );
      expect(r.status).toBe(201);
      expect(await estoque(arroz)).toBe(antes + 4);
      const d = await rotas.dinheiro.POST(json({ doador: { tipo: 'existente', id: String(doador) }, valor: '25,00', formaRecebimento: 'PIX', dataRecebimento: hoje() }));
      expect(d.status).toBe(201);
    });

    it('doador novo é criado junto; doador anônimo funciona', async () => {
      const antes = await contar('doador');
      expect(
        (await rotas.produto.POST(json({ doador: { tipo: 'novo', nome: 'Maria Nova', contato: '(18) 98888-7777' }, dataRecebimento: hoje(), itens: [{ produtoId: arroz, quantidade: 1 }] }))).status
      ).toBe(201);
      expect(await contar('doador')).toBe(antes + 1);
      expect((await rotas.produto.POST(json({ doador: { tipo: 'anonimo' }, dataRecebimento: hoje(), itens: [{ produtoId: arroz, quantidade: 1 }] }))).status).toBe(201);
    });

    it('transação: 2º item com produto inexistente → nada é gravado (nem estoque, nem doador novo)', async () => {
      const antes = { e: await estoque(arroz), d: await contar('doador'), dp: await contar('doacao_produto'), i: await contar('item_doacao'), m: await contar('movimentacao_estoque') };
      const r = await rotas.produto.POST(
        json({ doador: { tipo: 'novo', nome: 'Fantasma Silva', contato: '18 90000-0000' }, dataRecebimento: hoje(), itens: [{ produtoId: arroz, quantidade: 7 }, { produtoId: 999999, quantidade: 1 }] })
      );
      expect(r.status).toBe(400);
      expect(await estoque(arroz)).toBe(antes.e);
      expect(await contar('doador')).toBe(antes.d);
      expect(await contar('doacao_produto')).toBe(antes.dp);
      expect(await contar('item_doacao')).toBe(antes.i);
      expect(await contar('movimentacao_estoque')).toBe(antes.m);
    });

    it('validação falha → 400 com erros por campo e nada gravado', async () => {
      const antes = await contar('doacao_produto');
      const r = await rotas.produto.POST(json({ doador: { tipo: 'existente', id: doador }, dataRecebimento: '31/02/2026', itens: [{ produtoId: arroz, quantidade: '0' }] }));
      expect(r.status).toBe(400);
      const corpo = await r.json();
      expect(corpo.erros).toHaveProperty('dataRecebimento');
      expect(corpo.erros).toHaveProperty('item.0.quantidade');
      expect(await contar('doacao_produto')).toBe(antes);
    });

    it('doador existente que não existe → 400, nada gravado', async () => {
      const antes = await contar('doacao_produto');
      const r = await rotas.produto.POST(json({ doador: { tipo: 'existente', id: 424242 }, dataRecebimento: hoje(), itens: [{ produtoId: arroz, quantidade: 1 }] }));
      expect(r.status).toBeLessThan(500);
      expect(r.status).toBeGreaterThanOrEqual(400);
      expect(await contar('doacao_produto')).toBe(antes);
    });

    it('concorrência: 20 doações simultâneas somam exatamente no estoque', async () => {
      const antes = await estoque(feijao);
      const respostas = await Promise.all(
        Array.from({ length: 20 }, () => rotas.produto.POST(json({ doador: { tipo: 'anonimo' }, dataRecebimento: hoje(), itens: [{ produtoId: feijao, quantidade: 2 }] })))
      );
      expect(respostas.every((r) => r.status === 201)).toBe(true);
      expect(await estoque(feijao)).toBe(antes + 40);
    });

    it('quantidade absurda não estoura o INTEGER do banco (400, não 500)', async () => {
      for (const quantidade of ['99999999999', '2147483648', 1e12, '1e9']) {
        const r = await rotas.produto.POST(json({ doador: { tipo: 'anonimo' }, dataRecebimento: hoje(), itens: [{ produtoId: arroz, quantidade }] }));
        expect(r.status, String(quantidade)).toBeLessThan(500);
      }
    });

    it('consulta com filtros de doador e período', async () => {
      const todas = (await (await get(rotas.produto, '/doacoes/produto')).json()) as { doadorId: number; itens: unknown[] }[];
      expect(todas.length).toBeGreaterThan(2);
      const doDoador = (await (await get(rotas.produto, `/doacoes/produto?doadorId=${doador}`)).json()) as { doadorId: number; itens: unknown[] }[];
      expect(doDoador).toHaveLength(2); // a doação do fluxo básico + a enviada no formato da tela
      expect(doDoador.some((d) => d.itens.length === 2)).toBe(true);
      expect(await (await get(rotas.produto, '/doacoes/produto?dataInicial=01/01/2999')).json()).toEqual([]);
      expect((await (await get(rotas.produto, `/doacoes/produto?dataInicial=${hoje()}&dataFinal=${hoje()}&doadorId=${doador}`)).json()).length).toBe(2);
    });

    it.each(["1 OR 1=1", "1; DROP TABLE doacao_produto", "abc", "-1", "99999999999"])('filtro doadorId malicioso "%s" → 400', async (v) => {
      expect((await get(rotas.produto, '/doacoes/produto?doadorId=' + encodeURIComponent(v))).status).toBe(400);
      expect(await contar('doacao_produto')).toBeGreaterThan(0);
    });

    it.each(["2026-01-01'; DROP TABLE produto;--", '31/02/2026', 'ontem'])('filtro de data malicioso "%s" → 400', async (v) => {
      expect((await get(rotas.produto, '/doacoes/produto?dataInicial=' + encodeURIComponent(v))).status).toBe(400);
      expect((await get(rotas.produto, '/doacoes/produto?dataFinal=' + encodeURIComponent(v))).status).toBe(400);
    });

    it('injeção de SQL no nome do doador novo: nada é executado (texto vira dado, via parâmetro $1)', async () => {
      // a validação de Doador é do RF_B2 (outro membro): pode aceitar aspas. O que importa aqui é que o texto
      // é guardado como TEXTO e jamais interpretado como comando.
      const payload = "x'); DROP TABLE doador;--";
      const r = await rotas.produto.POST(json({ doador: { tipo: 'novo', nome: payload, contato: '18 99999-0000' }, dataRecebimento: hoje(), itens: [{ produtoId: arroz, quantidade: 1 }] }));
      expect(r.status).toBeLessThan(500);
      expect(await contar('doador')).toBeGreaterThan(0); // tabela continua lá
      expect(await contar('produto')).toBe(2);
      if (r.status === 201) {
        const gravado = await sql<{ nome: string }>('SELECT nome FROM doador WHERE nome = $1', [payload]);
        expect(gravado).toHaveLength(1); // guardado literalmente
      }
    });

    it.each([
      ['JSON quebrado', '{"doador": '], ['vazio', ''], ['array', '[]'], ['null', 'null'], ['string', '"x"'],
    ])('corpo inválido (%s) → 400', async (_n, corpo) => {
      expect((await rotas.produto.POST(crua(corpo))).status).toBe(400);
    });

    it('tipos errados dentro do JSON nunca causam 500', async () => {
      const lixos = [
        { doador: 'x', dataRecebimento: 5, itens: 'y' },
        { doador: { tipo: 'existente', id: { $ne: 1 } }, dataRecebimento: hoje(), itens: [null] },
        { doador: { tipo: 'novo', nome: ['a'], contato: {} }, dataRecebimento: [], itens: [[], 'a', 1] },
        { doador: { tipo: 'existente', id: doador }, dataRecebimento: hoje(), itens: [{ produtoId: { a: 1 }, quantidade: [] }] },
      ];
      for (const l of lixos) {
        const r = await rotas.produto.POST(json(l));
        expect(r.status, JSON.stringify(l)).toBe(400);
      }
    });

    it('erro do banco no meio da gravação: 500 genérico, sem vazar detalhes e sem gravar pela metade', async () => {
      const { Database } = await import('./db/Database');
      const banco = Database.getInstancia();
      const antesEstoque = await estoque(arroz);
      const antesMov = await contar('movimentacao_estoque');
      const original = banco.comTransacao.bind(banco);
      const silencio = vi.spyOn(console, 'error').mockImplementation(() => {});
      banco.comTransacao = (async (fn: Parameters<typeof original>[0]) =>
        original(async (cliente) => {
          await fn(cliente);
          throw new Error('falha simulada password=segredo host=10.0.0.5');
        })) as typeof banco.comTransacao;
      try {
        const r = await rotas.produto.POST(json({ doador: { tipo: 'anonimo' }, dataRecebimento: hoje(), itens: [{ produtoId: arroz, quantidade: 9 }] }));
        expect(r.status).toBe(500);
        expect(await r.text()).not.toMatch(/segredo|10\.0\.0\.5|falha simulada/);
        expect(await estoque(arroz)).toBe(antesEstoque); // ROLLBACK desfez tudo
        expect(await contar('movimentacao_estoque')).toBe(antesMov);
      } finally {
        banco.comTransacao = original;
        silencio.mockRestore();
      }
    });
  });

  describe('RF_F11 - doação em dinheiro', () => {
    const base = () => ({ doador: { tipo: 'existente', id: doador }, valor: '150,50', formaRecebimento: 'PIX', dataRecebimento: hoje() });

    it('sem caixa aberto: doação é gravada e avisa que o caixa não foi atualizado', async () => {
      const r = await rotas.dinheiro.POST(json(base()));
      expect(r.status).toBe(201);
      const corpo = await r.json();
      expect(corpo.valor).toBe(150.5);
      expect(await contar('doacao_dinheiro')).toBe(2); // esta + a enviada no formato da tela
      expect(corpo.caixaAtualizado).toBe(false);
      expect(await contar('movimentacao_caixa')).toBe(0);
    });

    it('com caixa aberto: lança ENTRADA no caixa com o valor exato (centavos)', async () => {
      const caixa = (await sql<{ id: number }>("INSERT INTO caixa (status) VALUES ('ABERTO') RETURNING id"))[0].id;
      const r = await rotas.dinheiro.POST(json({ ...base(), valor: '1.234,56', formaRecebimento: 'Dinheiro' }));
      expect(r.status).toBe(201);
      expect((await r.json()).caixaAtualizado).toBe(true);
      const mov = await sql<{ caixa_id: number; tipo: string; valor: string }>('SELECT * FROM movimentacao_caixa');
      expect(mov).toHaveLength(1);
      expect(mov[0]).toMatchObject({ caixa_id: caixa, tipo: 'ENTRADA', valor: '1234.56' });
    });

    it('0,10 + 0,20 soma certo (sem erro de ponto flutuante)', async () => {
      await rotas.dinheiro.POST(json({ ...base(), valor: '0,10' }));
      await rotas.dinheiro.POST(json({ ...base(), valor: '0,20' }));
      const soma = await sql<{ s: string }>("SELECT sum(valor) AS s FROM movimentacao_caixa WHERE valor IN (0.10, 0.20)");
      expect(soma[0].s).toBe('0.30');
    });

    it.each(['0', '-5', '1.000.000,01', 'abc', '10,999', '5; DROP TABLE doacao_dinheiro', '9'.repeat(30)])('valor inválido "%s" → 400 e nada gravado', async (valor) => {
      const antes = await contar('doacao_dinheiro');
      const r = await rotas.dinheiro.POST(json({ ...base(), valor }));
      expect(r.status).toBe(400);
      expect(await contar('doacao_dinheiro')).toBe(antes);
    });

    it('forma de recebimento fora da lista → 400', async () => {
      expect((await rotas.dinheiro.POST(json({ ...base(), formaRecebimento: "x'; DROP TABLE caixa;--" }))).status).toBe(400);
    });

    it('doação concorrente: 15 ao mesmo tempo, caixa soma exato', async () => {
      const antes = Number((await sql<{ s: string }>("SELECT coalesce(sum(valor),0) AS s FROM movimentacao_caixa"))[0].s);
      const rs = await Promise.all(Array.from({ length: 15 }, () => rotas.dinheiro.POST(json({ ...base(), valor: '10,00' }))));
      expect(rs.every((r) => r.status === 201)).toBe(true);
      const depois = Number((await sql<{ s: string }>("SELECT sum(valor) AS s FROM movimentacao_caixa"))[0].s);
      expect(Math.round((depois - antes) * 100)).toBe(15000);
    });

    it('consulta por doador e período; filtros maliciosos → 400', async () => {
      const todas = (await (await get(rotas.dinheiro, '/doacoes/dinheiro')).json()) as { doadorId: number }[];
      expect(todas.length).toBeGreaterThan(3);
      const so = (await (await get(rotas.dinheiro, `/doacoes/dinheiro?doadorId=${anonimo}`)).json()) as unknown[];
      expect(so).toEqual([]);
      expect((await get(rotas.dinheiro, '/doacoes/dinheiro?doadorId=1%20OR%201=1')).status).toBe(400);
      expect((await get(rotas.dinheiro, "/doacoes/dinheiro?dataInicial=2026-01-01'--")).status).toBe(400);
    });

    it('corpo inválido e tipos errados → 400, nunca 500', async () => {
      for (const c of ['{"valor":', '', '[]', 'null', '"x"']) expect((await rotas.dinheiro.POST(crua(c))).status).toBe(400);
      for (const l of [{ doador: 1, valor: {}, formaRecebimento: [], dataRecebimento: 7 }, { ...base(), valor: ['10'] }, { ...base(), valor: null }]) {
        expect((await rotas.dinheiro.POST(json(l))).status, JSON.stringify(l)).toBe(400);
      }
    });

    it('erro do banco: 500 genérico e nada gravado pela metade', async () => {
      const { Database } = await import('./db/Database');
      const banco = Database.getInstancia();
      const antes = await contar('doacao_dinheiro');
      const original = banco.comTransacao.bind(banco);
      const silencio = vi.spyOn(console, 'error').mockImplementation(() => {});
      banco.comTransacao = (async (fn: Parameters<typeof original>[0]) =>
        original(async (cliente) => {
          await fn(cliente);
          throw new Error('senha=segredo');
        })) as typeof banco.comTransacao;
      try {
        const r = await rotas.dinheiro.POST(json(base()));
        expect(r.status).toBe(500);
        expect(await r.text()).not.toMatch(/segredo/);
        expect(await contar('doacao_dinheiro')).toBe(antes);
      } finally {
        banco.comTransacao = original;
        silencio.mockRestore();
      }
    });
  });
});

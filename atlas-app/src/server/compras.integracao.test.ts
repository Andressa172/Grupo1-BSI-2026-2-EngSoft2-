// Testes de integração + segurança de RF_F2 (lançar entrada de compras), com PostgreSQL de verdade,
// passando pela rota. Confere também que a compra aciona o RF_F1 (atualizar estoque).
// Só rodam com TEST_DATABASE_URL definida (ver test-utils/bancoDeTeste.ts).
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { prepararBancoDeTeste, TEM_BANCO_DE_TESTE } from './test-utils/bancoDeTeste';

let rota: typeof import('../app/api/compras/route');
let limpar: () => Promise<void>;

const post = (corpo: unknown) =>
  rota.POST(new Request('http://x/api/compras', { method: 'POST', body: typeof corpo === 'string' ? corpo : JSON.stringify(corpo) }));
const get = (qs = '') => rota.GET(new Request(`http://x/api/compras?${qs}`));

async function sql<T extends Record<string, unknown>>(texto: string, p: unknown[] = []): Promise<T[]> {
  const { Database } = await import('./db/Database');
  return (await Database.getInstancia().query(texto, p)).rows as T[];
}
const contar = async (tabela: string) => Number((await sql<{ n: string }>(`SELECT count(*) AS n FROM ${tabela}`))[0].n);
async function produto(id: number) {
  const [p] = await sql<{ q: number; v: string | null }>(
    "SELECT quantidade_estoque AS q, to_char(data_validade, 'YYYY-MM-DD') AS v FROM produto WHERE id=$1",
    [id]
  );
  return { estoque: Number(p.q), validade: p.v };
}
let sequencia = 0;
async function novoProduto(base: string, quantidade = 0): Promise<number> {
  const [p] = await sql<{ id: number }>(
    "INSERT INTO produto (nome,categoria,unidade_medida,quantidade_estoque) VALUES ($1,'Alimento','kg',$2) RETURNING id",
    [`${base} ${++sequencia}`, quantidade]
  );
  return p.id;
}
const nf = () => `NF-${Date.now()}-${++sequencia}`;
const contagens = async () => ({
  compras: await contar('compra'),
  itens: await contar('item_compra'),
  movs: await contar('movimentacao_estoque'),
});

const hojeBR = () => {
  const d = new Date();
  return `${String(d.getDate()).padStart(2, '0')}/${String(d.getMonth() + 1).padStart(2, '0')}/${d.getFullYear()}`;
};

describe.skipIf(!TEM_BANCO_DE_TESTE)('Compras - integração (PostgreSQL)', () => {
  beforeAll(async () => {
    ({ limpar } = await prepararBancoDeTeste());
    rota = await import('../app/api/compras/route');
  });
  afterAll(async () => {
    await limpar();
  });

  describe('RF_F2 - fluxo básico', () => {
    it('grava compra e itens com o total calculado no servidor e dá entrada no estoque (RF_F1)', async () => {
      const arroz = await novoProduto('Arroz', 2);
      const leite = await novoProduto('Leite');
      const numeroNF = nf();
      const r = await post({
        numeroNF,
        dataCompra: hojeBR(),
        fornecedor: 'Atacadão',
        itens: [
          { produtoId: String(arroz), quantidade: '10', valorUnitario: '25,90' },
          { produtoId: leite, quantidade: 6, valorUnitario: '4,99', dataValidade: '01/03/2031' },
        ],
      });
      expect(r.status).toBe(201);
      const corpo = (await r.json()) as { id: number; valorTotal: number };
      expect(corpo.valorTotal).toBe(288.94);

      const [c] = await sql<{ numero_nf: string; fornecedor: string; valor_total: string }>(
        'SELECT numero_nf, fornecedor, valor_total FROM compra WHERE id=$1',
        [corpo.id]
      );
      expect(c).toEqual({ numero_nf: numeroNF.toUpperCase(), fornecedor: 'Atacadão', valor_total: '288.94' });
      expect(Number((await sql<{ n: string }>('SELECT count(*) n FROM item_compra WHERE compra_id=$1', [corpo.id]))[0].n)).toBe(2);

      expect((await produto(arroz)).estoque).toBe(12);
      expect(await produto(leite)).toEqual({ estoque: 6, validade: '2031-03-01' });
      const movs = await sql<{ tipo: string; origem: string }>(
        'SELECT tipo, origem FROM movimentacao_estoque WHERE produto_id = ANY($1) ORDER BY id',
        [[arroz, leite]]
      );
      expect(movs).toHaveLength(2);
      expect(movs.every((m) => m.tipo === 'ENTRADA' && m.origem === `Compra #${corpo.id} - NF ${numeroNF.toUpperCase()}`)).toBe(true);
    });

    it('o total é sempre recalculado no servidor (valorTotal enviado pela tela é ignorado)', async () => {
      const p = await novoProduto('Feijão');
      const r = await post({
        numeroNF: nf(),
        dataCompra: hojeBR(),
        fornecedor: 'X',
        valorTotal: 0.01,
        itens: [{ produtoId: p, quantidade: 1, valorUnitario: '7,00' }],
      });
      expect(r.status).toBe(400); // fornecedor curto demais
      const ok = await post({
        numeroNF: nf(),
        dataCompra: hojeBR(),
        fornecedor: 'Mercado',
        valorTotal: 0.01,
        itens: [{ produtoId: p, quantidade: 1, valorUnitario: '7,00' }],
      });
      expect(((await ok.json()) as { valorTotal: number }).valorTotal).toBe(7);
    });

    it('consulta por nota, fornecedor e período (mais recentes primeiro)', async () => {
      const p = await novoProduto('Óleo');
      const numeroNF = nf();
      await post({ numeroNF, dataCompra: hojeBR(), fornecedor: 'Fornecedor Único 100%', itens: [{ produtoId: p, quantidade: 1, valorUnitario: '9,99' }] });

      const porNF = (await (await get(`numeroNF=${encodeURIComponent(numeroNF.toLowerCase())}`)).json()) as { numeroNF: string; itens: unknown[] }[];
      expect(porNF).toHaveLength(1);
      expect(porNF[0].itens).toHaveLength(1);
      expect((await (await get('fornecedor=%C3%9Anico%20100%25')).json()) as unknown[]).toHaveLength(1);
      // "%" digitado é texto, não curinga: "1%0" não pode casar com "100"
      expect((await (await get('fornecedor=1%250')).json()) as unknown[]).toHaveLength(0);
      expect((await (await get(`numeroNF=${numeroNF}&dataInicial=${hojeBR()}&dataFinal=${hojeBR()}`)).json()) as unknown[]).toHaveLength(1);
      expect((await (await get(`numeroNF=${numeroNF}&dataFinal=01/01/2000`)).json()) as unknown[]).toHaveLength(0);
    });
  });

  describe('RF_F2 - fluxos alternativos', () => {
    it('1.1 / 4.1 / 5.1 dados inválidos → 400 com erro por campo e nada é gravado', async () => {
      const antes = await contagens();
      const r = await post({ numeroNF: '', dataCompra: '30/02/2026', fornecedor: '', itens: [] });
      expect(r.status).toBe(400);
      expect(Object.keys((await r.json()).erros).sort()).toEqual(['dataCompra', 'fornecedor', 'itens', 'numeroNF']);
      expect(await contagens()).toEqual(antes);
    });

    it('2.1 nota fiscal duplicada (mesmo com outra caixa/espaços) → 400 no campo da nota, estoque não muda', async () => {
      const p = await novoProduto('Açúcar');
      const numeroNF = nf();
      expect((await post({ numeroNF, dataCompra: hojeBR(), fornecedor: 'A', itens: [] })).status).toBe(400);
      expect((await post({ numeroNF, dataCompra: hojeBR(), fornecedor: 'Mercado A', itens: [{ produtoId: p, quantidade: 3, valorUnitario: '1,00' }] })).status).toBe(201);
      const antes = await contagens();
      const r = await post({
        numeroNF: `  ${numeroNF.toLowerCase()} `,
        dataCompra: hojeBR(),
        fornecedor: 'Mercado B',
        itens: [{ produtoId: p, quantidade: 3, valorUnitario: '1,00' }],
      });
      expect(r.status).toBe(400);
      expect((await r.json()).erros).toHaveProperty('numeroNF');
      expect((await produto(p)).estoque).toBe(3);
      expect(await contagens()).toEqual(antes);
    });

    it('2.1 concorrência: a mesma nota lançada 10 vezes ao mesmo tempo → só 1 entra no estoque', async () => {
      const p = await novoProduto('Sal');
      const numeroNF = nf();
      const respostas = await Promise.all(
        Array.from({ length: 10 }, () =>
          post({ numeroNF, dataCompra: hojeBR(), fornecedor: 'Mercado', itens: [{ produtoId: p, quantidade: 5, valorUnitario: '2,00' }] })
        )
      );
      expect(respostas.filter((r) => r.status === 201)).toHaveLength(1);
      expect(respostas.filter((r) => r.status === 400)).toHaveLength(9);
      expect((await produto(p)).estoque).toBe(5);
    });

    it('3.1 produto não cadastrado no 2º item → 400 no campo do item e nada fica gravado (nem o 1º item)', async () => {
      const p = await novoProduto('Macarrão', 1);
      const antes = await contagens();
      const r = await post({
        numeroNF: nf(),
        dataCompra: hojeBR(),
        fornecedor: 'Mercado',
        itens: [
          { produtoId: p, quantidade: 4, valorUnitario: '3,00' },
          { produtoId: 999999, quantidade: 1, valorUnitario: '1,00' },
        ],
      });
      expect(r.status).toBe(400);
      expect((await r.json()).erros).toHaveProperty('item.1.produto');
      expect((await produto(p)).estoque).toBe(1);
      expect(await contagens()).toEqual(antes);
    });

    it('9.1 falha do banco no meio da gravação → 500 genérico, sem vazar detalhes e sem gravar pela metade', async () => {
      const { Database } = await import('./db/Database');
      const p = await novoProduto('Café', 1);
      const banco = Database.getInstancia();
      const original = banco.comTransacao.bind(banco);
      // deixa gravar a compra e o estoque e faz o item falhar no final
      banco.comTransacao = (async (fn: Parameters<typeof original>[0]) =>
        original((cliente) => {
          const comFalha = new Proxy(cliente, {
            get(alvo, prop, receptor) {
              if (prop === 'query') {
                return (texto: string, params?: unknown[]) =>
                  String(texto).includes('INSERT INTO item_compra')
                    ? Promise.reject(new Error('detalhe interno: senha do banco'))
                    : alvo.query(texto, params);
              }
              return Reflect.get(alvo, prop, receptor);
            },
          });
          return fn(comFalha);
        })) as typeof banco.comTransacao;
      const antes = await contagens();
      try {
        const r = await post({ numeroNF: nf(), dataCompra: hojeBR(), fornecedor: 'Mercado', itens: [{ produtoId: p, quantidade: 9, valorUnitario: '1,00' }] });
        expect(r.status).toBe(500);
        expect(JSON.stringify(await r.json())).not.toMatch(/senha|detalhe|item_compra/);
      } finally {
        banco.comTransacao = original;
      }
      expect((await produto(p)).estoque).toBe(1);
      expect(await contagens()).toEqual(antes);
    });
  });

  describe('RF_F2 - segurança', () => {
    it('injeção de SQL no fornecedor e nos filtros vira texto (parâmetros $n)', async () => {
      const p = await novoProduto('Farinha');
      const fornecedor = "Robert'); DROP TABLE compra; --";
      const r = await post({ numeroNF: nf(), dataCompra: hojeBR(), fornecedor, itens: [{ produtoId: p, quantidade: 1, valorUnitario: '1,00' }] });
      expect(r.status).toBe(201);
      expect((await sql<{ fornecedor: string }>('SELECT fornecedor FROM compra WHERE fornecedor=$1', [fornecedor]))[0].fornecedor).toBe(fornecedor);
      expect((await get(`fornecedor=${encodeURIComponent("' OR '1'='1")}`)).status).toBe(200);
      expect((await (await get(`fornecedor=${encodeURIComponent("' OR '1'='1")}`)).json()) as unknown[]).toHaveLength(0);
      expect(await contar('compra')).toBeGreaterThan(0);
    });

    it('nota fiscal com injeção ou caracteres estranhos → 400, nada gravado', async () => {
      const p = await novoProduto('Biscoito');
      const antes = await contagens();
      for (const numeroNF of ["1'; DELETE FROM produto; --", '<img src=x onerror=alert(1)>', 'NF#12']) {
        const r = await post({ numeroNF, dataCompra: hojeBR(), fornecedor: 'Mercado', itens: [{ produtoId: p, quantidade: 1, valorUnitario: '1,00' }] });
        expect(r.status).toBe(400);
      }
      expect(await contagens()).toEqual(antes);
    });

    it('corpo inválido e tipos errados dentro do JSON → 400, nunca 500', async () => {
      for (const corpo of [
        '{quebrado',
        '[]',
        'null',
        '"texto"',
        { numeroNF: { $ne: '' }, dataCompra: 123, fornecedor: ['x'], itens: { 0: {} } },
        { numeroNF: nf(), dataCompra: hojeBR(), fornecedor: 'Mercado', itens: [null, 'x', 5] },
        { numeroNF: nf(), dataCompra: hojeBR(), fornecedor: 'Mercado', itens: [{ produtoId: 1, quantidade: 1e308, valorUnitario: 'Infinity' }] },
      ]) {
        expect((await post(corpo)).status).toBe(400);
      }
    });

    it('quantidade e valores absurdos não estouram as colunas do banco (400, não 500)', async () => {
      const p = await novoProduto('Arroz grande');
      const r = await post({
        numeroNF: nf(),
        dataCompra: hojeBR(),
        fornecedor: 'Mercado',
        itens: [{ produtoId: p, quantidade: 2_147_483_647, valorUnitario: '99.999.999.999,99' }],
      });
      expect(r.status).toBe(400);
      expect((await produto(p)).estoque).toBe(0);
    });

    it('filtros inválidos → 400 com erro por campo', async () => {
      for (const qs of ['dataInicial=99/99/9999', 'dataInicial=10/11/2026&dataFinal=01/11/2026', `fornecedor=${'x'.repeat(121)}`]) {
        expect((await get(qs)).status).toBe(400);
      }
    });
  });
});

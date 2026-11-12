// Testes de integração + segurança de RF_F1 (atualizar estoque), com PostgreSQL de verdade.
// RF_F1 é oculto (ERS 2.2): é acionado pelos casos de uso solicitantes. Os testes chamam o Model
// do mesmo jeito que eles (dentro de uma transação) e também passam pelos próprios solicitantes:
// doação de produto (RF_F3), cardápio diário (RF_F10) e alocação para eventos (RF_F9).
// Só rodam com TEST_DATABASE_URL definida (ver test-utils/bancoDeTeste.ts).
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { prepararBancoDeTeste, TEM_BANCO_DE_TESTE } from './test-utils/bancoDeTeste';
import type { ResultadoMovimentacao } from './model/MovimentacaoEstoque';

type RotaEstoque = typeof import('../app/api/estoque/movimentacoes/route');
type RotaDoacao = typeof import('../app/api/doacoes/produto/route');
let rota: RotaEstoque;
let rotaDoacao: RotaDoacao;
let limpar: () => Promise<void>;

const get = (qs = '') => rota.GET(new Request(`http://x/api/estoque/movimentacoes?${qs}`));

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
async function novoProduto(nome: string, quantidade = 0, validade: string | null = null): Promise<number> {
  const [p] = await sql<{ id: number }>(
    "INSERT INTO produto (nome,categoria,unidade_medida,quantidade_estoque,data_validade) VALUES ($1,'Alimento','kg',$2,$3) RETURNING id",
    [nome, quantidade, validade]
  );
  return p.id;
}

// aciona o RF_F1 como um caso de uso solicitante: dentro de uma transação
async function movimentar(
  produtoId: number,
  tipo: 'ENTRADA' | 'SAIDA',
  quantidade: number,
  origem = 'Teste',
  dataValidade: string | null = null
): Promise<ResultadoMovimentacao> {
  const { Database } = await import('./db/Database');
  const { MovimentacaoEstoque } = await import('./model/MovimentacaoEstoque');
  return Database.getInstancia().comTransacao((cliente) =>
    new MovimentacaoEstoque({ produtoId, tipo, quantidade, origem, dataValidade }).aplicar(cliente)
  );
}

const hojeBR = () => {
  const d = new Date();
  return `${String(d.getDate()).padStart(2, '0')}/${String(d.getMonth() + 1).padStart(2, '0')}/${d.getFullYear()}`;
};
const amanhaIso = () => {
  const d = new Date();
  d.setDate(d.getDate() + 1);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
};

describe.skipIf(!TEM_BANCO_DE_TESTE)('Estoque - integração (PostgreSQL)', () => {
  let sequencia = 0;
  const nome = (base: string) => `${base} ${++sequencia}`;

  beforeAll(async () => {
    ({ limpar } = await prepararBancoDeTeste());
    rota = await import('../app/api/estoque/movimentacoes/route');
    rotaDoacao = await import('../app/api/doacoes/produto/route');
  });
  afterAll(async () => {
    await limpar();
  });

  // ----------------------------- caso de uso RF_F1 -----------------------------
  describe('RF_F1 - fluxo básico e alternativos (ERS)', () => {
    it('fluxo básico: entrada soma, saída subtrai e cada uma grava o histórico (data, quantidade, tipo)', async () => {
      const arroz = await novoProduto(nome('Arroz'), 10);
      expect(await movimentar(arroz, 'ENTRADA', 5, 'Doação de produto #1')).toBe('APLICADA');
      expect(await movimentar(arroz, 'SAIDA', 3, 'Cardápio diário')).toBe('APLICADA');
      expect((await produto(arroz)).estoque).toBe(12);

      const historico = await sql<{ tipo: string; quantidade: number; origem: string; tem_data: boolean }>(
        'SELECT tipo, quantidade, origem, data IS NOT NULL AS tem_data FROM movimentacao_estoque WHERE produto_id=$1 ORDER BY id',
        [arroz]
      );
      expect(historico).toEqual([
        { tipo: 'ENTRADA', quantidade: 5, origem: 'Doação de produto #1', tem_data: true },
        { tipo: 'SAIDA', quantidade: 3, origem: 'Cardápio diário', tem_data: true },
      ]);
    });

    it('2.1 produto não cadastrado: cancela, devolve o erro e nada é gravado', async () => {
      const antes = await contar('movimentacao_estoque');
      expect(await movimentar(999999, 'ENTRADA', 1)).toBe('PRODUTO_INEXISTENTE');
      expect(await movimentar(999999, 'SAIDA', 1)).toBe('PRODUTO_INEXISTENTE');
      expect(await contar('movimentacao_estoque')).toBe(antes);
    });

    it('3.1 quantidade insuficiente: cancela, avisa e nada muda', async () => {
      const feijao = await novoProduto(nome('Feijão'), 4);
      const antes = await contar('movimentacao_estoque');
      expect(await movimentar(feijao, 'SAIDA', 5)).toBe('SALDO_INSUFICIENTE');
      expect((await produto(feijao)).estoque).toBe(4);
      expect(await contar('movimentacao_estoque')).toBe(antes);
    });

    it('4.1 falha no banco no meio da operação: rollback, nem o estoque nem o histórico ficam gravados', async () => {
      const { Database } = await import('./db/Database');
      const { MovimentacaoEstoque } = await import('./model/MovimentacaoEstoque');
      const leite = await novoProduto(nome('Leite'), 10);
      const antes = await contar('movimentacao_estoque');
      await expect(
        Database.getInstancia().comTransacao(async (cliente) => {
          // deixa o UPDATE do estoque passar e faz o INSERT do histórico falhar
          const clienteComFalha = {
            query: (texto: string, p?: unknown[]) =>
              texto.includes('INSERT INTO movimentacao_estoque') ? Promise.reject(new Error('falha simulada')) : cliente.query(texto, p),
          };
          return new MovimentacaoEstoque({ produtoId: leite, tipo: 'SAIDA', quantidade: 3, origem: 'x' }).aplicar(
            clienteComFalha as never
          );
        })
      ).rejects.toThrow('falha simulada');
      expect((await produto(leite)).estoque).toBe(10);
      expect(await contar('movimentacao_estoque')).toBe(antes);
    });

    it('quantidade que estouraria o INTEGER do banco é recusada antes do banco', async () => {
      const oleo = await novoProduto(nome('Óleo'), 1);
      await expect(movimentar(oleo, 'ENTRADA', 2_147_483_647)).rejects.toThrow(/inválida/);
      expect((await produto(oleo)).estoque).toBe(1);
    });

    it('concorrência: 30 saídas de 1 ao mesmo tempo com saldo 10 → exatamente 10 passam e o estoque fica 0', async () => {
      const acucar = await novoProduto(nome('Açúcar'), 10);
      const resultados = await Promise.all(Array.from({ length: 30 }, () => movimentar(acucar, 'SAIDA', 1)));
      expect(resultados.filter((r) => r === 'APLICADA')).toHaveLength(10);
      expect(resultados.filter((r) => r === 'SALDO_INSUFICIENTE')).toHaveLength(20);
      expect((await produto(acucar)).estoque).toBe(0);
      expect(Number((await sql<{ n: string }>('SELECT count(*) n FROM movimentacao_estoque WHERE produto_id=$1', [acucar]))[0].n)).toBe(10);
    });

    it('injeção de SQL na origem vira texto (parâmetro $n) e nenhuma tabela é afetada', async () => {
      const sal = await novoProduto(nome('Sal'), 1);
      const origem = "x'); DROP TABLE produto; --";
      expect(await movimentar(sal, 'ENTRADA', 1, origem)).toBe('APLICADA');
      const [m] = await sql<{ origem: string }>('SELECT origem FROM movimentacao_estoque WHERE produto_id=$1', [sal]);
      expect(m.origem).toBe(origem);
      expect(await contar('produto')).toBeGreaterThan(0);
    });
  });

  // ---------------------------------- validade ----------------------------------
  describe('RF_F1 - validade do produto', () => {
    it('entrada com validade: fica a mais próxima; saída que zera limpa a validade', async () => {
      const leite = await novoProduto(nome('Leite'));
      await movimentar(leite, 'ENTRADA', 5, 'a', '20/12/2030');
      expect(await produto(leite)).toEqual({ estoque: 5, validade: '2030-12-20' });

      await movimentar(leite, 'ENTRADA', 5, 'b', '10/12/2030');
      expect((await produto(leite)).validade).toBe('2030-12-10');

      await movimentar(leite, 'ENTRADA', 5, 'c', '01/01/2031');
      expect((await produto(leite)).validade).toBe('2030-12-10');

      await movimentar(leite, 'ENTRADA', 1, 'sem validade');
      expect((await produto(leite)).validade).toBe('2030-12-10');

      await movimentar(leite, 'SAIDA', 10);
      expect(await produto(leite)).toEqual({ estoque: 6, validade: '2030-12-10' });

      await movimentar(leite, 'SAIDA', 6);
      expect(await produto(leite)).toEqual({ estoque: 0, validade: null });

      // estoque zerado: a próxima entrada define a validade de novo
      await movimentar(leite, 'ENTRADA', 2, 'd', '05/05/2031');
      expect((await produto(leite)).validade).toBe('2031-05-05');
    });
  });

  // ------------------------------ consulta (rota GET) ------------------------------
  describe('RF_F1 - consulta do histórico (rota)', () => {
    it('filtra por produto, tipo e período, mais recentes primeiro, com nome do produto e validade', async () => {
      const a = await novoProduto(nome('Macarrão'), 10);
      const b = await novoProduto(nome('Iogurte'), 10);
      await movimentar(a, 'ENTRADA', 1, 'a1');
      await movimentar(a, 'SAIDA', 2, 'a2');
      await movimentar(b, 'ENTRADA', 3, 'b1', '15/03/2031');

      const doA = (await (await get(`produtoId=${a}`)).json()) as { origem: string }[];
      expect(doA.map((m) => m.origem)).toEqual(['a2', 'a1']);
      expect((await (await get(`produtoId=${a}&tipo=SAIDA`)).json()) as unknown[]).toHaveLength(1);

      const [deB] = (await (await get(`produtoId=${b}&dataInicial=${hojeBR()}&dataFinal=${hojeBR()}`)).json()) as {
        produto: string;
        dataValidade: string;
      }[];
      expect(deB.produto).toMatch(/Iogurte/);
      expect(deB.dataValidade).toBe('2031-03-15');
      expect((await (await get(`produtoId=${b}&dataFinal=01/01/2000`)).json()) as unknown[]).toHaveLength(0);
    });

    it('filtros maliciosos ou inválidos → 400 com erro por campo', async () => {
      for (const qs of [
        'produtoId=1%20OR%201%3D1',
        "tipo=ENTRADA'%20OR%20'1'%3D'1",
        'dataInicial=2026-01-01%27%3B%20DROP%20TABLE%20produto%3B--',
        'dataInicial=10/11/2026&dataFinal=01/11/2026',
      ]) {
        const r = await get(qs);
        expect(r.status).toBe(400);
        expect(Object.keys((await r.json()).erros).length).toBeGreaterThan(0);
      }
      expect(await contar('produto')).toBeGreaterThan(0);
    });

    it('não existe rota para alterar o estoque por fora (RF_F1 é oculto)', () => {
      expect(Object.keys(rota)).not.toContain('POST');
      expect(Object.keys(rota)).not.toContain('PUT');
      expect(Object.keys(rota)).not.toContain('DELETE');
    });

    it('erro inesperado do banco → 500 genérico, sem vazar detalhes', async () => {
      const { Database } = await import('./db/Database');
      const banco = Database.getInstancia();
      const original = banco.query.bind(banco);
      banco.query = (async () => {
        throw new Error('detalhe interno: senha do banco');
      }) as typeof banco.query;
      try {
        const r = await get();
        expect(r.status).toBe(500);
        expect(JSON.stringify(await r.json())).not.toMatch(/senha|detalhe/);
      } finally {
        banco.query = original;
      }
    });
  });

  // ------------------------ RF_F3 - doação de produto (Luigi) ------------------------
  describe('RF_F3 - doação de produto aciona o RF_F1', () => {
    let doador: number;
    beforeAll(async () => {
      doador = (await sql<{ id: number }>("INSERT INTO doador (nome) VALUES ('Doador Estoque') RETURNING id"))[0].id;
    });
    const doar = (itens: unknown[]) =>
      rotaDoacao.POST(
        new Request('http://x', {
          method: 'POST',
          body: JSON.stringify({ doador: { tipo: 'existente', id: doador }, dataRecebimento: hojeBR(), itens }),
        })
      );

    it('soma no estoque, grava a movimentação com a origem da doação e atualiza a validade', async () => {
      const arroz = await novoProduto(nome('Arroz doado'), 2);
      const r = await doar([{ produtoId: arroz, quantidade: '8', dataValidade: '01/06/2031' }]);
      expect(r.status).toBe(201);
      const { id } = (await r.json()) as { id: number };
      expect(await produto(arroz)).toEqual({ estoque: 10, validade: '2031-06-01' });

      const [m] = await sql<{ tipo: string; quantidade: number; origem: string; v: string }>(
        "SELECT tipo, quantidade, origem, to_char(data_validade,'YYYY-MM-DD') v FROM movimentacao_estoque WHERE produto_id=$1",
        [arroz]
      );
      expect(m).toEqual({ tipo: 'ENTRADA', quantidade: 8, origem: `Doação de produto #${id}`, v: '2031-06-01' });
    });

    it('produto inexistente no 2º item: 400 no campo do item e nada fica gravado (nem o 1º item)', async () => {
      const arroz = await novoProduto(nome('Arroz doado'), 2);
      const antes = {
        doacoes: await contar('doacao_produto'),
        itens: await contar('item_doacao'),
        movs: await contar('movimentacao_estoque'),
      };
      const r = await doar([
        { produtoId: arroz, quantidade: 5 },
        { produtoId: 999999, quantidade: 1 },
      ]);
      expect(r.status).toBe(400);
      expect((await r.json()).erros).toHaveProperty('item.1.produto');
      expect((await produto(arroz)).estoque).toBe(2);
      expect(await contar('doacao_produto')).toBe(antes.doacoes);
      expect(await contar('item_doacao')).toBe(antes.itens);
      expect(await contar('movimentacao_estoque')).toBe(antes.movs);
    });
  });

  // --------------------- RF_F10 e RF_F9 - cardápio e eventos (Andressa) ---------------------
  describe('RF_F10 / RF_F9 - cardápio e eventos acionam o RF_F1', () => {
    it('cardápio: baixa os alimentos e grava a saída no histórico', async () => {
      const { CriarCardapioController } = await import('./CriarCardapioController');
      const feijao = await novoProduto(nome('Feijão cardápio'), 10, '2031-01-01');
      await CriarCardapioController.getInstancia().criarCardapioDiario({ data: amanhaIso(), tipoRefeicao: 'ALMOCO' }, [
        { produtoId: feijao, quantidadeUtilizada: 4 },
      ]);
      expect(await produto(feijao)).toEqual({ estoque: 6, validade: '2031-01-01' });
      const [m] = await sql<{ tipo: string; quantidade: number; origem: string }>(
        'SELECT tipo, quantidade, origem FROM movimentacao_estoque WHERE produto_id=$1',
        [feijao]
      );
      expect(m.tipo).toBe('SAIDA');
      expect(m.quantidade).toBe(4);
      expect(m.origem).toMatch(/^Cardápio diário de .* \(ALMOCO\)$/);
    });

    it('cardápio: um alimento sem saldo desfaz tudo (nem cardápio, nem baixa do 1º alimento)', async () => {
      const { CriarCardapioController } = await import('./CriarCardapioController');
      const { ErroRegraDeNegocio } = await import('./erros');
      const a = await novoProduto(nome('Arroz cardápio'), 10);
      const b = await novoProduto(nome('Carne cardápio'), 1);
      const antes = { cardapios: await contar('cardapio_diario'), movs: await contar('movimentacao_estoque') };
      await expect(
        CriarCardapioController.getInstancia().criarCardapioDiario({ data: amanhaIso(), tipoRefeicao: 'JANTAR' }, [
          { produtoId: a, quantidadeUtilizada: 3 },
          { produtoId: b, quantidadeUtilizada: 5 },
        ])
      ).rejects.toThrow(ErroRegraDeNegocio);
      expect((await produto(a)).estoque).toBe(10);
      expect((await produto(b)).estoque).toBe(1);
      expect(await contar('cardapio_diario')).toBe(antes.cardapios);
      expect(await contar('movimentacao_estoque')).toBe(antes.movs);
    });

    it('cardápio: usar todo o estoque zera e limpa a validade', async () => {
      const { CriarCardapioController } = await import('./CriarCardapioController');
      const ovo = await novoProduto(nome('Ovo cardápio'), 3, '2031-02-02');
      await CriarCardapioController.getInstancia().criarCardapioDiario({ data: amanhaIso(), tipoRefeicao: 'CAFE_DA_MANHA' }, [
        { produtoId: ovo, quantidadeUtilizada: 3 },
      ]);
      expect(await produto(ovo)).toEqual({ estoque: 0, validade: null });
    });

    it('evento: alocar produto dá baixa e grava a saída; recurso financeiro não mexe no estoque', async () => {
      const { AlocarRecursosController } = await import('./AlocarRecursosController');
      const suco = await novoProduto(nome('Suco evento'), 20);
      const antes = await contar('movimentacao_estoque');
      await AlocarRecursosController.getInstancia().alocarRecursosParaEvento({ nome: 'Festa', data: amanhaIso() }, [
        { tipo: 'PRODUTO', produtoId: suco, quantidade: 7 },
        { tipo: 'FINANCEIRO', valor: 100 },
      ]);
      expect((await produto(suco)).estoque).toBe(13);
      expect(await contar('movimentacao_estoque')).toBe(antes + 1);
      const [m] = await sql<{ tipo: string; origem: string }>('SELECT tipo, origem FROM movimentacao_estoque WHERE produto_id=$1', [suco]);
      expect(m).toEqual({ tipo: 'SAIDA', origem: 'Alocação para evento "Festa"' });
    });

    it('evento: produto sem saldo ou inexistente desfaz tudo (nem evento é criado)', async () => {
      const { AlocarRecursosController } = await import('./AlocarRecursosController');
      const { ErroRegraDeNegocio } = await import('./erros');
      const bolo = await novoProduto(nome('Bolo evento'), 2);
      const antes = { eventos: await contar('evento'), movs: await contar('movimentacao_estoque') };
      for (const recurso of [
        { tipo: 'PRODUTO' as const, produtoId: bolo, quantidade: 3 },
        { tipo: 'PRODUTO' as const, produtoId: 999999, quantidade: 1 },
      ]) {
        await expect(
          AlocarRecursosController.getInstancia().alocarRecursosParaEvento({ nome: 'Festa', data: amanhaIso() }, [recurso])
        ).rejects.toThrow(ErroRegraDeNegocio);
      }
      expect((await produto(bolo)).estoque).toBe(2);
      expect(await contar('evento')).toBe(antes.eventos);
      expect(await contar('movimentacao_estoque')).toBe(antes.movs);
    });
  });
});

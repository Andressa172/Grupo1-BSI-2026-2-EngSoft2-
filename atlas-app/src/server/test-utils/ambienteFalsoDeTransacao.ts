// simula transação (commit/rollback) em memória pra testar sem banco real
import type { PoolClient } from 'pg';

export interface ProdutoFalso {
  id: number;
  nome: string;
  unidade_medida: string;
  quantidade_estoque: number;
  estoque_minimo: number;
}

function criarListaEstagiada<T extends { getId(): number | undefined; setId(id: number): void }>() {
  const confirmados: T[] = [];
  let staging: T[] | null = null;
  let proximoId = 1;

  return {
    iniciarStaging() {
      staging = [];
    },
    confirmar() {
      if (staging) confirmados.push(...staging);
      staging = null;
    },
    descartar() {
      staging = null;
    },
    async inserir(item: T) {
      item.setId(proximoId++);
      (staging ?? confirmados).push(item);
      return item;
    },
    obterConfirmados() {
      return [...confirmados];
    },
  };
}

export function criarAmbienteFalsoDeTransacao(produtosIniciais: ProdutoFalso[]) {
  const produtosConfirmados = new Map(produtosIniciais.map((p) => [p.id, { ...p }]));

  let stagingProdutos: Map<number, ProdutoFalso> | null = null;
  const movimentacoes: { produtoId: number; tipo: 'ENTRADA' | 'SAIDA'; quantidade: number; origem: string }[] = [];

  const listasEstagiadas: { confirmar: () => void; descartar: () => void; iniciarStaging: () => void }[] = [];

  function registrarListaEstagiada<T extends { confirmar: () => void; descartar: () => void; iniciarStaging: () => void }>(
    lista: T
  ): T {
    listasEstagiadas.push(lista);
    return lista;
  }

  const database = {
    async comTransacao<T>(executar: (client: PoolClient) => Promise<T>): Promise<T> {
      stagingProdutos = new Map([...produtosConfirmados].map(([id, p]) => [id, { ...p }]));
      for (const lista of listasEstagiadas) lista.iniciarStaging();

      try {
        const resultado = await executar({} as PoolClient);
        for (const [id, p] of stagingProdutos) produtosConfirmados.set(id, p);
        for (const lista of listasEstagiadas) lista.confirmar();
        return resultado;
      } catch (erro) {
        for (const lista of listasEstagiadas) lista.descartar();
        throw erro;
      } finally {
        stagingProdutos = null;
      }
    },
  };

  function produtoDAOFalso() {
    return {
      async decrementarEstoque(produtoId: number, quantidade: number) {
        const alvo = stagingProdutos!.get(produtoId);
        if (!alvo || alvo.quantidade_estoque < quantidade) {
          return null;
        }
        alvo.quantidade_estoque -= quantidade;
        return { id: alvo.id };
      },
      async registrarMovimentacao(produtoId: number, tipo: 'ENTRADA' | 'SAIDA', quantidade: number, origem: string) {
        movimentacoes.push({ produtoId, tipo, quantidade, origem });
      },
    };
  }

  return {
    database,
    produtoDAOFalso,
    registrarListaEstagiada,
    criarListaEstagiada,
    obterProdutoConfirmado(id: number) {
      return produtosConfirmados.get(id);
    },
    obterMovimentacoes() {
      return [...movimentacoes];
    },
  };
}

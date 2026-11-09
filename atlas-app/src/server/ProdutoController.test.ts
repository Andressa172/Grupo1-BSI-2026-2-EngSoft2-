import { beforeEach, describe, expect, it, vi } from 'vitest';
import { ProdutoController } from './ProdutoController';
import { Produto } from './model/Produto';
import type { FiltroProduto } from './model/FiltroProduto';
import { Database } from './db/Database';
import { ErroNaoEncontrado, ErroRegraDeNegocio, ErroValidacao } from './erros';

// ------------------------------------------------------------------------------
// Dublês: sem banco de verdade.
// - Database.getInstancia devolve uma conexão falsa (só para conferir quem a usa).
// - ProdutoDAO vira uma versão em memória; o Model continua dando `new ProdutoDAO(conexao)`.
// ------------------------------------------------------------------------------

const banco = vi.hoisted(() => ({
  produtos: [] as unknown[],
  proximoId: 1,
  idsComMovimentacao: [] as number[],
  conexoesUsadas: [] as unknown[],
}));

const conexaoFalsa = vi.hoisted(() => ({ query: async () => ({ rows: [], rowCount: 0 }) }));

vi.mock('./db/Database', () => ({
  Database: { getInstancia: vi.fn(() => conexaoFalsa) },
}));

vi.mock('./dao/ProdutoDAO', () => ({
  ProdutoDAO: class {
    constructor(conexao: unknown) {
      banco.conexoesUsadas.push(conexao);
    }
    private lista() {
      return banco.produtos as Produto[];
    }
    async consultar(filtro: FiltroProduto) {
      return this.lista().filter(
        (p) =>
          (!filtro.getNome() || p.getNome().toLowerCase().includes(filtro.getNome().toLowerCase())) &&
          (!filtro.getCategoria() || p.getCategoria() === filtro.getCategoria()) &&
          (filtro.getValidade() !== 'SEM_VALIDADE' || p.getDataValidade() === null)
      );
    }
    async buscarPorId(id: number) {
      return this.lista().find((p) => p.getId() === id) ?? null;
    }
    async existeComNome(nome: string, idIgnorado?: number) {
      return this.lista().some((p) => p.getId() !== idIgnorado && p.getNome().toLowerCase() === nome.toLowerCase());
    }
    async inserir(produto: Produto) {
      produto.setId(banco.proximoId++);
      banco.produtos.push(produto);
      return produto;
    }
    async atualizar(produto: Produto) {
      const indice = this.lista().findIndex((p) => p.getId() === produto.getId());
      if (indice === -1) return null;
      banco.produtos[indice] = produto;
      return produto;
    }
    async excluir(id: number) {
      // imita o banco recusando a exclusão de produto que já tem movimentação
      if (banco.idsComMovimentacao.includes(id)) {
        throw new ErroRegraDeNegocio('Este produto já foi usado no sistema e não pode ser excluído.');
      }
      const indice = this.lista().findIndex((p) => p.getId() === id);
      if (indice === -1) return false;
      banco.produtos.splice(indice, 1);
      return true;
    }
  },
}));

const arroz = {
  nome: 'Arroz 5kg',
  categoria: 'Alimento',
  unidadeMedida: 'pacote',
  numeroLote: 'ARZ-2027-01',
  estoqueMinimo: 10,
  dataValidade: '2099-03-01',
};

describe('ProdutoController - RF_B3 Gerenciar produtos', () => {
  const controller = ProdutoController.getInstancia();

  beforeEach(() => {
    banco.produtos = [];
    banco.proximoId = 1;
    banco.idsComMovimentacao = [];
    banco.conexoesUsadas = [];
  });

  describe('padrões Singleton e camadas', () => {
    it('getInstancia devolve sempre a mesma instância', () => {
      expect(ProdutoController.getInstancia()).toBe(controller);
    });

    it('o Controller obtém a conexão pelo Singleton Database', () => {
      expect(Database.getInstancia).toHaveBeenCalled();
    });

    it('o Model cria o DAO usando a conexão do Controller', async () => {
      await controller.cadastrar(arroz);
      expect(banco.conexoesUsadas.length).toBeGreaterThan(0);
      expect(banco.conexoesUsadas.every((c) => c === conexaoFalsa)).toBe(true);
    });
  });

  describe('inclusão', () => {
    it('cadastra um produto válido com estoque zero e lote', async () => {
      const produto = await controller.cadastrar(arroz);
      expect(produto.getId()).toBeDefined();
      expect(produto.getNome()).toBe('Arroz 5kg');
      expect(produto.getNumeroLote()).toBe('ARZ-2027-01');
      expect(produto.getQuantidadeEstoque()).toBe(0);
    });

    it('rejeita dados inválidos trazendo o erro de cada campo', async () => {
      const erro = await controller
        .cadastrar({ ...arroz, nome: '', numeroLote: '', dataValidade: '2000-01-01' })
        .catch((e) => e);
      expect(erro).toBeInstanceOf(ErroValidacao);
      expect(Object.keys(erro.erros).sort()).toEqual(['dataValidade', 'nome', 'numeroLote']);
      expect(banco.produtos).toHaveLength(0);
    });

    it('rejeita nome duplicado (ignorando maiúsculas) e aponta o campo nome', async () => {
      await controller.cadastrar(arroz);
      const erro = await controller.cadastrar({ ...arroz, nome: 'ARROZ 5KG' }).catch((e) => e);
      expect(erro).toBeInstanceOf(ErroValidacao);
      expect(erro.erros).toHaveProperty('nome');
    });
  });

  describe('consulta', () => {
    beforeEach(async () => {
      await controller.cadastrar(arroz);
      await controller.cadastrar({ ...arroz, nome: 'Feijão 1kg', numeroLote: 'FJN-1' });
      await controller.cadastrar({ ...arroz, nome: 'Sabonete', categoria: 'Higiene', numeroLote: 'SAB-1', dataValidade: '' });
    });

    it('sem filtro traz todos', async () => {
      expect(await controller.consultar()).toHaveLength(3);
    });

    it('filtra por nome', async () => {
      expect(await controller.consultar({ nome: 'feij' })).toHaveLength(1);
    });

    it('filtra por categoria', async () => {
      expect(await controller.consultar({ categoria: 'Higiene' })).toHaveLength(1);
    });

    it('filtra por situação da validade', async () => {
      const semValidade = await controller.consultar({ validade: 'SEM_VALIDADE' });
      expect(semValidade.map((p) => p.getNome())).toEqual(['Sabonete']);
    });

    it('combina filtros', async () => {
      expect(await controller.consultar({ nome: 'kg', categoria: 'Alimento' })).toHaveLength(2);
    });

    it('rejeita filtro inválido', async () => {
      await expect(controller.consultar({ categoria: 'Xyz' })).rejects.toThrow(ErroValidacao);
    });
  });

  describe('alteração', () => {
    it('edita um produto existente mantendo o estoque', async () => {
      const produto = await controller.cadastrar(arroz);
      const editado = await controller.editar(produto.getId()!, { ...arroz, estoqueMinimo: 20, numeroLote: 'ARZ-2' });
      expect(editado.getEstoqueMinimo()).toBe(20);
      expect(editado.getNumeroLote()).toBe('ARZ-2');
      expect(editado.getQuantidadeEstoque()).toBe(0);
    });

    it('permite editar mantendo o próprio nome', async () => {
      const produto = await controller.cadastrar(arroz);
      await expect(controller.editar(produto.getId()!, arroz)).resolves.toBeDefined();
    });

    it('rejeita edição para um nome que já é de outro produto', async () => {
      await controller.cadastrar(arroz);
      const feijao = await controller.cadastrar({ ...arroz, nome: 'Feijão 1kg' });
      await expect(controller.editar(feijao.getId()!, arroz)).rejects.toThrow(ErroValidacao);
    });

    it('permite editar um produto que venceu depois do cadastro, sem mudar a validade', async () => {
      // produto gravado com validade que já passou (ex.: dado antigo do banco)
      const vencido = new Produto({ ...arroz, id: 50, dataValidade: '2020-01-01' });
      banco.produtos.push(vencido);
      await expect(controller.editar(50, { ...arroz, dataValidade: '2020-01-01', estoqueMinimo: 3 })).resolves.toBeDefined();
    });

    it('rejeita trocar a validade para uma data no passado', async () => {
      const produto = await controller.cadastrar(arroz);
      await expect(controller.editar(produto.getId()!, { ...arroz, dataValidade: '2020-01-01' })).rejects.toThrow(
        ErroValidacao
      );
    });

    it('dá erro ao editar produto inexistente', async () => {
      await expect(controller.editar(99, arroz)).rejects.toThrow(ErroNaoEncontrado);
    });
  });

  describe('exclusão', () => {
    it('exclui um produto', async () => {
      const produto = await controller.cadastrar(arroz);
      await controller.excluir(produto.getId()!);
      expect(await controller.consultar()).toHaveLength(0);
    });

    it('dá erro ao excluir produto inexistente', async () => {
      await expect(controller.excluir(99)).rejects.toThrow(ErroNaoEncontrado);
    });

    it('não exclui produto que já tem movimentação', async () => {
      const produto = await controller.cadastrar(arroz);
      banco.idsComMovimentacao = [produto.getId()!];
      await expect(controller.excluir(produto.getId()!)).rejects.toThrow(ErroRegraDeNegocio);
    });
  });
});

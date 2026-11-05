import { describe, expect, it, beforeEach } from 'vitest';
import { ProdutoController } from './ProdutoController';
import { Produto } from './model/Produto';
import { ErroNaoEncontrado, ErroRegraDeNegocio, ErroValidacao } from './erros';
import type { ProdutoDAO } from './dao/ProdutoDAO';

// dublê de ProdutoDAO em memória, sem precisar de banco pra testar
function criarProdutoDAOFalso(idsComMovimentacao: number[] = []) {
  let proximoId = 1;
  const produtos: Produto[] = [];

  const dao = {
    async listarProdutos() {
      return [...produtos];
    },
    async buscarPorId(id: number) {
      return produtos.find((p) => p.getId() === id) ?? null;
    },
    async existeComNome(nome: string, idIgnorado?: number) {
      return produtos.some((p) => p.getId() !== idIgnorado && p.getNome().toLowerCase() === nome.toLowerCase());
    },
    async inserir(produto: Produto) {
      produto.setId(proximoId++);
      produtos.push(produto);
      return produto;
    },
    async atualizar(produto: Produto) {
      const indice = produtos.findIndex((p) => p.getId() === produto.getId());
      if (indice === -1) return null;
      produtos[indice] = produto;
      return produto;
    },
    async excluir(id: number) {
      // imita o banco recusando a exclusão de produto que já tem movimentação
      if (idsComMovimentacao.includes(id)) {
        throw new ErroRegraDeNegocio('Este produto já foi usado no sistema e não pode ser excluído.');
      }
      const indice = produtos.findIndex((p) => p.getId() === id);
      if (indice === -1) return false;
      produtos.splice(indice, 1);
      return true;
    },
  };

  return dao as unknown as ProdutoDAO;
}

const arroz = { nome: 'Arroz 5kg', categoria: 'Alimento', unidadeMedida: 'pacote', estoqueMinimo: 10 };

describe('ProdutoController - RF_B3 Gerenciar produtos', () => {
  let controller: ProdutoController;

  beforeEach(() => {
    controller = new ProdutoController(criarProdutoDAOFalso());
  });

  it('cadastra um produto válido com estoque zero', async () => {
    const produto = await controller.cadastrar(arroz);
    expect(produto.getId()).toBeDefined();
    expect(produto.getNome()).toBe('Arroz 5kg');
    expect(produto.getQuantidadeEstoque()).toBe(0);
  });

  it('rejeita cadastro com dados inválidos', async () => {
    await expect(controller.cadastrar({ ...arroz, nome: '' })).rejects.toThrow(ErroValidacao);
  });

  it('rejeita cadastro com nome duplicado (ignorando maiúsculas)', async () => {
    await controller.cadastrar(arroz);
    await expect(controller.cadastrar({ ...arroz, nome: 'ARROZ 5KG' })).rejects.toThrow(ErroValidacao);
  });

  it('lista os produtos cadastrados', async () => {
    await controller.cadastrar(arroz);
    await controller.cadastrar({ ...arroz, nome: 'Feijão 1kg' });
    expect(await controller.listar()).toHaveLength(2);
  });

  it('edita um produto existente', async () => {
    const produto = await controller.cadastrar(arroz);
    const editado = await controller.editar(produto.getId()!, { ...arroz, estoqueMinimo: 20 });
    expect(editado.getEstoqueMinimo()).toBe(20);
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

  it('dá erro ao editar produto inexistente', async () => {
    await expect(controller.editar(99, arroz)).rejects.toThrow(ErroNaoEncontrado);
  });

  it('exclui um produto', async () => {
    const produto = await controller.cadastrar(arroz);
    await controller.excluir(produto.getId()!);
    expect(await controller.listar()).toHaveLength(0);
  });

  it('dá erro ao excluir produto inexistente', async () => {
    await expect(controller.excluir(99)).rejects.toThrow(ErroNaoEncontrado);
  });

  it('não exclui produto que já tem movimentação', async () => {
    controller = new ProdutoController(criarProdutoDAOFalso([1]));
    const produto = await controller.cadastrar(arroz);
    await expect(controller.excluir(produto.getId()!)).rejects.toThrow(ErroRegraDeNegocio);
  });
});

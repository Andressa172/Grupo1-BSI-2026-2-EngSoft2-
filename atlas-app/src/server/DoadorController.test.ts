import { describe, expect, it, beforeEach } from 'vitest';
import { DoadorController } from './DoadorController';
import { Doador } from './model/Doador';
import { ErroNaoEncontrado, ErroValidacao } from './erros';
import type { DoadorDAO } from './dao/DoadorDAO';

// dublê de DoadorDAO em memória, sem precisar de banco pra testar
function criarDoadorDAOFalso() {
  let proximoId = 1;
  const doadores: Doador[] = [];

  const dao = {
    async listarTodos() {
      return [...doadores];
    },
    async buscarPorId(id: number) {
      return doadores.find((d) => d.getId() === id) ?? null;
    },
    async existeComNome(nome: string, idIgnorado?: number) {
      return doadores.some((d) => d.getId() !== idIgnorado && d.getNome().toLowerCase() === nome.toLowerCase());
    },
    async inserir(doador: Doador) {
      doador.setId(proximoId++);
      doadores.push(doador);
      return doador;
    },
    async atualizar(doador: Doador) {
      const indice = doadores.findIndex((d) => d.getId() === doador.getId());
      if (indice === -1) return null;
      doadores[indice] = doador;
      return doador;
    },
    async excluir(id: number) {
      const indice = doadores.findIndex((d) => d.getId() === id);
      if (indice === -1) return false;
      doadores.splice(indice, 1);
      return true;
    },
  };

  return dao as unknown as DoadorDAO;
}

describe('DoadorController - RF_B4 Gerenciar Doadores', () => {
  let controller: DoadorController;

  beforeEach(() => {
    controller = new DoadorController(criarDoadorDAOFalso());
  });

  it('cadastra um doador válido', async () => {
    const doador = await controller.cadastrar({ nome: 'Maria Aparecida', contato: '(18) 99999-1234' });
    expect(doador.getId()).toBeDefined();
    expect(doador.getNome()).toBe('Maria Aparecida');
  });

  it('rejeita cadastro com nome em branco', async () => {
    await expect(controller.cadastrar({ nome: '' })).rejects.toThrow(ErroValidacao);
  });

  it('rejeita cadastro com nome duplicado', async () => {
    await controller.cadastrar({ nome: 'Maria Aparecida' });
    await expect(controller.cadastrar({ nome: 'maria aparecida' })).rejects.toThrow(ErroValidacao);
  });

  it('permite cadastrar múltiplos doadores anônimos (nome vazio não conta como duplicado)', async () => {
    await controller.cadastrar({ nome: '', anonimo: true });
    await expect(controller.cadastrar({ nome: '', anonimo: true })).resolves.toBeDefined();
  });

  it('lista os doadores cadastrados', async () => {
    await controller.cadastrar({ nome: 'Doador 1' });
    await controller.cadastrar({ nome: 'Doador 2' });
    const lista = await controller.listar();
    expect(lista).toHaveLength(2);
  });

  it('busca um doador existente por id', async () => {
    const criado = await controller.cadastrar({ nome: 'Maria Aparecida' });
    const encontrado = await controller.buscarPorId(criado.getId()!);
    expect(encontrado.getNome()).toBe('Maria Aparecida');
  });

  it('lança ErroNaoEncontrado ao buscar id inexistente', async () => {
    await expect(controller.buscarPorId(999)).rejects.toThrow(ErroNaoEncontrado);
  });

  it('edita um doador existente', async () => {
    const criado = await controller.cadastrar({ nome: 'Maria Aparecida' });
    const editado = await controller.editar(criado.getId()!, { nome: 'Maria A. Silva', contato: '123' });
    expect(editado.getNome()).toBe('Maria A. Silva');
    expect(editado.getContato()).toBe('123');
  });

  it('rejeita edição que duplicaria o nome de outro doador', async () => {
    await controller.cadastrar({ nome: 'Doador 1' });
    const doador2 = await controller.cadastrar({ nome: 'Doador 2' });
    await expect(controller.editar(doador2.getId()!, { nome: 'Doador 1' })).rejects.toThrow(ErroValidacao);
  });

  it('lança ErroNaoEncontrado ao editar id inexistente', async () => {
    await expect(controller.editar(999, { nome: 'Qualquer' })).rejects.toThrow(ErroNaoEncontrado);
  });

  it('exclui um doador existente', async () => {
    const criado = await controller.cadastrar({ nome: 'Maria Aparecida' });
    await controller.excluir(criado.getId()!);
    await expect(controller.buscarPorId(criado.getId()!)).rejects.toThrow(ErroNaoEncontrado);
  });

  it('lança ErroNaoEncontrado ao excluir id inexistente', async () => {
    await expect(controller.excluir(999)).rejects.toThrow(ErroNaoEncontrado);
  });
});

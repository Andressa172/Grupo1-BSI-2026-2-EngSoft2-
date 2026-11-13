import { describe, expect, it, beforeEach } from 'vitest';
import { DoadorController, type DadosDoador } from './DoadorController';
import { Doador } from './model/Doador';
import { ErroNaoEncontrado, ErroRegraDeNegocio, ErroValidacao } from './erros';
import type { DoadorDAO } from './dao/DoadorDAO';

const CPF_VALIDO = '52998224725';
const CONTATO_VALIDO = { telefone: '(18) 99999-1234', email: 'maria@gmail.com', cpfCnpj: CPF_VALIDO };

function doador(nome: string, dados: Partial<DadosDoador> = {}): DadosDoador {
  return { nome, ...CONTATO_VALIDO, ...dados };
}

// dublê de DoadorDAO em memória, sem precisar de banco pra testar
function criarDoadorDAOFalso() {
  let proximoId = 1;
  const doadores: Doador[] = [];
  const idsComDoacao = new Set<number>();

  const dao = {
    async listarTodos() {
      return [...doadores];
    },
    async consultar() {
      return [...doadores];
    },
    async buscarPorId(id: number) {
      return doadores.find((d) => d.getId() === id) ?? null;
    },
    async existeComCpfCnpj(cpfCnpj: string, idIgnorado?: number) {
      return doadores.some((d) => d.getId() !== idIgnorado && d.getCpfCnpj() === cpfCnpj);
    },
    async existeAnonimo(idIgnorado?: number) {
      return doadores.some((d) => d.getId() !== idIgnorado && d.isAnonimo());
    },
    async possuiDoacoesVinculadas(id: number) {
      return idsComDoacao.has(id);
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
    // só pra esse teste marcar um doador como "já tem doação"
    _marcarComDoacao(id: number) {
      idsComDoacao.add(id);
    },
  };

  return dao as unknown as DoadorDAO & { _marcarComDoacao: (id: number) => void };
}

describe('DoadorController - RF_B4 Gerenciar Doadores', () => {
  let controller: DoadorController;
  let daoFalso: ReturnType<typeof criarDoadorDAOFalso>;

  beforeEach(() => {
    daoFalso = criarDoadorDAOFalso();
    controller = new DoadorController(daoFalso);
  });

  it('cadastra um doador válido', async () => {
    const criado = await controller.cadastrar(doador('Maria Aparecida'));
    expect(criado.getId()).toBeDefined();
    expect(criado.getNome()).toBe('Maria Aparecida');
  });

  it('rejeita cadastro com nome em branco', async () => {
    await expect(controller.cadastrar(doador(''))).rejects.toThrow(ErroValidacao);
  });

  it('rejeita cadastro sem CPF/CNPJ (exigido pelo modelo Pessoa do MER)', async () => {
    await expect(controller.cadastrar(doador('Maria', { cpfCnpj: undefined }))).rejects.toThrow(ErroValidacao);
  });

  it('rejeita cadastro sem telefone', async () => {
    await expect(controller.cadastrar(doador('Maria', { telefone: undefined }))).rejects.toThrow(ErroValidacao);
  });

  it('rejeita cadastro sem e-mail', async () => {
    await expect(controller.cadastrar(doador('Maria', { email: undefined }))).rejects.toThrow(ErroValidacao);
  });

  it('permite cadastrar nome duplicado (duas pessoas podem ter o mesmo nome)', async () => {
    await controller.cadastrar(doador('Maria Aparecida'));
    await expect(controller.cadastrar(doador('Maria Aparecida', { cpfCnpj: '12345678909' }))).resolves.toBeDefined();
  });

  it('rejeita cadastro com CPF/CNPJ duplicado', async () => {
    await controller.cadastrar(doador('Maria Aparecida'));
    await expect(controller.cadastrar(doador('Outra Pessoa'))).rejects.toThrow(ErroValidacao);
  });

  it('permite cadastrar o primeiro doador anônimo', async () => {
    await expect(controller.cadastrar({ nome: '', anonimo: true })).resolves.toBeDefined();
  });

  it('rejeita um segundo doador anônimo (só pode existir 1)', async () => {
    await controller.cadastrar({ nome: '', anonimo: true });
    await expect(controller.cadastrar({ nome: '', anonimo: true })).rejects.toThrow(ErroRegraDeNegocio);
  });

  it('lista os doadores cadastrados', async () => {
    await controller.cadastrar(doador('Doador 1'));
    await controller.cadastrar(doador('Doador 2', { cpfCnpj: '12345678909' }));
    const lista = await controller.listar();
    expect(lista).toHaveLength(2);
  });

  it('busca um doador existente por id', async () => {
    const criado = await controller.cadastrar(doador('Maria Aparecida'));
    const encontrado = await controller.buscarPorId(criado.getId()!);
    expect(encontrado.getNome()).toBe('Maria Aparecida');
  });

  it('lança ErroNaoEncontrado ao buscar id inexistente', async () => {
    await expect(controller.buscarPorId(999)).rejects.toThrow(ErroNaoEncontrado);
  });

  it('edita um doador existente', async () => {
    const criado = await controller.cadastrar(doador('Maria Aparecida'));
    const editado = await controller.editar(criado.getId()!, doador('Maria A. Silva', { telefone: '(18) 98888-0000' }));
    expect(editado.getNome()).toBe('Maria A. Silva');
    expect(editado.getTelefone()).toBe('(18) 98888-0000');
  });

  it('rejeita edição que duplicaria o CPF/CNPJ de outro doador', async () => {
    await controller.cadastrar(doador('Doador 1'));
    const doador2 = await controller.cadastrar(doador('Doador 2', { cpfCnpj: '12345678909' }));
    await expect(controller.editar(doador2.getId()!, doador('Doador 2', { cpfCnpj: CPF_VALIDO }))).rejects.toThrow(
      ErroValidacao
    );
  });

  it('lança ErroNaoEncontrado ao editar id inexistente', async () => {
    await expect(controller.editar(999, doador('Qualquer'))).rejects.toThrow(ErroNaoEncontrado);
  });

  it('exclui um doador existente', async () => {
    const criado = await controller.cadastrar(doador('Maria Aparecida'));
    await controller.excluir(criado.getId()!);
    await expect(controller.buscarPorId(criado.getId()!)).rejects.toThrow(ErroNaoEncontrado);
  });

  it('lança ErroNaoEncontrado ao excluir id inexistente', async () => {
    await expect(controller.excluir(999)).rejects.toThrow(ErroNaoEncontrado);
  });

  it('rejeita exclusão de doador que já possui doação registrada (FK)', async () => {
    const criado = await controller.cadastrar(doador('Maria Aparecida'));
    daoFalso._marcarComDoacao(criado.getId()!);
    await expect(controller.excluir(criado.getId()!)).rejects.toThrow(ErroRegraDeNegocio);
  });
});

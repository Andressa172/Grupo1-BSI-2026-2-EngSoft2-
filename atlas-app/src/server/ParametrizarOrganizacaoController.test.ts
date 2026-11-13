import { beforeEach, describe, expect, it } from 'vitest';
import { ParametrizarOrganizacaoController } from './ParametrizarOrganizacaoController';
import { Organizacao } from './model/Organizacao';
import { ErroValidacao } from './erros';
import type { OrganizacaoDAO } from './dao/OrganizacaoDAO';

function criarOrganizacaoDAOFalso(inicial: Organizacao | null = null) {
  let organizacao = inicial;
  return {
    async obter() {
      return organizacao;
    },
    async salvar(novaOrganizacao: Organizacao) {
      organizacao = novaOrganizacao;
      return novaOrganizacao;
    },
  } as unknown as OrganizacaoDAO;
}

const dadosValidos = {
  nomeFantasia: 'SOS Criança',
  cnpj: '18.236.120/0001-58',
  email: 'contato@soscrianca.org',
};

describe('ParametrizarOrganizacaoController - RF_Parametrizacao', () => {
  let controller: ParametrizarOrganizacaoController;

  beforeEach(() => {
    controller = ParametrizarOrganizacaoController.criarParaTeste(criarOrganizacaoDAOFalso());
  });

  it('retorna parâmetros padrão quando a organização ainda não foi cadastrada', async () => {
    await expect(controller.obterParametros()).resolves.toMatchObject({
      id: 1,
      nomeFantasia: 'ATLAS',
      caminhoLogo: null,
    });
  });

  it('salva uma organização válida', async () => {
    await expect(controller.salvarParametros(dadosValidos)).resolves.toMatchObject(dadosValidos);
  });

  it('mantém os dados salvos ao consultar os parâmetros', async () => {
    await controller.salvarParametros(dadosValidos);
    await expect(controller.obterParametros()).resolves.toMatchObject(dadosValidos);
  });

  it('rejeita organização sem nome', async () => {
    await expect(controller.salvarParametros({ ...dadosValidos, nomeFantasia: '' })).rejects.toThrow(ErroValidacao);
  });

  it('rejeita e-mail inválido', async () => {
    await expect(controller.salvarParametros({ ...dadosValidos, email: 'invalido' })).rejects.toThrow(ErroValidacao);
  });

  it('rejeita CNPJ com quantidade incorreta de dígitos ou DV inválido', async () => {
    await expect(controller.salvarParametros({ ...dadosValidos, cnpj: '123' })).rejects.toThrow(ErroValidacao);
    await expect(controller.salvarParametros({ ...dadosValidos, cnpj: '18.236.120/0001-59' })).rejects.toThrow(
      ErroValidacao
    );
  });

  it('aceita CNPJ alfanumérico válido', async () => {
    await expect(
      controller.salvarParametros({ ...dadosValidos, cnpj: '12.ABC.345/01DE-35' })
    ).resolves.toMatchObject({ cnpj: '12.ABC.345/01DE-35' });
  });
});
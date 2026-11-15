import { beforeEach, describe, expect, it } from 'vitest';
import { ParametrizarOrganizacaoController } from './ParametrizarOrganizacaoController';
import { ErroValidacao } from './erros';
import type { ExecutorSQL } from './dao/tipos';
import type { OrganizacaoLinha } from './dao/OrganizacaoDAO';

// Conexão falsa que responde às duas consultas do OrganizacaoDAO (o Model é quem cria o DAO).
function criarConexaoFalsa(): ExecutorSQL {
  let linha: OrganizacaoLinha | null = null;
  return {
    async query(texto: string, parametros: unknown[] = []) {
      if (texto.trim().startsWith('INSERT')) {
        const [nome, cnpj, endereco, telefone, email, logo] = parametros as (string | null)[];
        linha = {
          id: 1,
          nome_fantasia: nome as string,
          cnpj,
          endereco,
          telefone,
          email,
          caminho_logo: logo ?? linha?.caminho_logo ?? null,
        };
      }
      return { rows: linha ? [linha] : [] };
    },
  } as unknown as ExecutorSQL;
}

const dadosValidos = {
  nomeFantasia: 'SOS Criança',
  cnpj: '18.236.120/0001-58',
  email: 'contato@soscrianca.org',
};

describe('ParametrizarOrganizacaoController - RF_Parametrizacao', () => {
  let controller: ParametrizarOrganizacaoController;

  beforeEach(() => {
    controller = ParametrizarOrganizacaoController.criarParaTeste(criarConexaoFalsa());
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
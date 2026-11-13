// Controller - AprovarCotacaoController (RF_F8 - Aprovar cotação / CAprovarCotacao na ERS)
//
// - Singleton + Façade: única instância (`instancia` estática privada + construtor privado + `getInstancia()`).
// - Abre e mantém a conexão com o banco (Database Singleton).
// - Instancia as entidades Cotacao e FiltroCotacao.
// - Executa as regras de negócio (IF de hierarquia de cargo Gerente e status PENDENTE)
//   e controla a transação.
// - Quem cria o CotacaoDAO é a Model Cotacao.
import { Database } from './db/Database';
import { ErroNaoEncontrado, ErroRegraDeNegocio, ErroValidacao } from './erros';
import { Cotacao, type CotacaoRegistro } from './model/Cotacao';
import { FiltroCotacao, type FiltroCotacaoAtributos } from './model/FiltroCotacao';

const ID_MAXIMO = 2_147_483_647;

function validarIdCotacao(id: unknown): number {
  const num =
    typeof id === 'number'
      ? id
      : typeof id === 'string' && /^\d{1,10}$/.test(id.trim())
        ? Number(id.trim())
        : NaN;
  if (!Number.isInteger(num) || num <= 0 || num > ID_MAXIMO) {
    throw new ErroNaoEncontrado('Cotação não encontrada.');
  }
  return num;
}

export class AprovarCotacaoController {
  private static instancia: AprovarCotacaoController | null = null;
  private readonly conexao: Database;

  private constructor() {
    this.conexao = Database.getInstancia();
  }

  static getInstancia(): AprovarCotacaoController {
    if (!AprovarCotacaoController.instancia) {
      AprovarCotacaoController.instancia = new AprovarCotacaoController();
    }
    return AprovarCotacaoController.instancia;
  }

  /**
   * RF_F8 passo 1 e 2: busca a cotação pelo seu identificador (idCotacao) com itens.
   * Fluxo alternativo 1.1: lança ErroNaoEncontrado se não existir.
   */
  async buscarPorId(id: unknown): Promise<CotacaoRegistro> {
    const idValido = validarIdCotacao(id);
    const encontrada = await Cotacao.buscarPorId(idValido, this.conexao);
    if (!encontrada) {
      throw new ErroNaoEncontrado('Cotação não encontrada.');
    }
    return encontrada;
  }

  /**
   * RF_F8 passo 3 a 5 (Fluxo básico: Aprovação; Fluxo alternativo 3.1: Reprovação com justificativa obrigatória).
   * Regra de negócio no Controller: restrito ao cargo GERENTE e a cotações com status PENDENTE.
   */
  async avaliar(id: unknown, dados: unknown): Promise<CotacaoRegistro> {
    const idValido = validarIdCotacao(id);
    if (typeof dados !== 'object' || dados === null || Array.isArray(dados)) {
      throw new ErroValidacao('Dados inválidos.');
    }

    const cotacao = new Cotacao(dados);
    const erros = cotacao.validarAvaliacao();
    if (Object.keys(erros).length > 0) {
      throw new ErroValidacao('Corrija os campos destacados.', erros);
    }

    return this.conexao.comTransacao(async (tx) => {
      // Regra de negócio no Controller: verifica se o avaliador existe, está ativo e tem cargo GERENTE
      const gerente = await cotacao.buscarGerenteAvaliador(tx);
      if (!gerente || !gerente.ativo) {
        throw new ErroRegraDeNegocio('Gerente responsável não encontrado ou inativo.');
      }
      if (gerente.perfil !== 'GERENTE') {
        throw new ErroRegraDeNegocio('Apenas usuários com cargo de Gerente podem aprovar ou reprovar cotações.');
      }

      // Regra de negócio no Controller: verifica se a cotação existe e está PENDENTE
      const existente = await Cotacao.buscarPorId(idValido, tx);
      if (!existente) {
        throw new ErroNaoEncontrado('Cotação não encontrada.');
      }
      if (existente.status !== 'PENDENTE') {
        throw new ErroRegraDeNegocio('Apenas cotações com status PENDENTE podem ser avaliadas.');
      }

      const atualizou = await cotacao.atualizarAvaliacao(idValido, tx);
      if (!atualizou) {
        throw new ErroRegraDeNegocio('Não foi possível atualizar o status da cotação.');
      }

      const atualizada = await Cotacao.buscarPorId(idValido, tx);
      if (!atualizada) {
        throw new ErroNaoEncontrado('Cotação não encontrada.');
      }
      return atualizada;
    });
  }

  async consultar(criterios: FiltroCotacaoAtributos = {}): Promise<CotacaoRegistro[]> {
    const filtro = new FiltroCotacao(criterios);
    const erros = filtro.validar();
    if (Object.keys(erros).length > 0) {
      throw new ErroValidacao('Corrija os campos destacados.', erros);
    }
    return Cotacao.consultar(filtro, this.conexao);
  }
}

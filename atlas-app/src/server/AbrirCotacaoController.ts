// Controller - AbrirCotacaoController (RF_F7 - Abrir cotação / CAbrirCotacao na ERS)
//
// - Singleton + Façade: única instância (`instancia` estática privada + construtor privado + `getInstancia()`).
// - Abre e mantém a conexão com o banco (Database Singleton).
// - Instancia as entidades Cotacao, ItemCotacao e FiltroCotacao.
// - Executa as regras de negócio (IF de hierarquia de cargo Secretário), inicia a transação
//   e executa o LOOP para persistir os itens da cotação.
// - Quem cria o CotacaoDAO são as Models (Cotacao e ItemCotacao).
import { Database } from './db/Database';
import { ErroNaoEncontrado, ErroRegraDeNegocio, ErroValidacao } from './erros';
import { Cotacao, type CotacaoRegistro } from './model/Cotacao';
import { ItemCotacao } from './model/ItemCotacao';
import { FiltroCotacao, type FiltroCotacaoAtributos } from './model/FiltroCotacao';

export class AbrirCotacaoController {
  private static instancia: AbrirCotacaoController | null = null;
  private readonly conexao: Database;

  private constructor() {
    this.conexao = Database.getInstancia();
  }

  static getInstancia(): AbrirCotacaoController {
    if (!AbrirCotacaoController.instancia) {
      AbrirCotacaoController.instancia = new AbrirCotacaoController();
    }
    return AbrirCotacaoController.instancia;
  }

  /**
   * RF_F7 (Abrir cotação):
   * 1. Instancia ItemCotacao e Cotacao (mantendo a lista de itens na entidade Cotacao).
   * 2. Valida atributos gerais e itens.
   * 3. Inicia a transação, verifica a regra de negócio (apenas Secretário ativo pode abrir),
   *    grava o cabeçalho da cotação e executa o LOOP para persistir cada ItemCotacao.
   */
  async abrir(dados: unknown): Promise<CotacaoRegistro> {
    if (typeof dados !== 'object' || dados === null || Array.isArray(dados)) {
      throw new ErroValidacao('Dados inválidos.');
    }

    const d = dados as Record<string, unknown>;
    const itensInstanciados = Array.isArray(d.itens)
      ? d.itens.map((itemBruto) => new ItemCotacao(itemBruto))
      : undefined;

    const cotacao = new Cotacao(d, itensInstanciados);
    const erros = cotacao.validarAbertura();
    if (Object.keys(erros).length > 0) {
      throw new ErroValidacao('Corrija os campos destacados.', erros);
    }

    return this.conexao.comTransacao(async (tx) => {
      // Regra de negócio no Controller: verifica se o usuário existe, está ativo e tem cargo SECRETARIO
      const usuario = await cotacao.buscarUsuarioResponsavel(tx);
      if (!usuario || !usuario.ativo) {
        throw new ErroRegraDeNegocio('Usuário responsável não encontrado ou inativo.');
      }
      if (usuario.perfil !== 'SECRETARIO') {
        throw new ErroRegraDeNegocio('Apenas usuários com cargo de Secretário podem abrir cotações.');
      }

      const idCotacao = await cotacao.inserirCabecalho(tx);

      // LOOP na camada de Controle para persistir os itens da cotação (cada ItemCotacao persiste a si mesmo)
      for (const [indice, item] of cotacao.getItens().entries()) {
        const registrado = await item.gravar(idCotacao, tx);
        if (!registrado) {
          throw new ErroValidacao('Corrija os campos destacados.', {
            [`itens.${indice}.produto`]: 'Produto não cadastrado no sistema.',
          });
        }
      }

      const gravada = await Cotacao.buscarPorId(idCotacao, tx);
      if (!gravada) {
        throw new ErroNaoEncontrado('Erro ao recuperar a cotação recém-aberta.');
      }
      return gravada;
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

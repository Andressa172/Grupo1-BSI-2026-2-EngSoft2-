// Control - LancarEntradaCompraController (RF_F2 - Lançar entrada de compras)
//
// - Não se auto-instancia: quem usa o Controller (a rota) cria com `new`. Também não chama outro
//   Controller: a entrada no estoque (RF_F1) é feita pelo Model Compra.
// - Façade: a View (via rotas /api/compras) só conhece estes métodos.
// - Abre e mantém a conexão com o banco (Database, Singleton), cria o Model Compra,
//   decide quando validar e persistir e controla a transação (tudo grava ou nada grava).
//   Quem cria o DAO é o Model.
import { Database } from './db/Database';
import { Compra, MENSAGEM_NF_DUPLICADA, type CompraAtributos } from './model/Compra';
import { FiltroCompra, type FiltroCompraAtributos } from './model/FiltroCompra';
import type { CompraRegistro } from './dao/CompraDAO';
import { ErroValidacao, type ErrosDeCampo } from './erros';

const MENSAGEM_CAMPOS_INVALIDOS = 'Corrija os campos destacados.';

function lancarSeTiverErros(erros: ErrosDeCampo): void {
  if (Object.keys(erros).length > 0) {
    throw new ErroValidacao(MENSAGEM_CAMPOS_INVALIDOS, erros);
  }
}

function comoObjeto(dados: unknown): Partial<CompraAtributos> {
  if (typeof dados !== 'object' || dados === null || Array.isArray(dados)) {
    throw new ErroValidacao('Dados inválidos.');
  }
  return dados as Partial<CompraAtributos>;
}

export class LancarEntradaCompraController {
  // conexão com o banco, aberta e mantida pelo Controller
  private readonly conexao: Database;

  constructor() {
    this.conexao = Database.getInstancia();
  }

  /** Consulta com 3 filtros: nota fiscal, fornecedor e período. */
  async consultar(dadosFiltro: FiltroCompraAtributos = {}): Promise<CompraRegistro[]> {
    const filtro = new FiltroCompra(dadosFiltro);
    lancarSeTiverErros(filtro.validar());
    return Compra.consultar(this.conexao, filtro);
  }

  /**
   * Passos 8 a 11 do fluxo básico: a tela só chama depois que o gerente confirmou (passos 6 e 7).
   * Valida tudo e só então grava a compra (com o gerente que a lançou) e dá entrada no estoque,
   * numa transação só. `gerenteId` é o gerente autenticado, vindo da rota.
   */
  async registrar(dados: unknown, gerenteId: number): Promise<Compra> {
    const compra = new Compra(comoObjeto(dados));
    lancarSeTiverErros(compra.validar());

    // fluxo 2.1: nota fiscal já registrada
    if (await compra.existeNotaFiscalIgual(this.conexao)) {
      throw new ErroValidacao(MENSAGEM_NF_DUPLICADA, { numeroNF: MENSAGEM_NF_DUPLICADA });
    }

    await this.conexao.comTransacao(async (cliente) => {
      await compra.incluir(cliente, gerenteId);

      const itens = compra.getItens();
      for (let i = 0; i < itens.length; i++) {
        await compra.incluirItem(cliente, itens[i], i);
      }
    });
    return compra;
  }
}

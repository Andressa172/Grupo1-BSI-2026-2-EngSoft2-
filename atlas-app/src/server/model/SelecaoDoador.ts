// Model - SelecaoDoador: a escolha do doador feita na tela (RF_F3 / RF_F11, passos 1 e 2 e fluxo 1.1).
// Pode ser um doador já cadastrado, anônimo ou novo. Este Model só guarda e valida os dados da escolha:
// quem cria o Model Doador, busca no banco e grava é o Controller (Model não instancia outro Model).
import type { ErrosDeCampo } from '../erros';
import type { DoadorAtributos, TipoPessoa } from './Doador';
import { textoSeguro } from './datasBR';

type Tipo = 'existente' | 'anonimo' | 'novo' | 'nenhum';
const ID_MAXIMO = 2_147_483_647;
// caracteres invisíveis de controle (inclui o byte nulo, que o PostgreSQL não aceita em texto)
// eslint-disable-next-line no-control-regex
const CARACTERE_DE_CONTROLE = /[\u0000-\u001f\u007f]/;

// o Doador (RF_B4) usa estes nomes de campo; a tela da doação usa os da direita
const CAMPO_NA_TELA: Record<string, string> = {
  cpfCnpj: 'doador.cpfCnpj',
  email: 'doador.email',
  tipoPessoa: 'doador.tipoPessoa',
};

export class SelecaoDoador {
  private readonly tipo: Tipo;
  private readonly id: number;
  private readonly nome: string;
  private readonly contato: string;
  private readonly email: string;
  private readonly cpfCnpj: string;
  private readonly tipoPessoa: TipoPessoa;

  constructor(dados: unknown) {
    const d = typeof dados === 'object' && dados !== null ? (dados as Record<string, unknown>) : {};
    const tipo = d.tipo;
    this.tipo = tipo === 'existente' || tipo === 'anonimo' || tipo === 'novo' ? tipo : 'nenhum';
    this.id = typeof d.id === 'number' || typeof d.id === 'string' ? Number(d.id) : NaN;
    this.nome = textoSeguro(d.nome);
    this.contato = textoSeguro(d.contato);
    this.email = textoSeguro(d.email);
    this.cpfCnpj = textoSeguro(d.cpfCnpj);
    this.tipoPessoa = d.tipoPessoa === 'JURIDICA' ? 'JURIDICA' : 'FISICA';
  }

  isExistente(): boolean {
    return this.tipo === 'existente';
  }

  isAnonimo(): boolean {
    return this.tipo === 'anonimo';
  }

  isNovo(): boolean {
    return this.tipo === 'novo';
  }

  getId(): number {
    return this.id;
  }

  /** Dados para o Controller criar o Model Doador quando a escolha é "novo doador". */
  getDadosNovoDoador(): DoadorAtributos {
    return { nome: this.nome, telefone: this.contato, email: this.email, cpfCnpj: this.cpfCnpj, tipoPessoa: this.tipoPessoa };
  }

  /**
   * Só valida, sem gravar nada. `errosDoadorNovo` é o resultado de Doador.validar(), que o Controller
   * obtém do Model Doador (CPF/CNPJ, e-mail e tipo de pessoa seguem as regras do cadastro de doadores).
   */
  validar(errosDoadorNovo: ErrosDeCampo = {}): ErrosDeCampo {
    const erros: ErrosDeCampo = {};
    if (this.tipo === 'nenhum') {
      erros.doador = 'Selecione o doador, escolha doador anônimo ou cadastre um novo.';
    } else if (this.tipo === 'existente') {
      if (!Number.isInteger(this.id) || this.id <= 0 || this.id > ID_MAXIMO) erros.doador = 'Doador inválido.';
    } else if (this.tipo === 'novo') {
      if (this.nome.length < 3) {
        erros['doador.nome'] = 'Nome do doador inválido: informe ao menos 3 caracteres.';
      } else if (CARACTERE_DE_CONTROLE.test(this.nome)) {
        erros['doador.nome'] = 'Nome do doador inválido: contém caracteres não permitidos.';
      } else if (this.nome.length > 120) {
        erros['doador.nome'] = 'O nome do doador deve ter no máximo 120 caracteres.';
      }
      if (this.contato.replace(/\D/g, '').length < 10 || this.contato.length > 30 || CARACTERE_DE_CONTROLE.test(this.contato)) {
        erros['doador.contato'] = 'Contato inválido: informe um telefone com DDD.';
      }
      for (const [campo, chave] of Object.entries(CAMPO_NA_TELA)) {
        if (errosDoadorNovo[campo]) erros[chave] = errosDoadorNovo[campo];
      }
    }
    return erros;
  }
}

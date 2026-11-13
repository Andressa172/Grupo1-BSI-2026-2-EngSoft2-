// mapa campo -> mensagem, para a tela destacar cada campo inválido
export type ErrosDeCampo = Record<string, string>;

export class ErroValidacao extends Error {
  // opcional: quem só passa a mensagem continua funcionando igual
  readonly erros?: ErrosDeCampo;

  constructor(mensagem: string, erros?: ErrosDeCampo) {
    super(mensagem);
    this.name = 'ErroValidacao';
    this.erros = erros;
  }
}

export class ErroNaoEncontrado extends Error {
  constructor(mensagem: string) {
    super(mensagem);
    this.name = 'ErroNaoEncontrado';
  }
}

export class ErroRegraDeNegocio extends Error {
  constructor(mensagem: string) {
    super(mensagem);
    this.name = 'ErroRegraDeNegocio';
  }
}

export class ErroAutenticacao extends Error {
  constructor(mensagem: string) {
    super(mensagem);
    this.name = 'ErroAutenticacao';
  }
}

export class ErroAutorizacao extends Error {
  constructor(mensagem: string) {
    super(mensagem);
    this.name = 'ErroAutorizacao';
  }
}

export class ErroConflito extends Error {
  constructor(mensagem: string) {
    super(mensagem);
    this.name = 'ErroConflito';
  }
}

export class ErroCaixaFechado extends ErroRegraDeNegocio {
  constructor(mensagem = 'Não é possível registrar movimentação: o caixa está fechado.') {
    super(mensagem);
    this.name = 'ErroCaixaFechado';
  }
}

export interface DivergenciaCaixaDetalhes {
  esperado: { fisico: number; digital: number };
  informado: { fisico: number; digital: number };
  diferenca: { fisico: number; digital: number };
  requerConfirmacaoRessalva: true;
}

export class ErroDivergenciaCaixa extends Error {
  readonly detalhes: DivergenciaCaixaDetalhes;

  constructor(mensagem: string, detalhes: DivergenciaCaixaDetalhes) {
    super(mensagem);
    this.name = 'ErroDivergenciaCaixa';
    this.detalhes = detalhes;
  }
}


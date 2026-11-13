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


export class ErroValidacao extends Error {
  constructor(mensagem: string) {
    super(mensagem);
    this.name = 'ErroValidacao';
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

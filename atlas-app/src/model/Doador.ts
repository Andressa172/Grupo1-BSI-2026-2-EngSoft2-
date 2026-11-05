import { type ErrosValidacao } from './validacao';

/** Entidade Doador (RF_F3 / RF_F11, fluxo alternativo 1.1). */
export class Doador {
  constructor(
    public nome: string,
    public contato: string,
    public anonimo: boolean = false
  ) {}

  validar(): ErrosValidacao {
    const erros: ErrosValidacao = {};
    if (this.anonimo) return erros;
    if (this.nome.trim().length < 3) {
      erros['doador.nome'] = 'Nome do doador inválido: informe ao menos 3 caracteres.';
    }
    if (this.contato.replace(/\D/g, '').length < 10) {
      erros['doador.contato'] = 'Contato inválido: informe um telefone com DDD.';
    }
    return erros;
  }
}

import { type ErrosValidacao, dataValida, hoje } from './validacao';

export const SEXOS = ['Feminino', 'Masculino'] as const;

/** Entidade Atendido (RF_B1 - Gerenciar atendidos). */
export class Atendido {
  constructor(
    public nome: string,
    public dataNascimento: Date,
    public sexo: string,
    public responsavelLegal: string,
    public dataCadastro: Date = hoje(),
    public id: string = ''
  ) {}

  /** Idade em anos completos na data de referência (padrão: hoje). */
  idade(referencia: Date = hoje()): number {
    if (!dataValida(this.dataNascimento)) return 0;
    let anos = referencia.getUTCFullYear() - this.dataNascimento.getUTCFullYear();
    const aindaNaoFezAniversario =
      referencia.getUTCMonth() < this.dataNascimento.getUTCMonth() ||
      (referencia.getUTCMonth() === this.dataNascimento.getUTCMonth() &&
        referencia.getUTCDate() < this.dataNascimento.getUTCDate());
    if (aindaNaoFezAniversario) anos--;
    return anos;
  }

  /** Regras de validação dos dados do atendido. Mapa vazio = dados válidos. */
  validar(): ErrosValidacao {
    const erros: ErrosValidacao = {};

    if (this.nome.trim().length < 3) {
      erros.nome = 'Nome inválido: informe ao menos 3 caracteres.';
    }

    if (!dataValida(this.dataNascimento)) {
      erros.dataNascimento = 'Informe uma data de nascimento válida (dd/mm/aaaa).';
    } else if (this.dataNascimento.getTime() > hoje().getTime()) {
      erros.dataNascimento = 'A data de nascimento não pode estar no futuro.';
    } else if (this.idade() > 120) {
      erros.dataNascimento = 'Data de nascimento inválida: idade acima de 120 anos.';
    }

    if (!(SEXOS as readonly string[]).includes(this.sexo)) {
      erros.sexo = 'Selecione o sexo.';
    }

    if (this.responsavelLegal.trim().length < 3) {
      erros.responsavelLegal = 'Informe o nome do responsável legal (ao menos 3 caracteres).';
    }

    return erros;
  }
}

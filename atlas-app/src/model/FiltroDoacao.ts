import { type ErrosValidacao, dataValida, parseDataBR } from './validacao';

/**
 * Critérios da consulta de doações (2 filtros):
 *   1) doador  - id do doador ('' = todos)
 *   2) período - data inicial e/ou final, no formato dd/mm/aaaa (vazio = sem limite)
 */
export class FiltroDoacao {
  constructor(
    public readonly doadorId: string = '',
    public readonly dataInicial: string = '',
    public readonly dataFinal: string = ''
  ) {}

  validar(): ErrosValidacao {
    const erros: ErrosValidacao = {};
    const de = this.dataInicial.trim();
    const ate = this.dataFinal.trim();

    if (de !== '' && !dataValida(parseDataBR(de))) erros.dataInicial = 'Informe uma data válida (dd/mm/aaaa).';
    if (ate !== '' && !dataValida(parseDataBR(ate))) erros.dataFinal = 'Informe uma data válida (dd/mm/aaaa).';

    if (!erros.dataInicial && !erros.dataFinal && de !== '' && ate !== '') {
      if (parseDataBR(de).getTime() > parseDataBR(ate).getTime()) {
        erros.dataFinal = 'A data final não pode ser anterior à data inicial.';
      }
    }
    return erros;
  }

  /** Diz se uma doação (id do doador + data ISO) atende aos dois filtros. Supõe filtro válido. */
  aceita(doadorId: string, dataIso: string): boolean {
    if (this.doadorId !== '' && this.doadorId !== doadorId) return false;

    const d = new Date(dataIso);
    const dia = Date.UTC(d.getFullYear(), d.getMonth(), d.getDate(), 12); // dia local da doação
    if (this.dataInicial.trim() !== '' && dia < parseDataBR(this.dataInicial).getTime()) return false;
    if (this.dataFinal.trim() !== '' && dia > parseDataBR(this.dataFinal).getTime()) return false;
    return true;
  }
}

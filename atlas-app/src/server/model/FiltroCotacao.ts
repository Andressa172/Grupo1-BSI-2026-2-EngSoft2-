// Model - FiltroCotacao: critérios de busca/consulta de cotações (RF_F7 e RF_F8).
import type { ErrosDeCampo } from '../erros';
import { dataValida, paraIso, parseData, textoSeguro } from './datasBR';

const ID_MAXIMO = 2_147_483_647;
const STATUS_VALIDOS = ['PENDENTE', 'APROVADA', 'REPROVADA'] as const;
export type StatusCotacaoValor = (typeof STATUS_VALIDOS)[number];

export interface FiltroCotacaoAtributos {
  id?: string | number | null;
  status?: string | null;
  descricao?: string | null;
  dataAbertura?: string | null;
  dataAberturaInicio?: string | null;
  dataAberturaFim?: string | null;
  dataAprovacao?: string | null;
  dataAprovacaoInicio?: string | null;
  dataAprovacaoFim?: string | null;
  produtoId?: string | number | null;
  item?: string | null;
  dataInicial?: string | null;
  dataFinal?: string | null;
}

export class FiltroCotacao {
  private readonly id: string;
  private readonly status: string;
  private readonly descricao: string;
  private readonly dataAbertura: string;
  private readonly dataAberturaInicio: string;
  private readonly dataAberturaFim: string;
  private readonly dataAprovacao: string;
  private readonly dataAprovacaoInicio: string;
  private readonly dataAprovacaoFim: string;
  private readonly produtoId: string;
  private readonly item: string;

  constructor(atributos: FiltroCotacaoAtributos = {}) {
    this.id = textoSeguro(typeof atributos.id === 'number' ? String(atributos.id) : atributos.id);
    this.status = textoSeguro(atributos.status).toUpperCase();
    this.descricao = textoSeguro(atributos.descricao);
    this.dataAbertura = textoSeguro(atributos.dataAbertura);
    this.dataAberturaInicio = textoSeguro(atributos.dataAberturaInicio || atributos.dataInicial);
    this.dataAberturaFim = textoSeguro(atributos.dataAberturaFim || atributos.dataFinal);
    this.dataAprovacao = textoSeguro(atributos.dataAprovacao);
    this.dataAprovacaoInicio = textoSeguro(atributos.dataAprovacaoInicio);
    this.dataAprovacaoFim = textoSeguro(atributos.dataAprovacaoFim);
    this.produtoId = textoSeguro(
      typeof atributos.produtoId === 'number' ? String(atributos.produtoId) : atributos.produtoId
    );
    this.item = textoSeguro(atributos.item);
  }

  getId(): number | null {
    return this.id === '' ? null : Number(this.id);
  }

  getStatus(): StatusCotacaoValor | null {
    return this.status === '' ? null : (this.status as StatusCotacaoValor);
  }

  getDescricao(): string {
    return this.descricao;
  }

  getDataAbertura(): string | null {
    return this.dataAbertura === '' ? null : paraIso(parseData(this.dataAbertura));
  }

  getDataAberturaInicio(): string | null {
    return this.dataAberturaInicio === '' ? null : paraIso(parseData(this.dataAberturaInicio));
  }

  getDataAberturaFim(): string | null {
    return this.dataAberturaFim === '' ? null : paraIso(parseData(this.dataAberturaFim));
  }

  getDataAprovacao(): string | null {
    return this.dataAprovacao === '' ? null : paraIso(parseData(this.dataAprovacao));
  }

  getDataAprovacaoInicio(): string | null {
    return this.dataAprovacaoInicio === '' ? null : paraIso(parseData(this.dataAprovacaoInicio));
  }

  getDataAprovacaoFim(): string | null {
    return this.dataAprovacaoFim === '' ? null : paraIso(parseData(this.dataAprovacaoFim));
  }

  getProdutoId(): number | null {
    return this.produtoId === '' ? null : Number(this.produtoId);
  }

  getItem(): string {
    return this.item;
  }

  validar(): ErrosDeCampo {
    const erros: ErrosDeCampo = {};

    if (this.id !== '') {
      const idNum = Number(this.id);
      if (!/^\d{1,10}$/.test(this.id) || idNum <= 0 || idNum > ID_MAXIMO) {
        erros.id = 'Identificador da cotação inválido.';
      }
    }

    if (this.status !== '' && !STATUS_VALIDOS.includes(this.status as StatusCotacaoValor)) {
      erros.status = 'Status de filtro inválido. Use PENDENTE, APROVADA ou REPROVADA.';
    }

    if (this.descricao.length > 255) {
      erros.descricao = 'O filtro de descrição deve ter no máximo 255 caracteres.';
    }

    if (this.dataAbertura !== '' && !dataValida(parseData(this.dataAbertura))) {
      erros.dataAbertura = 'Informe uma data de abertura válida (dd/mm/aaaa ou aaaa-mm-dd).';
    }

    if (this.dataAberturaInicio !== '' && !dataValida(parseData(this.dataAberturaInicio))) {
      erros.dataAberturaInicio = 'Informe uma data inicial de abertura válida (dd/mm/aaaa ou aaaa-mm-dd).';
    }

    if (this.dataAberturaFim !== '' && !dataValida(parseData(this.dataAberturaFim))) {
      erros.dataAberturaFim = 'Informe uma data final de abertura válida (dd/mm/aaaa ou aaaa-mm-dd).';
    }

    if (
      !erros.dataAberturaInicio &&
      !erros.dataAberturaFim &&
      this.dataAberturaInicio !== '' &&
      this.dataAberturaFim !== ''
    ) {
      if (parseData(this.dataAberturaInicio).getTime() > parseData(this.dataAberturaFim).getTime()) {
        erros.dataAberturaFim = 'A data final de abertura não pode ser anterior à data inicial.';
      }
    }

    if (this.dataAprovacao !== '' && !dataValida(parseData(this.dataAprovacao))) {
      erros.dataAprovacao = 'Informe uma data de aprovação válida (dd/mm/aaaa ou aaaa-mm-dd).';
    }

    if (this.dataAprovacaoInicio !== '' && !dataValida(parseData(this.dataAprovacaoInicio))) {
      erros.dataAprovacaoInicio = 'Informe uma data inicial de aprovação válida (dd/mm/aaaa ou aaaa-mm-dd).';
    }

    if (this.dataAprovacaoFim !== '' && !dataValida(parseData(this.dataAprovacaoFim))) {
      erros.dataAprovacaoFim = 'Informe uma data final de aprovação válida (dd/mm/aaaa ou aaaa-mm-dd).';
    }

    if (
      !erros.dataAprovacaoInicio &&
      !erros.dataAprovacaoFim &&
      this.dataAprovacaoInicio !== '' &&
      this.dataAprovacaoFim !== ''
    ) {
      if (parseData(this.dataAprovacaoInicio).getTime() > parseData(this.dataAprovacaoFim).getTime()) {
        erros.dataAprovacaoFim = 'A data final de aprovação não pode ser anterior à data inicial.';
      }
    }

    if (this.produtoId !== '') {
      const prodNum = Number(this.produtoId);
      if (!/^\d{1,10}$/.test(this.produtoId) || prodNum <= 0 || prodNum > ID_MAXIMO) {
        erros.produtoId = 'Produto de filtro inválido.';
      }
    }

    if (this.item.length > 120) {
      erros.item = 'O filtro de item deve ter no máximo 120 caracteres.';
    }

    return erros;
  }
}

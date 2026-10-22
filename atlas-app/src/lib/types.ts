/**
 * Tipos do domínio do ATLAS, derivados do diagrama de classes da ERS
 * (ver PROJETO-ATLAS.md, seção 4).
 */

export type PerfilUsuario = 'GERENTE' | 'SECRETARIO' | 'FUNCIONARIO';

export interface Usuario {
  id: string;
  nome: string;
  perfil: PerfilUsuario;
}

export interface Produto {
  id: string;
  nome: string;
  categoria: string;
  unidadeMedida: string;
  quantidadeEstoque: number;
  estoqueMinimo: number;
  dataValidade?: string;
}

export type TipoMovimentacao = 'ENTRADA' | 'SAIDA';

export interface MovimentacaoEstoque {
  id: string;
  produtoId: string;
  tipo: TipoMovimentacao;
  quantidade: number;
  data: string;
  origem: string;
}

export interface Doador {
  id: string;
  nome: string;
  contato: string;
  anonimo: boolean;
}

export interface ItemDoacao {
  produtoId: string;
  quantidade: number;
}

export interface DoacaoProduto {
  id: string;
  doadorId: string;
  data: string;
  itens: ItemDoacao[];
  registradoPor: string;
}

export interface DoacaoDinheiro {
  id: string;
  doadorId: string;
  valor: number;
  formaRecebimento: string;
  data: string;
  registradoPor: string;
}

export type StatusCaixa = 'ABERTO' | 'FECHADO';

export interface MovimentacaoCaixa {
  id: string;
  tipo: TipoMovimentacao;
  valor: number;
  origem: string;
  data: string;
}

export interface Caixa {
  id: string;
  dataAbertura: string;
  dataFechamento?: string;
  saldoFisicoAbertura: number;
  saldoDigitalAbertura: number;
  saldoFisicoFechamento?: number;
  saldoDigitalFechamento?: number;
  status: StatusCaixa;
  movimentacoes: MovimentacaoCaixa[];
  abertoPor: string;
}

export type StatusCotacao = 'PENDENTE' | 'APROVADA' | 'REPROVADA';

export interface ItemCotacao {
  produtoId: string;
  quantidadeDesejada: number;
}

export interface Cotacao {
  id: string;
  descricao: string;
  dataAbertura: string;
  status: StatusCotacao;
  itens: ItemCotacao[];
  abertaPor: string;
  justificativa?: string;
}

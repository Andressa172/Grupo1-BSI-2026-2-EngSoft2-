import type {
  Doador as DoadorRegistro,
  DoacaoDinheiro as DoacaoDinheiroRegistro,
  DoacaoProduto as DoacaoProdutoRegistro,
  Produto as ProdutoRegistro,
} from '@/lib/types';

/**
 * Porta de acesso aos dados. Hoje é satisfeita pelo store do ATLAS (useAtlas),
 * que guarda em memória/localStorage. Quando o grupo migrar para o PostgreSQL,
 * só as classes DAO mudam: Control, Model e View continuam iguais.
 */
export interface AtlasGateway {
  produtos: ProdutoRegistro[];
  doadores: DoadorRegistro[];
  doacoesProduto: DoacaoProdutoRegistro[];
  doacoesDinheiro: DoacaoDinheiroRegistro[];
  cadastrarDoador: (doador: Omit<DoadorRegistro, 'id'>) => DoadorRegistro;
  registrarDoacaoProduto: (
    doadorId: string,
    itens: { produtoId: string; quantidade: number; dataValidade?: string }[],
    data?: string
  ) => void;
  registrarDoacaoDinheiro: (doadorId: string, valor: number, formaRecebimento: string, data?: string) => void;
}

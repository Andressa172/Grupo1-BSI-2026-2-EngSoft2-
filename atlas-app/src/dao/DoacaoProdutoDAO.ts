import type { DoacaoProduto as DoacaoProdutoRegistro } from '@/lib/types';
import { DoacaoProduto } from '@/model/DoacaoProduto';
import type { AtlasGateway } from './AtlasGateway';

export class DoacaoProdutoDAO {
  constructor(private gateway: AtlasGateway) {}

  listar(): DoacaoProdutoRegistro[] {
    return this.gateway.doacoesProduto;
  }

  /** Persiste a doação. O estoque (RF_F1) é atualizado pelo próprio store ao registrar. */
  salvar(doacao: DoacaoProduto, doadorId: string): void {
    this.gateway.registrarDoacaoProduto(
      doadorId,
      doacao.getItens().map((i) => ({
        produtoId: i.produtoId,
        quantidade: i.quantidade,
        dataValidade: i.dataValidade ? i.dataValidade.toISOString() : undefined,
      })),
      doacao.dataRecebimento.toISOString()
    );
  }
}

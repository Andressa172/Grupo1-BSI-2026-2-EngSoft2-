import type { DoacaoDinheiro as DoacaoDinheiroRegistro } from '@/lib/types';
import { DoacaoDinheiro } from '@/model/DoacaoDinheiro';
import type { AtlasGateway } from './AtlasGateway';

export class DoacaoDinheiroDAO {
  constructor(private gateway: AtlasGateway) {}

  listar(): DoacaoDinheiroRegistro[] {
    return this.gateway.doacoesDinheiro;
  }

  /** Persiste a doação. O caixa (RF_F6) é atualizado pelo próprio store ao registrar. */
  salvar(doacao: DoacaoDinheiro, doadorId: string): void {
    this.gateway.registrarDoacaoDinheiro(
      doadorId,
      doacao.valor,
      doacao.formaRecebimento,
      doacao.dataRecebimento.toISOString()
    );
  }
}

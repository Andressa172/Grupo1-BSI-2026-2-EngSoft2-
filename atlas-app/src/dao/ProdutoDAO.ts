import type { Produto as ProdutoRegistro } from '@/lib/types';
import type { AtlasGateway } from './AtlasGateway';

/** Somente consulta: o cadastro de produtos é do RF_B3. */
export class ProdutoDAO {
  constructor(private gateway: AtlasGateway) {}

  listar(): ProdutoRegistro[] {
    return this.gateway.produtos;
  }
}

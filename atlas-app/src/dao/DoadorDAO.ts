import type { Doador as DoadorRegistro } from '@/lib/types';
import { Doador } from '@/model/Doador';
import type { AtlasGateway } from './AtlasGateway';

export class DoadorDAO {
  constructor(private gateway: AtlasGateway) {}

  listar(): DoadorRegistro[] {
    return this.gateway.doadores;
  }

  buscarAnonimo(): DoadorRegistro | undefined {
    return this.gateway.doadores.find((d) => d.anonimo);
  }

  /** Persiste o doador e devolve o id gerado. */
  salvar(doador: Doador): string {
    return this.gateway.cadastrarDoador({
      nome: doador.nome.trim(),
      contato: doador.contato.trim(),
      anonimo: doador.anonimo,
    }).id;
  }
}

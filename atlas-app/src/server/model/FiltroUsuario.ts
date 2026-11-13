// Model - FiltroUsuario (consulta do RF_B2 - Gerenciar Funcionários)
// Critérios da consulta de funcionários:
//   1) nome   - contém o texto digitado em nome ou login ('' = todos)
//   2) perfil - cargo do funcionário: GERENTE, SECRETARIO ou FUNCIONARIO ('' = todos)
//   3) status - situação de acesso: ATIVO ou INATIVO ('' = todos)
import type { ErrosDeCampo } from '../erros';
import { PERFIS_USUARIO, type PerfilUsuario } from './Usuario';

export const SITUACOES_STATUS_USUARIO = ['ATIVO', 'INATIVO'] as const;
export type SituacaoStatusUsuario = (typeof SITUACOES_STATUS_USUARIO)[number];

export interface FiltroUsuarioAtributos {
  nome?: string | null;
  perfil?: string | null;
  status?: string | null;
}

export class FiltroUsuario {
  private readonly nome: string;
  private readonly perfil: string;
  private readonly status: string;

  constructor(atributos: FiltroUsuarioAtributos = {}) {
    this.nome = atributos.nome?.trim() ?? '';
    this.perfil = atributos.perfil?.trim() ?? '';
    this.status = atributos.status?.trim() ?? '';
  }

  getNome(): string {
    return this.nome;
  }

  getPerfil(): PerfilUsuario | '' {
    return this.perfil as PerfilUsuario | '';
  }

  getStatus(): SituacaoStatusUsuario | '' {
    return this.status as SituacaoStatusUsuario | '';
  }

  validar(): ErrosDeCampo {
    const erros: ErrosDeCampo = {};
    if (this.nome.length > 120) {
      erros.nome = 'Digite no máximo 120 caracteres.';
    }
    if (this.perfil !== '' && !(PERFIS_USUARIO as readonly string[]).includes(this.perfil)) {
      erros.perfil = 'Cargo inválido.';
    }
    if (this.status !== '' && !(SITUACOES_STATUS_USUARIO as readonly string[]).includes(this.status)) {
      erros.status = 'Status inválido.';
    }
    return erros;
  }
}

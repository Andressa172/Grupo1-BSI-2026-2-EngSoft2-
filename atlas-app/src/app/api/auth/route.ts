/**
 * API de autenticação de usuários
 * POST /api/auth -> valida login e senha na tabela usuario
 */

import { UsuarioService } from '@/server/service/UsuarioService';
import { respostaDeErro } from '@/server/http';
import { lerJson } from '@/server/lerJson';

export async function POST(request: Request) {
  try {
    const corpo = await lerJson(request);
    const { login, senha } = (typeof corpo === 'object' && corpo !== null ? corpo : {}) as Record<string, unknown>;
    const usuario = await new UsuarioService().autenticar(login, senha);
    return Response.json(usuario.paraDadosPublicos());
  } catch (erro) {
    return respostaDeErro(erro);
  }
}


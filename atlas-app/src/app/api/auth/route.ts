/**
 * API de autenticação de usuários
 * POST /api/auth -> valida login e senha na tabela usuario
 */

import { UsuarioController } from '@/server/UsuarioController';
import { respostaDeErro } from '@/server/http';

export async function POST(request: Request) {
  try {
    const { login, senha } = await request.json();
    const usuario = await UsuarioController.getInstancia().autenticar(login, senha);
    return Response.json(usuario.paraDadosPublicos());
  } catch (erro) {
    return respostaDeErro(erro);
  }
}


/**
 * API de funcionários / usuários (RF_B2 - Gerenciar Funcionários)
 * GET  /api/usuarios?nome=&perfil=&status= -> consulta os funcionários cadastrados (filtros opcionais)
 * POST /api/usuarios                       -> cadastra um novo funcionário
 */

import { UsuarioController } from '@/server/UsuarioController';
import { respostaDeErro } from '@/server/http';

export async function GET(request: Request) {
  try {
    const parametros = new URL(request.url).searchParams;
    const usuarios = await UsuarioController.getInstancia().consultar({
      nome: parametros.get('nome'),
      perfil: parametros.get('perfil'),
      status: parametros.get('status'),
    });
    return Response.json(usuarios.map((u) => u.paraDadosPublicos()));
  } catch (erro) {
    return respostaDeErro(erro);
  }
}

export async function POST(request: Request) {
  try {
    const dados = await request.json();
    const usuario = await UsuarioController.getInstancia().cadastrar(dados);
    return Response.json(usuario.paraDadosPublicos(), { status: 201 });
  } catch (erro) {
    return respostaDeErro(erro);
  }
}

/**
 * API de funcionários / usuários (RF_B2 - Gerenciar Funcionários)
 * GET  /api/usuarios?nome=&perfil=&status= -> consulta os funcionários cadastrados (filtros opcionais)
 * POST /api/usuarios                       -> cadastra um novo funcionário
 */

import { UsuarioService } from '@/server/service/UsuarioService';
import { respostaDeErro } from '@/server/http';
import { lerJson } from '@/server/lerJson';

export async function GET(request: Request) {
  try {
    const parametros = new URL(request.url).searchParams;
    const usuarios = await new UsuarioService().consultar({
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
    const dados = await lerJson(request);
    const usuario = await new UsuarioService().cadastrar(dados);
    return Response.json(usuario.paraDadosPublicos(), { status: 201 });
  } catch (erro) {
    return respostaDeErro(erro);
  }
}

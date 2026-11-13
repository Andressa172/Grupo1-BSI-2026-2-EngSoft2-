/**
 * API de um funcionário específico (RF_B2 - Gerenciar Funcionários)
 * GET    /api/usuarios/:id -> busca o funcionário
 * PUT    /api/usuarios/:id -> edita ou altera o status do funcionário
 * DELETE /api/usuarios/:id -> exclui o funcionário
 */

import { UsuarioController } from '@/server/UsuarioController';
import { respostaDeErro } from '@/server/http';
import { lerJson } from '@/server/lerJson';

type Contexto = { params: Promise<{ id: string }> };

export async function GET(_request: Request, { params }: Contexto) {
  try {
    const { id } = await params;
    const usuario = await UsuarioController.getInstancia().buscarPorId(Number(id));
    return Response.json(usuario.paraDadosPublicos());
  } catch (erro) {
    return respostaDeErro(erro);
  }
}

export async function PUT(request: Request, { params }: Contexto) {
  try {
    const { id } = await params;
    const dados = await lerJson(request);
    const usuario = await UsuarioController.getInstancia().editar(Number(id), dados);
    return Response.json(usuario.paraDadosPublicos());
  } catch (erro) {
    return respostaDeErro(erro);
  }
}

export async function DELETE(_request: Request, { params }: Contexto) {
  try {
    const { id } = await params;
    await UsuarioController.getInstancia().excluir(Number(id));
    return Response.json({ mensagem: 'Funcionário excluído.' });
  } catch (erro) {
    return respostaDeErro(erro);
  }
}

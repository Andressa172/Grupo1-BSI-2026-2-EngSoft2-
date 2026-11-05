/**
 * API de eventos e alocação de recursos (RF_F9 - Alocar Recursos para Eventos)
 * GET  /api/eventos -> lista eventos com os recursos alocados
 * POST /api/eventos -> cria um evento e aloca os recursos informados
 *
 * Body esperado no POST:
 * { "evento": { "nome", "data", "descricao" }, "recursos": [{ "tipo", "produtoId"?, "quantidade"?, "valor"? }] }
 */

import { AlocarRecursosController } from '@/server/AlocarRecursosController';
import { respostaDeErro } from '@/server/http';
import { ProdutoDAO } from '@/server/dao/ProdutoDAO';

export async function GET() {
  const [resultados, produtos] = await Promise.all([
    AlocarRecursosController.getInstancia().listarEventosComRecursos(),
    new ProdutoDAO().listarTodos(),
  ]);
  return Response.json({ eventos: resultados, produtos });
}

export async function POST(request: Request) {
  try {
    const corpo = await request.json();
    const resultado = await AlocarRecursosController.getInstancia().alocarRecursosParaEvento(
      corpo.evento,
      corpo.recursos
    );
    return Response.json(resultado, { status: 201 });
  } catch (erro) {
    return respostaDeErro(erro);
  }
}

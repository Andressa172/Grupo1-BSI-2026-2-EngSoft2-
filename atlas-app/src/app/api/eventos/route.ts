/**
 * API de eventos e alocação de recursos (RF_F9 - Alocar Recursos para Eventos)
 * GET  /api/eventos?nome=&dataInicial=&dataFinal= -> consulta (filtros opcionais)
 * POST /api/eventos                                -> cria um evento e aloca os recursos informados
 *
 * Body esperado no POST:
 * { "nome", "data", "descricao"?, "recursos": [{ "tipo", "produtoId"?, "quantidade"?, "valor"? }] }
 */

import { AlocarRecursosController } from '@/server/AlocarRecursosController';
import { respostaDeErro } from '@/server/http';
import { lerJson } from '@/server/lerJson';

export async function GET(request: Request) {
  try {
    const parametros = new URL(request.url).searchParams;
    const [eventos, produtos] = await Promise.all([
      AlocarRecursosController.getInstancia().consultar({
        nome: parametros.get('nome'),
        dataInicial: parametros.get('dataInicial'),
        dataFinal: parametros.get('dataFinal'),
      }),
      AlocarRecursosController.getInstancia().listarProdutos(),
    ]);
    return Response.json({ eventos, produtos });
  } catch (erro) {
    return respostaDeErro(erro);
  }
}

export async function POST(request: Request) {
  try {
    const dados = await lerJson(request);
    const evento = await AlocarRecursosController.getInstancia().alocarRecursosParaEvento(dados);
    return Response.json({ id: evento.getId() }, { status: 201 });
  } catch (erro) {
    return respostaDeErro(erro);
  }
}

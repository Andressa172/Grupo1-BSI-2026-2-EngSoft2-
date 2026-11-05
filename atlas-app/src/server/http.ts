import { ErroNaoEncontrado, ErroRegraDeNegocio, ErroValidacao } from './erros';

export function respostaDeErro(erro: unknown): Response {
  if (erro instanceof ErroNaoEncontrado) {
    return Response.json({ erro: erro.message }, { status: 404 });
  }
  if (erro instanceof ErroValidacao || erro instanceof ErroRegraDeNegocio) {
    return Response.json({ erro: erro.message }, { status: 400 });
  }
  console.error(erro);
  return Response.json({ erro: 'Erro interno ao processar a requisição.' }, { status: 500 });
}

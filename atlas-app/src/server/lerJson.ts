import { ErroValidacao } from './erros';

// lê o corpo JSON da requisição; JSON quebrado vira erro 400 (e não erro 500)
export async function lerJson(request: Request): Promise<unknown> {
  try {
    return await request.json();
  } catch {
    throw new ErroValidacao('Corpo da requisição inválido: envie um JSON válido.');
  }
}

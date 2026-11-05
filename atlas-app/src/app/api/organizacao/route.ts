/**
 * API de parametrização da organização (RB_Parametrização)
 * GET  /api/organizacao -> retorna os parâmetros atuais da organização
 * POST /api/organizacao -> atualiza/cadastra os dados da organização e caminho do logo
 */

import {
  ParametrizarOrganizacaoController,
  type DadosAtualizacaoOrganizacao,
} from '@/server/ParametrizarOrganizacaoController';
import { ErroValidacao } from '@/server/erros';
import { respostaDeErro } from '@/server/http';
import { mkdir, unlink, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { randomUUID } from 'node:crypto';

const MAX_LOGO_BYTES = 5 * 1024 * 1024;
const EXTENSOES_LOGO: Record<string, string> = {
  'image/gif': 'gif',
  'image/jpeg': 'jpg',
  'image/png': 'png',
  'image/webp': 'webp',
};

function caminhoSeguroDoLogo(caminhoLogo: string | null | undefined): string | null {
  if (!caminhoLogo?.startsWith('/uploads/organizacao/')) return null;
  return path.join(process.cwd(), 'public', caminhoLogo);
}

async function salvarLogo(arquivo: File): Promise<string> {
  const extensao = EXTENSOES_LOGO[arquivo.type];
  if (!extensao) {
    throw new ErroValidacao('O logo deve ser uma imagem PNG, JPEG, GIF ou WebP.');
  }
  if (arquivo.size > MAX_LOGO_BYTES) {
    throw new ErroValidacao('O logo deve ter no máximo 5 MB.');
  }

  const diretorio = path.join(process.cwd(), 'public', 'uploads', 'organizacao');
  await mkdir(diretorio, { recursive: true });
  const caminhoRelativo = `/uploads/organizacao/logo-${randomUUID()}.${extensao}`;
  await writeFile(path.join(process.cwd(), 'public', caminhoRelativo), Buffer.from(await arquivo.arrayBuffer()));
  return caminhoRelativo;
}

export async function GET() {
  try {
    const dados = await ParametrizarOrganizacaoController.getInstancia().obterParametros();
    return Response.json(dados);
  } catch (erro) {
    return respostaDeErro(erro);
  }
}

export async function POST(request: Request) {
  let novoCaminhoLogo: string | null = null;
  try {
    const controller = ParametrizarOrganizacaoController.getInstancia();
    const tipo = request.headers.get('content-type') ?? '';
    let corpo: DadosAtualizacaoOrganizacao;
    let caminhoLogoAnterior: string | null = null;

    if (tipo.includes('multipart/form-data')) {
      const formulario = await request.formData();
      const arquivo = formulario.get('logo');
      caminhoLogoAnterior = (await controller.obterParametros()).caminhoLogo;
      if (arquivo instanceof File && arquivo.size > 0) {
        novoCaminhoLogo = await salvarLogo(arquivo);
      }
      corpo = {
        nomeFantasia: String(formulario.get('nomeFantasia') ?? ''),
        cnpj: String(formulario.get('cnpj') ?? '') || null,
        endereco: String(formulario.get('endereco') ?? '') || null,
        telefone: String(formulario.get('telefone') ?? '') || null,
        email: String(formulario.get('email') ?? '') || null,
        caminhoLogo: novoCaminhoLogo ?? (String(formulario.get('caminhoLogo') ?? '') || null),
      };
    } else {
      corpo = (await request.json()) as DadosAtualizacaoOrganizacao;
    }

    const resultado = await controller.salvarParametros(corpo);
    if (novoCaminhoLogo && caminhoLogoAnterior && caminhoLogoAnterior !== novoCaminhoLogo) {
      await unlink(caminhoSeguroDoLogo(caminhoLogoAnterior)!).catch(() => undefined);
    }
    return Response.json(resultado, { status: 200 });
  } catch (erro) {
    if (novoCaminhoLogo) {
      await unlink(caminhoSeguroDoLogo(novoCaminhoLogo)!).catch(() => undefined);
    }
    return respostaDeErro(erro);
  }
}
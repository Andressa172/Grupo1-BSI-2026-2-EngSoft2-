// Helper de autenticação e autorização para rotas administrativas (Gerente)
import { UsuarioController } from './UsuarioController';
import { ErroAutenticacao, ErroAutorizacao, ErroNaoEncontrado } from './erros';
import type { Usuario } from './model/Usuario';

function extrairUsuarioId(request: Request, corpo?: Record<string, unknown>): number | null {
  const cabecalhoId = request.headers.get('x-usuario-id');
  if (cabecalhoId && /^\d+$/.test(cabecalhoId.trim())) {
    const id = Number(cabecalhoId.trim());
    return id > 0 ? id : null;
  }

  const authorization = request.headers.get('authorization');
  if (authorization?.startsWith('Bearer ')) {
    const token = authorization.slice(7).trim();
    if (/^\d+$/.test(token)) {
      const id = Number(token);
      return id > 0 ? id : null;
    }
  }

  const candidato = corpo?.idFuncionario ?? corpo?.abertoPor ?? corpo?.usuarioId;
  if (typeof candidato === 'number' && Number.isInteger(candidato) && candidato > 0) {
    return candidato;
  }
  if (typeof candidato === 'string' && /^\d+$/.test(candidato.trim())) {
    const id = Number(candidato.trim());
    return id > 0 ? id : null;
  }

  return null;
}

/**
 * Valida que a requisição pertence a um usuário ativo com perfil GERENTE.
 */
export async function exigirGerente(request: Request, corpo?: Record<string, unknown>): Promise<Usuario> {
  const usuarioId = extrairUsuarioId(request, corpo);
  if (!usuarioId) {
    throw new ErroAutenticacao('Usuário não autenticado.');
  }

  // a consulta passa pelo Controller (C -> M -> DAO); usuário inexistente vira erro de autenticação
  const usuario = await UsuarioController.getInstancia()
    .buscarPorId(usuarioId)
    .catch((erro: unknown) => {
      if (erro instanceof ErroNaoEncontrado) return null;
      throw erro;
    });
  if (!usuario || !usuario.isAtivo()) {
    throw new ErroAutenticacao('Usuário inválido ou inativo.');
  }

  if (usuario.getPerfil() !== 'GERENTE') {
    throw new ErroAutorizacao('Acesso restrito: apenas Gerente pode operar o caixa.');
  }

  return usuario;
}

import { Doador } from '@/model/Doador';
import type { ErrosValidacao } from '@/model/validacao';
import type { DoadorDAO } from '@/dao/DoadorDAO';

/** O que a View informa sobre o doador (passos 1 e 2 e fluxo alternativo 1.1). */
export type SelecaoDoador =
  | { tipo: 'nenhum' }
  | { tipo: 'existente'; id: string }
  | { tipo: 'anonimo' }
  | { tipo: 'novo'; nome: string; contato: string };

/** Só valida, sem gravar nada: o doador novo só é cadastrado se o resto da doação também for válido. */
export function validarDoador(sel: SelecaoDoador): ErrosValidacao {
  if (sel.tipo === 'nenhum') {
    return { doador: 'Selecione o doador, escolha doador anônimo ou cadastre um novo.' };
  }
  if (sel.tipo === 'novo') return new Doador(sel.nome, sel.contato).validar();
  return {};
}

/** Devolve o id do doador, cadastrando-o (novo ou anônimo) se for preciso. */
export function obterIdDoador(sel: SelecaoDoador, dao: DoadorDAO): string {
  if (sel.tipo === 'existente') return sel.id;
  if (sel.tipo === 'anonimo') {
    return dao.buscarAnonimo()?.id ?? dao.salvar(new Doador('Doador Anônimo', '', true));
  }
  if (sel.tipo === 'novo') return dao.salvar(new Doador(sel.nome, sel.contato));
  throw new Error('Doador não informado');
}

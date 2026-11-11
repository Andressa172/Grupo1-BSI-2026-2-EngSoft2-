// Model - SelecaoDoador: quem é o doador de uma doação (RF_F3 / RF_F11, passos 1 e 2 e fluxo 1.1).
// Pode ser um doador já cadastrado, um doador anônimo ou um doador novo (cadastrado junto com a doação).
import type { ErrosDeCampo } from '../erros';
import { ErroValidacao } from '../erros';
import type { ExecutorSQL } from '../dao/tipos';
import { DoadorDAO } from '../dao/DoadorDAO';
import { Doador } from './Doador';
import { textoSeguro } from './datasBR';

type Tipo = 'existente' | 'anonimo' | 'novo' | 'nenhum';
const ID_MAXIMO = 2_147_483_647;
// caracteres invisíveis de controle (inclui o byte nulo, que o PostgreSQL não aceita em texto)
// eslint-disable-next-line no-control-regex
const CARACTERE_DE_CONTROLE = /[\u0000-\u001f\u007f]/;

export class SelecaoDoador {
  private readonly tipo: Tipo;
  private readonly id: number;
  private readonly nome: string;
  private readonly contato: string;

  constructor(dados: unknown) {
    const d = typeof dados === 'object' && dados !== null ? (dados as Record<string, unknown>) : {};
    const tipo = d.tipo;
    this.tipo = tipo === 'existente' || tipo === 'anonimo' || tipo === 'novo' ? tipo : 'nenhum';
    this.id = typeof d.id === 'number' || typeof d.id === 'string' ? Number(d.id) : NaN;
    this.nome = textoSeguro(d.nome);
    this.contato = textoSeguro(d.contato);
  }

  /** Só valida, sem gravar nada: o doador novo só é cadastrado se o resto da doação também for válido. */
  validar(): ErrosDeCampo {
    const erros: ErrosDeCampo = {};
    if (this.tipo === 'nenhum') {
      erros.doador = 'Selecione o doador, escolha doador anônimo ou cadastre um novo.';
    } else if (this.tipo === 'existente') {
      if (!Number.isInteger(this.id) || this.id <= 0 || this.id > ID_MAXIMO) erros.doador = 'Doador inválido.';
    } else if (this.tipo === 'novo') {
      if (this.nome.length < 3) {
        erros['doador.nome'] = 'Nome do doador inválido: informe ao menos 3 caracteres.';
      } else if (CARACTERE_DE_CONTROLE.test(this.nome)) {
        erros['doador.nome'] = 'Nome do doador inválido: contém caracteres não permitidos.';
      } else if (this.nome.length > 120) {
        erros['doador.nome'] = 'O nome do doador deve ter no máximo 120 caracteres.';
      }
      if (this.contato.replace(/\D/g, '').length < 10 || this.contato.length > 30 || CARACTERE_DE_CONTROLE.test(this.contato)) {
        erros['doador.contato'] = 'Contato inválido: informe um telefone com DDD.';
      }
    }
    return erros;
  }

  /** Devolve o id do doador, cadastrando-o (novo ou anônimo) se for preciso. Usa a conexão da transação. */
  async obterId(conexao: ExecutorSQL): Promise<number> {
    const dao = new DoadorDAO(conexao);

    if (this.tipo === 'existente') {
      const doador = await dao.buscarPorId(this.id);
      if (!doador) throw new ErroValidacao('Doador inválido.', { doador: 'Doador inválido: não cadastrado.' });
      return doador.getId() as number;
    }

    if (this.tipo === 'anonimo') {
      const anonimo = (await dao.listarTodos()).find((d) => d.isAnonimo());
      if (anonimo) return anonimo.getId() as number;
      const criado = await dao.inserir(new Doador({ nome: 'Doador Anônimo', anonimo: true }));
      return criado.getId() as number;
    }

    if (this.tipo === 'novo') {
      if (await dao.existeComNome(this.nome)) {
        throw new ErroValidacao('Já existe um doador com esse nome.', {
          'doador.nome': 'Já existe um doador cadastrado com esse nome: selecione-o na lista.',
        });
      }
      const criado = await dao.inserir(new Doador({ nome: this.nome, contato: this.contato }));
      return criado.getId() as number;
    }

    throw new ErroValidacao('Doador não informado.', { doador: 'Selecione o doador.' });
  }
}

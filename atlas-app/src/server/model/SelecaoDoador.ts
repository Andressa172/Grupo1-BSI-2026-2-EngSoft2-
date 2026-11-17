// Model - SelecaoDoador: quem é o doador de uma doação (RF_F3 / RF_F11, passos 1 e 2 e fluxo 1.1).
// Pode ser um doador já cadastrado, um doador anônimo ou um doador novo (cadastrado junto com a doação).
import type { ErrosDeCampo } from '../erros';
import { ErroValidacao } from '../erros';
import type { ExecutorSQL } from '../dao/tipos';
import { DoadorDAO } from '../dao/DoadorDAO';
import { Doador, type TipoPessoa } from './Doador';
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
  private readonly email: string;
  private readonly cpfCnpj: string;
  private readonly tipoPessoa: TipoPessoa;

  constructor(dados: unknown) {
    const d = typeof dados === 'object' && dados !== null ? (dados as Record<string, unknown>) : {};
    const tipo = d.tipo;
    this.tipo = tipo === 'existente' || tipo === 'anonimo' || tipo === 'novo' ? tipo : 'nenhum';
    this.id = typeof d.id === 'number' || typeof d.id === 'string' ? Number(d.id) : NaN;
    this.nome = textoSeguro(d.nome);
    this.contato = textoSeguro(d.contato);
    this.email = textoSeguro(d.email);
    this.cpfCnpj = textoSeguro(d.cpfCnpj);
    this.tipoPessoa = d.tipoPessoa === 'JURIDICA' ? 'JURIDICA' : 'FISICA';
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
      // CPF/CNPJ, e-mail e tipo de pessoa seguem as mesmas regras do cadastro de doadores (Model Doador)
      const errosDoador = this.montarDoador().validar();
      if (errosDoador.cpfCnpj) erros['doador.cpfCnpj'] = errosDoador.cpfCnpj;
      if (errosDoador.email) erros['doador.email'] = errosDoador.email;
      if (errosDoador.tipoPessoa) erros['doador.tipoPessoa'] = errosDoador.tipoPessoa;
    }
    return erros;
  }

  private montarDoador(): Doador {
    return new Doador({
      nome: this.nome,
      telefone: this.contato,
      email: this.email,
      cpfCnpj: this.cpfCnpj,
      tipoPessoa: this.tipoPessoa,
    });
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
      // nome repetido é permitido (duas pessoas podem ter o mesmo nome): quem identifica o doador é o CPF/CNPJ
      const novo = this.montarDoador();
      const erroDuplicado = new ErroValidacao('Doador já cadastrado.', {
        'doador.cpfCnpj': 'CPF/CNPJ já cadastrado: escolha o doador na lista de existentes.',
      });
      if (await dao.existeComCpfCnpj(novo.getCpfCnpj() as string)) throw erroDuplicado;
      try {
        return (await dao.inserir(novo)).getId() as number;
      } catch (erro) {
        // duas doações ao mesmo tempo com o mesmo CPF/CNPJ: o índice único do banco barra a segunda
        if ((erro as { code?: string }).code === '23505') throw erroDuplicado;
        throw erro;
      }
    }

    throw new ErroValidacao('Doador não informado.', { doador: 'Selecione o doador.' });
  }
}

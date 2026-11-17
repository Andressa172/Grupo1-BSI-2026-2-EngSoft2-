// Model - SelecaoDoador: quem é o doador de uma doação (RF_F3 / RF_F11, passos 1 e 2 e fluxo 1.1).
// Pode ser um doador já cadastrado, um doador anônimo ou um doador novo (cadastrado junto com a doação).
import type { ErrosDeCampo } from '../erros';
import { ErroValidacao } from '../erros';
import type { ExecutorSQL } from '../dao/tipos';
import { DoadorDAO, type DoadorDados } from '../dao/DoadorDAO';
import { cpfOuCnpjValido, EMAIL_VALIDO } from './documentos';
import { textoSeguro } from './datasBR';

type TipoPessoa = 'FISICA' | 'JURIDICA';

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
      // CPF/CNPJ e e-mail seguem as mesmas regras do cadastro de doadores (RF_B4)
      const juridica = this.tipoPessoa === 'JURIDICA';
      const documento = this.cpfCnpj.replace(/\D/g, '');
      if (!documento) {
        erros['doador.cpfCnpj'] = juridica ? 'CNPJ inválido: informe o CNPJ.' : 'CPF inválido: informe o CPF.';
      } else if (!cpfOuCnpjValido(documento, this.tipoPessoa)) {
        erros['doador.cpfCnpj'] = juridica ? 'CNPJ inválido.' : 'CPF inválido.';
      }
      const email = this.email.toLowerCase();
      if (!email) {
        erros['doador.email'] = 'E-mail inválido: o e-mail é obrigatório.';
      } else if (!EMAIL_VALIDO.test(email)) {
        erros['doador.email'] = 'E-mail inválido.';
      }
    }
    return erros;
  }

  // dados do doador novo para o DoadorDAO, com a mesma normalização do cadastro de doadores
  private dadosDoadorNovo(): DoadorDados {
    return {
      nome: this.nome,
      telefone: this.contato || null,
      email: this.email.toLowerCase() || null,
      cpfCnpj: this.cpfCnpj.replace(/\D/g, '') || null,
      tipoPessoa: this.tipoPessoa,
      anonimo: false,
    };
  }

  /** Devolve o id do doador, cadastrando-o (novo ou anônimo) se for preciso. Usa a conexão da transação. */
  async obterId(conexao: ExecutorSQL): Promise<number> {
    const dao = new DoadorDAO(conexao);

    if (this.tipo === 'existente') {
      const doador = await dao.buscarPorId(this.id);
      if (!doador) throw new ErroValidacao('Doador inválido.', { doador: 'Doador inválido: não cadastrado.' });
      return doador.id;
    }

    if (this.tipo === 'anonimo') {
      const anonimo = (await dao.listarTodos()).find((d) => d.anonimo);
      if (anonimo) return anonimo.id;
      const criado = await dao.inserir({
        nome: 'Doador Anônimo',
        telefone: null,
        email: null,
        cpfCnpj: null,
        tipoPessoa: 'FISICA',
        anonimo: true,
      });
      return criado.id;
    }

    if (this.tipo === 'novo') {
      // nome repetido é permitido (duas pessoas podem ter o mesmo nome): quem identifica o doador é o CPF/CNPJ
      const novo = this.dadosDoadorNovo();
      const erroDuplicado = new ErroValidacao('Doador já cadastrado.', {
        'doador.cpfCnpj': 'CPF/CNPJ já cadastrado: escolha o doador na lista de existentes.',
      });
      if (await dao.existeComCpfCnpj(novo.cpfCnpj as string)) throw erroDuplicado;
      try {
        return (await dao.inserir(novo)).id;
      } catch (erro) {
        // duas doações ao mesmo tempo com o mesmo CPF/CNPJ: o índice único do banco barra a segunda
        if ((erro as { code?: string }).code === '23505') throw erroDuplicado;
        throw erro;
      }
    }

    throw new ErroValidacao('Doador não informado.', { doador: 'Selecione o doador.' });
  }
}

import { beforeEach, describe, expect, it, vi } from 'vitest';
import { CaixaController } from './CaixaController';
import { Caixa } from './model/Caixa';
import { MovimentacaoCaixa } from './model/MovimentacaoCaixa';
import {
  ErroCaixaFechado,
  ErroConflito,
  ErroDivergenciaCaixa,
  ErroNaoEncontrado,
  ErroRegraDeNegocio,
  ErroValidacao,
} from './erros';
import type { ExecutorSQL } from './dao/tipos';
import type { Database } from './db/Database';

// O Controller não conhece o DAO (quem cria o CaixaDAO é o Model), então o DAO falso entra
// substituindo o módulo do DAO: cada teste monta o seu ambiente em memória e o registra na ponte.
interface CaixaDAOFalso {
  buscarCaixaAberto(paraAtualizacao?: boolean): Promise<Caixa | null>;
  listarTodos(): Promise<Caixa[]>;
  inserir(caixa: Caixa): Promise<Caixa>;
  fechar(id: number, saldoFisicoFinal: number, saldoDigitalFinal: number): Promise<Caixa | null>;
  inserirMovimentacao(movimentacao: MovimentacaoCaixa): Promise<MovimentacaoCaixa>;
  listarMovimentacoesPorCaixa(caixaId: number): Promise<MovimentacaoCaixa[]>;
}

const ponte = vi.hoisted(() => ({ dao: undefined as unknown as CaixaDAOFalso }));

vi.mock('./dao/CaixaDAO', () => ({
  CaixaDAO: class {
    buscarCaixaAberto = (...args: [boolean?]) => ponte.dao.buscarCaixaAberto(...args);
    listarTodos = () => ponte.dao.listarTodos();
    inserir = (caixa: Caixa) => ponte.dao.inserir(caixa);
    fechar = (id: number, fisico: number, digital: number) => ponte.dao.fechar(id, fisico, digital);
    inserirMovimentacao = (mov: MovimentacaoCaixa) => ponte.dao.inserirMovimentacao(mov);
    listarMovimentacoesPorCaixa = (caixaId: number) => ponte.dao.listarMovimentacoesPorCaixa(caixaId);
  },
}));

function criarAmbienteCaixaFalso() {
  let proximoCaixaId = 1;
  let proximoMovId = 1;
  const caixas: Caixa[] = [];
  const movimentacoes: MovimentacaoCaixa[] = [];

  const dao: CaixaDAOFalso = {
    async buscarCaixaAberto() {
      return caixas.find((c) => c.getStatus() === 'ABERTO') ?? null;
    },
    async listarTodos() {
      return [...caixas].reverse();
    },
    async inserir(caixa: Caixa) {
      const salvo = new Caixa({
        id: proximoCaixaId++,
        dataAbertura: new Date().toISOString(),
        saldoFisicoAbertura: caixa.getSaldoFisicoAbertura(),
        saldoDigitalAbertura: caixa.getSaldoDigitalAbertura(),
        status: 'ABERTO',
        abertoPor: caixa.getAbertoPor(),
      });
      caixas.push(salvo);
      return salvo;
    },
    async fechar(id: number, saldoFisicoFinal: number, saldoDigitalFinal: number) {
      const idx = caixas.findIndex((c) => c.getId() === id && c.getStatus() === 'ABERTO');
      if (idx === -1) return null;
      const atual = caixas[idx];
      const fechado = new Caixa({
        id: atual.getId(),
        dataAbertura: atual.getDataAbertura(),
        dataFechamento: new Date().toISOString(),
        saldoFisicoAbertura: atual.getSaldoFisicoAbertura(),
        saldoDigitalAbertura: atual.getSaldoDigitalAbertura(),
        saldoFisicoFechamento: saldoFisicoFinal,
        saldoDigitalFechamento: saldoDigitalFinal,
        status: 'FECHADO',
        abertoPor: atual.getAbertoPor(),
      });
      caixas[idx] = fechado;
      return fechado;
    },
    async inserirMovimentacao(mov: MovimentacaoCaixa) {
      const salva = new MovimentacaoCaixa({
        id: proximoMovId++,
        caixaId: mov.getCaixaId(),
        tipo: mov.getTipo(),
        formaPag: mov.getFormaPag(),
        valor: mov.getValor(),
        origem: mov.getOrigem(),
        data: new Date().toISOString(),
      });
      movimentacoes.push(salva);
      return salva;
    },
    async listarMovimentacoesPorCaixa(caixaId: number) {
      return movimentacoes.filter((m) => m.getCaixaId() === caixaId);
    },
  };

  const database = {
    async comTransacao<T>(executar: (client: unknown) => Promise<T>): Promise<T> {
      return executar({} as ExecutorSQL);
    },
    async query() {
      throw new Error('query direta não esperada no teste unitário');
    },
  } as unknown as Pick<Database, 'comTransacao' | 'query'>;

  ponte.dao = dao;
  const controller = CaixaController.criarParaTeste(database);
  return { controller, caixas, movimentacoes };
}

describe('CaixaController (RF_F4, RF_F5, RF_F6)', () => {
  let controller: CaixaController;

  beforeEach(() => {
    controller = criarAmbienteCaixaFalso().controller;
  });

  describe('RF_F4 - Abrir Caixa', () => {
    it('abre um novo caixa com saldos iniciais válidos', async () => {
      const caixa = await controller.abrirCaixa(
        { saldoFisicoInicial: 100.5, saldoDigitalInicial: 250 },
        1
      );
      expect(caixa).toMatchObject({
        id: 1,
        saldoFisicoAbertura: 100.5,
        saldoDigitalAbertura: 250,
        status: 'ABERTO',
        abertoPor: 1,
      });
    });

    it('rejeita saldos nulos, inválidos ou negativos (FA 1.1)', async () => {
      await expect(
        controller.abrirCaixa({ saldoFisicoInicial: -10, saldoDigitalInicial: 0 }, 1)
      ).rejects.toThrow(ErroValidacao);

      await expect(
        controller.abrirCaixa({ saldoFisicoInicial: null, saldoDigitalInicial: 10 }, 1)
      ).rejects.toThrow(ErroValidacao);
    });

    it('bloqueia abertura quando já existe caixa aberto (FA 1.2)', async () => {
      await controller.abrirCaixa({ saldoFisicoInicial: 50, saldoDigitalInicial: 50 }, 1);
      await expect(
        controller.abrirCaixa({ saldoFisicoInicial: 10, saldoDigitalInicial: 10 }, 1)
      ).rejects.toThrow(ErroConflito);
    });
  });

  describe('RF_F6 - Atualizar Caixa', () => {
    it('lança ErroCaixaFechado quando não há caixa aberto (FA 1.1)', async () => {
      await expect(
        controller.atualizarCaixa({
          valor: 50,
          tipoMovimentacao: 'ENTRADA',
          formaPag: 'FISICO',
        })
      ).rejects.toThrow(ErroCaixaFechado);
    });

    it('rejeita valor menor ou igual a zero', async () => {
      await controller.abrirCaixa({ saldoFisicoInicial: 100, saldoDigitalInicial: 100 }, 1);
      await expect(
        controller.atualizarCaixa({
          valor: 0,
          tipoMovimentacao: 'ENTRADA',
          formaPag: 'FISICO',
        })
      ).rejects.toThrow(ErroValidacao);
    });

    it('bloqueia saída quando não há saldo suficiente na modalidade', async () => {
      await controller.abrirCaixa({ saldoFisicoInicial: 50, saldoDigitalInicial: 200 }, 1);
      await expect(
        controller.atualizarCaixa({
          valor: 80,
          tipoMovimentacao: 'SAIDA',
          formaPag: 'FISICO',
          origem: 'Compra emergencial',
        })
      ).rejects.toThrow(ErroRegraDeNegocio);
    });

    it('aceita dbClient externo para participar de transação ACID do chamador', async () => {
      await controller.abrirCaixa({ saldoFisicoInicial: 50, saldoDigitalInicial: 100 }, 1);
      const mov = await controller.atualizarCaixa(
        {
          valor: 75.25,
          tipoMovimentacao: 'ENTRADA',
          formaPag: 'DIGITAL',
          origem: 'Doação PIX #1',
        },
        {} as ExecutorSQL
      );
      expect(mov).toMatchObject({
        tipo: 'ENTRADA',
        formaPag: 'DIGITAL',
        valor: 75.25,
      });
    });
  });

  describe('RF_F5 - Fechar Caixa', () => {
    it('retorna erro quando não existe caixa aberto', async () => {
      await expect(
        controller.fecharCaixa({ saldoFisicoFinal: 0, saldoDigitalFinal: 0 }, 1)
      ).rejects.toThrow(ErroNaoEncontrado);
    });

    it('calcula saldos esperados por modalidade e fecha sem ressalva quando bate exato', async () => {
      await controller.abrirCaixa({ saldoFisicoInicial: 100, saldoDigitalInicial: 200 }, 1);
      await controller.atualizarCaixa({ valor: 0.1, tipoMovimentacao: 'ENTRADA', formaPag: 'FISICO' });
      await controller.atualizarCaixa({ valor: 0.2, tipoMovimentacao: 'ENTRADA', formaPag: 'FISICO' });
      await controller.atualizarCaixa({ valor: 50, tipoMovimentacao: 'SAIDA', formaPag: 'DIGITAL' });

      const resultado = await controller.fecharCaixa(
        { saldoFisicoFinal: 100.3, saldoDigitalFinal: 150 },
        1
      );

      expect(resultado.caixa.status).toBe('FECHADO');
      expect(resultado.consolidado.comRessalva).toBe(false);
      expect(resultado.consolidado.esperado).toEqual({ fisico: 100.3, digital: 150 });
    });

    it('aponta divergência estruturada quando há diferença sem ressalva (FA 2.1)', async () => {
      await controller.abrirCaixa({ saldoFisicoInicial: 100, saldoDigitalInicial: 200 }, 1);

      let capturado: unknown;
      try {
        await controller.fecharCaixa({ saldoFisicoFinal: 90, saldoDigitalFinal: 200 }, 1);
      } catch (erro) {
        capturado = erro;
      }

      expect(capturado).toBeInstanceOf(ErroDivergenciaCaixa);
      const err = capturado as ErroDivergenciaCaixa;
      expect(err.detalhes).toEqual({
        esperado: { fisico: 100, digital: 200 },
        informado: { fisico: 90, digital: 200 },
        diferenca: { fisico: -10, digital: 0 },
        requerConfirmacaoRessalva: true,
      });
    });

    it('permite fechar com ressalva quando confirmado com justificativa', async () => {
      await controller.abrirCaixa({ saldoFisicoInicial: 100, saldoDigitalInicial: 200 }, 1);

      const resultado = await controller.fecharCaixa(
        {
          saldoFisicoFinal: 95,
          saldoDigitalFinal: 200,
          confirmarComRessalva: true,
          justificativa: 'Diferença de troco conferida na gaveta',
        },
        1
      );

      expect(resultado.caixa.status).toBe('FECHADO');
      expect(resultado.consolidado.comRessalva).toBe(true);
      expect(resultado.consolidado.justificativa).toBe('Diferença de troco conferida na gaveta');
    });
  });
});

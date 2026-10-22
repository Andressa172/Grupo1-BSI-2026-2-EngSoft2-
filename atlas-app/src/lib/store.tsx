'use client';

/**
 * Store do ATLAS: estado de domínio compartilhado pelas telas internas.
 *
 * Implementação de demonstração (sem backend): mantém o estado em memória
 * e persiste em localStorage, mas reproduz as regras de negócio descritas
 * na ERS (ver PROJETO-ATLAS.md), em especial RF_F1 - Atualizar estoque,
 * que é "acionado internamente" por outros casos de uso.
 */

import React, { createContext, useContext, useEffect, useMemo, useState } from 'react';
import type {
  Produto,
  MovimentacaoEstoque,
  Doador,
  DoacaoProduto,
  DoacaoDinheiro,
  Caixa,
  Cotacao,
  StatusCotacao,
  TipoMovimentacao,
} from './types';

const STORAGE_KEY = 'atlas-demo-state-v1';

interface AtlasState {
  produtos: Produto[];
  movimentacoesEstoque: MovimentacaoEstoque[];
  doadores: Doador[];
  doacoesProduto: DoacaoProduto[];
  doacoesDinheiro: DoacaoDinheiro[];
  caixas: Caixa[];
  cotacoes: Cotacao[];
}

function uid(prefix: string) {
  return `${prefix}-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 7)}`;
}

function seedState(): AtlasState {
  const produtos: Produto[] = [
    { id: 'p1', nome: 'Arroz 5kg', categoria: 'Alimento', unidadeMedida: 'pacote', quantidadeEstoque: 42, estoqueMinimo: 10, dataValidade: '2027-03-01' },
    { id: 'p2', nome: 'Feijão 1kg', categoria: 'Alimento', unidadeMedida: 'pacote', quantidadeEstoque: 18, estoqueMinimo: 15, dataValidade: '2026-12-15' },
    { id: 'p3', nome: 'Leite em pó', categoria: 'Alimento', unidadeMedida: 'lata', quantidadeEstoque: 6, estoqueMinimo: 10, dataValidade: '2026-11-05' },
    { id: 'p4', nome: 'Óleo de soja', categoria: 'Alimento', unidadeMedida: 'litro', quantidadeEstoque: 24, estoqueMinimo: 8, dataValidade: '2027-01-20' },
    { id: 'p5', nome: 'Material escolar (kit)', categoria: 'Material', unidadeMedida: 'kit', quantidadeEstoque: 30, estoqueMinimo: 5 },
  ];

  const doadores: Doador[] = [
    { id: 'd1', nome: 'Supermercado Boa Compra', contato: '(18) 3222-1000', anonimo: false },
    { id: 'd2', nome: 'Maria Aparecida', contato: '(18) 99999-1234', anonimo: false },
    { id: 'd3', nome: 'Doador Anônimo', contato: '', anonimo: true },
  ];

  const caixas: Caixa[] = [
    {
      id: 'c1',
      dataAbertura: new Date().toISOString(),
      saldoFisicoAbertura: 150,
      saldoDigitalAbertura: 820,
      status: 'ABERTO',
      movimentacoes: [],
      abertoPor: 'Gerente',
    },
  ];

  const cotacoes: Cotacao[] = [
    {
      id: 'cot1',
      descricao: 'Reposição mensal de alimentos não perecíveis',
      dataAbertura: new Date().toISOString(),
      status: 'PENDENTE',
      itens: [
        { produtoId: 'p2', quantidadeDesejada: 40 },
        { produtoId: 'p3', quantidadeDesejada: 20 },
      ],
      abertaPor: 'Secretário',
    },
  ];

  return {
    produtos,
    movimentacoesEstoque: [],
    doadores,
    doacoesProduto: [],
    doacoesDinheiro: [],
    caixas,
    cotacoes,
  };
}

interface AtlasContextValue extends AtlasState {
  caixaAberto: Caixa | undefined;

  // RF_B3 / estoque base
  atualizarEstoque: (produtoId: string, tipo: TipoMovimentacao, quantidade: number, origem: string) => void;
  cadastrarProduto: (produto: Omit<Produto, 'id'>) => void;

  // RF_F3 / RF_F11
  registrarDoacaoProduto: (doadorId: string, itens: { produtoId: string; quantidade: number; dataValidade?: string }[]) => void;
  registrarDoacaoDinheiro: (doadorId: string, valor: number, formaRecebimento: string) => void;
  cadastrarDoador: (doador: Omit<Doador, 'id'>) => Doador;

  // RF_F4 / RF_F5 / RF_F6
  abrirCaixa: (saldoFisico: number, saldoDigital: number) => void;
  atualizarCaixa: (tipo: TipoMovimentacao, valor: number, origem: string) => void;
  fecharCaixa: (saldoFisicoInformado: number, saldoDigitalInformado: number) => void;

  // RF_F7 / RF_F8
  abrirCotacao: (descricao: string, itens: { produtoId: string; quantidadeDesejada: number }[]) => void;
  avaliarCotacao: (cotacaoId: string, status: StatusCotacao, justificativa?: string) => void;
}

const AtlasContext = createContext<AtlasContextValue | null>(null);

export function AtlasProvider({ children }: { children: React.ReactNode }) {
  const [state, setState] = useState<AtlasState>(() => seedState());
  const [hydrated, setHydrated] = useState(false);

  // Carrega do localStorage no client (evita mismatch de hidratação)
  useEffect(() => {
    try {
      const raw = window.localStorage.getItem(STORAGE_KEY);
      if (raw) setState(JSON.parse(raw));
    } catch {
      // ignora estado corrompido e segue com o seed
    }
    setHydrated(true);
  }, []);

  useEffect(() => {
    if (!hydrated) return;
    try {
      window.localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
    } catch {
      // armazenamento indisponível (modo privado etc.) — segue só em memória
    }
  }, [state, hydrated]);

  const caixaAberto = state.caixas.find((c) => c.status === 'ABERTO');

  function atualizarEstoque(produtoId: string, tipo: TipoMovimentacao, quantidade: number, origem: string) {
    setState((prev) => ({
      ...prev,
      produtos: prev.produtos.map((p) =>
        p.id === produtoId
          ? { ...p, quantidadeEstoque: p.quantidadeEstoque + (tipo === 'ENTRADA' ? quantidade : -quantidade) }
          : p
      ),
      movimentacoesEstoque: [
        { id: uid('mov'), produtoId, tipo, quantidade, data: new Date().toISOString(), origem },
        ...prev.movimentacoesEstoque,
      ],
    }));
  }

  function cadastrarProduto(produto: Omit<Produto, 'id'>) {
    setState((prev) => ({
      ...prev,
      produtos: [{ ...produto, id: uid('p') }, ...prev.produtos],
    }));
  }

  function cadastrarDoador(doador: Omit<Doador, 'id'>): Doador {
    const novo: Doador = { ...doador, id: uid('d') };
    setState((prev) => ({ ...prev, doadores: [novo, ...prev.doadores] }));
    return novo;
  }

  function registrarDoacaoProduto(
    doadorId: string,
    itens: { produtoId: string; quantidade: number; dataValidade?: string }[]
  ) {
    const doacaoId = uid('doap');
    setState((prev) => ({
      ...prev,
      doacoesProduto: [
        {
          id: doacaoId,
          doadorId,
          data: new Date().toISOString(),
          itens: itens.map((i) => ({ produtoId: i.produtoId, quantidade: i.quantidade })),
          registradoPor: 'Funcionário',
        },
        ...prev.doacoesProduto,
      ],
    }));
    // RF_F1 - Atualizar estoque, acionado pela doação (RF_F3)
    itens.forEach((i) => atualizarEstoque(i.produtoId, 'ENTRADA', i.quantidade, `Doação de produto (${doacaoId})`));
  }

  function registrarDoacaoDinheiro(doadorId: string, valor: number, formaRecebimento: string) {
    const doacaoId = uid('doad');
    setState((prev) => ({
      ...prev,
      doacoesDinheiro: [
        {
          id: doacaoId,
          doadorId,
          valor,
          formaRecebimento,
          data: new Date().toISOString(),
          registradoPor: 'Funcionário',
        },
        ...prev.doacoesDinheiro,
      ],
    }));
    // RF_F6 - Atualizar caixa, acionado pela doação (RF_F11)
    atualizarCaixa('ENTRADA', valor, `Doação em dinheiro (${doacaoId})`);
  }

  function abrirCaixa(saldoFisico: number, saldoDigital: number) {
    setState((prev) => ({
      ...prev,
      caixas: [
        {
          id: uid('caixa'),
          dataAbertura: new Date().toISOString(),
          saldoFisicoAbertura: saldoFisico,
          saldoDigitalAbertura: saldoDigital,
          status: 'ABERTO',
          movimentacoes: [],
          abertoPor: 'Gerente',
        },
        ...prev.caixas,
      ],
    }));
  }

  function atualizarCaixa(tipo: TipoMovimentacao, valor: number, origem: string) {
    setState((prev) => {
      const aberto = prev.caixas.find((c) => c.status === 'ABERTO');
      if (!aberto) return prev;
      return {
        ...prev,
        caixas: prev.caixas.map((c) =>
          c.id === aberto.id
            ? {
                ...c,
                movimentacoes: [
                  { id: uid('movcx'), tipo, valor, origem, data: new Date().toISOString() },
                  ...c.movimentacoes,
                ],
              }
            : c
        ),
      };
    });
  }

  function fecharCaixa(saldoFisicoInformado: number, saldoDigitalInformado: number) {
    setState((prev) => {
      const aberto = prev.caixas.find((c) => c.status === 'ABERTO');
      if (!aberto) return prev;
      return {
        ...prev,
        caixas: prev.caixas.map((c) =>
          c.id === aberto.id
            ? {
                ...c,
                status: 'FECHADO',
                dataFechamento: new Date().toISOString(),
                saldoFisicoFechamento: saldoFisicoInformado,
                saldoDigitalFechamento: saldoDigitalInformado,
              }
            : c
        ),
      };
    });
  }

  function abrirCotacao(descricao: string, itens: { produtoId: string; quantidadeDesejada: number }[]) {
    setState((prev) => ({
      ...prev,
      cotacoes: [
        {
          id: uid('cot'),
          descricao,
          dataAbertura: new Date().toISOString(),
          status: 'PENDENTE',
          itens,
          abertaPor: 'Secretário',
        },
        ...prev.cotacoes,
      ],
    }));
  }

  function avaliarCotacao(cotacaoId: string, status: StatusCotacao, justificativa?: string) {
    setState((prev) => ({
      ...prev,
      cotacoes: prev.cotacoes.map((c) => (c.id === cotacaoId ? { ...c, status, justificativa } : c)),
    }));
  }

  const value = useMemo<AtlasContextValue>(
    () => ({
      ...state,
      caixaAberto,
      atualizarEstoque,
      cadastrarProduto,
      registrarDoacaoProduto,
      registrarDoacaoDinheiro,
      cadastrarDoador,
      abrirCaixa,
      atualizarCaixa,
      fecharCaixa,
      abrirCotacao,
      avaliarCotacao,
    }),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [state]
  );

  return <AtlasContext.Provider value={value}>{children}</AtlasContext.Provider>;
}

export function useAtlas() {
  const ctx = useContext(AtlasContext);
  if (!ctx) throw new Error('useAtlas deve ser usado dentro de <AtlasProvider>');
  return ctx;
}

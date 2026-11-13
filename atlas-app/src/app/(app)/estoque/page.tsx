'use client';

/**
 * View de consulta do estoque (RF_F1 - Atualizar estoque).
 * Só mostra o estoque atual e o histórico de movimentações: RF_F1 é oculto (ERS 2.2), o estoque
 * muda pelos casos de uso que o acionam (doação de produto, compras, cardápio, eventos).
 * A validação dos filtros fica no Control (AtualizarEstoqueController), acessado pela
 * API /api/estoque/movimentacoes. O cadastro de produtos fica em /produtos (RF_B3).
 */

import { useEffect, useState } from 'react';
import { ArrowDownCircle, ArrowUpCircle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Field, Select, Table, THead, EmptyRow, LowStockPill } from '@/components/app/ui';
import { CampoData } from '@/view/CampoData';

// formatos que as APIs devolvem
interface Produto {
  id: number;
  nome: string;
  categoria: string;
  unidadeMedida: string;
  quantidadeEstoque: number;
  estoqueMinimo: number;
  dataValidade: string | null;
}

interface Movimentacao {
  id: number;
  produtoId: number;
  produto: string;
  unidadeMedida: string;
  tipo: 'ENTRADA' | 'SAIDA';
  quantidade: number;
  data: string; // aaaa-mm-dd hh:mm
  origem: string;
  dataValidade: string | null;
}

type Erros = Record<string, string>;
type Filtro = { produtoId: string; tipo: string; dataInicial: string; dataFinal: string };

const FILTRO_VAZIO: Filtro = { produtoId: '', tipo: '', dataInicial: '', dataFinal: '' };

// colunas secundárias somem em telas estreitas
const COLUNAS_PRODUTOS = [
  'Produto',
  { label: 'Categoria', className: 'hidden sm:table-cell' },
  'Estoque',
  { label: 'Validade', className: 'hidden md:table-cell' },
  { label: 'Situação', className: 'hidden sm:table-cell' },
];
const COLUNAS_HISTORICO = [
  { label: 'Data', className: 'hidden sm:table-cell' },
  'Produto',
  'Tipo',
  { label: 'Quantidade', className: 'text-right' },
  { label: 'Origem', className: 'hidden md:table-cell' },
];

// aaaa-mm-dd (banco) -> dd/mm/aaaa (tela); mantém a hora se vier
function formatarData(texto: string | null) {
  if (!texto) return '—';
  const [data, hora] = texto.split(' ');
  const [a, m, d] = data.split('-');
  return `${d}/${m}/${a}${hora ? ` ${hora}` : ''}`;
}

function montarParametros(f: Filtro): string {
  const p = new URLSearchParams();
  (Object.keys(f) as (keyof Filtro)[]).forEach((k) => {
    if (f[k].trim() !== '') p.set(k, f[k].trim());
  });
  return p.toString();
}

// resposta de erro da API: { erro, erros? } -> mapa campo -> mensagem
async function lerErros(resposta: Response): Promise<Erros> {
  try {
    const corpo = await resposta.json();
    if (corpo.erros && typeof corpo.erros === 'object') return corpo.erros as Erros;
    return { geral: typeof corpo.erro === 'string' ? corpo.erro : 'Não foi possível concluir a operação.' };
  } catch {
    return { geral: 'Não foi possível concluir a operação.' };
  }
}

function MensagemErro({ texto }: { texto?: string }) {
  if (!texto) return null;
  return <span className="text-xs text-primary mt-1 block">{texto}</span>;
}

export default function EstoquePage() {
  const [produtos, setProdutos] = useState<Produto[]>([]);
  const [movimentacoes, setMovimentacoes] = useState<Movimentacao[]>([]);
  const [erroCarga, setErroCarga] = useState('');

  const [filtro, setFiltro] = useState<Filtro>(FILTRO_VAZIO);
  const [filtroAplicado, setFiltroAplicado] = useState<Filtro>(FILTRO_VAZIO);
  const [errosFiltro, setErrosFiltro] = useState<Erros>({});

  useEffect(() => {
    let cancelado = false;
    fetch('/api/produtos')
      .then(async (r) => {
        if (!r.ok) throw new Error('falha');
        const p = (await r.json()) as Produto[];
        if (!cancelado) setProdutos(p);
      })
      .catch(() => {
        if (!cancelado) setErroCarga('Não foi possível carregar o estoque. Confira se o banco de dados está no ar.');
      });
    return () => {
      cancelado = true;
    };
  }, []);

  useEffect(() => {
    let cancelado = false;
    fetch(`/api/estoque/movimentacoes?${montarParametros(filtroAplicado)}`)
      .then(async (r) => {
        if (!r.ok) throw new Error('falha');
        const m = (await r.json()) as Movimentacao[];
        if (!cancelado) setMovimentacoes(m);
      })
      .catch(() => {
        if (!cancelado) setErroCarga('Não foi possível carregar o histórico. Confira se o banco de dados está no ar.');
      });
    return () => {
      cancelado = true;
    };
  }, [filtroAplicado]);

  async function consultar(e: React.FormEvent) {
    e.preventDefault();
    // o servidor valida o filtro; se houver erro, mostra ao lado do campo
    try {
      const resposta = await fetch(`/api/estoque/movimentacoes?${montarParametros(filtro)}`);
      if (!resposta.ok) {
        setErrosFiltro(await lerErros(resposta));
        return;
      }
      setErrosFiltro({});
      setFiltroAplicado(filtro);
    } catch {
      setErrosFiltro({ geral: 'Não foi possível consultar agora.' });
    }
  }

  function limparFiltro() {
    setFiltro(FILTRO_VAZIO);
    setFiltroAplicado(FILTRO_VAZIO);
    setErrosFiltro({});
  }

  return (
    <div className="flex flex-col gap-6">
      {erroCarga && <p className="text-sm text-primary">{erroCarga}</p>}

      <Table>
        <THead cols={COLUNAS_PRODUTOS} />
        <tbody>
          {produtos.length === 0 && (
            <EmptyRow colSpan={COLUNAS_PRODUTOS.length} label="Nenhum produto cadastrado ainda. Cadastre em Produtos." />
          )}
          {produtos.map((p) => {
            const baixo = p.quantidadeEstoque <= p.estoqueMinimo;
            return (
              <tr key={p.id} className="border-b border-border-line/10 last:border-0">
                <td className="px-4 py-3 font-medium">{p.nome}</td>
                <td className="hidden sm:table-cell px-4 py-3 text-foreground/70">{p.categoria}</td>
                <td className="px-4 py-3 tabular-nums">
                  <span className={baixo ? 'text-primary' : ''}>
                    {p.quantidadeEstoque} {p.unidadeMedida}
                  </span>
                  <span className="block text-xs text-foreground/50">mín. {p.estoqueMinimo}</span>
                </td>
                <td className="hidden md:table-cell px-4 py-3 text-foreground/70 tabular-nums">{formatarData(p.dataValidade)}</td>
                <td className="hidden sm:table-cell px-4 py-3">
                  <LowStockPill low={baixo} />
                </td>
              </tr>
            );
          })}
        </tbody>
      </Table>

      <section className="flex flex-col gap-3">
        <h2 className="text-sm font-semibold">Histórico de movimentações</h2>

        <form onSubmit={consultar} className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-5 lg:items-end">
          <Field label="Produto">
            <Select value={filtro.produtoId} onChange={(e) => setFiltro({ ...filtro, produtoId: e.target.value })}>
              <option value="">Todos</option>
              {produtos.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.nome}
                </option>
              ))}
            </Select>
            <MensagemErro texto={errosFiltro.produtoId} />
          </Field>
          <Field label="Tipo">
            <Select value={filtro.tipo} onChange={(e) => setFiltro({ ...filtro, tipo: e.target.value })}>
              <option value="">Entradas e saídas</option>
              <option value="ENTRADA">Entradas</option>
              <option value="SAIDA">Saídas</option>
            </Select>
            <MensagemErro texto={errosFiltro.tipo} />
          </Field>
          <Field label="De">
            <CampoData value={filtro.dataInicial} onChange={(t) => setFiltro({ ...filtro, dataInicial: t })} />
            <MensagemErro texto={errosFiltro.dataInicial} />
          </Field>
          <Field label="Até">
            <CampoData value={filtro.dataFinal} onChange={(t) => setFiltro({ ...filtro, dataFinal: t })} />
            <MensagemErro texto={errosFiltro.dataFinal} />
          </Field>
          <div className="flex gap-2">
            <Button type="submit" variant="primary" size="md">
              Consultar
            </Button>
            <Button type="button" variant="ghost" size="md" onClick={limparFiltro}>
              Limpar
            </Button>
          </div>
        </form>
        <MensagemErro texto={errosFiltro.geral} />

        <Table>
          <THead cols={COLUNAS_HISTORICO} />
          <tbody>
            {movimentacoes.length === 0 && (
              <EmptyRow colSpan={COLUNAS_HISTORICO.length} label="Nenhuma movimentação encontrada." />
            )}
            {movimentacoes.map((m) => (
              <tr key={m.id} className="border-b border-border-line/10 last:border-0">
                <td className="hidden sm:table-cell px-4 py-3 text-foreground/70 tabular-nums">{formatarData(m.data)}</td>
                <td className="px-4 py-3">{m.produto}</td>
                <td className="px-4 py-3">
                  <span className={`inline-flex items-center gap-1.5 ${m.tipo === 'ENTRADA' ? 'text-success' : 'text-primary'}`}>
                    {m.tipo === 'ENTRADA' ? <ArrowDownCircle size={14} /> : <ArrowUpCircle size={14} />}
                    {m.tipo === 'ENTRADA' ? 'Entrada' : 'Saída'}
                  </span>
                </td>
                <td className="px-4 py-3 text-right tabular-nums">
                  {m.quantidade} {m.unidadeMedida}
                </td>
                <td className="hidden md:table-cell px-4 py-3 text-foreground/70">
                  {m.origem}
                  {m.dataValidade && <span className="block text-xs text-foreground/50">validade {formatarData(m.dataValidade)}</span>}
                </td>
              </tr>
            ))}
          </tbody>
        </Table>
      </section>
    </div>
  );
}

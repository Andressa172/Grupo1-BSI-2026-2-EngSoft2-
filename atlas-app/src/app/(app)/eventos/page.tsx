'use client';

/**
 * Tela de Eventos (RF_F9 - Alocar Recursos para Eventos)
 * Ela conversa APENAS com a API (/api/eventos), que chama o Control (AlocarRecursosController) no
 * servidor. Validação, regras, estoque e gravação no banco ficam do lado do servidor.
 */

import { useCallback, useEffect, useState } from 'react';
import { Plus, Trash2, ChevronDown, TriangleAlert, Pencil } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Field, Input, Select, Textarea, Modal, Card, Table, THead, EmptyRow, LoadingRows, IconAction, RowActions } from '@/components/app/ui';
import { mascaraNome } from '@/view/mascaras';
import { CampoData } from '@/view/CampoData';
import { avisoDataRetroativa, avisoVencimentoNaData, diasParaVencer, formatarDataBR, produtosProximosDoVencimento } from '@/view/vencimento';

interface Produto {
  id: number;
  nome: string;
  unidade_medida: string;
  quantidade_estoque: number;
  data_validade: string | null;
}

interface RecursoApi {
  id: number;
  tipo: 'PRODUTO' | 'FINANCEIRO';
  produtoId: number | null;
  produto: string | null;
  quantidade: number | null;
  valor: number | null;
}

interface EventoApi {
  id: number;
  nome: string;
  data: string; // aaaa-mm-dd
  descricao: string | null;
  recursos: RecursoApi[];
}

interface DadosFiltroEvento {
  nome: string;
  dataInicial: string;
  dataFinal: string;
}

type LinhaRecursoForm = { tipo: 'PRODUTO' | 'FINANCEIRO'; produtoId: string; quantidade: string; valor: string };

const RECURSO_VAZIO: LinhaRecursoForm = { tipo: 'PRODUTO', produtoId: '', quantidade: '', valor: '' };
const FILTRO_VAZIO: DadosFiltroEvento = { nome: '', dataInicial: '', dataFinal: '' };

function formatarData(data: string) {
  return new Date(data + 'T00:00:00').toLocaleDateString('pt-BR');
}
// aaaa-mm-dd (banco) -> dd/mm/aaaa (campo de data da tela)
function paraDataCampo(iso: string) {
  const [a, m, d] = iso.slice(0, 10).split('-');
  return d && m && a ? `${d}/${m}/${a}` : '';
}
function formatarBRL(valor: number) {
  return valor.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
}

function montarParametros(f: DadosFiltroEvento): string {
  const parametros = new URLSearchParams();
  (Object.keys(f) as (keyof DadosFiltroEvento)[]).forEach((chave) => {
    if (f[chave].trim() !== '') parametros.set(chave, f[chave].trim());
  });
  return parametros.toString();
}

// resposta de erro da API: { erro, erros? } -> mapa campo -> mensagem
async function lerErros(resposta: Response): Promise<Record<string, string>> {
  try {
    const corpo = await resposta.json();
    if (corpo.erros && typeof corpo.erros === 'object') return corpo.erros as Record<string, string>;
    return { geral: typeof corpo.erro === 'string' ? corpo.erro : 'Não foi possível concluir a operação.' };
  } catch {
    return { geral: 'Não foi possível concluir a operação.' };
  }
}

function MensagemErro({ texto }: { texto?: string }) {
  if (!texto) return null;
  return <span className="text-xs text-primary mt-1 block">{texto}</span>;
}
const destaque = (erro?: string) => (erro ? 'border-primary!' : '');

// aviso que não bloqueia o envio (data retroativa, produto perto de vencer) - cor diferente do erro
function Aviso({ texto }: { texto?: string | null }) {
  if (!texto) return null;
  return (
    <span className="flex items-start gap-1.5 text-xs text-secondary mt-1">
      <TriangleAlert size={14} className="shrink-0 mt-0.5" />
      {texto}
    </span>
  );
}

export default function EventosPage() {
  const [eventos, setEventos] = useState<EventoApi[]>([]);
  const [produtos, setProdutos] = useState<Produto[]>([]);
  const [estado, setEstado] = useState<'carregando' | 'pronto' | 'erro'>('carregando');

  // consulta: filtro digitado x filtro aplicado ao clicar em Consultar (nome e período da data)
  const [filtro, setFiltro] = useState<DadosFiltroEvento>(FILTRO_VAZIO);
  const [filtroAplicado, setFiltroAplicado] = useState<DadosFiltroEvento>(FILTRO_VAZIO);
  const [errosFiltro, setErrosFiltro] = useState<Record<string, string>>({});

  // formulário (inclusão / alteração)
  const [modalAberto, setModalAberto] = useState(false);
  const [eventoEditando, setEventoEditando] = useState<EventoApi | null>(null);
  const [dadosEvento, setDadosEvento] = useState({ nome: '', data: '', descricao: '' });
  const [recursos, setRecursos] = useState<LinhaRecursoForm[]>([{ ...RECURSO_VAZIO }]);
  const [erros, setErros] = useState<Record<string, string>>({});
  const [salvando, setSalvando] = useState(false);
  const [mostrarVencendo, setMostrarVencendo] = useState(false);

  const produtosVencendo = produtosProximosDoVencimento(produtos);

  const carregar = useCallback(async (f: DadosFiltroEvento): Promise<Record<string, string>> => {
    try {
      const resposta = await fetch(`/api/eventos?${montarParametros(f)}`);
      if (!resposta.ok) return await lerErros(resposta);
      const dados = await resposta.json();
      setEventos(dados.eventos);
      setProdutos(dados.produtos);
      setEstado('pronto');
      return {};
    } catch {
      setEstado('erro');
      return {};
    }
  }, []);

  // carrega a lista quando a tela abre (e depois só quando o filtro aplicado muda)
  useEffect(() => {
    let cancelado = false;
    fetch(`/api/eventos?${montarParametros(filtroAplicado)}`)
      .then(async (resposta) => {
        if (!resposta.ok) throw new Error('falha');
        const dados = await resposta.json();
        if (cancelado) return;
        setEventos(dados.eventos);
        setProdutos(dados.produtos);
        setEstado('pronto');
      })
      .catch(() => {
        if (!cancelado) setEstado('erro');
      });
    return () => {
      cancelado = true;
    };
  }, [filtroAplicado]);

  async function consultar(e: React.FormEvent) {
    e.preventDefault();
    const e2 = await carregar(filtro);
    setErrosFiltro(e2);
    if (Object.keys(e2).length === 0) setFiltroAplicado(filtro);
  }

  function limparFiltro() {
    setFiltro(FILTRO_VAZIO);
    setFiltroAplicado(FILTRO_VAZIO);
    setErrosFiltro({});
  }

  function abrirNovo() {
    setEventoEditando(null);
    setDadosEvento({ nome: '', data: '', descricao: '' });
    setRecursos([{ ...RECURSO_VAZIO }]);
    setErros({});
    setModalAberto(true);
  }

  function abrirEdicao(evento: EventoApi) {
    setEventoEditando(evento);
    setDadosEvento({ nome: evento.nome, data: paraDataCampo(evento.data), descricao: evento.descricao ?? '' });
    setRecursos(
      evento.recursos.length > 0
        ? evento.recursos.map((r) => ({
            tipo: r.tipo,
            produtoId: r.produtoId !== null ? String(r.produtoId) : '',
            quantidade: r.quantidade !== null ? String(r.quantidade) : '',
            valor: r.valor !== null ? String(r.valor) : '',
          }))
        : [{ ...RECURSO_VAZIO }]
    );
    setErros({});
    setModalAberto(true);
  }

  function atualizarRecurso(indice: number, mudanca: Partial<LinhaRecursoForm>) {
    setRecursos((atual) => atual.map((r, i) => (i === indice ? { ...r, ...mudanca } : r)));
  }

  async function salvar(e: React.FormEvent) {
    e.preventDefault();
    if (eventoEditando && !confirm('Alterar este evento? Os recursos antigos serão estornados e os novos alocados.')) {
      return;
    }
    setSalvando(true);
    try {
      const corpo = {
        ...dadosEvento,
        recursos: recursos.map((r) =>
          r.tipo === 'PRODUTO'
            ? { tipo: 'PRODUTO', produtoId: Number(r.produtoId) || null, quantidade: Number(r.quantidade) || null }
            : { tipo: 'FINANCEIRO', valor: Number(r.valor) || null }
        ),
      };

      const resposta = await fetch(eventoEditando ? `/api/eventos/${eventoEditando.id}` : '/api/eventos', {
        method: eventoEditando ? 'PUT' : 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(corpo),
      });

      if (!resposta.ok) {
        setErros(await lerErros(resposta));
        return;
      }
      setModalAberto(false);
      await carregar(filtroAplicado);
    } finally {
      setSalvando(false);
    }
  }

  async function excluir(evento: EventoApi) {
    if (!confirm(`Excluir o evento "${evento.nome}"? O estoque alocado será estornado.`)) return;
    const resposta = await fetch(`/api/eventos/${evento.id}`, { method: 'DELETE' });
    if (!resposta.ok) {
      const corpo = await resposta.json().catch(() => ({}));
      alert(corpo.erro ?? 'Não foi possível excluir o evento.');
      return;
    }
    await carregar(filtroAplicado);
  }

  function nomeProduto(produtoId: number | null) {
    return produtos.find((p) => p.id === produtoId)?.nome ?? `Produto #${produtoId}`;
  }

  return (
    <div className="flex flex-col gap-6">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <p className="text-sm text-foreground/50 max-w-xl">
          Alocação de recursos para eventos (RF_F9): registre o evento e os recursos necessários — produtos
          do estoque ou valores financeiros. O sistema verifica a disponibilidade antes de confirmar.
        </p>
        <Button variant="primary" size="md" onClick={abrirNovo} iconLeft={<Plus size={16} />}>
          Novo Evento
        </Button>
      </div>

      <form onSubmit={consultar} className="grid grid-cols-2 gap-3 sm:flex sm:flex-wrap sm:items-start">
        <div className="col-span-2 min-w-52 flex-1">
          <Field label="Nome do evento">
            <Input
              value={filtro.nome}
              onChange={(e) => setFiltro({ ...filtro, nome: mascaraNome(e.target.value) })}
              placeholder="Buscar por nome"
            />
          </Field>
        </div>
        <div className="sm:w-36">
          <Field label="Data inicial">
            <CampoData value={filtro.dataInicial} onChange={(t) => setFiltro({ ...filtro, dataInicial: t })} className={destaque(errosFiltro.dataInicial)} />
          </Field>
          <MensagemErro texto={errosFiltro.dataInicial} />
        </div>
        <div className="sm:w-36">
          <Field label="Data final">
            <CampoData value={filtro.dataFinal} onChange={(t) => setFiltro({ ...filtro, dataFinal: t })} className={destaque(errosFiltro.dataFinal)} />
          </Field>
          <MensagemErro texto={errosFiltro.dataFinal} />
        </div>
        <div className="col-span-2 flex gap-2 sm:mt-5.5">
          <Button type="submit" variant="outline" size="md">
            Consultar
          </Button>
          <Button type="button" variant="ghost" size="md" onClick={limparFiltro}>
            Limpar
          </Button>
        </div>
      </form>

      <Card className="p-0">
        <Table>
          <THead cols={['Data', 'Evento', 'Recursos alocados', '']} />
          <tbody>
            {estado === 'carregando' && <LoadingRows colSpan={4} />}
            {estado === 'erro' && <EmptyRow colSpan={4} label="Não foi possível carregar os eventos." />}
            {estado === 'pronto' && eventos.length === 0 && <EmptyRow colSpan={4} label="Nenhum evento encontrado." />}
            {estado === 'pronto' &&
              eventos.map((evento) => (
                <tr key={evento.id} className="border-b border-border-line/10 last:border-0 align-top">
                  <td className="px-4 py-3 text-foreground/60 whitespace-nowrap">{formatarData(evento.data)}</td>
                  <td className="px-4 py-3">
                    <p className="font-medium">{evento.nome}</p>
                    {evento.descricao && <p className="text-xs text-foreground/40">{evento.descricao}</p>}
                  </td>
                  <td className="px-4 py-3">
                    <ul className="space-y-1">
                      {evento.recursos.map((r) => (
                        <li key={r.id} className="text-foreground/70">
                          {r.tipo === 'PRODUTO' ? `${r.produto ?? nomeProduto(r.produtoId)} — ${r.quantidade}` : `Financeiro — ${formatarBRL(r.valor ?? 0)}`}
                        </li>
                      ))}
                    </ul>
                  </td>
                  <td className="px-4 py-3">
                    <RowActions>
                      <IconAction label={`Editar ${evento.nome}`} onClick={() => abrirEdicao(evento)}>
                        <Pencil size={16} />
                      </IconAction>
                      <IconAction label={`Excluir ${evento.nome}`} danger onClick={() => excluir(evento)}>
                        <Trash2 size={16} />
                      </IconAction>
                    </RowActions>
                  </td>
                </tr>
              ))}
          </tbody>
        </Table>
      </Card>

      <Modal
        open={modalAberto}
        title={eventoEditando ? 'Editar Evento' : 'Alocar Recursos para Evento'}
        onClose={() => setModalAberto(false)}
      >
        <form onSubmit={salvar} className="flex flex-col gap-4">
          <div>
            <Field label="Nome do evento *">
              <Input
                value={dadosEvento.nome}
                onChange={(e) => setDadosEvento({ ...dadosEvento, nome: e.target.value })}
                className={destaque(erros.nome)}
              />
            </Field>
            <MensagemErro texto={erros.nome} />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <Field label="Data do evento *">
                <CampoData value={dadosEvento.data} onChange={(t) => setDadosEvento({ ...dadosEvento, data: t })} className={destaque(erros.data)} />
              </Field>
              <MensagemErro texto={erros.data} />
              <Aviso texto={avisoDataRetroativa(dadosEvento.data)} />
            </div>
          </div>
          <Field label="Descrição / finalidade (opcional)">
            <Textarea rows={2} value={dadosEvento.descricao} onChange={(e) => setDadosEvento({ ...dadosEvento, descricao: e.target.value })} />
          </Field>

          {produtosVencendo.length > 0 && (
            <div className="rounded-lg border border-secondary/30 bg-secondary/10">
              <button
                type="button"
                onClick={() => setMostrarVencendo((v) => !v)}
                className="flex w-full items-center justify-between gap-2 p-3 text-xs font-medium text-foreground cursor-pointer"
              >
                <span className="flex items-center gap-1.5">
                  <TriangleAlert size={14} className="text-secondary" />
                  {produtosVencendo.length} produto(s) vencido(s) ou próximo(s) de vencer
                </span>
                <ChevronDown size={14} className={`transition-transform ${mostrarVencendo ? 'rotate-180' : ''}`} />
              </button>
              {mostrarVencendo && (
                <ul className="divide-y divide-secondary/20 border-t border-secondary/20 px-3">
                  {produtosVencendo.map((p) => {
                    const dias = diasParaVencer(p.data_validade!);
                    return (
                      <li key={p.id} className="flex items-center justify-between py-2 text-xs">
                        <span>{p.nome}</span>
                        <span className="text-foreground/60">
                          {dias < 0 ? `venceu há ${-dias} dia(s)` : dias === 0 ? 'vence hoje' : `vence em ${dias} dia(s)`} (
                          {formatarDataBR(p.data_validade!)})
                        </span>
                      </li>
                    );
                  })}
                </ul>
              )}
            </div>
          )}

          <div className="flex flex-col gap-3 border-t border-border-line/10 pt-4">
            <span className="text-xs font-semibold text-foreground">Recursos a alocar *</span>
            <MensagemErro texto={erros.recursos} />
            {recursos.map((recurso, indice) => (
              <div key={indice} className="flex flex-col gap-2 rounded-lg border border-border-line/15 p-3">
                <div className="flex items-start gap-2">
                  <div className="w-36">
                    <Field label="Tipo">
                      <Select
                        value={recurso.tipo}
                        onChange={(e) => atualizarRecurso(indice, { tipo: e.target.value as 'PRODUTO' | 'FINANCEIRO' })}
                      >
                        <option value="PRODUTO">Produto</option>
                        <option value="FINANCEIRO">Financeiro</option>
                      </Select>
                    </Field>
                  </div>
                  <button
                    type="button"
                    onClick={() => setRecursos(recursos.length > 1 ? recursos.filter((_, i) => i !== indice) : recursos)}
                    className="mt-6 ml-auto rounded-md p-2 text-foreground/50 hover:text-primary hover:bg-foreground/5 cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/40"
                    aria-label="Remover recurso"
                  >
                    <Trash2 size={16} />
                  </button>
                </div>

                {recurso.tipo === 'PRODUTO' ? (
                  <div className="grid grid-cols-1 gap-3 sm:grid-cols-[1fr_7rem]">
                    <div>
                      <Field label="Produto">
                        <Select
                          value={recurso.produtoId}
                          onChange={(e) => atualizarRecurso(indice, { produtoId: e.target.value })}
                          className={destaque(erros[`recurso.${indice}.produtoId`])}
                        >
                          <option value="" disabled>
                            Selecione...
                          </option>
                          {produtos.map((p) => (
                            <option key={p.id} value={p.id}>
                              {p.nome} ({p.quantidade_estoque} {p.unidade_medida} em estoque)
                            </option>
                          ))}
                        </Select>
                      </Field>
                      <MensagemErro texto={erros[`recurso.${indice}.produtoId`]} />
                      <Aviso
                        texto={avisoVencimentoNaData(
                          produtos.find((p) => p.id === Number(recurso.produtoId))?.data_validade ?? null,
                          dadosEvento.data
                        )}
                      />
                    </div>
                    <div>
                      <Field label="Quantidade">
                        <Input
                          type="number"
                          min={1}
                          value={recurso.quantidade}
                          onChange={(e) => atualizarRecurso(indice, { quantidade: e.target.value })}
                          className={destaque(erros[`recurso.${indice}.quantidade`])}
                        />
                      </Field>
                      <MensagemErro texto={erros[`recurso.${indice}.quantidade`]} />
                    </div>
                  </div>
                ) : (
                  <div>
                    <Field label="Valor (R$)">
                      <Input
                        type="number"
                        min={0.01}
                        step="0.01"
                        value={recurso.valor}
                        onChange={(e) => atualizarRecurso(indice, { valor: e.target.value })}
                        className={destaque(erros[`recurso.${indice}.valor`])}
                      />
                    </Field>
                    <MensagemErro texto={erros[`recurso.${indice}.valor`]} />
                  </div>
                )}
              </div>
            ))}
            <button
              type="button"
              onClick={() => setRecursos([...recursos, { ...RECURSO_VAZIO }])}
              className="text-xs font-medium text-primary hover:underline w-fit"
            >
              + Adicionar outro recurso
            </button>
          </div>

          <MensagemErro texto={erros.geral} />
          <Button type="submit" variant="primary" size="md" className="w-full mt-2" isLoading={salvando}>
            {eventoEditando ? 'Salvar alterações' : 'Confirmar Alocação'}
          </Button>
        </form>
      </Modal>
    </div>
  );
}

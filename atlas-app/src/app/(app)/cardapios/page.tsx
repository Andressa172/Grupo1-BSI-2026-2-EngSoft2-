'use client';

/**
 * Tela de Cardápios Diários (RF_F10 - Criar Cardápio Diário)
 * Ela conversa APENAS com a API (/api/cardapios), que chama o Control (CriarCardapioController) no
 * servidor. Validação, regras, estoque e gravação no banco ficam do lado do servidor.
 * Só alimentos (categoria "Alimento") podem entrar no cardápio.
 */

import { useCallback, useEffect, useState } from 'react';
import { Plus, Trash2, Eye, ChevronDown, TriangleAlert, Pencil } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Field, Input, Select, Modal, Table, THead, EmptyRow, LoadingRows, IconAction, RowActions } from '@/components/app/ui';
import { CampoData } from '@/view/CampoData';
import { avisoDataRetroativa, avisoVencimentoNaData, diasParaVencer, formatarDataBR, produtosProximosDoVencimento } from '@/view/vencimento';

interface Produto {
  id: number;
  nome: string;
  categoria: string;
  unidade_medida: string;
  quantidade_estoque: number;
  data_validade: string | null;
}

interface ItemApi {
  id: number;
  produtoId: number;
  produto: string;
  quantidadeUtilizada: number;
}

interface CardapioApi {
  id: number;
  data: string; // aaaa-mm-dd
  tipoRefeicao: string;
  itens: ItemApi[];
}

interface DadosFiltroCardapio {
  dataInicial: string;
  dataFinal: string;
  tipoRefeicao: string;
}

type LinhaItemForm = { produtoId: string; quantidade: string };

const ITEM_VAZIO: LinhaItemForm = { produtoId: '', quantidade: '' };
const FILTRO_VAZIO: DadosFiltroCardapio = { dataInicial: '', dataFinal: '', tipoRefeicao: '' };

const LABEL_REFEICAO: Record<string, string> = {
  CAFE_DA_MANHA: 'Café da manhã',
  ALMOCO: 'Almoço',
  LANCHE: 'Lanche',
  JANTAR: 'Jantar',
};

function formatarData(data: string) {
  return new Date(data + 'T00:00:00').toLocaleDateString('pt-BR');
}
// aaaa-mm-dd (banco) -> dd/mm/aaaa (campo de data da tela)
function paraDataCampo(iso: string) {
  const [a, m, d] = iso.slice(0, 10).split('-');
  return d && m && a ? `${d}/${m}/${a}` : '';
}

function montarParametros(f: DadosFiltroCardapio): string {
  const parametros = new URLSearchParams();
  (Object.keys(f) as (keyof DadosFiltroCardapio)[]).forEach((chave) => {
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

// aviso que não bloqueia o envio (data retroativa, alimento perto de vencer) - cor diferente do erro
function Aviso({ texto }: { texto?: string | null }) {
  if (!texto) return null;
  return (
    <span className="flex items-start gap-1.5 text-xs text-secondary mt-1">
      <TriangleAlert size={14} className="shrink-0 mt-0.5" />
      {texto}
    </span>
  );
}

// colunas secundárias somem em telas estreitas para as ações continuarem visíveis
const COLUNAS = [
  { label: 'Data', className: 'hidden sm:table-cell' },
  'Refeição',
  { label: 'Alimentos', className: 'hidden md:table-cell' },
  { label: 'Ações', className: 'text-right', srOnly: true },
];

export default function CardapiosPage() {
  const [cardapios, setCardapios] = useState<CardapioApi[]>([]);
  const [produtos, setProdutos] = useState<Produto[]>([]);
  const [estado, setEstado] = useState<'carregando' | 'pronto' | 'erro'>('carregando');

  // consulta: filtro digitado x filtro aplicado ao clicar em Consultar (período e tipo de refeição)
  const [filtro, setFiltro] = useState<DadosFiltroCardapio>(FILTRO_VAZIO);
  const [filtroAplicado, setFiltroAplicado] = useState<DadosFiltroCardapio>(FILTRO_VAZIO);
  const [errosFiltro, setErrosFiltro] = useState<Record<string, string>>({});

  // formulário (inclusão / alteração)
  const [modalAberto, setModalAberto] = useState(false);
  const [cardapioEditando, setCardapioEditando] = useState<CardapioApi | null>(null);
  const [dadosCardapio, setDadosCardapio] = useState({ data: '', tipoRefeicao: 'CAFE_DA_MANHA' });
  const [itens, setItens] = useState<LinhaItemForm[]>([{ ...ITEM_VAZIO }]);
  const [erros, setErros] = useState<Record<string, string>>({});
  const [salvando, setSalvando] = useState(false);
  const [mostrarVencendo, setMostrarVencendo] = useState(false);

  // visualização (só leitura)
  const [verCardapio, setVerCardapio] = useState<CardapioApi | null>(null);

  const alimentos = produtos.filter((p) => p.categoria === 'Alimento');
  const alimentosVencendo = produtosProximosDoVencimento(alimentos);

  const carregar = useCallback(async (f: DadosFiltroCardapio): Promise<Record<string, string>> => {
    try {
      const resposta = await fetch(`/api/cardapios?${montarParametros(f)}`);
      if (!resposta.ok) return await lerErros(resposta);
      const dados = await resposta.json();
      setCardapios(dados.cardapios);
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
    fetch(`/api/cardapios?${montarParametros(filtroAplicado)}`)
      .then(async (resposta) => {
        if (!resposta.ok) throw new Error('falha');
        const dados = await resposta.json();
        if (cancelado) return;
        setCardapios(dados.cardapios);
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
    setCardapioEditando(null);
    setDadosCardapio({ data: '', tipoRefeicao: 'CAFE_DA_MANHA' });
    setItens([{ ...ITEM_VAZIO }]);
    setErros({});
    setModalAberto(true);
  }

  function abrirEdicao(cardapio: CardapioApi) {
    setCardapioEditando(cardapio);
    setDadosCardapio({ data: paraDataCampo(cardapio.data), tipoRefeicao: cardapio.tipoRefeicao });
    setItens(
      cardapio.itens.length > 0
        ? cardapio.itens.map((i) => ({ produtoId: String(i.produtoId), quantidade: String(i.quantidadeUtilizada) }))
        : [{ ...ITEM_VAZIO }]
    );
    setErros({});
    setModalAberto(true);
  }

  function atualizarItem(indice: number, mudanca: Partial<LinhaItemForm>) {
    setItens((atual) => atual.map((item, i) => (i === indice ? { ...item, ...mudanca } : item)));
  }

  async function salvar(e: React.FormEvent) {
    e.preventDefault();
    if (cardapioEditando && !confirm('Alterar este cardápio? Os alimentos antigos serão estornados ao estoque e os novos descontados.')) {
      return;
    }
    setSalvando(true);
    try {
      const corpo = {
        ...dadosCardapio,
        itens: itens.map((item) => ({
          produtoId: Number(item.produtoId) || null,
          quantidadeUtilizada: Number(item.quantidade) || null,
        })),
      };

      const resposta = await fetch(cardapioEditando ? `/api/cardapios/${cardapioEditando.id}` : '/api/cardapios', {
        method: cardapioEditando ? 'PUT' : 'POST',
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

  async function excluir(cardapio: CardapioApi) {
    if (!confirm(`Excluir o cardápio de ${formatarData(cardapio.data)}? Os alimentos usados serão estornados ao estoque.`)) return;
    const resposta = await fetch(`/api/cardapios/${cardapio.id}`, { method: 'DELETE' });
    if (!resposta.ok) {
      const corpo = await resposta.json().catch(() => ({}));
      alert(corpo.erro ?? 'Não foi possível excluir o cardápio.');
      return;
    }
    await carregar(filtroAplicado);
  }

  return (
    <div className="flex flex-col gap-6">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <p className="text-sm text-foreground/50 max-w-xl">
          Cardápio diário (RF_F10): registre os alimentos usados em cada refeição. Só é permitido
          incluir alimentos (produtos da categoria &quot;Alimento&quot;) — material escolar e outras
          categorias não entram no cardápio.
        </p>
        <Button variant="primary" size="md" onClick={abrirNovo} iconLeft={<Plus size={16} />}>
          Novo cardápio
        </Button>
      </div>

      <form onSubmit={consultar} className="grid grid-cols-2 gap-3 sm:flex sm:flex-wrap sm:items-start">
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
        <div className="col-span-2 sm:w-44">
          <Field label="Tipo de refeição">
            <Select value={filtro.tipoRefeicao} onChange={(e) => setFiltro({ ...filtro, tipoRefeicao: e.target.value })}>
              <option value="">Todos</option>
              {Object.entries(LABEL_REFEICAO).map(([valor, rotulo]) => (
                <option key={valor} value={valor}>
                  {rotulo}
                </option>
              ))}
            </Select>
          </Field>
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

      <Table>
        <THead cols={COLUNAS} />
        <tbody>
          {estado === 'carregando' && <LoadingRows colSpan={COLUNAS.length} />}
          {estado === 'erro' && <EmptyRow colSpan={COLUNAS.length} label="Não foi possível carregar os cardápios." />}
          {estado === 'pronto' && cardapios.length === 0 && (
            <EmptyRow colSpan={COLUNAS.length} label="Nenhum cardápio encontrado." />
          )}
          {estado === 'pronto' &&
            cardapios.map((cardapio) => (
              <tr key={cardapio.id} className="border-b border-border-line/10 last:border-0">
                <td className="hidden sm:table-cell px-4 py-3 text-foreground/70 whitespace-nowrap tabular-nums">
                  {formatarData(cardapio.data)}
                </td>
                <td className="px-4 py-3 font-medium">{LABEL_REFEICAO[cardapio.tipoRefeicao] ?? cardapio.tipoRefeicao}</td>
                <td className="hidden md:table-cell px-4 py-3 text-foreground/70">
                  {cardapio.itens.map((i) => i.produto).join(', ')}
                </td>
                <td className="px-2 py-2 sm:px-4">
                  <RowActions>
                    <IconAction label={`Ver cardápio de ${formatarData(cardapio.data)}`} onClick={() => setVerCardapio(cardapio)}>
                      <Eye size={16} />
                    </IconAction>
                    <IconAction label={`Editar cardápio de ${formatarData(cardapio.data)}`} onClick={() => abrirEdicao(cardapio)}>
                      <Pencil size={16} />
                    </IconAction>
                    <IconAction label={`Excluir cardápio de ${formatarData(cardapio.data)}`} danger onClick={() => excluir(cardapio)}>
                      <Trash2 size={16} />
                    </IconAction>
                  </RowActions>
                </td>
              </tr>
            ))}
        </tbody>
      </Table>

      <Modal
        open={modalAberto}
        title={cardapioEditando ? 'Editar cardápio' : 'Novo cardápio'}
        onClose={() => setModalAberto(false)}
      >
        <form onSubmit={salvar} className="flex flex-col gap-4">
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <div>
              <Field label="Data do cardápio *">
                <CampoData value={dadosCardapio.data} onChange={(t) => setDadosCardapio({ ...dadosCardapio, data: t })} className={destaque(erros.data)} />
              </Field>
              <MensagemErro texto={erros.data} />
              <Aviso texto={avisoDataRetroativa(dadosCardapio.data)} />
            </div>
            <Field label="Tipo de refeição *">
              <Select
                value={dadosCardapio.tipoRefeicao}
                onChange={(e) => setDadosCardapio({ ...dadosCardapio, tipoRefeicao: e.target.value })}
              >
                {Object.entries(LABEL_REFEICAO).map(([valor, rotulo]) => (
                  <option key={valor} value={valor}>
                    {rotulo}
                  </option>
                ))}
              </Select>
            </Field>
          </div>

          {alimentosVencendo.length > 0 && (
            <div className="rounded-lg border border-secondary/30 bg-secondary/10">
              <button
                type="button"
                onClick={() => setMostrarVencendo((v) => !v)}
                className="flex w-full items-center justify-between gap-2 p-3 text-xs font-medium text-foreground cursor-pointer"
              >
                <span className="flex items-center gap-1.5">
                  <TriangleAlert size={14} className="text-secondary" />
                  {alimentosVencendo.length} alimento(s) vencido(s) ou próximo(s) de vencer
                </span>
                <ChevronDown size={14} className={`transition-transform ${mostrarVencendo ? 'rotate-180' : ''}`} />
              </button>
              {mostrarVencendo && (
                <ul className="divide-y divide-secondary/20 border-t border-secondary/20 px-3">
                  {alimentosVencendo.map((p) => {
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
            <span className="text-xs font-semibold text-foreground">Alimentos utilizados *</span>
            <MensagemErro texto={erros.itens} />
            {itens.map((item, indice) => (
              <div key={indice} className="flex flex-col gap-2 rounded-lg border border-border-line/15 p-3">
                <div className="flex items-start gap-2">
                  <div className="flex-1">
                    <Field label="Alimento">
                      <Select
                        value={item.produtoId}
                        onChange={(e) => atualizarItem(indice, { produtoId: e.target.value })}
                        className={destaque(erros[`item.${indice}.produtoId`])}
                      >
                        <option value="" disabled>
                          Selecione...
                        </option>
                        {alimentos.map((p) => (
                          <option key={p.id} value={p.id}>
                            {p.nome} ({p.quantidade_estoque} {p.unidade_medida} em estoque)
                          </option>
                        ))}
                      </Select>
                    </Field>
                    <MensagemErro texto={erros[`item.${indice}.produtoId`]} />
                    <Aviso
                      texto={avisoVencimentoNaData(
                        alimentos.find((p) => p.id === Number(item.produtoId))?.data_validade ?? null,
                        dadosCardapio.data
                      )}
                    />
                  </div>
                  <div className="w-28">
                    <Field label="Quantidade">
                      <Input
                        type="number"
                        min={1}
                        value={item.quantidade}
                        onChange={(e) => atualizarItem(indice, { quantidade: e.target.value })}
                        className={destaque(erros[`item.${indice}.quantidadeUtilizada`])}
                      />
                    </Field>
                    <MensagemErro texto={erros[`item.${indice}.quantidadeUtilizada`]} />
                  </div>
                  <button
                    type="button"
                    onClick={() => setItens(itens.length > 1 ? itens.filter((_, i) => i !== indice) : itens)}
                    className="mt-6 rounded-md p-2 text-foreground/50 hover:text-primary hover:bg-foreground/5 cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/40"
                    aria-label="Remover alimento"
                  >
                    <Trash2 size={16} />
                  </button>
                </div>
              </div>
            ))}
            <button
              type="button"
              onClick={() => setItens([...itens, { ...ITEM_VAZIO }])}
              className="inline-flex items-center gap-1.5 text-xs font-medium text-primary hover:underline w-fit cursor-pointer"
            >
              <Plus size={14} aria-hidden />
              Adicionar outro alimento
            </button>
          </div>

          <MensagemErro texto={erros.geral} />
          <div className="mt-4 flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
            <Button type="button" variant="ghost" size="md" onClick={() => setModalAberto(false)}>
              Cancelar
            </Button>
            <Button type="submit" variant="primary" size="md" isLoading={salvando}>
              {cardapioEditando ? 'Salvar alterações' : 'Confirmar cardápio'}
            </Button>
          </div>
        </form>
      </Modal>

      <Modal
        open={verCardapio !== null}
        title={verCardapio ? `Cardápio de ${formatarData(verCardapio.data)}` : ''}
        onClose={() => setVerCardapio(null)}
      >
        {verCardapio && (
          <div className="flex flex-col gap-4">
            <p className="text-sm text-foreground/60">
              Refeição: <span className="font-medium text-foreground">{LABEL_REFEICAO[verCardapio.tipoRefeicao] ?? verCardapio.tipoRefeicao}</span>
            </p>
            <ul className="divide-y divide-border-line/10">
              {verCardapio.itens.map((item) => (
                <li key={item.id} className="flex items-center justify-between py-2 text-sm">
                  <span>{item.produto}</span>
                  <span className="text-foreground/60">{item.quantidadeUtilizada}</span>
                </li>
              ))}
            </ul>
            <div className="flex justify-end">
              <Button type="button" variant="ghost" size="md" onClick={() => setVerCardapio(null)}>
                Fechar
              </Button>
            </div>
          </div>
        )}
      </Modal>
    </div>
  );
}

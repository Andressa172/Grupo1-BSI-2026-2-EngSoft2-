'use client';

/**
 * View unificada de Cotações:
 * - RF_F7 (Abrir cotação): exclusivo para o cargo SECRETARIO.
 * - RF_F8 (Aprovar cotação): exclusivo para o cargo GERENTE.
 * A validação, regras de negócio, hierarquia e persistência ficam nos Controllers
 * (AbrirCotacaoController e AprovarCotacaoController) acessados via /api/cotacoes.
 */

import { useEffect, useState } from 'react';
import { Plus, Trash2, Check, X as XIcon, ClipboardCheck } from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  Field,
  Input,
  Select,
  Textarea,
  Modal,
  Table,
  THead,
  EmptyRow,
  LoadingRows,
  StatusPill,
  IconAction,
  RowActions,
} from '@/components/app/ui';
import type { PerfilUsuario, StatusCotacao } from '@/lib/types';

interface UsuarioSessao {
  id: number;
  nome: string;
  login: string;
  perfil: PerfilUsuario;
  ativo: boolean;
}

interface ProdutoOpcao {
  id: number;
  nome: string;
  unidadeMedida: string;
}

interface ItemCotacaoView {
  id: number;
  produtoId: number;
  produto: string;
  unidadeMedida: string;
  quantidadeDesejada: number;
}

interface CotacaoView {
  id: number;
  descricao: string;
  dataAbertura: string;
  dataLimite: string | null;
  dataAvaliacao: string | null;
  status: StatusCotacao;
  abertaPor: number | null;
  nomeAbertaPor: string | null;
  avaliadaPor: number | null;
  nomeAvaliadaPor: string | null;
  justificativa: string | null;
  itens: ItemCotacaoView[];
}

type Erros = Record<string, string>;

const CHAVE_USUARIO_LOGADO = 'atlas-usuario-logado';
const LIMITE_ITENS_TABELA = 2;

const FILTRO_VAZIO = {
  id: '',
  descricao: '',
  item: '',
  dataAberturaInicio: '',
  dataAberturaFim: '',
  dataAprovacaoInicio: '',
  dataAprovacaoFim: '',
  status: '',
};

const COLUNAS = [
  { label: 'Nº', className: 'w-16' },
  { label: 'Datas', className: 'hidden md:table-cell' },
  'Descrição',
  { label: 'Itens', className: 'hidden sm:table-cell' },
  'Status',
  { label: 'Ações', className: 'text-right', srOnly: true },
];

function hojeIso(): string {
  const agora = new Date();
  const mes = String(agora.getMonth() + 1).padStart(2, '0');
  const dia = String(agora.getDate()).padStart(2, '0');
  return `${agora.getFullYear()}-${mes}-${dia}`;
}

function formatarData(iso: string | null | undefined): string {
  if (!iso) return '—';
  const partes = iso.slice(0, 10).split('-');
  if (partes.length === 3) {
    return `${partes[2]}/${partes[1]}/${partes[0]}`;
  }
  return iso;
}

function MensagemErro({ id, texto }: { id?: string; texto?: string }) {
  if (!texto) return null;
  return (
    <div id={id} className="invalid-feedback text-xs text-primary mt-1 block">
      {texto}
    </div>
  );
}

function invalido(campo: string, erros: Erros) {
  const erro = erros[campo];
  return {
    'aria-invalid': erro ? true : undefined,
    'aria-describedby': erro ? `erro-${campo}` : undefined,
    className: erro ? 'is-invalid border-primary! focus:ring-primary/30' : '',
  };
}

function montarUrlConsulta(filtro: typeof FILTRO_VAZIO): string {
  const params = new URLSearchParams();
  if (filtro.id.trim()) params.set('id', filtro.id.trim());
  if (filtro.descricao.trim()) params.set('descricao', filtro.descricao.trim());
  if (filtro.item.trim()) params.set('item', filtro.item.trim());
  if (filtro.dataAberturaInicio.trim()) params.set('dataAberturaInicio', filtro.dataAberturaInicio.trim());
  if (filtro.dataAberturaFim.trim()) params.set('dataAberturaFim', filtro.dataAberturaFim.trim());
  if (filtro.dataAprovacaoInicio.trim()) params.set('dataAprovacaoInicio', filtro.dataAprovacaoInicio.trim());
  if (filtro.dataAprovacaoFim.trim()) params.set('dataAprovacaoFim', filtro.dataAprovacaoFim.trim());
  if (filtro.status) params.set('status', filtro.status);
  const qs = params.toString();
  return qs ? `/api/cotacoes?${qs}` : '/api/cotacoes';
}

export default function CotacoesPage() {
  const [usuarioAtual, setUsuarioAtual] = useState<UsuarioSessao>({
    id: 1,
    nome: 'Gerente SOS Criança',
    login: 'gerente',
    perfil: 'GERENTE',
    ativo: true,
  });

  const [cotacoes, setCotacoes] = useState<CotacaoView[]>([]);
  const [produtos, setProdutos] = useState<ProdutoOpcao[]>([]);
  const [estadoLista, setEstadoLista] = useState<'carregando' | 'pronto' | 'erro'>('carregando');
  const [avisoGeral, setAvisoGeral] = useState('');

  // Filtros de busca (RF_F7 e RF_F8)
  const [filtro, setFiltro] = useState(FILTRO_VAZIO);
  const [filtroAplicado, setFiltroAplicado] = useState(FILTRO_VAZIO);
  const [erroConsulta, setErroConsulta] = useState('');

  // Modal de detalhes completos da cotação (ao clicar na linha)
  const [detalheAlvo, setDetalheAlvo] = useState<CotacaoView | null>(null);

  // Modal RF_F7 - Abrir cotação (Secretário)
  const [novaOpen, setNovaOpen] = useState(false);
  const [descricao, setDescricao] = useState('');
  const [dataAbertura, setDataAbertura] = useState(hojeIso());
  const [dataLimite, setDataLimite] = useState('');
  const [itens, setItens] = useState<{ produtoId: string; quantidadeDesejada: string }[]>([
    { produtoId: '', quantidadeDesejada: '' },
  ]);
  const [confirmandoAbertura, setConfirmandoAbertura] = useState(false);
  const [salvandoAbertura, setSalvandoAbertura] = useState(false);
  const [errosAbertura, setErrosAbertura] = useState<Erros>({});
  const [erroGeralAbertura, setErroGeralAbertura] = useState('');
  const [foiValidadoAbertura, setFoiValidadoAbertura] = useState(false);

  // Modal RF_F8 - Aprovar cotação (Gerente)
  const [avaliarAlvo, setAvaliarAlvo] = useState<CotacaoView | null>(null);
  const [decisaoAvaliacao, setDecisaoAvaliacao] = useState<'APROVADA' | 'REPROVADA' | null>(null);
  const [justificativa, setJustificativa] = useState('');
  const [salvandoAvaliacao, setSalvandoAvaliacao] = useState(false);
  const [errosAvaliacao, setErrosAvaliacao] = useState<Erros>({});
  const [erroGeralAvaliacao, setErroGeralAvaliacao] = useState('');
  const [foiValidadoAvaliacao, setFoiValidadoAvaliacao] = useState(false);

  useEffect(() => {
    try {
      const salvo = window.localStorage.getItem(CHAVE_USUARIO_LOGADO);
      if (salvo) {
        const parsed = JSON.parse(salvo) as UsuarioSessao;
        if (parsed && parsed.perfil && parsed.id) {
          setUsuarioAtual(parsed);
        }
      }
    } catch {
      // mantém usuário padrão
    }
  }, []);

  async function carregarProdutos() {
    try {
      const resposta = await fetch('/api/produtos', { cache: 'no-store' });
      if (!resposta.ok) return;
      const lista = (await resposta.json()) as ProdutoOpcao[];
      setProdutos(lista);
    } catch {
      // silencioso: produtos serão recarregados ao abrir modal
    }
  }

  async function carregarCotacoes(criterios = filtroAplicado) {
    setEstadoLista('carregando');
    setErroConsulta('');
    try {
      const resposta = await fetch(montarUrlConsulta(criterios), { cache: 'no-store' });
      if (!resposta.ok) {
        const corpo = await resposta.json().catch(() => ({}));
        setErroConsulta(corpo.erro ?? 'Não foi possível consultar as cotações.');
        setEstadoLista('erro');
        return;
      }
      const dados = (await resposta.json()) as CotacaoView[];
      setCotacoes(dados);
      setEstadoLista('pronto');
    } catch {
      setErroConsulta('Sem conexão com o servidor. Tente novamente em instantes.');
      setEstadoLista('erro');
    }
  }

  useEffect(() => {
    carregarCotacoes(FILTRO_VAZIO);
    carregarProdutos();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const ehSecretario = usuarioAtual.perfil === 'SECRETARIO';
  const ehGerente = usuarioAtual.perfil === 'GERENTE';

  function consultar(e: React.FormEvent) {
    e.preventDefault();
    setFiltroAplicado(filtro);
    carregarCotacoes(filtro);
  }

  function limparFiltros() {
    setFiltro(FILTRO_VAZIO);
    setFiltroAplicado(FILTRO_VAZIO);
    carregarCotacoes(FILTRO_VAZIO);
  }

  // -------------------- RF_F7: Abrir cotação (Secretário) --------------------

  function abrirModalNovaCotacao() {
    setDescricao('');
    setDataAbertura(hojeIso());
    setDataLimite('');
    setItens([{ produtoId: produtos[0] ? String(produtos[0].id) : '', quantidadeDesejada: '' }]);
    setConfirmandoAbertura(false);
    setErrosAbertura({});
    setErroGeralAbertura('');
    setFoiValidadoAbertura(false);
    setNovaOpen(true);
  }

  function fecharModalNovaCotacao() {
    if (salvandoAbertura) return;
    // Fluxo alternativo 7.1 (Cancelamento): descarta dados temporários
    setNovaOpen(false);
    setConfirmandoAbertura(false);
    setErrosAbertura({});
    setErroGeralAbertura('');
    setFoiValidadoAbertura(false);
  }

  function validarFormularioAberturaLocal(): Erros {
    const novosErros: Erros = {};
    if (!descricao.trim()) {
      novosErros.descricao = 'Descrição não preenchida: informe a descrição da cotação.';
    } else if (descricao.trim().length > 255) {
      novosErros.descricao = 'A descrição deve ter no máximo 255 caracteres.';
    }
    if (!dataAbertura.trim()) {
      novosErros.dataAbertura = 'A data de abertura é obrigatória.';
    }
    if (dataLimite.trim() && dataAbertura.trim() && dataLimite < dataAbertura) {
      novosErros.dataLimite = 'A data limite não pode ser anterior à data de abertura.';
    }
    if (itens.length === 0) {
      novosErros.itens = 'Adicione pelo menos um item à cotação.';
    } else {
      const vistos = new Set<string>();
      itens.forEach((item, idx) => {
        if (!item.produtoId) {
          novosErros[`itens.${idx}.produto`] = 'Selecione um produto cadastrado.';
        } else if (vistos.has(item.produtoId)) {
          novosErros[`itens.${idx}.produto`] = 'Este produto já foi adicionado na cotação.';
        } else {
          vistos.add(item.produtoId);
        }
        const qtd = Number(item.quantidadeDesejada);
        if (!item.quantidadeDesejada.trim() || !Number.isInteger(qtd) || qtd <= 0) {
          novosErros[`itens.${idx}.quantidadeDesejada`] = 'Informe uma quantidade inteira maior que zero.';
        }
      });
    }
    return novosErros;
  }

  function avancarParaConfirmacaoAbertura(e: React.FormEvent) {
    e.preventDefault();
    setFoiValidadoAbertura(true);
    setErroGeralAbertura('');
    const errosLocais = validarFormularioAberturaLocal();
    setErrosAbertura(errosLocais);
    if (Object.keys(errosLocais).length > 0) {
      return;
    }
    // Passo 4 da ERS: Sistema apresenta os dados preenchidos e solicita confirmação
    setConfirmandoAbertura(true);
  }

  async function confirmarAberturaCotacao() {
    setSalvandoAbertura(true);
    setErroGeralAbertura('');
    try {
      const resposta = await fetch('/api/cotacoes', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          descricao: descricao.trim(),
          dataAbertura,
          dataLimite: dataLimite.trim() || null,
          abertaPor: usuarioAtual.id,
          itens: itens.map((i) => ({
            produtoId: Number(i.produtoId),
            quantidadeDesejada: Number(i.quantidadeDesejada),
          })),
        }),
      });

      if (!resposta.ok) {
        const corpo = await resposta.json().catch(() => ({}));
        if (corpo.erros && typeof corpo.erros === 'object') {
          setErrosAbertura(corpo.erros);
          setConfirmandoAbertura(false);
        }
        setErroGeralAbertura(corpo.erro ?? 'Não foi possível registrar a cotação.');
        return;
      }

      setNovaOpen(false);
      setConfirmandoAbertura(false);
      setAvisoGeral('Cotação aberta e registrada com sucesso com status PENDENTE.');
      await carregarCotacoes();
    } catch {
      setErroGeralAbertura('Sem conexão com o servidor. Tente novamente.');
    } finally {
      setSalvandoAbertura(false);
    }
  }

  // -------------------- RF_F8: Aprovar cotação (Gerente) --------------------

  function abrirModalAvaliar(cotacao: CotacaoView) {
    setDetalheAlvo(null);
    setAvaliarAlvo(cotacao);
    setDecisaoAvaliacao(null);
    setJustificativa('');
    setErrosAvaliacao({});
    setErroGeralAvaliacao('');
    setFoiValidadoAvaliacao(false);
  }

  function fecharModalAvaliar() {
    if (salvandoAvaliacao) return;
    // Fluxo alternativo 4.1 (Cancelamento): mantém status original sem salvar alterações
    setAvaliarAlvo(null);
    setDecisaoAvaliacao(null);
    setJustificativa('');
    setErrosAvaliacao({});
    setErroGeralAvaliacao('');
    setFoiValidadoAvaliacao(false);
  }

  function selecionarDecisao(status: 'APROVADA' | 'REPROVADA') {
    setFoiValidadoAvaliacao(true);
    setErroGeralAvaliacao('');
    const novosErros: Erros = {};
    if (status === 'REPROVADA' && !justificativa.trim()) {
      novosErros.justificativa = 'A justificativa é obrigatória ao reprovar uma cotação.';
    } else if (justificativa.trim().length > 500) {
      novosErros.justificativa = 'A justificativa deve ter no máximo 500 caracteres.';
    }
    setErrosAvaliacao(novosErros);
    if (Object.keys(novosErros).length > 0) {
      return;
    }
    // Passo 4 da ERS: Solicita confirmação antes de gravar
    setDecisaoAvaliacao(status);
  }

  async function confirmarAvaliacaoCotacao() {
    if (!avaliarAlvo || !decisaoAvaliacao) return;
    setSalvandoAvaliacao(true);
    setErroGeralAvaliacao('');
    try {
      const resposta = await fetch(`/api/cotacoes/${avaliarAlvo.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          status: decisaoAvaliacao,
          justificativa: justificativa.trim() || null,
          avaliadaPor: usuarioAtual.id,
        }),
      });

      if (!resposta.ok) {
        const corpo = await resposta.json().catch(() => ({}));
        if (corpo.erros && typeof corpo.erros === 'object') {
          setErrosAvaliacao(corpo.erros);
          setDecisaoAvaliacao(null);
        }
        setErroGeralAvaliacao(corpo.erro ?? 'Não foi possível registrar a avaliação da cotação.');
        return;
      }

      const statusTexto = decisaoAvaliacao === 'APROVADA' ? 'APROVADA' : 'REPROVADA';
      setAvaliarAlvo(null);
      setDecisaoAvaliacao(null);
      setJustificativa('');
      setAvisoGeral(`Cotação #${avaliarAlvo.id} atualizada para ${statusTexto} com sucesso.`);
      await carregarCotacoes();
    } catch {
      setErroGeralAvaliacao('Sem conexão com o servidor. Tente novamente.');
    } finally {
      setSalvandoAvaliacao(false);
    }
  }

  return (
    <div className="flex flex-col gap-6">
      <div className="flex items-center justify-between gap-4 flex-wrap">
        <p className="text-sm text-foreground/50 max-w-xl">
          {ehSecretario
            ? 'Gerenciamento de cotações (RF_F7): abra novas cotações de produtos e acompanhe o status de avaliação.'
            : ehGerente
              ? 'Avaliação de cotações (RF_F8): consulte as cotações abertas e aprove ou reprove as solicitações pendentes.'
              : 'Consulte as cotações registradas no sistema.'}
        </p>
        {ehSecretario && (
          <Button variant="primary" size="md" onClick={abrirModalNovaCotacao} iconLeft={<Plus size={16} />}>
            Nova cotação
          </Button>
        )}
      </div>

      {avisoGeral && (
        <div
          role="status"
          className="flex items-center justify-between rounded-lg border border-border-line/30 bg-foreground/5 px-4 py-2.5 text-sm text-foreground"
        >
          <span>{avisoGeral}</span>
          <button
            type="button"
            onClick={() => setAvisoGeral('')}
            className="text-xs text-foreground/60 hover:text-foreground cursor-pointer ml-4"
          >
            Fechar
          </button>
        </div>
      )}

      {/* Barra de filtros (mesmo padrão visual de Funcionários / Produtos / Atendidos) */}
      <form onSubmit={consultar} noValidate className="flex flex-wrap items-end gap-3">
        <div className="w-28">
          <Field label="Nº (ID)">
            <Input
              type="number"
              min={1}
              value={filtro.id}
              onChange={(e) => setFiltro({ ...filtro, id: e.target.value })}
              placeholder="Ex.: 1"
            />
          </Field>
        </div>

        <div className="min-w-48 flex-1">
          <Field label="Descrição">
            <Input
              value={filtro.descricao}
              onChange={(e) => setFiltro({ ...filtro, descricao: e.target.value })}
              placeholder="Buscar por descrição"
            />
          </Field>
        </div>

        <div className="min-w-48 flex-1">
          <Field label="Item da cotação">
            <Input
              list="opcoes-itens-cotacao"
              value={filtro.item}
              onChange={(e) => setFiltro({ ...filtro, item: e.target.value })}
              placeholder="Ex.: Arroz, Leite..."
            />
            <datalist id="opcoes-itens-cotacao">
              {produtos.map((p) => (
                <option key={p.id} value={p.nome} />
              ))}
            </datalist>
          </Field>
        </div>

        <div className="w-40">
          <Field label="Abertura (de)">
            <Input
              type="date"
              value={filtro.dataAberturaInicio}
              onChange={(e) => setFiltro({ ...filtro, dataAberturaInicio: e.target.value })}
            />
          </Field>
        </div>

        <div className="w-40">
          <Field label="Abertura (até)">
            <Input
              type="date"
              min={filtro.dataAberturaInicio || undefined}
              value={filtro.dataAberturaFim}
              onChange={(e) => setFiltro({ ...filtro, dataAberturaFim: e.target.value })}
            />
          </Field>
        </div>

        <div className="w-40">
          <Field label="Aprovação (de)">
            <Input
              type="date"
              value={filtro.dataAprovacaoInicio}
              onChange={(e) => setFiltro({ ...filtro, dataAprovacaoInicio: e.target.value })}
            />
          </Field>
        </div>

        <div className="w-40">
          <Field label="Aprovação (até)">
            <Input
              type="date"
              min={filtro.dataAprovacaoInicio || undefined}
              value={filtro.dataAprovacaoFim}
              onChange={(e) => setFiltro({ ...filtro, dataAprovacaoFim: e.target.value })}
            />
          </Field>
        </div>

        <div className="w-36">
          <Field label="Status">
            <Select value={filtro.status} onChange={(e) => setFiltro({ ...filtro, status: e.target.value })}>
              <option value="">Todos</option>
              <option value="PENDENTE">Pendente</option>
              <option value="APROVADA">Aprovada</option>
              <option value="REPROVADA">Reprovada</option>
            </Select>
          </Field>
        </div>

        <div className="flex gap-2">
          <Button type="submit" variant="primary" size="md">
            Consultar
          </Button>
          <Button type="button" variant="outline" size="md" onClick={limparFiltros}>
            Limpar
          </Button>
        </div>
      </form>
      <MensagemErro texto={erroConsulta} />

      {/* Lista de cotações */}
      <Table>
        <THead cols={COLUNAS} />
        <tbody>
          {estadoLista === 'carregando' && <LoadingRows colSpan={COLUNAS.length} />}
          {estadoLista === 'pronto' && cotacoes.length === 0 && (
            <EmptyRow colSpan={COLUNAS.length} label="Nenhuma cotação encontrada." />
          )}
          {estadoLista === 'pronto' &&
            cotacoes.map((c) => {
              const itensVisiveis = c.itens.slice(0, LIMITE_ITENS_TABELA);
              const itensRestantes = c.itens.length - itensVisiveis.length;

              return (
                <tr
                  key={c.id}
                  onClick={() => setDetalheAlvo(c)}
                  title={`Clique para visualizar todos os detalhes da cotação #${c.id}`}
                  className="border-b border-border-line/10 last:border-0 align-top cursor-pointer hover:bg-foreground/[0.02] transition-colors"
                >
                  <td className="px-4 py-3 font-medium text-foreground/80 tabular-nums">#{c.id}</td>
                  <td className="hidden md:table-cell px-4 py-3 text-foreground/70 whitespace-nowrap tabular-nums">
                    <div>Abertura: {formatarData(c.dataAbertura)}</div>
                    {c.dataLimite && <div className="text-xs text-foreground/50">Limite: {formatarData(c.dataLimite)}</div>}
                    {c.dataAvaliacao && (
                      <div className="text-xs text-foreground/50">Avaliação: {formatarData(c.dataAvaliacao)}</div>
                    )}
                  </td>
                  <td className="px-4 py-3 max-w-xs">
                    <div className="font-medium text-foreground">{c.descricao}</div>
                    {c.nomeAbertaPor && (
                      <div className="text-xs text-foreground/50 mt-0.5">Aberta por: {c.nomeAbertaPor}</div>
                    )}
                  </td>
                  <td className="hidden sm:table-cell px-4 py-3">
                    <ul className="space-y-1">
                      {itensVisiveis.map((i) => (
                        <li key={i.id} className="text-foreground/70">
                          {i.produto} — {i.quantidadeDesejada} {i.unidadeMedida}
                        </li>
                      ))}
                    </ul>
                    {itensRestantes > 0 && (
                      <span className="mt-1.5 inline-block text-xs font-medium text-primary hover:underline">
                        +{itensRestantes} {itensRestantes === 1 ? 'item' : 'itens'} (ver todos)
                      </span>
                    )}
                  </td>
                  <td className="px-4 py-3">
                    <StatusPill status={c.status} />
                    {c.nomeAvaliadaPor && (
                      <p className="text-xs text-foreground/50 mt-1">Avaliada por: {c.nomeAvaliadaPor}</p>
                    )}
                    {c.justificativa && (
                      <p className="text-xs text-foreground/60 mt-1 max-w-56 line-clamp-2">{c.justificativa}</p>
                    )}
                  </td>
                  <td className="px-2 py-2 sm:px-4" onClick={(e) => e.stopPropagation()}>
                    {ehGerente && c.status === 'PENDENTE' && (
                      <RowActions>
                        <IconAction label={`Avaliar cotação #${c.id}: ${c.descricao}`} onClick={() => abrirModalAvaliar(c)}>
                          <ClipboardCheck size={16} />
                        </IconAction>
                      </RowActions>
                    )}
                  </td>
                </tr>
              );
            })}
        </tbody>
      </Table>

      {/* Modal de Detalhes Completos da Cotação (ao clicar na linha) */}
      <Modal
        open={!!detalheAlvo}
        title={detalheAlvo ? `Detalhes da cotação #${detalheAlvo.id}` : 'Detalhes da cotação'}
        onClose={() => setDetalheAlvo(null)}
      >
        {detalheAlvo && (
          <div className="flex flex-col gap-4 text-sm">
            <div className="flex items-start justify-between gap-3">
              <div>
                <p className="text-xs text-foreground/50">Descrição</p>
                <p className="font-medium text-foreground text-base">{detalheAlvo.descricao}</p>
              </div>
              <StatusPill status={detalheAlvo.status} />
            </div>

            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 rounded-lg border border-border-line/20 bg-foreground/[0.02] p-3">
              <div>
                <span className="text-xs text-foreground/50 block">Data de abertura</span>
                <span className="font-medium tabular-nums">{formatarData(detalheAlvo.dataAbertura)}</span>
              </div>
              <div>
                <span className="text-xs text-foreground/50 block">Data limite</span>
                <span className="font-medium tabular-nums">{formatarData(detalheAlvo.dataLimite)}</span>
              </div>
              <div>
                <span className="text-xs text-foreground/50 block">Aberta por (Secretário)</span>
                <span className="font-medium">{detalheAlvo.nomeAbertaPor ?? '—'}</span>
              </div>
              <div>
                <span className="text-xs text-foreground/50 block">Data de aprovação / avaliação</span>
                <span className="font-medium tabular-nums">{formatarData(detalheAlvo.dataAvaliacao)}</span>
              </div>
              {detalheAlvo.nomeAvaliadaPor && (
                <div className="sm:col-span-2">
                  <span className="text-xs text-foreground/50 block">Avaliada por (Gerente)</span>
                  <span className="font-medium">{detalheAlvo.nomeAvaliadaPor}</span>
                </div>
              )}
              {detalheAlvo.justificativa && (
                <div className="sm:col-span-2">
                  <span className="text-xs text-foreground/50 block">Justificativa / observações</span>
                  <p className="text-foreground/80 mt-0.5">{detalheAlvo.justificativa}</p>
                </div>
              )}
            </div>

            <div>
              <p className="text-xs font-semibold uppercase tracking-wide text-foreground/50 mb-2">
                Itens solicitados ({detalheAlvo.itens.length})
              </p>
              <div className="max-h-60 overflow-y-auto rounded-lg border border-border-line/20 divide-y divide-border-line/10">
                {detalheAlvo.itens.map((item) => (
                  <div key={item.id} className="flex items-center justify-between px-3 py-2">
                    <span className="font-medium text-foreground">{item.produto}</span>
                    <span className="text-foreground/70 tabular-nums">
                      {item.quantidadeDesejada} {item.unidadeMedida}
                    </span>
                  </div>
                ))}
              </div>
            </div>

            <div className="mt-2 flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
              <Button type="button" variant="ghost" size="md" onClick={() => setDetalheAlvo(null)}>
                Fechar
              </Button>
              {ehGerente && detalheAlvo.status === 'PENDENTE' && (
                <Button
                  type="button"
                  variant="primary"
                  size="md"
                  iconLeft={<ClipboardCheck size={16} />}
                  onClick={() => abrirModalAvaliar(detalheAlvo)}
                >
                  Avaliar cotação
                </Button>
              )}
            </div>
          </div>
        )}
      </Modal>

      {/* Modal RF_F7: Abrir cotação (Secretário) */}
      <Modal open={novaOpen} title="Abrir nova cotação" onClose={fecharModalNovaCotacao}>
        {!confirmandoAbertura ? (
          <form
            onSubmit={avancarParaConfirmacaoAbertura}
            noValidate
            className={`needs-validation flex flex-col gap-4 ${foiValidadoAbertura ? 'was-validated' : ''}`}
          >
            {erroGeralAbertura && (
              <div
                role="alert"
                className="rounded-lg border border-primary/30 bg-primary/10 px-3 py-2 text-xs text-primary"
              >
                {erroGeralAbertura}
              </div>
            )}

            <Field label="Descrição da cotação *">
              <Input
                value={descricao}
                onChange={(e) => {
                  setDescricao(e.target.value);
                  if (errosAbertura.descricao) {
                    setErrosAbertura({ ...errosAbertura, descricao: '' });
                  }
                }}
                placeholder="Ex.: Reposição mensal de alimentos básicos"
                required
                {...invalido('descricao', errosAbertura)}
              />
              <MensagemErro id="erro-descricao" texto={errosAbertura.descricao} />
            </Field>

            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <Field label="Data de abertura *">
                <Input
                  type="date"
                  value={dataAbertura}
                  onChange={(e) => {
                    setDataAbertura(e.target.value);
                    if (errosAbertura.dataAbertura) {
                      setErrosAbertura({ ...errosAbertura, dataAbertura: '' });
                    }
                  }}
                  required
                  {...invalido('dataAbertura', errosAbertura)}
                />
                <MensagemErro id="erro-dataAbertura" texto={errosAbertura.dataAbertura} />
              </Field>

              <Field label="Data limite">
                <Input
                  type="date"
                  min={dataAbertura || undefined}
                  value={dataLimite}
                  onChange={(e) => {
                    setDataLimite(e.target.value);
                    if (errosAbertura.dataLimite) {
                      setErrosAbertura({ ...errosAbertura, dataLimite: '' });
                    }
                  }}
                  {...invalido('dataLimite', errosAbertura)}
                />
                <MensagemErro id="erro-dataLimite" texto={errosAbertura.dataLimite} />
              </Field>
            </div>

            <div className="flex flex-col gap-3">
              <span className="text-xs font-medium text-foreground/70">Itens da cotação *</span>
              {itens.map((item, idx) => (
                <div key={idx} className="flex flex-col gap-1">
                  <div className="flex items-end gap-2">
                    <div className="flex-1">
                      <Field label={idx === 0 ? 'Produto' : ''}>
                        <Select
                          value={item.produtoId}
                          onChange={(e) => {
                            const copy = [...itens];
                            copy[idx].produtoId = e.target.value;
                            setItens(copy);
                          }}
                          required
                          {...invalido(`itens.${idx}.produto`, errosAbertura)}
                        >
                          <option value="">Selecione um produto...</option>
                          {produtos.map((p) => (
                            <option key={p.id} value={String(p.id)}>
                              {p.nome} ({p.unidadeMedida})
                            </option>
                          ))}
                        </Select>
                      </Field>
                    </div>
                    <div className="w-28">
                      <Field label={idx === 0 ? 'Quantidade' : ''}>
                        <Input
                          type="number"
                          min={1}
                          value={item.quantidadeDesejada}
                          onChange={(e) => {
                            const copy = [...itens];
                            copy[idx].quantidadeDesejada = e.target.value;
                            setItens(copy);
                          }}
                          placeholder="Qtd."
                          required
                          {...invalido(`itens.${idx}.quantidadeDesejada`, errosAbertura)}
                        />
                      </Field>
                    </div>
                    {itens.length > 1 && (
                      <button
                        type="button"
                        onClick={() => setItens(itens.filter((_, i) => i !== idx))}
                        className="rounded-md p-2 text-foreground/50 hover:text-primary hover:bg-foreground/5 cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/40"
                        aria-label="Remover item"
                      >
                        <Trash2 size={16} />
                      </button>
                    )}
                  </div>
                  <MensagemErro texto={errosAbertura[`itens.${idx}.produto`]} />
                  <MensagemErro texto={errosAbertura[`itens.${idx}.quantidadeDesejada`]} />
                </div>
              ))}
              <MensagemErro texto={errosAbertura.itens} />

              <button
                type="button"
                onClick={() =>
                  setItens([...itens, { produtoId: produtos[0] ? String(produtos[0].id) : '', quantidadeDesejada: '' }])
                }
                className="inline-flex items-center gap-1.5 text-xs font-medium text-primary hover:underline w-fit cursor-pointer"
              >
                <Plus size={14} aria-hidden />
                Adicionar outro item
              </button>
            </div>

            <div className="mt-4 flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
              <Button type="button" variant="ghost" size="md" onClick={fecharModalNovaCotacao}>
                Cancelar
              </Button>
              <Button type="submit" variant="primary" size="md">
                Revisar e confirmar
              </Button>
            </div>
          </form>
        ) : (
          /* Passo 4 e 5 do Fluxo Básico de RF_F7: Confirmação antes de gravar */
          <div className="flex flex-col gap-4">
            {erroGeralAbertura && (
              <div
                role="alert"
                className="rounded-lg border border-primary/30 bg-primary/10 px-3 py-2 text-xs text-primary"
              >
                {erroGeralAbertura}
              </div>
            )}
            <p className="text-sm text-foreground/80">
              Confira os dados abaixo e confirme a abertura da cotação:
            </p>
            <div className="rounded-lg border border-border-line/20 bg-foreground/5 p-3 text-sm space-y-1.5">
              <div>
                <span className="font-medium">Descrição:</span> {descricao.trim()}
              </div>
              <div>
                <span className="font-medium">Data de abertura:</span> {formatarData(dataAbertura)}
              </div>
              {dataLimite && (
                <div>
                  <span className="font-medium">Data limite:</span> {formatarData(dataLimite)}
                </div>
              )}
              <div>
                <span className="font-medium">Itens solicitados:</span>
                <ul className="mt-1 list-disc list-inside text-foreground/80 space-y-0.5">
                  {itens.map((item, idx) => {
                    const prod = produtos.find((p) => String(p.id) === item.produtoId);
                    return (
                      <li key={idx}>
                        {prod ? `${prod.nome} (${prod.unidadeMedida})` : `Produto #${item.produtoId}`} —{' '}
                        {item.quantidadeDesejada}
                      </li>
                    );
                  })}
                </ul>
              </div>
            </div>

            <div className="mt-2 flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
              <Button
                type="button"
                variant="ghost"
                size="md"
                disabled={salvandoAbertura}
                onClick={fecharModalNovaCotacao}
              >
                Cancelar operação
              </Button>
              <Button
                type="button"
                variant="outline"
                size="md"
                disabled={salvandoAbertura}
                onClick={() => setConfirmandoAbertura(false)}
              >
                Voltar e editar
              </Button>
              <Button
                type="button"
                variant="primary"
                size="md"
                disabled={salvandoAbertura}
                onClick={confirmarAberturaCotacao}
              >
                {salvandoAbertura ? 'Gravando...' : 'Confirmar abertura'}
              </Button>
            </div>
          </div>
        )}
      </Modal>

      {/* Modal RF_F8: Aprovar cotação (Gerente) */}
      <Modal open={!!avaliarAlvo} title={avaliarAlvo ? `Avaliar cotação #${avaliarAlvo.id}` : 'Avaliar cotação'} onClose={fecharModalAvaliar}>
        {avaliarAlvo && (
          <div className={`needs-validation flex flex-col gap-4 ${foiValidadoAvaliacao ? 'was-validated' : ''}`}>
            {erroGeralAvaliacao && (
              <div
                role="alert"
                className="rounded-lg border border-primary/30 bg-primary/10 px-3 py-2 text-xs text-primary"
              >
                {erroGeralAvaliacao}
              </div>
            )}

            <div className="text-sm space-y-1">
              <p className="font-medium text-foreground">{avaliarAlvo.descricao}</p>
              <p className="text-xs text-foreground/60">
                Abertura: {formatarData(avaliarAlvo.dataAbertura)}
                {avaliarAlvo.dataLimite ? ` • Limite: ${formatarData(avaliarAlvo.dataLimite)}` : ''}
                {avaliarAlvo.nomeAbertaPor ? ` • Solicitante: ${avaliarAlvo.nomeAbertaPor}` : ''}
              </p>
            </div>

            <ul className="text-sm text-foreground/70 space-y-1 border-y border-border-line/10 py-3">
              {avaliarAlvo.itens.map((i) => (
                <li key={i.id}>
                  {i.produto} — {i.quantidadeDesejada} {i.unidadeMedida}
                </li>
              ))}
            </ul>

            {!decisaoAvaliacao ? (
              <>
                <Field label="Justificativa / observações (opcional para aprovar, obrigatória para reprovar)">
                  <Textarea
                    rows={3}
                    value={justificativa}
                    onChange={(e) => {
                      setJustificativa(e.target.value);
                      if (errosAvaliacao.justificativa) {
                        setErrosAvaliacao({ ...errosAvaliacao, justificativa: '' });
                      }
                    }}
                    placeholder="Informe observações ou o motivo da reprovação..."
                    {...invalido('justificativa', errosAvaliacao)}
                  />
                  <MensagemErro id="erro-justificativa" texto={errosAvaliacao.justificativa} />
                </Field>

                <div className="mt-4 flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
                  <Button type="button" variant="ghost" size="md" onClick={fecharModalAvaliar}>
                    Cancelar
                  </Button>
                  <Button
                    type="button"
                    variant="outline"
                    size="md"
                    className="text-primary"
                    iconLeft={<XIcon size={16} />}
                    onClick={() => selecionarDecisao('REPROVADA')}
                  >
                    Reprovar
                  </Button>
                  <Button
                    type="button"
                    variant="primary"
                    size="md"
                    iconLeft={<Check size={16} />}
                    onClick={() => selecionarDecisao('APROVADA')}
                  >
                    Aprovar
                  </Button>
                </div>
              </>
            ) : (
              /* Passo 4 e 5 do Fluxo Básico de RF_F8: Confirmação antes de gravar */
              <div className="flex flex-col gap-3 rounded-lg border border-border-line/20 bg-foreground/5 p-3">
                <p className="text-sm font-medium text-foreground">
                  Confirmar {decisaoAvaliacao === 'APROVADA' ? 'APROVAÇÃO' : 'REPROVAÇÃO'} da cotação #{avaliarAlvo.id}?
                </p>
                {justificativa.trim() && (
                  <p className="text-xs text-foreground/70">
                    <span className="font-medium">Justificativa:</span> {justificativa.trim()}
                  </p>
                )}
                <div className="mt-2 flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
                  <Button
                    type="button"
                    variant="ghost"
                    size="md"
                    disabled={salvandoAvaliacao}
                    onClick={fecharModalAvaliar}
                  >
                    Cancelar operação
                  </Button>
                  <Button
                    type="button"
                    variant="outline"
                    size="md"
                    disabled={salvandoAvaliacao}
                    onClick={() => setDecisaoAvaliacao(null)}
                  >
                    Voltar
                  </Button>
                  <Button
                    type="button"
                    variant="primary"
                    size="md"
                    disabled={salvandoAvaliacao}
                    onClick={confirmarAvaliacaoCotacao}
                  >
                    {salvandoAvaliacao
                      ? 'Confirmando...'
                      : decisaoAvaliacao === 'APROVADA'
                        ? 'Confirmar aprovação'
                        : 'Confirmar reprovação'}
                  </Button>
                </div>
              </div>
            )}
          </div>
        )}
      </Modal>
    </div>
  );
}

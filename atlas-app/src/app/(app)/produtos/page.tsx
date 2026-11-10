'use client';

/**
 * View de RF_B3 (Gerenciar produtos).
 * Só mostra dados e captura o que o usuário digita. Validação, regras e gravação
 * ficam no Control (ProdutoController), acessado pela API /api/produtos.
 */

import { useEffect, useRef, useState } from 'react';
import { Plus, Pencil, Trash2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Field, Input, Select, Modal, Table, IconAction, RowActions } from '@/components/app/ui';

// formato que a API /api/produtos devolve
interface Produto {
  id: number;
  nome: string;
  categoria: string;
  unidadeMedida: string;
  numeroLote: string;
  quantidadeEstoque: number;
  estoqueMinimo: number;
  dataValidade: string | null;
}

type Erros = Record<string, string>;
type EstadoLista = 'carregando' | 'pronto' | 'erro';

const CATEGORIAS = ['Alimento', 'Material', 'Higiene', 'Outro'];
const SITUACOES_VALIDADE = [
  { valor: 'VENCIDOS', rotulo: 'Vencidos' },
  { valor: 'VENCE_EM_30_DIAS', rotulo: 'Vencem em até 30 dias' },
  { valor: 'SEM_VALIDADE', rotulo: 'Sem validade' },
];

const FORM_VAZIO = { nome: '', categoria: '', unidadeMedida: '', numeroLote: '', estoqueMinimo: '0', dataValidade: '' };
const FILTRO_VAZIO = { nome: '', categoria: '', validade: '' };

// colunas: as secundárias saem em telas estreitas para as ações não ficarem escondidas
const COLUNAS = [
  { titulo: 'Produto', classe: '' },
  { titulo: 'Categoria', classe: 'hidden sm:table-cell' },
  { titulo: 'Unidade', classe: 'hidden md:table-cell' },
  { titulo: 'Estoque mín.', classe: 'hidden md:table-cell text-right' },
  { titulo: 'Validade', classe: '' },
  { titulo: 'Ações', classe: 'text-right', oculto: true },
];

function formatarData(data: string | null) {
  if (!data) return '—';
  return new Date(data + 'T00:00:00').toLocaleDateString('pt-BR');
}

function hojeISO() {
  const agora = new Date();
  return `${agora.getFullYear()}-${String(agora.getMonth() + 1).padStart(2, '0')}-${String(agora.getDate()).padStart(2, '0')}`;
}

// máscara do lote: maiúsculas, números, "-", "/" e "."
function mascaraLote(valor: string) {
  return valor.toUpperCase().replace(/[^A-Z0-9\-/.]/g, '').slice(0, 30);
}

function MensagemErro({ id, texto }: { id?: string; texto?: string }) {
  if (!texto) return null;
  return (
    <span id={id} className="text-xs text-primary mt-1 block">
      {texto}
    </span>
  );
}

// props para marcar um campo como inválido (borda vermelha + aria-invalid)
function invalido(campo: string, erros: Erros) {
  const erro = erros[campo];
  return {
    'aria-invalid': erro ? true : undefined,
    'aria-describedby': erro ? `erro-${campo}` : undefined,
    className: erro ? 'border-primary! focus:ring-primary/30' : '',
  };
}

function montarUrlConsulta(filtro: typeof FILTRO_VAZIO) {
  const parametros = new URLSearchParams();
  if (filtro.nome.trim()) parametros.set('nome', filtro.nome.trim());
  if (filtro.categoria) parametros.set('categoria', filtro.categoria);
  if (filtro.validade) parametros.set('validade', filtro.validade);
  const texto = parametros.toString();
  return texto ? `/api/produtos?${texto}` : '/api/produtos';
}

function temFiltro(filtro: typeof FILTRO_VAZIO) {
  return filtro.nome.trim() !== '' || filtro.categoria !== '' || filtro.validade !== '';
}

function LinhaDeAviso({ children }: { children: React.ReactNode }) {
  return (
    <tr>
      <td colSpan={COLUNAS.length} className="px-4 py-10 text-center text-sm text-foreground/50">
        {children}
      </td>
    </tr>
  );
}

// esqueleto com a mesma altura das linhas reais: a tabela não pula quando os dados chegam
function LinhasCarregando() {
  return (
    <>
      {[0, 1, 2].map((i) => (
        <tr key={i} className="border-b border-border-line/10 last:border-0" aria-hidden>
          <td className="px-4 py-3">
            <div className="h-4 w-32 rounded bg-foreground/8 animate-pulse" />
            <div className="mt-1.5 h-3 w-20 rounded bg-foreground/5 animate-pulse" />
          </td>
          <td className="hidden sm:table-cell px-4 py-3">
            <div className="h-4 w-16 rounded bg-foreground/5 animate-pulse" />
          </td>
          <td className="hidden md:table-cell px-4 py-3">
            <div className="h-4 w-12 rounded bg-foreground/5 animate-pulse" />
          </td>
          <td className="hidden md:table-cell px-4 py-3">
            <div className="ml-auto h-4 w-6 rounded bg-foreground/5 animate-pulse" />
          </td>
          <td className="px-4 py-3">
            <div className="h-4 w-20 rounded bg-foreground/5 animate-pulse" />
          </td>
          <td className="px-4 py-3" />
        </tr>
      ))}
    </>
  );
}

export default function ProdutosPage() {
  const [produtos, setProdutos] = useState<Produto[]>([]);
  const [estadoLista, setEstadoLista] = useState<EstadoLista>('carregando');
  const [erroLista, setErroLista] = useState('');

  // consulta: filtro digitado x filtro aplicado
  const [filtro, setFiltro] = useState(FILTRO_VAZIO);
  const [filtroAplicado, setFiltroAplicado] = useState(FILTRO_VAZIO);

  // formulário (inclusão / alteração)
  const [modalAberto, setModalAberto] = useState(false);
  const [produtoEditando, setProdutoEditando] = useState<Produto | null>(null);
  const [form, setForm] = useState(FORM_VAZIO);
  const [erros, setErros] = useState<Erros>({});
  const [erroGeral, setErroGeral] = useState('');
  const [salvando, setSalvando] = useState(false);

  // exclusão
  const [excluindo, setExcluindo] = useState<Produto | null>(null);
  const [erroExclusao, setErroExclusao] = useState('');
  const [removendo, setRemovendo] = useState(false);

  // controle da consulta automática: espera o usuário parar de digitar e
  // ignora respostas antigas que chegarem depois de uma mais nova
  const temporizadorBusca = useRef<ReturnType<typeof setTimeout> | null>(null);
  const ultimaConsulta = useRef(0);

  async function carregarProdutos(filtroUsado = filtroAplicado) {
    const numero = ++ultimaConsulta.current;
    try {
      const resposta = await fetch(montarUrlConsulta(filtroUsado));
      const corpo = await resposta.json();
      if (numero !== ultimaConsulta.current) return;
      if (resposta.ok) {
        setProdutos(corpo);
        setEstadoLista('pronto');
      } else {
        setErroLista(corpo.erro ?? 'Não foi possível carregar os produtos.');
        setEstadoLista('erro');
      }
    } catch {
      if (numero !== ultimaConsulta.current) return;
      setErroLista('Não foi possível carregar os produtos. Verifique a conexão.');
      setEstadoLista('erro');
    }
  }

  // carrega a lista quando a tela abre
  useEffect(() => {
    const numero = ++ultimaConsulta.current;
    fetch('/api/produtos')
      .then(async (resposta) => {
        const corpo = await resposta.json();
        if (numero !== ultimaConsulta.current) return;
        if (!resposta.ok) throw new Error(corpo.erro);
        setProdutos(corpo);
        setEstadoLista('pronto');
      })
      .catch(() => {
        if (numero !== ultimaConsulta.current) return;
        setErroLista('Não foi possível carregar os produtos. Verifique a conexão.');
        setEstadoLista('erro');
      });
  }, []);

  function aplicarFiltro(novoFiltro: typeof FILTRO_VAZIO) {
    if (temporizadorBusca.current) clearTimeout(temporizadorBusca.current);
    setFiltroAplicado(novoFiltro);
    carregarProdutos(novoFiltro);
  }

  // categoria e validade: filtram assim que o usuário escolhe
  function alterarFiltroDeLista(campo: 'categoria' | 'validade', valor: string) {
    const novoFiltro = { ...filtro, [campo]: valor };
    setFiltro(novoFiltro);
    aplicarFiltro(novoFiltro);
  }

  // nome: filtra enquanto digita, com uma pequena espera entre as teclas
  function alterarFiltroNome(valor: string) {
    const novoFiltro = { ...filtro, nome: valor };
    setFiltro(novoFiltro);
    if (temporizadorBusca.current) clearTimeout(temporizadorBusca.current);
    temporizadorBusca.current = setTimeout(() => aplicarFiltro(novoFiltro), 300);
  }

  // Enter no campo de nome aplica na hora
  function consultar(e: React.FormEvent) {
    e.preventDefault();
    aplicarFiltro(filtro);
  }

  function limparFiltro() {
    setFiltro(FILTRO_VAZIO);
    aplicarFiltro(FILTRO_VAZIO);
  }

  function abrirNovo() {
    setProdutoEditando(null);
    setForm(FORM_VAZIO);
    setErros({});
    setErroGeral('');
    setModalAberto(true);
  }

  function abrirEdicao(produto: Produto) {
    setProdutoEditando(produto);
    setForm({
      nome: produto.nome,
      categoria: produto.categoria,
      unidadeMedida: produto.unidadeMedida,
      numeroLote: produto.numeroLote ?? '',
      estoqueMinimo: String(produto.estoqueMinimo),
      dataValidade: produto.dataValidade ?? '',
    });
    setErros({});
    setErroGeral('');
    setModalAberto(true);
  }

  // ao digitar num campo com erro, tira o destaque dele
  function alterarCampo(campo: keyof typeof FORM_VAZIO, valor: string) {
    setForm({ ...form, [campo]: valor });
    if (erros[campo]) {
      const resto = { ...erros };
      delete resto[campo];
      setErros(resto);
    }
  }

  async function salvar(e: React.FormEvent) {
    e.preventDefault();
    if (salvando) return;

    // se está editando usa PUT, se é novo usa POST
    const url = produtoEditando ? `/api/produtos/${produtoEditando.id}` : '/api/produtos';
    const metodo = produtoEditando ? 'PUT' : 'POST';

    setSalvando(true);
    try {
      const resposta = await fetch(url, {
        method: metodo,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(form),
      });

      if (resposta.ok) {
        setModalAberto(false);
        carregarProdutos();
        return;
      }

      const corpo = await resposta.json();
      setErros(corpo.erros ?? {});
      setErroGeral(corpo.erros ? '' : corpo.erro);
    } catch {
      setErroGeral('Não foi possível salvar. Verifique a conexão e tente de novo.');
    } finally {
      setSalvando(false);
    }
  }

  async function confirmarExclusao() {
    if (!excluindo || removendo) return;
    setRemovendo(true);
    try {
      const resposta = await fetch(`/api/produtos/${excluindo.id}`, { method: 'DELETE' });
      if (!resposta.ok) {
        // ex.: produto que já tem movimentação no estoque não pode ser excluído
        const corpo = await resposta.json();
        setErroExclusao(corpo.erro);
        return;
      }
      setExcluindo(null);
      carregarProdutos();
    } catch {
      setErroExclusao('Não foi possível excluir. Verifique a conexão e tente de novo.');
    } finally {
      setRemovendo(false);
    }
  }

  const hoje = hojeISO();
  const filtroAtivo = temFiltro(filtro);

  return (
    <div className="flex flex-col gap-6">
      {/* Barra: filtros à esquerda, ação principal à direita */}
      <div className="flex flex-col gap-4 lg:flex-row lg:items-end">
        <form
          onSubmit={consultar}
          role="search"
          aria-label="Filtrar produtos"
          className="grid flex-1 grid-cols-2 items-end gap-3 sm:grid-cols-[minmax(0,1fr)_10rem_13rem_auto]"
        >
          <div className="col-span-2 sm:col-span-1">
            <Field label="Nome">
              <Input
                type="search"
                placeholder="Buscar pelo nome"
                value={filtro.nome}
                maxLength={120}
                onChange={(e) => alterarFiltroNome(e.target.value)}
                className="h-10"
              />
            </Field>
          </div>
          <Field label="Categoria">
            <Select
              value={filtro.categoria}
              onChange={(e) => alterarFiltroDeLista('categoria', e.target.value)}
              className="h-10"
            >
              <option value="">Todas</option>
              {CATEGORIAS.map((c) => (
                <option key={c}>{c}</option>
              ))}
            </Select>
          </Field>
          <Field label="Validade">
            <Select
              value={filtro.validade}
              onChange={(e) => alterarFiltroDeLista('validade', e.target.value)}
              className="h-10"
            >
              <option value="">Todas</option>
              {SITUACOES_VALIDADE.map((s) => (
                <option key={s.valor} value={s.valor}>
                  {s.rotulo}
                </option>
              ))}
            </Select>
          </Field>
          <Button
            type="button"
            variant="ghost"
            size="md"
            onClick={limparFiltro}
            disabled={!filtroAtivo}
            className={`col-span-2 h-10 justify-self-start text-sm sm:col-span-1 ${filtroAtivo ? '' : 'max-sm:hidden'}`}
          >
            Limpar filtros
          </Button>
        </form>
        <Button
          variant="primary"
          size="md"
          onClick={abrirNovo}
          iconLeft={<Plus size={16} />}
          className="h-10 text-sm lg:shrink-0"
        >
          Novo produto
        </Button>
      </div>

      <Table>
        <thead>
          <tr className="border-b border-border-line/20 bg-foreground/[0.02] text-left text-xs font-semibold uppercase tracking-wide text-foreground/50">
            {COLUNAS.map((c) => (
              <th key={c.titulo} scope="col" className={`px-4 py-3 whitespace-nowrap ${c.classe}`}>
                {c.oculto ? <span className="sr-only">{c.titulo}</span> : c.titulo}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {estadoLista === 'carregando' && <LinhasCarregando />}

          {estadoLista === 'erro' && (
            <LinhaDeAviso>
              <span className="block">{erroLista}</span>
              <Button
                variant="outline"
                size="sm"
                className="mt-3"
                onClick={() => {
                  setEstadoLista('carregando');
                  carregarProdutos();
                }}
              >
                Tentar de novo
              </Button>
            </LinhaDeAviso>
          )}

          {estadoLista === 'pronto' && produtos.length === 0 && (
            <LinhaDeAviso>
              {temFiltro(filtroAplicado) ? (
                <>
                  Nenhum produto com esses filtros.{' '}
                  <button
                    type="button"
                    onClick={limparFiltro}
                    className="font-medium text-foreground underline underline-offset-2 cursor-pointer hover:text-primary"
                  >
                    Limpar filtros
                  </button>
                </>
              ) : (
                'Nenhum produto cadastrado ainda.'
              )}
            </LinhaDeAviso>
          )}

          {estadoLista === 'pronto' &&
            produtos.map((p) => {
              const vencido = p.dataValidade !== null && p.dataValidade < hoje;
              return (
                <tr key={p.id} className="border-b border-border-line/10 last:border-0">
                  <td className="px-4 py-3">
                    <span className="block font-medium">{p.nome}</span>
                    <span className="block text-xs text-foreground/50 tabular-nums">Lote {p.numeroLote || '—'}</span>
                  </td>
                  <td className="hidden sm:table-cell px-4 py-3 text-foreground/70">{p.categoria}</td>
                  <td className="hidden md:table-cell px-4 py-3 text-foreground/70">{p.unidadeMedida}</td>
                  <td className="hidden md:table-cell px-4 py-3 text-right tabular-nums">{p.estoqueMinimo}</td>
                  <td className="px-4 py-3 whitespace-nowrap tabular-nums">
                    {vencido ? (
                      <span className="text-primary">
                        {formatarData(p.dataValidade)}
                        <span className="block text-xs">vencido</span>
                      </span>
                    ) : (
                      <span className="text-foreground/70">{formatarData(p.dataValidade)}</span>
                    )}
                  </td>
                  <td className="px-2 py-2 sm:px-4">
                    <RowActions>
                      <IconAction label={`Editar ${p.nome}`} onClick={() => abrirEdicao(p)}>
                        <Pencil size={16} />
                      </IconAction>
                      <IconAction
                        label={`Excluir ${p.nome}`}
                        danger
                        onClick={() => {
                          setErroExclusao('');
                          setExcluindo(p);
                        }}
                      >
                        <Trash2 size={16} />
                      </IconAction>
                    </RowActions>
                  </td>
                </tr>
              );
            })}
        </tbody>
      </Table>

      {/* Modal de cadastro / edição */}
      <Modal
        open={modalAberto}
        title={produtoEditando ? 'Editar produto' : 'Novo produto'}
        onClose={() => setModalAberto(false)}
      >
        {/* noValidate: quem valida é o Model; a tela só destaca o que voltou com erro */}
        <form onSubmit={salvar} noValidate className="flex flex-col gap-4">
          <p className="text-xs text-foreground/50">
            Campos com <span className="text-primary font-semibold">*</span> são obrigatórios.
          </p>
          <div>
            <Field label="Nome do produto *">
              <Input
                value={form.nome}
                maxLength={120}
                required
                onChange={(e) => alterarCampo('nome', e.target.value)}
                {...invalido('nome', erros)}
              />
            </Field>
            <MensagemErro id="erro-nome" texto={erros.nome} />
          </div>
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <div>
              <Field label="Categoria *">
                <Select
                  value={form.categoria}
                  required
                  onChange={(e) => alterarCampo('categoria', e.target.value)}
                  {...invalido('categoria', erros)}
                >
                  <option value="" disabled>
                    Selecione...
                  </option>
                  {CATEGORIAS.map((c) => (
                    <option key={c}>{c}</option>
                  ))}
                </Select>
              </Field>
              <MensagemErro id="erro-categoria" texto={erros.categoria} />
            </div>
            <div>
              <Field label="Unidade de medida *">
                <Input
                  placeholder="ex: pacote, kg, litro"
                  value={form.unidadeMedida}
                  maxLength={30}
                  required
                  onChange={(e) => alterarCampo('unidadeMedida', e.target.value)}
                  {...invalido('unidadeMedida', erros)}
                />
              </Field>
              <MensagemErro id="erro-unidadeMedida" texto={erros.unidadeMedida} />
            </div>
          </div>
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <div>
              <Field label="Nº do lote *">
                <Input
                  placeholder="ex: ARZ-2027-01"
                  value={form.numeroLote}
                  required
                  onChange={(e) => alterarCampo('numeroLote', mascaraLote(e.target.value))}
                  {...invalido('numeroLote', erros)}
                />
              </Field>
              <MensagemErro id="erro-numeroLote" texto={erros.numeroLote} />
            </div>
            <div>
              <Field label="Estoque mínimo *">
                <Input
                  inputMode="numeric"
                  value={form.estoqueMinimo}
                  required
                  onChange={(e) => alterarCampo('estoqueMinimo', e.target.value.replace(/\D/g, '').slice(0, 6))}
                  {...invalido('estoqueMinimo', erros)}
                />
              </Field>
              <MensagemErro id="erro-estoqueMinimo" texto={erros.estoqueMinimo} />
            </div>
          </div>
          <div>
            <Field label="Data de validade (opcional)">
              <Input
                type="date"
                min={hoje}
                value={form.dataValidade}
                onChange={(e) => alterarCampo('dataValidade', e.target.value)}
                {...invalido('dataValidade', erros)}
              />
            </Field>
            <MensagemErro id="erro-dataValidade" texto={erros.dataValidade} />
          </div>
          <MensagemErro texto={erroGeral} />
          <div className="mt-4 flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
            <Button type="button" variant="ghost" size="md" className="text-sm" onClick={() => setModalAberto(false)}>
              Cancelar
            </Button>
            <Button type="submit" variant="primary" size="md" className="text-sm" isLoading={salvando}>
              {produtoEditando ? 'Salvar alterações' : 'Cadastrar'}
            </Button>
          </div>
        </form>
      </Modal>

      {/* Confirmação de exclusão */}
      <Modal open={excluindo !== null} title="Excluir produto" onClose={() => setExcluindo(null)}>
        <p className="text-sm text-foreground/70">
          <strong className="font-medium text-foreground">{excluindo?.nome}</strong> sai do cadastro de vez. Essa ação
          não pode ser desfeita.
        </p>
        <MensagemErro texto={erroExclusao} />
        <div className="mt-8 flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
          <Button variant="ghost" size="md" className="text-sm" onClick={() => setExcluindo(null)}>
            Cancelar
          </Button>
          <Button variant="danger" size="md" className="text-sm" onClick={confirmarExclusao} isLoading={removendo}>
            Excluir
          </Button>
        </div>
      </Modal>
    </div>
  );
}

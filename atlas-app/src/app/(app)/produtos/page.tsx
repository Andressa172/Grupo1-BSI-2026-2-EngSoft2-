'use client';

/**
 * View de RF_B3 (Gerenciar produtos).
 * Só mostra dados e captura o que o usuário digita. Validação, regras e gravação
 * ficam no Control (ProdutoController), acessado pela API /api/produtos.
 */

import { useEffect, useRef, useState } from 'react';
import { Plus, Pencil, Trash2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Field, Input, Select, Modal, Table, THead, EmptyRow } from '@/components/app/ui';

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

const CATEGORIAS = ['Alimento', 'Material', 'Higiene', 'Outro'];
const SITUACOES_VALIDADE = [
  { valor: 'VENCIDOS', rotulo: 'Vencidos' },
  { valor: 'VENCE_EM_30_DIAS', rotulo: 'Vencem em até 30 dias' },
  { valor: 'SEM_VALIDADE', rotulo: 'Sem validade' },
];

const FORM_VAZIO = { nome: '', categoria: '', unidadeMedida: '', numeroLote: '', estoqueMinimo: '0', dataValidade: '' };
const FILTRO_VAZIO = { nome: '', categoria: '', validade: '' };

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

export default function ProdutosPage() {
  const [produtos, setProdutos] = useState<Produto[]>([]);

  // consulta: filtro digitado x filtro aplicado ao clicar em Consultar
  const [filtro, setFiltro] = useState(FILTRO_VAZIO);
  const [filtroAplicado, setFiltroAplicado] = useState(FILTRO_VAZIO);
  const [erroConsulta, setErroConsulta] = useState('');

  // formulário (inclusão / alteração)
  const [modalAberto, setModalAberto] = useState(false);
  const [produtoEditando, setProdutoEditando] = useState<Produto | null>(null);
  const [form, setForm] = useState(FORM_VAZIO);
  const [erros, setErros] = useState<Erros>({});
  const [erroGeral, setErroGeral] = useState('');

  // exclusão
  const [excluindo, setExcluindo] = useState<Produto | null>(null);
  const [erroExclusao, setErroExclusao] = useState('');

  // controle da consulta automática: espera o usuário parar de digitar e
  // ignora respostas antigas que chegarem depois de uma mais nova
  const temporizadorBusca = useRef<ReturnType<typeof setTimeout> | null>(null);
  const ultimaConsulta = useRef(0);

  async function carregarProdutos(filtroUsado = filtroAplicado) {
    const numero = ++ultimaConsulta.current;
    const resposta = await fetch(montarUrlConsulta(filtroUsado));
    const corpo = await resposta.json();
    if (numero !== ultimaConsulta.current) return;
    if (resposta.ok) {
      setProdutos(corpo);
      setErroConsulta('');
    } else {
      setErroConsulta(corpo.erro);
    }
  }

  // carrega a lista quando a tela abre
  useEffect(() => {
    fetch('/api/produtos')
      .then((resposta) => resposta.json())
      .then((dados) => setProdutos(dados));
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

  // Enter ou botão Consultar: aplica na hora
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

    // se está editando usa PUT, se é novo usa POST
    const url = produtoEditando ? `/api/produtos/${produtoEditando.id}` : '/api/produtos';
    const metodo = produtoEditando ? 'PUT' : 'POST';

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
  }

  async function confirmarExclusao() {
    if (!excluindo) return;
    const resposta = await fetch(`/api/produtos/${excluindo.id}`, { method: 'DELETE' });
    if (!resposta.ok) {
      // ex.: produto que já tem movimentação no estoque não pode ser excluído
      const corpo = await resposta.json();
      setErroExclusao(corpo.erro);
      return;
    }
    setExcluindo(null);
    carregarProdutos();
  }

  return (
    <div className="flex flex-col gap-6">
      <div className="flex items-center justify-end">
        <Button variant="primary" size="md" onClick={abrirNovo} iconLeft={<Plus size={16} />}>
          Novo Produto
        </Button>
      </div>

      {/* Consulta (3 filtros: nome, categoria e situação da validade) */}
      <form onSubmit={consultar} className="flex flex-wrap items-end gap-3">
        <div className="min-w-52 flex-1">
          <Field label="Nome">
            <Input
              placeholder="Buscar pelo nome"
              value={filtro.nome}
              maxLength={120}
              onChange={(e) => alterarFiltroNome(e.target.value)}
            />
          </Field>
        </div>
        <div className="w-40">
          <Field label="Categoria">
            <Select value={filtro.categoria} onChange={(e) => alterarFiltroDeLista('categoria', e.target.value)}>
              <option value="">Todas</option>
              {CATEGORIAS.map((c) => (
                <option key={c}>{c}</option>
              ))}
            </Select>
          </Field>
        </div>
        <div className="w-52">
          <Field label="Validade">
            <Select value={filtro.validade} onChange={(e) => alterarFiltroDeLista('validade', e.target.value)}>
              <option value="">Todas</option>
              {SITUACOES_VALIDADE.map((s) => (
                <option key={s.valor} value={s.valor}>
                  {s.rotulo}
                </option>
              ))}
            </Select>
          </Field>
        </div>
        <div className="flex gap-2">
          <Button type="submit" variant="primary" size="md">
            Consultar
          </Button>
          <Button type="button" variant="outline" size="md" onClick={limparFiltro}>
            Limpar
          </Button>
        </div>
      </form>
      <MensagemErro texto={erroConsulta} />

      <Table>
        <THead cols={['Produto', 'Categoria', 'Lote', 'Unidade', 'Estoque mínimo', 'Validade', '']} />
        <tbody>
          {produtos.length === 0 && <EmptyRow colSpan={7} label="Nenhum produto encontrado." />}
          {produtos.map((p) => (
            <tr key={p.id} className="border-b border-border-line/10 last:border-0">
              <td className="px-4 py-3 font-medium">{p.nome}</td>
              <td className="px-4 py-3 text-foreground/60">{p.categoria}</td>
              <td className="px-4 py-3 text-foreground/60 whitespace-nowrap">{p.numeroLote || '—'}</td>
              <td className="px-4 py-3 text-foreground/60">{p.unidadeMedida}</td>
              <td className="px-4 py-3">{p.estoqueMinimo}</td>
              <td className="px-4 py-3 text-foreground/60 whitespace-nowrap">{formatarData(p.dataValidade)}</td>
              <td className="px-4 py-3">
                <div className="flex justify-end gap-2">
                  <Button variant="outline" size="sm" onClick={() => abrirEdicao(p)} iconLeft={<Pencil size={14} />}>
                    Editar
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => {
                      setErroExclusao('');
                      setExcluindo(p);
                    }}
                    iconLeft={<Trash2 size={14} />}
                  >
                    Excluir
                  </Button>
                </div>
              </td>
            </tr>
          ))}
        </tbody>
      </Table>

      {/* Modal de cadastro / edição */}
      <Modal
        open={modalAberto}
        title={produtoEditando ? 'Editar Produto' : 'Cadastrar Produto'}
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
          <div className="grid grid-cols-2 gap-4">
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
          <div className="grid grid-cols-2 gap-4">
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
                min={hojeISO()}
                value={form.dataValidade}
                onChange={(e) => alterarCampo('dataValidade', e.target.value)}
                {...invalido('dataValidade', erros)}
              />
            </Field>
            <MensagemErro id="erro-dataValidade" texto={erros.dataValidade} />
          </div>
          <MensagemErro texto={erroGeral} />
          <Button type="submit" variant="primary" size="md" className="w-full mt-2">
            {produtoEditando ? 'Salvar alterações' : 'Cadastrar'}
          </Button>
        </form>
      </Modal>

      {/* Confirmação de exclusão */}
      <Modal open={excluindo !== null} title="Excluir produto" onClose={() => setExcluindo(null)}>
        <p className="text-sm text-foreground/70 mb-5">
          Tem certeza que deseja excluir <strong>{excluindo?.nome}</strong>? Essa ação não pode ser desfeita.
        </p>
        <MensagemErro texto={erroExclusao} />
        <div className="flex gap-2 justify-end mt-4">
          <Button variant="outline" size="md" onClick={() => setExcluindo(null)}>
            Cancelar
          </Button>
          <Button variant="danger" size="md" onClick={confirmarExclusao}>
            Excluir
          </Button>
        </div>
      </Modal>
    </div>
  );
}

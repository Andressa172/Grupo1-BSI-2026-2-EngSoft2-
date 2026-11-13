'use client';

/**
 * Tela de Doadores (RF_B4 - Gerenciar Doadores)
 * Ela conversa APENAS com a API (/api/doadores), que chama o Control (DoadorController) no
 * servidor. Validação, regras e gravação no banco ficam do lado do servidor (Control -> Model -> DAO).
 */

import { useCallback, useEffect, useState } from 'react';
import { Plus, Pencil, Trash2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Field, Input, Select, Modal, Table, THead, EmptyRow, LoadingRows, IconAction, RowActions } from '@/components/app/ui';
import { mascaraCpfCnpj, mascaraNome, mascaraTelefone } from '@/view/mascaras';

type TipoPessoa = 'FISICA' | 'JURIDICA';

interface Doador {
  id: number;
  nome: string;
  telefone: string | null;
  email: string | null;
  cpfCnpj: string | null;
  tipoPessoa: TipoPessoa;
  anonimo: boolean;
}

interface FormDoador {
  nome: string;
  telefone: string;
  email: string;
  cpfCnpj: string;
  tipoPessoa: TipoPessoa;
  anonimo: boolean;
}

interface DadosFiltroDoador {
  nome: string;
  tipoPessoa: string;
  anonimo: string; // '' | 'sim' | 'nao'
}

const FORM_VAZIO: FormDoador = { nome: '', telefone: '', email: '', cpfCnpj: '', tipoPessoa: 'FISICA', anonimo: false };
const FILTRO_VAZIO: DadosFiltroDoador = { nome: '', tipoPessoa: '', anonimo: '' };

// colunas secundárias somem em telas estreitas para as ações continuarem visíveis
const COLUNAS = [
  'Nome',
  { label: 'Tipo', className: 'hidden sm:table-cell' },
  { label: 'CPF/CNPJ', className: 'hidden md:table-cell' },
  { label: 'Contato', className: 'hidden lg:table-cell' },
  { label: 'Ações', className: 'text-right', srOnly: true },
];

function montarParametros(f: DadosFiltroDoador): string {
  const parametros = new URLSearchParams();
  (Object.keys(f) as (keyof DadosFiltroDoador)[]).forEach((chave) => {
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

export default function DoadoresPage() {
  const [doadores, setDoadores] = useState<Doador[]>([]);
  const [estado, setEstado] = useState<'carregando' | 'pronto' | 'erro'>('carregando');
  const [erroCarga, setErroCarga] = useState('');

  // consulta: filtro digitado x filtro aplicado ao clicar em Consultar (3 critérios: nome, tipo, anônimo)
  const [filtro, setFiltro] = useState<DadosFiltroDoador>(FILTRO_VAZIO);
  const [filtroAplicado, setFiltroAplicado] = useState<DadosFiltroDoador>(FILTRO_VAZIO);
  const [errosFiltro, setErrosFiltro] = useState<Record<string, string>>({});

  // formulário (inclusão / alteração)
  const [modalAberto, setModalAberto] = useState(false);
  const [doadorEditando, setDoadorEditando] = useState<Doador | null>(null);
  const [form, setForm] = useState(FORM_VAZIO);
  const [erros, setErros] = useState<Record<string, string>>({});
  const [salvando, setSalvando] = useState(false);

  const carregar = useCallback(async (f: DadosFiltroDoador): Promise<Record<string, string>> => {
    try {
      const resposta = await fetch(`/api/doadores?${montarParametros(f)}`);
      if (!resposta.ok) return await lerErros(resposta);
      setDoadores(await resposta.json());
      setEstado('pronto');
      setErroCarga('');
      return {};
    } catch {
      setEstado('erro');
      setErroCarga('Não foi possível carregar os doadores. Confira se o banco de dados está no ar.');
      return {};
    }
  }, []);

  // carrega a lista quando a tela abre (e depois só quando o filtro aplicado muda)
  useEffect(() => {
    let cancelado = false;
    fetch(`/api/doadores?${montarParametros(filtroAplicado)}`)
      .then(async (resposta) => {
        if (!resposta.ok) throw new Error('falha');
        const dados = await resposta.json();
        if (cancelado) return;
        setDoadores(dados);
        setEstado('pronto');
        setErroCarga('');
      })
      .catch(() => {
        if (!cancelado) {
          setEstado('erro');
          setErroCarga('Não foi possível carregar os doadores. Confira se o banco de dados está no ar.');
        }
      });
    return () => {
      cancelado = true;
    };
  }, [filtroAplicado]);

  async function consultar(e: React.FormEvent) {
    e.preventDefault();
    // o servidor valida o filtro; se houver erro, mostra ao lado do campo
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
    setDoadorEditando(null);
    setForm(FORM_VAZIO);
    setErros({});
    setModalAberto(true);
  }

  function abrirEdicao(doador: Doador) {
    setDoadorEditando(doador);
    setForm({
      nome: doador.nome,
      telefone: doador.telefone ?? '',
      email: doador.email ?? '',
      cpfCnpj: doador.cpfCnpj ?? '',
      tipoPessoa: doador.tipoPessoa,
      anonimo: doador.anonimo,
    });
    setErros({});
    setModalAberto(true);
  }

  async function salvar(e: React.FormEvent) {
    e.preventDefault();
    setSalvando(true);
    try {
      const url = doadorEditando ? `/api/doadores/${doadorEditando.id}` : '/api/doadores';
      const metodo = doadorEditando ? 'PUT' : 'POST';

      const resposta = await fetch(url, {
        method: metodo,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(form),
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

  async function excluir(doador: Doador) {
    if (!confirm(`Deseja excluir o doador "${doador.anonimo ? 'Doador anônimo' : doador.nome}"?`)) return;
    const resposta = await fetch(`/api/doadores/${doador.id}`, { method: 'DELETE' });
    if (!resposta.ok) {
      const corpo = await resposta.json().catch(() => ({}));
      alert(corpo.erro ?? 'Não foi possível excluir o doador.');
      return;
    }
    await carregar(filtroAplicado);
  }

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-col sm:flex-row sm:justify-end">
        <Button variant="primary" size="md" onClick={abrirNovo} iconLeft={<Plus size={16} />}>
          Novo doador
        </Button>
      </div>

      <form onSubmit={consultar} className="grid grid-cols-2 gap-3 sm:flex sm:flex-wrap sm:items-start">
        <div className="col-span-2 min-w-52 flex-1">
          <Field label="Nome">
            <Input
              value={filtro.nome}
              onChange={(e) => setFiltro({ ...filtro, nome: mascaraNome(e.target.value) })}
              placeholder="Buscar por nome"
            />
          </Field>
        </div>
        <div className="col-span-2 sm:w-44">
          <Field label="Tipo de pessoa">
            <Select value={filtro.tipoPessoa} onChange={(e) => setFiltro({ ...filtro, tipoPessoa: e.target.value })}>
              <option value="">Todos</option>
              <option value="FISICA">Pessoa física</option>
              <option value="JURIDICA">Pessoa jurídica</option>
            </Select>
          </Field>
        </div>
        <div className="col-span-2 sm:w-36">
          <Field label="Anônimo">
            <Select value={filtro.anonimo} onChange={(e) => setFiltro({ ...filtro, anonimo: e.target.value })}>
              <option value="">Todos</option>
              <option value="sim">Sim</option>
              <option value="nao">Não</option>
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
        {errosFiltro.geral && <MensagemErro texto={errosFiltro.geral} />}
      </form>

      {erroCarga && <p className="text-sm text-primary">{erroCarga}</p>}

      <Table>
        <THead cols={COLUNAS} />
        <tbody>
          {estado === 'carregando' && <LoadingRows colSpan={COLUNAS.length} />}
          {estado === 'pronto' && doadores.length === 0 && (
            <EmptyRow colSpan={COLUNAS.length} label="Nenhum doador encontrado." />
          )}
          {estado === 'pronto' &&
            doadores.map((d) => (
              <tr key={d.id} className="border-b border-border-line/10 last:border-0">
                <td className="px-4 py-3 font-medium">
                  {d.anonimo ? <span className="italic text-foreground/50">Doador anônimo</span> : d.nome}
                </td>
                <td className="hidden sm:table-cell px-4 py-3 text-foreground/70">
                  {d.tipoPessoa === 'FISICA' ? 'Pessoa física' : 'Pessoa jurídica'}
                </td>
                <td className="hidden md:table-cell px-4 py-3 text-foreground/70 whitespace-nowrap">
                  {d.cpfCnpj ? mascaraCpfCnpj(d.cpfCnpj) : '—'}
                </td>
                <td className="hidden lg:table-cell px-4 py-3 text-foreground/70">
                  {[d.telefone, d.email].filter(Boolean).join(' · ') || '—'}
                </td>
                <td className="px-2 py-2 sm:px-4">
                  <RowActions>
                    <IconAction label={`Editar ${d.anonimo ? 'doador anônimo' : d.nome}`} onClick={() => abrirEdicao(d)}>
                      <Pencil size={16} />
                    </IconAction>
                    <IconAction label={`Excluir ${d.anonimo ? 'doador anônimo' : d.nome}`} danger onClick={() => excluir(d)}>
                      <Trash2 size={16} />
                    </IconAction>
                  </RowActions>
                </td>
              </tr>
            ))}
        </tbody>
      </Table>

      <Modal open={modalAberto} title={doadorEditando ? 'Editar doador' : 'Novo doador'} onClose={() => setModalAberto(false)}>
        <form onSubmit={salvar} className="flex flex-col gap-4">
          <label className="flex items-center gap-2 text-sm">
            <input
              type="checkbox"
              checked={form.anonimo}
              onChange={(e) => setForm({ ...form, anonimo: e.target.checked })}
              className="h-4 w-4 accent-primary"
            />
            Doador anônimo
          </label>

          {!form.anonimo && (
            <>
              <div>
                <Field label="Nome do doador *">
                  <Input
                    value={form.nome}
                    onChange={(e) => setForm({ ...form, nome: mascaraNome(e.target.value) })}
                    className={destaque(erros.nome)}
                  />
                </Field>
                <MensagemErro texto={erros.nome} />
              </div>
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                <Field label="Tipo de pessoa">
                  <Select
                    value={form.tipoPessoa}
                    onChange={(e) => setForm({ ...form, tipoPessoa: e.target.value as TipoPessoa, cpfCnpj: '' })}
                  >
                    <option value="FISICA">Pessoa física</option>
                    <option value="JURIDICA">Pessoa jurídica</option>
                  </Select>
                </Field>
                <div>
                  <Field label={form.tipoPessoa === 'JURIDICA' ? 'CNPJ *' : 'CPF *'}>
                    <Input
                      value={form.cpfCnpj}
                      onChange={(e) => setForm({ ...form, cpfCnpj: mascaraCpfCnpj(e.target.value) })}
                      className={destaque(erros.cpfCnpj)}
                      placeholder={form.tipoPessoa === 'JURIDICA' ? '00.000.000/0000-00' : '000.000.000-00'}
                    />
                  </Field>
                  <MensagemErro texto={erros.cpfCnpj} />
                </div>
              </div>
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                <div>
                  <Field label="Telefone *">
                    <Input
                      value={form.telefone}
                      onChange={(e) => setForm({ ...form, telefone: mascaraTelefone(e.target.value) })}
                      className={destaque(erros.telefone)}
                      placeholder="(00) 00000-0000"
                    />
                  </Field>
                  <MensagemErro texto={erros.telefone} />
                </div>
                <div>
                  <Field label="E-mail *">
                    <Input
                      type="email"
                      value={form.email}
                      onChange={(e) => setForm({ ...form, email: e.target.value })}
                      className={destaque(erros.email)}
                      placeholder="nome@exemplo.com"
                    />
                  </Field>
                  <MensagemErro texto={erros.email} />
                </div>
              </div>
            </>
          )}

          <MensagemErro texto={erros.geral} />
          <div className="mt-4 flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
            <Button type="button" variant="ghost" size="md" onClick={() => setModalAberto(false)}>
              Cancelar
            </Button>
            <Button type="submit" variant="primary" size="md" isLoading={salvando}>
              {doadorEditando ? 'Salvar alterações' : 'Cadastrar'}
            </Button>
          </div>
        </form>
      </Modal>
    </div>
  );
}

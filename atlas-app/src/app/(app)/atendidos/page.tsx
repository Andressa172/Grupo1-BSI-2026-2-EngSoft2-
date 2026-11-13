'use client';

/**
 * View de RF_B1 (Gerenciar atendidos).
 * Esta tela só mostra dados e captura o que o funcionário digita. Ela conversa APENAS com a API
 * (/api/atendidos), que chama o Control (GerenciarAtendidosController) no servidor.
 * Validação, regras e gravação no banco ficam do lado do servidor (Control -> Model -> DAO).
 */

import { useCallback, useEffect, useState } from 'react';
import { Pencil, Plus, Trash2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Field, Input, Select, Modal, Table, THead, EmptyRow, IconAction, RowActions } from '@/components/app/ui';
import { mascaraNome } from '@/view/mascaras';
import { CampoData } from '@/view/CampoData';

const SEXOS = ['Feminino', 'Masculino'];

interface DadosAtendido {
  nome: string;
  dataNascimento: string; // dd/mm/aaaa (como o funcionário digita)
  sexo: string;
  responsavelLegal: string;
}
interface DadosFiltroAtendido {
  nome: string;
  sexo: string;
  idadeMinima: string;
  idadeMaxima: string;
}
// o que a API devolve (datas em aaaa-mm-dd)
interface AtendidoApi {
  id: number;
  nome: string;
  dataNascimento: string;
  idade: number;
  sexo: string;
  responsavelLegal: string;
  dataCadastro: string;
}
interface LinhaAtendido extends Omit<AtendidoApi, 'id'> {
  id: string;
}

const formVazio: DadosAtendido = { nome: '', dataNascimento: '', sexo: '', responsavelLegal: '' };
const filtroVazio: DadosFiltroAtendido = { nome: '', sexo: '', idadeMinima: '', idadeMaxima: '' };

// aaaa-mm-dd (banco) -> dd/mm/aaaa (tela)
function paraBR(iso: string): string {
  const [a, m, d] = iso.slice(0, 10).split('-');
  return a && m && d ? `${d}/${m}/${a}` : iso;
}

function montarParametros(f: DadosFiltroAtendido): string {
  const parametros = new URLSearchParams();
  (Object.keys(f) as (keyof DadosFiltroAtendido)[]).forEach((chave) => {
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

// colunas secundárias somem em telas estreitas para as ações continuarem visíveis
const COLUNAS = [
  'Nome',
  { label: 'Nascimento', className: 'hidden md:table-cell' },
  { label: 'Idade', className: 'text-right' },
  { label: 'Sexo', className: 'hidden sm:table-cell' },
  { label: 'Responsável legal', className: 'hidden lg:table-cell' },
  { label: 'Cadastro', className: 'hidden lg:table-cell' },
  { label: 'Ações', className: 'text-right', srOnly: true },
];

export default function AtendidosPage() {
  const [linhas, setLinhas] = useState<LinhaAtendido[]>([]);
  const [erroCarga, setErroCarga] = useState('');

  // consulta: filtro digitado x filtro aplicado ao clicar em Consultar
  const [filtro, setFiltro] = useState<DadosFiltroAtendido>(filtroVazio);
  const [filtroAplicado, setFiltroAplicado] = useState<DadosFiltroAtendido>(filtroVazio);
  const [errosFiltro, setErrosFiltro] = useState<Record<string, string>>({});

  // formulário (inclusão / alteração)
  const [modalOpen, setModalOpen] = useState(false);
  const [editandoId, setEditandoId] = useState<string | null>(null);
  const [form, setForm] = useState<DadosAtendido>(formVazio);
  const [erros, setErros] = useState<Record<string, string>>({});
  const [salvando, setSalvando] = useState(false);

  // exclusão
  const [excluindo, setExcluindo] = useState<LinhaAtendido | null>(null);

  const carregar = useCallback(async (f: DadosFiltroAtendido): Promise<Record<string, string>> => {
    try {
      const resposta = await fetch(`/api/atendidos?${montarParametros(f)}`);
      if (!resposta.ok) return await lerErros(resposta);
      const dados = (await resposta.json()) as AtendidoApi[];
      setLinhas(dados.map((a) => ({ ...a, id: String(a.id) })));
      setErroCarga('');
      return {};
    } catch {
      setErroCarga('Não foi possível carregar os atendidos. Confira se o banco de dados está no ar.');
      return {};
    }
  }, []);

  // carrega a lista quando a tela abre (e depois só quando o filtro aplicado muda)
  useEffect(() => {
    let cancelado = false;
    fetch('/api/atendidos?' + montarParametros(filtroAplicado))
      .then(async (resposta) => {
        if (!resposta.ok) throw new Error('falha');
        const dados = (await resposta.json()) as AtendidoApi[];
        if (cancelado) return;
        setLinhas(dados.map((a) => ({ ...a, id: String(a.id) })));
        setErroCarga('');
      })
      .catch(() => {
        if (!cancelado) setErroCarga('Não foi possível carregar os atendidos. Confira se o banco de dados está no ar.');
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
    setFiltro(filtroVazio);
    setFiltroAplicado(filtroVazio);
    setErrosFiltro({});
  }

  function abrirNovo() {
    setEditandoId(null);
    setForm(formVazio);
    setErros({});
    setModalOpen(true);
  }

  function abrirEdicao(a: LinhaAtendido) {
    setEditandoId(a.id);
    setForm({ nome: a.nome, dataNascimento: paraBR(a.dataNascimento), sexo: a.sexo, responsavelLegal: a.responsavelLegal });
    setErros({});
    setModalOpen(true);
  }

  async function salvar(e: React.FormEvent) {
    e.preventDefault();
    setSalvando(true);
    try {
      const resposta = await fetch(editandoId ? `/api/atendidos/${editandoId}` : '/api/atendidos', {
        method: editandoId ? 'PUT' : 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(form),
      });
      if (!resposta.ok) {
        setErros(await lerErros(resposta));
        return;
      }
      setErros({});
      setModalOpen(false);
      await carregar(filtroAplicado);
    } catch {
      setErros({ geral: 'Não foi possível salvar. Confira se o banco de dados está no ar.' });
    } finally {
      setSalvando(false);
    }
  }

  async function confirmarExclusao() {
    if (!excluindo) return;
    try {
      await fetch(`/api/atendidos/${excluindo.id}`, { method: 'DELETE' });
    } finally {
      setExcluindo(null);
      await carregar(filtroAplicado);
    }
  }

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-col sm:flex-row sm:justify-end">
        <Button variant="primary" size="md" onClick={abrirNovo} iconLeft={<Plus size={16} />}>
          Novo atendido
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
        <div className="col-span-2 sm:w-40">
          <Field label="Sexo">
            <Select value={filtro.sexo} onChange={(e) => setFiltro({ ...filtro, sexo: e.target.value })}>
              <option value="">Todos</option>
              {SEXOS.map((s) => (
                <option key={s}>{s}</option>
              ))}
            </Select>
          </Field>
        </div>
        <div className="sm:w-28">
          <Field label="Idade mín.">
            <Input
              inputMode="numeric"
              value={filtro.idadeMinima}
              onChange={(e) => setFiltro({ ...filtro, idadeMinima: e.target.value.replace(/\D/g, '').slice(0, 3) })}
              className={destaque(errosFiltro.idadeMinima)}
            />
          </Field>
          <MensagemErro texto={errosFiltro.idadeMinima} />
        </div>
        <div className="sm:w-28">
          <Field label="Idade máx.">
            <Input
              inputMode="numeric"
              value={filtro.idadeMaxima}
              onChange={(e) => setFiltro({ ...filtro, idadeMaxima: e.target.value.replace(/\D/g, '').slice(0, 3) })}
              className={destaque(errosFiltro.idadeMaxima)}
            />
          </Field>
          <MensagemErro texto={errosFiltro.idadeMaxima} />
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

      {erroCarga && <p className="text-sm text-primary">{erroCarga}</p>}

      <Table>
          <THead cols={COLUNAS} />
          <tbody>
            {linhas.length === 0 && <EmptyRow colSpan={COLUNAS.length} label="Nenhum atendido encontrado." />}
            {linhas.map((a) => (
              <tr key={a.id} className="border-b border-border-line/10 last:border-0">
                <td className="px-4 py-3 font-medium">{a.nome}</td>
                <td className="hidden md:table-cell px-4 py-3 text-foreground/70 whitespace-nowrap tabular-nums">{paraBR(a.dataNascimento)}</td>
                <td className="px-4 py-3 text-right text-foreground/70 tabular-nums">{a.idade}</td>
                <td className="hidden sm:table-cell px-4 py-3 text-foreground/70">{a.sexo}</td>
                <td className="hidden lg:table-cell px-4 py-3">{a.responsavelLegal}</td>
                <td className="hidden lg:table-cell px-4 py-3 text-foreground/70 whitespace-nowrap tabular-nums">{paraBR(a.dataCadastro)}</td>
                <td className="px-2 py-2 sm:px-4">
                  <RowActions>
                    <IconAction label={`Editar ${a.nome}`} onClick={() => abrirEdicao(a)}>
                      <Pencil size={16} />
                    </IconAction>
                    <IconAction label={`Excluir ${a.nome}`} danger onClick={() => setExcluindo(a)}>
                      <Trash2 size={16} />
                    </IconAction>
                  </RowActions>
                </td>
              </tr>
            ))}
          </tbody>
        </Table>

      <Modal open={modalOpen} title={editandoId ? 'Editar atendido' : 'Novo atendido'} onClose={() => setModalOpen(false)}>
        <form onSubmit={salvar} className="flex flex-col gap-4">
          <div>
            <Field label="Nome *">
              <Input
                value={form.nome}
                onChange={(e) => setForm({ ...form, nome: mascaraNome(e.target.value) })}
                className={destaque(erros.nome)}
              />
            </Field>
            <MensagemErro texto={erros.nome} />
          </div>
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <div>
              <Field label="Data de nascimento *">
                <CampoData value={form.dataNascimento} onChange={(t) => setForm({ ...form, dataNascimento: t })} className={destaque(erros.dataNascimento)} />
              </Field>
              <MensagemErro texto={erros.dataNascimento} />
            </div>
            <div>
              <Field label="Sexo *">
                <Select
                  value={form.sexo}
                  onChange={(e) => setForm({ ...form, sexo: e.target.value })}
                  className={destaque(erros.sexo)}
                >
                  <option value="" disabled>
                    Selecione...
                  </option>
                  {SEXOS.map((s) => (
                    <option key={s}>{s}</option>
                  ))}
                </Select>
              </Field>
              <MensagemErro texto={erros.sexo} />
            </div>
          </div>
          <div>
            <Field label="Responsável legal *">
              <Input
                value={form.responsavelLegal}
                onChange={(e) => setForm({ ...form, responsavelLegal: mascaraNome(e.target.value) })}
                className={destaque(erros.responsavelLegal)}
              />
            </Field>
            <MensagemErro texto={erros.responsavelLegal} />
          </div>
          <MensagemErro texto={erros.geral} />
          <div className="mt-4 flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
            <Button type="button" variant="ghost" size="md" onClick={() => setModalOpen(false)}>
              Cancelar
            </Button>
            <Button type="submit" variant="primary" size="md" disabled={salvando}>
              {editandoId ? 'Salvar alterações' : 'Cadastrar'}
            </Button>
          </div>
        </form>
      </Modal>

      <Modal open={excluindo !== null} title="Excluir atendido" onClose={() => setExcluindo(null)}>
        <p className="text-sm text-foreground/70">
          <strong className="font-medium text-foreground">{excluindo?.nome}</strong> sai do cadastro de vez. Essa ação não pode
          ser desfeita.
        </p>
        <div className="mt-8 flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
          <Button variant="ghost" size="md" onClick={() => setExcluindo(null)}>
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

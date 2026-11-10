'use client';

/**
 * Tela de Doadores (RF_B4 - Gerenciar Doadores)
 * Lista, cadastra, edita e exclui doadores usando a API /api/doadores.
 */

import { useEffect, useState } from 'react';
import { Plus, Pencil, Trash2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Field, Input, Select, Modal, Table, THead, EmptyRow, LoadingRows, IconAction, RowActions } from '@/components/app/ui';

interface Doador {
  id: number;
  nome: string;
  contato: string | null;
  tipoPessoa: 'FISICA' | 'JURIDICA';
  anonimo: boolean;
}

interface FormDoador {
  nome: string;
  contato: string;
  tipoPessoa: 'FISICA' | 'JURIDICA';
  anonimo: boolean;
}

const FORM_VAZIO: FormDoador = { nome: '', contato: '', tipoPessoa: 'FISICA', anonimo: false };

// colunas secundárias somem em telas estreitas para as ações continuarem visíveis
const COLUNAS = [
  'Nome',
  { label: 'Tipo', className: 'hidden sm:table-cell' },
  { label: 'Contato', className: 'hidden md:table-cell' },
  { label: 'Ações', className: 'text-right', srOnly: true },
];

export default function DoadoresPage() {
  const [doadores, setDoadores] = useState<Doador[]>([]);
  const [busca, setBusca] = useState('');
  const [modalAberto, setModalAberto] = useState(false);
  const [doadorEditando, setDoadorEditando] = useState<Doador | null>(null);
  const [form, setForm] = useState(FORM_VAZIO);
  const [erro, setErro] = useState('');
  const [estado, setEstado] = useState<'carregando' | 'pronto' | 'erro'>('carregando');

  // carregando e erro são estados próprios: falha no servidor não vira "nenhum doador"
  async function carregarDoadores() {
    try {
      const resposta = await fetch('/api/doadores');
      if (!resposta.ok) throw new Error();
      setDoadores(await resposta.json());
      setEstado('pronto');
    } catch {
      setEstado('erro');
    }
  }

  useEffect(() => {
    fetch('/api/doadores')
      .then((resposta) => {
        if (!resposta.ok) throw new Error();
        return resposta.json();
      })
      .then((dados) => {
        setDoadores(dados);
        setEstado('pronto');
      })
      .catch(() => setEstado('erro'));
  }, []);

  function abrirNovo() {
    setDoadorEditando(null);
    setForm(FORM_VAZIO);
    setErro('');
    setModalAberto(true);
  }

  function abrirEdicao(doador: Doador) {
    setDoadorEditando(doador);
    setForm({
      nome: doador.nome,
      contato: doador.contato ?? '',
      tipoPessoa: doador.tipoPessoa,
      anonimo: doador.anonimo,
    });
    setErro('');
    setModalAberto(true);
  }

  async function salvar(e: React.FormEvent) {
    e.preventDefault();
    setErro('');

    const url = doadorEditando ? `/api/doadores/${doadorEditando.id}` : '/api/doadores';
    const metodo = doadorEditando ? 'PUT' : 'POST';

    const resposta = await fetch(url, {
      method: metodo,
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(form),
    });

    if (resposta.ok) {
      setModalAberto(false);
      carregarDoadores();
    } else {
      const corpo = await resposta.json();
      setErro(corpo.erro);
    }
  }

  async function excluir(doador: Doador) {
    if (!confirm(`Deseja excluir o doador "${doador.nome}"?`)) return;
    const resposta = await fetch(`/api/doadores/${doador.id}`, { method: 'DELETE' });
    if (!resposta.ok) {
      const corpo = await resposta.json().catch(() => ({}));
      alert(corpo.erro ?? 'Não foi possível excluir o doador.');
    }
    carregarDoadores();
  }

  const doadoresFiltrados = doadores.filter((d) => d.nome.toLowerCase().includes(busca.toLowerCase()));

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <Input
          type="search"
          aria-label="Buscar doador pelo nome"
          placeholder="Buscar doador pelo nome"
          value={busca}
          onChange={(e) => setBusca(e.target.value)}
          className="sm:max-w-xs"
        />
        <Button variant="primary" size="md" onClick={abrirNovo} iconLeft={<Plus size={16} />}>
          Novo doador
        </Button>
      </div>

      <Table>
        <THead cols={COLUNAS} />
        <tbody>
          {estado === 'carregando' && <LoadingRows colSpan={COLUNAS.length} />}
          {estado === 'erro' && (
            <EmptyRow colSpan={COLUNAS.length}>
              Não foi possível carregar os doadores.{' '}
              <button type="button" onClick={carregarDoadores} className="font-medium text-foreground underline underline-offset-2 cursor-pointer hover:text-primary">
                Tentar de novo
              </button>
            </EmptyRow>
          )}
          {estado === 'pronto' && doadoresFiltrados.length === 0 && (
            <EmptyRow colSpan={COLUNAS.length} label={busca ? 'Nenhum doador com esse nome.' : 'Nenhum doador cadastrado ainda.'} />
          )}
          {estado === 'pronto' &&
            doadoresFiltrados.map((d) => (
              <tr key={d.id} className="border-b border-border-line/10 last:border-0">
                <td className="px-4 py-3 font-medium">
                  {d.anonimo ? <span className="italic text-foreground/50">Doador anônimo</span> : d.nome}
                </td>
                <td className="hidden sm:table-cell px-4 py-3 text-foreground/70">
                  {d.tipoPessoa === 'FISICA' ? 'Pessoa física' : 'Pessoa jurídica'}
                </td>
                <td className="hidden md:table-cell px-4 py-3 text-foreground/70 whitespace-nowrap">{d.contato || '—'}</td>
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
              <Field label="Nome do doador">
                <Input value={form.nome} onChange={(e) => setForm({ ...form, nome: e.target.value })} required={!form.anonimo} />
              </Field>
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                <Field label="Tipo de pessoa">
                  <Select
                    value={form.tipoPessoa}
                    onChange={(e) => setForm({ ...form, tipoPessoa: e.target.value as 'FISICA' | 'JURIDICA' })}
                  >
                    <option value="FISICA">Pessoa física</option>
                    <option value="JURIDICA">Pessoa jurídica</option>
                  </Select>
                </Field>
                <Field label="Contato (telefone/e-mail)">
                  <Input value={form.contato} onChange={(e) => setForm({ ...form, contato: e.target.value })} />
                </Field>
              </div>
            </>
          )}

          {erro && <p className="text-sm text-primary">{erro}</p>}
          <div className="mt-4 flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
            <Button type="button" variant="ghost" size="md" onClick={() => setModalAberto(false)}>
              Cancelar
            </Button>
            <Button type="submit" variant="primary" size="md">
              {doadorEditando ? 'Salvar alterações' : 'Cadastrar'}
            </Button>
          </div>
        </form>
      </Modal>
    </div>
  );
}

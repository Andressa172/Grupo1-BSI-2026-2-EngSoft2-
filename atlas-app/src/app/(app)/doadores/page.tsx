'use client';

/**
 * Tela de Doadores (RF_B4 - Gerenciar Doadores)
 * Lista, cadastra, edita e exclui doadores usando a API /api/doadores.
 */

import { useEffect, useState } from 'react';
import { Plus, Pencil, Trash2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Field, Input, Select, Modal, Table, THead, EmptyRow } from '@/components/app/ui';

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

export default function DoadoresPage() {
  const [doadores, setDoadores] = useState<Doador[]>([]);
  const [busca, setBusca] = useState('');
  const [modalAberto, setModalAberto] = useState(false);
  const [doadorEditando, setDoadorEditando] = useState<Doador | null>(null);
  const [form, setForm] = useState(FORM_VAZIO);
  const [erro, setErro] = useState('');

  async function carregarDoadores() {
    const resposta = await fetch('/api/doadores');
    const dados = await resposta.json();
    setDoadores(dados);
  }

  useEffect(() => {
    fetch('/api/doadores')
      .then((resposta) => resposta.json())
      .then((dados) => setDoadores(dados));
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
    await fetch(`/api/doadores/${doador.id}`, { method: 'DELETE' });
    carregarDoadores();
  }

  const doadoresFiltrados = doadores.filter((d) => d.nome.toLowerCase().includes(busca.toLowerCase()));

  return (
    <div className="flex flex-col gap-6">
      <p className="text-sm text-foreground/50 max-w-xl">
        Cadastro de doadores (RF_B4): pessoas físicas ou jurídicas que fazem doações de produto ou em
        dinheiro ao SOS Criança. Um doador pode ser marcado como anônimo.
      </p>

      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <Input
          placeholder="Buscar doador pelo nome..."
          value={busca}
          onChange={(e) => setBusca(e.target.value)}
          className="sm:max-w-xs"
        />
        <Button variant="primary" size="md" onClick={abrirNovo} iconLeft={<Plus size={16} />}>
          Novo Doador
        </Button>
      </div>

      <Table>
        <THead cols={['Nome', 'Tipo', 'Contato', '']} />
        <tbody>
          {doadoresFiltrados.length === 0 && <EmptyRow colSpan={4} label="Nenhum doador encontrado." />}
          {doadoresFiltrados.map((d) => (
            <tr key={d.id} className="border-b border-border-line/10 last:border-0">
              <td className="px-4 py-3 font-medium">
                {d.anonimo ? <span className="italic text-foreground/50">Doador anônimo</span> : d.nome}
              </td>
              <td className="px-4 py-3 text-foreground/60">{d.tipoPessoa === 'FISICA' ? 'Pessoa física' : 'Pessoa jurídica'}</td>
              <td className="px-4 py-3 text-foreground/60">{d.contato || '—'}</td>
              <td className="px-4 py-3">
                <div className="flex justify-end gap-2">
                  <Button variant="outline" size="sm" onClick={() => abrirEdicao(d)} iconLeft={<Pencil size={14} />}>
                    Editar
                  </Button>
                  <Button variant="outline" size="sm" onClick={() => excluir(d)} iconLeft={<Trash2 size={14} />}>
                    Excluir
                  </Button>
                </div>
              </td>
            </tr>
          ))}
        </tbody>
      </Table>

      <Modal open={modalAberto} title={doadorEditando ? 'Editar Doador' : 'Cadastrar Doador'} onClose={() => setModalAberto(false)}>
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
              <div className="grid grid-cols-2 gap-4">
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
          <Button type="submit" variant="primary" size="md" className="w-full mt-2">
            {doadorEditando ? 'Salvar alterações' : 'Cadastrar'}
          </Button>
        </form>
      </Modal>
    </div>
  );
}

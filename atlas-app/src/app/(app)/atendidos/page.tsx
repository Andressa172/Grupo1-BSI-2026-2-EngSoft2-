'use client';

/**
 * View de RF_B1 (Gerenciar atendidos).
 * Esta tela só mostra dados e captura o que o funcionário digita: validação,
 * regras e gravação ficam no Control (ControlGerenciarAtendidos).
 */

import { useReducer, useState, useSyncExternalStore } from 'react';
import { Pencil, Plus, Trash2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, Field, Input, Select, Modal, Table, THead, EmptyRow } from '@/components/app/ui';
import {
  ControlGerenciarAtendidos,
  type DadosAtendido,
  type DadosFiltroAtendido,
  type LinhaAtendido,
} from '@/control/ControlGerenciarAtendidos';
import { SEXOS } from '@/model/Atendido';
import { mascaraData, mascaraNome } from '@/view/mascaras';

const control = ControlGerenciarAtendidos.getInstancia();

const formVazio: DadosAtendido = { nome: '', dataNascimento: '', sexo: '', responsavelLegal: '' };
const filtroVazio: DadosFiltroAtendido = { nome: '', sexo: '', idadeMinima: '', idadeMaxima: '' };

function MensagemErro({ texto }: { texto?: string }) {
  if (!texto) return null;
  return <span className="text-xs text-primary mt-1 block">{texto}</span>;
}
const destaque = (erro?: string) => (erro ? 'border-primary!' : '');

export default function AtendidosPage() {
  // false no servidor, true no navegador: os dados ficam no localStorage, que só existe lá
  const noNavegador = useSyncExternalStore(
    () => () => {},
    () => true,
    () => false
  );
  const [, atualizarTela] = useReducer((n: number) => n + 1, 0); // re-renderiza após incluir/alterar/excluir

  // consulta: filtro digitado x filtro aplicado ao clicar em Consultar
  const [filtro, setFiltro] = useState<DadosFiltroAtendido>(filtroVazio);
  const [filtroAplicado, setFiltroAplicado] = useState<DadosFiltroAtendido>(filtroVazio);
  const [errosFiltro, setErrosFiltro] = useState<Record<string, string>>({});

  // formulário (inclusão / alteração)
  const [modalOpen, setModalOpen] = useState(false);
  const [editandoId, setEditandoId] = useState<string | null>(null);
  const [form, setForm] = useState<DadosAtendido>(formVazio);
  const [erros, setErros] = useState<Record<string, string>>({});

  // exclusão
  const [excluindo, setExcluindo] = useState<LinhaAtendido | null>(null);

  const linhas: LinhaAtendido[] = noNavegador ? control.consultar(filtroAplicado) : [];

  function consultar(e: React.FormEvent) {
    e.preventDefault();
    const e2 = control.validarFiltro(filtro);
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

  function abrirEdicao(id: string) {
    const dados = control.obterParaEdicao(id);
    if (!dados) return;
    setEditandoId(id);
    setForm(dados);
    setErros({});
    setModalOpen(true);
  }

  function salvar(e: React.FormEvent) {
    e.preventDefault();
    const resultado = editandoId ? control.alterar(editandoId, form) : control.incluir(form);
    setErros(resultado.erros);
    if (resultado.sucesso) {
      setModalOpen(false);
      atualizarTela();
    }
  }

  function confirmarExclusao() {
    if (!excluindo) return;
    control.excluir(excluindo.id);
    setExcluindo(null);
    atualizarTela();
  }

  return (
    <div className="flex flex-col gap-6">
      <div className="flex items-center justify-end">
        <Button variant="primary" size="md" onClick={abrirNovo} iconLeft={<Plus size={16} />}>
          Novo Atendido
        </Button>
      </div>

      <form onSubmit={consultar} className="flex flex-wrap items-start gap-3">
        <div className="min-w-52 flex-1">
          <Field label="Nome">
            <Input
              value={filtro.nome}
              onChange={(e) => setFiltro({ ...filtro, nome: mascaraNome(e.target.value) })}
              placeholder="Buscar por nome"
            />
          </Field>
        </div>
        <div className="w-40">
          <Field label="Sexo">
            <Select value={filtro.sexo} onChange={(e) => setFiltro({ ...filtro, sexo: e.target.value })}>
              <option value="">Todos</option>
              {SEXOS.map((s) => (
                <option key={s}>{s}</option>
              ))}
            </Select>
          </Field>
        </div>
        <div className="w-28">
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
        <div className="w-28">
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
        <div className="flex gap-2 mt-6">
          <Button type="submit" variant="primary" size="md">
            Consultar
          </Button>
          <Button type="button" variant="outline" size="md" onClick={limparFiltro}>
            Limpar
          </Button>
        </div>
      </form>

      <Card className="p-0">
        <Table>
          <THead cols={['Nome', 'Nascimento', 'Idade', 'Sexo', 'Responsável legal', 'Cadastro', 'Ações']} />
          <tbody>
            {linhas.length === 0 && <EmptyRow colSpan={7} label="Nenhum atendido encontrado." />}
            {linhas.map((a) => (
              <tr key={a.id} className="border-b border-border-line/10 last:border-0">
                <td className="px-4 py-3 font-medium">{a.nome}</td>
                <td className="px-4 py-3 text-foreground/60 whitespace-nowrap">{a.dataNascimento}</td>
                <td className="px-4 py-3 text-foreground/60">{a.idade}</td>
                <td className="px-4 py-3 text-foreground/60">{a.sexo}</td>
                <td className="px-4 py-3">{a.responsavelLegal}</td>
                <td className="px-4 py-3 text-foreground/60 whitespace-nowrap">{a.dataCadastro}</td>
                <td className="px-4 py-3">
                  <div className="flex items-center gap-1">
                    <button
                      onClick={() => abrirEdicao(a.id)}
                      className="p-2 text-foreground/40 hover:text-foreground cursor-pointer"
                      aria-label={`Alterar ${a.nome}`}
                    >
                      <Pencil size={16} />
                    </button>
                    <button
                      onClick={() => setExcluindo(a)}
                      className="p-2 text-foreground/40 hover:text-primary cursor-pointer"
                      aria-label={`Excluir ${a.nome}`}
                    >
                      <Trash2 size={16} />
                    </button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </Table>
      </Card>

      <Modal open={modalOpen} title={editandoId ? 'Alterar Atendido' : 'Novo Atendido'} onClose={() => setModalOpen(false)}>
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
          <div className="grid grid-cols-2 gap-4">
            <div>
              <Field label="Data de nascimento *">
                <Input
                  value={form.dataNascimento}
                  onChange={(e) => setForm({ ...form, dataNascimento: mascaraData(e.target.value) })}
                  placeholder="dd/mm/aaaa"
                  inputMode="numeric"
                  className={destaque(erros.dataNascimento)}
                />
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
          <Button type="submit" variant="primary" size="md" className="w-full mt-2">
            {editandoId ? 'Salvar alterações' : 'Cadastrar Atendido'}
          </Button>
        </form>
      </Modal>

      <Modal open={excluindo !== null} title="Excluir atendido" onClose={() => setExcluindo(null)}>
        <p className="text-sm text-foreground/70 mb-5">
          Tem certeza que deseja excluir <strong>{excluindo?.nome}</strong>? Essa ação não pode ser desfeita.
        </p>
        <div className="flex gap-2 justify-end">
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

'use client';

import { useState } from 'react';
import { Plus, ArrowDownCircle, ArrowUpCircle, ArrowDownUp } from 'lucide-react';
import { useAtlas } from '@/lib/store';
import { Button } from '@/components/ui/button';
import { Field, Input, Select, Modal, Table, THead, EmptyRow, LowStockPill, IconAction, RowActions } from '@/components/app/ui';
import type { Produto, TipoMovimentacao } from '@/lib/types';

function formatDate(iso?: string) {
  if (!iso) return '—';
  return new Date(iso).toLocaleDateString('pt-BR');
}

// colunas secundárias somem em telas estreitas
const COLUNAS_PRODUTOS = [
  'Produto',
  { label: 'Categoria', className: 'hidden sm:table-cell' },
  'Estoque',
  { label: 'Validade', className: 'hidden md:table-cell' },
  { label: 'Situação', className: 'hidden sm:table-cell' },
  { label: 'Ações', className: 'text-right', srOnly: true },
];
const COLUNAS_HISTORICO = [
  { label: 'Data', className: 'hidden sm:table-cell' },
  'Produto',
  'Tipo',
  { label: 'Quantidade', className: 'text-right' },
  { label: 'Origem', className: 'hidden md:table-cell' },
];

export default function EstoquePage() {
  const { produtos, movimentacoesEstoque, cadastrarProduto, atualizarEstoque } = useAtlas();

  const [novoProdutoOpen, setNovoProdutoOpen] = useState(false);
  const [movimentarOpen, setMovimentarOpen] = useState<Produto | null>(null);

  const [form, setForm] = useState({ nome: '', categoria: 'Alimento', unidadeMedida: '', estoqueMinimo: '0', dataValidade: '' });
  const [movForm, setMovForm] = useState<{ tipo: TipoMovimentacao; quantidade: string }>({ tipo: 'ENTRADA', quantidade: '' });

  function submitNovoProduto(e: React.FormEvent) {
    e.preventDefault();
    if (!form.nome || !form.unidadeMedida) return;
    cadastrarProduto({
      nome: form.nome,
      categoria: form.categoria,
      unidadeMedida: form.unidadeMedida,
      quantidadeEstoque: 0,
      estoqueMinimo: Number(form.estoqueMinimo) || 0,
      dataValidade: form.dataValidade || undefined,
    });
    setForm({ nome: '', categoria: 'Alimento', unidadeMedida: '', estoqueMinimo: '0', dataValidade: '' });
    setNovoProdutoOpen(false);
  }

  function submitMovimentacao(e: React.FormEvent) {
    e.preventDefault();
    if (!movimentarOpen) return;
    const quantidade = Number(movForm.quantidade);
    if (!quantidade || quantidade <= 0) return;
    if (movForm.tipo === 'SAIDA' && quantidade > movimentarOpen.quantidadeEstoque) {
      alert('Quantidade insuficiente em estoque.');
      return;
    }
    atualizarEstoque(movimentarOpen.id, movForm.tipo, quantidade, 'Ajuste manual de estoque');
    setMovForm({ tipo: 'ENTRADA', quantidade: '' });
    setMovimentarOpen(null);
  }

  const produtoPorId = (id: string) => produtos.find((p) => p.id === id);

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-col sm:flex-row sm:justify-end">
        <Button variant="primary" size="md" onClick={() => setNovoProdutoOpen(true)} iconLeft={<Plus size={16} />}>
          Novo produto
        </Button>
      </div>

      <Table>
        <THead cols={COLUNAS_PRODUTOS} />
        <tbody>
          {produtos.length === 0 && <EmptyRow colSpan={COLUNAS_PRODUTOS.length} label="Nenhum produto cadastrado ainda." />}
          {produtos.map((p) => {
            const low = p.quantidadeEstoque <= p.estoqueMinimo;
            return (
              <tr key={p.id} className="border-b border-border-line/10 last:border-0">
                <td className="px-4 py-3 font-medium">{p.nome}</td>
                <td className="hidden sm:table-cell px-4 py-3 text-foreground/70">{p.categoria}</td>
                <td className="px-4 py-3 tabular-nums">
                  <span className={low ? 'text-primary' : ''}>
                    {p.quantidadeEstoque} {p.unidadeMedida}
                  </span>
                  <span className="block text-xs text-foreground/50">mín. {p.estoqueMinimo}</span>
                </td>
                <td className="hidden md:table-cell px-4 py-3 text-foreground/70 tabular-nums">{formatDate(p.dataValidade)}</td>
                <td className="hidden sm:table-cell px-4 py-3">
                  <LowStockPill low={low} />
                </td>
                <td className="px-2 py-2 sm:px-4">
                  <RowActions>
                    <IconAction label={`Movimentar estoque de ${p.nome}`} onClick={() => setMovimentarOpen(p)}>
                      <ArrowDownUp size={16} />
                    </IconAction>
                  </RowActions>
                </td>
              </tr>
            );
          })}
        </tbody>
      </Table>

      <section className="flex flex-col gap-3">
        <h2 className="text-sm font-semibold">Histórico de movimentações</h2>
        <Table>
          <THead cols={COLUNAS_HISTORICO} />
          <tbody>
            {movimentacoesEstoque.length === 0 && (
              <EmptyRow colSpan={COLUNAS_HISTORICO.length} label="Nenhuma movimentação registrada ainda." />
            )}
            {movimentacoesEstoque.slice(0, 20).map((m) => (
              <tr key={m.id} className="border-b border-border-line/10 last:border-0">
                <td className="hidden sm:table-cell px-4 py-3 text-foreground/70 tabular-nums">{formatDate(m.data)}</td>
                <td className="px-4 py-3">{produtoPorId(m.produtoId)?.nome ?? m.produtoId}</td>
                <td className="px-4 py-3">
                  <span className={`inline-flex items-center gap-1.5 ${m.tipo === 'ENTRADA' ? 'text-success' : 'text-primary'}`}>
                    {m.tipo === 'ENTRADA' ? <ArrowDownCircle size={14} /> : <ArrowUpCircle size={14} />}
                    {m.tipo === 'ENTRADA' ? 'Entrada' : 'Saída'}
                  </span>
                </td>
                <td className="px-4 py-3 text-right tabular-nums">{m.quantidade}</td>
                <td className="hidden md:table-cell px-4 py-3 text-foreground/70">{m.origem}</td>
              </tr>
            ))}
          </tbody>
        </Table>
      </section>

      {/* Modal: novo produto (RF_B3) */}
      <Modal open={novoProdutoOpen} title="Novo produto" onClose={() => setNovoProdutoOpen(false)}>
        <form onSubmit={submitNovoProduto} className="flex flex-col gap-4">
          <Field label="Nome do produto">
            <Input value={form.nome} onChange={(e) => setForm({ ...form, nome: e.target.value })} required />
          </Field>
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <Field label="Categoria">
              <Select value={form.categoria} onChange={(e) => setForm({ ...form, categoria: e.target.value })}>
                <option>Alimento</option>
                <option>Material</option>
                <option>Higiene</option>
                <option>Outro</option>
              </Select>
            </Field>
            <Field label="Unidade de medida">
              <Input
                placeholder="ex: pacote, kg, litro"
                value={form.unidadeMedida}
                onChange={(e) => setForm({ ...form, unidadeMedida: e.target.value })}
                required
              />
            </Field>
          </div>
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <Field label="Estoque mínimo">
              <Input
                type="number"
                min={0}
                value={form.estoqueMinimo}
                onChange={(e) => setForm({ ...form, estoqueMinimo: e.target.value })}
              />
            </Field>
            <Field label="Data de validade (opcional)">
              <Input type="date" value={form.dataValidade} onChange={(e) => setForm({ ...form, dataValidade: e.target.value })} />
            </Field>
          </div>
          <div className="mt-4 flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
            <Button type="button" variant="ghost" size="md" onClick={() => setNovoProdutoOpen(false)}>
              Cancelar
            </Button>
            <Button type="submit" variant="primary" size="md">
              Cadastrar
            </Button>
          </div>
        </form>
      </Modal>

      {/* Modal: movimentar estoque (RF_F1) */}
      <Modal open={!!movimentarOpen} title={`Movimentar: ${movimentarOpen?.nome ?? ''}`} onClose={() => setMovimentarOpen(null)}>
        <form onSubmit={submitMovimentacao} className="flex flex-col gap-4">
          <p className="text-sm text-foreground/70">
            Estoque atual: <strong className="font-medium text-foreground">{movimentarOpen?.quantidadeEstoque}</strong>{' '}
            {movimentarOpen?.unidadeMedida}
          </p>
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <Field label="Tipo de movimentação">
              <Select
                value={movForm.tipo}
                onChange={(e) => setMovForm({ ...movForm, tipo: e.target.value as TipoMovimentacao })}
              >
                <option value="ENTRADA">Entrada</option>
                <option value="SAIDA">Saída</option>
              </Select>
            </Field>
            <Field label="Quantidade">
              <Input
                type="number"
                min={1}
                value={movForm.quantidade}
                onChange={(e) => setMovForm({ ...movForm, quantidade: e.target.value })}
                required
              />
            </Field>
          </div>
          <div className="mt-4 flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
            <Button type="button" variant="ghost" size="md" onClick={() => setMovimentarOpen(null)}>
              Cancelar
            </Button>
            <Button type="submit" variant="primary" size="md">
              Confirmar
            </Button>
          </div>
        </form>
      </Modal>
    </div>
  );
}

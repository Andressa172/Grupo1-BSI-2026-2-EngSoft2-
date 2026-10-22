'use client';

import { useState } from 'react';
import { Plus, ArrowDownCircle, ArrowUpCircle } from 'lucide-react';
import { useAtlas } from '@/lib/store';
import { Button } from '@/components/ui/button';
import { Card, Field, Input, Select, Modal, Table, THead, EmptyRow, LowStockPill } from '@/components/app/ui';
import type { Produto, TipoMovimentacao } from '@/lib/types';

function formatDate(iso?: string) {
  if (!iso) return '—';
  return new Date(iso).toLocaleDateString('pt-BR');
}

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
      <div className="flex items-center justify-between">
        <p className="text-sm text-foreground/50 max-w-xl">
          Controle de estoque (RF_B3 / RF_F1): cadastre produtos e registre entradas e saídas manuais.
          Doações, compras e cardápios atualizam o estoque automaticamente.
        </p>
        <Button variant="primary" size="md" onClick={() => setNovoProdutoOpen(true)} iconLeft={<Plus size={16} />}>
          Novo Produto
        </Button>
      </div>

      <Table>
        <THead cols={['Produto', 'Categoria', 'Estoque', 'Validade', 'Status', '']} />
        <tbody>
          {produtos.length === 0 && <EmptyRow colSpan={6} label="Nenhum produto cadastrado." />}
          {produtos.map((p) => {
            const low = p.quantidadeEstoque <= p.estoqueMinimo;
            return (
              <tr key={p.id} className="border-b border-border-line/10 last:border-0">
                <td className="px-4 py-3 font-medium">{p.nome}</td>
                <td className="px-4 py-3 text-foreground/60">{p.categoria}</td>
                <td className="px-4 py-3">
                  {p.quantidadeEstoque} {p.unidadeMedida}
                  <span className="text-foreground/40"> (mín. {p.estoqueMinimo})</span>
                </td>
                <td className="px-4 py-3 text-foreground/60">{formatDate(p.dataValidade)}</td>
                <td className="px-4 py-3">
                  <LowStockPill low={low} />
                </td>
                <td className="px-4 py-3 text-right">
                  <Button variant="outline" size="sm" onClick={() => setMovimentarOpen(p)}>
                    Movimentar
                  </Button>
                </td>
              </tr>
            );
          })}
        </tbody>
      </Table>

      <Card className="p-5">
        <h2 className="text-sm font-semibold mb-4">Histórico de movimentações</h2>
        <Table>
          <THead cols={['Data', 'Produto', 'Tipo', 'Quantidade', 'Origem']} />
          <tbody>
            {movimentacoesEstoque.length === 0 && <EmptyRow colSpan={5} label="Nenhuma movimentação registrada ainda." />}
            {movimentacoesEstoque.slice(0, 20).map((m) => (
              <tr key={m.id} className="border-b border-border-line/10 last:border-0">
                <td className="px-4 py-3 text-foreground/60">{formatDate(m.data)}</td>
                <td className="px-4 py-3">{produtoPorId(m.produtoId)?.nome ?? m.produtoId}</td>
                <td className="px-4 py-3">
                  <span className={`inline-flex items-center gap-1.5 ${m.tipo === 'ENTRADA' ? 'text-green-600' : 'text-primary'}`}>
                    {m.tipo === 'ENTRADA' ? <ArrowDownCircle size={14} /> : <ArrowUpCircle size={14} />}
                    {m.tipo === 'ENTRADA' ? 'Entrada' : 'Saída'}
                  </span>
                </td>
                <td className="px-4 py-3">{m.quantidade}</td>
                <td className="px-4 py-3 text-foreground/60">{m.origem}</td>
              </tr>
            ))}
          </tbody>
        </Table>
      </Card>

      {/* Modal: novo produto (RF_B3) */}
      <Modal open={novoProdutoOpen} title="Cadastrar Produto" onClose={() => setNovoProdutoOpen(false)}>
        <form onSubmit={submitNovoProduto} className="flex flex-col gap-4">
          <Field label="Nome do produto">
            <Input value={form.nome} onChange={(e) => setForm({ ...form, nome: e.target.value })} required />
          </Field>
          <div className="grid grid-cols-2 gap-4">
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
          <div className="grid grid-cols-2 gap-4">
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
          <Button type="submit" variant="primary" size="md" className="w-full mt-2">
            Cadastrar
          </Button>
        </form>
      </Modal>

      {/* Modal: movimentar estoque (RF_F1) */}
      <Modal open={!!movimentarOpen} title={`Movimentar: ${movimentarOpen?.nome ?? ''}`} onClose={() => setMovimentarOpen(null)}>
        <form onSubmit={submitMovimentacao} className="flex flex-col gap-4">
          <p className="text-xs text-foreground/50">
            Estoque atual: <strong>{movimentarOpen?.quantidadeEstoque}</strong> {movimentarOpen?.unidadeMedida}
          </p>
          <div className="grid grid-cols-2 gap-4">
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
          <Button type="submit" variant="primary" size="md" className="w-full mt-2">
            Confirmar
          </Button>
        </form>
      </Modal>
    </div>
  );
}

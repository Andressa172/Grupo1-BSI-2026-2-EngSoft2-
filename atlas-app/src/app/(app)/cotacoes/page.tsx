'use client';

import { useState } from 'react';
import { Plus, Trash2, Check, X as XIcon, ClipboardCheck } from 'lucide-react';
import { useAtlas } from '@/lib/store';
import { Button } from '@/components/ui/button';
import { Field, Input, Select, Textarea, Modal, Table, THead, EmptyRow, StatusPill, IconAction, RowActions } from '@/components/app/ui';
import type { Cotacao } from '@/lib/types';

function formatDate(iso: string) {
  return new Date(iso).toLocaleDateString('pt-BR');
}

// data e itens somem em telas estreitas; a ação fica sempre visível
const COLUNAS = [
  { label: 'Data', className: 'hidden md:table-cell' },
  'Descrição',
  { label: 'Itens', className: 'hidden sm:table-cell' },
  'Status',
  { label: 'Ações', className: 'text-right', srOnly: true },
];

export default function CotacoesPage() {
  const { produtos, cotacoes, abrirCotacao, avaliarCotacao } = useAtlas();

  const [novaOpen, setNovaOpen] = useState(false);
  const [avaliarAlvo, setAvaliarAlvo] = useState<Cotacao | null>(null);
  const [justificativa, setJustificativa] = useState('');

  const [descricao, setDescricao] = useState('');
  const [itens, setItens] = useState<{ produtoId: string; quantidadeDesejada: string }[]>([
    { produtoId: produtos[0]?.id ?? '', quantidadeDesejada: '' },
  ]);

  function submitNovaCotacao(e: React.FormEvent) {
    e.preventDefault();
    const itensValidos = itens
      .filter((i) => i.produtoId && Number(i.quantidadeDesejada) > 0)
      .map((i) => ({ produtoId: i.produtoId, quantidadeDesejada: Number(i.quantidadeDesejada) }));
    if (!descricao.trim() || itensValidos.length === 0) {
      alert('Informe a descrição e ao menos um item válido.');
      return;
    }
    abrirCotacao(descricao.trim(), itensValidos);
    setDescricao('');
    setItens([{ produtoId: produtos[0]?.id ?? '', quantidadeDesejada: '' }]);
    setNovaOpen(false);
  }

  function confirmarAvaliacao(status: 'APROVADA' | 'REPROVADA') {
    if (!avaliarAlvo) return;
    avaliarCotacao(avaliarAlvo.id, status, justificativa.trim() || undefined);
    setAvaliarAlvo(null);
    setJustificativa('');
  }

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-col sm:flex-row sm:justify-end">
        <Button variant="primary" size="md" onClick={() => setNovaOpen(true)} iconLeft={<Plus size={16} />}>
          Nova cotação
        </Button>
      </div>

      <Table>
          <THead cols={COLUNAS} />
          <tbody>
            {cotacoes.length === 0 && <EmptyRow colSpan={COLUNAS.length} label="Nenhuma cotação registrada ainda." />}
            {cotacoes.map((c) => (
              <tr key={c.id} className="border-b border-border-line/10 last:border-0 align-top">
                <td className="hidden md:table-cell px-4 py-3 text-foreground/70 whitespace-nowrap tabular-nums">{formatDate(c.dataAbertura)}</td>
                <td className="px-4 py-3 max-w-xs">{c.descricao}</td>
                <td className="hidden sm:table-cell px-4 py-3">
                  <ul className="space-y-1">
                    {c.itens.map((i, idx) => (
                      <li key={idx} className="text-foreground/70">
                        {produtos.find((p) => p.id === i.produtoId)?.nome ?? i.produtoId} — {i.quantidadeDesejada}
                      </li>
                    ))}
                  </ul>
                </td>
                <td className="px-4 py-3">
                  <StatusPill status={c.status} />
                  {c.justificativa && <p className="text-xs text-foreground/50 mt-1 max-w-48">{c.justificativa}</p>}
                </td>
                <td className="px-2 py-2 sm:px-4">
                  {c.status === 'PENDENTE' && (
                    <RowActions>
                      <IconAction label={`Avaliar cotação: ${c.descricao}`} onClick={() => setAvaliarAlvo(c)}>
                        <ClipboardCheck size={16} />
                      </IconAction>
                    </RowActions>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </Table>

      {/* Nova cotação (RF_F7) */}
      <Modal open={novaOpen} title="Nova cotação" onClose={() => setNovaOpen(false)}>
        <form onSubmit={submitNovaCotacao} className="flex flex-col gap-4">
          <Field label="Descrição da cotação">
            <Input value={descricao} onChange={(e) => setDescricao(e.target.value)} placeholder="ex: Reposição mensal de alimentos" required />
          </Field>

          <div className="flex flex-col gap-3">
            {itens.map((item, idx) => (
              <div key={idx} className="flex items-end gap-2">
                <div className="flex-1">
                  <Field label={idx === 0 ? 'Produto' : ''}>
                    <Select
                      value={item.produtoId}
                      onChange={(e) => {
                        const copy = [...itens];
                        copy[idx].produtoId = e.target.value;
                        setItens(copy);
                      }}
                    >
                      {produtos.map((p) => (
                        <option key={p.id} value={p.id}>
                          {p.nome}
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
                    />
                  </Field>
                </div>
                <button
                  type="button"
                  onClick={() => setItens(itens.filter((_, i) => i !== idx))}
                  className="rounded-md p-2 text-foreground/50 hover:text-primary hover:bg-foreground/5 cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/40"
                  aria-label="Remover item"
                >
                  <Trash2 size={16} />
                </button>
              </div>
            ))}
            <button
              type="button"
              onClick={() => setItens([...itens, { produtoId: produtos[0]?.id ?? '', quantidadeDesejada: '' }])}
              className="inline-flex items-center gap-1.5 text-xs font-medium text-primary hover:underline w-fit cursor-pointer"
            >
              <Plus size={14} aria-hidden />
              Adicionar outro item
            </button>
          </div>

          <div className="mt-4 flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
            <Button type="button" variant="ghost" size="md" onClick={() => setNovaOpen(false)}>
              Cancelar
            </Button>
            <Button type="submit" variant="primary" size="md">
              Enviar cotação
            </Button>
          </div>
        </form>
      </Modal>

      {/* Avaliar cotação (RF_F8) */}
      <Modal open={!!avaliarAlvo} title="Avaliar cotação" onClose={() => setAvaliarAlvo(null)}>
        {avaliarAlvo && (
          <div className="flex flex-col gap-4">
            <p className="text-sm">{avaliarAlvo.descricao}</p>
            <ul className="text-sm text-foreground/70 space-y-1 border-y border-border-line/10 py-3">
              {avaliarAlvo.itens.map((i, idx) => (
                <li key={idx}>
                  {produtos.find((p) => p.id === i.produtoId)?.nome ?? i.produtoId} — {i.quantidadeDesejada}
                </li>
              ))}
            </ul>
            <Field label="Justificativa / observações (opcional)">
              <Textarea rows={3} value={justificativa} onChange={(e) => setJustificativa(e.target.value)} />
            </Field>
            <div className="mt-4 flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
              <Button
                variant="outline"
                size="md"
                className="text-primary"
                iconLeft={<XIcon size={16} />}
                onClick={() => confirmarAvaliacao('REPROVADA')}
              >
                Reprovar
              </Button>
              <Button variant="primary" size="md" iconLeft={<Check size={16} />} onClick={() => confirmarAvaliacao('APROVADA')}>
                Aprovar
              </Button>
            </div>
          </div>
        )}
      </Modal>
    </div>
  );
}

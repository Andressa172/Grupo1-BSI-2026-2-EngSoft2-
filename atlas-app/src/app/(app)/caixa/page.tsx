'use client';

import { useState } from 'react';
import { ArrowDownCircle, ArrowUpCircle, Lock, Unlock } from 'lucide-react';
import { useAtlas } from '@/lib/store';
import { Button } from '@/components/ui/button';
import { Card, Field, Input, Select, Modal, Table, THead, EmptyRow, StatusPill } from '@/components/app/ui';
import type { TipoMovimentacao } from '@/lib/types';

function formatBRL(v: number) {
  return v.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
}
function formatDateTime(iso?: string) {
  if (!iso) return '—';
  return new Date(iso).toLocaleString('pt-BR');
}

export default function CaixaPage() {
  const { caixaAberto, caixas, abrirCaixa, atualizarCaixa, fecharCaixa } = useAtlas();

  const [abrirOpen, setAbrirOpen] = useState(false);
  const [movOpen, setMovOpen] = useState(false);
  const [fecharOpen, setFecharOpen] = useState(false);

  const [abrirForm, setAbrirForm] = useState({ fisico: '', digital: '' });
  const [movForm, setMovForm] = useState<{ tipo: TipoMovimentacao; valor: string; origem: string }>({
    tipo: 'ENTRADA',
    valor: '',
    origem: '',
  });
  const [fecharForm, setFecharForm] = useState({ fisico: '', digital: '' });

  const saldoAtual = caixaAberto
    ? caixaAberto.saldoFisicoAbertura +
      caixaAberto.saldoDigitalAbertura +
      caixaAberto.movimentacoes.reduce((acc, m) => acc + (m.tipo === 'ENTRADA' ? m.valor : -m.valor), 0)
    : 0;

  function submitAbrir(e: React.FormEvent) {
    e.preventDefault();
    const fisico = Number(abrirForm.fisico);
    const digital = Number(abrirForm.digital);
    if (fisico < 0 || digital < 0 || Number.isNaN(fisico) || Number.isNaN(digital)) {
      alert('Informe saldos válidos (maiores ou iguais a zero).');
      return;
    }
    abrirCaixa(fisico, digital);
    setAbrirForm({ fisico: '', digital: '' });
    setAbrirOpen(false);
  }

  function submitMovimentacao(e: React.FormEvent) {
    e.preventDefault();
    const valor = Number(movForm.valor);
    if (!valor || valor <= 0 || !movForm.origem.trim()) {
      alert('Informe um valor válido e a origem da movimentação.');
      return;
    }
    atualizarCaixa(movForm.tipo, valor, movForm.origem.trim());
    setMovForm({ tipo: 'ENTRADA', valor: '', origem: '' });
    setMovOpen(false);
  }

  function submitFechar(e: React.FormEvent) {
    e.preventDefault();
    const fisico = Number(fecharForm.fisico);
    const digital = Number(fecharForm.digital);
    if (fisico < 0 || digital < 0 || Number.isNaN(fisico) || Number.isNaN(digital)) {
      alert('Informe saldos válidos (maiores ou iguais a zero).');
      return;
    }
    fecharCaixa(fisico, digital);
    setFecharForm({ fisico: '', digital: '' });
    setFecharOpen(false);
  }

  return (
    <div className="flex flex-col gap-6">
      <Card className="p-6">
        {caixaAberto ? (
          <div className="flex flex-col gap-5">
            <div className="flex items-center justify-between flex-wrap gap-3">
              <div>
                <div className="flex items-center gap-2 mb-1">
                  <StatusPill status="ABERTO" />
                  <span className="text-xs text-foreground/50">desde {formatDateTime(caixaAberto.dataAbertura)}</span>
                </div>
                <p className="text-3xl font-semibold tracking-tight tabular-nums">{formatBRL(saldoAtual)}</p>
                <p className="text-xs text-foreground/50 mt-1">Saldo atual (físico + digital)</p>
              </div>
              <div className="flex w-full flex-col gap-2 sm:w-auto sm:flex-row">
                <Button variant="outline" size="md" onClick={() => setMovOpen(true)}>
                  Registrar movimentação
                </Button>
                <Button variant="primary" size="md" iconLeft={<Lock size={16} />} onClick={() => setFecharOpen(true)}>
                  Fechar caixa
                </Button>
              </div>
            </div>
          </div>
        ) : (
          <div className="flex items-center justify-between flex-wrap gap-3">
            <div>
              <StatusPill status="FECHADO" />
              <p className="text-sm text-foreground/50 mt-2">Nenhum caixa aberto no momento.</p>
            </div>
            <Button variant="primary" size="md" iconLeft={<Unlock size={16} />} onClick={() => setAbrirOpen(true)}>
              Abrir caixa
            </Button>
          </div>
        )}
      </Card>

      {caixaAberto && (
        <section className="flex flex-col gap-3">
          <h2 className="text-sm font-semibold">Movimentações do caixa atual</h2>
          <Table>
            <THead
              cols={[
                { label: 'Data', className: 'hidden sm:table-cell' },
                'Tipo',
                { label: 'Valor', className: 'text-right' },
                { label: 'Origem', className: 'hidden md:table-cell' },
              ]}
            />
            <tbody>
              {caixaAberto.movimentacoes.length === 0 && (
                <EmptyRow colSpan={4} label="Nenhuma movimentação registrada neste caixa." />
              )}
              {caixaAberto.movimentacoes.map((m) => (
                <tr key={m.id} className="border-b border-border-line/10 last:border-0">
                  <td className="hidden sm:table-cell px-4 py-3 text-foreground/70 whitespace-nowrap tabular-nums">{formatDateTime(m.data)}</td>
                  <td className="px-4 py-3">
                    <span className={`inline-flex items-center gap-1.5 ${m.tipo === 'ENTRADA' ? 'text-success' : 'text-primary'}`}>
                      {m.tipo === 'ENTRADA' ? <ArrowDownCircle size={14} /> : <ArrowUpCircle size={14} />}
                      {m.tipo === 'ENTRADA' ? 'Entrada' : 'Saída'}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-right font-medium tabular-nums whitespace-nowrap">{formatBRL(m.valor)}</td>
                  <td className="hidden md:table-cell px-4 py-3 text-foreground/70">{m.origem}</td>
                </tr>
              ))}
            </tbody>
          </Table>
        </section>
      )}

      <section className="flex flex-col gap-3">
        <h2 className="text-sm font-semibold">Histórico de caixas</h2>
        <Table>
          <THead
            cols={[
              'Abertura',
              { label: 'Fechamento', className: 'hidden sm:table-cell' },
              { label: 'Situação', className: 'hidden sm:table-cell' },
              { label: 'Saldo final', className: 'text-right' },
            ]}
          />
          <tbody>
            {caixas.map((c) => (
              <tr key={c.id} className="border-b border-border-line/10 last:border-0">
                <td className="px-4 py-3 text-foreground/70 whitespace-nowrap tabular-nums">{formatDateTime(c.dataAbertura)}</td>
                <td className="hidden sm:table-cell px-4 py-3 text-foreground/70 whitespace-nowrap tabular-nums">{formatDateTime(c.dataFechamento)}</td>
                <td className="hidden sm:table-cell px-4 py-3">
                  <StatusPill status={c.status} />
                </td>
                <td className="px-4 py-3 text-right tabular-nums whitespace-nowrap">
                  {c.status === 'FECHADO'
                    ? formatBRL((c.saldoFisicoFechamento ?? 0) + (c.saldoDigitalFechamento ?? 0))
                    : '—'}
                </td>
              </tr>
            ))}
          </tbody>
        </Table>
      </section>

      {/* Abrir caixa */}
      <Modal open={abrirOpen} title="Abrir caixa" onClose={() => setAbrirOpen(false)}>
        <form onSubmit={submitAbrir} className="flex flex-col gap-4">
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <Field label="Saldo físico inicial (R$)">
              <Input type="number" min={0} step="0.01" value={abrirForm.fisico} onChange={(e) => setAbrirForm({ ...abrirForm, fisico: e.target.value })} required />
            </Field>
            <Field label="Saldo digital inicial (R$)">
              <Input type="number" min={0} step="0.01" value={abrirForm.digital} onChange={(e) => setAbrirForm({ ...abrirForm, digital: e.target.value })} required />
            </Field>
          </div>
          <div className="mt-4 flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
            <Button type="button" variant="ghost" size="md" onClick={() => setAbrirOpen(false)}>
              Cancelar
            </Button>
            <Button type="submit" variant="primary" size="md">
              Abrir caixa
            </Button>
          </div>
        </form>
      </Modal>

      {/* Registrar movimentação */}
      <Modal open={movOpen} title="Registrar movimentação" onClose={() => setMovOpen(false)}>
        <form onSubmit={submitMovimentacao} className="flex flex-col gap-4">
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <Field label="Tipo">
              <Select value={movForm.tipo} onChange={(e) => setMovForm({ ...movForm, tipo: e.target.value as TipoMovimentacao })}>
                <option value="ENTRADA">Entrada</option>
                <option value="SAIDA">Saída</option>
              </Select>
            </Field>
            <Field label="Valor (R$)">
              <Input type="number" min={0.01} step="0.01" value={movForm.valor} onChange={(e) => setMovForm({ ...movForm, valor: e.target.value })} required />
            </Field>
          </div>
          <Field label="Origem / observação">
            <Input
              placeholder="ex: compra de alimentos, doação avulsa..."
              value={movForm.origem}
              onChange={(e) => setMovForm({ ...movForm, origem: e.target.value })}
              required
            />
          </Field>
          <div className="mt-4 flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
            <Button type="button" variant="ghost" size="md" onClick={() => setMovOpen(false)}>
              Cancelar
            </Button>
            <Button type="submit" variant="primary" size="md">
              Confirmar
            </Button>
          </div>
        </form>
      </Modal>

      {/* Fechar caixa */}
      <Modal open={fecharOpen} title="Fechar caixa" onClose={() => setFecharOpen(false)}>
        <form onSubmit={submitFechar} className="flex flex-col gap-4">
          <p className="text-sm text-foreground/70">
            Saldo calculado pelo sistema: <strong className="font-medium text-foreground">{formatBRL(saldoAtual)}</strong>. Informe o saldo físico e
            digital conferido para fechar o caixa.
          </p>
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <Field label="Saldo físico final (R$)">
              <Input type="number" min={0} step="0.01" value={fecharForm.fisico} onChange={(e) => setFecharForm({ ...fecharForm, fisico: e.target.value })} required />
            </Field>
            <Field label="Saldo digital final (R$)">
              <Input type="number" min={0} step="0.01" value={fecharForm.digital} onChange={(e) => setFecharForm({ ...fecharForm, digital: e.target.value })} required />
            </Field>
          </div>
          <div className="mt-4 flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
            <Button type="button" variant="ghost" size="md" onClick={() => setFecharOpen(false)}>
              Cancelar
            </Button>
            <Button type="submit" variant="primary" size="md">
              Fechar caixa
            </Button>
          </div>
        </form>
      </Modal>
    </div>
  );
}

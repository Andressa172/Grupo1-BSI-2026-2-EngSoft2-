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
      <p className="text-sm text-foreground/50 max-w-xl">
        Gestão de caixa (RF_F4 / RF_F5 / RF_F6): abra o caixa no início do dia, registre entradas e saídas,
        e feche informando o saldo final para conferência.
      </p>

      <Card className="p-6">
        {caixaAberto ? (
          <div className="flex flex-col gap-5">
            <div className="flex items-center justify-between flex-wrap gap-3">
              <div>
                <div className="flex items-center gap-2 mb-1">
                  <StatusPill status="ABERTO" />
                  <span className="text-xs text-foreground/40">desde {formatDateTime(caixaAberto.dataAbertura)}</span>
                </div>
                <p className="text-3xl font-semibold tracking-tight">{formatBRL(saldoAtual)}</p>
                <p className="text-xs text-foreground/40 mt-1">Saldo atual (físico + digital)</p>
              </div>
              <div className="flex gap-2">
                <Button variant="outline" size="md" onClick={() => setMovOpen(true)}>
                  Registrar Movimentação
                </Button>
                <Button variant="primary" size="md" iconLeft={<Lock size={16} />} onClick={() => setFecharOpen(true)}>
                  Fechar Caixa
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
              Abrir Caixa
            </Button>
          </div>
        )}
      </Card>

      {caixaAberto && (
        <Card className="p-5">
          <h2 className="text-sm font-semibold mb-4">Movimentações do caixa atual</h2>
          <Table>
            <THead cols={['Data', 'Tipo', 'Valor', 'Origem']} />
            <tbody>
              {caixaAberto.movimentacoes.length === 0 && (
                <EmptyRow colSpan={4} label="Nenhuma movimentação registrada neste caixa." />
              )}
              {caixaAberto.movimentacoes.map((m) => (
                <tr key={m.id} className="border-b border-border-line/10 last:border-0">
                  <td className="px-4 py-3 text-foreground/60 whitespace-nowrap">{formatDateTime(m.data)}</td>
                  <td className="px-4 py-3">
                    <span className={`inline-flex items-center gap-1.5 ${m.tipo === 'ENTRADA' ? 'text-green-600' : 'text-primary'}`}>
                      {m.tipo === 'ENTRADA' ? <ArrowDownCircle size={14} /> : <ArrowUpCircle size={14} />}
                      {m.tipo === 'ENTRADA' ? 'Entrada' : 'Saída'}
                    </span>
                  </td>
                  <td className="px-4 py-3 font-medium">{formatBRL(m.valor)}</td>
                  <td className="px-4 py-3 text-foreground/60">{m.origem}</td>
                </tr>
              ))}
            </tbody>
          </Table>
        </Card>
      )}

      <Card className="p-5">
        <h2 className="text-sm font-semibold mb-4">Histórico de caixas</h2>
        <Table>
          <THead cols={['Abertura', 'Fechamento', 'Status', 'Saldo final']} />
          <tbody>
            {caixas.map((c) => (
              <tr key={c.id} className="border-b border-border-line/10 last:border-0">
                <td className="px-4 py-3 text-foreground/60 whitespace-nowrap">{formatDateTime(c.dataAbertura)}</td>
                <td className="px-4 py-3 text-foreground/60 whitespace-nowrap">{formatDateTime(c.dataFechamento)}</td>
                <td className="px-4 py-3">
                  <StatusPill status={c.status} />
                </td>
                <td className="px-4 py-3">
                  {c.status === 'FECHADO'
                    ? formatBRL((c.saldoFisicoFechamento ?? 0) + (c.saldoDigitalFechamento ?? 0))
                    : '—'}
                </td>
              </tr>
            ))}
          </tbody>
        </Table>
      </Card>

      {/* Abrir caixa */}
      <Modal open={abrirOpen} title="Abrir Caixa" onClose={() => setAbrirOpen(false)}>
        <form onSubmit={submitAbrir} className="flex flex-col gap-4">
          <div className="grid grid-cols-2 gap-4">
            <Field label="Saldo físico inicial (R$)">
              <Input type="number" min={0} step="0.01" value={abrirForm.fisico} onChange={(e) => setAbrirForm({ ...abrirForm, fisico: e.target.value })} required />
            </Field>
            <Field label="Saldo digital inicial (R$)">
              <Input type="number" min={0} step="0.01" value={abrirForm.digital} onChange={(e) => setAbrirForm({ ...abrirForm, digital: e.target.value })} required />
            </Field>
          </div>
          <Button type="submit" variant="primary" size="md" className="w-full mt-2">
            Abrir Caixa
          </Button>
        </form>
      </Modal>

      {/* Registrar movimentação */}
      <Modal open={movOpen} title="Registrar Movimentação de Caixa" onClose={() => setMovOpen(false)}>
        <form onSubmit={submitMovimentacao} className="flex flex-col gap-4">
          <div className="grid grid-cols-2 gap-4">
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
          <Button type="submit" variant="primary" size="md" className="w-full mt-2">
            Confirmar
          </Button>
        </form>
      </Modal>

      {/* Fechar caixa */}
      <Modal open={fecharOpen} title="Fechar Caixa" onClose={() => setFecharOpen(false)}>
        <form onSubmit={submitFechar} className="flex flex-col gap-4">
          <p className="text-xs text-foreground/50">
            Saldo calculado pelo sistema: <strong>{formatBRL(saldoAtual)}</strong>. Informe o saldo físico e
            digital conferido para fechar o caixa.
          </p>
          <div className="grid grid-cols-2 gap-4">
            <Field label="Saldo físico final (R$)">
              <Input type="number" min={0} step="0.01" value={fecharForm.fisico} onChange={(e) => setFecharForm({ ...fecharForm, fisico: e.target.value })} required />
            </Field>
            <Field label="Saldo digital final (R$)">
              <Input type="number" min={0} step="0.01" value={fecharForm.digital} onChange={(e) => setFecharForm({ ...fecharForm, digital: e.target.value })} required />
            </Field>
          </div>
          <Button type="submit" variant="primary" size="md" className="w-full mt-2">
            Fechar Caixa
          </Button>
        </form>
      </Modal>
    </div>
  );
}

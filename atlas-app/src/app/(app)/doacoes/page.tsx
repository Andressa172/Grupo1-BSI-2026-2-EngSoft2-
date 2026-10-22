'use client';

import { useState } from 'react';
import { Plus, Trash2 } from 'lucide-react';
import { useAtlas } from '@/lib/store';
import { Button } from '@/components/ui/button';
import { Card, Field, Input, Select, Modal, Table, THead, EmptyRow } from '@/components/app/ui';

function formatBRL(v: number) {
  return v.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
}
function formatDate(iso: string) {
  return new Date(iso).toLocaleDateString('pt-BR');
}

const DOADOR_ANONIMO = '__anonimo__';

export default function DoacoesPage() {
  const {
    produtos,
    doadores,
    doacoesProduto,
    doacoesDinheiro,
    registrarDoacaoProduto,
    registrarDoacaoDinheiro,
    cadastrarDoador,
  } = useAtlas();

  const [tab, setTab] = useState<'produto' | 'dinheiro'>('produto');
  const [modalOpen, setModalOpen] = useState(false);

  // formulário doação de produto
  const [doadorId, setDoadorId] = useState('');
  const [novoDoadorNome, setNovoDoadorNome] = useState('');
  const [itens, setItens] = useState<{ produtoId: string; quantidade: string }[]>([
    { produtoId: produtos[0]?.id ?? '', quantidade: '' },
  ]);

  // formulário doação em dinheiro
  const [valor, setValor] = useState('');
  const [forma, setForma] = useState('PIX');

  function resolverDoador(): string | null {
    if (doadorId === DOADOR_ANONIMO) {
      const anonimo = doadores.find((d) => d.anonimo);
      return anonimo ? anonimo.id : cadastrarDoador({ nome: 'Doador Anônimo', contato: '', anonimo: true }).id;
    }
    if (doadorId === '__novo__') {
      if (!novoDoadorNome.trim()) return null;
      return cadastrarDoador({ nome: novoDoadorNome.trim(), contato: '', anonimo: false }).id;
    }
    return doadorId || null;
  }

  function submitDoacaoProduto(e: React.FormEvent) {
    e.preventDefault();
    const id = resolverDoador();
    const itensValidos = itens
      .filter((i) => i.produtoId && Number(i.quantidade) > 0)
      .map((i) => ({ produtoId: i.produtoId, quantidade: Number(i.quantidade) }));
    if (!id || itensValidos.length === 0) {
      alert('Informe o doador e ao menos um item válido.');
      return;
    }
    registrarDoacaoProduto(id, itensValidos);
    setItens([{ produtoId: produtos[0]?.id ?? '', quantidade: '' }]);
    setDoadorId('');
    setNovoDoadorNome('');
    setModalOpen(false);
  }

  function submitDoacaoDinheiro(e: React.FormEvent) {
    e.preventDefault();
    const id = resolverDoador();
    const v = Number(valor);
    if (!id || !v || v <= 0) {
      alert('Informe o doador e um valor válido.');
      return;
    }
    registrarDoacaoDinheiro(id, v, forma);
    setValor('');
    setDoadorId('');
    setNovoDoadorNome('');
    setModalOpen(false);
  }

  const doadorPorId = (id: string) => doadores.find((d) => d.id === id);

  return (
    <div className="flex flex-col gap-6">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <p className="text-sm text-foreground/50 max-w-xl">
          Registro de doações (RF_F3 / RF_F11): doações de produto atualizam o estoque e doações em
          dinheiro atualizam o caixa automaticamente.
        </p>
        <Button variant="primary" size="md" onClick={() => setModalOpen(true)} iconLeft={<Plus size={16} />}>
          Registrar Doação
        </Button>
      </div>

      <div className="inline-flex items-center gap-2 rounded-full bg-border-line/10 p-1.5 border border-border-line/5 w-fit">
        {(['produto', 'dinheiro'] as const).map((t) => (
          <button
            key={t}
            onClick={() => setTab(t)}
            className={`rounded-full px-4 py-1.5 text-sm font-medium transition-all ${
              tab === t ? 'bg-background text-foreground shadow-sm' : 'text-foreground/50 hover:text-foreground/80'
            }`}
          >
            {t === 'produto' ? 'Doações de Produto' : 'Doações em Dinheiro'}
          </button>
        ))}
      </div>

      {tab === 'produto' ? (
        <Card className="p-0">
          <Table>
            <THead cols={['Data', 'Doador', 'Itens', '']} />
            <tbody>
              {doacoesProduto.length === 0 && <EmptyRow colSpan={4} label="Nenhuma doação de produto registrada." />}
              {doacoesProduto.map((d) => (
                <tr key={d.id} className="border-b border-border-line/10 last:border-0 align-top">
                  <td className="px-4 py-3 text-foreground/60 whitespace-nowrap">{formatDate(d.data)}</td>
                  <td className="px-4 py-3">{doadorPorId(d.doadorId)?.nome ?? '—'}</td>
                  <td className="px-4 py-3">
                    <ul className="space-y-1">
                      {d.itens.map((i, idx) => (
                        <li key={idx} className="text-foreground/70">
                          {produtos.find((p) => p.id === i.produtoId)?.nome ?? i.produtoId} — {i.quantidade}
                        </li>
                      ))}
                    </ul>
                  </td>
                  <td className="px-4 py-3" />
                </tr>
              ))}
            </tbody>
          </Table>
        </Card>
      ) : (
        <Card className="p-0">
          <Table>
            <THead cols={['Data', 'Doador', 'Valor', 'Forma de Recebimento']} />
            <tbody>
              {doacoesDinheiro.length === 0 && <EmptyRow colSpan={4} label="Nenhuma doação em dinheiro registrada." />}
              {doacoesDinheiro.map((d) => (
                <tr key={d.id} className="border-b border-border-line/10 last:border-0">
                  <td className="px-4 py-3 text-foreground/60 whitespace-nowrap">{formatDate(d.data)}</td>
                  <td className="px-4 py-3">{doadorPorId(d.doadorId)?.nome ?? '—'}</td>
                  <td className="px-4 py-3 font-medium text-green-600">{formatBRL(d.valor)}</td>
                  <td className="px-4 py-3 text-foreground/60">{d.formaRecebimento}</td>
                </tr>
              ))}
            </tbody>
          </Table>
        </Card>
      )}

      <Modal open={modalOpen} title="Registrar Doação" onClose={() => setModalOpen(false)}>
        <div className="inline-flex items-center gap-2 rounded-full bg-border-line/10 p-1.5 border border-border-line/5 w-fit mb-5">
          {(['produto', 'dinheiro'] as const).map((t) => (
            <button
              key={t}
              onClick={() => setTab(t)}
              type="button"
              className={`rounded-full px-4 py-1.5 text-xs font-medium transition-all ${
                tab === t ? 'bg-background text-foreground shadow-sm' : 'text-foreground/50 hover:text-foreground/80'
              }`}
            >
              {t === 'produto' ? 'Produto' : 'Dinheiro'}
            </button>
          ))}
        </div>

        <Field label="Doador">
          <Select value={doadorId} onChange={(e) => setDoadorId(e.target.value)} required>
            <option value="" disabled>
              Selecione...
            </option>
            {doadores
              .filter((d) => !d.anonimo)
              .map((d) => (
                <option key={d.id} value={d.id}>
                  {d.nome}
                </option>
              ))}
            <option value={DOADOR_ANONIMO}>Doador anônimo</option>
            <option value="__novo__">+ Cadastrar novo doador</option>
          </Select>
        </Field>

        {doadorId === '__novo__' && (
          <div className="mt-3">
            <Field label="Nome do novo doador">
              <Input value={novoDoadorNome} onChange={(e) => setNovoDoadorNome(e.target.value)} />
            </Field>
          </div>
        )}

        {tab === 'produto' ? (
          <form onSubmit={submitDoacaoProduto} className="flex flex-col gap-4 mt-4">
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
                        value={item.quantidade}
                        onChange={(e) => {
                          const copy = [...itens];
                          copy[idx].quantidade = e.target.value;
                          setItens(copy);
                        }}
                      />
                    </Field>
                  </div>
                  <button
                    type="button"
                    onClick={() => setItens(itens.filter((_, i) => i !== idx))}
                    className="p-2 text-foreground/40 hover:text-primary cursor-pointer"
                    aria-label="Remover item"
                  >
                    <Trash2 size={16} />
                  </button>
                </div>
              ))}
              <button
                type="button"
                onClick={() => setItens([...itens, { produtoId: produtos[0]?.id ?? '', quantidade: '' }])}
                className="text-xs font-medium text-primary hover:underline w-fit"
              >
                + Adicionar outro item
              </button>
            </div>
            <Button type="submit" variant="primary" size="md" className="w-full mt-2">
              Confirmar Doação
            </Button>
          </form>
        ) : (
          <form onSubmit={submitDoacaoDinheiro} className="flex flex-col gap-4 mt-4">
            <div className="grid grid-cols-2 gap-4">
              <Field label="Valor (R$)">
                <Input type="number" min={0.01} step="0.01" value={valor} onChange={(e) => setValor(e.target.value)} />
              </Field>
              <Field label="Forma de recebimento">
                <Select value={forma} onChange={(e) => setForma(e.target.value)}>
                  <option>PIX</option>
                  <option>Dinheiro</option>
                  <option>Transferência</option>
                  <option>Cartão</option>
                </Select>
              </Field>
            </div>
            <Button type="submit" variant="primary" size="md" className="w-full mt-2">
              Confirmar Doação
            </Button>
          </form>
        )}
      </Modal>
    </div>
  );
}

'use client';

/**
 * View de RF_F3 (Receber doação de produto) e RF_F11 (Receber doação em dinheiro).
 * Esta tela só mostra dados e captura o que o funcionário digita: validação,
 * cadastro de doador e registro da doação ficam nos Controls.
 */

import { useState } from 'react';
import { Plus, Trash2 } from 'lucide-react';
import { useAtlas } from '@/lib/store';
import { Button } from '@/components/ui/button';
import { Card, Field, Input, Select, Modal, Table, THead, EmptyRow } from '@/components/app/ui';
import { ControlReceberDoacaoProduto } from '@/control/ControlReceberDoacaoProduto';
import { ControlReceberDoacaoDinheiro } from '@/control/ControlReceberDoacaoDinheiro';
import type { SelecaoDoador } from '@/control/resolverDoador';
import { dataHojeBR, mascaraData, mascaraMoeda, mascaraTelefone } from '@/view/mascaras';

function formatBRL(v: number) {
  return v.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
}
function formatDate(iso: string) {
  return new Date(iso).toLocaleDateString('pt-BR');
}

const DOADOR_ANONIMO = '__anonimo__';
const DOADOR_NOVO = '__novo__';

type ItemForm = { produtoId: string; quantidade: string; dataValidade: string };
const itemVazio = (): ItemForm => ({ produtoId: '', quantidade: '', dataValidade: '' });

function MensagemErro({ texto }: { texto?: string }) {
  if (!texto) return null;
  return <span className="text-xs text-primary mt-1 block">{texto}</span>;
}
const destaque = (erro?: string) => (erro ? 'border-primary!' : '');

export default function DoacoesPage() {
  const atlas = useAtlas();
  const controlProduto = ControlReceberDoacaoProduto.getInstancia();
  const controlDinheiro = ControlReceberDoacaoDinheiro.getInstancia();
  controlProduto.configurar(atlas);
  controlDinheiro.configurar(atlas);

  const doadores = controlProduto.listarDoadores();
  const produtos = controlProduto.listarProdutos();
  const doacoesProduto = controlProduto.listarDoacoes();
  const doacoesDinheiro = controlDinheiro.listarDoacoes();

  const [tab, setTab] = useState<'produto' | 'dinheiro'>('produto');
  const [modalOpen, setModalOpen] = useState(false);
  const [erros, setErros] = useState<Record<string, string>>({});

  // dados do doador (comum às duas doações)
  const [doadorSel, setDoadorSel] = useState('');
  const [novoNome, setNovoNome] = useState('');
  const [novoContato, setNovoContato] = useState('');
  const [dataRecebimento, setDataRecebimento] = useState('');

  // doação de produto
  const [itens, setItens] = useState<ItemForm[]>([itemVazio()]);

  // doação em dinheiro
  const [valor, setValor] = useState('');
  const [forma, setForma] = useState('PIX');

  function abrirModal() {
    setErros({});
    setDoadorSel('');
    setNovoNome('');
    setNovoContato('');
    setDataRecebimento(dataHojeBR());
    setItens([itemVazio()]);
    setValor('');
    setForma('PIX');
    setModalOpen(true);
  }

  function selecaoDoador(): SelecaoDoador {
    if (doadorSel === DOADOR_ANONIMO) return { tipo: 'anonimo' };
    if (doadorSel === DOADOR_NOVO) return { tipo: 'novo', nome: novoNome, contato: novoContato };
    if (doadorSel) return { tipo: 'existente', id: doadorSel };
    return { tipo: 'nenhum' };
  }

  function enviarDoacaoProduto(e: React.FormEvent) {
    e.preventDefault();
    const resultado = controlProduto.registrar({ doador: selecaoDoador(), dataRecebimento, itens });
    setErros(resultado.erros);
    if (resultado.sucesso) setModalOpen(false);
  }

  function enviarDoacaoDinheiro(e: React.FormEvent) {
    e.preventDefault();
    const resultado = controlDinheiro.registrar({
      doador: selecaoDoador(),
      valor,
      formaRecebimento: forma,
      dataRecebimento,
    });
    setErros(resultado.erros);
    if (resultado.sucesso) setModalOpen(false);
  }

  function alterarItem(idx: number, campo: keyof ItemForm, texto: string) {
    setItens(itens.map((item, i) => (i === idx ? { ...item, [campo]: texto } : item)));
  }

  return (
    <div className="flex flex-col gap-6">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <p className="text-sm text-foreground/50 max-w-xl">
          Registro de doações (RF_F3 / RF_F11): doações de produto atualizam o estoque e doações em
          dinheiro atualizam o caixa automaticamente.
        </p>
        <Button variant="primary" size="md" onClick={abrirModal} iconLeft={<Plus size={16} />}>
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
            <THead cols={['Data', 'Doador', 'Itens']} />
            <tbody>
              {doacoesProduto.length === 0 && <EmptyRow colSpan={3} label="Nenhuma doação de produto registrada." />}
              {doacoesProduto.map((d) => (
                <tr key={d.id} className="border-b border-border-line/10 last:border-0 align-top">
                  <td className="px-4 py-3 text-foreground/60 whitespace-nowrap">{formatDate(d.data)}</td>
                  <td className="px-4 py-3">{d.doador}</td>
                  <td className="px-4 py-3">
                    <ul className="space-y-1">
                      {d.itens.map((i, idx) => (
                        <li key={idx} className="text-foreground/70">
                          {i.produto} — {i.quantidade}
                        </li>
                      ))}
                    </ul>
                  </td>
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
                  <td className="px-4 py-3">{d.doador}</td>
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
              onClick={() => {
                setTab(t);
                setErros({});
              }}
              type="button"
              className={`rounded-full px-4 py-1.5 text-xs font-medium transition-all ${
                tab === t ? 'bg-background text-foreground shadow-sm' : 'text-foreground/50 hover:text-foreground/80'
              }`}
            >
              {t === 'produto' ? 'Produto' : 'Dinheiro'}
            </button>
          ))}
        </div>

        <form onSubmit={tab === 'produto' ? enviarDoacaoProduto : enviarDoacaoDinheiro} className="flex flex-col gap-4">
          <div>
            <Field label="Doador *">
              <Select
                value={doadorSel}
                onChange={(e) => setDoadorSel(e.target.value)}
                className={destaque(erros.doador)}
              >
                <option value="" disabled>
                  Selecione...
                </option>
                {doadores.map((d) => (
                  <option key={d.id} value={d.id}>
                    {d.nome}
                  </option>
                ))}
                <option value={DOADOR_ANONIMO}>Doador anônimo</option>
                <option value={DOADOR_NOVO}>+ Cadastrar novo doador</option>
              </Select>
            </Field>
            <MensagemErro texto={erros.doador} />
          </div>

          {doadorSel === DOADOR_NOVO && (
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Field label="Nome do doador *">
                  <Input
                    value={novoNome}
                    onChange={(e) => setNovoNome(e.target.value)}
                    className={destaque(erros['doador.nome'])}
                  />
                </Field>
                <MensagemErro texto={erros['doador.nome']} />
              </div>
              <div>
                <Field label="Contato *">
                  <Input
                    value={novoContato}
                    onChange={(e) => setNovoContato(mascaraTelefone(e.target.value))}
                    placeholder="(18) 99999-9999"
                    className={destaque(erros['doador.contato'])}
                  />
                </Field>
                <MensagemErro texto={erros['doador.contato']} />
              </div>
            </div>
          )}

          <div>
            <Field label="Data de recebimento *">
              <Input
                value={dataRecebimento}
                onChange={(e) => setDataRecebimento(mascaraData(e.target.value))}
                placeholder="dd/mm/aaaa"
                inputMode="numeric"
                className={destaque(erros.dataRecebimento)}
              />
            </Field>
            <MensagemErro texto={erros.dataRecebimento} />
          </div>

          {tab === 'produto' ? (
            <div className="flex flex-col gap-3">
              {itens.map((item, idx) => (
                <div key={idx} className="flex flex-col gap-2 rounded-lg border border-border-line/15 p-3">
                  <div className="flex items-start gap-2">
                    <div className="flex-1">
                      <Field label="Produto *">
                        <Select
                          value={item.produtoId}
                          onChange={(e) => alterarItem(idx, 'produtoId', e.target.value)}
                          className={destaque(erros[`item.${idx}.produto`])}
                        >
                          <option value="" disabled>
                            Selecione...
                          </option>
                          {produtos.map((p) => (
                            <option key={p.id} value={p.id}>
                              {p.nome}
                            </option>
                          ))}
                        </Select>
                      </Field>
                      <MensagemErro texto={erros[`item.${idx}.produto`]} />
                    </div>
                    <button
                      type="button"
                      onClick={() => setItens(itens.length > 1 ? itens.filter((_, i) => i !== idx) : [itemVazio()])}
                      className="mt-6 p-2 text-foreground/40 hover:text-primary cursor-pointer"
                      aria-label="Remover item"
                    >
                      <Trash2 size={16} />
                    </button>
                  </div>
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <Field label="Quantidade *">
                        <Input
                          inputMode="numeric"
                          value={item.quantidade}
                          onChange={(e) => alterarItem(idx, 'quantidade', e.target.value.replace(/\D/g, ''))}
                          className={destaque(erros[`item.${idx}.quantidade`])}
                        />
                      </Field>
                      <MensagemErro texto={erros[`item.${idx}.quantidade`]} />
                    </div>
                    <div>
                      <Field label="Data de validade">
                        <Input
                          value={item.dataValidade}
                          onChange={(e) => alterarItem(idx, 'dataValidade', mascaraData(e.target.value))}
                          placeholder="dd/mm/aaaa"
                          inputMode="numeric"
                          className={destaque(erros[`item.${idx}.dataValidade`])}
                        />
                      </Field>
                      <MensagemErro texto={erros[`item.${idx}.dataValidade`]} />
                    </div>
                  </div>
                </div>
              ))}
              <MensagemErro texto={erros.itens} />
              <button
                type="button"
                onClick={() => setItens([...itens, itemVazio()])}
                className="text-xs font-medium text-primary hover:underline w-fit"
              >
                + Adicionar outro item
              </button>
            </div>
          ) : (
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Field label="Valor (R$) *">
                  <Input
                    inputMode="numeric"
                    value={valor}
                    onChange={(e) => setValor(mascaraMoeda(e.target.value))}
                    placeholder="0,00"
                    className={destaque(erros.valor)}
                  />
                </Field>
                <MensagemErro texto={erros.valor} />
              </div>
              <div>
                <Field label="Forma de recebimento *">
                  <Select
                    value={forma}
                    onChange={(e) => setForma(e.target.value)}
                    className={destaque(erros.formaRecebimento)}
                  >
                    <option>Dinheiro</option>
                    <option>PIX</option>
                    <option>Transferência</option>
                  </Select>
                </Field>
                <MensagemErro texto={erros.formaRecebimento} />
              </div>
            </div>
          )}

          <Button type="submit" variant="primary" size="md" className="w-full mt-2">
            Confirmar Doação
          </Button>
        </form>
      </Modal>
    </div>
  );
}

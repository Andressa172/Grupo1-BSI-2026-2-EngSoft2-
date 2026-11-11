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
import { Field, Input, Select, Modal, Table, THead, EmptyRow } from '@/components/app/ui';
import { ControlReceberDoacaoProduto, type DadosFiltroDoacao } from '@/control/ControlReceberDoacaoProduto';
import { ControlReceberDoacaoDinheiro } from '@/control/ControlReceberDoacaoDinheiro';
import type { SelecaoDoador } from '@/control/resolverDoador';
import { dataHojeBR, mascaraMoeda, mascaraTelefone } from '@/view/mascaras';
import { CampoData } from '@/view/CampoData';

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

const COLUNAS_PRODUTO = [{ label: 'Data', className: 'hidden sm:table-cell' }, 'Doador', 'Itens'];
const COLUNAS_DINHEIRO = [
  { label: 'Data', className: 'hidden sm:table-cell' },
  'Doador',
  { label: 'Valor', className: 'text-right' },
  { label: 'Forma de recebimento', className: 'hidden md:table-cell' },
];

// abas em formato de pílula; a selecionada fica com fundo claro
function classeAba(ativa: boolean, pequena = false) {
  return `rounded-full px-4 py-1.5 ${pequena ? 'text-xs' : 'text-sm'} font-medium cursor-pointer transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/40 ${
    ativa ? 'bg-background text-foreground shadow-sm' : 'text-foreground/50 hover:text-foreground'
  }`;
}

export default function DoacoesPage() {
  const atlas = useAtlas();
  const controlProduto = ControlReceberDoacaoProduto.getInstancia();
  const controlDinheiro = ControlReceberDoacaoDinheiro.getInstancia();
  controlProduto.configurar(atlas);
  controlDinheiro.configurar(atlas);

  const doadores = controlProduto.listarDoadores();
  const produtos = controlProduto.listarProdutos();

  // consulta (RF_F3/RF_F11): filtro digitado x filtro aplicado ao clicar em Consultar
  const filtroVazio: DadosFiltroDoacao = { doadorId: '', dataInicial: '', dataFinal: '' };
  const [filtro, setFiltro] = useState<DadosFiltroDoacao>(filtroVazio);
  const [filtroAplicado, setFiltroAplicado] = useState<DadosFiltroDoacao>(filtroVazio);
  const [errosFiltro, setErrosFiltro] = useState<Record<string, string>>({});
  const doacoesProduto = controlProduto.consultarDoacoes(filtroAplicado);
  const doacoesDinheiro = controlDinheiro.consultarDoacoes(filtroAplicado);

  function consultar(e: React.FormEvent) {
    e.preventDefault();
    const e2 = controlProduto.validarFiltro(filtro);
    setErrosFiltro(e2);
    if (Object.keys(e2).length === 0) setFiltroAplicado(filtro);
  }

  function limparFiltro() {
    setFiltro(filtroVazio);
    setFiltroAplicado(filtroVazio);
    setErrosFiltro({});
  }

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
      <div className="flex flex-col-reverse gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div role="tablist" aria-label="Tipo de doação" className="inline-flex items-center gap-1 rounded-full bg-border-line/10 p-1 w-fit">
          {(['produto', 'dinheiro'] as const).map((t) => (
            <button key={t} type="button" role="tab" aria-selected={tab === t} onClick={() => setTab(t)} className={classeAba(tab === t)}>
              {t === 'produto' ? 'Produtos' : 'Dinheiro'}
            </button>
          ))}
        </div>
        <Button variant="primary" size="md" onClick={abrirModal} iconLeft={<Plus size={16} />}>
          Registrar doação
        </Button>
      </div>

      <form onSubmit={consultar} className="grid grid-cols-2 gap-3 sm:flex sm:flex-wrap sm:items-start">
        <div className="col-span-2 sm:min-w-48">
          <Field label="Doador">
            <Select value={filtro.doadorId} onChange={(e) => setFiltro({ ...filtro, doadorId: e.target.value })}>
              <option value="">Todos</option>
              {doadores.map((d) => (
                <option key={d.id} value={d.id}>
                  {d.nome}
                </option>
              ))}
            </Select>
          </Field>
        </div>
        <div className="sm:w-36">
          <Field label="Data inicial">
            <CampoData value={filtro.dataInicial} onChange={(t) => setFiltro({ ...filtro, dataInicial: t })} className={destaque(errosFiltro.dataInicial)} />
          </Field>
          <MensagemErro texto={errosFiltro.dataInicial} />
        </div>
        <div className="sm:w-36">
          <Field label="Data final">
            <CampoData value={filtro.dataFinal} onChange={(t) => setFiltro({ ...filtro, dataFinal: t })} className={destaque(errosFiltro.dataFinal)} />
          </Field>
          <MensagemErro texto={errosFiltro.dataFinal} />
        </div>
        <div className="col-span-2 flex gap-2 sm:mt-5.5">
          <Button type="submit" variant="outline" size="md">
            Consultar
          </Button>
          <Button type="button" variant="ghost" size="md" onClick={limparFiltro}>
            Limpar
          </Button>
        </div>
      </form>

      {tab === 'produto' ? (
        <Table>
            <THead cols={COLUNAS_PRODUTO} />
            <tbody>
              {doacoesProduto.length === 0 && (
                <EmptyRow colSpan={COLUNAS_PRODUTO.length} label="Nenhuma doação de produto encontrada." />
              )}
              {doacoesProduto.map((d) => (
                <tr key={d.id} className="border-b border-border-line/10 last:border-0 align-top">
                  <td className="hidden sm:table-cell px-4 py-3 text-foreground/70 whitespace-nowrap tabular-nums">{formatDate(d.data)}</td>
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
      ) : (
          <Table>
            <THead cols={COLUNAS_DINHEIRO} />
            <tbody>
              {doacoesDinheiro.length === 0 && (
                <EmptyRow colSpan={COLUNAS_DINHEIRO.length} label="Nenhuma doação em dinheiro encontrada." />
              )}
              {doacoesDinheiro.map((d) => (
                <tr key={d.id} className="border-b border-border-line/10 last:border-0">
                  <td className="hidden sm:table-cell px-4 py-3 text-foreground/70 whitespace-nowrap tabular-nums">{formatDate(d.data)}</td>
                  <td className="px-4 py-3">{d.doador}</td>
                  <td className="px-4 py-3 text-right font-medium text-success tabular-nums whitespace-nowrap">{formatBRL(d.valor)}</td>
                  <td className="hidden md:table-cell px-4 py-3 text-foreground/70">{d.formaRecebimento}</td>
                </tr>
              ))}
            </tbody>
          </Table>
      )}

      <Modal open={modalOpen} title="Registrar doação" onClose={() => setModalOpen(false)}>
        <div role="tablist" aria-label="Tipo de doação" className="inline-flex items-center gap-1 rounded-full bg-border-line/10 p-1 w-fit mb-5">
          {(['produto', 'dinheiro'] as const).map((t) => (
            <button
              key={t}
              onClick={() => {
                setTab(t);
                setErros({});
              }}
              type="button"
              role="tab"
              aria-selected={tab === t}
              className={classeAba(tab === t, true)}
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
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
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
              <CampoData value={dataRecebimento} onChange={(t) => setDataRecebimento(t)} className={destaque(erros.dataRecebimento)} />
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
                      className="mt-6 rounded-md p-2 text-foreground/50 hover:text-primary hover:bg-foreground/5 cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/40"
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
                        <CampoData value={item.dataValidade} onChange={(t) => alterarItem(idx, 'dataValidade', t)} className={destaque(erros[`item.${idx}.dataValidade`])} />
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
                className="inline-flex items-center gap-1.5 text-xs font-medium text-primary hover:underline w-fit cursor-pointer"
              >
                <Plus size={14} aria-hidden />
                Adicionar outro item
              </button>
            </div>
          ) : (
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
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

          <div className="mt-4 flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
            <Button type="button" variant="ghost" size="md" onClick={() => setModalOpen(false)}>
              Cancelar
            </Button>
            <Button type="submit" variant="primary" size="md">
              Confirmar doação
            </Button>
          </div>
        </form>
      </Modal>
    </div>
  );
}

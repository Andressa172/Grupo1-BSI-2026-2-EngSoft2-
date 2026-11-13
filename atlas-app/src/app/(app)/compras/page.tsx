'use client';

/**
 * View de RF_F2 (Lançar entrada de compras).
 * Esta tela só mostra dados e captura o que o gerente digita. Ela conversa APENAS com a API
 * (/api/compras), que chama o Control no servidor. Validação, nota duplicada, entrada no
 * estoque (RF_F1) e gravação no banco ficam do lado do servidor.
 * O total mostrado aqui é só para o gerente conferir (passo 6); quem calcula o que é gravado é o servidor.
 */

import { useEffect, useState } from 'react';
import { Plus, Trash2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Field, Input, Select, Modal, Table, THead, EmptyRow } from '@/components/app/ui';
import { dataHojeBR, mascaraMoeda } from '@/view/mascaras';
import { CampoData } from '@/view/CampoData';

function formatBRL(v: number) {
  return v.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
}
// aaaa-mm-dd (banco) -> dd/mm/aaaa (tela)
function formatDate(iso: string) {
  const [a, m, d] = iso.slice(0, 10).split('-');
  return d && m && a ? `${d}/${m}/${a}` : iso;
}
// "1.234,56" (máscara) -> centavos inteiros; NaN se vazio
function centavos(texto: string): number {
  const d = texto.replace(/\D/g, '');
  return d === '' ? NaN : Number(d);
}

// tipos do que a API devolve
interface ProdutoApi { id: number; nome: string; unidadeMedida: string }
interface CompraApi {
  id: number;
  numeroNF: string;
  data: string;
  fornecedor: string;
  valorTotal: number;
  itens: { produto: string; unidadeMedida: string; quantidade: number; valorUnitario: number; dataValidade: string | null }[];
}
interface DadosFiltroCompra { numeroNF: string; fornecedor: string; dataInicial: string; dataFinal: string }

function montarParametros(f: DadosFiltroCompra): string {
  const p = new URLSearchParams();
  (Object.keys(f) as (keyof DadosFiltroCompra)[]).forEach((k) => {
    if (f[k].trim() !== '') p.set(k, f[k].trim());
  });
  return p.toString();
}

// resposta de erro da API: { erro, erros? } -> mapa campo -> mensagem
async function lerErros(resposta: Response): Promise<Record<string, string>> {
  try {
    const corpo = await resposta.json();
    if (corpo.erros && typeof corpo.erros === 'object') return corpo.erros as Record<string, string>;
    return { geral: typeof corpo.erro === 'string' ? corpo.erro : 'Não foi possível concluir a operação.' };
  } catch {
    return { geral: 'Não foi possível concluir a operação.' };
  }
}

type ItemForm = { produtoId: string; quantidade: string; valorUnitario: string; dataValidade: string };
const itemVazio = (): ItemForm => ({ produtoId: '', quantidade: '', valorUnitario: '', dataValidade: '' });

function MensagemErro({ texto }: { texto?: string }) {
  if (!texto) return null;
  return <span className="text-xs text-primary mt-1 block">{texto}</span>;
}
const destaque = (erro?: string) => (erro ? 'border-primary!' : '');

const COLUNAS = [
  { label: 'Data', className: 'hidden sm:table-cell' },
  'Nota fiscal',
  { label: 'Fornecedor', className: 'hidden md:table-cell' },
  'Itens',
  { label: 'Total', className: 'text-right' },
];
const COLUNAS_RESUMO = ['Produto', { label: 'Qtd.', className: 'text-right' }, { label: 'Unitário', className: 'text-right' }, { label: 'Total', className: 'text-right' }];

export default function ComprasPage() {
  const [produtos, setProdutos] = useState<ProdutoApi[]>([]);
  const [compras, setCompras] = useState<CompraApi[]>([]);
  const [erroCarga, setErroCarga] = useState('');
  const [aviso, setAviso] = useState('');
  const [salvando, setSalvando] = useState(false);
  const [recarregar, setRecarregar] = useState(0); // muda após registrar, para refazer as consultas

  // consulta: filtro digitado x filtro aplicado ao clicar em Consultar
  const filtroVazio: DadosFiltroCompra = { numeroNF: '', fornecedor: '', dataInicial: '', dataFinal: '' };
  const [filtro, setFiltro] = useState<DadosFiltroCompra>(filtroVazio);
  const [filtroAplicado, setFiltroAplicado] = useState<DadosFiltroCompra>(filtroVazio);
  const [errosFiltro, setErrosFiltro] = useState<Record<string, string>>({});

  // lançamento: 'editar' = passos 1 a 5; 'confirmar' = passos 6 e 7 (total e confirmação)
  const [modalOpen, setModalOpen] = useState(false);
  const [etapa, setEtapa] = useState<'editar' | 'confirmar'>('editar');
  const [erros, setErros] = useState<Record<string, string>>({});
  const [numeroNF, setNumeroNF] = useState('');
  const [dataCompra, setDataCompra] = useState('');
  const [fornecedor, setFornecedor] = useState('');
  const [itens, setItens] = useState<ItemForm[]>([itemVazio()]);

  // lista de produtos do campo de seleção (carrega quando a tela abre)
  useEffect(() => {
    let cancelado = false;
    fetch('/api/produtos')
      .then(async (r) => {
        if (!r.ok) throw new Error('falha');
        const p = (await r.json()) as ProdutoApi[];
        if (!cancelado) setProdutos(p);
      })
      .catch(() => {
        if (!cancelado) setErroCarga('Não foi possível carregar os produtos. Confira se o banco de dados está no ar.');
      });
    return () => {
      cancelado = true;
    };
  }, []);

  // compras lançadas, de acordo com o filtro aplicado
  useEffect(() => {
    let cancelado = false;
    fetch(`/api/compras?${montarParametros(filtroAplicado)}`)
      .then(async (r) => {
        if (!r.ok) throw new Error('falha');
        const c = (await r.json()) as CompraApi[];
        if (cancelado) return;
        setCompras(c);
        setErroCarga('');
      })
      .catch(() => {
        if (!cancelado) setErroCarga('Não foi possível carregar as compras. Confira se o banco de dados está no ar.');
      });
    return () => {
      cancelado = true;
    };
  }, [filtroAplicado, recarregar]);

  async function consultar(e: React.FormEvent) {
    e.preventDefault();
    // o servidor valida o filtro; se houver erro, mostra ao lado do campo
    try {
      const resposta = await fetch(`/api/compras?${montarParametros(filtro)}`);
      if (!resposta.ok) {
        setErrosFiltro(await lerErros(resposta));
        return;
      }
      setErrosFiltro({});
      setFiltroAplicado(filtro);
    } catch {
      setErrosFiltro({ geral: 'Não foi possível consultar agora.' });
    }
  }

  function limparFiltro() {
    setFiltro(filtroVazio);
    setFiltroAplicado(filtroVazio);
    setErrosFiltro({});
  }

  function abrirModal() {
    setErros({});
    setEtapa('editar');
    setNumeroNF('');
    setDataCompra(dataHojeBR());
    setFornecedor('');
    setItens([itemVazio()]);
    setModalOpen(true);
  }

  function alterarItem(idx: number, campo: keyof ItemForm, texto: string) {
    setItens(itens.map((item, i) => (i === idx ? { ...item, [campo]: texto } : item)));
  }

  // passo 4: total do item; passo 6: total da compra (em centavos, para não errar a soma)
  const totalItemEmCentavos = (item: ItemForm) => {
    const qtd = Number(item.quantidade);
    const unit = centavos(item.valorUnitario);
    return Number.isInteger(qtd) && qtd > 0 && Number.isFinite(unit) ? qtd * unit : 0;
  };
  const totalCompra = itens.reduce((soma, item) => soma + totalItemEmCentavos(item), 0) / 100;
  const nomeProduto = (id: string) => produtos.find((p) => String(p.id) === id)?.nome ?? '—';

  // passos 5 a 7: só vai para a confirmação se todos os itens estiverem preenchidos
  function revisar(e: React.FormEvent) {
    e.preventDefault();
    const faltando: Record<string, string> = {};
    if (!numeroNF.trim()) faltando.numeroNF = 'Informe o número da nota fiscal.';
    if (!fornecedor.trim()) faltando.fornecedor = 'Informe o fornecedor.';
    itens.forEach((item, i) => {
      if (!item.produtoId) faltando[`item.${i}.produto`] = 'Selecione o produto.';
      if (!item.quantidade) faltando[`item.${i}.quantidade`] = 'Informe a quantidade.';
      if (!item.valorUnitario) faltando[`item.${i}.valorUnitario`] = 'Informe o valor unitário.';
    });
    setErros(faltando);
    if (Object.keys(faltando).length === 0) setEtapa('confirmar');
  }

  // passo 8: o gerente confirmou; o servidor valida tudo de novo e grava (passos 9 a 11)
  async function confirmar() {
    setSalvando(true);
    try {
      const resposta = await fetch('/api/compras', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ numeroNF, dataCompra, fornecedor, itens }),
      });
      if (!resposta.ok) {
        // volta para a edição com os campos destacados
        setErros(await lerErros(resposta));
        setEtapa('editar');
        return;
      }
      const registrada = (await resposta.json()) as { numeroNF: string; valorTotal: number };
      setModalOpen(false);
      setAviso(`Compra da NF ${registrada.numeroNF} lançada (${formatBRL(registrada.valorTotal)}). Estoque atualizado.`);
      setRecarregar((n) => n + 1);
    } catch {
      setErros({ geral: 'Não foi possível registrar. Confira se o banco de dados está no ar.' });
      setEtapa('editar');
    } finally {
      setSalvando(false);
    }
  }

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-col sm:flex-row sm:justify-end">
        <Button variant="primary" size="md" onClick={abrirModal} iconLeft={<Plus size={16} />}>
          Lançar compra
        </Button>
      </div>

      {erroCarga && <p className="text-sm text-primary">{erroCarga}</p>}
      {aviso && <p className="text-sm text-foreground/70">{aviso}</p>}

      <form onSubmit={consultar} className="grid grid-cols-2 gap-3 sm:flex sm:flex-wrap sm:items-start">
        <div className="sm:w-40">
          <Field label="Nota fiscal">
            <Input value={filtro.numeroNF} onChange={(e) => setFiltro({ ...filtro, numeroNF: e.target.value })} className={destaque(errosFiltro.numeroNF)} />
          </Field>
          <MensagemErro texto={errosFiltro.numeroNF} />
        </div>
        <div className="sm:min-w-48">
          <Field label="Fornecedor">
            <Input value={filtro.fornecedor} onChange={(e) => setFiltro({ ...filtro, fornecedor: e.target.value })} className={destaque(errosFiltro.fornecedor)} />
          </Field>
          <MensagemErro texto={errosFiltro.fornecedor} />
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
      <MensagemErro texto={errosFiltro.geral} />

      <Table>
        <THead cols={COLUNAS} />
        <tbody>
          {compras.length === 0 && <EmptyRow colSpan={COLUNAS.length} label="Nenhuma compra encontrada." />}
          {compras.map((c) => (
            <tr key={c.id} className="border-b border-border-line/10 last:border-0 align-top">
              <td className="hidden sm:table-cell px-4 py-3 text-foreground/70 whitespace-nowrap tabular-nums">{formatDate(c.data)}</td>
              <td className="px-4 py-3 font-medium">{c.numeroNF}</td>
              <td className="hidden md:table-cell px-4 py-3">{c.fornecedor}</td>
              <td className="px-4 py-3">
                <ul className="space-y-1">
                  {c.itens.map((i, idx) => (
                    <li key={idx} className="text-foreground/70">
                      {i.produto} — {i.quantidade} {i.unidadeMedida} × {formatBRL(i.valorUnitario)}
                    </li>
                  ))}
                </ul>
              </td>
              <td className="px-4 py-3 text-right font-medium tabular-nums whitespace-nowrap">{formatBRL(c.valorTotal)}</td>
            </tr>
          ))}
        </tbody>
      </Table>

      <Modal open={modalOpen} title={etapa === 'editar' ? 'Lançar compra' : 'Confirmar compra'} onClose={() => setModalOpen(false)}>
        {etapa === 'editar' ? (
          <form onSubmit={revisar} className="flex flex-col gap-4">
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <div>
                <Field label="Número da nota fiscal *">
                  <Input value={numeroNF} maxLength={60} onChange={(e) => setNumeroNF(e.target.value)} className={destaque(erros.numeroNF)} />
                </Field>
                <MensagemErro texto={erros.numeroNF} />
              </div>
              <div>
                <Field label="Data da compra *">
                  <CampoData value={dataCompra} onChange={(t) => setDataCompra(t)} className={destaque(erros.dataCompra)} />
                </Field>
                <MensagemErro texto={erros.dataCompra} />
              </div>
            </div>
            <div>
              <Field label="Fornecedor *">
                <Input value={fornecedor} maxLength={120} onChange={(e) => setFornecedor(e.target.value)} className={destaque(erros.fornecedor)} />
              </Field>
              <MensagemErro texto={erros.fornecedor} />
            </div>

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
                  <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
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
                      <Field label="Valor unitário (R$) *">
                        <Input
                          inputMode="numeric"
                          placeholder="0,00"
                          value={item.valorUnitario}
                          onChange={(e) => alterarItem(idx, 'valorUnitario', mascaraMoeda(e.target.value))}
                          className={destaque(erros[`item.${idx}.valorUnitario`])}
                        />
                      </Field>
                      <MensagemErro texto={erros[`item.${idx}.valorUnitario`]} />
                    </div>
                    <div className="col-span-2 sm:col-span-1">
                      <Field label="Data de validade">
                        <CampoData value={item.dataValidade} onChange={(t) => alterarItem(idx, 'dataValidade', t)} className={destaque(erros[`item.${idx}.dataValidade`])} />
                      </Field>
                      <MensagemErro texto={erros[`item.${idx}.dataValidade`]} />
                    </div>
                  </div>
                  <p className="text-xs text-foreground/60 text-right tabular-nums">
                    Total do item: {formatBRL(totalItemEmCentavos(item) / 100)}
                  </p>
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

            <p className="text-sm text-right">
              Total da compra: <strong className="font-semibold tabular-nums">{formatBRL(totalCompra)}</strong>
            </p>

            <MensagemErro texto={erros.geral} />
            <div className="mt-2 flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
              <Button type="button" variant="ghost" size="md" onClick={() => setModalOpen(false)}>
                Cancelar
              </Button>
              <Button type="submit" variant="primary" size="md">
                Revisar compra
              </Button>
            </div>
          </form>
        ) : (
          <div className="flex flex-col gap-4">
            <dl className="grid grid-cols-1 gap-2 text-sm sm:grid-cols-3">
              <div>
                <dt className="text-xs text-foreground/50">Nota fiscal</dt>
                <dd className="font-medium">{numeroNF}</dd>
              </div>
              <div>
                <dt className="text-xs text-foreground/50">Data da compra</dt>
                <dd className="font-medium tabular-nums">{dataCompra}</dd>
              </div>
              <div>
                <dt className="text-xs text-foreground/50">Fornecedor</dt>
                <dd className="font-medium">{fornecedor}</dd>
              </div>
            </dl>
            <Table>
              <THead cols={COLUNAS_RESUMO} />
              <tbody>
                {itens.map((item, idx) => (
                  <tr key={idx} className="border-b border-border-line/10 last:border-0">
                    <td className="px-4 py-2">{nomeProduto(item.produtoId)}</td>
                    <td className="px-4 py-2 text-right tabular-nums">{item.quantidade}</td>
                    <td className="px-4 py-2 text-right tabular-nums">R$ {item.valorUnitario}</td>
                    <td className="px-4 py-2 text-right tabular-nums">{formatBRL(totalItemEmCentavos(item) / 100)}</td>
                  </tr>
                ))}
              </tbody>
            </Table>
            <p className="text-sm text-right">
              Total da compra: <strong className="font-semibold tabular-nums">{formatBRL(totalCompra)}</strong>
            </p>
            <p className="text-xs text-foreground/60">Ao confirmar, a compra é registrada e os produtos entram no estoque.</p>
            <div className="mt-2 flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
              <Button type="button" variant="ghost" size="md" onClick={() => setEtapa('editar')} disabled={salvando}>
                Voltar e corrigir
              </Button>
              <Button type="button" variant="primary" size="md" onClick={confirmar} disabled={salvando}>
                {salvando ? 'Registrando...' : 'Confirmar registro'}
              </Button>
            </div>
          </div>
        )}
      </Modal>
    </div>
  );
}

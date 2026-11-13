'use client';

/**
 * Tela de Cardápios Diários (RF_F10 - Criar Cardápio Diário)
 * Cria o cardápio do dia com os alimentos utilizados, via /api/cardapios.
 */

import { useEffect, useState } from 'react';
import { Plus, Trash2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Field, Input, Select, Modal, Table, THead, EmptyRow, LoadingRows } from '@/components/app/ui';

interface Produto {
  id: number;
  nome: string;
  unidade_medida: string;
  quantidade_estoque: number;
}

interface ItemCardapio {
  id: number;
  produtoId: number;
  quantidadeUtilizada: number;
}

interface CardapioComItens {
  cardapio: { id: number; data: string; tipoRefeicao: string };
  itens: ItemCardapio[];
}

type LinhaItemForm = { produtoId: string; quantidade: string };

const ITEM_VAZIO: LinhaItemForm = { produtoId: '', quantidade: '' };

const LABEL_REFEICAO: Record<string, string> = {
  CAFE_DA_MANHA: 'Café da manhã',
  ALMOCO: 'Almoço',
  LANCHE: 'Lanche',
  JANTAR: 'Jantar',
};

function formatarData(data: string) {
  return new Date(data + 'T00:00:00').toLocaleDateString('pt-BR');
}

// a coluna de data some em telas estreitas
const COLUNAS = [{ label: 'Data', className: 'hidden sm:table-cell' }, 'Refeição', 'Alimentos utilizados'];

export default function CardapiosPage() {
  const [cardapios, setCardapios] = useState<CardapioComItens[]>([]);
  const [produtos, setProdutos] = useState<Produto[]>([]);
  const [modalAberto, setModalAberto] = useState(false);
  const [erro, setErro] = useState('');

  const [dadosCardapio, setDadosCardapio] = useState({ data: '', tipoRefeicao: 'CAFE_DA_MANHA' });
  const [itens, setItens] = useState<LinhaItemForm[]>([{ ...ITEM_VAZIO }]);

  const [estado, setEstado] = useState<'carregando' | 'pronto' | 'erro'>('carregando');

  // falha no servidor vira estado de erro, não lista vazia
  async function carregar() {
    const resposta = await fetch('/api/cardapios').catch(() => null);
    if (!resposta?.ok) {
      setEstado('erro');
      return;
    }
    const dados = await resposta.json();
    setEstado('pronto');
    setCardapios(dados.cardapios);
    setProdutos(dados.produtos);
  }

  useEffect(() => {
    fetch('/api/cardapios')
      .then((resposta) => {
        if (!resposta.ok) throw new Error();
        return resposta.json();
      })
      .then((dados) => {
        setEstado('pronto');
        setCardapios(dados.cardapios);
        setProdutos(dados.produtos);
      })
      .catch(() => setEstado('erro'));
  }, []);

  function abrirNovo() {
    setDadosCardapio({ data: '', tipoRefeicao: 'CAFE_DA_MANHA' });
    setItens([{ ...ITEM_VAZIO }]);
    setErro('');
    setModalAberto(true);
  }

  function atualizarItem(indice: number, mudanca: Partial<LinhaItemForm>) {
    setItens((atual) => atual.map((item, i) => (i === indice ? { ...item, ...mudanca } : item)));
  }

  async function salvar(e: React.FormEvent) {
    e.preventDefault();
    setErro('');

    const corpo = {
      cardapio: dadosCardapio,
      itens: itens.map((item) => ({
        produtoId: Number(item.produtoId) || null,
        quantidadeUtilizada: Number(item.quantidade) || null,
      })),
    };

    const resposta = await fetch('/api/cardapios', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(corpo),
    });

    if (resposta.ok) {
      setModalAberto(false);
      carregar();
    } else {
      const corpoErro = await resposta.json();
      setErro(corpoErro.erro);
    }
  }

  function nomeProduto(produtoId: number) {
    return produtos.find((p) => p.id === produtoId)?.nome ?? `Alimento #${produtoId}`;
  }

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-col sm:flex-row sm:justify-end">
        <Button variant="primary" size="md" onClick={abrirNovo} iconLeft={<Plus size={16} />}>
          Novo cardápio
        </Button>
      </div>

      <Table>
          <THead cols={COLUNAS} />
          <tbody>
            {estado === 'carregando' && <LoadingRows colSpan={COLUNAS.length} />}
            {estado === 'erro' && (
              <EmptyRow colSpan={COLUNAS.length}>
                Não foi possível carregar os dados.{' '}
                <button type="button" onClick={carregar} className="font-medium text-foreground underline underline-offset-2 cursor-pointer hover:text-primary">
                  Tentar de novo
                </button>
              </EmptyRow>
            )}
            {estado === 'pronto' && cardapios.length === 0 && <EmptyRow colSpan={COLUNAS.length} label="Nenhum cardápio cadastrado ainda." />}
            {estado === 'pronto' && cardapios.map(({ cardapio, itens: itensDoCardapio }) => (
              <tr key={cardapio.id} className="border-b border-border-line/10 last:border-0 align-top">
                <td className="hidden sm:table-cell px-4 py-3 text-foreground/70 whitespace-nowrap tabular-nums">{formatarData(cardapio.data)}</td>
                <td className="px-4 py-3 font-medium">{LABEL_REFEICAO[cardapio.tipoRefeicao] ?? cardapio.tipoRefeicao}</td>
                <td className="px-4 py-3">
                  <ul className="space-y-1">
                    {itensDoCardapio.map((item) => (
                      <li key={item.id} className="text-foreground/70">
                        {nomeProduto(item.produtoId)} — {item.quantidadeUtilizada}
                      </li>
                    ))}
                  </ul>
                </td>
              </tr>
            ))}
          </tbody>
        </Table>

      <Modal open={modalAberto} title="Novo cardápio" onClose={() => setModalAberto(false)}>
        <form onSubmit={salvar} className="flex flex-col gap-4">
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <Field label="Data do cardápio">
              <Input
                type="date"
                value={dadosCardapio.data}
                onChange={(e) => setDadosCardapio({ ...dadosCardapio, data: e.target.value })}
                required
              />
            </Field>
            <Field label="Tipo de refeição">
              <Select
                value={dadosCardapio.tipoRefeicao}
                onChange={(e) => setDadosCardapio({ ...dadosCardapio, tipoRefeicao: e.target.value })}
              >
                <option value="CAFE_DA_MANHA">Café da manhã</option>
                <option value="ALMOCO">Almoço</option>
                <option value="LANCHE">Lanche</option>
                <option value="JANTAR">Jantar</option>
              </Select>
            </Field>
          </div>

          <div className="flex flex-col gap-3 border-t border-border-line/10 pt-4">
            <span className="text-xs font-semibold text-foreground">Alimentos utilizados</span>
            {itens.map((item, indice) => (
              <div key={indice} className="flex items-end gap-2">
                <div className="flex-1">
                  <Field label={indice === 0 ? 'Alimento' : ''}>
                    <Select value={item.produtoId} onChange={(e) => atualizarItem(indice, { produtoId: e.target.value })}>
                      <option value="" disabled>
                        Selecione...
                      </option>
                      {produtos.map((p) => (
                        <option key={p.id} value={p.id}>
                          {p.nome} ({p.quantidade_estoque} {p.unidade_medida} em estoque)
                        </option>
                      ))}
                    </Select>
                  </Field>
                </div>
                <div className="w-28">
                  <Field label={indice === 0 ? 'Quantidade' : ''}>
                    <Input type="number" min={1} value={item.quantidade} onChange={(e) => atualizarItem(indice, { quantidade: e.target.value })} />
                  </Field>
                </div>
                <button
                  type="button"
                  onClick={() => setItens(itens.filter((_, i) => i !== indice))}
                  className="rounded-md p-2 text-foreground/50 hover:text-primary hover:bg-foreground/5 cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/40"
                  aria-label="Remover alimento"
                >
                  <Trash2 size={16} />
                </button>
              </div>
            ))}
            <button
              type="button"
              onClick={() => setItens([...itens, { ...ITEM_VAZIO }])}
              className="inline-flex items-center gap-1.5 text-xs font-medium text-primary hover:underline w-fit cursor-pointer"
            >
              <Plus size={14} aria-hidden />
              Adicionar outro alimento
            </button>
          </div>

          {erro && <p className="text-sm text-primary">{erro}</p>}
          <div className="mt-4 flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
            <Button type="button" variant="ghost" size="md" onClick={() => setModalAberto(false)}>
              Cancelar
            </Button>
            <Button type="submit" variant="primary" size="md">
              Confirmar cardápio
            </Button>
          </div>
        </form>
      </Modal>
    </div>
  );
}

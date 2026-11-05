'use client';

/**
 * Tela de Eventos (RF_F9 - Alocar Recursos para Eventos)
 * Cria eventos e aloca recursos (produtos do estoque ou valores financeiros)
 * usando a API /api/eventos.
 */

import { useEffect, useState } from 'react';
import { Plus, Trash2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Field, Input, Select, Textarea, Modal, Card, Table, THead, EmptyRow } from '@/components/app/ui';

interface Produto {
  id: number;
  nome: string;
  unidade_medida: string;
  quantidade_estoque: number;
}

interface RecursoAlocado {
  id: number;
  tipo: 'PRODUTO' | 'FINANCEIRO';
  produtoId: number | null;
  quantidade: number | null;
  valor: number | null;
}

interface EventoComRecursos {
  evento: { id: number; nome: string; data: string; descricao: string | null };
  recursos: RecursoAlocado[];
}

type LinhaRecursoForm = { tipo: 'PRODUTO' | 'FINANCEIRO'; produtoId: string; quantidade: string; valor: string };

const RECURSO_VAZIO: LinhaRecursoForm = { tipo: 'PRODUTO', produtoId: '', quantidade: '', valor: '' };

function formatarData(data: string) {
  return new Date(data + 'T00:00:00').toLocaleDateString('pt-BR');
}
function formatarBRL(valor: number) {
  return valor.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
}

export default function EventosPage() {
  const [eventos, setEventos] = useState<EventoComRecursos[]>([]);
  const [produtos, setProdutos] = useState<Produto[]>([]);
  const [modalAberto, setModalAberto] = useState(false);
  const [erro, setErro] = useState('');

  const [dadosEvento, setDadosEvento] = useState({ nome: '', data: '', descricao: '' });
  const [recursos, setRecursos] = useState<LinhaRecursoForm[]>([{ ...RECURSO_VAZIO }]);

  async function carregar() {
    const resposta = await fetch('/api/eventos');
    const dados = await resposta.json();
    setEventos(dados.eventos);
    setProdutos(dados.produtos);
  }

  useEffect(() => {
    fetch('/api/eventos')
      .then((resposta) => resposta.json())
      .then((dados) => {
        setEventos(dados.eventos);
        setProdutos(dados.produtos);
      });
  }, []);

  function abrirNovo() {
    setDadosEvento({ nome: '', data: '', descricao: '' });
    setRecursos([{ ...RECURSO_VAZIO }]);
    setErro('');
    setModalAberto(true);
  }

  function atualizarRecurso(indice: number, mudanca: Partial<LinhaRecursoForm>) {
    setRecursos((atual) => atual.map((r, i) => (i === indice ? { ...r, ...mudanca } : r)));
  }

  async function salvar(e: React.FormEvent) {
    e.preventDefault();
    setErro('');

    const corpo = {
      evento: dadosEvento,
      recursos: recursos.map((r) =>
        r.tipo === 'PRODUTO'
          ? { tipo: 'PRODUTO', produtoId: Number(r.produtoId) || null, quantidade: Number(r.quantidade) || null }
          : { tipo: 'FINANCEIRO', valor: Number(r.valor) || null }
      ),
    };

    const resposta = await fetch('/api/eventos', {
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

  function nomeProduto(produtoId: number | null) {
    return produtos.find((p) => p.id === produtoId)?.nome ?? `Produto #${produtoId}`;
  }

  return (
    <div className="flex flex-col gap-6">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <p className="text-sm text-foreground/50 max-w-xl">
          Alocação de recursos para eventos (RF_F9): registre o evento e os recursos necessários — produtos
          do estoque ou valores financeiros. O sistema verifica a disponibilidade antes de confirmar.
        </p>
        <Button variant="primary" size="md" onClick={abrirNovo} iconLeft={<Plus size={16} />}>
          Novo Evento
        </Button>
      </div>

      <Card className="p-0">
        <Table>
          <THead cols={['Data', 'Evento', 'Recursos alocados', '']} />
          <tbody>
            {eventos.length === 0 && <EmptyRow colSpan={4} label="Nenhum evento cadastrado." />}
            {eventos.map(({ evento, recursos: recursosDoEvento }) => (
              <tr key={evento.id} className="border-b border-border-line/10 last:border-0 align-top">
                <td className="px-4 py-3 text-foreground/60 whitespace-nowrap">{formatarData(evento.data)}</td>
                <td className="px-4 py-3">
                  <p className="font-medium">{evento.nome}</p>
                  {evento.descricao && <p className="text-xs text-foreground/40">{evento.descricao}</p>}
                </td>
                <td className="px-4 py-3">
                  <ul className="space-y-1">
                    {recursosDoEvento.map((r) => (
                      <li key={r.id} className="text-foreground/70">
                        {r.tipo === 'PRODUTO' ? `${nomeProduto(r.produtoId)} — ${r.quantidade}` : `Financeiro — ${formatarBRL(r.valor ?? 0)}`}
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

      <Modal open={modalAberto} title="Alocar Recursos para Evento" onClose={() => setModalAberto(false)}>
        <form onSubmit={salvar} className="flex flex-col gap-4">
          <Field label="Nome do evento">
            <Input value={dadosEvento.nome} onChange={(e) => setDadosEvento({ ...dadosEvento, nome: e.target.value })} required />
          </Field>
          <div className="grid grid-cols-2 gap-4">
            <Field label="Data do evento">
              <Input
                type="date"
                value={dadosEvento.data}
                onChange={(e) => setDadosEvento({ ...dadosEvento, data: e.target.value })}
                required
              />
            </Field>
          </div>
          <Field label="Descrição / finalidade (opcional)">
            <Textarea rows={2} value={dadosEvento.descricao} onChange={(e) => setDadosEvento({ ...dadosEvento, descricao: e.target.value })} />
          </Field>

          <div className="flex flex-col gap-3 border-t border-border-line/10 pt-4">
            <span className="text-xs font-semibold text-foreground">Recursos a alocar</span>
            {recursos.map((recurso, indice) => (
              <div key={indice} className="flex items-end gap-2">
                <div className="w-36">
                  <Field label={indice === 0 ? 'Tipo' : ''}>
                    <Select
                      value={recurso.tipo}
                      onChange={(e) => atualizarRecurso(indice, { tipo: e.target.value as 'PRODUTO' | 'FINANCEIRO' })}
                    >
                      <option value="PRODUTO">Produto</option>
                      <option value="FINANCEIRO">Financeiro</option>
                    </Select>
                  </Field>
                </div>

                {recurso.tipo === 'PRODUTO' ? (
                  <>
                    <div className="flex-1">
                      <Field label={indice === 0 ? 'Produto' : ''}>
                        <Select value={recurso.produtoId} onChange={(e) => atualizarRecurso(indice, { produtoId: e.target.value })}>
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
                        <Input
                          type="number"
                          min={1}
                          value={recurso.quantidade}
                          onChange={(e) => atualizarRecurso(indice, { quantidade: e.target.value })}
                        />
                      </Field>
                    </div>
                  </>
                ) : (
                  <div className="flex-1">
                    <Field label={indice === 0 ? 'Valor (R$)' : ''}>
                      <Input
                        type="number"
                        min={0.01}
                        step="0.01"
                        value={recurso.valor}
                        onChange={(e) => atualizarRecurso(indice, { valor: e.target.value })}
                      />
                    </Field>
                  </div>
                )}

                <button
                  type="button"
                  onClick={() => setRecursos(recursos.filter((_, i) => i !== indice))}
                  className="p-2 text-foreground/40 hover:text-primary cursor-pointer"
                  aria-label="Remover recurso"
                >
                  <Trash2 size={16} />
                </button>
              </div>
            ))}
            <button
              type="button"
              onClick={() => setRecursos([...recursos, { ...RECURSO_VAZIO }])}
              className="text-xs font-medium text-primary hover:underline w-fit"
            >
              + Adicionar outro recurso
            </button>
          </div>

          {erro && <p className="text-sm text-primary">{erro}</p>}
          <Button type="submit" variant="primary" size="md" className="w-full mt-2">
            Confirmar Alocação
          </Button>
        </form>
      </Modal>
    </div>
  );
}

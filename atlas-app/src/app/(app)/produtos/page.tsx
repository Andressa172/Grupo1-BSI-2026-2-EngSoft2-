'use client';

/**
 * Tela de Produtos (RF_B3 - Gerenciar produtos)
 * Lista, cadastra, edita e exclui produtos usando a API /api/produtos.
 */

import { useEffect, useState } from 'react';
import { Plus, Pencil, Trash2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Field, Input, Select, Modal, Table, THead, EmptyRow } from '@/components/app/ui';
// formato que a API /api/produtos devolve
interface Produto {
  id: number;
  nome: string;
  categoria: string;
  unidadeMedida: string;
  quantidadeEstoque: number;
  estoqueMinimo: number;
  dataValidade: string | null;
}

const FORM_VAZIO = { nome: '', categoria: 'Alimento', unidadeMedida: '', estoqueMinimo: '0', dataValidade: '' };

function formatarData(data: string | null) {
  if (!data) return '—';
  return new Date(data + 'T00:00:00').toLocaleDateString('pt-BR');
}

export default function ProdutosPage() {
  const [produtos, setProdutos] = useState<Produto[]>([]);
  const [busca, setBusca] = useState('');
  const [modalAberto, setModalAberto] = useState(false);
  const [produtoEditando, setProdutoEditando] = useState<Produto | null>(null);
  const [form, setForm] = useState(FORM_VAZIO);
  const [erro, setErro] = useState('');

  async function carregarProdutos() {
    const resposta = await fetch('/api/produtos');
    const dados = await resposta.json();
    setProdutos(dados);
  }

  // Carrega a lista quando a tela abre
  useEffect(() => {
    fetch('/api/produtos')
      .then((resposta) => resposta.json())
      .then((dados) => setProdutos(dados));
  }, []);

  function abrirNovo() {
    setProdutoEditando(null);
    setForm(FORM_VAZIO);
    setErro('');
    setModalAberto(true);
  }

  function abrirEdicao(produto: Produto) {
    setProdutoEditando(produto);
    setForm({
      nome: produto.nome,
      categoria: produto.categoria,
      unidadeMedida: produto.unidadeMedida,
      estoqueMinimo: String(produto.estoqueMinimo),
      dataValidade: produto.dataValidade ?? '',
    });
    setErro('');
    setModalAberto(true);
  }

  async function salvar(e: React.FormEvent) {
    e.preventDefault();
    const dados = { ...form, estoqueMinimo: Number(form.estoqueMinimo) };

    // Se está editando usa PUT, se é novo usa POST
    const url = produtoEditando ? `/api/produtos/${produtoEditando.id}` : '/api/produtos';
    const metodo = produtoEditando ? 'PUT' : 'POST';

    const resposta = await fetch(url, {
      method: metodo,
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(dados),
    });

    if (resposta.ok) {
      setModalAberto(false);
      carregarProdutos();
    } else {
      const corpo = await resposta.json();
      setErro(corpo.erro);
    }
  }

  async function excluir(produto: Produto) {
    if (!confirm(`Deseja excluir o produto "${produto.nome}"?`)) return;
    const resposta = await fetch(`/api/produtos/${produto.id}`, { method: 'DELETE' });
    if (!resposta.ok) {
      // ex.: produto que já tem movimentação no estoque não pode ser excluído
      const corpo = await resposta.json();
      alert(corpo.erro);
    }
    carregarProdutos();
  }

  const produtosFiltrados = produtos.filter((p) => p.nome.toLowerCase().includes(busca.toLowerCase()));

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <Input
          placeholder="Buscar produto pelo nome..."
          value={busca}
          onChange={(e) => setBusca(e.target.value)}
          className="sm:max-w-xs"
        />
        <Button variant="primary" size="md" onClick={abrirNovo} iconLeft={<Plus size={16} />}>
          Novo Produto
        </Button>
      </div>

      <Table>
        <THead cols={['Produto', 'Categoria', 'Unidade', 'Estoque mínimo', 'Validade', '']} />
        <tbody>
          {produtosFiltrados.length === 0 && <EmptyRow colSpan={6} label="Nenhum produto encontrado." />}
          {produtosFiltrados.map((p) => (
            <tr key={p.id} className="border-b border-border-line/10 last:border-0">
              <td className="px-4 py-3 font-medium">{p.nome}</td>
              <td className="px-4 py-3 text-foreground/60">{p.categoria}</td>
              <td className="px-4 py-3 text-foreground/60">{p.unidadeMedida}</td>
              <td className="px-4 py-3">{p.estoqueMinimo}</td>
              <td className="px-4 py-3 text-foreground/60">{formatarData(p.dataValidade)}</td>
              <td className="px-4 py-3">
                <div className="flex justify-end gap-2">
                  <Button variant="outline" size="sm" onClick={() => abrirEdicao(p)} iconLeft={<Pencil size={14} />}>
                    Editar
                  </Button>
                  <Button variant="outline" size="sm" onClick={() => excluir(p)} iconLeft={<Trash2 size={14} />}>
                    Excluir
                  </Button>
                </div>
              </td>
            </tr>
          ))}
        </tbody>
      </Table>

      {/* Modal de cadastro / edição */}
      <Modal
        open={modalAberto}
        title={produtoEditando ? 'Editar Produto' : 'Cadastrar Produto'}
        onClose={() => setModalAberto(false)}
      >
        <form onSubmit={salvar} className="flex flex-col gap-4">
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
          {erro && <p className="text-sm text-primary">{erro}</p>}
          <Button type="submit" variant="primary" size="md" className="w-full mt-2">
            {produtoEditando ? 'Salvar alterações' : 'Cadastrar'}
          </Button>
        </form>
      </Modal>
    </div>
  );
}

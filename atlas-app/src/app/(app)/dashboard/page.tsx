'use client';

import Link from 'next/link';
import { PackageSearch, HandCoins, Wallet, FileSpreadsheet, ArrowRight } from 'lucide-react';
import { useAtlas } from '@/lib/store';
import { Card, StatCard, StatusPill } from '@/components/app/ui';

function formatBRL(v: number) {
  return v.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
}

export default function DashboardPage() {
  const { produtos, caixaAberto, doacoesProduto, doacoesDinheiro, cotacoes } = useAtlas();

  const produtosBaixoEstoque = produtos.filter((p) => p.quantidadeEstoque <= p.estoqueMinimo);
  const saldoCaixa = caixaAberto
    ? caixaAberto.saldoFisicoAbertura +
      caixaAberto.saldoDigitalAbertura +
      caixaAberto.movimentacoes.reduce((acc, m) => acc + (m.tipo === 'ENTRADA' ? m.valor : -m.valor), 0)
    : 0;
  const cotacoesPendentes = cotacoes.filter((c) => c.status === 'PENDENTE');
  const totalDoacoes = doacoesProduto.length + doacoesDinheiro.length;

  return (
    <div className="flex flex-col gap-6">
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard
          label="Produtos cadastrados"
          value={String(produtos.length)}
          hint={`${produtosBaixoEstoque.length} com estoque baixo`}
          tone={produtosBaixoEstoque.length > 0 ? 'danger' : 'default'}
        />
        <StatCard
          label="Saldo do caixa"
          value={caixaAberto ? formatBRL(saldoCaixa) : '—'}
          hint={caixaAberto ? 'Caixa aberto' : 'Nenhum caixa aberto'}
        />
        <StatCard label="Doações registradas" value={String(totalDoacoes)} hint="Produto + dinheiro" />
        <StatCard
          label="Cotações pendentes"
          value={String(cotacoesPendentes.length)}
          tone={cotacoesPendentes.length > 0 ? 'warning' : 'default'}
        />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <Card className="p-5">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-sm font-semibold flex items-center gap-2">
              <PackageSearch size={16} className="text-primary" /> Produtos com estoque baixo
            </h2>
            <Link href="/estoque" className="text-xs text-primary font-medium flex items-center gap-1 hover:underline">
              Ver estoque <ArrowRight size={12} />
            </Link>
          </div>
          {produtosBaixoEstoque.length === 0 ? (
            <p className="text-sm text-foreground/40">Nenhum produto abaixo do estoque mínimo.</p>
          ) : (
            <ul className="divide-y divide-border-line/10">
              {produtosBaixoEstoque.map((p) => (
                <li key={p.id} className="flex items-center justify-between py-2.5 text-sm">
                  <span>{p.nome}</span>
                  <span className="text-primary font-medium">
                    {p.quantidadeEstoque} / {p.estoqueMinimo} {p.unidadeMedida}
                  </span>
                </li>
              ))}
            </ul>
          )}
        </Card>

        <Card className="p-5">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-sm font-semibold flex items-center gap-2">
              <FileSpreadsheet size={16} className="text-primary" /> Cotações em aberto
            </h2>
            <Link href="/cotacoes" className="text-xs text-primary font-medium flex items-center gap-1 hover:underline">
              Ver cotações <ArrowRight size={12} />
            </Link>
          </div>
          {cotacoesPendentes.length === 0 ? (
            <p className="text-sm text-foreground/40">Nenhuma cotação aguardando aprovação.</p>
          ) : (
            <ul className="divide-y divide-border-line/10">
              {cotacoesPendentes.map((c) => (
                <li key={c.id} className="flex items-center justify-between py-2.5 text-sm">
                  <span className="truncate pr-2">{c.descricao}</span>
                  <StatusPill status={c.status} />
                </li>
              ))}
            </ul>
          )}
        </Card>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <Link
          href="/doacoes"
          className="flex items-center gap-3 rounded-xl border border-border-line/20 bg-background p-4 hover:border-primary/40 hover:bg-primary/5 transition-colors"
        >
          <HandCoins className="text-primary" size={20} />
          <span className="text-sm font-medium">Registrar nova doação</span>
        </Link>
        <Link
          href="/caixa"
          className="flex items-center gap-3 rounded-xl border border-border-line/20 bg-background p-4 hover:border-primary/40 hover:bg-primary/5 transition-colors"
        >
          <Wallet className="text-primary" size={20} />
          <span className="text-sm font-medium">Gerenciar caixa</span>
        </Link>
        <Link
          href="/estoque"
          className="flex items-center gap-3 rounded-xl border border-border-line/20 bg-background p-4 hover:border-primary/40 hover:bg-primary/5 transition-colors"
        >
          <PackageSearch className="text-primary" size={20} />
          <span className="text-sm font-medium">Cadastrar produto</span>
        </Link>
      </div>
    </div>
  );
}

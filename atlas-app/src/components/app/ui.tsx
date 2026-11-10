'use client';

import React, { useEffect, useId } from 'react';
import { ChevronDown, X } from 'lucide-react';

/* ---------------------------------- Card --------------------------------- */

export function Card({ children, className = '' }: { children: React.ReactNode; className?: string }) {
  return (
    <div className={`rounded-xl border border-border-line/20 bg-background shadow-sm ${className}`}>
      {children}
    </div>
  );
}

/* ------------------------------- StatCard --------------------------------- */

export function StatCard({
  label,
  value,
  hint,
  tone = 'default',
}: {
  label: string;
  value: string;
  hint?: string;
  tone?: 'default' | 'warning' | 'danger';
}) {
  const toneClasses =
    tone === 'warning'
      ? 'text-warning'
      : tone === 'danger'
      ? 'text-primary'
      : 'text-foreground';

  return (
    <Card className="p-5">
      <p className="text-xs font-medium text-foreground/50 mb-2">{label}</p>
      <p className={`text-2xl font-semibold tracking-tight ${toneClasses}`}>{value}</p>
      {hint && <p className="text-xs text-foreground/50 mt-1">{hint}</p>}
    </Card>
  );
}

/* --------------------------------- Field ---------------------------------- */

export function Field({
  label,
  children,
}: {
  label: string;
  children: React.ReactNode;
}) {
  return (
    <label className="flex flex-col gap-1.5 text-sm">
      <span className="text-xs font-semibold text-foreground">{label}</span>
      {children}
    </label>
  );
}

// base comum de campos; Input e Select têm altura fixa de 40px, igual aos botões
const inputClasses =
  'w-full rounded-md border border-border-line/20 bg-background px-3.5 text-sm text-foreground shadow-sm outline-none transition-[color,border-color,box-shadow] placeholder:text-foreground/40 focus:border-primary focus:ring-2 focus:ring-primary/20 disabled:cursor-not-allowed disabled:opacity-60';

export function Input(props: React.InputHTMLAttributes<HTMLInputElement>) {
  return <input {...props} className={`${inputClasses} h-10 ${props.className ?? ''}`} />;
}

// seta própria (a do navegador ignora o padding e fica colada na borda)
export function Select(props: React.SelectHTMLAttributes<HTMLSelectElement>) {
  return (
    <span className="relative block w-full">
      <select {...props} className={`${inputClasses} h-10 appearance-none pr-10 cursor-pointer ${props.className ?? ''}`} />
      <ChevronDown
        size={16}
        aria-hidden
        className="pointer-events-none absolute right-3.5 top-1/2 -translate-y-1/2 text-foreground/50"
      />
    </span>
  );
}

export function Textarea(props: React.TextareaHTMLAttributes<HTMLTextAreaElement>) {
  return <textarea {...props} className={`${inputClasses} py-2 ${props.className ?? ''}`} />;
}

/* --------------------------------- Badge ----------------------------------- */

export function StatusPill({ status }: { status: string }) {
  const map: Record<string, string> = {
    ABERTO: 'bg-success/10 text-success border-success/20',
    FECHADO: 'bg-foreground/5 text-foreground/70 border-border-line/20',
    PENDENTE: 'bg-secondary/20 text-warning border-secondary/40',
    APROVADA: 'bg-success/10 text-success border-success/20',
    REPROVADA: 'bg-primary/10 text-primary border-primary/20',
  };
  const labelMap: Record<string, string> = {
    ABERTO: 'Aberto',
    FECHADO: 'Fechado',
    PENDENTE: 'Pendente',
    APROVADA: 'Aprovada',
    REPROVADA: 'Reprovada',
  };
  return (
    <span
      className={`inline-flex items-center whitespace-nowrap rounded-full border px-2.5 py-1 text-xs font-medium ${
        map[status] ?? 'bg-foreground/5 text-foreground/70 border-border-line/20'
      }`}
    >
      {labelMap[status] ?? status}
    </span>
  );
}

// só o estoque baixo ganha etiqueta; o normal fica em texto discreto
export function LowStockPill({ low }: { low: boolean }) {
  if (!low) return <span className="text-foreground/50">Normal</span>;
  return (
    <span className="inline-flex items-center whitespace-nowrap rounded-full border border-primary/20 bg-primary/10 px-2.5 py-1 text-xs font-medium text-primary">
      Estoque baixo
    </span>
  );
}

/* --------------------------------- Modal ----------------------------------- */

export function Modal({
  open,
  title,
  onClose,
  children,
}: {
  open: boolean;
  title: string;
  onClose: () => void;
  children: React.ReactNode;
}) {
  const idTitulo = useId();

  // Esc fecha a janela, como em qualquer diálogo
  useEffect(() => {
    if (!open) return;
    function aoTeclar(e: KeyboardEvent) {
      if (e.key === 'Escape') onClose();
    }
    document.addEventListener('keydown', aoTeclar);
    return () => document.removeEventListener('keydown', aoTeclar);
  }, [open, onClose]);

  if (!open) return null;
  return (
    <div
      className="fixed inset-0 z-100 flex items-center justify-center p-4"
      role="dialog"
      aria-modal="true"
      aria-labelledby={idTitulo}
    >
      <div className="absolute inset-0 bg-foreground/30 backdrop-blur-sm" onClick={onClose} />
      <div className="relative w-full max-w-lg rounded-2xl border border-border-line/20 bg-background p-6 shadow-xl max-h-[85vh] overflow-y-auto">
        <div className="flex items-center justify-between mb-5">
          <h2 id={idTitulo} className="text-lg font-medium tracking-tight">
            {title}
          </h2>
          <button
            onClick={onClose}
            className="rounded-full p-1.5 text-foreground/50 hover:bg-foreground/5 hover:text-foreground cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/40"
            aria-label="Fechar"
          >
            <X size={18} />
          </button>
        </div>
        {children}
      </div>
    </div>
  );
}

/* --------------------------------- Table ------------------------------------ */

export function Table({ children }: { children: React.ReactNode }) {
  return (
    <div className="overflow-x-auto rounded-xl border border-border-line/20">
      <table className="w-full text-sm">{children}</table>
    </div>
  );
}

// coluna: texto simples ou { label, className } para alinhar ou esconder no celular
// (ex.: 'hidden sm:table-cell'); `srOnly` deixa o título só para leitores de tela
export type Coluna = string | { label: string; className?: string; srOnly?: boolean };

// classes da célula do corpo que acompanham a coluna (mesma regra de esconder/alinhar)
export function classeDaColuna(coluna: Coluna): string {
  return typeof coluna === 'string' ? '' : (coluna.className ?? '');
}

export function THead({ cols }: { cols: Coluna[] }) {
  return (
    <thead>
      <tr className="border-b border-border-line/20 bg-foreground/[0.02] text-left text-xs font-semibold uppercase tracking-wide text-foreground/50">
        {cols.map((c) => {
          const label = typeof c === 'string' ? c : c.label;
          const srOnly = typeof c !== 'string' && c.srOnly;
          return (
            <th key={label} scope="col" className={`px-4 py-3 whitespace-nowrap ${classeDaColuna(c)}`}>
              {srOnly ? <span className="sr-only">{label}</span> : label}
            </th>
          );
        })}
      </tr>
    </thead>
  );
}

export function EmptyRow({ colSpan, label, children }: { colSpan: number; label?: string; children?: React.ReactNode }) {
  return (
    <tr>
      <td colSpan={colSpan} className="px-4 py-10 text-center text-sm text-foreground/50">
        {children ?? label}
      </td>
    </tr>
  );
}

// esqueleto com a altura das linhas reais: a tabela não pula quando os dados chegam
export function LoadingRows({ colSpan, rows = 3 }: { colSpan: number; rows?: number }) {
  return (
    <>
      {Array.from({ length: rows }, (_, i) => (
        <tr key={i} className="border-b border-border-line/10 last:border-0" aria-hidden>
          <td colSpan={colSpan} className="px-4 py-3">
            <div className="flex items-center gap-6">
              <div className="h-4 w-40 rounded bg-foreground/5 animate-pulse" />
              <div className="h-4 w-24 rounded bg-foreground/5 animate-pulse" />
              <div className="hidden h-4 w-20 rounded bg-foreground/5 animate-pulse sm:block" />
            </div>
          </td>
        </tr>
      ))}
    </>
  );
}

/* ------------------------------ Ação de linha -------------------------------- */

// botão só com ícone para as ações de cada linha de tabela; o nome vai no aria-label e no title
export function IconAction({
  label,
  danger = false,
  onClick,
  children,
}: {
  label: string;
  danger?: boolean;
  onClick: () => void;
  children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-label={label}
      title={label}
      className={`rounded-md p-2 text-foreground/50 transition-colors cursor-pointer hover:bg-foreground/5 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/40 ${
        danger ? 'hover:text-primary' : 'hover:text-foreground'
      }`}
    >
      {children}
    </button>
  );
}

export function RowActions({ children }: { children: React.ReactNode }) {
  return <div className="flex justify-end gap-0.5">{children}</div>;
}

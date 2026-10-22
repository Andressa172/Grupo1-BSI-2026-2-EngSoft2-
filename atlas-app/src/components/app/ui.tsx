'use client';

import React from 'react';
import { X } from 'lucide-react';

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
      ? 'text-secondary'
      : tone === 'danger'
      ? 'text-primary'
      : 'text-foreground';

  return (
    <Card className="p-5">
      <p className="text-xs font-medium text-foreground/50 mb-2">{label}</p>
      <p className={`text-2xl font-semibold tracking-tight ${toneClasses}`}>{value}</p>
      {hint && <p className="text-xs text-foreground/40 mt-1">{hint}</p>}
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

const inputClasses =
  'w-full rounded-md border border-border-line/20 bg-background px-3.5 py-2 text-sm text-foreground shadow-sm outline-none transition-all placeholder:text-foreground/40 focus:border-primary focus:ring-2 focus:ring-primary/20';

export function Input(props: React.InputHTMLAttributes<HTMLInputElement>) {
  return <input {...props} className={`${inputClasses} ${props.className ?? ''}`} />;
}

export function Select(props: React.SelectHTMLAttributes<HTMLSelectElement>) {
  return <select {...props} className={`${inputClasses} ${props.className ?? ''}`} />;
}

export function Textarea(props: React.TextareaHTMLAttributes<HTMLTextAreaElement>) {
  return <textarea {...props} className={`${inputClasses} ${props.className ?? ''}`} />;
}

/* --------------------------------- Badge ----------------------------------- */

export function StatusPill({ status }: { status: string }) {
  const map: Record<string, string> = {
    ABERTO: 'bg-green-100 text-green-700 border-green-200',
    FECHADO: 'bg-foreground/5 text-foreground/50 border-border-line/20',
    PENDENTE: 'bg-secondary/20 text-secondary border-secondary/30',
    APROVADA: 'bg-green-100 text-green-700 border-green-200',
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
      className={`inline-flex items-center rounded-full border px-2.5 py-1 text-xs font-medium ${
        map[status] ?? 'bg-foreground/5 text-foreground/60 border-border-line/20'
      }`}
    >
      {labelMap[status] ?? status}
    </span>
  );
}

export function LowStockPill({ low }: { low: boolean }) {
  if (!low) return <StatusPill status="ABERTO" />;
  return (
    <span className="inline-flex items-center rounded-full border border-primary/20 bg-primary/10 px-2.5 py-1 text-xs font-medium text-primary">
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
  if (!open) return null;
  return (
    <div className="fixed inset-0 z-100 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-foreground/30 backdrop-blur-sm" onClick={onClose} />
      <div className="relative w-full max-w-lg rounded-2xl border border-border-line/20 bg-background p-6 shadow-xl max-h-[85vh] overflow-y-auto">
        <div className="flex items-center justify-between mb-5">
          <h2 className="text-lg font-medium tracking-tight">{title}</h2>
          <button
            onClick={onClose}
            className="rounded-full p-1.5 text-foreground/50 hover:bg-foreground/5 hover:text-foreground cursor-pointer"
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

export function THead({ cols }: { cols: string[] }) {
  return (
    <thead>
      <tr className="border-b border-border-line/20 bg-foreground/[0.02] text-left text-xs font-semibold uppercase tracking-wide text-foreground/50">
        {cols.map((c) => (
          <th key={c} className="px-4 py-3 whitespace-nowrap">
            {c}
          </th>
        ))}
      </tr>
    </thead>
  );
}

export function EmptyRow({ colSpan, label }: { colSpan: number; label: string }) {
  return (
    <tr>
      <td colSpan={colSpan} className="px-4 py-8 text-center text-sm text-foreground/40">
        {label}
      </td>
    </tr>
  );
}

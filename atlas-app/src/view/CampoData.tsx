'use client';

/**
 * Campo de data (View): aceita digitação com máscara dd/mm/aaaa E tem um botão de calendário
 * para escolher a data clicando. O valor que sai daqui é sempre o texto "dd/mm/aaaa",
 * igual ao de antes, então a validação (Model/Control) não muda.
 */

import { useRef } from 'react';
import { CalendarDays } from 'lucide-react';
import { Input } from '@/components/app/ui';
import { mascaraData } from '@/view/mascaras';

/** "10/05/2015" -> "2015-05-10" (formato do <input type="date">). Vazio se incompleta/inválida. */
function brParaIso(texto: string): string {
  const m = /^(\d{2})\/(\d{2})\/(\d{4})$/.exec(texto);
  return m ? `${m[3]}-${m[2]}-${m[1]}` : '';
}

/** "2015-05-10" -> "10/05/2015". */
function isoParaBr(iso: string): string {
  const [ano, mes, dia] = iso.split('-');
  return ano && mes && dia ? `${dia}/${mes}/${ano}` : '';
}

interface CampoDataProps {
  value: string;
  onChange: (texto: string) => void;
  className?: string;
  placeholder?: string;
}

export function CampoData({ value, onChange, className = '', placeholder = 'dd/mm/aaaa' }: CampoDataProps) {
  const seletor = useRef<HTMLInputElement>(null);

  function abrirCalendario() {
    const el = seletor.current;
    if (!el) return;
    if (typeof el.showPicker === 'function') el.showPicker();
    else el.click();
  }

  return (
    <div className="relative">
      <Input
        value={value}
        onChange={(e) => onChange(mascaraData(e.target.value))}
        placeholder={placeholder}
        inputMode="numeric"
        className={`pr-10 ${className}`}
      />
      <button
        type="button"
        onClick={abrirCalendario}
        aria-label="Abrir calendário"
        className="absolute right-2 top-1/2 -translate-y-1/2 rounded p-1 text-foreground/50 hover:text-foreground cursor-pointer"
      >
        <CalendarDays size={16} />
      </button>
      {/* seletor nativo, invisível: só serve para abrir o calendário do navegador */}
      <input
        ref={seletor}
        type="date"
        tabIndex={-1}
        aria-hidden
        value={brParaIso(value)}
        onChange={(e) => onChange(isoParaBr(e.target.value))}
        className="pointer-events-none absolute inset-0 opacity-0"
      />
    </div>
  );
}

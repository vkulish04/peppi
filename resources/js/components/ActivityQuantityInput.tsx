import React, { useEffect, useState } from 'react';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import { formatCurrency } from '../utils/calculations';

interface Props {
  label: string;
  value: number;
  unitPrice: number;
  disabled?: boolean;
  onChange: (quantity: number) => Promise<void>;
}

export function ActivityQuantityInput({ label, value, unitPrice, disabled, onChange }: Props) {
  const [draft, setDraft] = useState(String(value));
  const [busy, setBusy] = useState(false);
  useEffect(() => setDraft(String(value)), [value]);

  const save = async (next = draft) => {
    const quantity = Number(next);
    if (next.trim() === '' || !Number.isInteger(quantity) || quantity < 0 || quantity > 999) {
      setDraft(String(value));
      return;
    }
    if (busy || disabled) return;
    setDraft(String(quantity));
    if (quantity === value) return;
    setBusy(true);
    try { await onChange(quantity); }
    catch { setDraft(String(value)); }
    finally { setBusy(false); }
  };

  const step = (direction: number) => {
    const current = Number(draft);
    const quantity = Math.max(0, Math.min(999, (Number.isInteger(current) ? current : value) + direction));
    void save(String(quantity));
  };

  return <div className="flex flex-col items-center gap-1" onClick={(event) => event.stopPropagation()}>
    <div className={`inline-flex items-center rounded-full bg-orange-50 p-1 ring-1 ring-inset ring-orange-200/70 transition-colors ${busy ? 'opacity-70' : ''}`}>
    <button type="button" aria-label={`Зменшити — ${label}`} disabled={disabled || busy || Number(draft) <= 0}
      onMouseDown={(event) => event.preventDefault()} onClick={() => step(-1)}
      className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full text-orange-600 transition-all hover:bg-orange-100 hover:text-orange-700 active:scale-90 disabled:cursor-default disabled:opacity-25 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-orange-500">
      <ChevronLeft className="h-7 w-7" strokeWidth={3.5} aria-hidden="true" />
    </button>
    <input type="number" min="0" max="999" step="1" value={draft} inputMode="numeric"
      aria-label={label} disabled={disabled || busy}
      onChange={(event) => setDraft(event.target.value)} onBlur={() => void save()}
      onKeyDown={(event) => { if (event.key === 'Enter') { event.preventDefault(); event.currentTarget.blur(); } }}
      className="lesson-quantity-number h-10 w-12 border-0 bg-transparent p-0 text-center text-lg font-extrabold tabular-nums text-orange-950 focus:outline-none focus-visible:rounded-lg focus-visible:ring-2 focus-visible:ring-orange-300 disabled:opacity-60" />
    <button type="button" aria-label={`Збільшити — ${label}`} disabled={disabled || busy || Number(draft) >= 999}
      onMouseDown={(event) => event.preventDefault()} onClick={() => step(1)}
      className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full text-orange-600 transition-all hover:bg-orange-100 hover:text-orange-700 active:scale-90 disabled:cursor-default disabled:opacity-25 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-orange-500">
      <ChevronRight className="h-7 w-7" strokeWidth={3.5} aria-hidden="true" />
    </button>
    </div>
    <span className="text-[10px] font-medium text-stone-500 whitespace-nowrap" aria-live="polite">
      {busy ? 'Зберігаємо…' : `${unitPrice} ₴ × ${Number(draft) || 0} = ${formatCurrency(unitPrice * (Number(draft) || 0))}`}
    </span>
  </div>;
}

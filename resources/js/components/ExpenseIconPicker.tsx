import React, { useEffect, useMemo, useRef, useState } from 'react';
import { Check, LoaderCircle, Search, X } from 'lucide-react';
import type { FinanceOption } from '../types';
import { financeOptionsApi } from '../api/client';
import { EXPENSE_ICONS, expenseIcon } from '../utils/expenseIcons';

interface Props { category: FinanceOption; onSaved: (category: FinanceOption) => void; onClose: () => void }

export function ExpenseIconPicker({ category, onSaved, onClose }: Props) {
  const [selected, setSelected] = useState(expenseIcon(category).key);
  const [query, setQuery] = useState('');
  const [group, setGroup] = useState('Усі');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const dialog = useRef<HTMLDivElement>(null);
  const groups = useMemo(() => ['Усі', ...new Set(EXPENSE_ICONS.map(icon => icon.group))], []);
  const filtered = useMemo(() => {
    const search = query.trim().toLocaleLowerCase('uk');
    return EXPENSE_ICONS.filter(icon => (group === 'Усі' || icon.group === group) && `${icon.label} ${icon.key} ${icon.group}`.toLocaleLowerCase('uk').includes(search));
  }, [query, group]);
  const chosen = EXPENSE_ICONS.find(icon => icon.key === selected)!;
  const ChosenIcon = chosen.Icon;
  useEffect(() => {
    const previous = document.activeElement as HTMLElement | null;
    const overflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden'; dialog.current?.focus();
    return () => { document.body.style.overflow = overflow; previous?.focus(); };
  }, []);
  const save = async () => {
    if (busy) return;
    setBusy(true); setError('');
    try { onSaved(await financeOptionsApi.updateIcon(category, selected)); onClose(); }
    catch (reason) { setError(reason instanceof Error ? reason.message : 'Не вдалося зберегти значок.'); setBusy(false); }
  };
  return <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-3 backdrop-blur-xs sm:p-5">
    <div ref={dialog} tabIndex={-1} role="dialog" aria-modal="true" aria-labelledby="expense-icon-picker-title" className="flex max-h-[92dvh] w-full max-w-3xl flex-col overflow-hidden rounded-3xl bg-white shadow-2xl outline-none"
      onKeyDown={event => {
        if (event.key === 'Escape' && !busy) onClose();
        if (event.key === 'Tab') {
          const controls = Array.from(event.currentTarget.querySelectorAll<HTMLElement>('button:not([disabled]), input:not([disabled])'));
          const first = controls[0], last = controls[controls.length-1];
          if (event.shiftKey && (document.activeElement === first || document.activeElement === dialog.current)) { event.preventDefault(); last?.focus(); }
          else if (!event.shiftKey && document.activeElement === last) { event.preventDefault(); first?.focus(); }
        }
      }}>
      <div className="shrink-0 border-b border-stone-100 p-4 sm:p-6"><div className="flex items-start justify-between gap-3"><div><p className="text-xs font-bold uppercase tracking-wider text-orange-600">{category.name}</p><h2 id="expense-icon-picker-title" className="mt-1 text-xl font-extrabold text-stone-900">Виберіть значок категорії</h2><p className="mt-1 text-xs text-stone-500">{EXPENSE_ICONS.length} значків для повсякденних витрат</p></div><button type="button" disabled={busy} aria-label="Закрити вибір значка" onClick={onClose} className="rounded-full p-2 text-stone-400 hover:bg-stone-100 disabled:opacity-40"><X className="h-5 w-5" /></button></div>
        <div className="relative mt-4"><Search className="pointer-events-none absolute left-3 top-3 h-4 w-4 text-stone-400" /><input aria-label="Пошук значка" value={query} disabled={busy} onChange={event => setQuery(event.target.value)} placeholder="Наприклад, податки, доставка, ремонт…" className="w-full rounded-xl border border-stone-200 bg-stone-50 py-2.5 pl-10 pr-3 text-sm outline-none focus:border-orange-400 focus:ring-2 focus:ring-orange-100" /></div>
        <div role="group" aria-label="Групи значків" className="mt-3 flex gap-1.5 overflow-x-auto pb-1">{groups.map(name => <button key={name} type="button" disabled={busy} aria-pressed={group === name} onClick={() => setGroup(name)} className={`shrink-0 rounded-full px-3 py-1.5 text-xs font-semibold transition ${group === name ? 'bg-orange-600 text-white' : 'bg-stone-100 text-stone-600 hover:bg-orange-50 hover:text-orange-700'}`}>{name}</button>)}</div>
      </div>
      <div className="min-h-0 flex-1 overflow-y-auto p-4 sm:px-6"><p role="status" className="mb-3 text-xs text-stone-400">Знайдено: {filtered.length}</p><div className="grid grid-cols-3 gap-2 sm:grid-cols-5 md:grid-cols-6">{filtered.map(({key,label,Icon}) => <button key={key} type="button" disabled={busy} aria-label={`Значок: ${label}`} aria-pressed={selected === key} onClick={() => setSelected(key)} title={label} className={`relative flex min-h-24 flex-col items-center justify-center gap-2 rounded-2xl border px-2 py-3 text-center transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-orange-300 ${selected === key ? 'border-orange-400 bg-orange-50 text-orange-700 shadow-sm' : 'border-stone-100 bg-white text-stone-500 hover:border-orange-200 hover:bg-orange-50/50 hover:text-orange-700'}`}><Icon className="h-7 w-7" strokeWidth={1.8} /><span className="text-[11px] font-semibold leading-snug">{label}</span>{selected === key && <Check className="absolute right-2 top-2 h-3.5 w-3.5" strokeWidth={3}/>}</button>)}</div>{!filtered.length && <p className="py-8 text-center text-sm text-stone-500">Нічого не знайдено. Спробуйте інше слово або групу «Усі».</p>}</div>
      <div className="shrink-0 border-t border-stone-100 p-4 sm:px-6">{error && <p role="alert" className="mb-3 rounded-xl bg-red-50 p-3 text-sm text-red-800">{error}</p>}<div className="flex flex-wrap items-center justify-between gap-3"><div className="flex items-center gap-3"><span className="rounded-xl bg-orange-50 p-2.5 text-orange-700"><ChosenIcon className="h-6 w-6" /></span><div><p className="text-[10px] text-stone-400">Вибраний значок</p><p className="text-sm font-bold text-stone-800">{chosen.label}</p></div></div><div className="flex gap-2"><button type="button" disabled={busy} onClick={onClose} className="rounded-xl px-3 py-2.5 text-sm font-semibold text-stone-500 hover:bg-stone-100 disabled:opacity-40">Скасувати</button><button type="button" disabled={busy || selected === category.icon} onClick={() => void save()} className="inline-flex items-center gap-2 rounded-xl bg-orange-600 px-4 py-2.5 text-sm font-bold text-white hover:bg-orange-700 disabled:opacity-40">{busy && <LoaderCircle className="h-4 w-4 animate-spin"/>}{busy ? 'Зберігаємо…' : 'Зберегти значок'}</button></div></div></div>
    </div>
  </div>;
}

import React, { useEffect, useState } from 'react';
import { financeOptionsApi } from '../api/client';
import type { FinanceOption } from '../types';
import { ExpenseIconPicker } from './ExpenseIconPicker';
import { expenseIcon } from '../utils/expenseIcons';

interface Props {
  options: FinanceOption[];
  onChanged: (options: FinanceOption[]) => void;
}

export const FinanceOptionsSettings: React.FC<Props> = ({ options, onChanged }) => {
  const [iconCategory, setIconCategory] = useState<FinanceOption | null>(null);
  const [names, setNames] = useState<Record<string, string>>({});
  const [newNames, setNewNames] = useState({ expense_category: '', payment_method: '' });
  const [busy, setBusy] = useState<string | null>(null);
  const [error, setError] = useState('');
  const [message, setMessage] = useState('');

  useEffect(() => setNames(Object.fromEntries(options.map((option) => [option.id, option.name]))), [options]);

  const refresh = async () => onChanged(await financeOptionsApi.list());
  const run = async (key: string, operation: () => Promise<void>) => {
    setBusy(key); setError(''); setMessage('');
    try {
      await operation();
      await refresh();
      setMessage('Список оновлено.');
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : 'Не вдалося зберегти зміни.');
    } finally {
      setBusy(null);
    }
  };

  const sections: { type: FinanceOption['type']; title: string }[] = [
    { type: 'expense_category', title: 'Категорії витрат' },
    { type: 'payment_method', title: 'Способи оплати' },
  ];

  return <section className="rounded-2xl bg-white border border-stone-200 p-5 sm:p-6 shadow-sm space-y-6">
    <div>
      <h3 className="text-lg font-bold text-stone-800">Категорії витрат і способи оплати</h3>
      <p className="mt-1 text-sm leading-relaxed text-stone-500">Натисніть значок ліворуч від назви категорії, щоб вибрати один зі 120 варіантів. Тут також можна змінювати назви та способи оплати. Назва закріпленої категорії «Зарплата» захищена від змін.</p>
    </div>
    {(error || message) && <div role="status" className={`rounded-xl px-4 py-3 text-sm ${error ? 'bg-red-50 text-red-700' : 'bg-emerald-50 text-emerald-700'}`}>{error || message}</div>}
    {sections.map(({ type, title }) => <div key={type} className="space-y-2">
      <h4 className="font-semibold text-stone-800">{title}</h4>
      {options.filter((option) => option.type === type).map((option) => { const Icon = expenseIcon(option).Icon; return <div key={option.id} className="flex flex-wrap gap-2 items-center">
        {type === 'expense_category' && <button type="button" disabled={busy !== null} aria-label={`Змінити значок: ${option.name}`} title="Змінити значок" onClick={() => setIconCategory(option)} className="rounded-xl border border-orange-100 bg-orange-50 p-2.5 text-orange-700 hover:border-orange-300 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-orange-200"><Icon className="h-5 w-5" /></button>}
        <input aria-label={`Назва: ${option.name}`} disabled={option.locked} value={names[option.id] ?? option.name} onChange={(event) => setNames((previous) => ({ ...previous, [option.id]: event.target.value }))} className="flex-1 min-w-48 rounded-xl border border-stone-200 px-3 py-2 text-sm focus:border-orange-400 outline-none" />
        {option.locked ? <span className="rounded-xl border border-orange-200 bg-orange-50 px-3 py-2 text-xs font-bold text-orange-800">Закріплено · автоматично</span> : <button type="button" disabled={busy !== null || !(names[option.id] ?? '').trim() || names[option.id]?.trim() === option.name} onClick={() => void run(option.id, async () => { await financeOptionsApi.update(option, names[option.id].trim()); })} className="rounded-xl bg-orange-600 px-3 py-2 text-sm font-semibold text-white disabled:opacity-50">Зберегти</button>}
        {!option.locked && option.code.startsWith('custom_') && <button type="button" disabled={busy !== null} onClick={() => { if (window.confirm(`Видалити «${option.name}»?`)) void run(option.id, () => financeOptionsApi.remove(option)); }} className="rounded-xl border border-red-200 px-3 py-2 text-sm font-semibold text-red-700 disabled:opacity-50">Видалити</button>}
      </div>; })}
      <div className="flex flex-wrap gap-2 pt-2">
        <input aria-label={`Нова: ${title}`} placeholder="Нова назва" value={newNames[type]} onChange={(event) => setNewNames((previous) => ({ ...previous, [type]: event.target.value }))} className="flex-1 min-w-48 rounded-xl border border-stone-200 px-3 py-2 text-sm focus:border-orange-400 outline-none" />
        <button type="button" disabled={busy !== null || !newNames[type].trim()} onClick={() => void run(type, async () => { await financeOptionsApi.create(type, newNames[type].trim()); setNewNames((previous) => ({ ...previous, [type]: '' })); })} className="rounded-xl border border-orange-300 px-4 py-2 text-sm font-semibold text-orange-700 disabled:opacity-50">Додати</button>
      </div>
    </div>)}
    {iconCategory && <ExpenseIconPicker category={iconCategory} onClose={() => setIconCategory(null)} onSaved={updated => onChanged(options.map(option => option.id === updated.id ? updated : option))} />}
  </section>;
};

import React, { useState } from 'react';
import { LockKeyhole, LockKeyholeOpen } from 'lucide-react';
import { monthClosureApi, type MonthClosureStatus } from '../api/client';
import { MONTH_NAMES_UK } from '../data/initialData';

interface Props {
  year: number;
  month: number;
  status: MonthClosureStatus | null;
  isDirector: boolean;
  onChanged: (status: MonthClosureStatus) => void;
}

export const MonthClosingPanel: React.FC<Props> = ({ year, month, status, isDirector, onChanged }) => {
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const label = `${MONTH_NAMES_UK[month - 1]} ${year}`;

  const change = async () => {
    if (!status || !isDirector) return;
    const confirmation = status.closed
      ? `Повторно відкрити ${label}? Після цього нарахування, оплати, витрати й зарплату можна буде змінювати.`
      : `Закрити ${label}? Нарахування, оплати, витрати й зарплату за цей місяць буде заблоковано. Дані залишаться доступними для перегляду.`;
    if (!window.confirm(confirmation)) return;
    setBusy(true); setError('');
    try {
      onChanged(status.closed ? await monthClosureApi.reopen(year, month) : await monthClosureApi.close(year, month));
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : 'Не вдалося змінити стан місяця.');
    } finally {
      setBusy(false);
    }
  };

  return <section className={`rounded-2xl border p-5 sm:p-6 shadow-sm ${status?.closed ? 'border-amber-200 bg-amber-50' : 'border-stone-200 bg-white'}`}>
    <div className="flex flex-wrap items-center justify-between gap-4">
      <div className="flex items-start gap-3">
        {status?.closed ? <LockKeyhole className="mt-1 h-5 w-5 text-amber-700" /> : <LockKeyholeOpen className="mt-1 h-5 w-5 text-emerald-700" />}
        <div>
          <h3 className="text-lg font-bold text-stone-800">{status?.closed ? 'Місяць закрито' : 'Закриття місяця'}</h3>
          <p className="mt-1 text-sm text-stone-600">{status?.closed
            ? `Дані за ${label} доступні для перегляду. Зміни заблоковано.${status.closedBy ? ` Закрив(ла): ${status.closedBy}.` : ''}`
            : `Перевірте рахунки, оплати, витрати й зарплату за ${label}, перш ніж закрити місяць.`}</p>
        </div>
      </div>
      {isDirector && <button type="button" disabled={busy || !status} onClick={() => void change()} className={`rounded-xl px-4 py-2.5 text-sm font-semibold disabled:opacity-50 ${status?.closed ? 'border border-amber-400 bg-white text-amber-900' : 'bg-orange-600 text-white hover:bg-orange-700'}`}>
        {busy ? 'Зберігаємо…' : status?.closed ? 'Повторно відкрити' : 'Закрити місяць'}
      </button>}
    </div>
    {error && <p role="alert" className="mt-3 text-sm text-red-700">{error}</p>}
  </section>;
};

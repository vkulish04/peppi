import React, { useEffect, useRef, useState } from 'react';
import { ArrowRight, CalendarArrowUp, CheckCircle2, LoaderCircle, X } from 'lucide-react';
import { journalApi, type JournalCarryForwardPreview } from '../api/client';
import { MONTH_NAMES_UK } from '../data/initialData';
import { formatCurrency } from '../utils/calculations';

interface Props { year: number; month: number; onOpenMonth: (year: number, month: number) => void }
const monthLabel = (year: number, month: number) => `${MONTH_NAMES_UK[month - 1]} ${year}`;

export function JournalCarryForwardPanel({ year, month, onOpenMonth }: Props) {
  const [open, setOpen] = useState(false);
  const [preview, setPreview] = useState<JournalCarryForwardPreview | null>(null);
  const [result, setResult] = useState<JournalCarryForwardPreview | null>(null);
  const [confirmed, setConfirmed] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const dialog = useRef<HTMLDivElement>(null);
  const trigger = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    if (!open) return;
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden'; dialog.current?.focus();
    return () => { document.body.style.overflow = previousOverflow; trigger.current?.focus(); };
  }, [open]);

  const show = async () => {
    setOpen(true); setPreview(null); setResult(null); setConfirmed(false); setError(''); setBusy(true);
    try { setPreview(await journalApi.previewCarryForward(year, month)); }
    catch (reason) { setError(reason instanceof Error ? reason.message : 'Не вдалося перевірити табель.'); }
    finally { setBusy(false); }
  };
  const copy = async () => {
    if (!preview || !confirmed || busy) return;
    setBusy(true); setError('');
    try { setResult(await journalApi.carryForward(preview.sourceYear, preview.sourceMonth, preview.previewHash)); }
    catch (reason) { setError(reason instanceof Error ? reason.message : 'Не вдалося перенести табель.'); setConfirmed(false); }
    finally { setBusy(false); }
  };

  return <>
    <section className="no-print mb-5 flex flex-wrap items-center justify-between gap-4 rounded-2xl border border-orange-200 bg-gradient-to-r from-orange-50 to-amber-50 p-4 sm:p-5">
      <div><h3 className="font-bold text-stone-900">Підготувати наступний місяць</h3><p className="mt-1 text-xs text-stone-600">Перенесіть усі галочки та кількість занять із вибраного місяця для всіх груп.</p></div>
      <button ref={trigger} type="button" onClick={() => void show()} className="inline-flex min-h-12 items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-orange-600 to-amber-500 px-5 py-3 text-sm font-extrabold text-white shadow-md transition hover:from-orange-700 hover:to-amber-600 active:scale-[0.98] focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-orange-200"><CalendarArrowUp className="h-5 w-5" strokeWidth={2.5} />Перенести табель<ArrowRight className="h-5 w-5" strokeWidth={3} /></button>
    </section>
    {open && <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4 backdrop-blur-xs">
      <div ref={dialog} tabIndex={-1} role="dialog" aria-modal="true" aria-labelledby="carry-forward-title"
        onKeyDown={(event) => {
          if (event.key === 'Escape' && !busy) setOpen(false);
          if (event.key === 'Tab') {
            const controls = Array.from(event.currentTarget.querySelectorAll<HTMLElement>('button:not([disabled]), input:not([disabled])'));
            const first = controls[0]; const last = controls[controls.length - 1];
            if (event.shiftKey && (document.activeElement === first || document.activeElement === dialog.current)) { event.preventDefault(); last?.focus(); }
            else if (!event.shiftKey && document.activeElement === last) { event.preventDefault(); first?.focus(); }
          }
        }} className="max-h-[90dvh] w-full max-w-xl overflow-y-auto rounded-3xl border border-orange-100 bg-white p-5 shadow-2xl outline-none sm:p-7">
        <div className="flex items-start justify-between gap-3">
          <div><span className="text-xs font-bold uppercase tracking-wider text-orange-600">Новий місяць</span><h2 id="carry-forward-title" className="mt-1 text-xl font-extrabold text-stone-900">{result ? 'Табель перенесено' : 'Підтвердьте перенесення табеля'}</h2></div>
          <button type="button" aria-label="Закрити вікно перенесення" disabled={busy} onClick={() => setOpen(false)} className="rounded-full p-2 text-stone-400 hover:bg-stone-100 hover:text-stone-700 disabled:opacity-40"><X className="h-5 w-5" /></button>
        </div>
        {busy && !preview && <p role="status" className="mt-6 flex items-center gap-2 text-sm text-stone-600"><LoaderCircle className="h-5 w-5 animate-spin text-orange-600" />Перевіряємо табель і наступний місяць…</p>}
        {preview && <>
          <div className="my-5 flex flex-wrap items-center justify-center gap-3 rounded-2xl bg-orange-50 p-4 text-sm font-bold text-orange-950"><span>{monthLabel(preview.sourceYear, preview.sourceMonth)}</span><ArrowRight className="h-5 w-5 text-orange-600" /><span>{monthLabel(preview.targetYear, preview.targetMonth)}</span></div>
          {result ? <div role="status" className="rounded-2xl bg-emerald-50 p-4 text-sm text-emerald-900"><CheckCircle2 className="mb-2 h-7 w-7 text-emerald-600" />Створено рахунки для {result.childrenCount} дітей. Перенесено {result.itemsCount} відміток послуг, зокрема {result.lessonsCount} окремих занять. До нарахування: <strong>{formatCurrency(result.total)}</strong>.</div> : <>
            <div className="grid grid-cols-3 gap-2 text-center">
              <div className="rounded-xl bg-stone-50 p-3"><div className="text-2xl font-extrabold text-stone-900">{preview.childrenCount}</div><div className="text-xs text-stone-500">дітей до перенесення</div></div>
              <div className="rounded-xl bg-stone-50 p-3"><div className="text-2xl font-extrabold text-stone-900">{preview.itemsCount}</div><div className="text-xs text-stone-500">відміток послуг</div></div>
              <div className="rounded-xl bg-stone-50 p-3"><div className="text-2xl font-extrabold text-stone-900">{preview.lessonsCount}</div><div className="text-xs text-stone-500">окремих занять</div></div>
            </div>
            <div className="mt-4 flex items-center justify-between gap-3 text-sm"><span className="text-stone-600">Нарахування наступного місяця</span><strong className="text-lg text-orange-700">{formatCurrency(preview.total)}</strong></div>
            <ul className="mt-4 space-y-2 text-xs leading-relaxed text-stone-600">
              <li>Копіюються всі вибрані активні послуги, включно з разовими, та кількість занять для всіх груп.</li>
              <li>Ціни беруться за наступний місяць, знижки — з актуальних карток дітей.</li>
              <li>Оплати, лікарняні, пропуски й разові коригування не копіюються.</li>
              <li>Рахунки, які вже є в наступному місяці, зберігаються без змін.</li>
            </ul>
            {preview.skippedCount > 0 && <p className="mt-3 rounded-xl bg-amber-50 p-3 text-xs font-semibold text-amber-900">У {preview.skippedCount} дітей уже є рахунки наступного місяця — їх буде пропущено.</p>}
            {preview.inactiveItemsCount > 0 && <p className="mt-2 text-xs text-amber-800">Неактивних послуг буде пропущено: {preview.inactiveItemsCount}.</p>}
            {preview.targetClosed && <p role="alert" className="mt-3 rounded-xl bg-red-50 p-3 text-sm text-red-800">Наступний місяць закрито. Спочатку його має відкрити директор.</p>}
            {!preview.childrenCount && <p className="mt-3 rounded-xl bg-stone-50 p-3 text-sm text-stone-600">Нових записів для перенесення немає.</p>}
            {preview.childrenCount > 0 && !preview.targetClosed && <label className="mt-5 flex cursor-pointer items-start gap-3 rounded-xl border border-orange-200 p-3 text-sm font-semibold text-stone-800"><input type="checkbox" checked={confirmed} disabled={busy} onChange={(event) => setConfirmed(event.target.checked)} className="mt-0.5 h-5 w-5 shrink-0 accent-orange-600" />Підтверджую створення нарахувань за {monthLabel(preview.targetYear, preview.targetMonth)}.</label>}
          </>}
        </>}
        {error && <p role="alert" className="mt-4 rounded-xl bg-red-50 p-3 text-sm text-red-800">{error}</p>}
        <div className="mt-6 flex flex-wrap justify-end gap-3 border-t border-stone-100 pt-4">
          <button type="button" disabled={busy} onClick={() => setOpen(false)} className="rounded-xl px-4 py-2.5 text-sm font-semibold text-stone-600 hover:bg-stone-100 disabled:opacity-40">{result ? 'Закрити' : 'Скасувати'}</button>
          {result ? <button type="button" onClick={() => { setOpen(false); onOpenMonth(result.targetYear, result.targetMonth); }} className="rounded-xl bg-orange-600 px-5 py-2.5 text-sm font-bold text-white hover:bg-orange-700">Відкрити наступний місяць</button> : preview && <button type="button" disabled={busy || !confirmed || !preview.childrenCount || preview.targetClosed} onClick={() => void copy()} className="inline-flex items-center gap-2 rounded-xl bg-orange-600 px-5 py-2.5 text-sm font-extrabold text-white hover:bg-orange-700 disabled:cursor-not-allowed disabled:opacity-40">{busy && <LoaderCircle className="h-4 w-4 animate-spin" />}{busy ? 'Переносимо…' : 'Підтвердити й перенести'}</button>}
        </div>
      </div>
    </div>}
  </>;
}

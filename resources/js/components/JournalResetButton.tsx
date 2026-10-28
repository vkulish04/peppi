import React, { useEffect, useRef, useState } from 'react';
import { Trash2, X, LoaderCircle, CheckCircle2 } from 'lucide-react';
import { journalApi, type JournalResetPreview } from '../api/client';
import { MONTH_NAMES_UK } from '../data/initialData';

interface Props { year: number; month: number; disabled: boolean; onCleared: () => Promise<void> }

export function JournalResetButton({ year, month, disabled, onCleared }: Props) {
  const [open, setOpen] = useState(false);
  const [preview, setPreview] = useState<JournalResetPreview | null>(null);
  const [confirmation, setConfirmation] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [done, setDone] = useState(false);
  const dialog = useRef<HTMLDivElement>(null);
  const trigger = useRef<HTMLButtonElement>(null);
  const label = `${MONTH_NAMES_UK[month - 1]} ${year}`;
  const phrase = `${String(month).padStart(2, '0')}.${year}`;
  useEffect(() => {
    if (!open) return;
    const overflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden'; dialog.current?.focus();
    return () => { document.body.style.overflow = overflow; trigger.current?.focus(); };
  }, [open]);
  const show = async () => {
    if (disabled) return;
    setOpen(true); setBusy(true); setError(''); setDone(false); setPreview(null); setConfirmation('');
    try { setPreview(await journalApi.previewReset(year, month)); }
    catch (reason) { setError(reason instanceof Error ? reason.message : 'Не вдалося перевірити місяць.'); }
    finally { setBusy(false); }
  };
  const clear = async () => {
    if (!preview || disabled || preview.closed || preview.crossPeriodPayments || confirmation !== phrase || busy) return;
    setBusy(true); setError('');
    try {
      await journalApi.reset(preview.year, preview.month, preview.previewHash);
      setDone(true);
      try { await onCleared(); }
      catch { setError('Місяць очищено, але не вдалося оновити екран. Оновіть сторінку.'); }
    } catch (reason) { setError(reason instanceof Error ? reason.message : 'Не вдалося очистити місяць.'); setConfirmation(''); }
    finally { setBusy(false); }
  };
  return <>
    <div className="no-print flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-stone-200 bg-white p-4">
      <div><h3 className="text-sm font-bold text-stone-800">Почати місяць заново</h3><p className="mt-1 text-xs text-stone-500">{disabled ? 'Закритий місяць захищено від очищення.' : 'Повне очищення вибраного місяця для всіх груп із резервною копією.'}</p></div>
      <button ref={trigger} type="button" disabled={disabled} onClick={() => void show()} className="inline-flex min-h-11 items-center gap-2 rounded-xl border border-red-200 bg-red-50 px-4 py-2.5 text-sm font-bold text-red-700 hover:bg-red-100 disabled:cursor-not-allowed disabled:opacity-40"><Trash2 className="h-5 w-5" />Очистити місяць</button>
    </div>
    {open && <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4 backdrop-blur-xs">
      <div ref={dialog} tabIndex={-1} role="dialog" aria-modal="true" aria-labelledby="journal-reset-title" className="max-h-[90dvh] w-full max-w-xl overflow-y-auto rounded-3xl bg-white p-5 shadow-2xl outline-none sm:p-7"
        onKeyDown={(event) => {
          if (event.key === 'Escape' && !busy) setOpen(false);
          if (event.key === 'Tab') {
            const controls = Array.from(event.currentTarget.querySelectorAll<HTMLElement>('button:not([disabled]), input:not([disabled])'));
            const first = controls[0]; const last = controls[controls.length - 1];
            if (event.shiftKey && (document.activeElement === first || document.activeElement === dialog.current)) { event.preventDefault(); last?.focus(); }
            else if (!event.shiftKey && document.activeElement === last) { event.preventDefault(); first?.focus(); }
          }
        }}>
        <div className="flex items-start justify-between gap-3"><div><p className="text-xs font-bold uppercase tracking-wider text-red-600">{label}</p><h2 id="journal-reset-title" className="mt-1 text-xl font-extrabold text-stone-900">{done ? 'Місяць очищено' : 'Повністю очистити місяць?'}</h2></div><button type="button" aria-label="Закрити вікно очищення" disabled={busy} onClick={() => setOpen(false)} className="rounded-full p-2 text-stone-400 hover:bg-stone-100 disabled:opacity-40"><X className="h-5 w-5" /></button></div>
        {busy && !preview && <p role="status" className="mt-5 flex items-center gap-2 text-sm text-stone-600"><LoaderCircle className="h-5 w-5 animate-spin" />Перевіряємо місяць…</p>}
        {done ? <p role="status" className="mt-5 rounded-xl bg-emerald-50 p-4 text-sm text-emerald-900"><CheckCircle2 className="mb-2 h-6 w-6" />Усі фінансові записи цього місяця видалено. Резервна копія збережена на сервері; для відновлення зверніться до адміністратора.</p> : preview && <>
          <p className="mt-5 rounded-xl bg-red-50 p-4 text-sm font-semibold leading-relaxed text-red-900">Буде видалено всі галочки, кількість занять, нарахування, оплати, лікарняні, пропуски, коригування, зарплати та витрати за {label} для всіх груп. Фільтри табеля не обмежують очищення.</p>
          <dl className="mt-4 grid grid-cols-3 gap-2 text-center text-xs text-stone-500">{[['Рахунки',preview.counts.monthly_bills],['Оплати',preview.counts.payments],['Відмітки послуг',preview.counts.monthly_bill_items],['Зарплати',preview.counts.payrolls],['Виплати зарплат',preview.counts.payroll_payments],['Витрати',preview.counts.expenses]].map(([name,count])=><div key={name} className="rounded-xl bg-stone-50 p-3"><dt>{name}</dt><dd className="mt-1 text-xl font-extrabold text-stone-800">{count}</dd></div>)}</dl>
          <p className="mt-4 text-xs leading-relaxed text-stone-600">Перед очищенням автоматично зберігається резервна копія записів місяця. Діти, групи, тарифи та інші місяці залишаться. Автоматичне нарахування зарплат за цей місяць буде зупинено.</p>
          {preview.closed || disabled ? <p role="alert" className="mt-4 rounded-xl bg-amber-50 p-3 text-sm font-bold text-amber-900">Місяць закрито. Очищення заборонено.</p> : preview.crossPeriodPayments ? <p role="alert" className="mt-4 rounded-xl bg-amber-50 p-3 text-sm text-amber-900">Є платежі, пов’язані з іншим місяцем. Спочатку перевірте їх — очищення заблоковано.</p> : <label className="mt-5 block text-sm font-bold text-stone-800">Для підтвердження введіть {phrase}<input aria-label="Місяць для підтвердження очищення" value={confirmation} disabled={busy} onChange={(event)=>setConfirmation(event.target.value)} placeholder={phrase} autoComplete="off" className="mt-2 block w-full rounded-xl border border-stone-300 px-4 py-3 text-base outline-none focus:border-red-500 focus:ring-2 focus:ring-red-100" /></label>}
        </>}
        {error && <p role="alert" className="mt-4 rounded-xl bg-red-50 p-3 text-sm text-red-800">{error}</p>}
        <div className="mt-6 flex flex-wrap justify-end gap-3 border-t border-stone-100 pt-4"><button type="button" disabled={busy} onClick={()=>setOpen(false)} className="rounded-xl px-4 py-2.5 text-sm font-semibold text-stone-600 hover:bg-stone-100 disabled:opacity-40">{done ? 'Закрити' : 'Скасувати'}</button>{!done && <button type="button" disabled={busy || disabled || !preview || preview.closed || preview.crossPeriodPayments || confirmation !== phrase} onClick={()=>void clear()} className="inline-flex items-center gap-2 rounded-xl bg-red-600 px-5 py-2.5 text-sm font-extrabold text-white hover:bg-red-700 disabled:cursor-not-allowed disabled:opacity-40">{busy && <LoaderCircle className="h-4 w-4 animate-spin" />}{busy ? 'Очищуємо…' : 'Підтвердити й очистити'}</button>}</div>
      </div>
    </div>}
  </>;
}

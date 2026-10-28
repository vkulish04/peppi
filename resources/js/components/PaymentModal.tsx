import React, { useEffect, useMemo, useState } from 'react';
import { Banknote, CalendarDays, CreditCard, Landmark, Save, X } from 'lucide-react';
import type { BillSummary, FinanceOption, PaymentInput, PaymentMethod, PaymentRecord } from '../types';
import { formatCurrency } from '../utils/calculations';
import { MONTH_NAMES_UK } from '../data/initialData';

interface PaymentModalProps {
  bill: BillSummary;
  payment?: PaymentRecord;
  onClose: () => void;
  onSave: (input: PaymentInput) => Promise<void>;
  paymentMethods: FinanceOption[];
}

export const PaymentModal: React.FC<PaymentModalProps> = ({ bill, payment, onClose, onSave, paymentMethods }) => {
  const allowedAmount = useMemo(
    () => Math.max(0, bill.debt + (payment?.amount ?? 0)),
    [bill.debt, payment?.amount],
  );
  const [amount, setAmount] = useState<string>('');
  const [paymentDate, setPaymentDate] = useState(new Date().toISOString().slice(0, 10));
  const [paymentMethod, setPaymentMethod] = useState<PaymentMethod>('cash');
  const [reference, setReference] = useState('');
  const [notes, setNotes] = useState('');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    setAmount(String(payment?.amount ?? (bill.debt > 0 ? bill.debt : '')));
    setPaymentDate(payment?.paymentDate ?? new Date().toISOString().slice(0, 10));
    setPaymentMethod(payment?.paymentMethod ?? 'cash');
    setReference(payment?.reference ?? '');
    setNotes(payment?.notes ?? '');
    setError('');
  }, [bill.id, bill.debt, payment?.id]);

  const submit = async (event: React.FormEvent) => {
    event.preventDefault();
    const parsed = Number(String(amount).replace(',', '.'));
    if (!Number.isFinite(parsed) || parsed <= 0) {
      setError('Вкажіть коректну суму платежу.');
      return;
    }
    if (parsed - allowedAmount > 0.009) {
      setError(`Максимальна сума для цього платежу: ${formatCurrency(allowedAmount)}.`);
      return;
    }

    setSaving(true);
    setError('');
    try {
      await onSave({
        amount: parsed,
        paymentDate,
        paymentMethod,
        reference: reference.trim() || undefined,
        notes: notes.trim() || undefined,
      });
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Не вдалося зберегти платіж.');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 z-[70] flex items-center justify-center p-3 sm:p-5 bg-black/55 backdrop-blur-sm overflow-y-auto">
      <form onSubmit={submit} className="w-full max-w-lg bg-white rounded-3xl shadow-2xl border border-orange-100 overflow-hidden">
        <div className="px-5 py-4 sm:px-6 border-b border-stone-200 flex items-start justify-between gap-4 bg-orange-50/70">
          <div>
            <h3 className="font-extrabold text-stone-900 text-lg font-heading">
              {payment ? 'Редагування платежу' : 'Новий платіж'}
            </h3>
            <p className="text-xs text-stone-600 mt-1">
              {MONTH_NAMES_UK[bill.month - 1]} {bill.year} • До сплати {formatCurrency(bill.total)}
            </p>
          </div>
          <button type="button" onClick={onClose} className="p-2 rounded-xl hover:bg-white text-stone-500" aria-label="Закрити">
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="p-5 sm:p-6 space-y-5">
          <div className="grid grid-cols-3 gap-2 text-center">
            <div className="rounded-2xl border border-stone-200 bg-stone-50 p-3">
              <div className="text-[10px] uppercase text-stone-500 font-bold">Нараховано</div>
              <div className="text-sm font-extrabold mt-1">{formatCurrency(bill.total)}</div>
            </div>
            <div className="rounded-2xl border border-emerald-200 bg-emerald-50 p-3">
              <div className="text-[10px] uppercase text-emerald-700 font-bold">Сплачено</div>
              <div className="text-sm font-extrabold text-emerald-800 mt-1">{formatCurrency(bill.paid)}</div>
            </div>
            <div className="rounded-2xl border border-amber-200 bg-amber-50 p-3">
              <div className="text-[10px] uppercase text-amber-700 font-bold">Борг</div>
              <div className="text-sm font-extrabold text-amber-800 mt-1">{formatCurrency(bill.debt)}</div>
            </div>
          </div>

          <div>
            <label className="block text-xs font-bold text-stone-700 mb-1.5">Сума платежу, грн</label>
            <div className="relative">
              <Banknote className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-orange-600" />
              <input
                autoFocus
                required
                inputMode="decimal"
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
                className="w-full rounded-xl border border-stone-300 pl-10 pr-3 py-2.5 text-base font-bold outline-none focus:ring-2 focus:ring-orange-300 focus:border-orange-400"
                placeholder="0.00"
              />
            </div>
            <div className="flex items-center justify-between gap-2 mt-1.5 text-[11px] text-stone-500">
              <span>Максимум: {formatCurrency(allowedAmount)}</span>
              {!payment && bill.debt > 0 && (
                <button type="button" onClick={() => setAmount(String(bill.debt))} className="text-orange-700 font-bold hover:underline">
                  Весь борг
                </button>
              )}
            </div>
          </div>

          <div className="grid sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-bold text-stone-700 mb-1.5">Дата</label>
              <div className="relative">
                <CalendarDays className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-stone-400" />
                <input type="date" required value={paymentDate} onChange={(e) => setPaymentDate(e.target.value)} className="w-full rounded-xl border border-stone-300 pl-10 pr-3 py-2.5 text-sm" />
              </div>
            </div>
            <div>
              <label className="block text-xs font-bold text-stone-700 mb-1.5">Спосіб оплати</label>
              <select value={paymentMethod} onChange={(e) => setPaymentMethod(e.target.value as PaymentMethod)} className="w-full rounded-xl border border-stone-300 px-3 py-2.5 text-sm bg-white">
                {paymentMethods.map((method) => <option key={method.id} value={method.code}>{method.name}</option>)}
              </select>
            </div>
          </div>

          <div className="grid sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-bold text-stone-700 mb-1.5">Номер / референс</label>
              <div className="relative">
                {paymentMethod === 'bank_transfer' ? <Landmark className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-stone-400" /> : <CreditCard className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-stone-400" />}
                <input value={reference} onChange={(e) => setReference(e.target.value)} className="w-full rounded-xl border border-stone-300 pl-10 pr-3 py-2.5 text-sm" placeholder="необов'язково" />
              </div>
            </div>
            <div>
              <label className="block text-xs font-bold text-stone-700 mb-1.5">Примітка</label>
              <input value={notes} onChange={(e) => setNotes(e.target.value)} className="w-full rounded-xl border border-stone-300 px-3 py-2.5 text-sm" placeholder="необов'язково" />
            </div>
          </div>

          {error && <div className="rounded-xl border border-red-200 bg-red-50 px-3 py-2 text-xs font-semibold text-red-700">{error}</div>}
        </div>

        <div className="px-5 py-4 sm:px-6 bg-stone-50 border-t border-stone-200 flex justify-end gap-2">
          <button type="button" onClick={onClose} className="px-4 py-2.5 rounded-xl text-sm font-semibold border border-stone-300 bg-white hover:bg-stone-100">Скасувати</button>
          <button disabled={saving} className="px-4 py-2.5 rounded-xl text-sm font-bold bg-orange-600 hover:bg-orange-700 disabled:opacity-60 text-white inline-flex items-center gap-2">
            <Save className="w-4 h-4" /> {saving ? 'Збереження…' : 'Зберегти платіж'}
          </button>
        </div>
      </form>
    </div>
  );
};

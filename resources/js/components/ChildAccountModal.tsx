import React, { useState } from 'react';
import { ChevronDown, ChevronUp, Download, History, Pencil, Plus, ReceiptText, Trash2, UserRound, WalletCards, X } from 'lucide-react';
import type { BillSummary, Child, ChildAccount, FinanceOption, PaymentRecord } from '../types';
import { formatCurrency } from '../utils/calculations';
import { MONTH_NAMES_UK } from '../data/initialData';

interface ChildAccountModalProps {
  child: Child;
  account: ChildAccount | null;
  loading: boolean;
  onClose: () => void;
  onAddPayment: (bill: BillSummary) => void;
  onEditPayment: (bill: BillSummary, payment: PaymentRecord) => void;
  onDeletePayment: (payment: PaymentRecord) => Promise<void>;
  onDownloadReceipt: (bill: BillSummary) => Promise<void>;
  paymentMethods: FinanceOption[];
}

const statusLabel: Record<BillSummary['status'], string> = {
  draft: 'Чернетка',
  unpaid: 'Не сплачено',
  partially_paid: 'Частково',
  paid: 'Сплачено',
};

const statusClass: Record<BillSummary['status'], string> = {
  draft: 'bg-stone-100 text-stone-700',
  unpaid: 'bg-amber-100 text-amber-800',
  partially_paid: 'bg-blue-100 text-blue-800',
  paid: 'bg-emerald-100 text-emerald-800',
};

export const ChildAccountModal: React.FC<ChildAccountModalProps> = ({
  child,
  account,
  loading,
  onClose,
  onAddPayment,
  onEditPayment,
  onDeletePayment,
  onDownloadReceipt,
  paymentMethods,
}) => {
  const [expanded, setExpanded] = useState<string | null>(null);
  const [busyPayment, setBusyPayment] = useState<string | null>(null);
  const [busyPdf, setBusyPdf] = useState<string | null>(null);
  const credit = account?.bills.reduce((sum, bill) => sum + Math.max(0, bill.paid - bill.total), 0) ?? 0;

  const deletePayment = async (payment: PaymentRecord) => {
    if (!window.confirm(`Видалити платіж ${formatCurrency(payment.amount)} від ${payment.paymentDate}?`)) return;
    setBusyPayment(payment.id);
    try { await onDeletePayment(payment); } finally { setBusyPayment(null); }
  };

  const downloadReceipt = async (bill: BillSummary) => {
    setBusyPdf(bill.id);
    try { await onDownloadReceipt(bill); } finally { setBusyPdf(null); }
  };

  return (
    <div className="fixed inset-0 z-[60] bg-black/50 backdrop-blur-sm p-2 sm:p-4 flex items-center justify-center overflow-y-auto">
      <div className="w-full max-w-5xl bg-[#FFFDF9] rounded-3xl shadow-2xl border border-orange-100 max-h-[96vh] overflow-hidden flex flex-col">
        <div className="px-5 sm:px-7 py-4 border-b border-orange-100 bg-white flex items-start justify-between gap-3">
          <div className="flex items-start gap-3 min-w-0">
            <div className="w-11 h-11 rounded-2xl bg-orange-600 text-white flex items-center justify-center shrink-0"><UserRound className="w-5 h-5" /></div>
            <div className="min-w-0">
              <h2 className="font-extrabold text-stone-900 text-lg sm:text-xl font-heading truncate">{child.fullName}</h2>
              <div className="text-xs text-stone-500 mt-0.5 flex flex-wrap gap-x-3 gap-y-1">
                <span>{child.group}</span>
                {child.parentName && <span>Батьки: {child.parentName}</span>}
                {child.parentPhone && <span>{child.parentPhone}</span>}
              </div>

            </div>
          </div>
          <button onClick={onClose} className="p-2 rounded-xl text-stone-500 hover:bg-stone-100" aria-label="Закрити"><X className="w-5 h-5" /></button>
        </div>

        <div className="overflow-y-auto p-4 sm:p-6 space-y-5">
          {loading || !account ? (
            <div className="py-16 text-center text-stone-500">Завантажуємо історію нарахувань…</div>
          ) : (
            <>
              <div className="grid grid-cols-2 lg:grid-cols-4 gap-2.5 sm:gap-4">
                <div className="bg-white border border-stone-200 rounded-2xl p-4"><div className="text-[10px] font-bold text-stone-500 uppercase">Місяців</div><div className="text-xl font-extrabold mt-1">{account.summary.months}</div></div>
                <div className="bg-white border border-orange-200 rounded-2xl p-4"><div className="text-[10px] font-bold text-orange-700 uppercase">Нараховано</div><div className="text-xl font-extrabold mt-1">{formatCurrency(account.summary.billed)}</div></div>
                <div className="bg-white border border-emerald-200 rounded-2xl p-4"><div className="text-[10px] font-bold text-emerald-700 uppercase">Сплачено</div><div className="text-xl font-extrabold text-emerald-800 mt-1">{formatCurrency(account.summary.paid)}</div></div>
                <div className="bg-white border border-amber-200 rounded-2xl p-4"><div className="text-[10px] font-bold text-amber-700 uppercase">Загальний борг</div><div className="text-xl font-extrabold text-amber-800 mt-1">{formatCurrency(account.summary.debt)}</div></div>
              </div>

              {credit > 0 && <div className="rounded-2xl border border-teal-200 bg-teal-50 p-3 text-sm text-teal-900">
                Переплата після перерахунку: <b>{formatCurrency(credit)}</b>. Платежі збережено; цю суму потрібно врахувати окремо.
              </div>}

              <div className="flex items-center gap-2 text-stone-800"><History className="w-5 h-5 text-orange-600" /><h3 className="font-extrabold font-heading">Помісячна історія</h3></div>

              {account.bills.length === 0 ? (
                <div className="bg-white border border-dashed border-stone-300 rounded-2xl py-12 text-center text-stone-500">Для цієї дитини ще немає нарахувань.</div>
              ) : (
                <div className="space-y-3">
                  {account.bills.map((bill) => {
                    const open = expanded === bill.id;
                    return (
                      <div key={bill.id} className="bg-white rounded-2xl border border-stone-200 overflow-hidden shadow-xs">
                        <div className="p-4 flex flex-col lg:flex-row lg:items-center gap-3 lg:gap-4">
                          <button className="flex-1 text-left min-w-0" onClick={() => setExpanded(open ? null : bill.id)}>
                            <div className="flex items-center flex-wrap gap-2">
                              <span className="font-extrabold text-stone-900">{MONTH_NAMES_UK[bill.month - 1]} {bill.year}</span>
                              <span className={`text-[10px] px-2 py-0.5 rounded-full font-bold ${statusClass[bill.status]}`}>{statusLabel[bill.status]}</span>
                            </div>
                            <div className="mt-1.5 text-xs text-stone-500 flex flex-wrap gap-x-4 gap-y-1">
                              <span>Нараховано: <b className="text-stone-800">{formatCurrency(bill.total)}</b></span>
                              <span>Сплачено: <b className="text-emerald-700">{formatCurrency(bill.paid)}</b></span>
                              <span>Борг: <b className={bill.debt > 0 ? 'text-amber-700' : 'text-stone-700'}>{formatCurrency(bill.debt)}</b></span>
                              {bill.paid > bill.total && <span>Переплата: <b className="text-teal-700">{formatCurrency(bill.paid - bill.total)}</b></span>}
                            </div>
                          </button>
                          <div className="flex items-center gap-2 shrink-0">
                            {bill.debt > 0 && <button onClick={() => onAddPayment(bill)} className="px-3 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold inline-flex items-center gap-1.5"><Plus className="w-3.5 h-3.5" /> Платіж</button>}
                            <button onClick={() => void downloadReceipt(bill)} className="px-3 py-2 rounded-xl bg-orange-100 hover:bg-orange-200 text-orange-800 text-xs font-bold inline-flex items-center gap-1.5" disabled={busyPdf === bill.id}><Download className="w-3.5 h-3.5" /> {busyPdf === bill.id ? 'PDF…' : 'PDF'}</button>
                            <button onClick={() => setExpanded(open ? null : bill.id)} className="p-2 rounded-xl border border-stone-200 text-stone-500 hover:bg-stone-50">{open ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}</button>
                          </div>
                        </div>

                        {open && (
                          <div className="border-t border-stone-200 p-4 sm:p-5 bg-stone-50/60 grid lg:grid-cols-2 gap-5">
                            <div>
                              <div className="flex items-center gap-2 mb-2"><ReceiptText className="w-4 h-4 text-orange-600" /><h4 className="text-xs font-extrabold uppercase tracking-wider text-stone-600">Нарахування</h4></div>
                              <div className="rounded-xl border border-stone-200 bg-white overflow-hidden">
                                {bill.items.map((item) => (
                                  <div key={item.id} className="flex items-center justify-between gap-3 px-3 py-2.5 border-b last:border-b-0 border-stone-100 text-xs">
                                    <div><div className="font-semibold text-stone-800">{item.name}</div><div className="text-[10px] text-stone-400">{item.quantity} × {formatCurrency(item.unitPrice)}</div></div>
                                    <div className="font-bold">{formatCurrency(item.amount)}</div>
                                  </div>
                                ))}
                                <div className="px-3 py-2.5 bg-stone-50 text-xs space-y-1">
                                  <div className="flex justify-between"><span>Підсумок</span><b>{formatCurrency(bill.subtotal)}</b></div>
                                  {bill.discountAmount > 0 && <div className="flex justify-between text-emerald-700"><span>Знижка на абонемент ({bill.discountPercent}%)</span><b>-{formatCurrency(bill.discountAmount)}</b></div>}
                                  {bill.deductionsTotal > 0 && <div className="flex justify-between text-teal-700"><span>Перерахунки</span><b>-{formatCurrency(bill.deductionsTotal)}</b></div>}
                                  <div className="flex justify-between border-t border-stone-200 pt-1.5 font-extrabold text-sm"><span>До сплати</span><span>{formatCurrency(bill.total)}</span></div>
                                </div>
                              </div>
                              {(bill.sickLeaveDays > 0 || bill.absenceDays > 0 || bill.absenceNote) && <div className="mt-2 rounded-xl bg-teal-50 border border-teal-200 p-3 text-[11px] text-teal-900">Лікарняні: {bill.sickLeaveDays} дн. • Пропуски: {bill.absenceDays} дн.{bill.absenceNote ? ` • ${bill.absenceNote}` : ''}</div>}
                            </div>

                            <div>
                              <div className="flex items-center justify-between gap-2 mb-2">
                                <div className="flex items-center gap-2"><WalletCards className="w-4 h-4 text-emerald-600" /><h4 className="text-xs font-extrabold uppercase tracking-wider text-stone-600">Платежі</h4></div>
                                {bill.debt > 0 && <button onClick={() => onAddPayment(bill)} className="text-[11px] font-bold text-emerald-700 hover:underline">+ Додати</button>}
                              </div>
                              {bill.payments.length === 0 ? (
                                <div className="rounded-xl border border-dashed border-stone-300 bg-white py-8 text-center text-xs text-stone-500">Платежів ще немає.</div>
                              ) : (
                                <div className="space-y-2">
                                  {bill.payments.map((payment) => (
                                    <div key={payment.id} className="rounded-xl border border-stone-200 bg-white p-3 flex items-start justify-between gap-3">
                                      <div className="min-w-0">
                                        <div className="font-extrabold text-emerald-800">{formatCurrency(payment.amount)}</div>
                                        <div className="text-[11px] text-stone-500 mt-0.5">{payment.paymentDate} • {paymentMethods.find((method) => method.code === payment.paymentMethod)?.name ?? payment.paymentMethod}{payment.reference ? ` • ${payment.reference}` : ''}</div>
                                        {payment.notes && <div className="text-[11px] text-stone-600 mt-1">{payment.notes}</div>}
                                        {payment.createdByName && <div className="text-[10px] text-stone-400 mt-1">Вніс: {payment.createdByName}</div>}
                                      </div>
                                      <div className="flex items-center gap-1 shrink-0">
                                        <button onClick={() => onEditPayment(bill, payment)} className="p-1.5 rounded-lg hover:bg-stone-100 text-stone-500" title="Редагувати"><Pencil className="w-3.5 h-3.5" /></button>
                                        <button disabled={busyPayment === payment.id} onClick={() => void deletePayment(payment)} className="p-1.5 rounded-lg hover:bg-red-50 text-red-500 disabled:opacity-50" title="Видалити"><Trash2 className="w-3.5 h-3.5" /></button>
                                      </div>
                                    </div>
                                  ))}
                                </div>
                              )}
                            </div>
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              )}
            </>
          )}
        </div>
      </div>
    </div>
  );
};

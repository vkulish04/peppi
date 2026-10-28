import React, { useEffect, useRef, useState } from 'react';
import { Banknote, Building2, CheckCircle2, LoaderCircle, Plus, Wallet, X } from 'lucide-react';
import type { Employee, PayrollDisbursementInput, SalaryPayment } from '../types';
import { formatCurrency } from '../utils/calculations';
import { MONTH_NAMES_UK } from '../data/initialData';

interface Props { employee: Employee; payroll: SalaryPayment; readOnly: boolean; onClose: () => void; onAdd: (input: PayrollDisbursementInput) => Promise<void> }

export function PayrollPaymentsModal({employee,payroll,readOnly,onClose,onAdd}: Props) {
  const [stage,setStage]=useState<'advance'|'salary'>('advance');
  const [method,setMethod]=useState<'bank'|'cash'>('bank');
  const [official,setOfficial]=useState(false);
  const [amount,setAmount]=useState('');
  const [date,setDate]=useState(()=>new Date().toLocaleDateString('en-CA'));
  const [notes,setNotes]=useState('');
  const [busy,setBusy]=useState(false);
  const [error,setError]=useState('');
  const [success,setSuccess]=useState(false);
  const requestId=useRef(crypto.randomUUID());
  const dialog=useRef<HTMLDivElement>(null);
  const remaining=payroll.remainingAmount ?? Math.max(0,payroll.finalAmount-(payroll.paidAmount ?? 0));
  const paid=payroll.paidAmount ?? 0;
  useEffect(()=>{
    const prior=document.activeElement as HTMLElement | null;
    const overflow=document.body.style.overflow; document.body.style.overflow='hidden'; dialog.current?.focus();
    return ()=>{document.body.style.overflow=overflow;prior?.focus();};
  },[]);
  const submit=async(event:React.FormEvent)=>{
    event.preventDefault(); if(busy || readOnly) return;
    setBusy(true);setError('');setSuccess(false);
    try{
      await onAdd({amount:Number(amount),stage,paymentMethod:method,isOfficial:official,paymentDate:date,notes,requestId:requestId.current});
      requestId.current=crypto.randomUUID();setAmount('');setNotes('');setSuccess(true);
    }catch(reason){setError(reason instanceof Error ? reason.message : 'Не вдалося додати виплату.');}
    finally{setBusy(false);}
  };
  return <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4 backdrop-blur-xs"><div ref={dialog} role="dialog" aria-modal="true" aria-labelledby="payroll-payments-title" tabIndex={-1} className="max-h-[90dvh] w-full max-w-2xl overflow-y-auto rounded-3xl border border-orange-100 bg-white p-5 shadow-2xl outline-none sm:p-7"
    onKeyDown={(event)=>{
      if(event.key==='Escape' && !busy)onClose();
      if(event.key==='Tab'){
        const elements=Array.from(event.currentTarget.querySelectorAll<HTMLElement>('button:not([disabled]), input:not([disabled]), select:not([disabled]), textarea:not([disabled])'));
        const first=elements[0],last=elements[elements.length-1];
        if(event.shiftKey && (document.activeElement===first || document.activeElement===dialog.current)){event.preventDefault();last?.focus();}
        else if(!event.shiftKey && document.activeElement===last){event.preventDefault();first?.focus();}
      }
    }}>
    <div className="flex items-start justify-between gap-3"><div><p className="text-xs font-bold uppercase tracking-wider text-orange-600">Виплати частинами</p><h2 id="payroll-payments-title" className="mt-1 text-xl font-extrabold text-stone-900">Аванс і зарплата</h2><p className="mt-1 text-sm text-stone-500">{employee.fullName} · {MONTH_NAMES_UK[payroll.month-1]} {payroll.year}</p></div><button type="button" disabled={busy} aria-label="Закрити виплати" onClick={onClose} className="rounded-full p-2 text-stone-400 hover:bg-stone-100 disabled:opacity-40"><X className="h-5 w-5" /></button></div>
    <div className="my-5 grid grid-cols-3 gap-2">{[['Нараховано',payroll.finalAmount],['Вже виплачено',paid],['Залишилось',remaining]].map(([label,value])=><div key={label} className="rounded-2xl bg-orange-50 p-3"><p className="text-[11px] font-semibold text-stone-500">{label}</p><p className="mt-1 text-base font-extrabold text-orange-900">{formatCurrency(Number(value))}</p></div>)}</div>
    <section><h3 className="mb-3 text-sm font-bold text-stone-800">Історія виплат</h3>{!payroll.payments?.length ? <p className="rounded-xl bg-stone-50 p-4 text-sm text-stone-500">Виплат ще немає. Додайте аванс або зарплату нижче.</p> : <ul className="space-y-2">{payroll.payments.map(payment=><li key={payment.id} className="rounded-xl border border-stone-200 p-3"><div className="flex flex-wrap items-center justify-between gap-2"><span className="flex items-center gap-2 text-sm font-bold text-stone-800">{payment.stage==='advance' ? <Wallet className="h-4 w-4 text-orange-600"/> : <Banknote className="h-4 w-4 text-emerald-600"/>}{payment.legacy ? 'Попередня виплата' : payment.stage==='advance' ? 'Аванс' : 'Зарплата'}</span><strong className="text-sm text-stone-900">{formatCurrency(payment.amount)}</strong></div><p className="mt-1 text-xs text-stone-500">{payment.paymentDate ?? 'Дату не вказано'} · {payment.paymentMethod==='bank' ? 'На рахунок' : payment.paymentMethod==='cash' ? 'Готівка' : 'Спосіб не вказано'} · {payment.isOfficial===null ? 'Офіційність не вказано' : payment.isOfficial ? 'Офіційна зарплата' : 'Без позначки «офіційна»'}</p>{payment.notes && <p className="mt-2 text-xs text-stone-600">{payment.notes}</p>}</li>)}</ul>}</section>
    {success && <p role="status" className="mt-4 flex items-center gap-2 rounded-xl bg-emerald-50 p-3 text-sm text-emerald-900"><CheckCircle2 className="h-5 w-5"/>Виплату збережено. Залишок оновлено.</p>}
    {readOnly ? <p className="mt-5 rounded-xl bg-amber-50 p-4 text-sm text-amber-900">Місяць закрито. Додавати виплати не можна.</p> : remaining<=0 ? <p className="mt-5 rounded-xl bg-stone-50 p-4 text-sm text-stone-600">{payroll.finalAmount>0 ? 'Зарплату повністю виплачено.' : 'Спочатку збережіть нарахування працівнику.'}</p> : <form onSubmit={submit} className="mt-5 space-y-4 border-t border-stone-100 pt-5"><h3 className="text-sm font-bold text-stone-900">Додати виплату</h3>
      <fieldset disabled={busy} className="space-y-4 disabled:opacity-60"><div className="grid grid-cols-2 gap-3">{(['advance','salary'] as const).map(value=><button key={value} type="button" aria-pressed={stage===value} onClick={()=>setStage(value)} className={`flex min-h-12 items-center justify-center gap-2 rounded-xl border px-4 py-3 text-sm font-bold ${stage===value?'border-orange-500 bg-orange-50 text-orange-800':'border-stone-200 text-stone-600 hover:bg-stone-50'}`}>{value==='advance'?<Wallet className="h-5 w-5"/>:<Banknote className="h-5 w-5"/>}{value==='advance'?'Аванс':'Зарплата'}</button>)}</div>
      <div className="grid gap-4 sm:grid-cols-2"><label className="text-xs font-bold text-stone-700">Сума виплати, грн<input type="number" required min="0.01" step="0.01" max={remaining} value={amount} onChange={event=>setAmount(event.target.value)} placeholder="0,00" className="mt-2 w-full rounded-xl border border-stone-300 px-3 py-3 text-base outline-none focus:border-orange-500 focus:ring-2 focus:ring-orange-100"/><button type="button" onClick={()=>setAmount(String(remaining))} className="mt-1.5 text-xs font-semibold text-orange-700 hover:underline">Весь залишок: {formatCurrency(remaining)}</button></label><label className="text-xs font-bold text-stone-700">Дата виплати<input type="date" required value={date} onChange={event=>setDate(event.target.value)} className="mt-2 w-full rounded-xl border border-stone-300 px-3 py-3 text-sm"/></label></div>
      <label className="block text-xs font-bold text-stone-700">Спосіб виплати<div className="relative mt-2"><Building2 className="pointer-events-none absolute left-3 top-3.5 h-4 w-4 text-orange-600"/><select value={method} onChange={event=>setMethod(event.target.value as 'bank'|'cash')} className="w-full rounded-xl border border-stone-300 bg-white py-3 pl-10 pr-3 text-sm"><option value="bank">На рахунок</option><option value="cash">Готівка</option></select></div></label>
      <label className="flex items-start gap-3 rounded-xl border border-orange-200 bg-orange-50/50 p-3"><input type="checkbox" checked={official} onChange={event=>setOfficial(event.target.checked)} className="mt-0.5 h-5 w-5 accent-orange-600"/><span className="text-sm font-bold text-stone-800">Офіційна зарплата<span className="mt-1 block text-xs font-normal text-stone-500">Облікова позначка для цієї виплати. Податки автоматично не розраховуються.</span></span></label>
      <label className="block text-xs font-bold text-stone-700">Коментар<input value={notes} maxLength={1000} onChange={event=>setNotes(event.target.value)} placeholder="Наприклад, аванс за першу половину місяця" className="mt-2 w-full rounded-xl border border-stone-300 px-3 py-3 text-sm"/></label></fieldset>
      <p className="text-xs leading-relaxed text-stone-500">Кнопка зберігає обліковий запис виплати. Банківський переказ не виконується. Аванс зменшує залишок до виплати, а не нараховану зарплату.</p>
      {error && <p role="alert" className="rounded-xl bg-red-50 p-3 text-sm text-red-800">{error}</p>}
      <div className="flex justify-end"><button type="submit" disabled={busy || !amount || Number(amount)<=0 || Number(amount)>remaining} className="inline-flex min-h-12 items-center gap-2 rounded-xl bg-orange-600 px-5 py-3 text-sm font-extrabold text-white hover:bg-orange-700 disabled:opacity-40">{busy?<LoaderCircle className="h-5 w-5 animate-spin"/>:<Plus className="h-5 w-5"/>}{busy?'Зберігаємо…':'Зберегти виплату'}</button></div>
    </form>}
  </div></div>;
}

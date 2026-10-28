import React from 'react';
import { X, Printer, CheckCircle2, QrCode, Building2, Download, WalletCards, History } from 'lucide-react';
import { Child, Activity, MonthlyRecord, KindergartenInfo } from '../types';
import { calculateChildTotal, formatCurrency } from '../utils/calculations';
import { MONTH_NAMES_UK, KINDERGARTEN_INFO } from '../data/initialData';

interface ReceiptModalProps {
  child: Child;
  record: MonthlyRecord | undefined;
  activities: Activity[];
  selectedYear: number;
  selectedMonth: number;
  kindergartenInfo?: KindergartenInfo;
  onClose: () => void;
  onTogglePaid: (childId: string) => void;
  onOpenPayment?: (childId: string) => void;
  onOpenAccount?: (child: Child) => void;
  onDownloadPdf?: () => void;
}

export const ReceiptModal: React.FC<ReceiptModalProps> = ({
  child,
  record,
  activities,
  selectedYear,
  selectedMonth,
  kindergartenInfo = KINDERGARTEN_INFO,
  onClose,
  onTogglePaid,
  onOpenPayment,
  onOpenAccount,
  onDownloadPdf,
}) => {
  const {
    subtotal,
    discountAmount,
    total,
    items,
    sickLeaveDays,
    absenceDays,
    dailyRate,
    sickLeaveDeduction,
    absenceDeduction,
    customDeduction,
    totalDeductions,
  } = calculateChildTotal(child, record, activities);

  const discountPercent =
    record?.customDiscount !== undefined
      ? record.customDiscount
      : child.discountPercent || 0;

  const isPaid = record?.isPaid ?? false;
  const paidAmount = record?.paidAmount ?? (isPaid ? total : 0);
  const debt = record?.debt ?? Math.max(0, total - paidAmount);
  const isPartial = paidAmount > 0 && debt > 0;
  const monthName = MONTH_NAMES_UK[selectedMonth - 1];
  const receiptNumber = `КВ-${selectedYear}${String(selectedMonth).padStart(2, '0')}-${child.id.replace(/\D/g, '').padStart(3, '0') || '001'}`;
  const paymentPurpose = kindergartenInfo.paymentPurposeTemplate
    .replaceAll('{month}', String(selectedMonth).padStart(2, '0'))
    .replaceAll('{year}', String(selectedYear))
    .replaceAll('{child}', child.fullName);

  const handlePrint = () => {
    window.print();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-2.5 sm:p-4 bg-black/50 backdrop-blur-xs overflow-y-auto">
      <div className="bg-white rounded-2xl sm:rounded-3xl max-w-2xl w-full p-4 sm:p-8 shadow-2xl border border-orange-100 relative my-auto max-h-[94vh] overflow-y-auto custom-scrollbar">
        {/* Top actions bar */}
        <div className="flex flex-wrap items-center justify-between gap-2.5 pb-3 sm:pb-4 mb-3 sm:mb-4 border-b border-stone-200 no-print">
          <div className="flex items-center gap-1.5 sm:gap-2">
            <span className="text-[11px] sm:text-xs font-semibold px-2 sm:px-2.5 py-1 rounded-full bg-orange-100 text-orange-800">
              Попередній перегляд
            </span>
            {isPaid ? (
              <span className="text-[11px] sm:text-xs font-semibold px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-800 flex items-center gap-1">
                <CheckCircle2 className="w-3 h-3" /> Сплачено
              </span>
            ) : isPartial ? (
              <span className="text-[11px] sm:text-xs font-semibold px-2 py-0.5 rounded-full bg-blue-100 text-blue-800">
                Частково • борг {formatCurrency(debt)}
              </span>
            ) : (
              <span className="text-[11px] sm:text-xs font-semibold px-2 py-0.5 rounded-full bg-amber-100 text-amber-800">
                Очікує оплати
              </span>
            )}
          </div>

          <div className="flex items-center gap-2">
            {onDownloadPdf && record?.billId && (
              <button
                type="button"
                onClick={onDownloadPdf}
                className="cursor-pointer inline-flex items-center gap-1.5 px-3 py-1.5 bg-stone-800 hover:bg-stone-900 text-white text-xs font-semibold rounded-xl shadow-xs transition-all min-h-[36px]"
              >
                <Download className="w-3.5 h-3.5" />
                <span>PDF</span>
              </button>
            )}
            <button
              id="print-single-receipt"
              onClick={handlePrint}
              className="cursor-pointer inline-flex items-center gap-1.5 px-3 py-1.5 bg-orange-600 hover:bg-orange-700 text-white text-xs font-semibold rounded-xl shadow-xs transition-all touch-manipulation min-h-[36px]"
            >
              <Printer className="w-3.5 h-3.5" />
              <span>Друкувати</span>
            </button>
            <button
              onClick={onClose}
              className="cursor-pointer p-1.5 text-stone-400 hover:text-stone-700 hover:bg-stone-100 rounded-lg transition-colors touch-manipulation min-h-[36px] min-w-[36px] flex items-center justify-center"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Printable Receipt Paper */}
        <div className="printable-receipt text-stone-900 font-sans border-2 border-dashed border-stone-200 p-4 sm:p-6 rounded-xl bg-[#FFFDF9]">
          {/* Header */}
          <div className="flex items-start justify-between border-b pb-4 border-stone-300">
            <div className="flex items-center gap-3">
              <div className="w-14 h-14 rounded-xl bg-white flex items-center justify-center overflow-hidden shrink-0">
                <img src={kindergartenInfo.receiptLogoUrl} alt="Логотип квитанції" className="w-full h-full object-contain" />
              </div>
              <div>
                <h3 className="font-bold text-base text-stone-900 font-heading">
                  {kindergartenInfo.name}
                </h3>
                <p className="text-xs text-stone-600">
                  {kindergartenInfo.address}{(kindergartenInfo.receiptContactPhone || kindergartenInfo.phone) && ` • Тел: ${kindergartenInfo.receiptContactPhone || kindergartenInfo.phone}`}{(kindergartenInfo.receiptContactEmail || kindergartenInfo.email) && ` • ${kindergartenInfo.receiptContactEmail || kindergartenInfo.email}`}
                </p>
              </div>
            </div>

            <div className="text-right">
              <span className="text-xs font-mono font-bold text-stone-700 block">
                {receiptNumber}
              </span>
              <span className="text-[11px] text-stone-500">
                Дата: 01.{String(selectedMonth).padStart(2, '0')}.{selectedYear}
              </span>
            </div>
          </div>

          {/* Child and Month title */}
          <div className="my-4 bg-orange-50/70 p-3.5 rounded-xl border border-orange-200">
            <div className="text-center">
              <h4 className="text-base font-bold text-orange-950 font-heading uppercase tracking-wide">
                Рахунок-квитанція за послуги дитсадка
              </h4>
              <p className="text-xs text-orange-800 font-medium mt-0.5">
                Розрахунковий період: <span className="font-bold">{monthName} {selectedYear} року</span>
              </p>
            </div>

            <div className="grid grid-cols-2 gap-2 mt-3 pt-3 border-t border-orange-200/60 text-xs">
              <div>
                <span className="text-stone-500 block">Вихованець (дитина):</span>
                <span className="font-bold text-stone-900 text-sm">
                  {child.fullName}
                </span>
                <span className="text-stone-600 block mt-0.5">
                  Група: <b>{child.group}</b>
                </span>
              </div>
              <div className="text-right">
                <span className="text-stone-500 block">Платник (батьки):</span>
                <span className="font-semibold text-stone-800">
                  {child.parentName || 'Батьки вихованця'}
                </span>
                {child.parentPhone && (
                  <span className="text-stone-500 block">{child.parentPhone}</span>
                )}
              </div>
            </div>
          </div>

          {/* Itemized Table */}
          <div className="my-4">
            <table className="w-full text-left text-xs border-collapse">
              <thead>
                <tr className="border-b-2 border-stone-300 text-stone-600 font-semibold uppercase">
                  <th className="py-2 px-1">№</th>
                  <th className="py-2 px-2">Найменування заняття / послуги</th>
                  <th className="py-2 px-2 text-center">Викладач</th>
                  <th className="py-2 px-2 text-right">Сума</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-stone-200">
                {items.length === 0 ? (
                  <tr>
                    <td colSpan={4} className="py-4 text-center text-stone-400">
                      Не обрано жодного заняття за цей місяць
                    </td>
                  </tr>
                ) : (
                  items.map((item, idx) => (
                    <tr key={item.activity.id} className="py-2">
                      <td className="py-2 px-1 text-stone-400 font-mono">
                        {idx + 1}
                      </td>
                      <td className="py-2 px-2 font-medium text-stone-800">
                        {item.activity.name}
                        {item.activity.billingType === 'per_lesson' && <div className="text-xs text-stone-500">{item.quantity} зан. × {formatCurrency(item.unitPrice)}</div>}
                      </td>
                      <td className="py-2 px-2 text-center text-stone-500">
                        {item.activity.instructor || '—'}
                      </td>
                      <td className="py-2 px-2 text-right font-semibold text-stone-900">
                        {formatCurrency(item.price)}
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
              <tfoot>
                <tr className="border-t border-stone-300 text-xs">
                  <td colSpan={3} className="py-2 px-2 text-right text-stone-600">
                    Сума без знижки:
                  </td>
                  <td className="py-2 px-2 text-right font-semibold text-stone-800">
                    {formatCurrency(subtotal)}
                  </td>
                </tr>
                {discountAmount > 0 && (
                  <tr className="text-xs text-emerald-700">
                    <td colSpan={3} className="py-1 px-2 text-right">
                      Знижка на абонемент ({discountPercent}%):
                    </td>
                    <td className="py-1 px-2 text-right font-semibold">
                      -{formatCurrency(discountAmount)}
                    </td>
                  </tr>
                )}
                {sickLeaveDays > 0 && (
                  <tr className="text-xs text-teal-800 bg-teal-50/40">
                    <td colSpan={3} className="py-1 px-2 text-right">
                      Лікарняні ({sickLeaveDays} дн. × {dailyRate} ₴/день):
                    </td>
                    <td className="py-1 px-2 text-right font-semibold text-teal-800">
                      -{formatCurrency(sickLeaveDeduction)}
                    </td>
                  </tr>
                )}
                {absenceDays > 0 && (
                  <tr className="text-xs text-amber-800 bg-amber-50/40">
                    <td colSpan={3} className="py-1 px-2 text-right">
                      Відсутність / пропуски ({absenceDays} дн. × {dailyRate} ₴/день):
                    </td>
                    <td className="py-1 px-2 text-right font-semibold text-amber-800">
                      -{formatCurrency(absenceDeduction)}
                    </td>
                  </tr>
                )}
                {customDeduction > 0 && (
                  <tr className="text-xs text-stone-700 bg-stone-50">
                    <td colSpan={3} className="py-1 px-2 text-right">
                      Додаткове коригування / списання:
                    </td>
                    <td className="py-1 px-2 text-right font-semibold">
                      -{formatCurrency(customDeduction)}
                    </td>
                  </tr>
                )}
                <tr className="border-t-2 border-stone-800 text-sm font-bold text-stone-900">
                  <td colSpan={3} className="py-2 px-2 text-right uppercase">
                    РАЗОМ ДО СПЛАТИ:
                  </td>
                  <td className="py-2 px-2 text-right text-orange-700 font-extrabold text-base">
                    {formatCurrency(total)}
                  </td>
                </tr>
                <tr className="text-xs text-emerald-700">
                  <td colSpan={3} className="py-1 px-2 text-right">Сплачено:</td>
                  <td className="py-1 px-2 text-right font-semibold">{formatCurrency(paidAmount)}</td>
                </tr>
                <tr className="text-xs text-amber-800">
                  <td colSpan={3} className="py-1 px-2 text-right font-semibold">Залишок / борг:</td>
                  <td className="py-1 px-2 text-right font-bold">{formatCurrency(debt)}</td>
                </tr>
              </tfoot>
            </table>
          </div>

          {/* Absence Note if present */}
          {record?.absenceNote && (
            <div className="mt-3 p-2.5 bg-teal-50/70 border border-teal-200/80 rounded-xl text-xs text-teal-900">
              <span className="font-semibold">Підстава перерахунку/лікарняного:</span> {record.absenceNote}
            </div>
          )}

          {/* Payment requisites */}
          <div className="mt-4 p-3 bg-stone-100 rounded-xl text-xs space-y-1 text-stone-700">
            <div className="font-semibold text-stone-900 flex items-center gap-1.5 mb-1">
              <Building2 className="w-3.5 h-3.5 text-orange-600" />
              <span>Банківські реквізити для оплати:</span>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-1 text-[11px]">
              <div>Одержувач: <b>{kindergartenInfo.name}</b></div>
              {kindergartenInfo.edrpou && <div>Код ЄДРПОУ: <b className="font-mono">{kindergartenInfo.edrpou}</b></div>}
              {kindergartenInfo.iban && <div className="col-span-1 sm:col-span-2">
                IBAN рахунок: <b className="font-mono text-stone-900">{kindergartenInfo.iban}</b>{kindergartenInfo.bankName && ` (${kindergartenInfo.bankName})`}
              </div>}
              <div className="col-span-1 sm:col-span-2 text-orange-900">
                Призначення платежу: <b>{paymentPurpose}</b>
              </div>
            </div>
          </div>

          {kindergartenInfo.receiptNote && <div className="mt-3 rounded-xl border border-orange-100 bg-orange-50/60 p-3 text-xs text-stone-700 whitespace-pre-wrap">{kindergartenInfo.receiptNote}</div>}

          {/* Signature lines */}
          <div className="mt-6 pt-4 border-t border-stone-300 flex items-center justify-between text-xs text-stone-500">
            <div>
              <span>Бухгалтер: _______________</span>
            </div>
            <div className="text-right">
              <span>М.П.</span>
            </div>
          </div>
        </div>

        {/* Bottom toggle status */}
        <div className="flex items-center justify-between pt-4 mt-4 border-t border-stone-200 no-print">
          <button
            onClick={() => {
              if (isPaid && onOpenAccount) onOpenAccount(child);
              else if (onOpenPayment) onOpenPayment(child.id);
              else onTogglePaid(child.id);
            }}
            className={`cursor-pointer px-4 py-2 rounded-xl text-xs font-semibold flex items-center gap-2 transition-all ${
              isPaid
                ? 'bg-blue-100 text-blue-800 hover:bg-blue-200'
                : 'bg-emerald-600 text-white hover:bg-emerald-700 shadow-xs'
            }`}
          >
            {isPaid ? <History className="w-4 h-4" /> : <WalletCards className="w-4 h-4" />}
            <span>{isPaid ? 'Історія платежів' : 'Внести платіж'}</span>
          </button>

          <button
            onClick={onClose}
            className="cursor-pointer px-4 py-2 text-stone-600 hover:text-stone-800 text-xs font-medium rounded-xl border border-stone-200 hover:bg-stone-50 transition-colors"
          >
            Закрити
          </button>
        </div>
      </div>
    </div>
  );
};

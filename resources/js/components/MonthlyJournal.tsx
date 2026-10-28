import React, { useState, useMemo } from 'react';
import {
  Check,
  CheckCheck,
  Search,
  Filter,
  Receipt,
  RotateCcw,
  CheckCircle2,
  Clock,
  Coins,
  CreditCard,
  AlertCircle,
  HelpCircle,
  Stethoscope,
  UserX,
  MinusCircle,
  Plus,
  Table2,
  LayoutGrid,
  Phone,
  History,
  WalletCards,
} from 'lucide-react';
import { Child, Activity, MonthlyRecord } from '../types';
import { calculateChildTotal, formatCurrency } from '../utils/calculations';
import { MONTH_NAMES_UK } from '../data/initialData';
import { AbsenceDeductionModal } from './AbsenceDeductionModal';
import { ActivityQuantityInput } from './ActivityQuantityInput';
import { JournalResetButton } from './JournalResetButton';

interface MonthlyJournalProps {
  childrenList: Child[];
  groups: string[];
  activities: Activity[];
  records: MonthlyRecord[];
  selectedYear: number;
  selectedMonth: number;
  dailyFoodRate: number;
  onToggleActivity: (childId: string, activityId: string) => void;
  onActivityQuantity: (childId: string, activityId: string, quantity: number) => Promise<void>;
  onBatchCheckActivity: (activityId: string, checkAll: boolean) => void;
  onTogglePaid: (childId: string) => void;
  onOpenReceipt: (child: Child) => void;
  onOpenAccount: (child: Child) => void;
  onOpenPayment: (childId: string) => void;
  canManageFinance?: boolean;
  readOnly?: boolean;
  onMonthCleared: () => Promise<void>;
  onUpdateAbsenceRecord?: (
    childId: string,
    data: {
      sickLeaveDays: number;
      absenceDays: number;
      dailyFoodDeductionRate: number;
      customDeduction: number;
      absenceNote: string;
    }
  ) => Promise<void>;
}

export const MonthlyJournal: React.FC<MonthlyJournalProps> = ({
  childrenList,
  groups,
  activities,
  records,
  selectedYear,
  selectedMonth,
  dailyFoodRate,
  onToggleActivity,
  onActivityQuantity,
  onBatchCheckActivity,
  onTogglePaid,
  onOpenReceipt,
  onOpenAccount,
  onOpenPayment,
  canManageFinance = false,
  readOnly = false,
  onMonthCleared,
  onUpdateAbsenceRecord,
}) => {
  const [selectedGroup, setSelectedGroup] = useState<string>('all');
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [quickActivitySelect, setQuickActivitySelect] = useState<string>('');
  const [activeAbsenceChild, setActiveAbsenceChild] = useState<Child | null>(null);
  const [viewMode, setViewMode] = useState<'table' | 'cards'>(() => {
    if (typeof window !== 'undefined' && window.innerWidth < 1024) {
      return 'cards';
    }
    return 'table';
  });

  const activeActivities = useMemo(() => {
    return activities.filter((a) => a.active || records.some((record) =>
      record.year === selectedYear && record.month === selectedMonth && record.checkedActivities?.[a.id],
    ));
  }, [activities, records, selectedYear, selectedMonth]);

  const filteredChildren = useMemo(() => {
    return childrenList.filter((child) => {
      const matchesGroup =
        selectedGroup === 'all' || child.group === selectedGroup;
      const matchesSearch =
        child.fullName.toLowerCase().includes(searchQuery.toLowerCase()) ||
        child.parentName.toLowerCase().includes(searchQuery.toLowerCase());
      return matchesGroup && matchesSearch && child.active;
    });
  }, [childrenList, selectedGroup, searchQuery]);

  // Financial statistics for current month
  const stats = useMemo(() => {
    let totalBilled = 0;
    let totalPaid = 0;
    let totalUnpaid = 0;
    let totalCheckCount = 0;
    let totalDeductionsSum = 0;
    let totalSickDays = 0;
    let totalAbsenceDays = 0;

    filteredChildren.forEach((child) => {
      const record = records.find(
        (r) =>
          r.childId === child.id &&
          r.year === selectedYear &&
          r.month === selectedMonth
      );
      const { total, selectedCount, totalDeductions, sickLeaveDays, absenceDays } =
        calculateChildTotal(child, record, activeActivities);

      totalBilled += total;
      totalCheckCount += selectedCount;
      totalDeductionsSum += totalDeductions;
      totalSickDays += sickLeaveDays;
      totalAbsenceDays += absenceDays;

      const paidAmount = Math.min(total, record?.paidAmount ?? (record?.isPaid ? total : 0));
      const debt = record?.debt ?? Math.max(0, total - paidAmount);
      totalPaid += paidAmount;
      totalUnpaid += debt;
    });

    return {
      totalBilled,
      totalPaid,
      totalUnpaid,
      totalCheckCount,
      totalDeductionsSum,
      totalSickDays,
      totalAbsenceDays,
    };
  }, [filteredChildren, records, selectedYear, selectedMonth, activeActivities]);

  const activityTotals = useMemo(() => Object.fromEntries(activeActivities.map((activity) => {
    let quantity = 0;
    let amount = 0;
    filteredChildren.forEach((child) => {
      const record = records.find((r) => r.childId === child.id && r.year === selectedYear && r.month === selectedMonth);
      if (!record?.checkedActivities?.[activity.id]) return;
      const count = record.activityQuantities?.[activity.id] ?? 1;
      quantity += count;
      amount += record.billItems
        ? record.billItems.filter((item) => item.activityId === activity.id).reduce((sum, item) => sum + item.amount, 0)
        : count * (record.activityUnitPrices?.[activity.id] ?? activity.price);
    });
    return [activity.id, { quantity, amount }];
  })), [activeActivities, filteredChildren, records, selectedYear, selectedMonth]);

  // Count of kids per activity
  const activityPopularity = useMemo(() => {
    const counts: Record<string, number> = {};
    activeActivities.forEach((act) => {
      counts[act.id] = 0;
    });

    filteredChildren.forEach((child) => {
      const record = records.find(
        (r) =>
          r.childId === child.id &&
          r.year === selectedYear &&
          r.month === selectedMonth
      );
      if (record?.checkedActivities) {
        Object.entries(record.checkedActivities).forEach(([actId, isChecked]) => {
          if (isChecked && counts[actId] !== undefined) {
            counts[actId] += 1;
          }
        });
      }
    });
    return counts;
  }, [filteredChildren, records, selectedYear, selectedMonth, activeActivities]);

  // Mobile & Tablet Optimized Block List View (Cards / Blocks per child)
  const renderBlockList = () => {
    if (filteredChildren.length === 0) {
      return (
        <div className="bg-white rounded-2xl p-8 text-center text-stone-400 border border-stone-200 shadow-xs">
          <AlertCircle className="w-8 h-8 mx-auto mb-2 text-stone-300" />
          Не знайдено дітей за вибраними фільтрами
        </div>
      );
    }

    return (
      <div className="space-y-4">
        <div className="flex items-center justify-between px-1">
          <p className="text-xs text-stone-600 font-medium">
            Список вихованців: <strong className="text-stone-900 font-bold">{filteredChildren.length}</strong> дітей. Натискайте на гуртки для швидкої відмітки:
          </p>
          <span className="text-[11px] text-orange-700 bg-orange-100/90 font-bold px-2 py-0.5 rounded-full border border-orange-200">
            Блоковий список
          </span>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-3.5 sm:gap-4">
          {filteredChildren.map((child) => {
            const record = records.find(
              (r) =>
                r.childId === child.id &&
                r.year === selectedYear &&
                r.month === selectedMonth
            );
            const {
              subtotal,
              total,
              selectedCount,
              sickLeaveDays,
              absenceDays,
              totalDeductions,
              dailyRate,
              discountAmount,
            } = calculateChildTotal(child, record, activeActivities);
            const isPaid = record?.isPaid ?? false;
            const paidAmount = record?.paidAmount ?? (isPaid ? total : 0);
            const debt = record?.debt ?? Math.max(0, total - paidAmount);
            const isPartial = paidAmount > 0 && debt > 0;
            const discount =
              record?.customDiscount !== undefined
                ? record.customDiscount
                : child.discountPercent || 0;
            const configuredDiscount = child.discountPercent || 0;
            const discountDiffersFromBill = Boolean(record?.billId && configuredDiscount > 0 && configuredDiscount !== discount);

            return (
              <div
                key={child.id}
                id={`child-block-${child.id}`}
                className="bg-white rounded-2xl sm:rounded-3xl border border-orange-100/90 shadow-xs hover:shadow-md transition-all overflow-hidden p-4 sm:p-5 flex flex-col justify-between gap-3.5"
              >
                {/* 1. Блок вихованця та контактів */}
                <div className="flex items-start justify-between gap-2.5 pb-3 border-b border-stone-100">
                  <div className="flex items-start gap-3 min-w-0">
                    <div className="w-10 h-10 sm:w-11 sm:h-11 rounded-2xl bg-gradient-to-tr from-orange-500 to-amber-400 text-white flex items-center justify-center font-bold text-sm sm:text-base shadow-xs shrink-0 mt-0.5">
                      {child.fullName.slice(0, 1)}
                    </div>
                    <div className="min-w-0">
                      <h4 className="font-extrabold text-stone-900 text-sm sm:text-base leading-snug truncate font-heading">
                        {child.fullName}
                      </h4>
                      <div className="flex flex-wrap items-center gap-1.5 mt-1">
                        <span className="text-[11px] font-semibold text-orange-800 bg-orange-100/90 px-2 py-0.5 rounded-full border border-orange-200/60">
                          {child.group}
                        </span>
                        {discount > 0 && (
                          <span className="text-[10px] font-bold text-emerald-800 bg-emerald-100 px-1.5 py-0.5 rounded-full border border-emerald-200">
                            Знижка в рахунку на абонемент -{discount}%
                          </span>
                        )}
                        {discountDiffersFromBill && (
                          <span className="text-[10px] font-bold text-amber-800 bg-amber-100 px-1.5 py-0.5 rounded-full border border-amber-200">
                            Налаштовано -{configuredDiscount}%; у рахунку {discount}%
                          </span>
                        )}
                      </div>
                      <div className="flex flex-wrap items-center gap-x-2 gap-y-1 mt-1.5 text-xs text-stone-500">
                        {child.parentName && (
                          <span className="truncate">Батьки: {child.parentName}</span>
                        )}
                        {child.parentPhone && (
                          <a
                            href={`tel:${child.parentPhone}`}
                            className="inline-flex items-center gap-1 text-orange-700 font-medium hover:underline bg-orange-50 px-1.5 py-0.5 rounded-md text-[11px]"
                            title="Зателефонувати батькам"
                          >
                            <Phone className="w-3 h-3 text-orange-600" />
                            <span>{child.parentPhone}</span>
                          </a>
                        )}
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center gap-1.5 shrink-0">
                    {canManageFinance && (
                      <>
                        <button onClick={() => onOpenAccount(child)} className="cursor-pointer p-2 rounded-xl bg-stone-100 hover:bg-blue-100 text-stone-700 hover:text-blue-800 transition-colors" title="Історія дитини">
                          <History className="w-4 h-4" />
                        </button>
                        {debt > 0 && !readOnly && (
                          <button onClick={() => onOpenPayment(child.id)} className="cursor-pointer p-2 rounded-xl bg-emerald-100 hover:bg-emerald-200 text-emerald-700 transition-colors" title="Додати платіж">
                            <WalletCards className="w-4 h-4" />
                          </button>
                        )}
                      </>
                    )}
                    <button
                      onClick={() => onOpenReceipt(child)}
                      className="cursor-pointer p-2 rounded-xl bg-stone-100 hover:bg-orange-100 text-stone-700 hover:text-orange-800 transition-colors touch-manipulation"
                      title="Сформувати квитанцію"
                    >
                      <Receipt className="w-4 h-4" />
                    </button>
                  </div>
                </div>

                {/* 2. Блок занять та гуртків */}
                <div className="bg-stone-50/80 rounded-2xl p-3 border border-stone-200/60">
                  <div className="flex items-center justify-between text-xs text-stone-600 mb-2">
                    <span className="font-bold uppercase tracking-wider text-[11px] text-stone-700">
                      Гуртки ({selectedCount} з {activeActivities.length}):
                    </span>
                    <span className="text-xs font-mono font-bold text-orange-700">
                      {formatCurrency(subtotal)}
                    </span>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-1.5">
                    {activeActivities.map((act) => {
                      const isChecked = Boolean(
                        record?.checkedActivities?.[act.id]
                      );

                      if (act.billingType === 'per_lesson') return (
                        <div key={act.id} className="flex items-center justify-between gap-2 rounded-xl border border-orange-200 bg-white p-2 text-xs">
                          <span className="font-semibold text-stone-700">{act.name}</span>
                          <ActivityQuantityInput label={`Кількість: ${act.name}, ${child.fullName}`}
                            value={record?.activityQuantities?.[act.id] ?? 0}
                            unitPrice={record?.activityUnitPrices?.[act.id] ?? act.price}
                            disabled={readOnly || !act.active}
                            onChange={(quantity) => onActivityQuantity(child.id, act.id, quantity)} />
                        </div>
                      );

                      return (
                        <button
                          key={act.id}
                          type="button"
                          disabled={readOnly || !act.active}
                          onClick={() => onToggleActivity(child.id, act.id)}
                          className={`cursor-pointer text-left p-2 rounded-xl border text-xs transition-all flex items-center justify-between gap-1.5 touch-manipulation min-h-[46px] select-none ${
                            isChecked
                              ? 'bg-orange-600 text-white border-orange-700 shadow-xs font-medium'
                              : 'bg-white hover:bg-stone-100 active:bg-orange-50 text-stone-700 border-stone-200'
                          }`}
                        >
                          <div className="truncate flex-1 min-w-0">
                            <div className="truncate font-semibold leading-tight">{act.name}</div>
                            <div
                              className={`text-[10px] font-mono ${
                                isChecked ? 'text-orange-100' : 'text-stone-400'
                              }`}
                            >
                              {act.price} ₴
                            </div>
                          </div>
                          <div
                            className={`w-5 h-5 rounded-md flex items-center justify-center shrink-0 ${
                              isChecked
                                ? 'bg-white text-orange-600 font-bold'
                                : 'border border-stone-300 bg-stone-50'
                            }`}
                          >
                            {isChecked && <Check className="w-3.5 h-3.5 stroke-[3]" />}
                          </div>
                        </button>
                      );
                    })}
                  </div>
                </div>

                {/* 3. Блок лікарняних та пропусків */}
                <div className="rounded-2xl p-2.5 bg-teal-50/70 border border-teal-200/70 flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                  <div className="flex items-start gap-1.5 text-xs text-teal-900">
                    <Stethoscope className="w-4 h-4 text-teal-700 shrink-0 mt-0.5" />
                    <div>
                      <span className="font-bold">Лікарняні / пропуски:</span>{' '}
                      {sickLeaveDays > 0 || absenceDays > 0 ? (
                        <span className="text-[11px] text-teal-800">
                          {sickLeaveDays > 0 ? `${sickLeaveDays} дн. хвороби ` : ''}
                          {absenceDays > 0 ? `${absenceDays} дн. заяви ` : ''}
                          ({dailyRate} ₴/день)
                        </span>
                      ) : (
                        <span className="text-stone-500 text-[11px]">Без пропусків (0 дн.)</span>
                      )}
                    </div>
                  </div>

                  <div className="flex items-center gap-1.5 self-end sm:self-auto shrink-0">
                    {totalDeductions > 0 && (
                      <span className="font-mono font-bold text-teal-800 bg-white px-2 py-0.5 rounded-lg border border-teal-200 text-xs">
                        -{formatCurrency(totalDeductions)}
                      </span>
                    )}
                    <button
                      type="button"
                      disabled={readOnly}
                      onClick={() => setActiveAbsenceChild(child)}
                      className="cursor-pointer text-[11px] font-semibold px-2 py-1 rounded-lg bg-white hover:bg-teal-100 text-teal-800 border border-teal-300 transition-colors touch-manipulation min-h-[32px]"
                    >
                      {totalDeductions > 0 ? 'Змінити' : '+ Пропуски'}
                    </button>
                  </div>
                </div>

                {/* 4. Блок розрахунку вартості */}
                <div className="bg-amber-50/40 rounded-2xl p-3 border border-amber-200/60 space-y-1 text-xs text-stone-600">
                  <div className="flex justify-between items-center">
                    <span>Гуртки ({selectedCount} вибр.):</span>
                    <span className="font-mono font-semibold text-stone-800">{formatCurrency(subtotal)}</span>
                  </div>
                  {discountAmount > 0 && (
                    <div className="flex justify-between items-center text-emerald-700">
                      <span>Знижка на абонемент ({discount}%):</span>
                      <span className="font-mono font-semibold">-{formatCurrency(discountAmount)}</span>
                    </div>
                  )}
                  {totalDeductions > 0 && (
                    <div className="flex justify-between items-center text-teal-700">
                      <span>Знято за пропуски:</span>
                      <span className="font-mono font-semibold">-{formatCurrency(totalDeductions)}</span>
                    </div>
                  )}
                  <div className="pt-1.5 border-t border-amber-200/70 flex items-baseline justify-between">
                    <span className="text-xs uppercase font-bold text-stone-600">Разом до сплати:</span>
                    <span className="text-lg sm:text-xl font-extrabold text-stone-900 font-heading">
                      {formatCurrency(total)}
                    </span>
                  </div>
                </div>

                {/* 5. Блок статусу оплати */}
                <div className="flex items-center justify-between gap-2 pt-1">
                  <div className="text-xs font-semibold text-stone-600">
                    Статус оплати:
                  </div>

                  <button
                    onClick={() => canManageFinance ? (debt > 0 && !readOnly ? onOpenPayment(child.id) : onOpenAccount(child)) : undefined}
                    disabled={!canManageFinance}
                    className={`px-3.5 py-2 rounded-xl text-xs font-bold transition-all inline-flex items-center gap-1.5 min-h-[40px] shadow-xs ${
                      isPaid
                        ? 'bg-emerald-600 text-white border border-emerald-700'
                        : isPartial
                          ? 'bg-blue-600 text-white border border-blue-700'
                          : 'bg-amber-500 text-white border border-amber-600'
                    } ${canManageFinance ? 'cursor-pointer hover:brightness-95' : 'cursor-default'}`}
                    title={canManageFinance ? (debt > 0 ? 'Внести платіж' : 'Відкрити історію платежів') : 'Статус оплати'}
                  >
                    {isPaid ? (
                      <>
                        <CheckCircle2 className="w-4 h-4" />
                        <span>Сплачено ✓</span>
                      </>
                    ) : isPartial ? (
                      <>
                        <WalletCards className="w-4 h-4" />
                        <span>Борг {formatCurrency(debt)}</span>
                      </>
                    ) : (
                      <>
                        <Clock className="w-4 h-4" />
                        <span>Очікує {formatCurrency(debt)}</span>
                      </>
                    )}
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    );
  };

  return (
    <div className="space-y-6">
      {canManageFinance && <JournalResetButton key={`${selectedYear}-${selectedMonth}`} year={selectedYear} month={selectedMonth} disabled={readOnly} onCleared={onMonthCleared} />}
      {/* Overview Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-2.5 sm:gap-4">
        <div className="bg-white rounded-2xl p-3.5 sm:p-5 shadow-xs border border-orange-100 flex flex-col sm:flex-row sm:items-center justify-between gap-2">
          <div>
            <p className="text-[10px] sm:text-xs font-semibold text-stone-500 uppercase tracking-wider">
              Нараховано
            </p>
            <p className="text-lg sm:text-2xl font-extrabold text-stone-900 mt-0.5 sm:mt-1 font-heading">
              {formatCurrency(stats.totalBilled)}
            </p>
            <p className="text-[11px] sm:text-xs text-orange-600 mt-0.5 font-medium">
              {filteredChildren.length} дітей
            </p>
          </div>
          <div className="w-9 h-9 sm:w-12 sm:h-12 rounded-xl bg-orange-50 border border-orange-200/60 flex items-center justify-center text-orange-600 self-end sm:self-auto shrink-0">
            <Coins className="w-5 h-5 sm:w-6 sm:h-6" />
          </div>
        </div>

        <div className="bg-white rounded-2xl p-3.5 sm:p-5 shadow-xs border border-emerald-100 flex flex-col sm:flex-row sm:items-center justify-between gap-2">
          <div>
            <p className="text-[10px] sm:text-xs font-semibold text-stone-500 uppercase tracking-wider">
              Вже сплачено
            </p>
            <p className="text-lg sm:text-2xl font-extrabold text-emerald-700 mt-0.5 sm:mt-1 font-heading">
              {formatCurrency(stats.totalPaid)}
            </p>
            <p className="text-[11px] sm:text-xs text-emerald-600 mt-0.5 font-medium">
              {stats.totalBilled > 0
                ? `${Math.round((stats.totalPaid / stats.totalBilled) * 100)}% зібрано`
                : '0% зібрано'}
            </p>
          </div>
          <div className="w-9 h-9 sm:w-12 sm:h-12 rounded-xl bg-emerald-50 border border-emerald-200/60 flex items-center justify-center text-emerald-600 self-end sm:self-auto shrink-0">
            <CheckCircle2 className="w-5 h-5 sm:w-6 sm:h-6" />
          </div>
        </div>

        <div className="bg-white rounded-2xl p-3.5 sm:p-5 shadow-xs border border-amber-100 flex flex-col sm:flex-row sm:items-center justify-between gap-2">
          <div>
            <p className="text-[10px] sm:text-xs font-semibold text-stone-500 uppercase tracking-wider">
              До сплати
            </p>
            <p className="text-lg sm:text-2xl font-extrabold text-amber-700 mt-0.5 sm:mt-1 font-heading">
              {formatCurrency(stats.totalUnpaid)}
            </p>
            <p className="text-[11px] sm:text-xs text-amber-600 mt-0.5 font-medium">
              Борг за період
            </p>
          </div>
          <div className="w-9 h-9 sm:w-12 sm:h-12 rounded-xl bg-amber-50 border border-amber-200/60 flex items-center justify-center text-amber-600 self-end sm:self-auto shrink-0">
            <Clock className="w-5 h-5 sm:w-6 sm:h-6" />
          </div>
        </div>

        {/* Deduction summary card */}
        <div className="bg-white rounded-2xl p-3.5 sm:p-5 shadow-xs border border-teal-100 flex flex-col sm:flex-row sm:items-center justify-between gap-2">
          <div>
            <p className="text-[10px] sm:text-xs font-semibold text-stone-500 uppercase tracking-wider">
              Лікарняні / пропуски
            </p>
            <p className="text-lg sm:text-2xl font-extrabold text-teal-700 mt-0.5 sm:mt-1 font-heading">
              -{formatCurrency(stats.totalDeductionsSum)}
            </p>
            <p className="text-[11px] sm:text-xs text-teal-600 mt-0.5 font-medium">
              {stats.totalSickDays} дн. лік. • {stats.totalAbsenceDays} дн. проп.
            </p>
          </div>
          <div className="w-9 h-9 sm:w-12 sm:h-12 rounded-xl bg-teal-50 border border-teal-200/60 flex items-center justify-center text-teal-600 self-end sm:self-auto shrink-0">
            <Stethoscope className="w-5 h-5 sm:w-6 sm:h-6" />
          </div>
        </div>

        <div className="col-span-2 sm:col-span-1 bg-white rounded-2xl p-3.5 sm:p-5 shadow-xs border border-stone-200 flex items-center justify-between">
          <div>
            <p className="text-[10px] sm:text-xs font-semibold text-stone-500 uppercase tracking-wider">
              Відмічено занять
            </p>
            <p className="text-lg sm:text-2xl font-extrabold text-stone-800 mt-0.5 sm:mt-1 font-heading">
              {stats.totalCheckCount}
            </p>
            <p className="text-[11px] sm:text-xs text-stone-500 mt-0.5">
              Активних відміток
            </p>
          </div>
          <div className="w-9 h-9 sm:w-12 sm:h-12 rounded-xl bg-stone-100 border border-stone-200 flex items-center justify-center text-stone-600 shrink-0">
            <CheckCheck className="w-5 h-5 sm:w-6 sm:h-6" />
          </div>
        </div>
      </div>

      {/* Control Bar: Filters, Search, Batch actions & View Switcher */}
      <div className="bg-white rounded-2xl p-3 sm:p-4 shadow-xs border border-orange-100 flex flex-col lg:flex-row items-stretch lg:items-center justify-between gap-3">
        <div className="flex flex-wrap items-center gap-2 sm:gap-3">
          {/* Group Filter */}
          <div className="flex items-center gap-1.5 shrink-0">
            <Filter className="w-4 h-4 text-orange-600 hidden sm:block" />
            <select
              id="filter-group-select"
              value={selectedGroup}
              onChange={(e) => setSelectedGroup(e.target.value)}
              className="bg-orange-50/60 border border-orange-200 text-stone-800 text-xs sm:text-sm rounded-xl px-2.5 sm:px-3 py-2 font-medium focus:ring-2 focus:ring-orange-400 focus:outline-hidden min-h-[38px]"
            >
              <option value="all">Всі групи ({childrenList.length})</option>
              {groups.map((grp) => (
                <option key={grp} value={grp}>
                  {grp}
                </option>
              ))}
            </select>
          </div>

          {/* Search Child */}
          <div className="relative flex-1 min-w-[170px] sm:min-w-[220px]">
            <Search className="w-4 h-4 text-stone-400 absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              id="search-child-input"
              type="text"
              placeholder="Пошук вихованця..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-9 pr-3 py-2 bg-stone-50 border border-stone-200 rounded-xl text-xs sm:text-sm focus:bg-white focus:border-orange-400 focus:ring-2 focus:ring-orange-200 focus:outline-hidden transition-all min-h-[38px]"
            />
          </div>

          {/* View Mode Toggle */}
          <div className="inline-flex rounded-xl p-0.5 bg-stone-100 border border-stone-200 text-xs shrink-0">
            <button
              onClick={() => setViewMode('cards')}
              className={`cursor-pointer inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg font-medium transition-all ${
                viewMode === 'cards'
                  ? 'bg-white text-orange-700 font-bold shadow-xs'
                  : 'text-stone-600 hover:text-stone-900'
              }`}
              title="Блоковий вигляд (рекомендовано для мобільних та планшетів)"
            >
              <LayoutGrid className="w-3.5 h-3.5" />
              <span className="text-xs">Блоки (список)</span>
            </button>
            <button
              onClick={() => setViewMode('table')}
              className={`cursor-pointer inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg font-medium transition-all ${
                viewMode === 'table'
                  ? 'bg-white text-orange-700 font-bold shadow-xs'
                  : 'text-stone-600 hover:text-stone-900'
              }`}
              title="Табличний вигляд (для ПК)"
            >
              <Table2 className="w-3.5 h-3.5" />
              <span className="text-xs">Таблиця</span>
            </button>
          </div>
        </div>

        {/* Batch Operations */}
        <div className="flex items-center gap-1.5 sm:gap-2 justify-end overflow-x-auto no-scrollbar pt-1 lg:pt-0 border-t lg:border-t-0 border-stone-100">
          <span className="text-xs text-stone-500 hidden xl:inline font-medium">
            Швидко:
          </span>
          <select
            id="batch-activity-select"
            value={quickActivitySelect}
            onChange={(e) => setQuickActivitySelect(e.target.value)}
            className="text-xs bg-stone-50 border border-stone-200 rounded-xl px-2 py-1.5 sm:py-2 text-stone-700 min-h-[36px] max-w-[140px] sm:max-w-none truncate"
          >
            <option value="">Оберіть заняття...</option>
            {activeActivities.filter((act) => act.active && act.billingType !== 'per_lesson').map((act) => (
              <option key={act.id} value={act.id}>
                {act.name}
              </option>
            ))}
          </select>
          <button
            id="batch-check-all-btn"
            disabled={!quickActivitySelect || readOnly}
            onClick={() => {
              if (quickActivitySelect) {
                onBatchCheckActivity(quickActivitySelect, true);
              }
            }}
            className="cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed inline-flex items-center gap-1 text-xs px-2.5 sm:px-3 py-1.5 sm:py-2 bg-orange-600 hover:bg-orange-700 text-white rounded-xl font-medium shadow-xs transition-colors min-h-[36px] touch-manipulation shrink-0"
            title="Поставити галочки всім дітям списку"
          >
            <Check className="w-3.5 h-3.5" />
            <span>Усім</span>
          </button>
          <button
            id="batch-uncheck-all-btn"
            disabled={!quickActivitySelect || readOnly}
            onClick={() => {
              if (quickActivitySelect) {
                onBatchCheckActivity(quickActivitySelect, false);
              }
            }}
            className="cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed inline-flex items-center gap-1 text-xs px-2 sm:px-2.5 py-1.5 sm:py-2 bg-stone-100 hover:bg-stone-200 text-stone-700 rounded-xl font-medium transition-colors min-h-[36px] touch-manipulation shrink-0"
            title="Зняти галочки всім дітям списку"
          >
            <RotateCcw className="w-3.5 h-3.5" />
            <span>Зняти</span>
          </button>
        </div>
      </div>

      {/* Main Checklist Matrix Table OR Cards View */}
      {viewMode === 'table' ? (
        <>
          {/* Desktop Table View */}
          <div className="hidden lg:block bg-white rounded-2xl shadow-xs border border-orange-100 overflow-hidden">
          <div className="p-3.5 sm:p-4 border-b border-orange-100 bg-orange-50/40 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <span className="w-2.5 h-2.5 rounded-full bg-orange-500 animate-pulse"></span>
              <h3 className="font-semibold text-stone-800 text-xs sm:text-base font-heading">
                Табель занять за {MONTH_NAMES_UK[selectedMonth - 1]} {selectedYear}
              </h3>
              <span className="text-xs text-stone-500 ml-2 hidden md:inline">
                (Клацайте на будь-яку клітинку щоб поставити або зняти галочку)
              </span>
            </div>
            <div className="text-xs text-stone-600 font-medium bg-white px-2 sm:px-2.5 py-1 rounded-lg border border-orange-200/60 shadow-xs">
              {filteredChildren.length} дітей
            </div>
          </div>

          <div className="journal-table-scroll overflow-auto max-w-full custom-scrollbar touch-pan-x" role="region" aria-label="Табель занять із закріпленими заголовками" tabIndex={0}>
            <table className="journal-table w-full text-left text-sm border-separate border-spacing-0 min-w-[900px]">
              <thead>
                <tr className="bg-stone-100 border-b border-stone-200 text-xs font-semibold text-stone-600 uppercase tracking-wider">
                  <th className="py-3.5 px-4 sticky left-0 z-20 bg-stone-100 min-w-[190px] sm:min-w-[210px] shadow-[2px_0_5px_-2px_rgba(0,0,0,0.08)] border-r border-stone-200">
                    ПІБ дитини / Група
                  </th>
                  {activeActivities.map((act) => (
                    <th
                      key={act.id}
                      className="py-3 px-3 text-center min-w-[125px] border-l border-stone-200/60 hover:bg-orange-50/60 transition-colors"
                    >
                      <div className="font-semibold text-stone-800 text-xs normal-case line-clamp-2 leading-tight">
                        {act.name}
                      </div>
                      <div className="mt-1 inline-block text-[11px] font-bold text-orange-600 bg-orange-100/80 px-2 py-0.5 rounded-md">
                        {act.price} ₴
                        {act.billingType === 'per_lesson' && <span> / заняття</span>}
                      </div>
                    </th>
                  ))}
                  <th className="py-3 px-3 text-center min-w-[85px] border-l border-stone-200/60">
                    Знижка на абонемент
                  </th>
                  <th className="py-3 px-3 text-center min-w-[130px] border-l border-stone-200/60 bg-teal-50/50 text-teal-900 font-semibold">
                    <div className="flex items-center justify-center gap-1">
                      <Stethoscope className="w-3.5 h-3.5 text-teal-600" />
                      <span>Лікарняні / Дні</span>
                    </div>
                  </th>
                  <th className="py-3 px-3 text-center min-w-[110px] border-l border-stone-200/60 bg-orange-50/40 text-orange-900 font-bold">
                    До сплати
                  </th>
                  <th className="py-3 px-3 text-center min-w-[110px] border-l border-stone-200/60">
                    Оплата
                  </th>
                  <th className="py-3 px-3 text-center min-w-[80px] border-l border-stone-200/60">
                    Рахунок
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-stone-100">
                {filteredChildren.length === 0 ? (
                  <tr>
                    <td
                      colSpan={activeActivities.length + 5}
                      className="py-12 text-center text-stone-400"
                    >
                      <AlertCircle className="w-8 h-8 mx-auto mb-2 text-stone-300" />
                      Не знайдено дітей за вибраними фільтрами
                    </td>
                  </tr>
                ) : (
                  filteredChildren.map((child, idx) => {
                    const record = records.find(
                      (r) =>
                        r.childId === child.id &&
                        r.year === selectedYear &&
                        r.month === selectedMonth
                    );
                    const {
                      subtotal,
                      total,
                      discountAmount,
                      selectedCount,
                      sickLeaveDays,
                      absenceDays,
                      totalDeductions,
                    } = calculateChildTotal(child, record, activeActivities);
                    const isPaid = record?.isPaid ?? false;
                    const paidAmount = record?.paidAmount ?? (isPaid ? total : 0);
                    const debt = record?.debt ?? Math.max(0, total - paidAmount);
                    const isPartial = paidAmount > 0 && debt > 0;
                    const discount =
                      record?.customDiscount !== undefined
                        ? record.customDiscount
                        : child.discountPercent || 0;
                    const configuredDiscount = child.discountPercent || 0;
                    const discountDiffersFromBill = Boolean(record?.billId && configuredDiscount > 0 && configuredDiscount !== discount);

                    const rowBgClass = idx % 2 === 1 ? 'bg-stone-50/60' : 'bg-white';

                    return (
                      <tr
                        key={child.id}
                        className={`hover:bg-orange-50/40 transition-colors ${rowBgClass}`}
                      >
                        {/* Child info fixed column with solid background to prevent transparency on mobile scroll */}
                        <td
                          className={`py-3 px-4 sticky left-0 z-10 shadow-[2px_0_5px_-2px_rgba(0,0,0,0.08)] border-r border-stone-200/80 ${
                            idx % 2 === 1 ? 'bg-stone-50' : 'bg-white'
                          }`}
                        >
                          <button
                            type="button"
                            onClick={() => canManageFinance && onOpenAccount(child)}
                            className={`font-semibold text-stone-900 text-left ${canManageFinance ? 'hover:text-orange-700 hover:underline cursor-pointer' : 'cursor-default'}`}
                            title={canManageFinance ? 'Відкрити картку та історію дитини' : undefined}
                          >
                            {child.fullName}
                          </button>
                          <div className="flex items-center gap-2 mt-0.5">
                            <span className="text-xs text-orange-700 bg-orange-100/60 px-2 py-0.5 rounded-full font-medium">
                              {child.group}
                            </span>
                            {child.parentPhone && (
                              <span className="text-[11px] text-stone-400 hidden sm:inline">
                                {child.parentPhone}
                              </span>
                            )}
                          </div>
                        </td>

                        {/* Interactive Activity Checkboxes */}
                        {activeActivities.map((act) => {
                          const isChecked = Boolean(
                            record?.checkedActivities?.[act.id]
                          );

                          if (act.billingType === 'per_lesson') return (
                            <td key={act.id} className="py-2 px-2 text-center border-l border-stone-100 min-w-[150px]">
                              <ActivityQuantityInput label={`Кількість: ${act.name}, ${child.fullName}`}
                                value={record?.activityQuantities?.[act.id] ?? 0}
                                unitPrice={record?.activityUnitPrices?.[act.id] ?? act.price}
                                disabled={readOnly || !act.active}
                                onChange={(quantity) => onActivityQuantity(child.id, act.id, quantity)} />
                            </td>
                          );

                          return (
                            <td
                              key={act.id}
                              onClick={() => { if (!readOnly && act.active) onToggleActivity(child.id, act.id); }}
                              className={`py-2 px-2 text-center border-l border-stone-100 select-none transition-all group touch-manipulation ${readOnly ? 'cursor-default' : 'cursor-pointer'} ${
                                isChecked
                                  ? 'bg-orange-50/90 font-medium'
                                  : 'hover:bg-orange-50/40'
                              }`}
                              title={`Натисніть щоб відмітити/зняти: ${act.name}`}
                            >
                              <div className="flex items-center justify-center min-h-[38px]">
                                <div
                                  className={`w-7 h-7 sm:w-8 sm:h-8 rounded-lg flex items-center justify-center transition-all ${
                                    isChecked
                                      ? 'bg-orange-600 text-white shadow-xs scale-105'
                                      : 'border-2 border-stone-200 group-hover:border-orange-400 bg-white'
                                  }`}
                                >
                                  {isChecked && <Check className="w-4 h-4 stroke-[3]" />}
                                </div>
                              </div>
                            </td>
                          );
                        })}

                        {/* Discount info */}
                        <td className="py-3 px-2 text-center border-l border-stone-100">
                          <div className="inline-flex flex-col items-center gap-1">
                            {discount > 0 && <div className="inline-flex flex-col items-center text-xs font-semibold text-emerald-700 bg-emerald-100 px-2 py-0.5 rounded-full">
                              <span>-{discount}% на абонемент</span>
                              {discountAmount > 0 && <span>-{formatCurrency(discountAmount)}</span>}
                            </div>}
                            {discountDiffersFromBill && <div className="text-[11px] font-semibold text-amber-800 bg-amber-100 px-2 py-0.5 rounded-lg">
                              Налаштовано -{configuredDiscount}% · у рахунку {discount}%
                            </div>}
                            {discount <= 0 && !discountDiffersFromBill && <span className="text-xs text-stone-400">—</span>}
                          </div>
                        </td>

                        {/* Sick Leave & Absence Deduction Cell */}
                        <td className="py-2.5 px-2 text-center border-l border-stone-100 bg-teal-50/20">
                          <button
                            type="button"
                            onClick={() => { if (!readOnly) setActiveAbsenceChild(child); }}
                            className="cursor-pointer group inline-flex flex-col items-center justify-center p-1.5 rounded-xl hover:bg-teal-50 border border-transparent hover:border-teal-200 transition-all text-left touch-manipulation min-h-[36px]"
                            title="Натисніть щоб налаштувати дні хвороби, пропусків чи списання"
                          >
                            {totalDeductions > 0 || sickLeaveDays > 0 || absenceDays > 0 ? (
                              <div className="flex flex-col items-center">
                                {totalDeductions > 0 && <span className="text-xs font-bold text-teal-800 bg-teal-100/90 group-hover:bg-teal-200 px-2 py-0.5 rounded-lg flex items-center gap-1 transition-colors">
                                  <Stethoscope className="w-3 h-3 text-teal-700" />
                                  -{formatCurrency(totalDeductions)}
                                </span>}
                                <span className="text-[10px] text-teal-700 font-medium mt-0.5">
                                  {sickLeaveDays > 0 && `${sickLeaveDays} лік.`}
                                  {sickLeaveDays > 0 && absenceDays > 0 && ' • '}
                                  {absenceDays > 0 && `${absenceDays} проп.`}
                                </span>
                              </div>
                            ) : (
                              <span className="text-[11px] font-medium text-stone-400 group-hover:text-teal-700 flex items-center gap-1 px-2 py-1 rounded-lg border border-dashed border-stone-200 group-hover:border-teal-300">
                                <Plus className="w-3 h-3" />
                                <span>Додати</span>
                              </span>
                            )}
                          </button>
                        </td>

                        {/* Calculated Total per child */}
                        <td className="py-3 px-3 text-center border-l border-stone-100 bg-orange-50/30">
                          <div className="font-bold text-stone-900 text-sm">
                            {formatCurrency(total)}
                          </div>
                          {discountAmount > 0 && (
                            <div className="text-[10px] text-stone-400 line-through">
                              {formatCurrency(subtotal)}
                            </div>
                          )}
                          <div className="text-[10px] text-orange-600">
                            {selectedCount} занять
                          </div>
                        </td>

                        {/* Paid Status Toggle */}
                        <td className="py-3 px-2 text-center border-l border-stone-100">
                          <button
                            id={`pay-status-${child.id}`}
                            onClick={() => canManageFinance ? (debt > 0 && !readOnly ? onOpenPayment(child.id) : onOpenAccount(child)) : undefined}
                            disabled={!canManageFinance}
                            className={`px-2.5 py-1 rounded-xl text-xs font-semibold transition-all inline-flex items-center gap-1 min-h-[32px] ${
                              isPaid
                                ? 'bg-emerald-100 text-emerald-800'
                                : isPartial
                                  ? 'bg-blue-100 text-blue-800'
                                  : 'bg-amber-100 text-amber-800'
                            } ${canManageFinance ? 'cursor-pointer hover:brightness-95' : 'cursor-default'}`}
                            title={canManageFinance ? (debt > 0 ? 'Внести платіж' : 'Відкрити історію платежів') : 'Статус оплати'}
                          >
                            {isPaid ? (
                              <>
                                <CheckCircle2 className="w-3 h-3" />
                                <span>Сплачено</span>
                              </>
                            ) : isPartial ? (
                              <>
                                <WalletCards className="w-3 h-3" />
                                <span>{formatCurrency(debt)}</span>
                              </>
                            ) : (
                              <>
                                <Clock className="w-3 h-3" />
                                <span>Очікує</span>
                              </>
                            )}
                          </button>
                        </td>

                        {/* Open Receipt Button */}
                        <td className="py-3 px-2 text-center border-l border-stone-100">
                          <button
                            id={`open-receipt-${child.id}`}
                            onClick={() => onOpenReceipt(child)}
                            className="cursor-pointer p-2 rounded-lg bg-stone-100 hover:bg-orange-100 text-stone-600 hover:text-orange-700 transition-colors touch-manipulation min-h-[36px] min-w-[36px] inline-flex items-center justify-center"
                            title="Сформувати рахунок/квитанцію"
                          >
                            <Receipt className="w-4 h-4" />
                          </button>
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
              {/* Table Footer with Summary per Activity */}
              {filteredChildren.length > 0 && (
                <tfoot>
                  <tr className="bg-stone-100 font-semibold text-stone-700 text-xs border-t-2 border-stone-300">
                    <td className="py-3.5 px-4 sticky left-0 z-10 bg-stone-100 shadow-[2px_0_5px_-2px_rgba(0,0,0,0.08)] border-r border-stone-200">
                      Підсумок (дітей на занятті):
                    </td>
                    {activeActivities.map((act) => {
                      const count = activityPopularity[act.id] || 0;
                      return (
                        <td
                          key={act.id}
                          className="py-3 px-2 text-center border-l border-stone-200"
                        >
                          <span className="font-bold text-orange-700 text-xs bg-orange-100/90 px-2 py-0.5 rounded-md">
                            {count}
                          </span>
                          <div className="text-[10px] text-stone-500 mt-0.5">
                            {act.billingType === 'per_lesson' && <div>{activityTotals[act.id]?.quantity ?? 0} занять</div>}
                            {formatCurrency(activityTotals[act.id]?.amount ?? 0)}
                          </div>
                        </td>
                      );
                    })}
                    <td className="py-3 px-2 text-center border-l border-stone-200">
                      —
                    </td>
                    <td className="py-3 px-2 text-center border-l border-stone-200 text-teal-800 font-bold bg-teal-50/70">
                      {stats.totalDeductionsSum > 0 ? `-${formatCurrency(stats.totalDeductionsSum)}` : '0 ₴'}
                    </td>
                    <td className="py-3 px-3 text-center border-l border-stone-200 font-extrabold text-orange-800 text-sm bg-orange-100/60">
                      {formatCurrency(stats.totalBilled)}
                    </td>
                    <td
                      colSpan={2}
                      className="py-3 px-2 text-center border-l border-stone-200 text-[11px] text-stone-500"
                    >
                      Зібрано: {formatCurrency(stats.totalPaid)}
                    </td>
                  </tr>
                </tfoot>
              )}
            </table>
          </div>
        </div>
        {/* Mobile / Tablet Block View when in table mode */}
        <div className="block lg:hidden">
          {renderBlockList()}
        </div>
      </>
    ) : (
      renderBlockList()
    )}

      {/* Absence & Sick Leave Deduction Modal */}
      {activeAbsenceChild && (
        <AbsenceDeductionModal
          child={activeAbsenceChild}
          record={records.find(
            (r) =>
              r.childId === activeAbsenceChild.id &&
              r.year === selectedYear &&
              r.month === selectedMonth
          )}
          selectedYear={selectedYear}
          selectedMonth={selectedMonth}
          defaultDailyRate={dailyFoodRate}
          onSave={(childId, data) => onUpdateAbsenceRecord
            ? onUpdateAbsenceRecord(childId, data)
            : Promise.reject(new Error('Збереження пропусків недоступне.'))}
          onClose={() => setActiveAbsenceChild(null)}
        />
      )}
    </div>
  );
};

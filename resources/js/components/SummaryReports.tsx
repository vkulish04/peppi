import React, { useState, useMemo } from 'react';
import {
  FileSpreadsheet,
  CheckCircle2,
  Clock,
  Coins,
  Download,
  Printer,
  Receipt,
  Search,
  Filter,
  Users,
  Building,
  TrendingUp,
  TrendingDown,
  Wallet,
  ArrowUpRight,
  ArrowDownRight,
  Utensils,
  Sparkles,
  Stethoscope,
} from 'lucide-react';
import { Child, Activity, MonthlyRecord, Employee, SalaryPayment, Expense, FinancialReport } from '../types';
import { calculateChildTotal, formatCurrency } from '../utils/calculations';
import { MONTH_NAMES_UK, KINDERGARTEN_INFO } from '../data/initialData';
import { CATEGORY_CONFIG } from './ExpensesManager';

interface SummaryReportsProps {
  childrenList: Child[];
  groups: string[];
  activities: Activity[];
  records: MonthlyRecord[];
  employees?: Employee[];
  salaryPayments?: SalaryPayment[];
  expenses?: Expense[];
  financialReport?: FinancialReport | null;
  selectedYear: number;
  selectedMonth: number;
  onTogglePaid: (childId: string) => void;
  onOpenReceipt: (child: Child) => void;
  onExportCSV: () => void;
  readOnly?: boolean;
}

export const SummaryReports: React.FC<SummaryReportsProps> = ({
  childrenList,
  groups,
  activities,
  records,
  employees = [],
  salaryPayments = [],
  expenses = [],
  financialReport = null,
  selectedYear,
  selectedMonth,
  onTogglePaid,
  onOpenReceipt,
  onExportCSV,
  readOnly = false,
}) => {
  const [filterPaidStatus, setFilterPaidStatus] = useState<'all' | 'paid' | 'unpaid'>('all');
  const [searchQuery, setSearchQuery] = useState('');

  const activeActivities = useMemo(() => activities.filter((a) => a.active), [activities]);

  // Group summary calculations
  const groupStats = useMemo(() => {
    return groups.map((grp) => {
      const groupKids = childrenList.filter((c) => c.group === grp && c.active);
      let billed = 0;
      let paid = 0;

      groupKids.forEach((child) => {
        const record = records.find(
          (r) =>
            r.childId === child.id &&
            r.year === selectedYear &&
            r.month === selectedMonth
        );
        const { total } = calculateChildTotal(child, record, activeActivities);
        billed += total;
        paid += Math.min(total, record?.paidAmount ?? (record?.isPaid ? total : 0));
      });

      const unpaid = billed - paid;
      const rate = billed > 0 ? Math.round((paid / billed) * 100) : 100;

      return {
        groupName: grp,
        count: groupKids.length,
        billed,
        paid,
        unpaid,
        rate,
      };
    });
  }, [childrenList, records, selectedYear, selectedMonth, activeActivities, groups]);

  // Activity breakdown calculations
  const activityStats = useMemo(() => {
    return activeActivities.map((act) => {
      let enrolledCount = 0;
      let revenue = 0;
      childrenList.forEach((child) => {
        const record = records.find(
          (r) =>
            r.childId === child.id &&
            r.year === selectedYear &&
            r.month === selectedMonth
        );
        if (record?.checkedActivities?.[act.id]) {
          enrolledCount += 1;
          revenue += record.billItems
            ? record.billItems.filter((item) => item.activityId === act.id).reduce((sum, item) => sum + item.amount, 0)
            : (record.activityQuantities?.[act.id] ?? 1) * (record.activityUnitPrices?.[act.id] ?? act.price);
        }
      });

      return {
        activity: act,
        count: enrolledCount,
        revenue,
      };
    });
  }, [activeActivities, childrenList, records, selectedYear, selectedMonth]);

  // Filtered children table for payment management
  const paymentRows = useMemo(() => {
    return childrenList
      .filter((child) => child.active)
      .map((child) => {
        const record = records.find(
          (r) =>
            r.childId === child.id &&
            r.year === selectedYear &&
            r.month === selectedMonth
        );
        const totalInfo = calculateChildTotal(child, record, activeActivities);
        return {
          child,
          record,
          ...totalInfo,
        };
      })
      .filter((row) => {
        const isPaid = row.record?.isPaid ?? false;
        if (filterPaidStatus === 'paid' && !isPaid) return false;
        if (filterPaidStatus === 'unpaid' && isPaid) return false;
        if (
          searchQuery &&
          !row.child.fullName.toLowerCase().includes(searchQuery.toLowerCase()) &&
          !row.child.group.toLowerCase().includes(searchQuery.toLowerCase())
        ) {
          return false;
        }
        return true;
      });
  }, [childrenList, records, selectedYear, selectedMonth, activeActivities, filterPaidStatus, searchQuery]);

  const grandTotals = useMemo(() => {
    let billed = 0;
    let paid = 0;
    paymentRows.forEach((r) => {
      billed += r.total;
      paid += Math.min(r.total, r.record?.paidAmount ?? (r.record?.isPaid ? r.total : 0));
    });
    return { billed, paid, unpaid: billed - paid };
  }, [paymentRows]);

  // Overall financial balance for current month.
  // Laravel report is the source of truth; local calculation is only a fallback.
  const financialBalance = useMemo(() => {
    const monthlyExpensesList = expenses.filter((exp) => {
      if (exp.source === 'payroll') return false;
      const expYear = exp.year || new Date(exp.date).getFullYear();
      const expMonth = exp.month || new Date(exp.date).getMonth() + 1;
      return expYear === selectedYear && expMonth === selectedMonth;
    });

    if (financialReport) {
      const totalOutflow = financialReport.salary.accrued + financialReport.expenses.total;
      return {
        revenueBilled: financialReport.revenue.billed,
        revenueCollected: financialReport.revenue.receivedForBills,
        totalSalaryAccrued: financialReport.salary.accrued,
        totalSalaryPaid: financialReport.salary.cashPaid,
        totalOperationalExpenses: financialReport.expenses.total,
        totalOutflow,
        netProfit: financialReport.result.accrualResult,
        actualCashFlow: financialReport.result.cashFlow,
        monthlyExpensesCount: monthlyExpensesList.length,
      };
    }

    const revenueBilled = grandTotals.billed;
    const revenueCollected = grandTotals.paid;
    const activeStaff = employees.filter((e) => e.active);
    let totalSalaryAccrued = 0;
    let totalSalaryPaid = 0;

    activeStaff.forEach((emp) => {
      const payment = salaryPayments.find(
        (p) =>
          p.employeeId === emp.id &&
          p.year === selectedYear &&
          p.month === selectedMonth
      );
      const amount = payment ? payment.finalAmount : emp.baseSalary;
      totalSalaryAccrued += amount;
      totalSalaryPaid += payment?.paidAmount ?? (payment?.status === 'paid' ? amount : 0);
    });

    const totalOperationalExpenses = monthlyExpensesList.reduce(
      (sum, exp) => sum + exp.amount,
      0
    );
    const totalOutflow = totalSalaryAccrued + totalOperationalExpenses;

    return {
      revenueBilled,
      revenueCollected,
      totalSalaryAccrued,
      totalSalaryPaid,
      totalOperationalExpenses,
      totalOutflow,
      netProfit: revenueBilled - totalOutflow,
      actualCashFlow: revenueCollected - (totalSalaryPaid + totalOperationalExpenses),
      monthlyExpensesCount: monthlyExpensesList.length,
    };
  }, [financialReport, grandTotals, employees, salaryPayments, expenses, selectedYear, selectedMonth]);

  return (
    <div className="space-y-6">
      {/* Top Banner */}
      <div className="bg-white p-5 rounded-2xl border border-orange-100 shadow-xs flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h2 className="text-xl font-bold text-stone-900 font-heading">
            Зведена відомість та каса за {MONTH_NAMES_UK[selectedMonth - 1]} {selectedYear}
          </h2>
          <p className="text-sm text-stone-500 mt-1">
            Повний фінансовий баланс дитсадка: доходи від батьків, виплати зарплат та операційні витрати
          </p>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={onExportCSV}
            className="cursor-pointer inline-flex items-center gap-1.5 px-3.5 py-2 bg-stone-100 hover:bg-stone-200 text-stone-700 text-xs font-semibold rounded-xl transition-all"
          >
            <Download className="w-3.5 h-3.5" />
            <span>Експорт звіту (CSV)</span>
          </button>
          <button
            onClick={() => window.print()}
            className="cursor-pointer inline-flex items-center gap-1.5 px-3.5 py-2 bg-orange-600 hover:bg-orange-700 text-white text-xs font-semibold rounded-xl shadow-xs transition-all"
          >
            <Printer className="w-3.5 h-3.5" />
            <span>Друк відомості</span>
          </button>
        </div>
      </div>

      {/* Financial Master Dashboard (P&L Summary) */}
      <div className="bg-gradient-to-br from-stone-900 via-stone-800 to-stone-900 text-white rounded-3xl p-6 shadow-xl border border-stone-700/50">
        <div className="flex flex-col md:flex-row md:items-center justify-between pb-4 border-b border-white/10 gap-3">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-orange-500/20 border border-orange-400/30 flex items-center justify-center text-orange-400">
              <Wallet className="w-5 h-5" />
            </div>
            <div>
              <span className="text-xs uppercase tracking-wider text-orange-400 font-bold">
                Головна фінансова книга садка
              </span>
              <h3 className="text-lg font-bold text-white">
                Фінансовий результат (Баланс доходів та витрат)
              </h3>
            </div>
          </div>

          <div className="text-right">
            <span className="text-xs text-stone-400">Чистий фінансовий залишок:</span>
            <div
              className={`text-2xl font-black font-mono tracking-tight ${
                financialBalance.netProfit >= 0
                  ? 'text-emerald-400'
                  : 'text-rose-400'
              }`}
            >
              {financialBalance.netProfit >= 0 ? '+' : ''}
              {formatCurrency(financialBalance.netProfit)}
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 pt-5">
          {/* Revenue */}
          <div className="bg-white/5 rounded-2xl p-4 border border-white/10">
            <div className="flex items-center justify-between text-xs text-stone-300">
              <span className="flex items-center gap-1.5 font-medium">
                <ArrowUpRight className="w-4 h-4 text-emerald-400" />
                Дохід (Батьківська плата)
              </span>
              <span className="text-[10px] text-emerald-300 bg-emerald-950/60 px-2 py-0.5 rounded-md border border-emerald-800/50">
                Нараховано
              </span>
            </div>
            <div className="mt-2 text-xl font-bold font-mono text-white">
              {formatCurrency(financialBalance.revenueBilled)}
            </div>
            <div className="mt-1 text-xs text-emerald-400">
              Сплачено в касу: {formatCurrency(financialBalance.revenueCollected)}
            </div>
          </div>

          {/* Salaries */}
          <div className="bg-white/5 rounded-2xl p-4 border border-white/10">
            <div className="flex items-center justify-between text-xs text-stone-300">
              <span className="flex items-center gap-1.5 font-medium">
                <ArrowDownRight className="w-4 h-4 text-rose-400" />
                Фонд оплати праці (ФОП)
              </span>
              <span className="text-[10px] text-stone-300 bg-white/10 px-2 py-0.5 rounded-md">
                {employees.length} працівників
              </span>
            </div>
            <div className="mt-2 text-xl font-bold font-mono text-white">
              {formatCurrency(financialBalance.totalSalaryAccrued)}
            </div>
            <div className="mt-1 text-xs text-stone-400">
              Фактично виплачено: {formatCurrency(financialBalance.totalSalaryPaid)}
            </div>
          </div>

          {/* Operational Expenses */}
          <div className="bg-white/5 rounded-2xl p-4 border border-white/10">
            <div className="flex items-center justify-between text-xs text-stone-300">
              <span className="flex items-center gap-1.5 font-medium">
                <ArrowDownRight className="w-4 h-4 text-rose-400" />
                Операційні розтрати
              </span>
              <span className="text-[10px] text-stone-300 bg-white/10 px-2 py-0.5 rounded-md">
                Харчування, сміття...
              </span>
            </div>
            <div className="mt-2 text-xl font-bold font-mono text-white">
              {formatCurrency(financialBalance.totalOperationalExpenses)}
            </div>
            <div className="mt-1 text-xs text-stone-400">
              Зафіксовано {financialBalance.monthlyExpensesCount} витратних накладних
            </div>
          </div>

          {/* Total Expenses */}
          <div className="bg-white/5 rounded-2xl p-4 border border-white/10">
            <div className="flex items-center justify-between text-xs text-stone-300">
              <span className="flex items-center gap-1.5 font-medium">
                <TrendingDown className="w-4 h-4 text-amber-400" />
                Разом витрат за місяць
              </span>
              <span className="text-[10px] text-amber-300 bg-amber-950/60 px-2 py-0.5 rounded-md border border-amber-800/50">
                ФОП + Розтрати
              </span>
            </div>
            <div className="mt-2 text-xl font-bold font-mono text-amber-300">
              {formatCurrency(financialBalance.totalOutflow)}
            </div>
            <div className="mt-1 text-xs text-stone-400">
              Рентабельність:{' '}
              {financialBalance.revenueBilled > 0
                ? `${Math.round(
                    (financialBalance.netProfit / financialBalance.revenueBilled) * 100
                  )}%`
                : '0%'}
            </div>
          </div>
        </div>
      </div>


      {/* Summary Cards by Kindergarten Groups */}
      <div>
        <h3 className="text-sm font-bold text-stone-700 uppercase tracking-wider mb-3">
          Зведення за віковими групами
        </h3>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {groupStats.map((item) => (
            <div
              key={item.groupName}
              className="bg-white p-4 rounded-2xl border border-stone-200 hover:border-orange-300 transition-all shadow-2xs"
            >
              <div className="flex items-center justify-between mb-2">
                <span className="font-bold text-stone-900 text-sm">
                  {item.groupName}
                </span>
                <span className="text-xs bg-orange-50 text-orange-700 font-semibold px-2 py-0.5 rounded-full border border-orange-200">
                  {item.count} дітей
                </span>
              </div>

              <div className="space-y-1 text-xs">
                <div className="flex justify-between text-stone-600">
                  <span>Нараховано:</span>
                  <span className="font-bold text-stone-900">
                    {formatCurrency(item.billed)}
                  </span>
                </div>
                <div className="flex justify-between text-emerald-700">
                  <span>Сплачено:</span>
                  <span className="font-semibold">
                    {formatCurrency(item.paid)}
                  </span>
                </div>
                {item.unpaid > 0 && (
                  <div className="flex justify-between text-amber-700">
                    <span>Борг:</span>
                    <span className="font-semibold">
                      {formatCurrency(item.unpaid)}
                    </span>
                  </div>
                )}
              </div>

              {/* Progress bar */}
              <div className="mt-3">
                <div className="w-full h-2 bg-stone-100 rounded-full overflow-hidden">
                  <div
                    className="h-full bg-orange-500 rounded-full transition-all"
                    style={{ width: `${Math.min(100, item.rate)}%` }}
                  />
                </div>
                <div className="flex justify-between text-[10px] text-stone-400 mt-1">
                  <span>Оплачено: {item.rate}%</span>
                  <span>{item.rate === 100 ? 'Повністю' : 'В процесі'}</span>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Revenue per Activity */}
      <div className="bg-white rounded-2xl p-5 border border-orange-100 shadow-xs">
        <h3 className="text-sm font-bold text-stone-800 uppercase tracking-wider mb-3">
          Дохідність занять та популярність серед дітей
        </h3>
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3">
          {activityStats.map((item) => (
            <div
              key={item.activity.id}
              className="p-3 bg-stone-50/80 rounded-xl border border-stone-200/70"
            >
              <div className="text-xs font-semibold text-stone-800 line-clamp-1">
                {item.activity.name}
              </div>
              <div className="flex items-baseline justify-between mt-2">
                <span className="text-lg font-extrabold text-orange-700 font-heading">
                  {formatCurrency(item.revenue)}
                </span>
                <span className="text-xs text-stone-500 font-medium">
                  {item.count} вихованців
                </span>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Detailed Payment Registry Table */}
      <div className="bg-white rounded-2xl shadow-xs border border-orange-100 overflow-hidden">
        <div className="p-4 bg-orange-50/40 border-b border-orange-100 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div className="flex items-center gap-2">
            <span className="font-bold text-stone-900 text-sm sm:text-base font-heading">
              Реєстр оплат по дітях
            </span>
            <span className="text-xs text-stone-500">
              ({paymentRows.length} записів)
            </span>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <div className="relative min-w-[180px]">
              <Search className="w-3.5 h-3.5 text-stone-400 absolute left-2.5 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                placeholder="Пошук..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-8 pr-3 py-1.5 text-xs bg-white border border-stone-200 rounded-xl focus:outline-hidden focus:border-orange-400"
              />
            </div>

            {/* Status Filter Buttons */}
            <div className="inline-flex rounded-xl p-0.5 bg-stone-100 border border-stone-200 text-xs">
              <button
                onClick={() => setFilterPaidStatus('all')}
                className={`cursor-pointer px-2.5 py-1 rounded-lg font-medium transition-all ${
                  filterPaidStatus === 'all'
                    ? 'bg-white text-stone-900 shadow-xs'
                    : 'text-stone-600 hover:text-stone-900'
                }`}
              >
                Всі
              </button>
              <button
                onClick={() => setFilterPaidStatus('paid')}
                className={`cursor-pointer px-2.5 py-1 rounded-lg font-medium transition-all ${
                  filterPaidStatus === 'paid'
                    ? 'bg-emerald-600 text-white shadow-xs'
                    : 'text-stone-600 hover:text-stone-900'
                }`}
              >
                Сплачені
              </button>
              <button
                onClick={() => setFilterPaidStatus('unpaid')}
                className={`cursor-pointer px-2.5 py-1 rounded-lg font-medium transition-all ${
                  filterPaidStatus === 'unpaid'
                    ? 'bg-amber-600 text-white shadow-xs'
                    : 'text-stone-600 hover:text-stone-900'
                }`}
              >
                Борг
              </button>
            </div>
          </div>
        </div>

        <div className="overflow-x-auto max-w-full custom-scrollbar touch-pan-x">
          <table className="w-full text-left text-sm border-collapse min-w-[750px]">
            <thead>
              <tr className="bg-stone-50 border-b border-stone-200 text-xs font-semibold text-stone-600 uppercase">
                <th className="py-3 px-4">ПІБ дитини</th>
                <th className="py-3 px-3">Група</th>
                <th className="py-3 px-3">Телефон батьків</th>
                <th className="py-3 px-3 text-center">Занять</th>
                <th className="py-3 px-3 text-center text-teal-800">Лікарняні/зняття</th>
                <th className="py-3 px-3 text-right">Нараховано</th>
                <th className="py-3 px-3 text-center">Статус</th>
                <th className="py-3 px-4 text-center">Квитанція</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-stone-100">
              {paymentRows.map((row) => {
                const isPaid = row.record?.isPaid ?? false;

                return (
                  <tr
                    key={row.child.id}
                    className="hover:bg-orange-50/40 transition-colors"
                  >
                    <td className="py-3 px-4 font-semibold text-stone-900">
                      {row.child.fullName}
                      {row.child.discountPercent ? (
                        <span className="ml-2 text-[10px] text-emerald-700 bg-emerald-100 px-1.5 py-0.5 rounded-full font-bold">
                          Абонемент -{row.child.discountPercent}%
                        </span>
                      ) : null}
                    </td>
                    <td className="py-3 px-3 text-xs text-stone-600">
                      {row.child.group}
                    </td>
                    <td className="py-3 px-3 text-xs text-stone-500 font-mono">
                      {row.child.parentPhone || '—'}
                    </td>
                    <td className="py-3 px-3 text-xs text-center text-stone-600 font-medium">
                      {row.selectedCount}
                    </td>
                    <td className="py-3 px-3 text-xs text-center">
                      {row.totalDeductions > 0 || row.sickLeaveDays > 0 || row.absenceDays > 0 ? (
                        <div className="inline-flex flex-col items-center">
                          {row.totalDeductions > 0 && <span className="font-bold text-teal-800 bg-teal-50 px-2 py-0.5 rounded-md text-[11px] border border-teal-200">
                            -{formatCurrency(row.totalDeductions)}
                          </span>}
                          <span className="text-[10px] text-stone-500 mt-0.5">
                            {row.sickLeaveDays > 0 && `${row.sickLeaveDays} лік.`}
                            {row.sickLeaveDays > 0 && row.absenceDays > 0 && ' • '}
                            {row.absenceDays > 0 && `${row.absenceDays} проп.`}
                          </span>
                        </div>
                      ) : (
                        <span className="text-stone-300">—</span>
                      )}
                    </td>
                    <td className="py-3 px-3 text-right font-bold text-stone-900 text-sm">
                      {formatCurrency(row.total)}
                    </td>
                    <td className="py-3 px-3 text-center">
                      <button
                        disabled={readOnly}
                        onClick={() => onTogglePaid(row.child.id)}
                        className={`cursor-pointer px-2.5 py-1 rounded-xl text-xs font-semibold transition-all inline-flex items-center gap-1 ${
                          isPaid
                            ? 'bg-emerald-100 text-emerald-800 hover:bg-emerald-200'
                            : 'bg-amber-100 text-amber-800 hover:bg-amber-200'
                        }`}
                      >
                        {isPaid ? (
                          <>
                            <CheckCircle2 className="w-3 h-3" />
                            <span>Сплачено</span>
                          </>
                        ) : (
                          <>
                            <Clock className="w-3 h-3" />
                            <span>Очікує</span>
                          </>
                        )}
                      </button>
                    </td>
                    <td className="py-3 px-4 text-center">
                      <button
                        onClick={() => onOpenReceipt(row.child)}
                        className="cursor-pointer inline-flex items-center gap-1 text-xs px-2.5 py-1 text-orange-700 bg-orange-50 hover:bg-orange-100 rounded-lg transition-colors font-medium border border-orange-200"
                      >
                        <Receipt className="w-3.5 h-3.5" />
                        <span>Рахунок</span>
                      </button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
            <tfoot>
              <tr className="bg-stone-100 font-bold text-stone-800 text-xs border-t-2 border-stone-200">
                <td colSpan={5} className="py-3 px-4 text-right uppercase">
                  Разом по відомості:
                </td>
                <td className="py-3 px-3 text-right text-orange-700 text-sm font-extrabold">
                  {formatCurrency(grandTotals.billed)}
                </td>
                <td colSpan={2} className="py-3 px-4 text-center text-stone-600">
                  Сплачено: {formatCurrency(grandTotals.paid)} | Борг:{' '}
                  {formatCurrency(grandTotals.unpaid)}
                </td>
              </tr>
            </tfoot>
          </table>
        </div>
      </div>
    </div>
  );
};

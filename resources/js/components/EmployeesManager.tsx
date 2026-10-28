import React, { useState, useMemo } from 'react';
import {
  Users,
  Plus,
  Search,
  CheckCircle2,
  Clock,
  Banknote,
  Edit2,
  Trash2,
  Phone,
  Calendar,
  Wallet,
  DollarSign,
  TrendingUp,
  FileText,
  UserCheck,
  Building,
  LayoutGrid,
  Table2,
} from 'lucide-react';
import { Employee, SalaryPayment, PayrollDisbursementInput } from '../types';
import { PayrollPaymentsModal } from './PayrollPaymentsModal';
import { formatCurrency } from '../utils/calculations';
import {
  hasNoveltySalary,
  NOVELTY_SALARY_LABEL,
  NOVELTY_SALARY_POSITIONS,
} from '../utils/noveltySalary';
import { MONTH_NAMES_UK } from '../data/initialData';

interface EmployeesManagerProps {
  employees: Employee[];
  salaryPayments: SalaryPayment[];
  selectedYear: number;
  selectedMonth: number;
  onAddEmployee: (employee: Omit<Employee, 'id'>) => void;
  onUpdateEmployee: (employee: Employee) => void;
  onDeleteEmployee: (id: string) => void;
  onUpdateSalaryPayment: (payment: SalaryPayment) => void;
  onAddPayrollPayment: (payroll: SalaryPayment, input: PayrollDisbursementInput) => Promise<void>;
  readOnly?: boolean;
}

const COMMON_POSITIONS = [
  'Вихователь',
  'Вихователь-методист',
  'Помічник вихователя (няня)',
  'Шеф-кухар',
  'Кухар',
  'Медична сестра',
  'Музичний керівник',
  'Хореограф / Інструктор з фізкультури',
  'Психолог / Логопед',
  'Завідувач дитсадка',
  'Завгосп / Двірник',
  ...NOVELTY_SALARY_POSITIONS,
];

export const EmployeesManager: React.FC<EmployeesManagerProps> = ({
  employees,
  salaryPayments,
  selectedYear,
  selectedMonth,
  onAddEmployee,
  onUpdateEmployee,
  onDeleteEmployee,
  onUpdateSalaryPayment,
  onAddPayrollPayment,
  readOnly = false,
}) => {
  const [subTab, setSubTab] = useState<'payroll' | 'employees'>('payroll');
  const [payrollView, setPayrollView] = useState<'table' | 'cards'>(() =>
    typeof window !== 'undefined' && window.innerWidth < 1024 ? 'cards' : 'table',
  );
  const [searchQuery, setSearchQuery] = useState('');
  const [positionFilter, setPositionFilter] = useState('all');
  const [showAddModal, setShowAddModal] = useState(false);
  const [editingEmployee, setEditingEmployee] = useState<Employee | null>(null);

  // Edit payment modal
  const [editingPayment, setEditingPayment] = useState<SalaryPayment | null>(null);

  // Employee Form state
  const [formFullName, setFormFullName] = useState('');
  const [formPosition, setFormPosition] = useState(COMMON_POSITIONS[0]);
  const [formCustomPosition, setFormCustomPosition] = useState('');
  const [formPhone, setFormPhone] = useState('');
  const [formBaseSalary, setFormBaseSalary] = useState<number>(12000);
  const [formStartDate, setFormStartDate] = useState(
    new Date().toISOString().split('T')[0]
  );
  const [formNotes, setFormNotes] = useState('');

  // Payment Form state
  const [payBonus, setPayBonus] = useState('0');
  const [payDeductions, setPayDeductions] = useState('0');
  const [payoutEmployeeId, setPayoutEmployeeId] = useState<string | null>(null);
  const [payNotes, setPayNotes] = useState('');

  // Get or generate payment record for employee for current month
  const getPaymentForEmployee = (empId: string): SalaryPayment => {
    const existing = salaryPayments.find(
      (p) =>
        p.employeeId === empId &&
        p.year === selectedYear &&
        p.month === selectedMonth
    );
    if (existing) return existing;

    const emp = employees.find((e) => e.id === empId);
    const base = emp?.baseSalary || 0;
    return {
      id: `sal-${empId}-${selectedYear}-${selectedMonth}`,
      employeeId: empId,
      year: selectedYear,
      month: selectedMonth,
      baseSalary: base,
      bonus: 0,
      deductions: 0,
      finalAmount: 0,
      paidAmount: 0, remainingAmount: 0, payments: [],
      status: 'pending',
    };
  };

  const activeEmployees = useMemo(
    () => employees.filter((e) => e.active),
    [employees]
  );

  const filteredEmployees = useMemo(() => {
    return employees.filter((emp) => {
      const matchesSearch =
        emp.fullName.toLowerCase().includes(searchQuery.toLowerCase()) ||
        emp.position.toLowerCase().includes(searchQuery.toLowerCase()) ||
        emp.phone.toLowerCase().includes(searchQuery.toLowerCase());
      const matchesPosition =
        positionFilter === 'all' || emp.position.includes(positionFilter);
      return matchesSearch && matchesPosition;
    });
  }, [employees, searchQuery, positionFilter]);

  // Payroll summary stats for selected month
  const payrollStats = useMemo(() => {
    let totalBase = 0;
    let totalBonuses = 0;
    let totalDeductions = 0;
    let totalToPay = 0;
    let totalPaid = 0;
    let paidCount = 0;

    activeEmployees.forEach((emp) => {
      const payment = getPaymentForEmployee(emp.id);
      totalBase += payment.baseSalary;
      totalBonuses += payment.bonus || 0;
      totalDeductions += payment.deductions || 0;
      totalToPay += payment.finalAmount;
      totalPaid += payment.paidAmount ?? (payment.status === 'paid' ? payment.finalAmount : 0);
      if (payment.status === 'paid') paidCount += 1;
    });

    const pendingAmount = totalToPay - totalPaid;

    return {
      totalBase,
      totalBonuses,
      totalDeductions,
      totalToPay,
      totalPaid,
      pendingAmount,
      paidCount,
      totalCount: activeEmployees.length,
    };
  }, [activeEmployees, salaryPayments, selectedYear, selectedMonth]);

  const openAddEmployeeModal = () => {
    setEditingEmployee(null);
    setFormFullName('');
    setFormPosition(COMMON_POSITIONS[0]);
    setFormCustomPosition('');
    setFormPhone('+38 (0');
    setFormBaseSalary(12000);
    setFormStartDate(new Date().toISOString().split('T')[0]);
    setFormNotes('');
    setShowAddModal(true);
  };

  const openEditEmployeeModal = (emp: Employee) => {
    setEditingEmployee(emp);
    setFormFullName(emp.fullName);
    if (COMMON_POSITIONS.includes(emp.position)) {
      setFormPosition(emp.position);
      setFormCustomPosition('');
    } else {
      setFormPosition('custom');
      setFormCustomPosition(emp.position);
    }
    setFormPhone(emp.phone);
    setFormBaseSalary(emp.baseSalary);
    setFormStartDate(emp.startDate || '');
    setFormNotes(emp.notes || '');
    setShowAddModal(true);
  };

  const handleSaveEmployee = (e: React.FormEvent) => {
    e.preventDefault();
    if (!formFullName.trim()) return;

    const resolvedPosition =
      formPosition === 'custom' ? formCustomPosition.trim() : formPosition;
    const resolvedSalary = hasNoveltySalary(resolvedPosition)
      ? 0
      : Number(formBaseSalary) || 0;

    if (editingEmployee) {
      onUpdateEmployee({
        ...editingEmployee,
        fullName: formFullName.trim(),
        position: resolvedPosition || 'Працівник',
        phone: formPhone.trim(),
        baseSalary: resolvedSalary,
        startDate: formStartDate,
        notes: formNotes.trim(),
      });
    } else {
      onAddEmployee({
        fullName: formFullName.trim(),
        position: resolvedPosition || 'Працівник',
        phone: formPhone.trim(),
        baseSalary: resolvedSalary,
        startDate: formStartDate,
        notes: formNotes.trim(),
        active: true,
      });
    }
    setShowAddModal(false);
  };

  const openPaymentEditModal = (emp: Employee) => {
    const p = getPaymentForEmployee(emp.id);
    setEditingPayment(p);
    const noveltySalary = hasNoveltySalary(emp.position);
    setPayBonus(String(noveltySalary ? 0 : p.bonus || 0));
    setPayDeductions(String(noveltySalary ? 0 : p.deductions || 0));
    setPayNotes(p.notes || '');
  };

  const handleSavePayment = (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingPayment) return;

    const employee = employees.find((item) => item.id === editingPayment.employeeId);
    const noveltySalary = hasNoveltySalary(employee?.position);
    const base = noveltySalary ? 0 : editingPayment.baseSalary;
    const bonus = noveltySalary ? 0 : Number(payBonus) || 0;
    const deductions = noveltySalary ? 0 : Number(payDeductions) || 0;
    const finalAmount = Math.max(0, base + bonus - deductions);

    onUpdateSalaryPayment({
      ...editingPayment,
      baseSalary: base,
      bonus,
      deductions,
      finalAmount,
      notes: payNotes.trim(),
    });

    setEditingPayment(null);
  };


  const renderPayrollStatus = (payment: SalaryPayment) => (
    <span className={`inline-flex items-center gap-1.5 whitespace-nowrap rounded-full px-3 py-1 text-xs font-semibold ${payment.status === 'paid' ? 'bg-emerald-100 text-emerald-800' : payment.status === 'partial' ? 'bg-orange-100 text-orange-800' : 'bg-stone-100 text-stone-600'}`}>
      {payment.status === 'paid' ? <CheckCircle2 className="h-3.5 w-3.5" /> : <Clock className="h-3.5 w-3.5" />}
      {payment.status === 'paid' ? 'Виплачено' : payment.status === 'partial' ? 'Частково' : 'Очікує'}
    </span>
  );

  const renderPayrollActions = (employee: Employee) => (
    <div className="flex items-center gap-2 whitespace-nowrap">
      <button type="button" onClick={() => setPayoutEmployeeId(employee.id)} className="inline-flex min-h-10 flex-1 items-center justify-center gap-2 rounded-xl bg-orange-600 px-3 py-2 text-xs font-bold text-white transition hover:bg-orange-700 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-orange-300">
        <Wallet className="h-4 w-4 shrink-0" />Виплати
      </button>
      <button type="button" disabled={readOnly} onClick={() => openPaymentEditModal(employee)} title="Редагувати нарахування та премії" className="inline-flex min-h-10 flex-1 items-center justify-center gap-2 rounded-xl border border-stone-200 bg-white px-3 py-2 text-xs font-bold text-stone-700 transition hover:border-orange-200 hover:bg-orange-50 hover:text-orange-700 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-orange-200 disabled:cursor-not-allowed disabled:opacity-40">
        <Edit2 className="h-4 w-4 shrink-0" />Нарахування
      </button>
    </div>
  );

  return (
    <div className="space-y-6">
      {/* Top Banner & Quick Controls */}
      <div className="bg-white rounded-2xl p-5 border border-orange-200/80 shadow-sm flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <span className="px-2.5 py-1 rounded-lg bg-orange-100 text-orange-700 text-xs font-semibold uppercase tracking-wider">
              Штатний розпис та ФОП
            </span>
            <span className="text-xs text-stone-500 font-medium">
              Період: {MONTH_NAMES_UK[selectedMonth - 1]} {selectedYear} р.
            </span>
          </div>
          <h2 className="text-xl font-bold text-stone-800 mt-1 flex items-center gap-2">
            <Users className="w-6 h-6 text-orange-600" />
            Заробітна плата та персонал дитсадка
          </h2>
          <p className="text-xs text-stone-600 mt-0.5">
            Оклади, премії та виплати частинами: аванс, зарплата, історія виплат і залишок.
          </p>
        </div>

        <div className="flex items-center gap-3 w-full md:w-auto">
          {/* Subtabs switcher */}
          <div className="inline-flex bg-stone-100 p-1 rounded-xl border border-stone-200 text-xs font-semibold">
            <button
              id="subtab-payroll-btn"
              onClick={() => setSubTab('payroll')}
              className={`px-3 py-1.5 rounded-lg transition-all cursor-pointer ${
                subTab === 'payroll'
                  ? 'bg-orange-600 text-white shadow-sm'
                  : 'text-stone-600 hover:text-stone-900'
              }`}
            >
              Відомість зарплати
            </button>
            <button
              id="subtab-staff-btn"
              onClick={() => setSubTab('employees')}
              className={`px-3 py-1.5 rounded-lg transition-all cursor-pointer ${
                subTab === 'employees'
                  ? 'bg-orange-600 text-white shadow-sm'
                  : 'text-stone-600 hover:text-stone-900'
              }`}
            >
              Картки співробітників ({employees.length})
            </button>
          </div>

          <button
            id="add-employee-btn"
            onClick={openAddEmployeeModal}
            className="inline-flex items-center gap-2 px-4 py-2 bg-gradient-to-r from-orange-600 to-amber-600 hover:from-orange-700 hover:to-amber-700 text-white text-xs font-semibold rounded-xl shadow-sm transition-all cursor-pointer whitespace-nowrap"
          >
            <Plus className="w-4 h-4" />
            <span>Додати працівника</span>
          </button>
        </div>
      </div>

      {/* Financial KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-white rounded-2xl p-4 border border-orange-100 shadow-sm">
          <div className="flex items-center justify-between">
            <span className="text-xs font-medium text-stone-500">
              Штатний фонд (Оклади)
            </span>
            <div className="w-8 h-8 rounded-xl bg-amber-50 text-amber-600 flex items-center justify-center">
              <Building className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-2 text-xl font-bold text-stone-900">
            {formatCurrency(payrollStats.totalBase)}
          </div>
          <div className="mt-1 text-xs text-stone-500 flex items-center gap-1">
            <span>{payrollStats.totalCount} штатних посад</span>
          </div>
        </div>

        <div className="bg-white rounded-2xl p-4 border border-orange-100 shadow-sm">
          <div className="flex items-center justify-between">
            <span className="text-xs font-medium text-stone-500">
              Разом нараховано (з надбавками)
            </span>
            <div className="w-8 h-8 rounded-xl bg-orange-50 text-orange-600 flex items-center justify-center">
              <Banknote className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-2 text-xl font-bold text-orange-600">
            {formatCurrency(payrollStats.totalToPay)}
          </div>
          <div className="mt-1 text-xs text-stone-500 flex items-center gap-1">
            <span className="text-emerald-600 font-medium">
              +{formatCurrency(payrollStats.totalBonuses)} надбавки
            </span>
          </div>
        </div>

        <div className="bg-white rounded-2xl p-4 border border-emerald-100 shadow-sm">
          <div className="flex items-center justify-between">
            <span className="text-xs font-medium text-stone-500">
              Виплачено зарплати
            </span>
            <div className="w-8 h-8 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center">
              <CheckCircle2 className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-2 text-xl font-bold text-emerald-600">
            {formatCurrency(payrollStats.totalPaid)}
          </div>
          <div className="mt-1 text-xs text-emerald-700 font-medium">
            {payrollStats.paidCount} з {payrollStats.totalCount} виплачено
          </div>
        </div>

        <div className="bg-white rounded-2xl p-4 border border-amber-100 shadow-sm">
          <div className="flex items-center justify-between">
            <span className="text-xs font-medium text-stone-500">
              Залишок до виплати
            </span>
            <div className="w-8 h-8 rounded-xl bg-amber-50 text-amber-600 flex items-center justify-center">
              <Clock className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-2 text-xl font-bold text-amber-600">
            {formatCurrency(payrollStats.pendingAmount)}
          </div>
          <div className="mt-1 text-xs text-stone-500">
            Очікує виплати за {MONTH_NAMES_UK[selectedMonth - 1]}
          </div>
        </div>
      </div>

      {/* VIEW 1: PAYROLL STATEMENT FOR SELECTED MONTH */}
      {subTab === 'payroll' && (
        <div className="bg-white rounded-2xl border border-stone-200/80 shadow-sm overflow-hidden">
          <div className="p-4 border-b border-stone-200/80 flex flex-col sm:flex-row items-center justify-between gap-3 bg-stone-50/70">
            <div className="flex items-center gap-2">
              <FileText className="w-4 h-4 text-orange-600" />
              <h3 className="text-sm font-bold text-stone-800">
                Розрахунково-платіжна відомість за {MONTH_NAMES_UK[selectedMonth - 1]}{' '}
                {selectedYear}
              </h3>
            </div>
            <div role="group" aria-label="Вигляд відомості зарплати" className="inline-flex shrink-0 items-center gap-1 rounded-xl border border-stone-200 bg-white p-1">
              <button type="button" aria-pressed={payrollView === 'table'} onClick={() => setPayrollView('table')} className={`inline-flex min-h-9 items-center gap-2 rounded-lg px-3 py-2 text-xs font-bold transition ${payrollView === 'table' ? 'bg-orange-600 text-white shadow-sm' : 'text-stone-500 hover:bg-stone-50 hover:text-stone-800'}`}><Table2 className="h-4 w-4" />Таблиця</button>
              <button type="button" aria-pressed={payrollView === 'cards'} onClick={() => setPayrollView('cards')} className={`inline-flex min-h-9 items-center gap-2 rounded-lg px-3 py-2 text-xs font-bold transition ${payrollView === 'cards' ? 'bg-orange-600 text-white shadow-sm' : 'text-stone-500 hover:bg-stone-50 hover:text-stone-800'}`}><LayoutGrid className="h-4 w-4" />Плитки</button>
            </div>
          </div>

          {payrollView === 'cards' ? <div className="grid gap-4 bg-stone-50/40 p-4 sm:grid-cols-2 xl:grid-cols-3 sm:p-5">
            {activeEmployees.length === 0 ? <p className="col-span-full py-8 text-center text-sm text-stone-400">Немає зареєстрованих працівників. Натисніть «Додати працівника».</p> : activeEmployees.map(employee => {
              const payment = getPaymentForEmployee(employee.id);
              const paid = payment.paidAmount ?? 0;
              const remaining = payment.remainingAmount ?? Math.max(0, payment.finalAmount - paid);
              const progress = payment.finalAmount > 0 ? Math.min(100, Math.round(paid / payment.finalAmount * 100)) : 0;
              const novelty = hasNoveltySalary(employee.position);
              return <article key={employee.id} aria-label={`Зарплата: ${employee.fullName}`} className="flex min-w-0 flex-col rounded-2xl border border-stone-200 bg-white p-4 shadow-xs sm:p-5">
                <div className="flex items-start justify-between gap-3"><div className="flex min-w-0 items-center gap-3"><div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-orange-100 text-sm font-extrabold text-orange-700">{employee.fullName.slice(0,2).toUpperCase()}</div><div className="min-w-0"><h4 className="break-words text-sm font-extrabold text-stone-900">{employee.fullName}</h4><p className="mt-0.5 break-words text-xs text-stone-500">{employee.position}</p></div></div></div>
                <div className="mt-3">{renderPayrollStatus(payment)}</div>
                <dl className="mt-4 space-y-2.5 text-xs"><div className="flex justify-between gap-3"><dt className="text-stone-500">Базовий оклад</dt><dd className="text-right font-semibold text-stone-800">{novelty ? NOVELTY_SALARY_LABEL : formatCurrency(payment.baseSalary)}</dd></div><div className="flex justify-between gap-3"><dt className="text-stone-500">Премія / Надбавка</dt><dd className="font-semibold text-emerald-700">+{formatCurrency(payment.bonus)}</dd></div><div className="flex justify-between gap-3"><dt className="text-stone-500">Утримання</dt><dd className="font-semibold text-rose-700">−{formatCurrency(payment.deductions)}</dd></div></dl>
                <div className="mt-4 rounded-xl bg-stone-50 p-3"><p className="text-[11px] font-semibold text-stone-500">Нараховано за місяць</p><p className="mt-1 text-xl font-extrabold text-stone-900">{novelty ? NOVELTY_SALARY_LABEL : formatCurrency(payment.finalAmount)}</p><div className="mt-3 h-1.5 overflow-hidden rounded-full bg-stone-200" role="progressbar" aria-label="Частка виплаченої зарплати" aria-valuenow={progress} aria-valuemin={0} aria-valuemax={100}><div className="h-full rounded-full bg-emerald-500 transition-all" style={{width:`${progress}%`}} /></div><div className="mt-3 grid grid-cols-2 gap-3"><div><p className="text-[11px] text-stone-500">Виплачено</p><p className="mt-1 text-sm font-bold text-emerald-700">{formatCurrency(paid)}</p></div><div className="text-right"><p className="text-[11px] text-stone-500">Залишок</p><p className="mt-1 text-sm font-extrabold text-orange-700">{formatCurrency(remaining)}</p></div></div></div>
                <div className="mt-auto pt-4">{renderPayrollActions(employee)}</div>
              </article>;
            })}
          </div> : <div className="overflow-x-auto max-w-full custom-scrollbar touch-pan-x">
            <table className="w-full text-left border-collapse min-w-[1180px]">
              <thead>
                <tr className="bg-stone-100/70 text-stone-700 text-xs uppercase tracking-wider font-semibold border-b border-stone-200">
                  <th className="py-3 px-4">Працівник</th>
                  <th className="py-3 px-3">Посада</th>
                  <th className="py-3 px-3 text-right">Базовий оклад</th>
                  <th className="py-3 px-3 text-right">Премія / Надбавка</th>
                  <th className="py-3 px-3 text-right">Утримання</th>
                  <th className="py-3 px-3 text-right">Нараховано</th>
                  <th className="py-3 px-3 text-right">Виплачено</th>
                  <th className="py-3 px-3 text-right">Залишок</th>
                  <th className="py-3 px-4 text-center">Статус</th>
                  <th className="py-3 px-4 text-right">Дії</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-stone-200/70 text-sm">
                {activeEmployees.length === 0 ? (
                  <tr>
                    <td
                      colSpan={10}
                      className="py-8 text-center text-stone-400 text-sm"
                    >
                      Немає зареєстрованих працівників. Натисніть «Додати працівника».
                    </td>
                  </tr>
                ) : (
                  activeEmployees.map((emp) => {
                    const payment = getPaymentForEmployee(emp.id);
                    const isPaid = payment.status === 'paid';
                    const noveltySalary = hasNoveltySalary(emp.position);

                    return (
                      <tr
                        key={emp.id}
                        className={`hover:bg-orange-50/40 transition-colors ${
                          isPaid ? 'bg-emerald-50/20' : ''
                        }`}
                      >
                        <td className="py-3 px-4 font-medium text-stone-900">
                          <div className="flex items-center gap-2.5">
                            <div className="w-8 h-8 rounded-full bg-orange-100 text-orange-700 flex items-center justify-center font-bold text-xs">
                              {emp.fullName.slice(0, 2).toUpperCase()}
                            </div>
                            <div>
                              <div className="font-semibold">{emp.fullName}</div>
                              <div className="text-xs text-stone-500 flex items-center gap-1">
                                <Phone className="w-3 h-3 text-stone-400" />
                                {emp.phone || '—'}
                              </div>
                            </div>
                          </div>
                        </td>

                        <td className="py-3 px-3 text-xs text-stone-700">
                          <span className="inline-block px-2.5 py-1 bg-stone-100 text-stone-800 rounded-lg font-medium">
                            {emp.position}
                          </span>
                        </td>

                        <td className="py-3 px-3 text-right text-stone-700 font-mono text-xs">
                          {noveltySalary
                            ? NOVELTY_SALARY_LABEL
                            : formatCurrency(payment.baseSalary)}
                        </td>

                        <td className="py-3 px-3 text-right font-mono text-xs">
                          {payment.bonus > 0 ? (
                            <span className="text-emerald-600 font-semibold">
                              +{formatCurrency(payment.bonus)}
                            </span>
                          ) : (
                            <span className="text-stone-400">0 грн</span>
                          )}
                        </td>

                        <td className="py-3 px-3 text-right font-mono text-xs">
                          {payment.deductions > 0 ? (
                            <span className="text-rose-600">
                              -{formatCurrency(payment.deductions)}
                            </span>
                          ) : (
                            <span className="text-stone-400">0 грн</span>
                          )}
                        </td>

                        <td className="py-3 px-3 text-right font-bold text-stone-900 font-mono">
                          {noveltySalary
                            ? NOVELTY_SALARY_LABEL
                            : formatCurrency(payment.finalAmount)}
                        </td>

                        <td className="py-3 px-3 text-right font-mono text-sm font-semibold text-emerald-700">{formatCurrency(payment.paidAmount ?? 0)}</td>
                        <td className="py-3 px-3 text-right font-mono text-sm font-bold text-orange-700">{formatCurrency(payment.remainingAmount ?? payment.finalAmount)}</td>
                        <td className="py-3 px-4 text-center">{renderPayrollStatus(payment)}</td>
                        <td className="min-w-[270px] py-3 px-4">{renderPayrollActions(emp)}</td>
                      </tr>
                    );
                  })
                )}
              </tbody>
              <tfoot>
                <tr className="bg-stone-50 font-semibold text-stone-900 border-t-2 border-stone-300">
                  <td colSpan={2} className="py-3.5 px-4 text-sm font-bold">
                    РАЗОМ ПО ВІДОМОСТІ:
                  </td>
                  <td className="py-3.5 px-3 text-right font-mono text-xs">
                    {formatCurrency(payrollStats.totalBase)}
                  </td>
                  <td className="py-3.5 px-3 text-right font-mono text-xs text-emerald-600">
                    +{formatCurrency(payrollStats.totalBonuses)}
                  </td>
                  <td className="py-3.5 px-3 text-right font-mono text-xs text-rose-600">
                    -{formatCurrency(payrollStats.totalDeductions)}
                  </td>
                  <td className="py-3.5 px-3 text-right font-mono text-sm font-bold text-orange-600">
                    {formatCurrency(payrollStats.totalToPay)}
                  </td>
                  <td className="py-3.5 px-3 text-right font-mono text-xs text-emerald-700">{formatCurrency(payrollStats.totalPaid)}</td>
                  <td className="py-3.5 px-3 text-right font-mono text-xs text-orange-700">{formatCurrency(payrollStats.pendingAmount)}</td>
                  <td colSpan={2} className="py-3.5 px-4 text-center text-xs text-stone-500">
                    Виплачено: {formatCurrency(payrollStats.totalPaid)} (
                    {Math.round(
                      (payrollStats.totalPaid / (payrollStats.totalToPay || 1)) * 100
                    )}
                    %)
                  </td>
                </tr>
              </tfoot>
            </table>
          </div>}
        </div>
      )}

      {/* VIEW 2: EMPLOYEES DIRECTORY / STAFF CARDS */}
      {subTab === 'employees' && (
        <div className="space-y-4">
          {/* Filters Bar */}
          <div className="bg-white rounded-2xl p-4 border border-stone-200/80 shadow-sm flex flex-col sm:flex-row items-center justify-between gap-3">
            <div className="relative w-full sm:w-80">
              <Search className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-stone-400" />
              <input
                id="search-employee-input"
                type="text"
                placeholder="Пошук працівника за ПІБ чи посадою..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-9 pr-3.5 py-2 text-xs rounded-xl border border-stone-200 focus:outline-none focus:ring-2 focus:ring-orange-500/30 focus:border-orange-500 bg-stone-50/50"
              />
            </div>

            <div className="flex items-center gap-2 w-full sm:w-auto">
              <span className="text-xs text-stone-500 font-medium">Посада:</span>
              <select
                id="filter-employee-position"
                value={positionFilter}
                onChange={(e) => setPositionFilter(e.target.value)}
                className="text-xs rounded-xl border border-stone-200 py-2 px-3 focus:outline-none focus:ring-2 focus:ring-orange-500/30 focus:border-orange-500 bg-white"
              >
                <option value="all">Усі посади ({employees.length})</option>
                {COMMON_POSITIONS.map((pos) => (
                  <option key={pos} value={pos}>
                    {pos}
                  </option>
                ))}
              </select>
            </div>
          </div>

          {/* Employee Cards Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {filteredEmployees.map((emp) => (
              <div
                key={emp.id}
                className={`bg-white rounded-2xl p-5 border transition-all ${
                  emp.active
                    ? 'border-stone-200/80 hover:border-orange-300 hover:shadow-md'
                    : 'border-stone-200 opacity-60 bg-stone-50'
                }`}
              >
                <div className="flex items-start justify-between gap-2">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-2xl bg-gradient-to-br from-orange-400 to-amber-500 text-white font-bold flex items-center justify-center text-sm shadow-sm">
                      {emp.fullName.slice(0, 2).toUpperCase()}
                    </div>
                    <div>
                      <h4 className="font-bold text-stone-900 text-sm leading-tight">
                        {emp.fullName}
                      </h4>
                      <span className="inline-block mt-0.5 px-2 py-0.5 bg-orange-50 text-orange-700 text-xs font-medium rounded-md border border-orange-100">
                        {emp.position}
                      </span>
                    </div>
                  </div>

                  <div className="flex items-center gap-1">
                    <button
                      id={`edit-emp-card-${emp.id}`}
                      onClick={() => openEditEmployeeModal(emp)}
                      className="p-1.5 text-stone-400 hover:text-orange-600 hover:bg-orange-50 rounded-lg transition-colors cursor-pointer"
                      title="Редагувати картку працівника"
                    >
                      <Edit2 className="w-3.5 h-3.5" />
                    </button>
                    <button
                      id={`delete-emp-card-${emp.id}`}
                      onClick={() => {
                        if (
                          confirm(
                            `Видалити співробітника «${emp.fullName}» зі списку?`
                          )
                        ) {
                          onDeleteEmployee(emp.id);
                        }
                      }}
                      className="p-1.5 text-stone-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition-colors cursor-pointer"
                      title="Видалити"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>

                <div className="mt-4 pt-3 border-t border-stone-100 space-y-2 text-xs">
                  <div className="flex items-center justify-between text-stone-600">
                    <span className="flex items-center gap-1.5 text-stone-400">
                      <Banknote className="w-3.5 h-3.5 text-orange-500" />
                      Базовий оклад:
                    </span>
                    <span className="font-bold text-stone-800 text-sm font-mono">
                      {hasNoveltySalary(emp.position)
                        ? NOVELTY_SALARY_LABEL
                        : formatCurrency(emp.baseSalary)}
                    </span>
                  </div>

                  <div className="flex items-center justify-between text-stone-600">
                    <span className="flex items-center gap-1.5 text-stone-400">
                      <Phone className="w-3.5 h-3.5 text-stone-400" />
                      Телефон:
                    </span>
                    <span className="font-medium text-stone-700">
                      {emp.phone || 'Не вказано'}
                    </span>
                  </div>

                  {emp.startDate && (
                    <div className="flex items-center justify-between text-stone-600">
                      <span className="flex items-center gap-1.5 text-stone-400">
                        <Calendar className="w-3.5 h-3.5 text-stone-400" />
                        Працює з:
                      </span>
                      <span className="text-stone-700">{emp.startDate}</span>
                    </div>
                  )}

                  {emp.notes && (
                    <div className="pt-1 text-stone-500 italic bg-stone-50 p-2 rounded-lg text-[11px]">
                      {emp.notes}
                    </div>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* MODAL: ADD / EDIT EMPLOYEE */}
      {showAddModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-xs">
          <div className="bg-white rounded-3xl max-w-md w-full p-6 shadow-2xl border border-orange-100">
            <div className="flex items-center justify-between border-b border-stone-100 pb-3 mb-4">
              <h3 className="text-base font-bold text-stone-900 flex items-center gap-2">
                <Users className="w-5 h-5 text-orange-600" />
                {editingEmployee
                  ? 'Редагувати дані працівника'
                  : 'Додати нового працівника'}
              </h3>
              <button
                onClick={() => setShowAddModal(false)}
                className="text-stone-400 hover:text-stone-600 p-1 rounded-lg text-lg leading-none cursor-pointer"
              >
                &times;
              </button>
            </div>

            <form onSubmit={handleSaveEmployee} className="space-y-3.5">
              <div>
                <label className="block text-xs font-semibold text-stone-700 mb-1">
                  ПІБ працівника *
                </label>
                <input
                  type="text"
                  required
                  placeholder="напр., Ковальчук Тетяна Володимирівна"
                  value={formFullName}
                  onChange={(e) => setFormFullName(e.target.value)}
                  className="w-full text-xs px-3 py-2 rounded-xl border border-stone-200 focus:outline-none focus:ring-2 focus:ring-orange-500/30 focus:border-orange-500"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-stone-700 mb-1">
                  Посада *
                </label>
                <select
                  value={formPosition}
                  onChange={(e) => {
                    const position = e.target.value;
                    setFormPosition(position);
                    if (hasNoveltySalary(position)) setFormBaseSalary(0);
                  }}
                  className="w-full text-xs px-3 py-2 rounded-xl border border-stone-200 focus:outline-none focus:ring-2 focus:ring-orange-500/30 focus:border-orange-500 bg-white"
                >
                  {COMMON_POSITIONS.map((pos) => (
                    <option key={pos} value={pos}>
                      {pos}
                    </option>
                  ))}
                  <option value="custom">Інша посада...</option>
                </select>
                {formPosition === 'custom' && (
                  <input
                    type="text"
                    required
                    placeholder="Введіть точну назву посади"
                    value={formCustomPosition}
                    onChange={(e) => setFormCustomPosition(e.target.value)}
                    className="w-full mt-2 text-xs px-3 py-2 rounded-xl border border-stone-200 focus:outline-none focus:ring-2 focus:ring-orange-500/30 focus:border-orange-500"
                  />
                )}
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-stone-700 mb-1">
                    Базовий оклад (грн) *
                  </label>
                  <input
                    type="number"
                    min="0"
                    step="0.01"
                    required
                    disabled={hasNoveltySalary(
                      formPosition === 'custom' ? formCustomPosition : formPosition,
                    )}
                    value={formBaseSalary}
                    onChange={(e) => setFormBaseSalary(Number(e.target.value))}
                    className="w-full text-xs px-3 py-2 rounded-xl border border-stone-200 focus:outline-none focus:ring-2 focus:ring-orange-500/30 focus:border-orange-500 font-mono disabled:bg-amber-50 disabled:text-amber-800"
                  />
                  {hasNoveltySalary(
                    formPosition === 'custom' ? formCustomPosition : formPosition,
                  ) && (
                    <p className="mt-1 text-[11px] font-semibold text-amber-700">
                      {NOVELTY_SALARY_LABEL} · фактично 0 грн
                    </p>
                  )}
                </div>

                <div>
                  <label className="block text-xs font-semibold text-stone-700 mb-1">
                    Контактний телефон
                  </label>
                  <input
                    type="tel"
                    placeholder="+38 (0__) ___-__-__"
                    value={formPhone}
                    onChange={(e) => setFormPhone(e.target.value)}
                    className="w-full text-xs px-3 py-2 rounded-xl border border-stone-200 focus:outline-none focus:ring-2 focus:ring-orange-500/30 focus:border-orange-500"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-stone-700 mb-1">
                  Дата прийняття на роботу
                </label>
                <input
                  type="date"
                  value={formStartDate}
                  onChange={(e) => setFormStartDate(e.target.value)}
                  className="w-full text-xs px-3 py-2 rounded-xl border border-stone-200 focus:outline-none focus:ring-2 focus:ring-orange-500/30 focus:border-orange-500"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-stone-700 mb-1">
                  Примітки / Додаткова інформація
                </label>
                <textarea
                  rows={2}
                  placeholder="Стаж, додаткові гуртки, розклад роботи..."
                  value={formNotes}
                  onChange={(e) => setFormNotes(e.target.value)}
                  className="w-full text-xs px-3 py-2 rounded-xl border border-stone-200 focus:outline-none focus:ring-2 focus:ring-orange-500/30 focus:border-orange-500"
                />
              </div>

              <div className="flex justify-end gap-2.5 pt-3 border-t border-stone-100">
                <button
                  type="button"
                  onClick={() => setShowAddModal(false)}
                  className="px-4 py-2 text-xs font-medium text-stone-600 hover:bg-stone-100 rounded-xl transition-colors cursor-pointer"
                >
                  Скасувати
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 text-xs font-semibold text-white bg-orange-600 hover:bg-orange-700 rounded-xl shadow-sm transition-all cursor-pointer"
                >
                  {editingEmployee ? 'Зберегти зміни' : 'Створити картку'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL: EDIT SALARY DETAILS (BONUS, DEDUCTIONS, PAYMENT DATE) */}
      {editingPayment && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-xs">
          <div className="bg-white rounded-3xl max-w-md w-full p-6 shadow-2xl border border-orange-100">
            <div className="flex items-center justify-between border-b border-stone-100 pb-3 mb-4">
              <div>
                <h3 className="text-base font-bold text-stone-900 flex items-center gap-2">
                  <Banknote className="w-5 h-5 text-orange-600" />
                  Нарахування заробітної плати
                </h3>
                <p className="text-xs text-stone-500 mt-0.5">
                  {
                    employees.find((e) => e.id === editingPayment.employeeId)
                      ?.fullName
                  }{' '}
                  — {MONTH_NAMES_UK[selectedMonth - 1]} {selectedYear}
                </p>
              </div>
              <button
                onClick={() => setEditingPayment(null)}
                className="text-stone-400 hover:text-stone-600 p-1 rounded-lg text-lg leading-none cursor-pointer"
              >
                &times;
              </button>
            </div>

            <form onSubmit={handleSavePayment} className="space-y-3.5">
              <div className="p-3 bg-stone-50 rounded-xl border border-stone-200/70 flex justify-between items-center text-xs">
                <span className="text-stone-600 font-medium">Базовий оклад:</span>
                <span className="font-bold text-stone-900 font-mono text-sm">
                  {hasNoveltySalary(
                    employees.find((e) => e.id === editingPayment.employeeId)?.position,
                  )
                    ? NOVELTY_SALARY_LABEL
                    : formatCurrency(editingPayment.baseSalary)}
                </span>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-stone-700 mb-1">
                    Премія / Надбавка (грн)
                  </label>
                  <input
                    type="number"
                    min="0"
                    step="0.01"
                    value={payBonus}
                    disabled={hasNoveltySalary(
                      employees.find((e) => e.id === editingPayment.employeeId)?.position,
                    )}
                    onFocus={() => { if (Number(payBonus) === 0) setPayBonus(''); }}
                    onBlur={() => { if (payBonus === '') setPayBonus('0'); }}
                    onChange={(e) => setPayBonus(e.target.value)}
                    className="w-full text-xs px-3 py-2 rounded-xl border border-stone-200 focus:outline-none focus:ring-2 focus:ring-orange-500/30 focus:border-orange-500 font-mono disabled:bg-stone-100"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-stone-700 mb-1">
                    Утримання (грн)
                  </label>
                  <input
                    type="number"
                    min="0"
                    step="0.01"
                    value={payDeductions}
                    disabled={hasNoveltySalary(
                      employees.find((e) => e.id === editingPayment.employeeId)?.position,
                    )}
                    onFocus={() => { if (Number(payDeductions) === 0) setPayDeductions(''); }}
                    onBlur={() => { if (payDeductions === '') setPayDeductions('0'); }}
                    onChange={(e) => setPayDeductions(e.target.value)}
                    className="w-full text-xs px-3 py-2 rounded-xl border border-stone-200 focus:outline-none focus:ring-2 focus:ring-orange-500/30 focus:border-orange-500 font-mono disabled:bg-stone-100"
                  />
                </div>
              </div>

              {/* Calculated total */}
              <div className="p-3 bg-orange-50/70 border border-orange-200 rounded-xl flex justify-between items-center text-xs">
                <span className="font-bold text-orange-950">
                  Усього нараховано:
                </span>
                <span className="font-extrabold text-orange-700 font-mono text-base">
                  {hasNoveltySalary(
                    employees.find((e) => e.id === editingPayment.employeeId)?.position,
                  )
                    ? NOVELTY_SALARY_LABEL
                    : formatCurrency(
                        Math.max(
                          0,
                          editingPayment.baseSalary + Number(payBonus) - Number(payDeductions),
                        ),
                      )}
                </span>
              </div>

              <p className="rounded-xl bg-stone-50 p-3 text-xs leading-relaxed text-stone-600">Аванс і зарплату додавайте окремими записами через кнопку «Виплати». Вони зменшують залишок до виплати. Нарахування не можна зменшити нижче вже виплаченої суми.</p>

              <div>
                <label className="block text-xs font-semibold text-stone-700 mb-1">
                  Коментар / Підстава для премії
                </label>
                <input
                  type="text"
                  placeholder="За гурткову роботу, чергування тощо"
                  value={payNotes}
                  onChange={(e) => setPayNotes(e.target.value)}
                  className="w-full text-xs px-3 py-2 rounded-xl border border-stone-200 focus:outline-none focus:ring-2 focus:ring-orange-500/30 focus:border-orange-500"
                />
              </div>

              <div className="flex justify-end gap-2.5 pt-3 border-t border-stone-100">
                <button
                  type="button"
                  onClick={() => setEditingPayment(null)}
                  className="px-4 py-2 text-xs font-medium text-stone-600 hover:bg-stone-100 rounded-xl transition-colors cursor-pointer"
                >
                  Скасувати
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 text-xs font-semibold text-white bg-orange-600 hover:bg-orange-700 rounded-xl shadow-sm transition-all cursor-pointer"
                >
                  Зберегти нарахування
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
      {payoutEmployeeId && employees.find(employee=>employee.id===payoutEmployeeId) && <PayrollPaymentsModal
        key={`${payoutEmployeeId}-${selectedYear}-${selectedMonth}`} employee={employees.find(employee=>employee.id===payoutEmployeeId)!}
        payroll={getPaymentForEmployee(payoutEmployeeId)} readOnly={readOnly} onClose={()=>setPayoutEmployeeId(null)}
        onAdd={input=>onAddPayrollPayment(getPaymentForEmployee(payoutEmployeeId),input)} />}
    </div>
  );
};

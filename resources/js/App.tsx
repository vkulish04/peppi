/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useEffect, useMemo, useState } from 'react';
import { Header } from './components/Header';
import { MonthlyJournal } from './components/MonthlyJournal';
import { ChildrenManager } from './components/ChildrenManager';
import { ActivitiesManager } from './components/ActivitiesManager';
import { EmployeesManager } from './components/EmployeesManager';
import { ExpensesManager } from './components/ExpensesManager';
import { SummaryReports } from './components/SummaryReports';
import { ReceiptModal } from './components/ReceiptModal';
import { ChildAccountModal } from './components/ChildAccountModal';
import { PaymentModal } from './components/PaymentModal';
import { LoginPage } from './components/LoginPage';
import { SystemSettings } from './components/SystemSettings';
import { MonthClosingPanel } from './components/MonthClosingPanel';
import { JournalCarryForwardPanel } from './components/JournalCarryForwardPanel';
import {
  Child,
  Activity,
  MonthlyRecord,
  Employee,
  SalaryPayment,
  PayrollDisbursementInput,
  Expense,
  AuthUser,
  Group,
  FinancialReport,
  BillSummary,
  ChildAccount,
  PaymentInput,
  PaymentRecord,
  KindergartenInfo,
  FinanceOption,
} from './types';
import {
  MONTH_NAMES_UK,
  KINDERGARTEN_INFO,
} from './data/initialData';
import { calculateChildTotal, exportJournalToCSV, isSubscriptionActivity } from './utils/calculations';
import {
  ApiError,
  activitiesApi,
  authApi,
  childrenApi,
  getToken,
  groupsApi,
  journalApi,
  employeesApi,
  payrollApi,
  expensesApi,
  reportsApi,
  billsApi,
  paymentsApi,
  settingsApi,
  financeOptionsApi,
  monthClosureApi,
  type MonthClosureStatus,
} from './api/client';

export default function App() {
  const now = new Date();
  const [currentTab, setCurrentTab] = useState<
    'journal' | 'children' | 'activities' | 'employees' | 'expenses' | 'reports' | 'settings' | 'carry-forward'
  >('journal');
  const [selectedYear, setSelectedYear] = useState<number>(now.getFullYear());
  const [selectedMonth, setSelectedMonth] = useState<number>(now.getMonth() + 1);
  const [monthClosure, setMonthClosure] = useState<MonthClosureStatus | null>(null);

  const [authLoading, setAuthLoading] = useState(true);
  const [dataLoading, setDataLoading] = useState(false);
  const [currentUser, setCurrentUser] = useState<AuthUser | null>(null);
  const [groups, setGroups] = useState<Group[]>([]);
  const [childrenList, setChildrenList] = useState<Child[]>([]);
  const [activities, setActivities] = useState<Activity[]>([]);
  const [kindergartenInfo, setKindergartenInfo] = useState<KindergartenInfo>(KINDERGARTEN_INFO);
  const [financeOptions, setFinanceOptions] = useState<FinanceOption[]>([]);
  const [records, setRecords] = useState<MonthlyRecord[]>([]);

  const [employees, setEmployees] = useState<Employee[]>([]);
  const [salaryPayments, setSalaryPayments] = useState<SalaryPayment[]>([]);
  const [expenses, setExpenses] = useState<Expense[]>([]);
  const [financialReport, setFinancialReport] = useState<FinancialReport | null>(null);

  const [activeReceiptChild, setActiveReceiptChild] = useState<Child | null>(null);
  const [activeAccountChild, setActiveAccountChild] = useState<Child | null>(null);
  const [childAccount, setChildAccount] = useState<ChildAccount | null>(null);
  const [childAccountLoading, setChildAccountLoading] = useState(false);
  const [paymentDialog, setPaymentDialog] = useState<{ bill: BillSummary; payment?: PaymentRecord } | null>(null);
  const groupNames = useMemo(() => groups.filter((g) => g.active).map((g) => g.name), [groups]);
  const canManageFinance = currentUser?.role === 'director' || currentUser?.role === 'accountant';


  useEffect(() => {
    if (currentUser && !canManageFinance && ['employees', 'expenses', 'reports', 'settings', 'carry-forward'].includes(currentTab)) {
      setCurrentTab('journal');
    }
  }, [currentUser, canManageFinance, currentTab]);

  useEffect(() => {
    void settingsApi.get().then(setKindergartenInfo).catch(() => {});
  }, []);

  useEffect(() => {
    let cancelled = false;
    const restoreSession = async () => {
      if (!getToken()) {
        setAuthLoading(false);
        return;
      }
      try {
        const user = await authApi.me();
        if (!cancelled) setCurrentUser(user);
      } catch {
        if (!cancelled) setCurrentUser(null);
      } finally {
        if (!cancelled) setAuthLoading(false);
      }
    };
    void restoreSession();
    return () => {
      cancelled = true;
    };
  }, []);

  const showError = (error: unknown) => {
    if (error instanceof ApiError && error.status === 401) {
      setCurrentUser(null);
      return;
    }
    const message = error instanceof Error ? error.message : 'Сталася помилка під час роботи з сервером.';
    window.alert(message);
  };

  const loadBaseData = async () => {
    const [loadedGroups, loadedChildren, loadedActivities] = await Promise.all([
      groupsApi.list(),
      childrenApi.list(),
      activitiesApi.list(selectedYear, selectedMonth),
    ]);
    setGroups(loadedGroups);
    setChildrenList(loadedChildren);
    setActivities(loadedActivities);
    if (canManageFinance) setFinanceOptions(await financeOptionsApi.list());
  };

  const refreshJournal = async (): Promise<MonthlyRecord[]> => {
    const loaded = await journalApi.load(selectedYear, selectedMonth);
    setRecords(loaded);
    return loaded;
  };

  const refreshFinanceData = async () => {
    if (!canManageFinance) {
      setEmployees([]);
      setSalaryPayments([]);
      setExpenses([]);
      setFinancialReport(null);
      return;
    }

    const [loadedEmployees, loadedExpenses] = await Promise.all([
      employeesApi.list(),
      expensesApi.list(selectedYear, selectedMonth),
    ]);
    // Спочатку формуємо payroll snapshot, потім серверний звіт на його основі.
    const loadedPayrolls = await payrollApi.list(selectedYear, selectedMonth);
    const loadedReport = await reportsApi.monthly(selectedYear, selectedMonth);

    setEmployees(loadedEmployees);
    setSalaryPayments(loadedPayrolls);
    setExpenses(loadedExpenses);
    setFinancialReport(loadedReport);
  };

  const refreshFinancialReport = async () => {
    if (!canManageFinance) return;
    setFinancialReport(await reportsApi.monthly(selectedYear, selectedMonth));
  };

  useEffect(() => {
    if (!currentUser) return;
    let cancelled = false;
    setDataLoading(true);

    const load = async () => {
      await loadBaseData();
      const loadedRecords = await journalApi.load(selectedYear, selectedMonth);
      if (!cancelled) setRecords(loadedRecords);
      if (currentUser.role === 'director' || currentUser.role === 'accountant') {
        await refreshFinanceData();
      }
    };

    load()
      .catch((error) => {
        if (!cancelled) showError(error);
      })
      .finally(() => {
        if (!cancelled) setDataLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, [currentUser]);

  useEffect(() => {
    if (!currentUser) return;
    setDataLoading(true);
    Promise.all([
      refreshJournal(),
      activitiesApi.list(selectedYear, selectedMonth).then(setActivities),
      canManageFinance ? refreshFinanceData() : Promise.resolve(),
    ])
      .catch(showError)
      .finally(() => setDataLoading(false));
  }, [selectedYear, selectedMonth]);

  useEffect(() => {
    setMonthClosure(null);
    if (!currentUser) return;
    let active = true;
    monthClosureApi.get(selectedYear, selectedMonth)
      .then((status) => { if (active) setMonthClosure(status); })
      .catch((error) => { if (active) showError(error); });
    return () => { active = false; };
  }, [currentUser, selectedYear, selectedMonth]);

  const handleLogin = async (email: string, password: string, rememberMe: boolean) => {
    const user = await authApi.login(email, password, rememberMe);
    setCurrentUser(user);
  };

  const handleLogout = async () => {
    try {
      await authApi.logout();
    } finally {
      setCurrentUser(null);
      setCurrentTab('journal');
      setGroups([]);
      setChildrenList([]);
      setActivities([]);
      setFinanceOptions([]);
      setRecords([]);
      setEmployees([]);
      setSalaryPayments([]);
      setExpenses([]);
      setFinancialReport(null);
    }
  };

  const makeBaseRecord = (child: Child): MonthlyRecord => ({
    childId: child.id,
    year: selectedYear,
    month: selectedMonth,
    checkedActivities: {},
    dailyFoodDeductionRate: kindergartenInfo.dailyFoodRate,
    customDiscount: child.discountPercent ?? 0,
    isPaid: false,
  });

  const saveRecord = async (childId: string, mutate: (record: MonthlyRecord) => MonthlyRecord) => {
    const child = childrenList.find((c) => c.id === childId);
    if (!child) return;
    const existing = records.find(
      (r) => r.childId === childId && r.year === selectedYear && r.month === selectedMonth,
    );
    const next = mutate(existing ? { ...existing } : makeBaseRecord(child));
    await journalApi.saveBill(child, next, activities, kindergartenInfo.dailyFoodRate);
  };

  const handleToggleActivity = async (childId: string, activityId: string) => {
    try {
      const record = records.find((r) => r.childId === childId && r.year === selectedYear && r.month === selectedMonth);
      await journalApi.setActivity(childId, activityId, selectedYear, selectedMonth, !Boolean(record?.checkedActivities?.[activityId]));
      await refreshJournal();
      await refreshFinancialReport();
    } catch (error) {
      showError(error);
    }
  };

  const handleActivityQuantity = async (childId: string, activityId: string, quantity: number) => {
    try {
      await journalApi.setActivity(childId, activityId, selectedYear, selectedMonth, quantity > 0, quantity);
      await refreshJournal();
      await refreshFinancialReport();
    } catch (error) {
      showError(error);
      throw error;
    }
  };

  const handleUpdateGroup = async (group: Group) => {
    await groupsApi.update(group);
    const [updatedGroups, updatedChildren] = await Promise.all([
      groupsApi.list(),
      childrenApi.list(),
    ]);
    setGroups(updatedGroups);
    setChildrenList(updatedChildren);
  };

  const handleAddGroup = async (name: string, sortOrder: number) => {
    await groupsApi.create(name, sortOrder);
    setGroups(await groupsApi.list());
  };

  const handleDeleteGroup = async (id: string) => {
    await groupsApi.remove(id);
    setGroups(await groupsApi.list());
  };

  const handleBatchCheckActivity = async (activityId: string, checkAll: boolean) => {
    try {
      await Promise.all(
        childrenList
          .filter((child) => child.active)
          .map((child) => journalApi.setActivity(child.id, activityId, selectedYear, selectedMonth, checkAll)),
      );
      await refreshJournal();
      await refreshFinancialReport();
    } catch (error) {
      showError(error);
    }
  };

  const handleTogglePaid = async (childId: string) => {
    try {
      let record = records.find(
        (r) => r.childId === childId && r.year === selectedYear && r.month === selectedMonth,
      );
      const child = childrenList.find((c) => c.id === childId);
      if (!child) return;

      if (!record?.billId) {
        await journalApi.saveBill(child, record ?? makeBaseRecord(child), activities, kindergartenInfo.dailyFoodRate);
        const freshRecords = await refreshJournal();
        record = freshRecords.find((r) => r.childId === childId);
      }
      if (!record?.billId) return;

      if (record.isPaid) {
        const confirmed = window.confirm('Скасувати всі зареєстровані платежі за цей місяць?');
        if (!confirmed) return;
        await Promise.all((record.paymentIds ?? []).map((id) => journalApi.deletePayment(id)));
      } else {
        const localTotal = calculateChildTotal(child, record, activities).total;
        const debt = record.debt ?? Math.max(0, localTotal - (record.paidAmount ?? 0));
        if (debt > 0) await journalApi.addPayment(record.billId, debt);
      }
      await refreshJournal();
      await refreshFinancialReport();
    } catch (error) {
      showError(error);
    }
  };

  const handleUpdateAbsenceRecord = async (
    childId: string,
    data: {
      sickLeaveDays: number;
      absenceDays: number;
      dailyFoodDeductionRate: number;
      customDeduction: number;
      absenceNote: string;
    },
  ) => {
    await saveRecord(childId, (record) => ({ ...record, ...data }));
    await refreshJournal();
    await refreshFinancialReport();
  };

  const loadChildAccount = async (child: Child) => {
    setActiveAccountChild(child);
    setChildAccountLoading(true);
    try {
      setChildAccount(await childrenApi.account(child.id));
    } catch (error) {
      showError(error);
      setChildAccount(null);
    } finally {
      setChildAccountLoading(false);
    }
  };

  const refreshActiveChildAccount = async () => {
    if (!activeAccountChild) return;
    setChildAccount(await childrenApi.account(activeAccountChild.id));
  };

  const ensureCurrentBill = async (childId: string): Promise<BillSummary | null> => {
    const child = childrenList.find((c) => c.id === childId);
    if (!child) return null;
    let record = records.find((r) => r.childId === childId && r.year === selectedYear && r.month === selectedMonth);
    if (!record?.billId) {
      await journalApi.saveBill(child, record ?? makeBaseRecord(child), activities, kindergartenInfo.dailyFoodRate);
      const fresh = await refreshJournal();
      record = fresh.find((r) => r.childId === childId && r.year === selectedYear && r.month === selectedMonth);
    }
    if (!record?.billId) return null;
    return billsApi.get(record.billId);
  };

  const handleOpenPaymentForChild = async (childId: string) => {
    try {
      const bill = await ensureCurrentBill(childId);
      if (!bill) return;
      if (bill.debt <= 0) {
        const child = childrenList.find((c) => c.id === childId);
        if (child) await loadChildAccount(child);
        return;
      }
      setPaymentDialog({ bill });
    } catch (error) {
      showError(error);
    }
  };

  const handleSavePayment = async (input: PaymentInput) => {
    if (!paymentDialog) return;
    if (paymentDialog.payment) {
      await paymentsApi.update(paymentDialog.payment.id, input);
    } else {
      await paymentsApi.create(paymentDialog.bill.id, input);
    }
    setPaymentDialog(null);
    await refreshJournal();
    await Promise.all([refreshFinancialReport(), refreshActiveChildAccount()]);
  };

  const handleDeletePayment = async (payment: PaymentRecord) => {
    try {
      await paymentsApi.remove(payment.id);
      await refreshJournal();
      await Promise.all([refreshFinancialReport(), refreshActiveChildAccount()]);
    } catch (error) {
      showError(error);
    }
  };

  const handleDownloadReceiptPdf = async (bill: BillSummary) => {
    try {
      await billsApi.downloadReceipt(
        bill.id,
        `Квитанція_${bill.year}_${String(bill.month).padStart(2, '0')}_${activeAccountChild?.fullName ?? 'дитина'}.pdf`,
      );
    } catch (error) {
      showError(error);
    }
  };

  const handleDownloadCurrentReceiptPdf = async (child: Child) => {
    try {
      const bill = await ensureCurrentBill(child.id);
      if (!bill) return;
      await billsApi.downloadReceipt(
        bill.id,
        `Квитанція_${bill.year}_${String(bill.month).padStart(2, '0')}_${child.fullName}.pdf`,
      );
    } catch (error) {
      showError(error);
    }
  };

  const resolveGroupId = (child: Omit<Child, 'id'> | Child): string => {
    const byId = 'groupId' in child ? child.groupId : undefined;
    const group = groups.find((g) => g.name === child.group) ?? groups.find((g) => g.id === byId);
    if (!group) throw new Error('Не вдалося визначити групу дитини. Оновіть список груп.');
    return group.id;
  };

  const handleAddChild = async (newChildData: Omit<Child, 'id'>) => {
    try {
      const created = await childrenApi.create(newChildData, resolveGroupId(newChildData));
      setChildrenList((prev) => [created, ...prev]);
      await refreshJournal();
    } catch (error) {
      showError(error);
    }
  };

  const handleUpdateChild = async (updatedChild: Child) => {
    try {
      const saved = await childrenApi.update(updatedChild, resolveGroupId(updatedChild));
      setChildrenList((prev) => prev.map((c) => (c.id === saved.id ? saved : c)));
    } catch (error) {
      showError(error);
    }
  };

  const handleDeleteChild = async (childId: string) => {
    if (!window.confirm('Деактивувати/видалити дитину зі списку? Історія нарахувань залишиться в базі.')) return;
    try {
      await childrenApi.remove(childId);
      setChildrenList((prev) => prev.filter((c) => c.id !== childId));
      setRecords((prev) => prev.filter((r) => r.childId !== childId));
    } catch (error) {
      showError(error);
    }
  };

  const handleAddActivity = async (newActData: Omit<Activity, 'id'>) => {
    try {
      const created = await activitiesApi.create(newActData);
      setActivities((prev) => [...prev, created]);
    } catch (error) {
      showError(error);
    }
  };

  const handleUpdateActivity = async (updatedAct: Activity) => {
    try {
      const saved = await activitiesApi.update(updatedAct);
      setActivities((prev) => prev.map((a) => (a.id === saved.id ? saved : a)));
    } catch (error) {
      showError(error);
    }
  };

  const handleDeleteActivity = async (actId: string) => {
    if (!window.confirm('Вимкнути цю послугу? Старі нарахування збережуть її назву та ціну.')) return;
    try {
      await activitiesApi.remove(actId);
      setActivities((prev) => prev.filter((a) => a.id !== actId));
    } catch (error) {
      showError(error);
    }
  };

  // Employees & payroll — Laravel / MySQL.
  const handleAddEmployee = async (newEmpData: Omit<Employee, 'id'>) => {
    try {
      await employeesApi.create(newEmpData);
      await refreshFinanceData();
    } catch (error) {
      showError(error);
    }
  };

  const handleUpdateEmployee = async (updatedEmp: Employee) => {
    try {
      await employeesApi.update(updatedEmp);
      await refreshFinanceData();
    } catch (error) {
      showError(error);
    }
  };

  const handleDeleteEmployee = async (empId: string) => {
    if (!window.confirm('Видалити працівника зі штатного списку? Історичні зарплатні відомості залишаться в базі.')) return;
    try {
      await employeesApi.remove(empId);
      await refreshFinanceData();
    } catch (error) {
      showError(error);
    }
  };

  const handleUpdateSalaryPayment = async (payment: SalaryPayment) => {
    try {
      await payrollApi.save(payment);
      await refreshFinanceData();
    } catch (error) {
      showError(error);
    }
  };

  const handleAddPayrollPayment = async (payroll: SalaryPayment, input: PayrollDisbursementInput) => {
    const saved = payroll.id.startsWith('sal-') ? await payrollApi.save(payroll) : payroll;
    await payrollApi.addPayment(saved.id, input);
    await refreshFinanceData();
  };

  // Operational expenses — Laravel / MySQL.
  const handleAddExpense = async (newExpData: Omit<Expense, 'id'>) => {
    try {
      await expensesApi.create(newExpData);
      await refreshFinanceData();
    } catch (error) {
      showError(error);
    }
  };

  const handleUpdateExpense = async (updatedExp: Expense) => {
    try {
      await expensesApi.update(updatedExp);
      await refreshFinanceData();
    } catch (error) {
      showError(error);
    }
  };

  const handleDeleteExpense = async (expId: string) => {
    if (!window.confirm('Видалити цю витрату?')) return;
    try {
      await expensesApi.remove(expId);
      await refreshFinanceData();
    } catch (error) {
      showError(error);
    }
  };

  const handleExportCSV = () => {
    exportJournalToCSV(
      childrenList.filter((c) => c.active),
      activities.filter((a) => a.active),
      records,
      MONTH_NAMES_UK[selectedMonth - 1],
      selectedYear,
    );
  };

  const handleExportFinancialCSV = async () => {
    try {
      await reportsApi.downloadMonthlyCsv(selectedYear, selectedMonth);
    } catch (error) {
      showError(error);
    }
  };

  const totalMonthRevenue = childrenList.reduce((acc, child) => {
    const record = records.find(
      (r) => r.childId === child.id && r.year === selectedYear && r.month === selectedMonth,
    );
    return acc + calculateChildTotal(child, record, activities).total;
  }, 0);

  const totalMonthExpenses = expenses
    .filter((exp) => {
      const expYear = exp.year || new Date(exp.date).getFullYear();
      const expMonth = exp.month || new Date(exp.date).getMonth() + 1;
      return expYear === selectedYear && expMonth === selectedMonth;
    })
    .reduce((sum, e) => sum + e.amount, 0);

  if (authLoading) {
    return (
      <div className="min-h-screen bg-[#FFFDF9] flex items-center justify-center text-stone-600">
        Перевіряємо сесію…
      </div>
    );
  }

  if (!currentUser) return <LoginPage onLogin={handleLogin} kindergartenInfo={kindergartenInfo} />;

  return (
    <div className="min-h-screen bg-[#FFFDF9] text-stone-800 flex flex-col font-sans">
      <Header
        currentTab={currentTab}
        kindergartenName={kindergartenInfo.name}
        onTabChange={setCurrentTab}
        selectedYear={selectedYear}
        selectedMonth={selectedMonth}
        onMonthChange={(y, m) => {
          setSelectedYear(y);
          setSelectedMonth(m);
        }}
        onExportCSV={handleExportCSV}
        onPrint={() => window.print()}
        totalChildren={childrenList.filter((c) => c.active).length}
        totalRevenue={totalMonthRevenue}
        totalEmployeesCount={employees.filter((e) => e.active).length}
        totalExpensesAmount={totalMonthExpenses}
        currentUser={currentUser}
        monthClosed={Boolean(monthClosure?.year === selectedYear && monthClosure.month === selectedMonth && monthClosure.closed)}
        onLogout={() => void handleLogout()}
      />

      {dataLoading && (
        <div className="no-print fixed top-20 right-4 z-50 bg-white border border-orange-200 shadow-lg rounded-xl px-4 py-2 text-xs font-semibold text-orange-700">
          Синхронізація з сервером…
        </div>
      )}

      <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-6">
        {monthClosure?.closed && monthClosure.year === selectedYear && monthClosure.month === selectedMonth && <div role="status" className="mb-5 rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm font-semibold text-amber-900">Цей місяць закрито. Нарахування, оплати, витрати й зарплату можна змінювати після повторного відкриття директором у розділі «Каса / Звіти».</div>}
        {currentTab === 'journal' && (
          <MonthlyJournal
            childrenList={childrenList}
            groups={groupNames}
            activities={activities}
            records={records}
            selectedYear={selectedYear}
            selectedMonth={selectedMonth}
            dailyFoodRate={kindergartenInfo.dailyFoodRate}
            onToggleActivity={(childId, activityId) => void handleToggleActivity(childId, activityId)}
            onActivityQuantity={handleActivityQuantity}
            onMonthCleared={async () => { await refreshJournal(); await refreshFinanceData(); }}
            onBatchCheckActivity={(activityId, checkAll) => void handleBatchCheckActivity(activityId, checkAll)}
            onTogglePaid={(childId) => void handleTogglePaid(childId)}
            onUpdateAbsenceRecord={handleUpdateAbsenceRecord}
            onOpenReceipt={(child) => setActiveReceiptChild(child)}
            onOpenAccount={(child) => void loadChildAccount(child)}
            onOpenPayment={(childId) => void handleOpenPaymentForChild(childId)}
            canManageFinance={Boolean(canManageFinance)}
            readOnly={Boolean(monthClosure?.closed)}
          />
        )}

        {currentTab === 'carry-forward' && canManageFinance && <section className="space-y-5">
          <div className="rounded-2xl border border-orange-100 bg-white p-5 sm:p-6">
            <h2 className="text-xl font-extrabold text-stone-900">Перенесення табеля</h2>
            <p className="mt-2 text-sm leading-relaxed text-stone-600">Оберіть вихідний місяць у шапці сайту. Тут можна підготувати табель наступного місяця з усіма вибраними послугами та кількістю занять. Перед створенням рахунків ви побачите підсумки й підтвердите дію.</p>
          </div>
          <JournalCarryForwardPanel key={`${selectedYear}-${selectedMonth}`} year={selectedYear} month={selectedMonth}
            onOpenMonth={(year, month) => { setSelectedYear(year); setSelectedMonth(month); setCurrentTab('journal'); }} />
        </section>}

        {currentTab === 'children' && (
          <ChildrenManager
            childrenList={childrenList}
            groups={groupNames}
            groupDetails={groups}
            onUpdateGroup={handleUpdateGroup}
            onAddGroup={handleAddGroup}
            onDeleteGroup={handleDeleteGroup}
            canEditGroups={Boolean(canManageFinance)}
            onAddChild={(child) => void handleAddChild(child)}
            onUpdateChild={(child) => void handleUpdateChild(child)}
            onDeleteChild={(id) => void handleDeleteChild(id)}
            onOpenAccount={canManageFinance ? (child) => void loadChildAccount(child) : undefined}
          />
        )}

        {currentTab === 'activities' && (
          <ActivitiesManager
            activities={activities.filter((activity) => !isSubscriptionActivity(activity))}
            onAddActivity={(activity) => void handleAddActivity(activity)}
            onUpdateActivity={(activity) => void handleUpdateActivity(activity)}
            onDeleteActivity={(id) => void handleDeleteActivity(id)}
          />
        )}

        {currentTab === 'settings' && canManageFinance && (
          <SystemSettings
            directorId={currentUser.role === 'director' ? currentUser.id : undefined}
            info={kindergartenInfo}
            subscriptions={activities.filter(isSubscriptionActivity)}
            onInfoSaved={setKindergartenInfo}
            selectedYear={selectedYear}
            selectedMonth={selectedMonth}
            onSubscriptionSaved={() => activitiesApi.list(selectedYear, selectedMonth).then(setActivities)}
            financeOptions={financeOptions}
            onFinanceOptionsSaved={setFinanceOptions}
          />
        )}

        {currentTab === 'employees' && (
          <EmployeesManager
            employees={employees}
            salaryPayments={salaryPayments}
            selectedYear={selectedYear}
            selectedMonth={selectedMonth}
            onAddEmployee={handleAddEmployee}
            onUpdateEmployee={handleUpdateEmployee}
            onDeleteEmployee={handleDeleteEmployee}
            onUpdateSalaryPayment={handleUpdateSalaryPayment}
            onAddPayrollPayment={handleAddPayrollPayment}
            readOnly={Boolean(monthClosure?.closed)}
          />
        )}

        {currentTab === 'expenses' && (
          <ExpensesManager
            expenses={expenses}
            selectedYear={selectedYear}
            selectedMonth={selectedMonth}
            onAddExpense={handleAddExpense}
            onUpdateExpense={handleUpdateExpense}
            onDeleteExpense={handleDeleteExpense}
            onOpenPayroll={(year, month) => { setSelectedYear(year); setSelectedMonth(month); setCurrentTab('employees'); }}
            expenseCategories={financeOptions.filter((option) => option.type === 'expense_category')}
            paymentMethods={financeOptions.filter((option) => option.type === 'payment_method')}
            readOnly={Boolean(monthClosure?.closed)}
          />
        )}

        {currentTab === 'reports' && (
          <div className="space-y-6">
          <MonthClosingPanel year={selectedYear} month={selectedMonth} status={monthClosure?.year === selectedYear && monthClosure.month === selectedMonth ? monthClosure : null} isDirector={currentUser.role === 'director'} onChanged={(status) => { setMonthClosure(status); void refreshFinanceData().catch(showError); }} />
          <SummaryReports
            childrenList={childrenList}
            groups={groupNames}
            activities={activities}
            records={records}
            employees={employees}
            salaryPayments={salaryPayments}
            expenses={expenses}
            financialReport={financialReport}
            selectedYear={selectedYear}
            selectedMonth={selectedMonth}
            onTogglePaid={(childId) => void handleTogglePaid(childId)}
            onOpenReceipt={(child) => setActiveReceiptChild(child)}
            onExportCSV={() => void handleExportFinancialCSV()}
            readOnly={Boolean(monthClosure?.closed)}
          />
          </div>
        )}
      </main>

      {activeReceiptChild && (
        <ReceiptModal
          child={activeReceiptChild}
          record={records.find(
            (r) => r.childId === activeReceiptChild.id && r.year === selectedYear && r.month === selectedMonth,
          )}
          activities={activities}
          selectedYear={selectedYear}
          selectedMonth={selectedMonth}
          kindergartenInfo={kindergartenInfo}
          onClose={() => setActiveReceiptChild(null)}
          onTogglePaid={(childId) => void handleTogglePaid(childId)}
          onOpenPayment={(childId) => void handleOpenPaymentForChild(childId)}
          onOpenAccount={(child) => void loadChildAccount(child)}
          onDownloadPdf={() => void handleDownloadCurrentReceiptPdf(activeReceiptChild)}
        />
      )}

      {activeAccountChild && (
        <ChildAccountModal
          child={activeAccountChild}
          account={childAccount}
          loading={childAccountLoading}
          onClose={() => { setActiveAccountChild(null); setChildAccount(null); }}
          onAddPayment={(bill) => setPaymentDialog({ bill })}
          onEditPayment={(bill, payment) => setPaymentDialog({ bill, payment })}
          onDeletePayment={handleDeletePayment}
          onDownloadReceipt={handleDownloadReceiptPdf}
          paymentMethods={financeOptions.filter((option) => option.type === 'payment_method')}
        />
      )}

      {paymentDialog && (
        <PaymentModal
          bill={paymentDialog.bill}
          payment={paymentDialog.payment}
          onClose={() => setPaymentDialog(null)}
          onSave={handleSavePayment}
          paymentMethods={financeOptions.filter((option) => option.type === 'payment_method')}
        />
      )}

      <footer className="no-print border-t border-orange-100/80 py-6 text-center text-xs text-stone-500 bg-white">
        <div className="max-w-7xl mx-auto px-4 flex flex-col sm:flex-row items-center justify-between gap-2">
          <div><b>{kindergartenInfo.name}</b>{kindergartenInfo.edrpou && ` • ЄДРПОУ ${kindergartenInfo.edrpou}`}</div>
          <div className="text-stone-400">Бухгалтерська автоматизація розрахунків, персоналу та витрат дитячого садка</div>
        </div>
      </footer>
    </div>
  );
}

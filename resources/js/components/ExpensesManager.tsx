import React, { useState, useMemo } from 'react';
import {
  Receipt,
  Plus,
  Search,
  Filter,
  Trash2,
  Edit2,
  Utensils,
  Trash,
  ShoppingBag,
  Sparkles,
  Wrench,
  HelpCircle,
  Calendar,
  CreditCard,
  Building2,
  ArrowUpRight,
  PieChart as PieChartIcon,
  Tag,
  FileCheck,
  Banknote,
  Pin,
} from 'lucide-react';
import { Expense, ExpenseCategory, FinanceOption, PaymentMethod } from '../types';
import { formatCurrency } from '../utils/calculations';
import { MONTH_NAMES_UK } from '../data/initialData';
import { expenseIcon } from '../utils/expenseIcons';

interface ExpensesManagerProps {
  expenses: Expense[];
  selectedYear: number;
  selectedMonth: number;
  onAddExpense: (expense: Omit<Expense, 'id'>) => void;
  onUpdateExpense: (expense: Expense) => void;
  onDeleteExpense: (id: string) => void;
  expenseCategories: FinanceOption[];
  paymentMethods: FinanceOption[];
  readOnly?: boolean;
  onOpenPayroll: (year: number, month: number) => void;
}

export const CATEGORY_CONFIG: Record<
  string,
  {
    label: string;
    description: string;
    color: string;
    badgeBg: string;
    badgeText: string;
    icon: React.ElementType;
  }
> = {
  salary: {
    label: 'Зарплата', description: 'Автоматично з авансів та виплат працівникам', color: 'orange',
    badgeBg: 'bg-orange-100 text-orange-800 border-orange-200', badgeText: 'text-orange-700', icon: Banknote,
  },
  food: {
    label: 'Харчування та продукти',
    description: 'М’ясо, молоко, овочі, фрукти, хліб, бакалія',
    color: 'emerald',
    badgeBg: 'bg-emerald-100 text-emerald-800 border-emerald-200',
    badgeText: 'text-emerald-700',
    icon: Utensils,
  },
  utilities: {
    label: 'Вивіз сміття та комунальні',
    description: 'Вивіз сміття (ТПВ), вода, світло, тепло',
    color: 'sky',
    badgeBg: 'bg-sky-100 text-sky-800 border-sky-200',
    badgeText: 'text-sky-700',
    icon: Trash,
  },
  inventory: {
    label: 'Покупка речей, іграшок, канцелярії',
    description: 'Розвиваючі ігри, постільна білизна, канцтовари, меблі',
    color: 'amber',
    badgeBg: 'bg-amber-100 text-amber-800 border-amber-200',
    badgeText: 'text-amber-700',
    icon: ShoppingBag,
  },
  cleaning: {
    label: 'Миючі засоби та гігієна',
    description: 'Антисептики, мило, пральний порошок, паперові рушники',
    color: 'purple',
    badgeBg: 'bg-purple-100 text-purple-800 border-purple-200',
    badgeText: 'text-purple-700',
    icon: Sparkles,
  },
  maintenance: {
    label: 'Ремонт та обслуговування',
    description: 'Сантехніка, електрика, дрібний благоустрій території',
    color: 'orange',
    badgeBg: 'bg-orange-100 text-orange-800 border-orange-200',
    badgeText: 'text-orange-700',
    icon: Wrench,
  },
  other: {
    label: 'Інші розтрати',
    description: 'Охорона, зв’язок, інтернет, банківські комісії тощо',
    color: 'stone',
    badgeBg: 'bg-stone-100 text-stone-800 border-stone-200',
    badgeText: 'text-stone-700',
    icon: HelpCircle,
  },
};

export const ExpensesManager: React.FC<ExpensesManagerProps> = ({
  expenses,
  selectedYear,
  selectedMonth,
  onAddExpense,
  onUpdateExpense,
  onDeleteExpense,
  expenseCategories,
  paymentMethods,
  readOnly = false,
  onOpenPayroll,
}) => {
  const [searchQuery, setSearchQuery] = useState('');
  const [categoryFilter, setCategoryFilter] = useState<string>('all');
  const [showModal, setShowModal] = useState(false);
  const [editingExpense, setEditingExpense] = useState<Expense | null>(null);

  // Form states
  const [formTitle, setFormTitle] = useState('');
  const [formAmount, setFormAmount] = useState<number>(1000);
  const [formCategory, setFormCategory] = useState<ExpenseCategory>('food');
  const [formDate, setFormDate] = useState(
    new Date().toISOString().split('T')[0]
  );
  const [formSupplier, setFormSupplier] = useState('');
  const [formInvoiceNumber, setFormInvoiceNumber] = useState('');
  const [formPaymentMethod, setFormPaymentMethod] = useState<PaymentMethod>('bank_transfer');
  const [formNotes, setFormNotes] = useState('');

  // Expenses filtered by current selected year & month
  const monthlyExpenses = useMemo(() => {
    return expenses.filter((exp) => {
      // If year and month exist explicitly, match, otherwise derive from date string
      const expYear = exp.year || new Date(exp.date).getFullYear();
      const expMonth = exp.month || new Date(exp.date).getMonth() + 1;
      return expYear === selectedYear && expMonth === selectedMonth;
    });
  }, [expenses, selectedYear, selectedMonth]);

  // Apply search and category filters
  const filteredExpenses = useMemo(() => {
    return monthlyExpenses.filter((exp) => {
      const matchesSearch =
        exp.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
        (exp.supplier &&
          exp.supplier.toLowerCase().includes(searchQuery.toLowerCase())) ||
        (exp.invoiceNumber &&
          exp.invoiceNumber.toLowerCase().includes(searchQuery.toLowerCase()));

      const matchesCategory =
        categoryFilter === 'all' || exp.category === categoryFilter;

      return matchesSearch && matchesCategory;
    });
  }, [monthlyExpenses, searchQuery, categoryFilter]);

  // Calculate totals and breakdown
  const stats = useMemo(() => {
    let total = 0;
    const categoryTotals: Record<string, number> = {};

    monthlyExpenses.forEach((exp) => {
      total += exp.amount;
      categoryTotals[exp.category] = (categoryTotals[exp.category] ?? 0) + exp.amount;
    });

    return {
      total,
      count: monthlyExpenses.length,
      categoryTotals,
    };
  }, [monthlyExpenses]);

  const openAddModal = () => {
    setEditingExpense(null);
    setFormTitle('');
    setFormAmount(1000);
    setFormCategory(expenseCategories.find((item) => item.code === 'food')?.code ?? expenseCategories[0]?.code ?? 'food');
    // Default date within the selected month/year
    const formattedMonth = String(selectedMonth).padStart(2, '0');
    setFormDate(`${selectedYear}-${formattedMonth}-15`);
    setFormSupplier('');
    setFormInvoiceNumber('');
    setFormPaymentMethod(paymentMethods.find((item) => item.code === 'bank_transfer')?.code ?? paymentMethods[0]?.code ?? 'cash');
    setFormNotes('');
    setShowModal(true);
  };

  const openEditModal = (exp: Expense) => {
    if (exp.source === 'payroll') return;
    setEditingExpense(exp);
    setFormTitle(exp.title);
    setFormAmount(exp.amount);
    setFormCategory(exp.category);
    setFormDate(exp.date);
    setFormSupplier(exp.supplier || '');
    setFormInvoiceNumber(exp.invoiceNumber || '');
    setFormPaymentMethod(exp.paymentMethod);
    setFormNotes(exp.notes || '');
    setShowModal(true);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!formTitle.trim() || formAmount <= 0) return;

    const dateObj = new Date(formDate);
    const year = dateObj.getFullYear() || selectedYear;
    const month = dateObj.getMonth() + 1 || selectedMonth;

    if (editingExpense) {
      onUpdateExpense({
        ...editingExpense,
        title: formTitle.trim(),
        amount: Number(formAmount),
        category: formCategory,
        date: formDate,
        year,
        month,
        supplier: formSupplier.trim() || undefined,
        invoiceNumber: formInvoiceNumber.trim() || undefined,
        paymentMethod: formPaymentMethod,
        notes: formNotes.trim() || undefined,
      });
    } else {
      onAddExpense({
        title: formTitle.trim(),
        amount: Number(formAmount),
        category: formCategory,
        date: formDate,
        year,
        month,
        supplier: formSupplier.trim() || undefined,
        invoiceNumber: formInvoiceNumber.trim() || undefined,
        paymentMethod: formPaymentMethod,
        notes: formNotes.trim() || undefined,
      });
    }
    setShowModal(false);
  };

  return (
    <div className="space-y-6">
      {/* Top Banner & Quick Actions */}
      <div className="bg-white rounded-2xl p-5 border border-orange-200/80 shadow-sm flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <span className="px-2.5 py-1 rounded-lg bg-orange-100 text-orange-700 text-xs font-semibold uppercase tracking-wider">
              Операційні розтрати
            </span>
            <span className="text-xs text-stone-500 font-medium">
              Період: {MONTH_NAMES_UK[selectedMonth - 1]} {selectedYear} р.
            </span>
          </div>
          <h2 className="text-xl font-bold text-stone-800 mt-1 flex items-center gap-2">
            <Receipt className="w-6 h-6 text-orange-600" />
            Фінансові розтрати: харчування, сміття, речі
          </h2>
          <p className="text-xs text-stone-600 mt-0.5">
            Облік витрат на закупку продуктів харчування, вивіз сміття, придбання розвиваючих речей та інвентарю.
          </p>
        </div>

        <button
          id="add-expense-btn"
          disabled={readOnly}
          onClick={openAddModal}
          className="inline-flex items-center gap-2 px-4 py-2 bg-gradient-to-r from-orange-600 to-amber-600 hover:from-orange-700 hover:to-amber-700 text-white text-xs font-semibold rounded-xl shadow-sm transition-all cursor-pointer whitespace-nowrap"
        >
          <Plus className="w-4 h-4" />
          <span>Додати розтрату / чек</span>
        </button>
      </div>

      <p className="rounded-xl border border-orange-100 bg-orange-50/60 px-4 py-3 text-xs leading-relaxed text-orange-900">Категорія «Зарплата» закріплена. Аванси й виплати працівникам з’являються тут автоматично за датою виплати. У фінансовому звіті вони враховуються один раз у зарплатах.</p>

      {/* Category Breakdown Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
        {expenseCategories.map((category) => {
          const catKey = category.code;
          const cfg = CATEGORY_CONFIG[catKey] ?? CATEGORY_CONFIG.other;
          const Icon = expenseIcon(category).Icon;
          const totalAmount = stats.categoryTotals[catKey] || 0;
          const isSelected = categoryFilter === catKey;

          return (
            <div key={catKey} className="relative">
            <button
              aria-pressed={isSelected}
              id={`filter-cat-${catKey}`}
              onClick={() =>
                setCategoryFilter(categoryFilter === catKey ? 'all' : catKey)
              }
              className={`h-full w-full text-left p-3.5 rounded-2xl border transition-all cursor-pointer ${
                isSelected
                  ? 'border-orange-500 bg-orange-50/50 shadow-sm ring-2 ring-orange-400/20'
                  : 'bg-white border-stone-200/80 hover:border-orange-200'
              }`}
            >
              <div className="flex items-center justify-between">
                <div
                  className={`w-7 h-7 rounded-lg flex items-center justify-center ${cfg.badgeBg}`}
                >
                  <Icon className="w-4 h-4" />
                </div>
                <span className="text-[10px] font-bold text-stone-400 uppercase">
                  {stats.total > 0
                    ? `${Math.round((totalAmount / stats.total) * 100)}%`
                    : '0%'}
                </span>
              </div>
              <div className="mt-2 min-h-8 pr-1 text-xs font-bold leading-4 text-stone-800 line-clamp-2" title={category.name}>
                {category.name}
              </div>
              <div className="mt-0.5 text-xs font-bold font-mono text-orange-600">
                {formatCurrency(totalAmount)}
              </div>
            </button>
            </div>
          );
        })}
      </div>

      {/* Main Expense Table & Filter Toolbar */}
      <div className="bg-white rounded-2xl border border-stone-200/80 shadow-sm overflow-hidden">
        {/* Filter Bar */}
        <div className="p-4 border-b border-stone-200/80 flex flex-col sm:flex-row items-center justify-between gap-3 bg-stone-50/70">
          <div className="relative w-full sm:w-80">
            <Search className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-stone-400" />
            <input
              id="search-expense-input"
              type="text"
              placeholder="Пошук витрати, постачальника чи чека..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-9 pr-3.5 py-2 text-xs rounded-xl border border-stone-200 focus:outline-none focus:ring-2 focus:ring-orange-500/30 focus:border-orange-500 bg-white"
            />
          </div>

          <div className="flex items-center gap-3 w-full sm:w-auto justify-end">
            <select
              id="category-dropdown-filter"
              value={categoryFilter}
              onChange={(e) => setCategoryFilter(e.target.value)}
              className="text-xs rounded-xl border border-stone-200 py-2 px-3 focus:outline-none focus:ring-2 focus:ring-orange-500/30 focus:border-orange-500 bg-white"
            >
              <option value="all">Усі категорії витрат ({monthlyExpenses.length})</option>
              {expenseCategories.map((category) => (
                <option key={category.id} value={category.code}>
                  {category.name}
                </option>
              ))}
            </select>

            <div className="text-xs font-semibold text-stone-700 bg-white px-3 py-2 rounded-xl border border-stone-200">
              Разом витрат:{' '}
              <span className="text-orange-600 font-mono font-bold">
                {formatCurrency(stats.total)}
              </span>
            </div>
          </div>
        </div>

        {/* Expenses List */}
        <div className="overflow-x-auto max-w-full custom-scrollbar touch-pan-x">
          <table className="w-full text-left border-collapse min-w-[720px]">
            <thead>
              <tr className="bg-stone-100/70 text-stone-700 text-xs uppercase tracking-wider font-semibold border-b border-stone-200">
                <th className="py-3 px-4">Дата / Чек</th>
                <th className="py-3 px-4">Найменування витрати</th>
                <th className="py-3 px-3">Категорія</th>
                <th className="py-3 px-3">Постачальник</th>
                <th className="py-3 px-3">Оплата</th>
                <th className="py-3 px-4 text-right">Сума</th>
                <th className="py-3 px-4 text-right">Дії</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-stone-200/70 text-sm">
              {filteredExpenses.length === 0 ? (
                <tr>
                  <td
                    colSpan={7}
                    className="py-12 text-center text-stone-400 text-xs"
                  >
                    Немає витрат за вказаними фільтрами у {MONTH_NAMES_UK[selectedMonth - 1]} {selectedYear}.
                  </td>
                </tr>
              ) : (
                filteredExpenses.map((exp) => {
                  const catCfg = CATEGORY_CONFIG[exp.category] || CATEGORY_CONFIG.other;
                  const CatIcon = catCfg.icon;

                  return (
                    <tr
                      key={exp.id}
                      className="hover:bg-orange-50/30 transition-colors"
                    >
                      <td className="py-3 px-4 text-xs">
                        <div className="font-semibold text-stone-800 flex items-center gap-1.5">
                          <Calendar className="w-3.5 h-3.5 text-stone-400" />
                          {exp.date}
                        </div>
                        {exp.invoiceNumber && (
                          <span className="text-[11px] text-stone-500 font-mono">
                            № {exp.invoiceNumber}
                          </span>
                        )}
                      </td>

                      <td className="py-3 px-4">
                        <div className="font-semibold text-stone-900 text-xs">
                          {exp.title}
                        </div>
                        {exp.source === 'payroll' && <div className="mt-1 flex flex-wrap items-center gap-1.5 text-[10px] font-semibold text-orange-700"><span className="rounded-md bg-orange-50 px-2 py-0.5">Автоматично із зарплат</span>{exp.isOfficial === true && <span className="rounded-md bg-emerald-50 px-2 py-0.5 text-emerald-700">Офіційна виплата</span>}</div>}
                        {exp.notes && (
                          <div className="text-[11px] text-stone-500 mt-0.5 line-clamp-1">
                            {exp.notes}
                          </div>
                        )}
                      </td>

                      <td className="py-3 px-3 text-xs">
                        <span
                          className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-medium border ${catCfg.badgeBg}`}
                        >
                          <CatIcon className="w-3.5 h-3.5" />
                          <span>{expenseCategories.find((category) => category.code === exp.category)?.name ?? exp.category}</span>{exp.category === 'salary' && <Pin className="h-3 w-3" />}
                        </span>
                      </td>

                      <td className="py-3 px-3 text-xs text-stone-600">
                        {exp.supplier ? (
                          <span className="font-medium text-stone-700">
                            {exp.supplier}
                          </span>
                        ) : (
                          <span className="text-stone-400 italic">—</span>
                        )}
                      </td>

                      <td className="py-3 px-3 text-xs text-stone-600">
                        <span className="inline-flex items-center gap-1 text-[11px] font-medium bg-stone-100 px-2 py-0.5 rounded-md text-stone-700">
                          {paymentMethods.find((method) => method.code === exp.paymentMethod)?.name ?? exp.paymentMethod}
                        </span>
                      </td>

                      <td className="py-3 px-4 text-right font-mono font-bold text-xs text-stone-900">
                        {formatCurrency(exp.amount)}
                      </td>

                      <td className="py-3 px-4 text-right">
                        {exp.source === 'payroll' ? <button type="button" onClick={() => onOpenPayroll(exp.payrollYear ?? selectedYear, exp.payrollMonth ?? selectedMonth)} className="inline-flex items-center gap-1.5 whitespace-nowrap rounded-xl bg-orange-50 px-3 py-2 text-xs font-bold text-orange-700 hover:bg-orange-100"><Banknote className="h-4 w-4"/>До зарплати</button> :                         <div className="flex items-center justify-end gap-1">
                          <button
                            id={`edit-exp-btn-${exp.id}`}
                            disabled={readOnly}
                            onClick={() => openEditModal(exp)}
                            className="p-1.5 text-stone-400 hover:text-orange-600 hover:bg-orange-50 rounded-lg transition-colors cursor-pointer"
                            title="Редагувати"
                          >
                            <Edit2 className="w-3.5 h-3.5" />
                          </button>
                          <button
                            id={`delete-exp-btn-${exp.id}`}
                            disabled={readOnly}
                            onClick={() => {
                              if (
                                confirm(
                                  `Видалити запис про витрату «${exp.title}»?`
                                )
                              ) {
                                onDeleteExpense(exp.id);
                              }
                            }}
                            className="p-1.5 text-stone-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition-colors cursor-pointer"
                            title="Видалити"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>}
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
            <tfoot>
              <tr className="bg-stone-50 font-semibold text-stone-900 border-t-2 border-stone-300">
                <td colSpan={5} className="py-3.5 px-4 text-xs font-bold uppercase">
                  Разом витрат за {MONTH_NAMES_UK[selectedMonth - 1]}:
                </td>
                <td className="py-3.5 px-4 text-right font-mono text-sm font-extrabold text-orange-600">
                  {formatCurrency(stats.total)}
                </td>
                <td></td>
              </tr>
            </tfoot>
          </table>
        </div>
      </div>

      {/* MODAL: ADD / EDIT EXPENSE */}
      {showModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-xs">
          <div className="bg-white rounded-3xl max-w-md w-full p-6 shadow-2xl border border-orange-100">
            <div className="flex items-center justify-between border-b border-stone-100 pb-3 mb-4">
              <h3 className="text-base font-bold text-stone-900 flex items-center gap-2">
                <Receipt className="w-5 h-5 text-orange-600" />
                {editingExpense
                  ? 'Редагувати фінансову витрату'
                  : 'Зареєструвати нову розтрату'}
              </h3>
              <button
                onClick={() => setShowModal(false)}
                className="text-stone-400 hover:text-stone-600 p-1 rounded-lg text-lg leading-none cursor-pointer"
              >
                &times;
              </button>
            </div>

            <form onSubmit={handleSubmit} className="space-y-3.5">
              <div>
                <label className="block text-xs font-semibold text-stone-700 mb-1">
                  Найменування розтрати *
                </label>
                <input
                  type="text"
                  required
                  placeholder="напр., Закупка свіжого молока або Вивіз сміття"
                  value={formTitle}
                  onChange={(e) => setFormTitle(e.target.value)}
                  className="w-full text-xs px-3 py-2 rounded-xl border border-stone-200 focus:outline-none focus:ring-2 focus:ring-orange-500/30 focus:border-orange-500"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-stone-700 mb-1">
                    Сума витрати (грн) *
                  </label>
                  <input
                    type="number"
                    min="0.01"
                    step="0.01"
                    required
                    value={formAmount}
                    onChange={(e) => setFormAmount(Number(e.target.value))}
                    className="w-full text-xs px-3 py-2 rounded-xl border border-stone-200 focus:outline-none focus:ring-2 focus:ring-orange-500/30 focus:border-orange-500 font-mono"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-stone-700 mb-1">
                    Категорія *
                  </label>
                  <select
                    value={formCategory}
                    onChange={(e) =>
                      setFormCategory(e.target.value as ExpenseCategory)
                    }
                    className="w-full text-xs px-3 py-2 rounded-xl border border-stone-200 focus:outline-none focus:ring-2 focus:ring-orange-500/30 focus:border-orange-500 bg-white"
                  >
                    {expenseCategories.filter(category => category.code !== 'salary' || editingExpense?.category === 'salary').map(
                      (category) => (
                        <option key={category.id} value={category.code}>
                          {category.name}
                        </option>
                      )
                    )}
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-stone-700 mb-1">
                    Дата здійснення
                  </label>
                  <input
                    type="date"
                    required
                    value={formDate}
                    onChange={(e) => setFormDate(e.target.value)}
                    className="w-full text-xs px-3 py-2 rounded-xl border border-stone-200 focus:outline-none focus:ring-2 focus:ring-orange-500/30 focus:border-orange-500"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-stone-700 mb-1">
                    Форма розрахунку
                  </label>
                  <select
                    value={formPaymentMethod}
                    onChange={(e) =>
                      setFormPaymentMethod(e.target.value)
                    }
                    className="w-full text-xs px-3 py-2 rounded-xl border border-stone-200 focus:outline-none focus:ring-2 focus:ring-orange-500/30 focus:border-orange-500 bg-white"
                  >
                    {paymentMethods.map((method) => <option key={method.id} value={method.code}>{method.name}</option>)}
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-stone-700 mb-1">
                    Постачальник / Магазин
                  </label>
                  <input
                    type="text"
                    placeholder="напр., КП «Київкомунсервіс»"
                    value={formSupplier}
                    onChange={(e) => setFormSupplier(e.target.value)}
                    className="w-full text-xs px-3 py-2 rounded-xl border border-stone-200 focus:outline-none focus:ring-2 focus:ring-orange-500/30 focus:border-orange-500"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-stone-700 mb-1">
                    Номер чека / накладної
                  </label>
                  <input
                    type="text"
                    placeholder="напр., АКТ-09/18 або ЧК-482"
                    value={formInvoiceNumber}
                    onChange={(e) => setFormInvoiceNumber(e.target.value)}
                    className="w-full text-xs px-3 py-2 rounded-xl border border-stone-200 focus:outline-none focus:ring-2 focus:ring-orange-500/30 focus:border-orange-500"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-stone-700 mb-1">
                  Деталі / Специфікація витрати
                </label>
                <textarea
                  rows={2}
                  placeholder="Перелік куплених товарів, речей, послуг або кількість..."
                  value={formNotes}
                  onChange={(e) => setFormNotes(e.target.value)}
                  className="w-full text-xs px-3 py-2 rounded-xl border border-stone-200 focus:outline-none focus:ring-2 focus:ring-orange-500/30 focus:border-orange-500"
                />
              </div>

              <div className="flex justify-end gap-2.5 pt-3 border-t border-stone-100">
                <button
                  type="button"
                  onClick={() => setShowModal(false)}
                  className="px-4 py-2 text-xs font-medium text-stone-600 hover:bg-stone-100 rounded-xl transition-colors cursor-pointer"
                >
                  Скасувати
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 text-xs font-semibold text-white bg-orange-600 hover:bg-orange-700 rounded-xl shadow-sm transition-all cursor-pointer"
                >
                  {editingExpense ? 'Зберегти зміни' : 'Записати витрату'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

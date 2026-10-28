export interface Group {
  id: string;
  name: string;
  active: boolean;
  sortOrder?: number;
  childCount?: number;
}

export interface Child {
  id: string;
  groupId?: string;
  fullName: string;
  group: string; // e.g., 'Молодша «Сонечко»', 'Середня «Бджілки»', 'Старша «Ромашка»'
  birthDate?: string;
  parentName: string;
  parentPhone: string;
  discountPercent?: number; // e.g. 0, 10, 20, 50%
  notes?: string;
  active: boolean;
}

export type ActivityBillingType = 'monthly' | 'per_lesson' | 'daily_food';

export interface Activity {
  id: string;
  name: string;
  price: number; // in UAH
  billingType: ActivityBillingType;
  category: 'core' | 'creative' | 'sport' | 'languages' | 'development';
  instructor?: string;
  description?: string;
  color?: string; // badge accent
  active: boolean;
}

export interface MonthlyRecord {
  childId: string;
  year: number;
  month: number; // 1-12
  checkedActivities: Record<string, boolean>;
  activityQuantities?: Record<string, number>;
  activityUnitPrices?: Record<string, number>;
  billItems?: BillItemSnapshot[];
  absenceDays?: number; // кількість пропущених днів (поважна причина/за заявою)
  sickLeaveDays?: number; // кількість днів на лікарняному (довідка від лікаря)
  dailyFoodDeductionRate?: number; // вартість компенсації 1 дня харчування (напр. 160 грн/день)
  customDeduction?: number; // фіксована сума коригування/віднімання
  absenceNote?: string; // примітка щодо лікарняного чи пропусків
  customDiscount?: number;
  isPaid: boolean;
  paymentDate?: string;
  notes?: string;
  billId?: string;
  paymentIds?: string[];
  paidAmount?: number;
  debt?: number;
  status?: 'draft' | 'unpaid' | 'partially_paid' | 'paid';
  serverSubtotal?: number;
  serverDiscountAmount?: number;
  serverDeductionsTotal?: number;
  serverTotal?: number;
}

export type PaymentMethod = string;

export interface PaymentRecord {
  id: string;
  amount: number;
  paymentDate: string;
  paymentMethod: PaymentMethod;
  reference?: string;
  notes?: string;
  createdBy?: string;
  createdByName?: string;
  createdAt?: string;
}

export interface BillItemSnapshot {
  id: string;
  activityId?: string;
  name: string;
  billingType: ActivityBillingType;
  quantity: number;
  unitPrice: number;
  amount: number;
}

export interface BillSummary {
  id: string;
  year: number;
  month: number;
  status: 'draft' | 'unpaid' | 'partially_paid' | 'paid';
  subtotal: number;
  discountPercent: number;
  discountAmount: number;
  deductionsTotal: number;
  total: number;
  paid: number;
  debt: number;
  absenceDays: number;
  sickLeaveDays: number;
  dailyFoodRate: number;
  customDeduction: number;
  absenceNote?: string;
  notes?: string;
  items: BillItemSnapshot[];
  payments: PaymentRecord[];
}

export interface ChildAccount {
  child: Child;
  summary: { billed: number; paid: number; debt: number; months: number };
  bills: BillSummary[];
}

export interface PaymentInput {
  amount: number;
  paymentDate: string;
  paymentMethod: PaymentMethod;
  reference?: string;
  notes?: string;
}

export interface Employee {
  id: string;
  fullName: string;
  position: string; // e.g., 'Вихователь', 'Помічник вихователя (няня)', 'Кухар', 'Медсестра', 'Музичний керівник', 'Завідувач'
  phone: string;
  baseSalary: number; // базовий оклад у грн
  taxRate?: number; // % податків (наприклад 19.5% ПДФО+ВЗ)
  startDate?: string;
  notes?: string;
  active: boolean;
}

export interface PayrollDisbursement {
  id: string; amount: number; stage: 'advance' | 'salary'; paymentMethod: 'bank' | 'cash' | 'unspecified';
  isOfficial: boolean | null; paymentDate?: string; notes?: string; legacy: boolean;
}
export interface PayrollDisbursementInput {
  amount: number; stage: 'advance' | 'salary'; paymentMethod: 'bank' | 'cash';
  isOfficial: boolean; paymentDate: string; notes: string; requestId: string;
}

export interface SalaryPayment {
  id: string;
  employeeId: string;
  year: number;
  month: number; // 1-12
  baseSalary: number; // нарахований оклад
  bonus: number; // премія / доплата за гуртки чи переробку
  deductions: number; // утримання; аванс враховується окремою виплатою
  finalAmount: number; // до виплати
  status: 'paid' | 'partial' | 'pending';
  paidAmount?: number;
  remainingAmount?: number;
  payments?: PayrollDisbursement[];
  paymentDate?: string;
  notes?: string;
}

export type ExpenseCategory = string;

export interface FinanceOption {
  id: string;
  type: 'expense_category' | 'payment_method';
  code: string;
  name: string;
  sortOrder: number;
  locked?: boolean;
  icon?: string;
}

export interface Expense {
  id: string;
  title: string; // Назва витрати
  amount: number; // Сума в грн
  category: ExpenseCategory;
  date: string; // YYYY-MM-DD
  year: number;
  month: number;
  supplier?: string; // Постачальник / магазин / контрагент
  invoiceNumber?: string; // Номер чека / накладної
  paymentMethod: PaymentMethod;
  notes?: string;
  source?: 'manual' | 'payroll';
  payrollYear?: number;
  payrollMonth?: number;
  isOfficial?: boolean | null;
}


export interface FinancialReport {
  period: { year: number; month: number };
  revenue: {
    billed: number;
    receivedForBills: number;
    cashReceived: number;
    debt: number;
  };
  salary: {
    accrued: number;
    cashPaid: number;
  };
  expenses: {
    total: number;
  };
  result: {
    accrualResult: number;
    cashFlow: number;
  };
}

export interface KindergartenInfo {
  name: string;
  dailyFoodRate: number;
  receiptLogoUrl: string;
  receiptContactPhone: string;
  receiptContactEmail: string;
  paymentPurposeTemplate: string;
  receiptNote: string;
  edrpou: string;
  email: string;
  iban: string;
  bankName: string;
  address: string;
  phone: string;
}

export interface SubscriptionTariff {
  activityId: string;
  name: string;
  basePrice: number;
  periods: { year: number; month: number; price: number }[];
}

export interface AuthUser {
  id: string;
  email: string;
  name: string;
  role: 'accountant' | 'director' | 'educator';
  roleNameUk: string;
  avatarBg?: string;
}

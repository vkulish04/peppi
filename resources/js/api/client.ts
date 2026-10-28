import type { Activity, AuthUser, BillSummary, Child, ChildAccount, Employee, Expense, FinanceOption, FinancialReport, Group, KindergartenInfo, MonthlyRecord, PaymentInput, PaymentRecord, PayrollDisbursementInput, SalaryPayment, SubscriptionTariff } from '../types';

const API_BASE = '/api/v1';
const LOCAL_TOKEN_KEY = 'kindergarten_api_token';
const SESSION_TOKEN_KEY = 'kindergarten_api_token_session';

export class ApiError extends Error {
  status: number;
  errors?: Record<string, string[]>;

  constructor(message: string, status: number, errors?: Record<string, string[]>) {
    super(message);
    this.name = 'ApiError';
    this.status = status;
    this.errors = errors;
  }
}

export function getToken(): string | null {
  return localStorage.getItem(LOCAL_TOKEN_KEY) || sessionStorage.getItem(SESSION_TOKEN_KEY);
}

export function saveToken(token: string, remember: boolean): void {
  localStorage.removeItem(LOCAL_TOKEN_KEY);
  sessionStorage.removeItem(SESSION_TOKEN_KEY);
  (remember ? localStorage : sessionStorage).setItem(
    remember ? LOCAL_TOKEN_KEY : SESSION_TOKEN_KEY,
    token,
  );
}

export function clearToken(): void {
  localStorage.removeItem(LOCAL_TOKEN_KEY);
  sessionStorage.removeItem(SESSION_TOKEN_KEY);
}

async function apiFetch<T>(path: string, init: RequestInit = {}): Promise<T> {
  const token = getToken();
  const headers = new Headers(init.headers || {});
  headers.set('Accept', 'application/json');
  if (!(init.body instanceof FormData) && init.body !== undefined) {
    headers.set('Content-Type', 'application/json');
  }
  if (token) headers.set('Authorization', `Bearer ${token}`);

  const response = await fetch(`${API_BASE}${path}`, { ...init, headers });
  if (response.status === 204) return undefined as T;

  const contentType = response.headers.get('content-type') || '';
  const payload = contentType.includes('application/json') ? await response.json() : null;

  if (!response.ok) {
    if (response.status === 401) clearToken();
    const firstValidationMessage = payload?.errors
      ? Object.values(payload.errors as Record<string, string[]>).flat()[0]
      : undefined;
    throw new ApiError(
      firstValidationMessage || payload?.message || `HTTP ${response.status}`,
      response.status,
      payload?.errors,
    );
  }

  return payload as T;
}

const roleNames: Record<AuthUser['role'], string> = {
  accountant: 'Головний бухгалтер',
  director: 'Завідувач закладу',
  educator: 'Старший вихователь',
};

const roleColors: Record<AuthUser['role'], string> = {
  accountant: 'bg-orange-500 text-white',
  director: 'bg-amber-600 text-white',
  educator: 'bg-emerald-600 text-white',
};

function mapUser(raw: any): AuthUser {
  const role = String(raw.role ?? 'educator') as AuthUser['role'];
  return {
    id: String(raw.id),
    email: String(raw.email),
    name: String(raw.name),
    role,
    roleNameUk: roleNames[role] ?? role,
    avatarBg: roleColors[role] ?? 'bg-stone-600 text-white',
  };
}

export function mapGroup(raw: any): Group {
  return {
    id: String(raw.id),
    name: String(raw.name),
    active: Boolean(raw.active),
    sortOrder: raw.sort_order == null ? undefined : Number(raw.sort_order),
    childCount: raw.children_count == null ? undefined : Number(raw.children_count),
  };
}

export function mapChild(raw: any): Child {
  return {
    id: String(raw.id),
    groupId: raw.group_id != null ? String(raw.group_id) : raw.group?.id != null ? String(raw.group.id) : undefined,
    fullName: String(raw.full_name),
    group: String(raw.group?.name ?? ''),
    birthDate: raw.birth_date ? String(raw.birth_date).slice(0, 10) : undefined,
    parentName: String(raw.parent_name ?? ''),
    parentPhone: String(raw.parent_phone ?? ''),
    discountPercent: Number(raw.discount_percent ?? 0),
    notes: raw.notes ?? undefined,
    active: Boolean(raw.active),
  };
}

const validCategories = new Set(['core', 'creative', 'sport', 'languages', 'development']);

export function mapActivity(raw: any): Activity {
  const category = validCategories.has(raw.category) ? raw.category : raw.name === 'Харчування' ? 'core' : 'creative';
  return {
    id: String(raw.id),
    name: String(raw.name),
    price: Number(raw.price ?? 0),
    billingType: raw.billing_type,
    category,
    instructor: raw.instructor ?? undefined,
    description: raw.description ?? undefined,
    color: raw.color ?? undefined,
    active: Boolean(raw.active),
  } as Activity;
}

function mapJournalRecord(row: any, year: number, month: number): MonthlyRecord {
  const bill = row.bill;
  const checkedActivities: Record<string, boolean> = {};
  const activityQuantities: Record<string, number> = {};
  const activityUnitPrices: Record<string, number> = {};
  for (const item of bill?.items ?? []) {
    if (item.activity_id != null) {
      const id = String(item.activity_id);
      checkedActivities[id] = Number(item.quantity) > 0;
      activityQuantities[id] = (activityQuantities[id] ?? 0) + Number(item.quantity);
      activityUnitPrices[id] = Number(item.unit_price);
    }
  }
  const payments = bill?.payments ?? [];
  const isPaid = bill?.status === 'paid';
  const lastPayment = payments.length ? payments[payments.length - 1] : null;

  return {
    childId: String(row.id),
    year,
    month,
    checkedActivities,
    activityQuantities,
    activityUnitPrices,
    billItems: bill ? bill.items.map((item: any) => ({
      id: String(item.id), activityId: item.activity_id != null ? String(item.activity_id) : undefined,
      name: item.name, billingType: item.billing_type, quantity: Number(item.quantity),
      unitPrice: Number(item.unit_price), amount: Number(item.amount),
    })) : undefined,
    absenceDays: Number(bill?.absence_days ?? 0),
    sickLeaveDays: Number(bill?.sick_leave_days ?? 0),
    dailyFoodDeductionRate: bill ? Number(bill.daily_food_rate ?? 160) : undefined,
    customDeduction: Number(bill?.custom_deduction ?? 0),
    absenceNote: bill?.absence_note ?? '',
    customDiscount: bill ? Number(bill.discount_percent ?? 0) : undefined,
    isPaid,
    paymentDate: lastPayment?.payment_date ? String(lastPayment.payment_date).slice(0, 10) : undefined,
    notes: bill?.notes ?? undefined,
    billId: bill?.id != null ? String(bill.id) : undefined,
    paymentIds: payments.map((p: any) => String(p.id)),
    paidAmount: Number(bill?.paid ?? 0),
    debt: Number(bill?.debt ?? 0),
    status: bill?.status,
    serverSubtotal: bill ? Number(bill.subtotal ?? 0) : undefined,
    serverDiscountAmount: bill ? Number(bill.discount ?? 0) : undefined,
    serverDeductionsTotal: bill ? Number(bill.deductions ?? 0) : undefined,
    serverTotal: bill ? Number(bill.total ?? 0) : undefined,
  };
}


function mapPayment(raw: any): PaymentRecord {
  return {
    id: String(raw.id),
    amount: Number(raw.amount ?? 0),
    paymentDate: String(raw.payment_date ?? '').slice(0, 10),
    paymentMethod: raw.payment_method ?? 'cash',
    reference: raw.reference ?? undefined,
    notes: raw.notes ?? undefined,
    createdBy: raw.created_by != null ? String(raw.created_by) : undefined,
    createdByName: raw.created_by_name ?? raw.creator?.name ?? undefined,
    createdAt: raw.created_at ?? undefined,
  };
}

function mapBill(raw: any): BillSummary {
  return {
    id: String(raw.id),
    year: Number(raw.year),
    month: Number(raw.month),
    status: raw.status ?? 'unpaid',
    subtotal: Number(raw.subtotal ?? 0),
    discountPercent: Number(raw.discount_percent ?? 0),
    discountAmount: Number(raw.discount_amount ?? raw.discount ?? 0),
    deductionsTotal: Number(raw.deductions_total ?? raw.deductions ?? 0),
    total: Number(raw.total ?? 0),
    paid: Number(raw.paid ?? raw.paid_amount ?? 0),
    debt: Number(raw.debt ?? 0),
    absenceDays: Number(raw.absence_days ?? 0),
    sickLeaveDays: Number(raw.sick_leave_days ?? 0),
    dailyFoodRate: Number(raw.daily_food_rate ?? 0),
    customDeduction: Number(raw.custom_deduction ?? 0),
    absenceNote: raw.absence_note ?? undefined,
    notes: raw.notes ?? undefined,
    items: (raw.items ?? []).map((item: any) => ({
      id: String(item.id),
      activityId: item.activity_id != null ? String(item.activity_id) : undefined,
      name: String(item.name ?? ''),
      billingType: item.billing_type ?? 'monthly',
      quantity: Number(item.quantity ?? 0),
      unitPrice: Number(item.unit_price ?? 0),
      amount: Number(item.amount ?? 0),
    })),
    payments: (raw.payments ?? []).map(mapPayment),
  };
}

function mapChildAccount(raw: any): ChildAccount {
  return {
    child: mapChild(raw.child),
    summary: {
      billed: Number(raw.summary?.billed ?? 0),
      paid: Number(raw.summary?.paid ?? 0),
      debt: Number(raw.summary?.debt ?? 0),
      months: Number(raw.summary?.months ?? 0),
    },
    bills: (raw.bills ?? []).map(mapBill),
  };
}

function paymentPayload(input: PaymentInput) {
  return {
    amount: input.amount,
    payment_date: input.paymentDate,
    payment_method: input.paymentMethod,
    reference: input.reference || null,
    notes: input.notes || null,
  };
}

export const authApi = {
  async login(email: string, password: string, remember = true): Promise<AuthUser> {
    const payload = await apiFetch<{ token: string; user: any }>('/auth/login', {
      method: 'POST',
      body: JSON.stringify({ email, password }),
    });
    saveToken(payload.token, remember);
    return mapUser(payload.user);
  },
  async me(): Promise<AuthUser> {
    return mapUser(await apiFetch<any>('/auth/me'));
  },
  async logout(): Promise<void> {
    try {
      if (getToken()) await apiFetch('/auth/logout', { method: 'POST' });
    } finally {
      clearToken();
    }
  },
};

export const groupsApi = {
  async list(): Promise<Group[]> {
    return (await apiFetch<any[]>('/groups')).map(mapGroup);
  },
  async create(name: string, sortOrder: number): Promise<Group> {
    const raw = await apiFetch<any>('/groups', {
      method: 'POST',
      body: JSON.stringify({ name: name.trim(), sort_order: sortOrder }),
    });
    return mapGroup(raw);
  },
  async update(group: Group): Promise<Group> {
    const raw = await apiFetch<any>(`/groups/${group.id}`, {
      method: 'PUT',
      body: JSON.stringify({ name: group.name.trim(), sort_order: group.sortOrder ?? 0 }),
    });
    return mapGroup(raw);
  },
  async remove(id: string): Promise<void> {
    await apiFetch(`/groups/${id}`, { method: 'DELETE' });
  },
};

export const childrenApi = {
  async list(): Promise<Child[]> {
    const payload = await apiFetch<{ data: any[] }>('/children?active=1');
    return payload.data.map(mapChild);
  },
  async account(id: string): Promise<ChildAccount> {
    return mapChildAccount(await apiFetch<any>(`/children/${id}/account`));
  },
  async create(child: Omit<Child, 'id'>, groupId: string): Promise<Child> {
    const raw = await apiFetch<any>('/children', {
      method: 'POST',
      body: JSON.stringify(childPayload(child, groupId)),
    });
    return mapChild(raw);
  },
  async update(child: Child, groupId: string): Promise<Child> {
    const raw = await apiFetch<any>(`/children/${child.id}`, {
      method: 'PUT',
      body: JSON.stringify(childPayload(child, groupId)),
    });
    return mapChild(raw);
  },
  async remove(id: string): Promise<void> {
    await apiFetch(`/children/${id}`, { method: 'DELETE' });
  },
};

function childPayload(child: Omit<Child, 'id'> | Child, groupId: string) {
  return {
    group_id: Number(groupId),
    full_name: child.fullName,
    birth_date: child.birthDate || null,
    parent_name: child.parentName || null,
    parent_phone: child.parentPhone || null,
    discount_percent: child.discountPercent ?? 0,
    notes: child.notes || null,
    active: child.active,
  };
}

export const settingsApi = {
  get: (): Promise<KindergartenInfo> => apiFetch<KindergartenInfo>('/settings'),
  update: (info: KindergartenInfo): Promise<KindergartenInfo> => apiFetch<KindergartenInfo>('/settings', {
    method: 'PUT',
    body: JSON.stringify({
      name: info.name,
      edrpou: info.edrpou,
      address: info.address,
      phone: info.phone,
      email: info.email,
      iban: info.iban,
      bank_name: info.bankName,
      daily_food_rate: info.dailyFoodRate,
      receipt_contact_phone: info.receiptContactPhone,
      receipt_contact_email: info.receiptContactEmail,
      payment_purpose_template: info.paymentPurposeTemplate,
      receipt_note: info.receiptNote,
    }),
  }),
  uploadLogo: (file: File): Promise<KindergartenInfo> => {
    const body = new FormData();
    body.append('logo', file);
    return apiFetch<KindergartenInfo>('/settings/receipt-logo', { method: 'POST', body });
  },
  removeLogo: (): Promise<KindergartenInfo> => apiFetch<KindergartenInfo>('/settings/receipt-logo', { method: 'DELETE' }),
};

const mapFinanceOption = (raw: any): FinanceOption => ({
  id: String(raw.id),
  type: raw.type,
  code: String(raw.code),
  name: String(raw.name),
  sortOrder: Number(raw.sort_order ?? 0),
  locked: Boolean(raw.locked),
  icon: raw.icon ?? undefined,
});

export const financeOptionsApi = {
  async updateIcon(option: FinanceOption, icon: string): Promise<FinanceOption> {
    return mapFinanceOption(await apiFetch<any>(`/finance-options/${option.id}`, { method: 'PUT', body: JSON.stringify({ icon }) }));
  },
  async list(): Promise<FinanceOption[]> {
    return (await apiFetch<any[]>('/finance-options')).map(mapFinanceOption);
  },
  async create(type: FinanceOption['type'], name: string): Promise<FinanceOption> {
    return mapFinanceOption(await apiFetch<any>('/finance-options', { method: 'POST', body: JSON.stringify({ type, name }) }));
  },
  async update(option: FinanceOption, name: string): Promise<FinanceOption> {
    return mapFinanceOption(await apiFetch<any>(`/finance-options/${option.id}`, { method: 'PUT', body: JSON.stringify({ name }) }));
  },
  async remove(option: FinanceOption): Promise<void> {
    await apiFetch(`/finance-options/${option.id}`, { method: 'DELETE' });
  },
};

export const activitiesApi = {
  async list(year?: number, month?: number): Promise<Activity[]> {
    const query = year && month ? `?year=${year}&month=${month}` : '';
    return (await apiFetch<any[]>(`/activities${query}`)).map(mapActivity);
  },
  async create(activity: Omit<Activity, 'id'>): Promise<Activity> {
    return mapActivity(await apiFetch<any>('/activities', {
      method: 'POST',
      body: JSON.stringify(activityPayload(activity)),
    }));
  },
  async update(activity: Activity): Promise<Activity> {
    return mapActivity(await apiFetch<any>(`/activities/${activity.id}`, {
      method: 'PUT',
      body: JSON.stringify(activityPayload(activity)),
    }));
  },
  async remove(id: string): Promise<void> {
    await apiFetch(`/activities/${id}`, { method: 'DELETE' });
  },
};

export const subscriptionTariffsApi = {
  async list(): Promise<SubscriptionTariff[]> {
    const rows = await apiFetch<any[]>('/subscription-tariffs');
    return rows.map((row) => ({
      activityId: String(row.activityId),
      name: String(row.name),
      basePrice: Number(row.basePrice),
      periods: (row.periods ?? []).map((period: any) => ({
        year: Number(period.year), month: Number(period.month), price: Number(period.price),
      })),
    }));
  },
  async update(activityId: string, year: number, month: number, price: number): Promise<SubscriptionTariff[]> {
    await apiFetch(`/subscription-tariffs/${activityId}`, {
      method: 'PUT',
      body: JSON.stringify({ year, month, price }),
    });
    return this.list();
  },
};

function activityPayload(activity: Omit<Activity, 'id'> | Activity) {
  return {
    name: activity.name,
    price: activity.price,
    billing_type: activity.billingType,
    category: activity.category,
    instructor: activity.instructor || null,
    description: activity.description || null,
    color: activity.color || null,
    active: activity.active,
  };
}

export interface JournalCarryForwardPreview {
  sourceYear: number; sourceMonth: number; targetYear: number; targetMonth: number;
  childrenCount: number; itemsCount: number; lessonsCount: number; skippedCount: number;
  inactiveItemsCount: number; total: number; targetClosed: boolean; previewHash: string;
}

export interface JournalResetPreview {
  year: number; month: number; closed: boolean; crossPeriodPayments: boolean; previewHash: string;
  counts: { monthly_bills: number; monthly_bill_items: number; payments: number; payrolls: number; payroll_payments: number; expenses: number };
}

export const journalApi = {
  previewReset: (year: number, month: number) => apiFetch<JournalResetPreview>(`/journal/reset?year=${year}&month=${month}`),
  reset: (year: number, month: number, previewHash: string) => apiFetch<{ backup: string }>('/journal/reset', {
    method: 'POST', body: JSON.stringify({ year, month, preview_hash: previewHash, confirmation: 'CLEAR_MONTH' }),
  }),
  previewCarryForward: (year: number, month: number) => apiFetch<JournalCarryForwardPreview>(`/journal/carry-forward?year=${year}&month=${month}`),
  carryForward: (year: number, month: number, previewHash: string) => apiFetch<JournalCarryForwardPreview>('/journal/carry-forward', {
    method: 'POST', body: JSON.stringify({ year, month, preview_hash: previewHash, confirmation: 'COPY_NEXT_MONTH' }),
  }),
  async load(year: number, month: number): Promise<MonthlyRecord[]> {
    const payload = await apiFetch<{ year: number; month: number; children: any[] }>(
      `/journal?year=${year}&month=${month}`,
    );
    return payload.children.map((row) => mapJournalRecord(row, Number(payload.year), Number(payload.month)));
  },

  async setActivity(childId: string, activityId: string, year: number, month: number, checked: boolean, quantity?: number): Promise<void> {
    await apiFetch('/journal/activity', {
      method: 'PUT',
      body: JSON.stringify({
        child_id: Number(childId),
        activity_id: Number(activityId),
        year,
        month,
        checked,
        ...(quantity !== undefined ? { quantity } : {}),
      }),
    });
  },

  async saveBill(
    child: Child,
    record: MonthlyRecord,
    activities: Activity[],
    defaultDailyFoodRate: number,
  ): Promise<void> {
    const items = activities
      .filter((activity) => record.checkedActivities?.[activity.id])
      .map((activity) => ({ activity_id: Number(activity.id), quantity: record.activityQuantities?.[activity.id] ?? 1 }));

    const payload = {
      child_id: Number(child.id),
      year: record.year,
      month: record.month,
      discount_percent: record.customDiscount ?? child.discountPercent ?? 0,
      absence_days: record.absenceDays ?? 0,
      sick_leave_days: record.sickLeaveDays ?? 0,
      daily_food_rate: record.dailyFoodDeductionRate ?? defaultDailyFoodRate,
      custom_deduction: record.customDeduction ?? 0,
      absence_note: record.absenceNote || null,
      notes: record.notes || null,
      ...(!record.billId ? { items } : {}),
    };

    await apiFetch(record.billId ? `/bills/${record.billId}` : '/bills', {
      method: record.billId ? 'PUT' : 'POST',
      body: JSON.stringify(payload),
    });
  },

  async addPayment(billId: string, amount: number): Promise<void> {
    await apiFetch(`/bills/${billId}/payments`, {
      method: 'POST',
      body: JSON.stringify({
        amount,
        payment_date: new Date().toISOString().slice(0, 10),
        payment_method: 'cash',
      }),
    });
  },

  async deletePayment(paymentId: string): Promise<void> {
    await apiFetch(`/payments/${paymentId}`, { method: 'DELETE' });
  },
};

export const billsApi = {
  async get(id: string): Promise<BillSummary> {
    const raw = await apiFetch<any>(`/bills/${id}`);
    return mapBill({
      ...raw,
      paid: raw.paid_amount ?? raw.paid ?? (raw.payments ?? []).reduce((sum: number, p: any) => sum + Number(p.amount ?? 0), 0),
      debt: raw.debt ?? Math.max(0, Number(raw.total ?? 0) - (raw.payments ?? []).reduce((sum: number, p: any) => sum + Number(p.amount ?? 0), 0)),
    });
  },
  async downloadReceipt(id: string, filename?: string): Promise<void> {
    const token = getToken();
    const response = await fetch(`${API_BASE}/bills/${id}/receipt.pdf`, {
      headers: {
        Accept: 'application/pdf',
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
      },
    });
    if (!response.ok) {
      if (response.status === 401) clearToken();
      throw new ApiError(`Не вдалося сформувати PDF-квитанцію (HTTP ${response.status})`, response.status);
    }
    const blob = await response.blob();
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = filename || `receipt-${id}.pdf`;
    document.body.appendChild(link);
    link.click();
    link.remove();
    URL.revokeObjectURL(url);
  },
};

export const paymentsApi = {
  async create(billId: string, input: PaymentInput): Promise<void> {
    await apiFetch(`/bills/${billId}/payments`, {
      method: 'POST',
      body: JSON.stringify(paymentPayload(input)),
    });
  },
  async update(paymentId: string, input: PaymentInput): Promise<void> {
    await apiFetch(`/payments/${paymentId}`, {
      method: 'PUT',
      body: JSON.stringify(paymentPayload(input)),
    });
  },
  async remove(paymentId: string): Promise<void> {
    await apiFetch(`/payments/${paymentId}`, { method: 'DELETE' });
  },
};

export function mapEmployee(raw: any): Employee {
  return {
    id: String(raw.id),
    fullName: String(raw.full_name ?? ''),
    position: String(raw.position ?? ''),
    phone: String(raw.phone ?? ''),
    baseSalary: Number(raw.base_salary ?? 0),
    taxRate: Number(raw.tax_rate ?? 0),
    startDate: raw.start_date ? String(raw.start_date).slice(0, 10) : undefined,
    notes: raw.notes ?? undefined,
    active: Boolean(raw.active),
  };
}

function employeePayload(employee: Omit<Employee, 'id'> | Employee) {
  return {
    full_name: employee.fullName,
    position: employee.position,
    phone: employee.phone || null,
    base_salary: employee.baseSalary,
    tax_rate: employee.taxRate ?? 0,
    start_date: employee.startDate || null,
    notes: employee.notes || null,
    active: employee.active,
  };
}

export function mapPayroll(raw: any): SalaryPayment {
  return {
    id: String(raw.id),
    employeeId: String(raw.employee_id),
    year: Number(raw.year),
    month: Number(raw.month),
    baseSalary: Number(raw.base_salary ?? 0),
    bonus: Number(raw.bonus ?? 0),
    deductions: Number(raw.deductions ?? 0),
    finalAmount: Number(raw.final_amount ?? 0),
    status: raw.status === 'paid' ? 'paid' : raw.status === 'partial' ? 'partial' : 'pending',
    paidAmount: Number(raw.paid_amount ?? 0), remainingAmount: Number(raw.remaining_amount ?? 0),
    payments: (raw.payments ?? []).map((p: any) => ({id: String(p.id), amount: Number(p.amount), stage: p.stage, paymentMethod: p.payment_method, isOfficial: p.is_official, paymentDate: p.payment_date ? String(p.payment_date).slice(0,10) : undefined, notes: p.notes ?? undefined, legacy: Boolean(p.legacy)})),
    paymentDate: raw.payment_date ? String(raw.payment_date).slice(0, 10) : undefined,
    notes: raw.notes ?? undefined,
  };
}

function payrollPayload(payment: SalaryPayment) {
  return {
    employee_id: Number(payment.employeeId),
    year: payment.year,
    month: payment.month,
    base_salary: payment.baseSalary,
    bonus: payment.bonus ?? 0,
    deductions: payment.deductions ?? 0,
    notes: payment.notes || null,
  };
}

export function mapExpense(raw: any): Expense {
  const date = String(raw.expense_date ?? '').slice(0, 10);
  const [year, month] = date.split('-').map(Number);
  return {
    id: String(raw.id),
    title: String(raw.title ?? ''),
    amount: Number(raw.amount ?? 0),
    category: raw.category,
    date,
    year: year || 0,
    month: month || 0,
    supplier: raw.supplier ?? undefined,
    invoiceNumber: raw.invoice_number ?? undefined,
    paymentMethod: raw.payment_method ?? 'cash',
    notes: raw.notes ?? undefined,
    source: raw.source ?? 'manual',
    payrollYear: raw.payroll_year == null ? undefined : Number(raw.payroll_year),
    payrollMonth: raw.payroll_month == null ? undefined : Number(raw.payroll_month),
    isOfficial: raw.is_official == null ? null : Boolean(Number(raw.is_official)),
  } as Expense;
}

function expensePayload(expense: Omit<Expense, 'id'> | Expense) {
  return {
    title: expense.title,
    amount: expense.amount,
    category: expense.category,
    expense_date: expense.date,
    supplier: expense.supplier || null,
    invoice_number: expense.invoiceNumber || null,
    payment_method: expense.paymentMethod,
    notes: expense.notes || null,
  };
}

function mapFinancialReport(raw: any): FinancialReport {
  return {
    period: { year: Number(raw.period.year), month: Number(raw.period.month) },
    revenue: {
      billed: Number(raw.revenue.billed ?? 0),
      receivedForBills: Number(raw.revenue.received_for_bills ?? 0),
      cashReceived: Number(raw.revenue.cash_received ?? 0),
      debt: Number(raw.revenue.debt ?? 0),
    },
    salary: {
      accrued: Number(raw.salary.accrued ?? 0),
      cashPaid: Number(raw.salary.cash_paid ?? 0),
    },
    expenses: { total: Number(raw.expenses.total ?? 0) },
    result: {
      accrualResult: Number(raw.result.accrual_result ?? 0),
      cashFlow: Number(raw.result.cash_flow ?? 0),
    },
  };
}

export const employeesApi = {
  async list(): Promise<Employee[]> {
    return (await apiFetch<any[]>('/employees')).map(mapEmployee);
  },
  async create(employee: Omit<Employee, 'id'>): Promise<Employee> {
    return mapEmployee(await apiFetch<any>('/employees', {
      method: 'POST',
      body: JSON.stringify(employeePayload(employee)),
    }));
  },
  async update(employee: Employee): Promise<Employee> {
    return mapEmployee(await apiFetch<any>(`/employees/${employee.id}`, {
      method: 'PUT',
      body: JSON.stringify(employeePayload(employee)),
    }));
  },
  async remove(id: string): Promise<void> {
    await apiFetch(`/employees/${id}`, { method: 'DELETE' });
  },
};

export const payrollApi = {
  async addPayment(payrollId: string, input: PayrollDisbursementInput): Promise<SalaryPayment> {
    return mapPayroll(await apiFetch<any>(`/payrolls/${payrollId}/payments`, {method:'POST', body:JSON.stringify({amount:input.amount, stage:input.stage, payment_method:input.paymentMethod, is_official:input.isOfficial, payment_date:input.paymentDate, notes:input.notes || null, request_id:input.requestId})}));
  },
  async list(year: number, month: number): Promise<SalaryPayment[]> {
    return (await apiFetch<any[]>(`/payrolls?year=${year}&month=${month}`)).map(mapPayroll);
  },
  async save(payment: SalaryPayment): Promise<SalaryPayment> {
    return mapPayroll(await apiFetch<any>('/payrolls', {
      method: 'POST',
      body: JSON.stringify(payrollPayload(payment)),
    }));
  },
};

export const expensesApi = {
  async list(year: number, month: number): Promise<Expense[]> {
    const base = `/expenses?year=${year}&month=${month}`;
    const payload = await apiFetch<{ data: any[]; last_page: number }>(base);
    const rows = [...payload.data];
    for (let page = 2; page <= payload.last_page; page++) {
      const next = await apiFetch<{ data: any[] }>(`${base}&page=${page}`);
      rows.push(...next.data);
    }
    return rows.map(mapExpense);
  },
  async create(expense: Omit<Expense, 'id'>): Promise<Expense> {
    return mapExpense(await apiFetch<any>('/expenses', {
      method: 'POST',
      body: JSON.stringify(expensePayload(expense)),
    }));
  },
  async update(expense: Expense): Promise<Expense> {
    return mapExpense(await apiFetch<any>(`/expenses/${expense.id}`, {
      method: 'PUT',
      body: JSON.stringify(expensePayload(expense)),
    }));
  },
  async remove(id: string): Promise<void> {
    await apiFetch(`/expenses/${id}`, { method: 'DELETE' });
  },
};

export const reportsApi = {
  async monthly(year: number, month: number): Promise<FinancialReport> {
    return mapFinancialReport(await apiFetch<any>(`/reports/monthly?year=${year}&month=${month}`));
  },
  async downloadMonthlyCsv(year: number, month: number): Promise<void> {
    const token = getToken();
    const response = await fetch(`${API_BASE}/reports/monthly/csv?year=${year}&month=${month}`, {
      headers: {
        Accept: 'text/csv',
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
      },
    });
    if (!response.ok) {
      if (response.status === 401) clearToken();
      throw new ApiError(`Не вдалося завантажити фінансовий CSV (HTTP ${response.status})`, response.status);
    }
    const blob = await response.blob();
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `Фінансовий_звіт_${year}_${String(month).padStart(2, '0')}.csv`;
    document.body.appendChild(link);
    link.click();
    link.remove();
    URL.revokeObjectURL(url);
  },
};

export interface ManagedUser {
  id: number;
  name: string;
  email: string;
  role: 'director' | 'accountant' | 'educator';
  active: boolean;
}

export interface AuditEntry {
  id: number;
  actor_name: string;
  action: string;
  subject_type: string;
  details: Record<string, unknown>;
  created_at: string;
}

export interface BackupFile {
  name: string;
  size: number;
  createdAt: string;
}

export const administrationApi = {
  users: () => apiFetch<ManagedUser[]>('/users'),
  createUser: (data: Omit<ManagedUser, 'id'> & { password: string }) => apiFetch<ManagedUser>('/users', { method: 'POST', body: JSON.stringify(data) }),
  updateUser: (id: number, data: Omit<ManagedUser, 'id'> & { password?: string }) => apiFetch<ManagedUser>(`/users/${id}`, { method: 'PUT', body: JSON.stringify(data) }),
  audit: () => apiFetch<AuditEntry[]>('/audit-logs'),
  backups: () => apiFetch<BackupFile[]>('/backups'),
  async downloadBackup(name: string): Promise<void> {
    const response = await fetch(`${API_BASE}/backups/${encodeURIComponent(name)}`, {
      headers: { Accept: 'application/octet-stream', Authorization: `Bearer ${getToken() ?? ''}` },
    });
    if (!response.ok) throw new ApiError(`Не вдалося завантажити копію (HTTP ${response.status})`, response.status);
    const url = URL.createObjectURL(await response.blob());
    const link = document.createElement('a');
    link.href = url;
    link.download = name;
    document.body.appendChild(link);
    link.click();
    link.remove();
    window.setTimeout(() => URL.revokeObjectURL(url), 60_000);
  },
};

export interface MonthClosureStatus {
  year: number;
  month: number;
  closed: boolean;
  closedAt: string | null;
  closedBy: string | null;
}

export const monthClosureApi = {
  get: (year: number, month: number) => apiFetch<MonthClosureStatus>(`/month-closure?year=${year}&month=${month}`),
  close: (year: number, month: number) => apiFetch<MonthClosureStatus>('/month-closure/close', {
    method: 'POST', body: JSON.stringify({ year, month, confirmation: 'CLOSE' }),
  }),
  reopen: (year: number, month: number) => apiFetch<MonthClosureStatus>('/month-closure/reopen', {
    method: 'POST', body: JSON.stringify({ year, month, confirmation: 'REOPEN' }),
  }),
};

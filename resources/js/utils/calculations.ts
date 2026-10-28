import { Activity, Child, MonthlyRecord } from '../types';

export const DEFAULT_DAILY_FOOD_RATE = 160; // грн на день харчування (базова вартість дня харчування)

export function isSubscriptionActivity(activity: Pick<Activity, 'name'>): boolean {
  return activity.name.trim().toLocaleLowerCase('uk-UA').startsWith('абонемент');
}

export function calculateChildTotal(
  child: Child,
  record: MonthlyRecord | undefined,
  activities: Activity[]
): {
  subtotal: number;
  discountAmount: number;
  absenceDays: number;
  sickLeaveDays: number;
  dailyRate: number;
  absenceDeduction: number;
  sickLeaveDeduction: number;
  customDeduction: number;
  totalDeductions: number;
  total: number;
  selectedCount: number;
  items: Array<{ activity: Activity; price: number; quantity: number; unitPrice: number }>;
} {
  const absenceDays = record?.absenceDays || 0;
  const sickLeaveDays = record?.sickLeaveDays || 0;
  const dailyRate =
    record?.dailyFoodDeductionRate !== undefined
      ? record.dailyFoodDeductionRate
      : DEFAULT_DAILY_FOOD_RATE;
  const customDeduction = record?.customDeduction || 0;

  if (!record || !record.checkedActivities) {
    return {
      subtotal: 0,
      discountAmount: 0,
      absenceDays,
      sickLeaveDays,
      dailyRate,
      absenceDeduction: 0,
      sickLeaveDeduction: 0,
      customDeduction,
      totalDeductions: 0,
      total: 0,
      selectedCount: 0,
      items: [],
    };
  }

  const items: Array<{ activity: Activity; price: number; quantity: number; unitPrice: number }> = [];
  let subtotal = 0;

  if (record.billItems) {
    record.billItems.forEach((snapshot) => {
      const source = activities.find((a) => a.id === snapshot.activityId);
      const activity: Activity = {
        ...(source ?? { id: snapshot.activityId ?? snapshot.id, category: 'creative', active: false }),
        name: snapshot.name, price: snapshot.unitPrice, billingType: snapshot.billingType,
      };
      items.push({ activity, price: snapshot.amount, quantity: snapshot.quantity, unitPrice: snapshot.unitPrice });
      subtotal += snapshot.amount;
    });
  } else {
  activities.forEach((act) => {
    if (record.checkedActivities[act.id]) {
      const quantity = record.activityQuantities?.[act.id] ?? 1;
      const unitPrice = record.activityUnitPrices?.[act.id] ?? act.price;
      const price = Math.round(quantity * unitPrice * 100) / 100;
      items.push({ activity: act, price, quantity, unitPrice });
      subtotal += price;
    }
  });
  }

  const discountPercent =
    record.customDiscount !== undefined
      ? record.customDiscount
      : child.discountPercent || 0;

  const subscriptionSubtotal = items
    .filter(({ activity }) => isSubscriptionActivity(activity))
    .reduce((sum, item) => sum + item.price, 0);
  const discountAmount = Math.round(subscriptionSubtotal * discountPercent) / 100;
  const amountAfterDiscount = Math.max(0, subtotal - discountAmount);

  // Віднімання за лікарняні та дні відсутності дитини
  const foodItem = items.find(({ activity }) => activity.billingType === 'daily_food');
  const absenceLimit = foodItem
    ? Math.min(foodItem.price, amountAfterDiscount)
    : amountAfterDiscount;
  const sickLeaveDeduction = Math.min(sickLeaveDays * dailyRate, absenceLimit);
  const absenceDeduction = Math.min(absenceDays * dailyRate, Math.max(0, absenceLimit - sickLeaveDeduction));
  const totalDeductions = Math.min(amountAfterDiscount, sickLeaveDeduction + absenceDeduction + customDeduction);

  const localTotal = Math.max(0, amountAfterDiscount - totalDeductions);

  // Після інтеграції з Laravel сервер є джерелом правди для фінансових сум.
  // Локальний розрахунок лишається fallback для ще не створеного нарахування.
  const resolvedSubtotal = record.serverSubtotal ?? subtotal;
  const resolvedDiscountAmount = record.serverDiscountAmount ?? discountAmount;
  const resolvedTotalDeductions = record.serverDeductionsTotal ?? totalDeductions;
  const resolvedTotal = record.serverTotal ?? localTotal;

  return {
    subtotal: resolvedSubtotal,
    discountAmount: resolvedDiscountAmount,
    absenceDays,
    sickLeaveDays,
    dailyRate,
    absenceDeduction,
    sickLeaveDeduction,
    customDeduction,
    totalDeductions: resolvedTotalDeductions,
    total: resolvedTotal,
    selectedCount: items.length,
    items,
  };
}

export function formatCurrency(amount: number): string {
  return new Intl.NumberFormat('uk-UA', {
    style: 'decimal',
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(amount) + ' ₴';
}

export function exportJournalToCSV(
  children: Child[],
  activities: Activity[],
  records: MonthlyRecord[],
  monthName: string,
  year: number
): void {
  const headers = [
    'ПІБ дитини',
    'Група',
    'Батьки',
    'Телефон',
    ...activities.map((a) => `"${a.name} (${a.price} грн)"`),
    'Знижка на абонемент %',
    'Днів лікарняного',
    'Днів пропусків',
    'Перерахунок/зняття (грн)',
    'Разом до сплати (грн)',
    'Статус оплати',
    'Примітка пропусків',
  ];

  const rows = children.map((child) => {
    const record = records.find((r) => r.childId === child.id);
    const { total, sickLeaveDays, absenceDays, totalDeductions } =
      calculateChildTotal(child, record, activities);
    const discount =
      record?.customDiscount !== undefined
        ? record.customDiscount
        : child.discountPercent || 0;

    const activityChecks = activities.map((act) =>
      act.billingType === 'per_lesson'
        ? String(record?.activityQuantities?.[act.id] ?? (record?.checkedActivities?.[act.id] ? 1 : 0))
        : record?.checkedActivities?.[act.id] ? 'ТАК' : 'НІ'
    );

    const isPaid = record?.isPaid ? 'Сплачено' : 'Очікує оплати';
    const note = record?.absenceNote || '';

    return [
      `"${child.fullName}"`,
      `"${child.group}"`,
      `"${child.parentName}"`,
      `"${child.parentPhone}"`,
      ...activityChecks,
      `${discount}%`,
      sickLeaveDays,
      absenceDays,
      totalDeductions,
      total,
      `"${isPaid}"`,
      `"${note}"`,
    ];
  });

  const csvContent =
    '\uFEFF' + [headers.join(','), ...rows.map((e) => e.join(','))].join('\n');
  const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.setAttribute('href', url);
  link.setAttribute('download', `Бухгалтерія_дитсадок_${monthName}_${year}.csv`);
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
}

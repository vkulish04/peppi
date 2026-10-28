<?php

namespace App\Services;

use App\Models\Expense;
use App\Models\MonthlyBill;
use App\Models\Payment;
use App\Models\Payroll;

class ReportService
{
    public function __construct(private PayrollService $payrolls) {}

    public function monthly(int $year, int $month): array
    {
        // Створюємо snapshot окладів за місяць до формування звіту.
        $this->payrolls->ensurePeriod($year, $month);

        $billed = (float) MonthlyBill::where(compact('year', 'month'))->sum('total');

        // Скільки сплачено саме за рахунки обраного розрахункового місяця.
        $receivedForBills = (float) Payment::whereHas(
            'bill',
            fn ($q) => $q->where('year', $year)->where('month', $month)
        )->sum('amount');

        // Реальний прихід грошей у календарному місяці, незалежно від місяця рахунку.
        $cashReceived = (float) Payment::whereYear('payment_date', $year)
            ->whereMonth('payment_date', $month)
            ->sum('amount');

        $salaryAccrued = (float) Payroll::where(compact('year', 'month'))->sum('final_amount');
        $salaryPaid = (float) \App\Models\PayrollPayment::query()
            ->whereYear('payment_date', $year)
            ->whereMonth('payment_date', $month)
            ->sum('amount');

        $expenses = (float) Expense::whereYear('expense_date', $year)
            ->whereMonth('expense_date', $month)
            ->sum('amount');

        return [
            'period' => ['year' => $year, 'month' => $month],
            'revenue' => [
                'billed' => round($billed, 2),
                'received_for_bills' => round($receivedForBills, 2),
                'cash_received' => round($cashReceived, 2),
                'debt' => round(max(0, $billed - $receivedForBills), 2),
            ],
            'salary' => [
                'accrued' => round($salaryAccrued, 2),
                'cash_paid' => round($salaryPaid, 2),
            ],
            'expenses' => ['total' => round($expenses, 2)],
            'result' => [
                'accrual_result' => round($billed - $salaryAccrued - $expenses, 2),
                'cash_flow' => round($cashReceived - $salaryPaid - $expenses, 2),
            ],
        ];
    }
}

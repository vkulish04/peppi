<?php

namespace App\Services;

use Illuminate\Database\Query\Builder;
use Illuminate\Support\Facades\DB;

class ExpenseLedger
{
    public function query(?int $year = null, ?int $month = null): Builder
    {
        $expenses = DB::table('expenses')->selectRaw("CAST(id AS CHAR) AS id, title, amount, category, expense_date, supplier, invoice_number, payment_method, notes, 'manual' AS source, NULL AS payroll_year, NULL AS payroll_month, NULL AS is_official");
        $salary = DB::table('payroll_payments AS payment')
            ->join('payrolls AS payroll', 'payroll.id', '=', 'payment.payroll_id')
            ->leftJoin('employees AS employee', 'employee.id', '=', 'payroll.employee_id')
            ->whereNotNull('payment.payment_date')
            ->selectRaw("CONCAT('payroll-', payment.id) AS id, CONCAT(CASE WHEN payment.stage = 'advance' THEN 'Аванс — ' ELSE 'Зарплата — ' END, COALESCE(employee.full_name, 'Працівник')) AS title, payment.amount, 'salary' AS category, payment.payment_date AS expense_date, employee.full_name AS supplier, NULL AS invoice_number, CASE WHEN payment.payment_method = 'bank' THEN 'bank_transfer' ELSE payment.payment_method END AS payment_method, payment.notes, 'payroll' AS source, payroll.year AS payroll_year, payroll.month AS payroll_month, payment.is_official");
        foreach ([[$expenses, 'expense_date'], [$salary, 'payment.payment_date']] as [$query, $column]) {
            if ($year !== null) $query->whereYear($column, $year);
            if ($month !== null) $query->whereMonth($column, $month);
        }
        // Salary payments are projected into the ledger; no duplicate expenses are written.
        return DB::query()->fromSub($expenses->unionAll($salary), 'ledger')->orderByDesc('expense_date')->orderByDesc('id');
    }
}

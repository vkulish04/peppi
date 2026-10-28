<?php

namespace App\Services;

use App\Enums\PayrollStatus;
use App\Models\Employee;
use App\Models\Payroll;
use App\Support\NoveltySalary;
use Carbon\CarbonImmutable;
use Illuminate\Support\Collection;
use Illuminate\Support\Facades\DB;

class PayrollService
{
    public function __construct(private MonthClosure $closure) {}
    /**
     * Гарантує наявність помісячного snapshot окладу для всіх працівників,
     * які повинні потрапляти у відомість обраного місяця.
     */
    public function ensurePeriod(int $year, int $month): Collection
    {
        // An explicitly cleared period stays empty until payrolls are entered again.
        if ($this->closure->isClosed($year, $month) || DB::table('finance_period_resets')->where('year', $year)->where('month', $month)->exists()) {
            return Payroll::with('employee', 'payments')
                ->where('year', $year)
                ->where('month', $month)
                ->orderBy('employee_id')
                ->get();
        }

        $periodEnd = CarbonImmutable::create($year, $month, 1)->endOfMonth()->toDateString();

        $employees = Employee::query()
            ->where('active', true)
            ->where(function ($query) use ($periodEnd) {
                $query->whereNull('start_date')
                    ->orWhereDate('start_date', '<=', $periodEnd);
            })
            ->orderBy('full_name')
            ->get();

        foreach ($employees as $employee) {
            $baseSalary = NoveltySalary::appliesTo($employee->position) ? 0 : (float) $employee->base_salary;
            Payroll::firstOrCreate(
                [
                    'employee_id' => $employee->id,
                    'year' => $year,
                    'month' => $month,
                ],
                [
                    'base_salary' => $baseSalary,
                    'bonus' => 0,
                    'deductions' => 0,
                    'final_amount' => $baseSalary,
                    'status' => PayrollStatus::UNPAID,
                    'payment_date' => null,
                    'notes' => null,
                ],
            );
        }

        Payroll::query()
            ->where('year', $year)
            ->where('month', $month)
            ->whereHas('employee', fn ($query) => $query->whereIn('position', NoveltySalary::POSITIONS))
            ->update(['base_salary' => 0, 'bonus' => 0, 'deductions' => 0, 'final_amount' => 0]);

        return Payroll::with('employee', 'payments')
            ->where('year', $year)
            ->where('month', $month)
            ->orderBy('employee_id')
            ->get();
    }

    public function createOrUpdate(Employee $employee, int $year, int $month, array $data): Payroll
    {
        return DB::transaction(function () use ($employee, $year, $month, $data) {
            $this->closure->assertOpen($year, $month);
            $payroll = Payroll::firstOrCreate(['employee_id' => $employee->id, 'year' => $year, 'month' => $month],
                ['base_salary' => 0, 'final_amount' => 0, 'status' => PayrollStatus::UNPAID]);
            $payroll = Payroll::whereKey($payroll->id)->lockForUpdate()->firstOrFail();
            $novelty = NoveltySalary::appliesTo($employee->position);
            $base = $novelty ? 0 : (float) ($data['base_salary'] ?? $employee->base_salary);
            $bonus = $novelty ? 0 : (float) ($data['bonus'] ?? 0);
            $deductions = $novelty ? 0 : (float) ($data['deductions'] ?? 0);
            $final = max(0, round($base + $bonus - $deductions, 2));
            $paid = $payroll->paid_amount;
            if ($paid > $final) throw \Illuminate\Validation\ValidationException::withMessages(['final_amount' => 'Нарахування не може бути меншим за вже виплачену суму.']);
            if (($data['status'] ?? null) === 'paid' && $paid < $final) throw \Illuminate\Validation\ValidationException::withMessages(['status' => 'Додайте фактичну виплату через кнопку «Виплати».']);
            $status = $paid > 0 ? ($paid >= $final ? PayrollStatus::PAID : PayrollStatus::PARTIAL) : PayrollStatus::UNPAID;
            $payroll->update(['base_salary' => $base, 'bonus' => $bonus, 'deductions' => $deductions,
                'final_amount' => $final, 'status' => $status,
                'payment_date' => $status === PayrollStatus::PAID ? $payroll->payments()->max('payment_date') : null,
                'notes' => $data['notes'] ?? null]);
            return $payroll->fresh(['employee', 'payments']);
        });
    }
}

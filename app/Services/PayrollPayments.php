<?php

namespace App\Services;

use App\Enums\PayrollStatus;
use App\Models\Payroll;
use App\Models\User;
use App\Support\NoveltySalary;
use Illuminate\Support\Facades\DB;
use Illuminate\Validation\ValidationException;

class PayrollPayments
{
    public function __construct(private MonthClosure $closure, private AuditLogger $audit) {}

    public function add(Payroll $payroll, array $data, User $actor): Payroll
    {
        return DB::transaction(function () use ($payroll, $data, $actor) {
            $payroll = Payroll::whereKey($payroll->id)->lockForUpdate()->firstOrFail();
            $this->closure->assertOpen($payroll->year, $payroll->month);
            $this->closure->assertDateOpen($data['payment_date']);
            $existing = \App\Models\PayrollPayment::where('request_id', $data['request_id'])->first();
            if ($existing) {
                if ($existing->payroll_id !== $payroll->id || (float)$existing->amount !== (float)$data['amount'] || $existing->stage !== $data['stage'] || $existing->payment_method !== $data['payment_method'] || $existing->is_official !== (bool)$data['is_official'] || $existing->payment_date->toDateString() !== $data['payment_date'] || ($existing->notes ?? '') !== ($data['notes'] ?? '')) {
                    throw ValidationException::withMessages(['request_id' => 'Цей запит уже використано для іншої виплати.']);
                }
                return $payroll->load('employee', 'payments');
            }
            if (NoveltySalary::appliesTo($payroll->employee->position)) throw ValidationException::withMessages(['amount' => 'Для цієї посади грошова зарплата становить 0 грн.']);
            $amount = round((float)$data['amount'], 2);
            if ($amount <= 0 || $amount > $payroll->remaining_amount) throw ValidationException::withMessages(['amount' => 'Сума має бути більшою за нуль та не перевищувати залишок зарплати.']);
            $payment = $payroll->payments()->create($data + ['created_by' => $actor->id]);
            $paid = $payroll->paid_amount;
            $payroll->update(['status' => $paid >= (float)$payroll->final_amount ? PayrollStatus::PAID : PayrollStatus::PARTIAL,
                'payment_date' => $paid >= (float)$payroll->final_amount ? $payroll->payments()->max('payment_date') : null]);
            $this->audit->record($actor, 'payroll.payment_added', 'payroll', $payroll->id, ['payment_id' => $payment->id, 'amount' => $amount, 'stage' => $data['stage'], 'payment_method' => $data['payment_method'], 'is_official' => (bool)$data['is_official']]);
            return $payroll->load('employee', 'payments');
        });
    }
}

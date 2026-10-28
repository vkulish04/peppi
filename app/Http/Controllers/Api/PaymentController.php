<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Http\Requests\PaymentRequest;
use App\Models\MonthlyBill;
use App\Models\Payment;
use App\Services\BillingService;
use App\Services\MonthClosure;
use Illuminate\Support\Facades\DB;
use Illuminate\Validation\ValidationException;

class PaymentController extends Controller
{
    public function __construct(private BillingService $billing, private MonthClosure $closure) {}

    public function store(PaymentRequest $request, MonthlyBill $bill)
    {
        return response()->json($this->billing->addPayment($bill, $request->validated(), $request->user()->id), 201);
    }

    public function update(PaymentRequest $request, Payment $payment)
    {
        $data = $request->validated();
        $bill = $payment->bill;
        $this->closure->assertOpen($bill->year, $bill->month);
        $this->closure->assertDateOpen($payment->payment_date->toDateString());
        $this->closure->assertDateOpen($data['payment_date']);
        $otherPaid = round((float) $bill->payments()->where('id', '!=', $payment->id)->sum('amount'), 2);
        $maxAmount = max(0, round((float) $bill->total - $otherPaid, 2));
        $amount = round((float) $data['amount'], 2);

        if ($amount - $maxAmount > 0.009) {
            throw ValidationException::withMessages([
                'amount' => 'Сума платежу перевищує залишок, доступний для цього платежу: '.number_format($maxAmount, 2, '.', '').' грн.',
            ]);
        }

        return DB::transaction(function () use ($payment, $data, $amount, $bill) {
            $payment->update([
                'amount' => $amount,
                'payment_date' => $data['payment_date'],
                'payment_method' => $data['payment_method'] ?? 'cash',
                'reference' => $data['reference'] ?? null,
                'notes' => $data['notes'] ?? null,
            ]);
            return $this->billing->recalculate($bill);
        });
    }

    public function destroy(Payment $payment)
    {
        $bill = $payment->bill;
        $this->closure->assertOpen($bill->year, $bill->month);
        $this->closure->assertDateOpen($payment->payment_date->toDateString());
        return DB::transaction(function () use ($payment, $bill) {
            $payment->delete();
            return $this->billing->recalculate($bill);
        });
    }
}

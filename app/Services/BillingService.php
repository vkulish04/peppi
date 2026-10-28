<?php

namespace App\Services;

use App\Enums\BillStatus;
use App\Models\Activity;
use App\Models\Child;
use App\Models\MonthlyBill;
use App\Models\KindergartenSetting;
use Illuminate\Support\Facades\DB;
use Illuminate\Validation\ValidationException;

class BillingService
{
    public function __construct(private SubscriptionPricing $pricing, private MonthClosure $closure) {}

    public function createOrUpdate(Child $child, int $year, int $month, array $data): MonthlyBill
    {
        $this->closure->assertOpen($year, $month);
        return DB::transaction(function () use ($child, $year, $month, $data) {
            $bill = MonthlyBill::firstOrNew([
                'child_id' => $child->id,
                'year' => $year,
                'month' => $month,
            ]);

            $bill->fill([
                'discount_percent' => $data['discount_percent'] ?? $child->discount_percent ?? 0,
                'absence_days' => $data['absence_days'] ?? 0,
                'sick_leave_days' => $data['sick_leave_days'] ?? 0,
                'daily_food_rate' => $data['daily_food_rate'] ?? ($bill->exists ? $bill->daily_food_rate : (KindergartenSetting::query()->value('daily_food_rate') ?? 160)),
                'custom_deduction' => $data['custom_deduction'] ?? 0,
                'absence_note' => $data['absence_note'] ?? null,
                'notes' => $data['notes'] ?? null,
                'status' => $bill->exists ? $bill->status : BillStatus::UNPAID,
            ]);
            $bill->save();

            if (array_key_exists('items', $data)) {
                $bill->items()->delete();
                foreach ($data['items'] as $itemData) {
                    $activity = Activity::findOrFail($itemData['activity_id']);
                    $quantity = (float) ($itemData['quantity'] ?? 1);
                    if ($activity->billing_type->value === 'per_lesson' && ($quantity > 999 || $quantity < 0 || floor($quantity) !== $quantity)) {
                        throw ValidationException::withMessages(['items' => 'Кількість занять має бути цілим числом від 0 до 999.']);
                    }
                    $unitPrice = (float) ($itemData['unit_price'] ?? $this->pricing->priceFor($activity, $year, $month));
                    $bill->items()->create([
                        'activity_id' => $activity->id,
                        'name' => $activity->name,
                        'billing_type' => $activity->billing_type,
                        'quantity' => $quantity,
                        'unit_price' => $unitPrice,
                        'amount' => round($quantity * $unitPrice, 2),
                    ]);
                }
            }

            return $this->recalculate($bill->fresh('items', 'payments'));
        });
    }

    public function recalculate(MonthlyBill $bill): MonthlyBill
    {
        $this->closure->assertOpen($bill->year, $bill->month);
        $items = $bill->items()->get();
        $subtotal = round((float) $items->sum('amount'), 2);
        $subscriptionSubtotal = round((float) $items->filter(fn ($item) => $item->isSubscription())->sum('amount'), 2);
        $discount = round($subscriptionSubtotal * ((float) $bill->discount_percent / 100), 2);

        $foodItem = $bill->items()->where('billing_type', 'daily_food')->first();
        $foodAmount = $foodItem ? (float) $foodItem->amount : 0;
        $available = max(0, round($subtotal - $discount, 2));
        // Imported monthly packages can include meals without a separate daily_food item.
        $absenceLimit = $foodItem ? min($foodAmount, $available) : $available;
        $absenceDeduction = round(((int) $bill->absence_days + (int) $bill->sick_leave_days) * (float) $bill->daily_food_rate, 2);
        $absenceDeduction = min($absenceDeduction, $absenceLimit);

        $custom = max(0, (float) $bill->custom_deduction);
        $deductions = min($available, round($absenceDeduction + $custom, 2));
        $total = max(0, round($subtotal - $discount - $deductions, 2));

        $paid = round((float) $bill->payments()->sum('amount'), 2);
        $itemCount = $bill->items()->count();
        $status = match (true) {
            $itemCount === 0 => BillStatus::DRAFT,
            $total <= 0 => BillStatus::PAID,
            $paid <= 0 => BillStatus::UNPAID,
            $paid < $total => BillStatus::PARTIALLY_PAID,
            default => BillStatus::PAID,
        };

        $bill->update([
            'subtotal' => $subtotal,
            'discount_amount' => $discount,
            'deductions_total' => $deductions,
            'total' => $total,
            'status' => $status,
        ]);

        return $bill->fresh('child.group', 'items', 'payments');
    }

    public function addPayment(MonthlyBill $bill, array $data, int $userId): MonthlyBill
    {
        $this->closure->assertOpen($bill->year, $bill->month);
        $this->closure->assertDateOpen($data['payment_date']);
        $amount = round((float) $data['amount'], 2);
        if ($amount <= 0) {
            throw ValidationException::withMessages(['amount' => 'Сума платежу має бути більшою за 0.']);
        }

        $bill = $this->recalculate($bill);
        $debt = $bill->debt;
        if ($debt <= 0) {
            throw ValidationException::withMessages(['amount' => 'За цим нарахуванням немає боргу.']);
        }
        if ($amount - $debt > 0.009) {
            throw ValidationException::withMessages([
                'amount' => 'Сума платежу не може перевищувати поточний борг '.number_format($debt, 2, '.', '').' грн.',
            ]);
        }

        return DB::transaction(function () use ($bill, $data, $userId, $amount) {
            $bill->payments()->create([
                'amount' => $amount,
                'payment_date' => $data['payment_date'],
                'payment_method' => $data['payment_method'] ?? 'cash',
                'reference' => $data['reference'] ?? null,
                'notes' => $data['notes'] ?? null,
                'created_by' => $userId,
            ]);

            return $this->recalculate($bill);
        });
    }
}

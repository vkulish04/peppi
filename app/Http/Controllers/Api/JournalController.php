<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\Child;
use App\Models\Activity;
use App\Models\MonthlyBill;
use App\Models\KindergartenSetting;
use App\Services\BillingService;
use App\Services\SubscriptionPricing;
use App\Services\MonthClosure;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;

class JournalController extends Controller
{
    public function __construct(private BillingService $billing, private SubscriptionPricing $pricing, private MonthClosure $closure) {}

    public function setActivity(Request $request)
    {
        $data = $request->validate([
            'child_id' => ['required', 'integer', 'exists:children,id'],
            'activity_id' => ['required', 'integer', 'exists:activities,id'],
            'year' => ['required', 'integer', 'min:2020', 'max:2100'],
            'month' => ['required', 'integer', 'between:1,12'],
            'checked' => ['required_without:quantity', 'boolean'],
            'quantity' => ['sometimes', 'required', 'integer', 'min:0', 'max:999'],
        ]);
        $this->closure->assertOpen($data['year'], $data['month']);

        $child = Child::where('active', true)->findOrFail($data['child_id']);
        $activity = Activity::where('active', true)->findOrFail($data['activity_id']);
        $quantity = (int) ($data['quantity'] ?? ($data['checked'] ? 1 : 0));
        if ($quantity > 1 && $activity->billing_type->value !== 'per_lesson') {
            throw \Illuminate\Validation\ValidationException::withMessages([
                'quantity' => 'Вибір кількості доступний лише для оплати за кожне заняття.',
            ]);
        }

        DB::transaction(function () use ($data, $child, $activity, $quantity) {
            $bill = MonthlyBill::firstOrCreate(
                ['child_id' => $child->id, 'year' => $data['year'], 'month' => $data['month']],
                ['discount_percent' => $child->discount_percent ?? 0, 'daily_food_rate' => KindergartenSetting::query()->value('daily_food_rate') ?? 160],
            );

            $bill = MonthlyBill::whereKey($bill->id)->lockForUpdate()->firstOrFail();
            if ($quantity > 0) {
                $item = $bill->items()->where('activity_id', $activity->id)->first();
                $price = $item ? (float) $item->unit_price : $this->pricing->priceFor($activity, $data['year'], $data['month']);
                if ($item) {
                    $item->update(['quantity' => $quantity, 'amount' => round($quantity * $price, 2)]);
                } else {
                    $bill->items()->create([
                        'activity_id' => $activity->id,
                        'name' => $activity->name,
                        'billing_type' => $activity->billing_type,
                        'quantity' => $quantity,
                        'unit_price' => $price,
                        'amount' => round($quantity * $price, 2),
                    ]);
                }
            } else {
                $bill->items()->where('activity_id', $activity->id)->delete();
            }

            $this->billing->recalculate($bill);
        });

        return response()->noContent();
    }

    public function index(Request $request)
    {
        $data = $request->validate([
            'year' => ['required', 'integer', 'min:2020', 'max:2100'],
            'month' => ['required', 'integer', 'between:1,12'],
        ]);

        $children = Child::with([
            'group',
            'bills' => function ($query) use ($data) {
                $query
                    ->where('year', $data['year'])
                    ->where('month', $data['month'])
                    ->with(['items', 'payments' => fn ($q) => $q->orderBy('payment_date')->orderBy('id')]);
            },
        ])
            ->where('active', true)
            ->orderBy('full_name')
            ->get();

        return response()->json([
            'year' => (int) $data['year'],
            'month' => (int) $data['month'],
            'children' => $children->map(function ($child) {
                $bill = $child->bills->first();

                return [
                    'id' => $child->id,
                    'full_name' => $child->full_name,
                    'group' => $child->group,
                    'bill' => $bill ? [
                        'id' => $bill->id,
                        'discount_percent' => (float) $bill->discount_percent,
                        'absence_days' => (int) $bill->absence_days,
                        'sick_leave_days' => (int) $bill->sick_leave_days,
                        'daily_food_rate' => (float) $bill->daily_food_rate,
                        'custom_deduction' => (float) $bill->custom_deduction,
                        'absence_note' => $bill->absence_note,
                        'notes' => $bill->notes,
                        'subtotal' => (float) $bill->subtotal,
                        'discount' => (float) $bill->discount_amount,
                        'deductions' => (float) $bill->deductions_total,
                        'total' => (float) $bill->total,
                        'paid' => $bill->paid_amount,
                        'debt' => $bill->debt,
                        'status' => $bill->status->value,
                        'items' => $bill->items,
                        'payments' => $bill->payments,
                    ] : null,
                ];
            }),
        ]);
    }
}

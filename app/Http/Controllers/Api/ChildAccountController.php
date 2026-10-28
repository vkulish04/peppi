<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\Child;

class ChildAccountController extends Controller
{
    public function show(Child $child)
    {
        $child->load('group');

        $bills = $child->bills()
            ->with([
                'items' => fn ($query) => $query->orderBy('id'),
                'payments' => fn ($query) => $query->with('creator:id,name')->orderByDesc('payment_date')->orderByDesc('id'),
            ])
            ->orderByDesc('year')
            ->orderByDesc('month')
            ->get();

        $billed = round((float) $bills->sum(fn ($bill) => (float) $bill->total), 2);
        $paid = round((float) $bills->sum(fn ($bill) => (float) $bill->paid_amount), 2);

        return response()->json([
            'child' => [
                'id' => $child->id,
                'group_id' => $child->group_id,
                'full_name' => $child->full_name,
                'group' => $child->group,
                'birth_date' => optional($child->birth_date)->format('Y-m-d'),
                'parent_name' => $child->parent_name,
                'parent_phone' => $child->parent_phone,
                'discount_percent' => (float) $child->discount_percent,
                'notes' => $child->notes,
                'active' => (bool) $child->active,
            ],
            'summary' => [
                'billed' => $billed,
                'paid' => $paid,
                'debt' => max(0, round($billed - $paid, 2)),
                'months' => $bills->count(),
            ],
            'bills' => $bills->map(fn ($bill) => $this->billPayload($bill)),
        ]);
    }

    private function billPayload($bill): array
    {
        return [
            'id' => $bill->id,
            'year' => (int) $bill->year,
            'month' => (int) $bill->month,
            'status' => $bill->status->value,
            'subtotal' => (float) $bill->subtotal,
            'discount_percent' => (float) $bill->discount_percent,
            'discount_amount' => (float) $bill->discount_amount,
            'deductions_total' => (float) $bill->deductions_total,
            'total' => (float) $bill->total,
            'paid' => $bill->paid_amount,
            'debt' => $bill->debt,
            'absence_days' => (int) $bill->absence_days,
            'sick_leave_days' => (int) $bill->sick_leave_days,
            'daily_food_rate' => (float) $bill->daily_food_rate,
            'custom_deduction' => (float) $bill->custom_deduction,
            'absence_note' => $bill->absence_note,
            'notes' => $bill->notes,
            'items' => $bill->items->map(fn ($item) => [
                'id' => $item->id,
                'activity_id' => $item->activity_id,
                'name' => $item->name,
                'billing_type' => $item->billing_type->value,
                'quantity' => (float) $item->quantity,
                'unit_price' => (float) $item->unit_price,
                'amount' => (float) $item->amount,
            ])->values(),
            'payments' => $bill->payments->map(fn ($payment) => [
                'id' => $payment->id,
                'amount' => (float) $payment->amount,
                'payment_date' => $payment->payment_date->format('Y-m-d'),
                'payment_method' => $payment->payment_method,
                'reference' => $payment->reference,
                'notes' => $payment->notes,
                'created_by' => $payment->created_by,
                'created_by_name' => $payment->creator?->name,
                'created_at' => optional($payment->created_at)->toIso8601String(),
            ])->values(),
        ];
    }
}

<?php

namespace App\Services;

use App\Models\Child;
use App\Models\MonthlyBill;
use App\Models\KindergartenSetting;
use App\Models\User;
use Illuminate\Support\Facades\DB;
use Illuminate\Validation\ValidationException;

class JournalCarryForward
{
    public function __construct(private BillingService $billing, private SubscriptionPricing $pricing, private MonthClosure $closure, private AuditLogger $audit) {}

    public function preview(int $year, int $month): array
    {
        return $this->plan($year, $month)['summary'];
    }

    public function copy(int $year, int $month, string $previewHash, User $actor): array
    {
        return DB::transaction(function () use ($year, $month, $previewHash, $actor) {
            // Serialize repeated copies so they cannot create duplicate bills.
            Child::where('active', true)->orderBy('id')->lockForUpdate()->get();
            $plan = $this->plan($year, $month);
            $summary = $plan['summary'];
            $this->closure->assertOpen($summary['targetYear'], $summary['targetMonth']);
            if (!hash_equals($summary['previewHash'], $previewHash)) {
                throw ValidationException::withMessages(['preview' => 'Дані змінилися. Закрийте вікно й перегляньте перенесення ще раз.']);
            }
            foreach ($plan['rows'] as $row) {
                $this->billing->createOrUpdate($row['child'], $summary['targetYear'], $summary['targetMonth'], [
                    'items' => $row['items'], 'discount_percent' => $row['discount'],
                    'absence_days' => 0, 'sick_leave_days' => 0, 'custom_deduction' => 0,
                    'daily_food_rate' => $row['dailyRate'],
                ]);
            }
            if ($summary['childrenCount'] > 0) {
                $this->audit->record($actor, 'journal.carried_forward', 'month', null, [
                    'source_year' => $year, 'source_month' => $month,
                    'target_year' => $summary['targetYear'], 'target_month' => $summary['targetMonth'],
                    'children_count' => $summary['childrenCount'], 'items_count' => $summary['itemsCount'],
                    'skipped_count' => $summary['skippedCount'],
                ]);
            }
            return $summary;
        });
    }

    private function plan(int $year, int $month): array
    {
        $targetYear = $month === 12 ? $year + 1 : $year;
        $targetMonth = $month === 12 ? 1 : $month + 1;
        if ($targetYear > 2100) throw ValidationException::withMessages(['year' => 'Наступний місяць поза підтримуваним діапазоном.']);
        $bills = MonthlyBill::with(['child', 'items.activity'])->where('year', $year)->where('month', $month)->orderBy('child_id')->get();
        $existing = MonthlyBill::where('year', $targetYear)->where('month', $targetMonth)->pluck('child_id')->map(fn ($id) => (int) $id)->all();
        $dailyRate = (float) (KindergartenSetting::query()->value('daily_food_rate') ?? 160);
        $rows = []; $skipped = 0; $inactive = 0; $itemsCount = 0; $lessonsCount = 0; $total = 0;
        foreach ($bills as $bill) {
            if (!$bill->child?->active || $bill->items->isEmpty()) continue;
            if (in_array($bill->child_id, $existing, true)) { $skipped++; continue; }
            $items = []; $subtotal = 0; $subscription = 0;
            foreach ($bill->items as $item) {
                if (!$item->activity?->active) { $inactive++; continue; }
                if ((float) $item->quantity <= 0) continue;
                $price = $this->pricing->priceFor($item->activity, $targetYear, $targetMonth);
                $quantity = (float) $item->quantity;
                $items[] = ['activity_id' => $item->activity_id, 'quantity' => $quantity, 'unit_price' => $price];
                $amount = round($quantity * $price, 2);
                $subtotal += $amount;
                if ($this->pricing->isSubscription($item->activity)) $subscription += $amount;
                if ($item->activity->billing_type->value === 'per_lesson') $lessonsCount += $quantity;
            }
            if ($items === []) continue;
            $discount = (float) ($bill->child->discount_percent ?? 0);
            $total += max(0, round($subtotal - round($subscription * $discount / 100, 2), 2));
            $itemsCount += count($items);
            $rows[] = ['child' => $bill->child, 'items' => $items, 'discount' => $discount, 'dailyRate' => $dailyRate];
        }
        $fingerprint = array_map(fn ($row) => [$row['child']->id, $row['items'], $row['discount'], $row['dailyRate']], $rows);
        return ['rows' => $rows, 'summary' => [
            'sourceYear' => $year, 'sourceMonth' => $month, 'targetYear' => $targetYear, 'targetMonth' => $targetMonth,
            'childrenCount' => count($rows), 'itemsCount' => $itemsCount, 'lessonsCount' => $lessonsCount,
            'skippedCount' => $skipped, 'inactiveItemsCount' => $inactive, 'total' => round($total, 2),
            'targetClosed' => $this->closure->isClosed($targetYear, $targetMonth),
            'previewHash' => hash('sha256', json_encode([$year, $month, $fingerprint, $skipped, $inactive])),
        ]];
    }
}

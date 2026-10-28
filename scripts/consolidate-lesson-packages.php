<?php

// Run only in the local Docker app after taking a database backup.
require '/var/www/html/vendor/autoload.php';
$app = require '/var/www/html/bootstrap/app.php';
$app->make(Illuminate\Contracts\Console\Kernel::class)->bootstrap();
if (config('database.connections.mysql.host') !== 'db') {
    throw new RuntimeException('This script is restricted to the local Docker database.');
}

use App\Models\Activity;
use App\Models\MonthlyBill;
use App\Services\MonthClosure;
use Illuminate\Support\Facades\DB;

DB::transaction(function () use ($app) {
    $before = MonthlyBill::orderBy('id')->get(['id', 'subtotal', 'total', 'discount_amount', 'deductions_total', 'status'])->toJson();
    $period = now();
    $groups = [
        ['name' => 'Індивідуальне заняття', 'price' => 200, 'packages' => [
            'Індивідуальне заняття 4 заняття' => 4,
            'Індивідуальне заняття 6 занять' => 6,
            'Індивідуальне заняття 8 занять' => 8,
        ]],
        ['name' => 'Логопедичне заняття', 'price' => 400, 'packages' => [
            'Логопедичне заняття 4' => 4,
            'Логопедичне заняття 6 занять' => 6,
            'Логопедичне заняття 8 занять' => 8,
        ]],
    ];
    foreach ($groups as $group) {
        $sources = Activity::whereIn('name', array_keys($group['packages']))->get();
        if ($sources->isEmpty()) continue;
        foreach ($sources as $source) {
            if ((float) $source->price !== (float) ($group['price'] * $group['packages'][$source->name])) {
                throw new RuntimeException('Package price needs review: '.$source->name);
            }
        }
        $target = Activity::firstOrCreate(['name' => $group['name']], [
            'price' => $group['price'], 'billing_type' => 'per_lesson',
            'category' => 'development', 'active' => true,
        ]);
        if ($target->billing_type->value !== 'per_lesson' || (float) $target->price !== (float) $group['price']) {
            throw new RuntimeException('Existing target needs review.');
        }
        $bills = MonthlyBill::whereHas('items', fn ($q) => $q->whereIn('activity_id', $sources->pluck('id')))
            ->where(fn ($q) => $q->where('year', '>', $period->year)->orWhere(fn ($q) => $q->where('year', $period->year)->where('month', '>=', $period->month)))
            ->lockForUpdate()->get();
        foreach ($bills as $bill) {
            if ($app->make(MonthClosure::class)->isClosed($bill->year, $bill->month)) continue;
            $items = $bill->items()->whereIn('activity_id', $sources->pluck('id')->push($target->id))->get();
            $quantity = 0;
            $amount = 0;
            foreach ($items as $item) {
                $source = $sources->firstWhere('id', $item->activity_id);
                $quantity += (float) $item->quantity * ($source ? $group['packages'][$source->name] : 1);
                $amount += (float) $item->amount;
            }
            if ($quantity < 1 || $quantity > 999 || floor($quantity) !== $quantity || round($quantity * $group['price'], 2) !== round($amount, 2)) {
                throw new RuntimeException('Historical rate needs review for bill '.$bill->id);
            }
            $first = $items->first();
            $first->update(['activity_id' => $target->id, 'name' => $target->name, 'billing_type' => 'per_lesson',
                'quantity' => $quantity, 'unit_price' => $group['price'], 'amount' => $amount]);
            $bill->items()->whereIn('id', $items->pluck('id')->reject(fn ($id) => $id === $first->id))->delete();
        }
        Activity::whereIn('id', $sources->pluck('id'))->update(['active' => false]);
        echo $group['name'].': consolidated '.count($bills)." open-period bills\n";
    }
    $after = MonthlyBill::orderBy('id')->get(['id', 'subtotal', 'total', 'discount_amount', 'deductions_total', 'status'])->toJson();
    if ($before !== $after) throw new RuntimeException('Bill totals changed; rolling back.');
    echo "All bill totals and statuses preserved.\n";
});

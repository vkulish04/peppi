<?php

namespace Tests\Unit;

use App\Enums\BillingType;
use App\Models\Activity;
use App\Models\Child;
use App\Models\Group;
use App\Services\BillingService;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class BillingServiceTest extends TestCase
{
    use RefreshDatabase;

    public function test_it_calculates_bill_with_discount_and_food_absence(): void
    {
        $group = Group::create(['name' => 'Тест']);
        $child = Child::create(['group_id'=>$group->id,'full_name'=>'Тестова дитина','discount_percent'=>10]);
        $food = Activity::create(['name'=>'Харчування','price'=>3200,'billing_type'=>BillingType::DAILY_FOOD]);
        $english = Activity::create(['name'=>'Англійська','price'=>650,'billing_type'=>BillingType::MONTHLY]);

        $bill = app(BillingService::class)->createOrUpdate($child, 2026, 9, [
            'daily_food_rate' => 160,
            'absence_days' => 2,
            'items' => [
                ['activity_id'=>$food->id,'quantity'=>1],
                ['activity_id'=>$english->id,'quantity'=>1],
            ],
        ]);

        $this->assertSame(3850.0, (float)$bill->subtotal);
        $this->assertSame(0.0, (float)$bill->discount_amount);
        $this->assertSame(320.0, (float)$bill->deductions_total);
        $this->assertSame(3530.0, (float)$bill->total);
    }

    public function test_it_applies_percentage_discount_only_to_subscription_items(): void
    {
        $group = Group::create(['name' => 'Тест']);
        $child = Child::create(['group_id' => $group->id, 'full_name' => 'Дитина', 'discount_percent' => 10]);
        $subscription = Activity::create(['name' => 'Абонемент 12 000', 'price' => 12000, 'billing_type' => BillingType::MONTHLY]);
        $english = Activity::create(['name' => 'Англійська', 'price' => 600, 'billing_type' => BillingType::MONTHLY]);

        $bill = app(BillingService::class)->createOrUpdate($child, 2026, 9, [
            'items' => [
                ['activity_id' => $subscription->id],
                ['activity_id' => $english->id],
            ],
        ]);

        $this->assertSame(12600.0, (float) $bill->subtotal);
        $this->assertSame(1200.0, (float) $bill->discount_amount);
        $this->assertSame(11400.0, (float) $bill->total);
    }

    public function test_it_deducts_absence_from_an_imported_monthly_package(): void
    {
        $group = Group::create(['name' => 'Тест']);
        $child = Child::create(['group_id' => $group->id, 'full_name' => 'Дитина']);
        $package = Activity::create(['name' => 'Абонемент', 'price' => 12000, 'billing_type' => BillingType::MONTHLY]);

        $bill = app(BillingService::class)->createOrUpdate($child, 2026, 9, [
            'daily_food_rate' => 160,
            'sick_leave_days' => 4,
            'absence_days' => 1,
            'items' => [['activity_id' => $package->id]],
        ]);

        $this->assertSame(800.0, (float) $bill->deductions_total);
        $this->assertSame(11200.0, (float) $bill->total);
    }
}

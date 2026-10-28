<?php

namespace App\Services;

use App\Models\Activity;
use App\Models\ActivityPricePeriod;

class SubscriptionPricing
{
    public function isSubscription(Activity $activity): bool
    {
        return mb_stripos(trim($activity->name), 'абонемент') === 0;
    }

    public function priceFor(Activity $activity, int $year, int $month): float
    {
        if (! $this->isSubscription($activity)) {
            return (float) $activity->price;
        }

        $period = ActivityPricePeriod::query()
            ->where('activity_id', $activity->id)
            ->where(function ($query) use ($year, $month) {
                $query->where('year', '<', $year)
                    ->orWhere(fn ($sameYear) => $sameYear->where('year', $year)->where('month', '<=', $month));
            })
            ->orderByDesc('year')
            ->orderByDesc('month')
            ->first();

        return (float) ($period?->price ?? $activity->price);
    }
}

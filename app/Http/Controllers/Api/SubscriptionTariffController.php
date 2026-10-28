<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\Activity;
use App\Models\ActivityPricePeriod;
use App\Services\SubscriptionPricing;
use App\Services\AuditLogger;
use App\Services\MonthClosure;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Validation\ValidationException;

class SubscriptionTariffController extends Controller
{
    public function __construct(private SubscriptionPricing $pricing, private AuditLogger $audit, private MonthClosure $closure) {}

    public function index(): JsonResponse
    {
        $activities = Activity::query()->with(['pricePeriods' => fn ($query) => $query->orderBy('year')->orderBy('month')])->get()
            ->filter(fn (Activity $activity) => $this->pricing->isSubscription($activity))
            ->values()
            ->map(fn (Activity $activity) => [
                'activityId' => $activity->id,
                'name' => $activity->name,
                'basePrice' => (float) $activity->price,
                'periods' => $activity->pricePeriods->map(fn ($period) => [
                    'year' => $period->year,
                    'month' => $period->month,
                    'price' => (float) $period->price,
                ]),
            ]);

        return response()->json($activities);
    }

    public function update(Request $request, Activity $activity): JsonResponse
    {
        if (! $this->pricing->isSubscription($activity)) {
            throw ValidationException::withMessages(['activity' => 'Це заняття не є абонементом.']);
        }

        $data = $request->validate([
            'year' => ['required', 'integer', 'between:2020,2100'],
            'month' => ['required', 'integer', 'between:1,12'],
            'price' => ['required', 'numeric', 'min:0', 'max:9999999999'],
        ]);
        $this->closure->assertOpen($data['year'], $data['month']);

        DB::transaction(function () use ($activity, $data, $request) {
            $period = ActivityPricePeriod::query()->updateOrCreate(
                ['activity_id' => $activity->id, 'year' => $data['year'], 'month' => $data['month']],
                ['price' => $data['price']],
            );
            if ($period->wasRecentlyCreated || $period->wasChanged()) {
                $this->audit->record($request->user(), 'tariff.updated', 'activity', $activity->id, [
                    'name' => $activity->name, 'year' => $data['year'], 'month' => $data['month'], 'price' => $data['price'],
                ]);
            }
        });

        return $this->index();
    }
}

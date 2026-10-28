<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Http\Requests\ActivityRequest;
use App\Models\Activity;
use App\Services\SubscriptionPricing;
use Illuminate\Http\Request;

class ActivityController extends Controller
{
    public function __construct(private SubscriptionPricing $pricing) {}

    public function index(Request $request)
    {
        $data = $request->validate([
            'year' => ['sometimes', 'integer', 'between:2020,2100'],
            'month' => ['sometimes', 'integer', 'between:1,12'],
        ]);
        $year = (int) ($data['year'] ?? now()->year);
        $month = (int) ($data['month'] ?? now()->month);

        return Activity::orderBy('name')->get()->map(function (Activity $activity) use ($year, $month) {
            $activity->price = $this->pricing->priceFor($activity, $year, $month);
            return $activity;
        });
    }
    public function store(ActivityRequest $request) { return response()->json(Activity::create($request->validated()), 201); }
    public function show(Activity $activity) { return $activity; }
    public function update(ActivityRequest $request, Activity $activity) { $activity->update($request->validated()); return $activity->fresh(); }
    public function destroy(Activity $activity) { $activity->delete(); return response()->noContent(); }
}

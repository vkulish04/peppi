<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Services\AuditLogger;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Validation\Rule;

class MonthClosureController extends Controller
{
    public function __construct(private AuditLogger $audit) {}

    public function show(Request $request): JsonResponse
    {
        $period = $this->period($request);
        return $this->status($period['year'], $period['month']);
    }

    public function close(Request $request): JsonResponse
    {
        $period = $this->period($request);
        $request->validate(['confirmation' => ['required', Rule::in(['CLOSE'])]]);

        DB::transaction(function () use ($period, $request) {
            $row = DB::table('month_closures')->where('year', $period['year'])->where('month', $period['month'])->lockForUpdate()->first();
            if ($row?->closed_at) return;
            $values = ['closed_at' => now(), 'closed_by' => $request->user()->id, 'updated_at' => now()];
            if ($row) DB::table('month_closures')->where('id', $row->id)->update($values);
            else DB::table('month_closures')->insert($values + ['year' => $period['year'], 'month' => $period['month'], 'created_at' => now()]);
            $this->audit->record($request->user(), 'month.closed', 'month', null, $period);
        });

        return $this->status($period['year'], $period['month']);
    }

    public function reopen(Request $request): JsonResponse
    {
        $period = $this->period($request);
        $request->validate(['confirmation' => ['required', Rule::in(['REOPEN'])]]);

        DB::transaction(function () use ($period, $request) {
            $row = DB::table('month_closures')->where('year', $period['year'])->where('month', $period['month'])->lockForUpdate()->first();
            if (!$row?->closed_at) return;
            DB::table('month_closures')->where('id', $row->id)->update(['closed_at' => null, 'closed_by' => null, 'updated_at' => now()]);
            $this->audit->record($request->user(), 'month.reopened', 'month', null, $period);
        });

        return $this->status($period['year'], $period['month']);
    }

    private function period(Request $request): array
    {
        return $request->validate([
            'year' => ['required', 'integer', 'between:2000,2100'],
            'month' => ['required', 'integer', 'between:1,12'],
        ]);
    }

    private function status(int $year, int $month): JsonResponse
    {
        $row = DB::table('month_closures')->leftJoin('users', 'users.id', '=', 'month_closures.closed_by')
            ->where('year', $year)->where('month', $month)
            ->select('month_closures.closed_at', 'month_closures.closed_by', 'users.name as closed_by_name')->first();

        return response()->json([
            'year' => $year,
            'month' => $month,
            'closed' => (bool) ($row?->closed_at),
            'closedAt' => $row?->closed_at,
            'closedBy' => $row?->closed_by_name,
        ]);
    }
}

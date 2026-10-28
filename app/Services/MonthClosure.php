<?php

namespace App\Services;

use Illuminate\Support\Facades\DB;
use Illuminate\Validation\ValidationException;

class MonthClosure
{
    public function isClosed(int $year, int $month): bool
    {
        return DB::table('month_closures')
            ->where('year', $year)->where('month', $month)
            ->whereNotNull('closed_at')->exists();
    }

    public function assertOpen(int $year, int $month): void
    {
        if ($this->isClosed($year, $month)) {
            throw ValidationException::withMessages([
                'period' => sprintf('Місяць %02d.%04d закрито. Зміни можливі після повторного відкриття директором.', $month, $year),
            ]);
        }
    }

    public function assertDateOpen(string $date): void
    {
        $day = \Carbon\CarbonImmutable::parse($date);
        $this->assertOpen($day->year, $day->month);
    }
}

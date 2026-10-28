<?php

namespace App\Services;

use App\Models\User;
use Illuminate\Support\Facades\DB;
use Illuminate\Validation\ValidationException;

class JournalReset
{
    public function __construct(private MonthClosure $closure, private AuditLogger $audit) {}

    private function snapshot(int $year, int $month, bool $lock = false): array
    {
        $start = sprintf('%04d-%02d-01', $year, $month);
        $end = \Carbon\CarbonImmutable::parse($start)->endOfMonth()->toDateString();
        $read = fn ($query) => ($lock ? $query->lockForUpdate() : $query)->orderBy('id')->get();
        $bills = $read(DB::table('monthly_bills')->where('year', $year)->where('month', $month));
        $ids = $bills->pluck('id');
        $payrolls = $read(DB::table('payrolls')->where('year', $year)->where('month', $month));
        $payrollIds = $payrolls->pluck('id');
        // Do not silently remove payments belonging to a different accounting period.
        $cross = DB::table('payments')->where(function ($q) use ($ids, $start, $end) {
            $q->where(fn ($q) => $q->whereIn('monthly_bill_id', $ids)->where(fn ($q) => $q->where('payment_date', '<', $start)->orWhere('payment_date', '>', $end)))
                ->orWhere(fn ($q) => $q->whereBetween('payment_date', [$start, $end])->whereNotIn('monthly_bill_id', $ids));
        })->exists() || DB::table('payroll_payments')->where(function ($q) use ($payrollIds, $start, $end) {
            $q->where(fn ($q) => $q->whereIn('payroll_id', $payrollIds)->where(fn ($q) => $q->where('payment_date', '<', $start)->orWhere('payment_date', '>', $end)))
                ->orWhere(fn ($q) => $q->whereBetween('payment_date', [$start, $end])->whereNotIn('payroll_id', $payrollIds));
        })->exists();
        $tables = [
            'monthly_bills' => $bills->all(),
            'monthly_bill_items' => $read(DB::table('monthly_bill_items')->whereIn('monthly_bill_id', $ids))->all(),
            'payments' => $read(DB::table('payments')->whereIn('monthly_bill_id', $ids))->all(),
            'payrolls' => $payrolls->all(),
            'payroll_payments' => $read(DB::table('payroll_payments')->whereIn('payroll_id', $payrollIds))->all(),
            'expenses' => $read(DB::table('expenses')->whereBetween('expense_date', [$start, $end]))->all(),
        ];
        return ['tables' => $tables, 'start' => $start, 'end' => $end, 'crossPeriodPayments' => $cross];
    }

    public function preview(int $year, int $month): array
    {
        $snapshot = $this->snapshot($year, $month);
        return [
            'year' => $year, 'month' => $month, 'closed' => $this->closure->isClosed($year, $month),
            'counts' => array_map('count', $snapshot['tables']),
            'crossPeriodPayments' => $snapshot['crossPeriodPayments'],
            'previewHash' => hash('sha256', json_encode([$year, $month, $snapshot])),
        ];
    }

    public function clear(int $year, int $month, string $previewHash, User $actor): array
    {
        return DB::transaction(function () use ($year, $month, $previewHash, $actor) {
            // Share the period row lock with closing/reopening a month.
            DB::table('month_closures')->insertOrIgnore(['year' => $year, 'month' => $month, 'created_at' => now(), 'updated_at' => now()]);
            DB::table('month_closures')->where('year', $year)->where('month', $month)->lockForUpdate()->first();
            $this->closure->assertOpen($year, $month);
            $snapshot = $this->snapshot($year, $month, true);
            $preview = $this->preview($year, $month);
            if (!hash_equals($preview['previewHash'], $previewHash)) {
                throw ValidationException::withMessages(['preview' => 'Дані місяця змінилися. Закрийте вікно та перевірте очищення ще раз.']);
            }
            if ($preview['crossPeriodPayments']) {
                throw ValidationException::withMessages(['payments' => 'Є оплати, пов’язані з іншим місяцем. Спочатку перевірте ці платежі.']);
            }
            $directory = storage_path('app/private/month-resets');
            if (!is_dir($directory) && !mkdir($directory, 0700, true) && !is_dir($directory)) throw new \RuntimeException('Не вдалося створити резервну копію.');
            $name = sprintf('month-%04d-%02d-%s.json.gz', $year, $month, bin2hex(random_bytes(12)));
            $contents = gzencode(json_encode(['version' => 1, 'year' => $year, 'month' => $month, 'createdAt' => now()->toIso8601String(), 'tables' => $snapshot['tables']], JSON_THROW_ON_ERROR | JSON_UNESCAPED_UNICODE));
            $path = $directory.'/'.$name;
            $oldMask = umask(0077);
            try {
                if ($contents === false || file_put_contents($path, $contents, LOCK_EX) !== strlen($contents)) throw new \RuntimeException('Не вдалося зберегти резервну копію. Очищення скасовано.');
            } finally { umask($oldMask); }
            $ids = array_map(fn ($bill) => $bill->id, $snapshot['tables']['monthly_bills']);
            DB::table('monthly_bills')->whereIn('id', $ids)->delete();
            DB::table('payrolls')->where('year', $year)->where('month', $month)->delete();
            DB::table('expenses')->whereBetween('expense_date', [$snapshot['start'], $snapshot['end']])->delete();
            DB::table('finance_period_resets')->updateOrInsert(['year' => $year, 'month' => $month], ['created_at' => now()]);
            $this->audit->record($actor, 'journal.cleared', 'month', null, ['year' => $year, 'month' => $month, 'counts' => $preview['counts'], 'backup' => $name]);
            return ['year' => $year, 'month' => $month, 'counts' => $preview['counts'], 'backup' => $name];
        });
    }
}

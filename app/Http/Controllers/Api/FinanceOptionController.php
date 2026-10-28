<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\Expense;
use App\Models\FinanceOption;
use App\Models\Payment;
use App\Services\AuditLogger;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Str;
use Illuminate\Validation\Rule;
use Illuminate\Validation\ValidationException;

class FinanceOptionController extends Controller
{
    public function __construct(private AuditLogger $audit) {}
    public function index(): JsonResponse
    {
        return response()->json(FinanceOption::query()->orderByRaw("CASE WHEN type = 'expense_category' AND code = 'salary' THEN 0 ELSE 1 END")->orderBy('sort_order')->orderBy('id')->get());
    }

    public function store(Request $request): JsonResponse
    {
        $data = $request->validate([
            'type' => ['required', Rule::in(['expense_category', 'payment_method'])],
            'name' => ['required', 'string', 'max:100'],
            'icon' => ['sometimes', 'string', Rule::in(\App\Support\ExpenseIcons::keys())],
        ]);

        $this->assertNotSalaryName($data['type'], $data['name']);
        $option = FinanceOption::create([
            'type' => $data['type'],
            'code' => 'custom_'.Str::lower(Str::random(12)),
            'name' => trim($data['name']),
            'sort_order' => (int) FinanceOption::where('type', $data['type'])->max('sort_order') + 1,
            'icon' => $data['type'] === 'expense_category' ? ($data['icon'] ?? 'Receipt') : null,
        ]);
        $this->audit->record($request->user(), 'finance_option.created', 'finance_option', $option->id, ['name' => $option->name]);

        return response()->json($option, 201);
    }

    public function update(Request $request, FinanceOption $financeOption): JsonResponse
    {
        $data = $request->validate([
            'name' => ['sometimes', 'required', 'string', 'max:100'],
            'icon' => ['sometimes', 'required', 'string', Rule::in(\App\Support\ExpenseIcons::keys())],
        ]);
        if (isset($data['name'])) {
            $this->assertNotLocked($financeOption);
            $this->assertNotSalaryName($financeOption->type, $data['name']);
            $data['name'] = trim($data['name']);
        }
        if (isset($data['icon']) && $financeOption->type !== 'expense_category') throw ValidationException::withMessages(['icon' => 'Значки доступні для категорій витрат.']);
        $financeOption->update($data);
        if ($financeOption->wasChanged()) $this->audit->record($request->user(), 'finance_option.updated', 'finance_option', $financeOption->id, ['name' => $financeOption->name, 'icon' => $financeOption->icon]);

        return response()->json($financeOption->fresh());
    }

    public function destroy(Request $request, FinanceOption $financeOption)
    {
        $this->assertNotLocked($financeOption);
        if (! str_starts_with($financeOption->code, 'custom_')) {
            throw ValidationException::withMessages([
                'option' => 'Стандартний варіант можна перейменувати, але не видалити.',
            ]);
        }

        $used = $financeOption->type === 'expense_category'
            ? Expense::where('category', $financeOption->code)->exists()
            : Payment::where('payment_method', $financeOption->code)->exists()
                || Expense::where('payment_method', $financeOption->code)->exists();

        if ($used) {
            throw ValidationException::withMessages([
                'option' => 'Цей варіант уже використано в записах. Його можна перейменувати, але не видалити.',
            ]);
        }

        $this->audit->record($request->user(), 'finance_option.deleted', 'finance_option', $financeOption->id, ['name' => $financeOption->name]);
        $financeOption->delete();

        return response()->noContent();
    }

    private function assertNotLocked(FinanceOption $option): void
    {
        if ($option->locked) throw ValidationException::withMessages(['option' => 'Категорія «Зарплата» закріплена та використовується для автоматичних виплат.']);
    }

    private function assertNotSalaryName(string $type, string $name): void
    {
        if ($type === 'expense_category' && in_array(mb_strtolower(trim($name)), ['зарплата', 'зарплата та аванс'], true)) throw ValidationException::withMessages(['name' => 'Категорія «Зарплата» вже закріплена в системі.']);
    }
}

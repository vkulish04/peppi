<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\Expense;
use App\Services\MonthClosure;
use Illuminate\Validation\Rule;
use Illuminate\Http\Request;

class ExpenseController extends Controller
{
    public function __construct(private MonthClosure $closure) {}
    private function rules(): array { return [
        'title'=>['required','string','max:255'],'amount'=>['required','numeric','gt:0'],'category'=>['required',Rule::exists('finance_options','code')->where('type','expense_category')],
        'expense_date'=>['required','date'],'supplier'=>['nullable','string','max:255'],'invoice_number'=>['nullable','string','max:255'],
        'payment_method'=>['nullable',Rule::exists('finance_options','code')->where('type','payment_method')],'notes'=>['nullable','string'],
    ]; }
    public function index(Request $r)
    {
        $data = $r->validate(['year' => ['nullable','integer','between:2000,2100'], 'month' => ['nullable','integer','between:1,12']]);
        return app(\App\Services\ExpenseLedger::class)->query(isset($data['year']) ? (int)$data['year'] : null, isset($data['month']) ? (int)$data['month'] : null)->paginate(100);
    }
    public function store(Request $r) { $d=$r->validate($this->rules()); $this->assertManualCategory($d['category']); $this->closure->assertDateOpen($d['expense_date']); $d['created_by']=$r->user()->id; return response()->json(Expense::create($d),201); }
    public function show(Expense $expense) { return $expense; }
    public function update(Request $r, Expense $expense) { $d=$r->validate($this->rules()); if ($expense->category !== 'salary') $this->assertManualCategory($d['category']); $this->closure->assertDateOpen($expense->expense_date->toDateString()); $this->closure->assertDateOpen($d['expense_date']); $expense->update($d); return $expense->fresh(); }
    public function destroy(Expense $expense) { $this->closure->assertDateOpen($expense->expense_date->toDateString()); $expense->delete(); return response()->noContent(); }
    private function assertManualCategory(string $category): void
    {
        if ($category === 'salary') throw \Illuminate\Validation\ValidationException::withMessages(['category' => 'Виплати зарплати додаються автоматично з розділу «Зарплата працівників».']);
    }
}

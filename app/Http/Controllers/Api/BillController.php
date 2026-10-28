<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Http\Requests\BillRequest;
use App\Models\Child;
use App\Models\MonthlyBill;
use App\Services\BillingService;
use Illuminate\Http\Request;

class BillController extends Controller
{
    public function __construct(private BillingService $billing) {}

    public function index(Request $request)
    {
        $query = MonthlyBill::with('child.group', 'items', 'payments');
        if ($request->filled('year')) $query->where('year', $request->integer('year'));
        if ($request->filled('month')) $query->where('month', $request->integer('month'));
        if ($request->filled('child_id')) $query->where('child_id', $request->integer('child_id'));
        return $query->orderByDesc('year')->orderByDesc('month')->paginate(100);
    }

    public function store(BillRequest $request)
    {
        $data = $request->validated();
        $child = Child::findOrFail($data['child_id']);
        $bill = $this->billing->createOrUpdate($child, $data['year'], $data['month'], $data);
        return response()->json($bill, 201);
    }

    public function show(MonthlyBill $bill) { return $bill->load('child.group', 'items', 'payments'); }

    public function update(BillRequest $request, MonthlyBill $bill)
    {
        $data = $request->validated();

        // Route model binding defines which bill is being changed.
        // Do not allow the payload to silently move a bill to another child/month.
        $child = $bill->child()->firstOrFail();
        $data['child_id'] = $child->id;
        $data['year'] = $bill->year;
        $data['month'] = $bill->month;

        return $this->billing->createOrUpdate($child, $bill->year, $bill->month, $data);
    }
}

<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\Employee;
use App\Models\Payroll;
use App\Services\PayrollService;
use Illuminate\Http\Request;

class PayrollController extends Controller
{
    public function __construct(private PayrollService $service) {}

    public function index(Request $request)
    {
        $data = $request->validate([
            'year' => ['required', 'integer', 'between:2000,2100'],
            'month' => ['required', 'integer', 'between:1,12'],
        ]);

        return response()->json($this->service->ensurePeriod($data['year'], $data['month']));
    }

    public function store(Request $request)
    {
        $data = $request->validate([
            'employee_id' => ['required', 'exists:employees,id'],
            'year' => ['required', 'integer', 'between:2000,2100'],
            'month' => ['required', 'integer', 'between:1,12'],
            'base_salary' => ['nullable', 'numeric', 'min:0'],
            'bonus' => ['nullable', 'numeric'],
            'deductions' => ['nullable', 'numeric', 'min:0'],
            'status' => ['nullable', 'in:draft,unpaid,paid'],
            'payment_date' => ['nullable', 'date'],
            'notes' => ['nullable', 'string'],
        ]);

        $employee = Employee::findOrFail($data['employee_id']);

        return response()->json(
            $this->service->createOrUpdate($employee, $data['year'], $data['month'], $data),
            201,
        );
    }

    public function update(Request $request, Payroll $payroll)
    {
        $data = $request->validate([
            'base_salary' => ['nullable', 'numeric', 'min:0'],
            'bonus' => ['nullable', 'numeric'],
            'deductions' => ['nullable', 'numeric', 'min:0'],
            'status' => ['nullable', 'in:draft,unpaid,paid'],
            'payment_date' => ['nullable', 'date'],
            'notes' => ['nullable', 'string'],
        ]);

        return response()->json(
            $this->service->createOrUpdate(
                $payroll->employee,
                $payroll->year,
                $payroll->month,
                array_merge($payroll->only(['base_salary', 'bonus', 'deductions', 'notes']), $data),
            ),
        );
    }
}

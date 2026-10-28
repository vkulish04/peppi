<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\Payroll;
use App\Services\PayrollPayments;
use Illuminate\Http\Request;

class PayrollPaymentController extends Controller
{
    public function store(Request $request, Payroll $payroll, PayrollPayments $service)
    {
        $data = $request->validate([
            'amount' => ['required', 'numeric', 'decimal:0,2', 'min:0.01', 'max:999999999.99'],
            'stage' => ['required', 'in:advance,salary'], 'payment_method' => ['required', 'in:bank,cash'],
            'is_official' => ['required', 'boolean'], 'payment_date' => ['required', 'date_format:Y-m-d'],
            'notes' => ['nullable', 'string', 'max:1000'], 'request_id' => ['required', 'uuid'],
        ]);
        return response()->json($service->add($payroll, $data, $request->user()), 201);
    }
}

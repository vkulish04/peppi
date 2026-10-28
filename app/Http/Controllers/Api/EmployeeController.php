<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\Employee;
use App\Support\NoveltySalary;
use Illuminate\Http\Request;

class EmployeeController extends Controller
{
    private function rules(): array { return [
        'full_name' => ['required','string','max:255'], 'position' => ['required','string','max:255'],
        'phone' => ['nullable','string','max:50'], 'base_salary' => ['required','numeric','min:0'],
        'tax_rate' => ['nullable','numeric','min:0','max:100'], 'start_date' => ['nullable','date'],
        'notes' => ['nullable','string'], 'active' => ['sometimes','boolean'],
    ]; }
    public function index() { return Employee::orderBy('full_name')->get(); }
    public function store(Request $r) {
        $data = $r->validate($this->rules());
        if (NoveltySalary::appliesTo($data['position'])) $data['base_salary'] = 0;
        return response()->json(Employee::create($data), 201);
    }
    public function show(Employee $employee) { return $employee; }
    public function update(Request $r, Employee $employee) {
        $data = $r->validate($this->rules());
        if (NoveltySalary::appliesTo($data['position'])) $data['base_salary'] = 0;
        $employee->update($data);
        return $employee->fresh();
    }
    public function destroy(Employee $employee) { $employee->delete(); return response()->noContent(); }
}

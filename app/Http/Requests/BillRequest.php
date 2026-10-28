<?php

namespace App\Http\Requests;

use Illuminate\Foundation\Http\FormRequest;

class BillRequest extends FormRequest
{
    public function authorize(): bool { return true; }
    public function rules(): array
    {
        return [
            'child_id' => ['required', 'exists:children,id'],
            'year' => ['required', 'integer', 'min:2020', 'max:2100'],
            'month' => ['required', 'integer', 'between:1,12'],
            'discount_percent' => ['nullable', 'numeric', 'min:0', 'max:100'],
            'absence_days' => ['nullable', 'integer', 'min:0', 'max:31'],
            'sick_leave_days' => ['nullable', 'integer', 'min:0', 'max:31'],
            'daily_food_rate' => ['nullable', 'numeric', 'min:0'],
            'custom_deduction' => ['nullable', 'numeric', 'min:0'],
            'absence_note' => ['nullable', 'string'],
            'notes' => ['nullable', 'string'],
            'items' => ['sometimes', 'array'],
            'items.*.activity_id' => ['required_with:items', 'exists:activities,id'],
            'items.*.quantity' => ['nullable', 'numeric', 'min:0'],
            'items.*.unit_price' => ['nullable', 'numeric', 'min:0'],
        ];
    }
}

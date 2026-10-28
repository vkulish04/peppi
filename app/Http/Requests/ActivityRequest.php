<?php

namespace App\Http\Requests;

use App\Enums\BillingType;
use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Validation\Rules\Enum;

class ActivityRequest extends FormRequest
{
    public function authorize(): bool { return true; }
    public function rules(): array
    {
        return [
            'name' => ['required', 'string', 'max:255'],
            'price' => ['required', 'numeric', 'min:0'],
            'billing_type' => ['required', new Enum(BillingType::class)],
            'category' => ['nullable', 'string', 'max:100'],
            'instructor' => ['nullable', 'string', 'max:255'],
            'description' => ['nullable', 'string'],
            'color' => ['nullable', 'string', 'max:30'],
            'active' => ['sometimes', 'boolean'],
        ];
    }
}

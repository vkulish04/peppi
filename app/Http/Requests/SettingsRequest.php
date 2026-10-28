<?php

namespace App\Http\Requests;

use Illuminate\Foundation\Http\FormRequest;

class SettingsRequest extends FormRequest
{
    public function authorize(): bool
    {
        return true;
    }

    protected function prepareForValidation(): void
    {
        $iban = $this->input('iban');
        if (is_string($iban)) {
            $this->merge(['iban' => strtoupper(preg_replace('/\s+/', '', $iban))]);
        }
    }

    public function rules(): array
    {
        return [
            'name' => ['required', 'string', 'max:255'],
            'edrpou' => ['nullable', 'string', 'max:20'],
            'address' => ['nullable', 'string', 'max:255'],
            'phone' => ['nullable', 'string', 'max:50'],
            'email' => ['nullable', 'email', 'max:255'],
            'iban' => ['nullable', 'regex:/^UA[0-9]{27}$/'],
            'bank_name' => ['nullable', 'string', 'max:255'],
            'daily_food_rate' => ['required', 'numeric', 'min:0', 'max:100000'],
            'receipt_contact_phone' => ['nullable', 'string', 'max:50'],
            'receipt_contact_email' => ['nullable', 'email', 'max:255'],
            'payment_purpose_template' => ['required', 'string', 'max:500'],
            'receipt_note' => ['nullable', 'string', 'max:2000'],
        ];
    }

    public function messages(): array
    {
        return ['iban.regex' => 'Введіть український IBAN: UA та 27 цифр.'];
    }
}

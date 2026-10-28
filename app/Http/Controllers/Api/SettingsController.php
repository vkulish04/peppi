<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Http\Requests\SettingsRequest;
use App\Models\KindergartenSetting;
use App\Services\AuditLogger;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Storage;
use Illuminate\Support\Str;

class SettingsController extends Controller
{
    public function __construct(private AuditLogger $audit) {}
    public function show(): JsonResponse
    {
        $settings = KindergartenSetting::query()->first();
        $bank = $settings?->bank_details ?? [];

        return response()->json([
            'name' => $settings?->name ?: config('app.name', 'ПЕППІ Дитячий Простір'),
            'edrpou' => $settings?->edrpou ?? '',
            'address' => $settings?->address ?? '',
            'phone' => $settings?->phone ?? '',
            'email' => $settings?->email ?? '',
            'iban' => $bank['iban'] ?? '',
            'bankName' => $bank['bank_name'] ?? ($bank['bank'] ?? ''),
            'dailyFoodRate' => (float) ($settings?->daily_food_rate ?? 160),
            'receiptContactPhone' => $settings?->receipt_contact_phone ?? '',
            'receiptContactEmail' => $settings?->receipt_contact_email ?? '',
            'paymentPurposeTemplate' => $settings?->payment_purpose_template ?: 'Оплата за дитсадок за {month}.{year}, {child}',
            'receiptNote' => $settings?->receipt_note ?? '',
            'receiptLogoUrl' => $settings?->receipt_logo_path
                ? Storage::disk('public')->url($settings->receipt_logo_path)
                : '/images/peppi/frame-1.png',
        ]);
    }

    public function update(SettingsRequest $request): JsonResponse
    {
        $data = $request->validated();
        $settings = KindergartenSetting::query()->firstOrNew(['id' => 1]);
        $settings->fill([
            'name' => trim($data['name']),
            'edrpou' => $data['edrpou'] ?? null,
            'address' => $data['address'] ?? null,
            'phone' => $data['phone'] ?? null,
            'email' => $data['email'] ?? null,
            'daily_food_rate' => $data['daily_food_rate'],
            'receipt_contact_phone' => $data['receipt_contact_phone'] ?? null,
            'receipt_contact_email' => $data['receipt_contact_email'] ?? null,
            'payment_purpose_template' => trim($data['payment_purpose_template']),
            'receipt_note' => $data['receipt_note'] ?? null,
            'bank_details' => array_merge($settings->bank_details ?? [], [
                'iban' => $data['iban'] ?? '',
                'bank_name' => $data['bank_name'] ?? '',
            ]),
        ]);
        $fields = array_keys($settings->getDirty());
        $settings->save();
        if ($fields) $this->audit->record($request->user(), 'settings.updated', 'settings', $settings->id, ['fields' => $fields]);

        return $this->show();
    }

    public function uploadLogo(Request $request): JsonResponse
    {
        $data = $request->validate(['logo' => ['required', 'file', 'mimes:jpg,jpeg', 'max:2048']]);
        $settings = KindergartenSetting::query()->firstOrNew(['id' => 1]);
        $oldPath = $settings->receipt_logo_path;
        $file = $data['logo'];
        $path = $file->storeAs('receipt-logos', Str::uuid().'.'.$file->extension(), 'public');
        $settings->receipt_logo_path = $path;
        $settings->save();
        $this->audit->record($request->user(), 'settings.logo_uploaded', 'settings', $settings->id);
        if ($oldPath) Storage::disk('public')->delete($oldPath);

        return $this->show();
    }

    public function removeLogo(Request $request): JsonResponse
    {
        $settings = KindergartenSetting::query()->first();
        if ($settings?->receipt_logo_path) {
            $oldPath = $settings->receipt_logo_path;
            $settings->receipt_logo_path = null;
            $settings->save();
            $this->audit->record($request->user(), 'settings.logo_removed', 'settings', $settings->id);
            Storage::disk('public')->delete($oldPath);
        }

        return $this->show();
    }
}

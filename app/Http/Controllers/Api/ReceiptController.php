<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\KindergartenSetting;
use App\Models\FinanceOption;
use App\Models\MonthlyBill;
use Dompdf\Dompdf;
use Dompdf\Options;
use Illuminate\Support\Facades\Storage;

class ReceiptController extends Controller
{
    public function download(MonthlyBill $bill)
    {
        $bill->load([
            'child.group',
            'items',
            'payments' => fn ($query) => $query->orderBy('payment_date')->orderBy('id'),
        ]);

        $settings = KindergartenSetting::query()->first();
        $bank = $settings?->bank_details ?? [];
        $logoPath = $settings?->receipt_logo_path && Storage::disk('public')->exists($settings->receipt_logo_path)
            ? Storage::disk('public')->path($settings->receipt_logo_path)
            : public_path('images/peppi/receipt-logo.jpg');
        $logoDataUri = 'data:image/jpeg;base64,'.base64_encode(file_get_contents($logoPath));
        $purpose = strtr($settings?->payment_purpose_template ?: 'Оплата за дитсадок за {month}.{year}, {child}', [
            '{month}' => str_pad($bill->month, 2, '0', STR_PAD_LEFT),
            '{year}' => (string) $bill->year,
            '{child}' => $bill->child->full_name,
        ]);
        $paymentMethods = FinanceOption::where('type', 'payment_method')->pluck('name', 'code')->all();

        $kindergarten = [
            'name' => $settings?->name ?: config('app.name', 'Дитячий садок'),
            'edrpou' => $settings?->edrpou ?: '',
            'address' => $settings?->address ?: '',
            'phone' => $settings?->phone ?: '',
            'contact_phone' => $settings?->receipt_contact_phone ?: ($settings?->phone ?: ''),
            'contact_email' => $settings?->receipt_contact_email ?: ($settings?->email ?: ''),
            'iban' => $bank['iban'] ?? '',
            'bank_name' => $bank['bank_name'] ?? ($bank['bank'] ?? ''),
            'logo_data_uri' => $logoDataUri,
            'payment_purpose' => $purpose,
            'receipt_note' => $settings?->receipt_note ?: '',
        ];

        $receiptNumber = sprintf('KV-%04d%02d-%05d', $bill->year, $bill->month, $bill->id);
        $html = view('receipts.monthly-bill', [
            'bill' => $bill,
            'kindergarten' => $kindergarten,
            'receiptNumber' => $receiptNumber,
            'paymentMethods' => $paymentMethods,
        ])->render();

        $options = new Options();
        $options->set('defaultFont', 'DejaVu Sans');
        $options->set('isRemoteEnabled', false);

        $pdf = new Dompdf($options);
        $pdf->loadHtml($html, 'UTF-8');
        $pdf->setPaper('A4', 'portrait');
        $pdf->render();

        $filename = sprintf('receipt-%04d-%02d-child-%d.pdf', $bill->year, $bill->month, $bill->child_id);

        return response($pdf->output(), 200, [
            'Content-Type' => 'application/pdf',
            'Content-Disposition' => 'attachment; filename="'.$filename.'"',
            'Cache-Control' => 'private, no-store, max-age=0',
        ]);
    }
}

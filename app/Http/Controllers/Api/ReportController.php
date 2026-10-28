<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Services\ReportService;
use Illuminate\Http\Request;
use Symfony\Component\HttpFoundation\StreamedResponse;

class ReportController extends Controller
{
    public function __construct(private ReportService $reports) {}

    public function monthly(Request $request)
    {
        $data = $this->period($request);

        return response()->json($this->reports->monthly($data['year'], $data['month']));
    }

    public function monthlyCsv(Request $request): StreamedResponse
    {
        $data = $this->period($request);
        $report = $this->reports->monthly($data['year'], $data['month']);
        $filename = sprintf('kindergarten-finance-%04d-%02d.csv', $data['year'], $data['month']);

        return response()->streamDownload(function () use ($report) {
            $out = fopen('php://output', 'wb');
            fwrite($out, "\xEF\xBB\xBF");
            fputcsv($out, ['Показник', 'Сума, грн'], ';', '"', '');
            fputcsv($out, ['Нараховано батькам', $report['revenue']['billed']], ';', '"', '');
            fputcsv($out, ['Сплачено за рахунки місяця', $report['revenue']['received_for_bills']], ';', '"', '');
            fputcsv($out, ['Касовий прихід', $report['revenue']['cash_received']], ';', '"', '');
            fputcsv($out, ['Борг батьків', $report['revenue']['debt']], ';', '"', '');
            fputcsv($out, ['Нараховано зарплати', $report['salary']['accrued']], ';', '"', '');
            fputcsv($out, ['Фактично виплачено зарплати', $report['salary']['cash_paid']], ';', '"', '');
            fputcsv($out, ['Операційні витрати', $report['expenses']['total']], ';', '"', '');
            fputcsv($out, ['Результат за нарахуваннями', $report['result']['accrual_result']], ';', '"', '');
            fputcsv($out, ['Грошовий потік', $report['result']['cash_flow']], ';', '"', '');
            fclose($out);
        }, $filename, ['Content-Type' => 'text/csv; charset=UTF-8']);
    }

    private function period(Request $request): array
    {
        return $request->validate([
            'year' => ['required', 'integer', 'between:2000,2100'],
            'month' => ['required', 'integer', 'between:1,12'],
        ]);
    }
}

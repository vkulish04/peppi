<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Services\JournalCarryForward;
use Illuminate\Http\Request;
use Illuminate\Validation\Rule;

class JournalCarryForwardController extends Controller
{
    public function __construct(private JournalCarryForward $service) {}

    public function preview(Request $request)
    {
        $data = $this->period($request);
        return response()->json($this->service->preview($data['year'], $data['month']));
    }

    public function store(Request $request)
    {
        $data = $this->period($request);
        $confirmation = $request->validate([
            'confirmation' => ['required', Rule::in(['COPY_NEXT_MONTH'])],
            'preview_hash' => ['required', 'string', 'size:64'],
        ]);
        return response()->json($this->service->copy($data['year'], $data['month'], $confirmation['preview_hash'], $request->user()));
    }

    private function period(Request $request): array
    {
        return $request->validate(['year' => ['required', 'integer', 'between:2020,2100'], 'month' => ['required', 'integer', 'between:1,12']]);
    }
}

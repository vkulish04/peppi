<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Services\JournalReset;
use Illuminate\Http\Request;
use Illuminate\Validation\Rule;

class JournalResetController extends Controller
{
    public function __construct(private JournalReset $reset) {}

    public function preview(Request $request)
    {
        $data = $this->period($request);
        return response()->json($this->reset->preview($data['year'], $data['month']));
    }

    public function store(Request $request)
    {
        $data = $this->period($request);
        $confirmed = $request->validate(['confirmation' => ['required', Rule::in(['CLEAR_MONTH'])], 'preview_hash' => ['required', 'string', 'size:64']]);
        return response()->json($this->reset->clear($data['year'], $data['month'], $confirmed['preview_hash'], $request->user()));
    }

    private function period(Request $request): array
    {
        return $request->validate(['year' => ['required', 'integer', 'between:2020,2100'], 'month' => ['required', 'integer', 'between:1,12']]);
    }
}

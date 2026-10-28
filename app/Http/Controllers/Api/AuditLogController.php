<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use Illuminate\Http\JsonResponse;
use Illuminate\Support\Facades\DB;

class AuditLogController extends Controller
{
    public function index(): JsonResponse
    {
        return response()->json(DB::table('audit_logs')->leftJoin('users', 'users.id', '=', 'audit_logs.user_id')->select('audit_logs.*', 'users.name as current_user_name')->orderByDesc('audit_logs.id')->limit(100)->get()->map(function ($row) {
            $row->details = json_decode($row->details ?? '{}', true);
            $row->actor_name = $row->actor_name ?: ($row->current_user_name ?: 'Система');
            return $row;
        }));
    }
}

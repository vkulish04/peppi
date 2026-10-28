<?php

namespace App\Services;

use App\Models\User;
use Illuminate\Support\Facades\DB;

class AuditLogger
{
    public function record(?User $actor, string $action, string $subjectType, ?int $subjectId = null, array $details = []): void
    {
        DB::table('audit_logs')->insert([
            'user_id' => $actor?->id,
            'actor_name' => $actor?->name ?? 'Система',
            'action' => $action,
            'entity_type' => $subjectType,
            'entity_id' => $subjectId,
            'details' => json_encode($details, JSON_UNESCAPED_UNICODE),
            'created_at' => now(),
            'updated_at' => now(),
        ]);
    }
}

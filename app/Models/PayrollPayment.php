<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class PayrollPayment extends Model
{
    protected $fillable = ['payroll_id', 'amount', 'stage', 'payment_method', 'is_official', 'payment_date', 'notes', 'request_id', 'created_by'];
    protected function casts(): array { return ['amount' => 'decimal:2', 'is_official' => 'boolean', 'payment_date' => 'date', 'legacy' => 'boolean']; }
    public function payroll(): BelongsTo { return $this->belongsTo(Payroll::class); }
}

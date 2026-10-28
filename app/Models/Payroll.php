<?php

namespace App\Models;

use App\Enums\PayrollStatus;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;

class Payroll extends Model
{
    use HasFactory;
    protected $appends = ['paid_amount', 'remaining_amount'];

    protected $fillable = [
        'employee_id', 'year', 'month', 'base_salary', 'bonus', 'deductions',
        'final_amount', 'status', 'payment_date', 'notes',
    ];

    protected function casts(): array
    {
        return [
            'base_salary' => 'decimal:2', 'bonus' => 'decimal:2',
            'deductions' => 'decimal:2', 'final_amount' => 'decimal:2',
            'status' => PayrollStatus::class, 'payment_date' => 'date',
        ];
    }

    public function employee(): BelongsTo { return $this->belongsTo(Employee::class); }
    public function payments(): HasMany { return $this->hasMany(PayrollPayment::class)->orderBy('payment_date')->orderBy('id'); }
    public function getPaidAmountAttribute(): float
    {
        return round((float) ($this->relationLoaded('payments') ? $this->payments->sum('amount') : $this->payments()->sum('amount')), 2);
    }
    public function getRemainingAmountAttribute(): float { return max(0, round((float) $this->final_amount - $this->paid_amount, 2)); }
}

<?php

namespace App\Models;

use App\Enums\BillStatus;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;

class MonthlyBill extends Model
{
    use HasFactory;

    protected $fillable = [
        'child_id', 'year', 'month', 'discount_percent', 'absence_days',
        'sick_leave_days', 'daily_food_rate', 'custom_deduction', 'absence_note',
        'subtotal', 'discount_amount', 'deductions_total', 'total', 'status', 'notes',
    ];

    protected function casts(): array
    {
        return [
            'discount_percent' => 'decimal:2',
            'daily_food_rate' => 'decimal:2',
            'custom_deduction' => 'decimal:2',
            'subtotal' => 'decimal:2',
            'discount_amount' => 'decimal:2',
            'deductions_total' => 'decimal:2',
            'total' => 'decimal:2',
            'status' => BillStatus::class,
        ];
    }

    public function child(): BelongsTo { return $this->belongsTo(Child::class); }
    public function items(): HasMany { return $this->hasMany(MonthlyBillItem::class); }
    public function payments(): HasMany { return $this->hasMany(Payment::class); }

    public function getPaidAmountAttribute(): float
    {
        return (float) $this->payments()->sum('amount');
    }

    public function getDebtAttribute(): float
    {
        return max(0, round((float) $this->total - $this->paid_amount, 2));
    }
}

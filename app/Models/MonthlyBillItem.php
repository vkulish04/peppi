<?php

namespace App\Models;

use App\Enums\BillingType;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class MonthlyBillItem extends Model
{
    use HasFactory;

    protected $fillable = [
        'monthly_bill_id', 'activity_id', 'name', 'billing_type',
        'quantity', 'unit_price', 'amount',
    ];

    protected function casts(): array
    {
        return [
            'billing_type' => BillingType::class,
            'quantity' => 'decimal:2',
            'unit_price' => 'decimal:2',
            'amount' => 'decimal:2',
        ];
    }

    public function bill(): BelongsTo { return $this->belongsTo(MonthlyBill::class, 'monthly_bill_id'); }
    public function activity(): BelongsTo { return $this->belongsTo(Activity::class); }

    public function isSubscription(): bool
    {
        return mb_stripos(trim($this->name), 'абонемент') === 0;
    }
}

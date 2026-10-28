<?php

namespace App\Models;

use App\Enums\BillingType;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\SoftDeletes;
use Illuminate\Database\Eloquent\Relations\HasMany;

class Activity extends Model
{
    use HasFactory, SoftDeletes;

    protected $fillable = [
        'name', 'price', 'billing_type', 'category', 'instructor',
        'description', 'color', 'active',
    ];

    public function pricePeriods(): HasMany
    {
        return $this->hasMany(ActivityPricePeriod::class);
    }

    protected function casts(): array
    {
        return [
            'price' => 'decimal:2',
            'billing_type' => BillingType::class,
            'active' => 'boolean',
        ];
    }
}

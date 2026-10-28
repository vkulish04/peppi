<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;
use Illuminate\Database\Eloquent\SoftDeletes;

class Child extends Model
{
    use HasFactory, SoftDeletes;

    protected $fillable = [
        'group_id', 'full_name', 'birth_date', 'parent_name', 'parent_phone',
        'discount_percent', 'notes', 'active',
    ];

    protected function casts(): array
    {
        return [
            'birth_date' => 'date',
            'discount_percent' => 'decimal:2',
            'active' => 'boolean',
        ];
    }

    public function group(): BelongsTo { return $this->belongsTo(Group::class); }
    public function bills(): HasMany { return $this->hasMany(MonthlyBill::class); }
}

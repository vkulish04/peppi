<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\HasMany;
use Illuminate\Database\Eloquent\SoftDeletes;

class Employee extends Model
{
    use HasFactory, SoftDeletes;

    protected $fillable = [
        'full_name', 'position', 'phone', 'base_salary', 'tax_rate',
        'start_date', 'notes', 'active',
    ];

    protected function casts(): array
    {
        return [
            'base_salary' => 'decimal:2',
            'tax_rate' => 'decimal:2',
            'start_date' => 'date',
            'active' => 'boolean',
        ];
    }

    public function payrolls(): HasMany { return $this->hasMany(Payroll::class); }
}

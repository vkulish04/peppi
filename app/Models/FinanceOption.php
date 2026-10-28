<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class FinanceOption extends Model
{
    protected $fillable = ['type', 'code', 'name', 'sort_order', 'icon'];

    protected $hidden = ['created_at', 'updated_at'];
    protected $appends = ['locked'];

    public function getLockedAttribute(): bool { return $this->type === 'expense_category' && $this->code === 'salary'; }
}

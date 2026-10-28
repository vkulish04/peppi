<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class ActivityPricePeriod extends Model
{
    protected $fillable = ['activity_id', 'year', 'month', 'price'];

    protected function casts(): array
    {
        return ['year' => 'integer', 'month' => 'integer', 'price' => 'decimal:2'];
    }

    public function activity(): BelongsTo
    {
        return $this->belongsTo(Activity::class);
    }
}

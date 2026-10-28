<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class KindergartenSetting extends Model
{
    protected $fillable = [
        'name', 'edrpou', 'address', 'phone', 'email', 'bank_details', 'daily_food_rate',
        'receipt_logo_path', 'receipt_contact_phone', 'receipt_contact_email',
        'payment_purpose_template', 'receipt_note',
    ];
    protected $casts = ['bank_details' => 'array', 'daily_food_rate' => 'decimal:2'];
}

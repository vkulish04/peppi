<?php

namespace App\Enums;

enum BillingType: string
{
    case MONTHLY = 'monthly';
    case PER_LESSON = 'per_lesson';
    case DAILY_FOOD = 'daily_food';
}

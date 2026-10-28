<?php

namespace App\Enums;

enum BillStatus: string
{
    case DRAFT = 'draft';
    case UNPAID = 'unpaid';
    case PARTIALLY_PAID = 'partially_paid';
    case PAID = 'paid';
}

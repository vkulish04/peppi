<?php

namespace App\Support;

class ExpenseIcons
{
    public static function keys(): array
    {
        return array_column(json_decode(file_get_contents(resource_path('data/expense-icons.json')), true, 512, JSON_THROW_ON_ERROR), 'key');
    }
}

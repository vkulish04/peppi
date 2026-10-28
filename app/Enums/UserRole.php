<?php

namespace App\Enums;

enum UserRole: string
{
    case ACCOUNTANT = 'accountant';
    case DIRECTOR = 'director';
    case EDUCATOR = 'educator';
}

<?php

namespace Database\Seeders;

use App\Enums\BillingType;
use App\Enums\UserRole;
use App\Models\Activity;
use App\Models\Group;
use App\Models\KindergartenSetting;
use App\Models\User;
use Illuminate\Database\Seeder;
use Illuminate\Support\Facades\Hash;

class DatabaseSeeder extends Seeder
{
    public function run(): void
    {
        $groups = [
            'Ясельна «Карапузи»',
            'Молодша «Сонечко»',
            'Середня «Бджілки»',
            'Старша «Ромашка»',
        ];

        foreach ($groups as $index => $name) {
            Group::firstOrCreate(
                ['name' => $name],
                ['sort_order' => $index + 1, 'active' => true],
            );
        }

        Activity::firstOrCreate(
            ['name' => 'Харчування'],
            [
                'price' => 3200,
                'billing_type' => BillingType::DAILY_FOOD,
                'category' => 'core',
                'color' => 'orange',
                'active' => true,
            ],
        );
        Activity::firstOrCreate(
            ['name' => 'Англійська'],
            [
                'price' => 650,
                'billing_type' => BillingType::MONTHLY,
                'category' => 'languages',
                'color' => 'amber',
                'active' => true,
            ],
        );
        Activity::firstOrCreate(
            ['name' => 'Хореографія'],
            [
                'price' => 550,
                'billing_type' => BillingType::MONTHLY,
                'category' => 'sport',
                'color' => 'rose',
                'active' => true,
            ],
        );

        KindergartenSetting::firstOrCreate(
            ['id' => 1],
            [
                'name' => env('KINDERGARTEN_NAME', env('APP_NAME', 'Дитячий садок')),
                'edrpou' => env('KINDERGARTEN_EDRPOU'),
                'address' => env('KINDERGARTEN_ADDRESS'),
                'phone' => env('KINDERGARTEN_PHONE'),
                'email' => env('KINDERGARTEN_EMAIL'),
                'bank_details' => [
                    'iban' => env('KINDERGARTEN_IBAN'),
                    'bank_name' => env('KINDERGARTEN_BANK_NAME'),
                ],
            ],
        );

        // Demo users are opt-in only. Never enable them on a public production instance.
        if (filter_var(env('SEED_DEMO_USERS', false), FILTER_VALIDATE_BOOL)) {
            $accounts = [
                [
                    'email' => 'accountant@kindergarten.ua',
                    'name' => 'Шевченко Оксана Миколаївна',
                    'password' => 'buh12345',
                    'role' => UserRole::ACCOUNTANT,
                ],
                [
                    'email' => 'director@kindergarten.ua',
                    'name' => 'Ковальчук Тетяна Володимирівна',
                    'password' => 'admin123',
                    'role' => UserRole::DIRECTOR,
                ],
                [
                    'email' => 'educator@kindergarten.ua',
                    'name' => 'Петренко Олена Петрівна',
                    'password' => 'sadok123',
                    'role' => UserRole::EDUCATOR,
                ],
            ];

            foreach ($accounts as $account) {
                User::updateOrCreate(
                    ['email' => $account['email']],
                    [
                        'name' => $account['name'],
                        'password' => Hash::make($account['password']),
                        'role' => $account['role'],
                        'active' => true,
                    ],
                );
            }
        }

        // Optional extra administrator configured via .env.
        if ($email = env('ADMIN_EMAIL')) {
            User::updateOrCreate(
                ['email' => $email],
                [
                    'name' => env('ADMIN_NAME', 'Адміністратор'),
                    'password' => Hash::make(env('ADMIN_PASSWORD', 'ChangeMe123!')),
                    'role' => UserRole::DIRECTOR,
                    'active' => true,
                ],
            );
        }
    }
}

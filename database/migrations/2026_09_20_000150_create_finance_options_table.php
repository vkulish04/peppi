<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

return new class extends Migration {
    public function up(): void
    {
        Schema::create('finance_options', function (Blueprint $table) {
            $table->id();
            $table->string('type', 30);
            $table->string('code', 60);
            $table->string('name');
            $table->unsignedSmallInteger('sort_order')->default(0);
            $table->timestamps();
            $table->unique(['type', 'code']);
        });

        $now = now();
        $defaults = [
            ['expense_category', 'food', 'Харчування та продукти'],
            ['expense_category', 'utilities', 'Вивіз сміття та комунальні'],
            ['expense_category', 'inventory', 'Покупка речей, іграшок, канцелярії'],
            ['expense_category', 'cleaning', 'Миючі засоби та гігієна'],
            ['expense_category', 'maintenance', 'Ремонт та обслуговування'],
            ['expense_category', 'other', 'Інші розтрати'],
            ['payment_method', 'cash', 'Готівка'],
            ['payment_method', 'bank_transfer', 'Банківський переказ'],
            ['payment_method', 'card', 'Картка'],
        ];
        DB::table('finance_options')->insert(array_map(
            fn ($row, $index) => [
                'type' => $row[0], 'code' => $row[1], 'name' => $row[2],
                'sort_order' => $index, 'created_at' => $now, 'updated_at' => $now,
            ], $defaults, array_keys($defaults),
        ));
    }

    public function down(): void
    {
        Schema::dropIfExists('finance_options');
    }
};

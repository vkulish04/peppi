<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Support\Facades\DB;

return new class extends Migration {
    public function up(): void
    {
        DB::transaction(function () {
            DB::table('finance_options')->updateOrInsert(['type' => 'expense_category', 'code' => 'salary'],
                ['name' => 'Зарплата', 'sort_order' => 0, 'created_at' => now(), 'updated_at' => now()]);
            // Reuse the user-created category without losing any existing expense records.
            $duplicates = DB::table('finance_options')->where('type', 'expense_category')->where('code', '!=', 'salary')->whereIn(DB::raw('LOWER(TRIM(name))'), ['зарплата', 'зарплата та аванс'])->get();
            foreach ($duplicates as $option) {
                DB::table('expenses')->where('category', $option->code)->update(['category' => 'salary']);
                DB::table('finance_options')->where('id', $option->id)->delete();
            }
        });
    }

    public function down(): void
    {
        // Retain the category so historical expense references remain valid.
    }
};

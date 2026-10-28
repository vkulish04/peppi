<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

return new class extends Migration {
    public function up(): void
    {
        Schema::table('finance_options', fn (Blueprint $table) => $table->string('icon', 60)->nullable());
        $defaults = ['salary' => 'Banknote', 'food' => 'Utensils', 'utilities' => 'Building2', 'inventory' => 'ShoppingBag', 'cleaning' => 'SprayCan', 'maintenance' => 'Wrench', 'other' => 'Receipt'];
        foreach (DB::table('finance_options')->where('type', 'expense_category')->get() as $option) {
            $icon = $defaults[$option->code] ?? (str_contains(mb_strtolower($option->name), 'подат') ? 'Percent' : 'Receipt');
            DB::table('finance_options')->where('id', $option->id)->update(['icon' => $icon]);
        }
    }
    public function down(): void { Schema::table('finance_options', fn (Blueprint $table) => $table->dropColumn('icon')); }
};

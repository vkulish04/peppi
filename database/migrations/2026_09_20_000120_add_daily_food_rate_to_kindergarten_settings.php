<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration {
    public function up(): void
    {
        Schema::table('kindergarten_settings', function (Blueprint $table) {
            $table->decimal('daily_food_rate', 12, 2)->default(160);
        });
    }

    public function down(): void
    {
        Schema::table('kindergarten_settings', function (Blueprint $table) {
            $table->dropColumn('daily_food_rate');
        });
    }
};

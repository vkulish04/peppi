<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration {
    public function up(): void
    {
        Schema::table('kindergarten_settings', function (Blueprint $table) {
            $table->string('receipt_logo_path')->nullable();
            $table->string('receipt_contact_phone', 50)->nullable();
            $table->string('receipt_contact_email')->nullable();
            $table->string('payment_purpose_template', 500)->nullable();
            $table->text('receipt_note')->nullable();
        });
    }

    public function down(): void
    {
        Schema::table('kindergarten_settings', function (Blueprint $table) {
            $table->dropColumn(['receipt_logo_path', 'receipt_contact_phone', 'receipt_contact_email', 'payment_purpose_template', 'receipt_note']);
        });
    }
};

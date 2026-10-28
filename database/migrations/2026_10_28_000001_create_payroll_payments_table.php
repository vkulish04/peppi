<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

return new class extends Migration {
    public function up(): void
    {
        Schema::create('payroll_payments', function (Blueprint $table) {
            $table->id();
            $table->foreignId('payroll_id')->constrained()->cascadeOnDelete();
            $table->decimal('amount', 12, 2);
            $table->string('stage');
            $table->string('payment_method');
            $table->boolean('is_official')->nullable();
            $table->date('payment_date')->nullable();
            $table->text('notes')->nullable();
            $table->boolean('legacy')->default(false);
            $table->uuid('request_id')->nullable()->unique();
            $table->foreignId('created_by')->nullable()->constrained('users')->nullOnDelete();
            $table->timestamps();
            $table->index('payment_date');
        });
        // Preserve previously marked paid salaries without inventing payment details.
        DB::table('payrolls')->where('status', 'paid')->where('final_amount', '>', 0)->orderBy('id')->chunkById(100, function ($rows) {
            foreach ($rows as $row) DB::table('payroll_payments')->insert([
                'payroll_id' => $row->id, 'amount' => $row->final_amount, 'stage' => 'salary',
                'payment_method' => 'unspecified', 'is_official' => null, 'legacy' => true,
                'payment_date' => $row->payment_date, 'notes' => 'Перенесено з попереднього статусу «Виплачено». Спосіб та офіційність не вказані.',
                'created_at' => now(), 'updated_at' => now(),
            ]);
        });
    }

    public function down(): void { Schema::dropIfExists('payroll_payments'); }
};

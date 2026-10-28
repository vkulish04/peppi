<?php
use Illuminate\Database\Migrations\Migration; use Illuminate\Database\Schema\Blueprint; use Illuminate\Support\Facades\Schema;
return new class extends Migration { public function up(): void { Schema::create('kindergarten_settings', function(Blueprint $t){ $t->id(); $t->string('name'); $t->string('edrpou')->nullable(); $t->string('address')->nullable(); $t->string('phone')->nullable(); $t->string('email')->nullable(); $t->json('bank_details')->nullable(); $t->timestamps(); }); } public function down(): void { Schema::dropIfExists('kindergarten_settings'); } };

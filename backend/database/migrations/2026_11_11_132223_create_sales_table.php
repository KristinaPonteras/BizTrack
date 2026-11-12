<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration {
    public function up(): void
    {
        Schema::create('sales', function (Blueprint $table) {
            $table->id();
            $table->string('invoice_number')->unique();

            $table->foreignId('user_id')
                ->constrained('users')
                ->restrictOnDelete();

            $table->dateTime('sale_date');
            $table->decimal('total_amount', 12, 2)->default(0);
            $table->enum('payment_method', [
                'cash',
                'card',
                'e_wallet',
                'bank_transfer'
            ]);
            $table->enum('status', [
                'completed',
                'cancelled'
            ])->default('completed');

            $table->timestamps();
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('sales');
    }
};
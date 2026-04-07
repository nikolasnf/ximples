<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('token_wallets', function (Blueprint $table) {
            $table->id();
            $table->foreignId('user_id')->constrained()->cascadeOnDelete();
            $table->uuid('tenant_id')->index();
            $table->integer('balance')->default(0);
            $table->timestamps();

            $table->unique('user_id');
        });

        Schema::create('token_transactions', function (Blueprint $table) {
            $table->id();
            $table->foreignId('user_id')->constrained()->cascadeOnDelete();
            $table->uuid('tenant_id')->index();
            $table->string('type'); // credit | debit
            $table->integer('amount');
            $table->string('source'); // signup_bonus | purchase | usage | adjustment
            $table->nullableMorphs('reference');
            $table->string('description')->nullable();
            $table->json('metadata')->nullable();
            $table->timestamps();

            $table->index(['user_id', 'created_at']);
        });

        Schema::create('token_packages', function (Blueprint $table) {
            $table->id();
            $table->string('name');
            $table->string('slug')->unique();
            $table->integer('tokens');
            $table->decimal('price', 10, 2);
            $table->string('currency', 3)->default('BRL');
            $table->boolean('is_active')->default(true);
            $table->integer('sort_order')->default(0);
            $table->timestamps();
        });

        Schema::table('tasks', function (Blueprint $table) {
            $table->integer('token_cost')->default(0)->after('status');
        });
    }

    public function down(): void
    {
        Schema::table('tasks', function (Blueprint $table) {
            $table->dropColumn('token_cost');
        });
        Schema::dropIfExists('token_transactions');
        Schema::dropIfExists('token_wallets');
        Schema::dropIfExists('token_packages');
    }
};

<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('copy_suggestions', function (Blueprint $table) {
            $table->id();
            $table->foreignId('user_id')->constrained()->cascadeOnDelete();
            $table->uuid('tenant_id')->index();

            // Polymorphic-ish source pointer (campaign / page / experiment)
            $table->string('source_type', 32); // campaign, page, experiment
            $table->unsignedBigInteger('source_id');

            // What kind of copy is being suggested
            $table->string('suggestion_type', 32); // headline, subheadline, cta, message_opening, body, full_message

            // The text being improved, and the AI output
            $table->text('original_copy');
            $table->text('suggested_copy');

            // AI reasoning & structured metadata
            $table->text('summary')->nullable();
            $table->json('reasoning')->nullable();

            // Context sent to the AI (product, audience, goal) + performance snapshot
            $table->json('context_json')->nullable();
            $table->json('performance_json')->nullable();

            // Lifecycle
            $table->string('status', 16)->default('generated'); // generated, applied, dismissed
            $table->timestamp('applied_at')->nullable();
            $table->timestamp('dismissed_at')->nullable();

            // Which field on the source was written on apply (e.g. "message_template")
            $table->string('applied_field', 64)->nullable();

            $table->timestamps();

            $table->index(['source_type', 'source_id']);
            $table->index(['user_id', 'status']);
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('copy_suggestions');
    }
};

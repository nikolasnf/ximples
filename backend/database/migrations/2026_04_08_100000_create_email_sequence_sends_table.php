<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('email_sequence_sends', function (Blueprint $table) {
            $table->id();
            $table->uuid('tenant_id')->index();

            // The asset that owns the email sequence
            $table->foreignId('asset_id')->constrained('assets')->cascadeOnDelete();

            // The user who triggered the dispatch
            $table->foreignId('user_id')->constrained()->cascadeOnDelete();

            // Contact list used for this dispatch
            $table->foreignId('list_id')->nullable()->constrained('contact_lists')->nullOnDelete();

            // Target contact
            $table->foreignId('contact_id')->constrained()->cascadeOnDelete();
            $table->string('contact_email');
            $table->string('contact_name')->nullable();

            // Which step in the sequence
            $table->unsignedSmallInteger('step_sequence');

            // Rendered content (after placeholder interpolation)
            $table->string('subject_rendered');
            $table->text('body_rendered');

            // Delay configuration
            $table->unsignedInteger('delay_hours')->default(0);

            // Scheduling & execution
            $table->timestamp('scheduled_at');
            $table->timestamp('sent_at')->nullable();

            // Status tracking
            $table->string('status')->default('pending');
            // pending → processing → sent → delivered / failed / bounced

            // Brevo response
            $table->string('brevo_message_id')->nullable()->index();
            $table->json('provider_response')->nullable();
            $table->text('error_message')->nullable();

            // Brevo event tracking
            $table->timestamp('delivered_at')->nullable();
            $table->timestamp('opened_at')->nullable();
            $table->timestamp('clicked_at')->nullable();
            $table->timestamp('bounced_at')->nullable();

            // Dispatch batch ID — groups all sends from a single dispatch action
            $table->uuid('dispatch_id')->index();

            $table->timestamps();

            // Prevent duplicate sends for same asset+contact+step in same dispatch
            $table->unique(['dispatch_id', 'contact_id', 'step_sequence'], 'ess_dispatch_contact_step_unique');

            // For querying pending sends
            $table->index(['status', 'scheduled_at']);

            // For stats per asset
            $table->index(['asset_id', 'dispatch_id', 'status']);
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('email_sequence_sends');
    }
};

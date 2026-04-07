<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('contacts', function (Blueprint $table) {
            $table->id();
            $table->foreignId('user_id')->constrained()->cascadeOnDelete();
            $table->uuid('tenant_id')->index();
            $table->string('name')->nullable();
            $table->string('phone');
            $table->string('email')->nullable();
            $table->string('source_file')->nullable();
            $table->json('tags')->nullable();
            $table->timestamps();

            $table->unique(['user_id', 'phone']);
            $table->index(['tenant_id', 'phone']);
        });

        Schema::create('contact_lists', function (Blueprint $table) {
            $table->id();
            $table->foreignId('user_id')->constrained()->cascadeOnDelete();
            $table->uuid('tenant_id')->index();
            $table->string('name');
            $table->text('description')->nullable();
            $table->timestamps();
        });

        Schema::create('contact_list_items', function (Blueprint $table) {
            $table->id();
            $table->foreignId('list_id')->constrained('contact_lists')->cascadeOnDelete();
            $table->foreignId('contact_id')->constrained('contacts')->cascadeOnDelete();
            $table->timestamps();

            $table->unique(['list_id', 'contact_id']);
        });

        Schema::create('campaigns', function (Blueprint $table) {
            $table->id();
            $table->foreignId('user_id')->constrained()->cascadeOnDelete();
            $table->uuid('tenant_id')->index();
            $table->foreignId('list_id')->nullable()->constrained('contact_lists')->nullOnDelete();
            $table->foreignId('landing_page_id')->nullable()->constrained('pages')->nullOnDelete();
            $table->string('name');
            $table->string('type')->default('whatsapp');
            $table->string('status')->default('draft'); // draft, scheduled, sending, completed, failed
            $table->text('message_template');
            $table->timestamp('scheduled_at')->nullable();
            $table->timestamp('started_at')->nullable();
            $table->timestamp('completed_at')->nullable();
            $table->integer('total_contacts')->default(0);
            $table->integer('sent_count')->default(0);
            $table->integer('failed_count')->default(0);
            $table->timestamps();
        });

        Schema::create('campaign_contacts', function (Blueprint $table) {
            $table->id();
            $table->foreignId('campaign_id')->constrained()->cascadeOnDelete();
            $table->foreignId('contact_id')->constrained()->cascadeOnDelete();
            $table->string('status')->default('pending'); // pending, sent, failed, skipped
            $table->timestamp('sent_at')->nullable();
            $table->text('error_message')->nullable();
            $table->text('rendered_message')->nullable();
            $table->timestamps();

            $table->unique(['campaign_id', 'contact_id']);
            $table->index(['campaign_id', 'status']);
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('campaign_contacts');
        Schema::dropIfExists('campaigns');
        Schema::dropIfExists('contact_list_items');
        Schema::dropIfExists('contact_lists');
        Schema::dropIfExists('contacts');
    }
};

<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('tracked_links', function (Blueprint $table) {
            $table->id();
            $table->foreignId('user_id')->constrained()->cascadeOnDelete();
            $table->uuid('tenant_id')->index();
            $table->foreignId('campaign_id')->nullable()->constrained()->nullOnDelete();
            $table->foreignId('contact_id')->nullable()->constrained()->nullOnDelete();
            $table->foreignId('page_id')->nullable()->constrained('pages')->nullOnDelete();
            $table->string('original_url', 2048);
            $table->string('short_code', 32)->unique();
            $table->unsignedInteger('click_count')->default(0);
            $table->timestamp('last_clicked_at')->nullable();
            $table->timestamps();

            $table->index(['campaign_id', 'contact_id']);
        });

        Schema::create('events', function (Blueprint $table) {
            $table->id();
            $table->foreignId('user_id')->constrained()->cascadeOnDelete();
            $table->uuid('tenant_id')->index();
            $table->foreignId('contact_id')->nullable()->constrained()->nullOnDelete();
            $table->foreignId('campaign_id')->nullable()->constrained()->nullOnDelete();
            $table->foreignId('page_id')->nullable()->constrained('pages')->nullOnDelete();
            $table->foreignId('tracked_link_id')->nullable()->constrained('tracked_links')->nullOnDelete();
            $table->string('type', 32); // click, visit, conversion
            $table->string('name', 64)->nullable(); // optional sub-type (e.g. "form_submit", "cta_click")
            $table->json('metadata')->nullable();
            $table->string('ip', 64)->nullable();
            $table->string('user_agent', 512)->nullable();
            $table->string('referer', 1024)->nullable();
            $table->string('session_id', 64)->nullable();
            $table->timestamps();

            $table->index(['user_id', 'type', 'created_at']);
            $table->index(['campaign_id', 'type']);
            $table->index(['page_id', 'type']);
            $table->index(['contact_id', 'type']);
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('events');
        Schema::dropIfExists('tracked_links');
    }
};

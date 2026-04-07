<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('page_templates', function (Blueprint $table) {
            $table->id();
            $table->string('name');
            $table->string('slug')->unique();
            $table->text('description')->nullable();
            $table->string('category')->index();
            $table->string('preview_image')->nullable();
            // Canonical structure: a PageDocument (version, theme, sections[]).
            // Same shape consumed by PageRenderer (React) and PageExportService (PHP),
            // so templates render identically in preview and export without duplication.
            $table->json('structure_json');
            // Reserved for future fully-custom templates with raw HTML/CSS. NULL for the
            // curated set, which uses structure_json exclusively.
            $table->longText('html_base')->nullable();
            $table->longText('css_base')->nullable();
            $table->boolean('is_active')->default(true);
            $table->integer('sort_order')->default(0);
            $table->timestamps();

            $table->index(['is_active', 'category']);
            $table->index('sort_order');
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('page_templates');
    }
};

<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('pages', function (Blueprint $table) {
            $table->string('type')->default('landing')->after('slug');
            $table->string('meta_title')->nullable()->after('type');
            $table->string('meta_description')->nullable()->after('meta_title');
            $table->json('theme_json')->nullable()->after('meta_description');
            $table->string('exported_html_path')->nullable()->after('content_json');
            $table->string('preview_image')->nullable()->after('exported_html_path');
        });
    }

    public function down(): void
    {
        Schema::table('pages', function (Blueprint $table) {
            $table->dropColumn([
                'type',
                'meta_title',
                'meta_description',
                'theme_json',
                'exported_html_path',
                'preview_image',
            ]);
        });
    }
};

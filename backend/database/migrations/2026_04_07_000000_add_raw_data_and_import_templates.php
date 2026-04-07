<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('contacts', function (Blueprint $table) {
            $table->json('raw_data')->nullable()->after('tags');

            // Allow duplicate detection by email too (nullable unique)
            $table->unique(['user_id', 'email'], 'contacts_user_email_unique');
        });

        Schema::create('import_mapping_templates', function (Blueprint $table) {
            $table->id();
            $table->foreignId('user_id')->constrained()->cascadeOnDelete();
            $table->uuid('tenant_id')->index();
            $table->string('name');
            $table->json('mappings'); // {"name": "billing_first_name", "email": "billing_email", ...}
            $table->timestamps();

            $table->unique(['user_id', 'name']);
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('import_mapping_templates');

        Schema::table('contacts', function (Blueprint $table) {
            $table->dropUnique('contacts_user_email_unique');
            $table->dropColumn('raw_data');
        });
    }
};

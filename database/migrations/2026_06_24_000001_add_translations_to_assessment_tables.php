<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('tests', function (Blueprint $table) {
            $table->json('translations')->nullable()->after('end_date');
        });

        Schema::table('questions', function (Blueprint $table) {
            $table->json('translations')->nullable()->after('scale_name');
        });

        Schema::table('options', function (Blueprint $table) {
            $table->json('translations')->nullable()->after('value');
        });

        Schema::table('result_interpretations', function (Blueprint $table) {
            $table->json('translations')->nullable()->after('recommendation');
        });
    }

    public function down(): void
    {
        Schema::table('result_interpretations', function (Blueprint $table) {
            $table->dropColumn('translations');
        });

        Schema::table('options', function (Blueprint $table) {
            $table->dropColumn('translations');
        });

        Schema::table('questions', function (Blueprint $table) {
            $table->dropColumn('translations');
        });

        Schema::table('tests', function (Blueprint $table) {
            $table->dropColumn('translations');
        });
    }
};

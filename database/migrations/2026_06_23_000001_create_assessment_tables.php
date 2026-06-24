<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('tests', function (Blueprint $table) {
            $table->id();
            $table->foreignId('created_by')->nullable()->constrained('users')->nullOnDelete();
            $table->string('title');
            $table->text('description')->nullable();
            $table->string('type')->index();
            $table->string('category')->nullable()->index();
            $table->boolean('is_required')->default(false)->index();
            $table->boolean('is_active')->default(true)->index();
            $table->json('access_roles')->nullable();
            $table->timestamp('start_date')->nullable()->index();
            $table->timestamp('end_date')->nullable()->index();
            $table->string('video_path')->nullable();
            $table->boolean('video_required')->default(false);
            $table->timestamps();
        });

        Schema::create('questions', function (Blueprint $table) {
            $table->id();
            $table->foreignId('test_id')->constrained()->cascadeOnDelete();
            $table->text('text');
            $table->string('type')->index();
            $table->unsignedInteger('order')->default(0)->index();
            $table->boolean('is_required')->default(true);
            $table->string('scale_name')->nullable()->index();
            $table->json('meta')->nullable();
            $table->timestamps();
        });

        Schema::create('options', function (Blueprint $table) {
            $table->id();
            $table->foreignId('question_id')->constrained()->cascadeOnDelete();
            $table->string('text');
            $table->decimal('score', 8, 2)->default(0);
            $table->string('value')->nullable()->index();
            $table->json('meta')->nullable();
            $table->timestamps();
        });

        Schema::create('scoring_rules', function (Blueprint $table) {
            $table->id();
            $table->foreignId('test_id')->unique()->constrained()->cascadeOnDelete();
            $table->string('method')->default('simple_sum')->index();
            $table->json('config')->nullable();
            $table->timestamps();
        });

        Schema::create('result_interpretations', function (Blueprint $table) {
            $table->id();
            $table->foreignId('test_id')->constrained()->cascadeOnDelete();
            $table->string('scale_name')->nullable()->index();
            $table->decimal('min_score', 8, 2)->nullable();
            $table->decimal('max_score', 8, 2)->nullable();
            $table->string('title');
            $table->text('description')->nullable();
            $table->text('recommendation')->nullable();
            $table->boolean('is_high_risk')->default(false)->index();
            $table->timestamps();
        });

        Schema::create('test_attempts', function (Blueprint $table) {
            $table->id();
            $table->foreignId('user_id')->constrained()->cascadeOnDelete();
            $table->foreignId('test_id')->constrained()->cascadeOnDelete();
            $table->timestamp('started_at')->nullable();
            $table->timestamp('finished_at')->nullable()->index();
            $table->decimal('total_score', 8, 2)->nullable();
            $table->json('result_json')->nullable();
            $table->string('status')->default('started')->index();
            $table->boolean('is_high_risk')->default(false)->index();
            $table->timestamps();
        });

        Schema::create('answers', function (Blueprint $table) {
            $table->id();
            $table->foreignId('attempt_id')->constrained('test_attempts')->cascadeOnDelete();
            $table->foreignId('question_id')->constrained()->cascadeOnDelete();
            $table->foreignId('option_id')->nullable()->constrained('options')->nullOnDelete();
            $table->text('text_answer')->nullable();
            $table->decimal('score', 8, 2)->default(0);
            $table->string('value')->nullable()->index();
            $table->json('meta')->nullable();
            $table->timestamps();
        });

        Schema::create('risk_notifications', function (Blueprint $table) {
            $table->id();
            $table->foreignId('user_id')->constrained()->cascadeOnDelete();
            $table->foreignId('test_attempt_id')->nullable()->constrained()->nullOnDelete();
            $table->string('type')->index();
            $table->string('channel')->index();
            $table->string('recipient')->nullable();
            $table->text('message');
            $table->string('status')->default('pending')->index();
            $table->timestamp('triggered_at')->nullable()->index();
            $table->timestamps();
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('risk_notifications');
        Schema::dropIfExists('answers');
        Schema::dropIfExists('test_attempts');
        Schema::dropIfExists('result_interpretations');
        Schema::dropIfExists('scoring_rules');
        Schema::dropIfExists('options');
        Schema::dropIfExists('questions');
        Schema::dropIfExists('tests');
    }
};

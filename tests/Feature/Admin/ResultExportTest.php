<?php

namespace Tests\Feature\Admin;

use App\Models\Test;
use App\Models\TestAttempt;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class ResultExportTest extends TestCase
{
    use RefreshDatabase;

    public function test_test_report_page_shows_attempt_answers(): void
    {
        $admin = User::factory()->create(['role' => 'admin']);
        [$student, $test] = $this->createCompletedAttemptWithAnswer();

        $response = $this
            ->actingAs($admin)
            ->get(route('admin.results.tests.show', $test));

        $response->assertOk()
            ->assertInertia(fn ($page) => $page
                ->component('Admin/Results/ShowTest')
                ->where('testItem.id', $test->id)
                ->where('attempts.data.0.user.iin', $student->iin)
                ->where('questions.0.text', 'Export Question')
                ->where('attempts.data.0.answers.'.$test->questions()->first()->id, 'Export Answer')
            );
    }

    public function test_results_can_be_exported_as_xlsx(): void
    {
        $admin = User::factory()->create(['role' => 'admin']);
        $this->createCompletedAttemptWithAnswer();

        $response = $this
            ->actingAs($admin)
            ->get(route('admin.results.export.xlsx'));

        $response->assertOk();
        $response->assertHeader(
            'content-type',
            'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
        );
        $this->assertMatchesRegularExpression(
            '/attachment; filename=test-results_\d{4}_\d{2}_\d{2}_\d{6}\.xlsx/',
            $response->headers->get('content-disposition') ?? ''
        );
        $this->assertStringStartsWith('PK', $response->streamedContent());
    }

    public function test_test_report_can_be_exported_as_xlsx(): void
    {
        $admin = User::factory()->create(['role' => 'admin']);
        [, $test] = $this->createCompletedAttemptWithAnswer();

        $response = $this
            ->actingAs($admin)
            ->get(route('admin.results.tests.export.xlsx', $test));

        $response->assertOk();
        $response->assertHeader(
            'content-type',
            'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
        );
        $this->assertMatchesRegularExpression(
            '/attachment; filename=test-results_\d{4}_\d{2}_\d{2}_\d{6}\.xlsx/',
            $response->headers->get('content-disposition') ?? ''
        );
        $this->assertStringStartsWith('PK', $response->streamedContent());
    }

    private function createCompletedAttemptWithAnswer(): array
    {
        $student = User::factory()->create(['role' => 'student', 'iin' => '980915300671']);
        $test = Test::create([
            'title' => 'Export Test',
            'type' => 'psychology',
            'is_required' => false,
            'is_active' => true,
            'access_roles' => ['student'],
        ]);
        $question = $test->questions()->create([
            'text' => 'Export Question',
            'type' => 'single_choice',
            'order' => 1,
            'is_required' => true,
        ]);
        $option = $question->options()->create([
            'text' => 'Export Answer',
            'score' => 10,
        ]);
        $attempt = TestAttempt::create([
            'user_id' => $student->id,
            'test_id' => $test->id,
            'started_at' => now()->subMinute(),
            'finished_at' => now(),
            'total_score' => 10,
            'result_json' => ['total_score' => 10],
            'status' => 'completed',
            'is_high_risk' => false,
        ]);
        $attempt->answers()->create([
            'question_id' => $question->id,
            'option_id' => $option->id,
            'score' => 10,
        ]);

        return [$student, $test, $attempt];
    }
}

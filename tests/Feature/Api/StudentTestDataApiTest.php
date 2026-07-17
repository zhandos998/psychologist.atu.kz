<?php

namespace Tests\Feature\Api;

use App\Models\Test;
use App\Models\TestAttempt;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class StudentTestDataApiTest extends TestCase
{
    use RefreshDatabase;

    public function test_authorized_staff_can_get_student_results_by_iin_and_test_ids(): void
    {
        config(['services.spp_api.token' => 'test-static-token']);

        $student = User::factory()->create([
            'role' => 'student',
            'iin' => '010101123456',
            'name' => 'Student One',
        ]);
        $test = Test::create([
            'title' => 'API Test',
            'type' => 'psychology',
            'is_required' => false,
            'is_active' => true,
            'access_roles' => ['student'],
        ]);
        $question = $test->questions()->create([
            'text' => 'Question',
            'type' => 'single_choice',
            'order' => 1,
            'is_required' => true,
        ]);
        $option = $question->options()->create([
            'text' => 'Answer',
            'score' => 7,
            'value' => 'answer',
        ]);
        $attempt = TestAttempt::create([
            'user_id' => $student->id,
            'test_id' => $test->id,
            'started_at' => now()->subMinute(),
            'finished_at' => now(),
            'total_score' => 7,
            'result_json' => ['total_score' => 7, 'method' => 'simple_sum'],
            'status' => 'completed',
            'is_high_risk' => false,
        ]);
        $attempt->answers()->create([
            'question_id' => $question->id,
            'option_id' => $option->id,
            'score' => 7,
            'value' => 'answer',
        ]);

        $response = $this
            ->withHeader('X-API-TOKEN', 'test-static-token')
            ->getJson("/api/students/{$student->iin}/test-results?test_ids={$test->id}&include_answers=1&include_questions=1");

        $response->assertOk()
            ->assertJsonPath('user.iin', '010101123456')
            ->assertJsonPath('user.name', 'Student One')
            ->assertJsonPath('tests.0.id', $test->id)
            ->assertJsonPath('tests.0.questions.0.text', 'Question')
            ->assertJsonPath('tests.0.questions.0.options.0.text', 'Answer')
            ->assertJsonPath('tests.0.attempts.0.id', $attempt->id)
            ->assertJsonPath('tests.0.attempts.0.answers.0.question.text', 'Question')
            ->assertJsonPath('tests.0.attempts.0.answers.0.option.text', 'Answer');
    }

    public function test_api_can_return_all_completed_student_tests_without_test_ids(): void
    {
        config(['services.spp_api.token' => 'test-static-token']);

        $student = User::factory()->create(['role' => 'student', 'iin' => '030303123456']);
        $latest = Test::create([
            'title' => 'Latest Survey',
            'type' => 'social_survey',
            'is_required' => false,
            'is_active' => true,
            'access_roles' => ['student'],
        ]);
        $older = Test::create([
            'title' => 'Older Test',
            'type' => 'psychology',
            'is_required' => false,
            'is_active' => true,
            'access_roles' => ['student'],
        ]);
        $notCompleted = Test::create([
            'title' => 'Started Only',
            'type' => 'psychology',
            'is_required' => false,
            'is_active' => true,
            'access_roles' => ['student'],
        ]);

        $question = $latest->questions()->create([
            'text' => 'Full survey question',
            'type' => 'single_choice',
            'order' => 1,
            'is_required' => true,
        ]);
        $question->options()->create([
            'text' => 'Full survey option',
            'score' => 1,
        ]);

        TestAttempt::create([
            'user_id' => $student->id,
            'test_id' => $older->id,
            'started_at' => now()->subDays(2),
            'finished_at' => now()->subDays(2),
            'total_score' => 1,
            'result_json' => ['total_score' => 1],
            'status' => 'completed',
            'is_high_risk' => false,
        ]);
        TestAttempt::create([
            'user_id' => $student->id,
            'test_id' => $latest->id,
            'started_at' => now()->subMinute(),
            'finished_at' => now(),
            'total_score' => 2,
            'result_json' => ['total_score' => 2],
            'status' => 'completed',
            'is_high_risk' => false,
        ]);
        TestAttempt::create([
            'user_id' => $student->id,
            'test_id' => $notCompleted->id,
            'started_at' => now(),
            'status' => 'started',
        ]);

        $response = $this
            ->withHeader('X-API-TOKEN', 'test-static-token')
            ->getJson("/api/students/{$student->iin}/test-results?include_questions=1");

        $response->assertOk()
            ->assertJsonCount(2, 'tests')
            ->assertJsonPath('tests.0.id', $latest->id)
            ->assertJsonPath('tests.0.questions.0.text', 'Full survey question')
            ->assertJsonPath('tests.0.questions.0.options.0.text', 'Full survey option')
            ->assertJsonPath('tests.1.id', $older->id);
    }

    public function test_ddm_staff_can_only_get_social_survey_results(): void
    {
        config([
            'services.spp_api.token' => 'test-static-token',
            'services.spp_api.role' => 'ddm_staff',
        ]);

        $student = User::factory()->create(['role' => 'student', 'iin' => '020202123456']);
        $psychology = Test::create([
            'title' => 'Psychology',
            'type' => 'psychology',
            'is_required' => false,
            'is_active' => true,
            'access_roles' => ['student'],
        ]);
        $survey = Test::create([
            'title' => 'Survey',
            'type' => 'social_survey',
            'is_required' => false,
            'is_active' => true,
            'access_roles' => ['student'],
        ]);

        foreach ([$psychology, $survey] as $test) {
            TestAttempt::create([
                'user_id' => $student->id,
                'test_id' => $test->id,
                'started_at' => now()->subMinute(),
                'finished_at' => now(),
                'total_score' => 1,
                'result_json' => ['total_score' => 1],
                'status' => 'completed',
                'is_high_risk' => false,
            ]);
        }

        $response = $this
            ->withHeader('X-API-TOKEN', 'test-static-token')
            ->getJson("/api/students/{$student->iin}/test-results?test_ids={$psychology->id},{$survey->id}");

        $response->assertOk()
            ->assertJsonCount(1, 'tests')
            ->assertJsonPath('tests.0.id', $survey->id);
    }

    public function test_static_api_token_is_required(): void
    {
        config(['services.spp_api.token' => 'test-static-token']);

        $response = $this->getJson('/api/students/010101123456/test-results?test_ids=1');

        $response->assertUnauthorized()
            ->assertJsonPath('message', 'Invalid API token.');
    }
}

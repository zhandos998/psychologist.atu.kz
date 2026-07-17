<?php

namespace Tests\Feature;

use App\Models\Option;
use App\Models\Question;
use App\Models\Test;
use App\Models\TestAttempt;
use App\Models\User;
use App\Services\TestScoringService;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\Hash;
use Tests\TestCase;

class SppTzSeederTest extends TestCase
{
    use RefreshDatabase;

    public function test_spp_tz_seeded_tests_have_expected_scoring(): void
    {
        $this->seed();

        $this->assertSame(10, Test::count());
        $this->assertSame(277, Question::count());
        $this->assertSame(919, Option::count());

        $student = User::where('role', 'student')->firstOrFail();

        $adaptation = $this->completeByQuestion(
            'Тест «Шкала адаптации»',
            $student,
            fn (Question $question) => in_array($question->order, [2, 5, 7, 8, 11, 12, 15, 16], true)
                ? $this->optionByText($question, 'Да')
                : $this->optionByText($question, 'Нет')
        );

        $this->assertTrue($adaptation->is_high_risk);
        $this->assertEquals(0, $adaptation->result_json['scales']['group']['score']);
        $this->assertSame('Адаптация к учебной группе', $adaptation->result_json['scales']['group']['label']);
        $this->assertEquals(0, $adaptation->result_json['scales']['learning']['score']);
        $this->assertSame('Адаптация к учебной деятельности', $adaptation->result_json['scales']['learning']['label']);

        $hads = $this->completeByQuestion(
            'Шкала тревоги и депрессии (HADS)',
            $student,
            fn (Question $question) => $question->options->sortByDesc('score')->first()
        );

        $this->assertTrue($hads->is_high_risk);
        $this->assertEquals(21, $hads->result_json['scales']['anxiety']['score']);
        $this->assertSame('Тревога', $hads->result_json['scales']['anxiety']['label']);
        $this->assertEquals(21, $hads->result_json['scales']['depression']['score']);
        $this->assertSame('Депрессия', $hads->result_json['scales']['depression']['label']);

        $stress = $this->completeByQuestion(
            'Шкала психологического стресса',
            $student,
            fn (Question $question) => $question->options->sortByDesc('score')->first()
        );

        $this->assertTrue($stress->is_high_risk);
        $this->assertEquals(200, (float) $stress->total_score);

        $rosenberg = $this->completeByQuestion(
            'Шкала самооценки Розенберга',
            $student,
            fn (Question $question) => $question->options->sortBy('score')->first()
        );

        $this->assertTrue($rosenberg->is_high_risk);
        $this->assertEquals(10, (float) $rosenberg->total_score);

        $character = $this->completeByQuestion(
            'Тест для определения типа характера',
            $student,
            fn (Question $question) => $question->scale_name === 'demonstrative'
                ? $question->options->sortByDesc('score')->first()
                : $question->options->sortBy('score')->first()
        );

        $this->assertSame('demonstrative', $character->result_json['matched_type']);
        $this->assertSame('Демонстративность', $character->result_json['matched_label']);
        $this->assertEquals(24, $character->result_json['scales']['demonstrative']['score']);
        $this->assertEquals(0, $character->result_json['scales']['stuck']['score']);
        $this->assertSame('Демонстративность: выраженная акцентуация', $character->result_json['interpretation']['title']);

        $temperament = $this->completeByQuestion(
            'Опросник для определения типа темперамента',
            $student,
            fn (Question $question) => in_array($question->order, [1, 3, 8, 10, 13, 17, 22, 25, 27, 39, 44, 46, 49, 53, 56], true)
                ? $this->optionByText($question, 'Да')
                : $this->optionByText($question, 'Нет')
        );

        $this->assertSame('sanguine', $temperament->result_json['matched_type']);
        $this->assertEquals(24, $temperament->result_json['scales']['extroversion']['score']);
        $this->assertEquals(0, $temperament->result_json['scales']['neuroticism']['score']);
        $this->assertEquals(6, $temperament->result_json['scales']['lie']['score']);
        $this->assertSame('Яркий экстраверт', $temperament->result_json['scales']['extroversion']['interpretation']['title']);
    }

    public function test_spp_tz_seeder_can_run_again_without_deleting_results(): void
    {
        $this->seed();

        $student = User::where('role', 'student')->firstOrFail();
        $test = Test::where('title', 'Тест «Шкала адаптации»')
            ->with('questions.options')
            ->firstOrFail();
        $question = $test->questions->first();
        $option = $question->options->first();

        $attempt = TestAttempt::create([
            'user_id' => $student->id,
            'test_id' => $test->id,
            'started_at' => now(),
            'status' => 'started',
        ]);

        $answer = $attempt->answers()->create([
            'question_id' => $question->id,
            'option_id' => $option->id,
            'score' => $option->score,
            'value' => $option->value,
        ]);

        app(TestScoringService::class)->complete($attempt);

        User::where('email', 'admin@example.com')->firstOrFail()
            ->update(['password' => Hash::make('new-secret')]);

        $this->seed();

        $this->assertDatabaseHas('test_attempts', [
            'id' => $attempt->id,
            'status' => 'completed',
        ]);
        $this->assertDatabaseHas('answers', [
            'id' => $answer->id,
            'attempt_id' => $attempt->id,
        ]);
        $this->assertSame(10, Test::count());
        $this->assertSame(277, Question::count());
        $this->assertSame(919, Option::count());
        $this->assertTrue(Hash::check(
            'new-secret',
            User::where('email', 'admin@example.com')->firstOrFail()->password
        ));
    }

    private function completeByQuestion(string $testTitle, User $student, callable $optionResolver): TestAttempt
    {
        $test = Test::where('title', $testTitle)
            ->with('questions.options', 'scoringRule', 'interpretations')
            ->firstOrFail();

        $attempt = TestAttempt::create([
            'user_id' => $student->id,
            'test_id' => $test->id,
            'started_at' => now(),
            'status' => 'started',
        ]);

        foreach ($test->questions as $question) {
            $option = $optionResolver($question);

            $attempt->answers()->create([
                'question_id' => $question->id,
                'option_id' => $option->id,
                'score' => $option->score,
                'value' => $option->value,
            ]);
        }

        return app(TestScoringService::class)->complete($attempt);
    }

    private function optionByText(Question $question, string $text): Option
    {
        return $question->options->firstWhere('text', $text);
    }
}

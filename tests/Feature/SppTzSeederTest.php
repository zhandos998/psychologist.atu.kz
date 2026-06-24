<?php

namespace Tests\Feature;

use App\Models\Option;
use App\Models\Question;
use App\Models\Test;
use App\Models\TestAttempt;
use App\Models\User;
use App\Services\TestScoringService;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class SppTzSeederTest extends TestCase
{
    use RefreshDatabase;

    public function test_spp_tz_seeded_tests_have_expected_scoring(): void
    {
        $this->seed();

        $this->assertSame(11, Test::count());
        $this->assertSame(155, Question::count());
        $this->assertSame(676, Option::count());

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
        $this->assertEquals(0, $adaptation->result_json['scales']['learning']['score']);

        $hads = $this->completeByQuestion(
            'Шкала тревоги и депрессии (HADS)',
            $student,
            fn (Question $question) => $question->options->sortByDesc('score')->first()
        );

        $this->assertTrue($hads->is_high_risk);
        $this->assertEquals(21, $hads->result_json['scales']['anxiety']['score']);
        $this->assertEquals(21, $hads->result_json['scales']['depression']['score']);

        $stress = $this->completeByQuestion(
            'Шкала психологического стресса',
            $student,
            fn (Question $question) => $question->options->sortByDesc('score')->first()
        );

        $this->assertTrue($stress->is_high_risk);
        $this->assertEquals(193, (float) $stress->total_score);

        $rosenberg = $this->completeByQuestion(
            'Шкала самооценки Розенберга',
            $student,
            fn (Question $question) => in_array($question->order, [2, 5, 7, 8, 9, 10], true)
                ? $question->options->sortByDesc('score')->first()
                : $question->options->sortBy('score')->first()
        );

        $this->assertTrue($rosenberg->is_high_risk);
        $this->assertEquals(10, (float) $rosenberg->total_score);

        $character = $this->completeByQuestion(
            'Тест для определения типа характера',
            $student,
            fn (Question $question) => in_array($question->order, [1, 3, 10], true)
                ? $this->optionByText($question, 'Да')
                : $this->optionByText($question, 'Нет')
        );

        $this->assertSame('demonstrative', $character->result_json['matched_type']);

        $temperament = $this->completeByQuestion(
            'Опросник для определения типа темперамента',
            $student,
            fn (Question $question) => in_array($question->order, [1, 2, 5, 7, 9, 11], true)
                ? $this->optionByText($question, 'Да')
                : $this->optionByText($question, 'Нет')
        );

        $this->assertSame('sanguine', $temperament->result_json['matched_type']);
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

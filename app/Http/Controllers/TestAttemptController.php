<?php

namespace App\Http\Controllers;

use App\Models\Option;
use App\Models\Question;
use App\Models\Test;
use App\Models\TestAttempt;
use App\Services\RiskNotificationService;
use App\Services\TestScoringService;
use App\Support\AssessmentLocalizer;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Validation\ValidationException;
use Inertia\Inertia;

class TestAttemptController extends Controller
{
    public function show(Request $request, Test $test, AssessmentLocalizer $localizer)
    {
        abort_unless($test->isAvailableFor($request->user()), 403);

        $test->load([
            'questions.options' => fn ($query) => $query->orderBy('id'),
            'scoringRule',
            'interpretations',
        ]);

        $localizer->test($test);

        return Inertia::render('Tests/Show', [
            'testItem' => $test,
            'previousAttempts' => TestAttempt::query()
                ->where('user_id', $request->user()->id)
                ->where('test_id', $test->id)
                ->where('status', 'completed')
                ->latest('finished_at')
                ->take(3)
                ->get(),
        ]);
    }

    public function store(
        Request $request,
        Test $test,
        TestScoringService $scoring,
        RiskNotificationService $notifications
    ) {
        abort_unless($test->isAvailableFor($request->user()), 403);

        $test->load('questions.options');

        $this->validateAnswers($request, $test);

        $attempt = DB::transaction(function () use ($request, $test, $scoring) {
            $attempt = TestAttempt::create([
                'user_id' => $request->user()->id,
                'test_id' => $test->id,
                'started_at' => now(),
                'status' => 'started',
            ]);

            foreach ($test->questions as $question) {
                $this->storeAnswer($attempt, $question, $request->input("answers.{$question->id}"));
            }

            return $scoring->complete($attempt);
        });

        $notifications->handleAttempt($attempt);

        return redirect()->route('attempts.show', $attempt);
    }

    public function result(Request $request, TestAttempt $attempt, AssessmentLocalizer $localizer)
    {
        abort_unless(
            $attempt->user_id === $request->user()->id || $request->user()->canViewResults(),
            403
        );

        $attempt->load('test', 'answers.question', 'answers.option', 'user');
        $localizer->attempt($attempt);

        return Inertia::render('Tests/Result', [
            'attempt' => $attempt,
        ]);
    }

    private function validateAnswers(Request $request, Test $test): void
    {
        $errors = [];

        foreach ($test->questions as $question) {
            $answer = $request->input("answers.{$question->id}");
            $empty = is_array($answer) ? count(array_filter($answer)) === 0 : blank($answer);

            if ($question->is_required && $empty) {
                $errors["answers.{$question->id}"] = 'Ответ обязателен.';
                continue;
            }

            if ($empty) {
                continue;
            }

            if (in_array($question->type, ['single_choice', 'scale', 'mood'], true)) {
                $exists = $question->options->contains('id', (int) $answer);

                if (! $exists) {
                    $errors["answers.{$question->id}"] = 'Выбран недопустимый вариант.';
                }
            }

            if ($question->type === 'multiple_choice') {
                $selected = array_map('intval', (array) $answer);
                $valid = $question->options->pluck('id')->intersect($selected)->count() === count($selected);

                if (! $valid) {
                    $errors["answers.{$question->id}"] = 'Выбраны недопустимые варианты.';
                }
            }
        }

        if ($errors) {
            throw ValidationException::withMessages($errors);
        }
    }

    private function storeAnswer(TestAttempt $attempt, Question $question, mixed $answer): void
    {
        if (blank($answer)) {
            return;
        }

        if ($question->type === 'text') {
            $attempt->answers()->create([
                'question_id' => $question->id,
                'text_answer' => $answer,
                'score' => 0,
            ]);

            return;
        }

        $optionIds = $question->type === 'multiple_choice'
            ? array_map('intval', (array) $answer)
            : [(int) $answer];

        $options = Option::query()
            ->where('question_id', $question->id)
            ->whereIn('id', $optionIds)
            ->get();

        foreach ($options as $option) {
            $attempt->answers()->create([
                'question_id' => $question->id,
                'option_id' => $option->id,
                'score' => $option->score,
                'value' => $option->value,
            ]);
        }
    }
}

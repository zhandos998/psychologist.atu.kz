<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\Test;
use App\Models\TestAttempt;
use App\Models\User;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Validation\ValidationException;

class StudentTestDataController extends Controller
{
    public function __invoke(Request $request, string $iin): JsonResponse
    {
        if (! preg_match('/^\d{12}$/', $iin)) {
            throw ValidationException::withMessages([
                'iin' => 'ИИН должен состоять из 12 цифр.',
            ]);
        }

        $testIds = $this->testIds($request);
        $request->merge(['test_ids' => $testIds]);

        $rules = [
            'include_answers' => ['sometimes', 'boolean'],
            'include_questions' => ['sometimes', 'boolean'],
        ];

        if ($testIds !== []) {
            $rules['test_ids'] = ['array', 'min:1'];
            $rules['test_ids.*'] = ['integer', 'distinct', 'exists:tests,id'];
        }

        $request->validate($rules);

        $student = User::query()
            ->where('iin', $iin)
            ->where('role', 'student')
            ->first();

        if (! $student) {
            return response()->json([
                'message' => 'Студент с указанным ИИН не найден.',
            ], 404);
        }

        $apiAccessRole = $request->attributes->get('api_access_role', 'admin');
        $testIds = $testIds !== []
            ? $testIds
            : $this->completedTestIds($student, $apiAccessRole);

        $testsQuery = Test::query()
            ->whereIn('id', $testIds)
            ->when(
                $apiAccessRole === 'ddm_staff',
                fn ($query) => $query->where('type', 'social_survey')
            );

        if ($request->boolean('include_questions')) {
            $testsQuery->with([
                'questions.options' => fn ($query) => $query->orderBy('id'),
            ]);
        }

        if ($testIds !== []) {
            $testsQuery->orderByRaw($this->orderByIdsSql($testIds));
        }

        $tests = $testsQuery->get(['id', 'title', 'description', 'type', 'category']);

        $attemptsQuery = TestAttempt::query()
            ->with(['test:id,title,type,category'])
            ->where('user_id', $student->id)
            ->whereIn('test_id', $tests->pluck('id'))
            ->where('status', 'completed')
            ->latest('finished_at');

        if ($request->boolean('include_answers')) {
            $attemptsQuery->with([
                'answers.question:id,text,type,scale_name',
                'answers.option:id,text,score,value',
            ]);
        }

        $attemptsByTest = $attemptsQuery->get()->groupBy('test_id');

        return response()->json([
            'user' => $this->userPayload($student),
            'tests' => $tests->map(function (Test $test) use ($attemptsByTest) {
                $payload = $this->testPayload($test);
                $payload['attempts'] = ($attemptsByTest->get($test->id) ?? collect())
                    ->map(fn (TestAttempt $attempt) => $this->attemptPayload($attempt))
                    ->values();

                return $payload;
            })->values(),
        ]);
    }

    private function completedTestIds(User $student, string $apiAccessRole): array
    {
        return TestAttempt::query()
            ->select('test_id')
            ->where('user_id', $student->id)
            ->where('status', 'completed')
            ->when(
                $apiAccessRole === 'ddm_staff',
                fn ($query) => $query->whereHas(
                    'test',
                    fn ($testQuery) => $testQuery->where('type', 'social_survey')
                )
            )
            ->groupBy('test_id')
            ->orderByRaw('max(finished_at) desc')
            ->pluck('test_id')
            ->all();
    }

    private function testIds(Request $request): array
    {
        $value = $request->input('test_ids', $request->input('test_id', []));

        if (is_string($value)) {
            $value = preg_split('/[,\s]+/', $value, flags: PREG_SPLIT_NO_EMPTY);
        }

        return collect((array) $value)
            ->map(fn ($id) => (int) $id)
            ->filter(fn (int $id) => $id > 0)
            ->unique()
            ->values()
            ->all();
    }

    private function userPayload(User $user): array
    {
        return [
            'id' => $user->id,
            'name' => $user->name,
            'email' => $user->email,
            'iin' => $user->iin,
            'phone' => $user->phone,
            'faculty' => $user->faculty,
            'group_name' => $user->group_name,
            'student_id' => $user->student_id,
        ];
    }

    private function testPayload(Test $test): array
    {
        $payload = [
            'id' => $test->id,
            'title' => $test->title,
            'description' => $test->description,
            'type' => $test->type,
            'category' => $test->category,
        ];

        if ($test->relationLoaded('questions')) {
            $payload['questions'] = $test->questions->map(fn ($question) => [
                'id' => $question->id,
                'text' => $question->text,
                'type' => $question->type,
                'order' => $question->order,
                'is_required' => $question->is_required,
                'scale_name' => $question->scale_name,
                'options' => $question->options->map(fn ($option) => [
                    'id' => $option->id,
                    'text' => $option->text,
                    'score' => $option->score,
                ])->values(),
            ])->values();
        }

        return $payload;
    }

    private function attemptPayload(TestAttempt $attempt): array
    {
        $payload = [
            'id' => $attempt->id,
            'status' => $attempt->status,
            'started_at' => $attempt->started_at?->toIso8601String(),
            'finished_at' => $attempt->finished_at?->toIso8601String(),
            'total_score' => $attempt->total_score,
            'is_high_risk' => $attempt->is_high_risk,
            'result_json' => $attempt->result_json,
        ];

        if ($attempt->relationLoaded('answers')) {
            $payload['answers'] = $attempt->answers->map(fn ($answer) => [
                'id' => $answer->id,
                'question' => $answer->question ? [
                    'id' => $answer->question->id,
                    'text' => $answer->question->text,
                    'type' => $answer->question->type,
                    'scale_name' => $answer->question->scale_name,
                ] : null,
                'option' => $answer->option ? [
                    'id' => $answer->option->id,
                    'text' => $answer->option->text,
                    'score' => $answer->option->score,
                    'value' => $answer->option->value,
                ] : null,
                'text_answer' => $answer->text_answer,
                'score' => $answer->score,
            ])->values();
        }

        return $payload;
    }

    private function orderByIdsSql(array $ids): string
    {
        $driver = Test::query()->getConnection()->getDriverName();
        $ids = implode(',', array_map('intval', $ids));

        return match ($driver) {
            'pgsql' => "array_position(ARRAY[$ids]::bigint[], id)",
            'sqlite' => "instr(',$ids,', ',' || id || ',')",
            default => "field(id, $ids)",
        };
    }
}

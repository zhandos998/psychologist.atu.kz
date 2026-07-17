<?php

namespace App\Http\Controllers\Admin;

use App\Http\Controllers\Controller;
use App\Models\Answer;
use App\Models\Test;
use App\Models\TestAttempt;
use App\Models\User;
use App\Support\AssessmentLocalizer;
use App\Support\SimpleXlsxWriter;
use Illuminate\Database\Eloquent\Builder;
use Illuminate\Http\Request;
use Inertia\Inertia;
use Symfony\Component\HttpFoundation\BinaryFileResponse;
use Symfony\Component\HttpFoundation\StreamedResponse;

class ResultController extends Controller
{
    public function index(Request $request, AssessmentLocalizer $localizer)
    {
        $attempts = $this->query($request)
            ->paginate(50)
            ->withQueryString();

        $tests = Test::query()
            ->when($request->user()->role === 'ddm_staff', fn ($query) => $query->where('type', 'social_survey'))
            ->withCount(['attempts as completed_attempts_count' => fn ($query) => $query->where('status', 'completed')])
            ->orderBy('title')
            ->get(['id', 'title', 'type', 'translations']);

        $localizer->attempts($attempts);
        $localizer->tests($tests);

        return Inertia::render('Admin/Results/Index', [
            'attempts' => $attempts,
            'tests' => $tests,
            'filters' => [
                ...$request->only(['faculty', 'group_name', 'student', 'test_id', 'risk', 'date_from', 'date_to']),
                'sort' => $this->sort($request),
                'direction' => $this->direction($request),
            ],
        ]);
    }

    public function exportCsv(Request $request): StreamedResponse
    {
        return response()->streamDownload(function () use ($request) {
            $handle = fopen('php://output', 'w');
            fputcsv($handle, $this->headings());

            $this->query($request)->chunk(200, function ($attempts) use ($handle) {
                app(AssessmentLocalizer::class)->attempts($attempts);

                foreach ($attempts as $attempt) {
                    fputcsv($handle, $this->row($attempt));
                }
            });

            fclose($handle);
        }, $this->exportFilename('csv'), ['Content-Type' => 'text/csv; charset=UTF-8']);
    }

    public function exportXlsx(Request $request): BinaryFileResponse
    {
        $writer = new SimpleXlsxWriter();
        $writer->addRow($this->headings());

        $this->query($request)->chunk(200, function ($attempts) use ($writer) {
            app(AssessmentLocalizer::class)->attempts($attempts);

            foreach ($attempts as $attempt) {
                $writer->addRow($this->row($attempt));
            }
        });

        $path = $writer->save();

        return response()
            ->download($path, $this->exportFilename('xlsx'), [
                'Content-Type' => 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
            ])
            ->deleteFileAfterSend(true);
    }

    public function showTest(Request $request, Test $test, AssessmentLocalizer $localizer)
    {
        $this->authorizeTestReport($request, $test);

        $test->load(['questions.options' => fn ($query) => $query->orderBy('id')]);
        $localizer->test($test);

        $attempts = $this->testQuery($request, $test)
            ->paginate(50)
            ->withQueryString();

        $localizer->attempts($attempts);
        $attempts->through(fn (TestAttempt $attempt) => $this->testAttemptPayload($attempt));

        return Inertia::render('Admin/Results/ShowTest', [
            'testItem' => $test,
            'questions' => $this->questionPayload($test),
            'attempts' => $attempts,
            'filters' => [
                ...$request->only(['faculty', 'group_name', 'student', 'risk', 'date_from', 'date_to']),
                'sort' => $this->sort($request),
                'direction' => $this->direction($request),
            ],
        ]);
    }

    public function exportTestCsv(Request $request, Test $test, AssessmentLocalizer $localizer): StreamedResponse
    {
        $this->authorizeTestReport($request, $test);
        $test->load(['questions.options' => fn ($query) => $query->orderBy('id')]);
        $localizer->test($test);

        return response()->streamDownload(function () use ($request, $test) {
            $handle = fopen('php://output', 'w');
            fputcsv($handle, $this->testHeadings($test));

            $this->testQuery($request, $test)->chunk(100, function ($attempts) use ($handle, $test) {
                app(AssessmentLocalizer::class)->attempts($attempts);

                foreach ($attempts as $attempt) {
                    fputcsv($handle, $this->testRow($attempt, $test));
                }
            });

            fclose($handle);
        }, $this->exportFilename('csv', 'test-results'), ['Content-Type' => 'text/csv; charset=UTF-8']);
    }

    public function exportTestXlsx(Request $request, Test $test, AssessmentLocalizer $localizer): BinaryFileResponse
    {
        $this->authorizeTestReport($request, $test);
        $test->load(['questions.options' => fn ($query) => $query->orderBy('id')]);
        $localizer->test($test);

        $writer = new SimpleXlsxWriter();
        $writer->addRow($this->testHeadings($test));

        $this->testQuery($request, $test)->chunk(100, function ($attempts) use ($writer, $test) {
            app(AssessmentLocalizer::class)->attempts($attempts);

            foreach ($attempts as $attempt) {
                $writer->addRow($this->testRow($attempt, $test));
            }
        });

        $path = $writer->save();

        return response()
            ->download($path, $this->exportFilename('xlsx', 'test-results'), [
                'Content-Type' => 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
            ])
            ->deleteFileAfterSend(true);
    }

    private function exportFilename(string $extension, string $prefix = 'test-results'): string
    {
        $timestamp = now()
            ->timezone(config('app.timezone'))
            ->format('Y_m_d_His');

        return "{$prefix}_{$timestamp}.{$extension}";
    }

    private function query(Request $request): Builder
    {
        return TestAttempt::query()
            ->with(['user', 'test'])
            ->where('status', 'completed')
            ->when($request->user()->role === 'ddm_staff', fn ($query) => $query->whereHas('test', fn ($test) => $test->where('type', 'social_survey')))
            ->when($request->filled('faculty'), fn ($query) => $query->whereHas('user', fn ($user) => $user->where('faculty', $request->string('faculty'))))
            ->when($request->filled('group_name'), fn ($query) => $query->whereHas('user', fn ($user) => $user->where('group_name', $request->string('group_name'))))
            ->when($request->filled('student'), function ($query) use ($request) {
                $search = '%'.$request->string('student').'%';
                $query->whereHas('user', fn ($user) => $user
                    ->where('name', 'like', $search)
                    ->orWhere('email', 'like', $search)
                    ->orWhere('iin', 'like', $search)
                    ->orWhere('student_id', 'like', $search));
            })
            ->when($request->filled('test_id'), fn ($query) => $query->where('test_id', $request->integer('test_id')))
            ->when($request->filled('risk'), fn ($query) => $query->where('is_high_risk', $request->boolean('risk')))
            ->when($request->filled('date_from'), fn ($query) => $query->whereDate('finished_at', '>=', $request->date('date_from')))
            ->when($request->filled('date_to'), fn ($query) => $query->whereDate('finished_at', '<=', $request->date('date_to')))
            ->tap(fn ($query) => $this->applySorting($query, $request));
    }

    private function testQuery(Request $request, Test $test): Builder
    {
        return TestAttempt::query()
            ->with([
                'user',
                'answers.question',
                'answers.option',
            ])
            ->where('test_id', $test->id)
            ->where('status', 'completed')
            ->when($request->filled('faculty'), fn ($query) => $query->whereHas('user', fn ($user) => $user->where('faculty', $request->string('faculty'))))
            ->when($request->filled('group_name'), fn ($query) => $query->whereHas('user', fn ($user) => $user->where('group_name', $request->string('group_name'))))
            ->when($request->filled('student'), function ($query) use ($request) {
                $search = '%'.$request->string('student').'%';
                $query->whereHas('user', fn ($user) => $user
                    ->where('name', 'like', $search)
                    ->orWhere('email', 'like', $search)
                    ->orWhere('iin', 'like', $search)
                    ->orWhere('student_id', 'like', $search));
            })
            ->when($request->filled('risk'), fn ($query) => $query->where('is_high_risk', $request->boolean('risk')))
            ->when($request->filled('date_from'), fn ($query) => $query->whereDate('finished_at', '>=', $request->date('date_from')))
            ->when($request->filled('date_to'), fn ($query) => $query->whereDate('finished_at', '<=', $request->date('date_to')))
            ->tap(fn ($query) => $this->applySorting($query, $request));
    }

    private function applySorting(Builder $query, Request $request): void
    {
        $direction = $this->direction($request);

        match ($this->sort($request)) {
            'student' => $query->orderBy(User::select('name')->whereColumn('users.id', 'test_attempts.user_id'), $direction),
            'faculty' => $query->orderBy(User::select('faculty')->whereColumn('users.id', 'test_attempts.user_id'), $direction),
            'group' => $query->orderBy(User::select('group_name')->whereColumn('users.id', 'test_attempts.user_id'), $direction),
            'test' => $query->orderBy(Test::select('title')->whereColumn('tests.id', 'test_attempts.test_id'), $direction),
            'score' => $query->orderBy('total_score', $direction),
            'risk' => $query->orderBy('is_high_risk', $direction),
            default => $query->orderBy('finished_at', $direction),
        };

        $query->orderByDesc('id');
    }

    private function sort(Request $request): string
    {
        $sort = (string) $request->input('sort', 'finished_at');

        return in_array($sort, ['student', 'faculty', 'group', 'test', 'score', 'risk', 'finished_at'], true)
            ? $sort
            : 'finished_at';
    }

    private function direction(Request $request): string
    {
        return $request->input('direction') === 'asc' ? 'asc' : 'desc';
    }

    private function headings(): array
    {
        return [
            'Student',
            'Email',
            'IIN',
            'Phone',
            'Faculty',
            'Group',
            'Test',
            'Type',
            'Score',
            'High risk',
            'Finished at',
            'Result',
        ];
    }

    private function row(TestAttempt $attempt): array
    {
        return [
            $attempt->user->name,
            $attempt->user->email,
            $attempt->user->iin,
            $attempt->user->phone,
            $attempt->user->faculty,
            $attempt->user->group_name,
            $attempt->test->title,
            $attempt->test->type,
            $attempt->total_score,
            $attempt->is_high_risk ? 'yes' : 'no',
            $attempt->finished_at?->format('Y-m-d H:i'),
            json_encode($attempt->result_json, JSON_UNESCAPED_UNICODE),
        ];
    }

    private function authorizeTestReport(Request $request, Test $test): void
    {
        abort_if(
            $request->user()->role === 'ddm_staff' && $test->type !== 'social_survey',
            403
        );
    }

    private function questionPayload(Test $test): array
    {
        return $test->questions->map(fn ($question) => [
            'id' => $question->id,
            'text' => $question->text,
            'type' => $question->type,
            'order' => $question->order,
            'scale_name' => $question->scale_name,
        ])->values()->all();
    }

    private function testAttemptPayload(TestAttempt $attempt): array
    {
        return [
            'id' => $attempt->id,
            'user' => [
                'id' => $attempt->user->id,
                'name' => $attempt->user->name,
                'email' => $attempt->user->email,
                'iin' => $attempt->user->iin,
                'phone' => $attempt->user->phone,
                'faculty' => $attempt->user->faculty,
                'group_name' => $attempt->user->group_name,
                'student_id' => $attempt->user->student_id,
            ],
            'total_score' => $attempt->total_score,
            'is_high_risk' => $attempt->is_high_risk,
            'finished_at' => $attempt->finished_at?->toIso8601String(),
            'answers' => $this->answerMap($attempt),
        ];
    }

    private function answerMap(TestAttempt $attempt): array
    {
        return $attempt->answers
            ->groupBy('question_id')
            ->map(fn ($answers) => $answers
                ->map(fn (Answer $answer) => $this->answerText($answer))
                ->filter(fn (?string $answer) => filled($answer))
                ->implode('; '))
            ->all();
    }

    private function answerText(Answer $answer): ?string
    {
        if (filled($answer->text_answer)) {
            return $answer->text_answer;
        }

        return $answer->option?->text;
    }

    private function testHeadings(Test $test): array
    {
        return [
            'Student',
            'Email',
            'IIN',
            'Phone',
            'Faculty',
            'Group',
            'Score',
            'High risk',
            'Finished at',
            ...$test->questions->map(fn ($question) => $question->text)->all(),
        ];
    }

    private function testRow(TestAttempt $attempt, Test $test): array
    {
        $answers = $this->answerMap($attempt);

        return [
            $attempt->user->name,
            $attempt->user->email,
            $attempt->user->iin,
            $attempt->user->phone,
            $attempt->user->faculty,
            $attempt->user->group_name,
            $attempt->total_score,
            $attempt->is_high_risk ? 'yes' : 'no',
            $attempt->finished_at?->timezone(config('app.timezone'))->format('Y-m-d H:i'),
            ...$test->questions->map(fn ($question) => $answers[$question->id] ?? '')->all(),
        ];
    }
}

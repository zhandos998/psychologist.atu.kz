<?php

namespace App\Http\Controllers\Admin;

use App\Http\Controllers\Controller;
use App\Models\Test;
use App\Models\TestAttempt;
use App\Support\AssessmentLocalizer;
use Illuminate\Database\Eloquent\Builder;
use Illuminate\Http\Request;
use Symfony\Component\HttpFoundation\StreamedResponse;
use Inertia\Inertia;

class ResultController extends Controller
{
    public function index(Request $request, AssessmentLocalizer $localizer)
    {
        $attempts = $this->query($request)
            ->latest('finished_at')
            ->limit(200)
            ->get();

        $tests = Test::query()
            ->when($request->user()->role === 'ddm_staff', fn ($query) => $query->where('type', 'social_survey'))
            ->orderBy('title')
            ->get(['id', 'title', 'type', 'translations']);

        $localizer->attempts($attempts);
        $localizer->tests($tests);

        return Inertia::render('Admin/Results/Index', [
            'attempts' => $attempts,
            'tests' => $tests,
            'filters' => $request->only(['faculty', 'group_name', 'student', 'test_id', 'risk']),
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
        }, 'test-results.csv', ['Content-Type' => 'text/csv; charset=UTF-8']);
    }

    public function exportExcel(Request $request): StreamedResponse
    {
        return response()->streamDownload(function () use ($request) {
            echo '<table><thead><tr>';

            foreach ($this->headings() as $heading) {
                echo '<th>'.e($heading).'</th>';
            }

            echo '</tr></thead><tbody>';

            $this->query($request)->chunk(200, function ($attempts) {
                app(AssessmentLocalizer::class)->attempts($attempts);

                foreach ($attempts as $attempt) {
                    echo '<tr>';

                    foreach ($this->row($attempt) as $cell) {
                        echo '<td>'.e((string) $cell).'</td>';
                    }

                    echo '</tr>';
                }
            });

            echo '</tbody></table>';
        }, 'test-results.xls', ['Content-Type' => 'application/vnd.ms-excel; charset=UTF-8']);
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
                    ->orWhere('student_id', 'like', $search));
            })
            ->when($request->filled('test_id'), fn ($query) => $query->where('test_id', $request->integer('test_id')))
            ->when($request->filled('risk'), fn ($query) => $query->where('is_high_risk', $request->boolean('risk')));
    }

    private function headings(): array
    {
        return [
            'Student',
            'Email',
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
}

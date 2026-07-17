<?php

namespace App\Http\Controllers\Admin;

use App\Http\Controllers\Controller;
use App\Models\Question;
use App\Models\Test;
use App\Support\AssessmentLocalizer;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Validation\Rule;
use Inertia\Inertia;

class TestController extends Controller
{
    public function index(Request $request, AssessmentLocalizer $localizer)
    {
        $tests = Test::query()
            ->with('scoringRule')
            ->withCount(['questions', 'attempts'])
            ->whereIn('type', ['psychology', 'social_survey'])
            ->when($request->filled('type'), fn ($query) => $query->where('type', $request->string('type')))
            ->when($request->filled('search'), fn ($query) => $query->where('title', 'like', '%'.$request->string('search').'%'))
            ->latest()
            ->paginate(20)
            ->withQueryString();

        $localizer->tests($tests);

        return Inertia::render('Admin/Tests/Index', [
            'tests' => $tests,
            'filters' => $request->only(['type', 'search']),
        ]);
    }

    public function create()
    {
        return Inertia::render('Admin/Tests/Form', [
            'testItem' => null,
            'mode' => 'create',
        ]);
    }

    public function store(Request $request)
    {
        $data = $this->validatedData($request);

        $test = DB::transaction(function () use ($request, $data) {
            $test = Test::create($this->testPayload($request, $data));
            $this->syncRule($test, $data);
            $this->syncQuestions($test, $data['questions'] ?? []);
            $this->syncInterpretations($test, $data['interpretations'] ?? []);

            return $test;
        });

        return redirect()->route('admin.tests.index')->with('status', $this->statusMessage('created'));
    }

    public function edit(Test $test)
    {
        $test->load([
            'questions.options' => fn ($query) => $query->orderBy('id'),
            'scoringRule',
            'interpretations',
        ]);

        return Inertia::render('Admin/Tests/Form', [
            'testItem' => $test,
            'mode' => 'edit',
        ]);
    }

    public function update(Request $request, Test $test)
    {
        $data = $this->validatedData($request);

        DB::transaction(function () use ($request, $test, $data) {
            $test->update($this->testPayload($request, $data));
            $this->syncRule($test, $data);
            $this->syncQuestions($test, $data['questions'] ?? []);
            $this->syncInterpretations($test, $data['interpretations'] ?? []);
        });

        return redirect()->route('admin.tests.edit', $test)->with('status', $this->statusMessage('updated'));
    }

    public function destroy(Test $test)
    {
        $test->delete();

        return redirect()->route('admin.tests.index')->with('status', $this->statusMessage('deleted'));
    }

    private function validatedData(Request $request): array
    {
        return $request->validate([
            'title' => ['required', 'string', 'max:255'],
            'description' => ['nullable', 'string'],
            'type' => ['required', Rule::in(['psychology', 'social_survey'])],
            'category' => ['nullable', 'string', 'max:255'],
            'is_required' => ['boolean'],
            'is_active' => ['boolean'],
            'access_roles' => ['array'],
            'access_roles.*' => [Rule::in(['admin', 'psychologist', 'ddm_staff', 'student'])],
            'start_date' => ['nullable', 'date'],
            'end_date' => ['nullable', 'date', 'after_or_equal:start_date'],
            'scoring_method' => ['required', Rule::in([
                'simple_sum',
                'scale_based',
                'max_match_type',
                'trait_matrix_type',
                'custom_ranges',
                'no_score',
            ])],
            'scoring_config' => ['nullable', 'string'],
            'questions' => ['array'],
            'questions.*.id' => ['nullable', 'integer'],
            'questions.*.text' => ['required_with:questions', 'string'],
            'questions.*.type' => ['required_with:questions', Rule::in(['single_choice', 'multiple_choice', 'scale', 'text'])],
            'questions.*.order' => ['nullable', 'integer', 'min:0'],
            'questions.*.is_required' => ['boolean'],
            'questions.*.scale_name' => ['nullable', 'string', 'max:255'],
            'questions.*.options' => ['array'],
            'questions.*.options.*.id' => ['nullable', 'integer'],
            'questions.*.options.*.text' => ['required_with:questions.*.options', 'string', 'max:255'],
            'questions.*.options.*.score' => ['nullable', 'numeric'],
            'questions.*.options.*.value' => ['nullable', 'string', 'max:255'],
            'interpretations' => ['array'],
            'interpretations.*.id' => ['nullable', 'integer'],
            'interpretations.*.scale_name' => ['nullable', 'string', 'max:255'],
            'interpretations.*.min_score' => ['nullable', 'numeric'],
            'interpretations.*.max_score' => ['nullable', 'numeric'],
            'interpretations.*.title' => ['required_with:interpretations', 'string', 'max:255'],
            'interpretations.*.description' => ['nullable', 'string'],
            'interpretations.*.recommendation' => ['nullable', 'string'],
            'interpretations.*.is_high_risk' => ['boolean'],
        ]);
    }

    private function testPayload(Request $request, array $data): array
    {
        return [
            'created_by' => $request->user()->id,
            'title' => $data['title'],
            'description' => $data['description'] ?? null,
            'type' => $data['type'],
            'category' => $data['category'] ?? null,
            'is_required' => (bool) ($data['is_required'] ?? false),
            'is_active' => (bool) ($data['is_active'] ?? false),
            'access_roles' => $data['access_roles'] ?? ['student'],
            'start_date' => $data['start_date'] ?? null,
            'end_date' => $data['end_date'] ?? null,
        ];
    }

    private function syncRule(Test $test, array $data): void
    {
        $config = [];

        if (! blank($data['scoring_config'] ?? null)) {
            $config = json_decode($data['scoring_config'], true) ?: [];
        }

        $test->scoringRule()->updateOrCreate(
            ['test_id' => $test->id],
            ['method' => $data['scoring_method'], 'config' => $config]
        );
    }

    private function syncQuestions(Test $test, array $questions): void
    {
        $keptQuestionIds = [];

        foreach ($questions as $index => $questionData) {
            $question = Question::updateOrCreate(
                ['id' => $questionData['id'] ?? null, 'test_id' => $test->id],
                [
                    'text' => $questionData['text'],
                    'type' => $questionData['type'],
                    'order' => $questionData['order'] ?? $index + 1,
                    'is_required' => (bool) ($questionData['is_required'] ?? false),
                    'scale_name' => $questionData['scale_name'] ?? null,
                ]
            );

            $keptQuestionIds[] = $question->id;
            $keptOptionIds = [];

            foreach ($questionData['options'] ?? [] as $optionData) {
                if (blank($optionData['text'] ?? null)) {
                    continue;
                }

                $option = $question->options()->updateOrCreate(
                    ['id' => $optionData['id'] ?? null],
                    [
                        'text' => $optionData['text'],
                        'score' => $optionData['score'] ?? 0,
                        'value' => $optionData['value'] ?? null,
                    ]
                );

                $keptOptionIds[] = $option->id;
            }

            $question->options()
                ->when($keptOptionIds, fn ($query) => $query->whereNotIn('id', $keptOptionIds))
                ->when(! $keptOptionIds, fn ($query) => $query)
                ->delete();
        }

        $test->questions()
            ->when($keptQuestionIds, fn ($query) => $query->whereNotIn('id', $keptQuestionIds))
            ->when(! $keptQuestionIds, fn ($query) => $query)
            ->delete();
    }

    private function syncInterpretations(Test $test, array $interpretations): void
    {
        $keptIds = [];

        foreach ($interpretations as $data) {
            if (blank($data['title'] ?? null)) {
                continue;
            }

            $interpretation = $test->interpretations()->updateOrCreate(
                ['id' => $data['id'] ?? null],
                [
                    'scale_name' => $data['scale_name'] ?? null,
                    'min_score' => $data['min_score'] ?? null,
                    'max_score' => $data['max_score'] ?? null,
                    'title' => $data['title'],
                    'description' => $data['description'] ?? null,
                    'recommendation' => $data['recommendation'] ?? null,
                    'is_high_risk' => (bool) ($data['is_high_risk'] ?? false),
                ]
            );

            $keptIds[] = $interpretation->id;
        }

        $test->interpretations()
            ->when($keptIds, fn ($query) => $query->whereNotIn('id', $keptIds))
            ->when(! $keptIds, fn ($query) => $query)
            ->delete();
    }

    private function statusMessage(string $key): string
    {
        $messages = [
            'ru' => [
                'created' => 'Тест создан.',
                'updated' => 'Тест обновлен.',
                'deleted' => 'Тест удален.',
            ],
            'kk' => [
                'created' => 'Тест құрылды.',
                'updated' => 'Тест жаңартылды.',
                'deleted' => 'Тест жойылды.',
            ],
        ];

        return $messages[app()->getLocale()][$key] ?? $messages['ru'][$key];
    }
}

<?php

namespace App\Http\Controllers;

use App\Models\Test;
use App\Models\TestAttempt;
use App\Support\AssessmentLocalizer;
use Illuminate\Http\Request;
use Inertia\Inertia;

class TestCatalogController extends Controller
{
    public function index(Request $request, AssessmentLocalizer $localizer)
    {
        $user = $request->user();
        $completed = TestAttempt::query()
            ->where('user_id', $user->id)
            ->where('status', 'completed')
            ->pluck('finished_at', 'test_id');

        $tests = Test::query()
            ->withCount('questions')
            ->where('is_active', true)
            ->whereIn('type', ['psychology', 'social_survey'])
            ->orderByDesc('is_required')
            ->orderBy('type')
            ->orderBy('title')
            ->get()
            ->filter(fn (Test $test) => $test->isAvailableFor($user))
            ->map(function (Test $test) use ($completed) {
                $test->completed_at = $completed[$test->id] ?? null;

                return $test;
            })
            ->values();

        $localizer->tests($tests);

        return Inertia::render('Tests/Index', [
            'tests' => $tests,
            'filters' => [
                'types' => ['psychology', 'social_survey'],
            ],
        ]);
    }
}

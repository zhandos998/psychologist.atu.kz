<?php

namespace App\Http\Controllers;

use App\Models\Test;
use App\Models\TestAttempt;
use App\Support\AssessmentLocalizer;
use Illuminate\Http\Request;
use Inertia\Inertia;

class DashboardController extends Controller
{
    public function __invoke(Request $request, AssessmentLocalizer $localizer)
    {
        $user = $request->user();
        $tests = Test::query()
            ->withCount('questions')
            ->where('is_active', true)
            ->orderByDesc('is_required')
            ->orderBy('title')
            ->get()
            ->filter(fn (Test $test) => $test->isAvailableFor($user))
            ->values();

        $completedTestIds = TestAttempt::query()
            ->where('user_id', $user->id)
            ->where('status', 'completed')
            ->pluck('test_id')
            ->all();

        $recentAttempts = TestAttempt::query()
            ->with('test:id,title,type,translations')
            ->where('user_id', $user->id)
            ->where('status', 'completed')
            ->latest('finished_at')
            ->take(6)
            ->get();

        $localizer->tests($tests);
        $localizer->attempts($recentAttempts);

        return Inertia::render('Dashboard', [
            'stats' => [
                'available_tests' => $tests->count(),
                'required_pending' => $tests
                    ->where('is_required', true)
                    ->whereNotIn('id', $completedTestIds)
                    ->count(),
                'completed_attempts' => TestAttempt::where('user_id', $user->id)
                    ->where('status', 'completed')
                    ->count(),
                'high_risk_attempts' => TestAttempt::where('user_id', $user->id)
                    ->where('is_high_risk', true)
                    ->count(),
            ],
            'requiredTests' => $tests
                ->where('is_required', true)
                ->whereNotIn('id', $completedTestIds)
                ->take(6)
                ->values(),
            'recentAttempts' => $recentAttempts,
            'canManageTests' => $user->canManageTests(),
            'canViewResults' => $user->canViewResults(),
        ]);
    }
}

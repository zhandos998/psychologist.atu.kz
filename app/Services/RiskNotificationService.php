<?php

namespace App\Services;

use App\Models\RiskNotification;
use App\Models\TestAttempt;
use Illuminate\Support\Carbon;
use Illuminate\Support\Facades\Mail;
use Throwable;

class RiskNotificationService
{
    public function handleAttempt(TestAttempt $attempt): void
    {
        $attempt->loadMissing('user', 'test');

        if ($attempt->is_high_risk) {
            $this->createRiskNotifications(
                $attempt,
                'high_risk_result',
                "Высокий показатель по тесту \"{$attempt->test->title}\". Рекомендация: обратиться в СПП."
            );
        }

        if ($attempt->test->type === 'mood_meter') {
            $this->checkMoodStreak($attempt);
        }
    }

    private function checkMoodStreak(TestAttempt $attempt): void
    {
        $attempts = $attempt->user->testAttempts()
            ->whereHas('test', fn ($query) => $query->where('type', 'mood_meter'))
            ->where('status', 'completed')
            ->where('finished_at', '>=', now()->subDays(14))
            ->orderByDesc('finished_at')
            ->get();

        $lowMoodDates = $attempts
            ->filter(fn (TestAttempt $item) => $this->isLowMood($item))
            ->groupBy(fn (TestAttempt $item) => $item->finished_at->toDateString())
            ->keys()
            ->sortDesc()
            ->values();

        if ($lowMoodDates->isEmpty()) {
            return;
        }

        $cursor = Carbon::parse($lowMoodDates->first());
        $streak = 0;

        foreach ($lowMoodDates as $date) {
            if ($date !== $cursor->toDateString()) {
                break;
            }

            $streak++;
            $cursor->subDay();
        }

        if ($streak < 7) {
            return;
        }

        $recentExists = RiskNotification::query()
            ->where('user_id', $attempt->user_id)
            ->where('type', 'low_mood_streak')
            ->where('created_at', '>=', now()->subDay())
            ->exists();

        if ($recentExists) {
            return;
        }

        $this->createRiskNotifications(
            $attempt,
            'low_mood_streak',
            'Плохое настроение держится 7 дней подряд. Рекомендация: обратиться в СПП.'
        );
    }

    private function isLowMood(TestAttempt $attempt): bool
    {
        $result = $attempt->result_json ?: [];
        $score = $result['mood_score'] ?? $attempt->total_score;
        $value = $result['mood_value'] ?? null;

        if ($score !== null && (float) $score <= 2) {
            return true;
        }

        return in_array($value, ['very_bad', 'bad', 'sad', 'stress'], true);
    }

    private function createRiskNotifications(TestAttempt $attempt, string $type, string $message): void
    {
        if ($attempt->user->email) {
            $notification = RiskNotification::create([
                'user_id' => $attempt->user_id,
                'test_attempt_id' => $attempt->id,
                'type' => $type,
                'channel' => 'email',
                'recipient' => $attempt->user->email,
                'message' => $message,
                'status' => 'pending',
                'triggered_at' => now(),
            ]);

            try {
                Mail::raw($message, function ($mail) use ($attempt) {
                    $mail->to($attempt->user->email)
                        ->subject('Уведомление СПП');
                });

                $notification->update(['status' => 'sent']);
            } catch (Throwable) {
                $notification->update(['status' => 'failed']);
            }
        }

        if ($attempt->user->phone) {
            RiskNotification::create([
                'user_id' => $attempt->user_id,
                'test_attempt_id' => $attempt->id,
                'type' => $type,
                'channel' => 'phone',
                'recipient' => $attempt->user->phone,
                'message' => $message,
                'status' => 'pending_provider',
                'triggered_at' => now(),
            ]);
        }
    }
}

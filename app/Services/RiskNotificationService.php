<?php

namespace App\Services;

use App\Models\RiskNotification;
use App\Models\TestAttempt;
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

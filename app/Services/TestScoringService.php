<?php

namespace App\Services;

use App\Models\Answer;
use App\Models\ResultInterpretation;
use App\Models\TestAttempt;
use Illuminate\Support\Collection;

class TestScoringService
{
    public function complete(TestAttempt $attempt): TestAttempt
    {
        $attempt->loadMissing([
            'test.scoringRule',
            'test.interpretations',
            'answers.question.options',
            'answers.option',
        ]);

        $result = $this->score($attempt);

        $attempt->update([
            'finished_at' => now(),
            'total_score' => $result['total_score'],
            'result_json' => $result,
            'status' => 'completed',
            'is_high_risk' => $result['is_high_risk'],
        ]);

        return $attempt->refresh();
    }

    public function score(TestAttempt $attempt): array
    {
        $rule = $attempt->test->scoringRule;
        $method = $rule?->method ?: 'simple_sum';
        $config = $rule?->config ?: [];

        return match ($method) {
            'no_score' => $this->noScore($attempt),
            'scale_based' => $this->scaleBased($attempt, $config),
            'max_match_type' => $this->maxMatchType($attempt),
            'trait_matrix_type' => $this->traitMatrixType($attempt, $config),
            'custom_ranges' => $this->simpleTotal($attempt, $config, 'custom_ranges'),
            'reverse_questions' => $this->simpleTotal($attempt, $config, 'reverse_questions'),
            default => $this->simpleTotal($attempt, $config, 'simple_sum'),
        };
    }

    private function noScore(TestAttempt $attempt): array
    {
        return [
            'method' => 'no_score',
            'total_score' => null,
            'answered_questions' => $attempt->answers->pluck('question_id')->unique()->count(),
            'is_high_risk' => false,
            'interpretation' => null,
        ];
    }

    private function simpleTotal(TestAttempt $attempt, array $config, string $method): array
    {
        $total = $attempt->answers->sum(fn (Answer $answer) => $this->adjustedScore($answer, $config));
        $interpretation = $this->findInterpretation($attempt->test->interpretations, null, $total);
        $payload = [
            'method' => $method,
            'total_score' => round($total, 2),
            'is_high_risk' => (bool) $interpretation?->is_high_risk,
            'interpretation' => $this->serializeInterpretation($interpretation),
        ];

        return $payload;
    }

    private function scaleBased(TestAttempt $attempt, array $config): array
    {
        $questionScales = $config['question_scales'] ?? [];
        $scales = [];

        foreach ($attempt->answers as $answer) {
            $scale = $answer->question->scale_name
                ?: ($questionScales[(string) $answer->question_id] ?? $questionScales[$answer->question_id] ?? 'general');

            $scales[$scale] ??= 0;
            $scales[$scale] += $this->adjustedScore($answer, $config);
        }

        $scaleResults = [];
        $isHighRisk = false;

        foreach ($scales as $scale => $score) {
            $interpretation = $this->findInterpretation($attempt->test->interpretations, $scale, $score);
            $isHighRisk = $isHighRisk || (bool) $interpretation?->is_high_risk;
            $score = round($score, 2);

            $scaleResults[$scale] = [
                'label' => $this->scaleLabel($config, $scale),
                'score' => $score,
                'interpretation' => $this->serializeInterpretation($interpretation),
            ];
        }

        $scaleResults = $this->sortScaleResults($scaleResults, $config);
        $matchedScale = ($config['match_highest_scale'] ?? false)
            ? $this->highestScale($scaleResults)
            : null;
        $matchedScore = $matchedScale ? $scaleResults[$matchedScale]['score'] : null;
        $matchedInterpretation = $matchedScale
            ? $this->findInterpretation($attempt->test->interpretations, $matchedScale, $matchedScore)
            : null;

        $payload = [
            'method' => 'scale_based',
            'total_score' => $matchedScale ? $matchedScore : round(array_sum($scales), 2),
            'is_high_risk' => $isHighRisk || (bool) $matchedInterpretation?->is_high_risk,
            'scales' => $scaleResults,
        ];

        if ($matchedScale) {
            $payload['matched_type'] = $matchedScale;
            $payload['matched_label'] = $scaleResults[$matchedScale]['label'] ?? $matchedScale;
            $payload['interpretation'] = $this->serializeInterpretation($matchedInterpretation);
        }

        return $payload;
    }

    private function maxMatchType(TestAttempt $attempt): array
    {
        $matches = [];

        foreach ($attempt->answers as $answer) {
            $values = $this->answerValues($answer);

            if (! $values) {
                continue;
            }

            foreach ($values as $value) {
                $matches[$value] ??= 0;
                $matches[$value]++;
            }
        }

        arsort($matches);

        $winner = array_key_first($matches);
        $score = $winner ? $matches[$winner] : 0;
        $interpretation = $winner
            ? $this->findInterpretation($attempt->test->interpretations, $winner, $score)
            : null;

        return [
            'method' => 'max_match_type',
            'total_score' => $score,
            'is_high_risk' => (bool) $interpretation?->is_high_risk,
            'matched_type' => $winner,
            'matches' => $matches,
            'interpretation' => $this->serializeInterpretation($interpretation),
        ];
    }

    private function traitMatrixType(TestAttempt $attempt, array $config): array
    {
        $scales = [];

        foreach ($attempt->answers as $answer) {
            $scale = $answer->question->scale_name;

            if (! $scale) {
                continue;
            }

            $scales[$scale] ??= 0;
            $scales[$scale] += $this->adjustedScore($answer, $config);
        }

        $thresholds = $config['thresholds'] ?? [];
        $extroversion = (float) ($scales['extroversion'] ?? 0);
        $introversion = (float) ($scales['introversion'] ?? 0);
        $neuroticism = (float) ($scales['neuroticism'] ?? 0);

        $isExtroverted = $extroversion >= ($thresholds['extroversion_high'] ?? 3)
            && $extroversion >= $introversion;
        $isNeurotic = $neuroticism >= ($thresholds['neuroticism_high'] ?? 2);

        $matchedType = match (true) {
            $isExtroverted && ! $isNeurotic => 'sanguine',
            $isExtroverted && $isNeurotic => 'choleric',
            ! $isExtroverted && ! $isNeurotic => 'phlegmatic',
            default => 'melancholic',
        };

        $interpretation = $this->findInterpretation(
            $attempt->test->interpretations,
            $matchedType,
            max(1, $extroversion + $introversion + $neuroticism)
        );
        $scaleResults = collect($scales)
            ->map(function ($score, $scale) use ($attempt, $config) {
                $score = round($score, 2);

                return [
                    'label' => $this->scaleLabel($config, $scale),
                    'score' => $score,
                    'interpretation' => $this->serializeInterpretation(
                        $this->findInterpretation($attempt->test->interpretations, $scale, $score)
                    ),
                ];
            })
            ->all();

        return [
            'method' => 'trait_matrix_type',
            'total_score' => round(array_sum($scales), 2),
            'is_high_risk' => false,
            'matched_type' => $matchedType,
            'scales' => $this->sortScaleResults($scaleResults, $config),
            'interpretation' => $this->serializeInterpretation($interpretation),
        ];
    }

    private function adjustedScore(Answer $answer, array $config): float
    {
        $score = (float) $answer->score;
        $reverseIds = $config['reverse_question_ids'] ?? $config['reverse_questions'] ?? [];

        if (! in_array($answer->question_id, array_map('intval', $reverseIds), true)) {
            return $score;
        }

        $scores = $answer->question->options->pluck('score')->map(fn ($value) => (float) $value);
        $min = (float) ($config['reverse_min_score'] ?? $scores->min() ?? 0);
        $max = (float) ($config['reverse_max_score'] ?? $scores->max() ?? 0);

        return ($min + $max) - $score;
    }

    private function answerValues(Answer $answer): array
    {
        $value = $answer->value ?: $answer->option?->value;

        if (! $value) {
            return [];
        }

        return collect(preg_split('/[|,;]/', $value))
            ->map(fn ($item) => trim($item))
            ->filter()
            ->values()
            ->all();
    }

    private function scaleLabel(array $config, string $scale): string
    {
        $meta = $config['scales'][$scale] ?? null;

        if (is_string($meta) && $meta !== '') {
            return $meta;
        }

        if (is_array($meta)) {
            $locale = app()->getLocale();

            return $meta['translations'][$locale]['label']
                ?? $meta['label']
                ?? $meta['name']
                ?? $scale;
        }

        return $config['scale_labels'][$scale] ?? $scale;
    }

    private function sortScaleResults(array $scaleResults, array $config): array
    {
        uksort($scaleResults, function (string $leftScale, string $rightScale) use ($config) {
            $leftOrder = $config['scales'][$leftScale]['order'] ?? null;
            $rightOrder = $config['scales'][$rightScale]['order'] ?? null;

            return (($leftOrder ?? PHP_INT_MAX) <=> ($rightOrder ?? PHP_INT_MAX))
                ?: ($leftScale <=> $rightScale);
        });

        return $scaleResults;
    }

    private function highestScale(array $scaleResults): ?string
    {
        $winner = null;
        $winnerScore = null;

        foreach ($scaleResults as $scale => $result) {
            $score = (float) ($result['score'] ?? 0);

            if ($winner === null || $score > $winnerScore) {
                $winner = $scale;
                $winnerScore = $score;
            }
        }

        return $winner;
    }

    private function findInterpretation(Collection $interpretations, ?string $scaleName, float|int|null $score): ?ResultInterpretation
    {
        if ($score === null) {
            return null;
        }

        return $interpretations
            ->filter(function (ResultInterpretation $interpretation) use ($scaleName, $score) {
                if ($scaleName !== null && $interpretation->scale_name !== $scaleName) {
                    return false;
                }

                if ($scaleName === null && $interpretation->scale_name !== null) {
                    return false;
                }

                if ($interpretation->min_score !== null && $score < (float) $interpretation->min_score) {
                    return false;
                }

                if ($interpretation->max_score !== null && $score > (float) $interpretation->max_score) {
                    return false;
                }

                return true;
            })
            ->sortByDesc('is_high_risk')
            ->first();
    }

    private function serializeInterpretation(?ResultInterpretation $interpretation): ?array
    {
        if (! $interpretation) {
            return null;
        }

        return [
            'scale_name' => $interpretation->scale_name,
            'title' => $interpretation->title,
            'description' => $interpretation->description,
            'recommendation' => $interpretation->recommendation,
            'is_high_risk' => $interpretation->is_high_risk,
        ];
    }
}

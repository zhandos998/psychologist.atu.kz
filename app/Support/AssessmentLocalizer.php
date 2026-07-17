<?php

namespace App\Support;

use App\Models\Answer;
use App\Models\Option;
use App\Models\Question;
use App\Models\ResultInterpretation;
use App\Models\Test;
use App\Models\TestAttempt;
use Illuminate\Database\Eloquent\Collection as EloquentCollection;
use Illuminate\Pagination\AbstractPaginator;
use Illuminate\Support\Collection;

class AssessmentLocalizer
{
    public function test(Test $test, ?string $locale = null): Test
    {
        $locale = $this->locale($locale);

        $this->apply($test, $locale, ['title', 'description', 'category']);

        if ($test->relationLoaded('questions')) {
            $this->questions($test->questions, $locale);
        }

        if ($test->relationLoaded('interpretations')) {
            $this->interpretations($test->interpretations, $locale);
        }

        $this->applyScaleLabels($test, $locale);

        return $test;
    }

    public function tests(iterable $tests, ?string $locale = null): iterable
    {
        foreach ($this->items($tests) as $test) {
            if ($test instanceof Test) {
                $this->test($test, $locale);
            }
        }

        return $tests;
    }

    public function attempt(TestAttempt $attempt, ?string $locale = null): TestAttempt
    {
        $locale = $this->locale($locale);

        if ($attempt->relationLoaded('test') && $attempt->test) {
            if ($attempt->test->relationLoaded('interpretations')) {
                $this->resultJson($attempt, $locale);
            }

            $this->test($attempt->test, $locale);
        }

        if ($attempt->relationLoaded('answers')) {
            foreach ($attempt->answers as $answer) {
                $this->answer($answer, $locale);
            }
        }

        return $attempt;
    }

    public function attempts(iterable $attempts, ?string $locale = null): iterable
    {
        foreach ($this->items($attempts) as $attempt) {
            if ($attempt instanceof TestAttempt) {
                $this->attempt($attempt, $locale);
            }
        }

        return $attempts;
    }

    private function answer(Answer $answer, string $locale): void
    {
        if ($answer->relationLoaded('question') && $answer->question) {
            $this->question($answer->question, $locale);
        }

        if ($answer->relationLoaded('option') && $answer->option) {
            $this->option($answer->option, $locale);
        }
    }

    private function questions(iterable $questions, string $locale): void
    {
        foreach ($questions as $question) {
            if ($question instanceof Question) {
                $this->question($question, $locale);
            }
        }
    }

    private function question(Question $question, string $locale): void
    {
        $this->apply($question, $locale, ['text']);

        if ($question->relationLoaded('options')) {
            foreach ($question->options as $option) {
                $this->option($option, $locale);
            }
        }
    }

    private function option(Option $option, string $locale): void
    {
        $this->apply($option, $locale, ['text']);
    }

    private function interpretations(iterable $interpretations, string $locale): void
    {
        foreach ($interpretations as $interpretation) {
            if ($interpretation instanceof ResultInterpretation) {
                $this->apply($interpretation, $locale, ['title', 'description', 'recommendation']);
            }
        }
    }

    private function resultJson(TestAttempt $attempt, string $locale): void
    {
        if (! is_array($attempt->result_json)) {
            return;
        }

        $result = $attempt->result_json;
        $interpretations = $attempt->test->interpretations;
        $scaleLabels = $this->scaleLabels($attempt->test, $locale);

        if (isset($result['scales']) && is_array($result['scales'])) {
            foreach ($result['scales'] as $scale => $scaleResult) {
                $score = $scaleResult['score'] ?? null;
                $interpretation = $this->findInterpretation($interpretations, $scale, $score);

                $result['scales'][$scale]['label'] = $scaleLabels[$scale]
                    ?? ($interpretation ? $this->translatedField($interpretation, $locale, 'scale_name') : null)
                    ?? ($scaleResult['label'] ?? $scale);

                if ($interpretation) {
                    $result['scales'][$scale]['interpretation'] = $this->serializedInterpretation(
                        $interpretation,
                        $locale,
                        $result['scales'][$scale]['label']
                    );
                }
            }
        }

        if (isset($result['matched_type'], $scaleLabels[$result['matched_type']])) {
            $result['matched_label'] = $scaleLabels[$result['matched_type']];
        }

        if (array_key_exists('interpretation', $result)) {
            $scale = $result['matched_type'] ?? null;
            $score = $result['total_score'] ?? null;
            $interpretation = $this->findInterpretation($interpretations, $scale, $score);

            if ($interpretation) {
                $result['interpretation'] = $this->serializedInterpretation(
                    $interpretation,
                    $locale,
                    $scale ? ($scaleLabels[$scale] ?? null) : null
                );
            }
        }

        $attempt->setAttribute('result_json', $result);
    }

    private function applyScaleLabels(Test $test, string $locale): void
    {
        if (! $test->relationLoaded('questions') && ! $test->relationLoaded('interpretations')) {
            return;
        }

        $labels = $this->scaleLabels($test, $locale);

        if (! $labels) {
            return;
        }

        if ($test->relationLoaded('questions')) {
            foreach ($test->questions as $question) {
                if ($question instanceof Question && $question->scale_name) {
                    $question->setAttribute('scale_label', $labels[$question->scale_name] ?? $question->scale_name);
                }
            }
        }

        if ($test->relationLoaded('interpretations')) {
            foreach ($test->interpretations as $interpretation) {
                if ($interpretation instanceof ResultInterpretation && $interpretation->scale_name) {
                    $interpretation->setAttribute('scale_label', $labels[$interpretation->scale_name] ?? $interpretation->scale_name);
                }
            }
        }
    }

    private function scaleLabels(Test $test, string $locale): array
    {
        $rule = $test->relationLoaded('scoringRule')
            ? $test->scoringRule
            : $test->scoringRule()->first();

        $config = $rule?->config ?: [];
        $labels = [];

        foreach (($config['scales'] ?? []) as $scale => $meta) {
            if (is_int($scale) && is_array($meta)) {
                $scale = $meta['value'] ?? $meta['code'] ?? null;
            }

            if (! is_string($scale) || $scale === '') {
                continue;
            }

            $label = $this->scaleLabel($meta, $scale, $locale);

            if ($label !== null) {
                $labels[$scale] = $label;
            }
        }

        foreach (($config['scale_labels'] ?? []) as $scale => $label) {
            if (is_string($scale) && is_string($label) && $label !== '') {
                $labels[$scale] ??= $label;
            }
        }

        return $labels;
    }

    private function scaleLabel(mixed $meta, string $scale, string $locale): ?string
    {
        if (is_string($meta)) {
            return $meta !== '' ? $meta : null;
        }

        if (! is_array($meta)) {
            return null;
        }

        return $meta['translations'][$locale]['label']
            ?? $meta['label']
            ?? $meta['name']
            ?? $scale;
    }

    private function findInterpretation(iterable $interpretations, ?string $scaleName, mixed $score): ?ResultInterpretation
    {
        if ($score === null) {
            return null;
        }

        foreach ($interpretations as $interpretation) {
            if (! $interpretation instanceof ResultInterpretation) {
                continue;
            }

            if ($scaleName !== null && $interpretation->scale_name !== $scaleName) {
                continue;
            }

            if ($scaleName === null && $interpretation->scale_name !== null) {
                continue;
            }

            if ($interpretation->min_score !== null && (float) $score < (float) $interpretation->min_score) {
                continue;
            }

            if ($interpretation->max_score !== null && (float) $score > (float) $interpretation->max_score) {
                continue;
            }

            return $interpretation;
        }

        return null;
    }

    private function serializedInterpretation(ResultInterpretation $interpretation, string $locale, ?string $scaleLabel = null): array
    {
        return [
            'scale_name' => $interpretation->scale_name,
            'scale_label' => $scaleLabel
                ?? $this->translatedField($interpretation, $locale, 'scale_name')
                ?? $interpretation->scale_name,
            'title' => $this->translatedField($interpretation, $locale, 'title') ?? $interpretation->title,
            'description' => $this->translatedField($interpretation, $locale, 'description') ?? $interpretation->description,
            'recommendation' => $this->translatedField($interpretation, $locale, 'recommendation') ?? $interpretation->recommendation,
            'is_high_risk' => $interpretation->is_high_risk,
        ];
    }

    private function apply(object $model, string $locale, array $fields): void
    {
        if ($locale === 'ru' || ! property_exists($model, 'translations') && ! method_exists($model, 'getAttribute')) {
            return;
        }

        $translations = $model->getAttribute('translations') ?? [];
        $localeTranslations = $translations[$locale] ?? [];

        foreach ($fields as $field) {
            $value = $this->translatedField($model, $locale, $field);

            if (filled($value)) {
                $model->setAttribute($field, $value);
            }
        }
    }

    private function translatedField(object $model, string $locale, string $field): mixed
    {
        if (! method_exists($model, 'getAttribute')) {
            return null;
        }

        $translations = $model->getAttribute('translations') ?? [];
        $localeTranslations = $translations[$locale] ?? [];

        return $localeTranslations[$field] ?? null;
    }

    private function items(iterable $items): iterable
    {
        if ($items instanceof AbstractPaginator) {
            return $items->getCollection();
        }

        if ($items instanceof Collection || $items instanceof EloquentCollection) {
            return $items;
        }

        return $items;
    }

    private function locale(?string $locale): string
    {
        return in_array($locale, ['ru', 'kk'], true) ? $locale : app()->getLocale();
    }
}

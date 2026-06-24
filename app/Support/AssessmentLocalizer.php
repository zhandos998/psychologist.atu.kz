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
        $this->apply($question, $locale, ['text', 'scale_name']);

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
                $this->apply($interpretation, $locale, ['scale_name', 'title', 'description', 'recommendation']);
            }
        }
    }

    private function apply(object $model, string $locale, array $fields): void
    {
        if ($locale === 'ru' || ! property_exists($model, 'translations') && ! method_exists($model, 'getAttribute')) {
            return;
        }

        $translations = $model->getAttribute('translations') ?? [];
        $localeTranslations = $translations[$locale] ?? [];

        foreach ($fields as $field) {
            if (array_key_exists($field, $localeTranslations) && filled($localeTranslations[$field])) {
                $model->setAttribute($field, $localeTranslations[$field]);
            }
        }
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

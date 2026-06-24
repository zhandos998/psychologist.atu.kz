<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;

class Option extends Model
{
    use HasFactory;

    protected $fillable = [
        'question_id',
        'text',
        'score',
        'value',
        'meta',
        'translations',
    ];

    protected function casts(): array
    {
        return [
            'score' => 'decimal:2',
            'meta' => 'array',
            'translations' => 'array',
        ];
    }

    public function question()
    {
        return $this->belongsTo(Question::class);
    }
}

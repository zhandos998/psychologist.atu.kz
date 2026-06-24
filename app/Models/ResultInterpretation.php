<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;

class ResultInterpretation extends Model
{
    use HasFactory;

    protected $fillable = [
        'test_id',
        'scale_name',
        'min_score',
        'max_score',
        'title',
        'description',
        'recommendation',
        'is_high_risk',
        'translations',
    ];

    protected function casts(): array
    {
        return [
            'min_score' => 'decimal:2',
            'max_score' => 'decimal:2',
            'is_high_risk' => 'boolean',
            'translations' => 'array',
        ];
    }

    public function test()
    {
        return $this->belongsTo(Test::class);
    }
}

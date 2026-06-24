<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;

class Question extends Model
{
    use HasFactory;

    protected $fillable = [
        'test_id',
        'text',
        'type',
        'order',
        'is_required',
        'scale_name',
        'meta',
        'translations',
    ];

    protected function casts(): array
    {
        return [
            'is_required' => 'boolean',
            'meta' => 'array',
            'translations' => 'array',
        ];
    }

    public function test()
    {
        return $this->belongsTo(Test::class);
    }

    public function options()
    {
        return $this->hasMany(Option::class);
    }
}

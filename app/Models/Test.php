<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;

class Test extends Model
{
    use HasFactory;

    protected $fillable = [
        'created_by',
        'title',
        'description',
        'type',
        'category',
        'is_required',
        'is_active',
        'access_roles',
        'start_date',
        'end_date',
        'translations',
    ];

    protected function casts(): array
    {
        return [
            'is_required' => 'boolean',
            'is_active' => 'boolean',
            'access_roles' => 'array',
            'start_date' => 'datetime',
            'end_date' => 'datetime',
            'translations' => 'array',
        ];
    }

    public function creator()
    {
        return $this->belongsTo(User::class, 'created_by');
    }

    public function questions()
    {
        return $this->hasMany(Question::class)->orderBy('order');
    }

    public function scoringRule()
    {
        return $this->hasOne(ScoringRule::class);
    }

    public function interpretations()
    {
        return $this->hasMany(ResultInterpretation::class);
    }

    public function attempts()
    {
        return $this->hasMany(TestAttempt::class);
    }

    public function isAvailableFor(User $user): bool
    {
        if (! $this->is_active) {
            return false;
        }

        if ($this->start_date && now()->lt($this->start_date)) {
            return false;
        }

        if ($this->end_date && now()->gt($this->end_date)) {
            return false;
        }

        $roles = $this->access_roles ?: ['student'];

        return in_array($user->role, $roles, true);
    }
}

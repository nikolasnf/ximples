<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Builder;
use Illuminate\Database\Eloquent\Model;

class PageTemplate extends Model
{
    protected $fillable = [
        'name',
        'slug',
        'description',
        'category',
        'preview_image',
        'structure_json',
        'html_base',
        'css_base',
        'is_active',
        'sort_order',
    ];

    protected function casts(): array
    {
        return [
            'structure_json' => 'array',
            'is_active' => 'boolean',
            'sort_order' => 'integer',
        ];
    }

    public function scopeActive(Builder $query): Builder
    {
        return $query->where('is_active', true);
    }
}

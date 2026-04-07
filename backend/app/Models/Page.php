<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Builder;

class Page extends Model
{
    protected $fillable = [
        'user_id',
        'asset_id',
        'template_id',
        'tenant_id',
        'title',
        'slug',
        'type',
        'status',
        'meta_title',
        'meta_description',
        'theme_json',
        'content_json',
        'exported_html_path',
        'preview_image',
    ];

    protected function casts(): array
    {
        return [
            'content_json' => 'array',
            'theme_json' => 'array',
        ];
    }

    public function user(): BelongsTo
    {
        return $this->belongsTo(User::class);
    }

    public function asset(): BelongsTo
    {
        return $this->belongsTo(Asset::class);
    }

    public function template(): BelongsTo
    {
        return $this->belongsTo(PageTemplate::class, 'template_id');
    }

    public function scopePublished(Builder $query): Builder
    {
        return $query->where('status', 'published');
    }

    public function scopeForTenant(Builder $query, string $tenantId): Builder
    {
        return $query->where('tenant_id', $tenantId);
    }

    public function isPublished(): bool
    {
        return $this->status === 'published';
    }

    public function getPublicUrl(): string
    {
        return config('app.frontend_url') . '/l/' . $this->slug;
    }

    public function getPreviewUrl(): string
    {
        return config('app.frontend_url') . '/pages/' . $this->id . '/preview';
    }
}

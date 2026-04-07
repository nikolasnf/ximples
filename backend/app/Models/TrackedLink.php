<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;

class TrackedLink extends Model
{
    protected $fillable = [
        'user_id',
        'tenant_id',
        'campaign_id',
        'contact_id',
        'page_id',
        'original_url',
        'short_code',
        'click_count',
        'last_clicked_at',
    ];

    protected function casts(): array
    {
        return [
            'last_clicked_at' => 'datetime',
        ];
    }

    public function user(): BelongsTo
    {
        return $this->belongsTo(User::class);
    }

    public function campaign(): BelongsTo
    {
        return $this->belongsTo(Campaign::class);
    }

    public function contact(): BelongsTo
    {
        return $this->belongsTo(Contact::class);
    }

    public function page(): BelongsTo
    {
        return $this->belongsTo(Page::class);
    }

    public function events(): HasMany
    {
        return $this->hasMany(Event::class);
    }

    public function getShortUrl(): string
    {
        $base = rtrim((string) config('app.frontend_url'), '/');
        return "{$base}/t/{$this->short_code}";
    }
}

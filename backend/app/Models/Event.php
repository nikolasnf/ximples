<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class Event extends Model
{
    public const TYPE_CLICK = 'click';
    public const TYPE_VISIT = 'visit';
    public const TYPE_CONVERSION = 'conversion';

    protected $fillable = [
        'user_id',
        'tenant_id',
        'contact_id',
        'campaign_id',
        'page_id',
        'tracked_link_id',
        'type',
        'name',
        'metadata',
        'ip',
        'user_agent',
        'referer',
        'session_id',
    ];

    protected function casts(): array
    {
        return [
            'metadata' => 'array',
        ];
    }

    public function user(): BelongsTo
    {
        return $this->belongsTo(User::class);
    }

    public function contact(): BelongsTo
    {
        return $this->belongsTo(Contact::class);
    }

    public function campaign(): BelongsTo
    {
        return $this->belongsTo(Campaign::class);
    }

    public function page(): BelongsTo
    {
        return $this->belongsTo(Page::class);
    }

    public function trackedLink(): BelongsTo
    {
        return $this->belongsTo(TrackedLink::class);
    }
}

<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class CopySuggestion extends Model
{
    public const STATUS_GENERATED = 'generated';
    public const STATUS_APPLIED = 'applied';
    public const STATUS_DISMISSED = 'dismissed';

    public const SOURCE_CAMPAIGN = 'campaign';
    public const SOURCE_PAGE = 'page';
    public const SOURCE_EXPERIMENT = 'experiment';

    public const TYPE_HEADLINE = 'headline';
    public const TYPE_SUBHEADLINE = 'subheadline';
    public const TYPE_CTA = 'cta';
    public const TYPE_MESSAGE_OPENING = 'message_opening';
    public const TYPE_BODY = 'body';
    public const TYPE_FULL_MESSAGE = 'full_message';

    protected $fillable = [
        'user_id',
        'tenant_id',
        'source_type',
        'source_id',
        'suggestion_type',
        'original_copy',
        'suggested_copy',
        'summary',
        'reasoning',
        'context_json',
        'performance_json',
        'status',
        'applied_at',
        'dismissed_at',
        'applied_field',
    ];

    protected function casts(): array
    {
        return [
            'reasoning'        => 'array',
            'context_json'     => 'array',
            'performance_json' => 'array',
            'applied_at'       => 'datetime',
            'dismissed_at'     => 'datetime',
        ];
    }

    public function user(): BelongsTo
    {
        return $this->belongsTo(User::class);
    }

    public function isGenerated(): bool
    {
        return $this->status === self::STATUS_GENERATED;
    }

    public function isApplied(): bool
    {
        return $this->status === self::STATUS_APPLIED;
    }

    public function isDismissed(): bool
    {
        return $this->status === self::STATUS_DISMISSED;
    }
}

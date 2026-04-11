<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class EmailSequenceSend extends Model
{
    public const STATUS_PENDING    = 'pending';
    public const STATUS_PROCESSING = 'processing';
    public const STATUS_SENT       = 'sent';
    public const STATUS_DELIVERED  = 'delivered';
    public const STATUS_FAILED     = 'failed';
    public const STATUS_BOUNCED    = 'bounced';
    public const STATUS_SKIPPED    = 'skipped';

    protected $fillable = [
        'tenant_id',
        'asset_id',
        'user_id',
        'list_id',
        'contact_id',
        'contact_email',
        'contact_name',
        'step_sequence',
        'subject_rendered',
        'body_rendered',
        'delay_hours',
        'scheduled_at',
        'sent_at',
        'status',
        'brevo_message_id',
        'provider_response',
        'error_message',
        'delivered_at',
        'opened_at',
        'clicked_at',
        'bounced_at',
        'dispatch_id',
    ];

    protected function casts(): array
    {
        return [
            'provider_response' => 'array',
            'scheduled_at'      => 'datetime',
            'sent_at'           => 'datetime',
            'delivered_at'      => 'datetime',
            'opened_at'         => 'datetime',
            'clicked_at'        => 'datetime',
            'bounced_at'        => 'datetime',
            'delay_hours'       => 'integer',
            'step_sequence'     => 'integer',
        ];
    }

    /* ─── Relations ─── */

    public function asset(): BelongsTo
    {
        return $this->belongsTo(Asset::class);
    }

    public function user(): BelongsTo
    {
        return $this->belongsTo(User::class);
    }

    public function contact(): BelongsTo
    {
        return $this->belongsTo(Contact::class);
    }

    public function contactList(): BelongsTo
    {
        return $this->belongsTo(ContactList::class, 'list_id');
    }

    /* ─── Scopes ─── */

    public function scopePending($query)
    {
        return $query->where('status', self::STATUS_PENDING);
    }

    public function scopeReady($query)
    {
        return $query->where('status', self::STATUS_PENDING)
            ->where('scheduled_at', '<=', now());
    }

    public function scopeForDispatch($query, string $dispatchId)
    {
        return $query->where('dispatch_id', $dispatchId);
    }

    public function scopeForAsset($query, int $assetId)
    {
        return $query->where('asset_id', $assetId);
    }

    /* ─── Helpers ─── */

    public function isTerminal(): bool
    {
        return in_array($this->status, [
            self::STATUS_SENT,
            self::STATUS_DELIVERED,
            self::STATUS_FAILED,
            self::STATUS_BOUNCED,
            self::STATUS_SKIPPED,
        ]);
    }

    public function markProcessing(): void
    {
        $this->update(['status' => self::STATUS_PROCESSING]);
    }

    public function markSent(string $brevoMessageId, ?array $response = null): void
    {
        $this->update([
            'status'            => self::STATUS_SENT,
            'sent_at'           => now(),
            'brevo_message_id'  => $brevoMessageId,
            'provider_response' => $response,
            'error_message'     => null,
        ]);
    }

    public function markFailed(string $error): void
    {
        $this->update([
            'status'        => self::STATUS_FAILED,
            'error_message' => $error,
        ]);
    }

    public function markSkipped(string $reason): void
    {
        $this->update([
            'status'        => self::STATUS_SKIPPED,
            'error_message' => $reason,
        ]);
    }
}

<?php

namespace App\Services;

use App\Models\Campaign;
use App\Models\CampaignContact;
use App\Models\Event;
use App\Models\TrackedLink;
use App\Models\User;
use Illuminate\Support\Carbon;

class AnalyticsService
{
    /**
     * High-level overview across all campaigns/pages for a user.
     * Optionally scoped to a date range.
     */
    public function overview(User $user, ?Carbon $from = null, ?Carbon $to = null): array
    {
        $from ??= now()->subDays(30)->startOfDay();
        $to ??= now()->endOfDay();

        $sent = CampaignContact::query()
            ->whereHas('campaign', fn ($q) => $q->where('user_id', $user->id))
            ->where('status', CampaignContact::STATUS_SENT)
            ->whereBetween('sent_at', [$from, $to])
            ->count();

        $eventCounts = Event::where('user_id', $user->id)
            ->whereBetween('created_at', [$from, $to])
            ->selectRaw('type, COUNT(*) as total')
            ->groupBy('type')
            ->pluck('total', 'type');

        $clicks = (int) ($eventCounts[Event::TYPE_CLICK] ?? 0);
        $visits = (int) ($eventCounts[Event::TYPE_VISIT] ?? 0);
        $conversions = (int) ($eventCounts[Event::TYPE_CONVERSION] ?? 0);

        // Unique clickers/visitors/converters (by contact when available, by IP otherwise)
        $uniqueClickers = $this->countUniqueActors($user->id, Event::TYPE_CLICK, $from, $to);
        $uniqueVisitors = $this->countUniqueActors($user->id, Event::TYPE_VISIT, $from, $to);
        $uniqueConverters = $this->countUniqueActors($user->id, Event::TYPE_CONVERSION, $from, $to);

        $ctr = $sent > 0 ? round(($uniqueClickers / $sent) * 100, 2) : 0.0;
        $visitRate = $uniqueClickers > 0 ? round(($uniqueVisitors / $uniqueClickers) * 100, 2) : 0.0;
        $conversionRate = $uniqueVisitors > 0 ? round(($uniqueConverters / $uniqueVisitors) * 100, 2) : 0.0;

        return [
            'range' => [
                'from' => $from->toIso8601String(),
                'to'   => $to->toIso8601String(),
            ],
            'totals' => [
                'sent'        => $sent,
                'clicks'      => $clicks,
                'visits'      => $visits,
                'conversions' => $conversions,
            ],
            'unique' => [
                'clickers'   => $uniqueClickers,
                'visitors'   => $uniqueVisitors,
                'converters' => $uniqueConverters,
            ],
            'rates' => [
                'ctr'             => $ctr,             // clickers / sent
                'visit_rate'      => $visitRate,       // visitors / clickers
                'conversion_rate' => $conversionRate,  // converters / visitors
            ],
            'funnel' => [
                ['label' => 'Enviados',     'value' => $sent],
                ['label' => 'Clicaram',     'value' => $uniqueClickers],
                ['label' => 'Visitaram',    'value' => $uniqueVisitors],
                ['label' => 'Converteram',  'value' => $uniqueConverters],
            ],
        ];
    }

    /**
     * Per-campaign analytics — funnel plus contact-level status table.
     */
    public function campaign(Campaign $campaign): array
    {
        $sent = (int) $campaign->sent_count;
        $failed = (int) $campaign->failed_count;
        $total = (int) $campaign->total_contacts;

        $events = Event::where('campaign_id', $campaign->id)
            ->selectRaw('type, COUNT(*) as total')
            ->groupBy('type')
            ->pluck('total', 'type');

        $clicks = (int) ($events[Event::TYPE_CLICK] ?? 0);
        $visits = (int) ($events[Event::TYPE_VISIT] ?? 0);
        $conversions = (int) ($events[Event::TYPE_CONVERSION] ?? 0);

        $uniqueClickers = Event::where('campaign_id', $campaign->id)
            ->where('type', Event::TYPE_CLICK)
            ->whereNotNull('contact_id')
            ->distinct('contact_id')
            ->count('contact_id');

        $uniqueVisitors = Event::where('campaign_id', $campaign->id)
            ->where('type', Event::TYPE_VISIT)
            ->whereNotNull('contact_id')
            ->distinct('contact_id')
            ->count('contact_id');

        $uniqueConverters = Event::where('campaign_id', $campaign->id)
            ->where('type', Event::TYPE_CONVERSION)
            ->whereNotNull('contact_id')
            ->distinct('contact_id')
            ->count('contact_id');

        $ctr = $sent > 0 ? round(($uniqueClickers / $sent) * 100, 2) : 0.0;
        $conversionRate = $sent > 0 ? round(($uniqueConverters / $sent) * 100, 2) : 0.0;

        // Contact-level table: sent status + whether each event type occurred
        $contactRows = CampaignContact::where('campaign_id', $campaign->id)
            ->with('contact:id,name,phone,email')
            ->orderBy('id')
            ->get()
            ->map(function (CampaignContact $cc) use ($campaign) {
                $eventTypes = Event::where('campaign_id', $campaign->id)
                    ->where('contact_id', $cc->contact_id)
                    ->pluck('type')
                    ->unique()
                    ->values()
                    ->all();

                return [
                    'contact_id' => $cc->contact_id,
                    'contact'    => $cc->contact ? [
                        'id'    => $cc->contact->id,
                        'name'  => $cc->contact->name,
                        'phone' => $cc->contact->phone,
                        'email' => $cc->contact->email,
                    ] : null,
                    'send_status' => $cc->status,
                    'sent_at'     => $cc->sent_at,
                    'clicked'     => in_array('click', $eventTypes, true),
                    'visited'     => in_array('visit', $eventTypes, true),
                    'converted'   => in_array('conversion', $eventTypes, true),
                    'error'       => $cc->error_message,
                ];
            });

        return [
            'campaign' => [
                'id'              => $campaign->id,
                'name'            => $campaign->name,
                'status'          => $campaign->status,
                'total_contacts'  => $total,
                'sent_count'      => $sent,
                'failed_count'    => $failed,
                'started_at'      => $campaign->started_at,
                'completed_at'    => $campaign->completed_at,
            ],
            'totals' => [
                'sent'        => $sent,
                'clicks'      => $clicks,
                'visits'      => $visits,
                'conversions' => $conversions,
            ],
            'unique' => [
                'clickers'   => $uniqueClickers,
                'visitors'   => $uniqueVisitors,
                'converters' => $uniqueConverters,
            ],
            'rates' => [
                'ctr'             => $ctr,
                'conversion_rate' => $conversionRate,
            ],
            'funnel' => [
                ['label' => 'Enviados',    'value' => $sent],
                ['label' => 'Clicaram',    'value' => $uniqueClickers],
                ['label' => 'Visitaram',   'value' => $uniqueVisitors],
                ['label' => 'Converteram', 'value' => $uniqueConverters],
            ],
            'contacts' => $contactRows,
        ];
    }

    /**
     * Count unique "actors" for an event type — prefers contact_id when
     * present, falls back to IP to avoid double-counting anonymous hits.
     */
    private function countUniqueActors(int $userId, string $type, Carbon $from, Carbon $to): int
    {
        $byContact = Event::where('user_id', $userId)
            ->where('type', $type)
            ->whereNotNull('contact_id')
            ->whereBetween('created_at', [$from, $to])
            ->distinct('contact_id')
            ->count('contact_id');

        $byIp = Event::where('user_id', $userId)
            ->where('type', $type)
            ->whereNull('contact_id')
            ->whereNotNull('ip')
            ->whereBetween('created_at', [$from, $to])
            ->distinct('ip')
            ->count('ip');

        return $byContact + $byIp;
    }
}

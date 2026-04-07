<?php

namespace App\Jobs;

use App\Models\Campaign;
use App\Models\CampaignContact;
use App\Services\CampaignService;
use Illuminate\Bus\Queueable;
use Illuminate\Contracts\Queue\ShouldQueue;
use Illuminate\Foundation\Bus\Dispatchable;
use Illuminate\Queue\InteractsWithQueue;
use Illuminate\Queue\SerializesModels;
use Illuminate\Support\Facades\Log;

/**
 * Orchestrates a campaign: dispatches one SendWhatsAppMessageJob per pending
 * CampaignContact row, respecting a simple rate limit (delay between messages).
 */
class SendCampaignJob implements ShouldQueue
{
    use Dispatchable, InteractsWithQueue, Queueable, SerializesModels;

    public int $tries = 3;
    public int $timeout = 600;

    public function __construct(public int $campaignId) {}

    public function handle(CampaignService $service): void
    {
        $campaign = Campaign::find($this->campaignId);
        if (!$campaign) {
            Log::warning('SendCampaignJob: campaign not found', ['id' => $this->campaignId]);
            return;
        }

        $pending = CampaignContact::where('campaign_id', $campaign->id)
            ->where('status', CampaignContact::STATUS_PENDING)
            ->orderBy('id')
            ->get();

        if ($pending->isEmpty()) {
            $service->finalizeIfComplete($campaign);
            return;
        }

        $ratePerMinute = max(1, (int) config('whatsapp.rate_limit_per_minute', 60));
        $delaySeconds = (int) ceil(60 / $ratePerMinute);

        foreach ($pending as $index => $cc) {
            SendWhatsAppMessageJob::dispatch($cc->id)
                ->delay(now()->addSeconds($index * $delaySeconds));
        }
    }
}

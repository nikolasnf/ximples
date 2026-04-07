<?php

namespace App\Jobs;

use App\Models\CampaignContact;
use App\Services\CampaignService;
use App\Services\TokenService;
use App\Services\WhatsApp\WhatsAppException;
use App\Services\WhatsAppService;
use Illuminate\Bus\Queueable;
use Illuminate\Contracts\Queue\ShouldQueue;
use Illuminate\Foundation\Bus\Dispatchable;
use Illuminate\Queue\InteractsWithQueue;
use Illuminate\Queue\SerializesModels;
use Illuminate\Support\Facades\Log;

/**
 * Sends a single WhatsApp message for a given CampaignContact row.
 * Renders placeholders, debits tokens, calls WhatsAppService, and updates status.
 */
class SendWhatsAppMessageJob implements ShouldQueue
{
    use Dispatchable, InteractsWithQueue, Queueable, SerializesModels;

    public int $tries = 3;
    public int $backoff = 30;
    public int $timeout = 60;

    public function __construct(public int $campaignContactId) {}

    public function handle(
        WhatsAppService $whatsapp,
        CampaignService $campaignService,
        TokenService $tokens,
    ): void {
        $cc = CampaignContact::with(['campaign.user', 'campaign.landingPage', 'contact'])
            ->find($this->campaignContactId);

        if (!$cc) {
            return;
        }

        // Idempotency: skip if already sent
        if ($cc->status === CampaignContact::STATUS_SENT) {
            return;
        }

        $campaign = $cc->campaign;
        $contact = $cc->contact;

        if (!$campaign || !$contact) {
            $cc->update([
                'status'        => CampaignContact::STATUS_FAILED,
                'error_message' => 'Campanha ou contato não encontrado.',
            ]);
            return;
        }

        $message = $campaignService->renderMessage($campaign, $contact);
        $cc->rendered_message = $message;

        // Debit tokens (atomic). If not enough, mark as skipped.
        $cost = (int) config('whatsapp.token_cost_per_message', 1);
        try {
            if ($cost > 0) {
                $tokens->debit(
                    $campaign->user,
                    $cost,
                    'whatsapp_message',
                    "Envio WhatsApp — campanha #{$campaign->id}",
                    $cc
                );
            }
        } catch (\Throwable $e) {
            $cc->update([
                'status'        => CampaignContact::STATUS_SKIPPED,
                'error_message' => 'Saldo insuficiente: ' . $e->getMessage(),
            ]);
            $campaignService->finalizeIfComplete($campaign);
            return;
        }

        try {
            $result = $whatsapp->sendMessage($contact->phone, $message, [
                'campaign_id' => $campaign->id,
                'contact_id'  => $contact->id,
            ]);

            $cc->update([
                'status'  => CampaignContact::STATUS_SENT,
                'sent_at' => now(),
                'rendered_message' => $message,
                'error_message'    => null,
            ]);
        } catch (WhatsAppException $e) {
            Log::warning('WhatsApp send failed', [
                'campaign_id' => $campaign->id,
                'contact_id'  => $contact->id,
                'error'       => $e->getMessage(),
            ]);

            // Refund tokens on failure
            if ($cost > 0) {
                try {
                    $tokens->credit(
                        $campaign->user,
                        $cost,
                        'whatsapp_refund',
                        "Estorno — falha envio campanha #{$campaign->id}",
                        $cc
                    );
                } catch (\Throwable) {
                    // swallow refund errors
                }
            }

            $cc->update([
                'status'        => CampaignContact::STATUS_FAILED,
                'error_message' => $e->getMessage(),
            ]);

            // Retry via queue if attempts remain
            if ($this->attempts() < $this->tries) {
                $this->release($this->backoff);
                return;
            }
        } finally {
            $campaignService->finalizeIfComplete($campaign);
        }
    }
}

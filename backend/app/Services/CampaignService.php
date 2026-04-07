<?php

namespace App\Services;

use App\Jobs\SendCampaignJob;
use App\Models\Campaign;
use App\Models\CampaignContact;
use App\Models\Contact;
use App\Models\ContactList;
use App\Models\Page;
use App\Models\User;
use App\Services\TrackingService;
use Illuminate\Support\Facades\DB;
use RuntimeException;

class CampaignService
{
    public function __construct(
        private readonly TokenService $tokens,
        private readonly TrackingService $tracking,
    ) {}

    /**
     * Create a new campaign owned by the given user.
     */
    public function create(User $user, array $data): Campaign
    {
        if (!empty($data['list_id'])) {
            ContactList::where('id', $data['list_id'])
                ->where('user_id', $user->id)
                ->firstOrFail();
        }

        if (!empty($data['landing_page_id'])) {
            Page::where('id', $data['landing_page_id'])
                ->where('user_id', $user->id)
                ->firstOrFail();
        }

        return Campaign::create([
            'user_id'          => $user->id,
            'tenant_id'        => $user->tenant_id,
            'list_id'          => $data['list_id'] ?? null,
            'landing_page_id'  => $data['landing_page_id'] ?? null,
            'name'             => $data['name'],
            'type'             => $data['type'] ?? 'whatsapp',
            'status'           => Campaign::STATUS_DRAFT,
            'message_template' => $data['message_template'],
            'scheduled_at'     => $data['scheduled_at'] ?? null,
        ]);
    }

    /**
     * Dispatch a campaign: materialize pending CampaignContact rows, validate
     * token balance, update campaign status, and push SendCampaignJob.
     */
    public function dispatchCampaign(Campaign $campaign): Campaign
    {
        if ($campaign->status === Campaign::STATUS_SENDING) {
            throw new RuntimeException('Campanha já está em envio.');
        }
        // draft, scheduled, failed, completed are all allowed — the last
        // case lets users retry failed contacts on a previously completed run.

        if (!$campaign->list_id) {
            throw new RuntimeException('Campanha não tem lista de contatos vinculada.');
        }

        $list = ContactList::with('contacts')->findOrFail($campaign->list_id);
        $contacts = $list->contacts;

        if ($contacts->isEmpty()) {
            throw new RuntimeException('Lista de contatos vazia.');
        }

        // Token check (optional — only if cost > 0)
        $costPerMessage = (int) config('whatsapp.token_cost_per_message', 1);
        $totalCost = $costPerMessage * $contacts->count();

        if ($totalCost > 0 && !$this->tokens->hasEnoughBalance($campaign->user, $totalCost)) {
            throw new RuntimeException(
                "Saldo insuficiente: campanha requer {$totalCost} tokens."
            );
        }

        DB::transaction(function () use ($campaign, $contacts) {
            // Materialize pending rows (idempotent)
            foreach ($contacts as $contact) {
                CampaignContact::firstOrCreate(
                    [
                        'campaign_id' => $campaign->id,
                        'contact_id'  => $contact->id,
                    ],
                    [
                        'status' => CampaignContact::STATUS_PENDING,
                    ]
                );
            }

            // Retry: when a previous run left rows in `failed` or `skipped`
            // state, reset them to `pending` so SendCampaignJob picks them
            // up on this dispatch. `sent` rows are preserved (idempotent).
            CampaignContact::where('campaign_id', $campaign->id)
                ->whereIn('status', [CampaignContact::STATUS_FAILED, CampaignContact::STATUS_SKIPPED])
                ->update([
                    'status'        => CampaignContact::STATUS_PENDING,
                    'error_message' => null,
                ]);

            $campaign->update([
                'status'          => Campaign::STATUS_SENDING,
                'started_at'      => now(),
                'total_contacts'  => $contacts->count(),
                'failed_count'    => 0,
            ]);
        });

        SendCampaignJob::dispatch($campaign->id);

        return $campaign->fresh();
    }

    /**
     * Render a message template against contact and campaign context.
     * Supported placeholders: {{name}}, {{phone}}, {{email}}, {{link}}
     *
     * When a landing page is attached, {{link}} is replaced with a
     * per-contact tracked short URL so clicks/visits can be attributed
     * back to the campaign and the individual contact.
     */
    public function renderMessage(Campaign $campaign, Contact $contact): string
    {
        $link = '';
        if ($campaign->landing_page_id) {
            $page = $campaign->landingPage ?: Page::find($campaign->landing_page_id);
            if ($page) {
                $tracked = $this->tracking->createOrGetLink(
                    user: $campaign->user,
                    originalUrl: $page->getPublicUrl(),
                    campaign: $campaign,
                    contact: $contact,
                    page: $page,
                );
                $link = $tracked->getShortUrl();
            }
        }

        $replacements = [
            '{{name}}'  => $contact->name ?: '',
            '{{phone}}' => $contact->phone,
            '{{email}}' => $contact->email ?: '',
            '{{link}}'  => $link,
        ];

        return strtr($campaign->message_template, $replacements);
    }

    /**
     * Recompute aggregated counters and finalize status if fully processed.
     */
    public function finalizeIfComplete(Campaign $campaign): void
    {
        $campaign->refresh();

        $counts = CampaignContact::where('campaign_id', $campaign->id)
            ->selectRaw("
                SUM(CASE WHEN status = 'sent' THEN 1 ELSE 0 END) as sent,
                SUM(CASE WHEN status = 'failed' THEN 1 ELSE 0 END) as failed,
                SUM(CASE WHEN status = 'pending' THEN 1 ELSE 0 END) as pending
            ")
            ->first();

        $campaign->sent_count = (int) ($counts->sent ?? 0);
        $campaign->failed_count = (int) ($counts->failed ?? 0);

        if ((int) ($counts->pending ?? 0) === 0) {
            $campaign->status = $campaign->failed_count > 0 && $campaign->sent_count === 0
                ? Campaign::STATUS_FAILED
                : Campaign::STATUS_COMPLETED;
            $campaign->completed_at = now();
        }

        $campaign->save();
    }
}

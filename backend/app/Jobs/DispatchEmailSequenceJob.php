<?php

namespace App\Jobs;

use App\Models\Asset;
use App\Models\Contact;
use App\Models\ContactList;
use App\Models\EmailSequenceSend;
use App\Services\EmailTemplateRenderer;
use App\Services\TokenService;
use Illuminate\Bus\Queueable;
use Illuminate\Contracts\Queue\ShouldQueue;
use Illuminate\Foundation\Bus\Dispatchable;
use Illuminate\Queue\InteractsWithQueue;
use Illuminate\Queue\SerializesModels;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Log;
use Illuminate\Support\Str;
use RuntimeException;

/**
 * Orchestrator: materializes EmailSequenceSend rows for every contact × step
 * in an email sequence asset, then dispatches SendSequenceEmailJob for each.
 *
 * Respects delay_hours per step by scheduling sends in the future.
 */
class DispatchEmailSequenceJob implements ShouldQueue
{
    use Dispatchable, InteractsWithQueue, Queueable, SerializesModels;

    public int $tries   = 1;
    public int $timeout = 300;

    public function __construct(
        public int    $assetId,
        public int    $userId,
        public int    $listId,
        public string $dispatchId,
    ) {}

    public function handle(EmailTemplateRenderer $renderer, TokenService $tokens): void
    {
        $asset = Asset::find($this->assetId);
        if (!$asset) {
            Log::warning('DispatchEmailSequenceJob: asset not found', ['id' => $this->assetId]);
            return;
        }

        $user = \App\Models\User::find($this->userId);
        if (!$user) {
            Log::warning('DispatchEmailSequenceJob: user not found', ['id' => $this->userId]);
            return;
        }

        $list = ContactList::with('contacts')->find($this->listId);
        if (!$list || $list->contacts->isEmpty()) {
            Log::warning('DispatchEmailSequenceJob: empty list', ['list_id' => $this->listId]);
            return;
        }

        $content = $asset->content;
        $emails = $content['emails'] ?? [];

        if (empty($emails)) {
            Log::warning('DispatchEmailSequenceJob: no emails in sequence', ['asset_id' => $this->assetId]);
            return;
        }

        // Filter contacts that have an email address
        $contacts = $list->contacts->filter(fn (Contact $c) => !empty($c->email));

        if ($contacts->isEmpty()) {
            Log::warning('DispatchEmailSequenceJob: no contacts with email', [
                'list_id' => $this->listId,
            ]);
            return;
        }

        // Token balance check
        $costPerEmail = (int) config('brevo.token_cost_per_email', 1);
        $totalEmails  = $contacts->count() * count($emails);
        $totalCost    = $costPerEmail * $totalEmails;

        if ($totalCost > 0 && !$tokens->hasEnoughBalance($user, $totalCost)) {
            Log::warning('DispatchEmailSequenceJob: insufficient balance', [
                'required' => $totalCost,
                'balance'  => $tokens->getBalance($user),
            ]);
            throw new RuntimeException(
                "Saldo insuficiente: sequência requer {$totalCost} tokens ({$totalEmails} emails × {$costPerEmail} tokens)."
            );
        }

        $ratePerMinute = max(1, (int) config('brevo.rate_limit_per_minute', 60));
        $delayBetween  = (int) ceil(60 / $ratePerMinute); // seconds between sends

        $now        = now();
        $jobIndex   = 0;

        DB::transaction(function () use (
            $asset, $user, $contacts, $emails, $renderer, $now, $delayBetween, &$jobIndex,
        ) {
            foreach ($contacts as $contact) {
                $cumulativeDelay = 0;

                foreach ($emails as $emailStep) {
                    $sequence   = (int) ($emailStep['sequence'] ?? 0);
                    $delayHours = (int) ($emailStep['delay_hours'] ?? 0);
                    $subject    = (string) ($emailStep['subject'] ?? '');
                    $body       = (string) ($emailStep['body'] ?? '');

                    $cumulativeDelay += $delayHours;

                    // Render templates
                    $subjectRendered = $renderer->render($subject, $contact);
                    $bodyRendered    = $renderer->render($body, $contact);

                    // Schedule time: base time + cumulative delay + rate-limit spacing
                    $scheduledAt = $now
                        ->copy()
                        ->addHours($cumulativeDelay)
                        ->addSeconds($jobIndex * $delayBetween);

                    $send = EmailSequenceSend::create([
                        'tenant_id'        => $user->tenant_id,
                        'asset_id'         => $asset->id,
                        'user_id'          => $user->id,
                        'list_id'          => $this->listId,
                        'contact_id'       => $contact->id,
                        'contact_email'    => $contact->email,
                        'contact_name'     => $contact->name,
                        'step_sequence'    => $sequence,
                        'subject_rendered' => $subjectRendered,
                        'body_rendered'    => $bodyRendered,
                        'delay_hours'      => $delayHours,
                        'scheduled_at'     => $scheduledAt,
                        'status'           => EmailSequenceSend::STATUS_PENDING,
                        'dispatch_id'      => $this->dispatchId,
                    ]);

                    // Dispatch individual send job at the scheduled time
                    SendSequenceEmailJob::dispatch($send->id)
                        ->delay($scheduledAt);

                    $jobIndex++;
                }
            }
        });

        Log::info('DispatchEmailSequenceJob: dispatched', [
            'asset_id'    => $this->assetId,
            'dispatch_id' => $this->dispatchId,
            'total_sends' => $jobIndex,
            'contacts'    => $contacts->count(),
            'steps'       => count($emails),
        ]);
    }
}

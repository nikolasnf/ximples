<?php

namespace App\Jobs;

use App\Models\EmailSequenceSend;
use App\Services\BrevoEmailService;
use App\Services\TokenService;
use Illuminate\Bus\Queueable;
use Illuminate\Contracts\Queue\ShouldQueue;
use Illuminate\Foundation\Bus\Dispatchable;
use Illuminate\Queue\InteractsWithQueue;
use Illuminate\Queue\SerializesModels;
use Illuminate\Support\Facades\Log;

/**
 * Sends a single email step from a sequence via Brevo.
 *
 * Mirrors the pattern of SendWhatsAppMessageJob:
 *   - Idempotent (skips already-sent rows)
 *   - Debits tokens before sending, refunds on failure
 *   - Retries with backoff on transient errors
 */
class SendSequenceEmailJob implements ShouldQueue
{
    use Dispatchable, InteractsWithQueue, Queueable, SerializesModels;

    public int $tries   = 3;
    public int $backoff = 30;
    public int $timeout = 60;

    public function __construct(public int $sendId) {}

    public function handle(
        BrevoEmailService $brevo,
        TokenService      $tokens,
    ): void {
        $send = EmailSequenceSend::with(['user', 'contact'])->find($this->sendId);

        if (!$send) {
            Log::warning('SendSequenceEmailJob: send record not found', ['id' => $this->sendId]);
            return;
        }

        // Idempotency: skip terminal states
        if ($send->isTerminal()) {
            return;
        }

        $user    = $send->user;
        $contact = $send->contact;

        if (!$user || !$contact) {
            $send->markFailed('Usuário ou contato não encontrado.');
            return;
        }

        // Validate email
        if (!$send->contact_email || !filter_var($send->contact_email, FILTER_VALIDATE_EMAIL)) {
            $send->markSkipped('Email inválido: ' . ($send->contact_email ?: '(vazio)'));
            return;
        }

        $send->markProcessing();

        // Debit tokens
        $cost = (int) config('brevo.token_cost_per_email', 1);
        try {
            if ($cost > 0) {
                $tokens->debit(
                    $user,
                    $cost,
                    'email_sequence',
                    "Envio email — sequência asset #{$send->asset_id}, etapa {$send->step_sequence}",
                    $send
                );
            }
        } catch (\Throwable $e) {
            $send->markSkipped('Saldo insuficiente: ' . $e->getMessage());
            return;
        }

        try {
            $htmlContent = BrevoEmailService::textToHtml($send->body_rendered);

            $result = $brevo->send(
                toEmail:     $send->contact_email,
                toName:      $send->contact_name,
                subject:     $send->subject_rendered,
                htmlContent: $htmlContent,
                textContent: $send->body_rendered,
                tags:        ['email_sequence', "asset_{$send->asset_id}", "step_{$send->step_sequence}"],
                headers:     [
                    'X-Ximples-Send-Id'   => (string) $send->id,
                    'X-Ximples-Asset-Id'  => (string) $send->asset_id,
                    'X-Ximples-Step'      => (string) $send->step_sequence,
                    'X-Ximples-Dispatch'  => $send->dispatch_id,
                ],
            );

            $send->markSent($result['messageId'], $result['raw']);

        } catch (\Throwable $e) {
            Log::warning('SendSequenceEmailJob: send failed', [
                'send_id' => $send->id,
                'error'   => $e->getMessage(),
            ]);

            // Refund tokens on failure
            if ($cost > 0) {
                try {
                    $tokens->credit(
                        $user,
                        $cost,
                        'email_refund',
                        "Estorno — falha envio email, send #{$send->id}",
                        $send
                    );
                } catch (\Throwable) {
                    // swallow refund errors
                }
            }

            // If retries remain, release back to queue
            if ($this->attempts() < $this->tries) {
                $send->update(['status' => EmailSequenceSend::STATUS_PENDING]);
                $this->release($this->backoff);
                return;
            }

            $send->markFailed($e->getMessage());
        }
    }
}

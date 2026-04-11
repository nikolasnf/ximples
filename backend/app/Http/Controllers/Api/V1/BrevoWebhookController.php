<?php

namespace App\Http\Controllers\Api\V1;

use App\Http\Controllers\Controller;
use App\Models\EmailSequenceSend;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Log;

/**
 * Receives webhook event callbacks from Brevo.
 *
 * Brevo sends POST requests for events like:
 *   delivered, opened, click, soft_bounce, hard_bounce,
 *   blocked, spam, unsubscribed, invalid_email, error
 *
 * We match events to EmailSequenceSend rows via the message-id header
 * (stored as brevo_message_id).
 *
 * Security: Brevo doesn't sign webhooks, so we use a shared secret
 * appended as ?secret=<token> on the webhook URL configured in Brevo.
 *
 * @see https://developers.brevo.com/docs/how-to-use-webhooks
 */
class BrevoWebhookController extends Controller
{
    /**
     * POST /api/v1/webhooks/brevo?secret=xxx
     */
    public function handle(Request $request): JsonResponse
    {
        // Verify shared secret if configured
        $expectedSecret = config('brevo.webhook_secret');
        if ($expectedSecret && $request->query('secret') !== $expectedSecret) {
            Log::warning('BrevoWebhook: invalid secret');
            return response()->json(['error' => 'Unauthorized'], 401);
        }

        $event     = $request->input('event');
        $messageId = $request->input('message-id') ?? $request->input('messageId');

        if (!$event || !$messageId) {
            return response()->json(['status' => 'ignored', 'reason' => 'missing event or message-id']);
        }

        Log::info('BrevoWebhook: received', [
            'event'      => $event,
            'message_id' => $messageId,
            'email'      => $request->input('email'),
        ]);

        // Find the send record by Brevo message ID
        $send = EmailSequenceSend::where('brevo_message_id', $messageId)->first();

        if (!$send) {
            // Not our message — could be from password reset or other Laravel emails
            return response()->json(['status' => 'ignored', 'reason' => 'unknown message-id']);
        }

        $this->processEvent($send, $event, $request->all());

        return response()->json(['status' => 'ok']);
    }

    private function processEvent(EmailSequenceSend $send, string $event, array $payload): void
    {
        switch ($event) {
            case 'delivered':
                $send->update([
                    'status'       => EmailSequenceSend::STATUS_DELIVERED,
                    'delivered_at' => now(),
                ]);
                break;

            case 'opened':
            case 'unique_opened':
                // Only record first open
                if (!$send->opened_at) {
                    $send->update(['opened_at' => now()]);
                }
                break;

            case 'click':
                // Only record first click
                if (!$send->clicked_at) {
                    $send->update(['clicked_at' => now()]);
                }
                break;

            case 'hard_bounce':
            case 'soft_bounce':
                $send->update([
                    'status'        => EmailSequenceSend::STATUS_BOUNCED,
                    'bounced_at'    => now(),
                    'error_message' => "Bounce ({$event}): " . ($payload['reason'] ?? 'unknown'),
                ]);
                break;

            case 'blocked':
            case 'invalid_email':
            case 'error':
                $send->update([
                    'status'        => EmailSequenceSend::STATUS_FAILED,
                    'error_message' => "{$event}: " . ($payload['reason'] ?? $payload['message'] ?? 'unknown'),
                ]);
                break;

            case 'spam':
                $send->update([
                    'status'        => EmailSequenceSend::STATUS_FAILED,
                    'error_message' => 'Marcado como spam pelo destinatário.',
                ]);
                break;

            case 'unsubscribed':
                $send->update([
                    'error_message' => 'Destinatário cancelou inscrição.',
                ]);
                break;

            default:
                Log::debug('BrevoWebhook: unhandled event', ['event' => $event, 'send_id' => $send->id]);
                break;
        }
    }
}

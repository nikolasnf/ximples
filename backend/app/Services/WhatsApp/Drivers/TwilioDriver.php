<?php

namespace App\Services\WhatsApp\Drivers;

use App\Services\WhatsApp\WhatsAppException;
use App\Services\WhatsApp\WhatsAppProvider;
use Illuminate\Support\Facades\Http;

/**
 * Twilio WhatsApp driver. Required config:
 *   whatsapp.twilio.account_sid
 *   whatsapp.twilio.auth_token
 *   whatsapp.twilio.from (e.g. "whatsapp:+14155238886")
 */
class TwilioDriver implements WhatsAppProvider
{
    public function __construct(private readonly array $config) {}

    public function sendMessage(string $phone, string $message, array $options = []): array
    {
        $sid = $this->config['account_sid'] ?? null;
        $token = $this->config['auth_token'] ?? null;
        $from = $this->config['from'] ?? null;

        if (!$sid || !$token || !$from) {
            throw new WhatsAppException('Twilio não configurado (account_sid/auth_token/from).');
        }

        $response = Http::withBasicAuth($sid, $token)
            ->asForm()
            ->timeout(15)
            ->post("https://api.twilio.com/2010-04-01/Accounts/{$sid}/Messages.json", [
                'From' => $from,
                'To'   => 'whatsapp:' . $phone,
                'Body' => $message,
            ]);

        if (!$response->successful()) {
            throw new WhatsAppException('Falha ao enviar via Twilio: ' . $response->body());
        }

        $data = $response->json();

        return [
            'id'     => $data['sid'] ?? null,
            'status' => 'sent',
            'raw'    => $data,
        ];
    }

    public function name(): string
    {
        return 'twilio';
    }
}

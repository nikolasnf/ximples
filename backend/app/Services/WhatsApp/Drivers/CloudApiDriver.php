<?php

namespace App\Services\WhatsApp\Drivers;

use App\Services\WhatsApp\WhatsAppException;
use App\Services\WhatsApp\WhatsAppProvider;
use Illuminate\Support\Facades\Http;

/**
 * Meta (Facebook) WhatsApp Cloud API driver.
 *
 * Required config:
 *   whatsapp.cloud.phone_number_id
 *   whatsapp.cloud.access_token
 *   whatsapp.cloud.api_version (default: v20.0)
 */
class CloudApiDriver implements WhatsAppProvider
{
    public function __construct(private readonly array $config) {}

    public function sendMessage(string $phone, string $message, array $options = []): array
    {
        $phoneNumberId = $this->config['phone_number_id'] ?? null;
        $token = $this->config['access_token'] ?? null;
        $version = $this->config['api_version'] ?? 'v20.0';

        if (!$phoneNumberId || !$token) {
            throw new WhatsAppException('WhatsApp Cloud API não configurado (phone_number_id/access_token).');
        }

        // Cloud API expects number without "+"
        $to = ltrim($phone, '+');

        $response = Http::withToken($token)
            ->acceptJson()
            ->asJson()
            ->timeout(15)
            ->post("https://graph.facebook.com/{$version}/{$phoneNumberId}/messages", [
                'messaging_product' => 'whatsapp',
                'to' => $to,
                'type' => 'text',
                'text' => [
                    'preview_url' => true,
                    'body' => $message,
                ],
            ]);

        if (!$response->successful()) {
            throw new WhatsAppException('Falha ao enviar via WhatsApp Cloud API: ' . $response->body());
        }

        $data = $response->json();

        return [
            'id'     => $data['messages'][0]['id'] ?? null,
            'status' => 'sent',
            'raw'    => $data,
        ];
    }

    public function name(): string
    {
        return 'cloud';
    }
}

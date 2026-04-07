<?php

namespace App\Services\WhatsApp\Drivers;

use App\Services\WhatsApp\WhatsAppException;
use App\Services\WhatsApp\WhatsAppProvider;
use Illuminate\Support\Facades\Http;

/**
 * Gupshup driver. Required config:
 *   whatsapp.gupshup.api_key
 *   whatsapp.gupshup.source (sender number)
 *   whatsapp.gupshup.app_name
 */
class GupshupDriver implements WhatsAppProvider
{
    public function __construct(private readonly array $config) {}

    public function sendMessage(string $phone, string $message, array $options = []): array
    {
        $apiKey = $this->config['api_key'] ?? null;
        $source = $this->config['source'] ?? null;
        $appName = $this->config['app_name'] ?? null;

        if (!$apiKey || !$source || !$appName) {
            throw new WhatsAppException('Gupshup não configurado (api_key/source/app_name).');
        }

        $response = Http::withHeaders(['apikey' => $apiKey])
            ->asForm()
            ->timeout(15)
            ->post('https://api.gupshup.io/sm/api/v1/msg', [
                'channel'     => 'whatsapp',
                'source'      => ltrim($source, '+'),
                'destination' => ltrim($phone, '+'),
                'message'     => json_encode(['type' => 'text', 'text' => $message]),
                'src.name'    => $appName,
            ]);

        if (!$response->successful()) {
            throw new WhatsAppException('Falha ao enviar via Gupshup: ' . $response->body());
        }

        $data = $response->json();

        return [
            'id'     => $data['messageId'] ?? null,
            'status' => 'sent',
            'raw'    => $data,
        ];
    }

    public function name(): string
    {
        return 'gupshup';
    }
}

<?php

namespace App\Services\WhatsApp\Drivers;

use App\Services\WhatsApp\WhatsAppException;
use App\Services\WhatsApp\WhatsAppProvider;
use Illuminate\Support\Facades\Http;

/**
 * Z-API driver. Required config:
 *   whatsapp.zapi.instance_id
 *   whatsapp.zapi.token
 *   whatsapp.zapi.client_token (optional, header "Client-Token")
 */
class ZApiDriver implements WhatsAppProvider
{
    public function __construct(private readonly array $config) {}

    public function sendMessage(string $phone, string $message, array $options = []): array
    {
        $instance = $this->config['instance_id'] ?? null;
        $token = $this->config['token'] ?? null;
        $clientToken = $this->config['client_token'] ?? null;

        if (!$instance || !$token) {
            throw new WhatsAppException('Z-API não configurado (instance_id/token).');
        }

        $request = Http::acceptJson()->asJson()->timeout(15);
        if ($clientToken) {
            $request = $request->withHeaders(['Client-Token' => $clientToken]);
        }

        $response = $request->post(
            "https://api.z-api.io/instances/{$instance}/token/{$token}/send-text",
            [
                'phone'   => ltrim($phone, '+'),
                'message' => $message,
            ]
        );

        if (!$response->successful()) {
            throw new WhatsAppException('Falha ao enviar via Z-API: ' . $response->body());
        }

        $data = $response->json();

        return [
            'id'     => $data['messageId'] ?? $data['id'] ?? null,
            'status' => 'sent',
            'raw'    => $data,
        ];
    }

    public function name(): string
    {
        return 'zapi';
    }
}

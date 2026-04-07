<?php

namespace App\Services\WhatsApp\Drivers;

use App\Services\WhatsApp\WhatsAppProvider;
use Illuminate\Support\Facades\Log;
use Illuminate\Support\Str;

/**
 * Default "no-op" driver that logs outgoing WhatsApp messages instead of
 * actually sending them. Safe default for dev/staging.
 */
class LogDriver implements WhatsAppProvider
{
    public function sendMessage(string $phone, string $message, array $options = []): array
    {
        $id = (string) Str::uuid();

        Log::channel(config('whatsapp.log_channel', 'stack'))->info('[whatsapp][log] send', [
            'id'      => $id,
            'phone'   => $phone,
            'message' => $message,
            'options' => $options,
        ]);

        return [
            'id'     => $id,
            'status' => 'sent',
            'raw'    => null,
        ];
    }

    public function name(): string
    {
        return 'log';
    }
}

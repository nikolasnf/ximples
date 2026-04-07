<?php

namespace App\Services\WhatsApp;

interface WhatsAppProvider
{
    /**
     * Send a WhatsApp text message.
     *
     * @param  string  $phone  International phone number (E.164, with "+")
     * @param  string  $message  Plain-text message (placeholders already resolved)
     * @param  array<string,mixed>  $options  Optional provider-specific options
     * @return array{id:?string,status:string,raw:mixed}
     *
     * @throws WhatsAppException on unrecoverable failure.
     */
    public function sendMessage(string $phone, string $message, array $options = []): array;

    /**
     * Provider identifier (e.g. "log", "cloud", "zapi", "twilio", "gupshup").
     */
    public function name(): string;
}

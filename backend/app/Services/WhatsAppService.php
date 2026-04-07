<?php

namespace App\Services;

use App\Services\WhatsApp\Drivers\CloudApiDriver;
use App\Services\WhatsApp\Drivers\GupshupDriver;
use App\Services\WhatsApp\Drivers\LogDriver;
use App\Services\WhatsApp\Drivers\TwilioDriver;
use App\Services\WhatsApp\Drivers\ZApiDriver;
use App\Services\WhatsApp\WhatsAppException;
use App\Services\WhatsApp\WhatsAppProvider;

/**
 * Facade-like service that resolves the active WhatsApp provider from config
 * and exposes a simple sendMessage API.
 *
 * Supported drivers (config: whatsapp.default):
 *   - log     (default, no real send — safe for dev)
 *   - cloud   (Meta WhatsApp Cloud API)
 *   - zapi    (Z-API)
 *   - twilio  (Twilio WhatsApp)
 *   - gupshup (Gupshup)
 */
class WhatsAppService
{
    private ?WhatsAppProvider $provider = null;

    /**
     * Send a WhatsApp message using the configured provider.
     *
     * @param  string  $phone  Phone number in E.164 format (+5511999999999)
     * @param  string  $message  Plain-text message body
     * @param  array<string,mixed>  $options
     * @return array{id:?string,status:string,raw:mixed}
     *
     * @throws WhatsAppException
     */
    public function sendMessage(string $phone, string $message, array $options = []): array
    {
        return $this->provider()->sendMessage($phone, $message, $options);
    }

    public function provider(): WhatsAppProvider
    {
        if ($this->provider !== null) {
            return $this->provider;
        }

        $driver = config('whatsapp.default', 'log');
        $config = config("whatsapp.providers.{$driver}", []);

        return $this->provider = match ($driver) {
            'cloud'   => new CloudApiDriver($config),
            'zapi'    => new ZApiDriver($config),
            'twilio'  => new TwilioDriver($config),
            'gupshup' => new GupshupDriver($config),
            default   => new LogDriver(),
        };
    }

    /**
     * Replace the active provider — useful for tests.
     */
    public function setProvider(WhatsAppProvider $provider): void
    {
        $this->provider = $provider;
    }
}

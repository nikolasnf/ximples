<?php

return [

    /*
    |--------------------------------------------------------------------------
    | Default WhatsApp Provider
    |--------------------------------------------------------------------------
    |
    | Supported: "log", "cloud", "zapi", "twilio", "gupshup"
    | "log" is the safe default — it does not call any external API and just
    | writes outgoing messages to the log. Switch to a real provider when ready.
    |
    */

    'default' => env('WHATSAPP_DRIVER', 'log'),

    'log_channel' => env('WHATSAPP_LOG_CHANNEL', 'stack'),

    /*
    |--------------------------------------------------------------------------
    | Token cost per outbound message
    |--------------------------------------------------------------------------
    */
    'token_cost_per_message' => (int) env('WHATSAPP_TOKEN_COST', 1),

    /*
    |--------------------------------------------------------------------------
    | Rate limiting (per campaign) — messages per minute.
    |--------------------------------------------------------------------------
    */
    'rate_limit_per_minute' => (int) env('WHATSAPP_RATE_LIMIT', 60),

    'providers' => [

        'cloud' => [
            'phone_number_id' => env('WHATSAPP_CLOUD_PHONE_NUMBER_ID'),
            'access_token'    => env('WHATSAPP_CLOUD_ACCESS_TOKEN'),
            'api_version'     => env('WHATSAPP_CLOUD_API_VERSION', 'v20.0'),
        ],

        'zapi' => [
            'instance_id'  => env('WHATSAPP_ZAPI_INSTANCE_ID'),
            'token'        => env('WHATSAPP_ZAPI_TOKEN'),
            'client_token' => env('WHATSAPP_ZAPI_CLIENT_TOKEN'),
        ],

        'twilio' => [
            'account_sid' => env('WHATSAPP_TWILIO_ACCOUNT_SID'),
            'auth_token'  => env('WHATSAPP_TWILIO_AUTH_TOKEN'),
            'from'        => env('WHATSAPP_TWILIO_FROM'),
        ],

        'gupshup' => [
            'api_key'  => env('WHATSAPP_GUPSHUP_API_KEY'),
            'source'   => env('WHATSAPP_GUPSHUP_SOURCE'),
            'app_name' => env('WHATSAPP_GUPSHUP_APP_NAME'),
        ],

    ],

];

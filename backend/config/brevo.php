<?php

return [

    /*
    |--------------------------------------------------------------------------
    | Brevo API Key
    |--------------------------------------------------------------------------
    |
    | Used for the transactional email API (v3). This is NOT the SMTP password;
    | it's the master API key from https://app.brevo.com/settings/keys/api
    |
    */

    'api_key' => env('BREVO_API_KEY'),

    /*
    |--------------------------------------------------------------------------
    | Default sender
    |--------------------------------------------------------------------------
    */

    'sender_name'  => env('BREVO_SENDER_NAME', env('APP_NAME', 'Ximples')),
    'sender_email' => env('BREVO_SENDER_EMAIL', env('MAIL_FROM_ADDRESS', 'noreply@ximples.com.br')),

    /*
    |--------------------------------------------------------------------------
    | Reply-to (optional)
    |--------------------------------------------------------------------------
    */

    'reply_to_name'  => env('BREVO_REPLY_TO_NAME'),
    'reply_to_email' => env('BREVO_REPLY_TO_EMAIL'),

    /*
    |--------------------------------------------------------------------------
    | Webhook secret — used to verify inbound event callbacks from Brevo.
    | Currently Brevo doesn't sign payloads, so we use a shared token
    | appended to the webhook URL as ?secret=<this value>.
    |--------------------------------------------------------------------------
    */

    'webhook_secret' => env('BREVO_WEBHOOK_SECRET'),

    /*
    |--------------------------------------------------------------------------
    | Token cost per email sent
    |--------------------------------------------------------------------------
    */

    'token_cost_per_email' => (int) env('BREVO_TOKEN_COST', 1),

    /*
    |--------------------------------------------------------------------------
    | Rate limiting — emails per minute per sequence dispatch.
    |--------------------------------------------------------------------------
    */

    'rate_limit_per_minute' => (int) env('BREVO_RATE_LIMIT', 60),

];

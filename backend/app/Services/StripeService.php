<?php

namespace App\Services;

use App\Models\TokenPackage;
use App\Models\User;
use Stripe\Checkout\Session;
use Stripe\Stripe;

class StripeService
{
    public function __construct()
    {
        Stripe::setApiKey(config('services.stripe.secret'));
    }

    public function createCheckoutSession(User $user, TokenPackage $package): Session
    {
        return Session::create([
            'payment_method_types' => ['card'],
            'line_items' => [[
                'price_data' => [
                    'currency' => strtolower($package->currency),
                    'product_data' => [
                        'name' => "Ximples - {$package->name}",
                        'description' => "{$package->tokens} tokens",
                    ],
                    'unit_amount' => (int) ($package->price * 100),
                ],
                'quantity' => 1,
            ]],
            'mode' => 'payment',
            'success_url' => config('app.frontend_url') . '/tokens?payment=success&session_id={CHECKOUT_SESSION_ID}',
            'cancel_url' => config('app.frontend_url') . '/tokens?payment=cancelled',
            'client_reference_id' => $user->id,
            'metadata' => [
                'user_id' => $user->id,
                'tenant_id' => $user->tenant_id,
                'package_id' => $package->id,
                'package_slug' => $package->slug,
                'tokens' => $package->tokens,
            ],
        ]);
    }

    public function handleWebhook(string $payload, string $sigHeader): void
    {
        $webhookSecret = config('services.stripe.webhook_secret');

        if (!$webhookSecret && app()->isProduction()) {
            throw new \RuntimeException('Stripe webhook secret not configured.');
        }

        if ($webhookSecret) {
            $event = \Stripe\Webhook::constructEvent($payload, $sigHeader, $webhookSecret);
        } else {
            $event = \Stripe\Event::constructFrom(json_decode($payload, true));
        }

        if ($event->type === 'checkout.session.completed') {
            $session = $event->data->object;
            $this->fulfillOrder($session);
        }
    }

    private function fulfillOrder($session): void
    {
        $userId = $session->metadata->user_id ?? null;
        $packageId = $session->metadata->package_id ?? null;
        $tokens = (int) ($session->metadata->tokens ?? 0);

        if (!$userId || !$tokens) return;

        $user = User::find($userId);
        if (!$user) {
            \Illuminate\Support\Facades\Log::error('Stripe fulfillOrder: user not found', ['user_id' => $userId]);
            return;
        }

        $package = $packageId ? TokenPackage::find($packageId) : null;

        $tokenService = app(TokenService::class);
        $tokenService->credit(
            $user,
            $tokens,
            'purchase',
            'Compra: ' . ($package ? $package->name : $tokens . ' tokens'),
            $package,
            [
                'stripe_session_id' => $session->id,
                'stripe_payment_intent' => $session->payment_intent,
                'amount_paid' => $session->amount_total / 100,
            ]
        );
    }
}

<?php

namespace App\Http\Controllers\Api\V1;

use App\Http\Controllers\Controller;
use App\Models\TokenPackage;
use App\Services\StripeService;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class PaymentController extends Controller
{
    public function __construct(
        private StripeService $stripeService,
    ) {}

    public function createCheckout(Request $request): JsonResponse
    {
        $request->validate([
            'package_id' => 'required|exists:token_packages,id',
        ]);

        $package = TokenPackage::where('id', $request->package_id)
            ->where('is_active', true)
            ->firstOrFail();

        $session = $this->stripeService->createCheckoutSession($request->user(), $package);

        return response()->json([
            'success' => true,
            'data' => [
                'checkout_url' => $session->url,
                'session_id' => $session->id,
            ],
        ]);
    }

    public function webhook(Request $request): JsonResponse
    {
        $payload = $request->getContent();
        $sigHeader = $request->header('Stripe-Signature', '');

        try {
            $this->stripeService->handleWebhook($payload, $sigHeader);
            return response()->json(['status' => 'ok']);
        } catch (\Exception $e) {
            return response()->json(['error' => $e->getMessage()], 400);
        }
    }
}

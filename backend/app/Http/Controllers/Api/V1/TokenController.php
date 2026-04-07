<?php

namespace App\Http\Controllers\Api\V1;

use App\Http\Controllers\Controller;
use App\Models\TokenPackage;
use App\Models\TokenTransaction;
use App\Services\TokenPricingService;
use App\Services\TokenService;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class TokenController extends Controller
{
    public function __construct(
        private TokenService $tokenService,
        private TokenPricingService $pricingService,
    ) {}

    public function balance(Request $request): JsonResponse
    {
        $balance = $this->tokenService->getBalance($request->user());

        return response()->json([
            'success' => true,
            'data'    => ['balance' => $balance],
        ]);
    }

    public function transactions(Request $request): JsonResponse
    {
        $user = $request->user();

        $transactions = TokenTransaction::where('user_id', $user->id)
            ->orderByDesc('created_at')
            ->paginate(20);

        return response()->json([
            'success' => true,
            'data'    => $transactions,
        ]);
    }

    public function packages(): JsonResponse
    {
        $packages = TokenPackage::where('is_active', true)
            ->orderBy('sort_order')
            ->get();

        return response()->json([
            'success' => true,
            'data'    => $packages,
        ]);
    }

    public function estimate(Request $request): JsonResponse
    {
        $request->validate(['message' => 'required|string|max:5000']);

        $user = $request->user();
        $estimate = $this->pricingService->estimateFromMessage($request->message);
        $balance = $this->tokenService->getBalance($user);

        return response()->json([
            'success' => true,
            'data'    => [
                'intent'               => $estimate['intent'],
                'estimated_token_cost' => $estimate['estimated_token_cost'],
                'actions'              => $estimate['actions'],
                'enough_balance'       => $balance >= $estimate['estimated_token_cost'],
                'current_balance'      => $balance,
            ],
        ]);
    }
}

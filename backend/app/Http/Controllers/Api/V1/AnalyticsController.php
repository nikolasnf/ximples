<?php

namespace App\Http\Controllers\Api\V1;

use App\Http\Controllers\Controller;
use App\Models\Campaign;
use App\Services\AnalyticsService;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Carbon;

class AnalyticsController extends Controller
{
    public function __construct(
        private readonly AnalyticsService $analytics,
    ) {}

    /**
     * GET /api/v1/analytics/overview?from=ISO&to=ISO
     */
    public function overview(Request $request): JsonResponse
    {
        $user = $request->user();

        $from = $request->query('from') ? Carbon::parse($request->query('from')) : null;
        $to = $request->query('to') ? Carbon::parse($request->query('to')) : null;

        return response()->json([
            'success' => true,
            'data'    => $this->analytics->overview($user, $from, $to),
        ]);
    }

    /**
     * GET /api/v1/analytics/campaign/{id}
     */
    public function campaign(Request $request, int $id): JsonResponse
    {
        $user = $request->user();

        $campaign = Campaign::where('id', $id)
            ->where('user_id', $user->id)
            ->first();

        if (!$campaign) {
            return response()->json([
                'success' => false,
                'message' => 'Campanha não encontrada.',
            ], 404);
        }

        return response()->json([
            'success' => true,
            'data'    => $this->analytics->campaign($campaign),
        ]);
    }
}

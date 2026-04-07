<?php

namespace App\Http\Controllers\Api\V1;

use App\Http\Controllers\Controller;
use App\Models\Chat;
use App\Models\Milestone;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class MilestoneController extends Controller
{
    public function index(Request $request, int $chatId): JsonResponse
    {
        $user = auth()->user();

        // Verify chat ownership
        $chat = Chat::where('id', $chatId)
            ->where('user_id', $user->id)
            ->where('tenant_id', $user->tenant_id)
            ->firstOrFail();

        $milestones = Milestone::where('chat_id', $chat->id)
            ->where('tenant_id', $user->tenant_id)
            ->orderByDesc('created_at')
            ->get();

        return response()->json([
            'milestones' => $milestones,
        ]);
    }
}

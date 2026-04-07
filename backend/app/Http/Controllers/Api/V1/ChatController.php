<?php

namespace App\Http\Controllers\Api\V1;

use App\Http\Controllers\Controller;
use App\Http\Requests\SendMessageRequest;
use App\Models\Chat;
use App\Services\ChatExecutionService;
use App\Services\TokenService;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class ChatController extends Controller
{
    public function __construct(
        private ChatExecutionService $executionService,
        private TokenService $tokenService,
    ) {}

    public function send(SendMessageRequest $request): JsonResponse
    {
        $user = auth()->user();

        // Resolve or create chat
        if ($request->chat_id) {
            $chat = Chat::where('id', $request->chat_id)
                ->where('user_id', $user->id)
                ->where('tenant_id', $user->tenant_id)
                ->firstOrFail();
        } else {
            $chat = Chat::create([
                'user_id'   => $user->id,
                'tenant_id' => $user->tenant_id,
                'title'     => str($request->message)->limit(80),
            ]);
        }

        $result = $this->executionService->execute(
            $user,
            $chat,
            $request->message,
            $request->template_id ? (int) $request->template_id : null,
        );

        if (!$result['success']) {
            return response()->json([
                'success'         => false,
                'message'         => $result['message'],
                'required_tokens' => $result['required_tokens'],
                'current_balance' => $result['current_balance'],
                'chat'            => $result['chat'],
            ], 422);
        }

        return response()->json([
            'success' => true,
            'chat'    => $result['chat'],
            'token_cost'      => $result['token_cost'],
            'current_balance' => $result['current_balance'],
        ], 201);
    }

    public function show(Request $request, int $id): JsonResponse
    {
        $user = auth()->user();

        $chat = Chat::where('id', $id)
            ->where('user_id', $user->id)
            ->where('tenant_id', $user->tenant_id)
            ->with(['messages', 'tasks', 'milestones', 'assets'])
            ->firstOrFail();

        return response()->json([
            'chat' => $chat,
        ]);
    }

    public function index(Request $request): JsonResponse
    {
        $user = auth()->user();

        $chats = Chat::where('user_id', $user->id)
            ->where('tenant_id', $user->tenant_id)
            ->orderByDesc('updated_at')
            ->get();

        return response()->json([
            'chats' => $chats,
        ]);
    }

    public function update(Request $request, int $id): JsonResponse
    {
        $user = auth()->user();

        $chat = Chat::where('id', $id)
            ->where('user_id', $user->id)
            ->where('tenant_id', $user->tenant_id)
            ->firstOrFail();

        $request->validate(['title' => 'required|string|max:255']);

        $chat->update(['title' => $request->title]);

        return response()->json([
            'success' => true,
            'chat' => $chat,
        ]);
    }

    public function destroy(Request $request, int $id): JsonResponse
    {
        $user = auth()->user();

        $chat = Chat::where('id', $id)
            ->where('user_id', $user->id)
            ->where('tenant_id', $user->tenant_id)
            ->firstOrFail();

        $chat->delete();

        return response()->json([
            'success' => true,
            'message' => 'Chat excluído com sucesso.',
        ]);
    }
}

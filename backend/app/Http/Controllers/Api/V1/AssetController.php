<?php

namespace App\Http\Controllers\Api\V1;

use App\Http\Controllers\Controller;
use App\Models\Chat;
use App\Models\Asset;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Storage;

class AssetController extends Controller
{
    public function index(Request $request, int $chatId): JsonResponse
    {
        $user = auth()->user();

        // Verify chat ownership
        $chat = Chat::where('id', $chatId)
            ->where('user_id', $user->id)
            ->where('tenant_id', $user->tenant_id)
            ->firstOrFail();

        $assets = Asset::where('chat_id', $chat->id)
            ->where('tenant_id', $user->tenant_id)
            ->with('page:id,asset_id,slug')
            ->orderByDesc('created_at')
            ->get();

        return response()->json([
            'assets' => $assets,
        ]);
    }

    public function show(int $id): JsonResponse
    {
        $user = auth()->user();

        $asset = Asset::where('id', $id)
            ->where('tenant_id', $user->tenant_id)
            ->whereHas('chat', function ($q) use ($user) {
                $q->where('user_id', $user->id);
            })
            ->with('page:id,asset_id,slug')
            ->firstOrFail();

        return response()->json([
            'asset' => $asset,
        ]);
    }

    public function destroy(int $id): JsonResponse
    {
        $user = auth()->user();

        $asset = Asset::where('id', $id)
            ->where('tenant_id', $user->tenant_id)
            ->whereHas('chat', function ($q) use ($user) {
                $q->where('user_id', $user->id);
            })
            ->with('page')
            ->first();

        if (!$asset) {
            return response()->json([
                'success' => false,
                'message' => 'Ativo não encontrado.',
            ], 404);
        }

        // Clean up related page (and its exported file) if present
        if ($asset->page) {
            $page = $asset->page;
            if ($page->exported_html_path && Storage::disk('public')->exists($page->exported_html_path)) {
                Storage::disk('public')->delete($page->exported_html_path);
            }
            $page->delete();
        }

        $asset->delete();

        return response()->json([
            'success' => true,
            'message' => 'Ativo excluído com sucesso.',
        ]);
    }
}

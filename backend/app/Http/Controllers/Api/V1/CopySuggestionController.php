<?php

namespace App\Http\Controllers\Api\V1;

use App\Http\Controllers\Controller;
use App\Models\CopySuggestion;
use App\Services\CopySuggestionService;
use App\Services\TokenService;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class CopySuggestionController extends Controller
{
    public function __construct(
        private readonly CopySuggestionService $suggestions,
        private readonly TokenService $tokens,
    ) {}

    /**
     * POST /api/v1/copy-suggestions/generate
     *
     * Body:
     *   source_type: campaign|page|experiment
     *   source_id: int
     *   suggestion_type: headline|subheadline|cta|message_opening|body|full_message
     *   extras: { product?, audience?, goal?, tone? }  (optional)
     */
    public function generate(Request $request): JsonResponse
    {
        $user = $request->user();

        $data = $request->validate([
            'source_type'     => 'required|in:campaign,page,experiment',
            'source_id'       => 'required|integer',
            'suggestion_type' => 'required|in:headline,subheadline,cta,message_opening,body,full_message',
            'extras'          => 'nullable|array',
            'extras.product'  => 'nullable|string|max:255',
            'extras.audience' => 'nullable|string|max:255',
            'extras.goal'     => 'nullable|string|max:255',
            'extras.tone'     => 'nullable|string|max:100',
        ]);

        // Token cost check (configurable; default 3 tokens per generation).
        $cost = (int) config('copy_suggestions.token_cost', 3);
        if ($cost > 0 && !$this->tokens->hasEnoughBalance($user, $cost)) {
            return response()->json([
                'success' => false,
                'message' => "Saldo insuficiente: geração de copy requer {$cost} tokens.",
            ], 402);
        }

        try {
            $suggestion = $this->suggestions->generate(
                user: $user,
                sourceType: $data['source_type'],
                sourceId: (int) $data['source_id'],
                suggestionType: $data['suggestion_type'],
                extras: $data['extras'] ?? [],
            );
        } catch (\Throwable $e) {
            return response()->json([
                'success' => false,
                'message' => $e->getMessage(),
            ], 422);
        }

        // Debit only after successful generation so failures don't charge the user.
        if ($cost > 0) {
            try {
                $this->tokens->debit(
                    $user,
                    $cost,
                    'copy_suggestion',
                    "Geração de copy (#{$suggestion->id})",
                    $suggestion,
                );
            } catch (\Throwable) {
                // Best-effort; suggestion is already saved.
            }
        }

        return response()->json([
            'success' => true,
            'message' => 'Sugestão de copy gerada com sucesso.',
            'data'    => $this->format($suggestion),
        ], 201);
    }

    /**
     * GET /api/v1/copy-suggestions?source_type=&source_id=&status=
     */
    public function index(Request $request): JsonResponse
    {
        $user = $request->user();

        $query = CopySuggestion::where('user_id', $user->id)
            ->where('tenant_id', $user->tenant_id)
            ->orderByDesc('created_at');

        if ($st = $request->query('source_type')) {
            $query->where('source_type', $st);
        }
        if ($sid = $request->query('source_id')) {
            $query->where('source_id', (int) $sid);
        }
        if ($status = $request->query('status')) {
            $query->where('status', $status);
        }

        $items = $query->limit((int) $request->query('limit', 50))->get();

        return response()->json([
            'success' => true,
            'data'    => $items->map(fn (CopySuggestion $s) => $this->format($s))->all(),
        ]);
    }

    public function show(Request $request, int $id): JsonResponse
    {
        $user = $request->user();

        $suggestion = CopySuggestion::where('id', $id)
            ->where('user_id', $user->id)
            ->first();

        if (!$suggestion) {
            return response()->json(['success' => false, 'message' => 'Sugestão não encontrada.'], 404);
        }

        return response()->json(['success' => true, 'data' => $this->format($suggestion)]);
    }

    public function apply(Request $request, int $id): JsonResponse
    {
        $user = $request->user();

        $suggestion = CopySuggestion::where('id', $id)
            ->where('user_id', $user->id)
            ->first();

        if (!$suggestion) {
            return response()->json(['success' => false, 'message' => 'Sugestão não encontrada.'], 404);
        }

        try {
            $suggestion = $this->suggestions->apply($suggestion);
        } catch (\Throwable $e) {
            return response()->json(['success' => false, 'message' => $e->getMessage()], 422);
        }

        return response()->json([
            'success' => true,
            'data'    => $this->format($suggestion),
            'message' => 'Sugestão aplicada à fonte original.',
        ]);
    }

    public function dismiss(Request $request, int $id): JsonResponse
    {
        $user = $request->user();

        $suggestion = CopySuggestion::where('id', $id)
            ->where('user_id', $user->id)
            ->first();

        if (!$suggestion) {
            return response()->json(['success' => false, 'message' => 'Sugestão não encontrada.'], 404);
        }

        try {
            $suggestion = $this->suggestions->dismiss($suggestion);
        } catch (\Throwable $e) {
            return response()->json(['success' => false, 'message' => $e->getMessage()], 422);
        }

        return response()->json(['success' => true, 'data' => $this->format($suggestion)]);
    }

    private function format(CopySuggestion $s): array
    {
        return [
            'id'              => $s->id,
            'source_type'     => $s->source_type,
            'source_id'       => $s->source_id,
            'suggestion_type' => $s->suggestion_type,
            'original_copy'   => $s->original_copy,
            'suggested_copy'  => $s->suggested_copy,
            'summary'         => $s->summary,
            'reasoning'       => $s->reasoning ?? [],
            'performance'     => $s->performance_json,
            'context'         => $s->context_json,
            'status'          => $s->status,
            'applied_at'      => $s->applied_at,
            'applied_field'   => $s->applied_field,
            'dismissed_at'    => $s->dismissed_at,
            'created_at'      => $s->created_at,
        ];
    }
}

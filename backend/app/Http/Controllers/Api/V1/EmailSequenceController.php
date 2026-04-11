<?php

namespace App\Http\Controllers\Api\V1;

use App\Http\Controllers\Controller;
use App\Jobs\DispatchEmailSequenceJob;
use App\Models\Asset;
use App\Models\ContactList;
use App\Models\EmailSequenceSend;
use App\Services\TokenService;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Str;

class EmailSequenceController extends Controller
{
    public function __construct(
        private readonly TokenService $tokens,
    ) {}

    /**
     * POST /api/v1/email-sequences/{assetId}/dispatch
     *
     * Dispatch an email sequence to a contact list.
     */
    public function dispatch(Request $request, int $assetId): JsonResponse
    {
        $user = auth()->user();

        $request->validate([
            'list_id' => 'required|integer',
        ]);

        // Verify asset ownership and type
        $asset = Asset::where('id', $assetId)
            ->where('tenant_id', $user->tenant_id)
            ->whereHas('chat', fn ($q) => $q->where('user_id', $user->id))
            ->firstOrFail();

        if ($asset->type !== 'email') {
            return response()->json([
                'message' => 'Este ativo não é uma sequência de email.',
            ], 422);
        }

        $emails = $asset->content['emails'] ?? [];
        if (empty($emails)) {
            return response()->json([
                'message' => 'A sequência não possui emails configurados.',
            ], 422);
        }

        // Verify list ownership
        $list = ContactList::where('id', $request->list_id)
            ->where('user_id', $user->id)
            ->withCount('contacts')
            ->firstOrFail();

        if ($list->contacts_count === 0) {
            return response()->json([
                'message' => 'A lista de contatos está vazia.',
            ], 422);
        }

        // Count contacts with email
        $emailCount = $list->contacts()->whereNotNull('email')->where('email', '!=', '')->count();
        if ($emailCount === 0) {
            return response()->json([
                'message' => 'Nenhum contato da lista possui email cadastrado.',
            ], 422);
        }

        // Token balance check
        $costPerEmail = (int) config('brevo.token_cost_per_email', 1);
        $totalEmails  = $emailCount * count($emails);
        $totalCost    = $costPerEmail * $totalEmails;

        if ($totalCost > 0 && !$this->tokens->hasEnoughBalance($user, $totalCost)) {
            return response()->json([
                'message' => "Saldo insuficiente. Necessário: {$totalCost} tokens ({$totalEmails} emails).",
            ], 422);
        }

        $dispatchId = Str::uuid()->toString();

        DispatchEmailSequenceJob::dispatch(
            $asset->id,
            $user->id,
            $list->id,
            $dispatchId,
        );

        return response()->json([
            'message'      => 'Sequência de emails agendada com sucesso.',
            'dispatch_id'  => $dispatchId,
            'total_emails' => $totalEmails,
            'contacts'     => $emailCount,
            'steps'        => count($emails),
            'token_cost'   => $totalCost,
        ]);
    }

    /**
     * GET /api/v1/email-sequences/{assetId}/sends
     *
     * List sends for an asset, optionally filtered by dispatch_id and status.
     */
    public function sends(Request $request, int $assetId): JsonResponse
    {
        $user = auth()->user();

        // Verify asset ownership
        Asset::where('id', $assetId)
            ->where('tenant_id', $user->tenant_id)
            ->whereHas('chat', fn ($q) => $q->where('user_id', $user->id))
            ->firstOrFail();

        $query = EmailSequenceSend::where('asset_id', $assetId)
            ->where('tenant_id', $user->tenant_id);

        if ($request->filled('dispatch_id')) {
            $query->where('dispatch_id', $request->dispatch_id);
        }

        if ($request->filled('status')) {
            $query->where('status', $request->status);
        }

        if ($request->filled('step')) {
            $query->where('step_sequence', $request->step);
        }

        $sends = $query->orderByDesc('created_at')
            ->paginate($request->integer('per_page', 20));

        return response()->json($sends);
    }

    /**
     * GET /api/v1/email-sequences/{assetId}/stats
     *
     * Aggregate stats for an asset's email sends.
     */
    public function stats(int $assetId): JsonResponse
    {
        $user = auth()->user();

        Asset::where('id', $assetId)
            ->where('tenant_id', $user->tenant_id)
            ->whereHas('chat', fn ($q) => $q->where('user_id', $user->id))
            ->firstOrFail();

        $stats = EmailSequenceSend::where('asset_id', $assetId)
            ->where('tenant_id', $user->tenant_id)
            ->selectRaw("
                COUNT(*) as total,
                SUM(CASE WHEN status = 'pending' THEN 1 ELSE 0 END) as pending,
                SUM(CASE WHEN status = 'processing' THEN 1 ELSE 0 END) as processing,
                SUM(CASE WHEN status = 'sent' THEN 1 ELSE 0 END) as sent,
                SUM(CASE WHEN status = 'delivered' THEN 1 ELSE 0 END) as delivered,
                SUM(CASE WHEN status = 'failed' THEN 1 ELSE 0 END) as failed,
                SUM(CASE WHEN status = 'bounced' THEN 1 ELSE 0 END) as bounced,
                SUM(CASE WHEN status = 'skipped' THEN 1 ELSE 0 END) as skipped,
                SUM(CASE WHEN opened_at IS NOT NULL THEN 1 ELSE 0 END) as opened,
                SUM(CASE WHEN clicked_at IS NOT NULL THEN 1 ELSE 0 END) as clicked,
                MAX(sent_at) as last_sent_at
            ")
            ->first();

        // Per-step breakdown
        $steps = EmailSequenceSend::where('asset_id', $assetId)
            ->where('tenant_id', $user->tenant_id)
            ->selectRaw("
                step_sequence,
                COUNT(*) as total,
                SUM(CASE WHEN status = 'sent' OR status = 'delivered' THEN 1 ELSE 0 END) as sent,
                SUM(CASE WHEN status = 'failed' OR status = 'bounced' THEN 1 ELSE 0 END) as failed,
                SUM(CASE WHEN status = 'pending' OR status = 'processing' THEN 1 ELSE 0 END) as pending,
                SUM(CASE WHEN opened_at IS NOT NULL THEN 1 ELSE 0 END) as opened,
                SUM(CASE WHEN clicked_at IS NOT NULL THEN 1 ELSE 0 END) as clicked
            ")
            ->groupBy('step_sequence')
            ->orderBy('step_sequence')
            ->get();

        // Dispatch history
        $dispatches = EmailSequenceSend::where('asset_id', $assetId)
            ->where('tenant_id', $user->tenant_id)
            ->selectRaw("
                dispatch_id,
                list_id,
                COUNT(*) as total,
                SUM(CASE WHEN status IN ('sent','delivered') THEN 1 ELSE 0 END) as sent,
                SUM(CASE WHEN status IN ('failed','bounced') THEN 1 ELSE 0 END) as failed,
                MIN(created_at) as dispatched_at,
                MAX(sent_at) as last_sent_at
            ")
            ->groupBy('dispatch_id', 'list_id')
            ->orderByDesc('dispatched_at')
            ->limit(10)
            ->get();

        return response()->json([
            'stats'      => $stats,
            'steps'      => $steps,
            'dispatches' => $dispatches,
        ]);
    }
}

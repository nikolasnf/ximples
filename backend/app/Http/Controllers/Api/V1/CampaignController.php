<?php

namespace App\Http\Controllers\Api\V1;

use App\Http\Controllers\Controller;
use App\Models\Campaign;
use App\Models\CampaignContact;
use App\Services\CampaignService;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class CampaignController extends Controller
{
    public function __construct(
        private readonly CampaignService $campaignService,
    ) {}

    public function index(Request $request): JsonResponse
    {
        $user = $request->user();

        $campaigns = Campaign::where('user_id', $user->id)
            ->where('tenant_id', $user->tenant_id)
            ->with(['list:id,name', 'landingPage:id,title,slug'])
            ->orderByDesc('created_at')
            ->get();

        return response()->json(['success' => true, 'data' => $campaigns]);
    }

    public function store(Request $request): JsonResponse
    {
        $user = $request->user();

        $data = $request->validate([
            'name'             => 'required|string|max:255',
            'list_id'          => 'required|integer|exists:contact_lists,id',
            'message_template' => 'required|string|max:4000',
            'landing_page_id'  => 'nullable|integer|exists:pages,id',
            'type'             => 'nullable|string|in:whatsapp',
            'scheduled_at'     => 'nullable|date',
        ]);

        $campaign = $this->campaignService->create($user, $data);

        return response()->json([
            'success' => true,
            'message' => 'Campanha criada com sucesso.',
            'data'    => $campaign,
        ], 201);
    }

    public function show(Request $request, int $id): JsonResponse
    {
        $user = $request->user();

        $campaign = Campaign::where('id', $id)
            ->where('user_id', $user->id)
            ->with(['list:id,name', 'landingPage:id,title,slug'])
            ->first();

        if (!$campaign) {
            return response()->json(['success' => false, 'message' => 'Campanha não encontrada.'], 404);
        }

        return response()->json(['success' => true, 'data' => $campaign]);
    }

    public function update(Request $request, int $id): JsonResponse
    {
        $user = $request->user();
        $campaign = Campaign::where('id', $id)->where('user_id', $user->id)->first();

        if (!$campaign) {
            return response()->json(['success' => false, 'message' => 'Campanha não encontrada.'], 404);
        }

        if (!in_array($campaign->status, [Campaign::STATUS_DRAFT, Campaign::STATUS_SCHEDULED], true)) {
            return response()->json([
                'success' => false,
                'message' => 'Campanha não pode ser editada neste status.',
            ], 422);
        }

        $data = $request->validate([
            'name'             => 'sometimes|required|string|max:255',
            'list_id'          => 'sometimes|required|integer|exists:contact_lists,id',
            'message_template' => 'sometimes|required|string|max:4000',
            'landing_page_id'  => 'nullable|integer|exists:pages,id',
            'scheduled_at'     => 'nullable|date',
        ]);

        $campaign->update($data);

        return response()->json(['success' => true, 'data' => $campaign->fresh()]);
    }

    public function destroy(Request $request, int $id): JsonResponse
    {
        $user = $request->user();
        $campaign = Campaign::where('id', $id)->where('user_id', $user->id)->first();

        if (!$campaign) {
            return response()->json(['success' => false, 'message' => 'Campanha não encontrada.'], 404);
        }

        if ($campaign->status === Campaign::STATUS_SENDING) {
            return response()->json([
                'success' => false,
                'message' => 'Não é possível excluir uma campanha em envio.',
            ], 422);
        }

        $campaign->delete();

        return response()->json(['success' => true]);
    }

    /**
     * POST /api/v1/campaigns/{id}/send
     */
    public function send(Request $request, int $id): JsonResponse
    {
        $user = $request->user();
        $campaign = Campaign::where('id', $id)->where('user_id', $user->id)->first();

        if (!$campaign) {
            return response()->json(['success' => false, 'message' => 'Campanha não encontrada.'], 404);
        }

        try {
            $campaign = $this->campaignService->dispatchCampaign($campaign);
        } catch (\Throwable $e) {
            return response()->json([
                'success' => false,
                'message' => $e->getMessage(),
            ], 422);
        }

        return response()->json([
            'success' => true,
            'data'    => $campaign,
            'message' => 'Campanha enfileirada para envio.',
        ]);
    }

    /**
     * GET /api/v1/campaigns/{id}/logs
     */
    public function logs(Request $request, int $id): JsonResponse
    {
        $user = $request->user();
        $campaign = Campaign::where('id', $id)->where('user_id', $user->id)->first();

        if (!$campaign) {
            return response()->json(['success' => false, 'message' => 'Campanha não encontrada.'], 404);
        }

        $query = CampaignContact::where('campaign_id', $campaign->id)
            ->with('contact:id,name,phone,email')
            ->orderByDesc('id');

        if ($status = $request->query('status')) {
            $query->where('status', $status);
        }

        $logs = $query->paginate((int) $request->query('per_page', 100));

        return response()->json([
            'success' => true,
            'data'    => $logs->items(),
            'meta'    => [
                'total'        => $logs->total(),
                'current_page' => $logs->currentPage(),
                'last_page'    => $logs->lastPage(),
                'campaign'     => [
                    'id'             => $campaign->id,
                    'status'         => $campaign->status,
                    'total_contacts' => $campaign->total_contacts,
                    'sent_count'     => $campaign->sent_count,
                    'failed_count'   => $campaign->failed_count,
                ],
            ],
        ]);
    }
}

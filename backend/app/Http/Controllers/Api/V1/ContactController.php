<?php

namespace App\Http\Controllers\Api\V1;

use App\Http\Controllers\Controller;
use App\Models\Contact;
use App\Models\ImportMappingTemplate;
use App\Services\ContactImportService;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class ContactController extends Controller
{
    public function __construct(
        private readonly ContactImportService $importService,
    ) {}

    /**
     * List the authenticated user's contacts (paginated).
     */
    public function index(Request $request): JsonResponse
    {
        $user = $request->user();

        $query = Contact::where('user_id', $user->id)
            ->where('tenant_id', $user->tenant_id)
            ->orderByDesc('created_at');

        if ($search = $request->query('search')) {
            $query->where(function ($q) use ($search) {
                $q->where('name', 'like', "%{$search}%")
                    ->orWhere('phone', 'like', "%{$search}%")
                    ->orWhere('email', 'like', "%{$search}%");
            });
        }

        if ($listId = $request->query('list_id')) {
            $query->whereHas('lists', fn ($q) => $q->where('contact_lists.id', $listId));
        }

        $contacts = $query->paginate((int) $request->query('per_page', 50));

        return response()->json([
            'success' => true,
            'data'    => $contacts->items(),
            'meta'    => [
                'total'        => $contacts->total(),
                'current_page' => $contacts->currentPage(),
                'last_page'    => $contacts->lastPage(),
                'per_page'     => $contacts->perPage(),
            ],
        ]);
    }

    public function store(Request $request): JsonResponse
    {
        $user = $request->user();
        $data = $request->validate([
            'name'  => 'nullable|string|max:255',
            'phone' => 'required|string|max:32',
            'email' => 'nullable|email|max:255',
            'tags'  => 'nullable|array',
        ]);

        $phone = $this->importService->normalizePhone($data['phone']);
        if (!$phone) {
            return response()->json([
                'success' => false,
                'message' => 'Telefone inválido.',
            ], 422);
        }

        $contact = Contact::updateOrCreate(
            ['user_id' => $user->id, 'phone' => $phone],
            [
                'tenant_id' => $user->tenant_id,
                'name'      => $data['name'] ?? null,
                'email'     => $data['email'] ?? null,
                'tags'      => $data['tags'] ?? null,
            ]
        );

        return response()->json([
            'success' => true,
            'message' => 'Contato salvo com sucesso.',
            'data'    => $contact,
        ], 201);
    }

    public function destroy(Request $request, int $id): JsonResponse
    {
        $user = $request->user();

        $contact = Contact::where('id', $id)
            ->where('user_id', $user->id)
            ->first();

        if (!$contact) {
            return response()->json(['success' => false, 'message' => 'Contato não encontrado.'], 404);
        }

        $contact->delete();

        return response()->json(['success' => true]);
    }

    /**
     * POST /api/v1/contacts/import/preview
     *
     * Parse CSV and return detected mappings + first 10 rows (no DB writes).
     */
    public function importPreview(Request $request): JsonResponse
    {
        $request->validate([
            'file'     => 'required|file|max:10240|mimes:csv,txt,xlsx',
            'mappings' => 'nullable|json',
        ]);

        $manualMappings = $request->input('mappings')
            ? json_decode($request->input('mappings'), true)
            : null;

        try {
            $preview = $this->importService->preview(
                file: $request->file('file'),
                manualMappings: $manualMappings,
            );
        } catch (\Throwable $e) {
            return response()->json([
                'success' => false,
                'message' => $e->getMessage(),
            ], 422);
        }

        return response()->json([
            'success' => true,
            'data'    => $preview,
        ]);
    }

    /**
     * POST /api/v1/contacts/import
     *
     * Full import with optional manual mappings and duplicate strategy.
     */
    public function import(Request $request): JsonResponse
    {
        $user = $request->user();

        $request->validate([
            'file'               => 'required|file|max:10240|mimes:csv,txt,xlsx',
            'list_id'            => 'nullable|integer|exists:contact_lists,id',
            'list_name'          => 'nullable|string|max:255',
            'mappings'           => 'nullable|json',
            'duplicate_strategy' => 'nullable|string|in:update,skip',
            'template_id'        => 'nullable|integer|exists:import_mapping_templates,id',
        ]);

        // Resolve mappings: manual > template > auto-detect
        $manualMappings = null;
        if ($request->input('mappings')) {
            $manualMappings = json_decode($request->input('mappings'), true);
        } elseif ($request->input('template_id')) {
            $template = ImportMappingTemplate::where('id', $request->input('template_id'))
                ->where('user_id', $user->id)
                ->first();
            if ($template) {
                $manualMappings = $template->mappings;
            }
        }

        try {
            $result = $this->importService->importFromUpload(
                user: $user,
                file: $request->file('file'),
                listId: $request->input('list_id') ? (int) $request->input('list_id') : null,
                newListName: $request->input('list_name'),
                manualMappings: $manualMappings,
                duplicateStrategy: $request->input('duplicate_strategy', 'update'),
            );
        } catch (\Throwable $e) {
            return response()->json([
                'success' => false,
                'message' => $e->getMessage(),
            ], 422);
        }

        return response()->json([
            'success' => true,
            'message' => sprintf(
                '%d contatos importados, %d atualizados.',
                $result['imported'] ?? 0,
                $result['updated'] ?? 0,
            ),
            'data' => $result,
        ]);
    }

    // ─── Mapping Templates ────────────────────────────────────────────

    public function listMappingTemplates(Request $request): JsonResponse
    {
        $user = $request->user();
        $templates = ImportMappingTemplate::where('user_id', $user->id)
            ->orderBy('name')
            ->get();

        return response()->json(['success' => true, 'data' => $templates]);
    }

    public function storeMappingTemplate(Request $request): JsonResponse
    {
        $user = $request->user();
        $data = $request->validate([
            'name'     => 'required|string|max:255',
            'mappings' => 'required|array',
        ]);

        $template = ImportMappingTemplate::updateOrCreate(
            ['user_id' => $user->id, 'name' => $data['name']],
            [
                'tenant_id' => $user->tenant_id,
                'mappings'  => $data['mappings'],
            ]
        );

        return response()->json([
            'success' => true,
            'data'    => $template,
        ], 201);
    }

    public function destroyMappingTemplate(Request $request, int $id): JsonResponse
    {
        $user = $request->user();
        $template = ImportMappingTemplate::where('id', $id)
            ->where('user_id', $user->id)
            ->first();

        if (!$template) {
            return response()->json(['success' => false, 'message' => 'Template não encontrado.'], 404);
        }

        $template->delete();
        return response()->json(['success' => true]);
    }
}

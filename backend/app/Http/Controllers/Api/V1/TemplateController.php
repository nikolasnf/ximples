<?php

namespace App\Http\Controllers\Api\V1;

use App\Http\Controllers\Controller;
use App\Services\TemplateService;
use Illuminate\Database\Eloquent\ModelNotFoundException;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

/**
 * Public, read-only access to the curated landing page template catalog.
 *
 * Templates are global (no tenancy) so unauthenticated users — including
 * marketing pages and search engines — can browse them. Rate limited at
 * the route level to stay polite with the DB.
 */
class TemplateController extends Controller
{
    public function __construct(
        private TemplateService $templateService,
    ) {}

    /**
     * GET /api/v1/templates?category=vendas
     */
    public function index(Request $request): JsonResponse
    {
        $category = $request->query('category');
        $templates = $this->templateService->list(is_string($category) && $category !== '' ? $category : null);

        return response()->json([
            'success' => true,
            'data' => $templates->map(fn ($t) => $this->formatTemplate($t))->values(),
        ]);
    }

    /**
     * GET /api/v1/templates/{idOrSlug}
     */
    public function show(string $idOrSlug): JsonResponse
    {
        try {
            $template = $this->templateService->resolve($idOrSlug);
        } catch (ModelNotFoundException) {
            return response()->json([
                'success' => false,
                'message' => 'Template não encontrado.',
            ], 404);
        }

        return response()->json([
            'success' => true,
            'data' => $this->formatTemplate($template),
        ]);
    }

    private function formatTemplate($template): array
    {
        return [
            'id' => $template->id,
            'name' => $template->name,
            'slug' => $template->slug,
            'description' => $template->description,
            'category' => $template->category,
            'preview_image' => $template->preview_image,
            'structure_json' => $template->structure_json,
            'is_active' => $template->is_active,
            'sort_order' => $template->sort_order,
            'created_at' => $template->created_at,
        ];
    }
}

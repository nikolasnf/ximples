<?php

namespace App\Http\Controllers\Api\V1;

use App\Http\Controllers\Controller;
use App\Http\Requests\StorePageRequest;
use App\Http\Requests\UpdatePageRequest;
use App\Models\Page;
use App\Services\PageBuilderService;
use App\Services\PageExportService;
use App\Services\TemplateService;
use Illuminate\Database\Eloquent\ModelNotFoundException;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Storage;
use Illuminate\Support\Str;

class PageController extends Controller
{
    public function __construct(
        private PageExportService $exportService,
        private TemplateService $templateService,
        private PageBuilderService $pageBuilderService,
    ) {}

    /**
     * List user's pages.
     */
    public function index(Request $request): JsonResponse
    {
        $user = auth()->user();

        $query = Page::where('user_id', $user->id)
            ->where('tenant_id', $user->tenant_id)
            ->orderByDesc('created_at');

        if ($request->has('status')) {
            $query->where('status', $request->input('status'));
        }

        if ($request->has('type')) {
            $query->where('type', $request->input('type'));
        }

        $pages = $query->get()->map(fn (Page $page) => [
            'id' => $page->id,
            'title' => $page->title,
            'slug' => $page->slug,
            'type' => $page->type,
            'status' => $page->status,
            'meta_title' => $page->meta_title,
            'meta_description' => $page->meta_description,
            'preview_image' => $page->preview_image,
            'exported_html_path' => $page->exported_html_path,
            'public_url' => $page->getPublicUrl(),
            'preview_url' => $page->getPreviewUrl(),
            'created_at' => $page->created_at,
            'updated_at' => $page->updated_at,
        ]);

        return response()->json([
            'success' => true,
            'data' => $pages,
        ]);
    }

    /**
     * Create a new page.
     */
    public function store(StorePageRequest $request): JsonResponse
    {
        $user = auth()->user();
        $data = $request->validated();

        if (empty($data['slug'])) {
            $data['slug'] = $this->generateUniqueSlug($data['title']);
        }

        $page = Page::create([
            'user_id' => $user->id,
            'tenant_id' => $user->tenant_id,
            'title' => $data['title'],
            'slug' => $data['slug'],
            'type' => $data['type'] ?? 'landing',
            'status' => $data['status'] ?? 'draft',
            'meta_title' => $data['meta_title'] ?? $data['title'],
            'meta_description' => $data['meta_description'] ?? null,
            'theme_json' => $data['theme_json'] ?? null,
            'content_json' => $data['content_json'] ?? null,
        ]);

        return response()->json([
            'success' => true,
            'message' => 'Página criada com sucesso.',
            'data' => $this->formatPage($page),
        ], 201);
    }

    /**
     * Get a specific page.
     */
    public function show(int $id): JsonResponse
    {
        $user = auth()->user();

        $page = Page::where('id', $id)
            ->where('user_id', $user->id)
            ->where('tenant_id', $user->tenant_id)
            ->first();

        if (!$page) {
            return response()->json([
                'success' => false,
                'message' => 'Página não encontrada.',
            ], 404);
        }

        return response()->json([
            'success' => true,
            'data' => $this->formatPage($page),
        ]);
    }

    /**
     * Update a page.
     */
    public function update(UpdatePageRequest $request, int $id): JsonResponse
    {
        $user = auth()->user();

        $page = Page::where('id', $id)
            ->where('user_id', $user->id)
            ->where('tenant_id', $user->tenant_id)
            ->first();

        if (!$page) {
            return response()->json([
                'success' => false,
                'message' => 'Página não encontrada.',
            ], 404);
        }

        $page->update($request->validated());

        return response()->json([
            'success' => true,
            'data' => $this->formatPage($page->fresh()),
        ]);
    }

    /**
     * Delete a page.
     */
    public function destroy(int $id): JsonResponse
    {
        $user = auth()->user();

        $page = Page::where('id', $id)
            ->where('user_id', $user->id)
            ->where('tenant_id', $user->tenant_id)
            ->first();

        if (!$page) {
            return response()->json([
                'success' => false,
                'message' => 'Página não encontrada.',
            ], 404);
        }

        // Clean up exported file if exists
        if ($page->exported_html_path && Storage::disk('public')->exists($page->exported_html_path)) {
            Storage::disk('public')->delete($page->exported_html_path);
        }

        $page->delete();

        return response()->json([
            'success' => true,
            'message' => 'Página excluída com sucesso.',
        ]);
    }

    /**
     * Publish a page.
     */
    public function publish(int $id): JsonResponse
    {
        $user = auth()->user();

        $page = Page::where('id', $id)
            ->where('user_id', $user->id)
            ->where('tenant_id', $user->tenant_id)
            ->first();

        if (!$page) {
            return response()->json([
                'success' => false,
                'message' => 'Página não encontrada.',
            ], 404);
        }

        $page->update(['status' => 'published']);

        return response()->json([
            'success' => true,
            'data' => $this->formatPage($page->fresh()),
            'message' => 'Página publicada com sucesso.',
        ]);
    }

    /**
     * Export page as static HTML.
     */
    public function export(int $id): JsonResponse
    {
        $user = auth()->user();

        $page = Page::where('id', $id)
            ->where('user_id', $user->id)
            ->where('tenant_id', $user->tenant_id)
            ->first();

        if (!$page) {
            return response()->json([
                'success' => false,
                'message' => 'Página não encontrada.',
            ], 404);
        }

        try {
            $filename = $this->exportService->export($page);
        } catch (\Throwable $e) {
            \Log::error('Page export failed', [
                'page_id' => $page->id,
                'error' => $e->getMessage(),
            ]);
            return response()->json([
                'success' => false,
                'message' => 'Falha ao exportar HTML. Tente novamente.',
            ], 500);
        }

        // Primary public URL via /storage symlink; fallback via controlled route.
        $publicUrl = Storage::disk('public')->url($filename);
        $fallbackUrl = url('/exports/pages/' . basename($filename));

        return response()->json([
            'success' => true,
            'data' => [
                'exported_html_path' => $filename,
                'download_url' => $publicUrl,
                'fallback_url' => $fallbackUrl,
            ],
            'message' => 'HTML exportado com sucesso.',
        ]);
    }

    /**
     * Public fallback: serve an exported HTML file through Laravel.
     * Used when the /storage static route is unavailable.
     */
    public function serveExport(string $filename): \Symfony\Component\HttpFoundation\Response
    {
        // Reject path traversal and enforce allowed extensions (.zip primary, .html legacy).
        if ($filename !== basename($filename)) {
            abort(404);
        }
        $lower = strtolower($filename);
        $isZip = str_ends_with($lower, '.zip');
        $isHtml = str_ends_with($lower, '.html');
        if (!$isZip && !$isHtml) {
            abort(404);
        }

        $relative = 'exports/pages/' . $filename;
        $disk = Storage::disk('public');

        if (!$disk->exists($relative)) {
            abort(404);
        }

        $headers = $isZip
            ? [
                'Content-Type' => 'application/zip',
                'Content-Disposition' => 'attachment; filename="' . $filename . '"',
                'X-Content-Type-Options' => 'nosniff',
                'Cache-Control' => 'public, max-age=300',
            ]
            : [
                'Content-Type' => 'text/html; charset=UTF-8',
                'X-Content-Type-Options' => 'nosniff',
                'Cache-Control' => 'public, max-age=300',
            ];

        return response($disk->get($relative), 200, $headers);
    }

    /**
     * Download exported HTML file.
     */
    public function download(int $id): JsonResponse|\Symfony\Component\HttpFoundation\StreamedResponse
    {
        $user = auth()->user();

        $page = Page::where('id', $id)
            ->where('user_id', $user->id)
            ->where('tenant_id', $user->tenant_id)
            ->first();

        if (!$page || !$page->exported_html_path) {
            return response()->json([
                'success' => false,
                'message' => 'Arquivo de exportação não encontrado.',
            ], 404);
        }

        if (!Storage::disk('public')->exists($page->exported_html_path)) {
            return response()->json([
                'success' => false,
                'message' => 'Arquivo de exportação não encontrado no storage.',
            ], 404);
        }

        $storedPath = $page->exported_html_path;
        $isZip = str_ends_with(strtolower($storedPath), '.zip');
        $downloadName = $page->slug . ($isZip ? '.zip' : '.html');
        $contentType = $isZip ? 'application/zip' : 'text/html';

        return Storage::disk('public')->download(
            $storedPath,
            $downloadName,
            ['Content-Type' => $contentType]
        );
    }

    /**
     * Public: get published page by slug.
     */
    public function showPublic(string $slug): JsonResponse
    {
        $page = Page::where('slug', $slug)
            ->where('status', 'published')
            ->first();

        if (!$page) {
            return response()->json([
                'success' => false,
                'message' => 'Página não encontrada.',
            ], 404);
        }

        return response()->json([
            'success' => true,
            'data' => [
                'id' => $page->id,
                'title' => $page->title,
                'slug' => $page->slug,
                'type' => $page->type,
                'meta_title' => $page->meta_title ?? $page->title,
                'meta_description' => $page->meta_description ?? '',
                'theme' => $page->theme_json,
                'content' => $page->content_json,
                'tracking_pixel' => app(\App\Services\TrackingService::class)->renderPixelScript($page->id),
                'created_at' => $page->created_at,
            ],
        ]);
    }

    private function formatPage(Page $page): array
    {
        return [
            'id' => $page->id,
            'title' => $page->title,
            'slug' => $page->slug,
            'type' => $page->type,
            'status' => $page->status,
            'meta_title' => $page->meta_title,
            'meta_description' => $page->meta_description,
            'theme_json' => $page->theme_json,
            'content_json' => $page->content_json,
            'exported_html_path' => $page->exported_html_path,
            'preview_image' => $page->preview_image,
            'template_id' => $page->template_id,
            'public_url' => $page->getPublicUrl(),
            'preview_url' => $page->getPreviewUrl(),
            'created_at' => $page->created_at,
            'updated_at' => $page->updated_at,
        ];
    }

    /**
     * Render a template (optionally with overrides) to a PageDocument + HTML
     * without persisting anything. Powers the /templates gallery detail preview
     * and the "preview before saving" panel in the builder UI.
     *
     * POST /api/v1/pages/preview
     * Body: { template_id: int, overrides?: { sections?, theme?, meta_title?, meta_description?, title? } }
     */
    public function preview(Request $request): JsonResponse
    {
        $validated = $request->validate([
            'template_id' => 'required|integer|exists:page_templates,id',
            'overrides' => 'nullable|array',
            'overrides.sections' => 'nullable|array',
            'overrides.theme' => 'nullable|array',
            'overrides.title' => 'nullable|string|max:255',
            'overrides.meta_title' => 'nullable|string|max:255',
            'overrides.meta_description' => 'nullable|string|max:500',
        ]);

        try {
            $template = $this->templateService->find((int) $validated['template_id']);
        } catch (ModelNotFoundException) {
            return response()->json([
                'success' => false,
                'message' => 'Template não encontrado.',
            ], 404);
        }

        $overrides = $validated['overrides'] ?? [];
        $transientPage = $this->pageBuilderService->buildTransientPage($template, $overrides);
        $html = $this->exportService->render($transientPage);

        return response()->json([
            'success' => true,
            'data' => [
                'html' => $html,
                'document' => $transientPage->content_json,
                'theme' => $transientPage->theme_json,
                'template' => [
                    'id' => $template->id,
                    'name' => $template->name,
                    'slug' => $template->slug,
                ],
            ],
        ]);
    }

    /**
     * Create a real Page from a template, optionally with overrides — no AI call,
     * no token charge. Used by the "Usar template" one-click path.
     *
     * POST /api/v1/pages/from-template
     * Body: { template_id, title?, overrides? }
     */
    public function createFromTemplate(Request $request): JsonResponse
    {
        $validated = $request->validate([
            'template_id' => 'required|integer|exists:page_templates,id',
            'title' => 'nullable|string|max:255',
            'overrides' => 'nullable|array',
            'overrides.sections' => 'nullable|array',
            'overrides.theme' => 'nullable|array',
            'overrides.meta_title' => 'nullable|string|max:255',
            'overrides.meta_description' => 'nullable|string|max:500',
            'overrides.status' => 'nullable|string|in:draft,published',
        ]);

        $user = auth()->user();

        try {
            $template = $this->templateService->find((int) $validated['template_id']);
        } catch (ModelNotFoundException) {
            return response()->json([
                'success' => false,
                'message' => 'Template não encontrado.',
            ], 404);
        }

        $overrides = $validated['overrides'] ?? [];
        if (!empty($validated['title'])) {
            $overrides['title'] = $validated['title'];
        }

        $page = $this->pageBuilderService->createFromTemplate(
            $template,
            $overrides,
            $user->id,
            $user->tenant_id,
        );

        return response()->json([
            'success' => true,
            'data' => $this->formatPage($page->fresh()),
            'message' => 'Página criada a partir do template.',
        ], 201);
    }

    private function generateUniqueSlug(string $title): string
    {
        $base = Str::slug($title) ?: 'page';
        $slug = $base . '-' . Str::random(6);

        while (Page::where('slug', $slug)->exists()) {
            $slug = $base . '-' . Str::random(6);
        }

        return $slug;
    }
}

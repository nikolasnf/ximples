<?php

namespace App\Services;

use App\Models\Page;
use App\Models\PageTemplate;

/**
 * Converts a PageTemplate + optional overrides into a full PageDocument
 * or a real saved Page. This is the single integration point used by:
 *
 *  - PageController::preview          → unsaved render
 *  - PageController::createFromTemplate → saved Page (no AI)
 *  - ProcessTaskJob (via ChatExecutionService) → saved Page (with AI content)
 *
 * Keeping the merge logic in one place guarantees the preview, the chat-AI
 * flow and the "create directly" flow all produce identical output shapes.
 */
class PageBuilderService
{
    public function __construct(
        private PageService $pageService,
        private TemplateService $templateService,
    ) {}

    /**
     * Merge overrides into the template's PageDocument and return the result.
     *
     * Overrides may contain:
     *   - 'sections'      : array (either AI-by-section-id map OR a raw sections[] array)
     *   - 'theme'         : array — partial theme overrides
     *   - 'meta_title'    : string
     *   - 'meta_description' : string
     */
    public function buildDocument(PageTemplate $template, array $overrides = []): array
    {
        // Start from the template's PageDocument.
        $structure = $template->structure_json ?? [];
        $document = [
            'version' => $structure['version'] ?? 1,
            'page' => $structure['page'] ?? ['title' => $template->name, 'type' => 'landing'],
            'theme' => $structure['theme'] ?? [],
            'sections' => $structure['sections'] ?? [],
        ];

        // Apply section overrides. Two supported shapes:
        //   a) { "<section_id>": { "headline": "...", ... }, ... }  ← AI-by-id map
        //   b) [{ "id":"hero-1", "type":"hero", "props": {...} }, ...] ← raw array
        if (!empty($overrides['sections'])) {
            $sectionsOverride = $overrides['sections'];

            if (array_is_list($sectionsOverride)) {
                // Raw sections array — replace wholesale (explicit caller intent).
                $document['sections'] = $sectionsOverride;
            } else {
                // Id-keyed map — apply via TemplateService::applyContent.
                $applied = $this->templateService->applyContent($template, $sectionsOverride);
                $document['sections'] = $applied['sections'];
            }
        }

        // Theme overrides merge on top of the template theme.
        if (!empty($overrides['theme']) && is_array($overrides['theme'])) {
            $document['theme'] = array_replace($document['theme'], $overrides['theme']);
        }

        return $document;
    }

    /**
     * Build a transient (unsaved) Page model suitable for PageExportService::render().
     *
     * Used by the preview endpoint — no DB writes, no side effects.
     */
    public function buildTransientPage(PageTemplate $template, array $overrides = []): Page
    {
        $document = $this->buildDocument($template, $overrides);

        $page = new Page();
        $page->title = $overrides['title'] ?? $template->name;
        $page->slug = 'preview-' . $template->slug;
        $page->type = $document['page']['type'] ?? 'landing';
        $page->status = 'draft';
        $page->meta_title = $overrides['meta_title'] ?? ($document['page']['title'] ?? $template->name);
        $page->meta_description = $overrides['meta_description'] ?? $template->description;
        $page->theme_json = $document['theme'];
        $page->content_json = $document;

        return $page;
    }

    /**
     * Persist a Page from a template + overrides. Used by the "create directly"
     * path (no chat, no AI) and by the chat flow once the AI has filled content.
     */
    public function createFromTemplate(
        PageTemplate $template,
        array $overrides,
        int $userId,
        string $tenantId,
        ?int $assetId = null,
    ): Page {
        $document = $this->buildDocument($template, $overrides);

        $title = $overrides['title'] ?? ($document['page']['title'] ?? $template->name);

        $page = $this->pageService->createFromStructuredData(
            [
                'title' => $title,
                'type' => $document['page']['type'] ?? 'landing',
                'status' => $overrides['status'] ?? 'published',
                'meta_title' => $overrides['meta_title'] ?? $title,
                'meta_description' => $overrides['meta_description'] ?? $template->description,
                'theme' => $document['theme'],
                'sections' => $document['sections'],
            ],
            $userId,
            $tenantId,
            $assetId,
        );

        // Attribute the page to its source template. Kept as a forceFill+save
        // rather than an extra argument to createFromStructuredData so the
        // existing PageService contract stays untouched for non-template callers.
        $page->forceFill(['template_id' => $template->id])->save();

        return $page;
    }
}

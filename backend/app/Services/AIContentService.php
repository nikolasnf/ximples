<?php

namespace App\Services;

use App\Models\PageTemplate;

/**
 * Thin wrapper that invokes AIService::interpret() in TEMPLATE MODE.
 *
 * The chat flow in ChatExecutionService already calls AIService::interpret()
 * directly with a template context, so this service exists mainly for
 * template-driven content generation outside the chat loop (e.g. future
 * scheduled regeneration, admin tooling, CLI commands). Keeping it isolated
 * lets the template-filling prompt evolve independently of the free-form
 * interpreter.
 */
class AIContentService
{
    public function __construct(
        private TemplateService $templateService,
    ) {}

    /**
     * Ask the AI to adapt a template to a user brief. Returns the raw
     * interpreter response (same shape as AIService::interpret()).
     *
     * @param PageTemplate $template The template to fill.
     * @param string       $brief    User description of their product/audience/goal.
     * @param array        $history  Optional prior chat turns for refinement.
     *
     * @return array{intent:string,message:string,actions:array}
     */
    public function generateForTemplate(PageTemplate $template, string $brief, array $history = []): array
    {
        $context = $this->templateService->buildAIContext($template);
        return AIService::interpret($brief, $history, $context);
    }
}

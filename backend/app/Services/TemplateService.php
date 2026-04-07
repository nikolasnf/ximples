<?php

namespace App\Services;

use App\Models\PageTemplate;
use Illuminate\Database\Eloquent\Collection;
use Illuminate\Database\Eloquent\ModelNotFoundException;

/**
 * Curated-template lookup and AI-context helpers.
 *
 * Templates are tenant-global read-only content. This service is the single
 * entry point the controllers, jobs and AI pipeline use to resolve, describe
 * and inspect templates — keeping that logic out of controllers/jobs.
 */
class TemplateService
{
    /**
     * @return Collection<int,PageTemplate>
     */
    public function list(?string $category = null): Collection
    {
        return PageTemplate::active()
            ->when($category, fn ($q) => $q->where('category', $category))
            ->orderBy('sort_order')
            ->orderBy('id')
            ->get();
    }

    public function find(int $id): PageTemplate
    {
        return PageTemplate::active()->findOrFail($id);
    }

    public function findBySlug(string $slug): PageTemplate
    {
        $template = PageTemplate::active()->where('slug', $slug)->first();

        if (!$template) {
            throw (new ModelNotFoundException())->setModel(PageTemplate::class);
        }

        return $template;
    }

    /**
     * Resolve an identifier that may be either a numeric id or a slug.
     */
    public function resolve(string $idOrSlug): PageTemplate
    {
        if (ctype_digit($idOrSlug)) {
            return $this->find((int) $idOrSlug);
        }
        return $this->findBySlug($idOrSlug);
    }

    /**
     * Build a compact structural descriptor the AI can use to fill the template.
     *
     * Instead of sending the whole PageDocument (which would tempt Claude to
     * rewrite the structure), we send only the list of sections + the field
     * names each section expects. The LLM's job becomes "fill these exact
     * fields" instead of "design a landing page", which produces far more
     * reliable output.
     *
     * @return array{template_id:int,template_name:string,template_category:string,theme:array,sections:array<int,array>}
     */
    public function buildAIContext(PageTemplate $template): array
    {
        $structure = $template->structure_json ?? [];
        $sections = $structure['sections'] ?? [];
        $theme = $structure['theme'] ?? [];

        $descriptors = [];
        foreach ($sections as $section) {
            $descriptors[] = $this->describeSection($section);
        }

        return [
            'template_id' => $template->id,
            'template_name' => $template->name,
            'template_category' => $template->category,
            'theme' => $theme,
            'sections' => $descriptors,
        ];
    }

    /**
     * Merge AI-generated content (keyed by section id) onto the template's
     * section skeleton. Sections not mentioned by the AI keep their defaults.
     *
     * Expected $aiContent shape:
     *   [ '<section_id>' => [ <prop_key> => <value>, ... ], ... ]
     *
     * @return array The resulting PageDocument (version, page, theme, sections[])
     */
    public function applyContent(PageTemplate $template, array $aiContent): array
    {
        $structure = $template->structure_json ?? [];
        $sections = $structure['sections'] ?? [];

        $merged = [];
        foreach ($sections as $section) {
            $id = $section['id'] ?? null;
            $override = ($id && isset($aiContent[$id]) && is_array($aiContent[$id])) ? $aiContent[$id] : null;

            if ($override) {
                $baseProps = $section['props'] ?? [];
                $section['props'] = array_replace_recursive($baseProps, $override);
            }

            $merged[] = $section;
        }

        return [
            'version' => $structure['version'] ?? 1,
            'page' => $structure['page'] ?? ['title' => $template->name, 'type' => 'landing'],
            'theme' => $structure['theme'] ?? [],
            'sections' => $merged,
        ];
    }

    /**
     * Describe a single section for the AI: its id, type and the fillable fields.
     */
    private function describeSection(array $section): array
    {
        $id = $section['id'] ?? '';
        $type = $section['type'] ?? '';
        $props = $section['props'] ?? [];

        $fields = match ($type) {
            'hero' => ['headline', 'subheadline', 'buttonText', 'buttonLink'],
            'text' => ['title', 'content'],
            'features' => ['title', 'items[].icon', 'items[].title', 'items[].description'],
            'faq' => ['title', 'items[].question', 'items[].answer'],
            'cta' => ['title', 'subtitle', 'buttonText', 'buttonLink'],
            'image' => ['src', 'alt', 'caption'],
            'testimonial' => ['title', 'items[].quote', 'items[].name', 'items[].role'],
            'pricing' => ['title', 'plans[].name', 'plans[].price', 'plans[].period', 'plans[].buttonText', 'plans[].features[]'],
            'countdown' => ['title', 'subtitle', 'targetDate'],
            'form' => ['title', 'subtitle', 'buttonText', 'fields[].name', 'fields[].label', 'fields[].type'],
            'footer' => ['text', 'powered_by'],
            'html' => ['content'],
            default => [],
        };

        $descriptor = [
            'id' => $id,
            'type' => $type,
            'fields' => $fields,
        ];

        // Include the expected item count for list-based sections so the AI
        // generates the same number of cards/items the template is designed for.
        foreach (['items', 'plans', 'fields'] as $listKey) {
            if (isset($props[$listKey]) && is_array($props[$listKey])) {
                $descriptor['count'] = count($props[$listKey]);
                break;
            }
        }

        return $descriptor;
    }
}

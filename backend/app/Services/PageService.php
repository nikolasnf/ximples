<?php

namespace App\Services;

use App\Models\Asset;
use App\Models\Page;
use Illuminate\Support\Str;

class PageService
{
    public function createFromAsset(Asset $asset, int $userId, string $tenantId): Page
    {
        $title = $asset->name;
        $slug = $this->generateUniqueSlug($title);
        $input = $asset->content ?? [];

        $theme = $this->buildTheme($input);
        $contentJson = $this->buildStructuredContent($asset, $theme);

        return Page::create([
            'user_id' => $userId,
            'asset_id' => $asset->id,
            'tenant_id' => $tenantId,
            'title' => $title,
            'slug' => $slug,
            'type' => $input['type'] ?? 'landing',
            'status' => 'published',
            'meta_title' => $input['meta_title'] ?? $title,
            'meta_description' => $input['meta_description'] ?? null,
            'theme_json' => $theme,
            'content_json' => $contentJson,
        ]);
    }

    /**
     * Create a page directly from structured data (used by chat integration).
     */
    public function createFromStructuredData(array $data, int $userId, string $tenantId, ?int $assetId = null): Page
    {
        $title = $data['title'] ?? 'Nova Página';
        $slug = $this->generateUniqueSlug($data['slug'] ?? $title);

        $theme = $data['theme'] ?? $this->defaultTheme();
        $sections = $data['sections'] ?? [];

        $contentJson = [
            'version' => 1,
            'page' => [
                'title' => $title,
                'type' => $data['type'] ?? 'landing',
            ],
            'theme' => $theme,
            'sections' => $sections,
        ];

        return Page::create([
            'user_id' => $userId,
            'asset_id' => $assetId,
            'tenant_id' => $tenantId,
            'title' => $title,
            'slug' => $slug,
            'type' => $data['type'] ?? 'landing',
            'status' => $data['status'] ?? 'published',
            'meta_title' => $data['meta_title'] ?? $title,
            'meta_description' => $data['meta_description'] ?? null,
            'theme_json' => $theme,
            'content_json' => $contentJson,
        ]);
    }

    private function generateUniqueSlug(string $title): string
    {
        $base = Str::slug($title);
        if (!$base) {
            $base = 'page';
        }

        $slug = $base . '-' . Str::random(6);

        while (Page::where('slug', $slug)->exists()) {
            $slug = $base . '-' . Str::random(6);
        }

        return $slug;
    }

    private function defaultTheme(): array
    {
        return [
            'fontFamily' => 'Inter',
            'primaryColor' => '#183A6B',
            'backgroundColor' => '#FFFFFF',
            'textColor' => '#0F172A',
            'radius' => '16px',
        ];
    }

    private function buildTheme(array $input): array
    {
        $theme = $this->defaultTheme();

        if (isset($input['theme']) && is_array($input['theme'])) {
            $theme = array_merge($theme, $input['theme']);
        }

        return $theme;
    }

    private function buildStructuredContent(Asset $asset, array $theme): array
    {
        $content = $asset->content ?? [];
        $title = $asset->name;

        // If the asset already has structured sections, use them
        if (!empty($content['sections']) && is_array($content['sections'])) {
            return [
                'version' => 1,
                'page' => [
                    'title' => $title,
                    'type' => $content['type'] ?? 'landing',
                ],
                'theme' => $theme,
                'sections' => $content['sections'],
            ];
        }

        // Build default sections for legacy assets
        $sections = [];

        // Hero section
        $sections[] = [
            'id' => 'hero-1',
            'type' => 'hero',
            'props' => [
                'headline' => $content['headline'] ?? $title,
                'subheadline' => $content['subheadline'] ?? 'Descubra como nossa solução pode transformar seus resultados.',
                'buttonText' => $content['cta_text'] ?? 'Começar Agora',
                'buttonLink' => $content['cta_url'] ?? '#contato',
            ],
        ];

        // Features section
        $features = $content['features'] ?? [
            ['icon' => 'zap', 'title' => 'Rápido e eficiente', 'description' => 'Resultados visíveis em poucos dias.'],
            ['icon' => 'shield', 'title' => 'Seguro e confiável', 'description' => 'Seus dados protegidos com a melhor tecnologia.'],
            ['icon' => 'trending-up', 'title' => 'Crescimento real', 'description' => 'Aumente suas conversões em até 300%.'],
        ];

        $sections[] = [
            'id' => 'features-1',
            'type' => 'features',
            'props' => [
                'title' => 'Por que escolher?',
                'items' => $features,
            ],
        ];

        // If asset has HTML content, include as raw section
        if (isset($content['html'])) {
            $sections[] = [
                'id' => 'html-1',
                'type' => 'html',
                'props' => [
                    'content' => $content['html'],
                ],
            ];
        }

        // CTA section
        $sections[] = [
            'id' => 'cta-1',
            'type' => 'cta',
            'props' => [
                'title' => 'Pronto para começar?',
                'subtitle' => 'Entre em contato e descubra como podemos ajudar.',
                'buttonText' => 'Fale Conosco',
                'buttonLink' => '#contato',
            ],
        ];

        // Footer
        $sections[] = [
            'id' => 'footer-1',
            'type' => 'footer',
            'props' => [
                'text' => '© ' . date('Y') . ' - Todos os direitos reservados',
                'powered_by' => 'Ximples',
            ],
        ];

        return [
            'version' => 1,
            'page' => [
                'title' => $title,
                'type' => 'landing',
            ],
            'theme' => $theme,
            'sections' => $sections,
        ];
    }
}

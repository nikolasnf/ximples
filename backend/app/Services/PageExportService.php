<?php

namespace App\Services;

use App\Models\Page;
use Illuminate\Support\Facades\Http;
use Illuminate\Support\Facades\Log;
use Illuminate\Support\Facades\Storage;
use Illuminate\Support\Str;
use RuntimeException;
use ZipArchive;

class PageExportService
{
    public function export(Page $page): string
    {
        $content = $page->content_json ?? [];
        $theme = $page->theme_json ?? $content['theme'] ?? $this->defaultTheme();
        $sections = $content['sections'] ?? [];

        $css = $this->buildCss($theme);
        $body = $this->buildBody($sections, $theme);
        $metaTitle = $page->meta_title ?? $page->title;
        $metaDescription = $page->meta_description ?? '';

        $html = $this->buildDocument($metaTitle, $metaDescription, $css, $body, $theme);

        // Fetch referenced assets (images) and rewrite HTML to use local relative paths.
        [$html, $assets] = $this->bundleAssets($html);

        // Sanitize slug defensively — slugs are already Str::slug'd, but never trust stored data.
        $safeSlug = Str::slug($page->slug) ?: ('page-' . $page->id);
        $filename = 'exports/pages/' . $safeSlug . '-' . time() . '.zip';

        $disk = Storage::disk('public');

        // Build the zip on a temp file, then move into the public disk.
        $tmpZipPath = tempnam(sys_get_temp_dir(), 'page-export-');
        $zip = new ZipArchive();
        if ($zip->open($tmpZipPath, ZipArchive::CREATE | ZipArchive::OVERWRITE) !== true) {
            @unlink($tmpZipPath);
            throw new RuntimeException('Não foi possível criar o arquivo ZIP de exportação.');
        }

        $zip->addFromString('index.html', $html);
        foreach ($assets as $relativePath => $binary) {
            $zip->addFromString($relativePath, $binary);
        }
        $zip->close();

        $written = $disk->put($filename, file_get_contents($tmpZipPath));
        @unlink($tmpZipPath);

        if (!$written || !$disk->exists($filename)) {
            Log::error('PageExportService: failed to write exported ZIP', [
                'page_id' => $page->id,
                'filename' => $filename,
            ]);
            throw new RuntimeException('Não foi possível gravar o arquivo exportado.');
        }

        $page->update(['exported_html_path' => $filename]);

        Log::info('PageExportService: exported page', [
            'page_id' => $page->id,
            'filename' => $filename,
            'assets' => count($assets),
            'size' => $disk->size($filename),
        ]);

        return $filename;
    }

    /**
     * Scan HTML for remote image URLs, download them, and rewrite the HTML to point
     * to local relative paths inside the exported bundle.
     *
     * Returns [$rewrittenHtml, $assets] where $assets maps "assets/<file>" => binary content.
     */
    private function bundleAssets(string $html): array
    {
        $assets = [];
        $urlToLocal = [];
        $usedNames = [];

        $rewrite = function (string $url) use (&$assets, &$urlToLocal, &$usedNames): ?string {
            $url = trim($url);
            if ($url === '' || str_starts_with($url, 'data:') || str_starts_with($url, '#')) {
                return null;
            }
            // Only bundle absolute http(s) or protocol-relative URLs.
            if (str_starts_with($url, '//')) {
                $url = 'https:' . $url;
            }
            if (!preg_match('#^https?://#i', $url)) {
                return null;
            }

            if (isset($urlToLocal[$url])) {
                return $urlToLocal[$url];
            }

            try {
                $response = Http::timeout(10)->withOptions(['allow_redirects' => true])->get($url);
            } catch (\Throwable $e) {
                Log::warning('PageExportService: failed to fetch asset', [
                    'url' => $url,
                    'error' => $e->getMessage(),
                ]);
                return null;
            }

            if (!$response->successful()) {
                return null;
            }

            $body = $response->body();
            if ($body === '' || strlen($body) > 20 * 1024 * 1024) {
                // Skip empty or oversized (>20MB) assets.
                return null;
            }

            $ext = $this->guessExtension($url, $response->header('Content-Type'));
            $base = Str::slug(pathinfo(parse_url($url, PHP_URL_PATH) ?? '', PATHINFO_FILENAME)) ?: 'asset';
            $name = $base . '.' . $ext;
            $i = 1;
            while (isset($usedNames[$name])) {
                $name = $base . '-' . (++$i) . '.' . $ext;
            }
            $usedNames[$name] = true;

            $relative = 'assets/' . $name;
            $assets[$relative] = $body;
            $urlToLocal[$url] = $relative;

            return $relative;
        };

        // Rewrite <img src="..."> and <img ... srcset="...">.
        $html = preg_replace_callback(
            '#<img\b([^>]*?)\ssrc=(["\'])([^"\']+)\2#i',
            function ($m) use ($rewrite) {
                $local = $rewrite($m[3]);
                $newSrc = $local ?? $m[3];
                return '<img' . $m[1] . ' src=' . $m[2] . $newSrc . $m[2];
            },
            $html
        );

        // Rewrite url(...) references inside inline style attributes / <style> blocks.
        $html = preg_replace_callback(
            '#url\((["\']?)([^)"\']+)\1\)#i',
            function ($m) use ($rewrite) {
                $local = $rewrite($m[2]);
                return 'url(' . $m[1] . ($local ?? $m[2]) . $m[1] . ')';
            },
            $html
        );

        return [$html, $assets];
    }

    private function guessExtension(string $url, ?string $contentType): string
    {
        $path = parse_url($url, PHP_URL_PATH) ?? '';
        $ext = strtolower(pathinfo($path, PATHINFO_EXTENSION));
        $allowed = ['png', 'jpg', 'jpeg', 'gif', 'webp', 'svg', 'avif', 'ico'];
        if (in_array($ext, $allowed, true)) {
            return $ext === 'jpeg' ? 'jpg' : $ext;
        }

        $map = [
            'image/png' => 'png',
            'image/jpeg' => 'jpg',
            'image/jpg' => 'jpg',
            'image/gif' => 'gif',
            'image/webp' => 'webp',
            'image/svg+xml' => 'svg',
            'image/avif' => 'avif',
            'image/x-icon' => 'ico',
            'image/vnd.microsoft.icon' => 'ico',
        ];
        $ct = strtolower(trim(explode(';', (string) $contentType)[0]));
        return $map[$ct] ?? 'bin';
    }

    public function render(Page $page): string
    {
        $content = $page->content_json ?? [];
        $theme = $page->theme_json ?? $content['theme'] ?? $this->defaultTheme();
        $sections = $content['sections'] ?? [];

        $css = $this->buildCss($theme);
        $body = $this->buildBody($sections, $theme);
        $metaTitle = $page->meta_title ?? $page->title;
        $metaDescription = $page->meta_description ?? '';

        return $this->buildDocument($metaTitle, $metaDescription, $css, $body, $theme);
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

    private function buildDocument(string $title, string $description, string $css, string $body, array $theme): string
    {
        $fontFamily = e($theme['fontFamily'] ?? 'Inter');
        $escapedTitle = e($title);
        $escapedDesc = e($description);

        return <<<HTML
<!DOCTYPE html>
<html lang="pt-BR">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>{$escapedTitle}</title>
    <meta name="description" content="{$escapedDesc}">
    <link rel="preconnect" href="https://fonts.googleapis.com">
    <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
    <link href="https://fonts.googleapis.com/css2?family={$fontFamily}:wght@400;500;600;700&display=swap" rel="stylesheet">
    <style>
{$css}
    </style>
</head>
<body>
{$body}
</body>
</html>
HTML;
    }

    private function buildCss(array $theme): string
    {
        $font = e($theme['fontFamily'] ?? 'Inter');
        $primary = e($theme['primaryColor'] ?? '#183A6B');
        $bg = e($theme['backgroundColor'] ?? '#FFFFFF');
        $text = e($theme['textColor'] ?? '#0F172A');
        $radius = e($theme['radius'] ?? '16px');

        // Compute a lighter primary for gradients
        $primaryLight = $this->lightenColor($primary, 20);
        $primaryDark = $this->darkenColor($primary, 15);

        return <<<CSS
        *, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }
        body {
            font-family: '{$font}', system-ui, -apple-system, sans-serif;
            color: {$text};
            background-color: {$bg};
            line-height: 1.6;
            -webkit-font-smoothing: antialiased;
        }
        img { max-width: 100%; height: auto; display: block; }
        a { color: inherit; text-decoration: none; }

        .section { padding: 80px 24px; }
        .container { max-width: 1120px; margin: 0 auto; }
        .container-sm { max-width: 768px; margin: 0 auto; }

        /* Hero */
        .block-hero {
            background: linear-gradient(135deg, {$primaryDark}, {$primary});
            color: #FFFFFF;
            text-align: center;
            padding: 100px 24px;
        }
        .block-hero h1 {
            font-size: clamp(2rem, 5vw, 3.5rem);
            font-weight: 700;
            line-height: 1.15;
            margin-bottom: 20px;
        }
        .block-hero p {
            font-size: clamp(1rem, 2vw, 1.25rem);
            opacity: 0.9;
            max-width: 640px;
            margin: 0 auto 32px;
        }
        .btn-primary {
            display: inline-block;
            background: #FFFFFF;
            color: {$primary};
            font-weight: 600;
            padding: 16px 40px;
            border-radius: {$radius};
            font-size: 1.1rem;
            transition: transform 0.2s, box-shadow 0.2s;
            box-shadow: 0 4px 14px rgba(0,0,0,0.1);
        }
        .btn-primary:hover { transform: translateY(-2px); box-shadow: 0 6px 20px rgba(0,0,0,0.15); }

        .btn-cta {
            display: inline-block;
            background: {$primary};
            color: #FFFFFF;
            font-weight: 600;
            padding: 16px 40px;
            border-radius: {$radius};
            font-size: 1.1rem;
            transition: transform 0.2s, box-shadow 0.2s;
            box-shadow: 0 4px 14px rgba(0,0,0,0.1);
        }
        .btn-cta:hover { transform: translateY(-2px); box-shadow: 0 6px 20px rgba(0,0,0,0.15); }

        /* Text */
        .block-text { background: {$bg}; }
        .block-text h2 { font-size: 2rem; font-weight: 700; margin-bottom: 16px; }
        .block-text p, .block-text .content { font-size: 1.1rem; color: #5B6B84; line-height: 1.8; }

        /* Features */
        .block-features { background: #F8FAFC; }
        .block-features h2 { font-size: 2rem; font-weight: 700; text-align: center; margin-bottom: 48px; }
        .features-grid {
            display: grid;
            grid-template-columns: repeat(auto-fit, minmax(280px, 1fr));
            gap: 32px;
        }
        .feature-card {
            background: #FFFFFF;
            border-radius: {$radius};
            padding: 32px;
            text-align: center;
            box-shadow: 0 1px 3px rgba(0,0,0,0.06);
            transition: box-shadow 0.2s, transform 0.2s;
        }
        .feature-card:hover { box-shadow: 0 8px 24px rgba(0,0,0,0.08); transform: translateY(-2px); }
        .feature-icon {
            width: 56px; height: 56px;
            background: {$primary}10;
            border-radius: 12px;
            display: flex; align-items: center; justify-content: center;
            margin: 0 auto 16px;
            font-size: 1.5rem;
        }
        .feature-card h3 { font-size: 1.15rem; font-weight: 600; margin-bottom: 8px; }
        .feature-card p { color: #5B6B84; font-size: 0.95rem; }

        /* FAQ */
        .block-faq { background: {$bg}; }
        .block-faq h2 { font-size: 2rem; font-weight: 700; text-align: center; margin-bottom: 48px; }
        .faq-item {
            border-bottom: 1px solid #E2E8F0;
            padding: 24px 0;
        }
        .faq-item h3 { font-size: 1.1rem; font-weight: 600; margin-bottom: 8px; color: {$text}; }
        .faq-item p { color: #5B6B84; font-size: 0.95rem; line-height: 1.7; }

        /* CTA */
        .block-cta {
            background: linear-gradient(135deg, {$primary}, {$primaryLight});
            color: #FFFFFF;
            text-align: center;
        }
        .block-cta h2 { font-size: 2rem; font-weight: 700; margin-bottom: 12px; }
        .block-cta p { font-size: 1.1rem; opacity: 0.9; margin-bottom: 32px; max-width: 560px; margin-left: auto; margin-right: auto; }

        /* Image */
        .block-image { background: {$bg}; text-align: center; }
        .block-image img { border-radius: {$radius}; margin: 0 auto; box-shadow: 0 4px 20px rgba(0,0,0,0.08); }
        .block-image .caption { color: #5B6B84; font-size: 0.9rem; margin-top: 12px; }

        /* Testimonial */
        .block-testimonial { background: #F8FAFC; }
        .block-testimonial h2 { font-size: 2rem; font-weight: 700; text-align: center; margin-bottom: 48px; }
        .testimonials-grid {
            display: grid;
            grid-template-columns: repeat(auto-fit, minmax(300px, 1fr));
            gap: 24px;
        }
        .testimonial-card {
            background: #FFFFFF;
            border-radius: {$radius};
            padding: 32px;
            box-shadow: 0 1px 3px rgba(0,0,0,0.06);
        }
        .testimonial-card blockquote {
            font-size: 1rem;
            color: #5B6B84;
            line-height: 1.7;
            margin-bottom: 16px;
            font-style: italic;
        }
        .testimonial-author { font-weight: 600; font-size: 0.95rem; }
        .testimonial-role { color: #5B6B84; font-size: 0.85rem; }

        /* Pricing */
        .block-pricing { background: {$bg}; }
        .block-pricing h2 { font-size: 2rem; font-weight: 700; text-align: center; margin-bottom: 48px; }
        .pricing-grid {
            display: grid;
            grid-template-columns: repeat(auto-fit, minmax(280px, 1fr));
            gap: 24px;
            max-width: 960px;
            margin: 0 auto;
        }
        .pricing-card {
            background: #FFFFFF;
            border: 2px solid #E2E8F0;
            border-radius: {$radius};
            padding: 40px 32px;
            text-align: center;
            transition: border-color 0.2s, box-shadow 0.2s;
        }
        .pricing-card.highlighted {
            border-color: {$primary};
            box-shadow: 0 8px 30px rgba(0,0,0,0.1);
            transform: scale(1.02);
        }
        .pricing-card h3 { font-size: 1.25rem; font-weight: 600; margin-bottom: 8px; }
        .pricing-price { font-size: 2.5rem; font-weight: 700; color: {$primary}; margin: 16px 0; }
        .pricing-price span { font-size: 1rem; font-weight: 400; color: #5B6B84; }
        .pricing-features { list-style: none; margin: 24px 0; }
        .pricing-features li { padding: 8px 0; color: #5B6B84; font-size: 0.95rem; }
        .pricing-features li::before { content: '✓ '; color: {$primary}; font-weight: 700; }

        /* Countdown */
        .block-countdown {
            background: linear-gradient(135deg, {$primaryDark}, {$primary});
            color: #FFFFFF;
            text-align: center;
        }
        .block-countdown h2 { font-size: 2rem; font-weight: 700; margin-bottom: 12px; }
        .block-countdown p { opacity: 0.9; margin-bottom: 32px; }
        .countdown-timer { display: flex; gap: 16px; justify-content: center; }
        .countdown-unit {
            background: rgba(255,255,255,0.15);
            border-radius: 12px;
            padding: 20px 24px;
            min-width: 80px;
        }
        .countdown-unit .number { font-size: 2rem; font-weight: 700; display: block; }
        .countdown-unit .label { font-size: 0.75rem; opacity: 0.8; text-transform: uppercase; letter-spacing: 1px; }

        /* Form */
        .block-form { background: #F8FAFC; }
        .block-form h2 { font-size: 2rem; font-weight: 700; text-align: center; margin-bottom: 12px; }
        .block-form .subtitle { text-align: center; color: #5B6B84; margin-bottom: 32px; }
        .form-wrapper {
            max-width: 480px;
            margin: 0 auto;
            background: #FFFFFF;
            border-radius: {$radius};
            padding: 40px;
            box-shadow: 0 4px 14px rgba(0,0,0,0.06);
        }
        .form-group { margin-bottom: 20px; }
        .form-group label { display: block; font-weight: 500; margin-bottom: 6px; font-size: 0.9rem; }
        .form-group input, .form-group textarea, .form-group select {
            width: 100%;
            padding: 12px 16px;
            border: 1px solid #D8E2F0;
            border-radius: 8px;
            font-size: 1rem;
            font-family: inherit;
            transition: border-color 0.2s;
        }
        .form-group input:focus, .form-group textarea:focus, .form-group select:focus {
            outline: none;
            border-color: {$primary};
            box-shadow: 0 0 0 3px {$primary}20;
        }

        /* Footer */
        .block-footer {
            background: #0F172A;
            color: #94A3B8;
            text-align: center;
            padding: 40px 24px;
            font-size: 0.9rem;
        }
        .block-footer .powered { margin-top: 8px; color: #64748B; }
        .block-footer .powered span { color: {$primary}; font-weight: 500; }

        /* Responsive */
        @media (max-width: 768px) {
            .section { padding: 56px 16px; }
            .block-hero { padding: 72px 16px; }
            .features-grid, .testimonials-grid, .pricing-grid { grid-template-columns: 1fr; }
            .countdown-timer { flex-wrap: wrap; }
        }
CSS;
    }

    private function buildBody(array $sections, array $theme): string
    {
        $html = '';

        foreach ($sections as $section) {
            $type = $section['type'] ?? '';
            $props = $section['props'] ?? $section;

            $html .= match ($type) {
                'hero' => $this->renderHero($props),
                'text' => $this->renderText($props),
                'features' => $this->renderFeatures($props),
                'faq' => $this->renderFaq($props),
                'cta' => $this->renderCta($props),
                'image' => $this->renderImage($props),
                'testimonial' => $this->renderTestimonial($props),
                'pricing' => $this->renderPricing($props),
                'countdown' => $this->renderCountdown($props),
                'form' => $this->renderForm($props),
                'footer' => $this->renderFooter($props),
                // Legacy support
                'benefits' => $this->renderFeatures($props),
                'html' => $this->renderHtmlBlock($props),
                default => '',
            };
        }

        return $html;
    }

    private function renderHero(array $p): string
    {
        $headline = e($p['headline'] ?? $p['title'] ?? '');
        $sub = e($p['subheadline'] ?? $p['subtitle'] ?? '');
        $btnText = e($p['buttonText'] ?? $p['cta_text'] ?? '');
        $btnLink = e($p['buttonLink'] ?? $p['cta_url'] ?? '#');

        $subHtml = $sub ? "<p>{$sub}</p>" : '';
        $btnHtml = $btnText ? "<a href=\"{$btnLink}\" class=\"btn-primary\">{$btnText}</a>" : '';

        return <<<HTML
    <section class="block-hero">
        <div class="container">
            <h1>{$headline}</h1>
            {$subHtml}
            {$btnHtml}
        </div>
    </section>
HTML;
    }

    private function renderText(array $p): string
    {
        $title = e($p['title'] ?? '');
        $content = $p['content'] ?? $p['text'] ?? '';
        $titleHtml = $title ? "<h2>{$title}</h2>" : '';

        return <<<HTML
    <section class="block-text section">
        <div class="container-sm">
            {$titleHtml}
            <div class="content">{$content}</div>
        </div>
    </section>
HTML;
    }

    private function renderFeatures(array $p): string
    {
        $title = e($p['title'] ?? 'Recursos');
        $items = $p['items'] ?? [];
        $iconMap = [
            'zap' => '&#9889;',
            'shield' => '&#128737;',
            'trending-up' => '&#128200;',
            'star' => '&#11088;',
            'heart' => '&#10084;',
            'target' => '&#127919;',
            'check' => '&#10004;',
            'clock' => '&#128339;',
            'users' => '&#128101;',
            'globe' => '&#127758;',
        ];

        $cardsHtml = '';
        foreach ($items as $item) {
            $itemTitle = e($item['title'] ?? '');
            $desc = e($item['description'] ?? '');
            $icon = $iconMap[$item['icon'] ?? 'star'] ?? '&#11088;';
            $cardsHtml .= <<<HTML
            <div class="feature-card">
                <div class="feature-icon">{$icon}</div>
                <h3>{$itemTitle}</h3>
                <p>{$desc}</p>
            </div>
HTML;
        }

        return <<<HTML
    <section class="block-features section">
        <div class="container">
            <h2>{$title}</h2>
            <div class="features-grid">
                {$cardsHtml}
            </div>
        </div>
    </section>
HTML;
    }

    private function renderFaq(array $p): string
    {
        $title = e($p['title'] ?? 'Perguntas Frequentes');
        $items = $p['items'] ?? [];

        $itemsHtml = '';
        foreach ($items as $item) {
            $q = e($item['question'] ?? $item['title'] ?? '');
            $a = e($item['answer'] ?? $item['description'] ?? '');
            $itemsHtml .= <<<HTML
            <div class="faq-item">
                <h3>{$q}</h3>
                <p>{$a}</p>
            </div>
HTML;
        }

        return <<<HTML
    <section class="block-faq section">
        <div class="container-sm">
            <h2>{$title}</h2>
            {$itemsHtml}
        </div>
    </section>
HTML;
    }

    private function renderCta(array $p): string
    {
        $title = e($p['title'] ?? $p['headline'] ?? '');
        $sub = e($p['subtitle'] ?? $p['subheadline'] ?? '');
        $btnText = e($p['buttonText'] ?? $p['button_text'] ?? '');
        $btnLink = e($p['buttonLink'] ?? $p['button_url'] ?? '#');

        $subHtml = $sub ? "<p>{$sub}</p>" : '';
        $btnHtml = $btnText ? "<a href=\"{$btnLink}\" class=\"btn-primary\">{$btnText}</a>" : '';

        return <<<HTML
    <section class="block-cta section">
        <div class="container">
            <h2>{$title}</h2>
            {$subHtml}
            {$btnHtml}
        </div>
    </section>
HTML;
    }

    private function renderImage(array $p): string
    {
        $src = e($p['src'] ?? $p['url'] ?? '');
        $alt = e($p['alt'] ?? '');
        $caption = e($p['caption'] ?? '');

        if (!$src) return '';

        $captionHtml = $caption ? "<p class=\"caption\">{$caption}</p>" : '';

        return <<<HTML
    <section class="block-image section">
        <div class="container-sm">
            <img src="{$src}" alt="{$alt}" loading="lazy">
            {$captionHtml}
        </div>
    </section>
HTML;
    }

    private function renderTestimonial(array $p): string
    {
        $title = e($p['title'] ?? 'O que dizem nossos clientes');
        $items = $p['items'] ?? [];

        $cardsHtml = '';
        foreach ($items as $item) {
            $quote = e($item['quote'] ?? $item['text'] ?? '');
            $name = e($item['name'] ?? $item['author'] ?? '');
            $role = e($item['role'] ?? $item['position'] ?? '');
            $cardsHtml .= <<<HTML
            <div class="testimonial-card">
                <blockquote>&ldquo;{$quote}&rdquo;</blockquote>
                <div class="testimonial-author">{$name}</div>
                <div class="testimonial-role">{$role}</div>
            </div>
HTML;
        }

        return <<<HTML
    <section class="block-testimonial section">
        <div class="container">
            <h2>{$title}</h2>
            <div class="testimonials-grid">
                {$cardsHtml}
            </div>
        </div>
    </section>
HTML;
    }

    private function renderPricing(array $p): string
    {
        $title = e($p['title'] ?? 'Planos');
        $plans = $p['plans'] ?? $p['items'] ?? [];

        $cardsHtml = '';
        foreach ($plans as $plan) {
            $name = e($plan['name'] ?? $plan['title'] ?? '');
            $price = e($plan['price'] ?? '');
            $period = e($plan['period'] ?? '/mês');
            $highlighted = !empty($plan['highlighted']) ? ' highlighted' : '';
            $btnText = e($plan['buttonText'] ?? 'Escolher plano');
            $btnLink = e($plan['buttonLink'] ?? '#');

            $featuresHtml = '';
            foreach (($plan['features'] ?? []) as $feature) {
                $f = e(is_string($feature) ? $feature : ($feature['text'] ?? ''));
                $featuresHtml .= "<li>{$f}</li>";
            }

            $cardsHtml .= <<<HTML
            <div class="pricing-card{$highlighted}">
                <h3>{$name}</h3>
                <div class="pricing-price">{$price}<span>{$period}</span></div>
                <ul class="pricing-features">{$featuresHtml}</ul>
                <a href="{$btnLink}" class="btn-cta">{$btnText}</a>
            </div>
HTML;
        }

        return <<<HTML
    <section class="block-pricing section">
        <div class="container">
            <h2>{$title}</h2>
            <div class="pricing-grid">
                {$cardsHtml}
            </div>
        </div>
    </section>
HTML;
    }

    private function renderCountdown(array $p): string
    {
        $title = e($p['title'] ?? '');
        $sub = e($p['subtitle'] ?? '');
        $targetDate = e($p['targetDate'] ?? '');

        $subHtml = $sub ? "<p>{$sub}</p>" : '';

        return <<<HTML
    <section class="block-countdown section" data-target-date="{$targetDate}">
        <div class="container">
            <h2>{$title}</h2>
            {$subHtml}
            <div class="countdown-timer">
                <div class="countdown-unit"><span class="number" id="cd-days">00</span><span class="label">Dias</span></div>
                <div class="countdown-unit"><span class="number" id="cd-hours">00</span><span class="label">Horas</span></div>
                <div class="countdown-unit"><span class="number" id="cd-mins">00</span><span class="label">Min</span></div>
                <div class="countdown-unit"><span class="number" id="cd-secs">00</span><span class="label">Seg</span></div>
            </div>
        </div>
    </section>
    <script>
    (function(){
        var t=document.querySelector('[data-target-date]');
        if(!t)return;
        var d=new Date(t.dataset.targetDate).getTime();
        if(isNaN(d))return;
        setInterval(function(){
            var n=d-Date.now();
            if(n<0)n=0;
            document.getElementById('cd-days').textContent=Math.floor(n/864e5);
            document.getElementById('cd-hours').textContent=Math.floor((n%864e5)/36e5);
            document.getElementById('cd-mins').textContent=Math.floor((n%36e5)/6e4);
            document.getElementById('cd-secs').textContent=Math.floor((n%6e4)/1e3);
        },1000);
    })();
    </script>
HTML;
    }

    private function renderForm(array $p): string
    {
        $title = e($p['title'] ?? 'Entre em contato');
        $sub = e($p['subtitle'] ?? '');
        $btnText = e($p['buttonText'] ?? 'Enviar');
        $action = e($p['action'] ?? '#');
        $fields = $p['fields'] ?? [
            ['name' => 'name', 'label' => 'Nome', 'type' => 'text', 'required' => true],
            ['name' => 'email', 'label' => 'E-mail', 'type' => 'email', 'required' => true],
            ['name' => 'message', 'label' => 'Mensagem', 'type' => 'textarea', 'required' => false],
        ];

        $subHtml = $sub ? "<p class=\"subtitle\">{$sub}</p>" : '';
        $fieldsHtml = '';
        foreach ($fields as $field) {
            $name = e($field['name'] ?? '');
            $label = e($field['label'] ?? ucfirst($name));
            $type = $field['type'] ?? 'text';
            $required = !empty($field['required']) ? ' required' : '';
            $placeholder = e($field['placeholder'] ?? '');

            if ($type === 'textarea') {
                $fieldsHtml .= "<div class=\"form-group\"><label>{$label}</label><textarea name=\"{$name}\" placeholder=\"{$placeholder}\" rows=\"4\"{$required}></textarea></div>";
            } else {
                $fieldsHtml .= "<div class=\"form-group\"><label>{$label}</label><input type=\"{$type}\" name=\"{$name}\" placeholder=\"{$placeholder}\"{$required}></div>";
            }
        }

        return <<<HTML
    <section class="block-form section">
        <div class="container">
            <h2>{$title}</h2>
            {$subHtml}
            <form class="form-wrapper" action="{$action}" method="POST">
                {$fieldsHtml}
                <button type="submit" class="btn-cta" style="width:100%;border:none;cursor:pointer;">{$btnText}</button>
            </form>
        </div>
    </section>
HTML;
    }

    private function renderFooter(array $p): string
    {
        $text = e($p['text'] ?? '© ' . date('Y') . ' - Todos os direitos reservados');
        $powered = e($p['powered_by'] ?? 'Ximples');

        $poweredHtml = $powered ? "<p class=\"powered\">Feito com <span>{$powered}</span></p>" : '';

        return <<<HTML
    <footer class="block-footer">
        <p>{$text}</p>
        {$poweredHtml}
    </footer>
HTML;
    }

    private function renderHtmlBlock(array $p): string
    {
        $content = $p['content'] ?? '';
        return <<<HTML
    <section class="section" style="background:#F8FAFC;">
        <div class="container">{$content}</div>
    </section>
HTML;
    }

    private function lightenColor(string $hex, int $percent): string
    {
        return $this->adjustColor($hex, $percent);
    }

    private function darkenColor(string $hex, int $percent): string
    {
        return $this->adjustColor($hex, -$percent);
    }

    private function adjustColor(string $hex, int $percent): string
    {
        $hex = ltrim($hex, '#');
        if (strlen($hex) !== 6) return "#{$hex}";

        $r = hexdec(substr($hex, 0, 2));
        $g = hexdec(substr($hex, 2, 2));
        $b = hexdec(substr($hex, 4, 2));

        $r = max(0, min(255, $r + (int) round($r * $percent / 100)));
        $g = max(0, min(255, $g + (int) round($g * $percent / 100)));
        $b = max(0, min(255, $b + (int) round($b * $percent / 100)));

        return sprintf('#%02X%02X%02X', $r, $g, $b);
    }
}

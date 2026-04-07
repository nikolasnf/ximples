<?php

namespace App\Services;

use App\Models\Campaign;
use App\Models\CopySuggestion;
use App\Models\Page;
use App\Models\User;
use Illuminate\Database\Eloquent\Model;
use RuntimeException;

class CopySuggestionService
{
    public function __construct(
        private readonly AnalyticsService $analytics,
    ) {}

    /**
     * Generate a copy suggestion for a given source (campaign or page).
     * Collects real performance data from the analytics service, calls
     * the AI layer, persists the suggestion and returns it.
     */
    public function generate(User $user, string $sourceType, int $sourceId, string $suggestionType, array $extras = []): CopySuggestion
    {
        $source = $this->loadSource($user, $sourceType, $sourceId);
        $originalCopy = $this->extractOriginalCopy($source, $sourceType, $suggestionType);

        if ($originalCopy === '') {
            throw new RuntimeException('Não foi possível localizar a copy original para este tipo de sugestão.');
        }

        $performance = $this->collectPerformance($source, $sourceType);
        $contextForAi = $this->buildAiContext($source, $sourceType, $suggestionType, $originalCopy, $performance, $extras);

        $ai = AIService::generateCopy($contextForAi);

        return CopySuggestion::create([
            'user_id'          => $user->id,
            'tenant_id'        => $user->tenant_id,
            'source_type'      => $sourceType,
            'source_id'        => $sourceId,
            'suggestion_type'  => $suggestionType,
            'original_copy'    => $originalCopy,
            'suggested_copy'   => $ai['suggested_copy'],
            'summary'          => $ai['summary'] ?? null,
            'reasoning'        => $ai['reasoning'] ?? [],
            'context_json'     => $contextForAi,
            'performance_json' => $performance,
            'status'           => CopySuggestion::STATUS_GENERATED,
        ]);
    }

    /**
     * Apply a suggestion back to its source, updating the matching field.
     * Idempotent: applying twice is a no-op on the source.
     */
    public function apply(CopySuggestion $suggestion): CopySuggestion
    {
        if ($suggestion->isDismissed()) {
            throw new RuntimeException('Não é possível aplicar uma sugestão descartada.');
        }

        $source = $this->loadSource($suggestion->user, $suggestion->source_type, $suggestion->source_id);
        $field = $this->resolveApplyField($source, $suggestion->source_type, $suggestion->suggestion_type);

        if (!$field) {
            throw new RuntimeException('Não há campo mapeado para aplicar esta sugestão.');
        }

        $this->writeCopyToSource($source, $suggestion->source_type, $field, $suggestion->suggested_copy);

        $suggestion->update([
            'status'        => CopySuggestion::STATUS_APPLIED,
            'applied_at'    => now(),
            'applied_field' => $field,
        ]);

        return $suggestion->fresh();
    }

    public function dismiss(CopySuggestion $suggestion): CopySuggestion
    {
        if ($suggestion->isApplied()) {
            throw new RuntimeException('Sugestão já foi aplicada.');
        }

        $suggestion->update([
            'status'       => CopySuggestion::STATUS_DISMISSED,
            'dismissed_at' => now(),
        ]);

        return $suggestion->fresh();
    }

    // ────────────────────────────────────────────────────────────────────
    // Internals
    // ────────────────────────────────────────────────────────────────────

    private function loadSource(User $user, string $sourceType, int $sourceId): Model
    {
        $source = match ($sourceType) {
            CopySuggestion::SOURCE_CAMPAIGN   => Campaign::where('id', $sourceId)->where('user_id', $user->id)->first(),
            CopySuggestion::SOURCE_PAGE       => Page::where('id', $sourceId)->where('user_id', $user->id)->first(),
            CopySuggestion::SOURCE_EXPERIMENT => null, // reserved for future A/B experiments
            default                           => null,
        };

        if (!$source) {
            throw new RuntimeException("Fonte não encontrada: {$sourceType}#{$sourceId}");
        }

        return $source;
    }

    /**
     * Read the current copy text from a source, scoped by suggestion type.
     * Returns '' when the field is not present so the caller can bail.
     */
    private function extractOriginalCopy(Model $source, string $sourceType, string $suggestionType): string
    {
        if ($sourceType === CopySuggestion::SOURCE_CAMPAIGN && $source instanceof Campaign) {
            // Campaigns store a single message template. All message-ish types
            // operate on it; specific sub-types (opening/body) still read the
            // full template so the AI has full context.
            return (string) $source->message_template;
        }

        if ($sourceType === CopySuggestion::SOURCE_PAGE && $source instanceof Page) {
            $sections = $source->content_json['sections'] ?? [];
            $hero = collect($sections)->firstWhere('type', 'hero');
            $cta = collect($sections)->firstWhere('type', 'cta');

            return match ($suggestionType) {
                CopySuggestion::TYPE_HEADLINE    => (string) ($hero['props']['headline'] ?? ''),
                CopySuggestion::TYPE_SUBHEADLINE => (string) ($hero['props']['subheadline'] ?? ''),
                CopySuggestion::TYPE_CTA         => (string) (
                    $cta['props']['buttonText']
                    ?? $hero['props']['buttonText']
                    ?? ''
                ),
                CopySuggestion::TYPE_BODY        => (string) ($cta['props']['subtitle'] ?? $hero['props']['subheadline'] ?? ''),
                default                          => (string) ($hero['props']['headline'] ?? $source->title),
            };
        }

        return '';
    }

    /**
     * Map a suggestion type to the field on the source model that should be
     * overwritten on apply. Returns null if not applicable.
     */
    private function resolveApplyField(Model $source, string $sourceType, string $suggestionType): ?string
    {
        if ($sourceType === CopySuggestion::SOURCE_CAMPAIGN) {
            // All text-level suggestions on a campaign target its message_template.
            return 'message_template';
        }

        if ($sourceType === CopySuggestion::SOURCE_PAGE) {
            return match ($suggestionType) {
                CopySuggestion::TYPE_HEADLINE    => 'hero.headline',
                CopySuggestion::TYPE_SUBHEADLINE => 'hero.subheadline',
                CopySuggestion::TYPE_CTA         => 'cta.buttonText',
                CopySuggestion::TYPE_BODY        => 'cta.subtitle',
                default                          => null,
            };
        }

        return null;
    }

    /**
     * Persist the new copy back on the source model.
     * For pages, the content_json is mutated in-place at the right section.
     */
    private function writeCopyToSource(Model $source, string $sourceType, string $field, string $newCopy): void
    {
        if ($sourceType === CopySuggestion::SOURCE_CAMPAIGN && $source instanceof Campaign) {
            $source->update([$field => $newCopy]);
            return;
        }

        if ($sourceType === CopySuggestion::SOURCE_PAGE && $source instanceof Page) {
            [$sectionType, $propKey] = explode('.', $field, 2);

            $content = $source->content_json ?: [];
            $sections = $content['sections'] ?? [];

            $updated = false;
            foreach ($sections as $i => $section) {
                if (($section['type'] ?? null) === $sectionType) {
                    $sections[$i]['props'][$propKey] = $newCopy;
                    $updated = true;
                    break;
                }
            }

            if (!$updated) {
                // Create the section if missing so apply still works for minimal pages.
                $sections[] = [
                    'id'    => $sectionType . '-' . uniqid(),
                    'type'  => $sectionType,
                    'props' => [$propKey => $newCopy],
                ];
            }

            $content['sections'] = $sections;
            $source->update(['content_json' => $content]);
        }
    }

    /**
     * Gather real performance data from the analytics service, scoped to the
     * source. This is what gives the AI enough signal to suggest something
     * meaningful instead of a generic rewrite.
     */
    private function collectPerformance(Model $source, string $sourceType): array
    {
        if ($sourceType === CopySuggestion::SOURCE_CAMPAIGN && $source instanceof Campaign) {
            $analytics = $this->analytics->campaign($source);

            return [
                'sent'            => $analytics['totals']['sent'] ?? 0,
                'clicks'          => $analytics['totals']['clicks'] ?? 0,
                'visits'          => $analytics['totals']['visits'] ?? 0,
                'conversions'     => $analytics['totals']['conversions'] ?? 0,
                'unique_clickers' => $analytics['unique']['clickers'] ?? 0,
                'ctr'             => $analytics['rates']['ctr'] ?? 0,
                'conversion_rate' => $analytics['rates']['conversion_rate'] ?? 0,
            ];
        }

        if ($sourceType === CopySuggestion::SOURCE_PAGE && $source instanceof Page) {
            // Page-level aggregate from events table.
            $events = \App\Models\Event::where('page_id', $source->id)
                ->selectRaw('type, COUNT(*) as total')
                ->groupBy('type')
                ->pluck('total', 'type');

            $visits = (int) ($events['visit'] ?? 0);
            $conversions = (int) ($events['conversion'] ?? 0);
            $rate = $visits > 0 ? round(($conversions / $visits) * 100, 2) : 0.0;

            return [
                'visits'          => $visits,
                'conversions'     => $conversions,
                'conversion_rate' => $rate,
            ];
        }

        return [];
    }

    /**
     * Build the payload we send to AIService::generateCopy. Keeps the AI
     * layer ignorant of our domain models.
     */
    private function buildAiContext(
        Model $source,
        string $sourceType,
        string $suggestionType,
        string $originalCopy,
        array $performance,
        array $extras,
    ): array {
        $product = $extras['product'] ?? null;
        $audience = $extras['audience'] ?? null;
        $goal = $extras['goal'] ?? null;
        $tone = $extras['tone'] ?? null;

        if ($sourceType === CopySuggestion::SOURCE_CAMPAIGN && $source instanceof Campaign) {
            $product ??= $source->landingPage?->title;
        }
        if ($sourceType === CopySuggestion::SOURCE_PAGE && $source instanceof Page) {
            $product ??= $source->title;
            $audience ??= $source->meta_description;
        }

        return [
            'suggestion_type' => $suggestionType,
            'original_copy'   => $originalCopy,
            'product'         => $product ?? '',
            'audience'        => $audience ?? '',
            'goal'            => $goal ?? 'aumentar conversão',
            'tone'            => $tone ?? 'direto, próximo, confiável',
            'performance'     => $performance,
            'source'          => [
                'type' => $sourceType,
                'id'   => $source->getKey(),
            ],
            'extras'          => $extras,
        ];
    }
}

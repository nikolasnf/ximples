'use client';

import { useEffect, useState } from 'react';
import { toast } from 'sonner';
import {
  copySuggestionsService,
  COPY_SUGGESTION_TYPE_LABELS,
  type CopySourceType,
  type CopySuggestion,
  type CopySuggestionType,
} from '@/services/copy-suggestions.service';
import { useCreateWithFeedback } from '@/hooks/use-create-with-feedback';
import { resourceEvents } from '@/lib/resource-events';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Sparkles, Loader2, CheckCircle2, XCircle, ArrowRight, AlertCircle } from 'lucide-react';

interface CopySuggestionPanelProps {
  sourceType: CopySourceType;
  sourceId: number;
  /** Which kinds of suggestion are offered in the type picker. */
  availableTypes?: CopySuggestionType[];
  /** Called after a suggestion is applied so the parent can reload source data. */
  onApplied?: (suggestion: CopySuggestion) => void;
}

const DEFAULT_CAMPAIGN_TYPES: CopySuggestionType[] = ['full_message', 'message_opening', 'body'];
const DEFAULT_PAGE_TYPES: CopySuggestionType[] = ['headline', 'subheadline', 'cta', 'body'];

const HIGHLIGHT_MS = 5000;

/**
 * Reusable AI copy-suggestion panel.
 *
 * Shows the generation controls, list of prior suggestions for this source,
 * and a side-by-side compare view with apply/dismiss actions.
 *
 * Uses the shared `useCreateWithFeedback` hook so every generation gets
 * loading → success/error toast feedback consistent with the rest of the app,
 * plus emits a `copy-suggestions` event so other listeners can react.
 */
export function CopySuggestionPanel({
  sourceType,
  sourceId,
  availableTypes,
  onApplied,
}: CopySuggestionPanelProps) {
  const types = availableTypes ?? (sourceType === 'campaign' ? DEFAULT_CAMPAIGN_TYPES : DEFAULT_PAGE_TYPES);

  const [selectedType, setSelectedType] = useState<CopySuggestionType>(types[0]);
  const [suggestions, setSuggestions] = useState<CopySuggestion[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [highlightedIds, setHighlightedIds] = useState<Set<number>>(() => new Set());
  const [busyId, setBusyId] = useState<number | null>(null);

  useEffect(() => {
    void load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [sourceType, sourceId]);

  const load = async () => {
    setIsLoading(true);
    try {
      const list = await copySuggestionsService.list({
        source_type: sourceType,
        source_id: sourceId,
        limit: 20,
      });
      setSuggestions(list);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Erro ao carregar sugestões');
    } finally {
      setIsLoading(false);
    }
  };

  const highlight = (id: number) => {
    setHighlightedIds((prev) => {
      const next = new Set(prev);
      next.add(id);
      return next;
    });
    setTimeout(() => {
      setHighlightedIds((prev) => {
        if (!prev.has(id)) return prev;
        const next = new Set(prev);
        next.delete(id);
        return next;
      });
    }, HIGHLIGHT_MS);
  };

  const generate = useCreateWithFeedback({
    mutationFn: (payload: { suggestion_type: CopySuggestionType }) =>
      copySuggestionsService.generate({
        source_type: sourceType,
        source_id: sourceId,
        suggestion_type: payload.suggestion_type,
      }),
    invalidates: 'copy-suggestions',
    loadingMessage: 'Gerando sugestão de copy...',
    successMessage: 'Sugestão gerada com sucesso.',
    onSuccess: (suggestion) => {
      setError(null);
      setSuggestions((prev) => [suggestion, ...prev]);
      highlight(suggestion.id);
    },
    onError: (e) => setError(e instanceof Error ? e.message : 'Erro ao gerar sugestão'),
  });

  const handleGenerate = () => {
    setError(null);
    void generate.run({ suggestion_type: selectedType });
  };

  const handleApply = async (id: number) => {
    if (busyId) return;
    setError(null);
    setBusyId(id);
    const toastId = toast.loading('Aplicando sugestão...');
    try {
      const updated = await copySuggestionsService.apply(id);
      setSuggestions((prev) => prev.map((s) => (s.id === id ? updated : s)));
      toast.success('Sugestão aplicada à fonte original.', { id: toastId });
      // Let source listings know they may want to refresh (pages/campaigns).
      if (sourceType === 'page') {
        resourceEvents.emit('pages', { action: 'updated', id: sourceId });
      } else if (sourceType === 'campaign') {
        resourceEvents.emit('campaigns', { action: 'updated', id: sourceId });
      }
      onApplied?.(updated);
    } catch (e) {
      const msg = e instanceof Error ? e.message : 'Erro ao aplicar sugestão';
      setError(msg);
      toast.error(msg, { id: toastId });
    } finally {
      setBusyId(null);
    }
  };

  const handleDismiss = async (id: number) => {
    if (busyId) return;
    setBusyId(id);
    try {
      const updated = await copySuggestionsService.dismiss(id);
      setSuggestions((prev) => prev.map((s) => (s.id === id ? updated : s)));
      toast.success('Sugestão descartada.');
    } catch (e) {
      const msg = e instanceof Error ? e.message : 'Erro ao descartar sugestão';
      setError(msg);
      toast.error(msg);
    } finally {
      setBusyId(null);
    }
  };

  const isGenerating = generate.isPending;

  return (
    <Card className="p-6 space-y-4">
      <div className="flex items-center gap-2">
        <Sparkles className="w-5 h-5 text-primary" />
        <h2 className="text-lg font-semibold">Sugestões de copy com IA</h2>
      </div>
      <p className="text-sm text-muted-foreground">
        A Ximples analisa a performance real da sua {sourceType === 'campaign' ? 'campanha' : 'página'} e sugere uma nova versão otimizada para conversão.
      </p>

      <div className="flex flex-col sm:flex-row gap-2">
        <select
          className="flex-1 h-10 rounded-md border border-input bg-background px-3 text-sm disabled:opacity-60"
          value={selectedType}
          onChange={(e) => setSelectedType(e.target.value as CopySuggestionType)}
          disabled={isGenerating}
        >
          {types.map((t) => (
            <option key={t} value={t}>
              {COPY_SUGGESTION_TYPE_LABELS[t]}
            </option>
          ))}
        </select>
        <Button onClick={handleGenerate} disabled={isGenerating}>
          {isGenerating ? (
            <>
              <Loader2 className="w-4 h-4 mr-2 animate-spin" />
              Gerando...
            </>
          ) : (
            <>
              <Sparkles className="w-4 h-4 mr-2" />
              Gerar sugestão
            </>
          )}
        </Button>
      </div>

      {error && (
        <div className="flex items-start gap-2 p-3 rounded-lg bg-red-50 border border-red-200 text-sm text-red-700">
          <AlertCircle className="w-4 h-4 mt-0.5 flex-shrink-0" />
          <span>{error}</span>
        </div>
      )}

      {isLoading ? (
        <div className="flex justify-center py-8">
          <Loader2 className="w-6 h-6 animate-spin text-primary" />
        </div>
      ) : suggestions.length === 0 ? (
        <p className="text-sm text-muted-foreground text-center py-6">
          Nenhuma sugestão ainda. Clique em &quot;Gerar sugestão&quot; para começar.
        </p>
      ) : (
        <div className="space-y-3">
          {suggestions.map((s) => (
            <SuggestionCard
              key={s.id}
              suggestion={s}
              isNew={highlightedIds.has(s.id)}
              busy={busyId === s.id}
              onApply={handleApply}
              onDismiss={handleDismiss}
            />
          ))}
        </div>
      )}
    </Card>
  );
}

function SuggestionCard({
  suggestion,
  isNew,
  busy,
  onApply,
  onDismiss,
}: {
  suggestion: CopySuggestion;
  isNew: boolean;
  busy: boolean;
  onApply: (id: number) => void;
  onDismiss: (id: number) => void;
}) {
  const statusBadge = () => {
    switch (suggestion.status) {
      case 'applied':
        return (
          <Badge className="bg-green-100 text-green-700">
            <CheckCircle2 className="w-3 h-3 mr-1" />
            Aplicada
          </Badge>
        );
      case 'dismissed':
        return (
          <Badge className="bg-gray-100 text-gray-600">
            <XCircle className="w-3 h-3 mr-1" />
            Descartada
          </Badge>
        );
      default:
        return <Badge className="bg-amber-100 text-amber-700">Nova</Badge>;
    }
  };

  return (
    <div
      className={`rounded-lg border bg-background p-4 space-y-3 transition-colors ${
        isNew ? 'border-blue-400 ring-2 ring-blue-100 animate-in fade-in' : ''
      }`}
    >
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Badge variant="outline">{COPY_SUGGESTION_TYPE_LABELS[suggestion.suggestion_type]}</Badge>
          {statusBadge()}
          {isNew && (
            <Badge className="bg-blue-600 text-white text-[10px]">
              <Sparkles className="w-2.5 h-2.5 mr-0.5" />
              Novo
            </Badge>
          )}
        </div>
        <span className="text-xs text-muted-foreground">
          {new Date(suggestion.created_at).toLocaleString('pt-BR')}
        </span>
      </div>

      {suggestion.summary && <p className="text-sm text-muted-foreground italic">{suggestion.summary}</p>}

      <div className="grid md:grid-cols-2 gap-3">
        <div>
          <p className="text-xs uppercase tracking-wide text-muted-foreground mb-1">Original</p>
          <div className="rounded bg-muted/40 p-3 text-sm whitespace-pre-wrap min-h-[80px]">
            {suggestion.original_copy}
          </div>
        </div>
        <div>
          <p className="text-xs uppercase tracking-wide text-primary mb-1 flex items-center gap-1">
            Sugerida <ArrowRight className="w-3 h-3" />
          </p>
          <div className="rounded bg-primary/5 border border-primary/20 p-3 text-sm whitespace-pre-wrap min-h-[80px]">
            {suggestion.suggested_copy}
          </div>
        </div>
      </div>

      {suggestion.reasoning.length > 0 && (
        <div>
          <p className="text-xs uppercase tracking-wide text-muted-foreground mb-1">Por que mudou</p>
          <ul className="text-sm text-muted-foreground list-disc list-inside space-y-0.5">
            {suggestion.reasoning.map((r, i) => (
              <li key={i}>{r}</li>
            ))}
          </ul>
        </div>
      )}

      {suggestion.status === 'generated' && (
        <div className="flex gap-2 pt-1">
          <Button size="sm" onClick={() => onApply(suggestion.id)} disabled={busy}>
            {busy ? (
              <Loader2 className="w-4 h-4 mr-2 animate-spin" />
            ) : (
              <CheckCircle2 className="w-4 h-4 mr-2" />
            )}
            Aplicar à fonte
          </Button>
          <Button size="sm" variant="outline" onClick={() => onDismiss(suggestion.id)} disabled={busy}>
            <XCircle className="w-4 h-4 mr-2" />
            Descartar
          </Button>
        </div>
      )}
    </div>
  );
}

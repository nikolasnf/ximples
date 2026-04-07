'use client';

import { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { ProtectedRoute } from '@/components/protected-route';
import PageRenderer from '@/components/page-builder/PageRenderer';
import { templatesService } from '@/services/templates.service';
import type { PageTemplate } from '@/types';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { ArrowLeft, Loader2, Sparkles } from 'lucide-react';

function TemplatePreviewContent() {
  const params = useParams();
  const router = useRouter();
  const idOrSlug = (Array.isArray(params?.id) ? params?.id[0] : params?.id) ?? '';

  const [template, setTemplate] = useState<PageTemplate | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState('');
  const [navigating, setNavigating] = useState(false);

  useEffect(() => {
    if (!idOrSlug) return;
    let cancelled = false;
    setIsLoading(true);
    templatesService
      .get(idOrSlug)
      .then((t) => {
        if (!cancelled) setTemplate(t);
      })
      .catch(() => {
        if (!cancelled) setError('Template não encontrado.');
      })
      .finally(() => {
        if (!cancelled) setIsLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [idOrSlug]);

  const handleUseTemplate = () => {
    if (!template) return;
    setNavigating(true);
    router.push(`/?template=${template.id}`);
  };

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[#F6F8FC]">
        <Loader2 className="w-8 h-8 animate-spin text-[#183A6B]" />
      </div>
    );
  }

  if (error || !template) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center bg-[#F6F8FC] gap-4">
        <p className="text-[#5B6B84]">{error || 'Template não encontrado.'}</p>
        <Button variant="outline" onClick={() => router.push('/templates')}>
          <ArrowLeft className="w-4 h-4 mr-2" />
          Voltar para templates
        </Button>
      </div>
    );
  }

  return (
    <div>
      {/* Sticky toolbar */}
      <div className="sticky top-0 z-50 bg-white border-b border-[#D8E2F0] px-4 py-2 flex items-center justify-between shadow-sm">
        <div className="flex items-center gap-3 min-w-0">
          <Button variant="ghost" size="sm" onClick={() => router.push('/templates')}>
            <ArrowLeft className="w-4 h-4 mr-1" />
            Templates
          </Button>
          <div className="min-w-0">
            <div className="flex items-center gap-2">
              <h1 className="text-sm font-semibold text-[#0F172A] truncate">{template.name}</h1>
              <Badge variant="secondary" className="capitalize">
                {template.category}
              </Badge>
            </div>
            {template.description && (
              <p className="text-xs text-[#5B6B84] truncate">{template.description}</p>
            )}
          </div>
        </div>
        <Button
          size="sm"
          className="bg-[#183A6B] hover:bg-[#122C52]"
          onClick={handleUseTemplate}
          disabled={navigating}
        >
          {navigating ? <Loader2 className="w-4 h-4 mr-1 animate-spin" /> : <Sparkles className="w-4 h-4 mr-1" />}
          Usar template
        </Button>
      </div>

      {/* Full-page preview using the same renderer the real pages use */}
      <PageRenderer document={template.structure_json} />
    </div>
  );
}

export default function TemplatePreviewPage() {
  return (
    <ProtectedRoute>
      <TemplatePreviewContent />
    </ProtectedRoute>
  );
}

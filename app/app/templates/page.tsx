'use client';

import { useEffect, useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import { ProtectedRoute } from '@/components/protected-route';
import { templatesService } from '@/services/templates.service';
import type { PageTemplate, TemplateCategory } from '@/types';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { ArrowLeft, Eye, Loader2, Sparkles } from 'lucide-react';

const CATEGORIES: { value: TemplateCategory | 'all'; label: string }[] = [
  { value: 'all', label: 'Todos' },
  { value: 'vendas', label: 'Vendas' },
  { value: 'lead', label: 'Lead magnet' },
  { value: 'produto', label: 'Produto digital' },
  { value: 'webinar', label: 'Webinar' },
  { value: 'institucional', label: 'Institucional' },
];

const CATEGORY_GRADIENT: Record<TemplateCategory, string> = {
  vendas: 'from-red-500 to-rose-700',
  lead: 'from-blue-500 to-indigo-700',
  produto: 'from-purple-500 to-fuchsia-700',
  webinar: 'from-sky-500 to-cyan-700',
  institucional: 'from-slate-500 to-slate-800',
};

function TemplatesGalleryContent() {
  const router = useRouter();
  const [templates, setTemplates] = useState<PageTemplate[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [activeCategory, setActiveCategory] = useState<TemplateCategory | 'all'>('all');
  const [usingId, setUsingId] = useState<number | null>(null);

  useEffect(() => {
    let cancelled = false;
    setIsLoading(true);
    templatesService
      .list()
      .then((data) => {
        if (!cancelled) setTemplates(data);
      })
      .catch(() => {
        if (!cancelled) setTemplates([]);
      })
      .finally(() => {
        if (!cancelled) setIsLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, []);

  const filtered = useMemo(() => {
    if (activeCategory === 'all') return templates;
    return templates.filter((t) => t.category === activeCategory);
  }, [templates, activeCategory]);

  const handleUseTemplate = (template: PageTemplate) => {
    setUsingId(template.id);
    // Chat-with-template flow: navigate to dashboard with ?template= so the
    // chat picks up the context and every subsequent send call carries template_id.
    router.push(`/?template=${template.id}`);
  };

  return (
    <div className="min-h-screen bg-[#F6F8FC]">
      <div className="max-w-6xl mx-auto px-4 sm:px-6 py-8">
        <div className="flex items-center gap-3 mb-6">
          <Button variant="ghost" size="sm" onClick={() => router.push('/')}>
            <ArrowLeft className="w-4 h-4 mr-1" />
            Voltar
          </Button>
          <div>
            <h1 className="text-2xl sm:text-3xl font-bold text-[#0F172A]">Templates de landing page</h1>
            <p className="text-sm text-[#5B6B84] mt-1">
              Escolha um modelo, personalize com o chat e publique em minutos.
            </p>
          </div>
        </div>

        {/* Category filter */}
        <div className="flex flex-wrap gap-2 mb-8">
          {CATEGORIES.map((cat) => (
            <button
              key={cat.value}
              onClick={() => setActiveCategory(cat.value)}
              className={`px-4 py-1.5 rounded-full text-sm font-medium transition-colors ${
                activeCategory === cat.value
                  ? 'bg-[#183A6B] text-white'
                  : 'bg-white text-[#5B6B84] hover:bg-[#EEF3FB] border border-[#D8E2F0]'
              }`}
            >
              {cat.label}
            </button>
          ))}
        </div>

        {/* Grid */}
        {isLoading ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {Array.from({ length: 6 }).map((_, i) => (
              <Card key={i} className="overflow-hidden p-0">
                <Skeleton className="h-48 w-full" />
                <div className="p-4 space-y-2">
                  <Skeleton className="h-4 w-24" />
                  <Skeleton className="h-5 w-3/4" />
                  <Skeleton className="h-4 w-full" />
                </div>
              </Card>
            ))}
          </div>
        ) : filtered.length === 0 ? (
          <Card className="p-12 text-center">
            <p className="text-[#5B6B84]">Nenhum template encontrado nesta categoria.</p>
          </Card>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {filtered.map((template) => (
              <Card key={template.id} className="overflow-hidden flex flex-col p-0">
                {/* Preview image with gradient fallback */}
                <div className="relative h-48 w-full overflow-hidden">
                  {template.preview_image ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img
                      src={template.preview_image}
                      alt={template.name}
                      className="w-full h-full object-cover"
                      onError={(e) => {
                        (e.currentTarget as HTMLImageElement).style.display = 'none';
                      }}
                    />
                  ) : null}
                  {!template.preview_image && (
                    <div
                      className={`w-full h-full bg-gradient-to-br ${
                        CATEGORY_GRADIENT[template.category] ?? 'from-slate-500 to-slate-800'
                      } flex items-center justify-center`}
                    >
                      <span className="text-white font-semibold text-lg px-4 text-center">{template.name}</span>
                    </div>
                  )}
                </div>

                <div className="p-4 flex flex-col flex-1">
                  <Badge variant="secondary" className="self-start mb-2 capitalize">
                    {template.category}
                  </Badge>
                  <h3 className="font-semibold text-[#0F172A] mb-1 line-clamp-1">{template.name}</h3>
                  <p className="text-sm text-[#5B6B84] mb-4 line-clamp-2 flex-1">{template.description}</p>

                  <div className="flex gap-2">
                    <Button
                      variant="outline"
                      size="sm"
                      className="flex-1"
                      onClick={() => router.push(`/templates/${template.id}`)}
                    >
                      <Eye className="w-4 h-4 mr-1" />
                      Visualizar
                    </Button>
                    <Button
                      size="sm"
                      className="flex-1 bg-[#183A6B] hover:bg-[#122C52]"
                      onClick={() => handleUseTemplate(template)}
                      disabled={usingId === template.id}
                    >
                      {usingId === template.id ? (
                        <Loader2 className="w-4 h-4 mr-1 animate-spin" />
                      ) : (
                        <Sparkles className="w-4 h-4 mr-1" />
                      )}
                      Usar template
                    </Button>
                  </div>
                </div>
              </Card>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

export default function TemplatesGalleryPage() {
  return (
    <ProtectedRoute>
      <TemplatesGalleryContent />
    </ProtectedRoute>
  );
}

'use client';

import { useState, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { useAuth } from '@/lib/auth-context';
import PageRenderer from '@/components/page-builder/PageRenderer';
import { pagesApiService } from '@/services/pages.service';
import { CopySuggestionPanel } from '@/components/copy-suggestions/copy-suggestion-panel';
import type { PageRecord } from '@/types/page';
import { Loader2, ArrowLeft, ExternalLink, Download } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { toast } from 'sonner';

export default function PagePreview() {
  const params = useParams();
  const router = useRouter();
  const { isAuthenticated, isLoading: authLoading } = useAuth();
  const [page, setPage] = useState<PageRecord | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [exporting, setExporting] = useState(false);

  const pageId = Number(params.id);

  useEffect(() => {
    if (authLoading) return;
    if (!isAuthenticated) {
      router.push('/login');
      return;
    }
    loadPage();
  }, [pageId, isAuthenticated, authLoading]);

  const loadPage = async () => {
    setLoading(true);
    setError('');
    try {
      const data = await pagesApiService.get(pageId);
      setPage(data);
    } catch {
      setError('Página não encontrada.');
    } finally {
      setLoading(false);
    }
  };

  const handleExport = async () => {
    if (!page) return;
    setExporting(true);
    const toastId = toast.loading('Exportando HTML...');
    try {
      const result = await pagesApiService.export(page.id);
      toast.success('HTML exportado com sucesso.', { id: toastId });
      window.open(result.download_url, '_blank');
    } catch (e) {
      toast.error(e instanceof Error ? e.message : 'Erro ao exportar HTML.', { id: toastId });
    } finally {
      setExporting(false);
    }
  };

  if (authLoading || loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <Loader2 className="w-8 h-8 animate-spin text-[#183A6B]" />
      </div>
    );
  }

  if (error || !page) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center bg-gray-50 gap-4">
        <p className="text-gray-600">{error || 'Página não encontrada.'}</p>
        <Button variant="outline" onClick={() => router.push('/')}>
          <ArrowLeft className="w-4 h-4 mr-2" />
          Voltar ao dashboard
        </Button>
      </div>
    );
  }

  const document = page.content_json
    ? {
        ...page.content_json,
        theme: page.theme_json || page.content_json.theme,
      }
    : { sections: [] };

  return (
    <div>
      {/* Preview toolbar */}
      <div className="sticky top-0 z-50 bg-white border-b border-gray-200 px-4 py-2 flex items-center justify-between shadow-sm">
        <div className="flex items-center gap-3">
          <Button variant="ghost" size="sm" onClick={() => router.push('/')}>
            <ArrowLeft className="w-4 h-4 mr-1" />
            Voltar
          </Button>
          <span className="text-sm font-medium text-gray-700 truncate max-w-[200px]">
            {page.title}
          </span>
          <span className={`text-xs px-2 py-0.5 rounded-full ${
            page.status === 'published'
              ? 'bg-green-100 text-green-700'
              : 'bg-yellow-100 text-yellow-700'
          }`}>
            {page.status === 'published' ? 'Publicada' : 'Rascunho'}
          </span>
        </div>
        <div className="flex items-center gap-2">
          {page.status === 'published' && (
            <a
              href={page.public_url}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-1 text-sm text-[#183A6B] hover:underline"
            >
              <ExternalLink className="w-3.5 h-3.5" />
              URL pública
            </a>
          )}
          <Button
            size="sm"
            variant="outline"
            onClick={handleExport}
            disabled={exporting}
          >
            {exporting ? (
              <Loader2 className="w-4 h-4 animate-spin mr-1" />
            ) : (
              <Download className="w-4 h-4 mr-1" />
            )}
            Exportar HTML
          </Button>
        </div>
      </div>

      {/* Page render */}
      <PageRenderer document={document} />

      {/* AI copy suggestions */}
      <div className="max-w-4xl mx-auto p-6">
        <CopySuggestionPanel
          sourceType="page"
          sourceId={pageId}
          onApplied={() => void loadPage()}
        />
      </div>
    </div>
  );
}

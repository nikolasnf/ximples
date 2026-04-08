'use client';

import { useEffect, useMemo, useRef, useState, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { ProtectedRoute } from '@/components/protected-route';
import { pagesApiService } from '@/services/pages.service';
import type { PageRecord } from '@/types/page';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { Badge } from '@/components/ui/badge';
import { motion, AnimatePresence } from 'framer-motion';
import { toast } from 'sonner';
import { resourceEvents } from '@/lib/resource-events';
import {
  ArrowLeft,
  Eye,
  Loader2,
  Search,
  X,
  TrendingUp,
  Zap,
  ChevronRight,
  Crown,
  Plus,
  Pencil,
  Globe,
  Share2,
  Download,
  FileText,
  Rocket,
  Target,
  Layers,
  LayoutTemplate,
  Clock,
  ExternalLink,
  Sparkles,
  Copy,
  MoreHorizontal,
  type LucideIcon,
} from 'lucide-react';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';

/* ─────────────── TYPES ─────────────── */

type FilterType = 'all' | 'landing' | 'funnel' | 'capture' | 'product';
type StatusFilter = 'all' | 'published' | 'draft' | 'editing';

/* ─────────────── CONSTANTS ─────────────── */

const TYPE_FILTERS: { value: FilterType; label: string; icon: LucideIcon }[] = [
  { value: 'all', label: 'Todos', icon: Layers },
  { value: 'landing', label: 'Landing Pages', icon: FileText },
  { value: 'funnel', label: 'Funis', icon: Rocket },
  { value: 'capture', label: 'Capturas', icon: Target },
  { value: 'product', label: 'Produtos', icon: LayoutTemplate },
];

const STATUS_BADGES: Record<string, { label: string; className: string }> = {
  published: {
    label: 'Publicado',
    className: 'bg-emerald-50 text-emerald-700 border-emerald-200',
  },
  draft: {
    label: 'Rascunho',
    className: 'bg-amber-50 text-amber-700 border-amber-200',
  },
  editing: {
    label: 'Em edicao',
    className: 'bg-blue-50 text-blue-700 border-blue-200',
  },
};

const TYPE_CONFIG: Record<string, { gradient: string; accentColor: string; bgTint: string; icon: LucideIcon; label: string }> = {
  landing: {
    gradient: 'from-blue-500 via-indigo-500 to-violet-500',
    accentColor: '#6366F1',
    bgTint: 'bg-indigo-50',
    icon: FileText,
    label: 'Landing Page',
  },
  funnel: {
    gradient: 'from-violet-500 via-purple-500 to-fuchsia-500',
    accentColor: '#A855F7',
    bgTint: 'bg-purple-50',
    icon: Rocket,
    label: 'Funil',
  },
  capture: {
    gradient: 'from-emerald-500 via-teal-500 to-cyan-500',
    accentColor: '#14B8A6',
    bgTint: 'bg-teal-50',
    icon: Target,
    label: 'Captura',
  },
  product: {
    gradient: 'from-rose-500 via-red-500 to-orange-500',
    accentColor: '#EF4444',
    bgTint: 'bg-rose-50',
    icon: LayoutTemplate,
    label: 'Produto',
  },
  page: {
    gradient: 'from-blue-500 via-indigo-500 to-violet-500',
    accentColor: '#6366F1',
    bgTint: 'bg-indigo-50',
    icon: FileText,
    label: 'Pagina',
  },
};

const DEFAULT_TYPE_CONFIG = TYPE_CONFIG.landing;

/* ─────────────── AI SUGGESTIONS (mock) ─────────────── */

const AI_TIPS: Record<string, string> = {
  draft: 'Finalize e publique para comecar a receber visitas',
  published: 'Adicione um CTA mais forte para aumentar conversoes',
};

/* ─────────────── MOCK LANDING PAGE PREVIEW ─────────────── */

function PagePreviewMock({ type }: { type: string }) {
  const config = TYPE_CONFIG[type] ?? DEFAULT_TYPE_CONFIG;
  const Icon = config.icon;

  return (
    <div className="w-full h-full bg-white rounded-sm overflow-hidden relative select-none pointer-events-none">
      {/* Browser chrome */}
      <div className="h-5 bg-gray-100 flex items-center gap-1 px-2 border-b border-gray-200">
        <div className="w-1.5 h-1.5 rounded-full bg-red-400" />
        <div className="w-1.5 h-1.5 rounded-full bg-yellow-400" />
        <div className="w-1.5 h-1.5 rounded-full bg-green-400" />
        <div className="ml-2 h-2.5 w-24 bg-gray-200 rounded-full" />
      </div>

      {/* Nav */}
      <div className="h-5 px-3 flex items-center justify-between border-b border-gray-100">
        <div className="h-2 w-10 bg-gray-300 rounded" />
        <div className="flex gap-2">
          <div className="h-1.5 w-6 bg-gray-200 rounded" />
          <div className="h-1.5 w-6 bg-gray-200 rounded" />
          <div className="h-1.5 w-6 bg-gray-200 rounded" />
        </div>
      </div>

      {/* Hero */}
      <div className={`px-3 py-4 bg-gradient-to-br ${config.gradient} relative overflow-hidden`}>
        <div className="absolute inset-0 opacity-10">
          <div className="absolute top-1 right-2 w-12 h-12 rounded-full border-2 border-white/30" />
          <div className="absolute bottom-0 left-1 w-8 h-8 rounded-full border border-white/20" />
        </div>
        <div className="relative z-10 flex flex-col items-center text-center">
          <div className="w-6 h-6 rounded-lg bg-white/20 flex items-center justify-center mb-2">
            <Icon className="w-3.5 h-3.5 text-white" />
          </div>
          <div className="h-2 w-28 bg-white/90 rounded mb-1.5" />
          <div className="h-1.5 w-20 bg-white/50 rounded mb-2" />
          <div className="h-3 w-14 bg-white rounded-full" />
        </div>
      </div>

      {/* Content sections */}
      <div className="px-3 py-2 space-y-2">
        <div className="grid grid-cols-3 gap-1.5">
          {[0, 1, 2].map((i) => (
            <div key={i} className="p-1.5 rounded bg-gray-50 border border-gray-100">
              <div className="w-3 h-3 rounded mb-1 opacity-20" style={{ backgroundColor: config.accentColor }} />
              <div className="h-1 w-full bg-gray-200 rounded mb-0.5" />
              <div className="h-1 w-3/4 bg-gray-100 rounded" />
            </div>
          ))}
        </div>

        <div className="flex items-center gap-1 justify-center py-1">
          {[0, 1, 2, 3, 4].map((i) => (
            <div key={i} className="w-4 h-4 rounded-full bg-gray-200 -ml-1 first:ml-0 border border-white" />
          ))}
          <div className="h-1 w-8 bg-gray-200 rounded ml-1" />
        </div>

        <div className="flex flex-col items-center py-1">
          <div className="h-1.5 w-16 bg-gray-300 rounded mb-1" />
          <div className="h-3 w-20 rounded-full opacity-80" style={{ backgroundColor: config.accentColor }} />
        </div>
      </div>
    </div>
  );
}

/* ─────────────── CREATION CARD ─────────────── */

function CreationCard({
  page,
  featured,
  onPublish,
  onExport,
  isPublishing,
  isExporting,
}: {
  page: PageRecord;
  featured?: boolean;
  onPublish: () => void;
  onExport: () => void;
  isPublishing: boolean;
  isExporting: boolean;
}) {
  const router = useRouter();
  const config = TYPE_CONFIG[page.type] ?? DEFAULT_TYPE_CONFIG;
  const statusBadge = STATUS_BADGES[page.status] ?? STATUS_BADGES.draft;
  const aiTip = AI_TIPS[page.status];

  const formattedDate = new Date(page.created_at).toLocaleDateString('pt-BR', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
  });

  const handleEdit = () => router.push(`/?page=${page.id}`);
  const handlePreview = () => window.open(page.preview_url || `/pages/${page.id}/preview`, '_blank');
  const handleShare = () => {
    navigator.clipboard.writeText(page.public_url || `${window.location.origin}/l/${page.slug}`);
    toast.success('Link copiado!');
  };

  return (
    <motion.div
      layout
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -10, scale: 0.95 }}
      transition={{ duration: 0.3, ease: 'easeOut' }}
      className={`group relative rounded-2xl bg-white border border-gray-100 overflow-hidden
        shadow-sm hover:shadow-xl hover:shadow-gray-200/50
        transition-all duration-300 ease-out
        hover:-translate-y-1
        ${featured ? 'ring-2 ring-amber-400/50 ring-offset-2' : ''}
      `}
    >
      {/* Featured badge */}
      {featured && (
        <div className="absolute top-3 left-3 z-20 flex items-center gap-1 px-2 py-0.5 rounded-full bg-gradient-to-r from-amber-400 to-orange-400 text-white text-[10px] font-bold uppercase tracking-wider shadow-lg">
          <Crown className="w-3 h-3" />
          Mais recente
        </div>
      )}

      {/* Status badge */}
      <div className="absolute top-3 right-3 z-20">
        <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-semibold border ${statusBadge.className}`}>
          {statusBadge.label}
        </span>
      </div>

      {/* Preview area */}
      <div className="relative h-48 overflow-hidden cursor-pointer" onClick={handlePreview}>
        {page.preview_image ? (
          <>
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={page.preview_image}
              alt={page.title}
              className="w-full h-full object-cover object-top transition-transform duration-500 group-hover:scale-105"
              onError={(e) => {
                (e.currentTarget as HTMLImageElement).style.display = 'none';
                const fallback = e.currentTarget.nextElementSibling as HTMLElement;
                if (fallback) fallback.style.display = 'flex';
              }}
            />
            <div className="hidden w-full h-full">
              <PagePreviewMock type={page.type} />
            </div>
          </>
        ) : (
          <div className="w-full h-full p-2 bg-gray-50">
            <PagePreviewMock type={page.type} />
          </div>
        )}

        {/* Hover overlay */}
        <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-black/0 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300 flex items-end justify-center pb-4">
          <div className="flex items-center gap-2">
            <button
              onClick={(e) => { e.stopPropagation(); handleEdit(); }}
              className="flex items-center gap-1.5 text-white text-sm font-medium bg-white/20 backdrop-blur-sm px-3 py-1.5 rounded-full border border-white/30 hover:bg-white/30 transition-colors"
            >
              <Pencil className="w-3.5 h-3.5" />
              Editar
            </button>
            <button
              onClick={(e) => { e.stopPropagation(); handlePreview(); }}
              className="flex items-center gap-1.5 text-white text-sm font-medium bg-white/20 backdrop-blur-sm px-3 py-1.5 rounded-full border border-white/30 hover:bg-white/30 transition-colors"
            >
              <Eye className="w-3.5 h-3.5" />
              Visualizar
            </button>
          </div>
        </div>
      </div>

      {/* Content */}
      <div className="p-5">
        {/* Type badge */}
        <div className="flex items-center gap-2 mb-3">
          <span
            className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[11px] font-semibold uppercase tracking-wide ${config.bgTint}`}
            style={{ color: config.accentColor }}
          >
            <span className={`w-1.5 h-1.5 rounded-full bg-gradient-to-r ${config.gradient}`} />
            {config.label}
          </span>
        </div>

        {/* Title & date */}
        <h3 className="font-bold text-[#0F172A] text-base mb-1 line-clamp-1 group-hover:text-[#183A6B] transition-colors">
          {page.title}
        </h3>
        <div className="flex items-center gap-2 text-xs text-[#5B6B84] mb-4">
          <Clock className="w-3 h-3" />
          {formattedDate}
        </div>

        {/* AI Suggestion */}
        {aiTip && (
          <div className="flex items-start gap-2 p-2.5 rounded-xl bg-gradient-to-r from-violet-50 to-indigo-50 border border-violet-100 mb-4">
            <Sparkles className="w-3.5 h-3.5 text-violet-500 mt-0.5 shrink-0" />
            <p className="text-[11px] text-violet-700 leading-relaxed">{aiTip}</p>
          </div>
        )}

        {/* Ready for traffic indicator */}
        {page.status === 'published' && (
          <div className="flex items-center gap-1.5 mb-4">
            <span className="relative flex h-2 w-2">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75" />
              <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500" />
            </span>
            <span className="text-[11px] font-medium text-emerald-600">Pronto para trafego</span>
          </div>
        )}

        {/* Actions */}
        <div className="flex gap-2">
          <Button
            size="sm"
            className="flex-1 rounded-xl bg-gradient-to-r from-[#183A6B] to-[#244D89] hover:from-[#122C52] hover:to-[#183A6B] text-white shadow-md shadow-[#183A6B]/20 hover:shadow-lg hover:shadow-[#183A6B]/30 transition-all"
            onClick={handleEdit}
          >
            <Pencil className="w-4 h-4 mr-1.5" />
            Editar
          </Button>

          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button
                variant="outline"
                size="sm"
                className="rounded-xl border-gray-200 text-[#5B6B84] hover:text-[#0F172A] hover:border-gray-300 hover:bg-gray-50 px-2.5"
              >
                <MoreHorizontal className="w-4 h-4" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-48">
              <DropdownMenuItem onClick={handlePreview}>
                <Eye className="w-4 h-4 mr-2" />
                Visualizar
              </DropdownMenuItem>
              {page.status !== 'published' && (
                <DropdownMenuItem onClick={onPublish} disabled={isPublishing}>
                  {isPublishing ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <Globe className="w-4 h-4 mr-2" />}
                  Publicar
                </DropdownMenuItem>
              )}
              <DropdownMenuItem onClick={handleShare}>
                <Share2 className="w-4 h-4 mr-2" />
                Compartilhar
              </DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuItem onClick={onExport} disabled={isExporting}>
                {isExporting ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <Download className="w-4 h-4 mr-2" />}
                Exportar HTML
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </div>
    </motion.div>
  );
}

/* ─────────────── SKELETON CARD ─────────────── */

function SkeletonCard() {
  return (
    <div className="rounded-2xl bg-white border border-gray-100 overflow-hidden">
      <Skeleton className="h-48 w-full rounded-none" />
      <div className="p-5 space-y-3">
        <Skeleton className="h-5 w-20 rounded-full" />
        <Skeleton className="h-5 w-3/4" />
        <Skeleton className="h-4 w-1/3" />
        <Skeleton className="h-4 w-full" />
        <div className="flex gap-2 pt-2">
          <Skeleton className="h-9 flex-1 rounded-xl" />
          <Skeleton className="h-9 w-10 rounded-xl" />
        </div>
      </div>
    </div>
  );
}

/* ─────────────── EMPTY STATE ─────────────── */

function EmptyState() {
  const router = useRouter();

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5 }}
      className="flex flex-col items-center justify-center py-20 text-center"
    >
      <div className="relative mb-6">
        <div className="w-24 h-24 rounded-3xl bg-gradient-to-br from-[#183A6B]/10 to-[#244D89]/10 flex items-center justify-center">
          <Layers className="w-10 h-10 text-[#183A6B]" />
        </div>
        <div className="absolute -top-1 -right-1 w-8 h-8 rounded-xl bg-gradient-to-br from-amber-400 to-orange-400 flex items-center justify-center shadow-lg">
          <Sparkles className="w-4 h-4 text-white" />
        </div>
      </div>

      <h3 className="text-2xl font-bold text-[#0F172A] mb-2">
        Voce ainda nao criou nada
      </h3>
      <p className="text-[#5B6B84] mb-8 max-w-md leading-relaxed">
        Comece criando sua primeira landing page com IA.
        Em poucos minutos voce tera uma pagina profissional pronta para receber trafego.
      </p>

      <Button
        size="lg"
        className="rounded-2xl bg-gradient-to-r from-[#183A6B] to-[#244D89] hover:from-[#122C52] hover:to-[#183A6B] text-white shadow-lg shadow-[#183A6B]/25 hover:shadow-xl hover:shadow-[#183A6B]/30 transition-all px-8 h-12 text-base font-semibold"
        onClick={() => router.push('/')}
      >
        <Plus className="w-5 h-5 mr-2" />
        Criar agora
      </Button>

      {/* Quick start suggestions */}
      <div className="mt-12 grid grid-cols-1 sm:grid-cols-3 gap-3 max-w-xl">
        {[
          { icon: FileText, label: 'Landing Page', color: 'text-blue-500', bg: 'bg-blue-50' },
          { icon: Rocket, label: 'Funil Completo', color: 'text-purple-500', bg: 'bg-purple-50' },
          { icon: Target, label: 'Pagina de Captura', color: 'text-teal-500', bg: 'bg-teal-50' },
        ].map((item) => (
          <button
            key={item.label}
            onClick={() => router.push('/')}
            className="flex items-center gap-3 p-3 rounded-xl border border-gray-100 bg-white hover:bg-gray-50 hover:border-gray-200 transition-all text-left group/item"
          >
            <div className={`w-9 h-9 rounded-lg ${item.bg} flex items-center justify-center shrink-0`}>
              <item.icon className={`w-4.5 h-4.5 ${item.color}`} />
            </div>
            <div>
              <p className="text-sm font-medium text-[#0F172A] group-hover/item:text-[#183A6B] transition-colors">{item.label}</p>
              <p className="text-[11px] text-[#5B6B84]">Criar com IA</p>
            </div>
          </button>
        ))}
      </div>
    </motion.div>
  );
}

/* ─────────────── MAIN PAGE ─────────────── */

function CriacoesContent() {
  const router = useRouter();
  const [pages, setPages] = useState<PageRecord[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [activeType, setActiveType] = useState<FilterType>('all');
  const [activeStatus, setActiveStatus] = useState<StatusFilter>('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [publishingId, setPublishingId] = useState<number | null>(null);
  const [exportingId, setExportingId] = useState<number | null>(null);
  const searchInputRef = useRef<HTMLInputElement>(null);

  // Fetch pages
  const fetchPages = useCallback(async () => {
    try {
      const data = await pagesApiService.list();
      setPages(data);
    } catch {
      setPages([]);
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchPages();
    const unsub = resourceEvents.subscribe(['pages', 'assets'], () => {
      fetchPages();
    });
    return unsub;
  }, [fetchPages]);

  // Counts
  const typeCounts = useMemo(() => {
    const counts: Record<string, number> = { all: pages.length };
    for (const p of pages) {
      counts[p.type] = (counts[p.type] ?? 0) + 1;
    }
    return counts;
  }, [pages]);

  const statusCounts = useMemo(() => {
    const counts: Record<string, number> = { all: pages.length };
    for (const p of pages) {
      counts[p.status] = (counts[p.status] ?? 0) + 1;
    }
    return counts;
  }, [pages]);

  // Filter + search
  const filtered = useMemo(() => {
    let list = pages;
    if (activeType !== 'all') {
      list = list.filter((p) => p.type === activeType);
    }
    if (activeStatus !== 'all') {
      list = list.filter((p) => p.status === activeStatus);
    }
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      list = list.filter(
        (p) =>
          p.title.toLowerCase().includes(q) ||
          p.slug.toLowerCase().includes(q) ||
          p.type.toLowerCase().includes(q),
      );
    }
    // Sort: most recent first
    return [...list].sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());
  }, [pages, activeType, activeStatus, searchQuery]);

  // Most recent
  const mostRecentId = useMemo(() => {
    if (filtered.length === 0) return null;
    return filtered[0]?.id ?? null;
  }, [filtered]);

  // Publish
  const handlePublish = useCallback(async (page: PageRecord) => {
    setPublishingId(page.id);
    try {
      await pagesApiService.publish(page.id);
      toast.success(`"${page.title}" publicado com sucesso!`);
      resourceEvents.emit('pages', { action: 'updated', id: page.id });
    } catch (e) {
      toast.error(e instanceof Error ? e.message : 'Erro ao publicar');
    } finally {
      setPublishingId(null);
    }
  }, []);

  // Export
  const handleExport = useCallback(async (page: PageRecord) => {
    setExportingId(page.id);
    try {
      const result = await pagesApiService.export(page.id);
      window.open(result.download_url, '_blank');
      toast.success('HTML exportado!');
    } catch (e) {
      toast.error(e instanceof Error ? e.message : 'Erro ao exportar');
    } finally {
      setExportingId(null);
    }
  }, []);

  // Keyboard shortcut for search
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === 'k') {
        e.preventDefault();
        searchInputRef.current?.focus();
      }
    };
    document.addEventListener('keydown', handler);
    return () => document.removeEventListener('keydown', handler);
  }, []);

  return (
    <div className="min-h-screen bg-gradient-to-b from-[#F6F8FC] via-white to-[#F6F8FC]">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 sm:py-12">
        {/* Header */}
        <div className="mb-10">
          <Button
            variant="ghost"
            size="sm"
            onClick={() => router.push('/')}
            className="mb-4 text-[#5B6B84] hover:text-[#0F172A] -ml-2"
          >
            <ArrowLeft className="w-4 h-4 mr-1.5" />
            Voltar ao dashboard
          </Button>

          <div className="flex flex-col sm:flex-row sm:items-end sm:justify-between gap-4">
            <div>
              <h1 className="text-3xl sm:text-4xl font-extrabold text-[#0F172A] tracking-tight">
                Suas Criacoes
              </h1>
              <p className="text-base text-[#5B6B84] mt-2 max-w-lg">
                Tudo que voce criou com o Ximples. Seu portfolio de ativos digitais.
              </p>
            </div>

            <div className="flex items-center gap-3">
              {/* Search */}
              <div className="relative w-full sm:w-64">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[#5B6B84]" />
                <input
                  ref={searchInputRef}
                  type="text"
                  placeholder="Buscar criacoes..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full h-10 pl-9 pr-14 rounded-xl bg-white border border-gray-200 text-sm text-[#0F172A] placeholder:text-[#5B6B84]/60 focus:outline-none focus:ring-2 focus:ring-[#183A6B]/20 focus:border-[#183A6B] transition-all"
                />
                <kbd className="absolute right-3 top-1/2 -translate-y-1/2 hidden sm:inline-flex items-center gap-0.5 px-1.5 py-0.5 rounded bg-gray-100 text-[10px] text-[#5B6B84] font-mono">
                  ⌘K
                </kbd>
              </div>

              {/* New creation button */}
              <Button
                className="rounded-xl bg-gradient-to-r from-[#183A6B] to-[#244D89] hover:from-[#122C52] hover:to-[#183A6B] text-white shadow-md shadow-[#183A6B]/20 hover:shadow-lg hover:shadow-[#183A6B]/30 transition-all whitespace-nowrap"
                onClick={() => router.push('/')}
              >
                <Plus className="w-4 h-4 mr-1.5" />
                Nova criacao
              </Button>
            </div>
          </div>
        </div>

        {/* Type filter pills */}
        <div className="mb-4 overflow-x-auto scrollbar-hide">
          <div className="flex gap-2 pb-1">
            {TYPE_FILTERS.map((filter) => {
              const isActive = activeType === filter.value;
              const count = typeCounts[filter.value] ?? 0;
              const Icon = filter.icon;
              return (
                <button
                  key={filter.value}
                  onClick={() => setActiveType(filter.value)}
                  className={`
                    relative flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-medium whitespace-nowrap
                    transition-all duration-200 ease-out
                    ${
                      isActive
                        ? 'bg-[#183A6B] text-white shadow-md shadow-[#183A6B]/20'
                        : 'bg-white text-[#5B6B84] hover:bg-gray-50 hover:text-[#0F172A] border border-gray-200 hover:border-gray-300'
                    }
                  `}
                >
                  <Icon className="w-4 h-4" />
                  {filter.label}
                  {!isLoading && (
                    <span
                      className={`text-xs px-1.5 py-0.5 rounded-full font-semibold ${
                        isActive ? 'bg-white/20 text-white' : 'bg-gray-100 text-[#5B6B84]'
                      }`}
                    >
                      {count}
                    </span>
                  )}
                </button>
              );
            })}
          </div>
        </div>

        {/* Status filter pills */}
        <div className="mb-8 overflow-x-auto scrollbar-hide">
          <div className="flex gap-2 pb-1">
            {(
              [
                { value: 'all', label: 'Todos os status' },
                { value: 'published', label: 'Publicados' },
                { value: 'draft', label: 'Rascunhos' },
              ] as { value: StatusFilter; label: string }[]
            ).map((filter) => {
              const isActive = activeStatus === filter.value;
              const count = filter.value === 'all' ? pages.length : (statusCounts[filter.value] ?? 0);
              return (
                <button
                  key={filter.value}
                  onClick={() => setActiveStatus(filter.value)}
                  className={`
                    flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium whitespace-nowrap
                    transition-all duration-200 ease-out
                    ${
                      isActive
                        ? 'bg-[#0F172A] text-white'
                        : 'bg-gray-100 text-[#5B6B84] hover:bg-gray-200 hover:text-[#0F172A]'
                    }
                  `}
                >
                  {filter.label}
                  {!isLoading && (
                    <span
                      className={`text-[10px] px-1.5 py-0.5 rounded-full font-semibold ${
                        isActive ? 'bg-white/20 text-white' : 'bg-white text-[#5B6B84]'
                      }`}
                    >
                      {count}
                    </span>
                  )}
                </button>
              );
            })}
          </div>
        </div>

        {/* Stats bar */}
        {!isLoading && pages.length > 0 && (
          <div className="flex items-center gap-4 mb-6 text-sm text-[#5B6B84]">
            <span className="flex items-center gap-1.5">
              <TrendingUp className="w-4 h-4" />
              {filtered.length} criaca{filtered.length !== 1 ? 'oes' : 'o'}
              {activeType !== 'all' ? ` do tipo ${TYPE_CONFIG[activeType]?.label ?? activeType}` : ''}
            </span>
            {searchQuery && (
              <button
                onClick={() => setSearchQuery('')}
                className="flex items-center gap-1 text-[#183A6B] hover:underline"
              >
                <X className="w-3 h-3" />
                Limpar busca
              </button>
            )}
          </div>
        )}

        {/* Grid */}
        {isLoading ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {Array.from({ length: 6 }).map((_, i) => (
              <SkeletonCard key={i} />
            ))}
          </div>
        ) : pages.length === 0 ? (
          <EmptyState />
        ) : filtered.length === 0 ? (
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            className="flex flex-col items-center justify-center py-20 text-center"
          >
            <div className="w-16 h-16 rounded-2xl bg-gray-100 flex items-center justify-center mb-4">
              <Search className="w-7 h-7 text-[#5B6B84]" />
            </div>
            <h3 className="text-lg font-semibold text-[#0F172A] mb-1">Nenhuma criacao encontrada</h3>
            <p className="text-[#5B6B84] mb-4">
              Tente outro filtro ou termo de busca.
            </p>
            <Button
              variant="outline"
              size="sm"
              className="rounded-xl"
              onClick={() => {
                setSearchQuery('');
                setActiveType('all');
                setActiveStatus('all');
              }}
            >
              Limpar filtros
            </Button>
          </motion.div>
        ) : (
          <motion.div layout className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            <AnimatePresence mode="popLayout">
              {filtered.map((page) => (
                <CreationCard
                  key={page.id}
                  page={page}
                  featured={page.id === mostRecentId && activeType === 'all' && activeStatus === 'all' && !searchQuery}
                  onPublish={() => handlePublish(page)}
                  onExport={() => handleExport(page)}
                  isPublishing={publishingId === page.id}
                  isExporting={exportingId === page.id}
                />
              ))}
            </AnimatePresence>
          </motion.div>
        )}

        {/* Bottom CTA */}
        {!isLoading && filtered.length > 0 && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.5 }}
            className="mt-16 text-center"
          >
            <div className="inline-flex items-center gap-2 px-5 py-2.5 rounded-2xl bg-gradient-to-r from-[#183A6B]/5 to-[#244D89]/5 border border-[#183A6B]/10">
              <Zap className="w-4 h-4 text-[#183A6B]" />
              <span className="text-sm text-[#5B6B84]">
                Quer criar mais?{' '}
                <button
                  onClick={() => router.push('/')}
                  className="text-[#183A6B] font-semibold hover:underline inline-flex items-center gap-0.5"
                >
                  Crie uma nova pagina com IA
                  <ChevronRight className="w-3.5 h-3.5" />
                </button>
              </span>
            </div>
          </motion.div>
        )}
      </div>
    </div>
  );
}

export default function CriacoesPage() {
  return (
    <ProtectedRoute>
      <CriacoesContent />
    </ProtectedRoute>
  );
}

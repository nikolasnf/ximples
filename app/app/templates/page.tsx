'use client';

import { useEffect, useMemo, useRef, useState, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { ProtectedRoute } from '@/components/protected-route';
import { templatesService } from '@/services/templates.service';
import type { PageTemplate, TemplateCategory } from '@/types';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { motion, AnimatePresence } from 'framer-motion';
import {
  ArrowLeft,
  Eye,
  Loader2,
  Sparkles,
  PlayCircle,
  ShoppingCart,
  DollarSign,
  Mail,
  Download,
  Gift,
  BookOpen,
  Star,
  Tag,
  Video,
  Users,
  Calendar,
  Building2,
  Globe,
  FileText,
  Search,
  X,
  TrendingUp,
  Zap,
  Crown,
  ChevronRight,
  type LucideIcon,
} from 'lucide-react';

/* ─────────────── CONSTANTS ─────────────── */

const CATEGORIES: { value: TemplateCategory | 'all'; label: string; icon: LucideIcon }[] = [
  { value: 'all', label: 'Todos', icon: Sparkles },
  { value: 'vendas', label: 'Vendas', icon: DollarSign },
  { value: 'lead', label: 'Lead Magnet', icon: Mail },
  { value: 'produto', label: 'Produto Digital', icon: BookOpen },
  { value: 'webinar', label: 'Webinar', icon: Video },
  { value: 'institucional', label: 'Institucional', icon: Building2 },
];

const CATEGORY_CONFIG: Record<
  TemplateCategory,
  {
    gradient: string;
    accentColor: string;
    bgTint: string;
    icons: { main: LucideIcon; accents: LucideIcon[] };
    mockSections: string[];
  }
> = {
  vendas: {
    gradient: 'from-rose-500 via-red-500 to-orange-500',
    accentColor: '#EF4444',
    bgTint: 'bg-rose-50',
    icons: { main: PlayCircle, accents: [ShoppingCart, DollarSign, Star] },
    mockSections: ['hero-video', 'benefits', 'testimonials', 'pricing', 'cta'],
  },
  lead: {
    gradient: 'from-blue-500 via-indigo-500 to-violet-500',
    accentColor: '#6366F1',
    bgTint: 'bg-indigo-50',
    icons: { main: Mail, accents: [Download, Gift, Star] },
    mockSections: ['hero-form', 'benefits', 'social-proof', 'cta'],
  },
  produto: {
    gradient: 'from-violet-500 via-purple-500 to-fuchsia-500',
    accentColor: '#A855F7',
    bgTint: 'bg-purple-50',
    icons: { main: BookOpen, accents: [Tag, Star, ShoppingCart] },
    mockSections: ['hero-product', 'features', 'modules', 'pricing', 'cta'],
  },
  webinar: {
    gradient: 'from-cyan-500 via-sky-500 to-blue-500',
    accentColor: '#0EA5E9',
    bgTint: 'bg-sky-50',
    icons: { main: Video, accents: [Users, Calendar, Star] },
    mockSections: ['hero-event', 'speakers', 'agenda', 'register'],
  },
  institucional: {
    gradient: 'from-slate-600 via-slate-500 to-zinc-500',
    accentColor: '#64748B',
    bgTint: 'bg-slate-50',
    icons: { main: Building2, accents: [Globe, FileText, Star] },
    mockSections: ['hero-brand', 'about', 'services', 'contact'],
  },
};

/* ─────────────── MOCK LANDING PAGE PREVIEW ─────────────── */

function LandingPageMock({ category }: { category: TemplateCategory }) {
  const config = CATEGORY_CONFIG[category] ?? CATEGORY_CONFIG.institucional;
  const MainIcon = config.icons.main;

  return (
    <div className="w-full h-full bg-white rounded-sm overflow-hidden relative select-none pointer-events-none">
      {/* Browser chrome bar */}
      <div className="h-5 bg-gray-100 flex items-center gap-1 px-2 border-b border-gray-200">
        <div className="w-1.5 h-1.5 rounded-full bg-red-400" />
        <div className="w-1.5 h-1.5 rounded-full bg-yellow-400" />
        <div className="w-1.5 h-1.5 rounded-full bg-green-400" />
        <div className="ml-2 h-2.5 w-24 bg-gray-200 rounded-full" />
      </div>

      {/* Navigation */}
      <div className="h-5 px-3 flex items-center justify-between border-b border-gray-100">
        <div className="h-2 w-10 bg-gray-300 rounded" />
        <div className="flex gap-2">
          <div className="h-1.5 w-6 bg-gray-200 rounded" />
          <div className="h-1.5 w-6 bg-gray-200 rounded" />
          <div className="h-1.5 w-6 bg-gray-200 rounded" />
        </div>
      </div>

      {/* Hero Section */}
      <div className={`px-3 py-4 bg-gradient-to-br ${config.gradient} relative overflow-hidden`}>
        <div className="absolute inset-0 opacity-10">
          <div className="absolute top-1 right-2 w-12 h-12 rounded-full border-2 border-white/30" />
          <div className="absolute bottom-0 left-1 w-8 h-8 rounded-full border border-white/20" />
        </div>
        <div className="relative z-10 flex flex-col items-center text-center">
          <div className="w-6 h-6 rounded-lg bg-white/20 flex items-center justify-center mb-2">
            <MainIcon className="w-3.5 h-3.5 text-white" />
          </div>
          <div className="h-2 w-28 bg-white/90 rounded mb-1.5" />
          <div className="h-1.5 w-20 bg-white/50 rounded mb-2" />
          <div className="h-3 w-14 bg-white rounded-full" />
        </div>
      </div>

      {/* Content sections */}
      <div className="px-3 py-2 space-y-2">
        {/* Features grid */}
        <div className="grid grid-cols-3 gap-1.5">
          {[0, 1, 2].map((i) => (
            <div key={i} className="p-1.5 rounded bg-gray-50 border border-gray-100">
              <div
                className="w-3 h-3 rounded mb-1 opacity-20"
                style={{ backgroundColor: config.accentColor }}
              />
              <div className="h-1 w-full bg-gray-200 rounded mb-0.5" />
              <div className="h-1 w-3/4 bg-gray-100 rounded" />
            </div>
          ))}
        </div>

        {/* Social proof */}
        <div className="flex items-center gap-1 justify-center py-1">
          {[0, 1, 2, 3, 4].map((i) => (
            <div key={i} className="w-4 h-4 rounded-full bg-gray-200 -ml-1 first:ml-0 border border-white" />
          ))}
          <div className="h-1 w-8 bg-gray-200 rounded ml-1" />
        </div>

        {/* CTA */}
        <div className="flex flex-col items-center py-1">
          <div className="h-1.5 w-16 bg-gray-300 rounded mb-1" />
          <div
            className="h-3 w-20 rounded-full opacity-80"
            style={{ backgroundColor: config.accentColor }}
          />
        </div>
      </div>
    </div>
  );
}

/* ─────────────── TEMPLATE CARD ─────────────── */

function TemplateCard({
  template,
  onUse,
  onPreview,
  isUsing,
  featured,
}: {
  template: PageTemplate;
  onUse: () => void;
  onPreview: () => void;
  isUsing: boolean;
  featured?: boolean;
}) {
  const config = CATEGORY_CONFIG[template.category] ?? CATEGORY_CONFIG.institucional;

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
          Destaque
        </div>
      )}

      {/* Preview area */}
      <div className="relative h-52 overflow-hidden cursor-pointer" onClick={onPreview}>
        {template.preview_image ? (
          <>
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={template.preview_image}
              alt={template.name}
              className="w-full h-full object-cover object-top transition-transform duration-500 group-hover:scale-105"
              onError={(e) => {
                (e.currentTarget as HTMLImageElement).style.display = 'none';
                const fallback = e.currentTarget.nextElementSibling as HTMLElement;
                if (fallback) fallback.style.display = 'flex';
              }}
            />
            <div className="hidden w-full h-full">
              <LandingPageMock category={template.category} />
            </div>
          </>
        ) : (
          <div className="w-full h-full p-2 bg-gray-50">
            <LandingPageMock category={template.category} />
          </div>
        )}

        {/* Hover overlay */}
        <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-black/0 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300 flex items-end justify-center pb-4">
          <span className="flex items-center gap-1.5 text-white text-sm font-medium bg-white/20 backdrop-blur-sm px-3 py-1.5 rounded-full border border-white/30">
            <Eye className="w-3.5 h-3.5" />
            Visualizar
          </span>
        </div>
      </div>

      {/* Content */}
      <div className="p-5">
        {/* Category badge */}
        <div className="flex items-center gap-2 mb-3">
          <span
            className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[11px] font-semibold uppercase tracking-wide ${config.bgTint}`}
            style={{ color: config.accentColor }}
          >
            <span className={`w-1.5 h-1.5 rounded-full bg-gradient-to-r ${config.gradient}`} />
            {template.category}
          </span>
        </div>

        {/* Title & Description */}
        <h3 className="font-bold text-[#0F172A] text-base mb-1.5 line-clamp-1 group-hover:text-[#183A6B] transition-colors">
          {template.name}
        </h3>
        <p className="text-sm text-[#5B6B84] mb-5 line-clamp-2 leading-relaxed">
          {template.description}
        </p>

        {/* Actions */}
        <div className="flex gap-2">
          <Button
            variant="outline"
            size="sm"
            className="flex-1 rounded-xl border-gray-200 text-[#5B6B84] hover:text-[#0F172A] hover:border-gray-300 hover:bg-gray-50 transition-all"
            onClick={onPreview}
          >
            <Eye className="w-4 h-4 mr-1.5" />
            Visualizar
          </Button>
          <Button
            size="sm"
            className="flex-1 rounded-xl bg-gradient-to-r from-[#183A6B] to-[#244D89] hover:from-[#122C52] hover:to-[#183A6B] text-white shadow-md shadow-[#183A6B]/20 hover:shadow-lg hover:shadow-[#183A6B]/30 transition-all"
            onClick={onUse}
            disabled={isUsing}
          >
            {isUsing ? (
              <Loader2 className="w-4 h-4 mr-1.5 animate-spin" />
            ) : (
              <Sparkles className="w-4 h-4 mr-1.5" />
            )}
            Usar template
          </Button>
        </div>
      </div>
    </motion.div>
  );
}

/* ─────────────── SKELETON CARD ─────────────── */

function SkeletonCard() {
  return (
    <div className="rounded-2xl bg-white border border-gray-100 overflow-hidden">
      <Skeleton className="h-52 w-full rounded-none" />
      <div className="p-5 space-y-3">
        <Skeleton className="h-5 w-20 rounded-full" />
        <Skeleton className="h-5 w-3/4" />
        <Skeleton className="h-4 w-full" />
        <Skeleton className="h-4 w-2/3" />
        <div className="flex gap-2 pt-2">
          <Skeleton className="h-9 flex-1 rounded-xl" />
          <Skeleton className="h-9 flex-1 rounded-xl" />
        </div>
      </div>
    </div>
  );
}

/* ─────────────── MAIN PAGE ─────────────── */

function TemplatesGalleryContent() {
  const router = useRouter();
  const [templates, setTemplates] = useState<PageTemplate[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [activeCategory, setActiveCategory] = useState<TemplateCategory | 'all'>('all');
  const [usingId, setUsingId] = useState<number | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const searchInputRef = useRef<HTMLInputElement>(null);

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

  // Category counts
  const categoryCounts = useMemo(() => {
    const counts: Record<string, number> = { all: templates.length };
    for (const t of templates) {
      counts[t.category] = (counts[t.category] ?? 0) + 1;
    }
    return counts;
  }, [templates]);

  // Filtered + searched
  const filtered = useMemo(() => {
    let list = templates;
    if (activeCategory !== 'all') {
      list = list.filter((t) => t.category === activeCategory);
    }
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      list = list.filter(
        (t) =>
          t.name.toLowerCase().includes(q) ||
          t.description?.toLowerCase().includes(q) ||
          t.category.toLowerCase().includes(q),
      );
    }
    return list;
  }, [templates, activeCategory, searchQuery]);

  // Featured = first template (or first with most common category)
  const featuredId = useMemo(() => {
    if (templates.length === 0) return null;
    return templates[0]?.id ?? null;
  }, [templates]);

  const handleUseTemplate = useCallback(
    (template: PageTemplate) => {
      setUsingId(template.id);
      router.push(`/?template=${template.id}`);
    },
    [router],
  );

  const handlePreview = useCallback(
    (template: PageTemplate) => {
      window.open(`/templates/${template.id}`, '_blank');
    },
    [],
  );

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
                Templates
              </h1>
              <p className="text-base text-[#5B6B84] mt-2 max-w-lg">
                Escolha um modelo profissional, personalize com IA e publique em minutos.
              </p>
            </div>

            {/* Search */}
            <div className="relative w-full sm:w-72">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[#5B6B84]" />
              <input
                ref={searchInputRef}
                type="text"
                placeholder="Buscar templates..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full h-10 pl-9 pr-14 rounded-xl bg-white border border-gray-200 text-sm text-[#0F172A] placeholder:text-[#5B6B84]/60 focus:outline-none focus:ring-2 focus:ring-[#183A6B]/20 focus:border-[#183A6B] transition-all"
              />
              <kbd className="absolute right-3 top-1/2 -translate-y-1/2 hidden sm:inline-flex items-center gap-0.5 px-1.5 py-0.5 rounded bg-gray-100 text-[10px] text-[#5B6B84] font-mono">
                ⌘K
              </kbd>
            </div>
          </div>
        </div>

        {/* Category pills */}
        <div className="mb-8 overflow-x-auto scrollbar-hide">
          <div className="flex gap-2 pb-1">
            {CATEGORIES.map((cat) => {
              const isActive = activeCategory === cat.value;
              const count = categoryCounts[cat.value] ?? 0;
              const Icon = cat.icon;
              return (
                <button
                  key={cat.value}
                  onClick={() => setActiveCategory(cat.value)}
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
                  {cat.label}
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

        {/* Stats bar */}
        {!isLoading && (
          <div className="flex items-center gap-4 mb-6 text-sm text-[#5B6B84]">
            <span className="flex items-center gap-1.5">
              <TrendingUp className="w-4 h-4" />
              {filtered.length} template{filtered.length !== 1 ? 's' : ''}
              {activeCategory !== 'all' ? ` em ${activeCategory}` : ' disponíveis'}
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
        ) : filtered.length === 0 ? (
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            className="flex flex-col items-center justify-center py-20 text-center"
          >
            <div className="w-16 h-16 rounded-2xl bg-gray-100 flex items-center justify-center mb-4">
              <Search className="w-7 h-7 text-[#5B6B84]" />
            </div>
            <h3 className="text-lg font-semibold text-[#0F172A] mb-1">Nenhum template encontrado</h3>
            <p className="text-[#5B6B84] mb-4">
              Tente outra categoria ou termo de busca.
            </p>
            <Button
              variant="outline"
              size="sm"
              className="rounded-xl"
              onClick={() => {
                setSearchQuery('');
                setActiveCategory('all');
              }}
            >
              Limpar filtros
            </Button>
          </motion.div>
        ) : (
          <motion.div layout className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            <AnimatePresence mode="popLayout">
              {filtered.map((template) => (
                <TemplateCard
                  key={template.id}
                  template={template}
                  onUse={() => handleUseTemplate(template)}
                  onPreview={() => handlePreview(template)}
                  isUsing={usingId === template.id}
                  featured={template.id === featuredId && activeCategory === 'all' && !searchQuery}
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
                Não encontrou o ideal?{' '}
                <button
                  onClick={() => router.push('/')}
                  className="text-[#183A6B] font-semibold hover:underline inline-flex items-center gap-0.5"
                >
                  Crie do zero com IA
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

export default function TemplatesGalleryPage() {
  return (
    <ProtectedRoute>
      <TemplatesGalleryContent />
    </ProtectedRoute>
  );
}

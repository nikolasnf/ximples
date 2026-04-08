'use client';

import { useEffect, useMemo, useRef, useState, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { ProtectedRoute } from '@/components/protected-route';
import {
  campaignsService,
  renderMessagePreview,
  type Campaign,
  type CampaignStatus,
} from '@/services/campaigns.service';
import { useResourceList } from '@/hooks/use-resource-list';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { motion, AnimatePresence } from 'framer-motion';
import { toast } from 'sonner';
import { resourceEvents } from '@/lib/resource-events';
import {
  ArrowLeft,
  Plus,
  Loader2,
  Send,
  Sparkles,
  Search,
  X,
  TrendingUp,
  Zap,
  ChevronRight,
  Crown,
  Pencil,
  Eye,
  Copy,
  MoreHorizontal,
  Pause,
  Play,
  BarChart3,
  MessageCircle,
  CheckCheck,
  AlertTriangle,
  Clock,
  Users,
  Megaphone,
  Target,
  XCircle,
  ArrowUpRight,
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

type StatusFilter = 'all' | CampaignStatus;
type SortOption = 'recent' | 'most_sent';

/* ─────────────── CONSTANTS ─────────────── */

const STATUS_CONFIG: Record<
  CampaignStatus,
  { label: string; className: string; dotColor: string; icon: LucideIcon }
> = {
  draft: {
    label: 'Rascunho',
    className: 'bg-gray-50 text-gray-600 border-gray-200',
    dotColor: 'bg-gray-400',
    icon: Pencil,
  },
  scheduled: {
    label: 'Agendada',
    className: 'bg-blue-50 text-blue-700 border-blue-200',
    dotColor: 'bg-blue-500',
    icon: Clock,
  },
  sending: {
    label: 'Enviando',
    className: 'bg-amber-50 text-amber-700 border-amber-200',
    dotColor: 'bg-amber-500',
    icon: Send,
  },
  completed: {
    label: 'Concluida',
    className: 'bg-emerald-50 text-emerald-700 border-emerald-200',
    dotColor: 'bg-emerald-500',
    icon: CheckCheck,
  },
  failed: {
    label: 'Falhou',
    className: 'bg-red-50 text-red-700 border-red-200',
    dotColor: 'bg-red-500',
    icon: XCircle,
  },
};

const STATUS_FILTERS: { value: StatusFilter; label: string }[] = [
  { value: 'all', label: 'Todos' },
  { value: 'draft', label: 'Rascunho' },
  { value: 'sending', label: 'Enviando' },
  { value: 'completed', label: 'Concluidas' },
  { value: 'scheduled', label: 'Agendadas' },
  { value: 'failed', label: 'Falhas' },
];

/* ─────────────── KPI CARD ─────────────── */

function KpiCard({
  icon: Icon,
  label,
  value,
  suffix,
  trend,
  gradient,
}: {
  icon: LucideIcon;
  label: string;
  value: string | number;
  suffix?: string;
  trend?: string;
  gradient: string;
}) {
  return (
    <div className="relative overflow-hidden rounded-2xl bg-white border border-gray-100 p-5 shadow-sm hover:shadow-md transition-shadow">
      <div className="flex items-start justify-between">
        <div>
          <p className="text-xs font-medium text-[#5B6B84] uppercase tracking-wide mb-1">{label}</p>
          <div className="flex items-baseline gap-1">
            <span className="text-2xl font-bold text-[#0F172A]">{value}</span>
            {suffix && <span className="text-sm font-medium text-[#5B6B84]">{suffix}</span>}
          </div>
          {trend && (
            <p className="text-[11px] font-medium text-emerald-600 mt-1 flex items-center gap-0.5">
              <TrendingUp className="w-3 h-3" />
              {trend}
            </p>
          )}
        </div>
        <div className={`w-10 h-10 rounded-xl bg-gradient-to-br ${gradient} flex items-center justify-center shrink-0`}>
          <Icon className="w-5 h-5 text-white" />
        </div>
      </div>
      {/* Subtle background decoration */}
      <div className={`absolute -bottom-4 -right-4 w-20 h-20 rounded-full bg-gradient-to-br ${gradient} opacity-[0.06]`} />
    </div>
  );
}

/* ─────────────── METRICS BAR ─────────────── */

function MetricsBar({
  sent,
  delivered,
  read,
  failed,
  total,
}: {
  sent: number;
  delivered: number;
  read: number;
  failed: number;
  total: number;
}) {
  if (total === 0) return null;

  const pctSent = Math.round((sent / total) * 100);
  const pctFailed = Math.round((failed / total) * 100);
  const pctDelivered = total > 0 ? Math.round(((sent - failed) / total) * 100) : 0;

  return (
    <div className="space-y-2">
      {/* Bar */}
      <div className="h-2 w-full bg-gray-100 rounded-full overflow-hidden flex">
        {pctDelivered > 0 && (
          <div
            className="h-full bg-emerald-500 transition-all duration-500"
            style={{ width: `${pctDelivered}%` }}
          />
        )}
        {pctFailed > 0 && (
          <div
            className="h-full bg-red-400 transition-all duration-500"
            style={{ width: `${pctFailed}%` }}
          />
        )}
      </div>

      {/* Labels */}
      <div className="flex items-center gap-4 text-[11px] text-[#5B6B84]">
        <span className="flex items-center gap-1">
          <span className="w-2 h-2 rounded-full bg-emerald-500" />
          Enviadas {sent}
        </span>
        <span className="flex items-center gap-1">
          <span className="w-2 h-2 rounded-full bg-red-400" />
          Falhas {failed}
        </span>
        <span className="ml-auto font-medium text-[#0F172A]">
          {pctSent}%
        </span>
      </div>
    </div>
  );
}

/* ─────────────── CAMPAIGN CARD ─────────────── */

function CampaignCard({
  campaign,
  featured,
  onSend,
  onDuplicate,
  isSending,
  isHighlighted,
}: {
  campaign: Campaign;
  featured?: boolean;
  onSend: () => void;
  onDuplicate: () => void;
  isSending: boolean;
  isHighlighted?: boolean;
}) {
  const router = useRouter();
  const config = STATUS_CONFIG[campaign.status] ?? STATUS_CONFIG.draft;
  const StatusIcon = config.icon;

  const formattedDate = new Date(campaign.created_at).toLocaleDateString('pt-BR', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
  });

  const isActive = campaign.status === 'sending';
  const hasHighFailRate = campaign.total_contacts > 0 && campaign.failed_count / campaign.total_contacts > 0.3;
  const isHighPerformance =
    campaign.status === 'completed' &&
    campaign.total_contacts > 0 &&
    campaign.failed_count / campaign.total_contacts < 0.05;

  const canSend = ['draft', 'scheduled', 'failed'].includes(campaign.status);

  // Message preview
  const messagePreview = campaign.message_template
    ? renderMessagePreview(campaign.message_template, {
        name: 'Cliente',
        link: 'ximpl.es/...',
      })
    : '';

  return (
    <motion.div
      layout
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -10, scale: 0.95 }}
      transition={{ duration: 0.3, ease: 'easeOut' }}
      className={`group relative rounded-2xl bg-white border overflow-hidden
        shadow-sm hover:shadow-xl hover:shadow-gray-200/50
        transition-all duration-300 ease-out
        hover:-translate-y-1 cursor-pointer
        ${isActive ? 'border-amber-200 ring-1 ring-amber-100' : 'border-gray-100'}
        ${isHighlighted ? 'ring-2 ring-blue-400/50 ring-offset-2' : ''}
        ${featured ? 'ring-2 ring-amber-400/50 ring-offset-2' : ''}
      `}
      onClick={() => router.push(`/campaigns/${campaign.id}`)}
    >
      {/* Top bar accent */}
      <div
        className={`h-1 w-full ${
          isActive
            ? 'bg-gradient-to-r from-amber-400 via-amber-500 to-orange-400'
            : campaign.status === 'completed'
              ? 'bg-gradient-to-r from-emerald-400 to-emerald-500'
              : campaign.status === 'failed'
                ? 'bg-gradient-to-r from-red-400 to-red-500'
                : 'bg-gradient-to-r from-gray-200 to-gray-300'
        }`}
      />

      {/* Active pulse indicator */}
      {isActive && (
        <div className="absolute top-4 right-4 z-10">
          <span className="relative flex h-3 w-3">
            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-amber-400 opacity-75" />
            <span className="relative inline-flex rounded-full h-3 w-3 bg-amber-500" />
          </span>
        </div>
      )}

      {/* Featured badge */}
      {featured && !isActive && (
        <div className="absolute top-4 right-4 z-10 flex items-center gap-1 px-2 py-0.5 rounded-full bg-gradient-to-r from-amber-400 to-orange-400 text-white text-[10px] font-bold uppercase tracking-wider shadow-lg">
          <Crown className="w-3 h-3" />
          Recente
        </div>
      )}

      <div className="p-5">
        {/* Header */}
        <div className="flex items-start justify-between mb-4">
          <div className="flex-1 min-w-0">
            {/* Status badge */}
            <div className="flex items-center gap-2 mb-2">
              <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-semibold border ${config.className}`}>
                <span className={`w-1.5 h-1.5 rounded-full ${config.dotColor}`} />
                {config.label}
              </span>

              {isHighPerformance && (
                <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-emerald-50 text-emerald-700 text-[10px] font-bold border border-emerald-200">
                  <TrendingUp className="w-3 h-3" />
                  Alta performance
                </span>
              )}

              {hasHighFailRate && (
                <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-red-50 text-red-600 text-[10px] font-bold border border-red-200">
                  <AlertTriangle className="w-3 h-3" />
                  Taxa de falha alta
                </span>
              )}
            </div>

            {/* Name */}
            <h3 className="font-bold text-[#0F172A] text-base mb-1 line-clamp-1 group-hover:text-[#183A6B] transition-colors">
              {campaign.name}
            </h3>

            {/* Meta info */}
            <div className="flex items-center flex-wrap gap-x-3 gap-y-1 text-xs text-[#5B6B84]">
              {campaign.list && (
                <span className="flex items-center gap-1">
                  <Users className="w-3 h-3" />
                  {campaign.list.name}
                </span>
              )}
              <span className="flex items-center gap-1">
                <MessageCircle className="w-3 h-3" />
                {campaign.total_contacts} contatos
              </span>
              <span className="flex items-center gap-1">
                <Clock className="w-3 h-3" />
                {formattedDate}
              </span>
            </div>
          </div>
        </div>

        {/* Metrics bar */}
        {campaign.total_contacts > 0 && (
          <div className="mb-4">
            <MetricsBar
              sent={campaign.sent_count}
              delivered={campaign.sent_count - campaign.failed_count}
              read={0}
              failed={campaign.failed_count}
              total={campaign.total_contacts}
            />
          </div>
        )}

        {/* Message preview (on hover) */}
        {messagePreview && (
          <div className="mb-4 max-h-0 opacity-0 group-hover:max-h-24 group-hover:opacity-100 transition-all duration-300 overflow-hidden">
            <div className="p-3 rounded-xl bg-[#DCF8C6] border border-[#C5E1A5] text-xs text-[#1B3A1B] leading-relaxed line-clamp-3 relative">
              <div className="absolute top-1 right-2 text-[9px] text-[#6B8E6B] font-medium">Preview</div>
              {messagePreview}
            </div>
          </div>
        )}

        {/* Stats row */}
        <div className="grid grid-cols-3 gap-2 mb-4">
          <div className="text-center p-2 rounded-lg bg-gray-50">
            <p className="text-lg font-bold text-[#0F172A]">{campaign.sent_count}</p>
            <p className="text-[10px] text-[#5B6B84] font-medium">Enviadas</p>
          </div>
          <div className="text-center p-2 rounded-lg bg-gray-50">
            <p className="text-lg font-bold text-emerald-600">{campaign.sent_count - campaign.failed_count}</p>
            <p className="text-[10px] text-[#5B6B84] font-medium">Entregues</p>
          </div>
          <div className="text-center p-2 rounded-lg bg-gray-50">
            <p className={`text-lg font-bold ${campaign.failed_count > 0 ? 'text-red-500' : 'text-[#0F172A]'}`}>
              {campaign.failed_count}
            </p>
            <p className="text-[10px] text-[#5B6B84] font-medium">Falhas</p>
          </div>
        </div>

        {/* Actions */}
        <div className="flex gap-2" onClick={(e) => e.stopPropagation()}>
          {canSend ? (
            <Button
              size="sm"
              className="flex-1 rounded-xl bg-gradient-to-r from-emerald-500 to-emerald-600 hover:from-emerald-600 hover:to-emerald-700 text-white shadow-md shadow-emerald-500/20 hover:shadow-lg hover:shadow-emerald-500/30 transition-all"
              onClick={onSend}
              disabled={isSending}
            >
              {isSending ? (
                <Loader2 className="w-4 h-4 mr-1.5 animate-spin" />
              ) : (
                <Play className="w-4 h-4 mr-1.5" />
              )}
              Enviar
            </Button>
          ) : (
            <Button
              size="sm"
              className="flex-1 rounded-xl bg-gradient-to-r from-[#183A6B] to-[#244D89] hover:from-[#122C52] hover:to-[#183A6B] text-white shadow-md shadow-[#183A6B]/20 hover:shadow-lg hover:shadow-[#183A6B]/30 transition-all"
              onClick={() => router.push(`/campaigns/${campaign.id}`)}
            >
              <BarChart3 className="w-4 h-4 mr-1.5" />
              Ver detalhes
            </Button>
          )}

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
              <DropdownMenuItem onClick={() => router.push(`/campaigns/${campaign.id}`)}>
                <Eye className="w-4 h-4 mr-2" />
                Ver detalhes
              </DropdownMenuItem>
              {campaign.status === 'completed' && (
                <DropdownMenuItem onClick={() => router.push(`/campaigns/${campaign.id}/analytics`)}>
                  <BarChart3 className="w-4 h-4 mr-2" />
                  Analytics
                </DropdownMenuItem>
              )}
              <DropdownMenuItem onClick={onDuplicate}>
                <Copy className="w-4 h-4 mr-2" />
                Duplicar
              </DropdownMenuItem>
              {campaign.status === 'draft' && (
                <>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem onClick={() => router.push(`/campaigns/${campaign.id}`)}>
                    <Pencil className="w-4 h-4 mr-2" />
                    Editar
                  </DropdownMenuItem>
                </>
              )}
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
      <div className="h-1 bg-gray-200" />
      <div className="p-5 space-y-4">
        <div className="flex gap-2">
          <Skeleton className="h-6 w-20 rounded-full" />
        </div>
        <Skeleton className="h-5 w-3/4" />
        <Skeleton className="h-3 w-full" />
        <Skeleton className="h-2 w-full rounded-full" />
        <div className="grid grid-cols-3 gap-2">
          <Skeleton className="h-14 rounded-lg" />
          <Skeleton className="h-14 rounded-lg" />
          <Skeleton className="h-14 rounded-lg" />
        </div>
        <div className="flex gap-2">
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
        <div className="w-24 h-24 rounded-3xl bg-gradient-to-br from-emerald-500/10 to-teal-500/10 flex items-center justify-center">
          <Megaphone className="w-10 h-10 text-emerald-600" />
        </div>
        <div className="absolute -top-1 -right-1 w-8 h-8 rounded-xl bg-gradient-to-br from-amber-400 to-orange-400 flex items-center justify-center shadow-lg">
          <Sparkles className="w-4 h-4 text-white" />
        </div>
      </div>

      <h3 className="text-2xl font-bold text-[#0F172A] mb-2">
        Nenhuma campanha criada ainda
      </h3>
      <p className="text-[#5B6B84] mb-8 max-w-md leading-relaxed">
        Crie sua primeira campanha e comece a vender pelo WhatsApp.
        Envie mensagens personalizadas em escala para sua lista de contatos.
      </p>

      <Button
        size="lg"
        className="rounded-2xl bg-gradient-to-r from-emerald-500 to-emerald-600 hover:from-emerald-600 hover:to-emerald-700 text-white shadow-lg shadow-emerald-500/25 hover:shadow-xl hover:shadow-emerald-500/30 transition-all px-8 h-12 text-base font-semibold"
        onClick={() => router.push('/campaigns/new')}
      >
        <Plus className="w-5 h-5 mr-2" />
        Criar campanha
      </Button>

      {/* Feature highlights */}
      <div className="mt-12 grid grid-cols-1 sm:grid-cols-3 gap-3 max-w-xl">
        {[
          { icon: Send, label: 'Envio em massa', desc: 'Para toda a lista', color: 'text-blue-500', bg: 'bg-blue-50' },
          { icon: Target, label: 'Personalizacao', desc: 'Mensagens unicas', color: 'text-purple-500', bg: 'bg-purple-50' },
          { icon: BarChart3, label: 'Analytics', desc: 'Acompanhe resultados', color: 'text-teal-500', bg: 'bg-teal-50' },
        ].map((item) => (
          <div
            key={item.label}
            className="flex items-center gap-3 p-3 rounded-xl border border-gray-100 bg-white text-left"
          >
            <div className={`w-9 h-9 rounded-lg ${item.bg} flex items-center justify-center shrink-0`}>
              <item.icon className={`w-4 h-4 ${item.color}`} />
            </div>
            <div>
              <p className="text-sm font-medium text-[#0F172A]">{item.label}</p>
              <p className="text-[11px] text-[#5B6B84]">{item.desc}</p>
            </div>
          </div>
        ))}
      </div>
    </motion.div>
  );
}

/* ─────────────── MAIN PAGE ─────────────── */

function CampaignsContent() {
  const router = useRouter();
  const [activeStatus, setActiveStatus] = useState<StatusFilter>('all');
  const [sortBy, setSortBy] = useState<SortOption>('recent');
  const [searchQuery, setSearchQuery] = useState('');
  const [sendingId, setSendingId] = useState<number | null>(null);
  const searchInputRef = useRef<HTMLInputElement>(null);

  const {
    items: campaigns,
    isLoading,
    highlightedIds,
    refresh,
  } = useResourceList<Campaign>({
    resource: 'campaigns',
    fetcher: () => campaignsService.list(),
  });

  // KPI aggregates
  const kpis = useMemo(() => {
    const totalSent = campaigns.reduce((acc, c) => acc + c.sent_count, 0);
    const totalContacts = campaigns.reduce((acc, c) => acc + c.total_contacts, 0);
    const totalFailed = campaigns.reduce((acc, c) => acc + c.failed_count, 0);
    const totalDelivered = totalSent - totalFailed;
    const deliveryRate = totalSent > 0 ? Math.round((totalDelivered / totalSent) * 100) : 0;
    const activeCampaigns = campaigns.filter((c) => c.status === 'sending').length;

    return { totalSent, totalContacts, totalFailed, totalDelivered, deliveryRate, activeCampaigns };
  }, [campaigns]);

  // Status counts
  const statusCounts = useMemo(() => {
    const counts: Record<string, number> = { all: campaigns.length };
    for (const c of campaigns) {
      counts[c.status] = (counts[c.status] ?? 0) + 1;
    }
    return counts;
  }, [campaigns]);

  // Filter + search + sort
  const filtered = useMemo(() => {
    let list = campaigns;
    if (activeStatus !== 'all') {
      list = list.filter((c) => c.status === activeStatus);
    }
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      list = list.filter(
        (c) =>
          c.name.toLowerCase().includes(q) ||
          c.list?.name?.toLowerCase().includes(q) ||
          c.status.toLowerCase().includes(q),
      );
    }
    // Sort
    return [...list].sort((a, b) => {
      if (sortBy === 'most_sent') return b.sent_count - a.sent_count;
      return new Date(b.created_at).getTime() - new Date(a.created_at).getTime();
    });
  }, [campaigns, activeStatus, searchQuery, sortBy]);

  // Most recent
  const mostRecentId = useMemo(() => {
    if (campaigns.length === 0) return null;
    const sorted = [...campaigns].sort(
      (a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime(),
    );
    return sorted[0]?.id ?? null;
  }, [campaigns]);

  // Send campaign
  const handleSend = useCallback(async (campaign: Campaign) => {
    setSendingId(campaign.id);
    try {
      await campaignsService.send(campaign.id);
      toast.success(`Campanha "${campaign.name}" enviada!`);
      resourceEvents.emit('campaigns', { action: 'updated', id: campaign.id });
    } catch (e) {
      toast.error(e instanceof Error ? e.message : 'Erro ao enviar campanha');
    } finally {
      setSendingId(null);
    }
  }, []);

  // Duplicate campaign
  const handleDuplicate = useCallback(
    async (campaign: Campaign) => {
      try {
        await campaignsService.create({
          name: `${campaign.name} (copia)`,
          list_id: campaign.list_id!,
          message_template: campaign.message_template,
          landing_page_id: campaign.landing_page_id ?? undefined,
        });
        toast.success('Campanha duplicada!');
        resourceEvents.emit('campaigns', { action: 'created' });
      } catch (e) {
        toast.error(e instanceof Error ? e.message : 'Erro ao duplicar');
      }
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

  // Auto-refresh while any campaign is sending
  useEffect(() => {
    const hasSending = campaigns.some((c) => c.status === 'sending');
    if (!hasSending) return;
    const interval = setInterval(() => refresh(), 5000);
    return () => clearInterval(interval);
  }, [campaigns, refresh]);

  return (
    <div className="min-h-screen bg-gradient-to-b from-[#F6F8FC] via-white to-[#F6F8FC]">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 sm:py-12">
        {/* Header */}
        <div className="mb-8">
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
                Campanhas de WhatsApp
              </h1>
              <p className="text-base text-[#5B6B84] mt-2 max-w-lg">
                Envie mensagens e gere resultados em escala
              </p>
            </div>

            <div className="flex items-center gap-3">
              {/* Search */}
              <div className="relative w-full sm:w-64">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[#5B6B84]" />
                <input
                  ref={searchInputRef}
                  type="text"
                  placeholder="Buscar campanhas..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full h-10 pl-9 pr-14 rounded-xl bg-white border border-gray-200 text-sm text-[#0F172A] placeholder:text-[#5B6B84]/60 focus:outline-none focus:ring-2 focus:ring-[#183A6B]/20 focus:border-[#183A6B] transition-all"
                />
                <kbd className="absolute right-3 top-1/2 -translate-y-1/2 hidden sm:inline-flex items-center gap-0.5 px-1.5 py-0.5 rounded bg-gray-100 text-[10px] text-[#5B6B84] font-mono">
                  ⌘K
                </kbd>
              </div>

              {/* New campaign */}
              <Button
                className="rounded-xl bg-gradient-to-r from-emerald-500 to-emerald-600 hover:from-emerald-600 hover:to-emerald-700 text-white shadow-md shadow-emerald-500/20 hover:shadow-lg hover:shadow-emerald-500/30 transition-all whitespace-nowrap"
                onClick={() => router.push('/campaigns/new')}
              >
                <Plus className="w-4 h-4 mr-1.5" />
                Nova campanha
              </Button>
            </div>
          </div>
        </div>

        {/* KPIs */}
        {!isLoading && campaigns.length > 0 && (
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-8"
          >
            <KpiCard
              icon={Send}
              label="Mensagens enviadas"
              value={kpis.totalSent.toLocaleString('pt-BR')}
              gradient="from-blue-500 to-indigo-600"
            />
            <KpiCard
              icon={CheckCheck}
              label="Taxa de entrega"
              value={kpis.deliveryRate}
              suffix="%"
              gradient="from-emerald-500 to-teal-600"
            />
            <KpiCard
              icon={Users}
              label="Contatos alcancados"
              value={kpis.totalDelivered.toLocaleString('pt-BR')}
              gradient="from-violet-500 to-purple-600"
            />
            <KpiCard
              icon={Megaphone}
              label="Campanhas ativas"
              value={kpis.activeCampaigns}
              gradient="from-amber-500 to-orange-600"
            />
          </motion.div>
        )}

        {/* Status filter pills */}
        <div className="mb-4 overflow-x-auto scrollbar-hide">
          <div className="flex gap-2 pb-1">
            {STATUS_FILTERS.map((filter) => {
              const isActive = activeStatus === filter.value;
              const count = statusCounts[filter.value] ?? 0;
              return (
                <button
                  key={filter.value}
                  onClick={() => setActiveStatus(filter.value)}
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

        {/* Sort + stats */}
        {!isLoading && campaigns.length > 0 && (
          <div className="flex items-center justify-between mb-6">
            <span className="flex items-center gap-1.5 text-sm text-[#5B6B84]">
              <TrendingUp className="w-4 h-4" />
              {filtered.length} campanha{filtered.length !== 1 ? 's' : ''}
              {searchQuery && (
                <button
                  onClick={() => setSearchQuery('')}
                  className="flex items-center gap-1 ml-2 text-[#183A6B] hover:underline"
                >
                  <X className="w-3 h-3" />
                  Limpar busca
                </button>
              )}
            </span>

            <div className="flex gap-1">
              <button
                onClick={() => setSortBy('recent')}
                className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-all ${
                  sortBy === 'recent'
                    ? 'bg-[#0F172A] text-white'
                    : 'bg-gray-100 text-[#5B6B84] hover:bg-gray-200'
                }`}
              >
                Mais recentes
              </button>
              <button
                onClick={() => setSortBy('most_sent')}
                className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-all ${
                  sortBy === 'most_sent'
                    ? 'bg-[#0F172A] text-white'
                    : 'bg-gray-100 text-[#5B6B84] hover:bg-gray-200'
                }`}
              >
                Mais enviadas
              </button>
            </div>
          </div>
        )}

        {/* Grid */}
        {isLoading ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {Array.from({ length: 6 }).map((_, i) => (
              <SkeletonCard key={i} />
            ))}
          </div>
        ) : campaigns.length === 0 ? (
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
            <h3 className="text-lg font-semibold text-[#0F172A] mb-1">Nenhuma campanha encontrada</h3>
            <p className="text-[#5B6B84] mb-4">Tente outro filtro ou termo de busca.</p>
            <Button
              variant="outline"
              size="sm"
              className="rounded-xl"
              onClick={() => {
                setSearchQuery('');
                setActiveStatus('all');
              }}
            >
              Limpar filtros
            </Button>
          </motion.div>
        ) : (
          <motion.div layout className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            <AnimatePresence mode="popLayout">
              {filtered.map((campaign) => (
                <CampaignCard
                  key={campaign.id}
                  campaign={campaign}
                  featured={
                    campaign.id === mostRecentId &&
                    activeStatus === 'all' &&
                    !searchQuery
                  }
                  onSend={() => handleSend(campaign)}
                  onDuplicate={() => handleDuplicate(campaign)}
                  isSending={sendingId === campaign.id}
                  isHighlighted={highlightedIds.has(campaign.id)}
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
            <div className="inline-flex items-center gap-2 px-5 py-2.5 rounded-2xl bg-gradient-to-r from-emerald-500/5 to-teal-500/5 border border-emerald-500/10">
              <Zap className="w-4 h-4 text-emerald-600" />
              <span className="text-sm text-[#5B6B84]">
                Dica:{' '}
                <span className="text-[#0F172A] font-medium">
                  Campanhas com mensagens personalizadas tem 3x mais engajamento
                </span>
              </span>
            </div>
          </motion.div>
        )}
      </div>
    </div>
  );
}

export default function CampaignsPage() {
  return (
    <ProtectedRoute>
      <CampaignsContent />
    </ProtectedRoute>
  );
}

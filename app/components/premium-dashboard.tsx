'use client';

import { useState, useEffect, useRef, useCallback } from 'react';
import Image from 'next/image';
import { useAuth } from '@/lib/auth-context';
import { ApiError } from '@/lib/api';
import { useRouter, useSearchParams } from 'next/navigation';
import { chatService } from '@/services/chat.service';
import { milestonesService } from '@/services/milestones.service';
import { assetsService } from '@/services/assets.service';
import { tokensService } from '@/services/tokens.service';
import { templatesService } from '@/services/templates.service';
import type { Chat, Message, Milestone, Asset, TokenEstimate, PageTemplate } from '@/types';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import {
  Send, Menu, X, Plus, MessageCircle, Zap, FileText, MoreVertical, Smartphone,
  BarChart3, Loader2, Coins, AlertTriangle, ExternalLink, Download, Eye, Users,
  ListChecks, Megaphone, Trash2, LayoutTemplate, Sparkles, ChevronLeft,
  ChevronRight, Globe, Share2, Pencil, Rocket, Target, Bot, ArrowRight,
  Layers, Settings, LogOut, ChevronsUpDown, TrendingUp, Clock
} from 'lucide-react';
import { pagesApiService } from '@/services/pages.service';
import { resourceEvents } from '@/lib/resource-events';
import { toast } from 'sonner';
import { motion, AnimatePresence } from 'framer-motion';

// ─── Quick Actions for empty state ──────────────────────────────────────────
const QUICK_ACTIONS = [
  {
    icon: FileText,
    label: 'Criar Landing Page',
    prompt: 'Crie uma landing page profissional para vender meu produto digital',
    color: 'from-blue-500/10 to-indigo-500/10',
    iconColor: 'text-blue-600',
    borderColor: 'border-blue-100',
  },
  {
    icon: Rocket,
    label: 'Montar Funil Completo',
    prompt: 'Monte um funil de vendas completo com página de captura, obrigado e vendas',
    color: 'from-purple-500/10 to-pink-500/10',
    iconColor: 'text-purple-600',
    borderColor: 'border-purple-100',
  },
  {
    icon: Target,
    label: 'Captar Leads',
    prompt: 'Crie uma página de captura de leads com formulário e oferta irresistível',
    color: 'from-emerald-500/10 to-teal-500/10',
    iconColor: 'text-emerald-600',
    borderColor: 'border-emerald-100',
  },
  {
    icon: Smartphone,
    label: 'Funil com WhatsApp',
    prompt: 'Monte um funil completo com integração WhatsApp para atendimento',
    color: 'from-green-500/10 to-lime-500/10',
    iconColor: 'text-green-600',
    borderColor: 'border-green-100',
  },
];

// ─── Placeholder messages that rotate ───────────────────────────────────────
const PLACEHOLDERS = [
  'Crie uma landing page que venda meu ebook de emagrecimento...',
  'Monte um funil completo com WhatsApp...',
  'Crie uma página de captura de leads com alta conversao...',
  'Gere uma landing page para meu curso de marketing digital...',
  'Crie um funil de vendas para minha consultoria...',
];

// ─── AI Suggestions ─────────────────────────────────────────────────────────
const AI_SUGGESTIONS = [
  { text: 'Otimizar sua ultima landing page', icon: TrendingUp },
  { text: 'Criar variacao A/B da sua pagina', icon: Layers },
  { text: 'Adicionar secao de depoimentos', icon: MessageCircle },
];

// ─── Sidebar Nav Items ──────────────────────────────────────────────────────
const NAV_ITEMS = [
  { icon: Layers, label: 'Criacoes', route: '/criacoes', section: null },
  { icon: Megaphone, label: 'Campanhas', route: '/campaigns', section: null },
  { icon: Users, label: 'Contatos', route: '/contacts', section: null },
  { icon: ListChecks, label: 'Listas', route: '/lists', section: null },
  { icon: BarChart3, label: 'Analytics', route: '/analytics', section: null },
  { icon: LayoutTemplate, label: 'Templates', route: '/templates', section: null },
];

export default function PremiumDashboard() {
  const { user, logout, tokenBalance, refreshBalance } = useAuth();
  const router = useRouter();
  const searchParams = useSearchParams();
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const estimateTimeout = useRef<ReturnType<typeof setTimeout>>(null);
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const [placeholderIndex, setPlaceholderIndex] = useState(0);

  const [activeTemplate, setActiveTemplate] = useState<PageTemplate | null>(null);

  // Chat state
  const [chats, setChats] = useState<Chat[]>([]);
  const [activeChat, setActiveChat] = useState<Chat | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [messageInput, setMessageInput] = useState('');
  const [isSending, setIsSending] = useState(false);
  const [isLoadingChats, setIsLoadingChats] = useState(true);
  const [isLoadingChat, setIsLoadingChat] = useState(false);

  // Token estimate
  const [estimate, setEstimate] = useState<TokenEstimate | null>(null);
  const [isEstimating, setIsEstimating] = useState(false);

  // Insufficient balance alert
  const [balanceAlert, setBalanceAlert] = useState<{ required: number; current: number } | null>(null);

  // Milestones & Assets
  const [milestones, setMilestones] = useState<Milestone[]>([]);
  const [assets, setAssets] = useState<Asset[]>([]);
  const [deletingAssetId, setDeletingAssetId] = useState<number | null>(null);
  const [exportingPageId, setExportingPageId] = useState<number | null>(null);

  const [highlightedAssetIds, setHighlightedAssetIds] = useState<Set<number>>(new Set());

  // Rotate placeholder
  useEffect(() => {
    const interval = setInterval(() => {
      setPlaceholderIndex((prev) => (prev + 1) % PLACEHOLDERS.length);
    }, 4000);
    return () => clearInterval(interval);
  }, []);

  const handleDeleteAsset = async (asset: Asset) => {
    if (!confirm(`Excluir "${asset.name}"? Esta acao nao pode ser desfeita.`)) return;
    setDeletingAssetId(asset.id);
    try {
      await assetsService.delete(asset.id);
      setAssets((prev) => prev.filter((a) => a.id !== asset.id));
      resourceEvents.emit('assets', { action: 'deleted', id: asset.id });
      toast.success('Ativo excluido.');
    } catch (e) {
      toast.error(e instanceof Error ? e.message : 'Nao foi possivel excluir o ativo.');
    } finally {
      setDeletingAssetId(null);
    }
  };

  useEffect(() => {
    loadChats();
    return () => {
      if (estimateTimeout.current) clearTimeout(estimateTimeout.current);
    };
  }, []);

  useEffect(() => {
    const raw = searchParams?.get('template');
    if (!raw) return;
    const templateId = Number(raw);
    if (!Number.isFinite(templateId) || templateId <= 0) return;

    let cancelled = false;
    templatesService
      .get(templateId)
      .then((t) => {
        if (cancelled) return;
        setActiveTemplate(t);
        setActiveChat(null);
        setMessages([]);
        setMilestones([]);
        setAssets([]);
      })
      .catch(() => {
        if (!cancelled) setActiveTemplate(null);
      });

    return () => {
      cancelled = true;
    };
  }, [searchParams]);

  const clearActiveTemplate = () => {
    setActiveTemplate(null);
    if (typeof window !== 'undefined') {
      const url = new URL(window.location.href);
      url.searchParams.delete('template');
      window.history.replaceState({}, '', url.toString());
    }
  };

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const handleInputChange = useCallback((value: string) => {
    setMessageInput(value);
    setBalanceAlert(null);

    if (estimateTimeout.current) clearTimeout(estimateTimeout.current);

    if (value.trim().length < 5) {
      setEstimate(null);
      return;
    }

    estimateTimeout.current = setTimeout(async () => {
      setIsEstimating(true);
      try {
        const est = await tokensService.estimate(value);
        setEstimate(est);
      } catch {
        setEstimate(null);
      } finally {
        setIsEstimating(false);
      }
    }, 600);
  }, []);

  const loadChats = async () => {
    setIsLoadingChats(true);
    try {
      const chatList = await chatService.list();
      setChats(chatList);
      if (chatList.length > 0) {
        await loadChat(chatList[0].id);
      }
    } catch {
      // silently fail
    } finally {
      setIsLoadingChats(false);
    }
  };

  const loadChat = async (chatId: number) => {
    setIsLoadingChat(true);
    try {
      const chat = await chatService.get(chatId);
      setActiveChat(chat);
      setMessages(chat.messages || []);
      const [ms, as] = await Promise.all([
        milestonesService.list(chatId).catch(() => []),
        assetsService.list(chatId).catch(() => []),
      ]);
      setMilestones(ms);
      setAssets(as);
    } catch {
      // silently fail
    } finally {
      setIsLoadingChat(false);
    }
  };

  const handleDeleteChat = async (chatId: number, e: React.MouseEvent) => {
    e.stopPropagation();
    if (!confirm('Tem certeza que deseja excluir este chat?')) return;
    try {
      await chatService.remove(chatId);
      setChats((prev) => {
        const updated = prev.filter((c) => c.id !== chatId);
        if (activeChat?.id === chatId) {
          if (updated.length > 0) {
            loadChat(updated[0].id);
          } else {
            setActiveChat(null);
            setMessages([]);
            setMilestones([]);
            setAssets([]);
          }
        }
        return updated;
      });
    } catch {
      // silently fail
    }
  };

  const handleSendMessage = async () => {
    if (!messageInput.trim() || isSending) return;

    const text = messageInput;
    setMessageInput('');
    setEstimate(null);
    setBalanceAlert(null);
    setIsSending(true);

    const optimisticMsg: Message = {
      id: Date.now(),
      chat_id: activeChat?.id || 0,
      role: 'user',
      content: text,
      metadata: null,
      created_at: new Date().toISOString(),
    };
    const typingMsg: Message = {
      id: optimisticMsg.id + 1,
      chat_id: activeChat?.id || 0,
      role: 'assistant',
      content: activeTemplate
        ? `O Ximples esta adaptando o template "${activeTemplate.name}" para voce...`
        : 'O Ximples esta processando sua solicitacao...',
      metadata: { typing: true },
      created_at: new Date().toISOString(),
    };
    setMessages(prev => [...prev, optimisticMsg, typingMsg]);

    const loadingToastId = toast.loading(
      activeTemplate ? `Gerando a partir do template "${activeTemplate.name}"...` : 'O Ximples esta criando...',
    );

    const prevAssetIds = new Set(assets.map((a) => a.id));

    try {
      const result = await chatService.send({
        chat_id: activeChat?.id,
        message: text,
        template_id: activeTemplate?.id,
      });
      const chat = result.chat;
      setActiveChat(chat);
      setMessages(chat.messages || []);

      if (result.current_balance !== undefined) {
        await refreshBalance();
      }

      if (!activeChat || activeChat.id !== chat.id) {
        const chatList = await chatService.list();
        setChats(chatList);
        resourceEvents.emit('chats', { action: 'created', id: chat.id });
      }

      const [ms, as] = await Promise.all([
        milestonesService.list(chat.id).catch(() => []),
        assetsService.list(chat.id).catch(() => []),
      ]);
      setMilestones(ms);
      setAssets(as);

      const newAssets = as.filter((a) => !prevAssetIds.has(a.id));
      if (newAssets.length > 0) {
        setHighlightedAssetIds((prev) => {
          const next = new Set(prev);
          newAssets.forEach((a) => next.add(a.id));
          return next;
        });
        setTimeout(() => {
          setHighlightedAssetIds((prev) => {
            const next = new Set(prev);
            newAssets.forEach((a) => next.delete(a.id));
            return next;
          });
        }, 5000);

        newAssets.forEach((a) => {
          resourceEvents.emit(['assets', 'pages', 'milestones'], { action: 'created', id: a.id, data: a });
        });

        const summary =
          newAssets.length === 1
            ? `1 novo ativo criado: ${newAssets[0].name}`
            : `${newAssets.length} novos ativos criados.`;
        toast.success(summary, { id: loadingToastId });
      } else {
        toast.success('Mensagem processada.', { id: loadingToastId });
      }
    } catch (err) {
      if (err instanceof ApiError && err.status === 422) {
        const errorData = err.data as Record<string, unknown>;
        const errorChat = errorData?.chat as Chat | undefined;
        if (errorChat) {
          setActiveChat(errorChat);
          setMessages(errorChat.messages || []);
        } else {
          setMessages(prev => prev.filter(m => m.id !== optimisticMsg.id && m.id !== typingMsg.id));
        }
        setBalanceAlert({
          required: (errorData?.required_tokens as number) || 0,
          current: (errorData?.current_balance as number) || 0,
        });
        await refreshBalance();
        toast.error('Saldo insuficiente para esta acao.', { id: loadingToastId });
      } else {
        setMessages(prev => prev.filter(m => m.id !== optimisticMsg.id && m.id !== typingMsg.id));
        toast.error(
          err instanceof Error ? err.message : 'Nao foi possivel concluir a criacao.',
          { id: loadingToastId },
        );
      }
    } finally {
      setIsSending(false);
    }
  };

  const handleNewChat = () => {
    setActiveChat(null);
    setMessages([]);
    setMilestones([]);
    setAssets([]);
    setEstimate(null);
    setBalanceAlert(null);
  };

  const handleQuickAction = (prompt: string) => {
    setMessageInput(prompt);
  };

  const getTypeIcon = (type: string) => {
    switch (type) {
      case 'landing': case 'page': return <FileText className="w-4 h-4" />;
      case 'email': case 'campaign': return <Zap className="w-4 h-4" />;
      case 'whatsapp': return <Smartphone className="w-4 h-4" />;
      case 'crm': return <BarChart3 className="w-4 h-4" />;
      default: return <MessageCircle className="w-4 h-4" />;
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'active': case 'done': case 'completed': case 'ready':
        return 'bg-emerald-50 text-emerald-700 border-emerald-200';
      case 'in_progress': case 'processing':
        return 'bg-blue-50 text-blue-700 border-blue-200';
      default:
        return 'bg-gray-50 text-gray-600 border-gray-200';
    }
  };

  const getStatusLabel = (status: string) => {
    switch (status) {
      case 'active': case 'done': case 'completed': case 'ready': return 'Publicado';
      case 'in_progress': case 'processing': return 'Em Progresso';
      default: return 'Rascunho';
    }
  };

  const getMilestoneStatusClass = (status: string) => {
    switch (status) {
      case 'done': case 'completed': return 'bg-emerald-500';
      case 'in_progress': return 'bg-blue-500';
      default: return 'bg-muted-foreground/20';
    }
  };

  // Token capacity estimate (approx pages per token)
  const estimatedPages = tokenBalance ? Math.floor(tokenBalance / 150) : 0;

  const sidebarWidth = sidebarCollapsed ? 'w-[72px]' : 'w-[260px]';

  return (
    <div className="min-h-screen bg-background flex">
      {/* ═══════════════════════ SIDEBAR ═══════════════════════ */}
      <motion.div
        initial={false}
        animate={{ width: sidebarCollapsed ? 72 : 260 }}
        transition={{ duration: 0.3, ease: [0.4, 0, 0.2, 1] }}
        className={`fixed lg:static inset-y-0 left-0 z-40 bg-primary text-white flex flex-col transform transition-transform duration-300 ${
          sidebarOpen ? 'translate-x-0' : '-translate-x-full lg:translate-x-0'
        }`}
      >
        {/* Logo */}
        <div className="p-4 border-b border-white/10 flex items-center justify-between min-h-[68px]">
          <AnimatePresence mode="wait">
            {!sidebarCollapsed && (
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                transition={{ duration: 0.15 }}
              >
                <Image src="/logo-ximples-white.png" alt="Ximples" width={130} height={40} className="h-8 w-auto" />
              </motion.div>
            )}
          </AnimatePresence>
          <button
            onClick={() => setSidebarCollapsed(!sidebarCollapsed)}
            className="hidden lg:flex p-1.5 rounded-lg hover:bg-white/10 transition-colors"
          >
            {sidebarCollapsed ? <ChevronRight className="w-4 h-4" /> : <ChevronLeft className="w-4 h-4" />}
          </button>
        </div>

        {/* New Chat Button */}
        <div className="p-3">
          <Button
            onClick={handleNewChat}
            className={`w-full bg-white/15 hover:bg-white/25 text-white border border-white/10 backdrop-blur-sm transition-all duration-200 ${
              sidebarCollapsed ? 'px-0 justify-center' : 'justify-start gap-2.5'
            }`}
          >
            <Plus className="w-4 h-4 flex-shrink-0" />
            {!sidebarCollapsed && <span className="text-sm font-medium">Novo Chat</span>}
          </Button>
        </div>

        {/* Navigation */}
        <div className="flex-1 overflow-y-auto scrollbar-thin px-3 space-y-1">
          {!sidebarCollapsed && (
            <p className="text-[10px] font-semibold text-white/40 uppercase tracking-wider px-3 pt-3 pb-1.5">
              Menu
            </p>
          )}
          {NAV_ITEMS.map((item) => (
            <button
              key={item.label}
              onClick={() => item.route && router.push(item.route)}
              className={`w-full flex items-center rounded-lg text-sm transition-all duration-200 hover:bg-white/10 group ${
                sidebarCollapsed ? 'justify-center p-2.5' : 'px-3 py-2 gap-3'
              }`}
              title={sidebarCollapsed ? item.label : undefined}
            >
              <item.icon className="w-[18px] h-[18px] text-white/70 group-hover:text-white transition-colors flex-shrink-0" />
              {!sidebarCollapsed && (
                <span className="text-white/80 group-hover:text-white transition-colors">{item.label}</span>
              )}
            </button>
          ))}

          {/* Recent Chats */}
          {!sidebarCollapsed && (
            <div className="pt-5">
              <div className="flex items-center gap-2 px-3 pb-1.5">
                <Clock className="w-3 h-3 text-white/40" />
                <p className="text-[10px] font-semibold text-white/40 uppercase tracking-wider">Recentes</p>
              </div>
              {isLoadingChats ? (
                <div className="flex justify-center py-4">
                  <Loader2 className="w-4 h-4 animate-spin text-white/40" />
                </div>
              ) : chats.length === 0 ? (
                <p className="text-xs text-white/30 px-3 py-2">Nenhum chat ainda</p>
              ) : (
                <div className="space-y-0.5">
                  {chats.map((chat) => (
                    <div
                      key={chat.id}
                      className={`group relative flex items-center rounded-lg text-sm transition-all duration-200 ${
                        activeChat?.id === chat.id
                          ? 'bg-white/15 sidebar-active-glow'
                          : 'hover:bg-white/8'
                      }`}
                    >
                      <button
                        onClick={() => {
                          clearActiveTemplate();
                          loadChat(chat.id);
                        }}
                        className="flex-1 text-left px-3 py-2 truncate pr-9 text-white/70 hover:text-white transition-colors"
                      >
                        <span className="text-[13px]">{chat.title}</span>
                      </button>
                      <button
                        onClick={(e) => handleDeleteChat(chat.id, e)}
                        aria-label="Excluir chat"
                        title="Excluir chat"
                        className="absolute right-1.5 top-1/2 -translate-y-1/2 p-1 rounded-md opacity-0 group-hover:opacity-100 hover:bg-white/20 text-white/50 hover:text-red-300 transition-all"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>

        {/* Bottom: Energia da IA + User */}
        <div className="p-3 border-t border-white/10 space-y-3">
          {/* Energia da IA (Token Balance) */}
          <button
            onClick={() => router.push('/tokens')}
            className={`w-full rounded-xl bg-gradient-to-br from-white/12 to-white/5 hover:from-white/18 hover:to-white/10 border border-white/10 transition-all duration-300 ${
              sidebarCollapsed ? 'p-2.5' : 'p-3'
            }`}
          >
            {sidebarCollapsed ? (
              <div className="flex justify-center">
                <Zap className="w-4 h-4 text-yellow-400" />
              </div>
            ) : (
              <>
                <div className="flex items-center justify-between mb-2">
                  <div className="flex items-center gap-2">
                    <div className="w-6 h-6 rounded-lg bg-yellow-400/20 flex items-center justify-center">
                      <Zap className="w-3.5 h-3.5 text-yellow-400" />
                    </div>
                    <span className="text-xs font-medium text-white/70">Energia da IA</span>
                  </div>
                  <span className="text-sm font-bold text-white">{tokenBalance}</span>
                </div>
                {/* Visual energy bar */}
                <div className="w-full h-1.5 bg-white/10 rounded-full overflow-hidden mb-2">
                  <motion.div
                    className="h-full rounded-full bg-gradient-to-r from-yellow-400 to-amber-300 energy-bar-glow"
                    initial={{ width: 0 }}
                    animate={{ width: `${Math.min(100, (tokenBalance / 5000) * 100)}%` }}
                    transition={{ duration: 1, ease: 'easeOut' }}
                  />
                </div>
                <p className="text-[11px] text-white/40">
                  ~{estimatedPages} paginas disponiveis
                </p>
              </>
            )}
          </button>

          {/* User Profile */}
          <div className={`flex items-center ${sidebarCollapsed ? 'justify-center' : 'gap-2.5'}`}>
            <div className="w-8 h-8 rounded-full bg-gradient-to-br from-blue-400 to-indigo-500 flex items-center justify-center text-xs font-bold text-white flex-shrink-0">
              {user?.name?.charAt(0) || 'U'}
            </div>
            {!sidebarCollapsed && (
              <>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium truncate text-white/90">{user?.name}</p>
                  <p className="text-[11px] text-white/40 truncate">{user?.email}</p>
                </div>
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button variant="ghost" size="sm" className="text-white/60 hover:text-white hover:bg-white/10 p-1.5 h-auto">
                      <ChevronsUpDown className="w-3.5 h-3.5" />
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end" className="w-48" sideOffset={8}>
                    <DropdownMenuItem onClick={() => router.push('/tokens')} className="gap-2">
                      <Zap className="w-3.5 h-3.5" /> Energia da IA
                    </DropdownMenuItem>
                    <DropdownMenuItem onClick={() => router.push('/profile')} className="gap-2">
                      <Settings className="w-3.5 h-3.5" /> Configuracoes
                    </DropdownMenuItem>
                    <DropdownMenuItem onClick={() => { logout(); router.push('/login'); }} className="gap-2 text-red-600">
                      <LogOut className="w-3.5 h-3.5" /> Sair
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
              </>
            )}
          </div>
        </div>
      </motion.div>

      {/* Mobile overlay */}
      <AnimatePresence>
        {sidebarOpen && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/50 backdrop-blur-sm lg:hidden z-30"
            onClick={() => setSidebarOpen(false)}
          />
        )}
      </AnimatePresence>

      {/* ═══════════════════════ MAIN CONTENT ═══════════════════════ */}
      <div className="flex-1 flex flex-col min-w-0">
        {/* Topbar */}
        <div className="bg-white/80 backdrop-blur-xl border-b border-border/60 px-6 py-3 flex items-center justify-between sticky top-0 z-20">
          <div className="flex items-center gap-4">
            <Button variant="ghost" size="icon" onClick={() => setSidebarOpen(!sidebarOpen)} className="lg:hidden">
              {sidebarOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
            </Button>
            <div>
              <h2 className="font-semibold text-foreground text-[15px]">{activeChat?.title || 'AI Command Center'}</h2>
              <p className="text-xs text-muted-foreground">
                {activeChat ? 'Acompanhe sua execucao' : 'Converse, o Ximples constroi'}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2.5">
            <button
              onClick={() => router.push('/tokens')}
              className="flex items-center gap-2 px-3 py-1.5 rounded-full bg-gradient-to-r from-primary/8 to-blue-500/8 hover:from-primary/12 hover:to-blue-500/12 border border-primary/10 transition-all duration-300"
            >
              <Zap className="w-3.5 h-3.5 text-primary" />
              <span className="text-sm font-semibold text-primary">{tokenBalance}</span>
            </button>
            {activeChat && (
              <Badge variant="outline" className="bg-emerald-50 text-emerald-700 border-emerald-200 gap-1">
                <div className="w-1.5 h-1.5 rounded-full bg-emerald-500 ai-pulse" />
                Ativo
              </Badge>
            )}
          </div>
        </div>

        {/* Main Grid Area */}
        <div className="flex-1 overflow-auto">
          <div className="max-w-[1400px] mx-auto p-6">
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
              {/* ═══════ CHAT SECTION (dominant - 8 cols) ═══════ */}
              <div className="lg:col-span-8 space-y-6">
                {/* Chat Card - Hero */}
                <Card className="flex flex-col ximples-shadow-lg border-0 bg-white overflow-hidden">
                  {/* Chat Header */}
                  <div className="px-6 py-4 border-b border-border/50 bg-gradient-to-r from-white to-secondary/30">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-primary to-blue-500 flex items-center justify-center">
                          <Bot className="w-5 h-5 text-white" />
                        </div>
                        <div>
                          <h3 className="font-semibold text-foreground text-[15px]">Ximples AI</h3>
                          <div className="flex items-center gap-1.5">
                            <div className="w-1.5 h-1.5 rounded-full bg-emerald-500 ai-pulse" />
                            <p className="text-xs text-muted-foreground">Online e pronto para criar</p>
                          </div>
                        </div>
                      </div>
                      {activeTemplate && (
                        <Badge className="bg-primary/10 text-primary border-primary/20 gap-1">
                          <Sparkles className="w-3 h-3" />
                          Template: {activeTemplate.name}
                          <button onClick={clearActiveTemplate} className="ml-1 hover:bg-primary/20 rounded p-0.5">
                            <X className="w-3 h-3" />
                          </button>
                        </Badge>
                      )}
                    </div>
                  </div>

                  {/* Messages Area */}
                  <div className="flex-1 overflow-y-auto p-6 space-y-4 min-h-[420px] max-h-[520px] scrollbar-thin bg-gradient-to-b from-secondary/20 to-white">
                    {isLoadingChat ? (
                      <div className="flex justify-center items-center h-full">
                        <div className="flex flex-col items-center gap-3">
                          <Loader2 className="w-8 h-8 animate-spin text-primary/40" />
                          <p className="text-sm text-muted-foreground">Carregando conversa...</p>
                        </div>
                      </div>
                    ) : messages.length === 0 ? (
                      /* ── Empty State: Command Center ── */
                      <div className="flex flex-col items-center justify-center h-full py-4">
                        <motion.div
                          initial={{ scale: 0.9, opacity: 0 }}
                          animate={{ scale: 1, opacity: 1 }}
                          transition={{ duration: 0.5 }}
                          className="text-center mb-8"
                        >
                          <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-primary to-blue-500 flex items-center justify-center mx-auto mb-4 shadow-lg shadow-primary/20">
                            <Sparkles className="w-8 h-8 text-white" />
                          </div>
                          <h3 className="text-xl font-bold text-foreground mb-2">O que vamos criar hoje?</h3>
                          <p className="text-sm text-muted-foreground max-w-md">
                            Descreva sua ideia e o Ximples transforma em realidade. Landing pages, funis, capturas de leads e muito mais.
                          </p>
                        </motion.div>

                        {/* Quick Actions Grid */}
                        <div className="grid grid-cols-2 gap-3 w-full max-w-lg">
                          {QUICK_ACTIONS.map((action, i) => (
                            <motion.button
                              key={action.label}
                              initial={{ opacity: 0, y: 12 }}
                              animate={{ opacity: 1, y: 0 }}
                              transition={{ duration: 0.3, delay: i * 0.08 }}
                              onClick={() => handleQuickAction(action.prompt)}
                              className={`quick-action-card text-left p-4 rounded-xl bg-gradient-to-br ${action.color} border ${action.borderColor} group`}
                            >
                              <action.icon className={`w-5 h-5 ${action.iconColor} mb-2.5`} />
                              <p className="text-sm font-medium text-foreground group-hover:text-primary transition-colors">
                                {action.label}
                              </p>
                            </motion.button>
                          ))}
                        </div>
                      </div>
                    ) : (
                      /* ── Messages ── */
                      <AnimatePresence mode="popLayout">
                        {messages.map((msg, idx) => (
                          <motion.div
                            key={msg.id}
                            initial={{ opacity: 0, y: 8 }}
                            animate={{ opacity: 1, y: 0 }}
                            transition={{ duration: 0.2 }}
                            className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}
                          >
                            {msg.role === 'assistant' && (
                              <div className="w-7 h-7 rounded-lg bg-gradient-to-br from-primary to-blue-500 flex items-center justify-center mr-2.5 mt-1 flex-shrink-0">
                                <Bot className="w-3.5 h-3.5 text-white" />
                              </div>
                            )}
                            <div className={`max-w-[70%] px-4 py-3 ${
                              msg.role === 'user' ? 'ximples-message-user' : 'ximples-message-assistant'
                            }`}>
                              {(msg.metadata as Record<string, unknown>)?.typing ? (
                                <div className="flex items-center gap-2">
                                  <div className="flex gap-1">
                                    <div className="w-1.5 h-1.5 bg-primary/40 rounded-full animate-bounce" />
                                    <div className="w-1.5 h-1.5 bg-primary/40 rounded-full animate-bounce" style={{ animationDelay: '0.15s' }} />
                                    <div className="w-1.5 h-1.5 bg-primary/40 rounded-full animate-bounce" style={{ animationDelay: '0.3s' }} />
                                  </div>
                                  <span className="text-xs text-muted-foreground">{msg.content}</span>
                                </div>
                              ) : (
                                <p className="text-sm leading-relaxed">{msg.content}</p>
                              )}
                            </div>
                          </motion.div>
                        ))}
                      </AnimatePresence>
                    )}
                    <div ref={messagesEndRef} />
                  </div>

                  {/* Input Area */}
                  <div className="border-t border-border/50 bg-white">
                    {/* Alerts & Estimates */}
                    {balanceAlert && (
                      <div className="px-5 pt-3">
                        <div className="flex items-center gap-2 p-3 rounded-xl bg-red-50 border border-red-100">
                          <AlertTriangle className="w-4 h-4 text-red-500 flex-shrink-0" />
                          <div className="flex-1">
                            <p className="text-red-700 font-medium text-sm">Energia insuficiente</p>
                            <p className="text-red-500 text-xs">
                              Necessario: {balanceAlert.required} | Saldo: {balanceAlert.current}
                            </p>
                          </div>
                          <Button size="sm" onClick={() => router.push('/tokens')} className="bg-red-600 hover:bg-red-700 text-white text-xs px-3 py-1 h-7 rounded-lg">
                            Recarregar
                          </Button>
                        </div>
                      </div>
                    )}

                    {estimate && !balanceAlert && (
                      <div className="px-5 pt-3">
                        <motion.div
                          initial={{ opacity: 0, y: 4 }}
                          animate={{ opacity: 1, y: 0 }}
                          className={`flex items-center gap-2 text-xs px-3 py-2 rounded-lg ${
                            estimate.enough_balance
                              ? 'bg-blue-50 text-blue-700 border border-blue-100'
                              : 'bg-amber-50 text-amber-700 border border-amber-100'
                          }`}
                        >
                          <Zap className="w-3 h-3" />
                          <span>
                            Custo estimado: <strong>{estimate.estimated_token_cost} energia</strong>
                            {!estimate.enough_balance && ' (saldo insuficiente)'}
                          </span>
                        </motion.div>
                      </div>
                    )}

                    {isEstimating && !estimate && (
                      <div className="px-5 pt-3">
                        <div className="flex items-center gap-2 text-xs px-3 py-2 rounded-lg bg-secondary text-muted-foreground">
                          <Loader2 className="w-3 h-3 animate-spin" />
                          <span>Calculando energia...</span>
                        </div>
                      </div>
                    )}

                    {/* Input */}
                    <div className="p-4">
                      <div className="flex gap-2 items-end chat-input-premium rounded-2xl border border-border/60 bg-secondary/30 p-2 focus-within:bg-white">
                        <Input
                          placeholder={PLACEHOLDERS[placeholderIndex]}
                          value={messageInput}
                          onChange={(e) => handleInputChange(e.target.value)}
                          onKeyDown={(e) => e.key === 'Enter' && !e.shiftKey && handleSendMessage()}
                          className="border-0 shadow-none bg-transparent focus-visible:ring-0 text-sm placeholder:text-muted-foreground/60 py-2.5"
                          disabled={isSending}
                        />
                        <Button
                          onClick={handleSendMessage}
                          disabled={isSending || !messageInput.trim()}
                          className="bg-primary hover:bg-primary/90 text-white rounded-xl px-4 h-10 transition-all duration-200 disabled:opacity-30"
                        >
                          {isSending ? (
                            <Loader2 className="w-4 h-4 animate-spin" />
                          ) : (
                            <Send className="w-4 h-4" />
                          )}
                        </Button>
                      </div>
                    </div>
                  </div>
                </Card>

                {/* ═══════ SEUS ATIVOS DIGITAIS ═══════ */}
                {assets.length > 0 && (
                  <motion.div
                    initial={{ opacity: 0, y: 12 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.3 }}
                  >
                    <div className="flex items-center justify-between mb-4">
                      <div className="flex items-center gap-2.5">
                        <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-primary/10 to-blue-500/10 flex items-center justify-center">
                          <Layers className="w-4 h-4 text-primary" />
                        </div>
                        <div>
                          <h3 className="font-semibold text-foreground text-[15px]">Seus Ativos Digitais</h3>
                          <p className="text-xs text-muted-foreground">{assets.length} {assets.length === 1 ? 'ativo criado' : 'ativos criados'}</p>
                        </div>
                      </div>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                      {assets.map((asset, idx) => (
                        <motion.div
                          key={asset.id}
                          initial={{ opacity: 0, y: 8 }}
                          animate={{ opacity: 1, y: 0 }}
                          transition={{ duration: 0.2, delay: idx * 0.05 }}
                        >
                          <Card
                            className={`asset-card overflow-hidden border-border/50 ${
                              highlightedAssetIds.has(asset.id) ? 'ring-2 ring-blue-400 ring-offset-2' : ''
                            }`}
                          >
                            {/* Asset Thumbnail / Header */}
                            <div className="h-28 bg-gradient-to-br from-secondary to-secondary/50 relative flex items-center justify-center group">
                              <div className="w-12 h-12 rounded-xl bg-white/80 flex items-center justify-center shadow-sm">
                                {getTypeIcon(asset.type)}
                              </div>
                              {highlightedAssetIds.has(asset.id) && (
                                <Badge className="absolute top-2 left-2 bg-blue-600 text-white text-[10px] px-1.5 py-0 gap-0.5">
                                  <Sparkles className="w-2.5 h-2.5" />
                                  Novo
                                </Badge>
                              )}
                              <Badge className={`absolute top-2 right-2 text-[10px] ${getStatusColor(asset.status)}`}>
                                {getStatusLabel(asset.status)}
                              </Badge>
                              {/* Quick preview overlay */}
                              {asset.page && (
                                <div className="absolute inset-0 bg-black/0 group-hover:bg-black/40 transition-all duration-200 flex items-center justify-center opacity-0 group-hover:opacity-100">
                                  <a
                                    href={`/pages/${asset.page.id}/preview`}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    className="px-4 py-2 bg-white rounded-lg text-sm font-medium text-foreground hover:bg-white/90 transition shadow-lg flex items-center gap-2"
                                  >
                                    <Eye className="w-4 h-4" />
                                    Visualizar
                                  </a>
                                </div>
                              )}
                            </div>

                            {/* Asset Info */}
                            <div className="p-4">
                              <h4 className="font-medium text-foreground text-sm truncate mb-1">{asset.name}</h4>
                              <p className="text-xs text-muted-foreground mb-3">
                                {new Date(asset.created_at).toLocaleDateString('pt-BR', {
                                  day: '2-digit',
                                  month: 'short',
                                  year: 'numeric',
                                })}
                              </p>

                              {/* Action Buttons */}
                              <div className="flex items-center gap-1.5">
                                {asset.page && (
                                  <>
                                    <a
                                      href={`/pages/${asset.page.id}/preview`}
                                      target="_blank"
                                      rel="noopener noreferrer"
                                      className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-xs font-medium bg-secondary hover:bg-secondary/80 text-foreground transition-colors"
                                    >
                                      <Pencil className="w-3 h-3" />
                                      Editar
                                    </a>
                                    <a
                                      href={`/l/${asset.page.slug}`}
                                      target="_blank"
                                      rel="noopener noreferrer"
                                      className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-xs font-medium bg-secondary hover:bg-secondary/80 text-foreground transition-colors"
                                    >
                                      <Globe className="w-3 h-3" />
                                      Publicar
                                    </a>
                                    <button
                                      onClick={async () => {
                                        const pageId = asset.page!.id;
                                        setExportingPageId(pageId);
                                        const toastId = toast.loading('Exportando HTML...');
                                        try {
                                          const result = await pagesApiService.export(pageId);
                                          toast.success('HTML exportado!', { id: toastId });
                                          window.open(result.download_url, '_blank');
                                        } catch (e) {
                                          toast.error(e instanceof Error ? e.message : 'Falha ao exportar.', { id: toastId });
                                        } finally {
                                          setExportingPageId(null);
                                        }
                                      }}
                                      disabled={exportingPageId === asset.page.id}
                                      className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-xs font-medium bg-secondary hover:bg-secondary/80 text-foreground transition-colors disabled:opacity-50"
                                    >
                                      {exportingPageId === asset.page.id ? (
                                        <Loader2 className="w-3 h-3 animate-spin" />
                                      ) : (
                                        <Download className="w-3 h-3" />
                                      )}
                                      Exportar
                                    </button>
                                  </>
                                )}
                                <div className="flex-1" />
                                <button
                                  onClick={() => handleDeleteAsset(asset)}
                                  disabled={deletingAssetId === asset.id}
                                  title="Excluir"
                                  className="p-1.5 rounded-lg text-muted-foreground hover:text-red-600 hover:bg-red-50 transition-colors disabled:opacity-50"
                                >
                                  {deletingAssetId === asset.id ? (
                                    <Loader2 className="w-3.5 h-3.5 animate-spin" />
                                  ) : (
                                    <Trash2 className="w-3.5 h-3.5" />
                                  )}
                                </button>
                              </div>
                            </div>
                          </Card>
                        </motion.div>
                      ))}
                    </div>
                  </motion.div>
                )}

                {/* Empty assets state */}
                {assets.length === 0 && messages.length > 0 && (
                  <Card className="ximples-shadow border-dashed border-2 border-border/50">
                    <div className="p-8 text-center">
                      <div className="w-12 h-12 rounded-xl bg-secondary flex items-center justify-center mx-auto mb-3">
                        <Layers className="w-6 h-6 text-muted-foreground" />
                      </div>
                      <p className="text-sm text-muted-foreground">
                        Seus ativos digitais aparecerao aqui conforme o Ximples os cria.
                      </p>
                    </div>
                  </Card>
                )}
              </div>

              {/* ═══════ RIGHT SIDEBAR (4 cols) ═══════ */}
              <div className="lg:col-span-4 space-y-5">
                {/* Energia da IA Card */}
                <Card className="ximples-shadow-lg border-0 overflow-hidden">
                  <div className="bg-gradient-to-br from-primary via-primary to-blue-600 p-5 text-white">
                    <div className="flex items-center gap-3 mb-4">
                      <div className="w-10 h-10 rounded-xl bg-white/15 backdrop-blur-sm flex items-center justify-center">
                        <Zap className="w-5 h-5 text-yellow-300" />
                      </div>
                      <div>
                        <p className="text-xs text-white/70 font-medium">Energia da IA</p>
                        <p className="text-2xl font-bold">{tokenBalance}</p>
                      </div>
                    </div>
                    {/* Usage Bar */}
                    <div className="mb-3">
                      <div className="w-full h-2 bg-white/15 rounded-full overflow-hidden">
                        <motion.div
                          className="h-full rounded-full bg-gradient-to-r from-yellow-300 to-amber-200"
                          initial={{ width: 0 }}
                          animate={{ width: `${Math.min(100, (tokenBalance / 5000) * 100)}%` }}
                          transition={{ duration: 1.2, ease: 'easeOut' }}
                        />
                      </div>
                    </div>
                    <p className="text-xs text-white/60">
                      Voce pode criar ~<span className="font-semibold text-white/90">{estimatedPages} paginas</span> com seu saldo
                    </p>
                  </div>
                  <div className="p-4 bg-white">
                    <Button
                      variant="outline"
                      size="sm"
                      className="w-full text-xs border-primary/20 text-primary hover:bg-primary/5 gap-1.5"
                      onClick={() => router.push('/tokens')}
                    >
                      <Plus className="w-3 h-3" />
                      Recarregar energia
                    </Button>
                  </div>
                </Card>

                {/* Comece Rapido */}
                {messages.length === 0 && (
                  <motion.div
                    initial={{ opacity: 0, y: 12 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.4, delay: 0.2 }}
                  >
                    <Card className="ximples-shadow border-0 p-5">
                      <div className="flex items-center gap-2 mb-4">
                        <Rocket className="w-4 h-4 text-primary" />
                        <h3 className="font-semibold text-sm text-foreground">Comece Rapido</h3>
                      </div>
                      <div className="space-y-2">
                        {[
                          { label: 'Criar landing page', icon: FileText, prompt: 'Crie uma landing page profissional para meu produto' },
                          { label: 'Montar funil de vendas', icon: Target, prompt: 'Monte um funil de vendas completo' },
                          { label: 'Captar leads', icon: Users, prompt: 'Crie uma pagina de captura de leads otimizada' },
                        ].map((item) => (
                          <button
                            key={item.label}
                            onClick={() => handleQuickAction(item.prompt)}
                            className="w-full flex items-center gap-3 p-3 rounded-xl hover:bg-secondary transition-all duration-200 group text-left"
                          >
                            <div className="w-8 h-8 rounded-lg bg-primary/8 flex items-center justify-center group-hover:bg-primary/15 transition-colors">
                              <item.icon className="w-4 h-4 text-primary" />
                            </div>
                            <span className="text-sm text-foreground font-medium flex-1">{item.label}</span>
                            <ArrowRight className="w-3.5 h-3.5 text-muted-foreground opacity-0 group-hover:opacity-100 transition-opacity" />
                          </button>
                        ))}
                      </div>
                    </Card>
                  </motion.div>
                )}

                {/* AI Suggestions */}
                {messages.length === 0 && (
                  <motion.div
                    initial={{ opacity: 0, y: 12 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.4, delay: 0.35 }}
                  >
                    <Card className="ximples-shadow border-0 p-5">
                      <div className="flex items-center gap-2 mb-4">
                        <Sparkles className="w-4 h-4 text-purple-600" />
                        <h3 className="font-semibold text-sm text-foreground">Sugestoes da IA</h3>
                      </div>
                      <div className="space-y-2">
                        {AI_SUGGESTIONS.map((sug) => (
                          <button
                            key={sug.text}
                            onClick={() => handleQuickAction(sug.text)}
                            className="w-full flex items-center gap-3 p-3 rounded-xl hover:bg-purple-50 transition-all duration-200 group text-left"
                          >
                            <div className="w-8 h-8 rounded-lg bg-purple-50 flex items-center justify-center group-hover:bg-purple-100 transition-colors">
                              <sug.icon className="w-4 h-4 text-purple-600" />
                            </div>
                            <span className="text-sm text-foreground font-medium flex-1">{sug.text}</span>
                            <ArrowRight className="w-3.5 h-3.5 text-muted-foreground opacity-0 group-hover:opacity-100 transition-opacity" />
                          </button>
                        ))}
                      </div>
                    </Card>
                  </motion.div>
                )}

                {/* Milestones (when chat active) */}
                {milestones.length > 0 && (
                  <motion.div
                    initial={{ opacity: 0, y: 12 }}
                    animate={{ opacity: 1, y: 0 }}
                  >
                    <Card className="ximples-shadow border-0">
                      <div className="p-5 border-b border-border/50">
                        <div className="flex items-center gap-2">
                          <div className="w-2 h-2 rounded-full bg-blue-500 ai-pulse" />
                          <h3 className="font-semibold text-sm text-foreground">Progresso da Execucao</h3>
                        </div>
                      </div>
                      <div className="p-5 space-y-4">
                        {milestones.map((milestone) => (
                          <div key={milestone.id}>
                            <div className="flex items-center justify-between mb-2">
                              <p className="text-sm font-medium text-foreground">{milestone.title}</p>
                              <span className={`text-xs font-medium ${
                                milestone.status === 'done' ? 'text-emerald-600' : 'text-muted-foreground'
                              }`}>
                                {milestone.status === 'done' ? 'Concluido' : `${milestone.progress}%`}
                              </span>
                            </div>
                            <div className="w-full h-1.5 bg-secondary rounded-full overflow-hidden">
                              <motion.div
                                className={`h-full rounded-full transition-all ${getMilestoneStatusClass(milestone.status)}`}
                                initial={{ width: 0 }}
                                animate={{ width: `${milestone.progress}%` }}
                                transition={{ duration: 0.8, ease: 'easeOut' }}
                              />
                            </div>
                          </div>
                        ))}
                      </div>
                    </Card>
                  </motion.div>
                )}

                {/* Summary Metrics (when chat active) */}
                {(assets.length > 0 || milestones.length > 0) && (
                  <motion.div
                    initial={{ opacity: 0, y: 12 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="grid grid-cols-3 gap-3"
                  >
                    {[
                      { label: 'Ativos', value: assets.length, icon: Layers, color: 'text-blue-600 bg-blue-50' },
                      { label: 'Ativos', value: milestones.filter(m => m.status === 'in_progress').length, icon: Loader2, color: 'text-amber-600 bg-amber-50' },
                      { label: 'Prontos', value: milestones.filter(m => m.status === 'done').length, icon: Sparkles, color: 'text-emerald-600 bg-emerald-50' },
                    ].map((metric) => (
                      <Card key={metric.label + metric.color} className="p-3 ximples-shadow border-0 text-center">
                        <div className={`w-8 h-8 rounded-lg ${metric.color} flex items-center justify-center mx-auto mb-2`}>
                          <metric.icon className="w-4 h-4" />
                        </div>
                        <p className="text-xl font-bold text-foreground">{metric.value}</p>
                        <p className="text-[11px] text-muted-foreground">{metric.label}</p>
                      </Card>
                    ))}
                  </motion.div>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

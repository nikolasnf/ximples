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
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import { Send, Menu, X, Plus, MessageCircle, Zap, FileText, MoreVertical, Smartphone, BarChart3, Loader2, Coins, AlertTriangle, ExternalLink, Download, Eye, Users, ListChecks, Megaphone, Trash2, LayoutTemplate, Sparkles } from 'lucide-react';
import { pagesApiService } from '@/services/pages.service';
import { resourceEvents } from '@/lib/resource-events';
import { toast } from 'sonner';

export default function PremiumDashboard() {
  const { user, logout, tokenBalance, refreshBalance } = useAuth();
  const router = useRouter();
  const searchParams = useSearchParams();
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const estimateTimeout = useRef<ReturnType<typeof setTimeout>>(null);
  const [sidebarOpen, setSidebarOpen] = useState(true);

  // Active template (set when the user arrives via /templates?template=<id>).
  // While set, every chatService.send() call carries template_id, and the AI
  // switches into TEMPLATE MODE to fill the template's section skeleton.
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

  // Track IDs of assets created in the last few seconds so we can highlight them.
  const [highlightedAssetIds, setHighlightedAssetIds] = useState<Set<number>>(new Set());

  const handleDeleteAsset = async (asset: Asset) => {
    if (!confirm(`Excluir "${asset.name}"? Esta ação não pode ser desfeita.`)) return;
    setDeletingAssetId(asset.id);
    try {
      await assetsService.delete(asset.id);
      setAssets((prev) => prev.filter((a) => a.id !== asset.id));
      resourceEvents.emit('assets', { action: 'deleted', id: asset.id });
      toast.success('Ativo excluído.');
    } catch (e) {
      toast.error(e instanceof Error ? e.message : 'Não foi possível excluir o ativo.');
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

  // Pick up ?template=<id> from the URL. When present, start a fresh chat
  // session (no active chat), load the template and show the context chip.
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
        // Start a fresh chat so the template context is clean from the first message.
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
    // Drop the ?template= query param from the URL so a refresh doesn't re-load it.
    if (typeof window !== 'undefined') {
      const url = new URL(window.location.href);
      url.searchParams.delete('template');
      window.history.replaceState({}, '', url.toString());
    }
  };

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  // Debounced estimate as user types
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

    // Optimistic: show user message
    const optimisticMsg: Message = {
      id: Date.now(),
      chat_id: activeChat?.id || 0,
      role: 'user',
      content: text,
      metadata: null,
      created_at: new Date().toISOString(),
    };
    // Transient "typing" placeholder so the user immediately sees the assistant
    // is working. Replaced by the real assistant message when the request returns.
    const typingMsg: Message = {
      id: optimisticMsg.id + 1,
      chat_id: activeChat?.id || 0,
      role: 'assistant',
      content: activeTemplate
        ? `O Ximples está adaptando o template "${activeTemplate.name}" para você...`
        : 'O Ximples está processando sua solicitação...',
      metadata: { typing: true },
      created_at: new Date().toISOString(),
    };
    setMessages(prev => [...prev, optimisticMsg, typingMsg]);

    const loadingToastId = toast.loading(
      activeTemplate ? `Gerando a partir do template "${activeTemplate.name}"...` : 'O Ximples está criando...',
    );

    // Snapshot of asset IDs BEFORE the call so we can detect new ones and highlight them.
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

      // Update balance from response
      if (result.current_balance !== undefined) {
        await refreshBalance();
      }

      // Refresh sidebar if new chat was created
      if (!activeChat || activeChat.id !== chat.id) {
        const chatList = await chatService.list();
        setChats(chatList);
        resourceEvents.emit('chats', { action: 'created', id: chat.id });
      }

      // Refresh milestones and assets
      const [ms, as] = await Promise.all([
        milestonesService.list(chat.id).catch(() => []),
        assetsService.list(chat.id).catch(() => []),
      ]);
      setMilestones(ms);
      setAssets(as);

      // Detect newly produced assets and highlight them briefly.
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

        // Notify other parts of the app (pages list, assets list, milestones).
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
        // Insufficient balance — show the chat messages (which include the error message from backend)
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
        toast.error('Saldo insuficiente para esta ação.', { id: loadingToastId });
      } else {
        // Remove optimistic messages on other errors
        setMessages(prev => prev.filter(m => m.id !== optimisticMsg.id && m.id !== typingMsg.id));
        toast.error(
          err instanceof Error ? err.message : 'Não foi possível concluir a criação.',
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
        return 'bg-green-50 text-green-700 border-green-200';
      case 'in_progress': case 'processing':
        return 'bg-blue-50 text-blue-700 border-blue-200';
      default:
        return 'bg-gray-50 text-gray-700 border-gray-200';
    }
  };

  const getStatusLabel = (status: string) => {
    switch (status) {
      case 'active': case 'done': case 'completed': case 'ready': return 'Concluído';
      case 'in_progress': case 'processing': return 'Em Progresso';
      default: return 'Pendente';
    }
  };

  const getMilestoneStatusClass = (status: string) => {
    switch (status) {
      case 'done': case 'completed': return 'bg-green-500';
      case 'in_progress': return 'bg-primary';
      default: return 'bg-muted-foreground/30';
    }
  };

  return (
    <div className="min-h-screen bg-background flex">
      {/* Sidebar */}
      <div
        className={`fixed lg:static inset-y-0 left-0 z-40 w-64 bg-primary text-white transform transition-transform duration-300 ${
          sidebarOpen ? 'translate-x-0' : '-translate-x-full lg:translate-x-0'
        }`}
      >
        <div className="h-full flex flex-col">
          {/* Logo */}
          <div className="p-4 border-b border-white/10">
            <div className="rounded-lg p-3">
              <Image src="/logo-ximples-white.png" alt="Ximples" width={160} height={48} className="w-40 h-auto" />
            </div>
          </div>

          {/* Content */}
          <div className="flex-1 overflow-y-auto p-4 space-y-3">
            <Button onClick={handleNewChat} className="w-full bg-white/20 hover:bg-white/30 text-white justify-start gap-2">
              <Plus className="w-4 h-4" />
              Novo Chat
            </Button>

            {/* Primary navigation */}
            <div className="pt-2 space-y-1">
              <button
                onClick={() => router.push('/campaigns')}
                className="w-full text-left px-3 py-2 rounded-lg text-sm hover:bg-white/10 transition-colors flex items-center gap-2"
              >
                <Megaphone className="w-4 h-4" />
                Campanhas
              </button>
              <button
                onClick={() => router.push('/contacts')}
                className="w-full text-left px-3 py-2 rounded-lg text-sm hover:bg-white/10 transition-colors flex items-center gap-2"
              >
                <Users className="w-4 h-4" />
                Contatos
              </button>
              <button
                onClick={() => router.push('/lists')}
                className="w-full text-left px-3 py-2 rounded-lg text-sm hover:bg-white/10 transition-colors flex items-center gap-2"
              >
                <ListChecks className="w-4 h-4" />
                Listas
              </button>
              <button
                onClick={() => router.push('/analytics')}
                className="w-full text-left px-3 py-2 rounded-lg text-sm hover:bg-white/10 transition-colors flex items-center gap-2"
              >
                <BarChart3 className="w-4 h-4" />
                Analytics
              </button>
              <button
                onClick={() => router.push('/templates')}
                className="w-full text-left px-3 py-2 rounded-lg text-sm hover:bg-white/10 transition-colors flex items-center gap-2"
              >
                <LayoutTemplate className="w-4 h-4" />
                Templates
              </button>
            </div>

            <div className="pt-4">
              <p className="text-xs font-semibold text-white/60 mb-2 px-2">RECENTES</p>
              {isLoadingChats ? (
                <div className="flex justify-center py-4">
                  <Loader2 className="w-4 h-4 animate-spin text-white/60" />
                </div>
              ) : chats.length === 0 ? (
                <p className="text-xs text-white/40 px-2">Nenhum chat encontrado</p>
              ) : (
                <div className="space-y-1">
                  {chats.map((chat) => (
                    <div
                      key={chat.id}
                      className={`group relative flex items-center rounded-lg text-sm hover:bg-white/10 transition-colors ${
                        activeChat?.id === chat.id ? 'bg-white/15' : ''
                      }`}
                    >
                      <button
                        onClick={() => {
                          // Switching chats drops any active template context.
                          clearActiveTemplate();
                          loadChat(chat.id);
                        }}
                        className="flex-1 text-left px-3 py-2 truncate pr-9"
                      >
                        {chat.title}
                      </button>
                      <button
                        onClick={(e) => handleDeleteChat(chat.id, e)}
                        aria-label="Excluir chat"
                        title="Excluir chat"
                        className="absolute right-1 top-1/2 -translate-y-1/2 p-1.5 rounded-md opacity-0 group-hover:opacity-100 hover:bg-white/20 text-white/70 hover:text-red-400 transition"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>

          {/* Token Balance + Plan */}
          <div className="p-4 border-t border-white/10 space-y-3">
            {/* Token Balance */}
            <button
              onClick={() => router.push('/tokens')}
              className="w-full bg-white/10 hover:bg-white/15 rounded-lg p-3 transition-colors text-left"
            >
              <div className="flex items-center gap-2 mb-1">
                <Coins className="w-4 h-4 text-yellow-400" />
                <p className="text-xs text-white/60">Tokens</p>
              </div>
              <p className="font-bold text-lg">{tokenBalance}</p>
              <p className="text-xs text-white/50">disponíveis</p>
            </button>

            {/* User Profile */}
            <div className="flex items-center gap-2 pt-2">
              <div className="w-8 h-8 bg-white/20 rounded-full flex items-center justify-center text-xs font-bold">
                {user?.name?.charAt(0) || 'U'}
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium truncate">{user?.name}</p>
                <p className="text-xs text-white/60 truncate">{user?.email}</p>
              </div>
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="ghost" size="sm" className="text-white hover:bg-white/10">
                    <MoreVertical className="w-4 h-4" />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end" className="w-48">
                  <DropdownMenuItem onClick={() => router.push('/tokens')}>Tokens</DropdownMenuItem>
                  <DropdownMenuItem onClick={() => router.push('/profile')}>Perfil</DropdownMenuItem>
                  <DropdownMenuItem onClick={() => router.push('/profile')}>Configurações</DropdownMenuItem>
                  <DropdownMenuItem onClick={() => { logout(); router.push('/login'); }}>
                    Sair
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            </div>
          </div>
        </div>
      </div>

      {/* Mobile overlay */}
      {sidebarOpen && (
        <div className="fixed inset-0 bg-black/50 lg:hidden z-30" onClick={() => setSidebarOpen(false)} />
      )}

      {/* Main Content */}
      <div className="flex-1 flex flex-col">
        {/* Topbar */}
        <div className="bg-white border-b border-border px-6 py-4 flex items-center justify-between sticky top-0 z-20">
          <div className="flex items-center gap-4">
            <Button variant="ghost" size="icon" onClick={() => setSidebarOpen(!sidebarOpen)} className="lg:hidden">
              {sidebarOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
            </Button>
            <div>
              <h2 className="font-semibold text-foreground">{activeChat?.title || 'Novo Chat'}</h2>
              <p className="text-sm text-muted-foreground">Acompanhe sua execução</p>
            </div>
          </div>

          <div className="flex items-center gap-3">
            {/* Token balance badge in topbar */}
            <button
              onClick={() => router.push('/tokens')}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-primary/10 hover:bg-primary/15 transition-colors"
            >
              <Coins className="w-3.5 h-3.5 text-primary" />
              <span className="text-sm font-semibold text-primary">{tokenBalance}</span>
            </button>
            <Badge variant="outline" className="bg-primary/10 text-primary border-primary/20">
              {activeChat ? '✓ Ativo' : 'Novo'}
            </Badge>
          </div>
        </div>

        {/* Main Area */}
        <div className="flex-1 overflow-auto">
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 p-6">
            {/* Chat Section */}
            <div className="lg:col-span-2 space-y-6">
              {/* Chat Card */}
              <Card className="flex flex-col h-[28rem] ximples-shadow">
                <div className="p-6 border-b border-border">
                  <h3 className="font-semibold text-foreground">Chat de Execução</h3>
                  <p className="text-sm text-muted-foreground">Converse com o Ximples</p>
                </div>

                <div className="flex-1 overflow-y-auto p-6 space-y-4">
                  {isLoadingChat ? (
                    <div className="flex justify-center items-center h-full">
                      <Loader2 className="w-6 h-6 animate-spin text-primary" />
                    </div>
                  ) : messages.length === 0 ? (
                    <div className="flex justify-center items-center h-full text-muted-foreground text-sm">
                      Envie uma mensagem para começar
                    </div>
                  ) : (
                    messages.map((msg) => (
                      <div key={msg.id} className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                        <div className={`max-w-xs lg:max-w-md px-4 py-3 rounded-lg ${
                          msg.role === 'user' ? 'ximples-message-user' : 'ximples-message-assistant'
                        }`}>
                          <p className="text-sm">{msg.content}</p>
                        </div>
                      </div>
                    ))
                  )}
                  {isSending && (
                    <div className="flex justify-start">
                      <div className="bg-secondary text-foreground px-4 py-3 rounded-lg">
                        <div className="flex gap-1">
                          <div className="w-2 h-2 bg-muted-foreground rounded-full animate-bounce" />
                          <div className="w-2 h-2 bg-muted-foreground rounded-full animate-bounce" style={{ animationDelay: '0.1s' }} />
                          <div className="w-2 h-2 bg-muted-foreground rounded-full animate-bounce" style={{ animationDelay: '0.2s' }} />
                        </div>
                      </div>
                    </div>
                  )}
                  <div ref={messagesEndRef} />
                </div>

                {/* Estimate + Insufficient balance alert */}
                <div className="border-t border-border">
                  {balanceAlert && (
                    <div className="px-4 pt-3">
                      <div className="flex items-center gap-2 p-3 rounded-lg bg-red-50 border border-red-200">
                        <AlertTriangle className="w-4 h-4 text-red-600 flex-shrink-0" />
                        <div className="flex-1 text-sm">
                          <p className="text-red-700 font-medium">Saldo insuficiente</p>
                          <p className="text-red-600 text-xs">
                            Necessário: {balanceAlert.required} tokens | Seu saldo: {balanceAlert.current} tokens
                          </p>
                        </div>
                        <Button
                          size="sm"
                          onClick={() => router.push('/tokens')}
                          className="ximples-button-primary text-xs px-3 py-1"
                        >
                          Comprar tokens
                        </Button>
                      </div>
                    </div>
                  )}

                  {estimate && !balanceAlert && (
                    <div className="px-4 pt-3">
                      <div className={`flex items-center gap-2 text-xs px-3 py-2 rounded-lg ${
                        estimate.enough_balance
                          ? 'bg-blue-50 text-blue-700'
                          : 'bg-amber-50 text-amber-700'
                      }`}>
                        <Coins className="w-3.5 h-3.5" />
                        <span>
                          Esta ação pode consumir <strong>{estimate.estimated_token_cost} tokens</strong>
                          {!estimate.enough_balance && ' (saldo insuficiente)'}
                        </span>
                      </div>
                    </div>
                  )}

                  {isEstimating && !estimate && (
                    <div className="px-4 pt-3">
                      <div className="flex items-center gap-2 text-xs px-3 py-2 rounded-lg bg-gray-50 text-gray-500">
                        <Loader2 className="w-3 h-3 animate-spin" />
                        <span>Estimando custo...</span>
                      </div>
                    </div>
                  )}

                  {activeTemplate && (
                    <div className="px-4 pt-3">
                      <div className="flex items-center gap-2 text-xs px-3 py-2 rounded-lg bg-[#EEF3FB] text-[#183A6B] border border-[#D8E2F0]">
                        <Sparkles className="w-3.5 h-3.5" />
                        <span className="flex-1 truncate">
                          Usando template: <strong>{activeTemplate.name}</strong>
                        </span>
                        <button
                          type="button"
                          onClick={clearActiveTemplate}
                          aria-label="Remover template"
                          className="p-0.5 rounded hover:bg-[#D8E2F0] text-[#5B6B84] transition"
                        >
                          <X className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </div>
                  )}

                  <div className="p-4">
                    <div className="flex gap-2">
                      <Input
                        placeholder={activeTemplate ? `Descreva seu produto para adaptar o template ${activeTemplate.name}...` : 'Digite seu pedido...'}
                        value={messageInput}
                        onChange={(e) => handleInputChange(e.target.value)}
                        onKeyDown={(e) => e.key === 'Enter' && !e.shiftKey && handleSendMessage()}
                        className="ximples-input"
                        disabled={isSending}
                      />
                      <Button
                        onClick={handleSendMessage}
                        disabled={isSending || !messageInput.trim()}
                        className="ximples-button-primary"
                      >
                        <Send className="w-4 h-4" />
                      </Button>
                    </div>
                  </div>
                </div>
              </Card>

              {/* Assets List */}
              <Card className="ximples-shadow">
                <div className="p-6 border-b border-border">
                  <h3 className="font-semibold text-foreground">O que já foi produzido</h3>
                </div>
                <div className="divide-y divide-border">
                  {assets.length === 0 ? (
                    <div className="p-6 text-center text-sm text-muted-foreground">
                      Nenhum ativo gerado ainda
                    </div>
                  ) : (
                    assets.map((asset) => (
                      <div
                        key={asset.id}
                        className={`p-4 hover:bg-secondary/50 transition-colors flex items-center justify-between ${
                          highlightedAssetIds.has(asset.id) ? 'bg-blue-50 animate-in fade-in' : ''
                        }`}
                      >
                        <div className="flex items-center gap-3 flex-1 min-w-0">
                          <div className="w-10 h-10 rounded-lg bg-secondary flex items-center justify-center text-primary flex-shrink-0">
                            {getTypeIcon(asset.type)}
                          </div>
                          <div className="min-w-0">
                            <div className="flex items-center gap-2">
                              <p className="font-medium text-foreground text-sm">{asset.name}</p>
                              {highlightedAssetIds.has(asset.id) && (
                                <Badge className="bg-blue-600 text-white text-[10px] px-1.5 py-0">
                                  <Sparkles className="w-2.5 h-2.5 mr-0.5" />
                                  Novo
                                </Badge>
                              )}
                            </div>
                            <p className="text-xs text-muted-foreground">
                              {new Date(asset.created_at).toLocaleDateString('pt-BR')}
                            </p>
                            {asset.page && (
                              <div className="flex items-center gap-3 mt-1.5">
                                <a
                                  href={`/pages/${asset.page.id}/preview`}
                                  target="_blank"
                                  rel="noopener noreferrer"
                                  className="inline-flex items-center gap-1 text-xs text-primary hover:underline"
                                >
                                  <Eye className="w-3 h-3" />
                                  Preview
                                </a>
                                <a
                                  href={`/l/${asset.page.slug}`}
                                  target="_blank"
                                  rel="noopener noreferrer"
                                  className="inline-flex items-center gap-1 text-xs text-primary hover:underline"
                                >
                                  <ExternalLink className="w-3 h-3" />
                                  URL pública
                                </a>
                                <button
                                  onClick={async () => {
                                    const pageId = asset.page!.id;
                                    setExportingPageId(pageId);
                                    const toastId = toast.loading('Exportando HTML...');
                                    try {
                                      const result = await pagesApiService.export(pageId);
                                      toast.success('HTML exportado com sucesso.', { id: toastId });
                                      window.open(result.download_url, '_blank');
                                    } catch (e) {
                                      toast.error(
                                        e instanceof Error ? e.message : 'Falha ao exportar HTML.',
                                        { id: toastId },
                                      );
                                    } finally {
                                      setExportingPageId(null);
                                    }
                                  }}
                                  disabled={exportingPageId === asset.page.id}
                                  className="inline-flex items-center gap-1 text-xs text-primary hover:underline disabled:opacity-50"
                                >
                                  {exportingPageId === asset.page.id ? (
                                    <Loader2 className="w-3 h-3 animate-spin" />
                                  ) : (
                                    <Download className="w-3 h-3" />
                                  )}
                                  {exportingPageId === asset.page.id ? 'Exportando...' : 'Exportar HTML'}
                                </button>
                              </div>
                            )}
                          </div>
                        </div>
                        <div className="flex items-center gap-2 flex-shrink-0">
                          <Badge className={`text-xs ${getStatusColor(asset.status)}`}>
                            {getStatusLabel(asset.status)}
                          </Badge>
                          <button
                            onClick={() => handleDeleteAsset(asset)}
                            disabled={deletingAssetId === asset.id}
                            title="Excluir"
                            className="p-1.5 rounded-md text-muted-foreground hover:text-red-600 hover:bg-red-50 transition-colors disabled:opacity-50"
                          >
                            {deletingAssetId === asset.id ? (
                              <Loader2 className="w-4 h-4 animate-spin" />
                            ) : (
                              <Trash2 className="w-4 h-4" />
                            )}
                          </button>
                        </div>
                      </div>
                    ))
                  )}
                </div>
              </Card>
            </div>

            {/* Right Sidebar */}
            <div className="space-y-6">
              {/* Token Balance Card */}
              <Card className="ximples-shadow p-6">
                <div className="flex items-center gap-3 mb-3">
                  <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center">
                    <Coins className="w-5 h-5 text-primary" />
                  </div>
                  <div>
                    <p className="text-xs text-muted-foreground">Saldo de tokens</p>
                    <p className="text-2xl font-bold text-primary">{tokenBalance}</p>
                  </div>
                </div>
                <Button
                  variant="outline"
                  size="sm"
                  className="w-full text-xs"
                  onClick={() => router.push('/tokens')}
                >
                  Ver detalhes
                </Button>
              </Card>

              {/* Milestones */}
              <Card className="ximples-shadow">
                <div className="p-6 border-b border-border">
                  <h3 className="font-semibold text-foreground">Marcos da Execução</h3>
                </div>
                <div className="space-y-4 p-6">
                  {milestones.length === 0 ? (
                    <p className="text-sm text-muted-foreground text-center">Nenhum marco ainda</p>
                  ) : (
                    milestones.map((milestone) => (
                      <div key={milestone.id}>
                        <div className="flex items-center justify-between mb-2">
                          <p className="text-sm font-medium text-foreground">{milestone.title}</p>
                          <span className="text-xs text-muted-foreground">
                            {milestone.status === 'done' ? '✓' : `${milestone.progress}%`}
                          </span>
                        </div>
                        <div className="w-full h-2 bg-secondary rounded-full overflow-hidden">
                          <div
                            className={`h-full transition-all ${getMilestoneStatusClass(milestone.status)}`}
                            style={{ width: `${milestone.progress}%` }}
                          />
                        </div>
                      </div>
                    ))
                  )}
                </div>
              </Card>

              {/* Summary Metrics */}
              <div className="grid gap-4">
                {[
                  { label: 'Ativos Criados', value: assets.length.toString() },
                  { label: 'Marcos Ativos', value: milestones.filter(m => m.status === 'in_progress').length.toString() },
                  { label: 'Marcos Concluídos', value: milestones.filter(m => m.status === 'done').length.toString() },
                ].map((metric) => (
                  <Card key={metric.label} className="p-4 ximples-shadow">
                    <p className="text-sm text-muted-foreground mb-1">{metric.label}</p>
                    <p className="text-2xl font-bold text-primary">{metric.value}</p>
                  </Card>
                ))}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

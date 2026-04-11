'use client';

import { useCallback, useEffect, useState, useMemo, type ReactNode } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { ProtectedRoute } from '@/components/protected-route';
import { assetsService } from '@/services/assets.service';
import { emailSequenceService, type SequenceStats } from '@/services/email-sequence.service';
import { listsService, type ContactList } from '@/services/contacts.service';
import type { Asset } from '@/types';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import {
  ArrowLeft,
  Mail,
  Smartphone,
  BarChart3,
  Clock,
  Copy,
  CheckCircle2,
  Pencil,
  Trash2,
  Loader2,
  Plus,
  X,
  Send,
  MessageSquare,
  FileText,
  Inbox,
  Zap,
  Timer,
  Hash,
  Users,
  Activity,
  Eye,
  MousePointer,
  AlertTriangle,
  RefreshCw,
  Play,
} from 'lucide-react';
import { toast } from 'sonner';

/* ═══════════════════════════════════════════════════════
   TYPES
   ═══════════════════════════════════════════════════════ */

interface EmailItem {
  sequence: number;
  subject: string;
  body: string;
  delay_hours: number;
}

interface WhatsAppItem {
  sequence: number;
  text: string;
  delay_hours: number;
  type: string;
}

interface ParsedContent {
  emails: EmailItem[];
  messages: WhatsAppItem[];
  stages: Array<{ name: string; order: number; color: string }>;
  raw: Record<string, unknown> | null;
}

/* ═══════════════════════════════════════════════════════
   UTILITY FUNCTIONS
   ═══════════════════════════════════════════════════════ */

function safeParseContent(content: unknown): ParsedContent {
  const result: ParsedContent = { emails: [], messages: [], stages: [], raw: null };

  if (!content) return result;

  let parsed: Record<string, unknown>;

  if (typeof content === 'string') {
    try {
      parsed = JSON.parse(content);
    } catch {
      return result;
    }
  } else if (typeof content === 'object' && !Array.isArray(content)) {
    parsed = content as Record<string, unknown>;
  } else if (Array.isArray(content)) {
    // If it's a raw array, try to detect the type
    const first = content[0] as Record<string, unknown> | undefined;
    if (first && 'subject' in first) {
      return { ...result, emails: content as EmailItem[] };
    }
    if (first && 'text' in first) {
      return { ...result, messages: content as WhatsAppItem[] };
    }
    return result;
  } else {
    return result;
  }

  result.raw = parsed;

  if (Array.isArray(parsed.emails)) {
    result.emails = parsed.emails as EmailItem[];
  }
  if (Array.isArray(parsed.messages)) {
    result.messages = parsed.messages as WhatsAppItem[];
  }
  if (Array.isArray(parsed.stages)) {
    result.stages = parsed.stages as ParsedContent['stages'];
  }

  return result;
}

function formatDelayHours(hours: number): string {
  if (hours === 0) return 'Envio imediato';
  if (hours < 1) return `Após ${Math.round(hours * 60)} minutos`;
  if (hours === 1) return 'Após 1 hora';
  if (hours < 24) return `Após ${hours} horas`;
  if (hours === 24) return 'Após 1 dia';
  const days = Math.round(hours / 24);
  if (days === 1) return 'Após 1 dia';
  if (days < 7) return `Após ${days} dias`;
  const weeks = Math.round(days / 7);
  if (weeks === 1) return 'Após 1 semana';
  return `Após ${weeks} semanas`;
}

function formatDelayShort(hours: number): string {
  if (hours === 0) return 'Imediato';
  if (hours < 24) return `${hours}h`;
  const days = Math.round(hours / 24);
  return `${days}d`;
}

function highlightPlaceholders(text: string): ReactNode[] {
  const parts = text.split(/(\{\{[^}]+\}\})/g);
  return parts.map((part, i) => {
    if (/^\{\{[^}]+\}\}$/.test(part)) {
      const varName = part.slice(2, -2).trim();
      return (
        <span
          key={i}
          className="inline-flex items-center gap-0.5 px-1.5 py-0.5 mx-0.5 rounded-md bg-amber-100 text-amber-800 text-xs font-semibold border border-amber-200/60 align-baseline"
        >
          <Hash className="w-2.5 h-2.5 opacity-60" />
          {varName}
        </span>
      );
    }
    return <span key={i}>{part}</span>;
  });
}

function renderFormattedText(text: string): ReactNode {
  const lines = text.split('\n');
  return lines.map((line, i) => (
    <span key={i}>
      {highlightPlaceholders(line)}
      {i < lines.length - 1 && <br />}
    </span>
  ));
}

/* ═══════════════════════════════════════════════════════
   EMPTY STATE
   ═══════════════════════════════════════════════════════ */

function EmptyContentState({ type }: { type: 'email' | 'whatsapp' | 'crm' | string }) {
  const config = {
    email: {
      icon: <Inbox className="w-10 h-10 text-blue-300" />,
      title: 'Nenhum email na sequência',
      description: 'Esta sequência ainda não possui emails configurados.',
    },
    whatsapp: {
      icon: <MessageSquare className="w-10 h-10 text-green-300" />,
      title: 'Nenhuma mensagem no fluxo',
      description: 'Este fluxo ainda não possui mensagens configuradas.',
    },
    crm: {
      icon: <BarChart3 className="w-10 h-10 text-purple-300" />,
      title: 'Nenhuma etapa no pipeline',
      description: 'Este pipeline ainda não possui etapas configuradas.',
    },
  };

  const c = config[type as keyof typeof config] ?? config.email;

  return (
    <div className="flex flex-col items-center justify-center py-16 px-6 rounded-2xl border-2 border-dashed border-gray-200 bg-gray-50/50">
      {c.icon}
      <p className="mt-4 text-sm font-semibold text-gray-500">{c.title}</p>
      <p className="mt-1 text-xs text-gray-400 text-center max-w-xs">{c.description}</p>
    </div>
  );
}

/* ═══════════════════════════════════════════════════════
   EMAIL SEQUENCE VIEWER
   ═══════════════════════════════════════════════════════ */

function EmailSequenceViewer({ content }: { content: Record<string, unknown> }) {
  const { emails } = safeParseContent(content);

  if (emails.length === 0) {
    return <EmptyContentState type="email" />;
  }

  const totalDuration = emails.reduce((sum, e) => sum + e.delay_hours, 0);

  return (
    <div className="space-y-0">
      {/* Section header */}
      <div className="flex items-center justify-between mb-5">
        <div className="flex items-center gap-2.5">
          <div className="flex items-center justify-center w-8 h-8 rounded-lg bg-blue-100">
            <Mail className="w-4 h-4 text-blue-600" />
          </div>
          <div>
            <h2 className="text-sm font-bold text-gray-900">Sequência de Emails</h2>
            <p className="text-xs text-gray-500">
              {emails.length} {emails.length === 1 ? 'email' : 'emails'} · Duração: {formatDelayHours(totalDuration).replace('Após ', '') || 'imediato'}
            </p>
          </div>
        </div>
        <span className="flex items-center gap-1.5 text-xs font-medium text-blue-600 bg-blue-50 px-3 py-1.5 rounded-full border border-blue-100">
          <Zap className="w-3 h-3" />
          Automação ativa
        </span>
      </div>

      {/* Timeline */}
      <div className="relative">
        {emails.map((email, idx) => {
          const isFirst = idx === 0;
          const isLast = idx === emails.length - 1;

          return (
            <div key={idx} className="relative flex gap-4">
              {/* Timeline bar */}
              <div className="flex flex-col items-center relative">
                {/* Connector line above (except first) */}
                {!isFirst && (
                  <div className="w-0.5 h-4 bg-gradient-to-b from-blue-200 to-blue-400" />
                )}
                {/* Circle */}
                <div className="relative z-10 flex items-center justify-center w-10 h-10 rounded-full bg-gradient-to-br from-blue-500 to-blue-700 text-white text-sm font-bold shadow-lg shadow-blue-200/50 ring-4 ring-white">
                  {email.sequence}
                </div>
                {/* Connector line below (except last) */}
                {!isLast && (
                  <div className="flex-1 w-0.5 bg-gradient-to-b from-blue-400 to-blue-200 min-h-[1rem]" />
                )}
              </div>

              {/* Card */}
              <div className="flex-1 pb-1">
                <Card className="overflow-hidden border border-gray-200/80 bg-white shadow-sm hover:shadow-md transition-all duration-200 group">
                  {/* Card header */}
                  <div className="flex items-center justify-between px-4 py-3 bg-gradient-to-r from-blue-50/80 to-indigo-50/40 border-b border-blue-100/50">
                    <div className="flex items-center gap-2 min-w-0 flex-1">
                      <Mail className="w-3.5 h-3.5 text-blue-500 flex-shrink-0" />
                      <span className="text-xs font-semibold text-blue-700 uppercase tracking-wide flex-shrink-0">
                        Email {email.sequence}
                      </span>
                      <span className="text-gray-300 flex-shrink-0">·</span>
                      <span className="text-xs text-gray-500 truncate">
                        {email.subject}
                      </span>
                    </div>
                    <span className="flex items-center gap-1 text-[11px] font-medium text-blue-600 bg-white/80 px-2 py-1 rounded-full border border-blue-100 flex-shrink-0 ml-2">
                      <Timer className="w-3 h-3" />
                      {formatDelayShort(email.delay_hours)}
                    </span>
                  </div>

                  {/* Subject */}
                  <div className="px-4 pt-3 pb-2">
                    <p className="text-sm font-semibold text-gray-900 leading-snug">
                      {highlightPlaceholders(email.subject)}
                    </p>
                  </div>

                  {/* Body */}
                  <div className="px-4 pb-4">
                    <div className="bg-gray-50 rounded-xl p-4 text-sm text-gray-700 leading-relaxed border border-gray-100">
                      {renderFormattedText(email.body)}
                    </div>
                  </div>
                </Card>

                {/* Delay pill between cards */}
                {!isLast && (
                  <div className="flex items-center gap-2 ml-1 my-2.5">
                    <Clock className="w-3.5 h-3.5 text-blue-400 flex-shrink-0" />
                    <span className="text-xs font-medium text-blue-600 bg-blue-50 px-2.5 py-1 rounded-full border border-blue-100/60">
                      {formatDelayHours(emails[idx + 1]?.delay_hours ?? 0)}
                    </span>
                    <div className="flex-1 h-px bg-gradient-to-r from-blue-200 to-transparent" />
                  </div>
                )}
              </div>
            </div>
          );
        })}
      </div>

      {/* Summary footer */}
      <div className="flex items-center gap-3 mt-5 p-4 bg-gradient-to-r from-blue-50 to-indigo-50 rounded-xl border border-blue-100">
        <div className="flex items-center justify-center w-9 h-9 rounded-full bg-gradient-to-br from-blue-500 to-blue-700 text-white shadow-sm">
          <CheckCircle2 className="w-4.5 h-4.5" />
        </div>
        <div>
          <p className="text-sm font-bold text-blue-900">
            Sequência completa · {emails.length} {emails.length === 1 ? 'email' : 'emails'}
          </p>
          <p className="text-xs text-blue-600 mt-0.5">
            Duração total da automação: {totalDuration === 0 ? 'envio imediato' : formatDelayHours(totalDuration).replace('Após ', '')}
          </p>
        </div>
      </div>
    </div>
  );
}

/* ═══════════════════════════════════════════════════════
   WHATSAPP FLOW VIEWER
   ═══════════════════════════════════════════════════════ */

const WHATSAPP_TYPE_BADGES: Record<string, { label: string; className: string }> = {
  text: {
    label: 'Texto',
    className: 'bg-green-100 text-green-700 border-green-200',
  },
  media: {
    label: 'Mídia',
    className: 'bg-violet-100 text-violet-700 border-violet-200',
  },
  audio: {
    label: 'Áudio',
    className: 'bg-orange-100 text-orange-700 border-orange-200',
  },
  document: {
    label: 'Documento',
    className: 'bg-sky-100 text-sky-700 border-sky-200',
  },
};

function WhatsAppFlowViewer({ content }: { content: Record<string, unknown> }) {
  const { messages } = safeParseContent(content);

  if (messages.length === 0) {
    return <EmptyContentState type="whatsapp" />;
  }

  const totalDuration = messages.reduce((sum, m) => sum + m.delay_hours, 0);

  return (
    <div className="space-y-0">
      {/* Section header */}
      <div className="flex items-center justify-between mb-5">
        <div className="flex items-center gap-2.5">
          <div className="flex items-center justify-center w-8 h-8 rounded-lg bg-green-100">
            <Smartphone className="w-4 h-4 text-green-600" />
          </div>
          <div>
            <h2 className="text-sm font-bold text-gray-900">Fluxo de WhatsApp</h2>
            <p className="text-xs text-gray-500">
              {messages.length} {messages.length === 1 ? 'mensagem' : 'mensagens'} · Duração: {formatDelayHours(totalDuration).replace('Após ', '') || 'imediato'}
            </p>
          </div>
        </div>
        <span className="flex items-center gap-1.5 text-xs font-medium text-green-600 bg-green-50 px-3 py-1.5 rounded-full border border-green-100">
          <Send className="w-3 h-3" />
          Automação ativa
        </span>
      </div>

      {/* Chat container */}
      <div className="relative bg-gradient-to-b from-[#eae6df] to-[#d9d2c5] rounded-2xl overflow-hidden border border-gray-300/50 shadow-inner">
        {/* WhatsApp-style header bar */}
        <div className="flex items-center gap-3 px-5 py-3.5 bg-gradient-to-r from-[#075e54] to-[#128c7e]">
          <div className="w-9 h-9 rounded-full bg-white/20 flex items-center justify-center backdrop-blur-sm">
            <Smartphone className="w-4 h-4 text-white" />
          </div>
          <div className="flex-1">
            <p className="text-sm font-semibold text-white">Fluxo Automático</p>
            <p className="text-[11px] text-green-100/80">
              {messages.length} {messages.length === 1 ? 'etapa' : 'etapas'} configuradas
            </p>
          </div>
        </div>

        {/* Messages area */}
        <div className="px-4 py-5 space-y-1">
          {messages.map((msg, idx) => {
            const isFirst = idx === 0;
            const isLast = idx === messages.length - 1;
            const badge = WHATSAPP_TYPE_BADGES[msg.type] ?? WHATSAPP_TYPE_BADGES.text;

            return (
              <div key={idx}>
                {/* Delay / start divider */}
                {isFirst && (
                  <div className="flex items-center justify-center mb-4">
                    <div className="bg-white/90 backdrop-blur-sm text-[11px] text-gray-600 font-semibold px-4 py-1.5 rounded-lg shadow-sm">
                      Início do funil
                    </div>
                  </div>
                )}
                {!isFirst && msg.delay_hours > 0 && (
                  <div className="flex items-center justify-center my-4">
                    <div className="bg-white/90 backdrop-blur-sm text-[11px] text-gray-600 font-medium px-4 py-1.5 rounded-lg shadow-sm flex items-center gap-1.5">
                      <Clock className="w-3 h-3 text-gray-400" />
                      {formatDelayHours(msg.delay_hours)}
                    </div>
                  </div>
                )}

                {/* Message bubble */}
                <div className="flex items-start gap-2.5 mb-1.5">
                  {/* Step number */}
                  <div className="flex flex-col items-center mt-1">
                    <div className="w-8 h-8 rounded-full bg-gradient-to-br from-green-500 to-green-700 text-white text-xs font-bold flex items-center justify-center shadow-md ring-2 ring-white/50">
                      {msg.sequence}
                    </div>
                    {!isLast && (
                      <div className="w-0.5 h-5 bg-green-400/40 mt-1" />
                    )}
                  </div>

                  {/* Bubble card */}
                  <div className="flex-1 max-w-[88%]">
                    <div className="bg-white rounded-2xl rounded-tl-md p-0 shadow-sm relative overflow-hidden border border-gray-200/50">
                      {/* Bubble header */}
                      <div className="flex items-center justify-between px-3.5 py-2 bg-gray-50/80 border-b border-gray-100">
                        <div className="flex items-center gap-2">
                          <span className="text-[11px] font-bold text-green-700">
                            Mensagem {msg.sequence}
                          </span>
                          <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-semibold border ${badge.className}`}>
                            {badge.label}
                          </span>
                        </div>
                        <span className="flex items-center gap-1 text-[10px] text-gray-400 font-medium">
                          <Timer className="w-2.5 h-2.5" />
                          {formatDelayShort(msg.delay_hours)}
                        </span>
                      </div>

                      {/* Bubble body */}
                      <div className="px-3.5 py-3">
                        <div className="text-sm text-gray-800 leading-relaxed">
                          {renderFormattedText(msg.text)}
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            );
          })}

          {/* End indicator */}
          <div className="flex items-center justify-center pt-4 pb-1">
            <div className="bg-gradient-to-r from-green-600 to-green-700 text-white text-xs font-semibold px-5 py-2 rounded-full shadow-md flex items-center gap-2">
              <CheckCircle2 className="w-3.5 h-3.5" />
              Fim do funil · {messages.length} {messages.length === 1 ? 'etapa' : 'etapas'}
            </div>
          </div>
        </div>
      </div>

      {/* Summary footer */}
      <div className="flex items-center gap-3 mt-5 p-4 bg-gradient-to-r from-green-50 to-emerald-50 rounded-xl border border-green-100">
        <div className="flex items-center justify-center w-9 h-9 rounded-full bg-gradient-to-br from-green-500 to-green-700 text-white shadow-sm">
          <CheckCircle2 className="w-4.5 h-4.5" />
        </div>
        <div>
          <p className="text-sm font-bold text-green-900">
            Fluxo completo · {messages.length} {messages.length === 1 ? 'mensagem' : 'mensagens'}
          </p>
          <p className="text-xs text-green-600 mt-0.5">
            Duração total: {totalDuration === 0 ? 'envio imediato' : formatDelayHours(totalDuration).replace('Após ', '')}
          </p>
        </div>
      </div>
    </div>
  );
}

/* ═══════════════════════════════════════════════════════
   CRM PIPELINE VIEWER
   ═══════════════════════════════════════════════════════ */

function CrmPipelineViewer({ content }: { content: Record<string, unknown> }) {
  const { stages } = safeParseContent(content);

  if (stages.length === 0) {
    return <EmptyContentState type="crm" />;
  }

  return (
    <div className="flex gap-3 overflow-x-auto pb-2">
      {stages.map((stage, idx) => (
        <Card
          key={idx}
          className="flex-shrink-0 w-48 p-4 border-t-4 border-gray-200"
          style={{ borderTopColor: stage.color }}
        >
          <div className="flex items-center gap-2 mb-2">
            <div
              className="w-3 h-3 rounded-full"
              style={{ backgroundColor: stage.color }}
            />
            <span className="text-xs font-semibold text-muted-foreground">
              Etapa {stage.order}
            </span>
          </div>
          <h4 className="font-semibold text-foreground text-sm">{stage.name}</h4>
        </Card>
      ))}
    </div>
  );
}

/* ═══════════════════════════════════════════════════════
   TYPE CONFIG
   ═══════════════════════════════════════════════════════ */

const TYPE_META: Record<string, { label: string; icon: React.ReactNode; color: string }> = {
  email: {
    label: 'Sequência de Email',
    icon: <Mail className="w-5 h-5" />,
    color: 'text-blue-600 bg-blue-50',
  },
  whatsapp: {
    label: 'Fluxo de WhatsApp',
    icon: <Smartphone className="w-5 h-5" />,
    color: 'text-green-600 bg-green-50',
  },
  crm: {
    label: 'Pipeline CRM',
    icon: <BarChart3 className="w-5 h-5" />,
    color: 'text-purple-600 bg-purple-50',
  },
};

/* ═══════════════════════════════════════════════════════
   EDIT EMAIL MODAL
   ═══════════════════════════════════════════════════════ */

function EditEmailModal({
  open,
  onOpenChange,
  emails,
  onSave,
  saving,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  emails: EmailItem[];
  onSave: (emails: EmailItem[]) => void;
  saving: boolean;
}) {
  const [items, setItems] = useState<EmailItem[]>([]);

  useEffect(() => {
    if (open) setItems(emails.map((e) => ({ ...e })));
  }, [open, emails]);

  const updateItem = (idx: number, field: keyof EmailItem, value: string | number) => {
    setItems((prev) => prev.map((item, i) => (i === idx ? { ...item, [field]: value } : item)));
  };

  const addItem = () => {
    setItems((prev) => [
      ...prev,
      { sequence: prev.length + 1, subject: '', body: '', delay_hours: 24 },
    ]);
  };

  const removeItem = (idx: number) => {
    setItems((prev) => prev.filter((_, i) => i !== idx).map((item, i) => ({ ...item, sequence: i + 1 })));
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[85vh] flex flex-col">
        <DialogHeader className="flex-shrink-0">
          <div className="flex items-center gap-2.5">
            <div className="flex items-center justify-center w-8 h-8 rounded-lg bg-blue-100">
              <Pencil className="w-4 h-4 text-blue-600" />
            </div>
            <div>
              <DialogTitle className="text-base">Editar Sequência de Email</DialogTitle>
              <p className="text-xs text-muted-foreground mt-0.5">
                {items.length} {items.length === 1 ? 'email' : 'emails'} na sequência
              </p>
            </div>
          </div>
        </DialogHeader>

        <div className="flex-1 overflow-y-auto space-y-4 py-4 pr-1 -mr-1">
          {items.map((email, idx) => (
            <div key={idx} className="relative border border-blue-100 rounded-xl overflow-hidden bg-white shadow-sm">
              {/* Card header */}
              <div className="flex items-center justify-between px-4 py-2.5 bg-gradient-to-r from-blue-50 to-indigo-50/50 border-b border-blue-100/60">
                <div className="flex items-center gap-2">
                  <div className="flex items-center justify-center w-6 h-6 rounded-full bg-blue-600 text-white text-[11px] font-bold">
                    {email.sequence}
                  </div>
                  <span className="text-sm font-semibold text-blue-800">
                    Email {email.sequence}
                  </span>
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-[11px] text-blue-500 font-medium">
                    {formatDelayHours(email.delay_hours)}
                  </span>
                  {items.length > 1 && (
                    <Button
                      variant="ghost"
                      size="sm"
                      className="h-7 w-7 p-0 text-red-400 hover:text-red-600 hover:bg-red-50 rounded-full"
                      onClick={() => removeItem(idx)}
                    >
                      <X className="w-3.5 h-3.5" />
                    </Button>
                  )}
                </div>
              </div>

              {/* Card body */}
              <div className="px-4 py-3 space-y-3">
                <div>
                  <Label className="text-xs font-medium text-gray-500">Assunto</Label>
                  <Input
                    value={email.subject}
                    onChange={(e) => updateItem(idx, 'subject', e.target.value)}
                    placeholder="Ex: Bem-vindo(a) à nossa comunidade"
                    className="mt-1 border-gray-200 focus:border-blue-300"
                  />
                </div>
                <div>
                  <Label className="text-xs font-medium text-gray-500">Corpo do email</Label>
                  <Textarea
                    value={email.body}
                    onChange={(e) => updateItem(idx, 'body', e.target.value)}
                    placeholder="Use {{nome}}, {{email}} para personalizar..."
                    rows={4}
                    className="mt-1 border-gray-200 focus:border-blue-300 resize-none"
                  />
                </div>
                <div>
                  <Label className="text-xs font-medium text-gray-500">Delay</Label>
                  <div className="flex items-center gap-2 mt-1">
                    <Input
                      type="number"
                      min={0}
                      value={email.delay_hours}
                      onChange={(e) => updateItem(idx, 'delay_hours', Number(e.target.value))}
                      className="w-24 border-gray-200 focus:border-blue-300"
                    />
                    <span className="text-xs text-gray-400">horas</span>
                    <span className="text-xs text-blue-500 ml-1">= {formatDelayHours(email.delay_hours)}</span>
                  </div>
                </div>
              </div>
            </div>
          ))}

          <button
            onClick={addItem}
            className="w-full flex items-center justify-center gap-2 py-3 border-2 border-dashed border-blue-200 rounded-xl text-sm font-medium text-blue-500 hover:border-blue-400 hover:text-blue-600 hover:bg-blue-50/50 transition-colors"
          >
            <Plus className="w-4 h-4" />
            Adicionar email à sequência
          </button>
        </div>

        <DialogFooter className="flex-shrink-0 border-t border-gray-100 pt-4">
          <Button variant="ghost" onClick={() => onOpenChange(false)} disabled={saving}>
            Cancelar
          </Button>
          <Button onClick={() => onSave(items)} disabled={saving} className="bg-blue-600 hover:bg-blue-700">
            {saving && <Loader2 className="w-4 h-4 mr-1.5 animate-spin" />}
            Salvar alterações
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

/* ═══════════════════════════════════════════════════════
   EDIT WHATSAPP MODAL
   ═══════════════════════════════════════════════════════ */

function EditWhatsAppModal({
  open,
  onOpenChange,
  messages,
  onSave,
  saving,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  messages: WhatsAppItem[];
  onSave: (messages: WhatsAppItem[]) => void;
  saving: boolean;
}) {
  const [items, setItems] = useState<WhatsAppItem[]>([]);

  useEffect(() => {
    if (open) setItems(messages.map((m) => ({ ...m })));
  }, [open, messages]);

  const updateItem = (idx: number, field: keyof WhatsAppItem, value: string | number) => {
    setItems((prev) => prev.map((item, i) => (i === idx ? { ...item, [field]: value } : item)));
  };

  const addItem = () => {
    setItems((prev) => [
      ...prev,
      { sequence: prev.length + 1, text: '', delay_hours: 24, type: 'text' },
    ]);
  };

  const removeItem = (idx: number) => {
    setItems((prev) => prev.filter((_, i) => i !== idx).map((item, i) => ({ ...item, sequence: i + 1 })));
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[85vh] flex flex-col">
        <DialogHeader className="flex-shrink-0">
          <div className="flex items-center gap-2.5">
            <div className="flex items-center justify-center w-8 h-8 rounded-lg bg-green-100">
              <Pencil className="w-4 h-4 text-green-600" />
            </div>
            <div>
              <DialogTitle className="text-base">Editar Fluxo de WhatsApp</DialogTitle>
              <p className="text-xs text-muted-foreground mt-0.5">
                {items.length} {items.length === 1 ? 'mensagem' : 'mensagens'} no fluxo
              </p>
            </div>
          </div>
        </DialogHeader>

        <div className="flex-1 overflow-y-auto space-y-4 py-4 pr-1 -mr-1">
          {items.map((msg, idx) => {
            const badge = WHATSAPP_TYPE_BADGES[msg.type] ?? WHATSAPP_TYPE_BADGES.text;

            return (
              <div key={idx} className="relative border border-green-100 rounded-xl overflow-hidden bg-white shadow-sm">
                {/* Card header */}
                <div className="flex items-center justify-between px-4 py-2.5 bg-gradient-to-r from-green-50 to-emerald-50/50 border-b border-green-100/60">
                  <div className="flex items-center gap-2">
                    <div className="flex items-center justify-center w-6 h-6 rounded-full bg-green-600 text-white text-[11px] font-bold">
                      {msg.sequence}
                    </div>
                    <span className="text-sm font-semibold text-green-800">
                      Mensagem {msg.sequence}
                    </span>
                    <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-semibold border ${badge.className}`}>
                      {badge.label}
                    </span>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="text-[11px] text-green-500 font-medium">
                      {formatDelayHours(msg.delay_hours)}
                    </span>
                    {items.length > 1 && (
                      <Button
                        variant="ghost"
                        size="sm"
                        className="h-7 w-7 p-0 text-red-400 hover:text-red-600 hover:bg-red-50 rounded-full"
                        onClick={() => removeItem(idx)}
                      >
                        <X className="w-3.5 h-3.5" />
                      </Button>
                    )}
                  </div>
                </div>

                {/* Card body */}
                <div className="px-4 py-3 space-y-3">
                  <div>
                    <Label className="text-xs font-medium text-gray-500">Mensagem</Label>
                    <Textarea
                      value={msg.text}
                      onChange={(e) => updateItem(idx, 'text', e.target.value)}
                      placeholder="Use {{nome}}, {{telefone}} para personalizar..."
                      rows={3}
                      className="mt-1 border-gray-200 focus:border-green-300 resize-none"
                    />
                  </div>
                  <div className="flex gap-3">
                    <div>
                      <Label className="text-xs font-medium text-gray-500">Delay</Label>
                      <div className="flex items-center gap-2 mt-1">
                        <Input
                          type="number"
                          min={0}
                          value={msg.delay_hours}
                          onChange={(e) => updateItem(idx, 'delay_hours', Number(e.target.value))}
                          className="w-24 border-gray-200 focus:border-green-300"
                        />
                        <span className="text-xs text-gray-400">horas</span>
                        <span className="text-xs text-green-500 ml-1">= {formatDelayHours(msg.delay_hours)}</span>
                      </div>
                    </div>
                    <div>
                      <Label className="text-xs font-medium text-gray-500">Tipo</Label>
                      <select
                        value={msg.type}
                        onChange={(e) => updateItem(idx, 'type', e.target.value)}
                        className="mt-1 h-9 rounded-md border border-gray-200 bg-background px-3 text-sm focus:border-green-300 focus:outline-none focus:ring-1 focus:ring-green-200"
                      >
                        <option value="text">Texto</option>
                        <option value="media">Mídia</option>
                        <option value="audio">Áudio</option>
                        <option value="document">Documento</option>
                      </select>
                    </div>
                  </div>
                </div>
              </div>
            );
          })}

          <button
            onClick={addItem}
            className="w-full flex items-center justify-center gap-2 py-3 border-2 border-dashed border-green-200 rounded-xl text-sm font-medium text-green-500 hover:border-green-400 hover:text-green-600 hover:bg-green-50/50 transition-colors"
          >
            <Plus className="w-4 h-4" />
            Adicionar mensagem ao fluxo
          </button>
        </div>

        <DialogFooter className="flex-shrink-0 border-t border-gray-100 pt-4">
          <Button variant="ghost" onClick={() => onOpenChange(false)} disabled={saving}>
            Cancelar
          </Button>
          <Button onClick={() => onSave(items)} disabled={saving} className="bg-green-600 hover:bg-green-700">
            {saving && <Loader2 className="w-4 h-4 mr-1.5 animate-spin" />}
            Salvar alterações
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

/* ═══════════════════════════════════════════════════════
   EDIT NAME MODAL
   ═══════════════════════════════════════════════════════ */

function EditNameModal({
  open,
  onOpenChange,
  currentName,
  onSave,
  saving,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  currentName: string;
  onSave: (name: string) => void;
  saving: boolean;
}) {
  const [name, setName] = useState('');

  useEffect(() => {
    if (open) setName(currentName);
  }, [open, currentName]);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Renomear ativo</DialogTitle>
        </DialogHeader>
        <div className="py-4">
          <Label className="text-xs font-medium text-gray-500">Nome</Label>
          <Input
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="Nome do ativo"
            className="mt-1"
            autoFocus
          />
        </div>
        <DialogFooter>
          <Button variant="ghost" onClick={() => onOpenChange(false)} disabled={saving}>
            Cancelar
          </Button>
          <Button onClick={() => onSave(name)} disabled={saving || !name.trim()}>
            {saving && <Loader2 className="w-4 h-4 mr-1.5 animate-spin" />}
            Salvar
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

/* ═══════════════════════════════════════════════════════
   DISPATCH EMAIL MODAL
   ═══════════════════════════════════════════════════════ */

function DispatchEmailModal({
  open,
  onOpenChange,
  assetId,
  emailCount,
  onDispatched,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  assetId: number;
  emailCount: number;
  onDispatched: () => void;
}) {
  const [lists, setLists] = useState<ContactList[]>([]);
  const [selectedListId, setSelectedListId] = useState<number | null>(null);
  const [loadingLists, setLoadingLists] = useState(false);
  const [dispatching, setDispatching] = useState(false);

  useEffect(() => {
    if (!open) return;
    setLoadingLists(true);
    listsService
      .list()
      .then(setLists)
      .catch(() => toast.error('Erro ao carregar listas.'))
      .finally(() => setLoadingLists(false));
  }, [open]);

  const selectedList = lists.find((l) => l.id === selectedListId);
  const contactCount = selectedList?.contacts_count ?? 0;
  const totalEmails = contactCount * emailCount;

  const handleDispatch = async () => {
    if (!selectedListId) return;
    setDispatching(true);
    try {
      const result = await emailSequenceService.dispatch(assetId, selectedListId);
      toast.success(result.message);
      onOpenChange(false);
      onDispatched();
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Erro ao disparar sequência.';
      toast.error(msg);
    } finally {
      setDispatching(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <div className="flex items-center gap-2.5">
            <div className="flex items-center justify-center w-8 h-8 rounded-lg bg-blue-100">
              <Send className="w-4 h-4 text-blue-600" />
            </div>
            <div>
              <DialogTitle className="text-base">Disparar Sequência de Email</DialogTitle>
              <p className="text-xs text-muted-foreground mt-0.5">
                {emailCount} {emailCount === 1 ? 'email' : 'emails'} por contato
              </p>
            </div>
          </div>
        </DialogHeader>

        <div className="py-4 space-y-4">
          <div>
            <Label className="text-xs font-medium text-gray-500">Lista de contatos</Label>
            {loadingLists ? (
              <Skeleton className="h-9 w-full mt-1" />
            ) : lists.length === 0 ? (
              <p className="text-sm text-gray-400 mt-1">Nenhuma lista encontrada.</p>
            ) : (
              <select
                value={selectedListId ?? ''}
                onChange={(e) => setSelectedListId(e.target.value ? Number(e.target.value) : null)}
                className="mt-1 h-9 w-full rounded-md border border-gray-200 bg-background px-3 text-sm focus:border-blue-300 focus:outline-none focus:ring-1 focus:ring-blue-200"
              >
                <option value="">Selecione uma lista...</option>
                {lists.map((l) => (
                  <option key={l.id} value={l.id}>
                    {l.name} {l.contacts_count !== undefined ? `(${l.contacts_count} contatos)` : ''}
                  </option>
                ))}
              </select>
            )}
          </div>

          {selectedListId && (
            <div className="bg-blue-50 rounded-xl p-4 border border-blue-100 space-y-2">
              <div className="flex items-center justify-between text-sm">
                <span className="text-gray-600 flex items-center gap-1.5">
                  <Users className="w-3.5 h-3.5" /> Contatos
                </span>
                <span className="font-semibold text-gray-900">{contactCount}</span>
              </div>
              <div className="flex items-center justify-between text-sm">
                <span className="text-gray-600 flex items-center gap-1.5">
                  <Mail className="w-3.5 h-3.5" /> Etapas
                </span>
                <span className="font-semibold text-gray-900">{emailCount}</span>
              </div>
              <div className="flex items-center justify-between text-sm border-t border-blue-200/50 pt-2">
                <span className="text-gray-700 font-medium flex items-center gap-1.5">
                  <Send className="w-3.5 h-3.5" /> Total de emails
                </span>
                <span className="font-bold text-blue-700">{totalEmails}</span>
              </div>
            </div>
          )}
        </div>

        <DialogFooter>
          <Button variant="ghost" onClick={() => onOpenChange(false)} disabled={dispatching}>
            Cancelar
          </Button>
          <Button
            onClick={handleDispatch}
            disabled={dispatching || !selectedListId}
            className="bg-blue-600 hover:bg-blue-700"
          >
            {dispatching ? (
              <Loader2 className="w-4 h-4 mr-1.5 animate-spin" />
            ) : (
              <Play className="w-4 h-4 mr-1.5" />
            )}
            Disparar sequência
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

/* ═══════════════════════════════════════════════════════
   SEQUENCE STATS PANEL
   ═══════════════════════════════════════════════════════ */

const STATUS_COLORS: Record<string, string> = {
  pending: 'bg-gray-100 text-gray-700',
  processing: 'bg-yellow-100 text-yellow-700',
  sent: 'bg-blue-100 text-blue-700',
  delivered: 'bg-green-100 text-green-700',
  failed: 'bg-red-100 text-red-700',
  bounced: 'bg-orange-100 text-orange-700',
  skipped: 'bg-gray-100 text-gray-500',
};

function SequenceStatsPanel({ assetId }: { assetId: number }) {
  const [stats, setStats] = useState<SequenceStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const loadStats = useCallback(async (showRefresh = false) => {
    if (showRefresh) setRefreshing(true);
    else setLoading(true);
    try {
      const data = await emailSequenceService.getStats(assetId);
      setStats(data);
    } catch {
      // silent — panel is optional
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [assetId]);

  useEffect(() => {
    loadStats();
  }, [loadStats]);

  if (loading) {
    return (
      <div className="mt-8">
        <Skeleton className="h-6 w-48 mb-4" />
        <Skeleton className="h-32 w-full rounded-xl" />
      </div>
    );
  }

  if (!stats || stats.stats.total === 0) {
    return null;
  }

  const s = stats.stats;
  const sentOrDelivered = (s.sent ?? 0) + (s.delivered ?? 0);
  const failedOrBounced = (s.failed ?? 0) + (s.bounced ?? 0);
  const total = s.total ?? 1;
  const successRate = total > 0 ? Math.round((sentOrDelivered / total) * 100) : 0;

  return (
    <div className="mt-8 space-y-4">
      {/* Section header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2.5">
          <div className="flex items-center justify-center w-8 h-8 rounded-lg bg-indigo-100">
            <Activity className="w-4 h-4 text-indigo-600" />
          </div>
          <div>
            <h2 className="text-sm font-bold text-gray-900">Histórico de Envios</h2>
            <p className="text-xs text-gray-500">
              {s.total} {s.total === 1 ? 'email' : 'emails'} no total
              {s.last_sent_at && (
                <> · Último envio: {new Date(s.last_sent_at).toLocaleDateString('pt-BR', {
                  day: '2-digit',
                  month: 'short',
                  hour: '2-digit',
                  minute: '2-digit',
                })}</>
              )}
            </p>
          </div>
        </div>
        <Button
          variant="ghost"
          size="sm"
          className="rounded-lg text-gray-500"
          onClick={() => loadStats(true)}
          disabled={refreshing}
        >
          <RefreshCw className={`w-3.5 h-3.5 mr-1 ${refreshing ? 'animate-spin' : ''}`} />
          Atualizar
        </Button>
      </div>

      {/* Overview cards */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <Card className="p-3 border-gray-200">
          <div className="flex items-center gap-2 mb-1">
            <Send className="w-3.5 h-3.5 text-blue-500" />
            <span className="text-[11px] font-medium text-gray-500 uppercase">Enviados</span>
          </div>
          <p className="text-xl font-bold text-gray-900">{sentOrDelivered}</p>
          <p className="text-[11px] text-gray-400">{successRate}% de sucesso</p>
        </Card>

        <Card className="p-3 border-gray-200">
          <div className="flex items-center gap-2 mb-1">
            <Clock className="w-3.5 h-3.5 text-yellow-500" />
            <span className="text-[11px] font-medium text-gray-500 uppercase">Pendentes</span>
          </div>
          <p className="text-xl font-bold text-gray-900">{(s.pending ?? 0) + (s.processing ?? 0)}</p>
          <p className="text-[11px] text-gray-400">aguardando envio</p>
        </Card>

        <Card className="p-3 border-gray-200">
          <div className="flex items-center gap-2 mb-1">
            <Eye className="w-3.5 h-3.5 text-indigo-500" />
            <span className="text-[11px] font-medium text-gray-500 uppercase">Abertos</span>
          </div>
          <p className="text-xl font-bold text-gray-900">{s.opened ?? 0}</p>
          <p className="text-[11px] text-gray-400">
            {sentOrDelivered > 0 ? `${Math.round(((s.opened ?? 0) / sentOrDelivered) * 100)}% taxa` : '—'}
          </p>
        </Card>

        <Card className="p-3 border-gray-200">
          <div className="flex items-center gap-2 mb-1">
            <MousePointer className="w-3.5 h-3.5 text-green-500" />
            <span className="text-[11px] font-medium text-gray-500 uppercase">Cliques</span>
          </div>
          <p className="text-xl font-bold text-gray-900">{s.clicked ?? 0}</p>
          <p className="text-[11px] text-gray-400">
            {sentOrDelivered > 0 ? `${Math.round(((s.clicked ?? 0) / sentOrDelivered) * 100)}% CTR` : '—'}
          </p>
        </Card>
      </div>

      {/* Failures warning */}
      {failedOrBounced > 0 && (
        <div className="flex items-center gap-2.5 p-3 bg-red-50 rounded-xl border border-red-100">
          <AlertTriangle className="w-4 h-4 text-red-500 flex-shrink-0" />
          <p className="text-xs text-red-700">
            <strong>{failedOrBounced}</strong> {failedOrBounced === 1 ? 'email falhou' : 'emails falharam'} ({s.failed ?? 0} erro{(s.failed ?? 0) !== 1 ? 's' : ''}, {s.bounced ?? 0} bounce{(s.bounced ?? 0) !== 1 ? 's' : ''})
          </p>
        </div>
      )}

      {/* Per-step breakdown */}
      {stats.steps.length > 0 && (
        <div>
          <h3 className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-2">Por etapa</h3>
          <div className="space-y-2">
            {stats.steps.map((step) => {
              const stepTotal = step.total || 1;
              const stepSentPct = Math.round((step.sent / stepTotal) * 100);
              return (
                <div key={step.step_sequence} className="flex items-center gap-3 p-2.5 bg-gray-50 rounded-lg border border-gray-100">
                  <div className="flex items-center justify-center w-7 h-7 rounded-full bg-blue-600 text-white text-xs font-bold flex-shrink-0">
                    {step.step_sequence}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between mb-1">
                      <span className="text-xs font-medium text-gray-700">Email {step.step_sequence}</span>
                      <span className="text-[11px] text-gray-500">
                        {step.sent}/{step.total} enviados
                      </span>
                    </div>
                    <div className="w-full h-1.5 bg-gray-200 rounded-full overflow-hidden">
                      <div
                        className="h-full bg-blue-500 rounded-full transition-all"
                        style={{ width: `${stepSentPct}%` }}
                      />
                    </div>
                  </div>
                  <div className="flex items-center gap-2 flex-shrink-0">
                    {step.opened > 0 && (
                      <span className="text-[10px] text-indigo-600 font-medium flex items-center gap-0.5">
                        <Eye className="w-3 h-3" /> {step.opened}
                      </span>
                    )}
                    {step.clicked > 0 && (
                      <span className="text-[10px] text-green-600 font-medium flex items-center gap-0.5">
                        <MousePointer className="w-3 h-3" /> {step.clicked}
                      </span>
                    )}
                    {step.failed > 0 && (
                      <span className="text-[10px] text-red-600 font-medium flex items-center gap-0.5">
                        <AlertTriangle className="w-3 h-3" /> {step.failed}
                      </span>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Dispatch history */}
      {stats.dispatches.length > 0 && (
        <div>
          <h3 className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-2">Disparos recentes</h3>
          <div className="space-y-2">
            {stats.dispatches.map((d) => (
              <div key={d.dispatch_id} className="flex items-center justify-between p-2.5 bg-gray-50 rounded-lg border border-gray-100">
                <div className="flex items-center gap-2 min-w-0">
                  <Play className="w-3.5 h-3.5 text-blue-500 flex-shrink-0" />
                  <div className="min-w-0">
                    <p className="text-xs font-medium text-gray-700 truncate">
                      {new Date(d.dispatched_at).toLocaleDateString('pt-BR', {
                        day: '2-digit',
                        month: 'short',
                        year: 'numeric',
                        hour: '2-digit',
                        minute: '2-digit',
                      })}
                    </p>
                    <p className="text-[10px] text-gray-400 truncate">
                      ID: {d.dispatch_id.slice(0, 8)}...
                    </p>
                  </div>
                </div>
                <div className="flex items-center gap-3 flex-shrink-0">
                  <span className="text-xs text-gray-600">{d.total} emails</span>
                  <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-semibold ${
                    d.failed > 0 ? 'bg-red-100 text-red-700' : 'bg-green-100 text-green-700'
                  }`}>
                    {d.sent} enviados
                  </span>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

/* ═══════════════════════════════════════════════════════
   MAIN PAGE
   ═══════════════════════════════════════════════════════ */

export default function AssetDetailPage() {
  return (
    <ProtectedRoute>
      <AssetDetailContent />
    </ProtectedRoute>
  );
}

function AssetDetailContent() {
  const params = useParams();
  const router = useRouter();
  const [asset, setAsset] = useState<Asset | null>(null);
  const [loading, setLoading] = useState(true);
  const [copied, setCopied] = useState(false);
  const [saving, setSaving] = useState(false);
  const [deleting, setDeleting] = useState(false);

  // Modal states
  const [showEditName, setShowEditName] = useState(false);
  const [showEditContent, setShowEditContent] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [showDispatch, setShowDispatch] = useState(false);
  const [statsKey, setStatsKey] = useState(0); // increment to refresh stats

  const assetId = Number(params.id);

  useEffect(() => {
    if (!assetId) return;
    setLoading(true);
    assetsService
      .get(assetId)
      .then(setAsset)
      .catch(() => {
        toast.error('Ativo não encontrado.');
        router.push('/');
      })
      .finally(() => setLoading(false));
  }, [assetId, router]);

  const parsedContent = useMemo(() => safeParseContent(asset?.content), [asset?.content]);

  const handleCopyContent = () => {
    if (!asset?.content) return;
    let text = '';
    if (asset.type === 'email') {
      text = parsedContent.emails
        .map((e) => `[Email ${e.sequence}] ${e.subject}\nDelay: ${formatDelayHours(e.delay_hours)}\n\n${e.body}`)
        .join('\n\n---\n\n');
    } else if (asset.type === 'whatsapp') {
      text = parsedContent.messages
        .map((m) => `[Mensagem ${m.sequence}] Tipo: ${m.type} | Delay: ${formatDelayHours(m.delay_hours)}\n\n${m.text}`)
        .join('\n\n---\n\n');
    } else if (asset.type === 'crm') {
      text = parsedContent.stages.map((s) => `${s.order}. ${s.name}`).join('\n');
    }
    navigator.clipboard.writeText(text);
    setCopied(true);
    toast.success('Conteúdo copiado!');
    setTimeout(() => setCopied(false), 2000);
  };

  const handleSaveName = async (name: string) => {
    if (!asset) return;
    setSaving(true);
    try {
      const updated = await assetsService.update(asset.id, { name });
      setAsset(updated);
      setShowEditName(false);
      toast.success('Nome atualizado!');
    } catch {
      toast.error('Erro ao atualizar nome.');
    } finally {
      setSaving(false);
    }
  };

  const handleSaveEmails = async (emails: EmailItem[]) => {
    if (!asset) return;
    setSaving(true);
    try {
      const updated = await assetsService.update(asset.id, {
        content: { ...asset.content, emails },
      });
      setAsset(updated);
      setShowEditContent(false);
      toast.success('Sequência de emails atualizada!');
    } catch {
      toast.error('Erro ao atualizar conteúdo.');
    } finally {
      setSaving(false);
    }
  };

  const handleSaveWhatsApp = async (messages: WhatsAppItem[]) => {
    if (!asset) return;
    setSaving(true);
    try {
      const updated = await assetsService.update(asset.id, {
        content: { ...asset.content, messages },
      });
      setAsset(updated);
      setShowEditContent(false);
      toast.success('Fluxo de WhatsApp atualizado!');
    } catch {
      toast.error('Erro ao atualizar conteúdo.');
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async () => {
    if (!asset) return;
    setDeleting(true);
    try {
      await assetsService.delete(asset.id);
      toast.success('Ativo excluído com sucesso!');
      router.back();
    } catch {
      toast.error('Erro ao excluir ativo.');
      setDeleting(false);
    }
  };

  const meta = asset ? TYPE_META[asset.type] : null;

  if (loading) {
    return (
      <div className="max-w-3xl mx-auto px-4 py-8">
        <Skeleton className="h-8 w-48 mb-6" />
        <Skeleton className="h-64 w-full rounded-xl" />
      </div>
    );
  }

  if (!asset || !meta) {
    return null;
  }

  const canEditContent = asset.type === 'email' || asset.type === 'whatsapp';

  return (
    <div className="max-w-3xl mx-auto px-4 py-8">
      {/* Header */}
      <div className="flex items-center gap-3 mb-6">
        <Button
          variant="ghost"
          size="sm"
          className="rounded-lg"
          onClick={() => router.back()}
        >
          <ArrowLeft className="w-4 h-4 mr-1" />
          Voltar
        </Button>
      </div>

      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-3">
          <div className={`p-2.5 rounded-xl ${meta.color}`}>
            {meta.icon}
          </div>
          <div>
            <h1 className="text-xl font-bold text-foreground">{asset.name}</h1>
            <div className="flex items-center gap-2 mt-0.5">
              <span className="text-xs font-medium text-muted-foreground">{meta.label}</span>
              <span className="text-xs text-muted-foreground">
                {new Date(asset.created_at).toLocaleDateString('pt-BR', {
                  day: '2-digit',
                  month: 'short',
                  year: 'numeric',
                })}
              </span>
            </div>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            className="rounded-lg"
            onClick={handleCopyContent}
          >
            {copied ? (
              <>
                <CheckCircle2 className="w-4 h-4 mr-1.5 text-green-600" />
                Copiado
              </>
            ) : (
              <>
                <Copy className="w-4 h-4 mr-1.5" />
                Copiar
              </>
            )}
          </Button>

          <Button
            variant="outline"
            size="sm"
            className="rounded-lg"
            onClick={() => setShowEditName(true)}
          >
            <Pencil className="w-4 h-4 mr-1.5" />
            Renomear
          </Button>

          {canEditContent && (
            <Button
              variant="outline"
              size="sm"
              className="rounded-lg text-blue-600 border-blue-200 hover:bg-blue-50"
              onClick={() => setShowEditContent(true)}
            >
              <Pencil className="w-4 h-4 mr-1.5" />
              Editar conteúdo
            </Button>
          )}

          {asset.type === 'email' && parsedContent.emails.length > 0 && (
            <Button
              size="sm"
              className="rounded-lg bg-blue-600 hover:bg-blue-700 text-white"
              onClick={() => setShowDispatch(true)}
            >
              <Send className="w-4 h-4 mr-1.5" />
              Disparar
            </Button>
          )}

          <Button
            variant="outline"
            size="sm"
            className="rounded-lg text-red-600 border-red-200 hover:bg-red-50"
            onClick={() => setShowDeleteConfirm(true)}
          >
            <Trash2 className="w-4 h-4 mr-1.5" />
            Excluir
          </Button>
        </div>
      </div>

      {/* Content viewer */}
      {asset.content && (
        <>
          {asset.type === 'email' && <EmailSequenceViewer content={asset.content} />}
          {asset.type === 'whatsapp' && <WhatsAppFlowViewer content={asset.content} />}
          {asset.type === 'crm' && <CrmPipelineViewer content={asset.content} />}
        </>
      )}

      {/* Empty state when no content */}
      {!asset.content && <EmptyContentState type={asset.type} />}

      {/* Email sequence stats */}
      {asset.type === 'email' && (
        <SequenceStatsPanel key={statsKey} assetId={asset.id} />
      )}

      {/* ─── Modals ─── */}

      {/* Dispatch email sequence modal */}
      {asset.type === 'email' && (
        <DispatchEmailModal
          open={showDispatch}
          onOpenChange={setShowDispatch}
          assetId={asset.id}
          emailCount={parsedContent.emails.length}
          onDispatched={() => setStatsKey((k) => k + 1)}
        />
      )}

      <EditNameModal
        open={showEditName}
        onOpenChange={setShowEditName}
        currentName={asset.name}
        onSave={handleSaveName}
        saving={saving}
      />

      {asset.type === 'email' && (
        <EditEmailModal
          open={showEditContent}
          onOpenChange={setShowEditContent}
          emails={parsedContent.emails}
          onSave={handleSaveEmails}
          saving={saving}
        />
      )}

      {asset.type === 'whatsapp' && (
        <EditWhatsAppModal
          open={showEditContent}
          onOpenChange={setShowEditContent}
          messages={parsedContent.messages}
          onSave={handleSaveWhatsApp}
          saving={saving}
        />
      )}

      <AlertDialog open={showDeleteConfirm} onOpenChange={setShowDeleteConfirm}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Excluir ativo</AlertDialogTitle>
            <AlertDialogDescription>
              Tem certeza que deseja excluir <strong>&quot;{asset.name}&quot;</strong>?
              Esta ação não pode ser desfeita.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={deleting}>Cancelar</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDelete}
              disabled={deleting}
              className="bg-red-600 hover:bg-red-700"
            >
              {deleting && <Loader2 className="w-4 h-4 mr-1.5 animate-spin" />}
              Excluir
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}

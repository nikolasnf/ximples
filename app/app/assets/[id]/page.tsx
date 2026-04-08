'use client';

import { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { ProtectedRoute } from '@/components/protected-route';
import { assetsService } from '@/services/assets.service';
import type { Asset } from '@/types';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import {
  ArrowLeft,
  Mail,
  Smartphone,
  BarChart3,
  Clock,
  Copy,
  CheckCircle2,
} from 'lucide-react';
import { toast } from 'sonner';

/* ─────────────── EMAIL VIEWER ─────────────── */

function EmailSequenceViewer({ content }: { content: Record<string, unknown> }) {
  const emails = (content.emails as Array<{
    sequence: number;
    subject: string;
    body: string;
    delay_hours: number;
  }>) ?? [];

  return (
    <div className="space-y-4">
      {emails.map((email, idx) => (
        <Card key={idx} className="p-5 border border-gray-200">
          <div className="flex items-center gap-3 mb-3">
            <div className="flex items-center justify-center w-8 h-8 rounded-full bg-blue-100 text-blue-600 text-sm font-bold">
              {email.sequence}
            </div>
            <div className="flex-1">
              <h3 className="font-semibold text-foreground text-sm">{email.subject}</h3>
              <div className="flex items-center gap-1 text-xs text-muted-foreground mt-0.5">
                <Clock className="w-3 h-3" />
                {email.delay_hours === 0
                  ? 'Envio imediato'
                  : `Após ${email.delay_hours}h`}
              </div>
            </div>
          </div>
          <div className="bg-gray-50 rounded-lg p-4 text-sm text-foreground whitespace-pre-wrap leading-relaxed">
            {email.body}
          </div>
        </Card>
      ))}
    </div>
  );
}

/* ─────────────── WHATSAPP VIEWER ─────────────── */

function WhatsAppFlowViewer({ content }: { content: Record<string, unknown> }) {
  const messages = (content.messages as Array<{
    sequence: number;
    text: string;
    delay_hours: number;
    type: string;
  }>) ?? [];

  return (
    <div className="space-y-3">
      {messages.map((msg, idx) => (
        <Card key={idx} className="p-4 border border-gray-200">
          <div className="flex items-start gap-3">
            <div className="flex items-center justify-center w-8 h-8 rounded-full bg-green-100 text-green-600 text-sm font-bold shrink-0">
              {msg.sequence}
            </div>
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 mb-2">
                <span className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
                  {msg.type === 'text' ? 'Mensagem de texto' : msg.type}
                </span>
                <span className="flex items-center gap-1 text-xs text-muted-foreground">
                  <Clock className="w-3 h-3" />
                  {msg.delay_hours === 0
                    ? 'Envio imediato'
                    : `Após ${msg.delay_hours}h`}
                </span>
              </div>
              <div className="bg-green-50 rounded-xl rounded-tl-none p-3 text-sm text-foreground whitespace-pre-wrap leading-relaxed">
                {msg.text}
              </div>
            </div>
          </div>
        </Card>
      ))}
    </div>
  );
}

/* ─────────────── CRM VIEWER ─────────────── */

function CrmPipelineViewer({ content }: { content: Record<string, unknown> }) {
  const stages = (content.stages as Array<{
    name: string;
    order: number;
    color: string;
  }>) ?? [];

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

/* ─────────────── TYPE CONFIG ─────────────── */

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

/* ─────────────── MAIN PAGE ─────────────── */

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

  const handleCopyContent = () => {
    if (!asset?.content) return;
    let text = '';
    if (asset.type === 'email') {
      const emails = (asset.content.emails as Array<{ sequence: number; subject: string; body: string; delay_hours: number }>) ?? [];
      text = emails
        .map((e) => `[Email ${e.sequence}] ${e.subject}\nDelay: ${e.delay_hours}h\n\n${e.body}`)
        .join('\n\n---\n\n');
    } else if (asset.type === 'whatsapp') {
      const msgs = (asset.content.messages as Array<{ sequence: number; text: string; delay_hours: number }>) ?? [];
      text = msgs
        .map((m) => `[Mensagem ${m.sequence}] Delay: ${m.delay_hours}h\n\n${m.text}`)
        .join('\n\n---\n\n');
    } else if (asset.type === 'crm') {
      const stages = (asset.content.stages as Array<{ name: string; order: number }>) ?? [];
      text = stages.map((s) => `${s.order}. ${s.name}`).join('\n');
    }
    navigator.clipboard.writeText(text);
    setCopied(true);
    toast.success('Conteúdo copiado!');
    setTimeout(() => setCopied(false), 2000);
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
              Copiar conteúdo
            </>
          )}
        </Button>
      </div>

      {/* Content viewer */}
      {asset.content && (
        <>
          {asset.type === 'email' && <EmailSequenceViewer content={asset.content} />}
          {asset.type === 'whatsapp' && <WhatsAppFlowViewer content={asset.content} />}
          {asset.type === 'crm' && <CrmPipelineViewer content={asset.content} />}
        </>
      )}
    </div>
  );
}

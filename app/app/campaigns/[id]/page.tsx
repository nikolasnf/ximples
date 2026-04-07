'use client';

import { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { ProtectedRoute } from '@/components/protected-route';
import { campaignsService, type Campaign, type CampaignLog } from '@/services/campaigns.service';
import { CopySuggestionPanel } from '@/components/copy-suggestions/copy-suggestion-panel';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { ArrowLeft, Loader2, Send, CheckCircle, XCircle, Clock, AlertCircle, BarChart3 } from 'lucide-react';
import { toast } from 'sonner';

const statusColor: Record<string, string> = {
  draft: 'bg-gray-100 text-gray-700',
  scheduled: 'bg-blue-100 text-blue-700',
  sending: 'bg-amber-100 text-amber-700',
  completed: 'bg-green-100 text-green-700',
  failed: 'bg-red-100 text-red-700',
};

function CampaignDetailContent() {
  const router = useRouter();
  const params = useParams<{ id: string }>();
  const id = Number(params.id);

  const [campaign, setCampaign] = useState<Campaign | null>(null);
  const [logs, setLogs] = useState<CampaignLog[]>([]);
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const load = async () => {
    try {
      const [c, l] = await Promise.all([
        campaignsService.get(id),
        campaignsService.logs(id, { per_page: 200 }),
      ]);
      setCampaign(c);
      setLogs(l.data);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Erro ao carregar');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void load();
  }, [id]);

  // Auto-refresh while sending
  useEffect(() => {
    if (campaign?.status !== 'sending') return;
    const interval = setInterval(load, 4000);
    return () => clearInterval(interval);
  }, [campaign?.status, id]);

  const handleSend = async () => {
    setError(null);
    setSending(true);
    const toastId = toast.loading('Disparando campanha...');
    try {
      const updated = await campaignsService.send(id);
      setCampaign(updated);
      await load();
      toast.success('Campanha enfileirada para envio.', { id: toastId });
    } catch (e) {
      const msg = e instanceof Error ? e.message : 'Erro ao enviar';
      setError(msg);
      toast.error(msg, { id: toastId });
    } finally {
      setSending(false);
    }
  };

  if (loading || !campaign) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  const canSend = ['draft', 'scheduled', 'failed', 'completed'].includes(campaign.status);
  const progress = campaign.total_contacts
    ? Math.round(((campaign.sent_count + campaign.failed_count) / campaign.total_contacts) * 100)
    : 0;

  const logIcon = (status: string) => {
    switch (status) {
      case 'sent':
        return <CheckCircle className="w-4 h-4 text-green-600" />;
      case 'failed':
        return <XCircle className="w-4 h-4 text-red-600" />;
      case 'skipped':
        return <AlertCircle className="w-4 h-4 text-amber-600" />;
      default:
        return <Clock className="w-4 h-4 text-gray-400" />;
    }
  };

  return (
    <div className="min-h-screen bg-background">
      <div className="max-w-5xl mx-auto p-6 space-y-6">
        <div className="flex items-center gap-4">
          <Button variant="ghost" size="icon" onClick={() => router.push('/campaigns')}>
            <ArrowLeft className="w-5 h-5" />
          </Button>
          <div className="flex-1">
            <div className="flex items-center gap-2">
              <h1 className="text-2xl font-bold">{campaign.name}</h1>
              <Badge className={statusColor[campaign.status] ?? ''}>{campaign.status}</Badge>
            </div>
            <p className="text-sm text-muted-foreground">
              Lista: {campaign.list?.name ?? '—'}
              {campaign.landing_page && <> · Landing: {campaign.landing_page.title}</>}
            </p>
          </div>
          <Button variant="outline" onClick={() => router.push(`/campaigns/${id}/analytics`)}>
            <BarChart3 className="w-4 h-4 mr-2" />
            Analytics
          </Button>
          {canSend && (
            <Button
              onClick={handleSend}
              disabled={sending || (['completed', 'failed'].includes(campaign.status) && campaign.failed_count === 0)}
              title={['completed', 'failed'].includes(campaign.status) && campaign.failed_count === 0 ? 'Nenhuma falha para reenviar' : undefined}
            >
              {sending ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <Send className="w-4 h-4 mr-2" />}
              {['completed', 'failed'].includes(campaign.status) ? 'Reenviar falhas' : 'Enviar campanha'}
            </Button>
          )}
        </div>

        {error && (
          <div className="flex items-center gap-2 p-3 rounded-lg bg-red-50 border border-red-200 text-sm text-red-700">
            <AlertCircle className="w-4 h-4" /> {error}
          </div>
        )}

        {/* Stats */}
        <div className="grid grid-cols-4 gap-4">
          <Card className="p-4">
            <p className="text-xs text-muted-foreground">Total</p>
            <p className="text-2xl font-bold">{campaign.total_contacts}</p>
          </Card>
          <Card className="p-4">
            <p className="text-xs text-muted-foreground">Enviadas</p>
            <p className="text-2xl font-bold text-green-600">{campaign.sent_count}</p>
          </Card>
          <Card className="p-4">
            <p className="text-xs text-muted-foreground">Falhas</p>
            <p className="text-2xl font-bold text-red-600">{campaign.failed_count}</p>
          </Card>
          <Card className="p-4">
            <p className="text-xs text-muted-foreground">Progresso</p>
            <p className="text-2xl font-bold">{progress}%</p>
          </Card>
        </div>

        {/* Message template */}
        <Card className="p-6">
          <h2 className="text-sm font-semibold mb-2">Mensagem</h2>
          <p className="text-sm whitespace-pre-wrap text-muted-foreground">{campaign.message_template}</p>
        </Card>

        {/* AI copy suggestions */}
        <CopySuggestionPanel
          sourceType="campaign"
          sourceId={campaign.id}
          onApplied={() => void load()}
        />

        {/* Logs */}
        <Card className="p-6">
          <h2 className="text-sm font-semibold mb-4">Logs de envio</h2>
          {logs.length === 0 ? (
            <p className="text-sm text-muted-foreground">Nenhum envio registrado ainda.</p>
          ) : (
            <div className="divide-y max-h-[500px] overflow-y-auto">
              {logs.map((log) => (
                <div key={log.id} className="py-2 flex items-start gap-3">
                  {logIcon(log.status)}
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium">
                      {log.contact?.name || '(sem nome)'} · {log.contact?.phone}
                    </p>
                    {log.error_message && <p className="text-xs text-red-600">{log.error_message}</p>}
                    {log.sent_at && <p className="text-xs text-muted-foreground">Enviado em {new Date(log.sent_at).toLocaleString('pt-BR')}</p>}
                  </div>
                  <Badge variant="outline" className="text-xs">
                    {log.status}
                  </Badge>
                </div>
              ))}
            </div>
          )}
        </Card>
      </div>
    </div>
  );
}

export default function CampaignDetailPage() {
  return (
    <ProtectedRoute>
      <CampaignDetailContent />
    </ProtectedRoute>
  );
}

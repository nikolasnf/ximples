'use client';

import { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { ProtectedRoute } from '@/components/protected-route';
import { analyticsService, type CampaignAnalytics } from '@/services/analytics.service';
import { FunnelChart } from '@/components/analytics/funnel-chart';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { ArrowLeft, Loader2, CheckCircle, XCircle, MinusCircle } from 'lucide-react';

function CampaignAnalyticsContent() {
  const router = useRouter();
  const params = useParams<{ id: string }>();
  const id = Number(params.id);

  const [data, setData] = useState<CampaignAnalytics | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    void load();
  }, [id]);

  const load = async () => {
    try {
      setData(await analyticsService.campaign(id));
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Erro ao carregar');
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  if (error || !data) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <p className="text-sm text-red-600">{error ?? 'Sem dados'}</p>
      </div>
    );
  }

  const flag = (v: boolean) =>
    v ? (
      <CheckCircle className="w-4 h-4 text-green-600 inline" />
    ) : (
      <MinusCircle className="w-4 h-4 text-gray-300 inline" />
    );

  const sendIcon = (status: string) => {
    switch (status) {
      case 'sent':
        return <CheckCircle className="w-4 h-4 text-green-600 inline" />;
      case 'failed':
        return <XCircle className="w-4 h-4 text-red-600 inline" />;
      default:
        return <MinusCircle className="w-4 h-4 text-gray-400 inline" />;
    }
  };

  return (
    <div className="min-h-screen bg-background">
      <div className="max-w-6xl mx-auto p-6 space-y-6">
        <div className="flex items-center gap-4">
          <Button variant="ghost" size="icon" onClick={() => router.push(`/campaigns/${id}`)}>
            <ArrowLeft className="w-5 h-5" />
          </Button>
          <div className="flex-1">
            <h1 className="text-2xl font-bold">{data.campaign.name}</h1>
            <p className="text-sm text-muted-foreground">
              Analytics da campanha · <Badge variant="outline">{data.campaign.status}</Badge>
            </p>
          </div>
        </div>

        {/* Top metrics */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <Card className="p-4">
            <p className="text-xs uppercase text-muted-foreground">Enviados</p>
            <p className="text-3xl font-bold">{data.totals.sent}</p>
          </Card>
          <Card className="p-4">
            <p className="text-xs uppercase text-muted-foreground">Clicaram</p>
            <p className="text-3xl font-bold text-amber-600">{data.unique.clickers}</p>
            <p className="text-xs text-muted-foreground mt-1">{data.totals.clicks} cliques totais</p>
          </Card>
          <Card className="p-4">
            <p className="text-xs uppercase text-muted-foreground">Visitaram</p>
            <p className="text-3xl font-bold text-purple-600">{data.unique.visitors}</p>
            <p className="text-xs text-muted-foreground mt-1">{data.totals.visits} visitas totais</p>
          </Card>
          <Card className="p-4">
            <p className="text-xs uppercase text-muted-foreground">Converteram</p>
            <p className="text-3xl font-bold text-green-600">{data.unique.converters}</p>
            <p className="text-xs text-muted-foreground mt-1">{data.totals.conversions} eventos</p>
          </Card>
        </div>

        <div className="grid grid-cols-2 gap-4">
          <Card className="p-4">
            <p className="text-xs uppercase text-muted-foreground">CTR</p>
            <p className="text-2xl font-bold">{data.rates.ctr}%</p>
            <p className="text-xs text-muted-foreground">Clicaram / Enviados</p>
          </Card>
          <Card className="p-4">
            <p className="text-xs uppercase text-muted-foreground">Taxa de conversão</p>
            <p className="text-2xl font-bold">{data.rates.conversion_rate}%</p>
            <p className="text-xs text-muted-foreground">Converteram / Enviados</p>
          </Card>
        </div>

        <Card className="p-6">
          <h2 className="text-lg font-semibold mb-4">Funil</h2>
          <FunnelChart steps={data.funnel} />
        </Card>

        <Card className="p-6">
          <h2 className="text-lg font-semibold mb-4">Contatos ({data.contacts.length})</h2>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b text-left text-xs uppercase text-muted-foreground">
                  <th className="py-2 pr-3">Contato</th>
                  <th className="py-2 pr-3">Telefone</th>
                  <th className="py-2 pr-3 text-center">Envio</th>
                  <th className="py-2 pr-3 text-center">Clique</th>
                  <th className="py-2 pr-3 text-center">Visita</th>
                  <th className="py-2 pr-3 text-center">Conversão</th>
                </tr>
              </thead>
              <tbody>
                {data.contacts.map((row) => (
                  <tr key={row.contact_id} className="border-b">
                    <td className="py-2 pr-3">{row.contact?.name || '(sem nome)'}</td>
                    <td className="py-2 pr-3 text-muted-foreground">{row.contact?.phone}</td>
                    <td className="py-2 pr-3 text-center">{sendIcon(row.send_status)}</td>
                    <td className="py-2 pr-3 text-center">{flag(row.clicked)}</td>
                    <td className="py-2 pr-3 text-center">{flag(row.visited)}</td>
                    <td className="py-2 pr-3 text-center">{flag(row.converted)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Card>
      </div>
    </div>
  );
}

export default function CampaignAnalyticsPage() {
  return (
    <ProtectedRoute>
      <CampaignAnalyticsContent />
    </ProtectedRoute>
  );
}

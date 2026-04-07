'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { ProtectedRoute } from '@/components/protected-route';
import { analyticsService, type OverviewAnalytics } from '@/services/analytics.service';
import { FunnelChart } from '@/components/analytics/funnel-chart';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { ArrowLeft, Loader2, Send, MousePointerClick, Eye, Target } from 'lucide-react';

function AnalyticsContent() {
  const router = useRouter();
  const [data, setData] = useState<OverviewAnalytics | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    void load();
  }, []);

  const load = async () => {
    setIsLoading(true);
    setError(null);
    try {
      setData(await analyticsService.overview());
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Erro ao carregar analytics');
    } finally {
      setIsLoading(false);
    }
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <div className="max-w-6xl mx-auto p-6 space-y-6">
        <div className="flex items-center gap-4">
          <Button variant="ghost" size="icon" onClick={() => router.push('/')}>
            <ArrowLeft className="w-5 h-5" />
          </Button>
          <div className="flex-1">
            <h1 className="text-2xl font-bold">Analytics</h1>
            <p className="text-sm text-muted-foreground">Visão geral dos últimos 30 dias</p>
          </div>
          <Button variant="outline" onClick={() => router.push('/campaigns')}>
            Ver campanhas
          </Button>
        </div>

        {error && (
          <div className="p-3 rounded-lg bg-red-50 border border-red-200 text-sm text-red-700">{error}</div>
        )}

        {data && (
          <>
            {/* Metric cards */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <MetricCard
                icon={<Send className="w-5 h-5" />}
                label="Envios"
                value={data.totals.sent}
                color="text-blue-600"
              />
              <MetricCard
                icon={<MousePointerClick className="w-5 h-5" />}
                label="Cliques"
                value={data.totals.clicks}
                subValue={`${data.unique.clickers} únicos`}
                color="text-amber-600"
              />
              <MetricCard
                icon={<Eye className="w-5 h-5" />}
                label="Visitas"
                value={data.totals.visits}
                subValue={`${data.unique.visitors} únicos`}
                color="text-purple-600"
              />
              <MetricCard
                icon={<Target className="w-5 h-5" />}
                label="Conversões"
                value={data.totals.conversions}
                subValue={`${data.unique.converters} únicos`}
                color="text-green-600"
              />
            </div>

            {/* Rates */}
            <div className="grid grid-cols-3 gap-4">
              <RateCard label="CTR" value={data.rates.ctr} help="Clicaram / Enviados" />
              <RateCard label="Taxa de visita" value={data.rates.visit_rate} help="Visitaram / Clicaram" />
              <RateCard label="Conversão" value={data.rates.conversion_rate} help="Converteram / Visitaram" />
            </div>

            {/* Funnel */}
            <Card className="p-6">
              <h2 className="text-lg font-semibold mb-4">Funil de conversão</h2>
              <FunnelChart steps={data.funnel} />
            </Card>
          </>
        )}
      </div>
    </div>
  );
}

function MetricCard({
  icon,
  label,
  value,
  subValue,
  color,
}: {
  icon: React.ReactNode;
  label: string;
  value: number;
  subValue?: string;
  color: string;
}) {
  return (
    <Card className="p-4">
      <div className={`flex items-center gap-2 ${color}`}>
        {icon}
        <span className="text-xs uppercase tracking-wide text-muted-foreground">{label}</span>
      </div>
      <p className="text-3xl font-bold mt-2">{value.toLocaleString('pt-BR')}</p>
      {subValue && <p className="text-xs text-muted-foreground mt-1">{subValue}</p>}
    </Card>
  );
}

function RateCard({ label, value, help }: { label: string; value: number; help: string }) {
  return (
    <Card className="p-4">
      <p className="text-xs uppercase tracking-wide text-muted-foreground">{label}</p>
      <p className="text-2xl font-bold mt-1">{value}%</p>
      <p className="text-xs text-muted-foreground mt-1">{help}</p>
    </Card>
  );
}

export default function AnalyticsPage() {
  return (
    <ProtectedRoute>
      <AnalyticsContent />
    </ProtectedRoute>
  );
}

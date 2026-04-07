'use client';

import { useRouter } from 'next/navigation';
import { ProtectedRoute } from '@/components/protected-route';
import { campaignsService, type Campaign } from '@/services/campaigns.service';
import { useResourceList } from '@/hooks/use-resource-list';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { ArrowLeft, Plus, Loader2, Send, Sparkles } from 'lucide-react';

const statusColor: Record<string, string> = {
  draft: 'bg-gray-100 text-gray-700',
  scheduled: 'bg-blue-100 text-blue-700',
  sending: 'bg-amber-100 text-amber-700',
  completed: 'bg-green-100 text-green-700',
  failed: 'bg-red-100 text-red-700',
};

function CampaignsContent() {
  const router = useRouter();
  const {
    items: campaigns,
    isLoading,
    highlightedIds,
  } = useResourceList<Campaign>({
    resource: 'campaigns',
    fetcher: () => campaignsService.list(),
  });

  return (
    <div className="min-h-screen bg-background">
      <div className="max-w-5xl mx-auto p-6 space-y-6">
        <div className="flex items-center gap-4">
          <Button variant="ghost" size="icon" onClick={() => router.push('/')}>
            <ArrowLeft className="w-5 h-5" />
          </Button>
          <div className="flex-1">
            <h1 className="text-2xl font-bold">Campanhas de WhatsApp</h1>
            <p className="text-sm text-muted-foreground">Envie mensagens em massa para suas listas</p>
          </div>
          <Button onClick={() => router.push('/campaigns/new')}>
            <Plus className="w-4 h-4 mr-2" />
            Nova campanha
          </Button>
        </div>

        <Card className="p-6">
          {isLoading ? (
            <div className="flex justify-center py-12">
              <Loader2 className="w-6 h-6 animate-spin text-primary" />
            </div>
          ) : campaigns.length === 0 ? (
            <div className="text-center py-12 space-y-3">
              <p className="text-sm text-muted-foreground">Você ainda não criou nenhuma campanha.</p>
              <Button onClick={() => router.push('/campaigns/new')}>Criar primeira campanha</Button>
            </div>
          ) : (
            <div className="divide-y">
              {campaigns.map((c) => {
                const isNew = highlightedIds.has(c.id);
                return (
                  <button
                    key={c.id}
                    onClick={() => router.push(`/campaigns/${c.id}`)}
                    className={`flex items-center justify-between py-3 w-full text-left hover:bg-muted/30 -mx-2 px-2 rounded transition-colors ${
                      isNew ? 'bg-blue-50' : ''
                    }`}
                  >
                    <div>
                      <div className="flex items-center gap-2">
                        <p className="font-medium">{c.name}</p>
                        <Badge className={statusColor[c.status] ?? ''}>{c.status}</Badge>
                        {isNew && (
                          <Badge className="bg-blue-600 text-white text-xs">
                            <Sparkles className="w-3 h-3 mr-1" />
                            Novo
                          </Badge>
                        )}
                      </div>
                      <p className="text-xs text-muted-foreground mt-1">
                        Lista: {c.list?.name ?? '—'} · {c.sent_count}/{c.total_contacts} enviadas · {c.failed_count} falhas
                      </p>
                    </div>
                    <Send className="w-4 h-4 text-muted-foreground" />
                  </button>
                );
              })}
            </div>
          )}
        </Card>
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

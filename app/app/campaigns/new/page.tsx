'use client';

import { useEffect, useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import { ProtectedRoute } from '@/components/protected-route';
import { listsService, type ContactList } from '@/services/contacts.service';
import { campaignsService, renderMessagePreview, type Campaign } from '@/services/campaigns.service';
import { pagesApiService } from '@/services/pages.service';
import type { PageRecord } from '@/types/page';
import { useCreateWithFeedback } from '@/hooks/use-create-with-feedback';
import { resourceEvents } from '@/lib/resource-events';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { ArrowLeft, Loader2, Sparkles } from 'lucide-react';
import { toast } from 'sonner';

const DEFAULT_TEMPLATE = 'Olá {{name}}, veja essa oportunidade: {{link}}';

function NewCampaignContent() {
  const router = useRouter();
  const [lists, setLists] = useState<ContactList[]>([]);
  const [pages, setPages] = useState<PageRecord[]>([]);
  const [name, setName] = useState('');
  const [listId, setListId] = useState<string>('');
  const [pageId, setPageId] = useState<string>('');
  const [template, setTemplate] = useState(DEFAULT_TEMPLATE);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  // Tracks whether the next create+send pair should also fire send().
  const [pendingSend, setPendingSend] = useState(false);

  useEffect(() => {
    (async () => {
      try {
        const [listsRes, pagesRes] = await Promise.all([
          listsService.list(),
          pagesApiService.list({ status: 'published' }).catch(() => []),
        ]);
        setLists(listsRes);
        setPages(pagesRes);
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  const selectedPage = useMemo(() => pages.find((p) => String(p.id) === pageId), [pages, pageId]);
  const previewLink = selectedPage?.public_url ?? '';

  const preview = useMemo(
    () =>
      renderMessagePreview(template, {
        name: 'Maria Silva',
        phone: '+5511999999999',
        email: 'maria@exemplo.com',
        link: previewLink,
      }),
    [template, previewLink],
  );

  const createCampaign = useCreateWithFeedback({
    mutationFn: (input: {
      name: string;
      list_id: number;
      message_template: string;
      landing_page_id?: number;
    }) => campaignsService.create(input),
    invalidates: 'campaigns',
    loadingMessage: pendingSend ? 'Criando e enfileirando campanha...' : 'Criando campanha...',
    successMessage: (c: Campaign) =>
      pendingSend ? `Campanha "${c.name}" criada. Disparando...` : `Campanha "${c.name}" criada.`,
    onSuccess: async (campaign) => {
      if (pendingSend) {
        try {
          await campaignsService.send(campaign.id);
          resourceEvents.emit('campaigns', { action: 'updated', id: campaign.id });
          toast.success('Campanha enfileirada para envio.');
        } catch (e) {
          toast.error(e instanceof Error ? e.message : 'Erro ao disparar campanha.');
        }
      }
      router.push(`/campaigns/${campaign.id}`);
    },
    onError: (e) => setError(e instanceof Error ? e.message : 'Erro ao criar campanha'),
  });

  const handleCreate = (andSend: boolean) => {
    setError(null);
    if (!name.trim() || !listId || !template.trim()) {
      setError('Preencha nome, lista e mensagem.');
      return;
    }
    setPendingSend(andSend);
    void createCampaign.run({
      name: name.trim(),
      list_id: Number(listId),
      message_template: template,
      landing_page_id: pageId ? Number(pageId) : undefined,
    });
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  if (lists.length === 0) {
    return (
      <div className="min-h-screen bg-background">
        <div className="max-w-2xl mx-auto p-6 space-y-6">
          <div className="flex items-center gap-4">
            <Button variant="ghost" size="icon" onClick={() => router.push('/campaigns')}>
              <ArrowLeft className="w-5 h-5" />
            </Button>
            <h1 className="text-2xl font-bold">Nova campanha</h1>
          </div>
          <Card className="p-8 text-center space-y-4">
            <p className="text-base font-medium">Você ainda não tem listas de contatos</p>
            <p className="text-sm text-muted-foreground">
              Crie uma lista importando contatos por CSV/Excel antes de disparar sua primeira campanha.
            </p>
            <div className="flex justify-center gap-2">
              <Button onClick={() => router.push('/contacts')}>Importar contatos</Button>
              <Button variant="outline" onClick={() => router.push('/lists')}>Ir para listas</Button>
            </div>
          </Card>
        </div>
      </div>
    );
  }

  const saving = createCampaign.isPending;

  return (
    <div className="min-h-screen bg-background">
      <div className="max-w-4xl mx-auto p-6 space-y-6">
        <div className="flex items-center gap-4">
          <Button variant="ghost" size="icon" onClick={() => router.push('/campaigns')}>
            <ArrowLeft className="w-5 h-5" />
          </Button>
          <div>
            <h1 className="text-2xl font-bold">Nova campanha</h1>
            <p className="text-sm text-muted-foreground">Configure e dispare uma campanha de WhatsApp</p>
          </div>
        </div>

        <Card className="p-6 space-y-5">
          <div>
            <Label htmlFor="name">Nome da campanha</Label>
            <Input id="name" value={name} onChange={(e) => setName(e.target.value)} placeholder="Ex: Black Friday — Leads Quentes" disabled={saving} />
          </div>

          <div className="grid md:grid-cols-2 gap-4">
            <div>
              <Label htmlFor="list">Lista de contatos</Label>
              <select
                id="list"
                className="w-full h-10 rounded-md border border-input bg-background px-3 text-sm disabled:opacity-60"
                value={listId}
                onChange={(e) => setListId(e.target.value)}
                disabled={saving}
              >
                <option value="">— Selecione —</option>
                {lists.map((l) => (
                  <option key={l.id} value={l.id}>
                    {l.name} ({l.contacts_count ?? 0})
                  </option>
                ))}
              </select>
            </div>
            <div>
              <Label htmlFor="page">Landing page (opcional)</Label>
              <select
                id="page"
                className="w-full h-10 rounded-md border border-input bg-background px-3 text-sm disabled:opacity-60"
                value={pageId}
                onChange={(e) => setPageId(e.target.value)}
                disabled={saving}
              >
                <option value="">— Nenhuma —</option>
                {pages.map((p) => (
                  <option key={p.id} value={p.id}>
                    {p.title}
                  </option>
                ))}
              </select>
              {selectedPage && (
                <p className="text-xs text-muted-foreground mt-1 break-all">{selectedPage.public_url}</p>
              )}
            </div>
          </div>

          <div>
            <Label htmlFor="template">Mensagem</Label>
            <Textarea
              id="template"
              value={template}
              onChange={(e) => setTemplate(e.target.value)}
              rows={6}
              placeholder="Escreva sua mensagem aqui..."
              disabled={saving}
            />
            <p className="text-xs text-muted-foreground mt-1">
              Placeholders disponíveis: <code>{'{{name}}'}</code>, <code>{'{{phone}}'}</code>, <code>{'{{email}}'}</code>, <code>{'{{link}}'}</code>
            </p>
          </div>

          <div className="rounded-lg bg-muted/40 p-4">
            <p className="text-xs uppercase tracking-wide text-muted-foreground mb-2 flex items-center gap-1">
              <Sparkles className="w-3 h-3" /> Preview
            </p>
            <p className="text-sm whitespace-pre-wrap">{preview}</p>
          </div>

          {error && <p className="text-sm text-red-600">{error}</p>}

          <div className="flex gap-2">
            <Button variant="outline" onClick={() => handleCreate(false)} disabled={saving}>
              {saving && !pendingSend ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  Criando...
                </>
              ) : (
                'Salvar rascunho'
              )}
            </Button>
            <Button onClick={() => handleCreate(true)} disabled={saving}>
              {saving && pendingSend ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  Processando...
                </>
              ) : (
                'Criar e enviar'
              )}
            </Button>
          </div>
        </Card>
      </div>
    </div>
  );
}

export default function NewCampaignPage() {
  return (
    <ProtectedRoute>
      <NewCampaignContent />
    </ProtectedRoute>
  );
}

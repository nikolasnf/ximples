'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { ProtectedRoute } from '@/components/protected-route';
import { listsService, type ContactList } from '@/services/contacts.service';
import { useCreateWithFeedback } from '@/hooks/use-create-with-feedback';
import { useResourceList } from '@/hooks/use-resource-list';
import { resourceEvents } from '@/lib/resource-events';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { ArrowLeft, Plus, Users, Trash2, Loader2, Sparkles } from 'lucide-react';
import { toast } from 'sonner';

function ListsContent() {
  const router = useRouter();
  const [newName, setNewName] = useState('');
  const [newDescription, setNewDescription] = useState('');

  const {
    items: lists,
    setItems: setLists,
    isLoading,
    highlightedIds,
  } = useResourceList<ContactList>({
    resource: 'lists',
    fetcher: () => listsService.list(),
  });

  const createList = useCreateWithFeedback({
    mutationFn: (input: { name: string; description?: string }) => listsService.create(input),
    invalidates: 'lists',
    loadingMessage: 'Criando lista...',
    successMessage: (list) => `Lista "${list.name}" criada.`,
    onSuccess: () => {
      setNewName('');
      setNewDescription('');
    },
  });

  const handleCreate = () => {
    if (!newName.trim()) return;
    void createList.run({ name: newName.trim(), description: newDescription.trim() || undefined });
  };

  const handleDelete = async (id: number) => {
    if (!confirm('Excluir lista?')) return;
    try {
      await listsService.delete(id);
      setLists((prev) => prev.filter((l) => l.id !== id));
      resourceEvents.emit('lists', { action: 'deleted', id });
      toast.success('Lista excluída.');
    } catch (e) {
      toast.error(e instanceof Error ? e.message : 'Erro ao excluir lista.');
    }
  };

  return (
    <div className="min-h-screen bg-background">
      <div className="max-w-5xl mx-auto p-6 space-y-6">
        <div className="flex items-center gap-4">
          <Button variant="ghost" size="icon" onClick={() => router.push('/contacts')}>
            <ArrowLeft className="w-5 h-5" />
          </Button>
          <div className="flex-1">
            <h1 className="text-2xl font-bold">Listas de contatos</h1>
            <p className="text-sm text-muted-foreground">Organize seus contatos em listas para segmentar campanhas</p>
          </div>
        </div>

        <Card className="p-6 space-y-4">
          <h2 className="text-lg font-semibold">Nova lista</h2>
          <div className="grid md:grid-cols-2 gap-4">
            <div>
              <Label htmlFor="list-name">Nome</Label>
              <Input
                id="list-name"
                value={newName}
                onChange={(e) => setNewName(e.target.value)}
                placeholder="Ex: Leads Quentes"
                disabled={createList.isPending}
                onKeyDown={(e) => e.key === 'Enter' && handleCreate()}
              />
            </div>
            <div>
              <Label htmlFor="list-desc">Descrição (opcional)</Label>
              <Input
                id="list-desc"
                value={newDescription}
                onChange={(e) => setNewDescription(e.target.value)}
                disabled={createList.isPending}
              />
            </div>
          </div>
          <Button onClick={handleCreate} disabled={!newName.trim() || createList.isPending}>
            {createList.isPending ? (
              <>
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                Criando...
              </>
            ) : (
              <>
                <Plus className="w-4 h-4 mr-2" />
                Criar lista
              </>
            )}
          </Button>
        </Card>

        <Card className="p-6">
          <h2 className="text-lg font-semibold mb-4">Suas listas</h2>
          {isLoading ? (
            <div className="flex justify-center py-12">
              <Loader2 className="w-6 h-6 animate-spin text-primary" />
            </div>
          ) : lists.length === 0 ? (
            <p className="text-center text-sm text-muted-foreground py-12">Nenhuma lista ainda.</p>
          ) : (
            <div className="divide-y">
              {lists.map((l) => {
                const isNew = highlightedIds.has(l.id);
                return (
                  <div
                    key={l.id}
                    className={`flex items-center justify-between py-3 transition-colors ${
                      isNew ? 'bg-blue-50 -mx-2 px-2 rounded animate-in fade-in' : ''
                    }`}
                  >
                    <button className="flex-1 text-left" onClick={() => router.push(`/lists/${l.id}`)}>
                      <div className="flex items-center gap-2">
                        <p className="font-medium">{l.name}</p>
                        {isNew && (
                          <Badge className="bg-blue-600 text-white text-xs">
                            <Sparkles className="w-3 h-3 mr-1" />
                            Novo
                          </Badge>
                        )}
                      </div>
                      {l.description && <p className="text-xs text-muted-foreground">{l.description}</p>}
                    </button>
                    <Badge variant="secondary" className="mr-3">
                      <Users className="w-3 h-3 mr-1" />
                      {l.contacts_count ?? 0}
                    </Badge>
                    <Button variant="ghost" size="icon" onClick={() => handleDelete(l.id)}>
                      <Trash2 className="w-4 h-4 text-red-500" />
                    </Button>
                  </div>
                );
              })}
            </div>
          )}
        </Card>
      </div>
    </div>
  );
}

export default function ListsPage() {
  return (
    <ProtectedRoute>
      <ListsContent />
    </ProtectedRoute>
  );
}

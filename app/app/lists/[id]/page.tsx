'use client';

import { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { ProtectedRoute } from '@/components/protected-route';
import { listsService, type Contact, type ContactList, type PaginatedResponse } from '@/services/contacts.service';
import { EditContactDialog } from '@/components/edit-contact-dialog';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { ArrowLeft, Check, ChevronLeft, ChevronRight, Loader2, Pencil, Trash2, X } from 'lucide-react';

function ListDetailContent() {
  const router = useRouter();
  const params = useParams<{ id: string }>();
  const id = Number(params.id);

  const [list, setList] = useState<ContactList | null>(null);
  const [contacts, setContacts] = useState<Contact[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [page, setPage] = useState(1);
  const [paginationMeta, setPaginationMeta] = useState<PaginatedResponse<Contact>['meta'] | null>(null);
  const [isEditing, setIsEditing] = useState(false);
  const [editName, setEditName] = useState('');
  const [isSaving, setIsSaving] = useState(false);
  const [editingContact, setEditingContact] = useState<Contact | null>(null);

  useEffect(() => {
    void load();
  }, [id, page]);

  const load = async () => {
    setIsLoading(true);
    try {
      const res = await listsService.get(id, { per_page: 50, page });
      setList(res.list);
      setContacts(res.contacts);
      setPaginationMeta(res.meta);
    } finally {
      setIsLoading(false);
    }
  };

  const handleStartEditing = () => {
    setEditName(list?.name ?? '');
    setIsEditing(true);
  };

  const handleCancelEditing = () => {
    setIsEditing(false);
    setEditName('');
  };

  const handleSaveRename = async () => {
    const trimmed = editName.trim();
    if (!trimmed || trimmed === list?.name) {
      handleCancelEditing();
      return;
    }
    setIsSaving(true);
    try {
      const updated = await listsService.update(id, { name: trimmed });
      setList((prev) => prev ? { ...prev, name: updated.name } : prev);
      setIsEditing(false);
    } finally {
      setIsSaving(false);
    }
  };

  const handleDetach = async (contactId: number) => {
    await listsService.detachContact(id, contactId);
    setContacts((prev) => prev.filter((c) => c.id !== contactId));
  };

  return (
    <div className="min-h-screen bg-background">
      <div className="max-w-5xl mx-auto p-6 space-y-6">
        <div className="flex items-center gap-4">
          <Button variant="ghost" size="icon" onClick={() => router.push('/lists')}>
            <ArrowLeft className="w-5 h-5" />
          </Button>
          <div className="flex-1">
            {isEditing ? (
              <div className="flex items-center gap-2">
                <Input
                  value={editName}
                  onChange={(e) => setEditName(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') void handleSaveRename();
                    if (e.key === 'Escape') handleCancelEditing();
                  }}
                  className="text-2xl font-bold h-auto py-1"
                  autoFocus
                  disabled={isSaving}
                />
                <Button variant="ghost" size="icon" onClick={() => void handleSaveRename()} disabled={isSaving}>
                  {isSaving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Check className="w-4 h-4 text-green-600" />}
                </Button>
                <Button variant="ghost" size="icon" onClick={handleCancelEditing} disabled={isSaving}>
                  <X className="w-4 h-4" />
                </Button>
              </div>
            ) : (
              <div className="flex items-center gap-2">
                <h1 className="text-2xl font-bold">{list?.name ?? 'Carregando...'}</h1>
                {list && (
                  <Button variant="ghost" size="icon" onClick={handleStartEditing}>
                    <Pencil className="w-4 h-4 text-muted-foreground" />
                  </Button>
                )}
              </div>
            )}
            {list?.description && !isEditing && <p className="text-sm text-muted-foreground">{list.description}</p>}
          </div>
        </div>

        <Card className="p-6">
          {isLoading ? (
            <div className="flex justify-center py-12">
              <Loader2 className="w-6 h-6 animate-spin text-primary" />
            </div>
          ) : contacts.length === 0 ? (
            <p className="text-center text-sm text-muted-foreground py-12">Lista vazia. Importe contatos pela página de Contatos.</p>
          ) : (
            <div className="divide-y">
              {contacts.map((c) => (
                <div key={c.id} className="flex items-center justify-between py-3">
                  <div>
                    <p className="font-medium">{c.name || '(sem nome)'}</p>
                    <p className="text-sm text-muted-foreground">
                      {c.phone}
                      {c.email && <span className="ml-2">· {c.email}</span>}
                    </p>
                  </div>
                  <div className="flex items-center gap-1">
                    <Button variant="ghost" size="icon" onClick={() => setEditingContact(c)}>
                      <Pencil className="w-4 h-4 text-muted-foreground" />
                    </Button>
                    <Button variant="ghost" size="icon" onClick={() => handleDetach(c.id)}>
                      <Trash2 className="w-4 h-4 text-red-500" />
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          )}

          {paginationMeta && paginationMeta.last_page > 1 && (
            <div className="flex items-center justify-between pt-4">
              <p className="text-sm text-muted-foreground">
                {paginationMeta.total} contato{paginationMeta.total !== 1 ? 's' : ''}
              </p>
              <div className="flex items-center gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setPage((p) => Math.max(1, p - 1))}
                  disabled={page <= 1}
                >
                  <ChevronLeft className="w-4 h-4 mr-1" />
                  Anterior
                </Button>
                <span className="text-sm text-muted-foreground">
                  {page} de {paginationMeta.last_page}
                </span>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setPage((p) => Math.min(paginationMeta.last_page, p + 1))}
                  disabled={page >= paginationMeta.last_page}
                >
                  Próxima
                  <ChevronRight className="w-4 h-4 ml-1" />
                </Button>
              </div>
            </div>
          )}
        </Card>

        <EditContactDialog
          contact={editingContact}
          open={!!editingContact}
          onOpenChange={(open) => { if (!open) setEditingContact(null); }}
          onUpdated={(updated) => {
            setContacts((prev) => prev.map((c) => c.id === updated.id ? updated : c));
          }}
        />
      </div>
    </div>
  );
}

export default function ListDetailPage() {
  return (
    <ProtectedRoute>
      <ListDetailContent />
    </ProtectedRoute>
  );
}

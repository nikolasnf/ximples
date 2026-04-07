'use client';

import { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { ProtectedRoute } from '@/components/protected-route';
import { listsService, type Contact, type ContactList } from '@/services/contacts.service';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { ArrowLeft, Loader2, Trash2 } from 'lucide-react';

function ListDetailContent() {
  const router = useRouter();
  const params = useParams<{ id: string }>();
  const id = Number(params.id);

  const [list, setList] = useState<ContactList | null>(null);
  const [contacts, setContacts] = useState<Contact[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    void load();
  }, [id]);

  const load = async () => {
    setIsLoading(true);
    try {
      const res = await listsService.get(id);
      setList(res.list);
      setContacts(res.contacts);
    } finally {
      setIsLoading(false);
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
          <div>
            <h1 className="text-2xl font-bold">{list?.name ?? 'Carregando...'}</h1>
            {list?.description && <p className="text-sm text-muted-foreground">{list.description}</p>}
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
                  <Button variant="ghost" size="icon" onClick={() => handleDetach(c.id)}>
                    <Trash2 className="w-4 h-4 text-red-500" />
                  </Button>
                </div>
              ))}
            </div>
          )}
        </Card>
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

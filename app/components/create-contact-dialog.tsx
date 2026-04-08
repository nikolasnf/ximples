'use client';

import { useState } from 'react';
import { contactsService } from '@/services/contacts.service';
import { resourceEvents } from '@/lib/resource-events';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Loader2, UserPlus } from 'lucide-react';

interface CreateContactDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function CreateContactDialog({ open, onOpenChange }: CreateContactDialogProps) {
  const [name, setName] = useState('');
  const [phone, setPhone] = useState('');
  const [email, setEmail] = useState('');
  const [tags, setTags] = useState('');
  const [isSaving, setIsSaving] = useState(false);

  const resetForm = () => {
    setName('');
    setPhone('');
    setEmail('');
    setTags('');
  };

  const handleSave = async () => {
    if (!phone.trim()) return;
    setIsSaving(true);
    try {
      const created = await contactsService.create({
        name: name.trim() || undefined,
        phone: phone.trim(),
        email: email.trim() || undefined,
        tags: tags.trim() ? tags.split(',').map((t) => t.trim()).filter(Boolean) : undefined,
      });
      resourceEvents.emit('contacts', { action: 'created', id: created.id, data: created });
      toast.success('Contato criado com sucesso!');
      resetForm();
      onOpenChange(false);
    } catch (e) {
      toast.error(e instanceof Error ? e.message : 'Erro ao criar contato.');
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <UserPlus className="w-5 h-5 text-primary" />
            Novo contato
          </DialogTitle>
          <DialogDescription>Adicione um contato manualmente a sua base.</DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-2">
          <div>
            <Label htmlFor="create-name">Nome</Label>
            <Input
              id="create-name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Nome do contato"
              disabled={isSaving}
            />
          </div>
          <div>
            <Label htmlFor="create-phone">Telefone *</Label>
            <Input
              id="create-phone"
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
              placeholder="Ex: +5511999999999"
              disabled={isSaving}
            />
          </div>
          <div>
            <Label htmlFor="create-email">Email</Label>
            <Input
              id="create-email"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="email@exemplo.com"
              disabled={isSaving}
            />
          </div>
          <div>
            <Label htmlFor="create-tags">Tags (separadas por virgula)</Label>
            <Input
              id="create-tags"
              value={tags}
              onChange={(e) => setTags(e.target.value)}
              placeholder="lead, quente, site"
              disabled={isSaving}
            />
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={isSaving}>
            Cancelar
          </Button>
          <Button onClick={handleSave} disabled={isSaving || !phone.trim()}>
            {isSaving ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : null}
            Criar contato
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

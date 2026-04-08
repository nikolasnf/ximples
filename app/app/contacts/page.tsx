'use client';

import { useState, useMemo, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { ProtectedRoute } from '@/components/protected-route';
import {
  contactsService,
  listsService,
  type Contact,
  type ContactList,
  type PaginatedResponse,
} from '@/services/contacts.service';
import { useResourceList } from '@/hooks/use-resource-list';
import { resourceEvents } from '@/lib/resource-events';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Checkbox } from '@/components/ui/checkbox';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { EditContactDialog } from '@/components/edit-contact-dialog';
import { CreateContactDialog } from '@/components/create-contact-dialog';
import { ImportContactsSheet } from '@/components/import-contacts-sheet';
import {
  ArrowLeft, Upload, Users, Loader2, Search, Trash2, Pencil,
  Sparkles, ChevronLeft, ChevronRight, UserPlus, MoreHorizontal,
  Tag, Send, Filter, X, TrendingUp, AlertTriangle,
  UserCheck, Clock, FileSpreadsheet, Zap,
} from 'lucide-react';

// ─── Helpers ────────────────────────────────────────────────────

function getInitials(name: string | null): string {
  if (!name) return '?';
  const parts = name.trim().split(/\s+/);
  if (parts.length >= 2) return (parts[0][0] + parts[1][0]).toUpperCase();
  return name.slice(0, 2).toUpperCase();
}

function getAvatarColor(name: string | null): string {
  const colors = [
    'bg-blue-500', 'bg-emerald-500', 'bg-violet-500', 'bg-amber-500',
    'bg-rose-500', 'bg-cyan-500', 'bg-indigo-500', 'bg-teal-500',
    'bg-orange-500', 'bg-pink-500',
  ];
  if (!name) return colors[0];
  let hash = 0;
  for (let i = 0; i < name.length; i++) hash = name.charCodeAt(i) + ((hash << 5) - hash);
  return colors[Math.abs(hash) % colors.length];
}

function isRecentContact(contact: Contact, days: number = 7): boolean {
  const created = new Date(contact.created_at);
  const threshold = new Date();
  threshold.setDate(threshold.getDate() - days);
  return created >= threshold;
}

type OriginFilter = 'all' | 'imported' | 'manual';

// ─── KPI Card ───────────────────────────────────────────────────

function KpiCard({ icon: Icon, label, value, color, detail }: {
  icon: React.ComponentType<{ className?: string }>;
  label: string;
  value: string | number;
  color: string;
  detail?: string;
}) {
  return (
    <Card className="p-4 flex items-center gap-3 hover:shadow-md transition-shadow">
      <div className={`w-10 h-10 rounded-xl flex items-center justify-center shrink-0 ${color}`}>
        <Icon className="w-5 h-5 text-white" />
      </div>
      <div className="min-w-0">
        <p className="text-2xl font-bold text-foreground leading-none">{value}</p>
        <p className="text-xs text-muted-foreground mt-0.5">{label}</p>
        {detail && <p className="text-[10px] text-muted-foreground">{detail}</p>}
      </div>
    </Card>
  );
}

// ─── Contact Row (Desktop) ──────────────────────────────────────

function ContactRow({ contact, isSelected, isNew, onSelect, onEdit, onDelete }: {
  contact: Contact;
  isSelected: boolean;
  isNew: boolean;
  onSelect: (id: number) => void;
  onEdit: (c: Contact) => void;
  onDelete: (id: number) => void;
}) {
  const origin = contact.source_file ? 'Importado' : 'Manual';

  return (
    <div
      className={`
        group flex items-center gap-3 px-4 py-3 border-b last:border-0
        transition-colors hover:bg-muted/30
        ${isNew ? 'bg-blue-50/50' : ''}
        ${isSelected ? 'bg-primary/5' : ''}
      `}
    >
      <Checkbox
        checked={isSelected}
        onCheckedChange={() => onSelect(contact.id)}
        className="shrink-0"
      />

      <Avatar className={`w-9 h-9 shrink-0 ${getAvatarColor(contact.name)}`}>
        <AvatarFallback className="text-white text-xs font-semibold bg-transparent">
          {getInitials(contact.name)}
        </AvatarFallback>
      </Avatar>

      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2">
          <p className="font-medium text-sm truncate">{contact.name || '(sem nome)'}</p>
          {isNew && (
            <Badge className="bg-blue-600 text-white text-[9px] px-1.5 py-0">
              <Sparkles className="w-2.5 h-2.5 mr-0.5" />
              Novo
            </Badge>
          )}
        </div>
        <div className="flex items-center gap-3 text-xs text-muted-foreground mt-0.5">
          {contact.email && <span className="truncate">{contact.email}</span>}
          {contact.phone && <span className="font-mono">{contact.phone}</span>}
        </div>
      </div>

      {/* Tags */}
      <div className="hidden md:flex items-center gap-1.5 shrink-0">
        <Badge variant="outline" className="text-[10px]">
          {origin}
        </Badge>
        {contact.tags?.slice(0, 2).map((tag) => (
          <Badge key={tag} variant="secondary" className="text-[10px]">
            {tag}
          </Badge>
        ))}
        {contact.tags && contact.tags.length > 2 && (
          <Badge variant="secondary" className="text-[10px]">
            +{contact.tags.length - 2}
          </Badge>
        )}
      </div>

      {/* Actions */}
      <div className="flex items-center gap-1 shrink-0 opacity-0 group-hover:opacity-100 transition-opacity">
        <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => onEdit(contact)}>
          <Pencil className="w-3.5 h-3.5 text-muted-foreground" />
        </Button>
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="ghost" size="icon" className="h-8 w-8">
              <MoreHorizontal className="w-3.5 h-3.5 text-muted-foreground" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            <DropdownMenuItem onClick={() => onEdit(contact)}>
              <Pencil className="w-3.5 h-3.5 mr-2" />
              Editar
            </DropdownMenuItem>
            <DropdownMenuItem>
              <Tag className="w-3.5 h-3.5 mr-2" />
              Adicionar tag
            </DropdownMenuItem>
            <DropdownMenuItem>
              <Send className="w-3.5 h-3.5 mr-2" />
              Adicionar a campanha
            </DropdownMenuItem>
            <DropdownMenuSeparator />
            <DropdownMenuItem variant="destructive" onClick={() => onDelete(contact.id)}>
              <Trash2 className="w-3.5 h-3.5 mr-2" />
              Excluir
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    </div>
  );
}

// ─── Contact Card (Mobile) ──────────────────────────────────────

function ContactCard({ contact, isSelected, isNew, onSelect, onEdit, onDelete }: {
  contact: Contact;
  isSelected: boolean;
  isNew: boolean;
  onSelect: (id: number) => void;
  onEdit: (c: Contact) => void;
  onDelete: (id: number) => void;
}) {
  const origin = contact.source_file ? 'Importado' : 'Manual';

  return (
    <Card
      className={`p-4 space-y-3 ${isSelected ? 'ring-2 ring-primary/30' : ''} ${isNew ? 'bg-blue-50/30' : ''}`}
    >
      <div className="flex items-start gap-3">
        <Checkbox
          checked={isSelected}
          onCheckedChange={() => onSelect(contact.id)}
          className="mt-1 shrink-0"
        />
        <Avatar className={`w-10 h-10 shrink-0 ${getAvatarColor(contact.name)}`}>
          <AvatarFallback className="text-white text-sm font-semibold bg-transparent">
            {getInitials(contact.name)}
          </AvatarFallback>
        </Avatar>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2">
            <p className="font-medium text-sm truncate">{contact.name || '(sem nome)'}</p>
            {isNew && (
              <Badge className="bg-blue-600 text-white text-[9px] px-1.5 py-0">Novo</Badge>
            )}
          </div>
          {contact.email && (
            <p className="text-xs text-muted-foreground truncate">{contact.email}</p>
          )}
          {contact.phone && (
            <p className="text-xs text-muted-foreground font-mono">{contact.phone}</p>
          )}
        </div>
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="ghost" size="icon" className="h-8 w-8 shrink-0">
              <MoreHorizontal className="w-4 h-4" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            <DropdownMenuItem onClick={() => onEdit(contact)}>
              <Pencil className="w-3.5 h-3.5 mr-2" />Editar
            </DropdownMenuItem>
            <DropdownMenuItem>
              <Tag className="w-3.5 h-3.5 mr-2" />Adicionar tag
            </DropdownMenuItem>
            <DropdownMenuItem>
              <Send className="w-3.5 h-3.5 mr-2" />Adicionar a campanha
            </DropdownMenuItem>
            <DropdownMenuSeparator />
            <DropdownMenuItem variant="destructive" onClick={() => onDelete(contact.id)}>
              <Trash2 className="w-3.5 h-3.5 mr-2" />Excluir
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
      <div className="flex items-center gap-1.5 flex-wrap">
        <Badge variant="outline" className="text-[10px]">{origin}</Badge>
        {contact.tags?.slice(0, 3).map((tag) => (
          <Badge key={tag} variant="secondary" className="text-[10px]">{tag}</Badge>
        ))}
      </div>
    </Card>
  );
}

// ─── Empty State ────────────────────────────────────────────────

function EmptyState({ onImport }: { onImport: () => void }) {
  return (
    <div className="flex flex-col items-center justify-center py-20 px-4">
      <div className="w-20 h-20 rounded-2xl bg-primary/10 flex items-center justify-center mb-6">
        <Users className="w-10 h-10 text-primary" />
      </div>
      <h3 className="text-xl font-semibold text-foreground mb-2">Sua base esta vazia</h3>
      <p className="text-sm text-muted-foreground text-center max-w-md mb-6">
        Importe contatos de um arquivo ou adicione manualmente para comecar suas campanhas e automacoes.
      </p>
      <div className="flex gap-3">
        <Button onClick={onImport}>
          <Upload className="w-4 h-4 mr-2" />
          Importar contatos
        </Button>
      </div>
    </div>
  );
}

// ─── Main Content ───────────────────────────────────────────────

function ContactsContent() {
  const router = useRouter();

  // State
  const [search, setSearch] = useState('');
  const [page, setPage] = useState(1);
  const [paginationMeta, setPaginationMeta] = useState<PaginatedResponse<Contact>['meta'] | null>(null);
  const [selectedIds, setSelectedIds] = useState<Set<number>>(new Set());
  const [editingContact, setEditingContact] = useState<Contact | null>(null);
  const [showCreateDialog, setShowCreateDialog] = useState(false);
  const [showImportSheet, setShowImportSheet] = useState(false);

  // Filters
  const [originFilter, setOriginFilter] = useState<OriginFilter>('all');
  const [tagFilter, setTagFilter] = useState<string>('');
  const [showFilters, setShowFilters] = useState(false);

  // Data
  const {
    items: contacts,
    setItems: setContacts,
    isLoading,
    highlightedIds,
  } = useResourceList<Contact>({
    resource: 'contacts',
    fetcher: async () => {
      const res = await contactsService.list({ search: search || undefined, per_page: 50, page });
      setPaginationMeta(res.meta);
      return res.data;
    },
    deps: [search, page],
  });

  const { items: lists } = useResourceList<ContactList>({
    resource: 'lists',
    fetcher: () => listsService.list(),
  });

  // ─── Computed KPIs ──────────────────────────────────────────
  const kpis = useMemo(() => {
    const total = paginationMeta?.total ?? contacts.length;
    const recentCount = contacts.filter((c) => isRecentContact(c)).length;
    const withSource = contacts.filter((c) => c.source_file).length;
    return { total, recentCount, withSource };
  }, [contacts, paginationMeta]);

  // ─── Filtered contacts ─────────────────────────────────────
  const filteredContacts = useMemo(() => {
    let result = contacts;
    if (originFilter === 'imported') {
      result = result.filter((c) => c.source_file);
    } else if (originFilter === 'manual') {
      result = result.filter((c) => !c.source_file);
    }
    if (tagFilter) {
      result = result.filter((c) => c.tags?.some((t) => t.toLowerCase().includes(tagFilter.toLowerCase())));
    }
    return result;
  }, [contacts, originFilter, tagFilter]);

  // ─── All tags from current contacts ─────────────────────────
  const allTags = useMemo(() => {
    const tags = new Set<string>();
    contacts.forEach((c) => c.tags?.forEach((t) => tags.add(t)));
    return Array.from(tags).sort();
  }, [contacts]);

  // ─── Selection ──────────────────────────────────────────────
  const handleSelect = useCallback((id: number) => {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }, []);

  const handleSelectAll = useCallback(() => {
    if (selectedIds.size === filteredContacts.length) {
      setSelectedIds(new Set());
    } else {
      setSelectedIds(new Set(filteredContacts.map((c) => c.id)));
    }
  }, [selectedIds.size, filteredContacts]);

  const clearSelection = () => setSelectedIds(new Set());

  // ─── Actions ────────────────────────────────────────────────
  const handleDelete = async (id: number) => {
    if (!confirm('Excluir contato?')) return;
    try {
      await contactsService.delete(id);
      setContacts((prev) => prev.filter((c) => c.id !== id));
      setSelectedIds((prev) => { const n = new Set(prev); n.delete(id); return n; });
      resourceEvents.emit('contacts', { action: 'deleted', id });
      toast.success('Contato excluido.');
    } catch (e) {
      toast.error(e instanceof Error ? e.message : 'Erro ao excluir contato.');
    }
  };

  const handleBulkDelete = async () => {
    if (!confirm(`Excluir ${selectedIds.size} contatos?`)) return;
    const ids = Array.from(selectedIds);
    try {
      await Promise.all(ids.map((id) => contactsService.delete(id)));
      setContacts((prev) => prev.filter((c) => !selectedIds.has(c.id)));
      setSelectedIds(new Set());
      resourceEvents.emit('contacts', { action: 'deleted' });
      toast.success(`${ids.length} contatos excluidos.`);
    } catch (e) {
      toast.error(e instanceof Error ? e.message : 'Erro ao excluir contatos.');
    }
  };

  const handleBulkAddToList = async (listId: number) => {
    const ids = Array.from(selectedIds);
    try {
      await listsService.attachContacts(listId, ids);
      toast.success(`${ids.length} contatos adicionados a lista.`);
      clearSelection();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : 'Erro ao adicionar a lista.');
    }
  };

  const handleSearchChange = (value: string) => {
    setSearch(value);
    setPage(1);
    setSelectedIds(new Set());
  };

  const hasActiveFilters = originFilter !== 'all' || !!tagFilter;
  const isAllSelected = filteredContacts.length > 0 && selectedIds.size === filteredContacts.length;
  const hasContacts = paginationMeta ? paginationMeta.total > 0 : contacts.length > 0;

  return (
    <div className="min-h-screen bg-background">
      <div className="max-w-7xl mx-auto p-4 md:p-6 space-y-5">

        {/* ─── HEADER ─────────────────────────────────────────── */}
        <div className="flex flex-col sm:flex-row sm:items-center gap-4">
          <Button variant="ghost" size="icon" onClick={() => router.push('/')} className="shrink-0 self-start">
            <ArrowLeft className="w-5 h-5" />
          </Button>
          <div className="flex-1">
            <h1 className="text-2xl font-bold text-foreground">Contatos</h1>
            <p className="text-sm text-muted-foreground">Gerencie e ative sua base de leads</p>
          </div>
          <div className="flex items-center gap-2">
            <Button variant="outline" onClick={() => router.push('/lists')} size="sm">
              <Users className="w-4 h-4 mr-2" />
              Listas
            </Button>
            <Button variant="outline" onClick={() => setShowImportSheet(true)} size="sm">
              <Upload className="w-4 h-4 mr-2" />
              Importar
            </Button>
            <Button onClick={() => setShowCreateDialog(true)} size="sm">
              <UserPlus className="w-4 h-4 mr-2" />
              Novo contato
            </Button>
          </div>
        </div>

        {/* ─── KPIs ───────────────────────────────────────────── */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
          <KpiCard
            icon={Users}
            label="Total de contatos"
            value={kpis.total}
            color="bg-primary"
          />
          <KpiCard
            icon={Clock}
            label="Novos (7 dias)"
            value={kpis.recentCount}
            color="bg-emerald-500"
            detail={kpis.recentCount > 0 ? `+${kpis.recentCount} essa semana` : undefined}
          />
          <KpiCard
            icon={UserCheck}
            label="Ativos em campanhas"
            value="--"
            color="bg-violet-500"
          />
          <KpiCard
            icon={AlertTriangle}
            label="Duplicados"
            value="--"
            color="bg-amber-500"
          />
        </div>

        {/* ─── AI SUGGESTION BANNER ───────────────────────────── */}
        {hasContacts && kpis.recentCount > 0 && (
          <Card className="p-4 bg-gradient-to-r from-primary/5 to-violet-500/5 border-primary/20">
            <div className="flex items-center gap-3">
              <div className="w-9 h-9 rounded-xl bg-primary/10 flex items-center justify-center shrink-0">
                <Zap className="w-5 h-5 text-primary" />
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium text-foreground">
                  Sugestao da IA
                </p>
                <p className="text-xs text-muted-foreground">
                  Voce tem {kpis.recentCount} novos contatos essa semana. Que tal criar uma campanha para engaja-los?
                </p>
              </div>
              <Button variant="outline" size="sm" onClick={() => router.push('/campaigns')} className="shrink-0">
                <Send className="w-3.5 h-3.5 mr-1.5" />
                Criar campanha
              </Button>
            </div>
          </Card>
        )}

        {/* ─── SEARCH & FILTERS BAR ───────────────────────────── */}
        {hasContacts && (
          <div className="space-y-3">
            <div className="flex items-center gap-2">
              <div className="relative flex-1">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                <Input
                  placeholder="Buscar por nome, email ou telefone..."
                  value={search}
                  onChange={(e) => handleSearchChange(e.target.value)}
                  className="pl-9 h-10"
                />
                {search && (
                  <Button
                    variant="ghost"
                    size="icon"
                    className="absolute right-1 top-1/2 -translate-y-1/2 h-7 w-7"
                    onClick={() => handleSearchChange('')}
                  >
                    <X className="w-3.5 h-3.5" />
                  </Button>
                )}
              </div>
              <Button
                variant={showFilters || hasActiveFilters ? 'default' : 'outline'}
                size="sm"
                onClick={() => setShowFilters(!showFilters)}
                className="shrink-0"
              >
                <Filter className="w-4 h-4 mr-1.5" />
                Filtros
                {hasActiveFilters && (
                  <span className="ml-1.5 w-5 h-5 rounded-full bg-white text-primary text-[10px] font-bold flex items-center justify-center">
                    {(originFilter !== 'all' ? 1 : 0) + (tagFilter ? 1 : 0)}
                  </span>
                )}
              </Button>
            </div>

            {/* Filter chips */}
            {showFilters && (
              <div className="flex flex-wrap items-center gap-2 p-3 rounded-lg bg-muted/50 border">
                <span className="text-xs font-medium text-muted-foreground">Filtrar por:</span>

                {/* Origin filter */}
                <div className="flex items-center gap-1">
                  {(['all', 'imported', 'manual'] as OriginFilter[]).map((value) => (
                    <button
                      key={value}
                      onClick={() => setOriginFilter(value)}
                      className={`
                        px-2.5 py-1 rounded-full text-xs font-medium transition-colors
                        ${originFilter === value
                          ? 'bg-primary text-white'
                          : 'bg-background border text-muted-foreground hover:text-foreground'
                        }
                      `}
                    >
                      {value === 'all' ? 'Todos' : value === 'imported' ? 'Importados' : 'Manuais'}
                    </button>
                  ))}
                </div>

                {/* Tag filter */}
                {allTags.length > 0 && (
                  <>
                    <span className="text-xs text-muted-foreground">|</span>
                    <select
                      className="h-7 rounded-full border bg-background px-2.5 text-xs"
                      value={tagFilter}
                      onChange={(e) => setTagFilter(e.target.value)}
                    >
                      <option value="">Todas as tags</option>
                      {allTags.map((tag) => (
                        <option key={tag} value={tag}>{tag}</option>
                      ))}
                    </select>
                  </>
                )}

                {/* List filter - future */}
                {lists.length > 0 && (
                  <>
                    <span className="text-xs text-muted-foreground">|</span>
                    <span className="text-xs text-muted-foreground italic">
                      Filtro por lista (em breve)
                    </span>
                  </>
                )}

                {hasActiveFilters && (
                  <button
                    onClick={() => { setOriginFilter('all'); setTagFilter(''); }}
                    className="ml-auto text-xs text-destructive hover:underline"
                  >
                    Limpar filtros
                  </button>
                )}
              </div>
            )}
          </div>
        )}

        {/* ─── BULK ACTIONS BAR ───────────────────────────────── */}
        {selectedIds.size > 0 && (
          <div className="flex items-center gap-3 p-3 rounded-lg bg-primary/5 border border-primary/20">
            <Checkbox
              checked={isAllSelected}
              onCheckedChange={handleSelectAll}
            />
            <span className="text-sm font-medium">
              {selectedIds.size} selecionado{selectedIds.size !== 1 ? 's' : ''}
            </span>
            <div className="flex-1" />

            {/* Add to list */}
            {lists.length > 0 && (
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="outline" size="sm">
                    <Users className="w-3.5 h-3.5 mr-1.5" />
                    Mover para lista
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent>
                  {lists.map((list) => (
                    <DropdownMenuItem key={list.id} onClick={() => handleBulkAddToList(list.id)}>
                      {list.name}
                    </DropdownMenuItem>
                  ))}
                </DropdownMenuContent>
              </DropdownMenu>
            )}

            <Button variant="outline" size="sm" onClick={() => router.push('/campaigns')}>
              <Send className="w-3.5 h-3.5 mr-1.5" />
              Campanha
            </Button>

            <Button variant="outline" size="sm" className="text-destructive hover:text-destructive" onClick={handleBulkDelete}>
              <Trash2 className="w-3.5 h-3.5 mr-1.5" />
              Excluir
            </Button>

            <Button variant="ghost" size="sm" onClick={clearSelection}>
              <X className="w-3.5 h-3.5" />
            </Button>
          </div>
        )}

        {/* ─── CONTACTS LIST ──────────────────────────────────── */}
        {isLoading ? (
          <div className="flex flex-col items-center justify-center py-20">
            <Loader2 className="w-8 h-8 animate-spin text-primary mb-3" />
            <p className="text-sm text-muted-foreground">Carregando contatos...</p>
          </div>
        ) : !hasContacts && !search ? (
          <EmptyState onImport={() => setShowImportSheet(true)} />
        ) : filteredContacts.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-16">
            <Search className="w-10 h-10 text-muted-foreground/50 mb-3" />
            <p className="text-sm text-muted-foreground">Nenhum contato encontrado.</p>
            {(search || hasActiveFilters) && (
              <Button
                variant="ghost"
                size="sm"
                className="mt-2"
                onClick={() => { handleSearchChange(''); setOriginFilter('all'); setTagFilter(''); }}
              >
                Limpar busca e filtros
              </Button>
            )}
          </div>
        ) : (
          <>
            {/* Growth badge */}
            {kpis.recentCount > 0 && (
              <div className="flex items-center gap-2">
                <TrendingUp className="w-4 h-4 text-emerald-500" />
                <span className="text-xs text-emerald-600 font-medium">
                  +{kpis.recentCount} contatos essa semana
                </span>
              </div>
            )}

            {/* Desktop table */}
            <Card className="hidden md:block overflow-hidden">
              {/* Table header */}
              <div className="flex items-center gap-3 px-4 py-2 bg-muted/30 border-b text-xs font-medium text-muted-foreground">
                <Checkbox
                  checked={isAllSelected}
                  onCheckedChange={handleSelectAll}
                  className="shrink-0"
                />
                <span className="w-9 shrink-0" /> {/* avatar space */}
                <span className="flex-1">Contato</span>
                <span className="hidden md:block w-48 text-right pr-12">Tags</span>
              </div>
              {filteredContacts.map((c) => (
                <ContactRow
                  key={c.id}
                  contact={c}
                  isSelected={selectedIds.has(c.id)}
                  isNew={highlightedIds.has(c.id)}
                  onSelect={handleSelect}
                  onEdit={setEditingContact}
                  onDelete={handleDelete}
                />
              ))}
            </Card>

            {/* Mobile cards */}
            <div className="md:hidden space-y-3">
              {filteredContacts.map((c) => (
                <ContactCard
                  key={c.id}
                  contact={c}
                  isSelected={selectedIds.has(c.id)}
                  isNew={highlightedIds.has(c.id)}
                  onSelect={handleSelect}
                  onEdit={setEditingContact}
                  onDelete={handleDelete}
                />
              ))}
            </div>

            {/* Pagination */}
            {paginationMeta && paginationMeta.last_page > 1 && (
              <div className="flex items-center justify-between pt-2">
                <p className="text-sm text-muted-foreground">
                  {paginationMeta.total} contato{paginationMeta.total !== 1 ? 's' : ''}
                </p>
                <div className="flex items-center gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => { setPage((p) => Math.max(1, p - 1)); clearSelection(); }}
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
                    onClick={() => { setPage((p) => Math.min(paginationMeta.last_page, p + 1)); clearSelection(); }}
                    disabled={page >= paginationMeta.last_page}
                  >
                    Proxima
                    <ChevronRight className="w-4 h-4 ml-1" />
                  </Button>
                </div>
              </div>
            )}
          </>
        )}

        {/* ─── DIALOGS & SHEETS ───────────────────────────────── */}
        <EditContactDialog
          contact={editingContact}
          open={!!editingContact}
          onOpenChange={(open) => { if (!open) setEditingContact(null); }}
          onUpdated={(updated) => {
            setContacts((prev) => prev.map((c) => c.id === updated.id ? updated : c));
          }}
        />

        <CreateContactDialog
          open={showCreateDialog}
          onOpenChange={setShowCreateDialog}
        />

        <ImportContactsSheet
          open={showImportSheet}
          onOpenChange={setShowImportSheet}
        />
      </div>
    </div>
  );
}

export default function ContactsPage() {
  return (
    <ProtectedRoute>
      <ContactsContent />
    </ProtectedRoute>
  );
}

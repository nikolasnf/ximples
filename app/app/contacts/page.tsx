'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { ProtectedRoute } from '@/components/protected-route';
import {
  contactsService,
  listsService,
  type Contact,
  type ContactList,
  type ImportResult,
  type ImportPreview,
  type PaginatedResponse,
} from '@/services/contacts.service';
import { useCreateWithFeedback } from '@/hooks/use-create-with-feedback';
import { useResourceList } from '@/hooks/use-resource-list';
import { resourceEvents } from '@/lib/resource-events';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import {
  ArrowLeft, Upload, Users, Loader2, Search, Trash2,
  CheckCircle, AlertCircle, Sparkles, Eye, ArrowRight,
  RotateCcw, Save, ChevronLeft, ChevronRight,
} from 'lucide-react';

const FIELD_LABELS: Record<string, string> = {
  name: 'Nome',
  last_name: 'Sobrenome',
  email: 'Email',
  phone: 'Telefone',
  city: 'Cidade',
  state: 'Estado',
  country: 'País',
};

function ContactsContent() {
  const router = useRouter();
  const [search, setSearch] = useState('');
  const [importResult, setImportResult] = useState<ImportResult | null>(null);
  const [importError, setImportError] = useState<string | null>(null);
  const [file, setFile] = useState<File | null>(null);
  const [listTargetId, setListTargetId] = useState<string>('');
  const [newListName, setNewListName] = useState('');
  const [duplicateStrategy, setDuplicateStrategy] = useState<'update' | 'skip'>('update');

  // Preview state
  const [preview, setPreview] = useState<ImportPreview | null>(null);
  const [isPreviewing, setIsPreviewing] = useState(false);
  const [mappingOverrides, setMappingOverrides] = useState<Record<string, string>>({});
  const [templateName, setTemplateName] = useState('');

  const [page, setPage] = useState(1);
  const [paginationMeta, setPaginationMeta] = useState<PaginatedResponse<Contact>['meta'] | null>(null);

  const {
    items: contacts,
    setItems: setContacts,
    isLoading: isLoadingContacts,
    highlightedIds: highlightedContactIds,
  } = useResourceList<Contact>({
    resource: 'contacts',
    fetcher: async () => {
      const res = await contactsService.list({ search: search || undefined, per_page: 50, page });
      setPaginationMeta(res.meta);
      return res.data;
    },
    deps: [search, page],
  });

  const handleSearchChange = (value: string) => {
    setSearch(value);
    setPage(1);
  };

  const { items: lists } = useResourceList<ContactList>({
    resource: 'lists',
    fetcher: () => listsService.list(),
  });

  const importContacts = useCreateWithFeedback({
    mutationFn: (input: {
      file: File;
      list_id?: number;
      list_name?: string;
      mappings?: Record<string, string>;
      duplicate_strategy?: 'update' | 'skip';
    }) => contactsService.import(input),
    invalidates: ['contacts', 'lists'],
    loadingMessage: 'Importando contatos...',
    successMessage: (result) =>
      `${result.imported} importados, ${result.updated} atualizados.`,
    onSuccess: (result) => {
      setImportResult(result);
      setImportError(null);
      setFile(null);
      setNewListName('');
      setPreview(null);
      setMappingOverrides({});
    },
    onError: (e) => setImportError(e instanceof Error ? e.message : 'Erro ao importar'),
  });

  // ─── Preview handler ────────────────────────────────────────────
  const handlePreview = async () => {
    if (!file) return;
    setIsPreviewing(true);
    setImportError(null);
    setImportResult(null);
    try {
      const result = await contactsService.preview({
        file,
        mappings: Object.keys(mappingOverrides).length > 0 ? mappingOverrides : undefined,
      });
      setPreview(result);
    } catch (e) {
      setImportError(e instanceof Error ? e.message : 'Erro ao analisar arquivo');
      setPreview(null);
    } finally {
      setIsPreviewing(false);
    }
  };

  // ─── Import handler ─────────────────────────────────────────────
  const handleImport = () => {
    if (!file) return;
    setImportResult(null);
    setImportError(null);
    const hasOverrides = Object.keys(mappingOverrides).length > 0;
    void importContacts.run({
      file,
      list_id: listTargetId ? Number(listTargetId) : undefined,
      list_name: newListName || undefined,
      mappings: hasOverrides ? mappingOverrides : undefined,
      duplicate_strategy: duplicateStrategy,
    });
  };

  // ─── Mapping override handler ───────────────────────────────────
  const handleMappingChange = (field: string, headerValue: string) => {
    setMappingOverrides((prev) => {
      const next = { ...prev };
      if (headerValue === '') {
        delete next[field];
      } else {
        next[field] = headerValue;
      }
      return next;
    });
  };

  // ─── Save mapping template ─────────────────────────────────────
  const handleSaveTemplate = async () => {
    if (!templateName || !preview) return;
    const mappingsToSave = Object.keys(mappingOverrides).length > 0
      ? mappingOverrides
      : Object.fromEntries(
          Object.entries(preview.mappings).filter(([, v]) => v !== null) as [string, string][],
        );
    try {
      await contactsService.saveMappingTemplate({ name: templateName, mappings: mappingsToSave });
      toast.success('Template salvo!');
      setTemplateName('');
    } catch (e) {
      toast.error(e instanceof Error ? e.message : 'Erro ao salvar template');
    }
  };

  const handleDelete = async (id: number) => {
    if (!confirm('Excluir contato?')) return;
    try {
      await contactsService.delete(id);
      setContacts((prev) => prev.filter((c) => c.id !== id));
      resourceEvents.emit('contacts', { action: 'deleted', id });
      toast.success('Contato excluído.');
    } catch (e) {
      toast.error(e instanceof Error ? e.message : 'Erro ao excluir contato.');
    }
  };

  const importing = importContacts.isPending;
  const isLoading = isLoadingContacts;

  return (
    <div className="min-h-screen bg-background">
      <div className="max-w-6xl mx-auto p-6 space-y-6">
        <div className="flex items-center gap-4">
          <Button variant="ghost" size="icon" onClick={() => router.push('/')}>
            <ArrowLeft className="w-5 h-5" />
          </Button>
          <div className="flex-1">
            <h1 className="text-2xl font-bold text-foreground">Contatos</h1>
            <p className="text-sm text-muted-foreground">Importe e organize sua base de contatos</p>
          </div>
          <Button variant="outline" onClick={() => router.push('/lists')}>
            <Users className="w-4 h-4 mr-2" />
            Listas
          </Button>
          <Button onClick={() => router.push('/campaigns')}>Campanhas</Button>
        </div>

        {/* Import card */}
        <Card className="p-6 space-y-4">
          <div className="flex items-center gap-2">
            <Upload className="w-5 h-5 text-primary" />
            <h2 className="text-lg font-semibold">Importar contatos</h2>
          </div>
          <p className="text-sm text-muted-foreground">
            Envie um arquivo CSV ou XLSX. O sistema detecta automaticamente as colunas, incluindo formatos WooCommerce.
          </p>

          <div className="grid md:grid-cols-2 gap-4">
            <div>
              <Label htmlFor="file">Arquivo (.csv / .xlsx)</Label>
              <Input
                id="file"
                type="file"
                accept=".csv,.xlsx,text/csv"
                onChange={(e) => {
                  setFile(e.target.files?.[0] ?? null);
                  setPreview(null);
                  setImportResult(null);
                  setImportError(null);
                  setMappingOverrides({});
                }}
                disabled={importing}
              />
            </div>
            <div>
              <Label htmlFor="list-target">Adicionar a uma lista (opcional)</Label>
              <select
                id="list-target"
                className="w-full h-10 rounded-md border border-input bg-background px-3 text-sm"
                value={listTargetId}
                onChange={(e) => setListTargetId(e.target.value)}
                disabled={importing}
              >
                <option value="">-- Nenhuma --</option>
                {lists.map((l) => (
                  <option key={l.id} value={l.id}>
                    {l.name} ({l.contacts_count ?? 0})
                  </option>
                ))}
              </select>
            </div>
          </div>

          <div className="grid md:grid-cols-2 gap-4">
            <div>
              <Label htmlFor="list-name">Ou criar uma nova lista</Label>
              <Input
                id="list-name"
                placeholder="Ex: Leads Outubro"
                value={newListName}
                onChange={(e) => setNewListName(e.target.value)}
                disabled={importing || !!listTargetId}
              />
            </div>
            <div>
              <Label htmlFor="dup-strategy">Duplicados</Label>
              <select
                id="dup-strategy"
                className="w-full h-10 rounded-md border border-input bg-background px-3 text-sm"
                value={duplicateStrategy}
                onChange={(e) => setDuplicateStrategy(e.target.value as 'update' | 'skip')}
                disabled={importing}
              >
                <option value="update">Atualizar existente</option>
                <option value="skip">Pular duplicados</option>
              </select>
            </div>
          </div>

          <div className="flex gap-2">
            <Button
              variant="outline"
              onClick={handlePreview}
              disabled={!file || isPreviewing || importing}
            >
              {isPreviewing ? (
                <><Loader2 className="w-4 h-4 mr-2 animate-spin" />Analisando...</>
              ) : (
                <><Eye className="w-4 h-4 mr-2" />Visualizar</>
              )}
            </Button>
            <Button
              onClick={handleImport}
              disabled={!file || importing}
            >
              {importing ? (
                <><Loader2 className="w-4 h-4 mr-2 animate-spin" />Importando...</>
              ) : (
                <><Upload className="w-4 h-4 mr-2" />Importar</>
              )}
            </Button>
          </div>

          {importError && (
            <div className="p-3 rounded-lg bg-red-50 border border-red-200 text-sm text-red-700 space-y-1">
              <div className="flex items-center gap-2">
                <AlertCircle className="w-4 h-4 shrink-0" />
                <span className="font-medium">{importError}</span>
              </div>
              <p className="text-xs text-red-600 ml-6">
                Verifique se o arquivo CSV contém dados válidos, está codificado em UTF-8 ou Latin-1, e usa vírgula ou ponto-e-vírgula como separador.
              </p>
            </div>
          )}

          {importResult && (
            <div className="flex items-start gap-2 p-3 rounded-lg bg-green-50 border border-green-200 text-sm text-green-800">
              <CheckCircle className="w-4 h-4 mt-0.5" />
              <div>
                <p className="font-medium">Importação concluída</p>
                <p className="text-xs">
                  {importResult.total_rows} linhas processadas:
                  {' '}{importResult.imported} novos,
                  {' '}{importResult.updated} atualizados,
                  {' '}{importResult.skipped} ignorados
                  {importResult.errors.length > 0 && (
                    <>, {importResult.errors.length} erros</>
                  )}
                </p>
                {importResult.errors.length > 0 && (
                  <details className="mt-2">
                    <summary className="cursor-pointer text-xs text-red-600 font-medium">
                      Ver erros ({importResult.errors.length})
                    </summary>
                    <ul className="mt-1 space-y-0.5 text-xs text-red-600">
                      {importResult.errors.slice(0, 20).map((err, i) => (
                        <li key={i}>Linha {err.row}: {err.error}</li>
                      ))}
                      {importResult.errors.length > 20 && (
                        <li>... e mais {importResult.errors.length - 20} erros</li>
                      )}
                    </ul>
                  </details>
                )}
              </div>
            </div>
          )}
        </Card>

        {/* Preview card */}
        {preview && (
          <Card className="p-6 space-y-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Eye className="w-5 h-5 text-primary" />
                <h2 className="text-lg font-semibold">Prévia da importação</h2>
                <Badge variant="secondary">{preview.total_rows} linhas</Badge>
                <Badge variant="outline" className="text-xs font-mono">
                  {preview.detected_delimiter === 'TAB' ? 'TAB' : `"${preview.detected_delimiter}"`} &middot; {preview.detected_encoding}
                </Badge>
              </div>
              <Button variant="ghost" size="sm" onClick={() => setPreview(null)}>
                <RotateCcw className="w-4 h-4 mr-1" />
                Fechar
              </Button>
            </div>

            {/* Column mappings */}
            <div>
              <h3 className="text-sm font-medium mb-2">Mapeamento de colunas detectado</h3>
              <p className="text-xs text-muted-foreground mb-3">
                Ajuste as colunas manualmente se necessário e clique em &quot;Visualizar&quot; novamente.
              </p>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                {Object.entries(FIELD_LABELS).map(([field, label]) => (
                  <div key={field}>
                    <Label className="text-xs">{label}</Label>
                    <select
                      className="w-full h-8 rounded-md border border-input bg-background px-2 text-xs"
                      value={mappingOverrides[field] ?? preview.mappings[field] ?? ''}
                      onChange={(e) => handleMappingChange(field, e.target.value)}
                    >
                      <option value="">-- Nenhuma --</option>
                      {preview.headers.map((h) => (
                        <option key={h} value={h}>{h}</option>
                      ))}
                    </select>
                  </div>
                ))}
              </div>
            </div>

            {/* Save template */}
            <div className="flex items-end gap-2">
              <div className="flex-1">
                <Label className="text-xs">Salvar mapeamento como template</Label>
                <Input
                  placeholder="Nome do template"
                  value={templateName}
                  onChange={(e) => setTemplateName(e.target.value)}
                  className="h-8 text-sm"
                />
              </div>
              <Button
                variant="outline"
                size="sm"
                onClick={handleSaveTemplate}
                disabled={!templateName}
              >
                <Save className="w-3.5 h-3.5 mr-1" />
                Salvar
              </Button>
            </div>

            {/* Preview table */}
            <div className="overflow-x-auto">
              <table className="w-full text-xs border-collapse">
                <thead>
                  <tr className="border-b bg-muted/50">
                    <th className="text-left p-2 font-medium">Nome</th>
                    <th className="text-left p-2 font-medium">Email</th>
                    <th className="text-left p-2 font-medium">Telefone</th>
                    <th className="text-left p-2 font-medium">Cidade</th>
                    <th className="text-left p-2 font-medium">Estado</th>
                    <th className="text-left p-2 font-medium">País</th>
                  </tr>
                </thead>
                <tbody>
                  {preview.preview_rows.map((row, i) => (
                    <tr key={i} className="border-b hover:bg-muted/30">
                      <td className="p-2">{row.name}</td>
                      <td className="p-2 text-blue-600">{row.email}</td>
                      <td className="p-2 font-mono">{row.phone ?? '-'}</td>
                      <td className="p-2">{row.city ?? '-'}</td>
                      <td className="p-2">{row.state ?? '-'}</td>
                      <td className="p-2">{row.country ?? '-'}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            <div className="flex justify-end">
              <Button onClick={handleImport} disabled={importing}>
                {importing ? (
                  <><Loader2 className="w-4 h-4 mr-2 animate-spin" />Importando...</>
                ) : (
                  <><ArrowRight className="w-4 h-4 mr-2" />Confirmar importação ({preview.total_rows} linhas)</>
                )}
              </Button>
            </div>
          </Card>
        )}

        {/* Contacts list */}
        <Card className="p-6 space-y-4">
          <div className="flex items-center gap-2">
            <Input
              placeholder="Buscar por nome, telefone ou email..."
              value={search}
              onChange={(e) => handleSearchChange(e.target.value)}
            />
            <Button variant="outline" size="icon" disabled>
              <Search className="w-4 h-4" />
            </Button>
          </div>

          {isLoading ? (
            <div className="flex justify-center py-12">
              <Loader2 className="w-6 h-6 animate-spin text-primary" />
            </div>
          ) : contacts.length === 0 ? (
            <p className="text-center text-sm text-muted-foreground py-12">Nenhum contato ainda.</p>
          ) : (
            <>
              <div className="divide-y">
                {contacts.map((c) => {
                  const isNew = highlightedContactIds.has(c.id);
                  return (
                    <div
                      key={c.id}
                      className={`flex items-center justify-between py-3 transition-colors ${
                        isNew ? 'bg-blue-50 -mx-2 px-2 rounded animate-in fade-in' : ''
                      }`}
                    >
                      <div>
                        <div className="flex items-center gap-2">
                          <p className="font-medium">{c.name || '(sem nome)'}</p>
                          {isNew && (
                            <Badge className="bg-blue-600 text-white text-[10px]">
                              <Sparkles className="w-2.5 h-2.5 mr-0.5" />
                              Novo
                            </Badge>
                          )}
                        </div>
                        <p className="text-sm text-muted-foreground">
                          {c.phone}
                          {c.email && <span className="ml-2">{c.email}</span>}
                        </p>
                      </div>
                      <div className="flex items-center gap-2">
                        {c.source_file && <Badge variant="outline">{c.source_file}</Badge>}
                        <Button variant="ghost" size="icon" onClick={() => handleDelete(c.id)}>
                          <Trash2 className="w-4 h-4 text-red-500" />
                        </Button>
                      </div>
                    </div>
                  );
                })}
              </div>

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
            </>
          )}
        </Card>
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

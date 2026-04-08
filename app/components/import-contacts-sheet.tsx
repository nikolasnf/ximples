'use client';

import { useState, useRef, type DragEvent } from 'react';
import {
  contactsService,
  listsService,
  type ContactList,
  type ImportResult,
  type ImportPreview,
} from '@/services/contacts.service';
import { useCreateWithFeedback } from '@/hooks/use-create-with-feedback';
import { useResourceList } from '@/hooks/use-resource-list';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetDescription,
} from '@/components/ui/sheet';
import {
  Upload, Loader2, CheckCircle, AlertCircle, Eye, ArrowRight,
  RotateCcw, Save, FileSpreadsheet, X,
} from 'lucide-react';

const FIELD_LABELS: Record<string, string> = {
  name: 'Nome',
  last_name: 'Sobrenome',
  email: 'Email',
  phone: 'Telefone',
  city: 'Cidade',
  state: 'Estado',
  country: 'Pais',
};

interface ImportContactsSheetProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function ImportContactsSheet({ open, onOpenChange }: ImportContactsSheetProps) {
  const [file, setFile] = useState<File | null>(null);
  const [isDragging, setIsDragging] = useState(false);
  const [listTargetId, setListTargetId] = useState<string>('');
  const [newListName, setNewListName] = useState('');
  const [duplicateStrategy, setDuplicateStrategy] = useState<'update' | 'skip'>('update');
  const [preview, setPreview] = useState<ImportPreview | null>(null);
  const [isPreviewing, setIsPreviewing] = useState(false);
  const [mappingOverrides, setMappingOverrides] = useState<Record<string, string>>({});
  const [templateName, setTemplateName] = useState('');
  const [importResult, setImportResult] = useState<ImportResult | null>(null);
  const [importError, setImportError] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const { items: lists } = useResourceList<ContactList>({
    resource: 'lists',
    fetcher: () => listsService.list(),
    enabled: open,
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

  const importing = importContacts.isPending;

  const handleDragOver = (e: DragEvent) => {
    e.preventDefault();
    setIsDragging(true);
  };

  const handleDragLeave = (e: DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
  };

  const handleDrop = (e: DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    const droppedFile = e.dataTransfer.files[0];
    if (droppedFile && (droppedFile.name.endsWith('.csv') || droppedFile.name.endsWith('.xlsx'))) {
      setFile(droppedFile);
      setPreview(null);
      setImportResult(null);
      setImportError(null);
      setMappingOverrides({});
    } else {
      toast.error('Envie um arquivo .csv ou .xlsx');
    }
  };

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const selected = e.target.files?.[0] ?? null;
    setFile(selected);
    setPreview(null);
    setImportResult(null);
    setImportError(null);
    setMappingOverrides({});
  };

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

  const clearFile = () => {
    setFile(null);
    setPreview(null);
    setImportResult(null);
    setImportError(null);
    setMappingOverrides({});
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent side="right" className="w-full sm:max-w-lg overflow-y-auto">
        <SheetHeader>
          <SheetTitle className="flex items-center gap-2">
            <Upload className="w-5 h-5 text-primary" />
            Importar contatos
          </SheetTitle>
          <SheetDescription>
            Envie um arquivo CSV ou XLSX. O sistema detecta automaticamente as colunas.
          </SheetDescription>
        </SheetHeader>

        <div className="space-y-5 px-4 pb-6">
          {/* Drag & drop area */}
          {!file ? (
            <div
              onDragOver={handleDragOver}
              onDragLeave={handleDragLeave}
              onDrop={handleDrop}
              onClick={() => fileInputRef.current?.click()}
              className={`
                relative cursor-pointer rounded-xl border-2 border-dashed p-8
                flex flex-col items-center gap-3 transition-all
                ${isDragging
                  ? 'border-primary bg-primary/5 scale-[1.02]'
                  : 'border-border hover:border-primary/50 hover:bg-muted/50'
                }
              `}
            >
              <div className="w-12 h-12 rounded-xl bg-primary/10 flex items-center justify-center">
                <FileSpreadsheet className="w-6 h-6 text-primary" />
              </div>
              <div className="text-center">
                <p className="font-medium text-sm">Arraste ou selecione seu arquivo</p>
                <p className="text-xs text-muted-foreground mt-1">
                  Formatos aceitos: .csv, .xlsx
                </p>
              </div>
              <input
                ref={fileInputRef}
                type="file"
                accept=".csv,.xlsx,text/csv"
                onChange={handleFileSelect}
                className="hidden"
              />
            </div>
          ) : (
            <div className="flex items-center gap-3 p-3 rounded-lg bg-muted/50 border">
              <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center shrink-0">
                <FileSpreadsheet className="w-5 h-5 text-primary" />
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium truncate">{file.name}</p>
                <p className="text-xs text-muted-foreground">
                  {(file.size / 1024).toFixed(1)} KB
                </p>
              </div>
              <Button variant="ghost" size="icon" onClick={clearFile} className="shrink-0">
                <X className="w-4 h-4" />
              </Button>
            </div>
          )}

          {/* List target */}
          <div className="space-y-3">
            <div>
              <Label htmlFor="import-list-target" className="text-xs">Adicionar a uma lista</Label>
              <select
                id="import-list-target"
                className="w-full h-9 rounded-md border border-input bg-background px-3 text-sm mt-1"
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
            <div>
              <Label htmlFor="import-list-name" className="text-xs">Ou criar uma nova lista</Label>
              <Input
                id="import-list-name"
                placeholder="Ex: Leads Outubro"
                value={newListName}
                onChange={(e) => setNewListName(e.target.value)}
                disabled={importing || !!listTargetId}
                className="mt-1 h-9"
              />
            </div>
            <div>
              <Label htmlFor="import-dup-strategy" className="text-xs">Duplicados</Label>
              <select
                id="import-dup-strategy"
                className="w-full h-9 rounded-md border border-input bg-background px-3 text-sm mt-1"
                value={duplicateStrategy}
                onChange={(e) => setDuplicateStrategy(e.target.value as 'update' | 'skip')}
                disabled={importing}
              >
                <option value="update">Atualizar existente</option>
                <option value="skip">Pular duplicados</option>
              </select>
            </div>
          </div>

          {/* Actions */}
          <div className="flex gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={handlePreview}
              disabled={!file || isPreviewing || importing}
              className="flex-1"
            >
              {isPreviewing ? (
                <><Loader2 className="w-4 h-4 mr-2 animate-spin" />Analisando...</>
              ) : (
                <><Eye className="w-4 h-4 mr-2" />Visualizar</>
              )}
            </Button>
            <Button
              size="sm"
              onClick={handleImport}
              disabled={!file || importing}
              className="flex-1"
            >
              {importing ? (
                <><Loader2 className="w-4 h-4 mr-2 animate-spin" />Importando...</>
              ) : (
                <><Upload className="w-4 h-4 mr-2" />Importar</>
              )}
            </Button>
          </div>

          {/* Error */}
          {importError && (
            <div className="p-3 rounded-lg bg-red-50 border border-red-200 text-sm text-red-700 space-y-1">
              <div className="flex items-center gap-2">
                <AlertCircle className="w-4 h-4 shrink-0" />
                <span className="font-medium">{importError}</span>
              </div>
              <p className="text-xs text-red-600 ml-6">
                Verifique se o arquivo contém dados validos, esta codificado em UTF-8 ou Latin-1.
              </p>
            </div>
          )}

          {/* Success */}
          {importResult && (
            <div className="flex items-start gap-2 p-3 rounded-lg bg-green-50 border border-green-200 text-sm text-green-800">
              <CheckCircle className="w-4 h-4 mt-0.5 shrink-0" />
              <div>
                <p className="font-medium">Importacao concluida</p>
                <p className="text-xs">
                  {importResult.total_rows} linhas processadas:
                  {' '}{importResult.imported} novos,
                  {' '}{importResult.updated} atualizados,
                  {' '}{importResult.skipped} ignorados
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
                    </ul>
                  </details>
                )}
              </div>
            </div>
          )}

          {/* Preview */}
          {preview && (
            <div className="space-y-4 border-t pt-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <h3 className="text-sm font-semibold">Previa</h3>
                  <Badge variant="secondary" className="text-xs">{preview.total_rows} linhas</Badge>
                  <Badge variant="outline" className="text-[10px] font-mono">
                    {preview.detected_encoding}
                  </Badge>
                </div>
                <Button variant="ghost" size="sm" onClick={() => setPreview(null)}>
                  <RotateCcw className="w-3.5 h-3.5" />
                </Button>
              </div>

              {/* Column mappings */}
              <div>
                <p className="text-xs text-muted-foreground mb-2">
                  Ajuste o mapeamento de colunas se necessario:
                </p>
                <div className="grid grid-cols-2 gap-2">
                  {Object.entries(FIELD_LABELS).map(([field, label]) => (
                    <div key={field}>
                      <Label className="text-[10px] text-muted-foreground">{label}</Label>
                      <select
                        className="w-full h-7 rounded border border-input bg-background px-2 text-xs"
                        value={mappingOverrides[field] ?? preview.mappings[field] ?? ''}
                        onChange={(e) => handleMappingChange(field, e.target.value)}
                      >
                        <option value="">--</option>
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
                  <Label className="text-xs">Salvar como template</Label>
                  <Input
                    placeholder="Nome do template"
                    value={templateName}
                    onChange={(e) => setTemplateName(e.target.value)}
                    className="h-7 text-xs"
                  />
                </div>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={handleSaveTemplate}
                  disabled={!templateName}
                  className="h-7"
                >
                  <Save className="w-3 h-3 mr-1" />
                  Salvar
                </Button>
              </div>

              {/* Preview rows */}
              <div className="overflow-x-auto rounded-lg border">
                <table className="w-full text-[11px]">
                  <thead>
                    <tr className="border-b bg-muted/50">
                      <th className="text-left p-2 font-medium">Nome</th>
                      <th className="text-left p-2 font-medium">Email</th>
                      <th className="text-left p-2 font-medium">Telefone</th>
                    </tr>
                  </thead>
                  <tbody>
                    {preview.preview_rows.slice(0, 5).map((row, i) => (
                      <tr key={i} className="border-b last:border-0">
                        <td className="p-2">{row.name || '-'}</td>
                        <td className="p-2 text-blue-600">{row.email || '-'}</td>
                        <td className="p-2 font-mono">{row.phone ?? '-'}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              <Button onClick={handleImport} disabled={importing} className="w-full" size="sm">
                {importing ? (
                  <><Loader2 className="w-4 h-4 mr-2 animate-spin" />Importando...</>
                ) : (
                  <><ArrowRight className="w-4 h-4 mr-2" />Confirmar importacao ({preview.total_rows} linhas)</>
                )}
              </Button>
            </div>
          )}
        </div>
      </SheetContent>
    </Sheet>
  );
}

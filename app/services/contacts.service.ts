import { api, ApiError } from '@/lib/api';

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'https://backend.ximples.com.br';

export interface Contact {
  id: number;
  user_id: number;
  name: string | null;
  phone: string;
  email: string | null;
  source_file: string | null;
  tags: string[] | null;
  created_at: string;
  updated_at: string;
}

export interface ContactList {
  id: number;
  name: string;
  description: string | null;
  contacts_count?: number;
  created_at: string;
  updated_at: string;
}

export interface ImportResult {
  total_rows: number;
  imported: number;
  updated: number;
  duplicates: number;
  skipped: number;
  errors: Array<{ row: number; error: string }>;
  list_id: number | null;
}

export interface ImportPreview {
  headers: string[];
  mappings: Record<string, string | null>;
  preview_rows: Array<{
    name: string;
    email: string;
    phone: string | null;
    city: string | null;
    state: string | null;
    country: string | null;
    raw_data: { original_columns: Record<string, string>; mapped_fields: Record<string, string> };
  }>;
  total_rows: number;
  detected_encoding: string;
  detected_delimiter: string;
}

export interface MappingTemplate {
  id: number;
  name: string;
  mappings: Record<string, string>;
  created_at: string;
  updated_at: string;
}

export interface PaginatedResponse<T> {
  data: T[];
  meta: {
    total: number;
    current_page: number;
    last_page: number;
    per_page: number;
  };
}

export const contactsService = {
  async list(params: { search?: string; list_id?: number; per_page?: number } = {}): Promise<PaginatedResponse<Contact>> {
    const qs = new URLSearchParams();
    if (params.search) qs.set('search', params.search);
    if (params.list_id) qs.set('list_id', String(params.list_id));
    if (params.per_page) qs.set('per_page', String(params.per_page));
    const query = qs.toString() ? `?${qs.toString()}` : '';
    const res = await api.get<{ success: boolean; data: Contact[]; meta: PaginatedResponse<Contact>['meta'] }>(
      `/api/v1/contacts${query}`,
    );
    return { data: res.data, meta: res.meta };
  },

  async create(data: { name?: string; phone: string; email?: string; tags?: string[] }): Promise<Contact> {
    const res = await api.post<{ success: boolean; data: Contact }>('/api/v1/contacts', data);
    return res.data;
  },

  async delete(id: number): Promise<void> {
    await api.delete(`/api/v1/contacts/${id}`);
  },

  /**
   * Preview CSV: parse file and return detected mappings + first 10 rows.
   */
  async preview(params: {
    file: File;
    mappings?: Record<string, string>;
  }): Promise<ImportPreview> {
    const token = typeof window !== 'undefined' ? localStorage.getItem('ximples_token') : null;

    const formData = new FormData();
    formData.append('file', params.file);
    if (params.mappings) formData.append('mappings', JSON.stringify(params.mappings));

    const response = await fetch(`${API_URL}/api/v1/contacts/import/preview`, {
      method: 'POST',
      headers: {
        Accept: 'application/json',
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
      },
      body: formData,
    });

    const body = await response.json().catch(() => ({}));
    if (!response.ok || !body.success) {
      throw new ApiError(body.message || 'Erro ao analisar arquivo', response.status, body);
    }
    return body.data as ImportPreview;
  },

  /**
   * Upload CSV/XLSX file and import contacts.
   * Uses raw fetch because ApiClient forces JSON content-type.
   */
  async import(params: {
    file: File;
    list_id?: number;
    list_name?: string;
    mappings?: Record<string, string>;
    duplicate_strategy?: 'update' | 'skip';
    template_id?: number;
  }): Promise<ImportResult> {
    const token = typeof window !== 'undefined' ? localStorage.getItem('ximples_token') : null;

    const formData = new FormData();
    formData.append('file', params.file);
    if (params.list_id) formData.append('list_id', String(params.list_id));
    if (params.list_name) formData.append('list_name', params.list_name);
    if (params.mappings) formData.append('mappings', JSON.stringify(params.mappings));
    if (params.duplicate_strategy) formData.append('duplicate_strategy', params.duplicate_strategy);
    if (params.template_id) formData.append('template_id', String(params.template_id));

    const response = await fetch(`${API_URL}/api/v1/contacts/import`, {
      method: 'POST',
      headers: {
        Accept: 'application/json',
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
      },
      body: formData,
    });

    const body = await response.json().catch(() => ({}));

    if (!response.ok || !body.success) {
      throw new ApiError(body.message || 'Erro ao importar contatos', response.status, body);
    }

    return body.data as ImportResult;
  },

  async listMappingTemplates(): Promise<MappingTemplate[]> {
    const res = await api.get<{ success: boolean; data: MappingTemplate[] }>('/api/v1/contacts/import/templates');
    return res.data;
  },

  async saveMappingTemplate(data: { name: string; mappings: Record<string, string> }): Promise<MappingTemplate> {
    const res = await api.post<{ success: boolean; data: MappingTemplate }>('/api/v1/contacts/import/templates', data);
    return res.data;
  },

  async deleteMappingTemplate(id: number): Promise<void> {
    await api.delete(`/api/v1/contacts/import/templates/${id}`);
  },
};

export const listsService = {
  async list(): Promise<ContactList[]> {
    const res = await api.get<{ success: boolean; data: ContactList[] }>('/api/v1/lists');
    return res.data;
  },

  async get(id: number): Promise<{ list: ContactList; contacts: Contact[]; meta: PaginatedResponse<Contact>['meta'] }> {
    const res = await api.get<{
      success: boolean;
      data: { list: ContactList; contacts: Contact[]; meta: PaginatedResponse<Contact>['meta'] };
    }>(`/api/v1/lists/${id}`);
    return res.data;
  },

  async create(data: { name: string; description?: string }): Promise<ContactList> {
    const res = await api.post<{ success: boolean; data: ContactList }>('/api/v1/lists', data);
    return res.data;
  },

  async update(id: number, data: { name?: string; description?: string }): Promise<ContactList> {
    const res = await api.put<{ success: boolean; data: ContactList }>(`/api/v1/lists/${id}`, data);
    return res.data;
  },

  async delete(id: number): Promise<void> {
    await api.delete(`/api/v1/lists/${id}`);
  },

  async attachContacts(id: number, contactIds: number[]): Promise<void> {
    await api.post(`/api/v1/lists/${id}/contacts`, { contact_ids: contactIds });
  },

  async detachContact(id: number, contactId: number): Promise<void> {
    await api.delete(`/api/v1/lists/${id}/contacts/${contactId}`);
  },
};

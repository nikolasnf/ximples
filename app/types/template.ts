import type { PageDocument } from './page';

export type TemplateCategory =
  | 'vendas'
  | 'lead'
  | 'webinar'
  | 'produto'
  | 'institucional';

export interface PageTemplate {
  id: number;
  name: string;
  slug: string;
  description?: string;
  category: TemplateCategory;
  preview_image?: string;
  structure_json: PageDocument;
  is_active: boolean;
  sort_order: number;
  created_at: string;
}

// ─── Theme ───────────────────────────────────────────────
export interface PageTheme {
  fontFamily?: string;
  primaryColor?: string;
  backgroundColor?: string;
  textColor?: string;
  radius?: string;
}

// ─── Section Props ───────────────────────────────────────
export interface HeroProps {
  headline?: string;
  subheadline?: string;
  buttonText?: string;
  buttonLink?: string;
  // Legacy compat
  title?: string;
  subtitle?: string;
  cta_text?: string;
  cta_url?: string;
}

export interface TextProps {
  title?: string;
  content?: string;
  text?: string;
}

export interface FeatureItem {
  icon?: string;
  title: string;
  description: string;
}

export interface FeaturesProps {
  title?: string;
  items?: FeatureItem[];
}

export interface FaqItem {
  question?: string;
  answer?: string;
  title?: string;
  description?: string;
}

export interface FaqProps {
  title?: string;
  items?: FaqItem[];
}

export interface CtaProps {
  title?: string;
  headline?: string;
  subtitle?: string;
  subheadline?: string;
  buttonText?: string;
  buttonLink?: string;
  button_text?: string;
  button_url?: string;
}

export interface ImageProps {
  src?: string;
  url?: string;
  alt?: string;
  caption?: string;
}

export interface TestimonialItem {
  quote?: string;
  text?: string;
  name?: string;
  author?: string;
  role?: string;
  position?: string;
}

export interface TestimonialProps {
  title?: string;
  items?: TestimonialItem[];
}

export interface PricingPlan {
  name?: string;
  title?: string;
  price?: string;
  period?: string;
  highlighted?: boolean;
  buttonText?: string;
  buttonLink?: string;
  features?: (string | { text: string })[];
}

export interface PricingProps {
  title?: string;
  plans?: PricingPlan[];
  items?: PricingPlan[];
}

export interface CountdownProps {
  title?: string;
  subtitle?: string;
  targetDate?: string;
}

export interface FormField {
  name: string;
  label?: string;
  type?: string;
  placeholder?: string;
  required?: boolean;
}

export interface FormProps {
  title?: string;
  subtitle?: string;
  buttonText?: string;
  action?: string;
  fields?: FormField[];
}

export interface FooterProps {
  text?: string;
  powered_by?: string;
}

export interface HtmlProps {
  content?: string;
}

// ─── Section ─────────────────────────────────────────────
export type SectionType =
  | 'hero'
  | 'text'
  | 'features'
  | 'faq'
  | 'cta'
  | 'image'
  | 'testimonial'
  | 'pricing'
  | 'countdown'
  | 'form'
  | 'footer'
  | 'html'
  | 'benefits'; // legacy

export type SectionProps =
  | HeroProps
  | TextProps
  | FeaturesProps
  | FaqProps
  | CtaProps
  | ImageProps
  | TestimonialProps
  | PricingProps
  | CountdownProps
  | FormProps
  | FooterProps
  | HtmlProps;

export interface PageSection {
  id?: string;
  type: SectionType;
  props?: SectionProps;
  // Legacy flat props (backward compat with old content_json)
  title?: string;
  subtitle?: string;
  content?: string;
  text?: string;
  cta_text?: string;
  cta_url?: string;
  button_text?: string;
  button_url?: string;
  items?: FeatureItem[];
  powered_by?: string;
}

// ─── Page Document (content_json structure) ──────────────
export interface PageDocument {
  version?: number;
  page?: {
    title?: string;
    type?: string;
  };
  theme?: PageTheme;
  sections: PageSection[];
  // Legacy flat fields
  title?: string;
  template?: string;
}

// ─── API Response Types ──────────────────────────────────
export interface PublicPage {
  id: number;
  title: string;
  slug: string;
  type?: string;
  meta_title?: string;
  meta_description?: string;
  theme?: PageTheme;
  content: PageDocument;
  tracking_pixel?: string;
  created_at: string;
}

export interface PageRecord {
  id: number;
  title: string;
  slug: string;
  type: string;
  status: string;
  meta_title?: string;
  meta_description?: string;
  theme_json?: PageTheme;
  content_json?: PageDocument;
  exported_html_path?: string;
  preview_image?: string;
  public_url: string;
  preview_url: string;
  created_at: string;
  updated_at: string;
}

export interface PageExportResult {
  exported_html_path: string;
  download_url: string;
}

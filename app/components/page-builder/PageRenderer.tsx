'use client';

import type { PageSection, PageTheme, PageDocument } from '@/types/page';
import HeroBlock from './blocks/HeroBlock';
import TextBlock from './blocks/TextBlock';
import FeaturesBlock from './blocks/FeaturesBlock';
import FaqBlock from './blocks/FaqBlock';
import CtaBlock from './blocks/CtaBlock';
import ImageBlock from './blocks/ImageBlock';
import TestimonialBlock from './blocks/TestimonialBlock';
import PricingBlock from './blocks/PricingBlock';
import CountdownBlock from './blocks/CountdownBlock';
import FormBlock from './blocks/FormBlock';
import FooterBlock from './blocks/FooterBlock';

interface PageRendererProps {
  document: PageDocument;
  theme?: PageTheme;
}

/**
 * Resolve section props: new format uses `props`, legacy uses flat fields.
 */
function resolveProps(section: PageSection): Record<string, unknown> {
  if (section.props && typeof section.props === 'object') {
    return section.props as Record<string, unknown>;
  }
  // Legacy: spread all fields except id/type as props
  const { id, type, props, ...rest } = section;
  return rest;
}

function renderSection(section: PageSection, theme: PageTheme, index: number) {
  const sectionProps = resolveProps(section);
  const key = section.id || `section-${index}`;

  switch (section.type) {
    case 'hero':
      return <HeroBlock key={key} props={sectionProps as any} theme={theme} />;
    case 'text':
      return <TextBlock key={key} props={sectionProps as any} />;
    case 'features':
    case 'benefits': // legacy alias
      return <FeaturesBlock key={key} props={sectionProps as any} theme={theme} />;
    case 'faq':
      return <FaqBlock key={key} props={sectionProps as any} theme={theme} />;
    case 'cta':
      return <CtaBlock key={key} props={sectionProps as any} theme={theme} />;
    case 'image':
      return <ImageBlock key={key} props={sectionProps as any} theme={theme} />;
    case 'testimonial':
      return <TestimonialBlock key={key} props={sectionProps as any} theme={theme} />;
    case 'pricing':
      return <PricingBlock key={key} props={sectionProps as any} theme={theme} />;
    case 'countdown':
      return <CountdownBlock key={key} props={sectionProps as any} theme={theme} />;
    case 'form':
      return <FormBlock key={key} props={sectionProps as any} theme={theme} />;
    case 'footer':
      return <FooterBlock key={key} props={sectionProps as any} theme={theme} />;
    case 'html':
      if (!sectionProps.content) return null;
      return (
        <section key={key} className="py-12 px-6 bg-gray-50">
          <div
            className="max-w-4xl mx-auto"
            dangerouslySetInnerHTML={{ __html: sectionProps.content as string }}
          />
        </section>
      );
    default:
      return null;
  }
}

export default function PageRenderer({ document, theme: themeProp }: PageRendererProps) {
  const theme: PageTheme = {
    fontFamily: 'Inter',
    primaryColor: '#183A6B',
    backgroundColor: '#FFFFFF',
    textColor: '#0F172A',
    radius: '16px',
    ...document.theme,
    ...themeProp,
  };

  const sections = document.sections || [];

  return (
    <div
      className="min-h-screen"
      style={{
        fontFamily: `'${theme.fontFamily}', system-ui, -apple-system, sans-serif`,
        color: theme.textColor,
        backgroundColor: theme.backgroundColor,
      }}
    >
      {sections.map((section, index) => renderSection(section, theme, index))}
    </div>
  );
}

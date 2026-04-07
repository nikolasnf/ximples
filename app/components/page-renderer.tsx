'use client';

import type { PageSection, PageTheme, PageDocument } from '@/types/page';
import PageRenderer from './page-builder/PageRenderer';

/**
 * Legacy wrapper — accepts old-style sections array or new PageDocument.
 * Kept for backward compatibility. New code should use PageRenderer directly.
 */
export default function LegacyPageRenderer({
  sections,
  document: doc,
  theme,
}: {
  sections?: PageSection[];
  document?: PageDocument;
  theme?: PageTheme;
}) {
  const pageDoc: PageDocument = doc || { sections: sections || [] };

  return <PageRenderer document={pageDoc} theme={theme} />;
}

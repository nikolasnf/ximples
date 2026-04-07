import { pagesService } from '@/services/pages.service';
import PageRenderer from '@/components/page-builder/PageRenderer';
import { notFound } from 'next/navigation';
import type { Metadata } from 'next';

interface PageProps {
  params: Promise<{ slug: string }>;
}

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { slug } = await params;
  try {
    const page = await pagesService.getBySlug(slug);
    return {
      title: (page.meta_title || page.title) + ' | Ximples',
      description: page.meta_description || (page.content?.sections?.[0]?.props as Record<string, unknown>)?.subheadline as string || 'Página criada com Ximples',
    };
  } catch {
    return { title: 'Página não encontrada | Ximples' };
  }
}

export default async function PublicPage({ params }: PageProps) {
  const { slug } = await params;

  let page;
  try {
    page = await pagesService.getBySlug(slug);
  } catch {
    notFound();
  }

  if (!page?.content?.sections) {
    notFound();
  }

  const document = {
    ...page.content,
    theme: page.theme || page.content.theme,
  };

  return (
    <>
      <PageRenderer document={document} />
      {page.tracking_pixel && (
        <script
          // Tracking pixel served by the backend — records visits and exposes
          // window.ximples.track(name, metadata) for conversion events.
          dangerouslySetInnerHTML={{ __html: page.tracking_pixel }}
        />
      )}
    </>
  );
}

'use client';

import type { TextProps } from '@/types/page';

interface Props {
  props: TextProps;
}

export default function TextBlock({ props: p }: Props) {
  return (
    <section className="py-16 px-6 bg-white">
      <div className="max-w-3xl mx-auto">
        {p.title && (
          <h2 className="text-3xl font-bold text-gray-900 mb-6">{p.title}</h2>
        )}
        {p.content && (
          <div
            className="prose prose-lg max-w-none text-gray-600 leading-relaxed"
            dangerouslySetInnerHTML={{ __html: p.content }}
          />
        )}
        {p.text && !p.content && (
          <p className="text-lg text-gray-600 leading-relaxed">{p.text}</p>
        )}
      </div>
    </section>
  );
}

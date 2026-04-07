'use client';

import type { ImageProps } from '@/types/page';

interface Props {
  props: ImageProps;
  theme?: { radius?: string };
}

export default function ImageBlock({ props: p, theme }: Props) {
  const src = p.src || p.url;
  if (!src) return null;

  const radius = theme?.radius || '16px';

  return (
    <section className="py-16 px-6 bg-white">
      <div className="max-w-4xl mx-auto text-center">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src={src}
          alt={p.alt || ''}
          className="mx-auto shadow-lg"
          style={{ borderRadius: radius }}
          loading="lazy"
        />
        {p.caption && (
          <p className="text-gray-500 text-sm mt-4">{p.caption}</p>
        )}
      </div>
    </section>
  );
}

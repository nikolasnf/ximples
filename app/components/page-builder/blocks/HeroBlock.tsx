'use client';

import type { HeroProps } from '@/types/page';

interface Props {
  props: HeroProps;
  theme?: { primaryColor?: string };
}

export default function HeroBlock({ props: p, theme }: Props) {
  const headline = p.headline || p.title || '';
  const sub = p.subheadline || p.subtitle || '';
  const btnText = p.buttonText || p.cta_text || '';
  const btnLink = p.buttonLink || p.cta_url || '#';
  const primary = theme?.primaryColor || '#183A6B';

  return (
    <section
      className="relative text-white py-24 px-6"
      style={{ background: `linear-gradient(135deg, ${primary}, ${primary}dd)` }}
    >
      <div className="max-w-4xl mx-auto text-center">
        <h1 className="text-4xl md:text-5xl lg:text-6xl font-bold mb-6 leading-tight">
          {headline}
        </h1>
        {sub && (
          <p className="text-lg md:text-xl opacity-90 mb-10 max-w-2xl mx-auto leading-relaxed">
            {sub}
          </p>
        )}
        {btnText && (
          <a
            href={btnLink}
            className="inline-block bg-white font-semibold px-10 py-4 rounded-2xl text-lg hover:bg-gray-100 transition-all shadow-lg hover:shadow-xl hover:-translate-y-0.5"
            style={{ color: primary }}
          >
            {btnText}
          </a>
        )}
      </div>
    </section>
  );
}

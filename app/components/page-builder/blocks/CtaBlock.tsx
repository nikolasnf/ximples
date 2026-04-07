'use client';

import type { CtaProps } from '@/types/page';

interface Props {
  props: CtaProps;
  theme?: { primaryColor?: string };
}

export default function CtaBlock({ props: p, theme }: Props) {
  const primary = theme?.primaryColor || '#183A6B';
  const title = p.title || p.headline || '';
  const sub = p.subtitle || p.subheadline || '';
  const btnText = p.buttonText || p.button_text || '';
  const btnLink = p.buttonLink || p.button_url || '#';

  return (
    <section
      className="py-20 px-6 text-white"
      style={{ background: `linear-gradient(135deg, ${primary}, ${primary}cc)` }}
    >
      <div className="max-w-3xl mx-auto text-center">
        <h2 className="text-3xl font-bold mb-4">{title}</h2>
        {sub && <p className="text-lg opacity-90 mb-10 max-w-xl mx-auto">{sub}</p>}
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

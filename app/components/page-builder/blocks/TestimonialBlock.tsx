'use client';

import type { TestimonialProps } from '@/types/page';

interface Props {
  props: TestimonialProps;
  theme?: { primaryColor?: string };
}

export default function TestimonialBlock({ props: p, theme }: Props) {
  const primary = theme?.primaryColor || '#183A6B';

  return (
    <section className="py-20 px-6 bg-slate-50">
      <div className="max-w-6xl mx-auto">
        {p.title && (
          <h2 className="text-3xl font-bold text-center text-gray-900 mb-14">
            {p.title}
          </h2>
        )}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
          {p.items?.map((item, i) => (
            <div key={i} className="bg-white p-8 rounded-2xl shadow-sm">
              <blockquote className="text-gray-600 leading-relaxed mb-6 italic">
                &ldquo;{item.quote || item.text}&rdquo;
              </blockquote>
              <div>
                <p className="font-semibold text-gray-900">{item.name || item.author}</p>
                {(item.role || item.position) && (
                  <p className="text-sm" style={{ color: primary }}>
                    {item.role || item.position}
                  </p>
                )}
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

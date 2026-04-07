'use client';

import type { FaqProps } from '@/types/page';

interface Props {
  props: FaqProps;
  theme?: { primaryColor?: string };
}

export default function FaqBlock({ props: p, theme }: Props) {
  return (
    <section className="py-20 px-6 bg-white">
      <div className="max-w-3xl mx-auto">
        {p.title && (
          <h2 className="text-3xl font-bold text-center text-gray-900 mb-14">
            {p.title}
          </h2>
        )}
        <div className="space-y-0 divide-y divide-gray-200">
          {p.items?.map((item, i) => (
            <div key={i} className="py-6">
              <h3 className="text-lg font-semibold text-gray-900 mb-2">
                {item.question || item.title}
              </h3>
              <p className="text-gray-500 leading-relaxed">
                {item.answer || item.description}
              </p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

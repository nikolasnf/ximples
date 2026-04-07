'use client';

import type { PricingProps } from '@/types/page';

interface Props {
  props: PricingProps;
  theme?: { primaryColor?: string; radius?: string };
}

export default function PricingBlock({ props: p, theme }: Props) {
  const primary = theme?.primaryColor || '#183A6B';
  const radius = theme?.radius || '16px';
  const plans = p.plans || p.items || [];

  return (
    <section className="py-20 px-6 bg-white">
      <div className="max-w-5xl mx-auto">
        {p.title && (
          <h2 className="text-3xl font-bold text-center text-gray-900 mb-14">
            {p.title}
          </h2>
        )}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
          {plans.map((plan, i) => (
            <div
              key={i}
              className={`p-8 text-center transition-all ${
                plan.highlighted
                  ? 'shadow-xl scale-[1.02]'
                  : 'shadow-sm hover:shadow-lg'
              }`}
              style={{
                borderRadius: radius,
                border: `2px solid ${plan.highlighted ? primary : '#E2E8F0'}`,
              }}
            >
              <h3 className="text-xl font-semibold mb-2">{plan.name || plan.title}</h3>
              <div className="my-6">
                <span className="text-4xl font-bold" style={{ color: primary }}>
                  {plan.price}
                </span>
                <span className="text-gray-500 text-sm">{plan.period || '/mês'}</span>
              </div>
              <ul className="space-y-3 mb-8 text-left">
                {plan.features?.map((f, j) => {
                  const text = typeof f === 'string' ? f : f.text;
                  return (
                    <li key={j} className="text-gray-600 text-sm flex items-start gap-2">
                      <span style={{ color: primary }} className="font-bold mt-0.5">&#10003;</span>
                      {text}
                    </li>
                  );
                })}
              </ul>
              <a
                href={plan.buttonLink || '#'}
                className="block w-full py-3 rounded-xl font-semibold text-white transition-all hover:opacity-90"
                style={{ backgroundColor: primary }}
              >
                {plan.buttonText || 'Escolher plano'}
              </a>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

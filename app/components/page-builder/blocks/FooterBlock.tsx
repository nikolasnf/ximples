'use client';

import type { FooterProps } from '@/types/page';

interface Props {
  props: FooterProps;
  theme?: { primaryColor?: string };
}

export default function FooterBlock({ props: p, theme }: Props) {
  const primary = theme?.primaryColor || '#183A6B';

  return (
    <footer className="py-10 px-6 bg-gray-900 text-gray-400 text-center text-sm">
      <p>{p.text || `\u00A9 ${new Date().getFullYear()} - Todos os direitos reservados`}</p>
      {p.powered_by && (
        <p className="mt-2 text-gray-500">
          Feito com <span className="font-medium" style={{ color: primary }}>{p.powered_by}</span>
        </p>
      )}
    </footer>
  );
}

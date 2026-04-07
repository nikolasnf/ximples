'use client';

import type { FormProps } from '@/types/page';

interface Props {
  props: FormProps;
  theme?: { primaryColor?: string; radius?: string };
}

export default function FormBlock({ props: p, theme }: Props) {
  const primary = theme?.primaryColor || '#183A6B';
  const radius = theme?.radius || '16px';

  const fields = p.fields || [
    { name: 'name', label: 'Nome', type: 'text', required: true },
    { name: 'email', label: 'E-mail', type: 'email', required: true },
    { name: 'message', label: 'Mensagem', type: 'textarea', required: false },
  ];

  return (
    <section className="py-20 px-6 bg-slate-50">
      <div className="max-w-2xl mx-auto">
        {p.title && (
          <h2 className="text-3xl font-bold text-center text-gray-900 mb-3">
            {p.title}
          </h2>
        )}
        {p.subtitle && (
          <p className="text-center text-gray-500 mb-10">{p.subtitle}</p>
        )}
        <form
          action={p.action || '#'}
          method="POST"
          className="bg-white p-10 shadow-sm"
          style={{ borderRadius: radius }}
        >
          {fields.map((field, i) => (
            <div key={i} className="mb-5">
              <label className="block text-sm font-medium text-gray-700 mb-1.5">
                {field.label || field.name}
              </label>
              {field.type === 'textarea' ? (
                <textarea
                  name={field.name}
                  placeholder={field.placeholder || ''}
                  required={field.required}
                  rows={4}
                  className="w-full px-4 py-3 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 transition-all"
                  style={{ '--tw-ring-color': primary } as React.CSSProperties}
                />
              ) : (
                <input
                  type={field.type || 'text'}
                  name={field.name}
                  placeholder={field.placeholder || ''}
                  required={field.required}
                  className="w-full px-4 py-3 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 transition-all"
                  style={{ '--tw-ring-color': primary } as React.CSSProperties}
                />
              )}
            </div>
          ))}
          <button
            type="submit"
            className="w-full py-3.5 rounded-xl font-semibold text-white text-lg transition-all hover:opacity-90"
            style={{ backgroundColor: primary }}
          >
            {p.buttonText || 'Enviar'}
          </button>
        </form>
      </div>
    </section>
  );
}

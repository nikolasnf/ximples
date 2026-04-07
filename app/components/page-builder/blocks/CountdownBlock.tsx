'use client';

import { useState, useEffect } from 'react';
import type { CountdownProps } from '@/types/page';

interface Props {
  props: CountdownProps;
  theme?: { primaryColor?: string };
}

function getTimeLeft(targetDate: string) {
  const diff = Math.max(0, new Date(targetDate).getTime() - Date.now());
  return {
    days: Math.floor(diff / 86400000),
    hours: Math.floor((diff % 86400000) / 3600000),
    mins: Math.floor((diff % 3600000) / 60000),
    secs: Math.floor((diff % 60000) / 1000),
  };
}

export default function CountdownBlock({ props: p, theme }: Props) {
  const primary = theme?.primaryColor || '#183A6B';
  const [time, setTime] = useState({ days: 0, hours: 0, mins: 0, secs: 0 });

  useEffect(() => {
    if (!p.targetDate) return;
    setTime(getTimeLeft(p.targetDate));
    const interval = setInterval(() => setTime(getTimeLeft(p.targetDate!)), 1000);
    return () => clearInterval(interval);
  }, [p.targetDate]);

  const units = [
    { value: time.days, label: 'Dias' },
    { value: time.hours, label: 'Horas' },
    { value: time.mins, label: 'Min' },
    { value: time.secs, label: 'Seg' },
  ];

  return (
    <section
      className="py-20 px-6 text-white text-center"
      style={{ background: `linear-gradient(135deg, ${primary}, ${primary}cc)` }}
    >
      <div className="max-w-3xl mx-auto">
        {p.title && <h2 className="text-3xl font-bold mb-3">{p.title}</h2>}
        {p.subtitle && <p className="text-lg opacity-90 mb-10">{p.subtitle}</p>}
        <div className="flex gap-4 justify-center flex-wrap">
          {units.map((u, i) => (
            <div key={i} className="bg-white/15 rounded-xl py-5 px-6 min-w-[80px]">
              <span className="block text-3xl font-bold">{String(u.value).padStart(2, '0')}</span>
              <span className="text-xs uppercase tracking-wider opacity-80">{u.label}</span>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

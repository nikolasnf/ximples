'use client';

import type { FeaturesProps } from '@/types/page';
import { Zap, Shield, TrendingUp, Star, Heart, Target, Check, Clock, Users, Globe } from 'lucide-react';

const iconMap: Record<string, React.ComponentType<{ className?: string }>> = {
  zap: Zap,
  shield: Shield,
  'trending-up': TrendingUp,
  star: Star,
  heart: Heart,
  target: Target,
  check: Check,
  clock: Clock,
  users: Users,
  globe: Globe,
};

interface Props {
  props: FeaturesProps;
  theme?: { primaryColor?: string };
}

export default function FeaturesBlock({ props: p, theme }: Props) {
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
          {p.items?.map((item, i) => {
            const IconComponent = iconMap[item.icon || 'star'] || Star;
            return (
              <div
                key={i}
                className="text-center p-8 rounded-2xl bg-white hover:shadow-xl transition-all hover:-translate-y-1"
              >
                <div
                  className="w-14 h-14 rounded-xl flex items-center justify-center mx-auto mb-5"
                  style={{ backgroundColor: `${primary}10`, color: primary }}
                >
                  <IconComponent className="w-7 h-7" />
                </div>
                <h3 className="text-lg font-semibold text-gray-900 mb-3">{item.title}</h3>
                <p className="text-gray-500 text-sm leading-relaxed">{item.description}</p>
              </div>
            );
          })}
        </div>
      </div>
    </section>
  );
}

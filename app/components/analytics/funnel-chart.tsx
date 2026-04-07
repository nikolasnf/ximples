import type { FunnelStep } from '@/services/analytics.service';

interface FunnelChartProps {
  steps: FunnelStep[];
}

/**
 * Minimal horizontal bar funnel with conversion% per step.
 * Pure CSS / Tailwind — no chart library dependency.
 */
export function FunnelChart({ steps }: FunnelChartProps) {
  const first = steps[0]?.value ?? 0;
  const max = Math.max(...steps.map((s) => s.value), 1);

  return (
    <div className="space-y-3">
      {steps.map((step, idx) => {
        const widthPct = Math.max((step.value / max) * 100, 2);
        const conversionFromFirst = first > 0 ? Math.round((step.value / first) * 100) : 0;

        return (
          <div key={step.label}>
            <div className="flex items-center justify-between text-sm mb-1">
              <span className="font-medium">{step.label}</span>
              <span className="text-muted-foreground">
                {step.value.toLocaleString('pt-BR')}
                {idx > 0 && <> · {conversionFromFirst}%</>}
              </span>
            </div>
            <div className="h-8 bg-muted rounded-md overflow-hidden">
              <div
                className="h-full bg-primary transition-all duration-500 flex items-center justify-end pr-3 text-xs text-primary-foreground font-medium"
                style={{ width: `${widthPct}%` }}
              >
                {widthPct > 15 && step.value > 0 ? step.value.toLocaleString('pt-BR') : ''}
              </div>
            </div>
          </div>
        );
      })}
    </div>
  );
}

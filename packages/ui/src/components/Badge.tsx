import type { ReactNode } from 'react';

type Tone = 'neutral' | 'primary' | 'success' | 'warning' | 'danger' | 'info';

export function Badge({ children, tone = 'neutral' }: { children: ReactNode; tone?: Tone }) {
  return <span className={`cui-badge cui-badge--${tone}`}>{children}</span>;
}

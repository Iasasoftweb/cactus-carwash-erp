import type { SelectHTMLAttributes } from 'react';

type Props = SelectHTMLAttributes<HTMLSelectElement> & { label?: string };

export function Select({ label, children, ...props }: Props) {
  return (
    <label className="cui-field">
      {label ? <span>{label}</span> : null}
      <select className="cui-select" {...props}>{children}</select>
    </label>
  );
}

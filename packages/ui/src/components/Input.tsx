import type { InputHTMLAttributes } from 'react';

type Props = InputHTMLAttributes<HTMLInputElement> & { label?: string };

export function Input({ label, ...props }: Props) {
  return (
    <label className="cui-field">
      {label ? <span>{label}</span> : null}
      <input className="cui-input" {...props} />
    </label>
  );
}

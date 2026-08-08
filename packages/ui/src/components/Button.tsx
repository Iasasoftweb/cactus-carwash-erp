import type { ButtonHTMLAttributes, ReactNode } from 'react';

type Variant = 'primary' | 'secondary' | 'success' | 'warning' | 'danger' | 'ghost';

type Props = ButtonHTMLAttributes<HTMLButtonElement> & {
  variant?: Variant;
  icon?: ReactNode;
};

export function Button({ variant = 'primary', icon, className = '', children, ...props }: Props) {
  return (
    <button className={`cui-button cui-button--${variant} ${className}`.trim()} {...props}>
      {icon ? <span className="cui-button__icon">{icon}</span> : null}
      <span>{children}</span>
    </button>
  );
}

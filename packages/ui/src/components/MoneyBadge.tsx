export function MoneyBadge({ amount, currency = 'RD$' }: { amount: number; currency?: string }) {
  return <span className="cui-money-badge">{currency} {amount.toFixed(2)}</span>;
}

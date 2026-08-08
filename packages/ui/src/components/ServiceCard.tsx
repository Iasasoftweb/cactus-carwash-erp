import { Check, Droplets, Wrench } from 'lucide-react';
import { Badge } from './Badge';
import { MoneyBadge } from './MoneyBadge';

type Props = {
  name: string;
  category: string;
  vehicleType: string;
  price: number;
  selected?: boolean;
  onClick?: () => void;
};

export function ServiceCard({
  name,
  category,
  vehicleType,
  price,
  selected = false,
  onClick
}: Props) {
  const Icon = category.toLowerCase().includes('lavado') ? Droplets : Wrench;

  return (
    <button
      type="button"
      className={selected ? 'cui-service-card cui-service-card--selected' : 'cui-service-card'}
      onClick={onClick}
    >
      <div className="cui-service-card__media">
        <div className="cui-service-card__icon">
          <Icon size={38} strokeWidth={1.8} />
        </div>
        <MoneyBadge amount={price} />
        {selected ? (
          <span className="cui-service-card__check" aria-label="Seleccionado">
            <Check size={16} />
          </span>
        ) : null}
      </div>
      <div className="cui-service-card__body">
        <strong>{name}</strong>
        <div className="cui-service-card__meta">
          <Badge tone="primary">{vehicleType}</Badge>
          <Badge>{category}</Badge>
        </div>
      </div>
    </button>
  );
}

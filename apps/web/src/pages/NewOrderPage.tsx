import {
  Bike,
  Bus,
  Car,
  CircleUserRound,
  Minus,
  Plus,
  Truck,
  Users,
  Warehouse,
} from 'lucide-react';
import { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { ServiceCard } from '@cactus/ui';
import {
  api,
  CatalogService,
  CreatedOrder,
  Employee,
  VehicleType,
} from '../lib/api';

type OrderLine = CatalogService & {
  employeeId: string;
  employeeName: string;
  quantity: number;
  unavailable?: boolean;
};

const vehicleIconMap: Record<string, typeof Car> = {
  CAR: Car,
  JEEP: Car,
  PICKUP: Truck,
  BUS: Bus,
  MINIBUS: Bus,
  MOTORCYCLE: Bike,
};


export function NewOrderPage() {
  const navigate = useNavigate();
  const [vehicleTypes, setVehicleTypes] = useState<VehicleType[]>([]);
  const [services, setServices] = useState<CatalogService[]>([]);
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [vehicleTypeId, setVehicleTypeId] = useState('');
  const [selectedEmployeeId, setSelectedEmployeeId] = useState('');
  const [query, setQuery] = useState('');
  const [category, setCategory] = useState<'Todos' | 'Lavado' | 'Taller'>('Todos');
  const [order, setOrder] = useState<OrderLine[]>([]);
  const [customerAlias, setCustomerAlias] = useState('');
  const [vehicleDescription, setVehicleDescription] = useState('');
  const [plate, setPlate] = useState('');
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [createdOrder, setCreatedOrder] = useState<CreatedOrder | null>(null);

  useEffect(() => {
    Promise.all([api.vehicleTypes(), api.employees()])
      .then(([types, people]) => {
        setVehicleTypes(types);
        setEmployees(people);
        setVehicleTypeId(types[0]?.id ?? '');
        setSelectedEmployeeId(people[0]?.id ?? '');
      })
      .catch((reason: Error) => setError(reason.message))
      .finally(() => setLoading(false));
  }, []);

  useEffect(() => {
    if (!vehicleTypeId) return;

    setLoading(true);
    setError('');

    api.services(vehicleTypeId)
      .then((rows) => {
        setServices(rows);
        setOrder((current) =>
          current.map((item) => {
            const replacement = rows.find((service) => service.id === item.id);

            if (!replacement) {
              return { ...item, unavailable: true };
            }

            return {
              ...item,
              ...replacement,
              quantity: item.quantity,
              employeeId: item.employeeId,
              employeeName: item.employeeName,
              unavailable: false,
            };
          }),
        );
      })
      .catch((reason: Error) => setError(reason.message))
      .finally(() => setLoading(false));
  }, [vehicleTypeId]);

  const filtered = useMemo(() => {
    const normalized = query.trim().toLowerCase();

    return services.filter((service) => {
      const matchesCategory = category === 'Todos' || service.category === category;
      const matchesQuery =
        !normalized ||
        service.name.toLowerCase().includes(normalized) ||
        service.vehicleType.toLowerCase().includes(normalized);

      return matchesCategory && matchesQuery;
    });
  }, [services, query, category]);

  const total = order.reduce(
    (sum, item) => sum + (item.unavailable ? 0 : item.price * item.quantity),
    0,
  );

  const hasUnavailable = order.some((item) => item.unavailable);

  function addService(service: CatalogService) {
    const employee = employees.find((row) => row.id === selectedEmployeeId);
    if (!employee) return;

    setCreatedOrder(null);

    setOrder((current) => {
      const index = current.findIndex(
        (item) => item.id === service.id && item.employeeId === employee.id,
      );

      if (index >= 0) {
        return current.map((item, currentIndex) =>
          currentIndex === index
            ? { ...item, quantity: item.quantity + 1, unavailable: false }
            : item,
        );
      }

      return [
        ...current,
        {
          ...service,
          employeeId: employee.id,
          employeeName: employee.fullName,
          quantity: 1,
          unavailable: false,
        },
      ];
    });
  }

  function changeLineEmployee(index: number, employeeId: string) {
    const employee = employees.find((item) => item.id === employeeId);
    if (!employee) return;

    setOrder((current) =>
      current.map((item, currentIndex) =>
        currentIndex === index
          ? {
              ...item,
              employeeId: employee.id,
              employeeName: employee.fullName,
            }
          : item,
      ),
    );
    setCreatedOrder(null);
  }

  function increaseQuantity(index: number) {
    setOrder((current) =>
      current.map((item, currentIndex) =>
        currentIndex === index ? { ...item, quantity: item.quantity + 1 } : item,
      ),
    );
    setCreatedOrder(null);
  }

  function decreaseQuantity(index: number) {
    setOrder((current) =>
      current.flatMap((item, currentIndex) => {
        if (currentIndex !== index) return [item];
        if (item.quantity <= 1) return [];
        return [{ ...item, quantity: item.quantity - 1 }];
      }),
    );
    setCreatedOrder(null);
  }

  function removeLine(index: number) {
    setOrder((current) => current.filter((_, currentIndex) => currentIndex !== index));
    setCreatedOrder(null);
  }

  function resetOrder() {
    setCustomerAlias('');
    setVehicleDescription('');
    setPlate('');
    setOrder([]);
    setCreatedOrder(null);
    setError('');
  }

  async function holdOrder() {
    setError('');
    setCreatedOrder(null);

    if (!customerAlias.trim() || !vehicleDescription.trim() || !vehicleTypeId || order.length === 0) {
      setError('Completa cliente, vehículo y agrega al menos un servicio.');
      return;
    }

    if (hasUnavailable) {
      setError('Existen servicios sin tarifa para el tipo de vehículo seleccionado.');
      return;
    }

    setSaving(true);

    try {
      const result = await api.createOrder({
        customerAlias: customerAlias.trim(),
        vehicleTypeId,
        vehicleDescription: vehicleDescription.trim(),
        plate: plate.trim() || undefined,
        items: order.map((item) => ({
          serviceId: item.id,
          employeeId: item.employeeId,
          quantity: item.quantity,
        })),
      });

      setCreatedOrder(result);
      window.open(`/orders/${result.id}/tickets?autoprint=1`, '_blank', 'noopener,noreferrer');
      setCustomerAlias('');
      setVehicleDescription('');
      setPlate('');
      setOrder([]);
      setQuery('');
      setCategory('Todos');
      setVehicleTypeId(vehicleTypes[0]?.id ?? '');
      setTimeout(() => setCreatedOrder(null), 6000);
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : 'No se pudo guardar la orden.');
    } finally {
      setSaving(false);
    }
  }

  return (
    <main className="pos-shell">
      <header className="pos-topbar">
        <div className="brand-area">
          <div className="pos-brand-block">
            <span className="brand">CACTUS</span>
            <span>Recepción y facturación</span>
          </div>
        </div>

        <nav className="pos-nav" aria-label="Acciones principales">
          <button type="button" className="nav-chip active-chip" onClick={resetOrder}>
            Nueva orden
          </button>
          <button type="button" className="nav-chip" onClick={() => navigate('/customers')}>
            <Users size={16} />
            Clientes
          </button>
          <button type="button" className="nav-chip" onClick={() => navigate('/orders/hold')}>
            <Warehouse size={16} />
            Órdenes en HOLD
          </button>
          <button type="button" className="nav-chip" onClick={() => navigate('/staff/assignment')}>
            <CircleUserRound size={16} />
            Asignar personal
          </button>
          <button type="button" className="nav-chip" onClick={() => navigate('/coffee-bar')}>
            Coffee Bar
          </button>
          <button type="button" className="nav-chip" onClick={() => navigate('/cash')}>
            Caja
          </button>

          <button
            type="button"
            className="secondary-button"
            onClick={() => navigate('/expenses')}
          >
            Gastos
          </button>
          <button
            type="button"
            className="secondary-button"
            onClick={() => navigate('/admin/employees')}
          >
            Empleados
          </button>
        </nav>

        <div className="cashier-box">
          <span>Cajero</span>
          <strong>{sessionStorage.getItem('cactus.user') ?? 'admin'}</strong>

        </div>
      </header>

      <section className="pos-content">
        <aside className="order-sidebar">
          <div className="order-sidebar-header">
            <div>
              <p className="eyebrow">Orden actual</p>
              <h1>Nueva orden</h1>
            </div>
            <button type="button" className="icon-button" onClick={() => navigate('/dashboard')}>
              ×
            </button>
          </div>

          <div className="compact-grid">
            <label>
              Cliente / alias
              <input
                value={customerAlias}
                onChange={(event) => setCustomerAlias(event.target.value)}
                placeholder="Ej. Carlos"
              />
            </label>

            <label>
              Placa
              <input
                value={plate}
                onChange={(event) => setPlate(event.target.value)}
                placeholder="Opcional"
              />
            </label>
          </div>

          <label>
            Descripción del vehículo
            <input
              value={vehicleDescription}
              onChange={(event) => setVehicleDescription(event.target.value)}
              placeholder="Ej. Toyota Corolla blanco"
            />
          </label>

          <label>
            Empleado para el próximo servicio
            <select
              value={selectedEmployeeId}
              onChange={(event) => setSelectedEmployeeId(event.target.value)}
            >
              {employees.map((employee) => (
                <option key={employee.id} value={employee.id}>
                  {employee.fullName}
                </option>
              ))}
            </select>
          </label>

          <div className="order-lines">
            {order.length === 0 ? (
              <div className="empty-order">
                <span>🧾</span>
                <p>Aún no hay servicios agregados.</p>
              </div>
            ) : (
              order.map((item, index) => (
                <article
                  className={item.unavailable ? 'order-line order-line--invalid' : 'order-line'}
                  key={`${item.id}-${item.employeeId}-${index}`}
                >
                  <div className="order-line-main">
                    <strong>{item.name}</strong>
                    <div className="employee-highlight">
                      <CircleUserRound size={17} />
                      <select
                        value={item.employeeId}
                        onChange={(event) => changeLineEmployee(index, event.target.value)}
                      >
                        {employees.map((employee) => (
                          <option key={employee.id} value={employee.id}>
                            {employee.fullName}
                          </option>
                        ))}
                      </select>
                    </div>
                    <span>{item.vehicleType}</span>
                    {item.unavailable ? <em>Tarifa no disponible</em> : null}
                  </div>

                  <div className="order-line-side">
                    <div className="quantity-control">
                      <button type="button" onClick={() => decreaseQuantity(index)}>
                        <Minus size={15} />
                      </button>
                      <strong>{item.quantity}</strong>
                      <button type="button" onClick={() => increaseQuantity(index)}>
                        <Plus size={15} />
                      </button>
                    </div>

                    <span>
                      {item.quantity} × RD$ {item.price.toFixed(2)}
                    </span>
                    <strong>
                      RD$ {(item.unavailable ? 0 : item.price * item.quantity).toFixed(2)}
                    </strong>
                  </div>

                  <button
                    type="button"
                    className="remove-line"
                    onClick={() => removeLine(index)}
                    aria-label={`Eliminar ${item.name}`}
                  >
                    ×
                  </button>
                </article>
              ))
            )}
          </div>

          <div className="totals-box">
            <div><span>Subtotal</span><strong>RD$ {total.toFixed(2)}</strong></div>
            <div><span>Impuesto</span><strong>RD$ 0.00</strong></div>
            <div className="grand-total"><span>Total</span><strong>RD$ {total.toFixed(2)}</strong></div>
          </div>

          {error ? <div className="error-box">{error}</div> : null}

          {createdOrder ? (
            <div className="success-box">
              <strong>{createdOrder.orderNumber}</strong>
              <span>Orden guardada en HOLD por RD$ {createdOrder.total.toFixed(2)}.</span>
            </div>
          ) : null}

          <div className="order-actions">
            <button type="button" className="secondary-button" onClick={resetOrder}>
              Cancelar
            </button>
            <button
              type="button"
              className="hold-button"
              onClick={holdOrder}
              disabled={saving || hasUnavailable}
            >
              {saving ? 'Guardando...' : 'Enviar a HOLD'}
            </button>
            <button type="button" className="pay-button">
              Pagos
            </button>
          </div>
        </aside>

        <section className="catalog-panel">
          <div className="vehicle-panel">
            <div className="vehicle-panel-title">
              <div>
                <p className="eyebrow">Tipo de vehículo</p>
                <h2>Selecciona una categoría</h2>
              </div>
            </div>

            <div className="vehicle-card-grid">
              {vehicleTypes.map((vehicle) => {
                const Icon = vehicleIconMap[vehicle.code] ?? Car;
                const selected = vehicle.id === vehicleTypeId;

                return (
                  <button
                    type="button"
                    key={vehicle.id}
                    className={selected ? 'vehicle-card vehicle-card--selected' : 'vehicle-card'}
                    onClick={() => setVehicleTypeId(vehicle.id)}
                  >
                    <Icon size={30} strokeWidth={1.8} />
                    <span>{vehicle.name}</span>
                  </button>
                );
              })}
            </div>
          </div>

          <div className="catalog-toolbar">
            <div className="search-box">
              <span>⌕</span>
              <input
                value={query}
                onChange={(event) => setQuery(event.target.value)}
                placeholder="Buscar servicios"
              />
            </div>

            <div className="category-tabs">
              {(['Todos', 'Lavado', 'Taller'] as const).map((item) => (
                <button
                  type="button"
                  key={item}
                  className={category === item ? 'category-tab selected-tab' : 'category-tab'}
                  onClick={() => setCategory(item)}
                >
                  {item}
                </button>
              ))}
            </div>
          </div>

          {loading ? <div className="catalog-message">Cargando catálogo...</div> : null}

          {!loading && filtered.length === 0 ? (
            <div className="catalog-message">No hay servicios para este tipo de vehículo.</div>
          ) : null}

          <div className="service-grid">
            {filtered.map((service) => (
              <ServiceCard
                key={`${service.id}-${service.priceId}`}
                name={service.name}
                category={service.category}
                vehicleType={service.vehicleType}
                price={service.price}
                selected={order.some((item) => item.id === service.id && !item.unavailable)}
                onClick={() => addService(service)}
              />
            ))}
          </div>
        </section>
      </section>
    </main>
  );
}

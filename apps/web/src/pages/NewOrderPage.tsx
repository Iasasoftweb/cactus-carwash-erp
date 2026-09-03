import {
  Bike,
  Bus,
  Car,
  CircleUserRound,
  Droplets,
  Minus,
  Plus,
  Search,
  Store,
  Trash2,
  Truck,
  Users,
  Warehouse,
  Wrench,
  X,
} from 'lucide-react';
import { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';

import './styles/NewOrderPage.dashboard.css';

import type {
  PointOfSaleResponse,
} from '@cactus/shared';

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

function getServiceIcon(
  category: string,
) {
  return category === 'Lavado'
    ? Droplets
    : Wrench;
}

export function NewOrderPage() {
  const navigate = useNavigate();

  const [vehicleTypes, setVehicleTypes] =
    useState<VehicleType[]>([]);
  const [services, setServices] =
    useState<CatalogService[]>([]);
  const [employees, setEmployees] =
    useState<Employee[]>([]);
  const [points, setPoints] =
    useState<PointOfSaleResponse[]>([]);
  const [pointOfSaleId, setPointOfSaleId] =
    useState('');
  const [vehicleTypeId, setVehicleTypeId] =
    useState('');
  const [
    selectedEmployeeId,
    setSelectedEmployeeId,
  ] = useState('');
  const [query, setQuery] = useState('');
  const [category, setCategory] =
    useState<
      'Todos' | 'Lavado' | 'Taller'
    >('Todos');
  const [order, setOrder] =
    useState<OrderLine[]>([]);
  const [
    customerAlias,
    setCustomerAlias,
  ] = useState('');
  const [
    vehicleDescription,
    setVehicleDescription,
  ] = useState('');
  const [plate, setPlate] = useState('');
  const [loading, setLoading] =
    useState(true);
  const [saving, setSaving] =
    useState(false);
  const [error, setError] =
    useState('');
  const [
    createdOrder,
    setCreatedOrder,
  ] =
    useState<CreatedOrder | null>(
      null,
    );

  useEffect(() => {
    let cancelled = false;

    async function loadInitialContext():
      Promise<void> {
      setLoading(true);
      setError('');

      try {
        const [
          types,
          people,
          pointRows,
        ] = await Promise.all([
          api.vehicleTypes(),
          api.employees(),
          api.posPoints(),
        ]);

        if (cancelled) return;

        setVehicleTypes(types);
        setEmployees(people);
        setVehicleTypeId(
          types[0]?.id ?? '',
        );
        setSelectedEmployeeId(
          people[0]?.id ?? '',
        );

        if (
          pointRows.length === 0
        ) {
          setPoints([]);
          setPointOfSaleId('');
          setError(
            'No hay un punto operativo disponible para CarWash.',
          );
          return;
        }

        const companyId =
          pointRows[0].companyId;

        const companyModules =
          await api.companyModules(
            companyId,
          );

        if (cancelled) return;

        const
          companyCarWashEnabled =
            companyModules.some(
              (row) =>
                row.module ===
                  'CAR_WASH' &&
                row.enabled,
            );

        if (
          !companyCarWashEnabled
        ) {
          setPoints([]);
          setPointOfSaleId('');
          setError(
            'CarWash no está habilitado para esta empresa.',
          );
          return;
        }

        const branchIds = [
          ...new Set(
            pointRows.map(
              (point) =>
                point.branchId,
            ),
          ),
        ];

        const branchStates =
          await Promise.all(
            branchIds.map(
              async (branchId) => ({
                branchId,
                modules:
                  await api.branchModules(
                    companyId,
                    branchId,
                  ),
              }),
            ),
          );

        if (cancelled) return;

        const enabledBranchIds =
          new Set(
            branchStates
              .filter(
                ({
                  modules,
                }) =>
                  modules.some(
                    (row) =>
                      row.module ===
                        'CAR_WASH' &&
                      row.enabled,
                  ),
              )
              .map(
                ({
                  branchId,
                }) =>
                  branchId,
              ),
          );

        const operationalPoints =
          pointRows.filter(
            (point) =>
              point.companyId ===
                companyId &&
              enabledBranchIds.has(
                point.branchId,
              ),
          );

        setPoints(
          operationalPoints,
        );

        setPointOfSaleId(
          operationalPoints[0]
            ?.id ?? '',
        );

        if (
          operationalPoints.length ===
          0
        ) {
          setError(
            'No hay un punto operativo disponible para CarWash.',
          );
        }
      } catch (reason) {
        if (!cancelled) {
          setError(
            reason instanceof Error
              ? reason.message
              : 'No fue posible cargar el contexto operativo de CarWash.',
          );
        }
      } finally {
        if (!cancelled) {
          setLoading(false);
        }
      }
    }

    void loadInitialContext();

    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    if (!vehicleTypeId) return;

    setLoading(true);
    setError('');

    api.services(
      vehicleTypeId,
    )
      .then((rows) => {
        setServices(rows);

        setOrder(
          (current) =>
            current.map(
              (item) => {
                const
                  replacement =
                    rows.find(
                      (
                        service,
                      ) =>
                        service.id ===
                        item.id,
                    );

                if (
                  !replacement
                ) {
                  return {
                    ...item,
                    unavailable:
                      true,
                  };
                }

                return {
                  ...item,
                  ...replacement,
                  quantity:
                    item.quantity,
                  employeeId:
                    item.employeeId,
                  employeeName:
                    item.employeeName,
                  unavailable:
                    false,
                };
              },
            ),
        );
      })
      .catch(
        (
          reason: Error,
        ) =>
          setError(
            reason.message,
          ),
      )
      .finally(() =>
        setLoading(false),
      );
  }, [vehicleTypeId]);

  const filtered =
    useMemo(() => {
      const normalized =
        query
          .trim()
          .toLowerCase();

      return services.filter(
        (service) => {
          const
            matchesCategory =
              category ===
                'Todos' ||
              service.category ===
                category;

          const matchesQuery =
            !normalized ||
            service.name
              .toLowerCase()
              .includes(
                normalized,
              ) ||
            service.vehicleType
              .toLowerCase()
              .includes(
                normalized,
              );

          return (
            matchesCategory &&
            matchesQuery
          );
        },
      );
    }, [
      services,
      query,
      category,
    ]);

  const selectedPoint =
    useMemo(
      () =>
        points.find(
          (point) =>
            point.id ===
            pointOfSaleId,
        ) ?? null,
      [
        points,
        pointOfSaleId,
      ],
    );

  const selectedVehicle =
    useMemo(
      () =>
        vehicleTypes.find(
          (vehicle) =>
            vehicle.id ===
            vehicleTypeId,
        ) ?? null,
      [
        vehicleTypes,
        vehicleTypeId,
      ],
    );

  const total =
    order.reduce(
      (sum, item) =>
        sum +
        (item.unavailable
          ? 0
          : item.price *
            item.quantity),
      0,
    );

  const servicesCount =
    order.reduce(
      (sum, item) =>
        sum +
        item.quantity,
      0,
    );

  const hasUnavailable =
    order.some(
      (item) =>
        item.unavailable,
    );

  function addService(
    service: CatalogService,
  ) {
    const employee =
      employees.find(
        (row) =>
          row.id ===
          selectedEmployeeId,
      );

    if (!employee) return;

    setCreatedOrder(null);

    setOrder((current) => {
      const index =
        current.findIndex(
          (item) =>
            item.id ===
              service.id &&
            item.employeeId ===
              employee.id,
        );

      if (index >= 0) {
        return current.map(
          (
            item,
            currentIndex,
          ) =>
            currentIndex ===
            index
              ? {
                  ...item,
                  quantity:
                    item.quantity +
                    1,
                  unavailable:
                    false,
                }
              : item,
        );
      }

      return [
        ...current,
        {
          ...service,
          employeeId:
            employee.id,
          employeeName:
            employee.fullName,
          quantity: 1,
          unavailable: false,
        },
      ];
    });
  }

  function
    changeLineEmployee(
      index: number,
      employeeId: string,
    ) {
    const employee =
      employees.find(
        (item) =>
          item.id ===
          employeeId,
      );

    if (!employee) return;

    setOrder((current) =>
      current.map(
        (
          item,
          currentIndex,
        ) =>
          currentIndex ===
          index
            ? {
                ...item,
                employeeId:
                  employee.id,
                employeeName:
                  employee.fullName,
              }
            : item,
      ),
    );

    setCreatedOrder(null);
  }

  function
    increaseQuantity(
      index: number,
    ) {
    setOrder((current) =>
      current.map(
        (
          item,
          currentIndex,
        ) =>
          currentIndex ===
          index
            ? {
                ...item,
                quantity:
                  item.quantity +
                  1,
              }
            : item,
      ),
    );

    setCreatedOrder(null);
  }

  function
    decreaseQuantity(
      index: number,
    ) {
    setOrder((current) =>
      current.flatMap(
        (
          item,
          currentIndex,
        ) => {
          if (
            currentIndex !==
            index
          ) {
            return [item];
          }

          if (
            item.quantity <=
            1
          ) {
            return [];
          }

          return [
            {
              ...item,
              quantity:
                item.quantity -
                1,
            },
          ];
        },
      ),
    );

    setCreatedOrder(null);
  }

  function removeLine(
    index: number,
  ) {
    setOrder((current) =>
      current.filter(
        (
          _,
          currentIndex,
        ) =>
          currentIndex !==
          index,
      ),
    );

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

    if (!pointOfSaleId) {
      setError(
        'Selecciona un punto operativo de CarWash.',
      );
      return;
    }

    if (
      !customerAlias.trim() ||
      !vehicleDescription.trim() ||
      !vehicleTypeId ||
      order.length === 0
    ) {
      setError(
        'Completa cliente, vehículo y agrega al menos un servicio.',
      );
      return;
    }

    if (hasUnavailable) {
      setError(
        'Existen servicios sin tarifa para el tipo de vehículo seleccionado.',
      );
      return;
    }

    setSaving(true);

    try {
      const result =
        await api.createOrder({
          pointOfSaleId,
          customerAlias:
            customerAlias.trim(),
          vehicleTypeId,
          vehicleDescription:
            vehicleDescription.trim(),
          plate:
            plate.trim() ||
            undefined,
          items:
            order.map(
              (item) => ({
                serviceId:
                  item.id,
                employeeId:
                  item.employeeId,
                quantity:
                  item.quantity,
              }),
            ),
        });

      setCreatedOrder(
        result,
      );

      window.open(
        `/orders/${result.id}/tickets?autoprint=1`,
        '_blank',
        'noopener,noreferrer',
      );

      setCustomerAlias('');
      setVehicleDescription('');
      setPlate('');
      setOrder([]);
      setQuery('');
      setCategory('Todos');
      setVehicleTypeId(
        vehicleTypes[0]?.id ??
          '',
      );

      setTimeout(
        () =>
          setCreatedOrder(
            null,
          ),
        6000,
      );
    } catch (reason) {
      setError(
        reason instanceof Error
          ? reason.message
          : 'No se pudo guardar la orden.',
      );
    } finally {
      setSaving(false);
    }
  }

  return (
    <main className="carwash-dashboard-ui">
      <header className="carwash-dashboard-ui__topbar">
        <div className="carwash-dashboard-ui__brand">
          <strong className="carwash-dashboard-ui__logo">
            CACTUS
          </strong>

          <div>
            <strong>
              CarWash
            </strong>
            <span>
              Recepción y operación
            </span>
          </div>
        </div>

        <nav
          className="carwash-dashboard-ui__nav"
          aria-label="Acciones principales"
        >
          <button
            type="button"
            className="carwash-dashboard-ui__nav-item carwash-dashboard-ui__nav-item--primary"
            onClick={
              resetOrder
            }
          >
            Nueva orden
          </button>

          <button
            type="button"
            className="carwash-dashboard-ui__nav-item"
            onClick={() =>
              navigate(
                '/customers',
              )
            }
          >
            <Users size={16} />
            Clientes
          </button>

          <button
            type="button"
            className="carwash-dashboard-ui__nav-item"
            onClick={() =>
              navigate(
                '/orders/hold',
              )
            }
          >
            <Warehouse
              size={16}
            />
            Órdenes en HOLD
          </button>

          <button
            type="button"
            className="carwash-dashboard-ui__nav-item"
            onClick={() =>
              navigate(
                '/staff/assignment',
              )
            }
          >
            <CircleUserRound
              size={16}
            />
            Asignar personal
          </button>

          <button
            type="button"
            className="carwash-dashboard-ui__nav-item"
            onClick={() =>
              navigate(
                '/sales-pos',
              )
            }
          >
            Punto de Venta
          </button>

          <button
            type="button"
            className="carwash-dashboard-ui__nav-item"
            onClick={() =>
              navigate(
                '/cash',
              )
            }
          >
            Caja
          </button>

          <button
            type="button"
            className="carwash-dashboard-ui__nav-item"
            onClick={() =>
              navigate(
                '/expenses',
              )
            }
          >
            Gastos
          </button>

          <button
            type="button"
            className="carwash-dashboard-ui__nav-item"
            onClick={() =>
              navigate(
                '/admin/employees',
              )
            }
          >
            Empleados
          </button>
        </nav>

        <div className="carwash-dashboard-ui__user">
          <span>Cajero</span>
          <strong>
            {sessionStorage.getItem(
              'cactus.user',
            ) ?? 'admin'}
          </strong>
        </div>
      </header>

      <section className="carwash-dashboard-ui__workspace">
        <aside className="carwash-dashboard-ui__order">
          <div className="carwash-dashboard-ui__heading">
            <div>
              <span className="carwash-dashboard-ui__eyebrow">
                Orden actual
              </span>
              <h1>
                Nueva orden
              </h1>
              <p>
                Registra el vehículo
                y agrega los
                servicios requeridos.
              </p>
            </div>

            <button
              type="button"
              className="carwash-dashboard-ui__icon-button"
              onClick={() =>
                navigate(
                  '/dashboard',
                )
              }
              aria-label="Cerrar"
            >
              <X size={18} />
            </button>
          </div>

          <div className="carwash-dashboard-ui__context">
            <Store size={20} />

            <div>
              <span>
                Punto operativo
              </span>
              <strong>
                {selectedPoint
                  ?.name ??
                  'No disponible'}
              </strong>
            </div>

            {points.length >
            1 ? (
              <select
                value={
                  pointOfSaleId
                }
                onChange={(
                  event,
                ) => {
                  setPointOfSaleId(
                    event.target
                      .value,
                  );
                  setCreatedOrder(
                    null,
                  );
                }}
                disabled={
                  loading ||
                  saving
                }
              >
                {points.map(
                  (point) => (
                    <option
                      key={
                        point.id
                      }
                      value={
                        point.id
                      }
                    >
                      {point.name} ·{' '}
                      {point.code}
                    </option>
                  ),
                )}
              </select>
            ) : (
              <span className="carwash-dashboard-ui__context-code">
                {selectedPoint
                  ?.code ??
                  'Sin contexto'}
              </span>
            )}
          </div>

          <div className="carwash-dashboard-ui__form-grid">
            <label>
              <span>
                Cliente / alias
              </span>
              <input
                value={
                  customerAlias
                }
                onChange={(
                  event,
                ) =>
                  setCustomerAlias(
                    event.target
                      .value,
                  )
                }
                placeholder="Ej. Carlos"
              />
            </label>

            <label>
              <span>
                Placa
              </span>
              <input
                value={
                  plate
                }
                onChange={(
                  event,
                ) =>
                  setPlate(
                    event.target
                      .value,
                  )
                }
                placeholder="Opcional"
              />
            </label>
          </div>

          <label className="carwash-dashboard-ui__field">
            <span>
              Descripción del vehículo
            </span>
            <input
              value={
                vehicleDescription
              }
              onChange={(
                event,
              ) =>
                setVehicleDescription(
                  event.target
                    .value,
                )
              }
              placeholder="Ej. Toyota Corolla blanco"
            />
          </label>

          <label className="carwash-dashboard-ui__field">
            <span>
              Empleado para el
              próximo servicio
            </span>
            <select
              value={
                selectedEmployeeId
              }
              onChange={(
                event,
              ) =>
                setSelectedEmployeeId(
                  event.target
                    .value,
                )
              }
            >
              {employees.map(
                (employee) => (
                  <option
                    key={
                      employee.id
                    }
                    value={
                      employee.id
                    }
                  >
                    {
                      employee.fullName
                    }
                  </option>
                ),
              )}
            </select>
          </label>

          <div className="carwash-dashboard-ui__list-title">
            <strong>
              Servicios agregados
            </strong>
            <span>
              {servicesCount}{' '}
              {servicesCount ===
              1
                ? 'servicio'
                : 'servicios'}
            </span>
          </div>

          <div className="carwash-dashboard-ui__order-lines">
            {order.length ===
            0 ? (
              <div className="carwash-dashboard-ui__empty">
                <strong>
                  Orden sin servicios
                </strong>
                <span>
                  Selecciona servicios
                  del catálogo.
                </span>
              </div>
            ) : (
              order.map(
                (
                  item,
                  index,
                ) => (
                  <article
                    key={`${item.id}-${item.employeeId}-${index}`}
                    className={
                      item.unavailable
                        ? 'carwash-dashboard-ui__order-line carwash-dashboard-ui__order-line--invalid'
                        : 'carwash-dashboard-ui__order-line'
                    }
                  >
                    <div className="carwash-dashboard-ui__line-main">
                      <strong>
                        {item.name}
                      </strong>

                      <div className="carwash-dashboard-ui__employee">
                        <CircleUserRound
                          size={14}
                        />
                        <select
                          value={
                            item.employeeId
                          }
                          onChange={(
                            event,
                          ) =>
                            changeLineEmployee(
                              index,
                              event
                                .target
                                .value,
                            )
                          }
                        >
                          {employees.map(
                            (
                              employee,
                            ) => (
                              <option
                                key={
                                  employee.id
                                }
                                value={
                                  employee.id
                                }
                              >
                                {
                                  employee.fullName
                                }
                              </option>
                            ),
                          )}
                        </select>
                      </div>

                      <span>
                        {
                          item.vehicleType
                        }
                      </span>

                      {item.unavailable ? (
                        <em>
                          Tarifa no
                          disponible
                        </em>
                      ) : null}
                    </div>

                    <div className="carwash-dashboard-ui__line-side">
                      <div className="carwash-dashboard-ui__quantity">
                        <button
                          type="button"
                          onClick={() =>
                            decreaseQuantity(
                              index,
                            )
                          }
                        >
                          <Minus
                            size={
                              14
                            }
                          />
                        </button>

                        <strong>
                          {
                            item.quantity
                          }
                        </strong>

                        <button
                          type="button"
                          onClick={() =>
                            increaseQuantity(
                              index,
                            )
                          }
                        >
                          <Plus
                            size={
                              14
                            }
                          />
                        </button>
                      </div>

                      <span>
                        {item.quantity} ×
                        RD${' '}
                        {item.price.toFixed(
                          2,
                        )}
                      </span>

                      <strong>
                        RD${' '}
                        {(
                          item.unavailable
                            ? 0
                            : item.price *
                              item.quantity
                        ).toFixed(
                          2,
                        )}
                      </strong>
                    </div>

                    <button
                      type="button"
                      className="carwash-dashboard-ui__remove"
                      onClick={() =>
                        removeLine(
                          index,
                        )
                      }
                      aria-label={`Eliminar ${item.name}`}
                    >
                      <Trash2
                        size={14}
                      />
                    </button>
                  </article>
                ),
              )
            )}
          </div>

          <div className="carwash-dashboard-ui__totals">
            <div>
              <span>
                Subtotal
              </span>
              <strong>
                RD${' '}
                {total.toFixed(
                  2,
                )}
              </strong>
            </div>

            <div>
              <span>
                Impuesto
              </span>
              <strong>
                RD$ 0.00
              </strong>
            </div>

            <div className="carwash-dashboard-ui__total-main">
              <span>Total</span>
              <strong>
                RD${' '}
                {total.toFixed(
                  2,
                )}
              </strong>
            </div>
          </div>

          {error ? (
            <div className="carwash-dashboard-ui__message carwash-dashboard-ui__message--error">
              {error}
            </div>
          ) : null}

          {createdOrder ? (
            <div className="carwash-dashboard-ui__message carwash-dashboard-ui__message--success">
              <strong>
                {
                  createdOrder.orderNumber
                }
              </strong>
              <span>
                Orden guardada en
                HOLD por RD${' '}
                {createdOrder.total.toFixed(
                  2,
                )}
                .
              </span>
            </div>
          ) : null}

          <div className="carwash-dashboard-ui__actions">
            <button
              type="button"
              className="carwash-dashboard-ui__action carwash-dashboard-ui__action--secondary"
              onClick={
                resetOrder
              }
            >
              <X size={15} />
              Cancelar
            </button>

            <button
              type="button"
              className="carwash-dashboard-ui__action carwash-dashboard-ui__action--outline"
              onClick={
                holdOrder
              }
              disabled={
                saving ||
                hasUnavailable ||
                !pointOfSaleId
              }
            >
              {saving
                ? 'Guardando...'
                : 'Enviar a HOLD'}
            </button>

            <button
              type="button"
              className="carwash-dashboard-ui__action carwash-dashboard-ui__action--primary"
            >
              Pagos
            </button>
          </div>
        </aside>

        <section className="carwash-dashboard-ui__catalog">
          <section className="carwash-dashboard-ui__panel">
            <div className="carwash-dashboard-ui__panel-heading">
              <div>
                <span className="carwash-dashboard-ui__eyebrow">
                  Tipo de vehículo
                </span>
                <h2>
                  Selecciona una
                  categoría
                </h2>
              </div>

              <span className="carwash-dashboard-ui__badge">
                {selectedVehicle
                  ?.name ??
                  'Sin selección'}
              </span>
            </div>

            <div className="carwash-dashboard-ui__vehicle-grid">
              {vehicleTypes.map(
                (vehicle) => {
                  const Icon =
                    vehicleIconMap[
                      vehicle.code
                    ] ?? Car;

                  const selected =
                    vehicle.id ===
                    vehicleTypeId;

                  return (
                    <button
                      type="button"
                      key={
                        vehicle.id
                      }
                      className={
                        selected
                          ? 'carwash-dashboard-ui__vehicle carwash-dashboard-ui__vehicle--selected'
                          : 'carwash-dashboard-ui__vehicle'
                      }
                      onClick={() =>
                        setVehicleTypeId(
                          vehicle.id,
                        )
                      }
                      aria-pressed={
                        selected
                      }
                    >
                      <Icon
                        size={28}
                        strokeWidth={
                          1.75
                        }
                      />
                      <span>
                        {
                          vehicle.name
                        }
                      </span>
                    </button>
                  );
                },
              )}
            </div>
          </section>

          <section className="carwash-dashboard-ui__panel">
            <div className="carwash-dashboard-ui__panel-heading">
              <div>
                <span className="carwash-dashboard-ui__eyebrow">
                  Catálogo
                </span>
                <h2>
                  Servicios disponibles
                </h2>
              </div>

              <span className="carwash-dashboard-ui__badge">
                {filtered.length}{' '}
                resultados
              </span>
            </div>

            <div className="carwash-dashboard-ui__toolbar">
              <div className="carwash-dashboard-ui__search">
                <Search
                  size={16}
                />
                <input
                  value={query}
                  onChange={(
                    event,
                  ) =>
                    setQuery(
                      event.target
                        .value,
                    )
                  }
                  placeholder="Buscar servicios"
                />
              </div>

              <div className="carwash-dashboard-ui__filters">
                {(
                  [
                    'Todos',
                    'Lavado',
                    'Taller',
                  ] as const
                ).map((item) => (
                  <button
                    type="button"
                    key={item}
                    className={
                      category ===
                      item
                        ? 'carwash-dashboard-ui__filter carwash-dashboard-ui__filter--active'
                        : 'carwash-dashboard-ui__filter'
                    }
                    onClick={() =>
                      setCategory(
                        item,
                      )
                    }
                  >
                    {item}
                  </button>
                ))}
              </div>
            </div>

            {loading ? (
              <div className="carwash-dashboard-ui__empty">
                Cargando catálogo...
              </div>
            ) : null}

            {!loading &&
            filtered.length ===
              0 ? (
              <div className="carwash-dashboard-ui__empty">
                No hay servicios para
                este tipo de vehículo.
              </div>
            ) : null}

            <div className="carwash-dashboard-ui__services-grid">
              {filtered.map(
                (service) => {
                  const Icon =
                    getServiceIcon(
                      service.category,
                    );

                  const selected =
                    order.some(
                      (item) =>
                        item.id ===
                          service.id &&
                        !item.unavailable,
                    );

                  return (
                    <button
                      type="button"
                      key={`${service.id}-${service.priceId}`}
                      className={
                        selected
                          ? 'carwash-dashboard-ui__service carwash-dashboard-ui__service--selected'
                          : 'carwash-dashboard-ui__service'
                      }
                      onClick={() =>
                        addService(
                          service,
                        )
                      }
                    >
                      <div className="carwash-dashboard-ui__service-icon">
                        <Icon
                          size={26}
                        />
                      </div>

                      <strong className="carwash-dashboard-ui__service-price">
                        RD${' '}
                        {service.price.toFixed(
                          2,
                        )}
                      </strong>

                      <strong className="carwash-dashboard-ui__service-name">
                        {
                          service.name
                        }
                      </strong>

                      <div className="carwash-dashboard-ui__service-tags">
                        <span>
                          {
                            service.vehicleType
                          }
                        </span>
                        <span>
                          {
                            service.category
                          }
                        </span>
                      </div>
                    </button>
                  );
                },
              )}
            </div>
          </section>
        </section>
      </section>
    </main>
  );
}

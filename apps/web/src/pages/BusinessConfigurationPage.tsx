import {
  Building2,
  CarFront,
  CheckCircle2,
  Percent,
  Settings2,
  Store,
} from 'lucide-react';
import { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import type {
  BranchModuleResponse,
  BusinessModuleType,
  CompanyModuleResponse,
  PointOfSaleResponse,
  PosCapabilityResponse,
  PosCapabilityType,
  PosFinancialConfigurationResponse,
} from '@cactus/shared';
import { api } from '../lib/api';

const BUSINESS_MODULES: Array<{
  value: BusinessModuleType;
  label: string;
  description: string;
}> = [
  {
    value: 'POS',
    label: 'Punto de Venta',
    description: 'Ventas retail, restaurante, peso, HOLD y otras modalidades POS.',
  },
  {
    value: 'CAR_WASH',
    label: 'CarWash',
    description: 'Operación especializada de vehículos en pantalla independiente.',
  },
];

const POS_CAPABILITIES: Array<{
  value: PosCapabilityType;
  label: string;
  description: string;
}> = [
  {
    value: 'RETAIL',
    label: 'Retail',
    description: 'Venta directa de productos por unidad.',
  },
  {
    value: 'FOOD_SERVICE',
    label: 'Restaurante / Food Service',
    description: 'Activa comportamiento orientado a alimentos y servicio.',
  },
  {
    value: 'WEIGHTED_PRODUCTS',
    label: 'Productos por peso',
    description: 'Permite vender productos con cantidades decimales por peso.',
  },
  {
    value: 'HOLD_ORDERS',
    label: 'HOLD',
    description: 'Permite guardar cuentas abiertas y cobrarlas después.',
  },
  {
    value: 'TABLES',
    label: 'Mesas / referencias',
    description: 'Permite asociar una mesa o referencia a una cuenta.',
  },
  {
    value: 'KITCHEN_TICKETS',
    label: 'Tickets de cocina',
    description: 'Reserva la capacidad para comandas e impresión de cocina.',
  },
  {
    value: 'DELIVERY',
    label: 'Delivery',
    description: 'Reserva la capacidad para pedidos de entrega.',
  },
];

function enabledModule(
  rows: Array<CompanyModuleResponse | BranchModuleResponse>,
  module: BusinessModuleType,
): boolean {
  const row = rows.find((item) => item.module === module);
  return row?.enabled ?? false;
}

function enabledCapability(
  rows: PosCapabilityResponse[],
  capability: PosCapabilityType,
): boolean {
  const row = rows.find((item) => item.capability === capability);
  return row?.enabled ?? false;
}

export function BusinessConfigurationPage() {
  const navigate = useNavigate();

  const [points, setPoints] = useState<PointOfSaleResponse[]>([]);
  const [pointId, setPointId] = useState('');
  const [companyModules, setCompanyModules] = useState<CompanyModuleResponse[]>([]);
  const [branchModules, setBranchModules] = useState<BranchModuleResponse[]>([]);
  const [capabilities, setCapabilities] = useState<PosCapabilityResponse[]>([]);
  const [financialConfiguration, setFinancialConfiguration] =
    useState<PosFinancialConfigurationResponse | null>(null);
  const [taxesEnabled, setTaxesEnabled] = useState(false);
  const [serviceChargeEnabled, setServiceChargeEnabled] = useState(false);
  const [serviceChargePercent, setServiceChargePercent] = useState('0.00');
  const [serviceChargeDineIn, setServiceChargeDineIn] = useState(true);
  const [serviceChargeTakeaway, setServiceChargeTakeaway] = useState(false);
  const [serviceChargeDirect, setServiceChargeDirect] = useState(false);
  const [loading, setLoading] = useState(true);
  const [savingKey, setSavingKey] = useState('');
  const [error, setError] = useState('');
  const [message, setMessage] = useState('');

  const selectedPoint = useMemo(
    () => points.find((point) => point.id === pointId) ?? null,
    [points, pointId],
  );

  const availableBranches = useMemo(() => {
    const seen = new Map<string, PointOfSaleResponse>();

    for (const point of points) {
      if (!seen.has(point.branchId)) {
        seen.set(point.branchId, point);
      }
    }

    return [...seen.values()];
  }, [points]);

  function applyFinancialConfiguration(
    row: PosFinancialConfigurationResponse,
  ): void {
    setFinancialConfiguration(row);
    setTaxesEnabled(row.taxesEnabled);
    setServiceChargeEnabled(row.serviceChargeEnabled);
    setServiceChargePercent(
      (row.serviceChargeRate * 100).toFixed(2),
    );
    setServiceChargeDineIn(row.serviceChargeDineIn);
    setServiceChargeTakeaway(row.serviceChargeTakeaway);
    setServiceChargeDirect(row.serviceChargeDirect);
  }

  async function loadConfiguration(
    point: PointOfSaleResponse,
  ): Promise<void> {
    const [
      companyRows,
      branchRows,
      capabilityRows,
      financialRow,
    ] = await Promise.all([
      api.companyModules(point.companyId),
      api.branchModules(point.companyId, point.branchId),
      api.posCapabilities(point.id),
      api.posFinancialConfiguration(point.id),
    ]);

    setCompanyModules(companyRows);
    setBranchModules(branchRows);
    setCapabilities(capabilityRows);
    applyFinancialConfiguration(financialRow);
  }

  useEffect(() => {
    let cancelled = false;

    async function load(): Promise<void> {
      try {
        setLoading(true);
        setError('');

        const pointRows = await api.posPoints();

        if (cancelled) return;

        setPoints(pointRows);

        const firstPoint = pointRows[0];

        if (!firstPoint) {
          throw new Error(
            'No existe un punto de venta configurado para administrar.',
          );
        }

        setPointId(firstPoint.id);
        await loadConfiguration(firstPoint);
      } catch (reason) {
        if (!cancelled) {
          setError(
            reason instanceof Error
              ? reason.message
              : 'No fue posible cargar la configuración.',
          );
        }
      } finally {
        if (!cancelled) {
          setLoading(false);
        }
      }
    }

    void load();

    return () => {
      cancelled = true;
    };
  }, []);

  async function changePoint(nextPointId: string): Promise<void> {
    const point =
      points.find((row) => row.id === nextPointId) ?? null;

    setPointId(nextPointId);
    setError('');
    setMessage('');

    if (!point) return;

    try {
      setLoading(true);
      await loadConfiguration(point);
    } catch (reason) {
      setError(
        reason instanceof Error
          ? reason.message
          : 'No fue posible cargar la configuración.',
      );
    } finally {
      setLoading(false);
    }
  }

  async function toggleCompanyModule(
    module: BusinessModuleType,
  ): Promise<void> {
    if (!selectedPoint) return;

    const enabled = !enabledModule(companyModules, module);
    const key = `company:${module}`;

    try {
      setSavingKey(key);
      setError('');
      setMessage('');

      await api.updateCompanyModule(
        selectedPoint.companyId,
        module,
        enabled,
      );

      setCompanyModules(
        await api.companyModules(selectedPoint.companyId),
      );

      setMessage('Configuración de empresa actualizada.');
    } catch (reason) {
      setError(
        reason instanceof Error
          ? reason.message
          : 'No fue posible actualizar el módulo de empresa.',
      );
    } finally {
      setSavingKey('');
    }
  }

  async function toggleBranchModule(
    module: BusinessModuleType,
  ): Promise<void> {
    if (!selectedPoint) return;

    const enabled = !enabledModule(branchModules, module);
    const key = `branch:${module}`;

    try {
      setSavingKey(key);
      setError('');
      setMessage('');

      await api.updateBranchModule(
        selectedPoint.branchId,
        module,
        enabled,
      );

      setBranchModules(
        await api.branchModules(
          selectedPoint.companyId,
          selectedPoint.branchId,
        ),
      );

      setMessage('Configuración de sucursal actualizada.');
    } catch (reason) {
      setError(
        reason instanceof Error
          ? reason.message
          : 'No fue posible actualizar el módulo de sucursal.',
      );
    } finally {
      setSavingKey('');
    }
  }

  async function toggleCapability(
    capability: PosCapabilityType,
  ): Promise<void> {
    if (!selectedPoint) return;

    const enabled = !enabledCapability(capabilities, capability);
    const key = `capability:${capability}`;

    try {
      setSavingKey(key);
      setError('');
      setMessage('');

      await api.updatePosCapability(
        selectedPoint.id,
        capability,
        enabled,
      );

      setCapabilities(
        await api.posCapabilities(selectedPoint.id),
      );

      setMessage('Capacidad del POS actualizada.');
    } catch (reason) {
      setError(
        reason instanceof Error
          ? reason.message
          : 'No fue posible actualizar la capacidad.',
      );
    } finally {
      setSavingKey('');
    }
  }

  async function saveFinancialConfiguration(): Promise<void> {
    if (!selectedPoint) return;

    const normalized = serviceChargePercent
      .replace(',', '.')
      .trim();

    const percent = Number(normalized);

    if (!Number.isFinite(percent) || percent < 0 || percent > 100) {
      setError('El porcentaje de servicio debe estar entre 0 y 100.');
      return;
    }

    if (serviceChargeEnabled && percent <= 0) {
      setError(
        'El cargo por servicio habilitado debe tener un porcentaje mayor que cero.',
      );
      return;
    }

    if (
      serviceChargeEnabled &&
      !serviceChargeDineIn &&
      !serviceChargeTakeaway &&
      !serviceChargeDirect
    ) {
      setError(
        'Selecciona al menos una modalidad para aplicar el cargo por servicio.',
      );
      return;
    }

    try {
      setSavingKey('financial');
      setError('');
      setMessage('');

      const updated = await api.updatePosFinancialConfiguration(
        selectedPoint.id,
        {
          taxesEnabled,
          serviceChargeEnabled,
          serviceChargeRate: percent / 100,
          serviceChargeDineIn,
          serviceChargeTakeaway,
          serviceChargeDirect,
        },
      );

      applyFinancialConfiguration(updated);
      setMessage('Configuración financiera actualizada.');
    } catch (reason) {
      setError(
        reason instanceof Error
          ? reason.message
          : 'No fue posible actualizar la configuración financiera.',
      );
    } finally {
      setSavingKey('');
    }
  }

  return (
    <main className="module-page maintenance-page">
      <header className="module-header maintenance-header">
        <div className="maintenance-header__content">
          <div className="maintenance-header__icon">
            <Settings2 size={22} strokeWidth={1.8} />
          </div>

          <div className="maintenance-header__text">
            <h1>Configuración del negocio</h1>
            <p>
              Módulos, capacidades y comportamiento financiero de cada
              punto de venta.
            </p>
          </div>
        </div>

        <button
          type="button"
          className="secondary-button"
          onClick={() => navigate('/dashboard')}
        >
          Volver al panel
        </button>
      </header>

      {error ? (
        <div className="maintenance-alert maintenance-alert--error">{error}</div>
      ) : null}
      {message ? (
        <div className="maintenance-alert maintenance-alert--success">{message}</div>
      ) : null}

      <div className="business-config-layout">

      <section className="settings-card maintenance-card business-config-card">
        <div>
          <p className="eyebrow">ALCANCE</p>
          <h2>Punto de venta activo</h2>
        </div>

        <label className="business-config-point">
          Punto de venta
          <select
            value={pointId}
            onChange={(event) => {
              void changePoint(event.target.value);
            }}
            disabled={loading || Boolean(savingKey)}
          >
            {points.map((point) => (
              <option key={point.id} value={point.id}>
                {point.name} · {point.code}
              </option>
            ))}
          </select>
        </label>

        {selectedPoint ? (
          <div className="settings-note">
            Empresa: {selectedPoint.companyId} · Sucursal:{' '}
            {selectedPoint.branchId}
          </div>
        ) : null}

        {availableBranches.length > 1 ? (
          <div className="settings-note">
            Este entorno tiene {availableBranches.length} sucursales detectadas
            a través de sus puntos de venta.
          </div>
        ) : null}
      </section>

      <section className="settings-card maintenance-card business-config-card">
        <div>
          <p className="eyebrow">EMPRESA</p>
          <h2>Módulos contratados (solo lectura)</h2>
        </div>

        <div className="settings-actions">
          {BUSINESS_MODULES.map((item) => {
            const enabled = enabledModule(companyModules, item.value);
            const busy = savingKey === `company:${item.value}`;

            return (
              <button
                key={item.value}
                type="button"
                className={
                  enabled
                    ? 'secondary-button settings-toggle settings-toggle--active'
                    : 'secondary-button settings-toggle'
                }
                onClick={() => {
                  void toggleCompanyModule(item.value);
                }}
                disabled
              >
                {item.value === 'CAR_WASH' ? (
                  <CarFront size={18} />
                ) : (
                  <Store size={18} />
                )}

                <span>
                  <strong>{item.label}</strong>
                  <small>{item.description}</small>
                </span>

                <b>{enabled ? 'ON' : 'OFF'}</b>
              </button>
            );
          })}
        </div>
      </section>

      <section className="settings-card maintenance-card business-config-card">
        <div>
          <p className="eyebrow">SUCURSAL</p>
          <h2>Módulos de la sucursal</h2>
        </div>

        <div className="settings-actions">
          {BUSINESS_MODULES.map((item) => {
            const enabled = enabledModule(branchModules, item.value);
            const busy = savingKey === `branch:${item.value}`;

            return (
              <button
                key={item.value}
                type="button"
                className={
                  enabled
                    ? 'secondary-button settings-toggle settings-toggle--active'
                    : 'secondary-button settings-toggle'
                }
                onClick={() => {
                  void toggleBranchModule(item.value);
                }}
                disabled={loading || busy}
              >
                <Building2 size={18} />

                <span>
                  <strong>{item.label}</strong>
                  <small>{item.description}</small>
                </span>

                <b>{enabled ? 'ON' : 'OFF'}</b>
              </button>
            );
          })}
        </div>
      </section>

      <section className="settings-card maintenance-card business-config-card">
        <div>
          <p className="eyebrow">PUNTO DE VENTA</p>
          <h2>Capacidades</h2>
        </div>

        <div className="settings-actions">
          {POS_CAPABILITIES.map((item) => {
            const enabled = enabledCapability(capabilities, item.value);
            const busy = savingKey === `capability:${item.value}`;

            return (
              <button
                key={item.value}
                type="button"
                className={
                  enabled
                    ? 'secondary-button settings-toggle settings-toggle--active'
                    : 'secondary-button settings-toggle'
                }
                onClick={() => {
                  void toggleCapability(item.value);
                }}
                disabled={loading || busy}
              >
                {enabled ? (
                  <CheckCircle2 size={18} />
                ) : (
                  <Settings2 size={18} />
                )}

                <span>
                  <strong>{item.label}</strong>
                  <small>{item.description}</small>
                </span>

                <b>{enabled ? 'ON' : 'OFF'}</b>
              </button>
            );
          })}
        </div>

        <p className="settings-note">
          CarWash no forma parte de estas capacidades: permanece como módulo y
          pantalla independiente.
        </p>
      </section>

      <section className="settings-card maintenance-card business-config-card settings-financial">
        <div className="settings-financial__heading">
          <div>
            <p className="eyebrow">PUNTO DE VENTA</p>
            <h2>Configuración financiera</h2>
            <p className="settings-note">
              Define si este POS aplica impuestos y cargos adicionales.
            </p>
          </div>

          <Percent size={22} />
        </div>

        <div className="settings-financial__grid">
          <label className="settings-financial__toggle">
            <span>
              <strong>Aplicar impuestos</strong>
              <small>
                Usa la tasa configurada en cada producto cuando el motor financiero esté activo.
              </small>
            </span>

            <input
              type="checkbox"
              checked={taxesEnabled}
              onChange={(event) =>
                setTaxesEnabled(event.target.checked)
              }
              disabled={loading || savingKey === 'financial'}
            />
          </label>

          <label className="settings-financial__toggle">
            <span>
              <strong>Cargo por servicio</strong>
              <small>
                Aplica un porcentaje adicional según la modalidad de venta.
              </small>
            </span>

            <input
              type="checkbox"
              checked={serviceChargeEnabled}
              onChange={(event) =>
                setServiceChargeEnabled(event.target.checked)
              }
              disabled={loading || savingKey === 'financial'}
            />
          </label>
        </div>

        <div className="settings-financial__rate">
          <label>
            Porcentaje de servicio
            <div className="settings-financial__rate-input">
              <input
                type="text"
                inputMode="decimal"
                value={serviceChargePercent}
                onChange={(event) => {
                  const value = event.target.value;

                  if (/^\d{0,3}([.,]\d{0,2})?$/.test(value)) {
                    setServiceChargePercent(value);
                  }
                }}
                disabled={
                  !serviceChargeEnabled ||
                  loading ||
                  savingKey === 'financial'
                }
                placeholder="10.00"
              />
              <span>%</span>
            </div>
          </label>
        </div>

        <div className="settings-financial__modes">
          <span className="settings-financial__label">
            Aplicar cargo por servicio a
          </span>

          <label>
            <input
              type="checkbox"
              checked={serviceChargeDineIn}
              onChange={(event) =>
                setServiceChargeDineIn(event.target.checked)
              }
              disabled={
                !serviceChargeEnabled ||
                loading ||
                savingKey === 'financial'
              }
            />
            <span>
              <strong>Consumo local</strong>
              <small>DINE_IN · Cliente consume en el establecimiento.</small>
            </span>
          </label>

          <label>
            <input
              type="checkbox"
              checked={serviceChargeTakeaway}
              onChange={(event) =>
                setServiceChargeTakeaway(event.target.checked)
              }
              disabled={
                !serviceChargeEnabled ||
                loading ||
                savingKey === 'financial'
              }
            />
            <span>
              <strong>Para llevar</strong>
              <small>TAKEAWAY · Orden preparada para retiro.</small>
            </span>
          </label>

          <label>
            <input
              type="checkbox"
              checked={serviceChargeDirect}
              onChange={(event) =>
                setServiceChargeDirect(event.target.checked)
              }
              disabled={
                !serviceChargeEnabled ||
                loading ||
                savingKey === 'financial'
              }
            />
            <span>
              <strong>Venta directa</strong>
              <small>DIRECT · Venta rápida sin consumo en mesa.</small>
            </span>
          </label>
        </div>

        <div className="settings-financial__footer">
          <div className="settings-note">
            {financialConfiguration?.id
              ? 'Configuración guardada para este POS.'
              : 'Este POS todavía usa la configuración financiera por defecto.'}
          </div>

          <button
            type="button"
            onClick={() => {
              void saveFinancialConfiguration();
            }}
            disabled={loading || savingKey === 'financial'}
          >
            {savingKey === 'financial'
              ? 'Guardando...'
              : 'Guardar configuración financiera'}
          </button>
        </div>
      </section>
      </div>
    </main>
  );
}

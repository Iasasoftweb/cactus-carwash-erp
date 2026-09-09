import {
  Car,
  Coffee,
  ChefHat,
  ChevronLeft,
  ChevronRight,
  CupSoda,
  Droplets,
  Grid2X2,
  House,
  List,
  Minus,
  Package,
  Pencil,
  Pizza,
  Plus,
  Sandwich,
  Search,
  ShoppingBag,
  ShoppingCart,
  Sparkles,
  Tag,
  Trash2,
  Utensils,
  WalletCards,
  Wrench,
  Printer,
} from 'lucide-react';
import { useEffect, useMemo, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import type {
  CashRegisterResponse,
  CustomerPriceLevelSummaryResponse,
  DashboardContextResponse,
  PaymentMethodResponse,
  PointOfSaleResponse,
  PosAccountResponse,
  PosCapabilityResponse,
  PosCapabilityType,
  PosFinancialConfigurationResponse,
  PosSaleMode,
  ProductCategoryResponse,
  ProductResponse,
  ProductPricingResponse,
} from '@cactus/shared';
import { ERP_PERMISSIONS } from '@cactus/shared';
import { api } from '../lib/api';
import {
  resolvePreferredPos,
  savePreferredPos,
} from '../lib/pos-preference';

const API_ORIGIN =
  import.meta.env.VITE_API_URL?.replace(/\/api\/?$/, '') ??
  'http://127.0.0.1:3000';

function productImageUrl(
  imageUrl: string | null | undefined,
): string | undefined {
  if (!imageUrl) return undefined;

  if (
    imageUrl.startsWith('http://') ||
    imageUrl.startsWith('https://')
  ) {
    return imageUrl;
  }

  return `${API_ORIGIN}${imageUrl}`;
}

type CategoryIconProps = {
  iconCode?: string | null;
  size?: number;
};

function CategoryIcon({
  iconCode,
  size = 14,
}: CategoryIconProps) {
  const normalized = iconCode?.trim().toLowerCase() ?? 'tag';

  const icons = {
    tag: Tag,
    grid: Grid2X2,
    coffee: Coffee,
    'cup-soda': CupSoda,
    utensils: Utensils,
    sandwich: Sandwich,
    pizza: Pizza,
    package: Package,
    'shopping-bag': ShoppingBag,
    droplets: Droplets,
    wrench: Wrench,
    sparkles: Sparkles,
    car: Car,
  } as const;

  const Icon =
    icons[normalized as keyof typeof icons] ?? Tag;

  return <Icon size={size} aria-hidden="true" />;
}

type CartItem = ProductResponse & {
  quantity: number;
  standardPrice?: number;
  priceOverrideReason?: string;
};
type Mode = 'POS' | 'HOLD';

const SALE_MODES: Array<{
  value: PosSaleMode;
  label: string;
  description: string;
}> = [
  {
    value: 'DINE_IN',
    label: 'Consumo local',
    description: 'Cliente consume en el establecimiento.',
  },
  {
    value: 'TAKEAWAY',
    label: 'Para llevar',
    description: 'Orden preparada para retiro.',
  },
  {
    value: 'DIRECT',
    label: 'Venta directa',
    description: 'Venta rápida sin consumo en mesa.',
  },
];

function saleModeLabel(value: PosSaleMode): string {
  return (
    SALE_MODES.find((mode) => mode.value === value)?.label ??
    value
  );
}

function roundMoney(value: number): number {
  return Math.round((value + Number.EPSILON) * 100) / 100;
}


const DEFAULT_CUSTOMER_ALIAS = 'Cliente Express';

const QUANTITY_STEP = {
  UNIT: 1,
  WEIGHT: 0.1,
  VOLUME: 0.1,
  SERVICE: 1,
} as const;

function quantityStep(product: ProductResponse): number {
  return QUANTITY_STEP[product.saleUnit];
}

function quantityLabel(product: ProductResponse): string {
  switch (product.saleUnit) {
    case 'WEIGHT':
      return 'kg';
    case 'VOLUME':
      return 'L';
    case 'SERVICE':
      return 'serv.';
    default:
      return 'ud.';
  }
}

function formatQuantity(
  quantity: number,
  product: Pick<ProductResponse, 'saleUnit'>,
): string {
  if (
    product.saleUnit === 'UNIT' ||
    product.saleUnit === 'SERVICE'
  ) {
    return quantity.toFixed(0);
  }

  return quantity.toFixed(3).replace(/\.?0+$/, '');
}
function saleUnitSuffix(
  saleUnit: ProductResponse['saleUnit'],
): string {
  switch (saleUnit) {
    case 'WEIGHT':
      return 'kg';
    case 'VOLUME':
      return 'L';
    case 'SERVICE':
      return 'serv.';
    default:
      return 'ud.';
  }
}

function unitPriceSuffix(
  saleUnit: ProductResponse['saleUnit'],
): string {
  switch (saleUnit) {
    case 'WEIGHT':
      return '/kg';
    case 'VOLUME':
      return '/L';
    case 'SERVICE':
      return '/servicio';
    default:
      return '/ud.';
  }
}

function formatSaleQuantity(
  quantity: number,
  saleUnit: ProductResponse['saleUnit'],
): string {
  return `${formatQuantity(quantity, { saleUnit })} ${saleUnitSuffix(saleUnit)}`;
}

function normalizeQuantity(
  quantity: number,
  product: ProductResponse,
): number {
  if (product.saleUnit === 'UNIT' || product.saleUnit === 'SERVICE') {
    return Math.max(1, Math.round(quantity));
  }

  return Math.max(0.001, Math.round(quantity * 1000) / 1000);
}

type PosPrintBusinessIdentity = {
  companyName: string;
  companyTaxId: string | null;
  branchName: string;
  branchAddress: string | null;
  branchPhone: string | null;
};

function escapeHtml(value: string): string {
  return value
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&#039;');
}

type PosTicketPrintParams = {
  business: PosPrintBusinessIdentity;
  title: string;
  reference: string;
  customerAlias: string;
  cashRegisterName: string;
  cashierName: string;
  paymentMethodName: string;
  paymentReference?: string;
  cashTendered?: number;
  cashChange?: number;
  items: Array<{
    name: string;
    quantity: number;
    saleUnit: ProductResponse['saleUnit'];
    unitPrice: number;
    lineTotal: number;
  }>;
  saleMode: PosSaleMode;
  subtotal: number;
  taxAmount: number;
  serviceChargeRate: number;
  serviceChargeAmount: number;
  total: number;
};

function buildPosTicketHtml(
  params: PosTicketPrintParams,
  autoPrint: boolean,
): string {
  const rows = params.items
    .map(
      (item) => `
        <tr>
          <td>
            ${escapeHtml(item.name)}
            <small>${formatSaleQuantity(item.quantity, item.saleUnit)} × RD$ ${item.unitPrice.toFixed(2)}${unitPriceSuffix(item.saleUnit)}</small>
          </td>
          <td class="amount">RD$ ${item.lineTotal.toFixed(2)}</td>
        </tr>
      `,
    )
    .join('');

  return `
    <!doctype html>
    <html lang="es">
      <head>
        <meta charset="utf-8" />
        <title>${escapeHtml(params.title)}</title>
        <style>
          @page { size: 80mm auto; margin: 3mm; }
           * { box-sizing: border-box; }
          body {
            width: 74mm;
            margin: 0 auto;
            padding: 3mm 1mm;
            color: #111;
            background: #fff;
            font-family: Arial, Helvetica, sans-serif;
            font-size: 11px;
            font-variant-numeric: tabular-nums;
          }
          h1, h2, p { margin: 0; }
          .center { text-align: center; }
          h1 {
            font-size: 17px;
            line-height: 1.15;
            font-weight: 800;
            letter-spacing: 0;
          }

          h2 {
            margin-top: 3px;
            font-size: 12px;
            line-height: 1.2;
            font-weight: 700;
          }

          .center p {
            margin-top: 2px;
            font-size: 10px;
            line-height: 1.25;
          }

          .document-title {
            margin-top: 7px !important;
            font-size: 12px !important;
            font-weight: 800;
          }
          .divider { margin: 8px 0; border-top: 1px dashed #111; }
          .meta { display: grid; gap: 4px; }
          .meta div, .total {
            display: flex;
            justify-content: space-between;
            gap: 10px;
          }
          table { width: 100%; border-collapse: collapse; }
          td {
            padding: 5px 0;
            vertical-align: top;
            border-bottom: 1px dotted #777;
          }
          td small {
            display: block;
            margin-top: 2px;
            color: #444;
          }
          .amount { text-align: right; white-space: nowrap; }
          .summary {
            display: grid;
            gap: 5px;
            margin-top: 8px;
          }
          .summary div {
            display: flex;
            justify-content: space-between;
            gap: 10px;
          }
          .total {
            margin-top: 8px;
            padding-top: 7px;
            border-top: 2px solid #111;
            font-size: 14px;
            font-weight: 900;
          }
          footer { margin-top: 12px; text-align: center; }
        </style>
      </head>
      <body>
        <div class="center">
          <h1>${escapeHtml(params.business.companyName)}</h1>
          <h2>${escapeHtml(params.business.branchName)}</h2>

          ${
            params.business.branchAddress
              ? `<p>${escapeHtml(params.business.branchAddress)}</p>`
              : ''
          }

          ${
            params.business.branchPhone
              ? `<p>Tel. ${escapeHtml(params.business.branchPhone)}</p>`
              : ''
          }

          ${
            params.business.companyTaxId
              ? `<p>RNC: ${escapeHtml(params.business.companyTaxId)}</p>`
              : ''
          }

          <p class="document-title">
            ${escapeHtml(params.title)}
          </p>
        </div>

        <div class="divider"></div>

        <div class="meta">
          <div><span>Fecha:</span><strong>${new Date().toLocaleString('es-DO')}</strong></div>
          <div><span>Referencia:</span><strong>${escapeHtml(params.reference)}</strong></div>
          <div><span>Cliente:</span><strong>${escapeHtml(params.customerAlias)}</strong></div>
          <div><span>Caja:</span><strong>${escapeHtml(params.cashRegisterName)}</strong></div>
          <div><span>Cajero:</span><strong>${escapeHtml(params.cashierName)}</strong></div>
          <div><span>Método:</span><strong>${escapeHtml(params.paymentMethodName)}</strong></div>
          <div><span>Modalidad:</span><strong>${escapeHtml(saleModeLabel(params.saleMode))}</strong></div>
          ${
            params.paymentReference
              ? `<div><span>Ref. pago:</span><strong>${escapeHtml(params.paymentReference)}</strong></div>`
              : ''
          }
        </div>

        <div class="divider"></div>

        <table><tbody>${rows}</tbody></table>

        <div class="summary">
          <div>
            <span>Subtotal</span>
            <strong>RD$ ${params.subtotal.toFixed(2)}</strong>
          </div>
          <div>
            <span>ITBIS</span>
            <strong>RD$ ${params.taxAmount.toFixed(2)}</strong>
          </div>
          ${
            params.serviceChargeAmount > 0
              ? `
                <div>
                  <span>Servicio ${(params.serviceChargeRate * 100).toFixed(2)}%</span>
                  <strong>RD$ ${params.serviceChargeAmount.toFixed(2)}</strong>
                </div>
              `
              : ''
          }
          <div class="total">
            <span>TOTAL</span>
            <span>RD$ ${params.total.toFixed(2)}</span>
          </div>
        </div>

        ${
          params.cashTendered !== undefined ||
          params.cashChange !== undefined
            ? `
              <div
                class="cash-settlement"
                style="
                  margin-top: 6px;
                  padding-top: 5px;
                  border-top: 1px dashed #777;
                  width: 100%;
                  box-sizing: border-box;
                "
              >
                ${
                  params.cashTendered !== undefined
                    ? `
                      <div
                        style="
                          display: flex;
                          justify-content: space-between;
                          align-items: baseline;
                          width: 100%;
                          gap: 12px;
                          padding: 2px 0;
                          box-sizing: border-box;
                        "
                      >
                        <span style="white-space: nowrap;">
                          Efectivo recibido
                        </span>

                        <strong
                          style="
                            margin-left: auto;
                            white-space: nowrap;
                            text-align: right;
                          "
                        >
                          RD$ ${params.cashTendered.toFixed(2)}
                        </strong>
                      </div>
                    `
                    : ''
                }

                ${
                  params.cashChange !== undefined
                    ? `
                      <div
                        style="
                          display: flex;
                          justify-content: space-between;
                          align-items: baseline;
                          width: 100%;
                          gap: 12px;
                          padding: 2px 0;
                          box-sizing: border-box;
                        "
                      >
                        <span style="white-space: nowrap;">
                          Devolución
                        </span>

                        <strong
                          style="
                            margin-left: auto;
                            white-space: nowrap;
                            text-align: right;
                          "
                        >
                          RD$ ${params.cashChange.toFixed(2)}
                        </strong>
                      </div>
                    `
                    : ''
                }
              </div>
            `
            : ''
        }

        <footer><p>Gracias por su compra.</p></footer>

        ${
          autoPrint
            ? `
        <script>
          window.addEventListener('load', function () {
            setTimeout(function () {
              window.print();
              window.close();
            }, 150);
          });
        </script>
              `
            : ''
        }
      </body>
    </html>
  `;
}

function printPosTicket(params: PosTicketPrintParams): void {
  const popup = window.open('', '_blank', 'width=420,height=720');

  if (!popup) {
    throw new Error(
      'El navegador bloqueó la ventana de impresión. Permite ventanas emergentes para imprimir el ticket.',
    );
  }

  popup.document.write(buildPosTicketHtml(params, true));
  popup.document.close();
}

function printPosPreInvoice(
  account: PosAccountResponse,
  business: PosPrintBusinessIdentity,
): void {
  const popup = window.open(
    '',
    '_blank',
    'width=420,height=720',
  );

  if (!popup) {
    throw new Error(
      'El navegador bloqueó la ventana de impresión.',
    );
  }

  const rows = account.items
    .map(
      (item) => `
        <tr>
          <td>
            ${escapeHtml(item.productName)}
            <small>
              ${formatSaleQuantity(item.quantity, item.saleUnit)} × RD$ ${item.unitPrice.toFixed(2)}${unitPriceSuffix(item.saleUnit)}
            </small>
          </td>
          <td class="amount">
            RD$ ${item.lineTotal.toFixed(2)}
          </td>
        </tr>
      `,
    )
    .join('');

  popup.document.write(`
    <!doctype html>
    <html lang="es">
      <head>
        <meta charset="utf-8" />

        <title>
          Pre-factura ${escapeHtml(account.reference)}
        </title>

        <style>
          @page {
            size: 80mm auto;
            margin: 3mm;
          }

          * {
            box-sizing: border-box;
          }

          body {
            width: 74mm;
            margin: 0 auto;
            padding: 3mm 1mm;

            color: #111;
            background: #fff;

            font-family:
              Arial,
              Helvetica,
              sans-serif;

            font-size: 11px;
            font-variant-numeric: tabular-nums;
          }

          h1,
          h2,
          p {
            margin: 0;
          }

          .center {
            text-align: center;
          }

          h1 {
            font-size: 17px;
            line-height: 1.15;
            font-weight: 800;
            letter-spacing: 0;
          }

          h2 {
            margin-top: 3px;
            font-size: 12px;
            line-height: 1.2;
            font-weight: 700;
          }

          .business-line {
            margin-top: 2px;
            font-size: 10px;
            line-height: 1.25;
          }

          .prefactura {
            margin-top: 7px;
            font-size: 14px;
            font-weight: 900;
          }

          .no-fiscal {
            margin-top: 3px;
            font-size: 10px;
            font-weight: 900;
          }

          .divider {
            margin: 8px 0;
            border-top: 1px dashed #111;
          }

          .meta {
            display: grid;
            gap: 4px;
          }

          .meta div,
          .summary div {
            display: flex;
            justify-content: space-between;
            gap: 10px;
          }

          table {
            width: 100%;
            border-collapse: collapse;
          }

          td {
            padding: 5px 0;
            vertical-align: top;
            border-bottom: 1px dotted #777;
          }

          td small {
            display: block;
            margin-top: 2px;
            color: #444;
          }

          .amount {
            text-align: right;
            white-space: nowrap;
          }

          .summary {
            display: grid;
            gap: 5px;
            margin-top: 8px;
          }

          .total {
            margin-top: 7px;
            padding-top: 7px;

            border-top: 2px solid #111;

            font-size: 14px;
            font-weight: 900;
          }

          footer {
            margin-top: 14px;
            text-align: center;
          }
        </style>
      </head>

      <body>
        <div class="center">
          <h1>${escapeHtml(business.companyName)}</h1>
          <h2>${escapeHtml(business.branchName)}</h2>

          ${
            business.branchAddress
              ? `<p class="business-line">${escapeHtml(business.branchAddress)}</p>`
              : ''
          }

          ${
            business.branchPhone
              ? `<p class="business-line">Tel. ${escapeHtml(business.branchPhone)}</p>`
              : ''
          }

          ${
            business.companyTaxId
              ? `<p class="business-line">RNC: ${escapeHtml(business.companyTaxId)}</p>`
              : ''
          }

          <p class="prefactura">
            PRE-FACTURA
          </p>

          <p class="no-fiscal">
            DOCUMENTO NO FISCAL
          </p>
        </div>

        <div class="divider"></div>

        <div class="meta">
          <div>
            <span>Fecha:</span>
            <strong>
              ${new Date().toLocaleString('es-DO')}
            </strong>
          </div>

          <div>
            <span>Cuenta:</span>
            <strong>
              ${escapeHtml(account.reference)}
            </strong>
          </div>

          <div>
            <span>Cliente:</span>
            <strong>
              ${escapeHtml(account.customerAlias)}
            </strong>
          </div>

          ${
            account.tableReference
              ? `
                <div>
                  <span>Mesa / Ref.:</span>
                  <strong>
                    ${escapeHtml(account.tableReference)}
                  </strong>
                </div>
              `
              : ''
          }

          <div>
            <span>Modalidad:</span>
            <strong>
              ${escapeHtml(saleModeLabel(account.saleMode))}
            </strong>
          </div>

          <div>
            <span>Caja:</span>
            <strong>
              ${escapeHtml(
                account.cashRegisterName ??
                  'Caja POS',
              )}
            </strong>
          </div>
        </div>

        <div class="divider"></div>

        <table>
          <tbody>
            ${rows}
          </tbody>
        </table>

        <div class="summary">
          <div>
            <span>Subtotal</span>
            <strong>
              RD$ ${account.subtotal.toFixed(2)}
            </strong>
          </div>

          <div>
            <span>ITBIS</span>
            <strong>
              RD$ ${account.taxAmount.toFixed(2)}
            </strong>
          </div>

          ${
            account.serviceChargeAmount > 0
              ? `
                <div>
                  <span>
                    Servicio ${(account.serviceChargeRate * 100).toFixed(2)}%
                  </span>
                  <strong>
                    RD$ ${account.serviceChargeAmount.toFixed(2)}
                  </strong>
                </div>
              `
              : ''
          }

          <div class="total">
            <span>TOTAL A PAGAR</span>
            <span>
              RD$ ${account.total.toFixed(2)}
            </span>
          </div>
        </div>

        <footer>
          <p>
            Esta pre-factura no representa un pago.
          </p>

          <p>
            Cuenta pendiente de cobro.
          </p>
        </footer>

        <script>
          window.addEventListener(
            'load',
            function () {
              setTimeout(
                function () {
                  window.print();
                  window.close();
                },
                150
              );
            }
          );
        </script>
      </body>
    </html>
  `);

  popup.document.close();
}
function inventoryStatus(
  product: ProductResponse,
):
  | 'NO_CONTROL'
  | 'OUT_OF_STOCK'
  | 'LOW_STOCK'
  | 'NORMAL' {
  if (!product.trackInventory) {
    return 'NO_CONTROL';
  }

  if (product.stockQuantity <= 0) {
    return 'OUT_OF_STOCK';
  }

  if (
    product.minimumStock > 0 &&
    product.stockQuantity <= product.minimumStock
  ) {
    return 'LOW_STOCK';
  }

  return 'NORMAL';
}

function printPosTicketDirect(
  params: PosTicketPrintParams,
): void {
  const iframe = document.createElement('iframe');

  iframe.setAttribute('aria-hidden', 'true');
  iframe.tabIndex = -1;

  Object.assign(iframe.style, {
    position: 'fixed',
    right: '0',
    bottom: '0',
    width: '1px',
    height: '1px',
    border: '0',
    opacity: '0',
    pointerEvents: 'none',
  });

  iframe.onload = () => {
    iframe.onload = null;

    const frameWindow = iframe.contentWindow;

    if (!frameWindow) {
      iframe.remove();
      return;
    }

    let cleaned = false;

    const cleanup = () => {
      if (cleaned) return;
      cleaned = true;
      iframe.remove();
    };

    frameWindow.addEventListener(
      'afterprint',
      cleanup,
      { once: true },
    );

    window.setTimeout(cleanup, 10000);

    try {
      frameWindow.focus();
      frameWindow.print();
    } catch (error) {
      cleanup();
      throw error;
    }
  };

  iframe.srcdoc = buildPosTicketHtml(params, false);
  document.body.appendChild(iframe);
}

function PosTicketPreviewModal(props: {
  ticket: PosTicketPrintParams | null;
  onClose: () => void;
  onPrint: () => void;
}) {
  const { ticket, onClose, onPrint } = props;

  if (!ticket) return null;

  return (
    <div
      className="pos-ticket-preview__backdrop"
      role="presentation"
      onMouseDown={(event) => {
        if (event.target === event.currentTarget) {
          onClose();
        }
      }}
    >
      <section
        className="pos-ticket-preview"
        role="dialog"
        aria-modal="true"
        aria-labelledby="pos-ticket-preview-title"
      >
        <header className="pos-ticket-preview__header">
          <div>
            <span>TICKET</span>
            <h2 id="pos-ticket-preview-title">
              Vista previa
            </h2>
          </div>

          <button
            type="button"
            className="secondary-button"
            onClick={onClose}
          >
            Cerrar
          </button>
        </header>

        <div className="pos-ticket-preview__body">
          <iframe
            title="Vista previa del ticket"
            srcDoc={buildPosTicketHtml(ticket, false)}
          />
        </div>

        <footer className="pos-ticket-preview__actions">
          <button
            type="button"
            className="secondary-button"
            onClick={onClose}
          >
            Cerrar sin imprimir
          </button>

          <button
            type="button"
            onClick={onPrint}
          >
            Imprimir ticket
          </button>
        </footer>
      </section>
    </div>
  );
}

export function PosWorkspacePage() {
  const navigate = useNavigate();

  const [mode, setMode] = useState<Mode>('POS');
  const [dashboardContext, setDashboardContext] =
    useState<DashboardContextResponse | null>(null);
  const [tabletCatalogOpen, setTabletCatalogOpen] =
    useState(false);
  const [points, setPoints] = useState<PointOfSaleResponse[]>([]);
  const [registers, setRegisters] = useState<CashRegisterResponse[]>([]);
  const [paymentMethods, setPaymentMethods] = useState<PaymentMethodResponse[]>([]);
  const [customers, setCustomers] = useState<
    CustomerPriceLevelSummaryResponse[]
  >([]);
  const [categories, setCategories] = useState<ProductCategoryResponse[]>([]);
  const [products, setProducts] = useState<ProductResponse[]>([]);
  const [accounts, setAccounts] = useState<PosAccountResponse[]>([]);
  const [capabilities, setCapabilities] = useState<PosCapabilityResponse[]>([]);
  const [capabilitiesLoading, setCapabilitiesLoading] = useState(false);
  const [financialConfiguration, setFinancialConfiguration] =
    useState<PosFinancialConfigurationResponse | null>(null);

  const [pointId, setPointId] = useState('');
  const [registerId, setRegisterId] = useState('');

  const selectedPoint = useMemo(
    () => points.find((point) => point.id === pointId) ?? null,
    [points, pointId],
  );

  // The configured UI mode only controls presentation.
  // Business rules, POS state and transactional operations remain shared.
  const posUiMode = selectedPoint?.uiMode ?? 'TOUCH';
  const isDesktopUi = posUiMode === 'DESKTOP';

  const printBusinessIdentity = useMemo<PosPrintBusinessIdentity>(() => {
    const branch =
      dashboardContext?.branches.find(
        (item) => item.id === selectedPoint?.branchId,
      ) ?? null;

    return {
      companyName:
        dashboardContext?.companyName ??
        'Empresa',
      companyTaxId:
        dashboardContext?.companyTaxId ?? null,
      branchName:
        branch?.name ??
        selectedPoint?.branchName ??
        'Sucursal',
      branchAddress:
        branch?.address ?? null,
      branchPhone:
        branch?.phone ?? null,
    };
  }, [
    dashboardContext,
    selectedPoint,
  ]);
  const [categoryId, setCategoryId] = useState('');
  const [query, setQuery] = useState('');
  const [productView, setProductView] =
    useState<'CARDS' | 'LIST'>('LIST');
  const [productPage, setProductPage] = useState(1);
  const [productPageSize, setProductPageSize] = useState(20);

  const [accountsPage, setAccountsPage] = useState(1);
  const accountsPageSize = 16;
  const [accountsQuery, setAccountsQuery] = useState('');
  const [barcodeInput, setBarcodeInput] = useState('');
  const [lastScannedProduct, setLastScannedProduct] = useState('');
  const barcodeInputRef = useRef<HTMLInputElement>(null);
  const desktopProductSearchRef = useRef<HTMLInputElement>(null);
  const [cart, setCart] = useState<CartItem[]>([]);
  const [customerAlias, setCustomerAlias] = useState(DEFAULT_CUSTOMER_ALIAS);
  const [customerId, setCustomerId] = useState('');
  const [tableReference, setTableReference] = useState('');
  const [saleMode, setSaleMode] = useState<PosSaleMode>('DIRECT');
  const [selectedAccount, setSelectedAccount] =
    useState<PosAccountResponse | null>(null);
  const [paymentMethodId, setPaymentMethodId] = useState('');
  const [paymentReference, setPaymentReference] = useState('');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [message, setMessage] = useState('');
  const [canOverridePrice, setCanOverridePrice] = useState(false);
  const [priceOverrideProduct, setPriceOverrideProduct] =
    useState<CartItem | null>(null);
  const [priceOverrideInput, setPriceOverrideInput] = useState('');
  const [priceOverrideReason, setPriceOverrideReason] = useState('');

  const [priceLevelProduct, setPriceLevelProduct] =
    useState<CartItem | null>(null);
  const [priceLevelPricing, setPriceLevelPricing] =
    useState<ProductPricingResponse | null>(null);
  const [priceLevelLoading, setPriceLevelLoading] =
    useState(false);

  const [weightProduct, setWeightProduct] =
    useState<ProductResponse | null>(null);
  const [weightInput, setWeightInput] = useState('');
  const [weightCaptureMode, setWeightCaptureMode] =
    useState<'QUANTITY' | 'AMOUNT'>('QUANTITY');

  const hasCapability = (capability: PosCapabilityType): boolean => {
    // Backward compatibility: an unconfigured POS keeps the legacy behavior.
    if (capabilities.length === 0) return true;

    return capabilities.some(
      (row) => row.capability === capability && row.enabled,
    );
  };

  const retailEnabled = hasCapability('RETAIL');
  const holdOrdersEnabled = hasCapability('HOLD_ORDERS');
  const tablesEnabled = hasCapability('TABLES');
  const weightedProductsEnabled = hasCapability('WEIGHTED_PRODUCTS');
  const foodServiceEnabled = hasCapability('FOOD_SERVICE');
  const kitchenTicketsEnabled = hasCapability('KITCHEN_TICKETS');

  const openAccountsLabel = foodServiceEnabled
    ? 'Cuentas abiertas'
    : 'HOLD';

  const newSaleLabel = foodServiceEnabled
    ? 'Nueva orden'
    : 'Nueva venta';

  const openAccountActionLabel = foodServiceEnabled
    ? 'Abrir cuenta'
    : 'Guardar en HOLD';

  const orderedPaymentMethods = useMemo(() => {
    const priority: Record<string, number> = {
      CASH: 1,
      CARD: 2,
      TRANSFER: 3,
      OTHER: 4,
      CREDIT: 5,
    };

    return [...paymentMethods].sort(
      (a, b) => (priority[a.type] ?? 99) - (priority[b.type] ?? 99),
    );
  }, [paymentMethods]);

  function loadAccounts(currentPointId: string): void {
    api
      .posAccounts(currentPointId)
      .then(setAccounts)
      .catch((reason: Error) => setError(reason.message));
  }

  useEffect(() => {
    Promise.all([
      api.posPoints(),
      api.paymentMethods(),
      api.customerPriceLevels(),
      api.authMe(),
      api.dashboardContext(),
    ])
      .then(([
        pointRows,
        methodRows,
        customerRows,
        authUser,
        dashboardContextRow,
      ]) => {
        setDashboardContext(dashboardContextRow);
        setCanOverridePrice(
          authUser.permissions.includes(ERP_PERMISSIONS.posPriceOverride),
        );
        const defaultPoint = resolvePreferredPos(
          pointRows,
          authUser.id,
        );

        const defaultMethod =
          methodRows.find((method) => method.type === 'CASH') ??
          methodRows.find((method) => method.type !== 'CREDIT') ??
          methodRows[0];

        setPoints(pointRows);

        setTicketCashierName(
          authUser.fullName ||
            authUser.username ||
            'Usuario',
        );

        setPaymentMethods(methodRows);
        setCustomers(customerRows);
        setPointId(defaultPoint?.id ?? '');
        setPaymentMethodId(defaultMethod?.id ?? '');
      })
      .catch((reason: Error) => setError(reason.message));
  }, []);

  useEffect(() => {
    if (!pointId) return;

    setCapabilitiesLoading(true);

    Promise.all([
      api.posCashRegisters(pointId),
      api.posCategories(pointId),
      api.posProducts(pointId),
      api.posAccounts(pointId),
      api.posCapabilities(pointId),
      api.posFinancialConfiguration(pointId),
      api.cashRegisters(),
    ])
      .then(([
        registerRows,
        categoryRows,
        productRows,
        accountRows,
        capabilityRows,
        financialRow,
        cashRegisterRows,
      ]) => {
        setRegisters(registerRows);
        setCategories(categoryRows);
        setProducts(productRows);
        setAccounts(accountRows);
        setCapabilities(capabilityRows);
        setFinancialConfiguration(financialRow);

        const pointRegisterIds = new Set(
          registerRows.map((register) => register.id),
        );

        const openRegisters = cashRegisterRows.filter(
          (register) =>
            pointRegisterIds.has(register.id) &&
            register.openSession !== null,
        );

        setRegisterId((currentRegisterId) => {
          const currentIsOpen = openRegisters.some(
            (register) => register.id === currentRegisterId,
          );

          if (currentIsOpen) {
            return currentRegisterId;
          }

          if (openRegisters.length === 1) {
            return openRegisters[0].id;
          }

          if (openRegisters.length > 1) {
            return '';
          }

          return registerRows[0]?.id ?? '';
        });
      })
      .catch((reason: Error) => setError(reason.message))
      .finally(() => setCapabilitiesLoading(false));
  }, [pointId]);

  useEffect(() => {
    if (selectedAccount) return;

    setSaleMode(
      foodServiceEnabled ? 'DINE_IN' : 'DIRECT',
    );
  }, [foodServiceEnabled, pointId, selectedAccount]);

  useEffect(() => {
    if (!capabilitiesLoading && !holdOrdersEnabled && mode === 'HOLD') {
      setMode('POS');
      setSelectedAccount(null);
      setCart([]);
    }
  }, [capabilitiesLoading, holdOrdersEnabled, mode]);

  useEffect(() => {
    if (!pointId) return;

    api
      .posProducts(pointId, categoryId || undefined)
      .then(setProducts)
      .catch((reason: Error) => setError(reason.message));
  }, [pointId, categoryId]);

  useEffect(() => {
    if (!pointId || products.length === 0) {
      return;
    }

    const timer = window.setTimeout(() => {
      barcodeInputRef.current?.focus();
    }, 0);

    return () => window.clearTimeout(timer);
  }, [pointId, products.length]);

  const visibleProducts = useMemo(() => {
    const normalized = query.trim().toLowerCase();

    return products.filter((product) => {
      if (
        product.saleUnit === 'WEIGHT' &&
        !weightedProductsEnabled
      ) {
        return false;
      }

      return (
        !normalized ||
        product.name.toLowerCase().includes(normalized) ||
        product.sku.toLowerCase().includes(normalized) ||
        (product.barcode ?? '').toLowerCase().includes(normalized)
      );
    });
  }, [products, query, weightedProductsEnabled]);

  const productTotalPages = Math.max(
    1,
    Math.ceil(visibleProducts.length / productPageSize),
  );

  const filteredAccounts = useMemo(() => {
    const normalized = accountsQuery.trim().toLowerCase();

    if (!normalized) {
      return accounts;
    }

    return accounts.filter((account) =>
      [
        account.reference,
        account.customerAlias,
        account.tableReference ?? '',
        account.cashRegisterName ?? '',
      ].some((value) =>
        value.toLowerCase().includes(normalized),
      ),
    );
  }, [accounts, accountsQuery]);

  const accountsTotalPages = Math.max(
    1,
    Math.ceil(filteredAccounts.length / accountsPageSize),
  );

  const paginatedAccounts = useMemo(() => {
    const start = (accountsPage - 1) * accountsPageSize;

    return filteredAccounts.slice(
      start,
      start + accountsPageSize,
    );
  }, [
    filteredAccounts,
    accountsPage,
    accountsPageSize,
  ]);

  const paginatedProducts = useMemo(() => {
    const start = (productPage - 1) * productPageSize;

    return visibleProducts.slice(
      start,
      start + productPageSize,
    );
  }, [
    visibleProducts,
    productPage,
    productPageSize,
  ]);

  useEffect(() => {
    setProductPage(1);
  }, [
    pointId,
    categoryId,
    query,
    productView,
    productPageSize,
  ]);

  useEffect(() => {
    if (productPage > productTotalPages) {
      setProductPage(productTotalPages);
    }
  }, [
    productPage,
    productTotalPages,
  ]);

  useEffect(() => {
    if (accountsPage > accountsTotalPages) {
      setAccountsPage(accountsTotalPages);
    }
  }, [accountsPage, accountsTotalPages]);

  useEffect(() => {
    setAccountsPage(1);
  }, [accountsQuery]);

  const cartFinancialPreview = useMemo(() => {
    const subtotal = roundMoney(
      cart.reduce(
        (sum, item) =>
          sum + item.price * item.quantity,
        0,
      ),
    );

    const taxesEnabled =
      financialConfiguration?.taxesEnabled ?? false;

    const taxAmount = roundMoney(
      cart.reduce((sum, item) => {
        if (!taxesEnabled) return sum;

        const base = roundMoney(
          item.price * item.quantity,
        );

        return sum + roundMoney(base * item.taxRate);
      }, 0),
    );

    const serviceApplies =
      financialConfiguration?.serviceChargeEnabled === true &&
      (
        (saleMode === 'DINE_IN' &&
          financialConfiguration.serviceChargeDineIn) ||
        (saleMode === 'TAKEAWAY' &&
          financialConfiguration.serviceChargeTakeaway) ||
        (saleMode === 'DIRECT' &&
          financialConfiguration.serviceChargeDirect)
      );

    const serviceChargeRate = serviceApplies
      ? financialConfiguration?.serviceChargeRate ?? 0
      : 0;

    const serviceChargeAmount = roundMoney(
      subtotal * serviceChargeRate,
    );

    return {
      subtotal,
      taxAmount,
      serviceChargeRate,
      serviceChargeAmount,
      total: roundMoney(
        subtotal +
          taxAmount +
          serviceChargeAmount,
      ),
    };
  }, [cart, financialConfiguration, saleMode]);

  const selectedRegister = registers.find(
    (register) => register.id === registerId,
  );

  const selectedPaymentMethod = paymentMethods.find(
    (method) => method.id === paymentMethodId,
  );

  const cartTotal = cartFinancialPreview.total;

  const [paymentModalOpen, setPaymentModalOpen] = useState(false);
  const [cashTenderedInput, setCashTenderedInput] = useState('');
  const [pendingTicket, setPendingTicket] =
    useState<PosTicketPrintParams | null>(null);

  const [ticketCashierName, setTicketCashierName] =
    useState('Usuario');

  const paymentModalTotal = roundMoney(
    selectedAccount
      ? selectedAccount.total + cartTotal
      : cartTotal,
  );

  const cashTendered =
    Number(cashTenderedInput.replace(',', '.')) || 0;

  const cashChange = roundMoney(
    Math.max(0, cashTendered - paymentModalTotal),
  );

  const isCashPayment =
    selectedPaymentMethod?.type === 'CASH';

  const canConfirmPayment =
    !saving &&
    paymentModalTotal > 0 &&
    (!isCashPayment || cashTendered >= paymentModalTotal);

  function openPaymentModal(): void {
    if (!paymentMethodId || !selectedPaymentMethod) {
      setError('Selecciona un método de pago.');
      return;
    }

    if (!selectedAccount && cart.length === 0) {
      setError('Agrega al menos un artículo.');
      return;
    }

    if (!selectedAccount && !registerId) {
      setError('Selecciona una caja.');
      return;
    }

    setCashTenderedInput(
      selectedPaymentMethod.type === 'CASH'
        ? paymentModalTotal.toFixed(2)
        : '',
    );
    setError('');
    setMessage('');
    setPaymentModalOpen(true);
  }

  function closePaymentModal(): void {
    if (saving) return;

    setPaymentModalOpen(false);
    setCashTenderedInput('');
  }

  async function confirmPaymentModal(): Promise<void> {
    if (!canConfirmPayment) return;

    if (selectedAccount) {
      await paySelectedAccount();
    } else {
      await payNow();
    }
  }

  const cartLineCount = cart.length;
  const cartQuantityTotal = cart.reduce(
    (sum, item) => sum + item.quantity,
    0,
  );


  function addProductQuantity(
    product: ProductResponse,
    quantity: number,
  ): void {
    if (inventoryStatus(product) === 'OUT_OF_STOCK') {
      setError(`${product.name} está agotado.`);
      return;
    }

    const normalizedQuantity = normalizeQuantity(quantity, product);

    setCart((current) => {
      const existing = current.find((item) => item.id === product.id);
      const currentQuantity = existing?.quantity ?? 0;
      const nextQuantity = normalizeQuantity(
        currentQuantity + normalizedQuantity,
        product,
      );

      if (
        product.trackInventory &&
        nextQuantity > product.stockQuantity
      ) {
        setError(
          `No hay más existencia disponible de ${product.name}.`,
        );
        return current;
      }

      setError('');

      if (existing) {
        return current.map((item) =>
          item.id === product.id
            ? { ...item, quantity: nextQuantity }
            : item,
        );
      }

      return [
        ...current,
        {
          ...product,
          quantity: normalizedQuantity,
          standardPrice: product.price,
        },
      ];
    });
  }

  function openWeightCapture(product: ProductResponse): void {
    if (!weightedProductsEnabled) {
      setError(
        `${product.name} es un producto por peso y esta modalidad no está habilitada.`,
      );
      return;
    }

    if (inventoryStatus(product) === 'OUT_OF_STOCK') {
      setError(`${product.name} está agotado.`);
      return;
    }

    setError('');
    setMessage('');
    setWeightProduct(product);
    setWeightCaptureMode('QUANTITY');
    setWeightInput('');
  }

  function closeWeightCapture(): void {
    setWeightProduct(null);
    setWeightInput('');
    setWeightCaptureMode('QUANTITY');
    focusBarcodeScanner();
  }

  function parseDecimalInput(value: string): number {
    return Number(value.replace(',', '.').trim());
  }

  function weightCaptureEffectivePrice(): number {
    if (!weightProduct) return 0;

    const existing = cart.find(
      (item) => item.id === weightProduct.id,
    );

    return existing?.price ?? weightProduct.price;
  }

  function weightCaptureQuantity(): number | null {
    if (!weightProduct) return null;

    const parsed = parseDecimalInput(weightInput);

    if (!Number.isFinite(parsed) || parsed <= 0) {
      return null;
    }

    if (weightCaptureMode === 'QUANTITY') {
      return Math.round(parsed * 1000) / 1000;
    }

    const effectivePrice = weightCaptureEffectivePrice();

    if (effectivePrice <= 0) {
      return null;
    }

    return Math.round(
      (parsed / effectivePrice) * 1000,
    ) / 1000;
  }

  function weightCaptureAmount(): number {
    if (!weightProduct) return 0;

    const quantity = weightCaptureQuantity();

    if (quantity === null) return 0;

    return roundMoney(
      quantity * weightCaptureEffectivePrice(),
    );
  }

  function confirmWeightCapture(): void {
    if (!weightProduct) return;

    const raw = weightInput.replace(',', '.').trim();
    const parsed = Number(raw);

    if (!Number.isFinite(parsed) || parsed <= 0) {
      setError(
        weightCaptureMode === 'AMOUNT'
          ? 'El monto debe ser mayor que cero.'
          : 'El peso debe ser mayor que cero.',
      );
      return;
    }

    if (weightCaptureMode === 'QUANTITY') {
      const decimals = raw.split('.')[1]?.length ?? 0;

      if (parsed < 0.001) {
        setError('El peso debe ser de al menos 0.001 kg.');
        return;
      }

      if (decimals > 3) {
        setError('El peso admite un máximo de 3 decimales.');
        return;
      }
    }

    if (
      weightCaptureMode === 'AMOUNT' &&
      weightCaptureEffectivePrice() <= 0
    ) {
      setError(
        `No se puede calcular la cantidad porque ${weightProduct.name} no tiene un precio válido.`,
      );
      return;
    }

    const quantity = weightCaptureQuantity();

    if (quantity === null || quantity < 0.001) {
      setError('El valor indicado produce una cantidad menor que 0.001 kg.');
      return;
    }

    const currentQuantity =
      cart.find((item) => item.id === weightProduct.id)?.quantity ?? 0;

    const resultingQuantity =
      Math.round((currentQuantity + quantity) * 1000) / 1000;

    if (
      weightProduct.trackInventory &&
      resultingQuantity > weightProduct.stockQuantity
    ) {
      setError(
        `La cantidad acumulada supera la existencia disponible de ${weightProduct.name}.`,
      );
      return;
    }

    const amount = roundMoney(
      quantity * weightCaptureEffectivePrice(),
    );

    addProductQuantity(weightProduct, quantity);
    setLastScannedProduct(weightProduct.name);
    setMessage(
      `${formatQuantity(quantity, weightProduct)} kg de ${weightProduct.name} agregado · RD$ ${amount.toFixed(2)}.`,
    );

    setWeightProduct(null);
    setWeightInput('');
    setWeightCaptureMode('QUANTITY');
    focusBarcodeScanner();
  }

  function addProduct(product: ProductResponse): void {
    if (product.saleUnit === 'WEIGHT') {
      openWeightCapture(product);
      return;
    }

    addProductQuantity(product, quantityStep(product));
  }


  function moveDesktopProductFocus(
    direction: 'NEXT' | 'PREVIOUS' | 'FIRST' | 'LAST',
  ): void {
    const products = Array.from(
      document.querySelectorAll<HTMLButtonElement>(
        '.desktop-pos-v1 .pos-tablet-catalog--open [data-desktop-product]',
      ),
    ).filter((element) => !element.disabled);

    if (products.length === 0) {
      return;
    }

    const active = document.activeElement;
    const currentIndex = products.findIndex(
      (element) => element === active,
    );

    let nextIndex = 0;

    if (direction === 'FIRST') {
      nextIndex = 0;
    } else if (direction === 'LAST') {
      nextIndex = products.length - 1;
    } else if (direction === 'NEXT') {
      nextIndex =
        currentIndex < 0
          ? 0
          : Math.min(products.length - 1, currentIndex + 1);
    } else {
      nextIndex =
        currentIndex < 0
          ? products.length - 1
          : Math.max(0, currentIndex - 1);
    }

    products[nextIndex]?.focus();
  }

  function addProductFromDesktopCatalog(
    product: ProductResponse,
  ): void {
    addProduct(product);

    setTabletCatalogOpen(false);

    /*
     * Para productos normales, React actualiza el carrito y
     * luego enfocamos el input de cantidad de esa línea.
     *
     * Para productos por peso, addProduct abre primero el modal
     * de captura de peso, por lo que ese modal conserva el foco.
     */
    if (product.saleUnit === 'WEIGHT') {
      return;
    }

    window.setTimeout(() => {
      const input =
        document.querySelector<HTMLInputElement>(
          `[data-quantity-product-id="${product.id}"]`,
        );

      if (input) {
        input.focus();
        input.select();
      }
    }, 50);
  }


  // ==========================================================
  // DESKTOP POS KEYBOARD SHORTCUTS
  // F2  -> Catálogo / Buscar producto
  // F10 -> Cobrar
  // Esc -> Cerrar catálogo
  // ==========================================================
  useEffect(() => {
    if (!isDesktopUi) {
      return;
    }

    function handleDesktopShortcut(event: KeyboardEvent): void {
      const target = event.target as HTMLElement | null;

      const isTyping =
        target instanceof HTMLInputElement ||
        target instanceof HTMLTextAreaElement ||
        target instanceof HTMLSelectElement ||
        target?.isContentEditable === true;

      // ------------------------------------------------------
      // ESC: cerrar catálogo desde cualquier parte del modal.
      // ------------------------------------------------------
      if (event.key === 'Escape' && tabletCatalogOpen) {
        event.preventDefault();
        setTabletCatalogOpen(false);
        return;
      }

      // No interferir con modales transaccionales.
      if (
        priceOverrideProduct ||
        priceLevelProduct ||
        weightProduct
      ) {
        return;
      }

      // ------------------------------------------------------
      // F2: Productos + foco en Buscar artículo
      // ------------------------------------------------------
      if (event.key === 'F2') {
        event.preventDefault();

        setProductView('LIST');
        setTabletCatalogOpen(true);

        window.setTimeout(() => {
          desktopProductSearchRef.current?.focus();
          desktopProductSearchRef.current?.select();
        }, 50);

        return;
      }

      /*
       * Mientras el usuario escribe, no interceptamos otras
       * teclas funcionales salvo F2/Esc.
       */
      if (isTyping) {
        return;
      }

      // ------------------------------------------------------
      // F10: Cobrar utilizando la lógica existente.
      // ------------------------------------------------------
      if (event.key === 'F10') {
        event.preventDefault();

        if (saving) {
          return;
        }

        if (tabletCatalogOpen) {
          setTabletCatalogOpen(false);
        }

        if (selectedAccount) {
          openPaymentModal();
          return;
        }

        if (cart.length === 0) {
          setError('Agrega al menos un artículo.');
          return;
        }

        openPaymentModal();
      }
    }

    window.addEventListener(
      'keydown',
      handleDesktopShortcut,
    );

    return () => {
      window.removeEventListener(
        'keydown',
        handleDesktopShortcut,
      );
    };
  }, [
    isDesktopUi,
    tabletCatalogOpen,
    priceOverrideProduct,
    priceLevelProduct,
    weightProduct,
    selectedAccount,
    saving,
    cart.length,
  ]);


  function focusBarcodeScanner(): void {
    window.setTimeout(() => {
      barcodeInputRef.current?.focus();
    }, 0);
  }

  function handleBarcodeScan(): void {
    const barcode = barcodeInput.trim();

    if (!barcode) {
      focusBarcodeScanner();
      return;
    }

    const product = products.find(
      (row) => row.barcode?.trim() === barcode,
    );

    if (!product) {
      setError(`No existe un producto con el código de barras ${barcode}.`);
      setMessage('');
      setLastScannedProduct('');
      setBarcodeInput('');
      focusBarcodeScanner();
      return;
    }

    if (
      product.saleUnit === 'WEIGHT' &&
      !weightedProductsEnabled
    ) {
      setError(
        `${product.name} es un producto por peso y esta modalidad no está habilitada.`,
      );
      setMessage('');
      setLastScannedProduct('');
      setBarcodeInput('');
      focusBarcodeScanner();
      return;
    }

    addProduct(product);
    setLastScannedProduct(product.name);
    setBarcodeInput('');

    if (product.saleUnit !== 'WEIGHT') {
      focusBarcodeScanner();
    }
  }

  function changeQuantity(productId: string, delta: number): void {
    setCart((current) =>
      current.flatMap((item) => {
        if (item.id !== productId) return [item];

        const step = quantityStep(item);
        const quantity = normalizeQuantity(
          item.quantity + delta * step,
          item,
        );

        if (
          delta > 0 &&
          item.trackInventory &&
          quantity > item.stockQuantity
        ) {
          setError(
            `No hay más existencia disponible de ${item.name}.`,
          );
          return [item];
        }

        if (delta > 0) {
          setError('');
        }

        if (delta < 0 && item.quantity - step <= 0) {
          return [];
        }

        return [{ ...item, quantity }];
      }),
    );
  }

  function setManualQuantity(
    productId: string,
    rawValue: string,
  ): void {
    setCart((current) =>
      current.flatMap((item) => {
        if (item.id !== productId) return [item];

        const normalizedValue = rawValue.replace(',', '.').trim();
        if (normalizedValue === '') return [item];

        const parsed = Number(normalizedValue);
        if (!Number.isFinite(parsed) || parsed <= 0) {
          setError('La cantidad debe ser mayor que cero.');
          return [item];
        }

        if (
          (item.saleUnit === 'UNIT' || item.saleUnit === 'SERVICE') &&
          !Number.isInteger(parsed)
        ) {
          setError(`${item.name} solo permite cantidades enteras.`);
          return [item];
        }

        const quantity =
          item.saleUnit === 'UNIT' || item.saleUnit === 'SERVICE'
            ? parsed
            : Math.round(parsed * 1000) / 1000;

        if (item.trackInventory && quantity > item.stockQuantity) {
          setError(
            `La cantidad supera la existencia disponible de ${item.name}.`,
          );
          return [item];
        }

        setError('');
        return [{ ...item, quantity }];
      }),
    );
  }

  function openPriceOverride(item: CartItem): void {
    if (!canOverridePrice) {
      setError('No tienes permiso para modificar precios.');
      return;
    }
    setPriceOverrideProduct(item);
    setPriceOverrideInput(item.price.toFixed(2));
    setPriceOverrideReason(item.priceOverrideReason ?? '');
    setError('');
  }

  function closePriceOverride(): void {
    setPriceOverrideProduct(null);
    setPriceOverrideInput('');
    setPriceOverrideReason('');
  }


  async function openPriceLevelSelector(
    item: CartItem,
  ): Promise<void> {
    if (!canOverridePrice) {
      setError('No tienes permiso para modificar precios.');
      return;
    }

    if (!pointId) {
      setError('Selecciona un punto de venta.');
      return;
    }

    setPriceLevelProduct(item);
    setPriceLevelPricing(null);
    setPriceLevelLoading(true);
    setError('');

    try {
      const pricing = await api.productPricing(item.id, pointId);
      setPriceLevelPricing(pricing);
    } catch (reason) {
      setPriceLevelProduct(null);
      setError(
        reason instanceof Error
          ? reason.message
          : 'No fue posible cargar los niveles de precio.',
      );
    } finally {
      setPriceLevelLoading(false);
    }
  }

  function closePriceLevelSelector(): void {
    setPriceLevelProduct(null);
    setPriceLevelPricing(null);
    setPriceLevelLoading(false);
  }

  function applyPriceLevel(
    price: number,
    levelName: string,
  ): void {
    if (!priceLevelProduct || !priceLevelPricing) {
      return;
    }

    if (price < priceLevelPricing.minimumPrice) {
      setError(
        `El nivel ${levelName} está por debajo del precio mínimo permitido.`,
      );
      return;
    }

    setCart((current) =>
      current.map((item) =>
        item.id === priceLevelProduct.id
          ? {
              ...item,
              price,
              priceOverrideReason:
                `Nivel de precio autorizado: ${levelName}`,
            }
          : item,
      ),
    );

    setMessage(
      `Precio ${levelName} aplicado a ${priceLevelProduct.name}.`,
    );
    setError('');
    closePriceLevelSelector();
  }

  function confirmPriceOverride(): void {
    if (!priceOverrideProduct) return;

    const nextPrice = Number(priceOverrideInput.replace(',', '.').trim());
    const reason = priceOverrideReason.trim();

    if (!Number.isFinite(nextPrice) || nextPrice <= 0) {
      setError('El nuevo precio debe ser mayor que cero.');
      return;
    }
    if (!reason) {
      setError('Debe indicar el motivo del cambio de precio.');
      return;
    }

    setCart((current) =>
      current.map((item) =>
        item.id === priceOverrideProduct.id
          ? {
              ...item,
              standardPrice: item.standardPrice ?? item.price,
              price: Math.round(nextPrice * 100) / 100,
              priceOverrideReason: reason,
            }
          : item,
      ),
    );
    setError('');
    closePriceOverride();
  }

  function removeCartItem(productId: string): void {
    setCart((current) =>
      current.filter((item) => item.id !== productId),
    );
    setError('');
  }

  function clearCart(): void {
    setCart([]);
    setError('');
  }

  function resetSale(): void {
    setCart([]);
    setCustomerId('');
    setCustomerAlias(DEFAULT_CUSTOMER_ALIAS);
    setTableReference('');
    setSaleMode(foodServiceEnabled ? 'DINE_IN' : 'DIRECT');
    setSelectedAccount(null);
    setPaymentReference('');
  }

  async function persistSelectedAccount(): Promise<PosAccountResponse> {
    if (!selectedAccount) {
      throw new Error('No hay una cuenta HOLD seleccionada.');
    }

    const updated = await api.updatePosAccount(selectedAccount.id, {
      customerAlias: customerAlias.trim() || DEFAULT_CUSTOMER_ALIAS,
      tableReference: tablesEnabled ? tableReference.trim() || undefined : undefined,
    });

    setSelectedAccount(updated);
    setCustomerAlias(updated.customerAlias);
    setTableReference(updated.tableReference ?? '');

    return updated;
  }

  async function saveToHold(): Promise<void> {
    if (!holdOrdersEnabled) {
      setError('HOLD no está habilitado para este punto de venta.');
      return;
    }

    if (!pointId || cart.length === 0) {
      setError('Agrega al menos un artículo.');
      return;
    }

    if (!customerAlias.trim()) {
      setError('Indica el nombre o alias del cliente.');
      return;
    }

    setSaving(true);
    setError('');
    setMessage('');

    try {
      const account = await api.openPosAccount({
        pointOfSaleId: pointId,
        cashRegisterId: registerId || undefined,
        customerId: customerId || undefined,
        customerAlias: customerAlias.trim(),
        tableReference: tablesEnabled ? tableReference.trim() || undefined : undefined,
        saleMode,
      });

      await api.addPosAccountItems(account.id, {
        items: cart.map((item) => ({
          productId: item.id,
          quantity: item.quantity,
          ...(item.standardPrice !== undefined &&
          Math.abs(item.price - item.standardPrice) > 0.0001
            ? { unitPrice: item.price, priceOverrideReason: item.priceOverrideReason }
            : {}),
        })),
      });

      setMessage(
        foodServiceEnabled
          ? 'Cuenta abierta correctamente.'
          : 'Cuenta guardada en HOLD correctamente.',
      );
      resetSale();
      loadAccounts(pointId);
      setMode('HOLD');
    } catch (reason) {
      setError(
        reason instanceof Error
          ? reason.message
          : 'No fue posible guardar la cuenta.',
      );
    } finally {
      setSaving(false);
    }
  }

  async function openAccountAndSendToKitchen(): Promise<void> {
    if (!kitchenTicketsEnabled) {
      setError(
        'Kitchen Tickets no está habilitado para este punto de venta.',
      );
      return;
    }

    if (!pointId || cart.length === 0) {
      setError('Agrega al menos un artículo.');
      return;
    }

    if (!customerAlias.trim()) {
      setError('Indica el nombre o alias del cliente.');
      return;
    }

    setSaving(true);
    setError('');
    setMessage('');

    try {
      const account = await api.openPosAccount({
        pointOfSaleId: pointId,
        cashRegisterId: registerId || undefined,
        customerId: customerId || undefined,
        customerAlias: customerAlias.trim(),
        tableReference: tablesEnabled
          ? tableReference.trim() || undefined
          : undefined,
        saleMode,
      });

      const updated = await api.addPosAccountItems(account.id, {
        items: cart.map((item) => ({
          productId: item.id,
          quantity: item.quantity,
          ...(item.standardPrice !== undefined &&
          Math.abs(item.price - item.standardPrice) > 0.0001
            ? { unitPrice: item.price, priceOverrideReason: item.priceOverrideReason }
            : {}),
        })),
      });

      const tickets = await api.sendToKitchen(updated.id);

      setMessage(
        tickets.length === 1
          ? `Cuenta ${updated.reference} abierta y ticket ${tickets[0].ticketNumber} enviado a cocina correctamente.`
          : `Cuenta ${updated.reference} abierta y ${tickets.length} tickets enviados a sus estaciones de preparación.`,
      );

      resetSale();
      loadAccounts(pointId);
      setMode('HOLD');
    } catch (reason) {
      setError(
        reason instanceof Error
          ? reason.message
          : 'No fue posible abrir la cuenta y enviarla a cocina.',
      );
    } finally {
      setSaving(false);
    }
  }

  function handlePaidTicket(
    ticket: PosTicketPrintParams,
  ): void {
    if (financialConfiguration?.ticketPrintMode === 'DIRECT') {
      printPosTicketDirect(ticket);
      return;
    }

    setPendingTicket(ticket);
  }

  function closeTicketPreview(): void {
    setPendingTicket(null);
  }

  function printPendingTicket(): void {
    if (!pendingTicket) return;

    try {
      printPosTicket(pendingTicket);
      setPendingTicket(null);
    } catch (reason) {
      setError(
        reason instanceof Error
          ? reason.message
          : 'No fue posible imprimir el ticket.',
      );
    }
  }

  async function payNow(): Promise<void> {
    if (!pointId || cart.length === 0) {
      setError('Agrega al menos un artículo.');
      return;
    }

    if (!registerId) {
      setError('Selecciona una caja.');
      return;
    }

    if (!paymentMethodId || !selectedPaymentMethod) {
      setError('Selecciona un método de pago.');
      return;
    }

    const ticketCart = [...cart];
    const ticketAlias =
      customerAlias.trim() || DEFAULT_CUSTOMER_ALIAS;
    const ticketPaymentReference =
      paymentReference.trim() || undefined;

    setSaving(true);
    setError('');
    setMessage('');

    try {
      const result = await api.directPosPayment({
        pointOfSaleId: pointId,
        cashRegisterId: registerId,
        customerId: customerId || undefined,
        customerAlias: ticketAlias,
        saleMode,
        paymentMethodId,
        paymentReference: ticketPaymentReference,
        items: ticketCart.map((item) => ({
          productId: item.id,
          quantity: item.quantity,
          ...(item.standardPrice !== undefined &&
          Math.abs(item.price - item.standardPrice) > 0.0001
            ? { unitPrice: item.price, priceOverrideReason: item.priceOverrideReason }
            : {}),
        })),
      });

      handlePaidTicket({
        business: printBusinessIdentity,
        title: 'TICKET DE VENTA',
        reference: result.reference,
        customerAlias: result.customerAlias ?? ticketAlias,
        cashRegisterName:
          selectedRegister?.name ?? 'Caja POS',
        cashierName: ticketCashierName,
        paymentMethodName: selectedPaymentMethod.name,
        paymentReference: ticketPaymentReference,
        cashTendered:
          selectedPaymentMethod.type === 'CASH'
            ? cashTendered
            : undefined,
        cashChange:
          selectedPaymentMethod.type === 'CASH'
            ? cashChange
            : undefined,
        saleMode: result.saleMode,
        subtotal: result.subtotal,
        taxAmount: result.taxAmount,
        serviceChargeRate: result.serviceChargeRate,
        serviceChargeAmount: result.serviceChargeAmount,
        items: result.items.map((item) => ({
          name: item.productName,
          quantity: item.quantity,
          saleUnit: item.saleUnit,
          unitPrice: item.unitPrice,
          lineTotal: item.lineTotal,
        })),
        total: result.total,
      });

      setPaymentModalOpen(false);
      setCashTenderedInput('');
      setMessage(result.message);
      resetSale();
    } catch (reason) {
      setError(
        reason instanceof Error
          ? reason.message
          : 'No fue posible cobrar la venta.',
      );
    } finally {
      setSaving(false);
    }
  }

  function openHoldAccount(account: PosAccountResponse): void {
    if (!holdOrdersEnabled) {
      setError('HOLD no está habilitado para este punto de venta.');
      return;
    }

    setSelectedAccount(account);
    setRegisterId(account.cashRegisterId ?? '');
    setCustomerId(account.customerId ?? '');
    setCustomerAlias(account.customerAlias);
    setTableReference(account.tableReference ?? '');
    setSaleMode(account.saleMode);
    setCart([]);
    setPaymentReference('');
    setMode('POS');
    setError('');
    setMessage(
      `Cuenta ${account.reference} abierta. Selecciona nuevos artículos y usa "Agregar a la cuenta".`,
    );
  }

  async function addToSelectedAccount(): Promise<void> {
    if (!selectedAccount || cart.length === 0) {
      setError('Selecciona una cuenta y agrega artículos.');
      return;
    }

    setSaving(true);
    setError('');
    setMessage('');

    try {
      const account = await persistSelectedAccount();

      const updated = await api.addPosAccountItems(account.id, {
        items: cart.map((item) => ({
          productId: item.id,
          quantity: item.quantity,
          ...(item.standardPrice !== undefined &&
          Math.abs(item.price - item.standardPrice) > 0.0001
            ? { unitPrice: item.price, priceOverrideReason: item.priceOverrideReason }
            : {}),
        })),
      });

      setSelectedAccount(updated);
      setCustomerAlias(updated.customerAlias);
      setTableReference(updated.tableReference ?? '');
      setCart([]);
      setMessage(
        'Consumo agregado correctamente. Puedes seguir agregando artículos o cobrar la cuenta.',
      );

      loadAccounts(pointId);
    } catch (reason) {
      setError(
        reason instanceof Error
          ? reason.message
          : 'No fue posible actualizar la cuenta.',
      );
    } finally {
      setSaving(false);
    }
  }

  async function sendSelectedAccountToKitchen(): Promise<void> {
    if (!selectedAccount) {
      setError('Selecciona una cuenta abierta.');
      return;
    }

    if (!kitchenTicketsEnabled) {
      setError(
        'Kitchen Tickets no está habilitado para este punto de venta.',
      );
      return;
    }

    setSaving(true);
    setError('');
    setMessage('');

    try {
      let account = await persistSelectedAccount();

      if (cart.length > 0) {
        account = await api.addPosAccountItems(account.id, {
          items: cart.map((item) => ({
            productId: item.id,
            quantity: item.quantity,
            ...(item.standardPrice !== undefined &&
            Math.abs(item.price - item.standardPrice) > 0.0001
              ? { unitPrice: item.price, priceOverrideReason: item.priceOverrideReason }
              : {}),
          })),
        });

        setSelectedAccount(account);
        setCustomerAlias(account.customerAlias);
        setTableReference(account.tableReference ?? '');
        setCart([]);
      }

      const tickets = await api.sendToKitchen(account.id);

      setMessage(
        tickets.length === 1
          ? `Ticket ${tickets[0].ticketNumber} enviado a cocina correctamente.`
          : `${tickets.length} tickets enviados a sus estaciones de preparación.`,
      );

      loadAccounts(pointId);
    } catch (reason) {
      setError(
        reason instanceof Error
          ? reason.message
          : 'No fue posible enviar la cuenta a cocina.',
      );
    } finally {
      setSaving(false);
    }
  }

  async function paySelectedAccount(): Promise<void> {
    if (!selectedAccount || !paymentMethodId || !selectedPaymentMethod) {
      setError('Selecciona una cuenta y método de pago.');
      return;
    }

    setSaving(true);
    setError('');
    setMessage('');

    try {
      let accountToPay = await persistSelectedAccount();

      if (cart.length > 0) {
        accountToPay = await api.addPosAccountItems(selectedAccount.id, {
          items: cart.map((item) => ({
            productId: item.id,
            quantity: item.quantity,
            ...(item.standardPrice !== undefined &&
            Math.abs(item.price - item.standardPrice) > 0.0001
              ? { unitPrice: item.price, priceOverrideReason: item.priceOverrideReason }
              : {}),
          })),
        });

        setSelectedAccount(accountToPay);
        setCart([]);
      }

      const ticketPaymentReference = paymentReference.trim() || undefined;

      const paidAccount = await api.payPosAccount(accountToPay.id, {
        paymentMethodId,
        paymentReference: ticketPaymentReference,
      });

      handlePaidTicket({
        business: printBusinessIdentity,
        title: 'TICKET DE PAGO',
        reference: paidAccount.reference,
        customerAlias: paidAccount.customerAlias,
        cashRegisterName:
          paidAccount.cashRegisterName ??
          selectedRegister?.name ??
          'Caja POS',
        cashierName: ticketCashierName,
        paymentMethodName: selectedPaymentMethod.name,
        paymentReference: ticketPaymentReference,
        cashTendered:
          selectedPaymentMethod.type === 'CASH'
            ? cashTendered
            : undefined,
        cashChange:
          selectedPaymentMethod.type === 'CASH'
            ? cashChange
            : undefined,
        saleMode: paidAccount.saleMode,
        subtotal: paidAccount.subtotal,
        taxAmount: paidAccount.taxAmount,
        serviceChargeRate: paidAccount.serviceChargeRate,
        serviceChargeAmount: paidAccount.serviceChargeAmount,
        items: paidAccount.items.map((item) => ({
          name: item.productName,
          quantity: item.quantity,
          saleUnit: item.saleUnit,
          unitPrice: item.unitPrice,
          lineTotal: item.lineTotal,
        })),
        total: paidAccount.total,
      });

      setPaymentModalOpen(false);
      setCashTenderedInput('');
      setMessage('Cuenta pagada correctamente.');
      resetSale();
      loadAccounts(pointId);
      setMode('HOLD');
    } catch (reason) {
      setError(
        reason instanceof Error
          ? reason.message
          : 'No fue posible cobrar la cuenta.',
      );
    } finally {
      setSaving(false);
    }
  }

  async function returnToHold(): Promise<void> {
    if (!selectedAccount) {
      setMode('HOLD');
      return;
    }

    setSaving(true);
    setError('');
    setMessage('');

    try {
      await persistSelectedAccount();
      loadAccounts(pointId);

      setSelectedAccount(null);
      setCart([]);
      setCustomerAlias(DEFAULT_CUSTOMER_ALIAS);
      setTableReference('');
      setSaleMode(foodServiceEnabled ? 'DINE_IN' : 'DIRECT');
      setPaymentReference('');
      setMode('HOLD');
    } catch (reason) {
      setError(
        reason instanceof Error
          ? reason.message
          : 'No fue posible guardar los cambios de la cuenta.',
      );
    } finally {
      setSaving(false);
    }
  }

  if (!isDesktopUi) {
    return (
      <main className="touch-pos-v1" data-pos-ui-mode="TOUCH">
        <header className="touch-pos-v1__header">
          <div className="touch-pos-v1__brand">
            <div className="touch-pos-v1__brand-icon">
              <ShoppingCart size={22} />
            </div>

            <div>
              <span>CACTUS POS</span>
              <h1>{selectedPoint?.name ?? 'Punto de Venta'}</h1>
              <small>
                {selectedRegister?.name ?? 'Selecciona una caja'}
              </small>
            </div>
          </div>

          <nav className="touch-pos-v1__nav">
            <button
              type="button"
              className="touch-pos-v1__nav-button touch-pos-v1__nav-button--secondary"
              onClick={() => navigate('/dashboard')}
            >
              <House size={17} />
              Menú
            </button>

            <button
              type="button"
              className={
                mode === 'POS'
                  ? 'touch-pos-v1__nav-button touch-pos-v1__nav-button--active'
                  : 'touch-pos-v1__nav-button'
              }
              onClick={() => {
                setMode('POS');
                setSelectedAccount(null);
                setCart([]);
                setCustomerAlias(DEFAULT_CUSTOMER_ALIAS);
                setTableReference('');
                setPaymentReference('');
                setError('');
                setMessage('');
              }}
            >
              <Plus size={18} />
              {newSaleLabel}
            </button>

            {kitchenTicketsEnabled ? (
              <button
                type="button"
                className="touch-pos-v1__nav-button"
                onClick={() => navigate('/kitchen')}
              >
                <ChefHat size={18} />
                Cocina
              </button>
            ) : null}

            {holdOrdersEnabled ? (
              <button
                type="button"
                className={
                  mode === 'HOLD'
                    ? 'touch-pos-v1__nav-button touch-pos-v1__nav-button--active'
                    : 'touch-pos-v1__nav-button'
                }
                onClick={() => {
                  setMode('HOLD');
                  setSelectedAccount(null);
                  setCart([]);
                  setCustomerAlias(DEFAULT_CUSTOMER_ALIAS);
                  setTableReference('');
                  setError('');
                  setMessage('');
                }}
              >
                <WalletCards size={18} />
                {openAccountsLabel}
                <b>{accounts.length}</b>
              </button>
            ) : null}
          </nav>
        </header>

        {error ? (
          <div className="touch-pos-v1__notice touch-pos-v1__notice--error">
            {error}
          </div>
        ) : null}

        {message ? (
          <div className="touch-pos-v1__notice touch-pos-v1__notice--success">
            {message}
          </div>
        ) : null}

        {capabilitiesLoading ? (
          <div className="touch-pos-v1__notice">
            Cargando configuración del punto de venta...
          </div>
        ) : null}

        {mode === 'HOLD' ? (
          <section className="touch-pos-v1__hold">
            <div className="touch-pos-v1__section-heading">
              <div>
                <span>CUENTAS</span>
                <h2>{openAccountsLabel}</h2>
              </div>

              <div className="touch-pos-v1__accounts-toolbar">
                <div className="touch-pos-v1__accounts-search">
                  <Search size={16} />
                  <input
                    value={accountsQuery}
                    onChange={(event) =>
                      setAccountsQuery(event.target.value)
                    }
                    placeholder="Buscar cuenta, cliente, mesa o caja"
                    aria-label="Buscar cuentas abiertas"
                  />

                  {accountsQuery ? (
                    <button
                      type="button"
                      onClick={() => setAccountsQuery('')}
                    >
                      Limpiar
                    </button>
                  ) : null}
                </div>

                <strong>
                  {filteredAccounts.length}
                </strong>
              </div>
            </div>

            {filteredAccounts.length === 0 ? (
              <div className="touch-pos-v1__empty">
                {accountsQuery
                  ? 'No hay cuentas que coincidan con la búsqueda.'
                  : 'No hay cuentas abiertas.'}
              </div>
            ) : (
              <div className="touch-pos-v1__account-grid">
                {paginatedAccounts.map((account) => (
                  <article
                    className="touch-pos-v1__account-card"
                    key={account.id}
                  >
                    <div className="touch-pos-v1__account-head">
                      <div>
                        <span>{account.reference}</span>
                        <h3>{account.customerAlias}</h3>
                      </div>

                      <span className="touch-pos-v1__status">
                        Abierta
                      </span>
                    </div>

                    {tablesEnabled ? (
                      <small>
                        {account.tableReference ?? 'Sin referencia'}
                      </small>
                    ) : null}

                    <div className="touch-pos-v1__account-mode">
                      {saleModeLabel(account.saleMode)}
                    </div>

                    <div className="touch-pos-v1__account-lines">
                      {account.items.slice(0, 4).map((item) => (
                        <span key={item.id}>
                          {formatSaleQuantity(
                            item.quantity,
                            item.saleUnit,
                          )}{' '}
                          × {item.productName}
                        </span>
                      ))}

                      {account.items.length > 4 ? (
                        <small>
                          +{account.items.length - 4} artículos
                        </small>
                      ) : null}
                    </div>

                    <div className="touch-pos-v1__account-total">
                      <span>Total</span>
                      <strong>
                        RD$ {account.total.toFixed(2)}
                      </strong>
                    </div>

                    <button
                      type="button"
                      className="touch-pos-v1__primary-action"
                      onClick={() => openHoldAccount(account)}
                    >
                      Abrir cuenta
                    </button>
                  </article>
                ))}
              </div>
            )}

            {filteredAccounts.length > accountsPageSize ? (
              <nav
                className="touch-pos-v1__accounts-pagination"
                aria-label="Paginación de cuentas abiertas"
              >
                <button
                  type="button"
                  onClick={() =>
                    setAccountsPage((current) =>
                      Math.max(1, current - 1),
                    )
                  }
                  disabled={accountsPage <= 1}
                  aria-label="Página anterior"
                >
                  <ChevronLeft size={16} />
                  <span>Anterior</span>
                </button>

                <div className="touch-pos-v1__accounts-pages">
                  {Array.from(
                    { length: accountsTotalPages },
                    (_, index) => index + 1,
                  ).map((page) => (
                    <button
                      key={page}
                      type="button"
                      className={
                        page === accountsPage
                          ? 'touch-pos-v1__accounts-page touch-pos-v1__accounts-page--active'
                          : 'touch-pos-v1__accounts-page'
                      }
                      aria-current={
                        page === accountsPage
                          ? 'page'
                          : undefined
                      }
                      onClick={() =>
                        setAccountsPage(page)
                      }
                    >
                      {page}
                    </button>
                  ))}
                </div>

                <button
                  type="button"
                  onClick={() =>
                    setAccountsPage((current) =>
                      Math.min(
                        accountsTotalPages,
                        current + 1,
                      ),
                    )
                  }
                  disabled={
                    accountsPage >= accountsTotalPages
                  }
                  aria-label="Página siguiente"
                >
                  <span>Siguiente</span>
                  <ChevronRight size={16} />
                </button>
              </nav>
            ) : null}
          </section>
        ) : (
          <div className="touch-pos-v1__workspace">
            <section className="touch-pos-v1__catalog">
              <div className="touch-pos-v1__catalog-top">
                <div className="touch-pos-v1__search">
                  <Search size={20} />
                  <input
                    value={query}
                    onChange={(event) =>
                      setQuery(event.target.value)
                    }
                    placeholder="Buscar producto..."
                  />
                </div>

                <div className="touch-pos-v1__scanner">
                  <Search size={18} />
                  <input
                    ref={barcodeInputRef}
                    value={barcodeInput}
                    onChange={(event) =>
                      setBarcodeInput(event.target.value)
                    }
                    onKeyDown={(event) => {
                      if (event.key === 'Enter') {
                        event.preventDefault();
                        handleBarcodeScan();
                      }
                    }}
                    placeholder="Código de barras"
                    autoComplete="off"
                    inputMode="numeric"
                  />
                </div>
              </div>

              <div className="touch-pos-v1__categories">
                <button
                  type="button"
                  className={
                    !categoryId
                      ? 'touch-pos-v1__category touch-pos-v1__category--active'
                      : 'touch-pos-v1__category'
                  }
                  onClick={() => setCategoryId('')}
                >
                  <Grid2X2 size={20} />
                  <span>Todos</span>
                </button>

                {categories.map((category) => (
                  <button
                    key={category.id}
                    type="button"
                    className={
                      categoryId === category.id
                        ? 'touch-pos-v1__category touch-pos-v1__category--active'
                        : 'touch-pos-v1__category'
                    }
                    onClick={() => setCategoryId(category.id)}
                  >
                    <CategoryIcon
                      iconCode={category.iconCode}
                      size={20}
                    />
                    <span>{category.name}</span>
                  </button>
                ))}
              </div>

              <div className="touch-pos-v1__catalog-heading">
                <div>
                  <span>CATÁLOGO</span>
                  <h2>
                    {categoryId
                      ? categories.find(
                          (category) =>
                            category.id === categoryId,
                        )?.name ?? 'Productos'
                      : 'Todos los productos'}
                  </h2>
                </div>

                <small>
                  {visibleProducts.length}{' '}
                  {visibleProducts.length === 1
                    ? 'producto'
                    : 'productos'}
                </small>
              </div>

              <div className="touch-pos-v1__products">
                {paginatedProducts.map((product) => {
                  const status = inventoryStatus(product);
                  const outOfStock =
                    status === 'OUT_OF_STOCK';

                  return (
                    <button
                      type="button"
                      key={product.id}
                      className={
                        outOfStock
                          ? 'touch-pos-v1__product touch-pos-v1__product--disabled'
                          : 'touch-pos-v1__product'
                      }
                      onClick={() => addProduct(product)}
                      disabled={outOfStock}
                    >
                      <div className="touch-pos-v1__product-visual">
                        {product.imageUrl ? (
                          <img
                            src={productImageUrl(
                              product.imageUrl,
                            )}
                            alt={product.name}
                          />
                        ) : (
                          <Package size={34} />
                        )}

                        {status === 'LOW_STOCK' ? (
                          <span className="touch-pos-v1__stock touch-pos-v1__stock--low">
                            Stock bajo
                          </span>
                        ) : null}

                        {outOfStock ? (
                          <span className="touch-pos-v1__stock touch-pos-v1__stock--out">
                            Agotado
                          </span>
                        ) : null}
                      </div>

                      <div className="touch-pos-v1__product-info">
                        <strong>{product.name}</strong>
                        <small>{product.categoryName}</small>

                        <div>
                          <span>
                            {product.trackInventory
                              ? `${formatQuantity(
                                  product.stockQuantity,
                                  product,
                                )} ${quantityLabel(product)}`
                              : 'Disponible'}
                          </span>

                          <b>
                            RD$ {product.price.toFixed(2)}
                          </b>
                        </div>
                      </div>
                    </button>
                  );
                })}
              </div>

              {visibleProducts.length > productPageSize ? (
                <footer className="touch-pos-v1__pagination">
                  <button
                    type="button"
                    disabled={productPage <= 1}
                    onClick={() =>
                      setProductPage((current) =>
                        Math.max(1, current - 1),
                      )
                    }
                  >
                    <ChevronLeft size={18} />
                  </button>

                  <span>
                    {productPage} / {productTotalPages}
                  </span>

                  <button
                    type="button"
                    disabled={
                      productPage >= productTotalPages
                    }
                    onClick={() =>
                      setProductPage((current) =>
                        Math.min(
                          productTotalPages,
                          current + 1,
                        ),
                      )
                    }
                  >
                    <ChevronRight size={18} />
                  </button>
                </footer>
              ) : null}
            </section>

            <aside className="touch-pos-v1__order">
              <header className="touch-pos-v1__order-header">
                <div>
                  <span>ORDEN ACTUAL</span>
                  <h2>
                    {selectedAccount
                      ? selectedAccount.reference
                      : 'Nueva venta'}
                  </h2>
                </div>

                <div className="touch-pos-v1__order-count">
                  <ShoppingCart size={18} />
                  <strong>{cartLineCount}</strong>
                </div>
              </header>

              <div className="touch-pos-v1__sale-modes">
                {SALE_MODES.map((item) => (
                  <button
                    key={item.value}
                    type="button"
                    className={
                      saleMode === item.value
                        ? 'touch-pos-v1__sale-mode touch-pos-v1__sale-mode--active'
                        : 'touch-pos-v1__sale-mode'
                    }
                    disabled={
                      Boolean(selectedAccount) || saving
                    }
                    onClick={() =>
                      setSaleMode(item.value)
                    }
                  >
                    {item.label}
                  </button>
                ))}
              </div>

              <div className="touch-pos-v1__customer">
                <label>
                  Cliente
                  <select
                    value={customerId}
                    disabled={
                      Boolean(selectedAccount) || saving
                    }
                    onChange={(event) => {
                      const nextCustomerId =
                        event.target.value;

                      const customer = customers.find(
                        (item) =>
                          item.customerId ===
                          nextCustomerId,
                      );

                      setCustomerId(nextCustomerId);

                      setCustomerAlias(
                        customer?.customerName ??
                          DEFAULT_CUSTOMER_ALIAS,
                      );
                    }}
                  >
                    <option value="">
                      Consumidor final
                    </option>

                    {customers.map((customer) => (
                      <option
                        key={customer.customerId}
                        value={customer.customerId}
                      >
                        {customer.customerName}
                      </option>
                    ))}
                  </select>
                </label>

                <label className="touch-pos-v1__order-name">
                  Nombre de la orden
                  <input
                    value={customerAlias}
                    onChange={(event) =>
                      setCustomerAlias(event.target.value)
                    }
                    placeholder="Ej. Cliente mostrador"
                    maxLength={120}
                  />
                </label>

                <label>
                  Caja
                  <select
                    value={registerId}
                    disabled={Boolean(selectedAccount)}
                    onChange={(event) =>
                      setRegisterId(event.target.value)
                    }
                  >
                    {registers.map((register) => (
                      <option
                        key={register.id}
                        value={register.id}
                      >
                        {register.name}
                      </option>
                    ))}
                  </select>
                </label>
              </div>

              {tablesEnabled ? (
                <label className="touch-pos-v1__reference">
                  Mesa / referencia
                  <input
                    value={tableReference}
                    disabled={Boolean(selectedAccount)}
                    onChange={(event) =>
                      setTableReference(event.target.value)
                    }
                    placeholder="Opcional"
                  />
                </label>
              ) : null}

              <div className="touch-pos-v1__cart">
                {selectedAccount?.items.length ? (
                  <div className="touch-pos-v1__existing-items">
                    <div className="touch-pos-v1__existing-items-title">
                      <span>CONSUMO ACUMULADO</span>
                      <strong>
                        {selectedAccount.items.length}
                        {' '}
                        {selectedAccount.items.length === 1
                          ? 'artículo'
                          : 'artículos'}
                      </strong>
                    </div>

                    {selectedAccount.items.map((item) => (
                      <div
                        key={item.id}
                        className="touch-pos-v1__existing-item"
                      >
                        <div>
                          <strong>{item.productName}</strong>
                          <small>
                            {formatSaleQuantity(
                              item.quantity,
                              item.saleUnit,
                            )}
                            {' × '}
                            RD$ {item.unitPrice.toFixed(2)}
                          </small>
                        </div>

                        <strong>
                          RD$ {item.lineTotal.toFixed(2)}
                        </strong>
                      </div>
                    ))}
                  </div>
                ) : null}

                {cart.length === 0 && !selectedAccount ? (
                  <div className="touch-pos-v1__cart-empty">
                    <ShoppingBag size={34} />
                    <strong>Orden vacía</strong>
                    <span>
                      Toca un producto para agregarlo.
                    </span>
                  </div>
                ) : cart.length > 0 ? (
                  cart.map((item) => (
                    <article
                      key={item.id}
                      className="touch-pos-v1__cart-item"
                    >
                      <div className="touch-pos-v1__cart-item-main">
                        <strong>{item.name}</strong>
                        <small>
                          RD$ {item.price.toFixed(2)}
                          {unitPriceSuffix(item.saleUnit)}
                        </small>

                      </div>

                      <div className="touch-pos-v1__quantity">
                        <button
                          type="button"
                          disabled={
                            item.saleUnit === 'WEIGHT'
                          }
                          onClick={() =>
                            changeQuantity(item.id, -1)
                          }
                        >
                          <Minus size={17} />
                        </button>

                        <input
                          type="number"
                          value={formatQuantity(
                            item.quantity,
                            item,
                          )}
                          min={
                            item.saleUnit === 'UNIT' ||
                            item.saleUnit === 'SERVICE'
                              ? 1
                              : 0.001
                          }
                          step={
                            item.saleUnit === 'UNIT' ||
                            item.saleUnit === 'SERVICE'
                              ? 1
                              : 0.001
                          }
                          onChange={(event) =>
                            setManualQuantity(
                              item.id,
                              event.target.value,
                            )
                          }
                        />

                        <button
                          type="button"
                          disabled={
                            item.saleUnit === 'WEIGHT'
                          }
                          onClick={() =>
                            changeQuantity(item.id, 1)
                          }
                        >
                          <Plus size={17} />
                        </button>
                      </div>

                      <strong className="touch-pos-v1__line-total">
                        RD${' '}
                        {(
                          item.price * item.quantity
                        ).toFixed(2)}
                      </strong>

                      <div className="touch-pos-v1__item-actions">
                        {canOverridePrice ? (
                          <button
                            type="button"
                            className="touch-pos-v1__price-change"
                            onClick={() =>
                              openPriceOverride(item)
                            }
                            title="Cambiar precio"
                            aria-label={`Cambiar precio de ${item.name}`}
                          >
                            <Pencil size={15} />
                          </button>
                        ) : null}

                        <button
                          type="button"
                          className="touch-pos-v1__remove"
                          onClick={() =>
                            removeCartItem(item.id)
                          }
                          title="Eliminar producto"
                          aria-label={`Eliminar ${item.name}`}
                        >
                          <Trash2 size={16} />
                        </button>
                      </div>
                    </article>
                  ))
                ) : null}
              </div>

              {cart.length > 0 ? (
                <button
                  type="button"
                  className="touch-pos-v1__clear"
                  onClick={clearCart}
                >
                  Vaciar orden
                </button>
              ) : null}

              <div className="touch-pos-v1__summary">
                {selectedAccount ? (
                  <>
                    <div>
                      <span>Subtotal acumulado</span>
                      <strong>
                        RD$ {selectedAccount.subtotal.toFixed(2)}
                      </strong>
                    </div>

                    <div>
                      <span>ITBIS acumulado</span>
                      <strong>
                        RD$ {selectedAccount.taxAmount.toFixed(2)}
                      </strong>
                    </div>

                    {selectedAccount.serviceChargeAmount > 0 ? (
                      <div>
                        <span>Servicio acumulado</span>
                        <strong>
                          RD$ {selectedAccount.serviceChargeAmount.toFixed(2)}
                        </strong>
                      </div>
                    ) : null}

                    <div className="touch-pos-v1__account-running-total">
                      <span>Total cuenta</span>
                      <strong>
                        RD$ {selectedAccount.total.toFixed(2)}
                      </strong>
                    </div>
                  </>
                ) : null}

                <div>
                  <span>
                    {selectedAccount ? 'Nuevo subtotal' : 'Subtotal'}
                  </span>
                  <strong>
                    RD${' '}
                    {cartFinancialPreview.subtotal.toFixed(
                      2,
                    )}
                  </strong>
                </div>

                <div>
                  <span>
                    {selectedAccount ? 'Nuevo ITBIS' : 'ITBIS'}
                  </span>
                  <strong>
                    RD${' '}
                    {cartFinancialPreview.taxAmount.toFixed(
                      2,
                    )}
                  </strong>
                </div>

                {cartFinancialPreview.serviceChargeAmount >
                0 ? (
                  <div>
                    <span>Servicio</span>
                    <strong>
                      RD${' '}
                      {cartFinancialPreview.serviceChargeAmount.toFixed(
                        2,
                      )}
                    </strong>
                  </div>
                ) : null}

                <div className="touch-pos-v1__grand-total">
                  <span>
                    {selectedAccount
                      ? 'Nuevo consumo estimado'
                      : 'Total'}
                  </span>
                  <strong>
                    RD$ {cartTotal.toFixed(2)}
                  </strong>
                </div>
              </div>

              <div className="touch-pos-v1__payment">
                <label>
                  Pago
                  <select
                    value={paymentMethodId}
                    onChange={(event) =>
                      setPaymentMethodId(
                        event.target.value,
                      )
                    }
                  >
                    {orderedPaymentMethods.map((method) => (
                      <option
                        key={method.id}
                        value={method.id}
                      >
                        {method.name}
                      </option>
                    ))}
                  </select>
                </label>

                <label>
                  Referencia
                  <input
                    value={paymentReference}
                    onChange={(event) =>
                      setPaymentReference(
                        event.target.value,
                      )
                    }
                    placeholder="Opcional"
                  />
                </label>
              </div>

              <div className="touch-pos-v1__actions">
                {selectedAccount ? (
                  <>
                    <button
                      type="button"
                      onClick={() => {
                        void addToSelectedAccount();
                      }}
                      disabled={
                        saving || cart.length === 0
                      }
                    >
                      Agregar a cuenta
                    </button>

                    <button
                      type="button"
                      className="touch-pos-v1__pay"
                      onClick={openPaymentModal}
                      disabled={saving}
                    >
                      Cobrar cuenta
                    </button>

                    <button
                      type="button"
                      className="touch-pos-v1__secondary"
                      onClick={() => {
                        void returnToHold();
                      }}
                      disabled={saving}
                    >
                      Volver
                    </button>
                  </>
                ) : (
                  <>
                    <button
                      type="button"
                      className="touch-pos-v1__pay"
                      onClick={openPaymentModal}
                      disabled={
                        saving || cart.length === 0
                      }
                    >
                      Cobrar ahora
                    </button>

                    {kitchenTicketsEnabled &&
                    holdOrdersEnabled ? (
                      <button
                        type="button"
                        className="touch-pos-v1__secondary"
                        onClick={() => {
                          void openAccountAndSendToKitchen();
                        }}
                        disabled={
                          saving || cart.length === 0
                        }
                      >
                        <ChefHat size={18} />
                        Enviar a cocina
                      </button>
                    ) : null}

                    {holdOrdersEnabled ? (
                      <button
                        type="button"
                        className="touch-pos-v1__secondary"
                        onClick={() => {
                          void saveToHold();
                        }}
                        disabled={
                          saving || cart.length === 0
                        }
                      >
                        {openAccountActionLabel}
                      </button>
                    ) : null}
                  </>
                )}
              </div>
            </aside>
          </div>
        )}



        {priceOverrideProduct ? (
          <div
            className="pos-price-override__backdrop"
            role="presentation"
            onMouseDown={(event) => {
              if (event.target === event.currentTarget) {
                closePriceOverride();
              }
            }}
          >
            <section
              className="pos-price-override__modal"
              role="dialog"
              aria-modal="true"
            >
              <div className="pos-price-override__header">
                <div>
                  <span>PRECIO AUTORIZADO</span>
                  <h2>{priceOverrideProduct.name}</h2>
                </div>

                <button
                  type="button"
                  className="secondary-button"
                  onClick={closePriceOverride}
                >
                  Cerrar
                </button>
              </div>

              <label>
                Nuevo precio
                <input
                  autoFocus
                  type="text"
                  inputMode="decimal"
                  value={priceOverrideInput}
                  onChange={(event) => {
                    const value = event.target.value;

                    if (/^\d*[.,]?\d{0,2}$/.test(value)) {
                      setPriceOverrideInput(value);
                      setError('');
                    }
                  }}
                />
              </label>

              <label>
                Motivo
                <textarea
                  value={priceOverrideReason}
                  onChange={(event) =>
                    setPriceOverrideReason(
                      event.target.value.slice(0, 255),
                    )
                  }
                  rows={3}
                />
              </label>

              <div className="pos-price-override__actions">
                <button
                  type="button"
                  className="secondary-button"
                  onClick={closePriceOverride}
                >
                  Cancelar
                </button>

                <button
                  type="button"
                  onClick={confirmPriceOverride}
                >
                  Aplicar precio
                </button>
              </div>
            </section>
          </div>
        ) : null}

        {weightProduct ? (
          <div className="pos-weight-modal-backdrop">
            <section className="pos-weight-modal">
              <div className="pos-weight-modal__header">
                <div>
                  <span>PRODUCTO A GRANEL</span>
                  <h2>{weightProduct.name}</h2>
                </div>

                <button
                  type="button"
                  className="secondary-button"
                  onClick={closeWeightCapture}
                >
                  Cerrar
                </button>
              </div>

              <div className="pos-weight-capture__modes">
                <button
                  type="button"
                  className={
                    weightCaptureMode === 'QUANTITY'
                      ? 'pos-weight-mode pos-weight-mode--active'
                      : 'pos-weight-mode'
                  }
                  onClick={() => {
                    setWeightCaptureMode('QUANTITY');
                    setWeightInput('');
                    setError('');
                  }}
                >
                  Por peso
                </button>

                <button
                  type="button"
                  className={
                    weightCaptureMode === 'AMOUNT'
                      ? 'pos-weight-mode pos-weight-mode--active'
                      : 'pos-weight-mode'
                  }
                  onClick={() => {
                    setWeightCaptureMode('AMOUNT');
                    setWeightInput('');
                    setError('');
                  }}
                >
                  Por monto
                </button>
              </div>

              <label className="pos-weight-modal__input">
                {weightCaptureMode === 'AMOUNT'
                  ? 'Monto solicitado'
                  : 'Peso'}

                <input
                  autoFocus
                  type="text"
                  inputMode="decimal"
                  value={weightInput}
                  onChange={(event) => {
                    const value = event.target.value;

                    if (/^\d*[.,]?\d{0,3}$/.test(value)) {
                      setWeightInput(value);
                      setError('');
                    }
                  }}
                />
              </label>

              <button
                type="button"
                onClick={confirmWeightCapture}
              >
                Agregar producto
              </button>
            </section>
          </div>
        ) : null}
      {paymentModalOpen ? (
        <div
          className="pos-payment-modal__backdrop"
          role="presentation"
          onMouseDown={(event) => {
            if (event.target === event.currentTarget) {
              closePaymentModal();
            }
          }}
        >
          <section
            className="pos-payment-modal"
            role="dialog"
            aria-modal="true"
            aria-labelledby="pos-payment-modal-title"
          >
            <div className="pos-payment-modal__header">
              <div>
                <span>COBRO</span>
                <h2 id="pos-payment-modal-title">
                  Realizar pago
                </h2>
              </div>

              <button
                type="button"
                className="secondary-button"
                onClick={closePaymentModal}
                disabled={saving}
              >
                Cerrar
              </button>
            </div>

            <div className="pos-payment-modal__summary">
              <div>
                <span>Total a pagar</span>
                <strong>
                  RD$ {paymentModalTotal.toFixed(2)}
                </strong>
              </div>

              <div>
                <span>Forma de pago</span>
                <strong>
                  {selectedPaymentMethod?.name ?? '—'}
                </strong>
              </div>
            </div>

            {isCashPayment ? (
              <>
                <label className="pos-payment-modal__cash">
                  <span>Efectivo recibido</span>
                  <div>
                    <span>RD$</span>
                    <input
                      autoFocus
                      type="text"
                      inputMode="decimal"
                      value={cashTenderedInput}
                      onChange={(event) => {
                        const value = event.target.value;

                        if (/^\d*[.,]?\d{0,2}$/.test(value)) {
                          setCashTenderedInput(value);
                        }
                      }}
                      onKeyDown={(event) => {
                        if (
                          event.key === 'Enter' &&
                          canConfirmPayment
                        ) {
                          event.preventDefault();
                          void confirmPaymentModal();
                        }
                      }}
                      disabled={saving}
                      aria-label="Efectivo recibido"
                    />
                  </div>
                </label>

                <div
                  className={
                    cashTendered >= paymentModalTotal
                      ? 'pos-payment-modal__change pos-payment-modal__change--ready'
                      : 'pos-payment-modal__change'
                  }
                >
                  <span>Devolución</span>
                  <strong>
                    RD$ {cashChange.toFixed(2)}
                  </strong>
                </div>

                {cashTendered < paymentModalTotal ? (
                  <p className="pos-payment-modal__pending">
                    Faltan RD${' '}
                    {roundMoney(
                      paymentModalTotal - cashTendered,
                    ).toFixed(2)}
                  </p>
                ) : null}
              </>
            ) : (
              <div className="pos-payment-modal__non-cash">
                El cobro se registrará con{' '}
                <strong>{selectedPaymentMethod?.name}</strong>.
              </div>
            )}

            <div className="pos-payment-modal__actions">
              <button
                type="button"
                className="secondary-button"
                onClick={closePaymentModal}
                disabled={saving}
              >
                Cancelar
              </button>

              <button
                type="button"
                className="pos-payment-modal__confirm"
                onClick={() => {
                  void confirmPaymentModal();
                }}
                disabled={!canConfirmPayment}
              >
                {saving ? 'Procesando...' : 'Realizar pago'}
              </button>
            </div>
          </section>
        </div>
      ) : null}


      </main>
    );
  }

  return (
    <main
      className="coffee-pos coffee-pos--desktop desktop-pos-v1"
      data-pos-ui-mode="DESKTOP"
    >
      <header className="coffee-pos__header maintenance-header">
        <div className="maintenance-header__content">
          <div className="maintenance-header__icon">
            <ShoppingCart size={20} strokeWidth={1.8} />
          </div>

          <div className="maintenance-header__text">
            <h1>Punto de Venta</h1>
            <p>
              {foodServiceEnabled
                ? 'Servicio en mesa, cuentas abiertas y cobro al cierre.'
                : 'Venta configurable y cuentas en HOLD.'}
            </p>
          </div>
        </div>

        <div className="coffee-pos__tabs">
          <button
            type="button"
            className="secondary-button"
            onClick={() => {
              if (mode === 'HOLD') {
                setMode('POS');
                setSelectedAccount(null);
                setCart([]);
                setCustomerAlias(DEFAULT_CUSTOMER_ALIAS);
                setTableReference('');
                setPaymentReference('');
                setError('');
                setMessage('');
                return;
              }

              navigate('/dashboard');
            }}
          >
            <House size={14} />
            {mode === 'HOLD' ? 'Volver al POS' : 'Menú principal'}
          </button>

          <button
            type="button"
            className={mode === 'POS' ? 'active' : ''}
            onClick={() => {
              setMode('POS');
              setError('');
              setMessage('');
            }}
          >
            <Coffee size={17} />
            {newSaleLabel}
          </button>

          {kitchenTicketsEnabled ? (
            <button
              type="button"
              onClick={() => navigate('/kitchen')}
            >
              <ChefHat size={17} />
              Cocina
            </button>
          ) : null}

          {holdOrdersEnabled ? (
            <button
              type="button"
              className={mode === 'HOLD' ? 'active' : ''}
              onClick={() => {
                setMode('HOLD');
                setSelectedAccount(null);
                setCart([]);
                setCustomerAlias(DEFAULT_CUSTOMER_ALIAS);
                setTableReference('');
                setError('');
                setMessage('');
              }}
            >
              <WalletCards size={17} />
              {openAccountsLabel} ({accounts.length})
            </button>
          ) : null}
        </div>
      </header>

      {error ? <div className="operations-error">{error}</div> : null}
      {message ? <div className="operations-success">{message}</div> : null}
      {capabilitiesLoading ? (
        <div className="operations-success">
          Cargando configuración del punto de venta...
        </div>
      ) : null}

      {mode === 'HOLD' ? (
        <section className="coffee-hold-board">
          <div className="food-service-board__header">
            <div>
              <span>{foodServiceEnabled ? 'SERVICIO' : 'CUENTAS'}</span>
              <h2>{openAccountsLabel}</h2>
              <p>
                {foodServiceEnabled
                  ? 'Gestiona mesas, consumos, pre-facturas y cobros pendientes.'
                  : 'Gestiona las cuentas pendientes del punto de venta.'}
              </p>
            </div>
          </div>

          {accounts.length === 0 ? (
            <div className="operations-empty">
              {foodServiceEnabled
                ? 'No hay mesas o cuentas abiertas.'
                : 'No hay cuentas abiertas.'}
            </div>
          ) : (
            <div className="coffee-account-grid">
              {accounts.map((account) => (
                <article className="coffee-account-card" key={account.id}>
                  <div>
                    <strong>{account.reference}</strong>
                    <span className="coffee-status">Abierta</span>
                  </div>

                  {foodServiceEnabled && tablesEnabled ? (
                    <div className="food-service-account__table">
                      {account.tableReference ?? 'Sin mesa'}
                    </div>
                  ) : null}

                  <div className="pos-sale-mode-badge">
                    {saleModeLabel(account.saleMode)}
                  </div>

                  <h3>{account.customerAlias}</h3>

                  {!foodServiceEnabled && tablesEnabled ? (
                    <p>{account.tableReference ?? 'Sin mesa'}</p>
                  ) : null}

                  <p>{account.cashRegisterName ?? 'Caja POS'}</p>

                  <div className="coffee-account-lines">
                    {account.items.map((item) => (
                      <span key={item.id}>
                        {formatSaleQuantity(item.quantity, item.saleUnit)} × {item.productName}
                      </span>
                    ))}
                  </div>

                  <div className="coffee-account-total">
                    <span>Total</span>
                    <strong>RD$ {account.total.toFixed(2)}</strong>
                  </div>

                  <div className="coffee-account-actions">
                      <button
                        type="button"
                        className="secondary-button"
                        onClick={() => {
                          printPosPreInvoice(account, printBusinessIdentity);
                        }}
                      >
                        <Printer size={16} />
                        Pre-factura
                      </button>

                      <button
                        type="button"
                        onClick={() => openHoldAccount(account)}
                      >
                        {foodServiceEnabled
                          ? 'Continuar cuenta'
                          : 'Abrir cuenta'}
                      </button>
                    </div>
                </article>
              ))}
            </div>
          )}
        </section>
      ) : (
        <section className="coffee-pos__layout">

          <div className="pos-tablet-category-launcher">
            <div className="pos-tablet-category-launcher__heading">
              <div>
                <strong>Agregar productos</strong>
                <span>Selecciona una categoría</span>
              </div>

              <div className="pos-tablet-category-launcher__cart">
                <ShoppingCart size={16} />
                <span>{cartLineCount}</span>
              </div>
            </div>

            <div className="pos-tablet-category-launcher__grid">
              <button
                type="button"
                className="pos-tablet-category-button"
                onClick={() => {
                  setCategoryId('');
                  setTabletCatalogOpen(true);
                }}
              >
                <Grid2X2 size={20} />
                <span>Todos</span>
              </button>

              {categories.map((category) => (
                <button
                  type="button"
                  key={category.id}
                  className="pos-tablet-category-button"
                  onClick={() => {
                    setCategoryId(category.id);
                    setTabletCatalogOpen(true);
                  }}
                >
                  <CategoryIcon
                    iconCode={category.iconCode}
                    size={20}
                  />
                  <span>{category.name}</span>
                </button>
              ))}
            </div>
          </div>

          <section
            className={
              tabletCatalogOpen
                ? 'coffee-pos__catalog pos-touch-catalog pos-tablet-catalog--open'
                : 'coffee-pos__catalog pos-touch-catalog'
            }
          >
            <div className="pos-tablet-catalog__header">
              <div>
                <span>CATÁLOGO</span>
                <strong>
                  {categoryId
                    ? categories.find(
                        (category) => category.id === categoryId,
                      )?.name ?? 'Productos'
                    : 'Todos los productos'}
                </strong>
              </div>

              <button
                type="button"
                className="secondary-button"
                onClick={() => setTabletCatalogOpen(false)}
              >
                Cerrar
              </button>
            </div>
            <div className="pos-barcode-scanner">
              <label htmlFor="pos-barcode-input">
                Código de barras
              </label>
              <div className="operations-search">
                <Search size={18} />
                <input
                  id="pos-barcode-input"
                  ref={barcodeInputRef}
                  autoFocus
                  value={barcodeInput}
                  onChange={(event) =>
                    setBarcodeInput(event.target.value)
                  }
                  onKeyDown={(event) => {
                    if (event.key === 'Enter') {
                      event.preventDefault();
                      handleBarcodeScan();
                    }
                  }}
                  placeholder="Escanea el código y presiona Enter"
                  autoComplete="off"
                  inputMode="numeric"
                />
              </div>
              <div className="pos-barcode-scanner__status" aria-live="polite">
                <span className="pos-barcode-scanner__ready">
                  Lector listo
                </span>
                {lastScannedProduct ? (
                  <span>
                    Último escaneo: <strong>{lastScannedProduct}</strong>
                  </span>
                ) : (
                  <span>
                    Escanea el código y el artículo se agregará al carrito.
                  </span>
                )}
              </div>
            </div>

            <div className="operations-search">
              <Search size={18} />
              <input
                ref={desktopProductSearchRef}
                value={query}
                onChange={(event) => setQuery(event.target.value)}
                onKeyDown={(event) => {
                  if (event.key === 'Enter') {
                    event.preventDefault();

                    window.setTimeout(() => {
                      const firstProduct =
                        document.querySelector<HTMLButtonElement>(
                          '.desktop-pos-v1 .pos-tablet-catalog--open [data-desktop-product]',
                        );

                      firstProduct?.focus();
                    }, 0);
                  }

                  if (event.key === 'Escape') {
                    event.preventDefault();
                    setTabletCatalogOpen(false);
                  }
                }}
                placeholder="Buscar artículo o código"
              />
            </div>

            <div className="operations-filters pos-category-filters">
              <button
                type="button"
                className={
                  !categoryId
                    ? 'operations-filter operations-filter--active'
                    : 'operations-filter'
                }
                onClick={() => setCategoryId('')}
              >
                <Grid2X2 size={14} aria-hidden="true" />
                <span>Todos</span>
              </button>

              {categories.map((category) => (
                <button
                  type="button"
                  key={category.id}
                  className={
                    categoryId === category.id
                      ? 'operations-filter operations-filter--active'
                      : 'operations-filter'
                  }
                  onClick={() => setCategoryId(category.id)}
                  title={category.name}
                >
                  <CategoryIcon
                    iconCode={category.iconCode}
                    size={14}
                  />
                  <span>{category.name}</span>
                </button>
              ))}
            </div>

            <div className="pos-product-view-toolbar">
              <div className="pos-product-view-toolbar__info">
                <strong>Productos</strong>
                <span>
                  {visibleProducts.length}{' '}
                  {visibleProducts.length === 1
                    ? 'artículo'
                    : 'artículos'}
                </span>
              </div>

              <div className="pos-product-view-switch">
                <button
                  type="button"
                  className={
                    productView === 'CARDS'
                      ? 'secondary-button pos-product-view-button active'
                      : 'secondary-button pos-product-view-button'
                  }
                  onClick={() => setProductView('CARDS')}
                  aria-pressed={productView === 'CARDS'}
                >
                  <Grid2X2 size={14} />
                  Cards
                </button>

                <button
                  type="button"
                  className={
                    productView === 'LIST'
                      ? 'secondary-button pos-product-view-button active'
                      : 'secondary-button pos-product-view-button'
                  }
                  onClick={() => setProductView('LIST')}
                  aria-pressed={productView === 'LIST'}
                >
                  <List size={14} />
                  Lista
                </button>
              </div>
            </div>

            <div
              className="desktop-product-table__head"
              aria-hidden="true"
            >
              <span></span>
              <span>Producto</span>
              <span>Categoría</span>
              <span>Existencia</span>
              <span>Precio</span>
            </div>

            <div
              className="retail-product-grid retail-product-grid--list desktop-product-table"
            >
              {paginatedProducts.map((product) => {
                const status = inventoryStatus(product);
                const outOfStock = status === 'OUT_OF_STOCK';

                return (
                  <button
                    type="button"
                    key={product.id}
                    className={
                      outOfStock
                        ? 'retail-product-card retail-product-card--out-of-stock'
                        : 'retail-product-card'
                    }
                    data-desktop-product={product.id}
                    onClick={() =>
                      addProductFromDesktopCatalog(product)
                    }
                    onKeyDown={(event) => {
                      if (
                        event.key === 'ArrowDown' ||
                        event.key === 'ArrowRight'
                      ) {
                        event.preventDefault();
                        moveDesktopProductFocus('NEXT');
                        return;
                      }

                      if (
                        event.key === 'ArrowUp' ||
                        event.key === 'ArrowLeft'
                      ) {
                        event.preventDefault();
                        moveDesktopProductFocus('PREVIOUS');
                        return;
                      }

                      if (event.key === 'Home') {
                        event.preventDefault();
                        moveDesktopProductFocus('FIRST');
                        return;
                      }

                      if (event.key === 'End') {
                        event.preventDefault();
                        moveDesktopProductFocus('LAST');
                        return;
                      }

                      if (event.key === 'Enter') {
                        event.preventDefault();
                        addProductFromDesktopCatalog(product);
                        return;
                      }

                      if (event.key === 'Escape') {
                        event.preventDefault();
                        desktopProductSearchRef.current?.focus();
                        desktopProductSearchRef.current?.select();
                      }
                    }}
                    disabled={outOfStock}
                    aria-disabled={outOfStock}
                    title={
                      outOfStock
                        ? 'Producto agotado'
                        : `Agregar ${product.name}`
                    }
                  >
                    {product.imageUrl ? (
                      <div className="coffee-product-image-wrap">
                        <img
                          src={productImageUrl(product.imageUrl)}
                          alt={product.name}
                          className="coffee-product-image"
                        />
                      </div>
                    ) : (
                      <div className="retail-product-icon">
                        <Coffee size={30} />
                      </div>
                    )}

                    <strong>{product.name}</strong>
                    <span>{product.categoryName}</span>

                    {product.trackInventory ? (
                      <small>
                        Stock: {formatQuantity(product.stockQuantity, product)}{' '}
                        {quantityLabel(product)}
                      </small>
                    ) : (
                      <small>Sin control de stock</small>
                    )}

                    {status === 'OUT_OF_STOCK' ? (
                      <span className="inventory-alert inventory-alert--out">
                        Agotado
                      </span>
                    ) : null}

                    {status === 'LOW_STOCK' ? (
                      <span className="inventory-alert inventory-alert--low">
                        Stock bajo
                      </span>
                    ) : null}

                    <b>
                      RD$ {product.price.toFixed(2)}
                      {product.saleUnit === 'WEIGHT'
                        ? ' / kg'
                        : product.saleUnit === 'VOLUME'
                          ? ' / L'
                          : product.saleUnit === 'SERVICE'
                            ? ' / servicio'
                            : ''}
                    </b>
                  </button>
                );
              })}
            </div>

            {visibleProducts.length > 0 ? (
              <nav
                className="pos-product-pagination"
                aria-label="Paginación de productos"
              >
                <div className="pos-product-pagination__summary">
                  <span>
                    Página <strong>{productPage}</strong> de{' '}
                    <strong>{productTotalPages}</strong>
                  </span>

                  <span>
                    Mostrando{' '}
                    <strong>
                      {(productPage - 1) * productPageSize + 1}
                    </strong>
                    {'–'}
                    <strong>
                      {Math.min(
                        productPage * productPageSize,
                        visibleProducts.length,
                      )}
                    </strong>{' '}
                    de <strong>{visibleProducts.length}</strong>
                  </span>
                </div>

                <label className="pos-product-pagination__size">
                  Mostrar
                  <select
                    value={productPageSize}
                    onChange={(event) =>
                      setProductPageSize(
                        Number(event.target.value),
                      )
                    }
                  >
                    <option value={10}>10</option>
                    <option value={15}>15</option>
                    <option value={20}>20</option>
                    <option value={30}>30</option>
                    <option value={50}>50</option>
                  </select>
                </label>

                <div className="pos-product-pagination__controls">
                  <button
                    type="button"
                    className="secondary-button"
                    onClick={() =>
                      setProductPage((current) =>
                        Math.max(1, current - 1),
                      )
                    }
                    disabled={productPage <= 1}
                  >
                    <ChevronLeft size={14} />
                    Anterior
                  </button>

                  <button
                    type="button"
                    className="secondary-button"
                    onClick={() =>
                      setProductPage((current) =>
                        Math.min(
                          productTotalPages,
                          current + 1,
                        ),
                      )
                    }
                    disabled={
                      productPage >= productTotalPages
                    }
                  >
                    Siguiente
                    <ChevronRight size={14} />
                  </button>
                </div>
              </nav>
            ) : null}
            <div className="pos-tablet-catalog__footer">
              <div>
                <span>Carrito</span>
                <strong>
                  {cartLineCount}{' '}
                  {cartLineCount === 1 ? 'artículo' : 'artículos'}
                  {' · '}
                  RD$ {cartTotal.toFixed(2)}
                </strong>
              </div>

              <button
                type="button"
                onClick={() => setTabletCatalogOpen(false)}
              >
                Ver carrito
              </button>
            </div>
          </section>

          <aside className="coffee-pos__cart pos-touch-order">
            <div className="retail-cart__title">
              <div className="retail-cart__title-main">
                <ShoppingCart size={21} />
                <h2>
                  {selectedAccount
                    ? foodServiceEnabled
                      ? `Cuenta ${selectedAccount.reference}`
                      : selectedAccount.reference
                    : foodServiceEnabled
                      ? 'Nueva orden'
                      : 'Carrito'}
                </h2>
                <span className="retail-cart__count">
                  {cartLineCount}{' '}
                  {cartLineCount === 1 ? 'artículo' : 'artículos'}
                  {cartLineCount > 0
                    ? ` · ${formatQuantity(cartQuantityTotal, { saleUnit: 'WEIGHT' })} ítems`
                    : ''}
                </span>

                <span
                  className="pos-mode-badge"
                  title={
                    [
                      retailEnabled ? 'Retail' : null,
                      foodServiceEnabled ? 'Food Service' : null,
                      weightedProductsEnabled ? 'Productos por peso' : null,
                      tablesEnabled ? 'Mesas' : null,
                      holdOrdersEnabled ? 'HOLD' : null,
                      kitchenTicketsEnabled ? 'Kitchen Tickets' : null,
                    ]
                      .filter(Boolean)
                      .join(' · ') || 'POS estándar'
                  }
                >
                  POS
                </span>
              </div>

              <div className="desktop-pos-v2__toolbar">
                <button
                  type="button"
                  className="desktop-pos-v2__products-button"
                  onClick={() => {
                    setProductView('LIST');
                    setTabletCatalogOpen(true);

                    window.setTimeout(() => {
                      desktopProductSearchRef.current?.focus();
                      desktopProductSearchRef.current?.select();
                    }, 50);
                  }}
                >
                  <Grid2X2 size={15} />
                  Productos
                </button>

                {cart.length > 0 ? (
                  <button
                    type="button"
                    className="retail-cart__clear"
                    onClick={clearCart}
                    disabled={saving}
                  >
                    <Trash2 size={15} />
                    Vaciar carrito
                  </button>
                ) : null}
              </div>
            </div>

            <div className="retail-cart__context pos-touch-order__context">
            {foodServiceEnabled && tablesEnabled ? (
              <label className="food-service-table-field">
                Mesa o referencia
                <input
                  value={tableReference}
                  disabled={Boolean(selectedAccount)}
                  onChange={(event) => setTableReference(event.target.value)}
                  placeholder="Ej. Mesa 12"
                />
              </label>
            ) : null}

            <div className="pos-sale-mode">
              <span className="pos-sale-mode__label">
                Modalidad de venta
              </span>

              <div className="pos-sale-mode__options">
                {SALE_MODES.map((item) => {
                  const active = saleMode === item.value;

                  return (
                    <button
                      key={item.value}
                      type="button"
                      className={
                        active
                          ? 'secondary-button pos-sale-mode__option pos-sale-mode__option--active'
                          : 'secondary-button pos-sale-mode__option'
                      }
                      onClick={() => setSaleMode(item.value)}
                      disabled={Boolean(selectedAccount) || saving}
                      title={item.description}
                    >
                      <strong>{item.label}</strong>
                      <small>{item.description}</small>
                    </button>
                  );
                })}
              </div>

              {selectedAccount ? (
                <small className="pos-sale-mode__locked">
                  La modalidad quedó fijada al abrir esta cuenta.
                </small>
              ) : null}
            </div>

            <div className="desktop-pos-v4__financial-panel">
              <div>
                <span>Subtotal</span>
                <strong>
                  RD$ {cartFinancialPreview.subtotal.toFixed(2)}
                </strong>
              </div>

              <div>
                <span>ITBIS</span>
                <strong>
                  RD$ {cartFinancialPreview.taxAmount.toFixed(2)}
                </strong>
              </div>

              {cartFinancialPreview.serviceChargeAmount > 0 ? (
                <div>
                  <span>Servicio</span>
                  <strong>
                    RD$ {cartFinancialPreview.serviceChargeAmount.toFixed(2)}
                  </strong>
                </div>
              ) : null}

              <div className="desktop-pos-v4__financial-total">
                <span>Total</span>
                <strong>RD$ {cartTotal.toFixed(2)}</strong>
              </div>
            </div>

            <label className="desktop-pos-v5__customer">
              Cliente registrado
              <select
                value={customerId}
                disabled={Boolean(selectedAccount) || saving}
                onChange={(event) => {
                  const nextCustomerId = event.target.value;
                  const customer = customers.find(
                    (item) => item.customerId === nextCustomerId,
                  );

                  setCustomerId(nextCustomerId);
                  setCustomerAlias(
                    customer?.customerName ?? DEFAULT_CUSTOMER_ALIAS,
                  );
                }}
              >
                <option value="">Consumidor final / alias</option>
                {customers.map((customer) => (
                  <option
                    key={customer.customerId}
                    value={customer.customerId}
                  >
                    {customer.customerName} ·{' '}
                    {customer.priceLevelName ?? 'Nivel predeterminado'}
                  </option>
                ))}
              </select>
            </label>

            <label className="desktop-pos-v5__customer-name">
              Nombre para el comprobante
              <input
                value={customerAlias}
                disabled={Boolean(customerId) || Boolean(selectedAccount)}
                onChange={(event) => setCustomerAlias(event.target.value)}
                placeholder={DEFAULT_CUSTOMER_ALIAS}
              />
            </label>

            <label className="desktop-pos-v13__payment-method">
              Método de pago
              <select
                value={paymentMethodId}
                onChange={(event) =>
                  setPaymentMethodId(event.target.value)
                }
              >
                {orderedPaymentMethods.map((method) => (
                  <option key={method.id} value={method.id}>
                    {method.name}
                  </option>
                ))}
              </select>
            </label>

            <label className="desktop-pos-v13__payment-reference">
              Referencia de pago
              <input
                value={paymentReference}
                onChange={(event) =>
                  setPaymentReference(event.target.value)
                }
                placeholder="Opcional"
              />
            </label>

            {!foodServiceEnabled && tablesEnabled ? (
              <label>
                Mesa o referencia
                <input
                  value={tableReference}
                  disabled={Boolean(selectedAccount)}
                  onChange={(event) => setTableReference(event.target.value)}
                  placeholder="Opcional"
                />
              </label>
            ) : null}

            <label className="desktop-pos-v5__register">
              Caja
              <select
                value={registerId}
                disabled={Boolean(selectedAccount)}
                onChange={(event) => setRegisterId(event.target.value)}
              >
                {registers.map((register) => (
                  <option key={register.id} value={register.id}>
                    {register.name}
                  </option>
                ))}
              </select>
            </label>

            </div>

            <div className="retail-cart__scroll pos-touch-order__items">
              <div className="retail-cart__table">
                <div className="retail-cart__table-head" aria-hidden="true">
                  <span>Artículo</span>
                  <span>Precio</span>
                  <span>Cantidad</span>
                  <span>Impuesto</span>
                  <span>Subtotal</span>
                  <span>Acción</span>
                </div>

                <div className="retail-cart__items">
                  {cart.length === 0 ? (
                    <p className="muted retail-cart__empty">
                      {selectedAccount
                        ? 'Selecciona artículos para agregarlos al consumo de esta cuenta.'
                        : 'Selecciona artículos del catálogo.'}
                    </p>
                  ) : (
                    cart.map((item) => (
                      <article
                        className="retail-cart__item"
                        key={item.id}
                        data-cart-product-id={item.id}
                      >
                        <div className="retail-cart__product-cell">
                          <strong>{item.name}</strong>
                        </div>

                        <span className="retail-cart__price-cell">
                          RD$ {item.price.toFixed(2)}
                        </span>

                        

                        <div className="desktop-pos-v8__quantity-cell">
                        <div className="quantity-control">
                          <button
                            type="button"
                            onClick={() => changeQuantity(item.id, -1)}
                            disabled={item.saleUnit === 'WEIGHT'}
                            aria-label={`Restar cantidad de ${item.name}`}
                          >
                            <Minus size={14} />
                          </button>

                          <input
                            className="quantity-input"
                            data-quantity-product-id={item.id}
                            type="number"
                            min={
                              item.saleUnit === 'UNIT' ||
                              item.saleUnit === 'SERVICE'
                                ? 1
                                : 0.001
                            }
                            step={
                              item.saleUnit === 'UNIT' ||
                              item.saleUnit === 'SERVICE'
                                ? 1
                                : 0.001
                            }
                            max={
                              item.trackInventory
                                ? item.stockQuantity
                                : undefined
                            }
                            value={formatQuantity(item.quantity, item)}
                            onChange={(event) =>
                              setManualQuantity(
                                item.id,
                                event.target.value,
                              )
                            }
                            inputMode={
                              item.saleUnit === 'UNIT' ||
                              item.saleUnit === 'SERVICE'
                                ? 'numeric'
                                : 'decimal'
                            }
                            aria-label={`Cantidad de ${item.name}`}
                          />

                          <button
                            type="button"
                            onClick={() => changeQuantity(item.id, 1)}
                            disabled={item.saleUnit === 'WEIGHT'}
                            aria-label={`Sumar cantidad de ${item.name}`}
                          >
                            <Plus size={14} />
                          </button>
                        </div>

                        <span className="desktop-pos-v8__quantity-unit">
                          {(() => {
                            const unit = quantityLabel(item)
                              .trim()
                              .toLowerCase()
                              .replace(/\.$/, '');

                            if (
                              unit === 'ud' ||
                              unit === 'unidad' ||
                              unit === 'unidades'
                            ) {
                              return 'Ud';
                            }

                            if (
                              unit === 'kg' ||
                              unit === 'kilogramo' ||
                              unit === 'kilogramos'
                            ) {
                              return 'Kg';
                            }

                            if (
                              unit === 'lb' ||
                              unit === 'libra' ||
                              unit === 'libras'
                            ) {
                              return 'Lb';
                            }

                            if (
                              unit === 'l' ||
                              unit === 'lt' ||
                              unit === 'litro' ||
                              unit === 'litros'
                            ) {
                              return 'L';
                            }

                            if (
                              unit === 'servicio' ||
                              unit === 'servicios'
                            ) {
                              return 'Serv';
                            }

                            return quantityLabel(item);
                          })()}
                        </span>
                      </div>


                                                <span className="desktop-pos-v9__tax-cell">
                          RD$ 0.00
                        </span>

<strong className="retail-cart__subtotal-cell">
                          RD$ {(item.price * item.quantity).toFixed(2)}
                        </strong>

                        <div className="desktop-pos-v2__line-actions">
                          {canOverridePrice ? (
                            <>
                              <button
                                type="button"
                                className="desktop-pos-v2__action-button"
                                onClick={() => openPriceOverride(item)}
                                title="Cambiar precio manualmente"
                                aria-label={`Cambiar precio de ${item.name}`}
                              >
                                <Pencil size={15} />
                              </button>

                              <button
                                type="button"
                                className="desktop-pos-v2__action-button desktop-pos-v2__action-button--level"
                                onClick={() => {
                                  void openPriceLevelSelector(item);
                                }}
                                title="Seleccionar nivel de precio"
                                aria-label={`Seleccionar nivel de precio de ${item.name}`}
                              >
                                $
                              </button>
                            </>
                          ) : null}

                          <button
                            type="button"
                            className="desktop-pos-v2__action-button desktop-pos-v2__action-button--remove"
                            onClick={() => removeCartItem(item.id)}
                            title="Eliminar producto"
                            aria-label={`Quitar ${item.name} del carrito`}
                          >
                            <Trash2 size={15} />
                          </button>
                        </div>
                      </article>
                    ))
                  )}
                </div>

                {selectedAccount ? (
                  <div className="selected-account-existing">
                    <h3>Consumo acumulado</h3>

                    {selectedAccount.items.map((item) => (
                      <div key={item.id}>
                        <span>
                          {formatSaleQuantity(item.quantity, item.saleUnit)} × {item.productName}
                        </span>
                        <strong>RD$ {item.lineTotal.toFixed(2)}</strong>
                      </div>
                    ))}
                  </div>
                ) : null}
              </div>
            </div>

            <div className="desktop-pos-v3__table-summary">
              <span>
                Artículos:
                <strong>{cartLineCount}</strong>
              </span>

              <span>
                Bultos:
                <strong>
                  {formatQuantity(
                    cartQuantityTotal,
                    { saleUnit: 'WEIGHT' },
                  )}
                </strong>
              </span>
            </div>

            {selectedAccount ? (
              <div className="selected-account-summary pos-financial-summary">
                <div>
                  <span>Subtotal acumulado</span>
                  <strong>
                    RD$ {selectedAccount.subtotal.toFixed(2)}
                  </strong>
                </div>

                <div>
                  <span>ITBIS</span>
                  <strong>
                    RD$ {selectedAccount.taxAmount.toFixed(2)}
                  </strong>
                </div>

                {selectedAccount.serviceChargeAmount > 0 ? (
                  <div>
                    <span>
                      Servicio{' '}
                      {(selectedAccount.serviceChargeRate * 100).toFixed(2)}%
                    </span>
                    <strong>
                      RD$ {selectedAccount.serviceChargeAmount.toFixed(2)}
                    </strong>
                  </div>
                ) : null}

                <div className="pos-financial-summary__total">
                  <span>Total acumulado</span>
                  <strong>
                    RD$ {selectedAccount.total.toFixed(2)}
                  </strong>
                </div>
              </div>
            ) : null}

            <div className="retail-cart__checkout pos-touch-order__checkout">


            {selectedAccount ? (
              <>
                <button
                  type="button"
                  onClick={() => {
                    void addToSelectedAccount();
                  }}
                  disabled={saving || cart.length === 0}
                >
                  Agregar a la cuenta
                </button>

                {kitchenTicketsEnabled ? (
                  <button
                    type="button"
                    className="secondary-button pos-send-kitchen-button"
                    onClick={() => {
                      void sendSelectedAccountToKitchen();
                    }}
                    disabled={saving}
                  >
                    <ChefHat size={17} />
                    {cart.length > 0
                      ? 'Agregar consumo y enviar a cocina'
                      : 'Enviar a cocina'}
                  </button>
                ) : null}

                <button
                  type="button"
                  className="pay-now-button"
                  onClick={() => {
                    openPaymentModal();
                  }}
                  disabled={saving}
                >
                  {cart.length > 0
                    ? 'Agregar consumo y cobrar cuenta'
                    : 'Cobrar cuenta'}
                </button>

                <button
                  type="button"
                  className="secondary-button"
                  onClick={() => {
                    void returnToHold();
                  }}
                  disabled={saving}
                >
                  {foodServiceEnabled
                    ? 'Volver a cuentas'
                    : 'Volver a HOLD'}
                </button>
              </>
            ) : (
              <>
                <button
                  type="button"
                  onClick={() => {
                    openPaymentModal();
                  }}
                  disabled={saving || cart.length === 0}
                >
                  Cobrar ahora
                </button>

                {kitchenTicketsEnabled && holdOrdersEnabled ? (
                  <button
                    type="button"
                    className="secondary-button pos-send-kitchen-button"
                    onClick={() => {
                      void openAccountAndSendToKitchen();
                    }}
                    disabled={saving || cart.length === 0}
                  >
                    <ChefHat size={17} />
                    Abrir cuenta y enviar a cocina
                  </button>
                ) : null}

                {holdOrdersEnabled ? (
                  <button
                    type="button"
                    className="secondary-button"
                    onClick={() => {
                      void saveToHold();
                    }}
                    disabled={saving || cart.length === 0}
                  >
                    {openAccountActionLabel}
                  </button>
                ) : null}
              </>
            )}
            </div>
          </aside>
        </section>
      )}

      {priceLevelProduct ? (
        <div
          className="desktop-price-level__backdrop"
          role="presentation"
          onMouseDown={(event) => {
            if (event.target === event.currentTarget) {
              closePriceLevelSelector();
            }
          }}
        >
          <section
            className="desktop-price-level__modal"
            role="dialog"
            aria-modal="true"
            aria-labelledby="desktop-price-level-title"
          >
            <div className="desktop-price-level__header">
              <div>
                <span>NIVELES AUTORIZADOS</span>
                <h2 id="desktop-price-level-title">
                  {priceLevelProduct.name}
                </h2>
              </div>

              <button
                type="button"
                className="secondary-button"
                onClick={closePriceLevelSelector}
              >
                Cerrar
              </button>
            </div>

            {priceLevelLoading ? (
              <div className="desktop-price-level__loading">
                Cargando niveles de precio...
              </div>
            ) : priceLevelPricing ? (
              <>
                <div className="desktop-price-level__facts">
                  <div>
                    <span>Precio actual</span>
                    <strong>
                      RD$ {priceLevelProduct.price.toFixed(2)}
                    </strong>
                  </div>

                  <div>
                    <span>Precio mínimo</span>
                    <strong>
                      RD$ {priceLevelPricing.minimumPrice.toFixed(2)}
                    </strong>
                  </div>
                </div>

                <div className="desktop-price-level__list">
                  {priceLevelPricing.prices
                    .filter(
                      (row) =>
                        row.active &&
                        row.price >= priceLevelPricing.minimumPrice,
                    )
                    .map((row) => (
                      <button
                        type="button"
                        key={row.priceLevelId}
                        className="desktop-price-level__option"
                        onClick={() =>
                          applyPriceLevel(
                            row.price,
                            row.priceLevelName,
                          )
                        }
                      >
                        <div>
                          <strong>{row.priceLevelName}</strong>
                          <span>
                            {row.priceLevelCode}
                            {row.isDefault
                              ? ' · Predeterminado'
                              : ''}
                          </span>
                        </div>

                        <b>RD$ {row.price.toFixed(2)}</b>
                      </button>
                    ))}
                </div>
              </>
            ) : null}
          </section>
        </div>
      ) : null}

      {paymentModalOpen ? (
        <div
          className="pos-payment-modal__backdrop"
          role="presentation"
          onMouseDown={(event) => {
            if (event.target === event.currentTarget) {
              closePaymentModal();
            }
          }}
        >
          <section
            className="pos-payment-modal"
            role="dialog"
            aria-modal="true"
            aria-labelledby="pos-payment-modal-title"
          >
            <div className="pos-payment-modal__header">
              <div>
                <span>COBRO</span>
                <h2 id="pos-payment-modal-title">
                  Realizar pago
                </h2>
              </div>

              <button
                type="button"
                className="secondary-button"
                onClick={closePaymentModal}
                disabled={saving}
              >
                Cerrar
              </button>
            </div>

            <div className="pos-payment-modal__summary">
              <div>
                <span>Total a pagar</span>
                <strong>
                  RD$ {paymentModalTotal.toFixed(2)}
                </strong>
              </div>

              <div>
                <span>Forma de pago</span>
                <strong>
                  {selectedPaymentMethod?.name ?? '—'}
                </strong>
              </div>
            </div>

            {isCashPayment ? (
              <>
                <label className="pos-payment-modal__cash">
                  <span>Efectivo recibido</span>
                  <div>
                    <span>RD$</span>
                    <input
                      autoFocus
                      type="text"
                      inputMode="decimal"
                      value={cashTenderedInput}
                      onChange={(event) => {
                        const value = event.target.value;

                        if (/^\d*[.,]?\d{0,2}$/.test(value)) {
                          setCashTenderedInput(value);
                        }
                      }}
                      onKeyDown={(event) => {
                        if (
                          event.key === 'Enter' &&
                          canConfirmPayment
                        ) {
                          event.preventDefault();
                          void confirmPaymentModal();
                        }
                      }}
                      disabled={saving}
                      aria-label="Efectivo recibido"
                    />
                  </div>
                </label>

                <div
                  className={
                    cashTendered >= paymentModalTotal
                      ? 'pos-payment-modal__change pos-payment-modal__change--ready'
                      : 'pos-payment-modal__change'
                  }
                >
                  <span>Devolución</span>
                  <strong>
                    RD$ {cashChange.toFixed(2)}
                  </strong>
                </div>

                {cashTendered < paymentModalTotal ? (
                  <p className="pos-payment-modal__pending">
                    Faltan RD${' '}
                    {roundMoney(
                      paymentModalTotal - cashTendered,
                    ).toFixed(2)}
                  </p>
                ) : null}
              </>
            ) : (
              <div className="pos-payment-modal__non-cash">
                El cobro se registrará con{' '}
                <strong>{selectedPaymentMethod?.name}</strong>.
              </div>
            )}

            <div className="pos-payment-modal__actions">
              <button
                type="button"
                className="secondary-button"
                onClick={closePaymentModal}
                disabled={saving}
              >
                Cancelar
              </button>

              <button
                type="button"
                className="pos-payment-modal__confirm"
                onClick={() => {
                  void confirmPaymentModal();
                }}
                disabled={!canConfirmPayment}
              >
                {saving ? 'Procesando...' : 'Realizar pago'}
              </button>
            </div>
          </section>
        </div>
      ) : null}

      {priceOverrideProduct ? (
        <div
          className="pos-price-override__backdrop"
          role="presentation"
          onMouseDown={(event) => {
            if (event.target === event.currentTarget) closePriceOverride();
          }}
        >
          <section
            className="pos-price-override__modal"
            role="dialog"
            aria-modal="true"
            aria-labelledby="pos-price-override-title"
          >
            <div className="pos-price-override__header">
              <div>
                <span>PRECIO AUTORIZADO</span>
                <h2 id="pos-price-override-title">{priceOverrideProduct.name}</h2>
              </div>
              <button type="button" className="secondary-button" onClick={closePriceOverride}>
                Cerrar
              </button>
            </div>

            <div className="pos-price-override__facts">
              <div>
                <span>Precio estándar</span>
                <strong>
                  RD$ {(priceOverrideProduct.standardPrice ?? priceOverrideProduct.price).toFixed(2)}
                </strong>
              </div>
              <div>
                <span>Precio actual</span>
                <strong>RD$ {priceOverrideProduct.price.toFixed(2)}</strong>
              </div>
            </div>

            <label>
              Nuevo precio
              <input
                autoFocus
                type="text"
                inputMode="decimal"
                value={priceOverrideInput}
                onChange={(event) => {
                  const value = event.target.value;
                  if (/^\d*[.,]?\d{0,2}$/.test(value)) {
                    setPriceOverrideInput(value);
                    setError('');
                  }
                }}
                placeholder="0.00"
              />
            </label>

            <label>
              Motivo
              <textarea
                value={priceOverrideReason}
                onChange={(event) => setPriceOverrideReason(event.target.value.slice(0, 255))}
                placeholder="Indica por qué se modifica el precio"
                maxLength={255}
                rows={3}
              />
            </label>

            <div className="pos-price-override__actions">
              <button type="button" className="secondary-button" onClick={closePriceOverride}>
                Cancelar
              </button>
              <button type="button" onClick={confirmPriceOverride}>
                Aplicar precio
              </button>
            </div>
          </section>
        </div>
      ) : null}

      {weightProduct ? (
        <div
          className="pos-weight-modal-backdrop"
          role="presentation"
          onMouseDown={(event) => {
            if (event.target === event.currentTarget) closeWeightCapture();
          }}
        >
          <section
            className="pos-weight-modal"
            role="dialog"
            aria-modal="true"
            aria-labelledby="pos-weight-modal-title"
          >
            <div className="pos-weight-modal__header">
              <div>
                <span>PRODUCTO A GRANEL</span>
                <h2 id="pos-weight-modal-title">{weightProduct.name}</h2>
              </div>
              <button
                type="button"
                className="secondary-button"
                onClick={closeWeightCapture}
              >
                Cerrar
              </button>
            </div>

            <div className="pos-weight-modal__facts">
              <div>
                <span>Precio por kg</span>
                <strong>
                  RD$ {weightCaptureEffectivePrice().toFixed(2)}
                </strong>
              </div>
              <div>
                <span>Stock disponible</span>
                <strong>
                  {weightProduct.trackInventory
                    ? `${formatQuantity(weightProduct.stockQuantity, weightProduct)} kg`
                    : 'Sin control'}
                </strong>
              </div>
            </div>

            <div className="pos-weight-capture__modes">
              <button
                type="button"
                className={
                  weightCaptureMode === 'QUANTITY'
                    ? 'pos-weight-mode pos-weight-mode--active'
                    : 'pos-weight-mode'
                }
                onClick={() => {
                  setWeightCaptureMode('QUANTITY');
                  setWeightInput('');
                  setError('');
                }}
              >
                Por peso
              </button>

              <button
                type="button"
                className={
                  weightCaptureMode === 'AMOUNT'
                    ? 'pos-weight-mode pos-weight-mode--active'
                    : 'pos-weight-mode'
                }
                onClick={() => {
                  setWeightCaptureMode('AMOUNT');
                  setWeightInput('');
                  setError('');
                }}
              >
                Por monto
              </button>
            </div>

            <label className="pos-weight-modal__input">
              {weightCaptureMode === 'AMOUNT' ? 'Monto solicitado' : 'Peso'}
              <div>
                <input
                  autoFocus
                  type="text"
                  inputMode="decimal"
                  value={weightInput}
                  onChange={(event) => {
                    const value = event.target.value;
                    if (
                      weightCaptureMode === 'AMOUNT'
                        ? /^\d*[.,]?\d{0,2}$/.test(value)
                        : /^\d*[.,]?\d{0,3}$/.test(value)
                    ) {
                      setWeightInput(value);
                      setError('');
                    }
                  }}
                  onKeyDown={(event) => {
                    if (event.key === 'Enter') {
                      event.preventDefault();
                      confirmWeightCapture();
                    }
                    if (event.key === 'Escape') {
                      event.preventDefault();
                      closeWeightCapture();
                    }
                  }}
                  placeholder={weightCaptureMode === 'AMOUNT' ? '0.00' : '0.000'}
                  aria-label={
                    weightCaptureMode === 'AMOUNT'
                      ? 'Monto solicitado'
                      : 'Peso en kilogramos'
                  }
                />
                <span>{weightCaptureMode === 'AMOUNT' ? 'RD$' : 'kg'}</span>
              </div>
            </label>

            <div className="pos-weight-modal__facts">
              <div>
                <span>Cantidad calculada</span>
                <strong>
                  {weightCaptureQuantity() !== null
                    ? `${formatQuantity(weightCaptureQuantity()!, weightProduct)} kg`
                    : '—'}
                </strong>
              </div>
              <div>
                <span>Importe estimado</span>
                <strong>RD$ {weightCaptureAmount().toFixed(2)}</strong>
              </div>
            </div>

            <div className="pos-weight-modal__actions">
              <button
                type="button"
                className="secondary-button"
                onClick={closeWeightCapture}
              >
                Cancelar
              </button>
              <button
                type="button"
                onClick={confirmWeightCapture}
                disabled={weightCaptureQuantity() === null}
              >
                Agregar al carrito
              </button>
            </div>
          </section>
        </div>
      ) : null}
    </main>
  );
}

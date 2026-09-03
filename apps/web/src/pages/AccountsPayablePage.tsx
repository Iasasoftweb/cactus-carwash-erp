import {
  AlertTriangle,
  Banknote,
  CalendarClock,
  Clock3,
  FileText,
  Plus,
  RefreshCcw,
  Search,
  TrendingDown,
  UsersRound,
  WalletCards,
} from 'lucide-react';
import {
  FormEvent,
  useEffect,
  useMemo,
  useState,
} from 'react';
import {
  useNavigate,
  useSearchParams,
} from 'react-router-dom';
import type {
  AccountsPayableReportResponse,
  CreateSupplierInvoiceRequest,
  CreateSupplierPaymentRequest,
  CashRegisterSummaryResponse,
  PaymentMethodResponse,
  PointOfSaleResponse,
  PurchaseOrderResponse,
  SupplierInvoiceResponse,
  SupplierPaymentResponse,
  SupplierResponse,
} from '@cactus/shared';
import { api } from '../lib/api';
import ExcelJS from 'exceljs';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import './styles/AccountsPayablePage.dashboard.css';

type InvoiceStatusFilter =
  | 'ALL'
  | SupplierInvoiceResponse['status'];

type InvoiceFormState = {
  supplierId: string;
  purchaseOrderId: string;
  invoiceNumber: string;
  subtotal: string;
  taxAmount: string;
  issuedAt: string;
  dueDate: string;
  notes: string;
};

type PaymentFormState = {
  paymentMethodId: string;
  amount: string;
  reference: string;
  description: string;
};

type JsPdfWithAutoTable = jsPDF & {
  lastAutoTable?: {
    finalY: number;
  };
};

const today =
  new Date().toISOString().slice(0, 10);

const EMPTY_INVOICE: InvoiceFormState = {
  supplierId: '',
  purchaseOrderId: '',
  invoiceNumber: '',
  subtotal: '',
  taxAmount: '0',
  issuedAt: today,
  dueDate: '',
  notes: '',
};

const EMPTY_PAYMENT: PaymentFormState = {
  paymentMethodId: '',
  amount: '',
  reference: '',
  description: '',
};

const STATUS_LABELS: Record<
  SupplierInvoiceResponse['status'],
  string
> = {
  PENDING: 'Pendiente',
  PARTIALLY_PAID: 'Pago parcial',
  PAID: 'Pagada',
  CANCELLED: 'Cancelada',
};


function numberValue(value: string): number {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : 0;
}

export function AccountsPayablePage() {



  const navigate = useNavigate();

  const [searchParams] = useSearchParams();

const dashboardView =
  searchParams.get('view');

  const [points, setPoints] =
    useState<PointOfSaleResponse[]>([]);
  const [pointId, setPointId] = useState('');
  const [suppliers, setSuppliers] =
    useState<SupplierResponse[]>([]);
  const [orders, setOrders] =
    useState<PurchaseOrderResponse[]>([]);
  const [invoices, setInvoices] =
    useState<SupplierInvoiceResponse[]>([]);
  const [payments, setPayments] =
    useState<SupplierPaymentResponse[]>([]);
  const [paymentMethods, setPaymentMethods] =
    useState<PaymentMethodResponse[]>([]);
  const [cashRegisters, setCashRegisters] =
    useState<CashRegisterSummaryResponse[]>([]);
  const [cashRegisterId, setCashRegisterId] =
    useState('');

  const [selectedInvoiceId, setSelectedInvoiceId] =
    useState('');
  const [query, setQuery] = useState('');
  const [statusFilter, setStatusFilter] =
    useState<InvoiceStatusFilter>('ALL');
  const [supplierFilter, setSupplierFilter] =
    useState('');
  const [invoiceForm, setInvoiceForm] =
    useState<InvoiceFormState>(EMPTY_INVOICE);
  const [paymentForm, setPaymentForm] =
    useState<PaymentFormState>(EMPTY_PAYMENT);

  const [loading, setLoading] = useState(true);
  const [savingInvoice, setSavingInvoice] =
    useState(false);
  const [savingPayment, setSavingPayment] =
    useState(false);
  const [invoiceModalOpen, setInvoiceModalOpen] =
    useState(false);
  const [paymentModalOpen, setPaymentModalOpen] =
    useState(false);
  const [error, setError] = useState('');
  const [message, setMessage] = useState('');
  const [report, setReport] =
    useState<AccountsPayableReportResponse | null>(null);
  const [reportLoading, setReportLoading] = useState(false);
  const [reportFilters, setReportFilters] = useState({
    dateFrom: '',
    dateTo: '',
    supplierId: '',
  });

  const selectedPoint = useMemo(
    () =>
      points.find(
        (point) => point.id === pointId,
      ) ?? null,
    [points, pointId],
  );

  const companyId =
    selectedPoint?.companyId ?? '';
  const branchId =
    selectedPoint?.branchId ?? '';

  const selectedInvoice = useMemo(
    () =>
      invoices.find(
        (invoice) =>
          invoice.id === selectedInvoiceId,
      ) ?? null,
    [invoices, selectedInvoiceId],
  );

  const eligibleOrders = useMemo(() => {
    if (!invoiceForm.supplierId) {
      return orders.filter(
        (order) =>
          order.status === 'RECEIVED' ||
          order.status === 'PARTIALLY_RECEIVED',
      );
    }

    return orders.filter(
      (order) =>
        order.supplierId ===
          invoiceForm.supplierId &&
        (order.status === 'RECEIVED' ||
          order.status ===
            'PARTIALLY_RECEIVED'),
    );
  }, [orders, invoiceForm.supplierId]);

  const visibleInvoices = useMemo(() => {
    const normalized =
      query.trim().toLowerCase();

    const now = new Date();
    const dueSoonLimit =
      new Date(now);
    dueSoonLimit.setDate(
      dueSoonLimit.getDate() + 7,
    );

    return invoices.filter((invoice) => {
      if (
        statusFilter !== 'ALL' &&
        invoice.status !== statusFilter
      ) {
        return false;
      }

      if (
        supplierFilter &&
        invoice.supplierId !== supplierFilter
      ) {
        return false;
      }

      if (dashboardView === 'pending') {
        if (
          invoice.balance <= 0 ||
          invoice.status === 'CANCELLED'
        ) {
          return false;
        }
      }

      if (dashboardView === 'overdue') {
        if (
          invoice.balance <= 0 ||
          invoice.status === 'CANCELLED' ||
          !invoice.dueDate
        ) {
          return false;
        }

        if (
          new Date(invoice.dueDate) >= now
        ) {
          return false;
        }
      }

      if (dashboardView === 'due-soon') {
        if (
          invoice.balance <= 0 ||
          invoice.status === 'CANCELLED' ||
          !invoice.dueDate
        ) {
          return false;
        }

        const dueDate =
          new Date(invoice.dueDate);

        if (
          dueDate < now ||
          dueDate > dueSoonLimit
        ) {
          return false;
        }
      }

      if (!normalized) {
        return true;
      }

      return [
        invoice.invoiceNumber,
        invoice.supplierName,
        invoice.purchaseOrderNumber ?? '',
        invoice.notes ?? '',
      ]
        .join(' ')
        .toLowerCase()
        .includes(normalized);
    });
  }, [
    invoices,
    query,
    statusFilter,
    supplierFilter,
    dashboardView,
  ]);

  const totals = useMemo(() => {
    const total = invoices.reduce(
      (sum, invoice) => sum + invoice.total,
      0,
    );

    const balance = invoices.reduce(
      (sum, invoice) => sum + invoice.balance,
      0,
    );

    const overdue = invoices.reduce(
      (sum, invoice) => {
        if (
          invoice.balance <= 0 ||
          invoice.status === 'CANCELLED' ||
          !invoice.dueDate
        ) {
          return sum;
        }

        return new Date(invoice.dueDate) <
          new Date()
          ? sum + invoice.balance
          : sum;
      },
      0,
    );

    return {
      total,
      balance,
      overdue,
    };
  }, [invoices]);

  async function loadContext(
    point: PointOfSaleResponse,
  ): Promise<void> {
    const [
      supplierRows,
      orderRows,
      invoiceRows,
      paymentRows,
      methodRows,
      registerRows,
    ] = await Promise.all([
      api.suppliers(point.companyId),
      api.purchaseOrders(
        point.companyId,
        point.branchId,
      ),
      api.supplierInvoices(
        point.companyId,
        point.branchId,
      ),
      api.supplierPayments(
        point.companyId,
        point.branchId,
      ),
      api.paymentMethods(),
      api.cashRegisters(),
    ]);

    setSuppliers(supplierRows);
    setOrders(orderRows);
    setInvoices(invoiceRows);
    setPayments(paymentRows);
    setPaymentMethods(methodRows);
    setCashRegisters(registerRows);

    const firstSupplier =
      supplierRows.find(
        (supplier) => supplier.active,
      );

    const firstPaymentMethod =
      methodRows[0];

    const pointRegister =
      registerRows.find((register) => {
        const posName =
          register.pointOfSaleName?.toUpperCase() ?? '';
        const pointName =
          point.name.toUpperCase();

        return (
          register.openSession?.status === 'OPEN' &&
          posName === pointName
        );
      }) ??
      registerRows.find(
        (register) =>
          register.openSession?.status === 'OPEN',
      );

    setCashRegisterId(
      pointRegister?.id ?? '',
    );

    setInvoiceForm((current) => ({
      ...current,
      supplierId:
        current.supplierId ||
        firstSupplier?.id ||
        '',
    }));

    setPaymentForm((current) => ({
      ...current,
      paymentMethodId:
        current.paymentMethodId ||
        firstPaymentMethod?.id ||
        '',
    }));
  }

  useEffect(() => {
    setLoading(true);
    setError('');

    api
      .posPoints()
      .then(async (rows) => {
        const initialPoint =
          rows.find((point) => {
            const code =
              point.code?.toUpperCase() ?? '';
            const name =
              point.name.toUpperCase();

            return (
              code.includes('COFFEE') ||
              name.includes('COFFEE')
            );
          }) ?? rows[0];

        setPoints(rows);

        if (!initialPoint) {
          throw new Error(
            'No existe un punto de venta configurado.',
          );
        }

        setPointId(initialPoint.id);
        await loadContext(initialPoint);
      })
      .catch((reason: Error) =>
        setError(reason.message),
      )
      .finally(() => setLoading(false));
  }, []);

  async function exportReportToExcel(): Promise<void> {
  if (!report) {
    setError(
      'Primero debes generar el reporte.',
    );
    return;
  }

  const workbook =
    new ExcelJS.Workbook();

  workbook.creator =
    'Cactus CarWash ERP';

  workbook.created =
    new Date();

  const sheet =
    workbook.addWorksheet(
      'Cuentas por Pagar',
    );

  sheet.columns = [
    {
      key: 'label',
      width: 28,
    },
    {
      key: 'value',
      width: 22,
    },
    {
      key: 'extra1',
      width: 22,
    },
    {
      key: 'extra2',
      width: 22,
    },
    {
      key: 'extra3',
      width: 22,
    },
  ];

  sheet.mergeCells('A1:E1');

  const title =
    sheet.getCell('A1');

  title.value =
    'REPORTE DE CUENTAS POR PAGAR';

  title.font = {
    bold: true,
    size: 16,
    color: {
      argb: 'FFFFFFFF',
    },
  };

  title.fill = {
    type: 'pattern',
    pattern: 'solid',
    fgColor: {
      argb: 'FF17633F',
    },
  };

  title.alignment = {
    horizontal: 'center',
    vertical: 'middle',
  };

  sheet.getRow(1).height = 28;

  sheet.addRow([]);

  sheet.addRow([
    'Desde',
    report.dateFrom ?? 'Todos',
  ]);

  sheet.addRow([
    'Hasta',
    report.dateTo ?? 'Todos',
  ]);

  const selectedSupplier =
    suppliers.find(
      (supplier) =>
        supplier.id ===
        report.supplierId,
    );

  sheet.addRow([
    'Suplidor',
    selectedSupplier?.name ??
      'Todos',
  ]);

  sheet.addRow([
    'Generado',
    new Date().toLocaleString(
      'es-DO',
    ),
  ]);

  sheet.addRow([]);

  const kpiHeader =
    sheet.addRow([
      'RESUMEN',
      '',
      '',
      '',
      '',
    ]);

  kpiHeader.font = {
    bold: true,
  };

  kpiHeader.fill = {
    type: 'pattern',
    pattern: 'solid',
    fgColor: {
      argb: 'FFEAF3ED',
    },
  };

  sheet.addRow([
    'Facturado',
    report.invoiced,
  ]);

  sheet.addRow([
    'Pagado',
    report.paid,
  ]);

  sheet.addRow([
    'Saldo pendiente',
    report.pendingBalance,
  ]);

  sheet.addRow([
    'Saldo vencido',
    report.overdueBalance,
  ]);

  sheet.addRow([
    'Total facturas',
    report.totalInvoices,
  ]);

  sheet.addRow([
    'Pendientes',
    report.pendingInvoices,
  ]);

  sheet.addRow([
    'Pago parcial',
    report.partiallyPaidInvoices,
  ]);

  sheet.addRow([
    'Pagadas',
    report.paidInvoices,
  ]);

  sheet.addRow([
    'Canceladas',
    report.cancelledInvoices,
  ]);

  sheet.addRow([]);

  const agingHeader =
    sheet.addRow([
      'ANTIGÜEDAD DE SALDOS',
    ]);

  agingHeader.font = {
    bold: true,
  };

  agingHeader.fill = {
    type: 'pattern',
    pattern: 'solid',
    fgColor: {
      argb: 'FFEAF3ED',
    },
  };

  sheet.addRow([
    'Rango',
    'Monto',
  ]);

  for (
    const bucket
    of report.aging
  ) {
    sheet.addRow([
      bucket.label,
      bucket.amount,
    ]);
  }

  sheet.addRow([]);

  const supplierHeader =
    sheet.addRow([
      'DEUDA POR SUPLIDOR',
    ]);

  supplierHeader.font = {
    bold: true,
  };

  supplierHeader.fill = {
    type: 'pattern',
    pattern: 'solid',
    fgColor: {
      argb: 'FFEAF3ED',
    },
  };

  const tableHeader =
    sheet.addRow([
      'Suplidor',
      'Facturado',
      'Pagado',
      'Saldo',
      'Vencido',
    ]);

  tableHeader.font = {
    bold: true,
    color: {
      argb: 'FFFFFFFF',
    },
  };

  tableHeader.fill = {
    type: 'pattern',
    pattern: 'solid',
    fgColor: {
      argb: 'FF17633F',
    },
  };

  for (
    const supplier
    of report.suppliers
  ) {
    sheet.addRow([
      supplier.supplierName,
      supplier.invoiced,
      supplier.paid,
      supplier.balance,
      supplier.overdueBalance,
    ]);
  }

  sheet.eachRow((row) => {
    row.alignment = {
      vertical: 'middle',
    };
  });

  sheet.getColumn(2).numFmt =
    '#,##0.00';

  sheet.getColumn(3).numFmt =
    '#,##0.00';

  sheet.getColumn(4).numFmt =
    '#,##0.00';

  sheet.getColumn(5).numFmt =
    '#,##0.00';

  sheet.views = [
    {
      state: 'frozen',
      ySplit: 1,
    },
  ];

  const buffer =
    await workbook.xlsx.writeBuffer();

  const blob =
    new Blob(
      [buffer],
      {
        type:
          'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      },
    );

  const url =
    URL.createObjectURL(blob);

  const anchor =
    document.createElement('a');

  anchor.href = url;

  anchor.download =
    `cuentas-por-pagar-${new Date()
      .toISOString()
      .slice(0, 10)}.xlsx`;

  document.body.appendChild(
    anchor,
  );

  anchor.click();

  anchor.remove();

  URL.revokeObjectURL(
    url,
  );
}

  async function changePoint(
    nextPointId: string,
  ): Promise<void> {
    const point =
      points.find(
        (row) => row.id === nextPointId,
      ) ?? null;

    if (!point) {
      return;
    }

    setPointId(nextPointId);
    setSelectedInvoiceId('');
    setLoading(true);
    setError('');
    setMessage('');

    try {
      await loadContext(point);
    } catch (reason) {
      setError(
        reason instanceof Error
          ? reason.message
          : 'No fue posible cargar cuentas por pagar.',
      );
    } finally {
      setLoading(false);
    }
  }

  async function refresh(): Promise<void> {
    if (!selectedPoint) {
      return;
    }

    await loadContext(selectedPoint);
  }

  async function createInvoice(
    event: FormEvent<HTMLFormElement>,
  ): Promise<void> {
    event.preventDefault();

    if (!companyId || !branchId) {
      setError(
        'No se pudo determinar empresa y sucursal.',
      );
      return;
    }

    const subtotal =
      numberValue(invoiceForm.subtotal);
    const taxAmount =
      numberValue(invoiceForm.taxAmount);

    if (
      !invoiceForm.supplierId ||
      !invoiceForm.invoiceNumber.trim() ||
      subtotal + taxAmount <= 0
    ) {
      setError(
        'Completa suplidor, número y monto de factura.',
      );
      return;
    }

    const payload:
      CreateSupplierInvoiceRequest = {
        companyId,
        branchId,
        supplierId:
          invoiceForm.supplierId,
        purchaseOrderId:
          invoiceForm.purchaseOrderId ||
          undefined,
        invoiceNumber:
          invoiceForm.invoiceNumber.trim(),
        subtotal,
        taxAmount,
        issuedAt:
          new Date(
            `${invoiceForm.issuedAt}T12:00:00`,
          ).toISOString(),
        dueDate:
          invoiceForm.dueDate
            ? new Date(
                `${invoiceForm.dueDate}T12:00:00`,
              ).toISOString()
            : undefined,
        notes:
          invoiceForm.notes.trim() ||
          undefined,
      };

    setSavingInvoice(true);
    setError('');
    setMessage('');

    try {
      const created =
        await api.createSupplierInvoice(
          payload,
        );

      setSelectedInvoiceId(created.id);
      setMessage(
        `Factura ${created.invoiceNumber} registrada correctamente.`,
      );

      setInvoiceForm((current) => ({
        ...EMPTY_INVOICE,
        supplierId:
          current.supplierId,
      }));

      await refresh();
      setInvoiceModalOpen(false);
    } catch (reason) {
      setError(
        reason instanceof Error
          ? reason.message
          : 'No fue posible registrar la factura.',
      );
    } finally {
      setSavingInvoice(false);
    }
  }

  async function createPayment(
    event: FormEvent<HTMLFormElement>,
  ): Promise<void> {
    event.preventDefault();

    if (!selectedInvoice) {
      setError(
        'Selecciona una factura pendiente.',
      );
      return;
    }

    const amount =
      numberValue(paymentForm.amount);

    if (
      !paymentForm.paymentMethodId ||
      amount <= 0
    ) {
      setError(
        'Indica método y monto de pago.',
      );
      return;
    }

    const selectedPaymentMethod =
      paymentMethods.find(
        (method) =>
          method.id ===
          paymentForm.paymentMethodId,
      );

    const selectedCashRegister =
      cashRegisters.find(
        (register) =>
          register.id === cashRegisterId,
      );

    if (
      selectedPaymentMethod?.type === 'CASH' &&
      !selectedCashRegister?.openSession
    ) {
      setError(
        'El pago en efectivo requiere una caja abierta.',
      );
      return;
    }

    const payload:
      CreateSupplierPaymentRequest = {
        companyId:
          selectedInvoice.companyId,
        branchId:
          selectedInvoice.branchId,
        supplierId:
          selectedInvoice.supplierId,
        supplierInvoiceId:
          selectedInvoice.id,
        paymentMethodId:
          paymentForm.paymentMethodId,
        cashSessionId:
          selectedPaymentMethod?.type === 'CASH'
            ? selectedCashRegister?.openSession?.id
            : undefined,
        amount,
        reference:
          paymentForm.reference.trim() ||
          undefined,
        description:
          paymentForm.description.trim() ||
          undefined,
      };

    setSavingPayment(true);
    setError('');
    setMessage('');

    try {
      await api.createSupplierPayment(
        payload,
      );

      setMessage(
        'Pago registrado correctamente.',
      );

      setPaymentForm((current) => ({
        ...EMPTY_PAYMENT,
        paymentMethodId:
          current.paymentMethodId,
      }));

      await refresh();
      setPaymentModalOpen(false);
    } catch (reason) {
      setError(
        reason instanceof Error
          ? reason.message
          : 'No fue posible registrar el pago.',
      );
    } finally {
      setSavingPayment(false);
    }
  }

  async function generateReport(): Promise<void> {
    if (!companyId) return;
    setReportLoading(true);
    setError('');
    try {
      setReport(await api.accountsPayableReport(
        companyId,
        branchId || undefined,
        reportFilters.dateFrom || undefined,
        reportFilters.dateTo || undefined,
        reportFilters.supplierId || undefined,
      ));
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : 'No fue posible generar el reporte.');
    } finally {
      setReportLoading(false);
    }
  }

  function clearReport(): void {
    setReportFilters({ dateFrom: '', dateTo: '', supplierId: '' });
    setReport(null);
  }


function exportReportToPdf(): void {
  if (!report) {
    setError(
      'Primero debes generar el reporte.',
    );
    return;
  }

  const doc =
    new jsPDF({
      orientation: 'portrait',
      unit: 'mm',
      format: 'a4',
    });

  const pdf =
    doc as JsPdfWithAutoTable;

  const selectedSupplier =
    suppliers.find(
      (supplier) =>
        supplier.id ===
        report.supplierId,
    );

  const supplierName =
    selectedSupplier?.name ??
    'Todos los suplidores';

  doc.setFontSize(18);
  doc.text(
    'Reporte de Cuentas por Pagar',
    14,
    18,
  );

  doc.setFontSize(10);

  doc.text(
    `Desde: ${report.dateFrom ?? 'Todos'}`,
    14,
    27,
  );

  doc.text(
    `Hasta: ${report.dateTo ?? 'Todos'}`,
    14,
    33,
  );

  doc.text(
    `Suplidor: ${supplierName}`,
    14,
    39,
  );

  doc.text(
    `Generado: ${new Date().toLocaleString(
      'es-DO',
    )}`,
    14,
    45,
  );

  autoTable(doc, {
    startY: 53,

    head: [[
      'Resumen',
      'Valor',
    ]],

    body: [
      [
        'Facturado',
        `RD$ ${report.invoiced.toFixed(2)}`,
      ],
      [
        'Pagado',
        `RD$ ${report.paid.toFixed(2)}`,
      ],
      [
        'Saldo pendiente',
        `RD$ ${report.pendingBalance.toFixed(2)}`,
      ],
      [
        'Saldo vencido',
        `RD$ ${report.overdueBalance.toFixed(2)}`,
      ],
      [
        'Total facturas',
        String(report.totalInvoices),
      ],
      [
        'Pendientes',
        String(report.pendingInvoices),
      ],
      [
        'Pago parcial',
        String(
          report.partiallyPaidInvoices,
        ),
      ],
      [
        'Pagadas',
        String(report.paidInvoices),
      ],
      [
        'Canceladas',
        String(
          report.cancelledInvoices,
        ),
      ],
    ],

    styles: {
      fontSize: 9,
      cellPadding: 3,
    },

    headStyles: {
      fillColor: [23, 99, 63],
    },
  });

  const agingStartY =
    (pdf.lastAutoTable?.finalY ?? 53) + 10;

  doc.setFontSize(12);

  doc.text(
    'Antigüedad de saldos',
    14,
    agingStartY,
  );

  autoTable(doc, {
    startY:
      agingStartY + 4,

    head: [[
      'Rango',
      'Monto',
    ]],

    body:
      report.aging.map(
        (bucket) => [
          bucket.label,
          `RD$ ${bucket.amount.toFixed(2)}`,
        ],
      ),

    styles: {
      fontSize: 9,
      cellPadding: 3,
    },

    headStyles: {
      fillColor: [23, 99, 63],
    },
  });

  const supplierStartY =
    (pdf.lastAutoTable?.finalY ??
      agingStartY + 20) + 10;

  doc.setFontSize(12);

  doc.text(
    'Deuda por suplidor',
    14,
    supplierStartY,
  );

  autoTable(doc, {
    startY:
      supplierStartY + 4,

    head: [[
      'Suplidor',
      'Facturado',
      'Pagado',
      'Saldo',
      'Vencido',
    ]],

    body:
      report.suppliers.map(
        (supplier) => [
          supplier.supplierName,
          `RD$ ${supplier.invoiced.toFixed(2)}`,
          `RD$ ${supplier.paid.toFixed(2)}`,
          `RD$ ${supplier.balance.toFixed(2)}`,
          `RD$ ${supplier.overdueBalance.toFixed(2)}`,
        ],
      ),

    styles: {
      fontSize: 8,
      cellPadding: 2.5,
    },

    headStyles: {
      fillColor: [23, 99, 63],
    },
  });

  const pageCount =
    doc.getNumberOfPages();

  for (
    let page = 1;
    page <= pageCount;
    page += 1
  ) {
    doc.setPage(page);

    doc.setFontSize(8);

    doc.text(
      `Página ${page} de ${pageCount}`,
      196,
      290,
      {
        align: 'right',
      },
    );
  }

  doc.save(
    `cuentas-por-pagar-${new Date()
      .toISOString()
      .slice(0, 10)}.pdf`,
  );
}

  const dashboard = useMemo(() => {
    const now = new Date();
    const inSevenDays = new Date(now);
    inSevenDays.setDate(
      inSevenDays.getDate() + 7,
    );

    let overdue = 0;
    let dueSoon = 0;
    let pendingInvoices = 0;
    let paidInvoices = 0;
    let agingCurrent = 0;
    let aging1To30 = 0;
    let aging31To60 = 0;
    let aging61To90 = 0;
    let agingOver90 = 0;

    const supplierBalances =
      new Map<
        string,
        {
          supplierId: string;
          supplierName: string;
          balance: number;
          invoices: number;
          overdue: number;
        }
      >();

    for (const invoice of invoices) {
      if (invoice.status === 'CANCELLED') {
        continue;
      }

      if (invoice.status === 'PAID') {
        paidInvoices += 1;
      }

      if (invoice.balance <= 0) {
        continue;
      }

      pendingInvoices += 1;

      const supplier =
        supplierBalances.get(
          invoice.supplierId,
        ) ?? {
          supplierId:
            invoice.supplierId,
          supplierName:
            invoice.supplierName,
          balance: 0,
          invoices: 0,
          overdue: 0,
        };

      supplier.balance +=
        invoice.balance;
      supplier.invoices += 1;

      if (!invoice.dueDate) {
        agingCurrent +=
          invoice.balance;

        supplierBalances.set(
          invoice.supplierId,
          supplier,
        );
        continue;
      }

      const dueDate =
        new Date(invoice.dueDate);

      if (dueDate > now) {
        agingCurrent +=
          invoice.balance;

        if (dueDate <= inSevenDays) {
          dueSoon +=
            invoice.balance;
        }

        supplierBalances.set(
          invoice.supplierId,
          supplier,
        );
        continue;
      }

      overdue += invoice.balance;
      supplier.overdue +=
        invoice.balance;

      const overdueDays =
        Math.max(
          1,
          Math.floor(
            (now.getTime() -
              dueDate.getTime()) /
              86_400_000,
          ),
        );

      if (overdueDays <= 30) {
        aging1To30 +=
          invoice.balance;
      } else if (
        overdueDays <= 60
      ) {
        aging31To60 +=
          invoice.balance;
      } else if (
        overdueDays <= 90
      ) {
        aging61To90 +=
          invoice.balance;
      } else {
        agingOver90 +=
          invoice.balance;
      }

      supplierBalances.set(
        invoice.supplierId,
        supplier,
      );
    }

    const monthStart =
      new Date(
        now.getFullYear(),
        now.getMonth(),
        1,
      );

    const paidThisMonth =
      payments.reduce(
        (sum, payment) => {
          const paidAt =
            new Date(payment.paidAt);

          if (
            payment.status !==
              'CANCELLED' &&
            paidAt >= monthStart &&
            paidAt <= now
          ) {
            return (
              sum +
              payment.amount
            );
          }

          return sum;
        },
        0,
      );

    const suppliersByDebt =
      [...supplierBalances.values()]
        .sort(
          (a, b) =>
            b.balance -
            a.balance,
        )
        .slice(0, 8);

    return {
      overdue,
      dueSoon,
      pendingInvoices,
      paidInvoices,
      paidThisMonth,
      aging: [
        {
          key: 'CURRENT',
          label: 'Por vencer',
          amount: agingCurrent,
        },
        {
          key: '1_30',
          label: '1–30 días',
          amount: aging1To30,
        },
        {
          key: '31_60',
          label: '31–60 días',
          amount: aging31To60,
        },
        {
          key: '61_90',
          label: '61–90 días',
          amount: aging61To90,
        },
        {
          key: 'OVER_90',
          label: 'Más de 90 días',
          amount: agingOver90,
        },
      ],
      suppliersByDebt,
    };
  }, [invoices, payments]);

  function clearDashboardView(): void {
    navigate(
      '/admin/purchases/accounts-payable',
      {
        replace: true,
      },
    );
  }

  function applyDashboardFilter(
    mode:
      | 'ALL'
      | 'PENDING'
      | 'OVERDUE'
      | 'DUE_SOON',
  ): void {
    setQuery('');
    setSupplierFilter('');

    if (mode === 'ALL') {
      setStatusFilter('ALL');
      return;
    }

    if (mode === 'PENDING') {
      setStatusFilter('PENDING');
      return;
    }

    setStatusFilter('ALL');

    const now = new Date();
    const inSevenDays =
      new Date(now);
    inSevenDays.setDate(
      inSevenDays.getDate() + 7,
    );

    const ids =
      invoices
        .filter((invoice) => {
          if (
            invoice.balance <= 0 ||
            invoice.status ===
              'CANCELLED' ||
            !invoice.dueDate
          ) {
            return false;
          }

          const dueDate =
            new Date(
              invoice.dueDate,
            );

          return mode ===
            'OVERDUE'
            ? dueDate < now
            : dueDate >= now &&
                dueDate <=
                  inSevenDays;
        })
        .map(
          (invoice) =>
            invoice.invoiceNumber,
        );

    setQuery(
      ids.length === 1
        ? ids[0]
        : '',
    );
  }

  return (
    <main className="accounts-payable-v2 maintenance-page">
      <header className="module-header maintenance-header">
        <div className="maintenance-header__content">
          <div className="maintenance-header__icon">
            <WalletCards size={22} strokeWidth={1.8} />
          </div>

          <div className="maintenance-header__text">
            <h1>Cuentas por pagar</h1>
            <p>Facturas de suplidores, vencimientos, saldos y pagos.</p>
          </div>
        </div>

        <div className="ap-maintenance-header-actions">
          <label className="ap-maintenance-point">
            <span>Punto de venta</span>
            <select
              value={pointId}
              onChange={(event) => void changePoint(event.target.value)}
            >
              {points.map((point) => (
                <option key={point.id} value={point.id}>
                  {point.name}
                </option>
              ))}
            </select>
          </label>

          <button
            type="button"
            className="secondary-button"
            onClick={() => navigate('/admin/purchases/orders')}
          >
            Compras
          </button>

          <button
            type="button"
            className="secondary-button"
            onClick={() => {
              setLoading(true);
              refresh()
                .catch((reason: Error) => setError(reason.message))
                .finally(() => setLoading(false));
            }}
            disabled={loading}
          >
            <RefreshCcw size={16} />
            Actualizar
          </button>
        </div>
      </header>

      {error ? (
        <div className="maintenance-alert maintenance-alert--error">{error}</div>
      ) : null}

      {message ? (
        <div className="maintenance-alert maintenance-alert--success">{message}</div>
      ) : null}

      <section className="ap-maintenance-commandbar">
        <div>
          <p className="eyebrow">FINANZAS</p>
          <h2>Gestión de cuentas por pagar</h2>
        </div>

        <div className="ap-maintenance-commandbar__actions">
          <button className="erp-button-primary" type="button" onClick={() => setInvoiceModalOpen(true)}>
            <Plus size={16} />
            Nueva factura
          </button>

          <button
            type="button"
            className="secondary-button"
            disabled={!selectedInvoice}
            onClick={() => setPaymentModalOpen(true)}
          >
            <Banknote size={16} />
            Registrar pago
          </button>
        </div>
      </section>

      <section className="accounts-payable-v2__summary">
        <button
          type="button"
          className="accounts-payable-v2__kpi"
          onClick={() =>
            applyDashboardFilter(
              'ALL',
            )
          }
        >
          <FileText size={22} />
          <span>Total facturado</span>
          <strong>
            RD$ {totals.total.toFixed(2)}
          </strong>
          <small>
            {invoices.length} facturas
          </small>
        </button>

        <button
          type="button"
          className="accounts-payable-v2__kpi"
          onClick={() =>
            applyDashboardFilter(
              'PENDING',
            )
          }
        >
          <WalletCards size={22} />
          <span>Saldo pendiente</span>
          <strong>
            RD$ {totals.balance.toFixed(2)}
          </strong>
          <small>
            {dashboard.pendingInvoices}
            {' '}
            abiertas
          </small>
        </button>

        <button
          type="button"
          className="accounts-payable-v2__kpi accounts-payable-v2__kpi--danger"
          onClick={() =>
            applyDashboardFilter(
              'OVERDUE',
            )
          }
        >
          <AlertTriangle size={22} />
          <span>Saldo vencido</span>
          <strong>
            RD$ {dashboard.overdue.toFixed(
              2,
            )}
          </strong>
          <small>
            Requiere atención
          </small>
        </button>

        <button
          type="button"
          className="accounts-payable-v2__kpi"
          onClick={() =>
            applyDashboardFilter(
              'DUE_SOON',
            )
          }
        >
          <CalendarClock size={22} />
          <span>Vence en 7 días</span>
          <strong>
            RD$ {dashboard.dueSoon.toFixed(
              2,
            )}
          </strong>
          <small>
            Próximos compromisos
          </small>
        </button>

        <article>
          <Banknote size={22} />
          <span>Pagado este mes</span>
          <strong>
            RD$ {dashboard.paidThisMonth.toFixed(
              2,
            )}
          </strong>
          <small>
            Pagos emitidos
          </small>
        </article>

        <article>
          <TrendingDown size={22} />
          <span>Facturas pagadas</span>
          <strong>
            {dashboard.paidInvoices}
          </strong>
          <small>
            Histórico cargado
          </small>
        </article>
      </section>

      <section className="accounts-payable-v2__dashboard-grid">
        <section className="accounts-payable-v2__panel">
          <div className="accounts-payable-v2__panel-title">
            <div>
              <span>AGING</span>
              <h2>
                Antigüedad de saldos
              </h2>
            </div>

            <Clock3 size={22} />
          </div>

          <div className="accounts-payable-v2__aging">
            {dashboard.aging.map(
              (bucket) => {
                const percentage =
                  totals.balance > 0
                    ? Math.min(
                        100,
                        (bucket.amount /
                          totals.balance) *
                          100,
                      )
                    : 0;

                return (
                  <article
                    key={bucket.key}
                  >
                    <div>
                      <span>
                        {bucket.label}
                      </span>

                      <strong>
                        RD${' '}
                        {bucket.amount.toFixed(
                          2,
                        )}
                      </strong>
                    </div>

                    <div className="accounts-payable-v2__aging-track">
                      <span
                        style={{
                          width:
                            `${percentage}%`,
                        }}
                      />
                    </div>
                  </article>
                );
              },
            )}
          </div>
        </section>

        <section className="accounts-payable-v2__panel">
          <div className="accounts-payable-v2__panel-title">
            <div>
              <span>EXPOSICIÓN</span>
              <h2>
                Deuda por suplidor
              </h2>
            </div>

            <UsersRound size={22} />
          </div>

          {dashboard.suppliersByDebt.length ===
          0 ? (
            <div className="accounts-payable-v2__empty">
              No hay saldos pendientes.
            </div>
          ) : (
            <div className="accounts-payable-v2__supplier-debt">
              {dashboard.suppliersByDebt.map(
                (supplier) => (
                  <button
                    key={supplier.supplierId}
                    type="button"
                    onClick={() => {
                      setSupplierFilter(
                        supplier.supplierId,
                      );
                      setStatusFilter(
                        'ALL',
                      );
                      setQuery('');
                    }}
                  >
                    <div>
                      <strong>
                        {
                          supplier.supplierName
                        }
                      </strong>

                      <small>
                        {supplier.invoices}
                        {' '}
                        facturas pendientes
                      </small>
                    </div>

                    <div>
                      <strong>
                        RD${' '}
                        {supplier.balance.toFixed(
                          2,
                        )}
                      </strong>

                      {supplier.overdue > 0 ? (
                        <small>
                          Vencido RD${' '}
                          {supplier.overdue.toFixed(
                            2,
                          )}
                        </small>
                      ) : (
                        <small>
                          Al día
                        </small>
                      )}
                    </div>
                  </button>
                ),
              )}
            </div>
          )}
        </section>
      </section>

      {dashboardView ? (
        <section className="accounts-payable-v2__active-view">
          <div>
            <strong>
              Vista activa:
            </strong>
            <span>
              {dashboardView === 'pending'
                ? 'Saldo pendiente'
                : dashboardView === 'overdue'
                  ? 'Facturas vencidas'
                  : dashboardView === 'due-soon'
                    ? 'Vencen en 7 días'
                    : 'Filtro del dashboard'}
            </span>
          </div>

          <button
            type="button"
            className="secondary-button"
            onClick={clearDashboardView}
          >
            Limpiar alerta
          </button>
        </section>
      ) : null}

      <section className="accounts-payable-v2__panel accounts-payable-v2__report">
        <div className="accounts-payable-v2__panel-title">
          <div><span>REPORTE</span><h2>Reporte de cuentas por pagar</h2></div>
          <FileText size={22} />
        </div>
        <div className="accounts-payable-v2__report-filters">
          <label>Desde<input type="date" value={reportFilters.dateFrom} onChange={(e) => setReportFilters(c => ({...c, dateFrom:e.target.value}))} /></label>
          <label>Hasta<input type="date" value={reportFilters.dateTo} onChange={(e) => setReportFilters(c => ({...c, dateTo:e.target.value}))} /></label>
          <label>Suplidor<select value={reportFilters.supplierId} onChange={(e) => setReportFilters(c => ({...c, supplierId:e.target.value}))}>
            <option value="">Todos los suplidores</option>
            {suppliers.map(supplier => <option key={supplier.id} value={supplier.id}>{supplier.name}</option>)}
          </select></label>
          <div className="accounts-payable-v2__report-actions">
            <button type="button" onClick={() => void generateReport()} disabled={reportLoading}><FileText size={17} />{reportLoading ? 'Generando...' : 'Generar reporte'}</button>
            
            <button
                type="button"
                className="secondary-button"
                onClick={() => {
                  void exportReportToExcel();
                }}
                disabled={
                  !report ||
                  reportLoading
                }
              >
                Exportar Excel
              </button>
              <button
                  type="button"
                  className="secondary-button"
                  onClick={exportReportToPdf}
                  disabled={
                    !report ||
                    reportLoading
                  }
                >
                  Exportar PDF
                </button>
                            
            <button type="button" className="secondary-button" onClick={clearReport}>Limpiar</button>
          
          </div>
        </div>
        {report ? <>
          <div className="accounts-payable-v2__report-kpis">
            <article><span>Facturado</span><strong>RD$ {report.invoiced.toFixed(2)}</strong><small>{report.totalInvoices} facturas</small></article>
            <article><span>Pagado</span><strong>RD$ {report.paid.toFixed(2)}</strong><small>Pagos aplicados</small></article>
            <article><span>Saldo pendiente</span><strong>RD$ {report.pendingBalance.toFixed(2)}</strong><small>{report.pendingInvoices + report.partiallyPaidInvoices} abiertas</small></article>
            <article className="accounts-payable-v2__report-kpi--danger"><span>Saldo vencido</span><strong>RD$ {report.overdueBalance.toFixed(2)}</strong><small>Requiere seguimiento</small></article>
          </div>
          <div className="accounts-payable-v2__report-grid">
            <div><h3>Antigüedad</h3><div className="accounts-payable-v2__report-aging">
              {report.aging.map(bucket => <div key={bucket.key}><span>{bucket.label}</span><strong>RD$ {bucket.amount.toFixed(2)}</strong></div>)}
            </div></div>
            <div><h3>Deuda por suplidor</h3>
              {report.suppliers.length === 0 ? <div className="accounts-payable-v2__empty">No hay datos para los filtros seleccionados.</div> :
              <div className="accounts-payable-v2__report-table-wrap"><table className="accounts-payable-v2__report-table">
                <thead><tr><th>Suplidor</th><th>Facturado</th><th>Pagado</th><th>Saldo</th><th>Vencido</th></tr></thead>
                <tbody>{report.suppliers.map(supplier => <tr key={supplier.supplierId}>
                  <td><strong>{supplier.supplierName}</strong><small>{supplier.invoiceCount} facturas</small></td>
                  <td>RD$ {supplier.invoiced.toFixed(2)}</td><td>RD$ {supplier.paid.toFixed(2)}</td>
                  <td>RD$ {supplier.balance.toFixed(2)}</td><td>RD$ {supplier.overdueBalance.toFixed(2)}</td>
                </tr>)}</tbody>
              </table></div>}
            </div>
          </div>
        </> : <div className="accounts-payable-v2__report-placeholder">Selecciona un período o suplidor y genera el reporte. Sin filtros se incluirá toda la información disponible.</div>}
      </section>


      <section className="accounts-payable-v2__panel accounts-payable-v2__invoices">
          <div className="accounts-payable-v2__panel-title">
            <div>
              <span>CUENTAS</span>
              <h2>
                Facturas de suplidores
              </h2>
            </div>
          </div>

          <div className="accounts-payable-v2__toolbar">
            <div className="accounts-payable-v2__search">
              <Search size={18} />

              <input
                value={query}
                onChange={(event) =>
                  setQuery(
                    event.target.value,
                  )
                }
                placeholder="Buscar factura, suplidor u orden"
              />
            </div>

            <select
              value={statusFilter}
              onChange={(event) =>
                setStatusFilter(
                  event.target
                    .value as InvoiceStatusFilter,
                )
              }
            >
              <option value="ALL">
                Todos los estados
              </option>
              <option value="PENDING">
                Pendientes
              </option>
              <option value="PARTIALLY_PAID">
                Pago parcial
              </option>
              <option value="PAID">
                Pagadas
              </option>
              <option value="CANCELLED">
                Canceladas
              </option>
            </select>

            <select
              value={supplierFilter}
              onChange={(event) =>
                setSupplierFilter(
                  event.target.value,
                )
              }
            >
              <option value="">
                Todos los suplidores
              </option>

              {suppliers.map((supplier) => (
                <option
                  key={supplier.id}
                  value={supplier.id}
                >
                  {supplier.name}
                </option>
              ))}
            </select>
          </div>

          {loading ? (
            <div className="accounts-payable-v2__empty">
              Cargando cuentas por pagar...
            </div>
          ) : null}

          {!loading &&
          visibleInvoices.length === 0 ? (
            <div className="accounts-payable-v2__empty">
              No hay facturas que
              coincidan con los filtros.
            </div>
          ) : null}

          <div className="accounts-payable-v2__invoice-list">
            {visibleInvoices.map(
              (invoice) => {
                const selectable =
                  invoice.status !==
                    'CANCELLED' &&
                  invoice.balance > 0;

                return (
                       <button
                          key={invoice.id}
                          type="button"
                          className={[
                            'accounts-payable-v2__invoice-card',

                            selectedInvoiceId === invoice.id
                              ? 'selected'
                              : '',

                            invoice.balance > 0 &&
                            invoice.status !== 'CANCELLED' &&
                            invoice.dueDate &&
                            new Date(invoice.dueDate) < new Date()
                              ? 'accounts-payable-v2__invoice-card--overdue'
                              : '',
                          ]
                            .filter(Boolean)
                            .join(' ')}
                          onClick={() =>
                            selectable
                              ? setSelectedInvoiceId(
                                  invoice.id,
                                )
                              : undefined
                          }
                        >
                    <div>
                      <span>
                        {
                          invoice.invoiceNumber
                        }
                      </span>
                      <strong>
                        {
                          invoice.supplierName
                        }
                      </strong>
                      <small>
                        {invoice.purchaseOrderNumber ??
                          'Sin OC asociada'}
                      </small>
                    </div>

                    <div>
                      <span
                        className={`accounts-payable-v2__status accounts-payable-v2__status--${invoice.status.toLowerCase()}`}
                      >
                        {
                          STATUS_LABELS[
                            invoice.status
                          ]
                        }
                      </span>

                      <strong>
                        RD${' '}
                        {invoice.total.toFixed(
                          2,
                        )}
                      </strong>

                      <small>
                        Saldo RD${' '}
                        {invoice.balance.toFixed(
                          2,
                        )}
                      </small>
                    </div>

                    <div>
                      <small>
                        Emitida
                      </small>
                      <strong>
                        {new Date(
                          invoice.issuedAt,
                        ).toLocaleDateString(
                          'es-DO',
                        )}
                      </strong>

                      <small>
                       {invoice.dueDate ? (
                            <small
                              className={
                                invoice.balance > 0 &&
                                invoice.status !== 'CANCELLED' &&
                                new Date(invoice.dueDate) <
                                  new Date()
                                  ? 'accounts-payable-v2__due-date accounts-payable-v2__due-date--overdue'
                                  : 'accounts-payable-v2__due-date'
                              }
                            >
                              Vence{' '}
                              {new Date(
                                invoice.dueDate,
                              ).toLocaleDateString(
                                'es-DO',
                              )}

                              {invoice.balance > 0 &&
                              invoice.status !== 'CANCELLED' &&
                              new Date(invoice.dueDate) <
                                new Date()
                                ? ' · Vencida'
                                : ''}
                            </small>
                          ) : (
                            <small className="accounts-payable-v2__due-date">
                              Sin vencimiento
                            </small>
                          )}
                      </small>
                    </div>
                  </button>
                );
              },
            )}
          </div>
      </section>

      {invoiceModalOpen ? (
        <div
          className="maintenance-modal-backdrop"
          role="presentation"
          onMouseDown={(event) => {
            if (event.target === event.currentTarget && !savingInvoice) {
              setInvoiceModalOpen(false);
            }
          }}
        >
          <section
            className="maintenance-modal ap-maintenance-modal"
            role="dialog"
            aria-modal="true"
            aria-labelledby="ap-invoice-modal-title"
          >
            <header className="maintenance-modal__header">
              <div>
                <p className="eyebrow">NUEVA FACTURA</p>
                <h2 id="ap-invoice-modal-title">Registrar factura</h2>
                <p>Registra el documento del suplidor y su vencimiento.</p>
              </div>
              <button
                type="button"
                className="maintenance-modal__close"
                disabled={savingInvoice}
                onClick={() => setInvoiceModalOpen(false)}
                aria-label="Cerrar"
              >
                ×
              </button>
            </header>
            <div className="maintenance-modal__body">
              <form
              className="accounts-payable-v2__form"
              onSubmit={(event) => {
                void createInvoice(event);
              }}
            >
              <label>
                Suplidor

                <select
                  value={
                    invoiceForm.supplierId
                  }
                  onChange={(event) =>
                    setInvoiceForm(
                      (current) => ({
                        ...current,
                        supplierId:
                          event.target.value,
                        purchaseOrderId: '',
                      }),
                    )
                  }
                >
                  <option value="">
                    Seleccionar
                  </option>

                  {suppliers
                    .filter(
                      (supplier) =>
                        supplier.active,
                    )
                    .map((supplier) => (
                      <option
                        key={supplier.id}
                        value={supplier.id}
                      >
                        {supplier.name}
                      </option>
                    ))}
                </select>
              </label>

              <label>
                Orden de compra

                <select
                  value={
                    invoiceForm.purchaseOrderId
                  }
                  onChange={(event) =>
                    setInvoiceForm(
                      (current) => ({
                        ...current,
                        purchaseOrderId:
                          event.target.value,
                      }),
                    )
                  }
                >
                  <option value="">
                    Sin asociar
                  </option>

                  {eligibleOrders.map(
                    (order) => (
                      <option
                        key={order.id}
                        value={order.id}
                      >
                        {order.orderNumber}
                      </option>
                    ),
                  )}
                </select>
              </label>

              <label>
                Número de factura

                <input
                  value={
                    invoiceForm.invoiceNumber
                  }
                  onChange={(event) =>
                    setInvoiceForm(
                      (current) => ({
                        ...current,
                        invoiceNumber:
                          event.target.value,
                      }),
                    )
                  }
                />
              </label>

              <div className="accounts-payable-v2__form-row">
                <label>
                  Subtotal

                  <input
                    type="number"
                    min="0"
                    step="0.01"
                    value={
                      invoiceForm.subtotal
                    }
                    onChange={(event) =>
                      setInvoiceForm(
                        (current) => ({
                          ...current,
                          subtotal:
                            event.target.value,
                        }),
                      )
                    }
                  />
                </label>

                <label>
                  Impuesto

                  <input
                    type="number"
                    min="0"
                    step="0.01"
                    value={
                      invoiceForm.taxAmount
                    }
                    onChange={(event) =>
                      setInvoiceForm(
                        (current) => ({
                          ...current,
                          taxAmount:
                            event.target.value,
                        }),
                      )
                    }
                  />
                </label>
              </div>

              <div className="accounts-payable-v2__form-row">
                <label>
                  Fecha factura

                  <input
                    type="date"
                    value={
                      invoiceForm.issuedAt
                    }
                    onChange={(event) =>
                      setInvoiceForm(
                        (current) => ({
                          ...current,
                          issuedAt:
                            event.target.value,
                        }),
                      )
                    }
                  />
                </label>

                <label>
                  Vencimiento

                  <input
                    type="date"
                    value={
                      invoiceForm.dueDate
                    }
                    onChange={(event) =>
                      setInvoiceForm(
                        (current) => ({
                          ...current,
                          dueDate:
                            event.target.value,
                        }),
                      )
                    }
                  />
                </label>
              </div>

              <label>
                Notas

                <textarea
                  rows={3}
                  value={invoiceForm.notes}
                  onChange={(event) =>
                    setInvoiceForm(
                      (current) => ({
                        ...current,
                        notes:
                          event.target.value,
                      }),
                    )
                  }
                />
              </label>

              <button className="erp-button-primary"
                type="submit"
                disabled={savingInvoice}
              >
                <Plus size={17} />
                {savingInvoice
                  ? 'Registrando...'
                  : 'Registrar factura'}
              </button>
            </form>
            </div>
          </section>
        </div>
      ) : null}

      {paymentModalOpen && selectedInvoice ? (
        <div
          className="maintenance-modal-backdrop"
          role="presentation"
          onMouseDown={(event) => {
            if (event.target === event.currentTarget && !savingPayment) {
              setPaymentModalOpen(false);
            }
          }}
        >
          <section
            className="maintenance-modal ap-maintenance-modal ap-maintenance-modal--payment"
            role="dialog"
            aria-modal="true"
            aria-labelledby="ap-payment-modal-title"
          >
            <header className="maintenance-modal__header">
              <div>
                <p className="eyebrow">PAGO</p>
                <h2 id="ap-payment-modal-title">Registrar pago</h2>
                <p>Aplica un pago a la factura seleccionada.</p>
              </div>
              <button
                type="button"
                className="maintenance-modal__close"
                disabled={savingPayment}
                onClick={() => setPaymentModalOpen(false)}
                aria-label="Cerrar"
              >
                ×
              </button>
            </header>
            <div className="maintenance-modal__body">
              <form
                className="accounts-payable-v2__form"
                onSubmit={(event) => {
                  void createPayment(event);
                }}
              >
                <div className="accounts-payable-v2__selected-invoice">
                  <strong>
                    {
                      selectedInvoice.invoiceNumber
                    }
                  </strong>
                  <span>
                    {
                      selectedInvoice.supplierName
                    }
                  </span>
                  <b>
                    Saldo RD${' '}
                    {selectedInvoice.balance.toFixed(
                      2,
                    )}
                  </b>
                </div>

                <label>
                  Método de pago

                  <select
                    value={
                      paymentForm.paymentMethodId
                    }
                    onChange={(event) =>
                      setPaymentForm(
                        (current) => ({
                          ...current,
                          paymentMethodId:
                            event.target.value,
                        }),
                      )
                    }
                  >
                    <option value="">
                      Seleccionar
                    </option>

                    {paymentMethods.map((method) => (
                        <option
                          key={method.id}
                          value={method.id}
                        >
                          {method.name}
                        </option>
                      ))}

                  </select>
                </label>

                {paymentMethods.find(
                  (method) =>
                    method.id ===
                    paymentForm.paymentMethodId,
                )?.type === 'CASH' ? (
                  <label>
                    Caja abierta

                    <select
                      value={cashRegisterId}
                      onChange={(event) =>
                        setCashRegisterId(
                          event.target.value,
                        )
                      }
                    >
                      <option value="">
                        Seleccionar caja
                      </option>

                      {cashRegisters
                        .filter(
                          (register) =>
                            register.openSession?.status ===
                            'OPEN',
                        )
                        .map((register) => (
                          <option
                            key={register.id}
                            value={register.id}
                          >
                            {register.name} —{' '}
                            {register.openSession
                              ?.cashierName ??
                              'Sesión abierta'}
                          </option>
                        ))}
                    </select>

                    {!cashRegisters.some(
                      (register) =>
                        register.openSession?.status ===
                        'OPEN',
                    ) ? (
                      <small>
                        No hay una sesión de caja abierta.
                      </small>
                    ) : null}
                  </label>
                ) : null}

                <label>
                  Monto

                  <input
                    type="number"
                    min="0.01"
                    max={
                      selectedInvoice.balance
                    }
                    step="0.01"
                    value={
                      paymentForm.amount
                    }
                    onChange={(event) =>
                      setPaymentForm(
                        (current) => ({
                          ...current,
                          amount:
                            event.target.value,
                        }),
                      )
                    }
                  />
                </label>

                <label>
                  Referencia

                  <input
                    value={
                      paymentForm.reference
                    }
                    onChange={(event) =>
                      setPaymentForm(
                        (current) => ({
                          ...current,
                          reference:
                            event.target.value,
                        }),
                      )
                    }
                    placeholder="Transferencia, cheque..."
                  />
                </label>

                <label>
                  Descripción

                  <textarea
                    rows={2}
                    value={
                      paymentForm.description
                    }
                    onChange={(event) =>
                      setPaymentForm(
                        (current) => ({
                          ...current,
                          description:
                            event.target.value,
                        }),
                      )
                    }
                  />
                </label>

                <button className="erp-button-primary"
                  type="submit"
                  disabled={
                    savingPayment ||
                    selectedInvoice.balance <= 0
                  }
                >
                  <Banknote size={17} />
                  {savingPayment
                    ? 'Registrando...'
                    : 'Registrar pago'}
                </button>
              </form>
            </div>
          </section>
        </div>
      ) : null}
    </main>
  );
}

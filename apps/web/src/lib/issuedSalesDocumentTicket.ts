import type {
  DashboardContextResponse,
  PosIssuedSalesDocumentDetailResponse,
  PosSaleMode,
} from "@cactus/shared";

export type IssuedSalesDocumentPrintBusiness = {
  companyName: string;
  companyTaxId: string | null;
  branchName: string;
  branchAddress: string | null;
  branchPhone: string | null;
};

function escapeHtml(value: string): string {
  return value
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}

function saleModeLabel(mode: PosSaleMode): string {
  switch (mode) {
    case "DINE_IN":
      return "Consumo local";
    case "TAKEAWAY":
      return "Para llevar";
    case "DIRECT":
      return "Venta directa";
  }
}

function formatQuantity(value: number): string {
  return Number.isInteger(value)
    ? value.toFixed(0)
    : value.toLocaleString("es-DO", {
        minimumFractionDigits: 0,
        maximumFractionDigits: 3,
      });
}

function issuedDate(value: string): string {
  return new Intl.DateTimeFormat("es-DO", {
    dateStyle: "short",
    timeStyle: "short",
  }).format(new Date(value));
}

export function resolveIssuedSalesDocumentBusiness(
  context: DashboardContextResponse,
  pointBranchId: string | null | undefined,
): IssuedSalesDocumentPrintBusiness {
  const branch =
    (pointBranchId
      ? context.branches.find((row) => row.id === pointBranchId)
      : undefined) ??
    (context.branches.length === 1 ? context.branches[0] : undefined);

  return {
    companyName: context.companyName,
    companyTaxId: context.companyTaxId,
    branchName: branch?.name ?? "Sucursal",
    branchAddress: branch?.address ?? null,
    branchPhone: branch?.phone ?? null,
  };
}

export function buildIssuedSalesDocumentTicketHtml(
  document: PosIssuedSalesDocumentDetailResponse,
  business: IssuedSalesDocumentPrintBusiness,
  autoPrint = true,
): string {
  const rows = document.items
    .map(
      (item) => `
        <tr>
          <td>
            ${escapeHtml(item.productName)}
            <small>
              ${formatQuantity(item.quantity)} × RD$ ${item.unitPrice.toFixed(2)}
            </small>
          </td>
          <td class="amount">
            RD$ ${item.lineTotal.toFixed(2)}
          </td>
        </tr>
      `,
    )
    .join("");

  const payments = document.payments
    .map(
      (payment) => `
        <div>
          <span>${escapeHtml(payment.paymentMethodName)}</span>
          <strong>RD$ ${payment.amount.toFixed(2)}</strong>
        </div>
        ${
          payment.reference
            ? `
              <div class="payment-reference">
                <span>Ref. pago</span>
                <strong>${escapeHtml(payment.reference)}</strong>
              </div>
            `
            : ""
        }
      `,
    )
    .join("");

  const voidedNotice =
    document.status === "VOIDED"
      ? `
        <div class="voided-notice">
          <strong>ANULADA</strong>
          ${
            document.voidReason
              ? `<span>${escapeHtml(document.voidReason)}</span>`
              : ""
          }
        </div>
      `
      : "";

  return `
    <!doctype html>
    <html lang="es">
      <head>
        <meta charset="utf-8" />
        <title>Reimpresión ${escapeHtml(document.reference)}</title>

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
            font-family: Arial, Helvetica, sans-serif;
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

          .reprint {
            margin-top: 3px !important;
            font-size: 10px !important;
            font-weight: 700;
          }

          .voided-notice {
            margin-top: 7px;
            padding: 6px;
            border: 2px solid #111;
            text-align: center;
          }

          .voided-notice strong {
            display: block;
            font-size: 15px;
            line-height: 1.1;
          }

          .voided-notice span {
            display: block;
            margin-top: 3px;
            font-size: 9px;
            line-height: 1.2;
          }

          .divider {
            margin: 8px 0;
            border-top: 1px dashed #111;
          }

          .meta,
          .summary,
          .payments {
            display: grid;
            gap: 5px;
          }

          .meta div,
          .summary div,
          .payments div,
          .total {
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
            margin-top: 8px;
          }

          .total {
            margin-top: 8px;
            padding-top: 7px;
            border-top: 2px solid #111;
            font-size: 14px;
            font-weight: 900;
          }

          .payments {
            margin-top: 6px;
          }

          .payment-reference {
            font-size: 10px;
            color: #444;
          }

          footer {
            margin-top: 12px;
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
              ? `<p>${escapeHtml(business.branchAddress)}</p>`
              : ""
          }

          ${
            business.branchPhone
              ? `<p>Tel. ${escapeHtml(business.branchPhone)}</p>`
              : ""
          }

          ${
            business.companyTaxId
              ? `<p>RNC: ${escapeHtml(business.companyTaxId)}</p>`
              : ""
          }

          <p class="document-title">TICKET DE VENTA</p>
          <p class="reprint">REIMPRESIÓN</p>
          ${voidedNotice}
        </div>

        <div class="divider"></div>

        <div class="meta">
          <div>
            <span>Fecha emisión:</span>
            <strong>${escapeHtml(issuedDate(document.issuedAt))}</strong>
          </div>

          <div>
            <span>Referencia:</span>
            <strong>${escapeHtml(document.reference)}</strong>
          </div>

          <div>
            <span>Cliente:</span>
            <strong>${escapeHtml(document.customerAlias || "Consumidor final")}</strong>
          </div>

          <div>
            <span>Punto de venta:</span>
            <strong>${escapeHtml(document.pointOfSaleName)}</strong>
          </div>

          <div>
            <span>Modalidad:</span>
            <strong>${escapeHtml(saleModeLabel(document.saleMode))}</strong>
          </div>
        </div>

        <div class="divider"></div>

        <table>
          <tbody>${rows}</tbody>
        </table>

        <div class="summary">
          <div>
            <span>Subtotal</span>
            <strong>RD$ ${document.subtotal.toFixed(2)}</strong>
          </div>

          <div>
            <span>ITBIS</span>
            <strong>RD$ ${document.taxAmount.toFixed(2)}</strong>
          </div>

          ${
            document.serviceChargeAmount > 0
              ? `
                <div>
                  <span>Servicio</span>
                  <strong>RD$ ${document.serviceChargeAmount.toFixed(2)}</strong>
                </div>
              `
              : ""
          }

          <div class="total">
            <span>TOTAL</span>
            <span>RD$ ${document.total.toFixed(2)}</span>
          </div>
        </div>

        ${
          document.payments.length > 0
            ? `
              <div class="divider"></div>
              <strong>Pagos</strong>
              <div class="payments">
                ${payments}
              </div>
            `
            : ""
        }

        <footer>
          Documento reimpreso desde CACTUS ERP
        </footer>

        ${
          autoPrint
            ? `
              <script>
                window.addEventListener("load", function () {
                  setTimeout(function () {
                    window.print();
                    window.close();
                  }, 150);
                });
              </script>
            `
            : ""
        }
      </body>
    </html>
  `;
}

export function printIssuedSalesDocumentTicket(
  document: PosIssuedSalesDocumentDetailResponse,
  business: IssuedSalesDocumentPrintBusiness,
): void {
  const popup = window.open("", "_blank", "width=420,height=720");

  if (!popup) {
    throw new Error(
      "El navegador bloqueó la ventana de impresión. Permite ventanas emergentes para reimprimir el ticket.",
    );
  }

  popup.document.write(
    buildIssuedSalesDocumentTicketHtml(document, business, true),
  );
  popup.document.close();
}

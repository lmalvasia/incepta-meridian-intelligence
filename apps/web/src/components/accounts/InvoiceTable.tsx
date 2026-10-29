import type { AccountInvoicesResponse } from "../../types/dashboard";
import { formatMoney } from "../../utils/money";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";

type InvoiceTableProps = {
  invoices: AccountInvoicesResponse["invoices"];
};

export function InvoiceTable({ invoices }: InvoiceTableProps) {
  if (invoices.length === 0) {
    return <p className="text-sm text-muted-foreground">No invoices in this year.</p>;
  }
  return (
    <div className="overflow-hidden rounded-xl bg-card ring-1 ring-foreground/10">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Invoice</TableHead>
            <TableHead>Date</TableHead>
            <TableHead>Status</TableHead>
            <TableHead>Service line</TableHead>
            <TableHead>Amount</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {invoices.map((invoice) => (
            <TableRow key={`${invoice.billingSystem}-${invoice.sourceInvoiceId}`}>
              <TableCell>{invoice.sourceInvoiceId}</TableCell>
              <TableCell>{invoice.invoiceDate}</TableCell>
              <TableCell>{invoice.status}</TableCell>
              <TableCell>{invoice.serviceLine ?? "—"}</TableCell>
              <TableCell>{formatMoney(invoice.amount)}</TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  );
}

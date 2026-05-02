import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Search, Eye, Printer } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { format } from "date-fns";

interface BillItem {
  productName: string;
  quantity: number;
  unitPrice: number;
  discount: number;
  gst: number;
  amount: number;
  hsnCode?: string;
}

interface CompanySnapshot {
  bankName?: string | null;
  accountNumber?: string | null;
  ifsc?: string | null;
  upiId?: string | null;
  qrCodePath?: string | null;
}

interface Bill {
  id: number;
  billNumber: string;
  customerName: string;
  customerAddress?: string | null;
  customerPhone?: string | null;
  customerGst?: string | null;
  items: BillItem[];
  subtotal: string;
  totalDiscount: string;
  totalGst: string;
  totalAmount: string;
  amountInWords?: string | null;
  companySnapshot?: CompanySnapshot | null;
  createdAt: string;
}

async function fetchInvoices(search = "") {
  const url = search ? `/api/bills?search=${encodeURIComponent(search)}` : "/api/bills";
  const token = localStorage.getItem("dhasvin_token");
  const response = await fetch(url, {
    method: "GET",
    headers: token ? { Authorization: `Bearer ${token}` } : undefined,
  });

  if (!response.ok) {
    throw new Error("Failed to load invoices");
  }

  return response.json() as Promise<Bill[]>;
}

export default function Invoices() {
  const [search, setSearch] = useState("");
  const [selectedInvoice, setSelectedInvoice] = useState<Bill | null>(null);

  const { data: invoices, isLoading } = useQuery<Bill[]>({
    queryKey: ["invoices", search],
    queryFn: () => fetchInvoices(search),
  });

  const invoiceList = invoices ?? [];

  const handlePrint = () => {
    window.print();
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h2 className="text-2xl font-bold text-white tracking-tight">Invoice Archive</h2>
          <p className="text-sm text-muted-foreground mt-1">Search and view all generated invoices with company branding and payment details.</p>
        </div>
        <div className="relative w-full sm:w-96">
          <Search className="absolute left-3 top-3 text-muted-foreground" size={16} />
          <Input
            value={search}
            onChange={(event) => setSearch(event.target.value)}
            placeholder="Search by invoice number or customer"
            className="pl-10"
          />
        </div>
      </div>

      <div className="glass-panel rounded-xl border border-gray-200 dark:border-white/10 overflow-hidden">
        <div className="grid grid-cols-12 gap-4 px-5 py-4 bg-gray-100 dark:bg-white/5 text-xs uppercase tracking-[0.15em] text-gray-700 dark:text-muted-foreground">
          <span className="col-span-2">Invoice</span>
          <span className="col-span-3">Customer</span>
          <span className="col-span-3">Date</span>
          <span className="col-span-3">Total</span>
          <span className="col-span-1 text-right">Action</span>
        </div>
        <div className="divide-y divide-white/10">
          {isLoading ? (
            <div className="p-8 text-center text-muted-foreground">Loading invoices...</div>
          ) : invoiceList.length === 0 ? (
            <div className="p-8 text-center text-muted-foreground">No invoices to display.</div>
          ) : (
            invoiceList.map((invoice) => (
              <div key={invoice.id} className="grid grid-cols-12 gap-4 px-5 py-4 items-center hover:bg-gray-50 dark:hover:bg-white/5 transition-all duration-200 even:bg-gray-50/70 dark:even:bg-transparent">
                <div className="col-span-2 text-gray-900 dark:text-white font-medium">{invoice.billNumber}</div>
                <div className="col-span-3 text-gray-700 dark:text-muted-foreground truncate">{invoice.customerName}</div>
                <div className="col-span-3 text-gray-700 dark:text-muted-foreground">{format(new Date(invoice.createdAt), "dd MMM yyyy")}</div>
                <div className="col-span-3 text-right text-gray-900 dark:text-white font-semibold">₹{Number(invoice.totalAmount).toFixed(2)}</div>
                <div className="col-span-1 flex justify-end">
                  <Button variant="outline" size="sm" onClick={() => setSelectedInvoice(invoice)}>
                    <Eye size={16} />
                  </Button>
                </div>
              </div>
            ))
          )}
        </div>
      </div>

      <Dialog open={Boolean(selectedInvoice)} onOpenChange={(open) => !open && setSelectedInvoice(null)}>
        <DialogContent className="max-w-4xl bg-white dark:bg-slate-900 border border-gray-200 dark:border-white/10">
          <DialogHeader>
            <DialogTitle className="text-gray-900 dark:text-white">Invoice Details</DialogTitle>
          </DialogHeader>
          {selectedInvoice ? (
            <div className="space-y-6">
              <div className="flex flex-col gap-3 sm:flex-row sm:justify-between sm:items-end">
                <div>
                  <p className="text-sm text-gray-700 dark:text-muted-foreground">Invoice</p>
                  <h3 className="text-xl font-semibold text-gray-900 dark:text-white">{selectedInvoice.billNumber}</h3>
                </div>
                <div className="flex gap-2 flex-wrap">
                  <Button variant="outline" onClick={() => setSelectedInvoice(null)}>Close</Button>
                  <Button onClick={handlePrint} className="bg-primary text-white hover:bg-primary/90 transition-all duration-200">
                    <Printer size={16} className="mr-2" /> Print
                  </Button>
                </div>
              </div>

              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 bg-white dark:bg-slate-950/80 shadow-md rounded-xl p-6 border border-gray-200 dark:border-white/10">
                <div className="space-y-4">
                  <div className="space-y-1">
                    <p className="text-xs text-gray-700 dark:text-muted-foreground uppercase tracking-[0.2em]">Customer</p>
                    <p className="text-sm text-gray-800 dark:text-white font-medium">{selectedInvoice.customerName}</p>
                    {selectedInvoice.customerPhone && <p className="text-sm text-gray-700 dark:text-muted-foreground">{selectedInvoice.customerPhone}</p>}
                    {selectedInvoice.customerGst && <p className="text-sm text-gray-700 dark:text-muted-foreground">GSTIN: {selectedInvoice.customerGst}</p>}
                  </div>
                  <div className="space-y-1">
                    <p className="text-xs text-gray-700 dark:text-muted-foreground uppercase tracking-[0.2em]">Billing Address</p>
                    <p className="text-sm text-gray-800 dark:text-white">{selectedInvoice.customerAddress || "N/A"}</p>
                  </div>
                </div>
                <div className="space-y-3 text-left lg:text-right">
                  <div>
                    <p className="text-xs text-gray-700 dark:text-muted-foreground uppercase tracking-[0.2em]">Invoice Date</p>
                    <p className="text-sm text-gray-800 dark:text-white">{format(new Date(selectedInvoice.createdAt), "dd MMM yyyy")}</p>
                  </div>
                  <div>
                    <p className="text-xs text-gray-700 dark:text-muted-foreground uppercase tracking-[0.2em]">Amount Due</p>
                    <p className="text-xl font-semibold text-gray-900 dark:text-white">₹{Number(selectedInvoice.totalAmount).toFixed(2)}</p>
                    <p className="text-sm text-gray-700 dark:text-muted-foreground">{selectedInvoice.amountInWords}</p>
                  </div>
                </div>
              </div>

              <div className="overflow-x-auto rounded-xl border border-gray-200 dark:border-white/10 bg-white dark:bg-slate-950/80 p-4 shadow-md">
                <table className="min-w-full text-left text-sm text-gray-800 dark:text-white">
                  <thead>
                    <tr className="border-b border-gray-200 dark:border-white/10 text-xs uppercase text-gray-700 dark:text-muted-foreground bg-gray-100 dark:bg-slate-900">
                      <th className="py-3 px-2">Item</th>
                      <th className="py-3 px-2 text-center">Qty</th>
                      <th className="py-3 px-2 text-right">Rate</th>
                      <th className="py-3 px-2 text-center">GST</th>
                      <th className="py-3 px-2 text-right">Amount</th>
                    </tr>
                  </thead>
                  <tbody>
                    {selectedInvoice.items.map((item, index) => (
                      <tr key={index} className="border-b border-gray-200 dark:border-white/10 even:bg-gray-50 dark:even:bg-slate-900/50">
                        <td className="py-3 px-2">
                          <div className="font-medium">{item.productName}</div>
                          {item.hsnCode && <div className="text-xs text-gray-600 dark:text-muted-foreground">HSN: {item.hsnCode}</div>}
                        </td>
                        <td className="py-3 px-2 text-center">{item.quantity}</td>
                        <td className="py-3 px-2 text-right">₹{item.unitPrice.toFixed(2)}</td>
                        <td className="py-3 px-2 text-center">{item.gst}%</td>
                        <td className="py-3 px-2 text-right">₹{item.amount.toFixed(2)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="rounded-xl border border-gray-200 dark:border-white/10 bg-white dark:bg-slate-950/80 p-4 shadow-md">
                  <h4 className="text-sm text-gray-600 dark:text-muted-foreground uppercase tracking-[0.2em]">Payment Info</h4>
                  <p className="text-sm text-gray-800 dark:text-white">{(selectedInvoice.companySnapshot?.bankName as string) || "Bank details not configured"}</p>
                  {(selectedInvoice.companySnapshot?.accountNumber || selectedInvoice.companySnapshot?.ifsc) && (
                    <p className="text-sm text-gray-700 dark:text-muted-foreground mt-2">Account: {selectedInvoice.companySnapshot?.accountNumber || "-"} / IFSC: {(selectedInvoice.companySnapshot?.ifsc as string) || "-"}</p>
                  )}
                  {selectedInvoice.companySnapshot?.upiId && <p className="text-sm text-gray-700 dark:text-muted-foreground mt-2">UPI: {selectedInvoice.companySnapshot.upiId as string}</p>}
                </div>
                {selectedInvoice.companySnapshot?.qrCodePath && (
                  <div className="rounded-xl border border-gray-200 dark:border-white/10 bg-white dark:bg-slate-950/80 p-4 flex items-center justify-center shadow-md">
                    <img
                      src={selectedInvoice.companySnapshot.qrCodePath as string}
                      alt="Payment QR"
                      className="max-h-40 object-contain"
                    />
                  </div>
                )}
              </div>
            </div>
          ) : null}
        </DialogContent>
      </Dialog>
    </div>
  );
}

import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Search, Eye, Printer } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { format } from "date-fns";
import { getApiUrl } from "@/lib/api-utils";

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
  const url = search ? getApiUrl(`/api/bills?search=${encodeURIComponent(search)}`) : getApiUrl("/api/bills");
  const token = localStorage.getItem("dhasvin_token");
  const response = await fetch(url, {
    method: "GET",
    headers: token ? { Authorization: `Bearer ${token}` } : undefined,
  });
  if (!response.ok) throw new Error("Failed to load invoices");
  return response.json() as Promise<Bill[]>;
}

/** Shared invoice paper content — used both in dialog preview and print area */
function InvoiceContent({ inv }: { inv: Bill }) {
  const snap = inv.companySnapshot;
  return (
    <div style={{ padding: "32px", background: "#ffffff", color: "#1e293b", fontFamily: "Inter, sans-serif", colorScheme: "light" as const }}>
      {/* Header */}
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: "24px", borderBottom: "2px solid #3B82F6", paddingBottom: "16px" }}>
        <div>
          <h2 style={{ margin: "0 0 4px 0", fontSize: "20px", fontWeight: 700, color: "#0f172a", letterSpacing: "2px" }}>TAX INVOICE</h2>
          <p style={{ margin: 0, fontSize: "12px", color: "#64748b" }}>ORIGINAL FOR RECIPIENT</p>
        </div>
        <div style={{ textAlign: "right" }}>
          <p style={{ margin: 0, fontSize: "20px", fontWeight: 700, color: "#1d4ed8" }}>{inv.billNumber}</p>
          <p style={{ margin: "4px 0 0 0", fontSize: "12px", color: "#64748b" }}>{format(new Date(inv.createdAt), "dd MMM yyyy")}</p>
        </div>
      </div>

      {/* Customer & Amount */}
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "24px", marginBottom: "24px" }}>
        <div>
          <p style={{ margin: "0 0 6px 0", fontSize: "10px", fontWeight: 600, color: "#64748b", textTransform: "uppercase", letterSpacing: "0.15em" }}>CUSTOMER</p>
          <p style={{ margin: 0, fontSize: "14px", fontWeight: 700, color: "#0f172a" }}>{inv.customerName}</p>
          {inv.customerPhone && <p style={{ margin: "4px 0 0 0", fontSize: "12px", color: "#334155" }}>{inv.customerPhone}</p>}
          {inv.customerGst && <p style={{ margin: "4px 0 0 0", fontSize: "12px", color: "#334155" }}>GSTIN: <strong style={{ color: "#0f172a" }}>{inv.customerGst}</strong></p>}
          {inv.customerAddress && (
            <div style={{ marginTop: "10px" }}>
              <p style={{ margin: "0 0 4px 0", fontSize: "10px", fontWeight: 600, color: "#64748b", textTransform: "uppercase", letterSpacing: "0.15em" }}>BILLING ADDRESS</p>
              <p style={{ margin: 0, fontSize: "12px", color: "#334155" }}>{inv.customerAddress}</p>
            </div>
          )}
        </div>
        <div style={{ textAlign: "right" }}>
          <p style={{ margin: "0 0 6px 0", fontSize: "10px", fontWeight: 600, color: "#64748b", textTransform: "uppercase", letterSpacing: "0.15em" }}>AMOUNT DUE</p>
          <p style={{ margin: 0, fontSize: "28px", fontWeight: 800, color: "#1d4ed8" }}>₹{Number(inv.totalAmount).toFixed(2)}</p>
          {inv.amountInWords && <p style={{ margin: "6px 0 0 0", fontSize: "11px", color: "#64748b", fontStyle: "italic" }}>{inv.amountInWords}</p>}
        </div>
      </div>

      {/* Items table */}
      <table style={{ width: "100%", borderCollapse: "collapse", marginBottom: "16px", fontSize: "12px" }}>
        <thead>
          <tr style={{ background: "#f0f4ff" }}>
            {["Item", "Qty", "Rate", "GST", "Amount"].map((h, i) => (
              <th key={h} style={{ padding: "10px 8px", textAlign: i === 0 ? "left" : i === 4 || i === 2 ? "right" : "center", borderTop: "2px solid #3B82F6", borderBottom: "1px solid #3B82F6", color: "#1e293b", fontWeight: 700 }}>{h}</th>
            ))}
          </tr>
        </thead>
        <tbody>
          {inv.items.map((item, index) => (
            <tr key={index} style={{ background: index % 2 === 0 ? "#ffffff" : "#f8fafc", borderBottom: "1px solid #e2e8f0" }}>
              <td style={{ padding: "10px 8px" }}>
                <div style={{ fontWeight: 600, color: "#0f172a" }}>{item.productName}</div>
                {item.hsnCode && <div style={{ fontSize: "10px", color: "#64748b", marginTop: "2px" }}>HSN: {item.hsnCode}</div>}
              </td>
              <td style={{ padding: "10px 8px", textAlign: "center", color: "#1e293b" }}>{item.quantity}</td>
              <td style={{ padding: "10px 8px", textAlign: "right", color: "#0f172a", fontWeight: 600 }}>₹{item.unitPrice.toFixed(2)}</td>
              <td style={{ padding: "10px 8px", textAlign: "center", color: "#1e293b" }}>{item.gst}%</td>
              <td style={{ padding: "10px 8px", textAlign: "right", color: "#0f172a", fontWeight: 700 }}>₹{item.amount.toFixed(2)}</td>
            </tr>
          ))}
        </tbody>
        <tfoot>
          <tr style={{ borderTop: "2px solid #3B82F6", background: "#f0f4ff" }}>
            <td colSpan={4} style={{ padding: "10px 8px", textAlign: "right", fontWeight: 700, color: "#0f172a", fontSize: "14px" }}>TOTAL</td>
            <td style={{ padding: "10px 8px", textAlign: "right", fontWeight: 800, color: "#1d4ed8", fontSize: "14px" }}>₹{Number(inv.totalAmount).toFixed(2)}</td>
          </tr>
        </tfoot>
      </table>

      {/* Payment Info */}
      <div style={{ display: "grid", gridTemplateColumns: snap?.qrCodePath ? "1fr auto" : "1fr", gap: "20px", marginTop: "20px", paddingTop: "16px", borderTop: "1px solid #e2e8f0" }}>
        <div>
          <p style={{ margin: "0 0 8px 0", fontSize: "10px", fontWeight: 600, color: "#64748b", textTransform: "uppercase", letterSpacing: "0.15em" }}>PAYMENT INFO</p>
          {snap?.bankName && <p style={{ margin: 0, fontSize: "13px", fontWeight: 700, color: "#0f172a" }}>{snap.bankName}</p>}
          {(snap?.accountNumber || snap?.ifsc) && (
            <p style={{ margin: "4px 0 0 0", fontSize: "12px", color: "#334155" }}>
              Account: <strong style={{ color: "#0f172a" }}>{snap?.accountNumber || "—"}</strong>
              {" | "}
              IFSC: <strong style={{ color: "#0f172a" }}>{snap?.ifsc || "—"}</strong>
            </p>
          )}
          {snap?.upiId && <p style={{ margin: "4px 0 0 0", fontSize: "12px", color: "#334155" }}>UPI: <strong style={{ color: "#1d4ed8" }}>{snap.upiId}</strong></p>}
          {!snap?.bankName && !snap?.upiId && <p style={{ margin: 0, fontSize: "12px", color: "#94a3b8" }}>Bank details not configured</p>}
        </div>
        {snap?.qrCodePath && (
          <div style={{ display: "flex", flexDirection: "column", alignItems: "center" }}>
            <p style={{ margin: "0 0 6px 0", fontSize: "10px", fontWeight: 600, color: "#64748b", textTransform: "uppercase" }}>SCAN TO PAY</p>
            <img src={snap.qrCodePath.startsWith('http') ? snap.qrCodePath : `${(import.meta as any).env.VITE_API_URL}${snap.qrCodePath}`} alt="Payment QR" style={{ width: "90px", height: "90px", objectFit: "contain", border: "1px solid #e2e8f0", padding: "4px", borderRadius: "6px" }} />
          </div>
        )}
      </div>

      {/* Footer */}
      <div style={{ marginTop: "24px", paddingTop: "12px", borderTop: "1px solid #e2e8f0", display: "flex", justifyContent: "space-between" }}>
        <p style={{ margin: 0, fontSize: "10px", color: "#94a3b8" }}>Dhasvin Enterprises · Inventory Management</p>
        <p style={{ margin: 0, fontSize: "10px", color: "#94a3b8" }}>{inv.billNumber} · {format(new Date(inv.createdAt), "dd MMM yyyy")}</p>
      </div>
    </div>
  );
}

export default function Invoices() {
  const [search, setSearch] = useState("");
  const [selectedInvoice, setSelectedInvoice] = useState<Bill | null>(null);

  const { data: invoices, isLoading } = useQuery<Bill[]>({
    queryKey: ["invoices", search],
    queryFn: () => fetchInvoices(search),
  });

  const invoiceList = invoices ?? [];

  const handlePrint = () => window.print();

  return (
    <div className="space-y-6">
      {/* ── Hidden print-only area (in normal page flow, outside dialog) ── */}
      {selectedInvoice && (
        <div id="invoice-print-area" style={{ display: "none" }}>
          <InvoiceContent inv={selectedInvoice} />
        </div>
      )}

      {/* ── Page header ── */}
      <div className="no-print flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h2 className="text-2xl font-bold text-white tracking-tight">Invoice Archive</h2>
          <p className="text-sm text-muted-foreground mt-1">Search and view all generated invoices with company branding and payment details.</p>
        </div>
        <div className="relative w-full sm:w-96">
          <Search className="absolute left-3 top-3 text-muted-foreground" size={16} />
          <Input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Search by invoice number or customer" className="pl-10" />
        </div>
      </div>

      {/* ── Invoice list ── */}
      <div className="no-print glass-panel rounded-xl border border-gray-200 dark:border-white/10 overflow-hidden">
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

      {/* ── Dialog preview (screen only) ── */}
      <Dialog open={Boolean(selectedInvoice)} onOpenChange={(open) => !open && setSelectedInvoice(null)}>
        <DialogContent className="no-print max-w-4xl bg-white dark:bg-slate-900 border border-gray-200 dark:border-white/10 max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="text-gray-900 dark:text-white">Invoice Details</DialogTitle>
          </DialogHeader>
          {selectedInvoice && (
            <div className="space-y-4">
              <div className="flex flex-col gap-3 sm:flex-row sm:justify-between sm:items-center">
                <div>
                  <p className="text-xs text-muted-foreground">Invoice</p>
                  <h3 className="text-xl font-semibold text-gray-900 dark:text-white">{selectedInvoice.billNumber}</h3>
                </div>
                <div className="flex gap-2">
                  <Button variant="outline" onClick={() => setSelectedInvoice(null)}>Close</Button>
                  <Button onClick={handlePrint} className="bg-primary text-white hover:bg-primary/90">
                    <Printer size={16} className="mr-2" /> Print
                  </Button>
                </div>
              </div>
              {/* Reuse the same InvoiceContent component for preview */}
              <div className="rounded-xl border border-gray-200 dark:border-white/10 overflow-hidden">
                <InvoiceContent inv={selectedInvoice} />
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}

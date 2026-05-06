import * as React from "react";
import { Layout } from "@/components/layout";
import {
  useGetProducts,
  useCreateProduct,
  useUpdateProduct,
  useDeleteProduct,
  useGetCategories,
  useGetSuppliers,
} from "@workspace/api-client-react";
import { formatCurrency, getApiBase } from "@/lib/utils";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Modal } from "@/components/ui/modal";
import { useAuth } from "@/hooks/use-auth";
import {
  Search, Plus, Upload, Edit, Trash2, CheckCircle2, AlertTriangle,
  XCircle, Tag, Package, ChevronLeft, ChevronRight, Filter, X,
  FileSpreadsheet, CheckCheck, Info, Loader2, Ban
} from "lucide-react";
import { useForm } from "react-hook-form";
import { useQueryClient } from "@tanstack/react-query";
import { useToast } from "@/hooks/use-toast";
import { motion, AnimatePresence } from "framer-motion";

type StockStatus = "in_stock" | "low_stock" | "out_of_stock" | "not_for_sale";

function getStockStatus(qty: number, reorder: number, notForSale: boolean): StockStatus {
  if (notForSale) return "not_for_sale";
  if (qty <= 0) return "out_of_stock";
  if (qty <= reorder) return "low_stock";
  return "in_stock";
}

function StockBadge({ status }: { status: StockStatus }) {
  const configs: Record<StockStatus, { label: string; icon: React.ReactNode; cls: string }> = {
    in_stock: {
      label: "In Stock",
      icon: <CheckCircle2 className="w-3.5 h-3.5" />,
      cls: "bg-emerald-100 text-emerald-800 border border-emerald-200",
    },
    low_stock: {
      label: "Low Stock",
      icon: <AlertTriangle className="w-3.5 h-3.5" />,
      cls: "bg-amber-100 text-amber-800 border border-amber-200",
    },
    out_of_stock: {
      label: "Out of Stock",
      icon: <XCircle className="w-3.5 h-3.5" />,
      cls: "bg-red-100 text-red-700 border border-red-200",
    },
    not_for_sale: {
      label: "Not For Sale",
      icon: <Ban className="w-3.5 h-3.5" />,
      cls: "bg-slate-100 text-slate-600 border border-slate-200",
    },
  };
  const { label, icon, cls } = configs[status];
  return (
    <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold ${cls}`}>
      {icon} {label}
    </span>
  );
}

function QtyDisplay({ qty, units, status }: { qty: number; units: string; status: StockStatus }) {
  const color = status === "in_stock" ? "text-emerald-700" : status === "low_stock" ? "text-amber-700" : "text-red-600";
  return (
    <span className={`font-semibold tabular-nums ${color}`}>
      {qty.toLocaleString("en-IN")} <span className="text-xs font-normal text-slate-500">{units}</span>
    </span>
  );
}

function ImportPreviewModal({
  isOpen, onClose, previewData, onConfirm, isConfirming,
}: {
  isOpen: boolean;
  onClose: () => void;
  previewData: { rows: any[]; summary: any } | null;
  onConfirm: () => void;
  isConfirming: boolean;
}) {
  if (!previewData) return null;
  const { rows, summary } = previewData;

  const statusConfig: Record<string, { cls: string; label: string }> = {
    in_stock: { cls: "bg-emerald-100 text-emerald-700", label: "In Stock" },
    low_stock: { cls: "bg-amber-100 text-amber-700", label: "Low Stock" },
    out_of_stock: { cls: "bg-red-100 text-red-700", label: "Out of Stock" },
    not_for_sale: { cls: "bg-slate-100 text-slate-600", label: "Not For Sale" },
  };

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="" size="full">
      <div className="flex flex-col h-full max-h-[85vh]">
        <div className="flex items-start justify-between mb-6 flex-shrink-0">
          <div>
            <h2 className="text-2xl font-bold text-slate-800 flex items-center gap-2">
              <FileSpreadsheet className="w-6 h-6 text-indigo-600" /> Import Preview
            </h2>
            <p className="text-slate-500 mt-1 text-sm">Review the data below before confirming the import.</p>
          </div>
        </div>

        <div className="grid grid-cols-2 md:grid-cols-6 gap-3 mb-6 flex-shrink-0">
          {[
            { label: "Total Rows", val: summary.total, cls: "bg-slate-50 border-slate-200" },
            { label: "Valid", val: summary.valid, cls: "bg-emerald-50 border-emerald-200 text-emerald-800" },
            { label: "Invalid", val: summary.invalid, cls: "bg-red-50 border-red-200 text-red-700" },
            { label: "New Products", val: summary.newProducts, cls: "bg-blue-50 border-blue-200 text-blue-800" },
            { label: "To Update", val: summary.existingProducts, cls: "bg-amber-50 border-amber-200 text-amber-800" },
            { label: "New Categories", val: summary.newCategories, cls: "bg-purple-50 border-purple-200 text-purple-800" },
          ].map((s) => (
            <div key={s.label} className={`border rounded-xl p-3 text-center ${s.cls}`}>
              <div className="text-2xl font-bold">{s.val}</div>
              <div className="text-xs font-medium opacity-80 mt-0.5">{s.label}</div>
            </div>
          ))}
        </div>

        <div className="flex-1 overflow-auto border border-slate-200 rounded-xl min-h-0">
          <table className="w-full text-sm">
            <thead className="bg-slate-50 sticky top-0 z-10">
              <tr>
                <th className="text-left px-4 py-3 font-semibold text-slate-600 border-b">Product Name</th>
                <th className="text-left px-4 py-3 font-semibold text-slate-600 border-b">Category</th>
                <th className="text-left px-4 py-3 font-semibold text-slate-600 border-b">Supplier</th>
                <th className="text-right px-4 py-3 font-semibold text-slate-600 border-b">Qty</th>
                <th className="text-right px-4 py-3 font-semibold text-slate-600 border-b">Price</th>
                <th className="text-center px-4 py-3 font-semibold text-slate-600 border-b">Status</th>
                <th className="text-center px-4 py-3 font-semibold text-slate-600 border-b">Action</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((row, i) => {
                const sc = statusConfig[row.stockStatus] || statusConfig.in_stock;
                return (
                  <tr key={i} className={`border-b border-slate-100 hover:bg-slate-50 transition-colors ${i % 2 === 0 ? "" : "bg-slate-50/50"}`}>
                    <td className="px-4 py-3 font-semibold text-slate-800 max-w-[200px] truncate">{row.name}</td>
                    <td className="px-4 py-3 text-slate-600">{row.category || <span className="text-slate-400">—</span>}</td>
                    <td className="px-4 py-3 text-slate-600">{row.supplier || <span className="text-slate-400">—</span>}</td>
                    <td className="px-4 py-3 text-right tabular-nums font-medium">{row.quantity}</td>
                    <td className="px-4 py-3 text-right tabular-nums font-medium">{formatCurrency(row.unitPrice)}</td>
                    <td className="px-4 py-3 text-center">
                      <span className={`text-xs font-semibold px-2 py-0.5 rounded-full ${sc.cls}`}>{sc.label}</span>
                    </td>
                    <td className="px-4 py-3 text-center">
                      {row.action === "update" ? (
                        <span className="text-xs font-semibold px-2 py-0.5 rounded-full bg-amber-100 text-amber-700">Update</span>
                      ) : (
                        <span className="text-xs font-semibold px-2 py-0.5 rounded-full bg-blue-100 text-blue-700">New</span>
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>

        <div className="flex justify-between items-center pt-5 flex-shrink-0 border-t mt-4">
          <p className="text-sm text-slate-500">
            <Info className="w-4 h-4 inline mr-1" />
            {summary.newCategories > 0 && `${summary.newCategories} new categories will be created. `}
            {summary.newSuppliers > 0 && `${summary.newSuppliers} new suppliers will be created.`}
          </p>
          <div className="flex gap-3">
            <Button variant="outline" onClick={onClose} disabled={isConfirming}>Cancel</Button>
            <Button
              variant="gradient"
              onClick={onConfirm}
              isLoading={isConfirming}
              className="gap-2"
            >
              <CheckCheck className="w-4 h-4" />
              Confirm Import ({summary.valid} rows)
            </Button>
          </div>
        </div>
      </div>
    </Modal>
  );
}

export default function Inventory() {
  const { user } = useAuth();
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const [search, setSearch] = React.useState("");
  const [debouncedSearch, setDebouncedSearch] = React.useState("");
  const [statusFilter, setStatusFilter] = React.useState("");
  const [categoryFilter, setCategoryFilter] = React.useState("");
  const [page, setPage] = React.useState(1);
  const [isModalOpen, setIsModalOpen] = React.useState(false);
  const [editingId, setEditingId] = React.useState<number | null>(null);
  const [isImporting, setIsImporting] = React.useState(false);
  const [isConfirming, setIsConfirming] = React.useState(false);
  const [previewData, setPreviewData] = React.useState<{ rows: any[]; summary: any } | null>(null);
  const [isPreviewOpen, setIsPreviewOpen] = React.useState(false);
  const fileInputRef = React.useRef<HTMLInputElement>(null);

  React.useEffect(() => {
    const t = setTimeout(() => { setDebouncedSearch(search); setPage(1); }, 350);
    return () => clearTimeout(t);
  }, [search]);

  const { data, isLoading } = useGetProducts({
    search: debouncedSearch,
    limit: 50,
    page,
    status: statusFilter || undefined,
    category: categoryFilter || undefined,
  });

  const { data: categories } = useGetCategories();
  const { data: suppliers } = useGetSuppliers();

  const { mutate: createProd, isPending: isCreating } = useCreateProduct({
    mutation: {
      onSuccess: () => {
        queryClient.invalidateQueries({ queryKey: ["/api/products"] });
        setIsModalOpen(false);
        toast({ title: "Product Created", description: "Product has been added to inventory." });
      },
    },
  });

  const { mutate: updateProd, isPending: isUpdating } = useUpdateProduct({
    mutation: {
      onSuccess: () => {
        queryClient.invalidateQueries({ queryKey: ["/api/products"] });
        setIsModalOpen(false);
        toast({ title: "Product Updated", description: "Product details saved." });
      },
    },
  });

  const { mutate: deleteProd } = useDeleteProduct({
    mutation: {
      onSuccess: () => {
        queryClient.invalidateQueries({ queryKey: ["/api/products"] });
        toast({ title: "Deleted", description: "Product removed from inventory." });
      },
    },
  });

  const { register, handleSubmit, reset } = useForm();

  const openCreate = () => { reset(); setEditingId(null); setIsModalOpen(true); };
  const openEdit = (product: any) => { reset(product); setEditingId(product.id); setIsModalOpen(true); };

  const onSubmit = (data: any) => {
    const payload = {
      ...data,
      categoryId: data.categoryId ? Number(data.categoryId) : undefined,
      supplierId: data.supplierId ? Number(data.supplierId) : undefined,
      unitPrice: Number(data.unitPrice),
      quantity: Number(data.quantity),
      tax: Number(data.tax),
    };
    if (editingId) updateProd({ id: editingId, data: payload });
    else createProd({ data: payload });
  };

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    e.target.value = "";

    setIsImporting(true);
    try {
      const token = localStorage.getItem("token");
      const formData = new FormData();
      formData.append("file", file);
      const res = await fetch(`${getApiBase()}/api/products/import/preview`, {
        method: "POST",
        headers: token ? { Authorization: `Bearer ${token}` } : {},
        body: formData,
      });
      if (!res.ok) throw new Error("Preview failed");
      const data = await res.json();
      setPreviewData(data);
      setIsPreviewOpen(true);
    } catch (err) {
      toast({ title: "Import Error", description: "Failed to parse the file. Please check the format.", variant: "destructive" });
    } finally {
      setIsImporting(false);
    }
  };

  const handleConfirmImport = async () => {
    if (!previewData) return;
    setIsConfirming(true);
    try {
      const token = localStorage.getItem("token");
      const res = await fetch(`${getApiBase()}/api/products/import/confirm`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
        body: JSON.stringify({ rows: previewData.rows }),
      });
      if (!res.ok) throw new Error("Confirm failed");
      const result = await res.json();
      setIsPreviewOpen(false);
      setPreviewData(null);
      queryClient.invalidateQueries({ queryKey: ["/api/products"] });
      queryClient.invalidateQueries({ queryKey: ["/api/categories"] });
      queryClient.invalidateQueries({ queryKey: ["/api/suppliers"] });
      toast({
        title: "Import Successful!",
        description: `${result.imported} products imported · ${result.updated} updated · ${result.categoriesCreated} categories created · ${result.suppliersCreated} suppliers created`,
      });
    } catch {
      toast({ title: "Import Failed", description: "Something went wrong during import.", variant: "destructive" });
    } finally {
      setIsConfirming(false);
    }
  };

  const canEdit = user?.role === "admin" || user?.role === "staff";
  const products = data?.products || [];
  const total = data?.total || 0;
  const totalPages = data?.totalPages || 1;

  const hasFilters = !!statusFilter || !!categoryFilter || !!debouncedSearch;

  return (
    <Layout>
      <div className="space-y-6">
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
          <div>
            <h1 className="text-3xl font-display font-bold text-foreground">Inventory</h1>
            <p className="text-muted-foreground mt-1">
              {total > 0 ? `${total.toLocaleString("en-IN")} products in catalog` : "Manage your product catalog and stock levels."}
            </p>
          </div>
          {canEdit && (
            <div className="flex gap-3 flex-shrink-0">
              <input
                ref={fileInputRef}
                type="file"
                accept=".xlsx,.xls,.csv"
                className="hidden"
                onChange={handleFileChange}
              />
              <Button
                variant="outline"
                className="bg-white border-2 hover:border-indigo-400 hover:bg-indigo-50 hover:text-indigo-700 transition-all"
                onClick={() => fileInputRef.current?.click()}
                isLoading={isImporting}
              >
                <Upload className="w-4 h-4 mr-2" />
                Import Excel
              </Button>
              <Button variant="gradient" onClick={openCreate}>
                <Plus className="w-4 h-4 mr-2" />
                Add Product
              </Button>
            </div>
          )}
        </div>

        <div className="bg-white p-4 rounded-2xl shadow-sm border border-slate-100 flex flex-col sm:flex-row gap-3 items-start sm:items-center">
          <div className="relative flex-1 max-w-md">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
            <input
              placeholder="Search products, HSN code, barcode..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full pl-10 pr-4 h-11 rounded-xl border-2 border-slate-200 bg-slate-50 text-sm focus:outline-none focus:border-indigo-400 focus:bg-white transition-all"
            />
            {search && (
              <button onClick={() => setSearch("")} className="absolute right-3 top-1/2 -translate-y-1/2">
                <X className="w-4 h-4 text-slate-400 hover:text-slate-600" />
              </button>
            )}
          </div>
          <div className="flex gap-2 flex-wrap">
            <select
              value={statusFilter}
              onChange={(e) => { setStatusFilter(e.target.value); setPage(1); }}
              className="h-11 px-3 rounded-xl border-2 border-slate-200 bg-slate-50 text-sm focus:outline-none focus:border-indigo-400 focus:bg-white transition-all cursor-pointer"
            >
              <option value="">All Status</option>
              <option value="in_stock">In Stock</option>
              <option value="low_stock">Low Stock</option>
              <option value="out_of_stock">Out of Stock</option>
              <option value="not_for_sale">Not For Sale</option>
            </select>
            <select
              value={categoryFilter}
              onChange={(e) => { setCategoryFilter(e.target.value); setPage(1); }}
              className="h-11 px-3 rounded-xl border-2 border-slate-200 bg-slate-50 text-sm focus:outline-none focus:border-indigo-400 focus:bg-white transition-all cursor-pointer"
            >
              <option value="">All Categories</option>
              {categories?.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
            </select>
            {hasFilters && (
              <button
                onClick={() => { setSearch(""); setStatusFilter(""); setCategoryFilter(""); setPage(1); }}
                className="h-11 px-3 rounded-xl border-2 border-red-200 bg-red-50 text-red-600 text-sm font-medium hover:bg-red-100 flex items-center gap-1.5 transition-all"
              >
                <X className="w-3.5 h-3.5" /> Clear
              </button>
            )}
          </div>
        </div>

        {isLoading ? (
          <div className="bg-white rounded-2xl border border-slate-100 shadow-sm overflow-hidden">
            <div className="animate-pulse">
              {[1, 2, 3, 4, 5, 6].map((i) => (
                <div key={i} className="flex items-center gap-4 px-6 py-4 border-b border-slate-100">
                  <div className="w-8 h-8 bg-slate-200 rounded-lg" />
                  <div className="flex-1 space-y-2">
                    <div className="h-4 bg-slate-200 rounded w-1/3" />
                    <div className="h-3 bg-slate-100 rounded w-1/5" />
                  </div>
                  <div className="h-6 w-20 bg-slate-200 rounded-full" />
                  <div className="h-6 w-16 bg-slate-100 rounded" />
                </div>
              ))}
            </div>
          </div>
        ) : products.length === 0 ? (
          <div className="bg-white rounded-2xl border border-dashed border-slate-200 p-16 text-center">
            <Package className="w-12 h-12 text-slate-300 mx-auto mb-4" />
            <p className="font-semibold text-slate-500">No products found</p>
            <p className="text-sm text-slate-400 mt-1">{hasFilters ? "Try adjusting your filters." : "Import an Excel file or add a product to get started."}</p>
          </div>
        ) : (
          <div className="bg-white rounded-2xl border border-slate-100 shadow-sm overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="bg-slate-50 border-b border-slate-200">
                    <th className="text-left px-5 py-3.5 font-semibold text-slate-600 whitespace-nowrap">Product</th>
                    <th className="text-left px-4 py-3.5 font-semibold text-slate-600 whitespace-nowrap">Category</th>
                    <th className="text-right px-4 py-3.5 font-semibold text-slate-600 whitespace-nowrap">Price</th>
                    <th className="text-right px-4 py-3.5 font-semibold text-slate-600 whitespace-nowrap">Stock</th>
                    <th className="text-center px-4 py-3.5 font-semibold text-slate-600 whitespace-nowrap">Status</th>
                    {canEdit && <th className="text-right px-5 py-3.5 font-semibold text-slate-600 whitespace-nowrap">Actions</th>}
                  </tr>
                </thead>
                <tbody>
                  <AnimatePresence mode="popLayout">
                    {products.map((product, idx) => {
                      const qty = product.quantity || 0;
                      const reorder = product.reorderLevel || 10;
                      const status = getStockStatus(qty, reorder, product.notForSale || false);
                      return (
                        <motion.tr
                          key={product.id}
                          initial={{ opacity: 0, y: 6 }}
                          animate={{ opacity: 1, y: 0 }}
                          exit={{ opacity: 0 }}
                          transition={{ duration: 0.15, delay: idx * 0.01 }}
                          className="border-b border-slate-100 hover:bg-indigo-50/30 transition-colors group"
                        >
                          <td className="px-5 py-4">
                            <div className="flex items-center gap-3">
                              <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-indigo-100 to-purple-100 flex items-center justify-center flex-shrink-0">
                                <Package className="w-4 h-4 text-indigo-500" />
                              </div>
                              <div>
                                <p className="font-semibold text-slate-800 leading-tight">{product.name}</p>
                                {product.hsnCode && (
                                  <p className="text-xs text-slate-400 mt-0.5 font-mono">HSN: {product.hsnCode}</p>
                                )}
                              </div>
                            </div>
                          </td>
                          <td className="px-4 py-4">
                            {product.categoryName ? (
                              <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-slate-100 text-slate-600 text-xs font-medium">
                                <Tag className="w-3 h-3" /> {product.categoryName}
                              </span>
                            ) : (
                              <span className="text-slate-300">—</span>
                            )}
                          </td>
                          <td className="px-4 py-4 text-right">
                            <div>
                              <p className="font-bold text-slate-800 tabular-nums">{formatCurrency(product.unitPrice)}</p>
                              {product.tax > 0 && (
                                <p className="text-xs text-slate-400 tabular-nums">+{product.tax}% tax</p>
                              )}
                            </div>
                          </td>
                          <td className="px-4 py-4 text-right">
                            <QtyDisplay qty={qty} units={product.units || "NOS"} status={status} />
                          </td>
                          <td className="px-4 py-4 text-center">
                            <StockBadge status={status} />
                          </td>
                          {canEdit && (
                            <td className="px-5 py-4 text-right">
                              <div className="flex items-center justify-end gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                                <button
                                  onClick={() => openEdit(product)}
                                  className="p-2 rounded-lg text-blue-600 hover:bg-blue-50 transition-colors"
                                  title="Edit"
                                >
                                  <Edit className="w-4 h-4" />
                                </button>
                                <button
                                  onClick={() => { if (confirm(`Delete "${product.name}"?`)) deleteProd({ id: product.id }); }}
                                  className="p-2 rounded-lg text-red-500 hover:bg-red-50 transition-colors"
                                  title="Delete"
                                >
                                  <Trash2 className="w-4 h-4" />
                                </button>
                              </div>
                            </td>
                          )}
                        </motion.tr>
                      );
                    })}
                  </AnimatePresence>
                </tbody>
              </table>
            </div>

            {totalPages > 1 && (
              <div className="px-5 py-4 border-t border-slate-100 flex items-center justify-between bg-slate-50/50">
                <p className="text-sm text-slate-500">
                  Page {page} of {totalPages} · {total.toLocaleString("en-IN")} total
                </p>
                <div className="flex gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setPage((p) => Math.max(1, p - 1))}
                    disabled={page === 1}
                  >
                    <ChevronLeft className="w-4 h-4" />
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                    disabled={page >= totalPages}
                  >
                    <ChevronRight className="w-4 h-4" />
                  </Button>
                </div>
              </div>
            )}
          </div>
        )}

        <Modal
          isOpen={isModalOpen}
          onClose={() => setIsModalOpen(false)}
          title={editingId ? "Edit Product" : "Add New Product"}
        >
          <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
            <div className="space-y-2">
              <label className="text-sm font-semibold text-foreground">Name *</label>
              <Input {...register("name", { required: true })} placeholder="Product Name" />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <label className="text-sm font-semibold text-foreground">Category</label>
                <select {...register("categoryId")} className="w-full h-11 rounded-xl border-2 border-input bg-white px-4 py-2 text-sm focus:outline-none focus:border-primary">
                  <option value="">Select...</option>
                  {categories?.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
                </select>
              </div>
              <div className="space-y-2">
                <label className="text-sm font-semibold text-foreground">Supplier</label>
                <select {...register("supplierId")} className="w-full h-11 rounded-xl border-2 border-input bg-white px-4 py-2 text-sm focus:outline-none focus:border-primary">
                  <option value="">Select...</option>
                  {suppliers?.map((s) => <option key={s.id} value={s.id}>{s.name}</option>)}
                </select>
              </div>
            </div>
            <div className="grid grid-cols-3 gap-4">
              <div className="space-y-2">
                <label className="text-sm font-semibold text-foreground">Unit Price *</label>
                <Input type="number" step="0.01" {...register("unitPrice", { required: true })} placeholder="0.00" />
              </div>
              <div className="space-y-2">
                <label className="text-sm font-semibold text-foreground">Tax %</label>
                <Input type="number" {...register("tax")} placeholder="18" />
              </div>
              <div className="space-y-2">
                <label className="text-sm font-semibold text-foreground">Qty *</label>
                <Input type="number" {...register("quantity", { required: true })} placeholder="0" />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <label className="text-sm font-semibold text-foreground">HSN/SAC Code</label>
                <Input {...register("hsnCode")} placeholder="e.g. 84719000" />
              </div>
              <div className="space-y-2">
                <label className="text-sm font-semibold text-foreground">Units</label>
                <Input {...register("units")} placeholder="NOS" />
              </div>
            </div>
            <div className="pt-4 flex justify-end gap-3 border-t">
              <Button type="button" variant="outline" onClick={() => setIsModalOpen(false)}>Cancel</Button>
              <Button type="submit" variant="gradient" isLoading={isCreating || isUpdating}>
                {editingId ? "Save Changes" : "Create Product"}
              </Button>
            </div>
          </form>
        </Modal>

        <ImportPreviewModal
          isOpen={isPreviewOpen}
          onClose={() => { setIsPreviewOpen(false); setPreviewData(null); }}
          previewData={previewData}
          onConfirm={handleConfirmImport}
          isConfirming={isConfirming}
        />
      </div>
    </Layout>
  );
}

import { useState, useCallback } from "react";
import { UploadCloud, FileText, Check, AlertCircle, X, Trash2 } from "lucide-react";
import { getApiUrl } from "@/lib/api-utils";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { toast } from "sonner";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
  DialogFooter,
} from "@/components/ui/dialog";

type SectionType = "sales" | "purchases" | "supplier_details" | "products";

interface ModuleFileUploadProps {
  section: SectionType;
  onSuccess?: () => void;
}

export function ModuleFileUpload({ section, onSuccess }: ModuleFileUploadProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [file, setFile] = useState<File | null>(null);
  const [uploading, setUploading] = useState(false);
  const [isDragging, setIsDragging] = useState(false);
  
  const [previewResult, setPreviewResult] = useState<{
    message: string;
    totalRows: number;
    rows: Array<Record<string, any>>;
    warnings?: string[];
    errors?: string[];
  } | null>(null);

  const [editedRows, setEditedRows] = useState<Array<Record<string, any>>>([]);

  const handlePreview = async (selectedFile: File) => {
    const token = localStorage.getItem("dhasvin_token");
    const formData = new FormData();
    formData.append("file", selectedFile);
    formData.append("section", section);
    formData.append("preview", "true");

    try {
      setUploading(true);
      
      const response = await fetch(getApiUrl("/api/invoices/upload"), {
        method: "POST",
        headers: token ? { "Authorization": `Bearer ${token}` } : {},
        body: formData,
      });
      
      const contentType = response.headers.get("content-type");
      let data;
      if (contentType && contentType.includes("application/json")) {
        data = await response.json();
      } else {
        const text = await response.text();
        throw new Error(`Server error: ${response.status} ${response.statusText}`);
      }

      if (!response.ok) {
        throw new Error(data?.message || "Preview failed.");
      }

      setPreviewResult({
        message: data.message || "Preview completed successfully.",
        totalRows: data.totalRows ?? 0,
        rows: data.rows ?? [],
        warnings: data.warnings,
        errors: data.errors,
      });
      
      // Initialize editable rows
      setEditedRows(data.rows ?? []);
      toast.success("File processed. Please review the data.");
    } catch (error) {
      const errorMsg = error instanceof Error ? error.message : "Preview failed";
      toast.error(errorMsg);
      console.error("Preview error:", error);
    } finally {
      setUploading(false);
    }
  };

  const handleRowChange = (index: number, field: string, value: any) => {
    const updated = [...editedRows];
    updated[index] = { ...updated[index], [field]: value };
    
    // Clear specific row errors if user is editing
    if (updated[index].rowErrors && updated[index].rowErrors.length > 0) {
      updated[index].rowErrors = [];
    }
    
    setEditedRows(updated);
  };

  const handleRemoveRow = (index: number) => {
    const updated = [...editedRows];
    updated.splice(index, 1);
    setEditedRows(updated);
  };

  const handleImport = async () => {
    if (editedRows.length === 0) {
      toast.error("No data to import.");
      return;
    }

    const token = localStorage.getItem("dhasvin_token");
    
    try {
      setUploading(true);
      const response = await fetch(getApiUrl("/api/invoices/import-json"), {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          ...(token ? { "Authorization": `Bearer ${token}` } : {})
        },
        body: JSON.stringify({
          section,
          rows: editedRows
        }),
      });
      
      const contentType = response.headers.get("content-type");
      let data;
      if (contentType && contentType.includes("application/json")) {
        data = await response.json();
      } else {
        throw new Error(`Server error: ${response.status} ${response.statusText}`);
      }

      if (!response.ok) {
        throw new Error(data?.message || "Upload failed.");
      }

      toast.success(`Successfully imported ${data.processed} records.`);
      
      if (data.failed > 0) {
        toast.warning(`${data.failed} records failed to import. Check console for details.`);
        console.error("Import errors:", data.errors);
      }

      // Reset state and close
      resetState();
      setIsOpen(false);
      
      if (onSuccess) {
        onSuccess();
      }
    } catch (error) {
      const errorMsg = error instanceof Error ? error.message : "Import failed";
      toast.error(errorMsg);
      console.error("Import error:", error);
    } finally {
      setUploading(false);
    }
  };

  const onFileSelected = (selected: File | null) => {
    if (!selected) return;
    setFile(selected);
    handlePreview(selected);
  };

  const resetState = useCallback(() => {
    setFile(null);
    setPreviewResult(null);
    setEditedRows([]);
  }, []);

  // Handle dialog close
  const handleOpenChange = (open: boolean) => {
    if (!open) resetState();
    setIsOpen(open);
  };

  const isSupplier = section === "supplier_details";

  return (
    <Dialog open={isOpen} onOpenChange={handleOpenChange}>
      <DialogTrigger asChild>
        <Button className="bg-primary text-white hover:bg-primary/90">
          <FileText size={16} className="mr-2" /> 
          Scan PDF / Upload
        </Button>
      </DialogTrigger>
      
      <DialogContent className="sm:max-w-[900px] bg-slate-800 border-slate-600 text-white max-h-[90vh] flex flex-col">
        <DialogHeader>
          <DialogTitle className="text-xl flex items-center text-white">
            {section === "sales" && "Upload Sales Record"}
            {section === "purchases" && "Upload Purchase Invoice"}
            {section === "products" && "Upload Product Catalog"}
            {section === "supplier_details" && "Upload Supplier Details"}
          </DialogTitle>
        </DialogHeader>

        <div className="flex-1 overflow-y-auto pr-2 py-4">
          {!previewResult && !uploading && (
            <div
              onDragOver={(e) => { e.preventDefault(); setIsDragging(true); }}
              onDragLeave={(e) => { e.preventDefault(); setIsDragging(false); }}
              onDrop={(e) => {
                e.preventDefault();
                setIsDragging(false);
                onFileSelected(e.dataTransfer.files?.[0] ?? null);
              }}
              className={`border-2 border-dashed rounded-xl p-10 flex flex-col items-center justify-center text-center transition-colors ${
                isDragging ? "border-primary bg-primary/20" : "border-slate-500 hover:border-slate-400 bg-slate-700/50"
              }`}
            >
              <UploadCloud className="h-12 w-12 text-slate-300 mb-4" />
              <h3 className="text-lg font-semibold text-white mb-2">Drag and drop your file here</h3>
              <p className="text-sm text-slate-300 mb-6">Supports PDF, Excel (.xlsx, .xls), and CSV files.</p>
              
              <div className="relative">
                <Input
                  type="file"
                  accept=".xlsx,.xls,.csv,.pdf"
                  className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
                  onChange={(e) => onFileSelected(e.target.files?.[0] ?? null)}
                />
                <Button variant="secondary">Browse Files</Button>
              </div>
            </div>
          )}

          {uploading && (
            <div className="py-20 flex flex-col items-center justify-center space-y-4">
              <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
              <p className="text-slate-200 font-medium">Processing file...</p>
            </div>
          )}

          {previewResult && !uploading && (
            <div className="space-y-4">
              <div className="bg-slate-700 border border-slate-600 rounded-lg p-4">
                <div className="flex items-start justify-between">
                  <div>
                    <h4 className="font-semibold text-emerald-400 flex items-center">
                      <Check size={16} className="mr-2" /> Data Extracted Successfully
                    </h4>
                    <p className="text-sm text-slate-200 mt-1">
                      Found {editedRows.length} records. Please verify and edit if needed before importing.
                    </p>
                  </div>
                  <Button variant="outline" size="sm" onClick={resetState} className="border-slate-500 text-white hover:bg-slate-600">
                    Change File
                  </Button>
                </div>
                
                {(previewResult.warnings?.length ? previewResult.warnings.length > 0 : false) && (
                  <div className="mt-4 p-3 bg-amber-500/20 border border-amber-500/40 rounded-md">
                    <p className="text-sm font-semibold text-amber-300 mb-1 flex items-center">
                      <AlertCircle size={14} className="mr-1.5" /> Warnings
                    </p>
                    <ul className="text-xs text-amber-200 list-disc pl-5 space-y-0.5">
                      {previewResult.warnings?.slice(0, 3).map((w, i) => <li key={i}>{w}</li>)}
                      {(previewResult.warnings?.length ?? 0) > 3 && <li>And {(previewResult.warnings?.length ?? 0) - 3} more...</li>}
                    </ul>
                  </div>
                )}
              </div>

              <div className="border border-slate-600 rounded-lg overflow-x-auto bg-slate-900">
                <table className="w-full text-sm text-left">
                  <thead className="text-xs text-slate-300 uppercase bg-slate-700">
                    <tr>
                      <th className="px-3 py-3 w-10">#</th>
                      <th className="px-3 py-3 min-w-[150px]">{isSupplier ? "Supplier Name" : "Product Name"}</th>
                      {!isSupplier && <th className="px-3 py-3 w-24">Qty</th>}
                      {!isSupplier && <th className="px-3 py-3 w-32">Price</th>}
                      {!isSupplier && section !== "products" && <th className="px-3 py-3 min-w-[120px]">Supplier</th>}
                      <th className="px-3 py-3 w-10"></th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-700">
                    {editedRows.map((row, idx) => {
                      const hasError = row.rowErrors && row.rowErrors.length > 0;
                      const isNameMissing = isSupplier ? !row.supplierName : !row.productName;
                      const isQtyInvalid = !isSupplier && section !== "products" && (!row.quantity || row.quantity <= 0);
                      const isPriceInvalid = !isSupplier && (!row.price || row.price <= 0);

                      return (
                        <tr key={idx} className={`hover:bg-slate-700/50 ${hasError ? "bg-red-900/20" : ""}`}>
                          <td className="px-3 py-2 text-slate-400 text-xs text-center font-medium">
                            {idx + 1}
                          </td>
                          <td className="px-3 py-2">
                            <Input 
                              value={isSupplier ? (row.supplierName || "") : (row.productName || "")} 
                              onChange={(e) => handleRowChange(idx, isSupplier ? "supplierName" : "productName", e.target.value)}
                              className={`h-8 text-sm text-white ${isNameMissing ? "border-red-500 bg-red-900/30 placeholder-red-300" : "bg-slate-700 border-slate-600 placeholder-slate-400 hover:border-slate-500"}`}
                              placeholder={isSupplier ? "Supplier Name" : "Product Name"}
                            />
                          </td>
                          
                          {!isSupplier && (
                            <td className="px-3 py-2">
                              <Input 
                                type="number"
                                value={row.quantity || ""} 
                                onChange={(e) => handleRowChange(idx, "quantity", parseFloat(e.target.value))}
                                className={`h-8 text-sm px-2 text-white ${isQtyInvalid ? "border-red-500 bg-red-900/30" : "bg-slate-700 border-slate-600 hover:border-slate-500"}`}
                              />
                            </td>
                          )}
                          
                          {!isSupplier && (
                            <td className="px-3 py-2">
                              <Input 
                                type="number"
                                step="0.01"
                                value={row.price || ""} 
                                onChange={(e) => handleRowChange(idx, "price", parseFloat(e.target.value))}
                                className={`h-8 text-sm px-2 text-white ${isPriceInvalid ? "border-red-500 bg-red-900/30" : "bg-slate-700 border-slate-600 hover:border-slate-500"}`}
                              />
                            </td>
                          )}
                          
                          {!isSupplier && section !== "products" && (
                            <td className="px-3 py-2">
                              <Input 
                                value={row.supplierName || ""} 
                                onChange={(e) => handleRowChange(idx, "supplierName", e.target.value)}
                                className="h-8 text-sm px-2 text-white bg-slate-700 border-slate-600 hover:border-slate-500 placeholder-slate-400"
                                placeholder="Supplier"
                              />
                            </td>
                          )}

                          <td className="px-3 py-2 text-right">
                            <Button 
                              variant="ghost" 
                              size="icon" 
                              className="h-7 w-7 text-slate-400 hover:text-red-400 hover:bg-red-900/30"
                              onClick={() => handleRemoveRow(idx)}
                            >
                              <Trash2 size={14} />
                            </Button>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
                {editedRows.length === 0 && (
                  <div className="py-8 text-center text-slate-300 font-medium">
                    No valid data found. Please try another file.
                  </div>
                )}
              </div>
            </div>
          )}
        </div>

        {previewResult && !uploading && (
           <DialogFooter className="mt-4 pt-4 border-t border-slate-600 sm:justify-between">
            <div className="text-sm text-slate-200 flex items-center font-medium">
              Make sure to fix any fields highlighted in red.
            </div>
            <div className="flex gap-2">
              <Button variant="outline" onClick={() => setIsOpen(false)} className="border-slate-500 text-white hover:bg-slate-700">Cancel</Button>
              <Button 
                onClick={handleImport} 
                disabled={editedRows.length === 0}
                className="bg-primary text-white font-semibold"
              >
                Confirm & Import {editedRows.length} Records
              </Button>
            </div>
          </DialogFooter>
        )}
      </DialogContent>
    </Dialog>
  );
}

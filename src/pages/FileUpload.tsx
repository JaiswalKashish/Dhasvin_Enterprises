import { useState } from "react";
import { UploadCloud } from "lucide-react";
import { getApiUrl } from "@/lib/api-utils";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { toast } from "sonner";

const sections = [
  { value: "sales", label: "Sales" },
  { value: "purchases", label: "Purchases" },
  { value: "supplier_details", label: "Supplier Details" },
  { value: "products", label: "Products" },
] as const;

type UploadSection = (typeof sections)[number]["value"];

export default function FileUpload() {
  const [file, setFile] = useState<File | null>(null);
  const [section, setSection] = useState<UploadSection>("purchases");
  const [uploading, setUploading] = useState(false);
  const [previewing, setPreviewing] = useState(false);
  const [isDragging, setIsDragging] = useState(false);
  const [previewReadyForImport, setPreviewReadyForImport] = useState(false);
  const [detectedType, setDetectedType] = useState<string>("");
  const [result, setResult] = useState<{
    message: string;
    processed: number;
    failed: number;
    warnings?: string[];
    errors?: string[];
  } | null>(null);
  const [previewResult, setPreviewResult] = useState<{
    message: string;
    totalRows: number;
    rows: Array<Record<string, any>>;
    warnings?: string[];
    errors?: string[];
  } | null>(null);

  const handlePreview = async () => {
    if (!file) {
      toast.error("Please select a file to preview.");
      return;
    }

    const token = localStorage.getItem("dhasvin_token");
    const formData = new FormData();
    formData.append("file", file);
    formData.append("section", section);
    formData.append("preview", "true");

    try {
      setPreviewing(true);
      setResult(null);
      setPreviewResult(null);

      const response = await fetch(getApiUrl("/api/invoices/upload"), {
        method: "POST",
        headers: token ? { Authorization: `Bearer ${token}` } : undefined,
        body: formData,
      });
      const data = await response.json();

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
      setDetectedType(data.detectedType || "");
      setPreviewReadyForImport(true);
      toast.success("Preview generated successfully.");
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Preview failed.");
    } finally {
      setPreviewing(false);
    }
  };

  const handleUpload = async () => {
    if (!file) {
      toast.error("Please select a file to upload.");
      return;
    }
    if (!previewResult || !previewReadyForImport) {
      toast.error("Preview the file before final import.");
      return;
    }

    const token = localStorage.getItem("dhasvin_token");
    const formData = new FormData();
    formData.append("file", file);
    formData.append("section", section);
    formData.append("preview", "false");

    try {
      setUploading(true);
      const response = await fetch(getApiUrl("/api/invoices/upload"), {
        method: "POST",
        headers: token ? { Authorization: `Bearer ${token}` } : undefined,
        body: formData,
      });
      const data = await response.json();

      if (!response.ok) {
        throw new Error(data?.message || "Upload failed.");
      }

      setResult({
        message: data.message || "Upload completed successfully.",
        processed: data.processed ?? 0,
        failed: data.failed ?? 0,
        warnings: data.warnings,
        errors: data.errors,
      });
      setPreviewResult(null);
      setPreviewReadyForImport(false);
      setDetectedType("");
      setFile(null);
      toast.success("File uploaded successfully.");
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Upload failed.");
    } finally {
      setUploading(false);
    }
  };

  const onFileSelected = (selected: File | null) => {
    if (!selected) return;
    setFile(selected);
    setPreviewReadyForImport(false);
    setResult(null);
    setPreviewResult(null);
    setDetectedType("");
  };

  return (
    <div className="space-y-6">
      <div className="glass-panel rounded-xl border border-gray-200 dark:border-white/10 p-6">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h2 className="text-2xl font-bold text-gray-900 dark:text-white tracking-tight">Data Upload</h2>
            <p className="text-sm text-gray-700 dark:text-muted-foreground mt-1">
              Upload a file to import sales, purchases, product inventory, or supplier details.
            </p>
          </div>
          <div className="rounded-2xl bg-gray-100 dark:bg-slate-950/80 px-4 py-3 text-sm text-gray-700 dark:text-muted-foreground">
            Supported: .xlsx, .xls, .csv, .pdf
          </div>
        </div>

        <div className="mt-6 grid gap-3 sm:grid-cols-4">
          {sections.map((option) => (
            <button
              key={option.value}
              type="button"
              onClick={() => {
                setSection(option.value);
                setPreviewReadyForImport(false);
                setPreviewResult(null);
                setDetectedType("");
              }}
              className={`rounded-2xl border p-4 text-left transition ${
                section === option.value
                  ? "border-primary bg-primary/10 text-gray-900 dark:text-white"
                  : "border-gray-300 dark:border-white/10 bg-white dark:bg-slate-950/60 text-gray-800 dark:text-muted-foreground hover:border-primary/40 hover:bg-gray-50 dark:hover:bg-white/5"
              }`}
            >
              <div className="text-sm font-semibold">{option.label}</div>
              <div className="mt-2 text-xs text-gray-600 dark:text-muted-foreground">
                {option.value === "sales" && "Import sales records and reduce stock."}
                {option.value === "purchases" && "Import purchases and increase stock."}
                {option.value === "supplier_details" && "Import supplier contact and GST details."}
                {option.value === "products" && "Import or update product catalog details."}
              </div>
            </button>
          ))}
        </div>

        <div className="mt-6 grid gap-4 sm:grid-cols-[1fr_auto] sm:items-end">
          <div>
            <label className="block text-sm font-medium text-gray-900 dark:text-white mb-2" htmlFor="upload-file">
              Choose file
            </label>
            <div
              onDragOver={(event) => {
                event.preventDefault();
                setIsDragging(true);
              }}
              onDragLeave={(event) => {
                event.preventDefault();
                setIsDragging(false);
              }}
              onDrop={(event) => {
                event.preventDefault();
                setIsDragging(false);
                const selected = event.dataTransfer.files?.[0] ?? null;
                onFileSelected(selected);
              }}
              className={`rounded-2xl border p-4 transition ${
                isDragging ? "border-primary bg-primary/10" : "border-gray-300 dark:border-white/10 bg-white dark:bg-slate-950/40"
              }`}
            >
              <Input
                id="upload-file"
                type="file"
                accept=".xlsx,.xls,.csv,.pdf"
                onChange={(event) => onFileSelected(event.target.files?.[0] ?? null)}
                className="bg-white dark:bg-slate-900 border-gray-300 dark:border-white/10 text-gray-900 dark:text-white file:text-gray-800 dark:file:text-white"
              />
              <p className="mt-2 text-xs text-gray-700 dark:text-muted-foreground">
                Drag and drop your file here, or use the picker.
              </p>
              {file ? (
                <p className="mt-1 text-xs text-gray-900 dark:text-white">
                  Selected: {file.name} ({Math.ceil(file.size / 1024)} KB)
                </p>
              ) : null}
            </div>
          </div>
          <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
            <Button
              onClick={handlePreview}
              disabled={!file || previewing}
              className="min-w-[120px] border border-slate-700 bg-slate-800 text-white hover:bg-slate-700 transition-all duration-200 disabled:opacity-100 disabled:bg-slate-600 disabled:text-white disabled:border-slate-500"
            >
              {previewing ? "Previewing…" : "Preview File"}
            </Button>
            <Button
              onClick={handleUpload}
              disabled={!file || uploading || !previewResult || !previewReadyForImport}
              className="min-w-[160px] border border-primary/70 bg-primary text-white hover:bg-primary/90 transition-all duration-200 disabled:opacity-100 disabled:bg-primary/60 disabled:text-white disabled:border-primary/40"
            >
              <UploadCloud size={16} className="mr-2" />
              {uploading ? "Processing…" : "Confirm & Import"}
            </Button>
          </div>
        </div>

        {result ? (
          <div className="mt-6 rounded-2xl border border-gray-200 dark:border-white/10 bg-white dark:bg-slate-950/80 p-4 text-sm text-gray-800 dark:text-white shadow-md">
            <p className="font-semibold text-gray-900 dark:text-white">{result.message}</p>
            <p className="mt-2 text-gray-800 dark:text-white">Processed: {result.processed}</p>
            <p className="text-gray-800 dark:text-white">Failed: {result.failed}</p>
            {result.warnings?.length ? (
              <div className="mt-3 text-amber-200">
                <p className="font-medium">Warnings:</p>
                <ul className="list-disc pl-5">
                  {result.warnings.map((warning, index) => (
                    <li key={index}>{warning}</li>
                  ))}
                </ul>
              </div>
            ) : null}
            {result.errors?.length ? (
              <div className="mt-3 text-rose-200">
                <p className="font-medium">Errors:</p>
                <ul className="list-disc pl-5">
                  {result.errors.map((error, index) => (
                    <li key={index}>{error}</li>
                  ))}
                </ul>
              </div>
            ) : null}
          </div>
        ) : null}

        {previewResult ? (
          <div className="mt-6 rounded-2xl border border-gray-200 dark:border-white/10 bg-white dark:bg-slate-950/80 p-4 text-sm text-gray-800 dark:text-white shadow-md">
            <p className="font-semibold text-gray-900 dark:text-white">{previewResult.message}</p>
            <p className="mt-2 text-gray-800 dark:text-white">Rows parsed: {previewResult.totalRows}</p>
            {detectedType ? <p className="text-gray-800 dark:text-white">Detected type: {detectedType}</p> : null}
            <p className="text-xs text-gray-600 dark:text-muted-foreground mt-1">
              Review highlighted issues, then click <span className="text-gray-900 dark:text-white">Confirm & Import</span>.
            </p>
            {previewResult.warnings?.length ? (
              <div className="mt-3 text-amber-200">
                <p className="font-medium">Preview warnings:</p>
                <ul className="list-disc pl-5">
                  {previewResult.warnings.map((warning, index) => (
                    <li key={index}>{warning}</li>
                  ))}
                </ul>
              </div>
            ) : null}
            {previewResult.errors?.length ? (
              <div className="mt-3 text-rose-200">
                <p className="font-medium">Preview errors:</p>
                <ul className="list-disc pl-5">
                  {previewResult.errors.map((error, index) => (
                    <li key={index}>{error}</li>
                  ))}
                </ul>
              </div>
            ) : null}
            {previewResult.rows.length ? (
              <div className="mt-4 overflow-x-auto">
                <table className="min-w-full border-collapse text-sm">
                  <thead>
                    <tr className="border-b border-gray-200 dark:border-white/10 text-left text-xs uppercase text-gray-600 dark:text-muted-foreground">
                      <th className="px-2 py-2">Row</th>
                      <th className="px-2 py-2">Product</th>
                      <th className="px-2 py-2">Qty</th>
                      <th className="px-2 py-2">Price</th>
                      <th className="px-2 py-2">Supplier</th>
                      <th className="px-2 py-2">Category</th>
                      <th className="px-2 py-2">HSN</th>
                    </tr>
                  </thead>
                  <tbody>
                    {previewResult.rows.slice(0, 10).map((row, index) => (
                      <tr key={index} className="border-b border-gray-200 dark:border-white/10 even:bg-gray-50 dark:even:bg-slate-900/50">
                        <td className="px-2 py-2 text-gray-800 dark:text-white">{row.rowNum}</td>
                        <td className={`px-2 py-2 ${!row.productName ? "text-rose-300" : ""}`}>
                          {row.productName || row.Product || row.product || "Missing"}
                        </td>
                        <td className={`px-2 py-2 ${!row.quantity || row.quantity <= 0 ? "text-rose-300" : ""}`}>
                          {row.quantity ?? "Missing"}
                        </td>
                        <td className={`px-2 py-2 ${!row.price || row.price <= 0 ? "text-rose-300" : ""}`}>
                          {row.price ?? "Missing"}
                        </td>
                        <td className="px-2 py-2">{row.supplierName || row.Supplier || "-"}</td>
                        <td className="px-2 py-2">{row.categoryName || row.Category || "-"}</td>
                        <td className="px-2 py-2">{row.hsnCode ?? "-"}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
                {previewResult.rows.length > 10 ? (
                  <p className="mt-3 text-muted-foreground">Showing first 10 rows.</p>
                ) : null}
              </div>
            ) : null}
          </div>
        ) : null}
      </div>
    </div>
  );
}

import { useState, useEffect } from "react";
import { useForm } from "react-hook-form";
import { useGetCompanySettings, useUpdateCompanySettings } from "@workspace/api-client-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";
import {
  Building2, Save, Upload, Globe, Phone, Mail,
  CreditCard, Hash, MapPin, Image, CheckCircle2, FileText
} from "lucide-react";
import { motion } from "framer-motion";

interface CompanyFormData {
  name: string;
  gstin: string;
  pan: string;
  address: string;
  phoneNumber: string;
  email: string;
  bankName: string;
  accountNumber: string;
  ifsc: string;
  upiId: string;
  logoPath: string;
  qrCodePath: string;
}

function FieldGroup({ label, icon: Icon, children }: { label: string; icon: any; children: React.ReactNode }) {
  return (
    <div className="space-y-2">
      <Label className="flex items-center gap-2 text-sm font-medium">
        <Icon size={14} className="text-primary" />
        {label}
      </Label>
      {children}
    </div>
  );
}

export default function CompanySettings() {
  const { data: settings, isLoading } = useGetCompanySettings();
  const updateSettingsMutation = useUpdateCompanySettings();

  const [uploadingLogo, setUploadingLogo] = useState(false);
  const [uploadingQr, setUploadingQr] = useState(false);
  const [logoPreview, setLogoPreview] = useState<string | null>(null);
  const [qrPreview, setQrPreview] = useState<string | null>(null);
  const [saved, setSaved] = useState(false);

  const form = useForm<CompanyFormData>({
    defaultValues: {
      name: "",
      gstin: "",
      pan: "",
      address: "",
      phoneNumber: "",
      email: "",
      bankName: "",
      accountNumber: "",
      ifsc: "",
      upiId: "",
      logoPath: "",
      qrCodePath: "",
    }
  });

  const watchedValues = form.watch();
  const isPdfLogo = Boolean(logoPreview?.toLowerCase().includes(".pdf"));

  useEffect(() => {
    if (settings) {
      form.reset({
        name: settings.name || "",
        gstin: settings.gstin || "",
        pan: settings.pan || "",
        address: settings.address || "",
        phoneNumber: settings.phoneNumber || "",
        email: settings.email || "",
        bankName: settings.bankName || "",
        accountNumber: settings.accountNumber || "",
        ifsc: settings.ifsc || "",
        upiId: settings.upiId || "",
        logoPath: settings.logoPath || "",
        qrCodePath: settings.qrCodePath || "",
      });
      if (settings.logoPath) setLogoPreview(settings.logoPath);
      if (settings.qrCodePath) setQrPreview(settings.qrCodePath);
    }
  }, [settings, form]);

  const handleLogoUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    try {
      setUploadingLogo(true);
      const formData = new FormData();
      formData.append("logo", file);
      const token = localStorage.getItem("dhasvin_token");
      // #region agent log
      fetch("http://127.0.0.1:7555/ingest/170bd962-3dc4-4d25-8498-809d86c0a8a1", {
        method: "POST",
        headers: { "Content-Type": "application/json", "X-Debug-Session-Id": "118ffa" },
        body: JSON.stringify({
          sessionId: "118ffa",
          runId: "pre-fix",
          hypothesisId: "H1-H2",
          location: "CompanySettings.tsx:handleLogoUpload:beforeFetch",
          message: "Starting logo upload request",
          data: {
            hasToken: Boolean(token),
            fileName: file.name,
            fileType: file.type,
            fileSize: file.size,
          },
          timestamp: Date.now(),
        }),
      }).catch(() => {});
      // #endregion
      const res = await fetch("/api/company/logo", {
        method: "POST",
        headers: { "Authorization": `Bearer ${token}` },
        body: formData
      });
      if (!res.ok) {
        // #region agent log
        fetch("http://127.0.0.1:7555/ingest/170bd962-3dc4-4d25-8498-809d86c0a8a1", {
          method: "POST",
          headers: { "Content-Type": "application/json", "X-Debug-Session-Id": "118ffa" },
          body: JSON.stringify({
            sessionId: "118ffa",
            runId: "pre-fix",
            hypothesisId: "H1-H3",
            location: "CompanySettings.tsx:handleLogoUpload:responseNotOk",
            message: "Logo upload response not OK",
            data: { status: res.status, statusText: res.statusText },
            timestamp: Date.now(),
          }),
        }).catch(() => {});
        // #endregion
        throw new Error("Upload failed");
      }
      const json = await res.json();
      form.setValue("logoPath", json.logoPath);
      setLogoPreview(json.logoUrl || URL.createObjectURL(file));
      // #region agent log
      fetch("http://127.0.0.1:7555/ingest/170bd962-3dc4-4d25-8498-809d86c0a8a1", {
        method: "POST",
        headers: { "Content-Type": "application/json", "X-Debug-Session-Id": "118ffa" },
        body: JSON.stringify({
          sessionId: "118ffa",
          runId: "pre-fix",
          hypothesisId: "H2-H4",
          location: "CompanySettings.tsx:handleLogoUpload:success",
          message: "Logo upload response parsed",
          data: { logoPath: json.logoPath ?? null, logoUrl: json.logoUrl ?? null },
          timestamp: Date.now(),
        }),
      }).catch(() => {});
      // #endregion
      toast.success("Logo uploaded successfully");
    } catch (err) {
      // #region agent log
      fetch("http://127.0.0.1:7555/ingest/170bd962-3dc4-4d25-8498-809d86c0a8a1", {
        method: "POST",
        headers: { "Content-Type": "application/json", "X-Debug-Session-Id": "118ffa" },
        body: JSON.stringify({
          sessionId: "118ffa",
          runId: "pre-fix",
          hypothesisId: "H1-H3-H5",
          location: "CompanySettings.tsx:handleLogoUpload:catch",
          message: "Logo upload threw error",
          data: { errorMessage: err instanceof Error ? err.message : "unknown" },
          timestamp: Date.now(),
        }),
      }).catch(() => {});
      // #endregion
      toast.error("Failed to upload logo");
    } finally {
      setUploadingLogo(false);
    }
  };

  const handleQrUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    try {
      setUploadingQr(true);
      const formData = new FormData();
      formData.append("qr", file);
      const token = localStorage.getItem("dhasvin_token");
      const res = await fetch("/api/company/qr", {
        method: "POST",
        headers: { "Authorization": `Bearer ${token}` },
        body: formData,
      });
      if (!res.ok) throw new Error("Upload failed");
      const json = await res.json();
      form.setValue("qrCodePath", json.qrCodePath);
      setQrPreview(json.qrCodeUrl || URL.createObjectURL(file));
      toast.success("Payment QR uploaded successfully");
    } catch (err) {
      toast.error("Failed to upload QR code");
    } finally {
      setUploadingQr(false);
    }
  };

  const onSubmit = (data: CompanyFormData) => {
    if (!data.name) {
      toast.error("Company Name is required");
      return;
    }
    updateSettingsMutation.mutate({ data }, {
      onSuccess: () => {
        toast.success("Company settings saved!");
        setSaved(true);
        setTimeout(() => setSaved(false), 3000);
      },
      onError: () => toast.error("Failed to save company settings")
    });
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="w-8 h-8 border-4 border-primary border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <div className="space-y-6 max-w-5xl mx-auto">
      {/* Page Header */}
      <div className="flex items-center gap-4">
        <div className="w-12 h-12 rounded-xl bg-primary/20 flex items-center justify-center">
          <Building2 className="text-primary w-6 h-6" />
        </div>
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Company Settings</h1>
          <p className="text-muted-foreground text-sm">Manage your business profile — used across invoices, bills &amp; reports</p>
        </div>
      </div>

      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">

          {/* LEFT COLUMN: Form */}
          <div className="lg:col-span-2 space-y-6">

            {/* Logo Upload */}
            <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="glass-panel rounded-xl p-6 border border-white/5">
              <h2 className="text-base font-semibold mb-4 flex items-center gap-2">
                <Image size={16} className="text-primary" /> Company Logo
              </h2>
              <div className="flex items-center gap-6">
                <div className="w-24 h-24 rounded-xl bg-white/5 border border-white/10 flex items-center justify-center overflow-hidden shrink-0">
                  {logoPreview ? (
                    isPdfLogo ? (
                      <a
                        href={logoPreview}
                        target="_blank"
                        rel="noreferrer"
                        className="flex h-full w-full flex-col items-center justify-center text-muted-foreground hover:text-primary"
                      >
                        <FileText size={24} />
                        <span className="mt-1 text-[10px] font-medium">PDF</span>
                      </a>
                    ) : (
                      <img src={logoPreview} alt="Logo" className="w-full h-full object-contain p-1" />
                    )
                  ) : (
                    <div className="flex flex-col items-center text-muted-foreground">
                      <Image size={24} className="mb-1 opacity-50" />
                      <span className="text-[10px]">No Logo</span>
                    </div>
                  )}
                </div>
                <div className="flex-1">
                  <Label htmlFor="logo-upload" className="block mb-2 text-sm">Upload Logo</Label>
                  <label htmlFor="logo-upload" className={`inline-flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium cursor-pointer transition-all ${
                    uploadingLogo ? "opacity-60 cursor-not-allowed" : "bg-primary/20 hover:bg-primary/30 text-primary border border-primary/20"
                  }`}>
                    <Upload size={14} />
                    {uploadingLogo ? "Uploading..." : "Choose File"}
                  </label>
                  <input id="logo-upload" type="file" accept="image/*,application/pdf" onChange={handleLogoUpload} disabled={uploadingLogo} className="hidden" />
                  <p className="text-xs text-muted-foreground mt-2">PNG, JPG, SVG, or PDF up to 5MB. Recommended: 200x80px for images</p>
                </div>
              </div>
            </motion.div>

            {/* Basic Details */}
            <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.05 }} className="glass-panel rounded-xl p-6 border border-white/5">
              <h2 className="text-base font-semibold mb-4 flex items-center gap-2">
                <Building2 size={16} className="text-primary" /> Business Details
              </h2>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="md:col-span-2">
                  <FieldGroup label="Company Name *" icon={Building2}>
                    <Input {...form.register("name")} placeholder="e.g. DHASVIN ENTERPRISES" className="bg-black/20 border-white/10" />
                  </FieldGroup>
                </div>
                <FieldGroup label="GSTIN" icon={Hash}>
                  <Input {...form.register("gstin")} placeholder="22AAAAA0000A1Z5" className="bg-black/20 border-white/10 font-mono" maxLength={15} />
                </FieldGroup>
                <FieldGroup label="PAN (Optional)" icon={CreditCard}>
                  <Input {...form.register("pan")} placeholder="AAAAA0000A" className="bg-black/20 border-white/10 font-mono" maxLength={10} />
                </FieldGroup>
                <FieldGroup label="Phone Number" icon={Phone}>
                  <Input {...form.register("phoneNumber")} placeholder="+91 98765 43210" className="bg-black/20 border-white/10" />
                </FieldGroup>
                <FieldGroup label="Email Address" icon={Mail}>
                  <Input {...form.register("email")} type="email" placeholder="billing@company.com" className="bg-black/20 border-white/10" />
                </FieldGroup>
                <FieldGroup label="Bank Name" icon={CreditCard}>
                  <Input {...form.register("bankName")} placeholder="Bank of India" className="bg-black/20 border-white/10" />
                </FieldGroup>
                <FieldGroup label="Account Number" icon={CreditCard}>
                  <Input {...form.register("accountNumber")} placeholder="123456789012" className="bg-black/20 border-white/10 font-mono" />
                </FieldGroup>
                <FieldGroup label="IFSC Code" icon={Hash}>
                  <Input {...form.register("ifsc")} placeholder="ABCD0123456" className="bg-black/20 border-white/10 font-mono" />
                </FieldGroup>
                <FieldGroup label="UPI ID" icon={Globe}>
                  <Input {...form.register("upiId")} placeholder="company@upi" className="bg-black/20 border-white/10" />
                </FieldGroup>
                <div className="md:col-span-2">
                  <FieldGroup label="Registered Address" icon={MapPin}>
                    <Input {...form.register("address")} placeholder="Door No, Street, City, State, PIN" className="bg-black/20 border-white/10" />
                  </FieldGroup>
                </div>
              </div>
            </motion.div>

            <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }} className="glass-panel rounded-xl p-6 border border-white/5">
              <h2 className="text-base font-semibold mb-4 flex items-center gap-2">
                <CreditCard size={16} className="text-primary" /> Payment & QR Details
              </h2>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <FieldGroup label="UPI QR Code" icon={Image}>
                  <label htmlFor="qr-upload" className={`inline-flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium cursor-pointer transition-all ${
                    uploadingQr ? "opacity-60 cursor-not-allowed" : "bg-primary/20 hover:bg-primary/30 text-primary border border-primary/20"
                  }`}>
                    <Upload size={14} />
                    {uploadingQr ? "Uploading..." : "Upload QR"}
                  </label>
                  <input id="qr-upload" type="file" accept="image/*" onChange={handleQrUpload} disabled={uploadingQr} className="hidden" />
                  <p className="text-xs text-muted-foreground mt-2">UPI QR image for payment display on invoices.</p>
                </FieldGroup>
                <div className="space-y-4">
                  {qrPreview ? (
                    <img src={qrPreview} alt="UPI QR preview" className="w-full rounded-xl border border-white/10 object-contain" />
                  ) : (
                    <div className="rounded-xl border border-white/10 bg-white/5 p-6 text-center text-muted-foreground">
                      QR code preview will appear here.
                    </div>
                  )}
                </div>
              </div>
            </motion.div>

          </div>

          {/* RIGHT COLUMN: Live Preview */}
          <motion.div initial={{ opacity: 0, x: 10 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: 0.1 }} className="space-y-4">
            <div className="glass-panel rounded-xl p-5 border border-white/5 sticky top-6">
              <h2 className="text-sm font-semibold mb-4 text-muted-foreground uppercase tracking-widest">Invoice Preview</h2>
              {/* Mini invoice preview */}
              <div className="bg-white rounded-lg overflow-hidden text-gray-800 text-[10px]" style={{ fontSize: "9px" }}>
                <div className="h-1.5" style={{ background: "linear-gradient(90deg, #667eea, #764ba2, #43cea2)" }} />
                <div className="p-4">
                  <div className="flex justify-between items-start mb-3">
                    <div>
                      {logoPreview ? (
                        isPdfLogo ? (
                          <a
                            href={logoPreview}
                            target="_blank"
                            rel="noreferrer"
                            className="mb-1 inline-flex items-center gap-1 rounded border border-slate-300 px-2 py-0.5 text-[8px] text-slate-600"
                          >
                            <FileText size={10} />
                            PDF Logo
                          </a>
                        ) : (
                          <img src={logoPreview} alt="Logo" className="max-h-8 object-contain mb-1" />
                        )
                      ) : (
                        <div className="w-7 h-7 rounded bg-gradient-to-br from-[#667eea] to-[#764ba2] flex items-center justify-center mb-1">
                          <span className="text-white font-bold text-[8px]">{watchedValues.name?.charAt(0)?.toUpperCase() || "D"}</span>
                        </div>
                      )}
                      <p className="font-bold uppercase" style={{ fontSize: "9px", letterSpacing: "0.5px" }}>
                        {watchedValues.name || "YOUR COMPANY NAME"}
                      </p>
                      {watchedValues.gstin && <p className="text-gray-500">GSTIN: {watchedValues.gstin}</p>}
                      {watchedValues.address && <p className="text-gray-500 max-w-[120px]">{watchedValues.address}</p>}
                      {watchedValues.bankName && <p className="text-gray-500">Bank: {watchedValues.bankName}</p>}
                      {watchedValues.accountNumber && <p className="text-gray-500">A/C: {watchedValues.accountNumber}</p>}
                      {watchedValues.ifsc && <p className="text-gray-500">IFSC: {watchedValues.ifsc}</p>}
                      {watchedValues.upiId && <p className="text-gray-500">UPI: {watchedValues.upiId}</p>}
                      {watchedValues.phoneNumber && <p className="text-gray-500">📞 {watchedValues.phoneNumber}</p>}
                      {watchedValues.email && <p className="text-gray-500">{watchedValues.email}</p>}
                    </div>
                    <div className="text-right">
                      <p className="font-bold text-gray-900" style={{ fontSize: "11px" }}>TAX INVOICE</p>
                      <p className="text-[#667eea] font-mono">INV-00001</p>
                      <p className="text-gray-500">3 Apr 2026</p>
                    </div>
                  </div>
                  <div className="h-px bg-gray-200 mb-2" />
                  <div className="bg-gray-50 rounded p-2 mb-2">
                    <p className="text-gray-400 uppercase tracking-widest" style={{ fontSize: "7px" }}>Billed To</p>
                    <p className="font-bold text-gray-900">Customer Name</p>
                    <p className="text-gray-500">📞 +91 XXXXXXX</p>
                  </div>
                  {/* Table stub */}
                  <div className="w-full" style={{ background: "#1e1b4b", borderRadius: "2px" }}>
                    <div className="px-2 py-1 flex justify-between" style={{ color: "#c7d2fe", fontSize: "7px" }}>
                      <span>ITEM</span><span>QTY</span><span>RATE</span><span>AMT</span>
                    </div>
                  </div>
                  <div className="px-2 py-1 flex justify-between text-gray-600 border-b" style={{ fontSize: "8px" }}>
                    <span>Product A</span><span>2</span><span>₹100</span><span>₹236</span>
                  </div>
                  <div className="flex justify-end mt-2">
                    <div className="w-24 rounded px-2 py-1 text-white text-right" style={{ background: "linear-gradient(135deg, #667eea, #764ba2)", fontSize: "8px" }}>
                      <span className="font-bold">TOTAL ₹236</span>
                    </div>
                  </div>
                  {(qrPreview || watchedValues.qrCodePath) && (
                    <div className="mt-4 flex justify-center">
                      <img
                        src={qrPreview || watchedValues.qrCodePath}
                        alt="QR Code"
                        className="h-24 w-24 rounded-xl border border-slate-200/10 object-contain"
                      />
                    </div>
                  )}
                  <p className="text-center text-gray-400 mt-3" style={{ fontSize: "7px" }}>Thank you for your business!</p>
                </div>
              </div>
              <p className="text-xs text-muted-foreground mt-3">This preview updates as you type</p>
            </div>
          </motion.div>
        </div>

        {/* Save Button */}
        <div className="flex justify-end">
          <Button
            type="submit"
            disabled={updateSettingsMutation.isPending || uploadingLogo}
            className={`flex items-center gap-2 px-8 transition-all ${saved ? "bg-emerald-600 hover:bg-emerald-600" : "bg-primary"}`}
          >
            {saved ? <CheckCircle2 size={16} /> : <Save size={16} />}
            {updateSettingsMutation.isPending ? "Saving..." : saved ? "Saved!" : "Save Company Settings"}
          </Button>
        </div>
      </form>
    </div>
  );
}

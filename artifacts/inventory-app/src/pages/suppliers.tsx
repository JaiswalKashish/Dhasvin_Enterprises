import * as React from "react";
import { Layout } from "@/components/layout";
import { useGetSuppliers, useCreateSupplier, useUpdateSupplier, useDeleteSupplier } from "@workspace/api-client-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Modal } from "@/components/ui/modal";
import { Plus, Edit, Trash2, Building2, Search, X, Phone, Mail, MapPin, Package } from "lucide-react";
import { useForm } from "react-hook-form";
import { useQueryClient } from "@tanstack/react-query";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/hooks/use-auth";
import { Redirect } from "wouter";
import { motion } from "framer-motion";

const SUP_COLORS = [
  "from-blue-600 to-indigo-500",
  "from-purple-600 to-violet-500",
  "from-emerald-600 to-teal-500",
  "from-rose-600 to-pink-500",
  "from-amber-600 to-orange-500",
  "from-cyan-600 to-sky-500",
];

function initials(name: string) {
  return name
    .split(" ")
    .slice(0, 2)
    .map((w) => w[0])
    .join("")
    .toUpperCase();
}

export default function Suppliers() {
  const { user } = useAuth();
  if (user && user.role !== "admin") return <Redirect to="/dashboard" />;

  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [isModalOpen, setIsModalOpen] = React.useState(false);
  const [editingId, setEditingId] = React.useState<number | null>(null);
  const [search, setSearch] = React.useState("");

  const { data: suppliers, isLoading } = useGetSuppliers();

  const { mutate: createSup, isPending: isCreating } = useCreateSupplier({
    mutation: {
      onSuccess: () => {
        queryClient.invalidateQueries({ queryKey: ["/api/suppliers"] });
        setIsModalOpen(false);
        toast({ title: "Supplier Added", description: "Supplier added to your directory." });
      },
    },
  });

  const { mutate: updateSup, isPending: isUpdating } = useUpdateSupplier({
    mutation: {
      onSuccess: () => {
        queryClient.invalidateQueries({ queryKey: ["/api/suppliers"] });
        setIsModalOpen(false);
        toast({ title: "Supplier Updated", description: "Supplier details saved." });
      },
    },
  });

  const { mutate: deleteSup } = useDeleteSupplier({
    mutation: {
      onSuccess: () => {
        queryClient.invalidateQueries({ queryKey: ["/api/suppliers"] });
        toast({ title: "Deleted", description: "Supplier removed from directory." });
      },
    },
  });

  const { register, handleSubmit, reset } = useForm();
  const openCreate = () => { reset(); setEditingId(null); setIsModalOpen(true); };
  const openEdit = (sup: any) => { reset(sup); setEditingId(sup.id); setIsModalOpen(true); };
  const onSubmit = (data: any) => {
    if (editingId) updateSup({ id: editingId, data });
    else createSup({ data });
  };

  const filtered = suppliers?.filter((s) =>
    !search ||
    s.name.toLowerCase().includes(search.toLowerCase()) ||
    (s.contactPerson || "").toLowerCase().includes(search.toLowerCase())
  ) || [];

  return (
    <Layout>
      <div className="space-y-6">
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
          <div>
            <h1 className="text-3xl font-display font-bold text-foreground">Suppliers</h1>
            <p className="text-muted-foreground mt-1">
              {suppliers?.length ? `${suppliers.length} suppliers in directory · auto-created from imports` : "Manage your vendor directory."}
            </p>
          </div>
          <Button variant="gradient" onClick={openCreate}>
            <Plus className="w-4 h-4 mr-2" /> Add Supplier
          </Button>
        </div>

        <div className="bg-white p-4 rounded-2xl shadow-sm border border-slate-100 flex gap-3 items-center">
          <div className="relative flex-1 max-w-sm">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
            <input
              placeholder="Search suppliers..."
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
        </div>

        {isLoading ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {[1, 2, 3, 4].map((i) => (
              <div key={i} className="animate-pulse bg-white rounded-2xl border border-slate-100 p-6 h-44" />
            ))}
          </div>
        ) : filtered.length === 0 ? (
          <div className="bg-white rounded-2xl border border-dashed border-slate-200 p-16 text-center">
            <Building2 className="w-12 h-12 text-slate-300 mx-auto mb-4" />
            <p className="font-semibold text-slate-500">No suppliers found</p>
            <p className="text-sm text-slate-400 mt-1">Import an Excel file with a Supplier column or add one manually.</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {filtered.map((sup, i) => (
              <motion.div
                key={sup.id}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.2, delay: i * 0.03 }}
                className="bg-white rounded-2xl border border-slate-100 shadow-sm hover:shadow-md hover:border-indigo-200 transition-all group relative"
              >
                <div className="p-5">
                  <div className="flex items-start justify-between mb-4">
                    <div className="flex items-center gap-3">
                      <div className={`w-12 h-12 rounded-xl bg-gradient-to-br ${SUP_COLORS[i % SUP_COLORS.length]} flex items-center justify-center shadow-sm flex-shrink-0`}>
                        <span className="text-white font-bold text-sm">{initials(sup.name)}</span>
                      </div>
                      <div>
                        <h3 className="font-bold text-slate-800 text-base leading-tight">{sup.name}</h3>
                        {sup.contactPerson && (
                          <p className="text-xs text-slate-500 mt-0.5">{sup.contactPerson}</p>
                        )}
                      </div>
                    </div>
                    <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity flex-shrink-0">
                      <button
                        onClick={() => openEdit(sup)}
                        className="p-1.5 rounded-lg text-blue-600 hover:bg-blue-50 transition-colors"
                        title="Edit"
                      >
                        <Edit className="w-3.5 h-3.5" />
                      </button>
                      <button
                        onClick={() => { if (confirm(`Delete "${sup.name}"?`)) deleteSup({ id: sup.id }); }}
                        className="p-1.5 rounded-lg text-red-500 hover:bg-red-50 transition-colors"
                        title="Delete"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>

                  <div className="space-y-1.5 pt-3 border-t border-slate-100">
                    {sup.phone && (
                      <div className="flex items-center gap-2 text-xs text-slate-500">
                        <Phone className="w-3.5 h-3.5 flex-shrink-0 text-slate-400" />
                        <span>{sup.phone}</span>
                      </div>
                    )}
                    {sup.email && (
                      <div className="flex items-center gap-2 text-xs text-slate-500">
                        <Mail className="w-3.5 h-3.5 flex-shrink-0 text-slate-400" />
                        <span className="truncate">{sup.email}</span>
                      </div>
                    )}
                    {sup.city && (
                      <div className="flex items-center gap-2 text-xs text-slate-500">
                        <MapPin className="w-3.5 h-3.5 flex-shrink-0 text-slate-400" />
                        <span>{sup.city}</span>
                      </div>
                    )}
                    {!sup.phone && !sup.email && !sup.city && (
                      <p className="text-xs text-slate-400 italic">No contact details</p>
                    )}
                  </div>
                </div>
              </motion.div>
            ))}
          </div>
        )}

        <Modal isOpen={isModalOpen} onClose={() => setIsModalOpen(false)} title={editingId ? "Edit Supplier" : "Add Supplier"}>
          <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
            <div className="space-y-2">
              <label className="text-sm font-semibold">Company Name *</label>
              <Input {...register("name", { required: true })} placeholder="Supplier Inc." />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <label className="text-sm font-semibold">Contact Person</label>
                <Input {...register("contactPerson")} placeholder="John Doe" />
              </div>
              <div className="space-y-2">
                <label className="text-sm font-semibold">Phone</label>
                <Input {...register("phone")} placeholder="+91 9876543210" />
              </div>
            </div>
            <div className="space-y-2">
              <label className="text-sm font-semibold">Email</label>
              <Input type="email" {...register("email")} placeholder="contact@supplier.com" />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <label className="text-sm font-semibold">City</label>
                <Input {...register("city")} placeholder="Chennai" />
              </div>
              <div className="space-y-2">
                <label className="text-sm font-semibold">GST No.</label>
                <Input {...register("gstin")} placeholder="29XXXXX..." />
              </div>
            </div>
            <div className="pt-4 flex justify-end gap-3 border-t">
              <Button type="button" variant="outline" onClick={() => setIsModalOpen(false)}>Cancel</Button>
              <Button type="submit" variant="gradient" isLoading={isCreating || isUpdating}>Save</Button>
            </div>
          </form>
        </Modal>
      </div>
    </Layout>
  );
}

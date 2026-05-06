import { useState } from "react";
import { useGetSuppliers, useCreateSupplier, useUpdateSupplier, useDeleteSupplier } from "@/api-client";
import { ensureArray } from "@/lib/api-utils";
import { Plus, Edit, Trash2, Users, Mail, Phone, MapPin } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import { toast } from "sonner";
import { ModuleFileUpload } from "@/components/ModuleFileUpload";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { z } from "zod";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { useQueryClient } from "@tanstack/react-query";
import { motion } from "framer-motion";

const supplierSchema = z.object({
  name: z.string().min(1, "Name is required"),
  gstNumber: z.string().optional(),
  phone: z.string().optional(),
  email: z.string().email("Invalid email").or(z.literal("")).optional(),
  address: z.string().optional(),
});

type SupplierFormValues = z.infer<typeof supplierSchema>;

export default function Suppliers() {
  const queryClient = useQueryClient();
  const { data: suppliersResponse, isLoading } = useGetSuppliers();
  const suppliers = ensureArray(suppliersResponse, "suppliers");
  const createMutation = useCreateSupplier();
  const updateMutation = useUpdateSupplier();
  const deleteMutation = useDeleteSupplier();

  const [isFormOpen, setIsFormOpen] = useState(false);
  const [editingSupplier, setEditingSupplier] = useState<any>(null);

  const form = useForm<SupplierFormValues>({
    resolver: zodResolver(supplierSchema),
    defaultValues: { name: "", gstNumber: "", phone: "", email: "", address: "" }
  });

  const openCreateForm = () => {
    setEditingSupplier(null);
    form.reset({ name: "", gstNumber: "", phone: "", email: "", address: "" });
    setIsFormOpen(true);
  };

  const openEditForm = (supplier: any) => {
    setEditingSupplier(supplier);
    form.reset({ 
      name: supplier.name, 
      gstNumber: supplier.gstNumber || supplier.gst || "", 
      phone: supplier.phone || "", 
      email: supplier.email || "", 
      address: supplier.address || "" 
    });
    setIsFormOpen(true);
  };

  const handleDelete = (id: number) => {
    if (confirm("Are you sure you want to delete this supplier?")) {
      deleteMutation.mutate({ id }, {
        onSuccess: () => {
          toast.success("Supplier deleted");
          queryClient.invalidateQueries({ queryKey: ["/api/suppliers"] });
        },
        onError: () => toast.error("Failed to delete supplier")
      });
    }
  };

  const onSubmit = (data: SupplierFormValues) => {
    if (editingSupplier) {
      updateMutation.mutate({ id: editingSupplier.id, data }, {
        onSuccess: () => {
          toast.success("Supplier updated");
          setIsFormOpen(false);
          queryClient.invalidateQueries({ queryKey: ["/api/suppliers"] });
        },
        onError: () => toast.error("Failed to update supplier")
      });
    } else {
      createMutation.mutate({ data }, {
        onSuccess: () => {
          toast.success("Supplier created");
          setIsFormOpen(false);
          queryClient.invalidateQueries({ queryKey: ["/api/suppliers"] });
        },
        onError: () => toast.error("Failed to create supplier")
      });
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <h2 className="text-2xl font-bold text-white tracking-tight">Suppliers</h2>
        <div className="flex items-center gap-2">
          <ModuleFileUpload section="supplier_details" onSuccess={() => queryClient.invalidateQueries({ queryKey: ["/api/suppliers"] })} />
          <Button onClick={openCreateForm} className="bg-primary text-white">
            <Plus size={16} className="mr-2" /> Add Supplier
          </Button>
        </div>
      </div>

      {isLoading ? (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {[1,2,3,4].map(i => <Skeleton key={i} className="h-40 glass-panel rounded-xl" />)}
        </div>
      ) : suppliers?.length === 0 ? (
        <div className="glass-panel p-12 rounded-xl flex flex-col items-center justify-center text-center">
          <Users className="h-16 w-16 text-muted-foreground mb-4 opacity-50" />
          <h3 className="text-xl font-bold text-white mb-2">No suppliers found</h3>
          <p className="text-muted-foreground">Add a supplier to manage purchases and inventory sources.</p>
        </div>
      ) : (
        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {suppliers?.map(supplier => (
            <motion.div key={supplier.id} layout className="glass-panel p-5 rounded-xl border border-white/5 relative group">
              <div className="flex justify-between items-start mb-4">
                <div>
                  <h3 className="font-semibold text-white text-lg">{supplier.name}</h3>
                  {(supplier.gstNumber || supplier.gst) && <p className="text-xs text-muted-foreground mt-1">GST: <span className="font-mono">{supplier.gstNumber || supplier.gst}</span></p>}
                </div>
                <div className="flex gap-2">
                  <button onClick={() => openEditForm(supplier)} className="text-muted-foreground hover:text-white transition-colors">
                    <Edit size={16} />
                  </button>
                  <button onClick={() => handleDelete(supplier.id)} className="text-muted-foreground hover:text-red-400 transition-colors">
                    <Trash2 size={16} />
                  </button>
                </div>
              </div>
              <div className="space-y-2 text-sm text-muted-foreground">
                {supplier.phone && (
                  <div className="flex items-center gap-2">
                    <Phone size={14} className="text-primary" />
                    <a href={`tel:${supplier.phone}`} className="hover:text-primary transition-colors">{supplier.phone}</a>
                  </div>
                )}
                {supplier.email && (
                  <div className="flex items-center gap-2">
                    <Mail size={14} className="text-primary" />
                    <a href={`mailto:${supplier.email}`} className="hover:text-primary transition-colors">{supplier.email}</a>
                  </div>
                )}
                {supplier.address && (
                  <div className="flex items-start gap-2">
                    <MapPin size={14} className="text-primary mt-0.5 shrink-0" />
                    <span>{supplier.address}</span>
                  </div>
                )}
              </div>
            </motion.div>
          ))}
        </motion.div>
      )}

      <Dialog open={isFormOpen} onOpenChange={setIsFormOpen}>
        <DialogContent className="bg-card border-white/10 text-white sm:max-w-[500px]">
          <DialogHeader>
            <DialogTitle>{editingSupplier ? 'Edit Supplier' : 'Add New Supplier'}</DialogTitle>
          </DialogHeader>
          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4 pt-4">
              <FormField
                control={form.control}
                name="name"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Supplier Name*</FormLabel>
                    <FormControl><Input className="bg-black/20 border-white/10" {...field} /></FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <div className="grid grid-cols-2 gap-4">
                <FormField
                  control={form.control}
                  name="gstNumber"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>GST Number</FormLabel>
                      <FormControl><Input className="bg-black/20 border-white/10" {...field} /></FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="phone"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Phone</FormLabel>
                      <FormControl><Input className="bg-black/20 border-white/10" {...field} /></FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>
              <FormField
                control={form.control}
                name="email"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Email</FormLabel>
                    <FormControl><Input type="email" className="bg-black/20 border-white/10" {...field} /></FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="address"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Address</FormLabel>
                    <FormControl><Input className="bg-black/20 border-white/10" {...field} /></FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <div className="pt-4 flex justify-end gap-3">
                <Button type="button" variant="outline" onClick={() => setIsFormOpen(false)} className="bg-transparent border-white/10 hover:bg-white/5">Cancel</Button>
                <Button type="submit" disabled={createMutation.isPending || updateMutation.isPending} className="bg-primary text-white">
                  {createMutation.isPending || updateMutation.isPending ? "Saving..." : "Save"}
                </Button>
              </div>
            </form>
          </Form>
        </DialogContent>
      </Dialog>
    </div>
  );
}

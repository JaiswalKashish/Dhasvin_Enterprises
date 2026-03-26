import * as React from "react";
import { Layout } from "@/components/layout";
import { useGetSuppliers, useCreateSupplier, useUpdateSupplier, useDeleteSupplier } from "@workspace/api-client-react";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Modal } from "@/components/ui/modal";
import { Plus, Edit, Trash2 } from "lucide-react";
import { useForm } from "react-hook-form";
import { useQueryClient } from "@tanstack/react-query";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/hooks/use-auth";
import { Redirect } from "wouter";

export default function Suppliers() {
  const { user } = useAuth();
  if (user && user.role !== "admin") return <Redirect to="/" />;

  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [isModalOpen, setIsModalOpen] = React.useState(false);
  const [editingId, setEditingId] = React.useState<number | null>(null);

  const { data: suppliers, isLoading } = useGetSuppliers();

  const { mutate: createSup, isPending: isCreating } = useCreateSupplier({
    mutation: {
      onSuccess: () => {
        queryClient.invalidateQueries({ queryKey: ["/api/suppliers"] });
        setIsModalOpen(false);
        toast({ title: "Success", description: "Supplier added" });
      }
    }
  });

  const { mutate: updateSup, isPending: isUpdating } = useUpdateSupplier({
    mutation: {
      onSuccess: () => {
        queryClient.invalidateQueries({ queryKey: ["/api/suppliers"] });
        setIsModalOpen(false);
        toast({ title: "Success", description: "Supplier updated" });
      }
    }
  });

  const { mutate: deleteSup } = useDeleteSupplier({
    mutation: {
      onSuccess: () => {
        queryClient.invalidateQueries({ queryKey: ["/api/suppliers"] });
        toast({ title: "Success", description: "Supplier deleted" });
      }
    }
  });

  const { register, handleSubmit, reset } = useForm();

  const openCreate = () => {
    reset();
    setEditingId(null);
    setIsModalOpen(true);
  };

  const openEdit = (sup: any) => {
    reset(sup);
    setEditingId(sup.id);
    setIsModalOpen(true);
  };

  const onSubmit = (data: any) => {
    if (editingId) updateSup({ id: editingId, data });
    else createSup({ data });
  };

  return (
    <Layout>
      <div className="space-y-6">
        <div className="flex justify-between items-end">
          <div>
            <h1 className="text-3xl font-display font-bold text-foreground">Suppliers</h1>
            <p className="text-muted-foreground mt-1">Manage your vendor directory.</p>
          </div>
          <Button variant="gradient" onClick={openCreate}>
            <Plus className="w-4 h-4 mr-2" /> Add Supplier
          </Button>
        </div>

        {isLoading ? (
          <div className="animate-pulse space-y-4">
            {[1,2,3].map(i => <div key={i} className="h-16 bg-white rounded-xl"></div>)}
          </div>
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Company Name</TableHead>
                <TableHead>Contact</TableHead>
                <TableHead>Email/Phone</TableHead>
                <TableHead>City</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {suppliers?.map((sup) => (
                <TableRow key={sup.id}>
                  <TableCell className="font-bold">{sup.name}</TableCell>
                  <TableCell>{sup.contactPerson || '-'}</TableCell>
                  <TableCell>
                    <div className="text-sm">
                      <div>{sup.email}</div>
                      <div className="text-muted-foreground">{sup.phone}</div>
                    </div>
                  </TableCell>
                  <TableCell>{sup.city || '-'}</TableCell>
                  <TableCell className="text-right">
                    <button onClick={() => openEdit(sup)} className="p-2 text-blue-600 hover:bg-blue-50 rounded-lg transition-colors mr-2">
                      <Edit className="w-4 h-4" />
                    </button>
                    <button onClick={() => {
                      if (confirm("Delete supplier?")) deleteSup({ id: sup.id });
                    }} className="p-2 text-red-600 hover:bg-red-50 rounded-lg transition-colors">
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
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

import * as React from "react";
import { Layout } from "@/components/layout";
import { useGetCategories, useCreateCategory, useUpdateCategory, useDeleteCategory } from "@workspace/api-client-react";
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

export default function Categories() {
  const { user } = useAuth();
  if (user && user.role !== "admin") return <Redirect to="/" />;

  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [isModalOpen, setIsModalOpen] = React.useState(false);
  const [editingId, setEditingId] = React.useState<number | null>(null);

  const { data: categories, isLoading } = useGetCategories();

  const { mutate: createCat, isPending: isCreating } = useCreateCategory({
    mutation: {
      onSuccess: () => {
        queryClient.invalidateQueries({ queryKey: ["/api/categories"] });
        setIsModalOpen(false);
        toast({ title: "Success", description: "Category created" });
      }
    }
  });

  const { mutate: updateCat, isPending: isUpdating } = useUpdateCategory({
    mutation: {
      onSuccess: () => {
        queryClient.invalidateQueries({ queryKey: ["/api/categories"] });
        setIsModalOpen(false);
        toast({ title: "Success", description: "Category updated" });
      }
    }
  });

  const { mutate: deleteCat } = useDeleteCategory({
    mutation: {
      onSuccess: () => {
        queryClient.invalidateQueries({ queryKey: ["/api/categories"] });
        toast({ title: "Success", description: "Category deleted" });
      }
    }
  });

  const { register, handleSubmit, reset } = useForm();

  const openCreate = () => {
    reset();
    setEditingId(null);
    setIsModalOpen(true);
  };

  const openEdit = (cat: any) => {
    reset(cat);
    setEditingId(cat.id);
    setIsModalOpen(true);
  };

  const onSubmit = (data: any) => {
    if (editingId) updateCat({ id: editingId, data });
    else createCat({ data });
  };

  return (
    <Layout>
      <div className="space-y-6">
        <div className="flex justify-between items-end">
          <div>
            <h1 className="text-3xl font-display font-bold text-foreground">Categories</h1>
            <p className="text-muted-foreground mt-1">Organize your products into categories.</p>
          </div>
          <Button variant="gradient" onClick={openCreate}>
            <Plus className="w-4 h-4 mr-2" /> Add Category
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
                <TableHead>Name</TableHead>
                <TableHead>Description</TableHead>
                <TableHead>Products</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {categories?.map((cat) => (
                <TableRow key={cat.id}>
                  <TableCell className="font-bold">{cat.name}</TableCell>
                  <TableCell>{cat.description || '-'}</TableCell>
                  <TableCell>{cat.productCount || 0}</TableCell>
                  <TableCell className="text-right">
                    <button onClick={() => openEdit(cat)} className="p-2 text-blue-600 hover:bg-blue-50 rounded-lg transition-colors mr-2">
                      <Edit className="w-4 h-4" />
                    </button>
                    <button onClick={() => {
                      if (confirm("Delete category?")) deleteCat({ id: cat.id });
                    }} className="p-2 text-red-600 hover:bg-red-50 rounded-lg transition-colors">
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        )}

        <Modal isOpen={isModalOpen} onClose={() => setIsModalOpen(false)} title={editingId ? "Edit Category" : "Add Category"}>
          <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
            <div className="space-y-2">
              <label className="text-sm font-semibold">Name *</label>
              <Input {...register("name", { required: true })} placeholder="e.g. Hand Tools" />
            </div>
            <div className="space-y-2">
              <label className="text-sm font-semibold">Description</label>
              <textarea 
                {...register("description")} 
                className="w-full rounded-xl border-2 border-input bg-white px-4 py-2 text-sm focus-visible:outline-none focus-visible:border-primary"
                rows={3}
              />
            </div>
            <div className="pt-4 flex justify-end gap-3">
              <Button type="button" variant="outline" onClick={() => setIsModalOpen(false)}>Cancel</Button>
              <Button type="submit" variant="gradient" isLoading={isCreating || isUpdating}>Save</Button>
            </div>
          </form>
        </Modal>
      </div>
    </Layout>
  );
}

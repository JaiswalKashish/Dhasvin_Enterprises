import * as React from "react";
import { Layout } from "@/components/layout";
import { useGetProducts, useCreateProduct, useUpdateProduct, useDeleteProduct, useGetCategories, useGetSuppliers } from "@workspace/api-client-react";
import { formatCurrency } from "@/lib/utils";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Modal } from "@/components/ui/modal";
import { useAuth } from "@/hooks/use-auth";
import { Search, Plus, Upload, Edit, Trash2 } from "lucide-react";
import { useForm } from "react-hook-form";
import { useQueryClient } from "@tanstack/react-query";
import { useToast } from "@/hooks/use-toast";

export default function Inventory() {
  const { user } = useAuth();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [search, setSearch] = React.useState("");
  const [isModalOpen, setIsModalOpen] = React.useState(false);
  const [editingId, setEditingId] = React.useState<number | null>(null);

  const { data, isLoading } = useGetProducts({ search, limit: 50 });
  const { data: categories } = useGetCategories();
  const { data: suppliers } = useGetSuppliers();

  const { mutate: createProd, isPending: isCreating } = useCreateProduct({
    mutation: {
      onSuccess: () => {
        queryClient.invalidateQueries({ queryKey: ["/api/products"] });
        setIsModalOpen(false);
        toast({ title: "Success", description: "Product created successfully" });
      }
    }
  });

  const { mutate: updateProd, isPending: isUpdating } = useUpdateProduct({
    mutation: {
      onSuccess: () => {
        queryClient.invalidateQueries({ queryKey: ["/api/products"] });
        setIsModalOpen(false);
        toast({ title: "Success", description: "Product updated successfully" });
      }
    }
  });

  const { mutate: deleteProd } = useDeleteProduct({
    mutation: {
      onSuccess: () => {
        queryClient.invalidateQueries({ queryKey: ["/api/products"] });
        toast({ title: "Success", description: "Product deleted" });
      }
    }
  });

  const { register, handleSubmit, reset, setValue } = useForm();

  const openCreate = () => {
    reset();
    setEditingId(null);
    setIsModalOpen(true);
  };

  const openEdit = (product: any) => {
    reset(product);
    setEditingId(product.id);
    setIsModalOpen(true);
  };

  const onSubmit = (data: any) => {
    const payload = {
      ...data,
      categoryId: data.categoryId ? Number(data.categoryId) : undefined,
      supplierId: data.supplierId ? Number(data.supplierId) : undefined,
      unitPrice: Number(data.unitPrice),
      quantity: Number(data.quantity),
      tax: Number(data.tax),
    };

    if (editingId) {
      updateProd({ id: editingId, data: payload });
    } else {
      createProd({ data: payload });
    }
  };

  const canEdit = user?.role === "admin" || user?.role === "staff";

  return (
    <Layout>
      <div className="space-y-6">
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
          <div>
            <h1 className="text-3xl font-display font-bold text-foreground">Inventory</h1>
            <p className="text-muted-foreground mt-1">Manage your product catalog and stock levels.</p>
          </div>
          {canEdit && (
            <div className="flex gap-3">
              <Button variant="outline" className="bg-white">
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

        <div className="bg-white p-4 rounded-2xl shadow-sm flex gap-4 items-center">
          <Input 
            placeholder="Search products..." 
            icon={<Search className="w-5 h-5" />}
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="max-w-md"
          />
        </div>

        {isLoading ? (
          <div className="animate-pulse space-y-4">
            {[1,2,3,4,5].map(i => <div key={i} className="h-16 bg-white rounded-xl"></div>)}
          </div>
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Product Name</TableHead>
                <TableHead>Category</TableHead>
                <TableHead>Price</TableHead>
                <TableHead>Stock</TableHead>
                <TableHead>Status</TableHead>
                {canEdit && <TableHead className="text-right">Actions</TableHead>}
              </TableRow>
            </TableHeader>
            <TableBody>
              {data?.products.map((product) => {
                const qty = product.quantity || 0;
                const reorder = product.reorderLevel || 10;
                let statusVar: any = "success";
                let statusText = "In Stock";
                
                if (qty <= 0) {
                  statusVar = "destructive";
                  statusText = "Out of Stock";
                } else if (qty <= reorder) {
                  statusVar = "warning";
                  statusText = "Low Stock";
                }

                return (
                  <TableRow key={product.id}>
                    <TableCell className="font-semibold text-foreground">{product.name}</TableCell>
                    <TableCell>{product.categoryName || '-'}</TableCell>
                    <TableCell>{formatCurrency(product.unitPrice)}</TableCell>
                    <TableCell>{qty} {product.units}</TableCell>
                    <TableCell>
                      <Badge variant={statusVar}>{statusText}</Badge>
                    </TableCell>
                    {canEdit && (
                      <TableCell className="text-right">
                        <button onClick={() => openEdit(product)} className="p-2 text-blue-600 hover:bg-blue-50 rounded-lg transition-colors mr-2">
                          <Edit className="w-4 h-4" />
                        </button>
                        <button onClick={() => {
                          if (confirm("Are you sure?")) deleteProd({ id: product.id });
                        }} className="p-2 text-red-600 hover:bg-red-50 rounded-lg transition-colors">
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </TableCell>
                    )}
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
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
                <select {...register("categoryId")} className="w-full h-12 rounded-xl border-2 border-input bg-white px-4 py-2 text-sm focus-visible:outline-none focus-visible:border-primary">
                  <option value="">Select...</option>
                  {categories?.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
                </select>
              </div>
              <div className="space-y-2">
                <label className="text-sm font-semibold text-foreground">Supplier</label>
                <select {...register("supplierId")} className="w-full h-12 rounded-xl border-2 border-input bg-white px-4 py-2 text-sm focus-visible:outline-none focus-visible:border-primary">
                  <option value="">Select...</option>
                  {suppliers?.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
                </select>
              </div>
            </div>

            <div className="grid grid-cols-3 gap-4">
              <div className="space-y-2">
                <label className="text-sm font-semibold text-foreground">Price *</label>
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

            <div className="pt-4 flex justify-end gap-3 border-t">
              <Button type="button" variant="outline" onClick={() => setIsModalOpen(false)}>Cancel</Button>
              <Button type="submit" variant="gradient" isLoading={isCreating || isUpdating}>
                {editingId ? "Save Changes" : "Create Product"}
              </Button>
            </div>
          </form>
        </Modal>
      </div>
    </Layout>
  );
}

import { useState, useEffect } from "react";
import { motion } from "framer-motion";
import { useAuth } from "@/lib/auth";
import { 
  useGetProducts, 
  useGetCategories,
  useGetSuppliers,
  useCreateProduct,
  useUpdateProduct,
  useDeleteProduct
} from "@/api-client";
import { 
  Search, 
  Plus, 
  LayoutGrid, 
  List, 
  MoreVertical, 
  Edit, 
  Trash2, 
  AlertCircle,
  Package
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { toast } from "sonner";
import { ModuleFileUpload } from "@/components/ModuleFileUpload";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { z } from "zod";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { useQueryClient } from "@tanstack/react-query";

const productSchema = z.object({
  name: z.string().min(1, "Name is required"),
  categoryId: z.coerce.number().optional(),
  supplierId: z.coerce.number().optional(),
  unitPrice: z.coerce.number().min(0, "Price must be positive"),
  quantity: z.coerce.number().min(0, "Quantity must be non-negative"),
  reorderLevel: z.coerce.number().min(0).optional(),
  hsnCode: z.string().optional(),
  tax: z.coerce.number().min(0).max(100).optional(),
  description: z.string().optional(),
});

type ProductFormValues = z.infer<typeof productSchema>;

export default function Products() {
  const { user } = useAuth();
  const isAdminOrStaff = user?.role === 'admin' || user?.role === 'staff';
  const queryClient = useQueryClient();

  const [layout, setLayout] = useState<'grid' | 'table'>(
    (localStorage.getItem('dhasvin_layout') as 'grid' | 'table') || 'table'
  );
  
  const [searchTerm, setSearchTerm] = useState("");
  const [debouncedSearch, setDebouncedSearch] = useState("");
  const [categoryFilter, setCategoryFilter] = useState<string>("all");
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [editingProduct, setEditingProduct] = useState<any>(null);

  // Debounce search
  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedSearch(searchTerm);
    }, 500);
    return () => clearTimeout(timer);
  }, [searchTerm]);

  const { data: productsResponse, isLoading } = useGetProducts({
    search: debouncedSearch || undefined,
    category: categoryFilter !== "all" ? categoryFilter : undefined
  });

  const products = productsResponse?.products || [];

  const { data: categories } = useGetCategories();
  const { data: suppliers } = useGetSuppliers();

  const createMutation = useCreateProduct();
  const updateMutation = useUpdateProduct();
  const deleteMutation = useDeleteProduct();

  const form = useForm<ProductFormValues>({
    resolver: zodResolver(productSchema),
    defaultValues: {
      name: "",
      unitPrice: 0,
      quantity: 0,
      reorderLevel: 10,
      tax: 18,
      hsnCode: "",
      description: ""
    }
  });

  const toggleLayout = () => {
    const newLayout = layout === 'grid' ? 'table' : 'grid';
    setLayout(newLayout);
    localStorage.setItem('dhasvin_layout', newLayout);
  };

  const openCreateForm = () => {
    setEditingProduct(null);
    form.reset({
      name: "",
      unitPrice: 0,
      quantity: 0,
      reorderLevel: 10,
      tax: 18,
      hsnCode: "",
      description: ""
    });
    setIsFormOpen(true);
  };

  const openEditForm = (product: any) => {
    setEditingProduct(product);
    form.reset({
      name: product.name,
      categoryId: product.categoryId,
      supplierId: product.supplierId,
      unitPrice: product.unitPrice || product.price || 0,
      quantity: product.quantity,
      reorderLevel: product.reorderLevel || product.minQuantity || 10,
      hsnCode: product.hsnCode || "",
      tax: product.tax || product.gst || 18,
      description: product.description || ""
    });
    setIsFormOpen(true);
  };

  const handleDelete = (id: number) => {
    if (confirm("Are you sure you want to delete this product?")) {
      deleteMutation.mutate({ id }, {
        onSuccess: () => {
          toast.success("Product deleted");
          queryClient.invalidateQueries({ queryKey: ["/api/products"] });
        },
        onError: () => toast.error("Failed to delete product")
      });
    }
  };

  const onSubmit = (data: ProductFormValues) => {
    if (editingProduct) {
      updateMutation.mutate({ id: editingProduct.id, data }, {
        onSuccess: () => {
          toast.success("Product updated");
          setIsFormOpen(false);
          queryClient.invalidateQueries({ queryKey: ["/api/products"] });
        },
        onError: () => toast.error("Failed to update product")
      });
    } else {
      createMutation.mutate({ data }, {
        onSuccess: () => {
          toast.success("Product created");
          setIsFormOpen(false);
          queryClient.invalidateQueries({ queryKey: ["/api/products"] });
        },
        onError: () => toast.error("Failed to create product")
      });
    }
  };

  const getStockStatus = (quantity: number, reorderLevel = 10) => {
    if (quantity === 0) return { label: "Out of Stock", color: "bg-red-500/20 text-red-400 border-red-500/30" };
    if (quantity <= reorderLevel) return { label: "Low Stock", color: "bg-amber-500/20 text-amber-400 border-amber-500/30" };
    return { label: "In Stock", color: "bg-emerald-500/20 text-emerald-400 border-emerald-500/30" };
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <h2 className="text-2xl font-bold text-white tracking-tight">Products</h2>
        
        {isAdminOrStaff && (
          <div className="flex items-center gap-2">
            <ModuleFileUpload section="products" onSuccess={() => queryClient.invalidateQueries({ queryKey: ["/api/products"] })} />
            <Button onClick={openCreateForm} className="bg-primary text-white">
              <Plus size={16} className="mr-2" /> Add Product
            </Button>
          </div>
        )}
      </div>

      <div className="glass-panel p-4 rounded-xl flex flex-col md:flex-row gap-4 items-center justify-between">
        <div className="flex-1 w-full relative">
          <Search className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
          <Input 
            placeholder="Search products..." 
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="pl-10 bg-black/20 border-white/10 text-white w-full md:max-w-md"
          />
        </div>
        
        <div className="flex items-center gap-3 w-full md:w-auto">
          <Select value={categoryFilter} onValueChange={setCategoryFilter}>
            <SelectTrigger className="w-[180px] bg-black/20 border-white/10 text-white">
              <SelectValue placeholder="All Categories" />
            </SelectTrigger>
            <SelectContent className="bg-card border-white/10">
              <SelectItem value="all">All Categories</SelectItem>
              {categories?.map(c => (
                <SelectItem key={c.id} value={c.name}>{c.name}</SelectItem>
              ))}
            </SelectContent>
          </Select>

          <div className="flex items-center p-1 rounded-md bg-black/20 border border-white/10">
            <button 
              onClick={toggleLayout} 
              className={`p-1.5 rounded ${layout === 'table' ? 'bg-white/10 text-white' : 'text-muted-foreground'}`}
            >
              <List size={16} />
            </button>
            <button 
              onClick={toggleLayout} 
              className={`p-1.5 rounded ${layout === 'grid' ? 'bg-white/10 text-white' : 'text-muted-foreground'}`}
            >
              <LayoutGrid size={16} />
            </button>
          </div>
        </div>
      </div>

      {isLoading ? (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {[1,2,3,4,5,6].map(i => <Skeleton key={i} className="h-48 glass-panel rounded-xl" />)}
        </div>
      ) : products.length === 0 ? (
        <div className="glass-panel p-12 rounded-xl flex flex-col items-center justify-center text-center">
          <Package className="h-16 w-16 text-muted-foreground mb-4 opacity-50" />
          <h3 className="text-xl font-bold text-white mb-2">No products found</h3>
          <p className="text-muted-foreground max-w-sm">
            We couldn't find any products matching your search criteria.
          </p>
        </div>
      ) : layout === 'grid' ? (
        <motion.div 
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-6"
        >
          {products.map(product => {
            const status = getStockStatus(product.quantity, product.reorderLevel);
            return (
              <motion.div 
                key={product.id}
                layout
                className="glass-panel p-5 rounded-xl border border-white/5 hover:border-primary/30 transition-colors relative group"
              >
                {/* User requested blue shade grid theme */}
                <div className="absolute inset-0 bg-gradient-to-br from-blue-500/5 to-transparent rounded-xl pointer-events-none" />
                
                <div className="flex justify-between items-start mb-3 relative z-10">
                  <Badge variant="outline" className={status.color}>{status.label}</Badge>
                  {isAdminOrStaff && (
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <button className="text-muted-foreground hover:text-white p-1 rounded-md hover:bg-white/10">
                          <MoreVertical size={16} />
                        </button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end" className="bg-card border-white/10">
                        <DropdownMenuItem onClick={() => openEditForm(product)} className="cursor-pointer text-white focus:bg-white/10">
                          <Edit size={14} className="mr-2" /> Edit
                        </DropdownMenuItem>
                        <DropdownMenuItem onClick={() => handleDelete(product.id)} className="cursor-pointer text-red-400 focus:bg-red-500/10 focus:text-red-400">
                          <Trash2 size={14} className="mr-2" /> Delete
                        </DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  )}
                </div>
                
                <h3 className="font-semibold text-white text-lg truncate mb-1 relative z-10" title={product.name}>{product.name}</h3>
                <p className="text-xs text-muted-foreground mb-4 relative z-10">{product.categoryName || 'Uncategorized'}</p>
                
                <div className="grid grid-cols-2 gap-4 mt-auto pt-4 border-t border-white/5 relative z-10">
                  <div>
                    <p className="text-xs text-muted-foreground mb-1">Price</p>
                    <p className="font-mono text-white font-medium">₹{product.unitPrice || product.price}</p>
                  </div>
                  <div>
                    <p className="text-xs text-muted-foreground mb-1">Stock</p>
                    <p className="font-mono text-white font-medium">{product.quantity}</p>
                  </div>
                </div>
              </motion.div>
            );
          })}
        </motion.div>
      ) : (
        <motion.div 
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          className="glass-panel rounded-xl border border-white/5 overflow-hidden"
        >
          <div className="overflow-x-auto">
            <table className="w-full text-sm text-left">
              <thead className="text-xs text-muted-foreground uppercase bg-white/5 border-b border-white/5">
                <tr>
                  <th className="px-6 py-4">Name</th>
                  <th className="px-6 py-4">Category</th>
                  <th className="px-6 py-4 text-right">Price</th>
                  <th className="px-6 py-4 text-right">Stock</th>
                  <th className="px-6 py-4">Status</th>
                  {isAdminOrStaff && <th className="px-6 py-4 text-right">Actions</th>}
                </tr>
              </thead>
              <tbody className="divide-y divide-white/5">
                {products.map(product => {
                  const status = getStockStatus(product.quantity, product.reorderLevel);
                  return (
                    <tr key={product.id} className="hover:bg-white/5 transition-colors">
                      <td className="px-6 py-4 font-medium text-white">{product.name}</td>
                      <td className="px-6 py-4 text-muted-foreground">{product.categoryName || '-'}</td>
                      <td className="px-6 py-4 text-right font-mono">₹{product.unitPrice || product.price}</td>
                      <td className="px-6 py-4 text-right font-mono">{product.quantity}</td>
                      <td className="px-6 py-4">
                        <Badge variant="outline" className={status.color}>{status.label}</Badge>
                      </td>
                      {isAdminOrStaff && (
                        <td className="px-6 py-4 text-right">
                          <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                              <button className="text-muted-foreground hover:text-white p-1 rounded-md hover:bg-white/10">
                                <MoreVertical size={16} />
                              </button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent align="end" className="bg-card border-white/10">
                              <DropdownMenuItem onClick={() => openEditForm(product)} className="cursor-pointer text-white focus:bg-white/10">
                                <Edit size={14} className="mr-2" /> Edit
                              </DropdownMenuItem>
                              <DropdownMenuItem onClick={() => handleDelete(product.id)} className="cursor-pointer text-red-400 focus:bg-red-500/10 focus:text-red-400">
                                <Trash2 size={14} className="mr-2" /> Delete
                              </DropdownMenuItem>
                            </DropdownMenuContent>
                          </DropdownMenu>
                        </td>
                      )}
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </motion.div>
      )}

      {/* Create/Edit Modal */}
      <Dialog open={isFormOpen} onOpenChange={setIsFormOpen}>
        <DialogContent className="bg-card border-white/10 text-white sm:max-w-[600px] max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{editingProduct ? 'Edit Product' : 'Add New Product'}</DialogTitle>
          </DialogHeader>

          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4 pt-4">
              <FormField
                control={form.control}
                name="name"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Product Name*</FormLabel>
                    <FormControl>
                      <Input className="bg-black/20 border-white/10" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <div className="grid grid-cols-2 gap-4">
                <FormField
                  control={form.control}
                  name="categoryId"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Category</FormLabel>
                      <Select 
                        value={field.value?.toString()} 
                        onValueChange={(val) => field.onChange(parseInt(val))}
                      >
                        <FormControl>
                          <SelectTrigger className="bg-black/20 border-white/10">
                            <SelectValue placeholder="Select category" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent className="bg-card border-white/10">
                          {categories?.map((cat) => (
                            <SelectItem key={cat.id} value={cat.id.toString()}>{cat.name}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="supplierId"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Supplier</FormLabel>
                      <Select 
                        value={field.value?.toString()} 
                        onValueChange={(val) => field.onChange(parseInt(val))}
                      >
                        <FormControl>
                          <SelectTrigger className="bg-black/20 border-white/10">
                            <SelectValue placeholder="Select supplier" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent className="bg-card border-white/10">
                          {suppliers?.map((sup) => (
                            <SelectItem key={sup.id} value={sup.id.toString()}>{sup.name}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>

              <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
                <FormField
                  control={form.control}
                  name="unitPrice"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Price (₹)*</FormLabel>
                      <FormControl>
                        <Input type="number" step="0.01" className="bg-black/20 border-white/10" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="quantity"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Stock Qty*</FormLabel>
                      <FormControl>
                        <Input type="number" className="bg-black/20 border-white/10" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="reorderLevel"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Min Qty</FormLabel>
                      <FormControl>
                        <Input type="number" className="bg-black/20 border-white/10" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="tax"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>GST (%)</FormLabel>
                      <FormControl>
                        <Input type="number" className="bg-black/20 border-white/10" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>

              <FormField
                control={form.control}
                name="hsnCode"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>HSN Code</FormLabel>
                    <FormControl>
                      <Input className="bg-black/20 border-white/10" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <div className="pt-4 flex justify-end gap-3">
                <Button type="button" variant="outline" onClick={() => setIsFormOpen(false)} className="bg-transparent border-white/10 hover:bg-white/5">
                  Cancel
                </Button>
                <Button type="submit" disabled={createMutation.isPending || updateMutation.isPending} className="bg-primary text-white">
                  {createMutation.isPending || updateMutation.isPending ? "Saving..." : "Save Product"}
                </Button>
              </div>
            </form>
          </Form>
        </DialogContent>
      </Dialog>
    </div>
  );
}

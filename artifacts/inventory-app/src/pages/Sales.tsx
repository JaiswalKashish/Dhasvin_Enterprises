import { useState } from "react";
import { useGetSales, useCreateSale, useGetProducts } from "@/api-client";
import { Plus, ShoppingCart } from "lucide-react";
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
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useQueryClient } from "@tanstack/react-query";
import { format } from "date-fns";

const saleSchema = z.object({
  productId: z.coerce.number().min(1, "Product is required"),
  quantity: z.coerce.number().min(1, "Quantity must be at least 1"),
  unitPrice: z.coerce.number().min(0, "Price must be positive"),
  discount: z.coerce.number().min(0).optional(),
  customerName: z.string().optional(),
  notes: z.string().optional(),
});

type SaleFormValues = z.infer<typeof saleSchema>;

export default function Sales() {
  const queryClient = useQueryClient();
  const { data: sales, isLoading } = useGetSales();
  const { data: products } = useGetProducts();
  const createMutation = useCreateSale();

  const [isFormOpen, setIsFormOpen] = useState(false);

  const form = useForm<SaleFormValues>({
    resolver: zodResolver(saleSchema),
    defaultValues: { productId: 0, quantity: 1, unitPrice: 0, discount: 0, customerName: "", notes: "" }
  });

  const openCreateForm = () => {
    form.reset({ productId: 0, quantity: 1, unitPrice: 0, discount: 0, customerName: "", notes: "" });
    setIsFormOpen(true);
  };

  const handleProductSelect = (productId: string) => {
    const id = parseInt(productId);
    const prod = products?.find(p => p.id === id);
    form.setValue("productId", id);
    if (prod) {
      form.setValue("unitPrice", prod.price);
    }
  };

  const onSubmit = (data: SaleFormValues) => {
    createMutation.mutate({ data }, {
      onSuccess: () => {
        toast.success("Sale recorded");
        setIsFormOpen(false);
        queryClient.invalidateQueries({ queryKey: ["/api/sales"] });
        queryClient.invalidateQueries({ queryKey: ["/api/products"] });
      },
      onError: () => toast.error("Failed to record sale")
    });
  };

  const totalSalesAmount = sales?.reduce((sum, sale) => sum + (sale.totalAmount || 0), 0) || 0;

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h2 className="text-2xl font-bold text-white tracking-tight">Sales Records</h2>
          <p className="text-muted-foreground mt-1">Total Value: ₹{totalSalesAmount.toLocaleString()}</p>
        </div>
        <div className="flex items-center gap-2">
          <ModuleFileUpload section="sales" onSuccess={() => {
            queryClient.invalidateQueries({ queryKey: ["/api/sales"] });
            queryClient.invalidateQueries({ queryKey: ["/api/products"] });
          }} />
          <Button onClick={openCreateForm} className="bg-emerald-500 text-white hover:bg-emerald-600">
            <Plus size={16} className="mr-2" /> Record Sale
          </Button>
        </div>
      </div>

      {isLoading ? (
        <div className="glass-panel p-6 rounded-xl">
          <Skeleton className="h-[400px] w-full" />
        </div>
      ) : sales?.length === 0 ? (
        <div className="glass-panel p-12 rounded-xl flex flex-col items-center justify-center text-center">
          <ShoppingCart className="h-16 w-16 text-muted-foreground mb-4 opacity-50" />
          <h3 className="text-xl font-bold text-white mb-2">No sales recorded</h3>
          <p className="text-muted-foreground">Click "Record Sale" to add your first transaction.</p>
        </div>
      ) : (
        <div className="glass-panel rounded-xl border border-white/5 overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-sm text-left">
              <thead className="text-xs text-muted-foreground uppercase bg-white/5 border-b border-white/5">
                <tr>
                  <th className="px-6 py-4">Date</th>
                  <th className="px-6 py-4">Product</th>
                  <th className="px-6 py-4">Customer</th>
                  <th className="px-6 py-4 text-right">Qty</th>
                  <th className="px-6 py-4 text-right">Unit Price</th>
                  <th className="px-6 py-4 text-right">Total</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-white/5">
                {sales?.map(sale => (
                  <tr key={sale.id} className="hover:bg-white/5 transition-colors">
                    <td className="px-6 py-4 text-muted-foreground">
                      {sale.createdAt ? format(new Date(sale.createdAt), 'MMM dd, yyyy') : '-'}
                    </td>
                    <td className="px-6 py-4 font-medium text-white">{sale.productName}</td>
                    <td className="px-6 py-4 text-muted-foreground">{sale.customerName || '-'}</td>
                    <td className="px-6 py-4 text-right font-mono">{sale.quantity}</td>
                    <td className="px-6 py-4 text-right font-mono">₹{sale.unitPrice}</td>
                    <td className="px-6 py-4 text-right font-mono text-emerald-400">₹{sale.totalAmount}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      <Dialog open={isFormOpen} onOpenChange={setIsFormOpen}>
        <DialogContent className="bg-card border-white/10 text-white sm:max-w-[500px]">
          <DialogHeader>
            <DialogTitle>Record Direct Sale</DialogTitle>
          </DialogHeader>
          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4 pt-4">
              <FormField
                control={form.control}
                name="productId"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Product*</FormLabel>
                    <Select value={field.value ? field.value.toString() : ""} onValueChange={handleProductSelect}>
                      <FormControl>
                        <SelectTrigger className="bg-black/20 border-white/10">
                          <SelectValue placeholder="Select product" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent className="bg-card border-white/10">
                        {products?.map(p => (
                          <SelectItem key={p.id} value={p.id.toString()}>{p.name} (Stock: {p.quantity})</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <div className="grid grid-cols-2 gap-4">
                <FormField
                  control={form.control}
                  name="quantity"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Quantity*</FormLabel>
                      <FormControl><Input type="number" className="bg-black/20 border-white/10" {...field} /></FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="unitPrice"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Unit Price (₹)*</FormLabel>
                      <FormControl><Input type="number" step="0.01" className="bg-black/20 border-white/10" {...field} /></FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <FormField
                  control={form.control}
                  name="discount"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Discount (₹)</FormLabel>
                      <FormControl><Input type="number" step="0.01" className="bg-black/20 border-white/10" {...field} /></FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="customerName"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Customer Name</FormLabel>
                      <FormControl><Input className="bg-black/20 border-white/10" {...field} /></FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>
              <div className="pt-4 flex justify-end gap-3">
                <Button type="button" variant="outline" onClick={() => setIsFormOpen(false)} className="bg-transparent border-white/10 hover:bg-white/5">Cancel</Button>
                <Button type="submit" disabled={createMutation.isPending} className="bg-emerald-500 text-white hover:bg-emerald-600">
                  {createMutation.isPending ? "Saving..." : "Record Sale"}
                </Button>
              </div>
            </form>
          </Form>
        </DialogContent>
      </Dialog>
    </div>
  );
}

import { useState } from "react";
import { useGetPurchases, useCreatePurchase, useGetProducts, useGetSuppliers } from "@workspace/api-client-react";
import { Plus, ShoppingBag } from "lucide-react";
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

const purchaseSchema = z.object({
  productId: z.coerce.number().min(1, "Product is required"),
  supplierId: z.coerce.number().optional(),
  quantity: z.coerce.number().min(1, "Quantity must be at least 1"),
  unitPrice: z.coerce.number().min(0, "Price must be positive"),
  notes: z.string().optional(),
});

type PurchaseFormValues = z.infer<typeof purchaseSchema>;

export default function Purchases() {
  const queryClient = useQueryClient();
  const { data: purchases, isLoading } = useGetPurchases();
  const { data: products } = useGetProducts();
  const { data: suppliers } = useGetSuppliers();
  const createMutation = useCreatePurchase();

  const [isFormOpen, setIsFormOpen] = useState(false);

  const form = useForm<PurchaseFormValues>({
    resolver: zodResolver(purchaseSchema),
    defaultValues: { productId: 0, quantity: 1, unitPrice: 0, notes: "" }
  });

  const openCreateForm = () => {
    form.reset({ productId: 0, quantity: 1, unitPrice: 0, notes: "" });
    setIsFormOpen(true);
  };

  const onSubmit = (data: PurchaseFormValues) => {
    createMutation.mutate({ data }, {
      onSuccess: () => {
        toast.success("Purchase recorded");
        setIsFormOpen(false);
        queryClient.invalidateQueries({ queryKey: ["/api/purchases"] });
        queryClient.invalidateQueries({ queryKey: ["/api/products"] });
      },
      onError: () => toast.error("Failed to record purchase")
    });
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <h2 className="text-2xl font-bold text-white tracking-tight">Purchase Records</h2>
        <div className="flex items-center gap-2">
          <ModuleFileUpload section="purchases" onSuccess={() => {
            queryClient.invalidateQueries({ queryKey: ["/api/purchases"] });
            queryClient.invalidateQueries({ queryKey: ["/api/products"] });
          }} />
          <Button onClick={openCreateForm} className="bg-primary text-white">
            <Plus size={16} className="mr-2" /> Record Purchase
          </Button>
        </div>
      </div>

      {isLoading ? (
        <div className="glass-panel p-6 rounded-xl">
          <Skeleton className="h-[400px] w-full" />
        </div>
      ) : purchases?.length === 0 ? (
        <div className="glass-panel p-12 rounded-xl flex flex-col items-center justify-center text-center">
          <ShoppingBag className="h-16 w-16 text-muted-foreground mb-4 opacity-50" />
          <h3 className="text-xl font-bold text-white mb-2">No purchases recorded</h3>
          <p className="text-muted-foreground">Click "Record Purchase" to add inventory from suppliers.</p>
        </div>
      ) : (
        <div className="glass-panel rounded-xl border border-white/5 overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-sm text-left">
              <thead className="text-xs text-muted-foreground uppercase bg-white/5 border-b border-white/5">
                <tr>
                  <th className="px-6 py-4">Date</th>
                  <th className="px-6 py-4">Product</th>
                  <th className="px-6 py-4">Supplier</th>
                  <th className="px-6 py-4 text-right">Qty</th>
                  <th className="px-6 py-4 text-right">Unit Price</th>
                  <th className="px-6 py-4 text-right">Total</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-white/5">
                {purchases?.map(purchase => (
                  <tr key={purchase.id} className="hover:bg-white/5 transition-colors">
                    <td className="px-6 py-4 text-muted-foreground">
                      {purchase.createdAt ? format(new Date(purchase.createdAt), 'MMM dd, yyyy') : '-'}
                    </td>
                    <td className="px-6 py-4 font-medium text-white">{purchase.productName}</td>
                    <td className="px-6 py-4 text-muted-foreground">{purchase.supplierName || '-'}</td>
                    <td className="px-6 py-4 text-right font-mono">{purchase.quantity}</td>
                    <td className="px-6 py-4 text-right font-mono">₹{purchase.unitPrice}</td>
                    <td className="px-6 py-4 text-right font-mono text-primary">₹{purchase.totalAmount}</td>
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
            <DialogTitle>Record Purchase</DialogTitle>
          </DialogHeader>
          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4 pt-4">
              <FormField
                control={form.control}
                name="productId"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Product*</FormLabel>
                    <Select value={field.value ? field.value.toString() : ""} onValueChange={(val) => field.onChange(parseInt(val))}>
                      <FormControl>
                        <SelectTrigger className="bg-black/20 border-white/10">
                          <SelectValue placeholder="Select product" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent className="bg-card border-white/10">
                        {products?.map(p => (
                          <SelectItem key={p.id} value={p.id.toString()}>{p.name}</SelectItem>
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
                    <Select value={field.value ? field.value.toString() : ""} onValueChange={(val) => field.onChange(parseInt(val))}>
                      <FormControl>
                        <SelectTrigger className="bg-black/20 border-white/10">
                          <SelectValue placeholder="Select supplier (optional)" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent className="bg-card border-white/10">
                        {suppliers?.map(s => (
                          <SelectItem key={s.id} value={s.id.toString()}>{s.name}</SelectItem>
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
                      <FormLabel>Cost Price (₹)*</FormLabel>
                      <FormControl><Input type="number" step="0.01" className="bg-black/20 border-white/10" {...field} /></FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>
              <div className="pt-4 flex justify-end gap-3">
                <Button type="button" variant="outline" onClick={() => setIsFormOpen(false)} className="bg-transparent border-white/10 hover:bg-white/5">Cancel</Button>
                <Button type="submit" disabled={createMutation.isPending} className="bg-primary text-white">
                  {createMutation.isPending ? "Saving..." : "Record Purchase"}
                </Button>
              </div>
            </form>
          </Form>
        </DialogContent>
      </Dialog>
    </div>
  );
}

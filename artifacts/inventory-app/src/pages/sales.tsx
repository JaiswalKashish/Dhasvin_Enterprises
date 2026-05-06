import * as React from "react";
import { Layout } from "@/components/layout";
import { useGetSales, useCreateSale, useGetProducts } from "@workspace/api-client-react";
import { formatCurrency } from "@/lib/utils";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Modal } from "@/components/ui/modal";
import { Plus } from "lucide-react";
import { useForm } from "react-hook-form";
import { useQueryClient } from "@tanstack/react-query";
import { useToast } from "@/hooks/use-toast";
import { format } from "date-fns";

export default function Sales() {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [isModalOpen, setIsModalOpen] = React.useState(false);

  const { data, isLoading } = useGetSales({ limit: 50 });
  const { data: products } = useGetProducts({ limit: 1000 });

  const { mutate: createSale, isPending } = useCreateSale({
    mutation: {
      onSuccess: () => {
        queryClient.invalidateQueries({ queryKey: ["/api/sales"] });
        queryClient.invalidateQueries({ queryKey: ["/api/products"] });
        setIsModalOpen(false);
        toast({ title: "Success", description: "Sale recorded successfully" });
      },
      onError: (err: any) => {
        toast({ title: "Error", description: err.message || "Failed to record sale", variant: "destructive" });
      }
    }
  });

  const { register, handleSubmit, reset } = useForm();

  const onSubmit = (data: any) => {
    createSale({ 
      data: {
        ...data,
        productId: Number(data.productId),
        quantitySold: Number(data.quantitySold),
        sellingPrice: Number(data.sellingPrice),
      }
    });
  };

  return (
    <Layout>
      <div className="space-y-6">
        <div className="flex justify-between items-end">
          <div>
            <h1 className="text-3xl font-display font-bold text-foreground">Sales</h1>
            <p className="text-muted-foreground mt-1">Record and view outbound sales.</p>
          </div>
          <Button variant="gradient" onClick={() => { reset(); setIsModalOpen(true); }}>
            <Plus className="w-4 h-4 mr-2" /> New Sale
          </Button>
        </div>

        {isLoading ? (
          <div className="animate-pulse space-y-4">
            {[1,2,3,4].map(i => <div key={i} className="h-16 bg-white rounded-xl"></div>)}
          </div>
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Date</TableHead>
                <TableHead>Invoice #</TableHead>
                <TableHead>Product</TableHead>
                <TableHead>Qty</TableHead>
                <TableHead>Price</TableHead>
                <TableHead>Total</TableHead>
                <TableHead>Method</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {data?.sales.map((s) => (
                <TableRow key={s.id}>
                  <TableCell>{s.date ? format(new Date(s.date), 'dd MMM yyyy HH:mm') : '-'}</TableCell>
                  <TableCell>{s.invoiceNumber || '-'}</TableCell>
                  <TableCell className="font-semibold">{s.productName}</TableCell>
                  <TableCell>{s.quantitySold}</TableCell>
                  <TableCell>{formatCurrency(s.sellingPrice)}</TableCell>
                  <TableCell className="font-bold text-primary">{formatCurrency(s.totalAmount)}</TableCell>
                  <TableCell>
                    <Badge variant="outline" className="uppercase text-[10px]">{s.paymentMethod}</Badge>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        )}

        <Modal isOpen={isModalOpen} onClose={() => setIsModalOpen(false)} title="Record New Sale">
          <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
            <div className="space-y-2">
              <label className="text-sm font-semibold">Product *</label>
              <select {...register("productId", { required: true })} className="w-full h-12 rounded-xl border-2 border-input bg-white px-4 py-2 text-sm focus-visible:outline-none focus-visible:border-primary">
                <option value="">Select Product...</option>
                {products?.products.map(p => (
                  <option key={p.id} value={p.id}>{p.name} (Stock: {p.quantity})</option>
                ))}
              </select>
            </div>
            
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <label className="text-sm font-semibold">Quantity *</label>
                <Input type="number" {...register("quantitySold", { required: true })} placeholder="1" />
              </div>
              <div className="space-y-2">
                <label className="text-sm font-semibold">Selling Price (per unit) *</label>
                <Input type="number" step="0.01" {...register("sellingPrice", { required: true })} placeholder="0.00" />
              </div>
            </div>

            <div className="space-y-2">
              <label className="text-sm font-semibold">Payment Method</label>
              <select {...register("paymentMethod")} className="w-full h-12 rounded-xl border-2 border-input bg-white px-4 py-2 text-sm focus-visible:outline-none focus-visible:border-primary">
                <option value="cash">Cash</option>
                <option value="card">Card</option>
                <option value="upi">UPI</option>
                <option value="credit">Credit</option>
              </select>
            </div>
            
            <div className="pt-4 flex justify-end gap-3 border-t">
              <Button type="button" variant="outline" onClick={() => setIsModalOpen(false)}>Cancel</Button>
              <Button type="submit" variant="gradient" isLoading={isPending}>Complete Sale</Button>
            </div>
          </form>
        </Modal>
      </div>
    </Layout>
  );
}

import * as React from "react";
import { Layout } from "@/components/layout";
import { useGetPurchases, useCreatePurchase, useGetProducts, useGetSuppliers } from "@workspace/api-client-react";
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

export default function Purchases() {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [isModalOpen, setIsModalOpen] = React.useState(false);

  const { data, isLoading } = useGetPurchases({ limit: 50 });
  const { data: products } = useGetProducts({ limit: 1000 });
  const { data: suppliers } = useGetSuppliers();

  const { mutate: createPurchase, isPending } = useCreatePurchase({
    mutation: {
      onSuccess: () => {
        queryClient.invalidateQueries({ queryKey: ["/api/purchases"] });
        setIsModalOpen(false);
        toast({ title: "Success", description: "Purchase recorded successfully" });
      }
    }
  });

  const { register, handleSubmit, reset } = useForm();

  const onSubmit = (data: any) => {
    createPurchase({ 
      data: {
        ...data,
        productId: Number(data.productId),
        supplierId: data.supplierId ? Number(data.supplierId) : undefined,
        quantityPurchased: Number(data.quantityPurchased),
        purchaseCost: Number(data.purchaseCost),
      }
    });
  };

  return (
    <Layout>
      <div className="space-y-6">
        <div className="flex justify-between items-end">
          <div>
            <h1 className="text-3xl font-display font-bold text-foreground">Purchases</h1>
            <p className="text-muted-foreground mt-1">Track incoming stock from suppliers.</p>
          </div>
          <Button variant="gradient" onClick={() => { reset(); setIsModalOpen(true); }}>
            <Plus className="w-4 h-4 mr-2" /> Record Purchase
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
                <TableHead>Bill #</TableHead>
                <TableHead>Supplier</TableHead>
                <TableHead>Product</TableHead>
                <TableHead>Qty</TableHead>
                <TableHead>Total Cost</TableHead>
                <TableHead>Status</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {data?.purchases.map((p) => (
                <TableRow key={p.id}>
                  <TableCell>{p.date ? format(new Date(p.date), 'dd MMM yyyy') : '-'}</TableCell>
                  <TableCell>{p.billNumber || '-'}</TableCell>
                  <TableCell>{p.supplierName || '-'}</TableCell>
                  <TableCell className="font-semibold">{p.productName}</TableCell>
                  <TableCell>{p.quantityPurchased}</TableCell>
                  <TableCell>{formatCurrency(p.totalCost)}</TableCell>
                  <TableCell>
                    <Badge variant={p.status === 'received' ? 'success' : p.status === 'pending' ? 'warning' : 'destructive'}>
                      {p.status}
                    </Badge>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        )}

        <Modal isOpen={isModalOpen} onClose={() => setIsModalOpen(false)} title="Record Purchase">
          <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
            <div className="space-y-2">
              <label className="text-sm font-semibold">Product *</label>
              <select {...register("productId", { required: true })} className="w-full h-12 rounded-xl border-2 border-input bg-white px-4 py-2 text-sm focus-visible:outline-none focus-visible:border-primary">
                <option value="">Select Product...</option>
                {products?.products.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
              </select>
            </div>
            <div className="space-y-2">
              <label className="text-sm font-semibold">Supplier</label>
              <select {...register("supplierId")} className="w-full h-12 rounded-xl border-2 border-input bg-white px-4 py-2 text-sm focus-visible:outline-none focus-visible:border-primary">
                <option value="">Select Supplier...</option>
                {suppliers?.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
              </select>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <label className="text-sm font-semibold">Quantity *</label>
                <Input type="number" {...register("quantityPurchased", { required: true })} placeholder="10" />
              </div>
              <div className="space-y-2">
                <label className="text-sm font-semibold">Total Cost *</label>
                <Input type="number" step="0.01" {...register("purchaseCost", { required: true })} placeholder="0.00" />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <label className="text-sm font-semibold">Bill Number</label>
                <Input {...register("billNumber")} placeholder="BILL-123" />
              </div>
              <div className="space-y-2">
                <label className="text-sm font-semibold">Status</label>
                <select {...register("status")} className="w-full h-12 rounded-xl border-2 border-input bg-white px-4 py-2 text-sm focus-visible:outline-none focus-visible:border-primary">
                  <option value="received">Received</option>
                  <option value="pending">Pending</option>
                  <option value="cancelled">Cancelled</option>
                </select>
              </div>
            </div>
            <div className="pt-4 flex justify-end gap-3 border-t">
              <Button type="button" variant="outline" onClick={() => setIsModalOpen(false)}>Cancel</Button>
              <Button type="submit" variant="gradient" isLoading={isPending}>Save Purchase</Button>
            </div>
          </form>
        </Modal>
      </div>
    </Layout>
  );
}

import { useState } from "react";
import { useGetCategories, useCreateCategory, useUpdateCategory, useDeleteCategory } from "@workspace/api-client-react";
import { Plus, Edit, Trash2, Tags } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import { toast } from "sonner";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { z } from "zod";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { useQueryClient } from "@tanstack/react-query";
import { motion } from "framer-motion";

const categorySchema = z.object({
  name: z.string().min(1, "Name is required"),
  description: z.string().optional(),
});

type CategoryFormValues = z.infer<typeof categorySchema>;

export default function Categories() {
  const queryClient = useQueryClient();
  const { data: categories, isLoading } = useGetCategories();
  const createMutation = useCreateCategory();
  const updateMutation = useUpdateCategory();
  const deleteMutation = useDeleteCategory();

  const [isFormOpen, setIsFormOpen] = useState(false);
  const [editingCategory, setEditingCategory] = useState<any>(null);

  const form = useForm<CategoryFormValues>({
    resolver: zodResolver(categorySchema),
    defaultValues: { name: "", description: "" }
  });

  const openCreateForm = () => {
    setEditingCategory(null);
    form.reset({ name: "", description: "" });
    setIsFormOpen(true);
  };

  const openEditForm = (category: any) => {
    setEditingCategory(category);
    form.reset({ name: category.name, description: category.description || "" });
    setIsFormOpen(true);
  };

  const handleDelete = (id: number) => {
    if (confirm("Are you sure you want to delete this category?")) {
      deleteMutation.mutate({ id }, {
        onSuccess: () => {
          toast.success("Category deleted");
          queryClient.invalidateQueries({ queryKey: ["/api/categories"] });
        },
        onError: () => toast.error("Failed to delete category")
      });
    }
  };

  const onSubmit = (data: CategoryFormValues) => {
    if (editingCategory) {
      updateMutation.mutate({ id: editingCategory.id, data }, {
        onSuccess: () => {
          toast.success("Category updated");
          setIsFormOpen(false);
          queryClient.invalidateQueries({ queryKey: ["/api/categories"] });
        },
        onError: () => toast.error("Failed to update category")
      });
    } else {
      createMutation.mutate({ data }, {
        onSuccess: () => {
          toast.success("Category created");
          setIsFormOpen(false);
          queryClient.invalidateQueries({ queryKey: ["/api/categories"] });
        },
        onError: () => toast.error("Failed to create category")
      });
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <h2 className="text-2xl font-bold text-white tracking-tight">Categories</h2>
        <Button onClick={openCreateForm} className="bg-primary text-white">
          <Plus size={16} className="mr-2" /> Add Category
        </Button>
      </div>

      {isLoading ? (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {[1,2,3].map(i => <Skeleton key={i} className="h-32 glass-panel rounded-xl" />)}
        </div>
      ) : categories?.length === 0 ? (
        <div className="glass-panel p-12 rounded-xl flex flex-col items-center justify-center text-center">
          <Tags className="h-16 w-16 text-muted-foreground mb-4 opacity-50" />
          <h3 className="text-xl font-bold text-white mb-2">No categories found</h3>
          <p className="text-muted-foreground">Create a category to organize your products.</p>
        </div>
      ) : (
        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {categories?.map(category => (
            <motion.div key={category.id} layout className="glass-panel p-5 rounded-xl border border-white/5 relative group">
              <div className="flex justify-between items-start mb-2">
                <h3 className="font-semibold text-white text-lg">{category.name}</h3>
                <div className="flex gap-2">
                  <button onClick={() => openEditForm(category)} className="text-muted-foreground hover:text-white transition-colors">
                    <Edit size={16} />
                  </button>
                  <button onClick={() => handleDelete(category.id)} className="text-muted-foreground hover:text-red-400 transition-colors">
                    <Trash2 size={16} />
                  </button>
                </div>
              </div>
              <p className="text-sm text-muted-foreground mb-4 min-h-[40px]">{category.description || 'No description'}</p>
              <div className="pt-4 border-t border-white/5 flex justify-between items-center">
                <span className="text-xs text-muted-foreground">Products</span>
                <span className="font-mono text-primary font-medium">{category.productCount || 0}</span>
              </div>
            </motion.div>
          ))}
        </motion.div>
      )}

      <Dialog open={isFormOpen} onOpenChange={setIsFormOpen}>
        <DialogContent className="bg-card border-white/10 text-white sm:max-w-[425px]">
          <DialogHeader>
            <DialogTitle>{editingCategory ? 'Edit Category' : 'Add New Category'}</DialogTitle>
          </DialogHeader>
          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4 pt-4">
              <FormField
                control={form.control}
                name="name"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Category Name*</FormLabel>
                    <FormControl><Input className="bg-black/20 border-white/10" {...field} /></FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="description"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Description</FormLabel>
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

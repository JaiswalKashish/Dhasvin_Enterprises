import * as React from "react";
import { Layout } from "@/components/layout";
import { useGetCategories, useCreateCategory, useUpdateCategory, useDeleteCategory } from "@workspace/api-client-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Modal } from "@/components/ui/modal";
import { Plus, Edit, Trash2, Tag, Package, Search, X } from "lucide-react";
import { useForm } from "react-hook-form";
import { useQueryClient } from "@tanstack/react-query";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/hooks/use-auth";
import { Redirect } from "wouter";
import { motion } from "framer-motion";

const CATEGORY_COLORS = [
  "from-blue-500 to-cyan-400",
  "from-indigo-500 to-purple-500",
  "from-emerald-400 to-teal-500",
  "from-rose-400 to-orange-500",
  "from-violet-500 to-fuchsia-500",
  "from-amber-400 to-yellow-500",
  "from-pink-400 to-rose-500",
  "from-teal-400 to-green-500",
  "from-sky-400 to-blue-500",
  "from-orange-400 to-amber-500",
];

export default function Categories() {
  const { user } = useAuth();
  if (user && user.role !== "admin") return <Redirect to="/dashboard" />;

  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [isModalOpen, setIsModalOpen] = React.useState(false);
  const [editingId, setEditingId] = React.useState<number | null>(null);
  const [search, setSearch] = React.useState("");

  const { data: categories, isLoading } = useGetCategories();

  const { mutate: createCat, isPending: isCreating } = useCreateCategory({
    mutation: {
      onSuccess: () => {
        queryClient.invalidateQueries({ queryKey: ["/api/categories"] });
        setIsModalOpen(false);
        toast({ title: "Category Created", description: "New category added successfully." });
      },
    },
  });

  const { mutate: updateCat, isPending: isUpdating } = useUpdateCategory({
    mutation: {
      onSuccess: () => {
        queryClient.invalidateQueries({ queryKey: ["/api/categories"] });
        setIsModalOpen(false);
        toast({ title: "Category Updated", description: "Category details saved." });
      },
    },
  });

  const { mutate: deleteCat } = useDeleteCategory({
    mutation: {
      onSuccess: () => {
        queryClient.invalidateQueries({ queryKey: ["/api/categories"] });
        toast({ title: "Deleted", description: "Category removed." });
      },
    },
  });

  const { register, handleSubmit, reset } = useForm();

  const openCreate = () => { reset(); setEditingId(null); setIsModalOpen(true); };
  const openEdit = (cat: any) => { reset(cat); setEditingId(cat.id); setIsModalOpen(true); };
  const onSubmit = (data: any) => {
    if (editingId) updateCat({ id: editingId, data });
    else createCat({ data });
  };

  const filtered = categories?.filter((c) =>
    !search || c.name.toLowerCase().includes(search.toLowerCase())
  ) || [];

  return (
    <Layout>
      <div className="space-y-6">
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
          <div>
            <h1 className="text-3xl font-display font-bold text-foreground">Categories</h1>
            <p className="text-muted-foreground mt-1">
              {categories?.length ? `${categories.length} categories · auto-created from imports` : "Organize your products into categories."}
            </p>
          </div>
          <Button variant="gradient" onClick={openCreate}>
            <Plus className="w-4 h-4 mr-2" /> Add Category
          </Button>
        </div>

        <div className="bg-white p-4 rounded-2xl shadow-sm border border-slate-100 flex gap-3 items-center">
          <div className="relative flex-1 max-w-sm">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
            <input
              placeholder="Search categories..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full pl-10 pr-4 h-11 rounded-xl border-2 border-slate-200 bg-slate-50 text-sm focus:outline-none focus:border-indigo-400 focus:bg-white transition-all"
            />
            {search && (
              <button onClick={() => setSearch("")} className="absolute right-3 top-1/2 -translate-y-1/2">
                <X className="w-4 h-4 text-slate-400 hover:text-slate-600" />
              </button>
            )}
          </div>
        </div>

        {isLoading ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
            {[1, 2, 3, 4, 5, 6, 8].map((i) => (
              <div key={i} className="animate-pulse bg-white rounded-2xl border border-slate-100 p-6 h-36" />
            ))}
          </div>
        ) : filtered.length === 0 ? (
          <div className="bg-white rounded-2xl border border-dashed border-slate-200 p-16 text-center">
            <Tag className="w-12 h-12 text-slate-300 mx-auto mb-4" />
            <p className="font-semibold text-slate-500">No categories found</p>
            <p className="text-sm text-slate-400 mt-1">Import an Excel file or add a category manually.</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
            {filtered.map((cat, i) => (
              <motion.div
                key={cat.id}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.2, delay: i * 0.03 }}
                className="bg-white rounded-2xl border border-slate-100 shadow-sm hover:shadow-md hover:border-indigo-200 transition-all group relative overflow-hidden"
              >
                <div className={`absolute top-0 left-0 right-0 h-1.5 bg-gradient-to-r ${CATEGORY_COLORS[i % CATEGORY_COLORS.length]}`} />
                <div className="p-5 pt-6">
                  <div className="flex items-start justify-between mb-4">
                    <div className={`w-11 h-11 rounded-xl bg-gradient-to-br ${CATEGORY_COLORS[i % CATEGORY_COLORS.length]} flex items-center justify-center shadow-sm flex-shrink-0`}>
                      <Tag className="w-5 h-5 text-white" />
                    </div>
                    <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                      <button
                        onClick={() => openEdit(cat)}
                        className="p-1.5 rounded-lg text-blue-600 hover:bg-blue-50 transition-colors"
                        title="Edit"
                      >
                        <Edit className="w-3.5 h-3.5" />
                      </button>
                      <button
                        onClick={() => { if (confirm(`Delete "${cat.name}"?`)) deleteCat({ id: cat.id }); }}
                        className="p-1.5 rounded-lg text-red-500 hover:bg-red-50 transition-colors"
                        title="Delete"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>
                  <h3 className="font-bold text-slate-800 text-base leading-tight mb-1">{cat.name}</h3>
                  {cat.description && (
                    <p className="text-xs text-slate-500 mb-3 line-clamp-2">{cat.description}</p>
                  )}
                  <div className="flex items-center gap-1.5 mt-3 pt-3 border-t border-slate-100">
                    <Package className="w-3.5 h-3.5 text-slate-400" />
                    <span className="text-sm font-semibold text-slate-600">{cat.productCount || 0}</span>
                    <span className="text-xs text-slate-400">products</span>
                  </div>
                </div>
              </motion.div>
            ))}
          </div>
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
                className="w-full rounded-xl border-2 border-input bg-white px-4 py-2.5 text-sm focus:outline-none focus:border-primary"
                rows={3}
                placeholder="Optional description..."
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

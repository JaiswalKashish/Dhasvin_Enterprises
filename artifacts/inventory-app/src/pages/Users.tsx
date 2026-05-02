import { useState } from "react";
import { useGetUsers, useCreateUser, useUpdateUser, useDeleteUser, useClearAllData } from "@workspace/api-client-react";
import { Plus, Edit, Trash2, ShieldAlert, Users as UsersIcon } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import { toast } from "sonner";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { z } from "zod";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useQueryClient } from "@tanstack/react-query";
import { Badge } from "@/components/ui/badge";

const userSchema = z.object({
  email: z.string().email("Invalid email"),
  name: z.string().min(1, "Name is required"),
  password: z.string().min(6, "Password must be at least 6 characters").optional().or(z.literal("")),
  role: z.enum(["admin", "staff", "user"])
});

type UserFormValues = z.infer<typeof userSchema>;

export default function Users() {
  const queryClient = useQueryClient();
  const { data: users, isLoading } = useGetUsers();
  const createMutation = useCreateUser();
  const updateMutation = useUpdateUser();
  const deleteMutation = useDeleteUser();
  const clearDataMutation = useClearAllData();

  const [isFormOpen, setIsFormOpen] = useState(false);
  const [editingUser, setEditingUser] = useState<any>(null);
  const [isClearDataOpen, setIsClearDataOpen] = useState(false);
  const [clearConfirmText, setClearConfirmText] = useState("");

  const form = useForm<UserFormValues>({
    resolver: zodResolver(userSchema),
    defaultValues: { email: "", name: "", password: "", role: "user" }
  });

  const openCreateForm = () => {
    setEditingUser(null);
    form.reset({ email: "", name: "", password: "", role: "user" });
    setIsFormOpen(true);
  };

  const openEditForm = (user: any) => {
    setEditingUser(user);
    form.reset({ email: user.email, name: user.name, password: "", role: user.role });
    setIsFormOpen(true);
  };

  const handleDelete = (id: number) => {
    if (confirm("Are you sure you want to delete this user?")) {
      deleteMutation.mutate({ id }, {
        onSuccess: () => {
          toast.success("User deleted");
          queryClient.invalidateQueries({ queryKey: ["/api/users"] });
        },
        onError: () => toast.error("Failed to delete user")
      });
    }
  };

  const handleClearData = () => {
    if (clearConfirmText !== "DELETE EVERYTHING") {
      toast.error("Please type 'DELETE EVERYTHING' to confirm");
      return;
    }
    
    clearDataMutation.mutate(undefined, {
      onSuccess: () => {
        toast.success("All data cleared successfully");
        setIsClearDataOpen(false);
        queryClient.clear(); // Clear all cache
        window.location.reload(); // Reload to refresh everything
      },
      onError: () => toast.error("Failed to clear data")
    });
  };

  const onSubmit = (data: UserFormValues) => {
    if (editingUser) {
      // Don't send empty password
      const updateData = { ...data };
      if (!updateData.password) delete updateData.password;
      
      updateMutation.mutate({ id: editingUser.id, data: updateData as any }, {
        onSuccess: () => {
          toast.success("User updated");
          setIsFormOpen(false);
          queryClient.invalidateQueries({ queryKey: ["/api/users"] });
        },
        onError: () => toast.error("Failed to update user")
      });
    } else {
      if (!data.password) {
        form.setError("password", { message: "Password is required for new users" });
        return;
      }
      createMutation.mutate({ data: data as any }, {
        onSuccess: () => {
          toast.success("User created");
          setIsFormOpen(false);
          queryClient.invalidateQueries({ queryKey: ["/api/users"] });
        },
        onError: () => toast.error("Failed to create user")
      });
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <h2 className="text-2xl font-bold text-white tracking-tight">User Management</h2>
        <div className="flex gap-2">
          <Button onClick={() => setIsClearDataOpen(true)} variant="outline" className="border-red-500/50 text-red-400 hover:bg-red-500/10">
            <ShieldAlert size={16} className="mr-2" /> Factory Reset
          </Button>
          <Button onClick={openCreateForm} className="bg-primary text-white">
            <Plus size={16} className="mr-2" /> Add User
          </Button>
        </div>
      </div>

      {isLoading ? (
        <div className="glass-panel p-6 rounded-xl">
          <Skeleton className="h-64 w-full" />
        </div>
      ) : (
        <div className="glass-panel rounded-xl border border-white/5 overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-sm text-left">
              <thead className="text-xs text-muted-foreground uppercase bg-white/5 border-b border-white/5">
                <tr>
                  <th className="px-6 py-4">Name</th>
                  <th className="px-6 py-4">Email</th>
                  <th className="px-6 py-4">Role</th>
                  <th className="px-6 py-4 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-white/5">
                {users?.map(u => (
                  <tr key={u.id} className="hover:bg-white/5 transition-colors">
                    <td className="px-6 py-4 font-medium text-white flex items-center gap-3">
                      <div className="w-8 h-8 rounded-full bg-primary/20 flex items-center justify-center text-primary font-bold">
                        {u.name.charAt(0).toUpperCase()}
                      </div>
                      {u.name}
                    </td>
                    <td className="px-6 py-4 text-muted-foreground">{u.email}</td>
                    <td className="px-6 py-4">
                      <Badge variant="outline" className={
                        u.role === 'admin' ? "bg-purple-500/10 text-purple-400 border-purple-500/30" : 
                        u.role === 'staff' ? "bg-blue-500/10 text-blue-400 border-blue-500/30" : 
                        "bg-white/5 text-muted-foreground border-white/10"
                      }>
                        {u.role.toUpperCase()}
                      </Badge>
                    </td>
                    <td className="px-6 py-4 text-right">
                      <div className="flex justify-end gap-2">
                        <Button size="icon" variant="ghost" onClick={() => openEditForm(u)} className="h-8 w-8 text-muted-foreground hover:text-white">
                          <Edit size={14} />
                        </Button>
                        <Button size="icon" variant="ghost" onClick={() => handleDelete(u.id)} className="h-8 w-8 text-red-400 hover:bg-red-500/10 hover:text-red-300">
                          <Trash2 size={14} />
                        </Button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* User Form */}
      <Dialog open={isFormOpen} onOpenChange={setIsFormOpen}>
        <DialogContent className="bg-card border-white/10 text-white sm:max-w-[400px]">
          <DialogHeader>
            <DialogTitle>{editingUser ? 'Edit User' : 'Add New User'}</DialogTitle>
          </DialogHeader>
          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4 pt-4">
              <FormField
                control={form.control}
                name="name"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Name*</FormLabel>
                    <FormControl><Input className="bg-black/20 border-white/10" {...field} /></FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="email"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Email*</FormLabel>
                    <FormControl><Input type="email" disabled={!!editingUser} className="bg-black/20 border-white/10 disabled:opacity-50" {...field} /></FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="password"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>{editingUser ? 'New Password (leave blank to keep current)' : 'Password*'}</FormLabel>
                    <FormControl><Input type="password" placeholder="••••••••" className="bg-black/20 border-white/10" {...field} /></FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="role"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Role*</FormLabel>
                    <Select value={field.value} onValueChange={field.onChange}>
                      <FormControl>
                        <SelectTrigger className="bg-black/20 border-white/10">
                          <SelectValue placeholder="Select role" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent className="bg-card border-white/10">
                        <SelectItem value="admin">Admin</SelectItem>
                        <SelectItem value="staff">Staff</SelectItem>
                        <SelectItem value="user">User</SelectItem>
                      </SelectContent>
                    </Select>
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

      {/* Clear Data Dialog */}
      <Dialog open={isClearDataOpen} onOpenChange={setIsClearDataOpen}>
        <DialogContent className="bg-card border-red-500/30 text-white sm:max-w-[400px]">
          <DialogHeader>
            <DialogTitle className="text-red-500 flex items-center gap-2">
              <ShieldAlert size={20} /> DANGER ZONE
            </DialogTitle>
            <DialogDescription className="text-muted-foreground pt-2">
              This will completely wipe all data from the system: products, sales, purchases, categories, suppliers, and bills. Only your user account will remain.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 pt-4">
            <div>
              <p className="text-sm font-medium mb-2 text-white">Type <span className="font-mono text-red-400 font-bold bg-red-500/10 px-1 rounded">DELETE EVERYTHING</span> to confirm:</p>
              <Input 
                value={clearConfirmText} 
                onChange={(e) => setClearConfirmText(e.target.value)} 
                className="bg-black/20 border-white/10 focus-visible:ring-red-500" 
                placeholder="DELETE EVERYTHING"
              />
            </div>
            <div className="flex justify-end gap-3 pt-2">
              <Button variant="outline" onClick={() => {setIsClearDataOpen(false); setClearConfirmText("");}} className="bg-transparent border-white/10 hover:bg-white/5">Cancel</Button>
              <Button 
                onClick={handleClearData} 
                disabled={clearConfirmText !== "DELETE EVERYTHING" || clearDataMutation.isPending} 
                className="bg-red-600 text-white hover:bg-red-700"
              >
                {clearDataMutation.isPending ? "Clearing..." : "Yes, wipe everything"}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}

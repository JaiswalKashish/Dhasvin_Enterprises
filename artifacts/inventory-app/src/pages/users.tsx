import * as React from "react";
import { Layout } from "@/components/layout";
import { useGetUsers, useCreateUser, useUpdateUser, useDeleteUser } from "@workspace/api-client-react";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Modal } from "@/components/ui/modal";
import { Plus, Edit, Trash2 } from "lucide-react";
import { useForm } from "react-hook-form";
import { useQueryClient } from "@tanstack/react-query";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/hooks/use-auth";
import { Redirect } from "wouter";

export default function Users() {
  const { user } = useAuth();
  if (user && user.role !== "admin") return <Redirect to="/" />;

  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [isModalOpen, setIsModalOpen] = React.useState(false);
  const [editingId, setEditingId] = React.useState<number | null>(null);

  const { data: users, isLoading } = useGetUsers();

  const { mutate: createUser, isPending: isCreating } = useCreateUser({
    mutation: {
      onSuccess: () => {
        queryClient.invalidateQueries({ queryKey: ["/api/users"] });
        setIsModalOpen(false);
        toast({ title: "Success", description: "User added" });
      }
    }
  });

  const { mutate: updateUser, isPending: isUpdating } = useUpdateUser({
    mutation: {
      onSuccess: () => {
        queryClient.invalidateQueries({ queryKey: ["/api/users"] });
        setIsModalOpen(false);
        toast({ title: "Success", description: "User updated" });
      }
    }
  });

  const { mutate: deleteUser } = useDeleteUser({
    mutation: {
      onSuccess: () => {
        queryClient.invalidateQueries({ queryKey: ["/api/users"] });
        toast({ title: "Success", description: "User deleted" });
      }
    }
  });

  const { register, handleSubmit, reset } = useForm();

  const openCreate = () => {
    reset();
    setEditingId(null);
    setIsModalOpen(true);
  };

  const openEdit = (u: any) => {
    reset(u);
    setEditingId(u.id);
    setIsModalOpen(true);
  };

  const onSubmit = (data: any) => {
    if (editingId) updateUser({ id: editingId, data });
    else createUser({ data });
  };

  return (
    <Layout>
      <div className="space-y-6">
        <div className="flex justify-between items-end">
          <div>
            <h1 className="text-3xl font-display font-bold text-foreground">System Users</h1>
            <p className="text-muted-foreground mt-1">Manage staff access and permissions.</p>
          </div>
          <Button variant="gradient" onClick={openCreate}>
            <Plus className="w-4 h-4 mr-2" /> Add User
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
                <TableHead>Email</TableHead>
                <TableHead>Role</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {users?.map((u) => (
                <TableRow key={u.id}>
                  <TableCell className="font-bold">{u.name}</TableCell>
                  <TableCell>{u.email}</TableCell>
                  <TableCell>
                    <Badge variant={u.role === 'admin' ? 'default' : u.role === 'staff' ? 'secondary' : 'outline'} className="uppercase">
                      {u.role}
                    </Badge>
                  </TableCell>
                  <TableCell className="text-right">
                    <button onClick={() => openEdit(u)} className="p-2 text-blue-600 hover:bg-blue-50 rounded-lg transition-colors mr-2">
                      <Edit className="w-4 h-4" />
                    </button>
                    {u.id !== user?.id && (
                      <button onClick={() => {
                        if (confirm("Delete user?")) deleteUser({ id: u.id });
                      }} className="p-2 text-red-600 hover:bg-red-50 rounded-lg transition-colors">
                        <Trash2 className="w-4 h-4" />
                      </button>
                    )}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        )}

        <Modal isOpen={isModalOpen} onClose={() => setIsModalOpen(false)} title={editingId ? "Edit User" : "Add User"}>
          <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
            <div className="space-y-2">
              <label className="text-sm font-semibold">Name *</label>
              <Input {...register("name", { required: true })} placeholder="Jane Doe" />
            </div>
            <div className="space-y-2">
              <label className="text-sm font-semibold">Email *</label>
              <Input type="email" {...register("email", { required: true })} placeholder="jane@example.com" />
            </div>
            {!editingId && (
              <div className="space-y-2">
                <label className="text-sm font-semibold">Password *</label>
                <Input type="password" {...register("password", { required: true })} placeholder="Min 6 characters" />
              </div>
            )}
            <div className="space-y-2">
              <label className="text-sm font-semibold">Role *</label>
              <select {...register("role", { required: true })} className="w-full h-12 rounded-xl border-2 border-input bg-white px-4 py-2 text-sm focus-visible:outline-none focus-visible:border-primary">
                <option value="user">User (View Only)</option>
                <option value="staff">Staff (Operational)</option>
                <option value="admin">Admin (Full Access)</option>
              </select>
            </div>
            <div className="pt-4 flex justify-end gap-3 border-t">
              <Button type="button" variant="outline" onClick={() => setIsModalOpen(false)}>Cancel</Button>
              <Button type="submit" variant="gradient" isLoading={isCreating || isUpdating}>Save User</Button>
            </div>
          </form>
        </Modal>
      </div>
    </Layout>
  );
}

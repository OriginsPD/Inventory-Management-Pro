import { useState, useEffect } from 'react';
import { apiClient } from '../../lib/api-client';
import { useFeedback } from '../ui/feedback-provider';
import { Skeleton } from '../ui/skeleton';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '../ui/dialog';
import { useForm, Controller } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "../ui/select";
import {
  Table,
  TableHeader,
  TableBody,
  TableRow,
  TableHead,
  TableCell,
} from "../ui/table";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "../ui/dropdown-menu";
import { Input } from '../ui/input';

const userFormSchema = z.object({
  name: z.string().min(1, 'Name is required').max(50),
  email: z.string().email('Invalid email address'),
  password: z.string().optional().or(z.literal('')),
  role: z.enum(['SUPER_USER', 'TECHNICIAN', 'REVIEWER']),
});

type UserFormValues = z.infer<typeof userFormSchema>;

interface User {
  id: string;
  name: string;
  email: string;
  role: 'SUPER_USER' | 'TECHNICIAN' | 'REVIEWER';
  createdAt?: string;
  updatedAt?: string;
}

export const UserManagementScreen = () => {
  const { toast, confirm } = useFeedback();
  const [users, setUsers] = useState<User[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingUser, setEditingUser] = useState<User | null>(null);

  // Pagination State
  const [currentPage, setCurrentPage] = useState(1);
  const pageSize = 10;

  // Search Filter
  const [search, setSearch] = useState('');

  const { register, handleSubmit, control, formState: { errors }, reset } = useForm<UserFormValues>({
    resolver: zodResolver(userFormSchema),
    defaultValues: {
      name: '',
      email: '',
      password: '',
      role: 'REVIEWER',
    }
  });

  const fetchUsers = async (showLoading = false) => {
    if (showLoading) {
      setIsLoading(true);
    }
    try {
      const data = await apiClient.get<User[]>('/api/users');
      setUsers(data);
    } catch (e) {
      console.error(e);
      toast.error('Failed to load system users.');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    const timer = setTimeout(() => {
      fetchUsers(false);
    }, 0);
    return () => clearTimeout(timer);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const handleOpenCreateModal = () => {
    setEditingUser(null);
    reset({
      name: '',
      email: '',
      password: '',
      role: 'REVIEWER',
    });
    setIsModalOpen(true);
  };

  const handleOpenEditModal = (user: User) => {
    setEditingUser(user);
    reset({
      name: user.name,
      email: user.email,
      password: '', // Not used for edit
      role: user.role,
    });
    setIsModalOpen(true);
  };

  const onSubmit = async (values: UserFormValues) => {
    try {
      if (editingUser) {
        await apiClient.put(`/api/users/${editingUser.id}`, {
          name: values.name,
          email: values.email,
          role: values.role,
        });
        toast.success('User updated successfully');
      } else {
        if (!values.password || values.password.length < 6) {
          toast.error('Password is required and must be at least 6 characters');
          return;
        }
        await apiClient.post('/api/users', {
          name: values.name,
          email: values.email,
          password: values.password,
          role: values.role,
        });
        toast.success('User created successfully');
      }
      setIsModalOpen(false);
      fetchUsers(true);
    } catch (e: unknown) {
      console.error(e);
      toast.error((e as Error).message || 'Operation failed');
    }
  };

  const handleDelete = async (userToDelete: User) => {
    const isConfirmed = await confirm({
      title: 'Delete User Account?',
      message: `Are you sure you want to delete ${userToDelete.name}? This will terminate their access credentials permanently.`
    });
    if (!isConfirmed) return;

    try {
      await apiClient.delete(`/api/users/${userToDelete.id}`);
      toast.success('User deleted successfully');
      fetchUsers(true);
    } catch (e: unknown) {
      console.error(e);
      toast.error((e as Error).message || 'Failed to delete user');
    }
  };

  // Filter users
  const filteredUsers = users.filter(u =>
    u.name.toLowerCase().includes(search.toLowerCase()) ||
    u.email.toLowerCase().includes(search.toLowerCase()) ||
    u.role.toLowerCase().includes(search.toLowerCase())
  );

  const totalPages = Math.ceil(filteredUsers.length / pageSize);
  const startIndex = (currentPage - 1) * pageSize;
  const paginatedUsers = filteredUsers.slice(startIndex, startIndex + pageSize);

  const getRoleBadgeClass = (role: string) => {
    switch (role) {
      case 'SUPER_USER':
        return 'border-orange-500/30 bg-orange-500/10 text-orange-400';
      case 'TECHNICIAN':
        return 'border-blue-500/30 bg-blue-500/10 text-blue-400';
      default:
        return 'border-emerald-500/30 bg-emerald-500/10 text-emerald-400';
    }
  };

  return (
    <div className="flex flex-col gap-6 max-w-5xl mx-auto w-full animate-in fade-in duration-300">
      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-2xl font-extrabold tracking-tight text-foreground">User Management</h2>
          <p className="text-sm text-muted-foreground mt-1">Configure operator profiles, authentication credentials, and system roles.</p>
        </div>
        <button
          onClick={handleOpenCreateModal}
          className="inline-flex items-center justify-center whitespace-nowrap rounded-lg text-xs font-bold transition-all bg-primary text-primary-foreground shadow hover:brightness-110 h-9 px-4 gap-1.5 cursor-pointer animate-in fade-in"
        >
          <span className="material-symbols-outlined text-sm">add</span> New User Profile
        </button>
      </div>

      {/* Toolbar / Filters */}
      <div className="flex flex-col md:flex-row items-stretch md:items-center justify-between gap-4 border border-primary/10 p-2 rounded-xl bg-card/60">
        <div className="flex items-center gap-2 flex-1 px-2">
          <span className="material-symbols-outlined text-sm text-muted-foreground shrink-0">search</span>
          <input
            placeholder="Filter users registry by name or email..."
            value={search}
            onChange={(e) => {
              setSearch(e.target.value);
              setCurrentPage(1);
            }}
            className="flex h-9 w-full bg-transparent px-2 py-1 text-sm focus-visible:outline-none placeholder:text-muted-foreground/30 text-foreground border-0"
          />
        </div>
      </div>

      {/* Users Table */}
      <div className="glass-panel rounded-xl overflow-visible">
        <div className="w-full overflow-visible">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="px-4">Operator Name</TableHead>
                <TableHead className="px-4">Email Address</TableHead>
                <TableHead className="px-4">System Role</TableHead>
                <TableHead className="px-4">Created Date</TableHead>
                <TableHead className="px-4 text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {isLoading ? (
                Array.from({ length: 4 }).map((_, index) => (
                  <TableRow key={index} className="animate-pulse">
                    <TableCell className="p-4 align-middle"><Skeleton className="h-4 w-36" /></TableCell>
                    <TableCell className="p-4 align-middle"><Skeleton className="h-4 w-44" /></TableCell>
                    <TableCell className="p-4 align-middle"><Skeleton className="h-5 w-20 rounded" /></TableCell>
                    <TableCell className="p-4 align-middle"><Skeleton className="h-4 w-28" /></TableCell>
                    <TableCell className="p-4 align-middle text-right"><Skeleton className="h-4 w-4 ml-auto" /></TableCell>
                  </TableRow>
                ))
              ) : paginatedUsers.length > 0 ? (
                paginatedUsers.map((user) => (
                  <TableRow key={user.id} className="group hover:bg-primary/5 transition-colors">
                    <TableCell className="p-4 align-middle font-semibold text-foreground">
                      {user.name}
                    </TableCell>
                    <TableCell className="p-4 align-middle font-mono text-muted-foreground text-xs">
                      {user.email}
                    </TableCell>
                    <TableCell className="p-4 align-middle">
                      <span className={`inline-flex items-center rounded-md border px-2.5 py-0.5 text-xs font-bold font-mono tracking-wider ${getRoleBadgeClass(user.role)}`}>
                        {user.role.replace('_', ' ')}
                      </span>
                    </TableCell>
                    <TableCell className="p-4 align-middle text-xs text-muted-foreground">
                      {user.createdAt ? new Date(user.createdAt).toLocaleDateString() : '-'}
                    </TableCell>
                    <TableCell className="p-4 align-middle text-right">
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <button
                            className="text-muted-foreground hover:text-foreground p-1 hover:bg-primary/5 rounded-lg transition-colors cursor-pointer"
                          >
                            <span className="material-symbols-outlined text-[18px]">more_horiz</span>
                          </button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end" className="w-32 bg-card/95 backdrop-blur-2xl border border-primary/15 text-foreground rounded-xl p-1 shadow-xl">
                          <DropdownMenuItem
                            onClick={() => handleOpenEditModal(user)}
                            className="text-xs font-semibold cursor-pointer flex items-center px-2.5 py-2 hover:bg-primary/5 focus:bg-primary/5 rounded-lg transition-colors"
                          >
                            <span className="material-symbols-outlined text-sm mr-2 text-muted-foreground">edit</span> Edit
                          </DropdownMenuItem>
                          <DropdownMenuSeparator className="bg-primary/10 my-1" />
                          <DropdownMenuItem
                            onClick={() => handleDelete(user)}
                            className="text-xs font-semibold text-red-400 focus:text-red-400 cursor-pointer flex items-center px-2.5 py-2 hover:bg-red-500/5 focus:bg-red-500/5 rounded-lg transition-colors"
                          >
                            <span className="material-symbols-outlined text-sm mr-2 text-red-400">delete</span> Delete
                          </DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </TableCell>
                  </TableRow>
                ))
              ) : (
                <TableRow>
                  <TableCell colSpan={5} className="text-center p-8 text-sm text-muted-foreground">
                    No operators registered matching the search filters.
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </div>
      </div>

      {/* Pagination Controls */}
      {totalPages > 1 && (
        <div className="flex justify-between items-center text-xs text-muted-foreground mt-2">
          <div>
            Showing {startIndex + 1} to {Math.min(startIndex + pageSize, filteredUsers.length)} of {filteredUsers.length} users
          </div>
          <div className="flex items-center gap-1.5">
            <button
              onClick={() => setCurrentPage(prev => Math.max(prev - 1, 1))}
              disabled={currentPage === 1}
              className="px-2.5 py-1.5 bg-card/60 border border-primary/10 rounded-lg hover:bg-primary/5 disabled:opacity-50 disabled:pointer-events-none transition-all cursor-pointer font-bold"
            >
              Previous
            </button>
            <span className="font-semibold text-foreground">Page {currentPage} of {totalPages}</span>
            <button
              onClick={() => setCurrentPage(prev => Math.min(prev + 1, totalPages))}
              disabled={currentPage === totalPages}
              className="px-2.5 py-1.5 bg-card/60 border border-primary/10 rounded-lg hover:bg-primary/5 disabled:opacity-50 disabled:pointer-events-none transition-all cursor-pointer font-bold"
            >
              Next
            </button>
          </div>
        </div>
      )}

      {/* Creation / Editing Modal */}
      <Dialog open={isModalOpen} onOpenChange={setIsModalOpen}>
        <DialogContent className="glass-panel-elevated p-6 rounded-2xl max-w-md w-full space-y-4 border-0 animate-in fade-in zoom-in-95 duration-150" showCloseButton={true}>
          <DialogHeader className="text-left space-y-0.5">
            <DialogTitle className="text-lg font-extrabold tracking-tight text-foreground p-0">
              {editingUser ? 'Edit User Profile' : 'New User Profile'}
            </DialogTitle>
            <DialogDescription className="text-xs text-muted-foreground">
              {editingUser ? 'Update the details and system role of this user account.' : 'Create a new user account and assign their role-based permissions.'}
            </DialogDescription>
          </DialogHeader>

          <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
            <div className="space-y-1.5">
              <label className="text-[11px] font-bold text-muted-foreground uppercase tracking-wider block">Full Name</label>
              <Input
                type="text"
                placeholder="Jane Doe"
                className={`bg-background/50 border-primary/10 text-xs h-10 rounded-xl text-foreground placeholder:text-muted-foreground/30 ${
                  errors.name ? 'border-red-500/50' : ''
                }`}
                {...register('name')}
              />
              {errors.name && <p className="text-[10px] text-red-400 font-semibold mt-0.5">{errors.name.message}</p>}
            </div>

            <div className="space-y-1.5">
              <label className="text-[11px] font-bold text-muted-foreground uppercase tracking-wider block">Email Address</label>
              <Input
                type="email"
                placeholder="jane@imspro.com"
                className={`bg-background/50 border-primary/10 text-xs h-10 rounded-xl text-foreground placeholder:text-muted-foreground/30 ${
                  errors.email ? 'border-red-500/50' : ''
                }`}
                {...register('email')}
              />
              {errors.email && <p className="text-[10px] text-red-400 font-semibold mt-0.5">{errors.email.message}</p>}
            </div>

            {!editingUser && (
              <div className="space-y-1.5">
                <label className="text-[11px] font-bold text-muted-foreground uppercase tracking-wider block">Access Password</label>
                <Input
                  type="password"
                  placeholder="••••••••"
                  className={`bg-background/50 border-primary/10 text-xs h-10 rounded-xl text-foreground placeholder:text-muted-foreground/30 ${
                    errors.password ? 'border-red-500/50' : ''
                  }`}
                  {...register('password')}
                />
                {errors.password && <p className="text-[10px] text-red-400 font-semibold mt-0.5">{errors.password.message}</p>}
              </div>
            )}

            <div className="space-y-1.5">
              <label className="text-[11px] font-bold text-muted-foreground uppercase tracking-wider block">System Access Role</label>
              <Controller
                control={control}
                name="role"
                render={({ field }) => (
                  <Select onValueChange={field.onChange} value={field.value}>
                    <SelectTrigger className="w-full text-xs h-10 bg-background/50 border border-primary/10 rounded-xl text-foreground focus:ring-primary/20">
                      <SelectValue placeholder="Select system role..." />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="SUPER_USER">Super User (Admin)</SelectItem>
                      <SelectItem value="TECHNICIAN">Technician</SelectItem>
                      <SelectItem value="REVIEWER">Reviewer (Read-Only)</SelectItem>
                    </SelectContent>
                  </Select>
                )}
              />
              {errors.role && <p className="text-[10px] text-red-400 font-semibold mt-0.5">{errors.role.message}</p>}
            </div>

            <button
              type="submit"
              className="w-full bg-primary hover:bg-primary/90 text-primary-foreground font-bold rounded-xl h-10 text-xs cursor-pointer shadow-lg mt-2"
            >
              {editingUser ? 'Save Updates' : 'Create User Account'}
            </button>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
};


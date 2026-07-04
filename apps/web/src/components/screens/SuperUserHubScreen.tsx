import { useState, useEffect, useMemo } from 'react';
import { useSearchParams } from "@/lib/hooks/useSearchParams";
import { useFeedback } from '@/components/ui/feedback-provider';
import { useAuth } from '@/components/ui/auth-context';
import { useForm, Controller } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { apiClient } from '@/lib/api-client';
import { Skeleton } from '@ims_pro/ui/components/skeleton';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@ims_pro/ui/components/dialog';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@ims_pro/ui/components/select";
import {
  Table,
  TableHeader,
  TableBody,
  TableRow,
  TableHead,
  TableCell,
} from "@ims_pro/ui/components/table";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@ims_pro/ui/components/dropdown-menu";
import { Input } from '@ims_pro/ui/components/input';

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

interface AuditLog {
  id: string;
  actionType: string;
  details: string;
  deviceId?: string | null;
  deviceIdentifier?: string | null;
  customerId?: string | null;
  userId?: string | null;
  createdAt: string;
}

export const SuperUserHubScreen = () => {
  const { toast, confirm } = useFeedback();
  const { user, isLoading: isAuthLoading } = useAuth();
  const [searchParams, setSearchParams] = useSearchParams();

  const initialTab = searchParams.get('tab') || 'users';
  const [activeTab, setActiveTab] = useState<'users' | 'links' | 'system' | 'audit'>(
    (initialTab === 'users' || initialTab === 'links' || initialTab === 'system' || initialTab === 'audit') ? (initialTab as any) : 'users'
  );

  useEffect(() => {
    const tab = searchParams.get('tab');
    if (tab && (tab === 'users' || tab === 'links' || tab === 'system' || tab === 'audit')) {
      setActiveTab(tab as any);
    }
  }, [searchParams]);

  const handleTabChange = (tab: 'users' | 'links' | 'system' | 'audit') => {
    setActiveTab(tab);
    searchParams.set('tab', tab);
    setSearchParams(searchParams);
  };

  // User Registry States
  const [users, setUsers] = useState<User[]>([]);
  const [isUsersLoading, setIsUsersLoading] = useState(true);
  const [isUserModalOpen, setIsUserModalOpen] = useState(false);
  const [editingUser, setEditingUser] = useState<User | null>(null);
  const [userSearch, setUserSearch] = useState('');
  const [userCurrentPage, setUserCurrentPage] = useState(1);
  const userPageSize = 10;

  const { register: registerUser, handleSubmit: handleSubmitUser, control: controlUser, formState: { errors: userErrors }, reset: resetUser } = useForm<UserFormValues>({
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
      setIsUsersLoading(true);
    }
    try {
      const data = await apiClient.get<User[]>('/api/users/admin');
      setUsers(data);
    } catch (e) {
      console.error(e);
      toast.error('Failed to load system users.');
    } finally {
      setIsUsersLoading(false);
    }
  };

  useEffect(() => {
    if (user?.role === 'SUPER_USER') {
      fetchUsers(true);
    }
  }, [user]);

  const handleOpenCreateModal = () => {
    setEditingUser(null);
    resetUser({
      name: '',
      email: '',
      password: '',
      role: 'REVIEWER',
    });
    setIsUserModalOpen(true);
  };

  const handleOpenEditModal = (u: User) => {
    setEditingUser(u);
    resetUser({
      name: u.name,
      email: u.email,
      password: '',
      role: u.role,
    });
    setIsUserModalOpen(true);
  };

  const onSubmitUser = async (values: UserFormValues) => {
    try {
      if (editingUser) {
        await apiClient.put(`/api/users/admin/${editingUser.id}`, {
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
        await apiClient.post('/api/users/admin', {
          name: values.name,
          email: values.email,
          password: values.password,
          role: values.role,
        });
        toast.success('User created successfully');
      }
      setIsUserModalOpen(false);
      fetchUsers(true);
    } catch (e: unknown) {
      console.error(e);
      toast.error((e as Error).message || 'Operation failed');
    }
  };

  const handleDeleteUser = async (userToDelete: User) => {
    const isConfirmed = await confirm({
      title: 'Delete User Account?',
      message: `Are you sure you want to delete ${userToDelete.name}? This will terminate their access credentials permanently.`
    });
    if (!isConfirmed) return;

    try {
      await apiClient.delete(`/api/users/admin/${userToDelete.id}`);
      toast.success('User deleted successfully');
      fetchUsers(true);
    } catch (e: unknown) {
      console.error(e);
      toast.error((e as Error).message || 'Failed to delete user');
    }
  };

  const filteredUsers = useMemo(() => {
    return users.filter(u =>
      u.name.toLowerCase().includes(userSearch.toLowerCase()) ||
      u.email.toLowerCase().includes(userSearch.toLowerCase()) ||
      u.role.toLowerCase().includes(userSearch.toLowerCase())
    );
  }, [users, userSearch]);

  const userTotalPages = Math.ceil(filteredUsers.length / userPageSize);
  const userStartIndex = (userCurrentPage - 1) * userPageSize;
  const paginatedUsers = useMemo(() => {
    return filteredUsers.slice(userStartIndex, userStartIndex + userPageSize);
  }, [filteredUsers, userStartIndex, userPageSize]);

  // Link Templates CRUD States
  const initDefaultOptions = () => {
    const defaultOptions = ['SIM', 'SD_CARD', 'PANIC_BUTTON', 'KEYFOB'];
    localStorage.setItem('ims_polymorphic_link_options', JSON.stringify(defaultOptions));
    return defaultOptions;
  };

  const [polymorphicOptions, setPolymorphicOptions] = useState<string[]>(() => {
    const stored = localStorage.getItem('ims_polymorphic_link_options');
    if (stored) {
      try {
        return JSON.parse(stored);
      } catch {
        return initDefaultOptions();
      }
    }
    return initDefaultOptions();
  });
  const [newOption, setNewOption] = useState('');
  const [editingOptionIdx, setEditingOptionIdx] = useState<number | null>(null);
  const [editingOptionVal, setEditingOptionVal] = useState('');

  const handleAddOption = () => {
    const trimmed = newOption.trim().toUpperCase().replace(/\s+/g, '_');
    if (!trimmed) return;
    if (polymorphicOptions.includes(trimmed)) {
      toast.error('Option already exists.');
      return;
    }
    const updated = [...polymorphicOptions, trimmed];
    setPolymorphicOptions(updated);
    localStorage.setItem('ims_polymorphic_link_options', JSON.stringify(updated));
    setNewOption('');
    toast.success('Polymorphic link option added successfully');
  };

  const handleStartEdit = (idx: number, val: string) => {
    setEditingOptionIdx(idx);
    setEditingOptionVal(val);
  };

  const handleSaveEdit = (idx: number) => {
    const trimmed = editingOptionVal.trim().toUpperCase().replace(/\s+/g, '_');
    if (!trimmed) return;
    if (polymorphicOptions.includes(trimmed) && polymorphicOptions[idx] !== trimmed) {
      toast.error('Option already exists.');
      return;
    }
    const updated = [...polymorphicOptions];
    updated[idx] = trimmed;
    setPolymorphicOptions(updated);
    localStorage.setItem('ims_polymorphic_link_options', JSON.stringify(updated));
    setEditingOptionIdx(null);
    toast.success('Option updated successfully');
  };

  const handleDeleteOption = async (idx: number) => {
    const isConfirmed = await confirm({
      title: 'Delete Polymorphic Option?',
      message: 'Are you sure you want to delete this option? Device models currently referencing this allowed component type will retain it, but it will be removed from future templates configuration options.'
    });
    if (!isConfirmed) return;
    const updated = polymorphicOptions.filter((_, i) => i !== idx);
    setPolymorphicOptions(updated);
    localStorage.setItem('ims_polymorphic_link_options', JSON.stringify(updated));
    toast.success('Polymorphic link option deleted');
  };

  // Security Audit Logs States
  const [auditLogs, setAuditLogs] = useState<AuditLog[]>([]);
  const [isAuditLoading, setIsAuditLoading] = useState(true);
  const [auditSearch, setAuditSearch] = useState('');

  const fetchAuditLogs = async (showLoading = false) => {
    if (showLoading) {
      setIsAuditLoading(true);
    }
    try {
      const data = await apiClient.get<AuditLog[]>('/api/audit-logs');
      setAuditLogs(data || []);
    } catch (e) {
      console.error(e);
      toast.error('Failed to load system security audit logs.');
    } finally {
      setIsAuditLoading(false);
    }
  };

  useEffect(() => {
    if (user?.role === 'SUPER_USER' && activeTab === 'audit') {
      fetchAuditLogs(true);
    }
  }, [user, activeTab]);

  const filteredAuditLogs = useMemo(() => {
    return auditLogs.filter(log =>
      log.actionType.toLowerCase().includes(auditSearch.toLowerCase()) ||
      log.details.toLowerCase().includes(auditSearch.toLowerCase()) ||
      (log.deviceIdentifier && log.deviceIdentifier.toLowerCase().includes(auditSearch.toLowerCase())) ||
      (log.userId && log.userId.toLowerCase().includes(auditSearch.toLowerCase()))
    );
  }, [auditLogs, auditSearch]);

  if (isAuthLoading) {
    return (
      <div className="max-w-6xl mx-auto py-10 flex items-center justify-center">
        <div className="w-8 h-8 rounded-full border-2 border-primary/20 border-t-primary animate-spin" />
      </div>
    );
  }

  return (
    <>
      <div className="flex flex-col gap-6 max-w-6xl mx-auto w-full animate-in fade-in duration-300">
        <div>
          <h1 className="text-3xl font-black tracking-tight text-foreground uppercase italic flex items-center gap-2">
            Super User <span className="text-primary">Hub</span>
          </h1>
          <p className="text-[10px] font-mono text-muted-foreground uppercase tracking-widest mt-1">
            System administration workbench, templates control, operations audit registry
          </p>
        </div>

        {/* Horizontal Navigation Tab Bar */}
        <div className="flex border-b border-primary/10 select-none">
          {[
            { id: 'users', name: 'User Registry', icon: 'manage_accounts' },
            { id: 'links', name: 'Link Templates', icon: 'hub' },
            { id: 'system', name: 'System Diagnostics', icon: 'terminal' },
            { id: 'audit', name: 'Security Audit Logs', icon: 'security' },
          ].map((tab) => {
            const isActive = activeTab === tab.id;
            return (
              <button
                key={tab.id}
                onClick={() => handleTabChange(tab.id as any)}
                className={`px-5 py-3 text-[10px] font-bold uppercase tracking-wider cursor-pointer border-b-2 transition-all flex items-center gap-2 ${
                  isActive
                    ? 'border-primary text-primary bg-primary/5'
                    : 'border-transparent text-muted-foreground hover:text-foreground hover:bg-muted/30'
                }`}
              >
                <span className="material-symbols-outlined text-[16px]">{tab.icon}</span>
                <span>{tab.name}</span>
              </button>
            );
          })}
        </div>

        {/* Content Panels */}
        <div className="w-full mt-2">
          {activeTab === 'users' && (
            <div className="space-y-6">
              <div className="glass-panel p-6 space-y-5">
                <div className="flex justify-between items-center pb-2 border-b border-border/40">
                  <div>
                    <h3 className="font-black text-xs uppercase tracking-wider text-foreground">User Registry</h3>
                    <p className="text-[10px] font-mono text-muted-foreground uppercase tracking-widest mt-0.5">
                      Configure operator profiles, authentication credentials, and system roles.
                    </p>
                  </div>
                  <button
                    onClick={handleOpenCreateModal}
                    className="inline-flex items-center justify-center whitespace-nowrap rounded-lg text-xs font-bold transition-all bg-primary text-primary-foreground shadow hover:brightness-110 h-9 px-4 gap-1.5 cursor-pointer"
                  >
                    <span className="material-symbols-outlined text-sm">add</span> New Profile
                  </button>
                </div>

                {/* Search */}
                <div className="flex items-center gap-2 border border-primary/10 p-2 rounded-xl bg-card/60">
                  <div className="relative flex-1">
                    <span className="material-symbols-outlined text-sm text-muted-foreground absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none">search</span>
                    <input
                      placeholder="Filter users registry by name, email, or role..."
                      value={userSearch}
                      onChange={(e) => {
                        setUserSearch(e.target.value);
                        setUserCurrentPage(1);
                      }}
                      className="flex h-9 w-full bg-transparent pl-9 pr-3 py-1 text-xs focus-visible:outline-none placeholder:text-muted-foreground/30 text-foreground border-0"
                    />
                  </div>
                </div>

                {/* Table */}
                <div className="border border-border/80 rounded-xl bg-black/10 overflow-hidden">
                  <Table>
                    <TableHeader className="bg-card/45 border-b border-primary/10">
                      <TableRow>
                        <TableHead className="px-4 text-[10px] uppercase font-bold tracking-wider">Operator Name</TableHead>
                        <TableHead className="px-4 text-[10px] uppercase font-bold tracking-wider">Email Address</TableHead>
                        <TableHead className="px-4 text-[10px] uppercase font-bold tracking-wider">System Role</TableHead>
                        <TableHead className="px-4 text-[10px] uppercase font-bold tracking-wider text-right">Actions</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {isUsersLoading ? (
                        Array.from({ length: 3 }).map((_, index) => (
                          <TableRow key={index} className="animate-pulse">
                            <TableCell className="p-4"><Skeleton className="h-4 w-36" /></TableCell>
                            <TableCell className="p-4"><Skeleton className="h-4 w-44" /></TableCell>
                            <TableCell className="p-4"><Skeleton className="h-5 w-20 rounded" /></TableCell>
                            <TableCell className="p-4 text-right"><Skeleton className="h-4 w-4 ml-auto" /></TableCell>
                          </TableRow>
                        ))
                      ) : paginatedUsers.length > 0 ? (
                        paginatedUsers.map((u) => {
                          const getRoleBadgeClass = (r: string) => {
                            switch (r) {
                              case 'SUPER_USER':
                                return 'border-orange-500/30 bg-orange-500/10 text-orange-400';
                              case 'TECHNICIAN':
                                return 'border-blue-500/30 bg-blue-500/10 text-blue-400';
                              default:
                                return 'border-emerald-500/30 bg-emerald-500/10 text-emerald-400';
                            }
                          };
                          return (
                            <TableRow key={u.id} className="group hover:bg-primary/5 transition-colors">
                              <TableCell className="p-4 align-middle font-bold text-foreground truncate">
                                {u.name}
                              </TableCell>
                              <TableCell className="p-4 align-middle font-mono text-muted-foreground text-xs truncate">
                                {u.email}
                              </TableCell>
                              <TableCell className="p-4 align-middle">
                                <span className={`inline-flex items-center rounded-md border px-2.5 py-0.5 text-[10px] font-bold font-mono tracking-wider ${getRoleBadgeClass(u.role)}`}>
                                  {u.role.replace('_', ' ')}
                                </span>
                              </TableCell>
                              <TableCell className="p-4 align-middle text-right">
                                <DropdownMenu>
                                  <DropdownMenuTrigger asChild>
                                    <button className="text-muted-foreground hover:text-foreground p-1 hover:bg-primary/5 rounded-lg transition-colors cursor-pointer">
                                      <span className="material-symbols-outlined text-[18px]">more_horiz</span>
                                    </button>
                                  </DropdownMenuTrigger>
                                  <DropdownMenuContent align="end" className="w-32 bg-card/95 backdrop-blur-2xl border border-primary/15 text-foreground rounded-xl p-1 shadow-xl">
                                    <DropdownMenuItem onClick={() => handleOpenEditModal(u)} className="text-xs font-semibold cursor-pointer flex items-center px-2.5 py-2 hover:bg-primary/5 focus:bg-primary/5 rounded-lg transition-colors">
                                      <span className="material-symbols-outlined text-sm mr-2 text-muted-foreground">edit</span> Edit
                                    </DropdownMenuItem>
                                    <DropdownMenuSeparator className="bg-primary/10 my-1" />
                                    <DropdownMenuItem onClick={() => handleDeleteUser(u)} className="text-xs font-semibold text-red-400 focus:text-red-400 cursor-pointer flex items-center px-2.5 py-2 hover:bg-red-500/5 focus:bg-red-500/5 rounded-lg transition-colors">
                                      <span className="material-symbols-outlined text-sm mr-2 text-red-400">delete</span> Delete
                                    </DropdownMenuItem>
                                  </DropdownMenuContent>
                                </DropdownMenu>
                              </TableCell>
                            </TableRow>
                          );
                        })
                      ) : (
                        <TableRow>
                          <TableCell colSpan={4} className="text-center p-8 text-xs text-muted-foreground uppercase tracking-widest">
                            No operators registered matching search.
                          </TableCell>
                        </TableRow>
                      )}
                    </TableBody>
                  </Table>

                  {/* Pagination */}
                  {userTotalPages > 1 && (
                    <div className="flex justify-between items-center px-4 py-3 border-t border-primary/10 bg-transparent text-xs text-muted-foreground">
                      <div>
                        Showing {userStartIndex + 1} to {Math.min(userStartIndex + userPageSize, filteredUsers.length)} of {filteredUsers.length} users
                      </div>
                      <div className="flex items-center gap-1.5">
                        <button
                          onClick={() => setUserCurrentPage(prev => Math.max(prev - 1, 1))}
                          disabled={userCurrentPage === 1}
                          className="inline-flex items-center justify-center whitespace-nowrap rounded-lg text-xs font-bold transition-all border border-primary/10 bg-primary/5 hover:bg-primary/15 text-foreground disabled:opacity-30 disabled:pointer-events-none h-8 px-3 cursor-pointer"
                        >
                          Previous
                        </button>
                        <span className="font-semibold text-foreground">Page {userCurrentPage} of {userTotalPages}</span>
                        <button
                          onClick={() => setUserCurrentPage(prev => Math.min(prev + 1, userTotalPages))}
                          disabled={userCurrentPage === userTotalPages}
                          className="inline-flex items-center justify-center whitespace-nowrap rounded-lg text-xs font-bold transition-all border border-primary/10 bg-primary/5 hover:bg-primary/15 text-foreground disabled:opacity-30 disabled:pointer-events-none h-8 px-3 cursor-pointer"
                        >
                          Next
                        </button>
                      </div>
                    </div>
                  )}
                </div>
              </div>
            </div>
          )}

          {activeTab === 'links' && (
            <div className="glass-panel p-6 space-y-5">
              <div>
                <h3 className="font-black text-xs uppercase tracking-wider text-foreground">Polymorphic Relationship Rules</h3>
                <p className="text-[10px] font-mono text-muted-foreground uppercase tracking-widest mt-1">
                  Manage allowable sub-component types linking parent hardware nodes
                </p>
              </div>

              <div className="flex gap-2">
                <input
                  type="text"
                  placeholder="e.g. OBD_DONGLE"
                  value={newOption}
                  onChange={(e) => setNewOption(e.target.value)}
                  onKeyDown={(e) => { if (e.key === 'Enter') handleAddOption(); }}
                  className="flex h-10 flex-1 rounded-lg border border-border bg-background px-3 py-1.5 text-xs font-mono uppercase tracking-wider text-primary placeholder:text-muted-foreground/40 focus:ring-1 focus:ring-primary focus:outline-none"
                />
                <button
                  onClick={handleAddOption}
                  className="inline-flex items-center justify-center whitespace-nowrap rounded-lg text-[10px] font-black uppercase tracking-widest transition-all bg-primary text-primary-foreground shadow hover:bg-primary/95 h-10 px-5 gap-2"
                >
                  <span className="material-symbols-outlined text-sm font-black">add</span> Add Class
                </button>
              </div>

              <div className="border border-border/80 rounded-xl bg-black/10 overflow-hidden font-mono">
                <div className="bg-muted px-4 py-2 border-b border-border/80 flex items-center justify-between text-[9px] text-muted-foreground uppercase tracking-wider">
                  <span>Registered Template Types</span>
                  <span>System Action Registry</span>
                </div>
                <div className="divide-y divide-border/40">
                  {polymorphicOptions.length > 0 ? (
                    polymorphicOptions.map((opt, idx) => (
                      <div key={opt} className="flex items-center justify-between px-4 py-3 text-[11px] group hover:bg-card/40 transition-colors">
                        {editingOptionIdx === idx ? (
                          <div className="flex items-center gap-2 flex-1">
                            <input
                              type="text"
                              value={editingOptionVal}
                              onChange={(e) => setEditingOptionVal(e.target.value)}
                              onKeyDown={(e) => { if (e.key === 'Enter') handleSaveEdit(idx); }}
                              className="flex h-8 flex-1 rounded-md border border-primary/30 bg-background px-2.5 py-0.5 text-xs font-mono uppercase tracking-wider text-primary focus:outline-none focus:ring-1 focus:ring-primary"
                              autoFocus
                            />
                            <button
                              onClick={() => handleSaveEdit(idx)}
                              className="px-3 py-1 text-[9px] bg-emerald-500 hover:bg-emerald-600 text-white font-bold uppercase tracking-wider rounded transition-colors"
                            >
                              Save
                            </button>
                            <button
                              onClick={() => setEditingOptionIdx(null)}
                              className="px-3 py-1 text-[9px] bg-background border border-border hover:bg-muted text-muted-foreground font-semibold uppercase tracking-wider rounded transition-colors"
                            >
                              Cancel
                            </button>
                          </div>
                        ) : (
                          <>
                            <div className="flex items-center gap-2">
                              <span className="h-1.5 w-1.5 rounded-full bg-primary" />
                              <span className="font-bold tracking-wider text-foreground uppercase">{opt}</span>
                            </div>
                            <div className="flex items-center gap-2 opacity-80 group-hover:opacity-100 transition-opacity">
                              <button
                                onClick={() => handleStartEdit(idx, opt)}
                                className="px-2.5 py-1 text-[9px] bg-card hover:bg-muted border border-border hover:border-primary/20 text-muted-foreground hover:text-foreground uppercase tracking-widest rounded transition-all"
                              >
                                Edit
                              </button>
                              <button
                                onClick={() => handleDeleteOption(idx)}
                                className="px-2.5 py-1 text-[9px] bg-red-500/10 hover:bg-red-500 border border-red-500/10 hover:border-red-600 text-red-400 hover:text-white uppercase tracking-widest rounded transition-all"
                              >
                                Delete
                              </button>
                            </div>
                          </>
                        )}
                      </div>
                    ))
                  ) : (
                    <div className="p-6 text-center text-[10px] text-muted-foreground uppercase tracking-widest">
                      No polymorphic link options defined. Add one above.
                    </div>
                  )}
                </div>
              </div>
            </div>
          )}

          {activeTab === 'system' && (
            <div className="glass-panel p-6 space-y-5">
              <div className="flex items-center justify-between border-b border-border/40 pb-3">
                <div className="flex items-center gap-2.5 text-primary">
                  <span className="material-symbols-outlined text-[18px]">verified_user</span>
                  <h3 className="font-black text-xs uppercase tracking-wider text-foreground">Operator Station Diagnostics</h3>
                </div>
                <div className="flex items-center gap-1.5 px-2 py-0.5 rounded-full border border-emerald-500/30 bg-emerald-500/5 text-emerald-500 font-mono text-[9px] uppercase tracking-wider font-bold">
                  <span className="h-1.5 w-1.5 rounded-full bg-emerald-500 animate-pulse" />
                  Link Nominal
                </div>
              </div>

              <div className="text-[10px] text-muted-foreground space-y-1 font-mono bg-black/15 border border-border/80 rounded-xl p-4 divide-y divide-border/30">
                <div className="flex justify-between py-2.5">
                  <span className="uppercase text-muted-foreground">Gateway Core Engine:</span>
                  <span className="text-foreground font-bold">Vite React client v19.0.0</span>
                </div>
                <div className="flex justify-between py-2.5">
                  <span className="uppercase text-muted-foreground">Relational Schema Syncer:</span>
                  <span className="text-foreground font-bold">Neon Serverless SQL Gateway</span>
                </div>
                <div className="flex justify-between py-2.5">
                  <span className="uppercase text-muted-foreground">Active Server Engine:</span>
                  <span className="text-foreground font-bold">ElysiaJS Core v2.3.2</span>
                </div>
                <div className="flex justify-between py-2.5">
                  <span className="uppercase text-muted-foreground">Active Node Station:</span>
                  <span className="text-primary font-bold">NODE_ALPHA_TERMINAL</span>
                </div>
              </div>
            </div>
          )}

          {activeTab === 'audit' && (
            <div className="glass-panel p-6 space-y-5">
              <div className="flex justify-between items-center pb-2 border-b border-border/40">
                <div>
                  <h3 className="font-black text-xs uppercase tracking-wider text-foreground">Security Audit Logs</h3>
                  <p className="text-[10px] font-mono text-muted-foreground uppercase tracking-widest mt-0.5">
                    Live system transaction logs and device movement operations records
                  </p>
                </div>
                <button
                  onClick={() => fetchAuditLogs(true)}
                  className="inline-flex items-center justify-center h-8 w-8 rounded-lg border border-primary/10 hover:bg-primary/5 text-muted-foreground hover:text-foreground cursor-pointer"
                  title="Refresh Audit Logs"
                >
                  <span className="material-symbols-outlined text-sm">refresh</span>
                </button>
              </div>

              {/* Search Bar for logs */}
              <div className="flex items-center gap-2 border border-primary/10 p-2 rounded-xl bg-card/60">
                <div className="relative flex-1">
                  <span className="material-symbols-outlined text-sm text-muted-foreground absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none">search</span>
                  <input
                    placeholder="Filter audit records by Action, Device, Operator, or Details..."
                    value={auditSearch}
                    onChange={(e) => setAuditSearch(e.target.value)}
                    className="flex h-9 w-full bg-transparent pl-9 pr-3 py-1 text-xs focus-visible:outline-none placeholder:text-muted-foreground/30 text-foreground border-0"
                  />
                </div>
              </div>

              {/* Audit Logs Registry */}
              <div className="border border-border/80 rounded-xl bg-black/10 overflow-hidden text-xs">
                <Table>
                  <TableHeader className="bg-card/45 border-b border-primary/10">
                    <TableRow>
                      <TableHead className="px-4 py-2 w-[15%] text-[9px] uppercase font-bold tracking-wider">Action</TableHead>
                      <TableHead className="px-4 py-2 w-[20%] text-[9px] uppercase font-bold tracking-wider">Device</TableHead>
                      <TableHead className="px-4 py-2 w-[15%] text-[9px] uppercase font-bold tracking-wider">Operator ID</TableHead>
                      <TableHead className="px-4 py-2 w-[35%] text-[9px] uppercase font-bold tracking-wider">Details</TableHead>
                      <TableHead className="px-4 py-2 w-[15%] text-[9px] uppercase font-bold tracking-wider">Timestamp</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {isAuditLoading ? (
                      Array.from({ length: 4 }).map((_, idx) => (
                        <TableRow key={idx} className="animate-pulse">
                          <TableCell className="p-4"><Skeleton className="h-4 w-12" /></TableCell>
                          <TableCell className="p-4"><Skeleton className="h-4 w-24" /></TableCell>
                          <TableCell className="p-4"><Skeleton className="h-4 w-20" /></TableCell>
                          <TableCell className="p-4"><Skeleton className="h-4 w-48" /></TableCell>
                          <TableCell className="p-4"><Skeleton className="h-4 w-16" /></TableCell>
                        </TableRow>
                      ))
                    ) : filteredAuditLogs.length > 0 ? (
                      filteredAuditLogs.map((log) => (
                        <TableRow key={log.id} className="hover:bg-primary/5 transition-colors">
                          <TableCell className="p-4 font-mono font-bold align-middle">
                            <span className="px-1.5 py-0.5 rounded bg-primary/10 border border-primary/10 text-[9px] tracking-wider text-primary uppercase">{log.actionType}</span>
                          </TableCell>
                          <TableCell className="p-4 font-mono text-foreground font-semibold align-middle truncate">
                            {log.deviceIdentifier || '-'}
                          </TableCell>
                          <TableCell className="p-4 font-mono text-muted-foreground text-[10px] align-middle truncate">
                            {log.userId || 'SYSTEM'}
                          </TableCell>
                          <TableCell className="p-4 text-muted-foreground text-[11px] align-middle leading-normal">
                            {log.details}
                          </TableCell>
                          <TableCell className="p-4 font-mono text-muted-foreground text-[10px] align-middle whitespace-nowrap">
                            {new Date(log.createdAt).toLocaleDateString(undefined, {
                              month: 'short',
                              day: 'numeric',
                              hour: '2-digit',
                              minute: '2-digit'
                            })}
                          </TableCell>
                        </TableRow>
                      ))
                    ) : (
                      <TableRow>
                        <TableCell colSpan={5} className="text-center p-8 text-xs text-muted-foreground uppercase tracking-widest">
                          No audit trace logs found matching search.
                        </TableCell>
                      </TableRow>
                    )}
                  </TableBody>
                </Table>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* User Creation / Editing Modal */}
      <Dialog open={isUserModalOpen} onOpenChange={setIsUserModalOpen}>
        <DialogContent className="glass-panel-elevated p-6 rounded-2xl max-w-md w-full space-y-4 border-0 animate-in fade-in zoom-in-95 duration-150" showCloseButton={true}>
          <DialogHeader className="text-left space-y-0.5">
            <DialogTitle className="text-lg font-extrabold tracking-tight text-foreground p-0">
              {editingUser ? 'Edit User Profile' : 'New User Profile'}
            </DialogTitle>
            <DialogDescription className="text-xs text-muted-foreground">
              {editingUser ? 'Update the details and system role of this user account.' : 'Create a new user account and assign their role-based permissions.'}
            </DialogDescription>
          </DialogHeader>

          <form onSubmit={handleSubmitUser(onSubmitUser)} className="space-y-4">
            <div className="space-y-1.5">
              <label className="text-[11px] font-bold text-muted-foreground uppercase tracking-wider block">Full Name</label>
              <Input
                type="text"
                placeholder="Jane Doe"
                className={`bg-background/50 border-primary/10 text-xs h-10 rounded-xl text-foreground placeholder:text-muted-foreground/30 ${
                  userErrors.name ? 'border-red-500/50' : ''
                }`}
                {...registerUser('name')}
              />
              {userErrors.name && <p className="text-[10px] text-red-400 font-semibold mt-0.5">{userErrors.name.message}</p>}
            </div>

            <div className="space-y-1.5">
              <label className="text-[11px] font-bold text-muted-foreground uppercase tracking-wider block">Email Address</label>
              <Input
                type="email"
                placeholder="jane@amberconnect.com"
                className={`bg-background/50 border-primary/10 text-xs h-10 rounded-xl text-foreground placeholder:text-muted-foreground/30 ${
                  userErrors.email ? 'border-red-500/50' : ''
                }`}
                {...registerUser('email')}
              />
              {userErrors.email && <p className="text-[10px] text-red-400 font-semibold mt-0.5">{userErrors.email.message}</p>}
            </div>

            {!editingUser && (
              <div className="space-y-1.5">
                <label className="text-[11px] font-bold text-muted-foreground uppercase tracking-wider block">Access Password</label>
                <Input
                  type="password"
                  placeholder="••••••••"
                  className={`bg-background/50 border-primary/10 text-xs h-10 rounded-xl text-foreground placeholder:text-muted-foreground/30 ${
                    userErrors.password ? 'border-red-500/50' : ''
                  }`}
                  {...registerUser('password')}
                />
                {userErrors.password && <p className="text-[10px] text-red-400 font-semibold mt-0.5">{userErrors.password.message}</p>}
              </div>
            )}

            <div className="space-y-1.5">
              <label className="text-[11px] font-bold text-muted-foreground uppercase tracking-wider block">System Access Role</label>
              <Controller
                control={controlUser}
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
              {userErrors.role && <p className="text-[10px] text-red-400 font-semibold mt-0.5">{userErrors.role.message}</p>}
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
    </>
  );
};

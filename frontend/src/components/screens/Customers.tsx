import { useState, useEffect, useMemo } from 'react';
import { 
  Search, 
  Plus, 
  MoreHorizontal, 
  Mail, 
  Phone, 
  MapPin, 
  Building2, 
  User as UserIcon,
  History,
  Package,
  Calendar,
  ChevronRight,
  X,
  Save,
  Loader2,
  Eye,
  Edit2,
  Trash2
} from 'lucide-react';
import { AppShell } from '../layout/AppShell';
import { Button } from '../ui/button';
import { Input } from '../ui/input';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '../ui/table';
import { Skeleton } from '../ui/skeleton';
import { useForm, Controller } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { CreateCustomerSchema, CustomerType } from '@ims-pro/shared';
import type { Customer } from '@ims-pro/shared';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "../ui/select"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "../ui/dropdown-menu"

export const Customers = () => {
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [selectedCustomer, setSelectedCustomer] = useState<Customer | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  
  // History state
  const [history, setHistory] = useState<{ dispatched: any[], returned: any[] }>({ dispatched: [], returned: [] });
  const [isHistoryLoading, setIsHistoryLoading] = useState(false);

  const { register, handleSubmit, control, formState: { errors }, reset, setValue } = useForm({
    resolver: zodResolver(CreateCustomerSchema),
    defaultValues: {
      name: '',
      type: 'COMPANY' as CustomerType,
      email: '',
      phone: '',
      address: '',
      taxId: ''
    }
  });

  useEffect(() => {
    fetchCustomers();
  }, []);

  const fetchCustomers = async () => {
    setIsLoading(true);
    try {
      const res = await fetch('http://localhost:3002/api/customers');
      const data = await res.json();
      setCustomers(data);
    } catch (e) {
      console.error(e);
    } finally {
      setIsLoading(false);
    }
  };

  const handleDeleteCustomer = async (id: string) => {
    if (!confirm('Are you sure you want to permanently delete this customer? This action cannot be undone.')) return;
    try {
      const res = await fetch(`http://localhost:3002/api/customers/${id}`, {
        method: 'DELETE'
      });
      if (res.ok) {
        await fetchCustomers();
        if (selectedCustomer?.id === id) setSelectedCustomer(null);
      } else {
        const errorData = await res.json();
        alert(errorData.error || 'Failed to delete customer');
      }
    } catch (e) {
      console.error(e);
      alert('An unexpected error occurred while deleting the customer.');
    }
  };

  const fetchHistory = async (customerId: string) => {
    setIsHistoryLoading(true);
    try {
      const res = await fetch(`http://localhost:3002/api/customers/${customerId}/history`);
      const data = await res.json();
      setHistory(data);
    } catch (e) {
      console.error(e);
    } finally {
      setIsHistoryLoading(false);
    }
  };

  const filteredCustomers = useMemo(() => {
    return customers.filter(c => 
      c.name.toLowerCase().includes(search.toLowerCase()) ||
      c.email?.toLowerCase().includes(search.toLowerCase()) ||
      c.taxId?.toLowerCase().includes(search.toLowerCase())
    );
  }, [customers, search]);

  const handleOpenModal = (customer?: Customer) => {
    if (customer) {
      setValue('name', customer.name);
      setValue('type', customer.type as CustomerType);
      setValue('email', customer.email || '');
      setValue('phone', customer.phone || '');
      setValue('address', customer.address || '');
      setValue('taxId', customer.taxId || '');
      setSelectedCustomer(customer);
    } else {
      reset();
      setSelectedCustomer(null);
    }
    setIsModalOpen(true);
  };

  const onSubmit = async (values: any) => {
    setIsSubmitting(true);
    try {
      const url = selectedCustomer 
        ? `http://localhost:3002/api/customers/${selectedCustomer.id}` 
        : 'http://localhost:3002/api/customers';
      const method = selectedCustomer ? 'PUT' : 'POST';

      const res = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(values)
      });

      if (!res.ok) {
        const errorData = await res.json();
        throw new Error(errorData.message || 'Failed to save customer');
      }

      await fetchCustomers();
      setIsModalOpen(false);
      reset();
    } catch (e: any) {
      console.error(e);
      alert(e.message || 'An unexpected error occurred while saving the customer.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const viewCustomer = (customer: Customer) => {
    setSelectedCustomer(customer);
    fetchHistory(customer.id!);
  };

  if (selectedCustomer && !isModalOpen) {
    return (
      <AppShell>
        <div className="max-w-6xl mx-auto space-y-6">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <Button variant="outline" size="icon" onClick={() => setSelectedCustomer(null)}>
                <ChevronRight className="h-4 w-4 rotate-180" />
              </Button>
              <div>
                <h2 className="text-2xl font-semibold tracking-tight">{selectedCustomer.name}</h2>
                <div className="flex items-center gap-3 mt-1">
                  <span className="text-[10px] font-bold px-1.5 py-0.5 rounded border border-border bg-muted/50 uppercase tracking-widest text-muted-foreground">
                    {selectedCustomer.type}
                  </span>
                  {selectedCustomer.taxId && (
                    <span className="text-[10px] text-muted-foreground font-mono">
                      TAX ID: {selectedCustomer.taxId}
                    </span>
                  )}
                </div>
              </div>
            </div>
            <Button onClick={() => handleOpenModal(selectedCustomer)}>Edit Profile</Button>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div className="md:col-span-1 space-y-6">
              <div className="border border-border rounded-xl bg-card p-6 space-y-4 shadow-sm">
                <h3 className="text-sm font-semibold flex items-center gap-2">
                  <UserIcon className="h-4 w-4 text-primary" />
                  Contact Information
                </h3>
                <div className="space-y-3">
                  <div className="flex items-start gap-3 text-sm">
                    <Mail className="h-4 w-4 text-muted-foreground mt-0.5" />
                    <div className="space-y-0.5">
                      <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-tighter">Email</p>
                      <p>{selectedCustomer.email || 'No email provided'}</p>
                    </div>
                  </div>
                  <div className="flex items-start gap-3 text-sm">
                    <Phone className="h-4 w-4 text-muted-foreground mt-0.5" />
                    <div className="space-y-0.5">
                      <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-tighter">Phone</p>
                      <p>{selectedCustomer.phone || 'No phone provided'}</p>
                    </div>
                  </div>
                  <div className="flex items-start gap-3 text-sm">
                    <MapPin className="h-4 w-4 text-muted-foreground mt-0.5" />
                    <div className="space-y-0.5">
                      <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-tighter">Address</p>
                      <p className="whitespace-pre-wrap">{selectedCustomer.address || 'No address provided'}</p>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            <div className="md:col-span-2 space-y-6">
              <div className="border border-border rounded-xl bg-card overflow-hidden shadow-sm">
                <div className="bg-muted/30 p-4 border-b border-border flex items-center justify-between">
                  <h3 className="text-sm font-semibold flex items-center gap-2">
                    <History className="h-4 w-4 text-primary" />
                    Device Distribution History
                  </h3>
                </div>
                
                <div className="p-0">
                  <div className="flex border-b border-border px-4">
                    <button className="px-4 py-2.5 text-xs font-semibold border-b-2 border-primary text-foreground">
                      Currently Dispatched ({history.dispatched.length})
                    </button>
                    <button className="px-4 py-2.5 text-xs font-semibold border-b-2 border-transparent text-muted-foreground hover:text-foreground">
                      Return History ({history.returned.length})
                    </button>
                  </div>

                  <div className="divide-y divide-border">
                    {isHistoryLoading ? (
                      Array.from({ length: 3 }).map((_, i) => (
                        <div key={i} className="p-4"><Skeleton className="h-12 w-full" /></div>
                      ))
                    ) : history.dispatched.length > 0 ? (
                      history.dispatched.map((dev) => (
                        <div key={dev.id} className="p-4 flex items-center justify-between hover:bg-muted/10 transition-colors">
                          <div className="flex items-center gap-4">
                            <div className="h-9 w-9 rounded-lg bg-primary/10 flex items-center justify-center">
                              <Package className="h-5 w-5 text-primary" />
                            </div>
                            <div>
                              <p className="text-sm font-mono font-bold">{dev.identifier}</p>
                              <p className="text-[10px] text-muted-foreground uppercase font-bold">{dev.modelName}</p>
                            </div>
                          </div>
                          <div className="text-right space-y-1">
                            <div className="flex items-center gap-1.5 text-xs text-muted-foreground justify-end">
                              <Calendar className="h-3 w-3" />
                              <span>{dev.dispatchedAt ? new Date(dev.dispatchedAt).toLocaleDateString() : 'Unknown Date'}</span>
                            </div>
                            <span className="text-[10px] font-bold bg-emerald-500/10 text-emerald-600 px-1.5 py-0.5 rounded border border-emerald-500/20 uppercase">
                              Active Dispatch
                            </span>
                          </div>
                        </div>
                      ))
                    ) : (
                      <div className="p-12 text-center space-y-2 text-muted-foreground">
                        <Package className="h-8 w-8 mx-auto opacity-20" />
                        <p className="text-sm">No devices currently dispatched to this customer.</p>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </AppShell>
    );
  }

  return (
    <AppShell>
      <div className="flex flex-col gap-6 max-w-6xl mx-auto w-full">
        <div className="flex flex-col md:flex-row md:items-end justify-between gap-4">
          <div>
            <h2 className="text-2xl font-semibold tracking-tight">Customer Management</h2>
            <p className="text-sm text-muted-foreground mt-1">
              Maintain a registry of corporate fleets and individual operators for hardware distribution.
            </p>
          </div>
          <div className="flex items-center gap-3">
            <div className="relative w-full md:w-64">
              <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search customers..."
                className="pl-9 h-10"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
              />
            </div>
            <Button onClick={() => handleOpenModal()} className="gap-2">
              <Plus className="h-4 w-4" /> Add Customer
            </Button>
          </div>
        </div>

        <div className="border border-border rounded-xl bg-card shadow-sm overflow-x-auto overflow-y-visible">
          <Table className="table-fixed w-full min-w-[800px]">
            <TableHeader className="bg-muted/50">
              <TableRow>
                <TableHead className="w-[30%]">Customer Name</TableHead>
                <TableHead className="w-[15%]">Type</TableHead>
                <TableHead className="w-[20%]">Contact</TableHead>
                <TableHead className="w-[25%]">Location / Tax ID</TableHead>
                <TableHead className="w-[10%] text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {isLoading ? (
                Array.from({ length: 5 }).map((_, i) => (
                  <TableRow key={i}>
                    <TableCell><Skeleton className="h-4 w-full" /></TableCell>
                    <TableCell><Skeleton className="h-4 w-full" /></TableCell>
                    <TableCell><Skeleton className="h-4 w-full" /></TableCell>
                    <TableCell><Skeleton className="h-4 w-full" /></TableCell>
                    <TableCell className="text-right"><Skeleton className="h-8 w-8 ml-auto" /></TableCell>
                  </TableRow>
                ))
              ) : filteredCustomers.length > 0 ? (
                filteredCustomers.map((customer) => (
                  <TableRow key={customer.id} className="group hover:bg-muted/30 transition-colors">
                    <TableCell className="truncate">
                      <button 
                        onClick={() => viewCustomer(customer)}
                        className="flex items-center gap-3 text-left hover:text-primary transition-colors overflow-hidden"
                      >
                        <div className="h-8 w-8 rounded-full bg-muted flex items-center justify-center shrink-0">
                          {customer.type === 'COMPANY' ? <Building2 className="h-4 w-4 text-muted-foreground" /> : <UserIcon className="h-4 w-4 text-muted-foreground" />}
                        </div>
                        <span className="font-semibold truncate">{customer.name}</span>
                      </button>
                    </TableCell>
                    <TableCell>
                      <span className="text-[10px] font-bold bg-muted/50 border border-border px-1.5 py-0.5 rounded uppercase tracking-wider">
                        {customer.type}
                      </span>
                    </TableCell>
                    <TableCell className="text-xs text-muted-foreground truncate">
                      <div className="space-y-1">
                        <div className="flex items-center gap-1.5 truncate"><Mail className="h-3 w-3 shrink-0" /> {customer.email || '-'}</div>
                        <div className="flex items-center gap-1.5 truncate"><Phone className="h-3 w-3 shrink-0" /> {customer.phone || '-'}</div>
                      </div>
                    </TableCell>
                    <TableCell className="text-xs text-muted-foreground truncate">
                      <div className="space-y-1">
                        <div className="flex items-center gap-1.5 font-mono truncate">{customer.taxId || '-'}</div>
                        <div className="flex items-center gap-1.5 truncate"><MapPin className="h-3 w-3 shrink-0" /> {customer.address || '-'}</div>
                      </div>
                    </TableCell>
                    <TableCell className="text-right">
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button 
                            variant="ghost" 
                            size="icon" 
                            className="h-8 w-8 opacity-0 group-hover:opacity-100 data-[state=open]:opacity-100 transition-all"
                          >
                            <MoreHorizontal className="h-4 w-4" />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end" className="w-48">
                          <DropdownMenuItem onClick={() => viewCustomer(customer)} className="text-xs font-semibold cursor-pointer">
                            <Eye className="h-3.5 w-3.5 mr-2 text-primary" />
                            View Profile & History
                          </DropdownMenuItem>
                          <DropdownMenuItem onClick={() => handleOpenModal(customer)} className="text-xs font-semibold cursor-pointer">
                            <Edit2 className="h-3.5 w-3.5 mr-2 text-muted-foreground" />
                            Edit Information
                          </DropdownMenuItem>
                          <DropdownMenuSeparator />
                          <DropdownMenuItem 
                            onClick={() => handleDeleteCustomer(customer.id!)} 
                            className="text-xs font-semibold text-destructive focus:text-destructive cursor-pointer"
                          >
                            <Trash2 className="h-3.5 w-3.5 mr-2" />
                            Delete Customer
                          </DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </TableCell>
                  </TableRow>
                ))
              ) : (
                <TableRow>
                  <TableCell colSpan={5} className="h-32 text-center text-muted-foreground italic">
                    No customers found. Click "Add Customer" to register a new client.
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </div>
      </div>

      {isModalOpen && (
        <div 
          className="fixed inset-0 bg-background/80 backdrop-blur-sm z-50 flex items-center justify-center p-4"
          onClick={() => setIsModalOpen(false)}
        >
          <div 
            className="border border-border rounded-xl bg-card shadow-lg max-w-lg w-full overflow-hidden animate-in fade-in zoom-in-95 duration-150"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="p-6 border-b border-border bg-muted/30 flex items-center justify-between">
              <div>
                <h3 className="text-lg font-semibold">{selectedCustomer ? 'Edit Customer Profile' : 'Register New Customer'}</h3>
                <p className="text-xs text-muted-foreground mt-0.5">Capture essential details for device allocation and tracking.</p>
              </div>
              <Button variant="ghost" size="icon" onClick={() => setIsModalOpen(false)}>
                <X className="h-4 w-4" />
              </Button>
            </div>

            <form onSubmit={handleSubmit(onSubmit)} className="p-6 space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="col-span-2 space-y-1.5">
                  <label className="text-xs font-bold text-muted-foreground uppercase tracking-wider">Customer Name / Entity</label>
                  <Input {...register('name')} placeholder="e.g. Acme Corp or John Doe" />
                  {errors.name && <p className="text-[10px] text-destructive font-bold">{errors.name.message as string}</p>}
                </div>

                <div className="space-y-1.5">
                  <label className="text-xs font-bold text-muted-foreground uppercase tracking-wider">Type</label>
                  <Controller
                    control={control}
                    name="type"
                    render={({ field }) => (
                      <Select onValueChange={field.onChange} value={field.value}>
                        <SelectTrigger className="w-full">
                          <SelectValue placeholder="Select type" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="COMPANY">Company / Fleet</SelectItem>
                          <SelectItem value="PERSON">Individual / Person</SelectItem>
                        </SelectContent>
                      </Select>
                    )}
                  />
                </div>

                <div className="space-y-1.5">
                  <label className="text-xs font-bold text-muted-foreground uppercase tracking-wider">Tax ID / National ID</label>
                  <Input {...register('taxId')} placeholder="e.g. 12-3456789" />
                </div>

                <div className="space-y-1.5">
                  <label className="text-xs font-bold text-muted-foreground uppercase tracking-wider">Email Address</label>
                  <Input {...register('email')} placeholder="contact@example.com" />
                  {errors.email && <p className="text-[10px] text-destructive font-bold">{errors.email.message as string}</p>}
                </div>

                <div className="space-y-1.5">
                  <label className="text-xs font-bold text-muted-foreground uppercase tracking-wider">Phone Number</label>
                  <Input {...register('phone')} placeholder="+1 (555) 000-0000" />
                </div>

                <div className="col-span-2 space-y-1.5">
                  <label className="text-xs font-bold text-muted-foreground uppercase tracking-wider">Physical Address</label>
                  <textarea 
                    {...register('address')}
                    className="flex min-h-[80px] w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
                    placeholder="Street, City, Zip Code..."
                  />
                </div>
              </div>

              <div className="pt-4 flex items-center justify-end gap-3">
                <Button type="button" variant="outline" onClick={() => setIsModalOpen(false)}>Cancel</Button>
                <Button type="submit" disabled={isSubmitting} className="gap-2 px-6">
                  {isSubmitting ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
                  {selectedCustomer ? 'Save Changes' : 'Create Customer'}
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}
    </AppShell>
  );
};

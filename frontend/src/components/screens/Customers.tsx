import { useState, useMemo } from 'react';
import { apiClient } from '../../lib/api-client';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '../ui/table';
import { Skeleton } from '../ui/skeleton';
import { EmptyState } from '../ui/empty-state';
import { useForm, Controller } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { CreateCustomerSchema, CustomerType } from '@ims-pro/shared';
import { useFeedback } from '../ui/feedback-provider';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '../ui/dialog';
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
import { useCustomers } from '../../lib/hooks/useDomain';
import { Customer, Device } from '../../lib/types/domain';
import { useQuery } from '@tanstack/react-query';
import { InlineErrorState } from '../ui/inline-error-state';

interface CustomerFormValues {
  name: string;
  type: CustomerType;
  email?: string;
  phone?: string;
  address?: string;
  taxId?: string;
}

export const Customers = () => {
  const { toast, confirm } = useFeedback();
  const {
    data: customers = [],
    isLoading,
    isError: isCustomersError,
    error: customersError,
    refetch: fetchCustomers
  } = useCustomers();
  const [search, setSearch] = useState('');
  const [selectedCustomer, setSelectedCustomer] = useState<Customer | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  
  // History state
  const {
    data: history = { dispatched: [], returned: [] },
    isLoading: isHistoryLoading,
    isError: isHistoryError,
    error: historyError,
    refetch: refetchHistory
  } = useQuery({
    queryKey: ['customer-history', selectedCustomer?.id],
    queryFn: () => apiClient.get<{ dispatched: Device[], returned: Device[] }>(`/api/customers/${selectedCustomer?.id}/history`),
    enabled: !!selectedCustomer?.id
  });

  const { register, handleSubmit, control, formState: { errors }, reset, setValue } = useForm<CustomerFormValues>({
    resolver: zodResolver(CreateCustomerSchema) as any,
    defaultValues: {
      name: '',
      type: 'COMPANY',
      email: '',
      phone: '',
      address: '',
      taxId: ''
    }
  });

  const handleDeleteCustomer = async (id: string) => {
    const isConfirmed = await confirm({
      title: 'Delete Customer?',
      message: 'Are you sure you want to permanently delete this customer? This action cannot be undone.'
    });
    if (!isConfirmed) return;
    try {
      await apiClient.delete(`/api/customers/${id}`);
      toast.success('Customer deleted successfully');
      await fetchCustomers();
      if (selectedCustomer?.id === id) setSelectedCustomer(null);
    } catch (e: unknown) {
      const error = e as Error;
      console.error(error);
      toast.error(error.message || 'An unexpected error occurred while deleting the customer.');
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

  const onSubmit = async (values: CustomerFormValues) => {
    setIsSubmitting(true);
    try {
      const path = selectedCustomer 
        ? `/api/customers/${selectedCustomer.id}` 
        : '/api/customers';

      if (selectedCustomer && isModalOpen) {
        await apiClient.put(path, values);
      } else {
        await apiClient.post(path, values);
      }

      toast.success(selectedCustomer ? 'Customer updated successfully' : 'Customer created successfully');
      await fetchCustomers();
      setIsModalOpen(false);
      reset();
    } catch (e: unknown) {
      const error = e as Error;
      console.error(error);
      toast.error(error.message || 'An unexpected error occurred while saving the customer.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const viewCustomer = (customer: Customer) => {
    setSelectedCustomer(customer);
  };

  if (selectedCustomer && !isModalOpen) {
    return (
      <div className="max-w-6xl mx-auto space-y-6">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <button 
                onClick={() => setSelectedCustomer(null)}
                className="inline-flex items-center justify-center rounded-lg text-xs font-bold transition-all border border-primary/10 bg-primary/5 hover:bg-primary/15 text-foreground h-9 w-9 cursor-pointer"
              >
                <span className="material-symbols-outlined text-sm">keyboard_arrow_left</span>
              </button>
              <div>
                <h2 className="text-2xl font-extrabold tracking-tight text-foreground">{selectedCustomer.name}</h2>
                <div className="flex items-center gap-3 mt-1">
                  <span className="text-[10px] font-bold px-1.5 py-0.5 rounded border border-primary/20 bg-primary/10 uppercase tracking-widest text-primary font-mono">
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
            <button 
              onClick={() => handleOpenModal(selectedCustomer)}
              className="inline-flex items-center justify-center whitespace-nowrap rounded-lg text-xs font-bold transition-all bg-primary text-primary-foreground shadow hover:brightness-110 h-9 px-4 cursor-pointer"
            >
              Edit Profile
            </button>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div className="md:col-span-1 space-y-6">
              <div className="glass-panel p-6 rounded-2xl space-y-4">
                <h3 className="text-sm font-extrabold text-foreground flex items-center gap-2">
                  <span className="material-symbols-outlined text-sm text-primary">person</span>
                  Contact Information
                </h3>
                <div className="space-y-4">
                  <div className="flex items-start gap-3 text-xs">
                    <span className="material-symbols-outlined text-sm text-muted-foreground mt-0.5">mail</span>
                    <div className="space-y-0.5">
                      <p className="text-[9px] font-bold text-primary uppercase tracking-wider">Email</p>
                      <p className="text-foreground font-semibold">{selectedCustomer.email || 'No email provided'}</p>
                    </div>
                  </div>
                  <div className="flex items-start gap-3 text-xs">
                    <span className="material-symbols-outlined text-sm text-muted-foreground mt-0.5">phone</span>
                    <div className="space-y-0.5">
                      <p className="text-[9px] font-bold text-primary uppercase tracking-wider">Phone</p>
                      <p className="text-foreground font-semibold">{selectedCustomer.phone || 'No phone provided'}</p>
                    </div>
                  </div>
                  <div className="flex items-start gap-3 text-xs">
                    <span className="material-symbols-outlined text-sm text-muted-foreground mt-0.5">location_on</span>
                    <div className="space-y-0.5">
                      <p className="text-[9px] font-bold text-primary uppercase tracking-wider">Address</p>
                      <p className="text-foreground whitespace-pre-wrap font-semibold leading-relaxed">{selectedCustomer.address || 'No address provided'}</p>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            <div className="md:col-span-2 space-y-6">
              <div className="glass-panel rounded-2xl overflow-hidden shadow-sm">
                <div className="bg-card/60 p-4 border-b border-primary/10 flex items-center justify-between">
                  <h3 className="text-sm font-extrabold text-foreground flex items-center gap-2">
                    <span className="material-symbols-outlined text-sm text-primary">history</span>
                    Device Distribution History
                  </h3>
                </div>
                
                <div className="p-0">
                  <div className="flex border-b border-primary/10 px-4">
                    <button className="px-4 py-2.5 text-xs font-bold uppercase tracking-wider border-b-2 border-primary text-primary cursor-pointer">
                      Currently Dispatched ({history.dispatched.length})
                    </button>
                    <button className="px-4 py-2.5 text-xs font-bold uppercase tracking-wider border-b-2 border-transparent text-muted-foreground hover:text-foreground cursor-pointer">
                      Return History ({history.returned.length})
                    </button>
                  </div>

                  <div className="divide-y divide-primary/10">
                    {isHistoryLoading ? (
                      Array.from({ length: 3 }).map((_, i) => (
                        <div key={i} className="p-4"><Skeleton className="h-12 w-full animate-pulse" /></div>
                      ))
                    ) : isHistoryError ? (
                      <div className="p-4">
                        <InlineErrorState
                          title="Distribution history failed to load"
                          description="The customer profile loaded, but the device distribution history request failed."
                          error={historyError}
                          onRetry={() => refetchHistory()}
                        />
                      </div>
                    ) : history.dispatched.length > 0 ? (
                      history.dispatched.map((dev: Device) => (
                        <div key={dev.id} className="p-4 flex items-center justify-between hover:bg-primary/5 transition-colors">
                          <div className="flex items-center gap-4">
                            <div className="h-9 w-9 rounded-lg bg-primary/10 flex items-center justify-center">
                              <span className="material-symbols-outlined text-sm text-primary">inventory_2</span>
                            </div>
                            <div>
                              <p className="text-sm font-mono font-bold text-foreground">{dev.identifier}</p>
                              <p className="text-[10px] text-primary uppercase font-extrabold">{dev.modelName}</p>
                            </div>
                          </div>
                          <div className="text-right space-y-1">
                            <div className="flex items-center gap-1.5 text-xs text-muted-foreground justify-end">
                              <span className="material-symbols-outlined text-xs text-muted-foreground">calendar_today</span>
                              <span>{dev.metadata?.dispatchedAt ? new Date(dev.metadata.dispatchedAt as string).toLocaleDateString() : 'Unknown Date'}</span>
                            </div>
                            <span className="text-[10px] font-bold bg-emerald-500/10 text-emerald-400 px-1.5 py-0.5 rounded border border-emerald-500/20 uppercase tracking-wider font-mono">
                              Active Dispatch
                            </span>
                          </div>
                        </div>
                      ))
                    ) : (
                      <div className="p-4">
                        <EmptyState
                          icon="inventory_2"
                          title="No Active Dispatches"
                          description="There are currently no active hardware devices assigned to this customer fleet."
                          className="border-0 bg-transparent py-8"
                        />
                      </div>
                    )}
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
    );
  }

  return (
    <div className="flex flex-col gap-6 max-w-6xl mx-auto w-full">
        <div className="flex flex-col md:flex-row md:items-end justify-between gap-4">
          <div>
            <h2 className="text-2xl font-extrabold tracking-tight text-foreground">Customer Management</h2>
            <p className="text-sm text-muted-foreground mt-1">
              Maintain a registry of corporate fleets and individual operators for hardware distribution.
            </p>
          </div>
          <div className="flex items-center gap-3">
            <div className="relative w-full md:w-64">
              <span className="material-symbols-outlined text-sm text-muted-foreground absolute left-3 top-2.5 pointer-events-none">search</span>
              <input
                placeholder="Search customers..."
                className="flex h-9 w-full rounded-lg border border-primary/10 bg-primary/5 pl-9 pr-3 py-1 text-sm shadow-sm transition-colors placeholder:text-muted-foreground/30 focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-primary/20 text-foreground"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
              />
            </div>
            <button 
              onClick={() => handleOpenModal()} 
              className="inline-flex items-center justify-center whitespace-nowrap rounded-lg text-xs font-bold transition-all bg-primary text-primary-foreground shadow hover:brightness-110 h-9 px-4 gap-1.5 cursor-pointer"
            >
              <span className="material-symbols-outlined text-sm">add</span> Add Customer
            </button>
          </div>
        </div>

        <div className="glass-panel rounded-xl overflow-x-auto overflow-y-visible">
          <Table className="table-fixed w-full min-w-[800px]">
            <TableHeader>
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
                    <TableCell><Skeleton className="h-4 w-full animate-pulse" /></TableCell>
                    <TableCell><Skeleton className="h-4 w-full animate-pulse" /></TableCell>
                    <TableCell><Skeleton className="h-4 w-full animate-pulse" /></TableCell>
                    <TableCell><Skeleton className="h-4 w-full animate-pulse" /></TableCell>
                    <TableCell className="text-right"><Skeleton className="h-8 w-8 ml-auto" /></TableCell>
                  </TableRow>
                ))
              ) : isCustomersError ? (
                <TableRow>
                  <TableCell colSpan={5} className="h-auto p-0">
                    <InlineErrorState
                      title="Customers failed to load"
                      description="The customer registry could not be loaded. Retry before adding or editing customer records."
                      error={customersError}
                      onRetry={() => fetchCustomers()}
                    />
                  </TableCell>
                </TableRow>
              ) : filteredCustomers.length > 0 ? (
                filteredCustomers.map((customer) => (
                  <TableRow key={customer.id} className="group hover:bg-primary/5 transition-colors">
                    <TableCell className="truncate">
                      <button 
                        onClick={() => viewCustomer(customer)}
                        className="flex items-center gap-3 text-left hover:text-primary transition-colors overflow-hidden cursor-pointer"
                      >
                        <div className="h-8 w-8 rounded-full bg-primary/10 flex items-center justify-center shrink-0">
                          {customer.type === 'COMPANY' ? (
                            <span className="material-symbols-outlined text-[16px] text-primary">corporate_fare</span>
                          ) : (
                            <span className="material-symbols-outlined text-[16px] text-primary">person</span>
                          )}
                        </div>
                        <span className="font-bold text-foreground truncate">{customer.name}</span>
                      </button>
                    </TableCell>
                    <TableCell>
                      <span className="text-[10px] font-bold bg-primary/10 border border-primary/20 px-1.5 py-0.5 rounded uppercase tracking-wider text-primary font-mono">
                        {customer.type}
                      </span>
                    </TableCell>
                    <TableCell className="text-xs text-muted-foreground truncate">
                      <div className="space-y-1">
                        <div className="flex items-center gap-1.5 truncate">
                          <span className="material-symbols-outlined text-xs text-muted-foreground">mail</span>
                          {customer.email || '-'}
                        </div>
                        <div className="flex items-center gap-1.5 truncate">
                          <span className="material-symbols-outlined text-xs text-muted-foreground">phone</span>
                          {customer.phone || '-'}
                        </div>
                      </div>
                    </TableCell>
                    <TableCell className="text-xs text-muted-foreground truncate">
                      <div className="space-y-1">
                        <div className="flex items-center gap-1.5 font-mono truncate text-foreground">{customer.taxId || '-'}</div>
                        <div className="flex items-center gap-1.5 truncate">
                          <span className="material-symbols-outlined text-xs text-muted-foreground">location_on</span>
                          {customer.address || '-'}
                        </div>
                      </div>
                    </TableCell>
                    <TableCell className="text-right">
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <button 
                            className="text-muted-foreground hover:text-foreground p-1 hover:bg-primary/5 rounded-lg transition-colors cursor-pointer"
                          >
                            <span className="material-symbols-outlined text-[18px]">more_horiz</span>
                          </button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end" className="w-48 bg-card/95 backdrop-blur-2xl border border-primary/15 text-foreground rounded-xl p-1 shadow-xl">
                          <DropdownMenuItem onClick={() => viewCustomer(customer)} className="text-xs font-semibold cursor-pointer flex items-center px-2.5 py-2 hover:bg-primary/5 focus:bg-primary/5 rounded-lg transition-colors">
                            <span className="material-symbols-outlined text-sm mr-2 text-primary">visibility</span>
                            View Profile & History
                          </DropdownMenuItem>
                          <DropdownMenuItem onClick={() => handleOpenModal(customer)} className="text-xs font-semibold cursor-pointer flex items-center px-2.5 py-2 hover:bg-primary/5 focus:bg-primary/5 rounded-lg transition-colors">
                            <span className="material-symbols-outlined text-sm mr-2 text-muted-foreground">edit</span>
                            Edit Information
                          </DropdownMenuItem>
                          <DropdownMenuSeparator className="bg-primary/10 my-1" />
                          <DropdownMenuItem 
                            onClick={() => handleDeleteCustomer(customer.id!)} 
                            className="text-xs font-semibold text-red-400 focus:text-red-400 cursor-pointer flex items-center px-2.5 py-2 hover:bg-red-500/5 focus:bg-red-500/5 rounded-lg transition-colors"
                          >
                            <span className="material-symbols-outlined text-sm mr-2 text-red-400">delete</span>
                            Delete Customer
                          </DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </TableCell>
                  </TableRow>
                ))
              ) : (
                <TableRow>
                  <TableCell colSpan={5} className="h-auto p-0">
                    <EmptyState
                      icon="person"
                      title="No Customers Registered"
                      description="No client accounts or enterprise fleets match your current search query."
                      action={
                        <button 
                          onClick={() => handleOpenModal()} 
                          className="inline-flex items-center justify-center whitespace-nowrap rounded-lg text-xs font-bold transition-all bg-primary text-primary-foreground shadow hover:brightness-110 h-8 px-3 gap-1 cursor-pointer"
                        >
                          <span className="material-symbols-outlined text-sm">add</span> Add Customer
                        </button>
                      }
                      className="border-0 bg-transparent py-12"
                    />
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </div>

      <Dialog open={isModalOpen} onOpenChange={setIsModalOpen}>
        <DialogContent className="glass-panel-elevated max-w-lg w-full overflow-hidden border-0 p-0 animate-in fade-in zoom-in-95 duration-150" showCloseButton={true}>
          <DialogHeader className="p-6 border-b border-primary/10 bg-card/60 text-left space-y-0.5">
            <DialogTitle className="text-lg font-extrabold text-foreground p-0">{selectedCustomer ? 'Edit Customer Profile' : 'Register New Customer'}</DialogTitle>
            <DialogDescription className="text-xs text-[#cbd5e1] mt-0.5">Capture essential details for device allocation and tracking.</DialogDescription>
          </DialogHeader>

            <form onSubmit={handleSubmit(onSubmit)} className="p-6 space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="col-span-2 space-y-1.5">
                  <label className="text-xs font-semibold text-muted-foreground block">Customer Name / Entity</label>
                  <input 
                    {...register('name')} 
                    placeholder="e.g. Acme Corp or John Doe" 
                    className="flex h-9 w-full rounded-lg border border-primary/10 bg-primary/5 px-3 py-1 text-sm shadow-sm focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-primary/20 text-foreground"
                  />
                  {errors.name && <p className="text-[10px] text-red-400 font-bold">{errors.name.message as string}</p>}
                </div>

                <div className="space-y-1.5">
                  <label className="text-xs font-semibold text-muted-foreground block">Type</label>
                  <Controller
                    control={control}
                    name="type"
                    render={({ field }) => (
                      <Select onValueChange={field.onChange} value={field.value}>
                        <SelectTrigger className="w-full text-xs h-9 bg-primary/5 border border-primary/10 rounded-lg text-foreground focus:ring-primary/20">
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
                  <label className="text-xs font-semibold text-muted-foreground block">Tax ID / National ID</label>
                  <input 
                    {...register('taxId')} 
                    placeholder="e.g. 12-3456789" 
                    className="flex h-9 w-full rounded-lg border border-primary/10 bg-primary/5 px-3 py-1 text-sm shadow-sm focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-primary/20 text-foreground"
                  />
                </div>

                <div className="space-y-1.5">
                  <label className="text-xs font-semibold text-muted-foreground block">Email Address</label>
                  <input 
                    {...register('email')} 
                    placeholder="contact@example.com" 
                    className="flex h-9 w-full rounded-lg border border-primary/10 bg-primary/5 px-3 py-1 text-sm shadow-sm focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-primary/20 text-foreground"
                  />
                  {errors.email && <p className="text-[10px] text-red-400 font-bold">{errors.email.message as string}</p>}
                </div>

                <div className="space-y-1.5">
                  <label className="text-xs font-semibold text-muted-foreground block">Phone Number</label>
                  <input 
                    {...register('phone')} 
                    placeholder="+1 (555) 000-0000" 
                    className="flex h-9 w-full rounded-lg border border-primary/10 bg-primary/5 px-3 py-1 text-sm shadow-sm focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-primary/20 text-foreground"
                  />
                </div>

                <div className="col-span-2 space-y-1.5">
                  <label className="text-xs font-semibold text-muted-foreground block">Physical Address</label>
                  <textarea 
                    {...register('address')}
                    className="flex min-h-[80px] w-full rounded-lg border border-primary/10 bg-primary/5 px-3 py-2 text-sm focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-primary/20 text-foreground"
                    placeholder="Street, City, Zip Code..."
                  />
                </div>
              </div>

              <div className="pt-4 flex items-center justify-end gap-3 border-t border-primary/10">
                <button 
                  type="button" 
                  onClick={() => setIsModalOpen(false)}
                  className="inline-flex items-center justify-center whitespace-nowrap rounded-lg text-xs font-bold transition-all border border-primary/10 bg-card/60 text-muted-foreground hover:text-foreground hover:bg-primary/5 h-9 px-4 cursor-pointer"
                >
                  Cancel
                </button>
                <button 
                  type="submit" 
                  disabled={isSubmitting} 
                  className="inline-flex items-center justify-center whitespace-nowrap rounded-lg text-xs font-bold transition-all bg-primary text-primary-foreground shadow hover:brightness-110 h-9 px-6 gap-1.5 cursor-pointer"
                >
                  {isSubmitting ? (
                    <span className="material-symbols-outlined text-sm animate-spin">sync</span>
                  ) : (
                    <span className="material-symbols-outlined text-sm">save</span>
                  )}
                  {selectedCustomer ? 'Save Changes' : 'Create Customer'}
                </button>
              </div>
            </form>
        </DialogContent>
      </Dialog>
    </div>
  );
};



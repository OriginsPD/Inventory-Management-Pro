import { useState, useMemo, useEffect } from 'react';
import { useNavigate } from '@tanstack/react-router';
import { apiClient } from '@/lib/api-client';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@ims_pro/ui/components/table';
import { ListSkeleton, TableSkeleton } from '@/components/ui/loading';
import { EmptyState } from '@/components/ui/empty-state';
import { useForm, Controller } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { CreateCustomerSchema, CustomerType } from '@ims_pro/shared';
import { useFeedback } from '@/components/ui/feedback-provider';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@ims_pro/ui/components/dialog';
import { PortalPageShell } from '@/components/layout/PortalPageShell';
import { PortalButton, PortalInput } from '@/components/ui/portal';
import { Stagger, StaggerItem } from '@/components/ui/motion';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@ims_pro/ui/components/select"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@ims_pro/ui/components/dropdown-menu"
import { useCustomers, useDevices, useRelationships } from '@/lib/hooks/useDomain';
import { Customer, Device } from '@/lib/types/domain';
import { useQuery } from '@tanstack/react-query';
import { InlineErrorState } from '@/components/ui/inline-error-state';

interface CustomerFormValues {
  name: string;
  type: CustomerType;
  email?: string;
  phone?: string;
  address?: string;
  taxId?: string;
}

const DeviceAuditTimelineModal = ({
  deviceId,
  deviceIdentifier,
  isOpen,
  onClose
}: {
  deviceId: string;
  deviceIdentifier: string;
  isOpen: boolean;
  onClose: () => void;
}) => {
  const [logs, setLogs] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    if (isOpen && deviceId) {
      setIsLoading(true);
      apiClient.get<any[]>(`/api/devices/${deviceId}/audit-logs`)
        .then(res => {
          setLogs(res || []);
        })
        .catch(err => {
          console.error("Failed to load audit logs", err);
        })
        .finally(() => {
          setIsLoading(false);
        });
    }
  }, [isOpen, deviceId]);

  return (
    <Dialog open={isOpen} onOpenChange={(open) => { if (!open) onClose(); }}>
      <DialogContent className="surface-card p-6 rounded-2xl max-w-xl w-full max-h-[80vh] flex flex-col border-0 overflow-hidden" showCloseButton={true}>
        <DialogHeader className="text-left space-y-0.5 shrink-0">
          <DialogTitle className="text-sm font-extrabold tracking-tight text-foreground p-0 flex items-center gap-2 select-none">
            <span className="material-symbols-outlined text-primary text-base select-none">history</span>
            Audit Log Timeline: {deviceIdentifier}
          </DialogTitle>
          <DialogDescription className="text-[11px] text-muted-foreground mt-0.5">
            Historical trace records captured in the device lifecycle audit log.
          </DialogDescription>
        </DialogHeader>

        <div className="flex-1 overflow-y-auto mt-4 pr-1 scrollbar-custom space-y-3 min-h-[200px]">
          {isLoading ? (
            <ListSkeleton rows={3} />
          ) : logs.length > 0 ? (
            <div className="relative border-l border-border ml-2.5 pl-4 space-y-4 py-1">
              {logs.map((log) => (
                <div key={log.id} className="relative flex flex-col gap-1 text-xs">
                  <span className="absolute -left-[21.5px] top-1 h-2.5 w-2.5 rounded-full border border-primary/20 bg-card flex items-center justify-center">
                    <span className="h-1 w-1 bg-primary rounded-full" />
                  </span>
                  <div className="flex items-center justify-between gap-4">
                    <span className="font-bold text-foreground inline-flex items-center gap-1">
                      <span className="px-1 py-0.5 rounded bg-primary/10 border border-border text-[9px] font-mono tracking-wider text-primary uppercase">{log.actionType}</span>
                    </span>
                    <span className="text-[10px] text-muted-foreground font-mono">
                      {new Date(log.createdAt).toLocaleDateString(undefined, {
                        month: 'short',
                        day: 'numeric',
                        hour: '2-digit',
                        minute: '2-digit'
                      })}
                    </span>
                  </div>
                  <p className="text-muted-foreground text-[11px] leading-relaxed">{log.details}</p>
                  {log.userId && (
                    <span className="text-[9px] text-muted-foreground/60 italic inline-flex items-center gap-0.5">
                      <span className="material-symbols-outlined text-[10px]">person</span>
                      Operator ID: {log.userId}
                    </span>
                  )}
                </div>
              ))}
            </div>
          ) : (
            <div className="text-center py-10 text-xs text-muted-foreground italic select-none">
              No audit logs found for this device.
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
};

export const Customers = () => {
  const { toast, confirm } = useFeedback();
  const navigate = useNavigate();
  const [activeHistoryTab, setActiveHistoryTab] = useState<'dispatched' | 'returned'>('dispatched');
  const [selectedAuditDevice, setSelectedAuditDevice] = useState<{ id: string; identifier: string } | null>(null);

  const { data: devices = [] } = useDevices();
  const { data: relationships = [] } = useRelationships();
  const {
    data: customers = [],
    isLoading,
    isError: isCustomersError,
    error: customersError,
    refetch: fetchCustomers
  } = useCustomers();
  const [search, setSearch] = useState('');
  const [currentPage, setCurrentPage] = useState(1);
  const pageSize = 10;
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

  const handleReturnDevice = async (dev: Device) => {
    const isConfirmed = await confirm({
      title: 'Return Device to Stock?',
      message: `Are you sure you want to return device '${dev.identifier}' to warehouse stock? This will clear its customer assignment.`
    });
    if (!isConfirmed) return;

    try {
      const cleanMetadata = { ...(dev.metadata || {}) };
      delete cleanMetadata.customerName;
      delete cleanMetadata.dispatchedAt;

      await apiClient.put(`/api/devices/${dev.id}`, {
        identifier: dev.identifier,
        modelId: dev.modelId,
        status: 'IN_STOCK',
        customerId: null,
        metadata: cleanMetadata
      });

      toast.success(`Device '${dev.identifier}' successfully returned to stock.`);
      refetchHistory();
      fetchCustomers();
    } catch (e: unknown) {
      const error = e as Error;
      console.error(error);
      toast.error(error.message || 'An unexpected error occurred while returning the device.');
    }
  };

  const filteredCustomers = useMemo(() => {
    return customers.filter(c => 
      c.name.toLowerCase().includes(search.toLowerCase()) ||
      c.email?.toLowerCase().includes(search.toLowerCase()) ||
      c.taxId?.toLowerCase().includes(search.toLowerCase())
    );
  }, [customers, search]);

  useEffect(() => {
    setCurrentPage(1);
  }, [search]);

  const totalPages = Math.ceil(filteredCustomers.length / pageSize);
  const startIndex = (currentPage - 1) * pageSize;
  const endIndex = startIndex + pageSize;
  const paginatedCustomers = useMemo(() => {
    return filteredCustomers.slice(startIndex, endIndex);
  }, [filteredCustomers, startIndex, endIndex]);

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
                className="inline-flex items-center justify-center rounded-lg text-xs font-bold transition-all border border-border bg-primary/5 hover:bg-primary/15 text-foreground h-9 w-9 cursor-pointer"
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
            <div className="flex items-center gap-3 shrink-0">
              <button 
                onClick={() => navigate({ to: "/dispatch", search: { customer: selectedCustomer.id } })}
                className="inline-flex items-center justify-center whitespace-nowrap rounded-lg text-xs font-bold transition-all border border-border bg-primary/5 hover:bg-primary/15 text-foreground h-9 px-4 gap-1.5 cursor-pointer"
              >
                <span className="material-symbols-outlined text-sm">local_shipping</span> Allocate Devices
              </button>
              <button 
                onClick={() => handleOpenModal(selectedCustomer)}
                className="inline-flex items-center justify-center whitespace-nowrap rounded-lg text-xs font-bold transition-all bg-primary text-primary-foreground shadow hover:brightness-110 h-9 px-4 cursor-pointer"
              >
                Edit Profile
              </button>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div className="md:col-span-1 space-y-6">
              <div className="surface-card p-6 rounded-2xl space-y-4">
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
              <div className="surface-card rounded-2xl overflow-hidden shadow-sm">
                <div className="bg-card/60 p-4 border-b border-border flex items-center justify-between">
                  <h3 className="text-sm font-extrabold text-foreground flex items-center gap-2">
                    <span className="material-symbols-outlined text-sm text-primary">history</span>
                    Device Distribution History
                  </h3>
                </div>
                
                <div className="p-0">
                  <div className="flex border-b border-border px-4">
                    <button
                      onClick={() => setActiveHistoryTab('dispatched')}
                      className={`px-4 py-2.5 text-xs font-bold uppercase tracking-wider border-b-2 cursor-pointer transition-all ${
                        activeHistoryTab === 'dispatched'
                          ? 'border-primary text-primary'
                          : 'border-transparent text-muted-foreground hover:text-foreground'
                      }`}
                    >
                      Currently Dispatched ({history.dispatched.length})
                    </button>
                    <button
                      onClick={() => setActiveHistoryTab('returned')}
                      className={`px-4 py-2.5 text-xs font-bold uppercase tracking-wider border-b-2 cursor-pointer transition-all ${
                        activeHistoryTab === 'returned'
                          ? 'border-primary text-primary'
                          : 'border-transparent text-muted-foreground hover:text-foreground'
                      }`}
                    >
                      Return History ({history.returned.length})
                    </button>
                  </div>

                  <div className="divide-y divide-primary/10">
                    {isHistoryLoading ? (
                      <ListSkeleton rows={3} className="p-2" />
                    ) : isHistoryError ? (
                      <div className="p-4">
                        <InlineErrorState
                          title="Distribution history failed to load"
                          description="The customer profile loaded, but the device distribution history request failed."
                          error={historyError}
                          onRetry={() => refetchHistory()}
                        />
                      </div>
                    ) : activeHistoryTab === 'dispatched' ? (
                      history.dispatched.length > 0 ? (
                        history.dispatched.map((dev: Device) => {
                          const childRels = relationships.filter(r => r.primaryDeviceId === dev.id);
                          return (
                            <div key={dev.id} className="p-4 flex flex-col gap-3 hover:bg-primary/5 transition-colors">
                              <div className="flex items-center justify-between gap-4">
                                <div className="flex items-center gap-4">
                                  <div className="h-9 w-9 rounded-lg bg-primary/10 flex items-center justify-center shrink-0">
                                    <span className="material-symbols-outlined text-sm text-primary">inventory_2</span>
                                  </div>
                                  <div>
                                    <p className="text-sm font-mono font-bold text-foreground">{dev.identifier}</p>
                                    <p className="text-[10px] text-primary uppercase font-extrabold">{dev.modelName}</p>
                                  </div>
                                </div>
                                <div className="flex items-center gap-1.5 shrink-0">
                                  <button
                                    onClick={() => setSelectedAuditDevice({ id: dev.id || '', identifier: dev.identifier })}
                                    className="inline-flex items-center justify-center text-muted-foreground hover:text-primary transition-colors h-7 w-7 rounded-lg hover:bg-primary/5 cursor-pointer"
                                    title="View audit timeline"
                                  >
                                    <span className="material-symbols-outlined text-xs">history</span>
                                  </button>
                                  <button
                                    onClick={() => navigate({ to: "/qc", search: { qcDevice: dev.id } })}
                                    className="inline-flex items-center justify-center text-muted-foreground hover:text-amber-500 transition-colors h-7 w-7 rounded-lg hover:bg-amber-500/5 cursor-pointer"
                                    title="Run QC diagnostics test"
                                  >
                                    <span className="material-symbols-outlined text-xs">construction</span>
                                  </button>
                                  <button
                                    onClick={() => navigate({ to: "/swaps", search: { swapOldDevice: dev.id } })}
                                    className="inline-flex items-center justify-center text-muted-foreground hover:text-primary transition-colors h-7 w-7 rounded-lg hover:bg-primary/5 cursor-pointer"
                                    title="Swap / Replace device"
                                  >
                                    <span className="material-symbols-outlined text-xs">sync</span>
                                  </button>
                                  <button
                                    onClick={() => handleReturnDevice(dev)}
                                    className="inline-flex items-center justify-center text-muted-foreground hover:text-red-400 transition-colors h-7 w-7 rounded-lg hover:bg-red-500/5 cursor-pointer"
                                    title="Return device to warehouse stock"
                                  >
                                    <span className="material-symbols-outlined text-xs">keyboard_return</span>
                                  </button>
                                </div>
                              </div>

                              {/* Detailed inline child accessories list */}
                              {childRels.length > 0 && (
                                <div className="pl-13 flex flex-col gap-1.5 max-w-xl">
                                  <p className="text-[8px] font-bold text-muted-foreground uppercase tracking-widest leading-none">Linked Component Bundle</p>
                                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                                    {childRels.map(rel => {
                                      const childDev = devices.find(d => d.id === rel.linkedDeviceId);
                                      if (!childDev) return null;
                                      let detailStr = '';
                                      if (childDev.type === 'SIM') {
                                        detailStr = `${childDev.metadata?.carrier || 'SIM'}${childDev.metadata?.phoneNumber ? ` (${childDev.metadata.phoneNumber})` : ''}`;
                                      } else if (childDev.type === 'SD_CARD') {
                                        detailStr = `SD: ${childDev.metadata?.capacity || 'SD Card'}`;
                                      } else {
                                        detailStr = `${childDev.type || 'Accessory'}`;
                                      }
                                      return (
                                        <div key={rel.id} className="text-[9px] font-medium text-muted-foreground bg-primary/5 border border-border rounded-lg p-2 flex flex-col gap-0.5">
                                          <div className="flex items-center justify-between">
                                            <span className="font-mono text-foreground font-bold">{childDev.identifier}</span>
                                            <span className="text-[8px] font-semibold text-primary uppercase">{childDev.type}</span>
                                          </div>
                                          <div className="text-[8px] text-muted-foreground font-sans flex justify-between">
                                            <span>{childDev.modelName}</span>
                                            {detailStr && <span className="text-muted-foreground/80">{detailStr}</span>}
                                          </div>
                                        </div>
                                      );
                                    })}
                                  </div>
                                </div>
                              )}
                            </div>
                          );
                        })
                      ) : (
                        <div className="p-4">
                          <EmptyState
                            icon="inventory_2"
                            title="No Active Dispatches"
                            description="There are currently no active hardware devices assigned to this customer fleet."
                            className="border-0 bg-transparent py-8"
                          />
                        </div>
                      )
                    ) : (
                      history.returned.length > 0 ? (
                        history.returned.map((dev: Device) => (
                          <div key={dev.id} className="p-4 flex items-center justify-between hover:bg-primary/5 transition-colors border-b border-primary/5 last:border-0">
                            <div className="flex items-center gap-4">
                              <div className="h-9 w-9 rounded-lg bg-primary/5 border border-border flex items-center justify-center shrink-0 text-muted-foreground">
                                <span className="material-symbols-outlined text-sm">assignment_return</span>
                              </div>
                              <div className="space-y-0.5">
                                <p className="text-sm font-mono font-bold text-foreground">{dev.identifier}</p>
                                <div className="flex flex-wrap items-center gap-2">
                                  <span className="text-[9px] text-primary uppercase font-extrabold">{dev.modelName}</span>
                                  {dev.metadata?.defectReason && (
                                    <span className="inline-flex items-center text-[9px] font-bold text-red-400 bg-red-500/10 border border-red-500/20 px-1 py-0.25 rounded">
                                      {dev.metadata.defectReason}
                                    </span>
                                  )}
                                  {dev.metadata?.notes && (
                                    <span className="text-[9px] text-muted-foreground italic truncate max-w-[200px]">
                                      Notes: {dev.metadata.notes}
                                    </span>
                                  )}
                                </div>
                              </div>
                            </div>
                            <div className="text-right space-y-1 flex items-center gap-2 shrink-0">
                              <div className="text-right space-y-0.5">
                                <div className="flex items-center gap-1 text-[10px] text-muted-foreground justify-end">
                                  <span className="material-symbols-outlined text-[10px]">calendar_today</span>
                                  <span>Returned: {dev.metadata?.swappedAt ? new Date(dev.metadata.swappedAt as any).toLocaleDateString() : dev.updatedAt ? new Date(dev.updatedAt as any).toLocaleDateString() : 'Unknown'}</span>
                                </div>
                                {dev.metadata?.swappedBy && (
                                  <p className="text-[9px] text-muted-foreground italic font-sans">Tech: {dev.metadata.swappedBy}</p>
                                )}
                              </div>
                              <button
                                onClick={() => setSelectedAuditDevice({ id: dev.id || '', identifier: dev.identifier })}
                                className="inline-flex items-center justify-center text-muted-foreground hover:text-primary transition-colors h-7 w-7 rounded-lg hover:bg-primary/5 cursor-pointer"
                                title="View audit timeline"
                              >
                                <span className="material-symbols-outlined text-xs">history</span>
                              </button>
                            </div>
                          </div>
                        ))
                      ) : (
                        <div className="p-4">
                          <EmptyState
                            icon="assignment_return"
                            title="No Return History"
                            description="There are no registered returns or swaps recorded in this fleet's historical registry."
                            className="border-0 bg-transparent py-8"
                          />
                        </div>
                      )
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
    <PortalPageShell
      eyebrow="Registry"
      title="Customer management"
      subtitle="Corporate fleets and individual operators for hardware distribution."
      className="max-w-6xl mx-auto"
      actions={
        <div className="flex items-center gap-3">
          <div className="relative w-full md:w-64">
            <span className="material-symbols-outlined text-sm text-muted-foreground absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none">search</span>
            <PortalInput
              placeholder="Search customers..."
              className="pl-9"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
          </div>
          <PortalButton onClick={() => handleOpenModal()}>
            <span className="material-symbols-outlined text-sm mr-1.5">add</span>
            Add customer
          </PortalButton>
        </div>
      }
    >

        <Stagger className="grid grid-cols-1 md:grid-cols-3 gap-4 select-none">
          <StaggerItem className="surface-card p-5 rounded-xl space-y-2 text-left">
            <p className="text-[10px] font-mono text-muted-foreground uppercase tracking-widest">Fleet Accounts</p>
            <p className="text-2xl font-black text-foreground">
              {customers.length}
            </p>
            <p className="text-[9px] text-muted-foreground uppercase tracking-wider font-mono">
              {customers.filter(c => c.type === 'COMPANY').length} Companies / {customers.filter(c => c.type === 'PERSON').length} Operators
            </p>
          </StaggerItem>
          <StaggerItem className="surface-card p-5 rounded-xl space-y-2 text-left">
            <p className="text-[10px] font-mono text-muted-foreground uppercase tracking-widest">Active Deployed Assets</p>
            <p className="text-2xl font-serif text-[var(--status-info-fg)]">
              {devices.filter(d => d.status === 'DISPATCHED').length}
            </p>
            <p className="text-[9px] text-muted-foreground uppercase tracking-wider font-mono">Units Deployed in Field</p>
          </StaggerItem>
          <StaggerItem className="surface-card p-5 rounded-xl space-y-2 text-left">
            <p className="text-[10px] font-mono text-muted-foreground uppercase tracking-widest">Fleet RMA Rate</p>
            <p className="text-2xl font-black text-red-400">
              {devices.filter(d => d.status === 'DISPATCHED').length > 0
                ? ((devices.filter(d => d.status === 'DAMAGED').length / devices.filter(d => d.status === 'DISPATCHED').length) * 100).toFixed(1)
                : '0.0'}%
            </p>
            <p className="text-[9px] text-muted-foreground uppercase tracking-wider font-mono">
              {devices.filter(d => d.status === 'DAMAGED').length} Active Damaged Units
            </p>
          </StaggerItem>
        </Stagger>

        <StaggerItem>
        <div className="surface-card rounded-xl overflow-x-auto overflow-y-visible">
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
                <TableSkeleton
                  bodyOnly
                  rows={5}
                  showHeader={false}
                  columns={[
                    { width: "w-full" },
                    { width: "w-full" },
                    { width: "w-full" },
                    { width: "w-full" },
                    { width: "w-8", align: "right", type: "icon" },
                  ]}
                />
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
                paginatedCustomers.map((customer) => (
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
          {filteredCustomers.length > 0 && (
            <div className="flex items-center justify-between px-4 py-3 border-t border-border bg-transparent">
              <div className="text-xs text-muted-foreground">
                Showing <span className="font-semibold text-foreground">{startIndex + 1}</span> to{' '}
                <span className="font-semibold text-foreground">{Math.min(endIndex, filteredCustomers.length)}</span> of{' '}
                <span className="font-semibold text-foreground">{filteredCustomers.length}</span> customers
              </div>
              <div className="flex items-center gap-1.5">
                <button
                  type="button"
                  onClick={() => setCurrentPage(prev => Math.max(prev - 1, 1))}
                  disabled={currentPage === 1}
                  className="inline-flex items-center justify-center whitespace-nowrap rounded-lg text-xs font-bold transition-all border border-border bg-primary/5 hover:bg-primary/15 text-foreground disabled:opacity-30 disabled:pointer-events-none h-8 px-3 cursor-pointer"
                >
                  Previous
                </button>
                
                {Array.from({ length: totalPages }).map((_, i) => {
                  const pageNum = i + 1;
                  if (
                    pageNum === 1 ||
                    pageNum === totalPages ||
                    Math.abs(pageNum - currentPage) <= 1
                  ) {
                    return (
                      <button
                        key={pageNum}
                        type="button"
                        onClick={() => setCurrentPage(pageNum)}
                        className={`inline-flex items-center justify-center rounded-lg text-xs font-bold h-8 w-8 transition-colors cursor-pointer ${
                          currentPage === pageNum
                            ? 'bg-primary text-primary-foreground'
                            : 'border border-border bg-primary/5 text-foreground hover:bg-primary/15'
                        }`}
                      >
                        {pageNum}
                      </button>
                    );
                  }
                  if (pageNum === 2 || pageNum === totalPages - 1) {
                    return <span key={pageNum} className="text-muted-foreground px-1 text-xs">...</span>;
                  }
                  return null;
                }).filter((el, idx, arr) => {
                  if (el?.type === 'span' && arr[idx - 1]?.type === 'span') return false;
                  return true;
                })}

                <button
                  type="button"
                  onClick={() => setCurrentPage(prev => Math.min(prev + 1, totalPages))}
                  disabled={currentPage === totalPages || totalPages === 0}
                  className="inline-flex items-center justify-center whitespace-nowrap rounded-lg text-xs font-bold transition-all border border-border bg-primary/5 hover:bg-primary/15 text-foreground disabled:opacity-30 disabled:pointer-events-none h-8 px-3 cursor-pointer"
                >
                  Next
                </button>
              </div>
            </div>
          )}
        </div>
        </StaggerItem>

      <Dialog open={isModalOpen} onOpenChange={setIsModalOpen}>
        <DialogContent className="surface-card max-w-lg w-full overflow-hidden border-0 p-0" showCloseButton={true}>
          <DialogHeader className="p-6 border-b border-border bg-card/60 text-left space-y-0.5">
            <DialogTitle className="text-lg font-extrabold text-foreground p-0">{selectedCustomer ? 'Edit Customer Profile' : 'Register New Customer'}</DialogTitle>
            <DialogDescription className="text-xs text-muted mt-0.5">Capture essential details for device allocation and tracking.</DialogDescription>
          </DialogHeader>

            <form onSubmit={handleSubmit(onSubmit)} className="p-6 space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="col-span-2 space-y-1.5">
                  <label className="text-xs font-semibold text-muted-foreground block">Customer Name / Entity</label>
                  <input 
                    {...register('name')} 
                    placeholder="e.g. Acme Corp or John Doe" 
                    className="flex h-9 w-full rounded-lg border border-border bg-primary/5 px-3 py-1 text-sm shadow-sm focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-primary/20 text-foreground"
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
                        <SelectTrigger className="w-full text-xs h-9 bg-primary/5 border border-border rounded-lg text-foreground focus:ring-primary/20">
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
                    className="flex h-9 w-full rounded-lg border border-border bg-primary/5 px-3 py-1 text-sm shadow-sm focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-primary/20 text-foreground"
                  />
                </div>

                <div className="space-y-1.5">
                  <label className="text-xs font-semibold text-muted-foreground block">Email Address</label>
                  <input 
                    {...register('email')} 
                    placeholder="contact@example.com" 
                    className="flex h-9 w-full rounded-lg border border-border bg-primary/5 px-3 py-1 text-sm shadow-sm focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-primary/20 text-foreground"
                  />
                  {errors.email && <p className="text-[10px] text-red-400 font-bold">{errors.email.message as string}</p>}
                </div>

                <div className="space-y-1.5">
                  <label className="text-xs font-semibold text-muted-foreground block">Phone Number</label>
                  <input 
                    {...register('phone')} 
                    placeholder="+1 (555) 000-0000" 
                    className="flex h-9 w-full rounded-lg border border-border bg-primary/5 px-3 py-1 text-sm shadow-sm focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-primary/20 text-foreground"
                  />
                </div>

                <div className="col-span-2 space-y-1.5">
                  <label className="text-xs font-semibold text-muted-foreground block">Physical Address</label>
                  <textarea 
                    {...register('address')}
                    className="flex min-h-[80px] w-full rounded-lg border border-border bg-primary/5 px-3 py-2 text-sm focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-primary/20 text-foreground"
                    placeholder="Street, City, Zip Code..."
                  />
                </div>
              </div>

              <div className="pt-4 flex items-center justify-end gap-3 border-t border-border">
                <button 
                  type="button" 
                  onClick={() => setIsModalOpen(false)}
                  className="inline-flex items-center justify-center whitespace-nowrap rounded-lg text-xs font-bold transition-all border border-border bg-card/60 text-muted-foreground hover:text-foreground hover:bg-primary/5 h-9 px-4 cursor-pointer"
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

      {selectedAuditDevice && (
        <DeviceAuditTimelineModal
          deviceId={selectedAuditDevice.id}
          deviceIdentifier={selectedAuditDevice.identifier}
          isOpen={!!selectedAuditDevice}
          onClose={() => setSelectedAuditDevice(null)}
        />
      )}
    </PortalPageShell>
  );
};



import { useState, useEffect } from 'react';
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
} from "../ui/select"
import { Checkbox } from "../ui/checkbox"
import {
  Table,
  TableHeader,
  TableBody,
  TableRow,
  TableHead,
  TableCell,
} from "../ui/table"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "../ui/dropdown-menu"

const modelSchema = z.object({
  name: z.string()
    .min(2, "Model name must be at least 2 characters")
    .max(50, "Model name is too long"),
  brand: z.string()
    .min(2, "Brand must be at least 2 characters")
    .max(50, "Brand is too long"),
  assetType: z.string().min(1, "Asset classification is required"),
  allowedChildren: z.array(z.string()).default([]),
  maxStock: z.coerce.number().int().min(0).default(0),
  identifierPattern: z.string().optional(),
});

interface DeviceModel {
  id: string;
  name: string;
  brand: string;
  assetType: string;
  allowedChildren: string[];
  maxStock: number;
  identifierPattern?: string;
}

export const DeviceModels = () => {
  const { toast, confirm } = useFeedback();
  const [models, setModels] = useState<DeviceModel[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isAdding, setIsAdding] = useState(false);
  
  const [viewModalModel, setViewModalModel] = useState<DeviceModel | null>(null);
  const [editingModelId, setEditingModelId] = useState<string | null>(null);

  // Pagination State
  const [currentPage, setCurrentPage] = useState(1);
  const pageSize = 10;

  // Load polymorphic options from localStorage
  const [polymorphicOptions, setPolymorphicOptions] = useState<string[]>([]);

  useEffect(() => {
    const stored = localStorage.getItem('ims_polymorphic_link_options');
    if (stored) {
      try {
        setPolymorphicOptions(JSON.parse(stored));
      } catch (e) {
        setPolymorphicOptions(['SIM', 'SD_CARD', 'PANIC_BUTTON', 'KEYFOB']);
      }
    } else {
      const defaults = ['SIM', 'SD_CARD', 'PANIC_BUTTON', 'KEYFOB'];
      localStorage.setItem('ims_polymorphic_link_options', JSON.stringify(defaults));
      setPolymorphicOptions(defaults);
    }
  }, [isAdding]);

  useEffect(() => {
    setCurrentPage(1);
  }, [models.length]);

  const startIndex = (currentPage - 1) * pageSize;
  const endIndex = startIndex + pageSize;
  const paginatedModels = models.slice(startIndex, endIndex);
  const totalPages = Math.ceil(models.length / pageSize);

  const { register, handleSubmit, watch, setValue, control, formState: { errors }, reset } = useForm({
    resolver: zodResolver(modelSchema),
    defaultValues: {
      name: '',
      brand: '',
      assetType: 'TRACKER',
      allowedChildren: [] as string[],
      maxStock: 0,
      identifierPattern: '',
    }
  });

  const selectedChildren = watch('allowedChildren') || [];

  useEffect(() => {
    fetchModels();
  }, []);

  const fetchModels = async () => {
    setIsLoading(true);
    try {
      const res = await fetch('http://localhost:3002/api/device-models');
      const data = await res.json();
      setModels(data);
    } catch (e) {
      console.error(e);
    } finally {
      setIsLoading(false);
    }
  };

  const onSubmit = async (values: z.infer<typeof modelSchema>) => {
    try {
      const url = editingModelId 
        ? `http://localhost:3002/api/device-models/${editingModelId}` 
        : 'http://localhost:3002/api/device-models';
      const method = editingModelId ? 'PUT' : 'POST';

      const res = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: values.name,
          brand: values.brand,
          assetType: values.assetType,
          allowedChildren: values.allowedChildren || [],
          maxStock: values.maxStock ?? 0,
          identifierPattern: values.identifierPattern || null,
        }),
      });
      if (res.ok) {
        reset();
        setEditingModelId(null);
        setIsAdding(false);
        fetchModels();
      }
    } catch (e) {
      console.error(e);
    }
  };

  const handleDelete = async (id: string) => {
    const isConfirmed = await confirm({
      title: 'Delete Model Template?',
      message: 'Are you sure you want to delete this model template?'
    });
    if (!isConfirmed) return;
    try {
      const res = await fetch(`http://localhost:3002/api/device-models/${id}`, {
        method: 'DELETE',
      });
      if (res.ok) {
        toast.success('Model template deleted successfully');
        fetchModels();
      } else {
        toast.error('Failed to delete model template');
      }
    } catch (e) {
      console.error(e);
      toast.error('An unexpected error occurred while deleting the model template.');
    }
  };

  const handleOpenEditModal = (model: DeviceModel) => {
    setEditingModelId(model.id);
    setValue('name', model.name);
    setValue('brand', model.brand);
    setValue('assetType', model.assetType);
    setValue('allowedChildren', model.allowedChildren);
    setValue('maxStock', model.maxStock ?? 0);
    setValue('identifierPattern', model.identifierPattern || '');
    setIsAdding(true);
  };

  const toggleChildType = (type: string) => {
    if (selectedChildren.includes(type)) {
      setValue('allowedChildren', selectedChildren.filter((c) => c !== type));
    } else {
      setValue('allowedChildren', [...selectedChildren, type]);
    }
  };

  return (
    <div className="flex flex-col gap-6 max-w-5xl mx-auto w-full">
        <div className="flex justify-between items-center">
          <div>
            <h2 className="text-2xl font-extrabold tracking-tight text-[#d8e2fd]">Device Models</h2>
            <p className="text-sm text-[#bec8ce] mt-1">Configure hardware templates and relationship rules.</p>
          </div>
          <button
            onClick={() => { reset(); setEditingModelId(null); setIsAdding(true); }}
            className="inline-flex items-center justify-center whitespace-nowrap rounded-lg text-xs font-bold transition-all bg-primary text-[#081326] shadow hover:brightness-110 h-9 px-4 gap-1.5 cursor-pointer"
          >
            <span className="material-symbols-outlined text-sm">add</span> New Model Template
          </button>
        </div>

        {/* DATA REGION: Data Table View */}
        <div className="glass-panel rounded-xl overflow-visible">
          <div className="w-full overflow-visible">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="px-4">Template Name</TableHead>
                  <TableHead className="px-4">Brand / Manufacturer</TableHead>
                  <TableHead className="px-4">Classification</TableHead>
                  <TableHead className="px-4">Allowed Secondary Components</TableHead>
                  <TableHead className="px-4 text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {isLoading ? (
                  Array.from({ length: 4 }).map((_, index) => (
                    <TableRow key={index} className="animate-pulse">
                      <TableCell className="p-4 align-middle"><Skeleton className="h-4 w-36" /></TableCell>
                      <TableCell className="p-4 align-middle"><Skeleton className="h-4 w-28" /></TableCell>
                      <TableCell className="p-4 align-middle"><Skeleton className="h-5 w-16 rounded" /></TableCell>
                      <TableCell className="p-4 align-middle"><Skeleton className="h-4 w-44" /></TableCell>
                      <TableCell className="p-4 align-middle text-right"><Skeleton className="h-4 w-4 ml-auto" /></TableCell>
                    </TableRow>
                  ))
                ) : paginatedModels.length > 0 ? (
                  paginatedModels.map((model) => (
                    <TableRow key={model.id} className="group hover:bg-primary/5 transition-colors">
                      <TableCell className="p-4 align-middle font-semibold text-[#d8e2fd]">
                        <div>{model.name}</div>
                        {model.identifierPattern && (
                          <div className="text-[10px] text-amber-500 font-mono mt-0.5 font-normal">
                            Pattern: {model.identifierPattern}
                          </div>
                        )}
                      </TableCell>
                      <TableCell className="p-4 align-middle text-[#bec8ce]">{model.brand}</TableCell>
                      <TableCell className="p-4 align-middle">
                        <span className="inline-flex items-center rounded-md border border-primary/20 bg-primary/10 px-2.5 py-0.5 text-xs font-bold text-primary font-mono tracking-wider">
                          {model.assetType}
                        </span>
                      </TableCell>
                      <TableCell className="p-4 align-middle">
                        <div className="flex flex-wrap gap-1">
                          {model.allowedChildren.length > 0 ? (
                            model.allowedChildren.map((child) => (
                              <span
                                key={child}
                                className="bg-primary/5 px-2 py-0.5 rounded text-[10px] text-primary font-bold border border-primary/10 uppercase tracking-wider"
                              >
                                {child}
                              </span>
                            ))
                          ) : (
                            <span className="text-xs text-muted-foreground/60 italic">None (Stand-alone)</span>
                          )}
                        </div>
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
                          <DropdownMenuContent align="end" className="w-32 bg-[#0f1524]/95 backdrop-blur-2xl border border-primary/15 text-[#d8e2fd] rounded-xl p-1 shadow-xl">
                            <DropdownMenuItem
                              onClick={() => setViewModalModel(model)}
                              className="text-xs font-semibold cursor-pointer flex items-center px-2.5 py-2 hover:bg-primary/5 focus:bg-primary/5 rounded-lg transition-colors"
                            >
                              <span className="material-symbols-outlined text-sm mr-2 text-primary">visibility</span> View
                            </DropdownMenuItem>
                            <DropdownMenuItem
                              onClick={() => handleOpenEditModal(model)}
                              className="text-xs font-semibold cursor-pointer flex items-center px-2.5 py-2 hover:bg-primary/5 focus:bg-primary/5 rounded-lg transition-colors"
                            >
                              <span className="material-symbols-outlined text-sm mr-2 text-[#bec8ce]">edit</span> Edit
                            </DropdownMenuItem>
                            <DropdownMenuSeparator className="bg-primary/10 my-1" />
                            <DropdownMenuItem
                              onClick={() => handleDelete(model.id)}
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
                    <TableCell colSpan={5} className="text-center p-8 text-sm text-[#bec8ce]">
                      No hardware templates registered.
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </div>

          {/* Pagination Controls */}
          {models.length > 0 && (
            <div className="flex items-center justify-between px-4 py-3 border-t border-primary/10 bg-transparent">
              <div className="text-xs text-muted-foreground">
                Showing <span className="font-semibold text-foreground">{startIndex + 1}</span> to{' '}
                <span className="font-semibold text-foreground">{Math.min(endIndex, models.length)}</span> of{' '}
                <span className="font-semibold text-foreground">{models.length}</span> templates
              </div>
              <div className="flex items-center gap-1.5">
                <button
                  type="button"
                  onClick={() => {
                    setCurrentPage(prev => Math.max(prev - 1, 1));
                  }}
                  disabled={currentPage === 1}
                  className="inline-flex items-center justify-center whitespace-nowrap rounded-lg text-xs font-bold transition-all border border-primary/10 bg-primary/5 hover:bg-primary/15 text-[#d8e2fd] disabled:opacity-30 disabled:pointer-events-none h-8 px-3 cursor-pointer"
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
                        onClick={() => {
                          setCurrentPage(pageNum);
                        }}
                        className={`inline-flex items-center justify-center rounded-lg text-xs font-bold h-8 w-8 transition-colors cursor-pointer ${
                          currentPage === pageNum
                            ? 'bg-primary text-[#081326]'
                            : 'border border-primary/10 bg-primary/5 text-[#d8e2fd] hover:bg-primary/15'
                        }`}
                      >
                        {pageNum}
                      </button>
                    );
                  }
                  if (
                    pageNum === 2 ||
                    pageNum === totalPages - 1
                  ) {
                    return <span key={pageNum} className="text-[#bec8ce] px-1 text-xs">...</span>;
                  }
                  return null;
                }).filter((el, idx, arr) => {
                  if (el?.type === 'span' && arr[idx - 1]?.type === 'span') return false;
                  return true;
                })}

                <button
                  type="button"
                  onClick={() => {
                    setCurrentPage(prev => Math.min(prev + 1, totalPages));
                  }}
                  disabled={currentPage === totalPages || totalPages === 0}
                  className="inline-flex items-center justify-center whitespace-nowrap rounded-lg text-xs font-bold transition-all border border-primary/10 bg-primary/5 hover:bg-primary/15 text-[#d8e2fd] disabled:opacity-30 disabled:pointer-events-none h-8 px-3 cursor-pointer"
                >
                  Next
                </button>
              </div>
            </div>
          )}
        </div>

        {/* DIALOG MODAL: Create & Edit Form */}
        <Dialog open={isAdding} onOpenChange={(open) => { if (!open) { setIsAdding(false); setEditingModelId(null); } }}>
          <DialogContent className="glass-panel-elevated p-6 rounded-2xl max-w-xl w-full space-y-4 border-0 animate-in fade-in zoom-in-95 duration-150" showCloseButton={true}>
            <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
              <DialogHeader className="text-left space-y-0.5">
                <DialogTitle className="text-lg font-extrabold tracking-tight text-[#d8e2fd] p-0">
                  {editingModelId ? 'Update Hardware Template' : 'Create Hardware Template'}
                </DialogTitle>
                <DialogDescription className="text-xs text-muted-foreground mt-0.5">
                  Configure a hardware template and component relationship rules.
                </DialogDescription>
              </DialogHeader>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="text-xs font-semibold text-[#bec8ce] block mb-1">Model Name</label>
                    <input
                      type="text"
                      placeholder="e.g. Amber Shield V4"
                      {...register('name')}
                      className={`flex h-9 w-full rounded-lg border bg-primary/5 px-3 py-1 text-sm shadow-sm transition-all placeholder:text-muted-foreground/30 focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-primary/20 focus-visible:border-primary/40 text-[#d8e2fd] ${
                        errors.name ? 'border-red-500/50 focus-visible:ring-red-500/20' : 'border-primary/10'
                      }`}
                    />
                    {errors.name && (
                      <p className="text-[10px] text-red-400 mt-1 font-semibold">{errors.name.message}</p>
                    )}
                  </div>
                  <div>
                    <label className="text-xs font-semibold text-[#bec8ce] block mb-1">Brand</label>
                    <input
                      type="text"
                      placeholder="e.g. Amber Connect"
                      {...register('brand')}
                      className={`flex h-9 w-full rounded-lg border bg-primary/5 px-3 py-1 text-sm shadow-sm transition-all placeholder:text-muted-foreground/30 focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-primary/20 focus-visible:border-primary/40 text-[#d8e2fd] ${
                        errors.brand ? 'border-red-500/50 focus-visible:ring-red-500/20' : 'border-primary/10'
                      }`}
                    />
                    {errors.brand && (
                      <p className="text-[10px] text-red-400 mt-1 font-semibold">{errors.brand.message}</p>
                    )}
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="text-xs font-semibold text-[#bec8ce] block mb-1">Asset Classification</label>
                    <Controller
                      control={control}
                      name="assetType"
                      render={({ field }) => (
                        <Select onValueChange={field.onChange} value={field.value}>
                          <SelectTrigger className="w-full text-xs h-9 bg-primary/5 border border-primary/10 rounded-lg text-[#d8e2fd] focus:ring-primary/20">
                            <SelectValue placeholder="Select type..." />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="TRACKER">TRACKER (GPS / OBD)</SelectItem>
                            <SelectItem value="SIM">SIM CARD</SelectItem>
                            <SelectItem value="SD_CARD">SD CARD</SelectItem>
                            <SelectItem value="PANIC_BUTTON">WIRELESS PANIC BUTTON</SelectItem>
                            <SelectItem value="KEYFOB">KEY FOB</SelectItem>
                            <SelectItem value="DASH_CAM">DASH CAM</SelectItem>
                          </SelectContent>
                        </Select>
                      )}
                    />
                  </div>
                  <div>
                    <label className="text-xs font-semibold text-[#bec8ce] block mb-1">
                      Max Stock Target
                    </label>
                    <input
                      type="number"
                      min={0}
                      placeholder="e.g. 200"
                      {...register('maxStock')}
                      className="flex h-9 w-full rounded-lg border border-primary/10 bg-primary/5 px-3 py-1 text-sm shadow-sm focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-primary/20 focus-visible:border-primary/40 text-[#d8e2fd]"
                    />
                    <p className="text-[10px] text-muted-foreground mt-0.5">Used for stock health alerts. Set to 0 to disable.</p>
                  </div>
                </div>

                <div>
                  <label className="text-xs font-semibold text-[#bec8ce] block mb-1">
                    Identifier Barcode Pattern (Regex)
                  </label>
                  <input
                    type="text"
                    placeholder="e.g. ^TRK-\d{6}$"
                    {...register('identifierPattern')}
                    className="flex h-9 w-full rounded-lg border border-primary/10 bg-primary/5 px-3 py-1 text-sm shadow-sm focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-primary/20 focus-visible:border-primary/40 text-[#d8e2fd] font-mono"
                  />
                  <p className="text-[10px] text-muted-foreground mt-0.5">Used to validate scanned identifiers (e.g. SIM cards, trackers). Empty disables validation.</p>
                </div>

                <div>
                  <label className="text-xs font-semibold text-[#bec8ce] block mb-2">
                    Allowed Components (Polymorphic Links)
                  </label>
                  <div className="flex flex-wrap gap-4 p-3 border border-primary/10 rounded-xl bg-primary/5">
                    {polymorphicOptions.map((type) => (
                      <div key={type} className="flex items-center space-x-2">
                        <Checkbox 
                          id={`type-${type}`}
                          checked={selectedChildren.includes(type)}
                          onCheckedChange={() => toggleChildType(type)}
                        />
                        <label 
                          htmlFor={`type-${type}`}
                          className="text-[10px] font-bold leading-none uppercase tracking-wider cursor-pointer select-none text-[#d8e2fd]"
                        >
                          {type}
                        </label>
                      </div>
                    ))}
                  </div>
                  <p className="text-[11px] text-muted-foreground mt-1.5">
                    Defines what secondary assets this device model accepts during linking previews.
                  </p>
                </div>

                <div className="flex gap-2 justify-end pt-2 border-t border-primary/10">
                  <button
                    type="button"
                    onClick={() => { setIsAdding(false); setEditingModelId(null); }}
                    className="inline-flex items-center justify-center whitespace-nowrap rounded-lg text-xs font-bold transition-all border border-primary/10 bg-[#0f1524]/60 text-[#bec8ce] hover:text-[#d8e2fd] hover:bg-primary/5 h-9 px-4 cursor-pointer"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    className="inline-flex items-center justify-center whitespace-nowrap rounded-lg text-xs font-bold transition-all bg-primary text-[#081326] shadow hover:brightness-110 h-9 px-4 cursor-pointer"
                  >
                    {editingModelId ? 'Update Template' : 'Save Template'}
                  </button>
                </div>
              </form>
            </DialogContent>
          </Dialog>

        {/* DIALOG MODAL: View Details Mode */}
        <Dialog open={!!viewModalModel} onOpenChange={(open) => { if (!open) setViewModalModel(null); }}>
          {viewModalModel && (
            <DialogContent className="glass-panel-elevated p-6 rounded-2xl max-w-md w-full space-y-4 border-0 animate-in fade-in zoom-in-95 duration-150" showCloseButton={true}>
              <DialogHeader className="text-left space-y-0.5">
                <DialogTitle className="text-lg font-extrabold tracking-tight text-[#d8e2fd] p-0">Hardware Template Details</DialogTitle>
                <DialogDescription className="text-xs text-muted-foreground mt-0.5">Read-only configuration profile for this device template.</DialogDescription>
              </DialogHeader>

              <div className="space-y-4 text-xs">
                {/* High Density Grid */}
                <div className="grid grid-cols-2 gap-x-6 gap-y-2 border border-primary/10 rounded-xl bg-primary/5 p-3">
                  <div className="flex flex-col justify-center py-1 border-b border-primary/10">
                    <span className="text-[10px] uppercase font-bold text-primary tracking-wider mb-0.5">Model Name</span>
                    <span className="font-bold text-[#d8e2fd] text-xs truncate">{viewModalModel.name}</span>
                  </div>
                  <div className="flex flex-col justify-center py-1 border-b border-primary/10">
                    <span className="text-[10px] uppercase font-bold text-primary tracking-wider mb-0.5">Brand</span>
                    <span className="font-semibold text-[#d8e2fd] text-xs truncate">{viewModalModel.brand}</span>
                  </div>
                  <div className="flex flex-col justify-center py-1 border-b border-primary/10">
                    <span className="text-[10px] uppercase font-bold text-primary tracking-wider mb-0.5">Classification</span>
                    <span>
                      <span className="inline-flex items-center rounded-md border border-primary/20 bg-primary/10 px-1.5 py-0.25 text-[10px] font-bold text-primary font-mono tracking-wider">
                        {viewModalModel.assetType}
                      </span>
                    </span>
                  </div>
                  <div className="flex flex-col justify-center py-1 border-b border-primary/10">
                    <span className="text-[10px] uppercase font-bold text-primary tracking-wider mb-0.5">Max Stock Target</span>
                    <span className="font-semibold text-[#d8e2fd] text-xs">{viewModalModel.maxStock || 'None'}</span>
                  </div>
                  <div className="flex flex-col justify-center py-1 border-b border-primary/10 col-span-2 last:border-0 font-mono">
                    <span className="text-[10px] uppercase font-bold text-primary tracking-wider mb-0.5 font-sans">Barcode Regex</span>
                    <span className="text-[11px] bg-primary/5 px-1.5 py-0.5 rounded border border-primary/10 text-amber-400 break-all">{viewModalModel.identifierPattern || 'None'}</span>
                  </div>
                </div>

                <div className="space-y-1.5 text-left">
                  <span className="text-[10px] uppercase font-bold text-primary tracking-wider block mb-1">Allowed Sub-Components</span>
                  <div className="flex flex-wrap gap-1.5 font-sans">
                    {viewModalModel.allowedChildren && viewModalModel.allowedChildren.length > 0 ? (
                      viewModalModel.allowedChildren.map((child: string) => (
                        <span
                          key={child}
                          className="bg-primary/5 px-2 py-0.5 rounded-md text-[10px] text-primary font-bold border border-primary/10 uppercase tracking-wider"
                        >
                          {child}
                        </span>
                      ))
                    ) : (
                      <span className="text-xs text-muted-foreground italic font-medium">None (Stand-alone asset)</span>
                    )}
                  </div>
                </div>
              </div>

              <div className="flex justify-end pt-2 border-t border-primary/10">
                <button
                  type="button"
                  onClick={() => setViewModalModel(null)}
                  className="inline-flex items-center justify-center whitespace-nowrap rounded-lg text-xs font-bold transition-all border border-primary/10 bg-[#0f1524]/60 text-[#bec8ce] hover:text-[#d8e2fd] hover:bg-primary/5 h-9 px-4 cursor-pointer"
                >
                  Close Detail View
                </button>
              </div>
            </DialogContent>
          )}
        </Dialog>
      </div>
  );
};

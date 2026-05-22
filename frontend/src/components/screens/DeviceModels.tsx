import { useState, useEffect } from 'react';
import { Plus, MoreHorizontal, Eye, Edit2, Trash2, X } from 'lucide-react';
import { AppShell } from '../layout/AppShell';
import { Skeleton } from '../ui/skeleton';
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
});

interface DeviceModel {
  id: string;
  name: string;
  brand: string;
  assetType: string;
  allowedChildren: string[];
  maxStock: number;
}

export const DeviceModels = () => {
  const [models, setModels] = useState<DeviceModel[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isAdding, setIsAdding] = useState(false);
  
  // Row action menu and dialog states
  const [activeMenuId, setActiveMenuId] = useState<string | null>(null);
  const [viewModalModel, setViewModalModel] = useState<DeviceModel | null>(null);
  const [editingModelId, setEditingModelId] = useState<string | null>(null);

  // Pagination State
  const [currentPage, setCurrentPage] = useState(1);
  const pageSize = 10;

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
    if (!confirm('Are you sure you want to delete this model template?')) return;
    try {
      const res = await fetch(`http://localhost:3002/api/device-models/${id}`, {
        method: 'DELETE',
      });
      if (res.ok) {
        fetchModels();
      }
    } catch (e) {
      console.error(e);
    }
  };

  const handleOpenEditModal = (model: DeviceModel) => {
    setEditingModelId(model.id);
    setValue('name', model.name);
    setValue('brand', model.brand);
    setValue('assetType', model.assetType);
    setValue('allowedChildren', model.allowedChildren);
    setValue('maxStock', model.maxStock ?? 0);
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
    <AppShell>
      <div className="flex flex-col gap-6 max-w-5xl mx-auto w-full">
        <div className="flex justify-between items-center">
          <div>
            <h2 className="text-2xl font-semibold tracking-tight">Device Models</h2>
            <p className="text-sm text-muted-foreground mt-1">Configure hardware templates and relationship rules.</p>
          </div>
          <button
            onClick={() => { reset(); setEditingModelId(null); setIsAdding(true); }}
            className="inline-flex items-center justify-center whitespace-nowrap rounded-md text-sm font-medium transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring bg-primary text-primary-foreground shadow hover:bg-primary/90 h-9 px-4 py-2"
          >
            <Plus className="mr-2 h-4 w-4" /> New Model Template
          </button>
        </div>

        {/* DATA REGION: Data Table View */}
        <div className="border border-border rounded-lg bg-card overflow-visible">
          <div className="w-full overflow-visible">
            <table className="w-full text-sm">
              <thead className="bg-muted/50 border-b border-border">
                <tr>
                  <th className="h-10 px-4 text-left font-medium text-muted-foreground">Template Name</th>
                  <th className="h-10 px-4 text-left font-medium text-muted-foreground">Brand / Manufacturer</th>
                  <th className="h-10 px-4 text-left font-medium text-muted-foreground">Classification</th>
                  <th className="h-10 px-4 text-left font-medium text-muted-foreground">Allowed Secondary Components</th>
                  <th className="h-10 px-4 text-right font-medium text-muted-foreground">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {isLoading ? (
                  Array.from({ length: 4 }).map((_, index) => (
                    <tr key={index} className="animate-pulse">
                      <td className="p-4 align-middle"><Skeleton className="h-4 w-36" /></td>
                      <td className="p-4 align-middle"><Skeleton className="h-4 w-28" /></td>
                      <td className="p-4 align-middle"><Skeleton className="h-5 w-16 rounded" /></td>
                      <td className="p-4 align-middle"><Skeleton className="h-4 w-44" /></td>
                      <td className="p-4 align-middle text-right"><Skeleton className="h-4 w-4 ml-auto" /></td>
                    </tr>
                  ))
                ) : paginatedModels.length > 0 ? (
                  paginatedModels.map((model, index) => (
                    <tr key={model.id} className="transition-colors hover:bg-muted/50">
                      <td className="p-4 align-middle font-semibold text-foreground">{model.name}</td>
                      <td className="p-4 align-middle text-muted-foreground">{model.brand}</td>
                      <td className="p-4 align-middle">
                        <span className="inline-flex items-center rounded-full border px-2.5 py-0.5 text-xs font-semibold bg-secondary text-secondary-foreground border-border">
                          {model.assetType}
                        </span>
                      </td>
                      <td className="p-4 align-middle">
                        <div className="flex flex-wrap gap-1">
                          {model.allowedChildren.length > 0 ? (
                            model.allowedChildren.map((child) => (
                              <span
                                key={child}
                                className="bg-muted px-2 py-0.5 rounded text-[10px] text-muted-foreground font-semibold border border-border/80"
                              >
                                {child}
                              </span>
                            ))
                          ) : (
                            <span className="text-xs text-muted-foreground/60 italic">None (Stand-alone)</span>
                          )}
                        </div>
                      </td>
                      <td className="p-4 align-middle text-right overflow-visible relative">
                        <div className="inline-block text-left">
                          <button 
                            onClick={(e) => {
                              e.stopPropagation();
                              setActiveMenuId(activeMenuId === model.id ? null : model.id);
                            }}
                            className="text-muted-foreground hover:text-foreground p-1 hover:bg-muted rounded transition-colors"
                          >
                            <MoreHorizontal className="h-4 w-4" />
                          </button>
                          
                          {activeMenuId === model.id && (
                            <>
                              <div 
                                className="fixed inset-0 z-10" 
                                onClick={() => setActiveMenuId(null)} 
                              />
                              <div className={`absolute right-0 w-32 rounded-md border border-border bg-popover text-popover-foreground shadow-md z-20 py-1 font-sans text-xs text-left ${
                                index >= paginatedModels.length - 2 && paginatedModels.length > 3
                                  ? 'bottom-full mb-1'
                                  : 'mt-1'
                              }`}>
                                <button
                                  onClick={() => {
                                    setActiveMenuId(null);
                                    setViewModalModel(model);
                                  }}
                                  className="w-full text-left px-3 py-1.5 hover:bg-muted transition-colors font-medium flex items-center gap-1.5"
                                >
                                  <Eye className="h-3.5 w-3.5" /> View
                                </button>
                                <button
                                  onClick={() => {
                                    setActiveMenuId(null);
                                    handleOpenEditModal(model);
                                  }}
                                  className="w-full text-left px-3 py-1.5 hover:bg-muted transition-colors font-medium flex items-center gap-1.5"
                                >
                                  <Edit2 className="h-3.5 w-3.5" /> Edit
                                </button>
                                <button
                                  onClick={() => {
                                    setActiveMenuId(null);
                                    handleDelete(model.id);
                                  }}
                                  className="w-full text-left px-3 py-1.5 hover:bg-muted text-destructive hover:bg-destructive/10 transition-colors font-medium flex items-center gap-1.5"
                                >
                                  <Trash2 className="h-3.5 w-3.5" /> Delete
                                </button>
                              </div>
                            </>
                          )}
                        </div>
                      </td>
                    </tr>
                  ))
                ) : (
                  <tr>
                    <td colSpan={5} className="text-center p-8 text-sm text-muted-foreground">
                      No hardware templates registered.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>

          {/* Pagination Controls */}
          {models.length > 0 && (
            <div className="flex items-center justify-between px-4 py-3 border-t border-border bg-muted/20">
              <div className="text-xs text-muted-foreground">
                Showing <span className="font-semibold text-foreground">{startIndex + 1}</span> to{' '}
                <span className="font-semibold text-foreground">{Math.min(endIndex, models.length)}</span> of{' '}
                <span className="font-semibold text-foreground">{models.length}</span> templates
              </div>
              <div className="flex items-center gap-1.5">
                <button
                  type="button"
                  onClick={() => {
                    setActiveMenuId(null);
                    setCurrentPage(prev => Math.max(prev - 1, 1));
                  }}
                  disabled={currentPage === 1}
                  className="inline-flex items-center justify-center rounded-md text-xs font-semibold transition-colors border border-border bg-background shadow-sm hover:bg-accent disabled:opacity-50 disabled:pointer-events-none h-8 px-3"
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
                          setActiveMenuId(null);
                          setCurrentPage(pageNum);
                        }}
                        className={`inline-flex items-center justify-center rounded-md text-xs font-semibold transition-colors h-8 w-8 ${
                          currentPage === pageNum
                            ? 'bg-primary text-primary-foreground shadow'
                            : 'border border-border bg-background hover:bg-accent'
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
                    return <span key={pageNum} className="text-muted-foreground px-1 text-xs">...</span>;
                  }
                  return null;
                }).filter((el, idx, arr) => {
                  if (el?.type === 'span' && arr[idx - 1]?.type === 'span') return false;
                  return true;
                })}

                <button
                  type="button"
                  onClick={() => {
                    setActiveMenuId(null);
                    setCurrentPage(prev => Math.min(prev + 1, totalPages));
                  }}
                  disabled={currentPage === totalPages || totalPages === 0}
                  className="inline-flex items-center justify-center rounded-md text-xs font-semibold transition-colors border border-border bg-background shadow-sm hover:bg-accent disabled:opacity-50 disabled:pointer-events-none h-8 px-3"
                >
                  Next
                </button>
              </div>
            </div>
          )}
        </div>

        {/* DIALOG MODAL: Create & Edit Form */}
        {isAdding && (
          <div 
            className="fixed inset-0 bg-background/80 backdrop-blur-sm z-50 flex items-center justify-center p-4"
            onClick={() => { setIsAdding(false); setEditingModelId(null); }}
          >
            <div 
              className="border border-border p-6 rounded-xl bg-card shadow-lg max-w-xl w-full relative space-y-4 animate-in fade-in zoom-in-95 duration-150"
              onClick={(e) => e.stopPropagation()}
            >
              <button 
                type="button"
                onClick={() => { setIsAdding(false); setEditingModelId(null); }} 
                className="absolute top-4 right-4 text-muted-foreground hover:text-foreground"
              >
                <X className="h-4 w-4" />
              </button>

              <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
                <div>
                  <h3 className="text-lg font-semibold tracking-tight">
                    {editingModelId ? 'Update Hardware Template' : 'Create Hardware Template'}
                  </h3>
                  <p className="text-xs text-muted-foreground mt-0.5">
                    Configure a hardware template and component relationship rules.
                  </p>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="text-xs font-semibold text-muted-foreground block mb-1">Model Name</label>
                    <input
                      type="text"
                      placeholder="e.g. Amber Shield V4"
                      {...register('name')}
                      className={`flex h-9 w-full rounded-md border bg-transparent px-3 py-1 text-sm shadow-sm transition-colors placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring ${
                        errors.name ? 'border-destructive focus-visible:ring-destructive' : 'border-input'
                      }`}
                    />
                    {errors.name && (
                      <p className="text-[10px] text-destructive mt-1 font-semibold">{errors.name.message}</p>
                    )}
                  </div>
                  <div>
                    <label className="text-xs font-semibold text-muted-foreground block mb-1">Brand</label>
                    <input
                      type="text"
                      placeholder="e.g. Amber Connect"
                      {...register('brand')}
                      className={`flex h-9 w-full rounded-md border bg-transparent px-3 py-1 text-sm shadow-sm transition-colors placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring ${
                        errors.brand ? 'border-destructive focus-visible:ring-destructive' : 'border-input'
                      }`}
                    />
                    {errors.brand && (
                      <p className="text-[10px] text-destructive mt-1 font-semibold">{errors.brand.message}</p>
                    )}
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="text-xs font-semibold text-muted-foreground block mb-1">Asset Classification</label>
                    <Controller
                      control={control}
                      name="assetType"
                      render={({ field }) => (
                        <Select onValueChange={field.onChange} value={field.value}>
                          <SelectTrigger className="w-full text-sm h-9 bg-card">
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
                    <label className="text-xs font-semibold text-muted-foreground block mb-1">
                      Max Stock Target
                    </label>
                    <input
                      type="number"
                      min={0}
                      placeholder="e.g. 200"
                      {...register('maxStock')}
                      className="flex h-9 w-full rounded-md border border-input bg-transparent px-3 py-1 text-sm shadow-sm transition-colors placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
                    />
                    <p className="text-[10px] text-muted-foreground mt-0.5">Used for stock health alerts. Set to 0 to disable.</p>
                  </div>
                </div>

                <div>
                  <label className="text-xs font-semibold text-muted-foreground block mb-2">
                    Allowed Components (Polymorphic Links)
                  </label>
                  <div className="flex flex-wrap gap-4 p-3 border border-border rounded-lg bg-muted/10">
                    {['SIM', 'SD_CARD', 'PANIC_BUTTON', 'KEYFOB'].map((type) => (
                      <div key={type} className="flex items-center space-x-2">
                        <Checkbox 
                          id={`type-${type}`}
                          checked={selectedChildren.includes(type)}
                          onCheckedChange={() => toggleChildType(type)}
                        />
                        <label 
                          htmlFor={`type-${type}`}
                          className="text-[10px] font-bold leading-none uppercase tracking-wider cursor-pointer select-none"
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

                <div className="flex gap-2 justify-end pt-2 border-t border-border">
                  <button
                    type="button"
                    onClick={() => { setIsAdding(false); setEditingModelId(null); }}
                    className="inline-flex items-center justify-center whitespace-nowrap rounded-md text-sm font-medium transition-colors border border-input bg-background shadow-sm hover:bg-accent hover:text-accent-foreground h-9 px-4"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    className="inline-flex items-center justify-center whitespace-nowrap rounded-md text-sm font-medium transition-colors bg-primary text-primary-foreground shadow hover:bg-primary/90 h-9 px-4"
                  >
                    {editingModelId ? 'Update Template' : 'Save Template'}
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}

        {/* DIALOG MODAL: View Details Mode */}
        {viewModalModel && (
          <div 
            className="fixed inset-0 bg-background/80 backdrop-blur-sm z-50 flex items-center justify-center p-4"
            onClick={() => setViewModalModel(null)}
          >
            <div 
              className="border border-border p-6 rounded-xl bg-card shadow-lg max-w-md w-full relative space-y-4 animate-in fade-in zoom-in-95 duration-150"
              onClick={(e) => e.stopPropagation()}
            >
              <button 
                type="button"
                onClick={() => setViewModalModel(null)} 
                className="absolute top-4 right-4 text-muted-foreground hover:text-foreground"
              >
                <X className="h-4 w-4" />
              </button>

              <div>
                <h3 className="text-lg font-semibold tracking-tight">Hardware Template Details</h3>
                <p className="text-xs text-muted-foreground mt-0.5">Read-only configuration profile for this device template.</p>
              </div>

              <div className="space-y-3.5 text-sm">
                <div className="grid grid-cols-3 py-1 border-b border-border/40">
                  <span className="text-xs text-muted-foreground font-semibold uppercase tracking-wider">Model Name</span>
                  <span className="col-span-2 font-semibold text-foreground">{viewModalModel.name}</span>
                </div>
                <div className="grid grid-cols-3 py-1 border-b border-border/40">
                  <span className="text-xs text-muted-foreground font-semibold uppercase tracking-wider">Brand</span>
                  <span className="col-span-2 font-medium text-foreground">{viewModalModel.brand}</span>
                </div>
                <div className="grid grid-cols-3 py-1 border-b border-border/40">
                  <span className="text-xs text-muted-foreground font-semibold uppercase tracking-wider">Classification</span>
                  <span className="col-span-2">
                    <span className="inline-flex items-center rounded-full border px-2 py-0.5 text-xs font-semibold bg-secondary text-secondary-foreground border-border">
                      {viewModalModel.assetType}
                    </span>
                  </span>
                </div>
                <div className="space-y-1">
                  <span className="text-xs text-muted-foreground font-semibold uppercase tracking-wider block mb-1">Allowed Sub-Components</span>
                  <div className="flex flex-wrap gap-1.5">
                    {viewModalModel.allowedChildren && viewModalModel.allowedChildren.length > 0 ? (
                      viewModalModel.allowedChildren.map((child: string) => (
                        <span
                          key={child}
                          className="bg-muted px-2 py-0.5 rounded text-[10px] text-muted-foreground font-semibold border border-border"
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

              <div className="flex justify-end pt-2 border-t border-border">
                <button
                  type="button"
                  onClick={() => setViewModalModel(null)}
                  className="inline-flex items-center justify-center whitespace-nowrap rounded-md text-sm font-medium transition-colors border border-input bg-background shadow-sm hover:bg-accent hover:text-accent-foreground h-9 px-4"
                >
                  Close Detail View
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </AppShell>
  );
};

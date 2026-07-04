import React, { useEffect } from 'react';
import { useForm, Controller } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@ims_pro/ui/components/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@ims_pro/ui/components/select';
import { DeviceModel, Device } from '../../../lib/types/domain';
import { apiClient } from '../../../lib/api-client';
import { useFeedback } from '@/components/ui/feedback-provider';
import { playSuccessBeep, playErrorBuzz } from '../../../lib/audio';

interface SingleEntryModalProps {
  isOpen: boolean;
  onClose: () => void;
  models: DeviceModel[];
  editingDevice: Device | null;
  onSuccess: () => void;
}

const createSingleSchema = (modelsList: DeviceModel[]) => {
  return z.object({
    identifier: z.string()
      .min(3, "Identifier must be at least 3 characters")
      .max(40, "Identifier is too long")
      .regex(/^[a-zA-Z0-9\-_]+$/, "Only letters, numbers, dashes, and underscores allowed"),
    modelId: z.string().min(1, "Please select a model template"),
    meta1: z.string().optional(),
    meta2: z.string().optional()
  }).superRefine((data, ctx) => {
    const selectedModel = modelsList.find(m => m.id === data.modelId);
    const assetType = selectedModel ? selectedModel.assetType : 'TRACKER';

    if (assetType === 'SIM') {
      if (!data.meta1 || data.meta1.trim() === '') {
        ctx.addIssue({ path: ['meta1'], code: z.ZodIssueCode.custom, message: "MSISDN phone number is required" });
      }
      if (!data.meta2 || data.meta2.trim() === '') {
        ctx.addIssue({ path: ['meta2'], code: z.ZodIssueCode.custom, message: "Carrier is required" });
      }
    } else if (assetType === 'SD_CARD') {
      if (!data.meta1 || data.meta1.trim() === '') {
        ctx.addIssue({ path: ['meta1'], code: z.ZodIssueCode.custom, message: "Capacity is required" });
      }
      if (!data.meta2 || data.meta2.trim() === '') {
        ctx.addIssue({ path: ['meta2'], code: z.ZodIssueCode.custom, message: "Speed rating is required" });
      }
    }
  });
};

export const SingleEntryModal: React.FC<SingleEntryModalProps> = ({
  isOpen,
  onClose,
  models,
  editingDevice,
  onSuccess,
}) => {
  const { toast } = useFeedback();
  
  const { register, handleSubmit, watch, setValue, control, formState: { errors }, reset, setError } = useForm({
    resolver: zodResolver(createSingleSchema(models)),
    defaultValues: {
      identifier: '',
      modelId: '',
      meta1: '',
      meta2: ''
    }
  });

  const selectedModelId = watch('modelId');
  const selectedModel = models.find(m => m.id === selectedModelId);
  const assetType = selectedModel?.assetType || 'TRACKER';

  useEffect(() => {
    if (editingDevice) {
      setValue('identifier', editingDevice.identifier);
      setValue('modelId', editingDevice.modelId);
      
      if (editingDevice.type === 'SIM') {
        setValue('meta1', editingDevice.metadata?.phoneNumber || '');
        setValue('meta2', editingDevice.metadata?.carrier || '');
      } else if (editingDevice.type === 'SD_CARD') {
        setValue('meta1', editingDevice.metadata?.capacity || '');
        setValue('meta2', editingDevice.metadata?.speedClass || '');
      } else if (editingDevice.type === 'TRACKER') {
        setValue('meta1', editingDevice.metadata?.firmware || '');
        setValue('meta2', editingDevice.metadata?.hwRevision || '');
      } else if (editingDevice.type === 'PANIC_BUTTON') {
        setValue('meta1', editingDevice.metadata?.rfFrequency || '');
        setValue('meta2', editingDevice.metadata?.buttonColor || '');
      } else {
        setValue('meta1', '');
        setValue('meta2', '');
      }
    } else {
      reset({
        identifier: '',
        modelId: models[0]?.id || '',
        meta1: '',
        meta2: ''
      });
    }
  }, [editingDevice, models, setValue, reset, isOpen]);

  const onSubmit = async (values: any) => {
    if (selectedModel?.identifierPattern) {
      try {
        const regex = new RegExp(selectedModel.identifierPattern, 'i');
        if (!regex.test(values.identifier)) {
          setError('identifier', { 
            type: 'manual', 
            message: `Barcode format mismatch. Expected pattern: ${selectedModel.identifierPattern}` 
          });
          playErrorBuzz();
          return;
        }
      } catch (e) {
        console.error('Invalid model pattern regex:', selectedModel.identifierPattern);
      }
    }

    const metadata: Record<string, any> = {};
    if (assetType === 'SIM') {
      metadata.phoneNumber = values.meta1;
      metadata.carrier = values.meta2;
    } else if (assetType === 'SD_CARD') {
      metadata.capacity = values.meta1;
      metadata.speedClass = values.meta2;
    } else if (assetType === 'TRACKER') {
      metadata.firmware = values.meta1;
      metadata.hwRevision = values.meta2;
    } else if (assetType === 'PANIC_BUTTON') {
      metadata.rfFrequency = values.meta1;
      metadata.buttonColor = values.meta2;
    }

    try {
      const path = editingDevice 
        ? `/api/devices/${editingDevice.id}` 
        : '/api/devices';
      const body = {
        identifier: values.identifier,
        modelId: values.modelId,
        status: 'IN_STOCK',
        metadata
      };

      const data = editingDevice 
        ? await apiClient.put<any>(path, body)
        : await apiClient.post<any>(path, body);

      if (data && data.error) {
        setError('identifier', { type: 'manual', message: data.error });
        toast.error(data.error || 'Failed to save device.');
        playErrorBuzz();
        return;
      }
      toast.success(editingDevice ? 'Device updated successfully' : 'Device created successfully');
      playSuccessBeep();
      onSuccess();
      onClose();
    } catch (e) {
      setError('root', { type: 'manual', message: 'Failed to connect to API server.' });
      toast.error('Internal server error occurred while saving the device.');
      playErrorBuzz();
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={(open) => { if (!open) onClose(); }}>
      <DialogContent className="glass-panel-elevated p-6 rounded-2xl max-w-md w-full space-y-4 border-0 animate-in fade-in zoom-in-95 duration-150" showCloseButton={true}>
        <DialogHeader className="text-left space-y-0.5">
          <DialogTitle className="text-lg font-extrabold tracking-tight text-foreground p-0">{editingDevice ? 'Edit Device Properties' : 'Add Single Device'}</DialogTitle>
          <DialogDescription className="hidden">Single Device Entry Form</DialogDescription>
        </DialogHeader>
          
          {errors.root && (
            <div className="bg-red-500/10 text-red-400 text-xs p-2.5 rounded-lg border border-red-500/20 font-medium">
              {errors.root.message as string}
            </div>
          )}

          <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
            <div>
              <label className="text-xs font-semibold text-muted-foreground block mb-1">ISN / IMEI / ICCID</label>
              <input 
                type="text" 
                placeholder="e.g. TRK-982103"
                {...register('identifier')}
                className={`flex h-9 w-full rounded-lg border bg-primary/5 px-3 py-1 text-sm shadow-sm transition-all placeholder:text-muted-foreground/30 focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-primary/20 focus-visible:border-primary/40 text-foreground ${
                  errors.identifier ? 'border-red-500/50 focus-visible:ring-red-500/20' : 'border-primary/10'
                }`}
              />
              {errors.identifier && (
                <p className="text-[10px] text-red-400 mt-1 font-semibold">{errors.identifier.message as string}</p>
              )}
            </div>
            
            <div>
              <label className="text-xs font-semibold text-muted-foreground block mb-1">Device Model Template</label>
              <Controller
                control={control}
                name="modelId"
                render={({ field }) => (
                  <Select onValueChange={field.onChange} value={field.value || ""}>
                    <SelectTrigger className={`w-full text-xs h-9 bg-primary/5 border border-primary/10 rounded-lg text-foreground focus:ring-primary/20 ${errors.modelId ? 'border-red-500/50 focus:ring-red-500/20' : ''}`}>
                      <SelectValue placeholder="Select a model..." />
                    </SelectTrigger>
                    <SelectContent>
                      {models.map(m => (
                        <SelectItem key={m.id} value={m.id}>{m.name} ({m.brand})</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                )}
              />
              {errors.modelId && (
                <p className="text-[10px] text-red-400 mt-1 font-semibold">{errors.modelId.message as string}</p>
              )}
            </div>

            {assetType === 'SIM' && (
              <div className="grid grid-cols-2 gap-3 border-t border-primary/10 pt-3">
                <div>
                  <label className="text-xs font-semibold text-muted-foreground block mb-1">Phone Number (MSISDN)</label>
                  <input 
                    type="text" 
                    placeholder="+1 (868) 555-0199"
                    {...register('meta1')}
                    className={`flex h-9 w-full rounded-lg border bg-primary/5 px-3 py-1 text-xs shadow-sm transition-all placeholder:text-muted-foreground/30 focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-primary/20 focus-visible:border-primary/40 text-foreground ${
                      errors.meta1 ? 'border-red-500/50 focus-visible:ring-red-500/20' : 'border-primary/10'
                    }`}
                  />
                  {errors.meta1 && (
                    <p className="text-[9px] text-red-400 mt-1 font-semibold">{errors.meta1.message as string}</p>
                  )}
                </div>
                <div>
                  <label className="text-xs font-semibold text-muted-foreground block mb-1">Network Carrier</label>
                  <input 
                    type="text" 
                    placeholder="e.g. KORE Wireless"
                    {...register('meta2')}
                    className={`flex h-9 w-full rounded-lg border bg-primary/5 px-3 py-1 text-xs shadow-sm transition-all placeholder:text-muted-foreground/30 focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-primary/20 focus-visible:border-primary/40 text-foreground ${
                      errors.meta2 ? 'border-red-500/50 focus-visible:ring-red-500/20' : 'border-primary/10'
                    }`}
                  />
                  {errors.meta2 && (
                    <p className="text-[9px] text-red-400 mt-1 font-semibold">{errors.meta2.message as string}</p>
                  )}
                </div>
              </div>
            )}

            {assetType === 'TRACKER' && (
              <div className="grid grid-cols-2 gap-3 border-t border-primary/10 pt-3">
                <div>
                  <label className="text-xs font-semibold text-muted-foreground block mb-1">Firmware Version</label>
                  <input 
                    type="text" 
                    placeholder="e.g. v1.2.9"
                    {...register('meta1')}
                    className="flex h-9 w-full rounded-lg border border-primary/10 bg-primary/5 px-3 py-1 text-xs shadow-sm focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-primary/20 focus-visible:border-primary/40 text-foreground placeholder:text-muted-foreground/30"
                  />
                </div>
                <div>
                  <label className="text-xs font-semibold text-muted-foreground block mb-1">Hardware Revision</label>
                  <input 
                    type="text" 
                    placeholder="e.g. REV_C"
                    {...register('meta2')}
                    className="flex h-9 w-full rounded-lg border border-primary/10 bg-primary/5 px-3 py-1 text-xs shadow-sm focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-primary/20 focus-visible:border-primary/40 text-foreground placeholder:text-muted-foreground/30"
                  />
                </div>
              </div>
            )}

            {assetType === 'SD_CARD' && (
              <div className="grid grid-cols-2 gap-3 border-t border-primary/10 pt-3">
                <div>
                  <label className="text-xs font-semibold text-muted-foreground block mb-1">Storage Capacity</label>
                  <input 
                    type="text" 
                    placeholder="e.g. 32GB"
                    {...register('meta1')}
                    className={`flex h-9 w-full rounded-lg border bg-primary/5 px-3 py-1 text-xs shadow-sm transition-all placeholder:text-muted-foreground/30 focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-primary/20 focus-visible:border-primary/40 text-foreground ${
                      errors.meta1 ? 'border-red-500/50 focus-visible:ring-red-500/20' : 'border-primary/10'
                    }`}
                  />
                  {errors.meta1 && (
                    <p className="text-[9px] text-red-400 mt-1 font-semibold">{errors.meta1.message as string}</p>
                  )}
                </div>
                <div>
                  <label className="text-xs font-semibold text-muted-foreground block mb-1">Speed Class</label>
                  <input 
                    type="text" 
                    placeholder="e.g. Class 10 / U3"
                    {...register('meta2')}
                    className={`flex h-9 w-full rounded-lg border bg-primary/5 px-3 py-1 text-xs shadow-sm transition-all placeholder:text-muted-foreground/30 focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-primary/20 focus-visible:border-primary/40 text-foreground ${
                      errors.meta2 ? 'border-red-500/50 focus-visible:ring-red-500/20' : 'border-primary/10'
                    }`}
                  />
                  {errors.meta2 && (
                    <p className="text-[9px] text-red-400 mt-1 font-semibold">{errors.meta2.message as string}</p>
                  )}
                </div>
              </div>
            )}

            {assetType === 'PANIC_BUTTON' && (
              <div className="grid grid-cols-2 gap-3 border-t border-primary/10 pt-3">
                <div>
                  <label className="text-xs font-semibold text-muted-foreground block mb-1">RF Frequency</label>
                  <input 
                    type="text" 
                    placeholder="e.g. 433 MHz"
                    {...register('meta1')}
                    className="flex h-9 w-full rounded-lg border border-primary/10 bg-primary/5 px-3 py-1 text-xs shadow-sm focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-primary/20 focus-visible:border-primary/40 text-foreground placeholder:text-muted-foreground/30"
                  />
                </div>
                <div>
                  <label className="text-xs font-semibold text-muted-foreground block mb-1">Button Color</label>
                  <input 
                    type="text" 
                    placeholder="e.g. Red"
                    {...register('meta2')}
                    className="flex h-9 w-full rounded-lg border border-primary/10 bg-primary/5 px-3 py-1 text-xs shadow-sm focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-primary/20 focus-visible:border-primary/40 text-foreground placeholder:text-muted-foreground/30"
                  />
                </div>
              </div>
            )}

            <div className="flex gap-2 justify-end pt-2">
              <button 
                type="button" 
                onClick={onClose}
                className="inline-flex items-center justify-center whitespace-nowrap rounded-lg text-xs font-bold transition-all border border-primary/10 bg-card/60 text-muted-foreground hover:text-foreground hover:bg-primary/5 h-9 px-4 cursor-pointer"
              >
                Cancel
              </button>
              <button 
                type="submit" 
                className="inline-flex items-center justify-center whitespace-nowrap rounded-lg text-xs font-bold transition-all bg-primary text-primary-foreground shadow hover:brightness-110 active:scale-95 h-9 px-4 cursor-pointer"
              >
                {editingDevice ? 'Save Changes' : 'Add Device'}
              </button>
            </div>
          </form>
        </DialogContent>
      </Dialog>
  );
};


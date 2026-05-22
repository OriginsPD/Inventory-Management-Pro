import { z } from 'zod';
import { AssetType } from './enums.js';

export const DeviceModelSchema = z.object({
  id: z.string().uuid().optional(),
  name: z.string().min(1, 'Name is required'),
  brand: z.string().min(1, 'Brand is required'),
  assetType: AssetType.default('TRACKER'),
  allowedChildren: z.array(AssetType).default([]),
  maxStock: z.number().int().nonnegative().default(0),
  identifierPattern: z.string().optional(),
  createdAt: z.date().optional(),
  updatedAt: z.date().optional(),
});

export type DeviceModel = z.infer<typeof DeviceModelSchema>;

export const CreateDeviceModelSchema = DeviceModelSchema.omit({ id: true, createdAt: true, updatedAt: true });
export type CreateDeviceModel = z.infer<typeof CreateDeviceModelSchema>;

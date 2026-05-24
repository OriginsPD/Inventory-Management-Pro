import { z } from 'zod';
import { DeviceStatus } from './enums.js';

export const DeviceSchema = z.object({
  id: z.string().uuid().optional(),
  identifier: z.string().min(1, 'Identifier is required'), // IMEI, ISN, ICCID
  modelId: z.string().uuid('Invalid model reference'),
  status: DeviceStatus.default('IN_STOCK'),
  customerId: z.string().uuid().nullish(),
  metadata: z.record(z.any()).default({}).optional(),
  createdAt: z.date().optional(),
  updatedAt: z.date().optional(),
});

export type Device = z.infer<typeof DeviceSchema>;

export const CreateDeviceSchema = DeviceSchema.omit({ id: true, createdAt: true, updatedAt: true });
export type CreateDevice = z.infer<typeof CreateDeviceSchema>;

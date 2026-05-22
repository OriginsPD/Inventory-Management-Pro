import { z } from 'zod';

export const AssetType = z.enum([
  'TRACKER',
  'SIM',
  'PERIPHERAL',
  'DASH_CAM',
  'SD_CARD',
  'PANIC_BUTTON',
  'FUEL_SENSOR',
  'KEYFOB',
  'TRAVEL_ADAPTER'
]);

export type AssetType = z.infer<typeof AssetType>;

export const DeviceStatus = z.enum([
  'IN_STOCK',
  'DISPATCHED',
  'TESTING',
  'DAMAGED',
  'REPLACED',
  'PROMOTIONAL',
  'RMA'
]);

export type DeviceStatus = z.infer<typeof DeviceStatus>;

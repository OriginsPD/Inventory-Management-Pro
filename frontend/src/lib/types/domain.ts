import { Device as BaseDevice, Customer } from '@ims-pro/shared';
export type { Customer };

export interface Device extends BaseDevice {
  modelName: string;
  type: string;
  linked: number;
  customerName?: string | null;
}

export interface DeviceModel {
  id: string;
  name: string;
  brand: string;
  assetType: string;
  allowedChildren?: string | string[];
  identifierPattern?: string;
  maxStock?: number;
}

export interface IngestItem {
  identifier: string;
  metadata: Record<string, string | number | boolean | null>;
}

export interface ParsedLink {
  primaryISN: string;
  childISN: string;
  childType: string;
  status: 'valid' | 'invalid';
  message?: string;
  autoCreatePrimary?: string;
  autoCreateChild?: string;
  primaryId?: string;
  childId?: string;
  primaryModelName?: string;
  childModelName?: string;
}

export interface AuditLog {
  id: string;
  deviceId?: string | null;
  deviceIdentifier?: string | null;
  actionType: string;
  details: string;
  createdAt: string;
}

export interface DeviceRelationship {
  id: string;
  primaryDeviceId: string;
  linkedDeviceId: string;
  createdAt: string;
}

export interface StockAlert {
  modelName: string;
  level: string;
  maxStock?: number;
}

export interface DispatchTrend {
  day: string;
  dispatches: number;
}

import { randomUUID } from "crypto";

export interface DeviceModel {
  id: string;
  name: string;
  brand: string;
  assetType: string;
  allowedChildren: string[];
  maxStock?: number;
  identifierPattern?: string;
  createdAt: string;
  updatedAt: string;
}

export interface Device {
  id: string;
  identifier: string;
  modelId: string;
  status: string;
  customerId?: string;
  metadata: Record<string, any>;
  createdAt: string;
  updatedAt: string;
}

export interface Customer {
  id: string;
  name: string;
  type: 'PERSON' | 'COMPANY';
  phone?: string;
  email?: string;
  address?: string;
  taxId?: string;
  metadata: Record<string, any>;
  createdAt: string;
  updatedAt: string;
}

export interface DeviceRelationship {
  id: string;
  primaryDeviceId: string;
  linkedDeviceId: string;
  createdAt: string;
}

export interface AuditLog {
  id: string;
  userId?: string;
  actionType: string;
  details: string;
  createdAt: string;
  deviceId?: string;
  deviceIdentifier?: string;
  customerId?: string;
}

export const mockQcReports: any[] = [];

export const mockDeviceModels: DeviceModel[] = [
  {
    id: "m1",
    name: "Amber Shield V4",
    brand: "Amber Connect",
    assetType: "TRACKER",
    allowedChildren: ["SIM", "SD_CARD", "PANIC_BUTTON"],
    maxStock: 10,
    identifierPattern: "^TRK-\\d{6}$",
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  },
  {
    id: "m2",
    name: "Global IoT SIM Card",
    brand: "KORE Wireless",
    assetType: "SIM",
    allowedChildren: [],
    maxStock: 5,
    identifierPattern: "^SIM-\\d{6}$",
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  },
  {
    id: "m3",
    name: "SanDisk Industrial 32GB",
    brand: "SanDisk",
    assetType: "SD_CARD",
    allowedChildren: [],
    maxStock: 0,
    identifierPattern: "^SD-\\d{5}$",
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  },
  {
    id: "m4",
    name: "Wireless SOS Button",
    brand: "Amber Connect",
    assetType: "PANIC_BUTTON",
    allowedChildren: [],
    maxStock: 20,
    identifierPattern: "^PANIC-\\d{5}$",
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  }
];

export const mockDevices: Device[] = [
  {
    id: "d1",
    identifier: "TRK-982103",
    modelId: "m1",
    status: "IN_STOCK",
    metadata: { firmware: "v1.0.4", hwRevision: "REV_A" },
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  },
  {
    id: "d2",
    identifier: "SIM-550192",
    modelId: "m2",
    status: "IN_STOCK",
    metadata: { carrier: "KORE Wireless", phoneNumber: "+18005550199" },
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  },
  {
    id: "d3",
    identifier: "SD-10293",
    modelId: "m3",
    status: "IN_STOCK",
    metadata: { capacity: "32GB", speedClass: "Class 10" },
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  }
];

export let mockDeviceRelationships: DeviceRelationship[] = [];

export const mockCustomers: Customer[] = [
  {
    id: "c1",
    name: "Acme Logistics",
    type: "COMPANY",
    email: "contact@acme-logs.com",
    phone: "+1 (555) 123-4567",
    address: "123 Supply Chain Ave, Industrial Park, NY",
    taxId: "TX-991023",
    metadata: {},
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  },
  {
    id: "c2",
    name: "John's Hauling",
    type: "PERSON",
    email: "john@hauling.com",
    phone: "+1 (555) 987-6543",
    address: "45 Hillside Terrace, Springfield, IL",
    metadata: {},
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  }
];

export const mockDeviceAuditLogs: AuditLog[] = [
  {
    id: "l1",
    actionType: "INGEST",
    details: "Ingested Tracker unit TRK-982103 in warehouse stock",
    createdAt: new Date(Date.now() - 3600000).toISOString()
  },
  {
    id: "l2",
    actionType: "INGEST",
    details: "Ingested SIM Card SIM-550192",
    createdAt: new Date(Date.now() - 1800000).toISOString()
  }
];

export function setMockDeviceRelationships(val: DeviceRelationship[]) {
  mockDeviceRelationships = val;
}

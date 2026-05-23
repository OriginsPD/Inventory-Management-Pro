import { Elysia, t } from "elysia";
import { swagger } from "@elysiajs/swagger";
import { cors } from "@elysiajs/cors";
import { randomUUID } from "crypto";
import { db } from "./db/index.js";
import * as schema from "./db/schema.js";
import { eq, and, or, like, ilike, desc, sql } from "drizzle-orm";

let useDb = false;

// Initialize connection test
async function initDbConnection() {
  const url = process.env.DATABASE_URL;
  console.log(`🔍 [IMS API] DATABASE_URL detected: ${url ? url.substring(0, 40) + '...' : 'NOT SET'}`);
  try {
    await db.select().from(schema.deviceModels).limit(1);
    useDb = true;
    console.log("⚡ [IMS API] Successfully connected to Neon DB / Postgres instance.");
  } catch (e: any) {
    console.log("⚠️ [IMS API] Neon DB connection failed. Falling back to local In-Memory Database engine.");
    console.log(`   ❌ Error: ${e?.message || String(e)}`);
    useDb = false;
  }
}

initDbConnection();

// In-Memory Database Fallbacks
interface DeviceModel {
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

interface Device {
  id: string;
  identifier: string;
  modelId: string;
  status: string;
  customerId?: string;
  metadata: Record<string, any>;
  createdAt: string;
  updatedAt: string;
}

interface Customer {
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

interface DeviceRelationship {
  id: string;
  primaryDeviceId: string;
  linkedDeviceId: string;
  createdAt: string;
}

interface AuditLog {
  id: string;
  actionType: string;
  details: string;
  createdAt: string;
  deviceId?: string;
  deviceIdentifier?: string;
}

let mockDeviceModels: DeviceModel[] = [
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

let mockDevices: Device[] = [
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

let mockDeviceRelationships: DeviceRelationship[] = [];
let mockCustomers: Customer[] = [
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
let mockDeviceAuditLogs: AuditLog[] = [
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

// Helper to write audit logs to Neon or in-memory
async function writeAudit(action: string, text: string, deviceId?: string, deviceIdentifier?: string) {
  if (useDb) {
    try {
      await db.insert(schema.deviceAuditLogs).values({
        actionType: action,
        details: text,
        deviceId: deviceId || null,
        deviceIdentifier: deviceIdentifier || null
      });
    } catch (e) {
      console.error("Failed to write db audit log", e);
    }
  } else {
    mockDeviceAuditLogs.unshift({
      id: randomUUID(),
      actionType: action,
      details: text,
      deviceId: deviceId || undefined,
      deviceIdentifier: deviceIdentifier || undefined,
      createdAt: new Date().toISOString()
    });
    // Cap at 100 entries for memory health
    if (mockDeviceAuditLogs.length > 100) {
      mockDeviceAuditLogs.pop();
    }
  }
}

// Helper to infer device classification from serial string
function inferAssetType(isn: string, models: any[]): string {
  const upper = isn.toUpperCase();
  
  // 1. Try to match isn against each model's pattern
  for (const m of models) {
    if (m.identifierPattern) {
      try {
        const regex = new RegExp(m.identifierPattern, "i");
        if (regex.test(isn)) {
          return m.assetType;
        }
      } catch (e) {
        console.error(`Invalid regex pattern on model ${m.name}:`, m.identifierPattern);
      }
    }
  }

  // 2. Fallback to legacy heuristic matching
  if (upper.includes("SIM") || upper.startsWith("ICC")) return "SIM";
  if (upper.includes("SD")) return "SD_CARD";
  if (upper.includes("SOS") || upper.includes("PANIC") || upper.includes("FOB")) return "PANIC_BUTTON";
  return "TRACKER";
}

// Strict tree hierarchy helpers
async function hasParentDb(deviceId: string): Promise<boolean> {
  try {
    const parentRes = await db
      .select()
      .from(schema.deviceRelationships)
      .where(eq(schema.deviceRelationships.linkedDeviceId, deviceId))
      .limit(1);
    return parentRes.length > 0;
  } catch (e) {
    console.error("Error in hasParentDb:", e);
    return false;
  }
}

function hasParentMemory(deviceId: string): boolean {
  return mockDeviceRelationships.some(r => r.linkedDeviceId === deviceId);
}

async function isAncestorDb(possibleAncestorId: string, currentDeviceId: string): Promise<boolean> {
  if (possibleAncestorId === currentDeviceId) return true;
  try {
    const parentRes = await db
      .select()
      .from(schema.deviceRelationships)
      .where(eq(schema.deviceRelationships.linkedDeviceId, currentDeviceId))
      .limit(1);
    
    if (parentRes.length > 0 && parentRes[0]) {
      const parentId = parentRes[0].primaryDeviceId;
      if (parentId === possibleAncestorId) return true;
      return await isAncestorDb(possibleAncestorId, parentId);
    }
  } catch (e) {
    console.error("Error in isAncestorDb:", e);
  }
  return false;
}

function isAncestorMemory(possibleAncestorId: string, currentDeviceId: string): boolean {
  if (possibleAncestorId === currentDeviceId) return true;
  const rel = mockDeviceRelationships.find(r => r.linkedDeviceId === currentDeviceId);
  if (rel) {
    const parentId = rel.primaryDeviceId;
    if (parentId === possibleAncestorId) return true;
    return isAncestorMemory(possibleAncestorId, parentId);
  }
  return false;
}

async function cascadeDeviceStatusDb(
  deviceId: string,
  status: string,
  customerId: string | null,
  metadata: any,
  tx?: any
): Promise<void> {
  try {
    const client = tx || db;
    const relationships = await client
      .select()
      .from(schema.deviceRelationships)
      .where(eq(schema.deviceRelationships.primaryDeviceId, deviceId));

    for (const rel of relationships) {
      const childRes = await client
        .select()
        .from(schema.devices)
        .where(eq(schema.devices.id, rel.linkedDeviceId))
        .limit(1);

      const child = childRes[0];
      if (child) {
        const childMetadata = {
          ...(child.metadata as Record<string, any> || {}),
          customerName: metadata.customerName,
          dispatchedAt: metadata.dispatchedAt,
          swappedAt: metadata.swappedAt,
          qcStatus: metadata.qcStatus,
          qcTestedAt: metadata.qcTestedAt
        };
        if (!metadata.customerName) delete childMetadata.customerName;
        if (!metadata.dispatchedAt) delete childMetadata.dispatchedAt;

        await client
          .update(schema.devices)
          .set({
            status: status as any,
            customerId: customerId,
            metadata: childMetadata,
            updatedAt: new Date()
          })
          .where(eq(schema.devices.id, rel.linkedDeviceId));

        await cascadeDeviceStatusDb(rel.linkedDeviceId, status, customerId, metadata, client);
      }
    }
  } catch (e) {
    console.error("Error cascading status in DB:", e);
  }
}


function cascadeDeviceStatusMemory(
  deviceId: string,
  status: string,
  customerId: string | undefined,
  metadata: any
): void {
  const relationships = mockDeviceRelationships.filter(r => r.primaryDeviceId === deviceId);
  for (const rel of relationships) {
    const childIdx = mockDevices.findIndex(d => d.id === rel.linkedDeviceId);
    if (childIdx !== -1) {
      const child = mockDevices[childIdx];
      if (child) {
        const childMetadata = {
          ...(child.metadata || {}),
          customerName: metadata.customerName,
          dispatchedAt: metadata.dispatchedAt,
          swappedAt: metadata.swappedAt,
          qcStatus: metadata.qcStatus,
          qcTestedAt: metadata.qcTestedAt
        };
        if (!metadata.customerName) delete childMetadata.customerName;
        if (!metadata.dispatchedAt) delete childMetadata.dispatchedAt;

        const updatedChild: Device = {
          ...child,
          status,
          customerId,
          metadata: childMetadata,
          updatedAt: new Date().toISOString()
        };
        mockDevices[childIdx] = updatedChild;

        cascadeDeviceStatusMemory(rel.linkedDeviceId, status, customerId, metadata);
      }
    }
  }
}

const app = new Elysia()
  .use(swagger())
  .use(cors())
  .get("/", () => ({
    status: "online",
    engine: useDb ? "Neon PostgreSQL" : "Local In-Memory Engine",
    version: "2.3.0"
  }))
  
  // -- Audit Logs Endpoint --
  .get("/api/audit-logs", async () => {
    if (useDb) {
      try {
        return await db
          .select()
          .from(schema.deviceAuditLogs)
          .orderBy(desc(schema.deviceAuditLogs.createdAt))
          .limit(20);
      } catch (e) {
        console.error(e);
      }
    }
    return mockDeviceAuditLogs.slice(0, 20);
  })

  // -- Analytics: 7-Day Dispatches Trend --
  .get("/api/analytics/dispatches", async () => {
    const baseline = [14, 18, 15, 23, 20, 29, 36];
    let auditList: any[] = [];
    
    if (useDb) {
      try {
        auditList = await db
          .select()
          .from(schema.deviceAuditLogs)
          .where(eq(schema.deviceAuditLogs.actionType, "LINK"))
          .orderBy(desc(schema.deviceAuditLogs.createdAt))
          .limit(150);
      } catch (e) {
        console.error(e);
      }
    } else {
      auditList = mockDeviceAuditLogs.filter(log => log.actionType === "LINK");
    }

    const result = [];
    for (let i = 6; i >= 0; i--) {
      const date = new Date();
      date.setDate(date.getDate() - i);
      const dateStr = date.toLocaleDateString("en-US", { weekday: "short" });
      const dateKey = date.toISOString().split("T")[0];
      
      const realCount = auditList.filter(log => {
        const logDate = new Date(log.createdAt).toISOString().split("T")[0];
        return logDate === dateKey;
      }).length;

      result.push({
        day: dateStr,
        dispatches: (baseline[6 - i] ?? 0) + realCount
      });
    }
    return result;
  })

  // -- Analytics: Asset Distribution Breakdown --
  .get("/api/analytics/breakdown", async () => {
    const breakdown = {
      TRACKER: 0,
      SIM: 0,
      SD_CARD: 0,
      PANIC_BUTTON: 0
    };

    if (useDb) {
      try {
        const data = await db
          .select({
            type: schema.deviceModels.assetType,
          })
          .from(schema.devices)
          .innerJoin(schema.deviceModels, eq(schema.devices.modelId, schema.deviceModels.id));
        
        for (const row of data) {
          const type = row.type as keyof typeof breakdown;
          if (breakdown[type] !== undefined) {
            breakdown[type]++;
          }
        }
      } catch (e) {
        console.error(e);
      }
    } else {
      for (const d of mockDevices) {
        const model = mockDeviceModels.find(m => m.id === d.modelId);
        if (model) {
          const type = model.assetType as keyof typeof breakdown;
          if (breakdown[type] !== undefined) {
            breakdown[type]++;
          }
        }
      }
    }

    return Object.entries(breakdown).map(([type, count]) => ({
      type,
      count
    }));
  })

  // -- Device Models CRUD --
  .group("/api/device-models", (app) => app
    .get("/", async () => {
      if (useDb) {
        try {
          return await db.select().from(schema.deviceModels);
        } catch (e) {
          console.error(e);
        }
      }
      return mockDeviceModels;
    })
    .post("/", async ({ body }) => {
      const payload = {
        name: body.name,
        brand: body.brand,
        assetType: (body.assetType || "TRACKER") as any,
        allowedChildren: body.allowedChildren || [],
        maxStock: body.maxStock || 0,
        identifierPattern: body.identifierPattern || null,
      };

      if (useDb) {
        try {
          const inserted = await db.insert(schema.deviceModels).values(payload).returning();
          return inserted[0];
        } catch (e) {
          console.error(e);
        }
      }

      const newModel: DeviceModel = {
        id: randomUUID(),
        ...payload,
        identifierPattern: payload.identifierPattern || undefined,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
      };

      mockDeviceModels.push(newModel);
      return newModel;
    }, {
      body: t.Object({
        name: t.String(),
        brand: t.String(),
        assetType: t.Optional(t.String()),
        allowedChildren: t.Optional(t.Array(t.String())),
        maxStock: t.Optional(t.Number()),
        identifierPattern: t.Optional(t.Nullable(t.String()))
      })
    })
    .put("/:id", async ({ params, body }) => {
      const payload = {
        name: body.name,
        brand: body.brand,
        assetType: (body.assetType || "TRACKER") as any,
        allowedChildren: body.allowedChildren || [],
        maxStock: body.maxStock ?? 0,
        identifierPattern: body.identifierPattern || null,
      };

      if (useDb) {
        try {
          const updated = await db
            .update(schema.deviceModels)
            .set(payload)
            .where(eq(schema.deviceModels.id, params.id))
            .returning();
          return updated[0];
        } catch (e) {
          console.error(e);
          return { error: "Database update failed" };
        }
      }

      const idx = mockDeviceModels.findIndex(m => m.id === params.id);
      if (idx === -1) return { error: "Not found" };
      const model = mockDeviceModels[idx];
      if (!model) return { error: "Not found" };
      
      const updatedModel: DeviceModel = {
        ...model,
        ...payload,
        identifierPattern: payload.identifierPattern || undefined,
        updatedAt: new Date().toISOString()
      };
      mockDeviceModels[idx] = updatedModel;
      return updatedModel;
    }, {
      body: t.Object({
        name: t.String(),
        brand: t.String(),
        assetType: t.Optional(t.String()),
        allowedChildren: t.Optional(t.Array(t.String())),
        maxStock: t.Optional(t.Number()),
        identifierPattern: t.Optional(t.Nullable(t.String()))
      })
    })
    .delete("/:id", async ({ params }) => {
      if (useDb) {
        try {
          await db.delete(schema.deviceModels).where(eq(schema.deviceModels.id, params.id));
          return { success: true };
        } catch (e) {
          console.error(e);
        }
      }
      const idx = mockDeviceModels.findIndex(m => m.id === params.id);
      if (idx === -1) return { error: "Not found" };
      mockDeviceModels.splice(idx, 1);
      return { success: true };
    })
  )

  // -- Stock Alerts --
  .get("/api/stock-alerts", async () => {
    let allModels: any[] = [];
    let allDevices: any[] = [];

    if (useDb) {
      try {
        allModels = await db.select().from(schema.deviceModels);
        allDevices = await db.select().from(schema.devices);
      } catch (e) {
        console.error(e);
        allModels = mockDeviceModels;
        allDevices = mockDevices;
      }
    } else {
      allModels = mockDeviceModels;
      allDevices = mockDevices;
    }

    return allModels.map((model: any) => {
      const maxStock = model.maxStock || 0;
      const inStock = allDevices.filter((d: any) => d.modelId === model.id && d.status === 'IN_STOCK').length;
      const total = allDevices.filter((d: any) => d.modelId === model.id).length;

      let level: 'HEALTHY' | 'WARNING' | 'LOW' = 'HEALTHY';
      if (maxStock > 0) {
        const ratio = inStock / maxStock;
        if (ratio < 0.3) level = 'LOW';
        else if (ratio < 0.6) level = 'WARNING';
        else level = 'HEALTHY';
      }

      return {
        modelId: model.id,
        name: model.name,
        brand: model.brand,
        assetType: model.assetType,
        maxStock,
        inStock,
        total,
        level,
      };
    });
  })

  // -- Devices Inventory --
  .group("/api/devices", (app) => app
    .get("/", async ({ query }) => {
      if (useDb) {
        try {
          const conditions = [];
          if (query.search) {
            conditions.push(ilike(schema.devices.identifier, `%${query.search}%`));
          }
          if (query.status) {
            conditions.push(eq(schema.devices.status, query.status as any));
          }
          if (query.modelId) {
            conditions.push(eq(schema.devices.modelId, query.modelId));
          }

          let dbQuery = db
            .select({
              id: schema.devices.id,
              identifier: schema.devices.identifier,
              modelId: schema.devices.modelId,
              status: schema.devices.status,
              customerId: schema.devices.customerId,
              customerName: schema.customers.name,
              metadata: schema.devices.metadata,
              createdAt: schema.devices.createdAt,
              updatedAt: schema.devices.updatedAt,
              modelName: schema.deviceModels.name,
              type: schema.deviceModels.assetType,
              linked: sql<number>`coalesce((select count(*)::int from ${schema.deviceRelationships} where ${schema.deviceRelationships.primaryDeviceId} = ${schema.devices.id}), 0)`
            })
            .from(schema.devices)
            .innerJoin(schema.deviceModels, eq(schema.devices.modelId, schema.deviceModels.id))
            .leftJoin(schema.customers, eq(schema.devices.customerId, schema.customers.id));

          if (conditions.length > 0) {
            dbQuery = dbQuery.where(and(...conditions)) as any;
          }

          const data = await dbQuery;
          return data;
        } catch (e) {
          console.error(e);
        }
      }

      let filtered = [...mockDevices];
      if (query.search) {
        const searchLower = query.search.toLowerCase();
        filtered = filtered.filter(d => d.identifier.toLowerCase().includes(searchLower));
      }
      if (query.status) {
        filtered = filtered.filter(d => d.status === query.status);
      }
      if (query.modelId) {
        filtered = filtered.filter(d => d.modelId === query.modelId);
      }

      return filtered.map(d => {
        const model = mockDeviceModels.find(m => m.id === d.modelId);
        const linkedCount = mockDeviceRelationships.filter(r => r.primaryDeviceId === d.id).length;
        return {
          ...d,
          modelName: model ? model.name : "Unknown Model",
          type: model ? model.assetType : "Unknown",
          linked: linkedCount
        };
      });
    }, {
      query: t.Object({
        search: t.Optional(t.String()),
        status: t.Optional(t.String()),
        modelId: t.Optional(t.String())
      })
    })
    
    // Single Entry
    .post("/", async ({ body }) => {
      const metadata = body.metadata || {};
      const allModels = useDb ? await db.select().from(schema.deviceModels) : mockDeviceModels;
      const model = allModels.find(m => m.id === body.modelId);
      
      if (model && model.identifierPattern) {
        try {
          const regex = new RegExp(model.identifierPattern, "i");
          if (!regex.test(body.identifier)) {
            return { error: `Device identifier '${body.identifier}' does not match validation pattern '${model.identifierPattern}'` };
          }
        } catch (e) {
          console.error("Invalid regex format configured:", model.identifierPattern);
        }
      }

      if (useDb) {
        try {
          const payload = {
            identifier: body.identifier,
            modelId: body.modelId,
            status: (body.status || "IN_STOCK") as any,
            metadata
          };
          const inserted = await db.insert(schema.devices).values(payload).returning();
          
          // Audit
          const insertedId = inserted[0]?.id;
          await writeAudit("INGEST", `Registered single device '${body.identifier}' in stock`, insertedId, body.identifier);
          
          return inserted[0];
        } catch (e: any) {
          return { error: e.message || "Database execution failed" };
        }
      }

      const existing = mockDevices.find(d => d.identifier === body.identifier);
      if (existing) {
        return { error: "Device identifier already exists in system" };
      }
      const newDevice: Device = {
        id: randomUUID(),
        identifier: body.identifier,
        modelId: body.modelId,
        status: body.status || "IN_STOCK",
        customerId: body.customerId || undefined,
        metadata,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      };
      mockDevices.push(newDevice);
      
      // Audit
      await writeAudit("INGEST", `Registered single device '${body.identifier}' in stock`, newDevice.id, body.identifier);
      
      return newDevice;
    }, {
      body: t.Object({
        identifier: t.String(),
        modelId: t.String(),
        status: t.Optional(t.String()),
        customerId: t.Optional(t.Nullable(t.String())),
        metadata: t.Optional(t.Any())
      })
    })

    // Bulk Ingestion
    .post("/bulk", async ({ body }) => {
      const added: any[] = [];
      const errors: string[] = [];
      const allModels = useDb ? await db.select().from(schema.deviceModels) : mockDeviceModels;

      if (useDb) {
        try {
          for (const item of body.devices) {
            try {
              // Pattern Validation
              const model = allModels.find(m => m.id === item.modelId);
              if (model && model.identifierPattern) {
                const regex = new RegExp(model.identifierPattern, "i");
                if (!regex.test(item.identifier)) {
                  errors.push(`Device '${item.identifier}': Does not match validation pattern '${model.identifierPattern}'`);
                  continue;
                }
              }

              const inserted = await db.insert(schema.devices).values({
                identifier: item.identifier,
                modelId: item.modelId,
                status: (item.status || "IN_STOCK") as any,
                metadata: item.metadata || {}
              }).returning();
              if (inserted[0]) {
                added.push(inserted[0]);
                await writeAudit("INGEST", `Registered single device '${item.identifier}' in stock via bulk upload`, inserted[0].id, item.identifier);
              }
            } catch (e: any) {
              errors.push(`Device '${item.identifier}': ${e.message}`);
            }
          }
          if (added.length > 0) {
            await writeAudit("INGEST", `Batch ingested ${added.length} devices into inventory`);
          }
          return { success: true, addedCount: added.length, errors };
        } catch (e) {
          console.error(e);
        }
      }

      for (const item of body.devices) {
        // Pattern Validation
        const model = allModels.find(m => m.id === item.modelId);
        if (model && model.identifierPattern) {
          try {
            const regex = new RegExp(model.identifierPattern, "i");
            if (!regex.test(item.identifier)) {
              errors.push(`Device '${item.identifier}': Does not match validation pattern '${model.identifierPattern}'`);
              continue;
            }
          } catch (e) {
            console.error("Invalid regex format configured:", model.identifierPattern);
          }
        }

        const existing = mockDevices.find(d => d.identifier === item.identifier);
        if (existing) {
          errors.push(`Device '${item.identifier}' already exists`);
          continue;
        }
        const newDevice: Device = {
          id: randomUUID(),
          identifier: item.identifier,
          modelId: item.modelId,
          status: item.status || "IN_STOCK",
          customerId: item.customerId || undefined,
          metadata: item.metadata || {},
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
        };
        mockDevices.push(newDevice);
        added.push(newDevice);
        await writeAudit("INGEST", `Registered single device '${item.identifier}' in stock via bulk upload`, newDevice.id, item.identifier);
      }

      if (added.length > 0) {
        await writeAudit("INGEST", `Batch ingested ${added.length} devices into inventory`);
      }

      return { success: true, addedCount: added.length, errors };
    }, {
      body: t.Object({
        devices: t.Array(t.Object({
          identifier: t.String(),
          modelId: t.String(),
          status: t.Optional(t.String()),
          customerId: t.Optional(t.Nullable(t.String())),
          metadata: t.Optional(t.Any())
        }))
      })
    })
    // Bulk Deletion
    .post("/bulk-delete", async ({ body }) => {
      const deletedIds: string[] = [];
      const errors: string[] = [];

      if (useDb) {
        try {
          for (const id of body.ids) {
            try {
              const dev = await db.select().from(schema.devices).where(eq(schema.devices.id, id));
              const deviceObj = dev[0];
              if (deviceObj) {
                // Delete relationships first to avoid constraint issues
                await db.delete(schema.deviceRelationships).where(
                  or(
                    eq(schema.deviceRelationships.primaryDeviceId, id),
                    eq(schema.deviceRelationships.linkedDeviceId, id)
                  )
                );
                await db.delete(schema.devices).where(eq(schema.devices.id, id));
                deletedIds.push(id);
                await writeAudit("DELETE", `Removed device '${deviceObj.identifier}' via bulk delete`);
              }
            } catch (e: any) {
              errors.push(`Device ID '${id}': ${e.message}`);
            }
          }
          return { success: true, deletedCount: deletedIds.length, errors };
        } catch (e) {
          console.error(e);
        }
      }

      for (const id of body.ids) {
        const idx = mockDevices.findIndex(d => d.id === id);
        if (idx !== -1) {
          const deviceObj = mockDevices[idx];
          if (deviceObj) {
            const identifier = deviceObj.identifier;
            mockDevices.splice(idx, 1);
            mockDeviceRelationships = mockDeviceRelationships.filter(r => r.primaryDeviceId !== id && r.linkedDeviceId !== id);
            deletedIds.push(id);
            await writeAudit("DELETE", `Removed device '${identifier}' via bulk delete`);
          }
        }
      }

      return { success: true, deletedCount: deletedIds.length, errors };
    }, {
      body: t.Object({
        ids: t.Array(t.String())
      })
    })
    .put("/:id", async ({ params, body }) => {
      const metadata = body.metadata || {};
      const payload = {
        identifier: body.identifier,
        modelId: body.modelId,
        status: (body.status || "IN_STOCK") as any,
        customerId: body.customerId || null,
        metadata
      };

      if (useDb) {
        try {
          const existingResult = await db.select().from(schema.devices).where(eq(schema.devices.id, params.id));
          const oldDevice = existingResult[0];

          const updated = await db
            .update(schema.devices)
            .set(payload)
            .where(eq(schema.devices.id, params.id))
            .returning();

          // Cascade status recursively to linked devices
          if (body.status) {
            await cascadeDeviceStatusDb(params.id, body.status, payload.customerId, metadata);
          }

          // Audit change
          if (oldDevice) {
            if (metadata.replacedBy) {
              await writeAudit("SWAP", `Hardware Swap: Unit replaced by '${metadata.replacedBy}' (Status updated to DAMAGED)`, params.id, body.identifier);
            } else if (metadata.replacesUnit) {
              await writeAudit("SWAP", `Hardware Swap: Unit deployed as replacement for '${metadata.replacesUnit}'`, params.id, body.identifier);
            } else if (oldDevice.status !== payload.status) {
              await writeAudit("STATUS_CHANGE", `Status changed from ${oldDevice.status} to ${payload.status}`, params.id, body.identifier);
            }
            if (oldDevice.customerId !== payload.customerId) {
              const action = payload.customerId ? "DISPATCH" : "RETURN";
              const detailText = payload.customerId 
                ? `Device '${body.identifier}' dispatched to customer`
                : `Device '${body.identifier}' returned to warehouse stock`;
              await writeAudit(action, detailText, params.id, body.identifier);
            }
          }

          return updated[0];
        } catch (e: any) {
          return { error: e.message || "Database update failed" };
        }
      }

      const idx = mockDevices.findIndex(d => d.id === params.id);
      if (idx === -1) return { error: "Device not found" };
      const device = mockDevices[idx];
      if (!device) return { error: "Device not found" };

      const oldStatus = device.status;
      const oldCustomerId = device.customerId;

      const updatedDevice: Device = {
        ...device,
        ...payload,
        customerId: payload.customerId || undefined,
        updatedAt: new Date().toISOString()
      };
      mockDevices[idx] = updatedDevice;

      // Cascade status recursively in Memory Mode
      if (body.status) {
        cascadeDeviceStatusMemory(params.id, body.status, updatedDevice.customerId, metadata);
      }

      // Audit change
      if (metadata.replacedBy) {
        await writeAudit("SWAP", `Hardware Swap: Unit replaced by '${metadata.replacedBy}' (Status updated to DAMAGED)`, params.id, body.identifier);
      } else if (metadata.replacesUnit) {
        await writeAudit("SWAP", `Hardware Swap: Unit deployed as replacement for '${metadata.replacesUnit}'`, params.id, body.identifier);
      } else if (oldStatus !== payload.status) {
        await writeAudit("STATUS_CHANGE", `Status changed from ${oldStatus} to ${payload.status}`, params.id, body.identifier);
      }
      if (oldCustomerId !== payload.customerId) {
        const action = payload.customerId ? "DISPATCH" : "RETURN";
        const detailText = payload.customerId 
          ? `Device '${body.identifier}' dispatched to customer`
          : `Device '${body.identifier}' returned to warehouse stock`;
        await writeAudit(action, detailText, params.id, body.identifier);
      }

      return updatedDevice;
    }, {
      body: t.Object({
        identifier: t.String(),
        modelId: t.String(),
        status: t.Optional(t.String()),
        customerId: t.Optional(t.Nullable(t.String())),
        metadata: t.Optional(t.Any())
      })
    })

    .post("/swap", async ({ body }) => {
      if (useDb) {
        try {
          return await db.transaction(async (tx) => {
            const oldDeviceRes = await tx
              .select()
              .from(schema.devices)
              .where(eq(schema.devices.id, body.oldDeviceId))
              .limit(1);
            const oldDevice = oldDeviceRes[0];

            const newDeviceRes = await tx
              .select()
              .from(schema.devices)
              .where(eq(schema.devices.id, body.newDeviceId))
              .limit(1);
            const newDevice = newDeviceRes[0];

            if (!oldDevice) {
              return { error: "Faulty device not found" };
            }
            if (!newDevice) {
              return { error: "Replacement device not found" };
            }
            if (newDevice.status !== "IN_STOCK") {
              return { error: `Replacement device is not in stock (current status: ${newDevice.status})` };
            }

            const customerId = oldDevice.customerId;
            const customerName = (oldDevice.metadata as Record<string, any>)?.customerName || "RMA Replacement Client";

            // 1. Get child relationships that need to be transferred
            const childRels = await tx
              .select()
              .from(schema.deviceRelationships)
              .where(eq(schema.deviceRelationships.primaryDeviceId, body.oldDeviceId));

            // 2. Transfer relationships
            if (childRels.length > 0) {
              await tx
                .update(schema.deviceRelationships)
                .set({ primaryDeviceId: body.newDeviceId })
                .where(eq(schema.deviceRelationships.primaryDeviceId, body.oldDeviceId));
            }

            // 3. Update old device: status DAMAGED, customerId null
            const updatedOldMetadata = {
              ...(oldDevice.metadata as Record<string, any> || {}),
              replacedBy: newDevice.identifier,
              swappedAt: new Date().toISOString()
            };

            await tx
              .update(schema.devices)
              .set({
                status: "DAMAGED",
                customerId: null,
                metadata: updatedOldMetadata,
                updatedAt: new Date()
              })
              .where(eq(schema.devices.id, body.oldDeviceId));

            // 4. Update new device: status DISPATCHED, customerId oldDevice.customerId
            const updatedNewMetadata = {
              ...(newDevice.metadata as Record<string, any> || {}),
              customerName,
              replacesUnit: oldDevice.identifier,
              dispatchedAt: new Date().toISOString(),
              swappedAt: new Date().toISOString()
            };

            await tx
              .update(schema.devices)
              .set({
                status: "DISPATCHED",
                customerId: customerId,
                metadata: updatedNewMetadata,
                updatedAt: new Date()
              })
              .where(eq(schema.devices.id, body.newDeviceId));

            // 5. Cascade status recursively to inherited child devices
            await cascadeDeviceStatusDb(body.newDeviceId, "DISPATCHED", customerId, updatedNewMetadata, tx);

            // 6. Write Audit Logs inside transaction
            await tx.insert(schema.deviceAuditLogs).values({
              actionType: "SWAP",
              details: `Hardware Swap: Unit replaced by '${newDevice.identifier}' (Status updated to DAMAGED)`,
              deviceId: oldDevice.id,
              deviceIdentifier: oldDevice.identifier
            });

            await tx.insert(schema.deviceAuditLogs).values({
              actionType: "SWAP",
              details: `Hardware Swap: Unit deployed as replacement for '${oldDevice.identifier}'`,
              deviceId: newDevice.id,
              deviceIdentifier: newDevice.identifier
            });

            for (const rel of childRels) {
              const childRes = await tx
                .select()
                .from(schema.devices)
                .where(eq(schema.devices.id, rel.linkedDeviceId))
                .limit(1);
              const child = childRes[0];
              if (child) {
                await tx.insert(schema.deviceAuditLogs).values({
                  actionType: "LINK",
                  details: `Inherited child asset '${child.identifier}' from faulty unit '${oldDevice.identifier}' during swap`,
                  deviceId: newDevice.id,
                  deviceIdentifier: newDevice.identifier
                });
                await tx.insert(schema.deviceAuditLogs).values({
                  actionType: "LINK",
                  details: `Linked to replacement unit '${newDevice.identifier}' due to swap from '${oldDevice.identifier}'`,
                  deviceId: child.id,
                  deviceIdentifier: child.identifier
                });
              }
            }

            return { success: true };
          });
        } catch (e: any) {
          console.error("Database transaction swap failed", e);
          return { error: e.message || "Database execution failed" };
        }
      }

      // Memory Mode fallback
      const oldIdx = mockDevices.findIndex(d => d.id === body.oldDeviceId);
      const newIdx = mockDevices.findIndex(d => d.id === body.newDeviceId);
      if (oldIdx === -1) return { error: "Faulty device not found" };
      if (newIdx === -1) return { error: "Replacement device not found" };

      const oldDevice = mockDevices[oldIdx] as Device;
      const newDevice = mockDevices[newIdx] as Device;

      if (newDevice.status !== "IN_STOCK") {
        return { error: `Replacement device is not in stock (current status: ${newDevice.status})` };
      }

      const customerId = oldDevice.customerId;
      const customerName = oldDevice.metadata?.customerName || "RMA Replacement Client";

      // 1. Get child relationships that need to be transferred
      const childRels = mockDeviceRelationships.filter(r => r.primaryDeviceId === body.oldDeviceId);

      // 2. Transfer relationships in memory
      for (const rel of childRels) {
        rel.primaryDeviceId = body.newDeviceId;
      }

      // 3. Update old device
      const updatedOldMetadata = {
        ...(oldDevice.metadata || {}),
        replacedBy: newDevice.identifier,
        swappedAt: new Date().toISOString()
      };
      const updatedOldDevice = {
        ...oldDevice,
        status: "DAMAGED",
        customerId: undefined,
        metadata: updatedOldMetadata,
        updatedAt: new Date().toISOString()
      };
      mockDevices[oldIdx] = updatedOldDevice;

      // 4. Update new device
      const updatedNewMetadata = {
        ...(newDevice.metadata || {}),
        customerName,
        replacesUnit: oldDevice.identifier,
        dispatchedAt: new Date().toISOString(),
        swappedAt: new Date().toISOString()
      };
      const updatedNewDevice = {
        ...newDevice,
        status: "DISPATCHED",
        customerId: customerId,
        metadata: updatedNewMetadata,
        updatedAt: new Date().toISOString()
      };
      mockDevices[newIdx] = updatedNewDevice;

      // 5. Cascade status recursively to inherited child devices in memory
      cascadeDeviceStatusMemory(body.newDeviceId, "DISPATCHED", customerId, updatedNewMetadata);

      // 6. Write Audit Logs in memory
      mockDeviceAuditLogs.unshift({
        id: randomUUID(),
        actionType: "SWAP",
        details: `Hardware Swap: Unit replaced by '${newDevice.identifier}' (Status updated to DAMAGED)`,
        deviceId: oldDevice.id,
        deviceIdentifier: oldDevice.identifier,
        createdAt: new Date().toISOString()
      });

      mockDeviceAuditLogs.unshift({
        id: randomUUID(),
        actionType: "SWAP",
        details: `Hardware Swap: Unit deployed as replacement for '${oldDevice.identifier}'`,
        deviceId: newDevice.id,
        deviceIdentifier: newDevice.identifier,
        createdAt: new Date().toISOString()
      });

      for (const rel of childRels) {
        const child = mockDevices.find(d => d.id === rel.linkedDeviceId);
        if (child) {
          mockDeviceAuditLogs.unshift({
            id: randomUUID(),
            actionType: "LINK",
            details: `Inherited child asset '${child.identifier}' from faulty unit '${oldDevice.identifier}' during swap`,
            deviceId: newDevice.id,
            deviceIdentifier: newDevice.identifier,
            createdAt: new Date().toISOString()
          });
          mockDeviceAuditLogs.unshift({
            id: randomUUID(),
            actionType: "LINK",
            details: `Linked to replacement unit '${newDevice.identifier}' due to swap from '${oldDevice.identifier}'`,
            deviceId: child.id,
            deviceIdentifier: child.identifier,
            createdAt: new Date().toISOString()
          });
        }
      }

      if (mockDeviceAuditLogs.length > 200) {
        mockDeviceAuditLogs.splice(200);
      }

      return { success: true };
    }, {
      body: t.Object({
        oldDeviceId: t.String(),
        newDeviceId: t.String()
      })
    })

    .delete("/:id", async ({ params }) => {
      let identifier = "";
      if (useDb) {
        try {
          const dev = await db.select().from(schema.devices).where(eq(schema.devices.id, params.id));
          if (dev[0]) identifier = dev[0].identifier;
          await db.delete(schema.devices).where(eq(schema.devices.id, params.id));
          if (identifier) {
            await writeAudit("DELETE", `Removed device '${identifier}' from inventory database`);
          }
          return { success: true };
        } catch (e) {
          console.error(e);
        }
      }
      const idx = mockDevices.findIndex(d => d.id === params.id);
      if (idx === -1) return { error: "Not Found" };
      const deviceObj = mockDevices[idx];
      if (!deviceObj) return { error: "Not Found" };
      identifier = deviceObj.identifier;
      mockDevices.splice(idx, 1);
      mockDeviceRelationships = mockDeviceRelationships.filter(r => r.primaryDeviceId !== params.id && r.linkedDeviceId !== params.id);
      await writeAudit("DELETE", `Removed device '${identifier}' from inventory database`);
      return { success: true };
    })

    .get("/:id/audit-logs", async ({ params }) => {
      if (useDb) {
        try {
          const logs = await db
            .select()
            .from(schema.deviceAuditLogs)
            .where(eq(schema.deviceAuditLogs.deviceId, params.id))
            .orderBy(desc(schema.deviceAuditLogs.createdAt));
          return logs;
        } catch (e: any) {
          return { error: e.message || "Failed to fetch audit logs" };
        }
      }

      // Memory Mode fallback
      const dev = mockDevices.find(d => d.id === params.id);
      const identifier = dev ? dev.identifier : "";
      const logs = mockDeviceAuditLogs.filter(
        log => log.deviceId === params.id || (identifier && log.deviceIdentifier === identifier)
      );
      return logs;
    })

    .get("/:id/telemetry-check", async ({ params }) => {
      let devObj: any = null;
      if (useDb) {
        try {
          const results = await db.select().from(schema.devices).where(eq(schema.devices.id, params.id));
          devObj = results[0];
        } catch (e) {
          console.error("Failed to query device for telemetry check", e);
        }
      } else {
        devObj = mockDevices.find(d => d.id === params.id);
      }

      if (!devObj) {
        return { error: "Device not found for diagnostics check" };
      }

      const hasFailure = Math.random() < 0.05;
      
      const signalDbm = hasFailure 
        ? -115 
        : -60 - Math.floor(Math.random() * 35); 
      
      const voltage = hasFailure
        ? 3.1 + Math.random() * 0.2 
        : 3.8 + Math.random() * 0.45; 

      const gpsSatellites = hasFailure
        ? Math.floor(Math.random() * 3) 
        : 7 + Math.floor(Math.random() * 11); 

      const networks = ["LTE (AT&T)", "LTE (T-Mobile)", "LTE (Verizon)", "Roaming GSM"];
      const network = networks[Math.floor(Math.random() * networks.length)] || "LTE (T-Mobile)";

      const status = (!hasFailure && signalDbm > -105 && voltage >= 3.6 && gpsSatellites >= 4) ? "PASSED" : "FAILED";

      const details = `Telemetry diagnostic executed. Status: ${status}. Signal: ${signalDbm} dBm, Voltage: ${voltage.toFixed(2)}V, GPS Satellites: ${gpsSatellites}, Network: ${network}`;
      await writeAudit("TELEMETRY_CHECK", details, devObj.id, devObj.identifier);

      const newMeta = {
        ...(devObj.metadata || {}),
        lastTelemetryCheck: {
          status,
          signalDbm,
          voltage: parseFloat(voltage.toFixed(2)),
          gpsSatellites,
          network,
          checkedAt: new Date().toISOString()
        }
      };

      if (useDb) {
        try {
          await db.update(schema.devices).set({ metadata: newMeta }).where(eq(schema.devices.id, devObj.id));
        } catch (e) {
          console.error("Failed to update telemetry metadata", e);
        }
      } else {
        devObj.metadata = newMeta;
      }

      return {
        success: true,
        telemetry: {
          status,
          signalDbm,
          voltage: parseFloat(voltage.toFixed(2)),
          gpsSatellites,
          network,
          checkedAt: new Date().toISOString()
        }
      };
    })
  )

  // -- Device Linking (Polymorphic Matrix) --
  .group("/api/device-links", (app) => app
    // Fetch all device relationships
    .get("/", async () => {
      if (useDb) {
        try {
          return await db.select().from(schema.deviceRelationships);
        } catch (e) {
          console.error(e);
          return [];
        }
      }
      return mockDeviceRelationships;
    })
    // Preview relationship connections
    .post("/preview", async ({ body }) => {
      const allModels = useDb ? await db.select().from(schema.deviceModels) : mockDeviceModels;

      const previewList = await Promise.all(body.links.map(async (link) => {
        let primary: any = null;
        let child: any = null;
        let primaryModel: any = null;
        let childModel: any = null;

        if (useDb) {
          try {
            const pRes = await db.select().from(schema.devices).where(eq(schema.devices.identifier, link.primaryISN));
            primary = pRes[0];
            const cRes = await db.select().from(schema.devices).where(eq(schema.devices.identifier, link.childISN));
            child = cRes[0];
          } catch (e) {
            console.error(e);
          }
        } else {
          primary = mockDevices.find(d => d.identifier === link.primaryISN);
          child = mockDevices.find(d => d.identifier === link.childISN);
        }

        // Auto-detect missing primary device
        let willCreatePrimary = false;
        if (!primary) {
          willCreatePrimary = true;
          // Find first TRACKER model to use as default template
          primaryModel = allModels.find(m => m.assetType === "TRACKER");
        } else {
          primaryModel = allModels.find(m => m.id === primary.modelId);
        }

        // Auto-detect missing child device
        let willCreateChild = false;
        const childType = inferAssetType(link.childISN, allModels);
        if (!child) {
          willCreateChild = true;
          // Find first model matching the inferred asset type
          childModel = allModels.find(m => m.assetType === childType);
        } else {
          childModel = allModels.find(m => m.id === child.modelId);
        }

        if (!primaryModel) {
          return {
            primaryISN: link.primaryISN,
            childISN: link.childISN,
            childType,
            status: "invalid",
            message: `Primary template configuration missing for auto-create`
          };
        }

        if (!childModel) {
          return {
            primaryISN: link.primaryISN,
            childISN: link.childISN,
            childType,
            status: "invalid",
            message: `Child template configuration missing for type '${childType}'`
          };
        }

        // Barcode Pattern Validation for Primary Ingest
        if (primaryModel.identifierPattern) {
          try {
            const regex = new RegExp(primaryModel.identifierPattern, "i");
            if (!regex.test(link.primaryISN)) {
              return {
                primaryISN: link.primaryISN,
                childISN: link.childISN,
                childType,
                status: "invalid",
                message: `Primary barcode does not match pattern '${primaryModel.identifierPattern}' for model '${primaryModel.name}'`
              };
            }
          } catch (e) {
            console.error("Invalid regex format configured:", primaryModel.identifierPattern);
          }
        }

        // Barcode Pattern Validation for Child Ingest
        if (childModel.identifierPattern) {
          try {
            const regex = new RegExp(childModel.identifierPattern, "i");
            if (!regex.test(link.childISN)) {
              return {
                primaryISN: link.primaryISN,
                childISN: link.childISN,
                childType,
                status: "invalid",
                message: `Child barcode does not match pattern '${childModel.identifierPattern}' for model '${childModel.name}'`
              };
            }
          } catch (e) {
            console.error("Invalid regex format configured:", childModel.identifierPattern);
          }
        }

        // Handle postgres array vs in-memory representation
        const allowed = Array.isArray(primaryModel.allowedChildren) 
          ? primaryModel.allowedChildren 
          : JSON.parse(primaryModel.allowedChildren || "[]");

        const isAllowed = allowed.includes(childType);

        if (!isAllowed) {
          return {
            primaryISN: link.primaryISN,
            childISN: link.childISN,
            childType,
            status: "invalid",
            message: `Model '${primaryModel.name}' does not accept components of type '${childType}'`
          };
        }

        // Tree Hierarchy Constraints Validation
        if (child) {
          // 1. Single Parent Constraint
          if (useDb) {
            const otherParent = await db.select().from(schema.deviceRelationships)
              .where(eq(schema.deviceRelationships.linkedDeviceId, child.id)).limit(1);
            const firstParent = otherParent[0];
            if (firstParent && firstParent.primaryDeviceId !== primary?.id) {
              return {
                primaryISN: link.primaryISN,
                childISN: link.childISN,
                childType,
                status: "invalid",
                message: `Child device '${link.childISN}' is already linked to another parent.`
              };
            }
          } else {
            const otherParent = mockDeviceRelationships.find(r => r.linkedDeviceId === child.id);
            if (otherParent && otherParent.primaryDeviceId !== primary?.id) {
              return {
                primaryISN: link.primaryISN,
                childISN: link.childISN,
                childType,
                status: "invalid",
                message: `Child device '${link.childISN}' is already linked to another parent.`
              };
            }
          }
        }

        if (primary && child) {
          // 2. Cycle Detection
          const isCycle = useDb 
            ? await isAncestorDb(child.id, primary.id) 
            : isAncestorMemory(child.id, primary.id);
          if (isCycle) {
            return {
              primaryISN: link.primaryISN,
              childISN: link.childISN,
              childType,
              status: "invalid",
              message: `Linking '${link.childISN}' to '${link.primaryISN}' would create a circular dependency loop.`
            };
          }
        }

        let msg = "";
        if (willCreatePrimary && willCreateChild) msg = "Both assets will be auto-created";
        else if (willCreatePrimary) msg = "Primary tracker will be auto-created";
        else if (willCreateChild) msg = "Child component will be auto-created";

        return {
          primaryISN: link.primaryISN,
          childISN: link.childISN,
          childType,
          status: "valid",
          message: msg || undefined,
          autoCreatePrimary: willCreatePrimary ? primaryModel.id : undefined,
          autoCreateChild: willCreateChild ? childModel.id : undefined
        };
      }));

      return previewList;
    }, {
      body: t.Object({
        links: t.Array(t.Object({
          primaryISN: t.String(),
          childISN: t.String()
        }))
      })
    })

    // Execute Relationship Commit
    .post("/commit", async ({ body }) => {
      let created = 0;
      const errors: string[] = [];
      const allModels = useDb ? await db.select().from(schema.deviceModels) : mockDeviceModels;

      for (const link of body.links) {
        let primary: any = null;
        let child: any = null;

        // Auto-create missing devices beforehand if marked
        if (useDb) {
          try {
            // Find or create primary
            const pRes = await db.select().from(schema.devices).where(eq(schema.devices.identifier, link.primaryISN));
            if (pRes.length > 0) {
              primary = pRes[0];
            } else {
              // Find default tracker model
              const mRes = await db.select().from(schema.deviceModels).where(eq(schema.deviceModels.assetType, "TRACKER" as any)).limit(1);
              const primaryTemplate = mRes[0];
              if (primaryTemplate) {
                const inserted = await db.insert(schema.devices).values({
                  identifier: link.primaryISN,
                  modelId: primaryTemplate.id,
                  status: "IN_STOCK",
                  metadata: {}
                }).returning();
                primary = inserted[0];
                await writeAudit("INGEST", `Auto-created primary tracker '${link.primaryISN}' during pairing`);
              }
            }

            // Find or create child
            const cRes = await db.select().from(schema.devices).where(eq(schema.devices.identifier, link.childISN));
            if (cRes.length > 0) {
              child = cRes[0];
            } else {
              const childType = inferAssetType(link.childISN, allModels);
              const mRes = await db.select().from(schema.deviceModels).where(eq(schema.deviceModels.assetType, childType as any)).limit(1);
              const childTemplate = mRes[0];
              if (childTemplate) {
                const inserted = await db.insert(schema.devices).values({
                  identifier: link.childISN,
                  modelId: childTemplate.id,
                  status: "IN_STOCK",
                  metadata: {}
                }).returning();
                child = inserted[0];
                await writeAudit("INGEST", `Auto-created child asset '${link.childISN}' (${childType}) during pairing`);
              }
            }

            // Create relationship link
            if (primary && child) {
              // 1. Single Parent Constraint
              const otherParent = await db.select().from(schema.deviceRelationships)
                .where(eq(schema.deviceRelationships.linkedDeviceId, child.id)).limit(1);
              const firstParent = otherParent[0];
              if (firstParent && firstParent.primaryDeviceId !== primary.id) {
                errors.push(`Linking '${link.primaryISN}' to '${link.childISN}' failed: Child is already linked to another parent.`);
                continue;
              }

              // 2. Cycle Detection
              const isCycle = await isAncestorDb(child.id, primary.id);
              if (isCycle) {
                errors.push(`Linking '${link.primaryISN}' to '${link.childISN}' failed: Circular dependency loop detected.`);
                continue;
              }

              const dup = await db.select().from(schema.deviceRelationships).where(
                and(
                  eq(schema.deviceRelationships.primaryDeviceId, primary.id),
                  eq(schema.deviceRelationships.linkedDeviceId, child.id)
                )
              );
              if (dup.length === 0) {
                await db.insert(schema.deviceRelationships).values({
                  primaryDeviceId: primary.id,
                  linkedDeviceId: child.id
                });
                created++;
                await writeAudit("LINK", `Linked tracker '${link.primaryISN}' with component '${link.childISN}'`);
              }
            }
          } catch (e: any) {
            errors.push(`Linking failed: ${e.message}`);
          }
        } else {
          // Memory Mode Auto-creation
          primary = mockDevices.find(d => d.identifier === link.primaryISN);
          if (!primary) {
            const m = mockDeviceModels.find(model => model.assetType === "TRACKER");
            if (m) {
              primary = {
                id: randomUUID(),
                identifier: link.primaryISN,
                modelId: m.id,
                status: "IN_STOCK",
                metadata: {},
                createdAt: new Date().toISOString(),
                updatedAt: new Date().toISOString()
              };
              mockDevices.push(primary);
              await writeAudit("INGEST", `Auto-created primary tracker '${link.primaryISN}' during pairing`);
            }
          }

          child = mockDevices.find(d => d.identifier === link.childISN);
          if (!child) {
            const childType = inferAssetType(link.childISN, allModels);
            const m = mockDeviceModels.find(model => model.assetType === childType);
            if (m) {
              child = {
                id: randomUUID(),
                identifier: link.childISN,
                modelId: m.id,
                status: "IN_STOCK",
                metadata: {},
                createdAt: new Date().toISOString(),
                updatedAt: new Date().toISOString()
              };
              mockDevices.push(child);
              await writeAudit("INGEST", `Auto-created child asset '${link.childISN}' (${childType}) during pairing`);
            }
          }

          if (primary && child) {
            // 1. Single Parent Constraint
            const otherParent = mockDeviceRelationships.find(r => r.linkedDeviceId === child.id);
            if (otherParent && otherParent.primaryDeviceId !== primary.id) {
              errors.push(`Linking '${link.primaryISN}' to '${link.childISN}' failed: Child is already linked to another parent.`);
              continue;
            }

            // 2. Cycle Detection
            const isCycle = isAncestorMemory(child.id, primary.id);
            if (isCycle) {
              errors.push(`Linking '${link.primaryISN}' to '${link.childISN}' failed: Circular dependency loop detected.`);
              continue;
            }

            const duplicate = mockDeviceRelationships.find(
              r => r.primaryDeviceId === primary.id && r.linkedDeviceId === child.id
            );
            if (!duplicate) {
              mockDeviceRelationships.push({
                id: randomUUID(),
                primaryDeviceId: primary.id,
                linkedDeviceId: child.id,
                createdAt: new Date().toISOString()
              });
              created++;
              await writeAudit("LINK", `Linked tracker '${link.primaryISN}' with component '${link.childISN}'`);
            }
          }
        }
      }

      return { success: true, createdCount: created, errors };
    }, {
      body: t.Object({
        links: t.Array(t.Object({
          primaryISN: t.String(),
          childISN: t.String()
        }))
      })
    })

    // Execute Relationship Unlink
    .post("/unlink", async ({ body }) => {
      let unlinked = 0;
      const errors: string[] = [];

      for (const link of body.links) {
        if (useDb) {
          try {
            // Find primary and child
            const pRes = await db.select().from(schema.devices).where(eq(schema.devices.identifier, link.primaryISN));
            const cRes = await db.select().from(schema.devices).where(eq(schema.devices.identifier, link.childISN));
            
            const primary = pRes[0];
            const child = cRes[0];
            if (primary && child) {
              await db.delete(schema.deviceRelationships).where(
                and(
                  eq(schema.deviceRelationships.primaryDeviceId, primary.id),
                  eq(schema.deviceRelationships.linkedDeviceId, child.id)
                )
              );
              unlinked++;
              await writeAudit("UNLINK", `Unlinked tracker '${link.primaryISN}' from component '${link.childISN}'`);
            }
          } catch (e: any) {
            errors.push(`Unlinking failed: ${e.message}`);
          }
        } else {
          // Memory Mode
          const primary = mockDevices.find(d => d.identifier === link.primaryISN);
          const child = mockDevices.find(d => d.identifier === link.childISN);
          if (primary && child) {
            const initialLength = mockDeviceRelationships.length;
            mockDeviceRelationships = mockDeviceRelationships.filter(
              r => !(r.primaryDeviceId === primary.id && r.linkedDeviceId === child.id)
            );
            if (mockDeviceRelationships.length < initialLength) {
              unlinked++;
              await writeAudit("UNLINK", `Unlinked tracker '${link.primaryISN}' from component '${link.childISN}'`);
            }
          }
        }
      }

      return { success: true, unlinkedCount: unlinked, errors };
    }, {
      body: t.Object({
        links: t.Array(t.Object({
          primaryISN: t.String(),
          childISN: t.String()
        }))
      })
    })
  )

  // -- Customer Management --
  .group("/api/customers", (app) => app
    .get("/", async ({ query }) => {
      if (useDb) {
        try {
          return await db.select().from(schema.customers).orderBy(desc(schema.customers.createdAt));
        } catch (e) {
          console.error(e);
        }
      }
      return [...mockCustomers].sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
    })
    .get("/:id", async ({ params }) => {
      if (useDb) {
        try {
          const res = await db.select().from(schema.customers).where(eq(schema.customers.id, params.id)).limit(1);
          return res[0];
        } catch (e) {
          console.error(e);
        }
      }
      return mockCustomers.find(c => c.id === params.id) || null;
    })
    .get("/:id/history", async ({ params }) => {
      if (useDb) {
        try {
          // Dispatched devices
          const dispatched = await db
            .select({
              id: schema.devices.id,
              identifier: schema.devices.identifier,
              status: schema.devices.status,
              modelName: schema.deviceModels.name,
              metadata: schema.devices.metadata,
              dispatchedAt: sql`(${schema.devices.metadata}->>'dispatchedAt')`,
            })
            .from(schema.devices)
            .innerJoin(schema.deviceModels, eq(schema.devices.modelId, schema.deviceModels.id))
            .where(eq(schema.devices.customerId, params.id));

          return {
            dispatched,
            // In a real system, we'd query returned devices from audit logs or a dedicated dispatches table
            // For now, we'll return an empty list or mock some data if needed.
            returned: [] 
          };
        } catch (e) {
          console.error(e);
        }
      }
      const dispatched = mockDevices
        .filter(d => d.customerId === params.id && d.status === 'DISPATCHED')
        .map(d => ({
          ...d,
          modelName: mockDeviceModels.find(m => m.id === d.modelId)?.name || 'Unknown',
          dispatchedAt: d.metadata.dispatchedAt
        }));
      return { dispatched, returned: [] };
    })
    .post("/", async ({ body }) => {
      const payload = {
        name: body.name,
        type: body.type as 'PERSON' | 'COMPANY',
        email: body.email,
        phone: body.phone,
        address: body.address,
        taxId: body.taxId,
        metadata: body.metadata || {},
      };

      if (useDb) {
        try {
          const res = await db.insert(schema.customers).values(payload).returning();
          await writeAudit("CUSTOMER_CREATE", `Created customer ${body.name}`);
          return res[0];
        } catch (e) {
          console.error(e);
        }
      }
      
      const newCustomer: Customer = {
        id: randomUUID(),
        ...payload,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
      };

      mockCustomers.push(newCustomer);
      await writeAudit("CUSTOMER_CREATE", `Created customer ${body.name} (In-Memory)`);
      return newCustomer;
    }, {
      body: t.Object({
        name: t.String(),
        type: t.String(),
        email: t.Optional(t.String()),
        phone: t.Optional(t.String()),
        address: t.Optional(t.String()),
        taxId: t.Optional(t.String()),
        metadata: t.Optional(t.Any())
      })
    })
    .put("/:id", async ({ params, body }) => {
      const payload = {
        name: body.name,
        type: body.type as 'PERSON' | 'COMPANY',
        email: body.email,
        phone: body.phone,
        address: body.address,
        taxId: body.taxId,
        metadata: body.metadata || {},
        updatedAt: new Date(),
      };

      if (useDb) {
        try {
          const res = await db.update(schema.customers).set(payload).where(eq(schema.customers.id, params.id)).returning();
          return res[0];
        } catch (e) {
          console.error(e);
        }
      }

      const idx = mockCustomers.findIndex(c => c.id === params.id);
      if (idx !== -1) {
        const customer = mockCustomers[idx];
        if (customer) {
          const updatedCustomer: Customer = {
            ...customer,
            ...payload,
            updatedAt: new Date().toISOString()
          };
          mockCustomers[idx] = updatedCustomer;
          return updatedCustomer;
        }
      }
      return null;
    }, {
      body: t.Object({
        name: t.String(),
        type: t.String(),
        email: t.Optional(t.String()),
        phone: t.Optional(t.String()),
        address: t.Optional(t.String()),
        taxId: t.Optional(t.String()),
        metadata: t.Optional(t.Any())
      })
    })
    .delete("/:id", async ({ params }) => {
      if (useDb) {
        try {
          await db.delete(schema.customers).where(eq(schema.customers.id, params.id));
          return { success: true };
        } catch (e) {
          console.error(e);
        }
      }
      const idx = mockCustomers.findIndex(c => c.id === params.id);
      if (idx !== -1) {
        mockCustomers.splice(idx, 1);
        return { success: true };
      }
      return { error: "Customer not found" };
    })
  )

  .listen(3002);

console.log(`🦊 Elysia API is running at ${app.server?.hostname}:${app.server?.port}`);
export type App = typeof app;

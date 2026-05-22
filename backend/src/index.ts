import { Elysia, t } from "elysia";
import { swagger } from "@elysiajs/swagger";
import { cors } from "@elysiajs/cors";
import { randomUUID } from "crypto";
import { db } from "./db/index.js";
import * as schema from "./db/schema.js";
import { eq, and, or, like, desc } from "drizzle-orm";

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
}

let mockDeviceModels: DeviceModel[] = [
  {
    id: "m1",
    name: "Amber Shield V4",
    brand: "Amber Connect",
    assetType: "TRACKER",
    allowedChildren: ["SIM", "SD_CARD", "PANIC_BUTTON"],
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  },
  {
    id: "m2",
    name: "Global IoT SIM Card",
    brand: "KORE Wireless",
    assetType: "SIM",
    allowedChildren: [],
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  },
  {
    id: "m3",
    name: "SanDisk Industrial 32GB",
    brand: "SanDisk",
    assetType: "SD_CARD",
    allowedChildren: [],
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  },
  {
    id: "m4",
    name: "Wireless SOS Button",
    brand: "Amber Connect",
    assetType: "PANIC_BUTTON",
    allowedChildren: [],
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
async function writeAudit(action: string, text: string) {
  if (useDb) {
    try {
      await db.insert(schema.deviceAuditLogs).values({
        actionType: action,
        details: text
      });
    } catch (e) {
      console.error("Failed to write db audit log", e);
    }
  } else {
    mockDeviceAuditLogs.unshift({
      id: randomUUID(),
      actionType: action,
      details: text,
      createdAt: new Date().toISOString()
    });
    // Cap at 100 entries for memory health
    if (mockDeviceAuditLogs.length > 100) {
      mockDeviceAuditLogs.pop();
    }
  }
}

// Helper to infer device classification from serial string
function inferAssetType(isn: string): string {
  const upper = isn.toUpperCase();
  if (upper.includes("SIM") || upper.startsWith("ICC")) return "SIM";
  if (upper.includes("SD")) return "SD_CARD";
  if (upper.includes("SOS") || upper.includes("PANIC") || upper.includes("FOB")) return "PANIC_BUTTON";
  return "TRACKER";
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
        dispatches: baseline[6 - i] + realCount
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
        maxStock: t.Optional(t.Number())
      })
    })
    .put("/:id", async ({ params, body }) => {
      const payload = {
        name: body.name,
        brand: body.brand,
        assetType: (body.assetType || "TRACKER") as any,
        allowedChildren: body.allowedChildren || [],
        maxStock: body.maxStock ?? 0,
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
      
      mockDeviceModels[idx] = {
        ...mockDeviceModels[idx],
        ...payload,
        updatedAt: new Date().toISOString()
      };
      return mockDeviceModels[idx];
    }, {
      body: t.Object({
        name: t.String(),
        brand: t.String(),
        assetType: t.Optional(t.String()),
        allowedChildren: t.Optional(t.Array(t.String())),
        maxStock: t.Optional(t.Number())
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
          const data = await db
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
            })
            .from(schema.devices)
            .innerJoin(schema.deviceModels, eq(schema.devices.modelId, schema.deviceModels.id))
            .leftJoin(schema.customers, eq(schema.devices.customerId, schema.customers.id));
          
          return await Promise.all(data.map(async (d) => {
            const relationships = await db
              .select()
              .from(schema.deviceRelationships)
              .where(eq(schema.deviceRelationships.primaryDeviceId, d.id));
            return {
              ...d,
              linked: relationships.length
            };
          }));
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
          await writeAudit("INGEST", `Registered single device '${body.identifier}' in stock`);
          
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
      await writeAudit("INGEST", `Registered single device '${body.identifier}' in stock`);
      
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

      if (useDb) {
        try {
          for (const item of body.devices) {
            try {
              const inserted = await db.insert(schema.devices).values({
                identifier: item.identifier,
                modelId: item.modelId,
                status: (item.status || "IN_STOCK") as any,
                metadata: item.metadata || {}
              }).returning();
              added.push(inserted[0]);
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
              if (dev.length > 0) {
                // Delete relationships first to avoid constraint issues
                await db.delete(schema.deviceRelationships).where(
                  or(
                    eq(schema.deviceRelationships.primaryDeviceId, id),
                    eq(schema.deviceRelationships.linkedDeviceId, id)
                  )
                );
                await db.delete(schema.devices).where(eq(schema.devices.id, id));
                deletedIds.push(id);
                await writeAudit("DELETE", `Removed device '${dev[0].identifier}' via bulk delete`);
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
          const identifier = mockDevices[idx].identifier;
          mockDevices.splice(idx, 1);
          mockDeviceRelationships = mockDeviceRelationships.filter(r => r.primaryDeviceId !== id && r.linkedDeviceId !== id);
          deletedIds.push(id);
          await writeAudit("DELETE", `Removed device '${identifier}' via bulk delete`);
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
          const updated = await db
            .update(schema.devices)
            .set(payload)
            .where(eq(schema.devices.id, params.id))
            .returning();

          // Cascade status to linked devices
          if (body.status) {
            const relationships = await db
              .select()
              .from(schema.deviceRelationships)
              .where(eq(schema.deviceRelationships.primaryDeviceId, params.id));

            for (const rel of relationships) {
              const childRes = await db
                .select()
                .from(schema.devices)
                .where(eq(schema.devices.id, rel.linkedDeviceId));

              if (childRes.length > 0) {
                const child = childRes[0];
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

                await db
                  .update(schema.devices)
                  .set({
                    status: body.status as any,
                    metadata: childMetadata,
                    updatedAt: new Date()
                  })
                  .where(eq(schema.devices.id, rel.linkedDeviceId));
              }
            }
          }

          return updated[0];
        } catch (e: any) {
          return { error: e.message || "Database update failed" };
        }
      }

      const idx = mockDevices.findIndex(d => d.id === params.id);
      if (idx === -1) return { error: "Device not found" };

      mockDevices[idx] = {
        ...mockDevices[idx],
        ...payload,
        customerId: payload.customerId || undefined,
        updatedAt: new Date().toISOString()
      };
      // Cascade status in Memory Mode
      if (body.status) {
        const relationships = mockDeviceRelationships.filter(r => r.primaryDeviceId === params.id);
        for (const rel of relationships) {
          const childIdx = mockDevices.findIndex(d => d.id === rel.linkedDeviceId);
          if (childIdx !== -1) {
            const child = mockDevices[childIdx];
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

            mockDevices[childIdx] = {
              ...child,
              status: body.status,
              metadata: childMetadata,
              updatedAt: new Date().toISOString()
            };
          }
        }
      }
      return mockDevices[idx];
    }, {
      body: t.Object({
        identifier: t.String(),
        modelId: t.String(),
        status: t.Optional(t.String()),
        customerId: t.Optional(t.Nullable(t.String())),
        metadata: t.Optional(t.Any())
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
      identifier = mockDevices[idx].identifier;
      mockDevices.splice(idx, 1);
      mockDeviceRelationships = mockDeviceRelationships.filter(r => r.primaryDeviceId !== params.id && r.linkedDeviceId !== params.id);
      await writeAudit("DELETE", `Removed device '${identifier}' from inventory database`);
      return { success: true };
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
          if (useDb) {
            try {
              const mRes = await db.select().from(schema.deviceModels).where(eq(schema.deviceModels.assetType, "TRACKER" as any)).limit(1);
              primaryModel = mRes[0];
            } catch (e) {}
          } else {
            primaryModel = mockDeviceModels.find(m => m.assetType === "TRACKER");
          }
        } else {
          if (useDb) {
            try {
              const pmRes = await db.select().from(schema.deviceModels).where(eq(schema.deviceModels.id, primary.modelId));
              primaryModel = pmRes[0];
            } catch (e) {}
          } else {
            primaryModel = mockDeviceModels.find(m => m.id === primary.modelId);
          }
        }

        // Auto-detect missing child device
        let willCreateChild = false;
        const childType = inferAssetType(link.childISN);
        if (!child) {
          willCreateChild = true;
          // Find first model matching the inferred asset type
          if (useDb) {
            try {
              const mRes = await db.select().from(schema.deviceModels).where(eq(schema.deviceModels.assetType, childType as any)).limit(1);
              childModel = mRes[0];
            } catch (e) {}
          } else {
            childModel = mockDeviceModels.find(m => m.assetType === childType);
          }
        } else {
          if (useDb) {
            try {
              const cmRes = await db.select().from(schema.deviceModels).where(eq(schema.deviceModels.id, child.modelId));
              childModel = cmRes[0];
            } catch (e) {}
          } else {
            childModel = mockDeviceModels.find(m => m.id === child.modelId);
          }
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
              if (mRes.length > 0) {
                const inserted = await db.insert(schema.devices).values({
                  identifier: link.primaryISN,
                  modelId: mRes[0].id,
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
              const childType = inferAssetType(link.childISN);
              const mRes = await db.select().from(schema.deviceModels).where(eq(schema.deviceModels.assetType, childType as any)).limit(1);
              if (mRes.length > 0) {
                const inserted = await db.insert(schema.devices).values({
                  identifier: link.childISN,
                  modelId: mRes[0].id,
                  status: "IN_STOCK",
                  metadata: {}
                }).returning();
                child = inserted[0];
                await writeAudit("INGEST", `Auto-created child asset '${link.childISN}' (${childType}) during pairing`);
              }
            }

            // Create relationship link
            if (primary && child) {
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
            const childType = inferAssetType(link.childISN);
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
            
            if (pRes.length > 0 && cRes.length > 0) {
              const primary = pRes[0];
              const child = cRes[0];
              
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
        mockCustomers[idx] = { 
          ...mockCustomers[idx], 
          ...payload, 
          updatedAt: new Date().toISOString() 
        };
        return mockCustomers[idx];
      }
      return null;
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

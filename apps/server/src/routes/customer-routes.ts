import { Elysia, t } from "elysia";
import { randomUUID } from "crypto";
import { db } from "@ims_pro/db";
import * as schema from "@ims_pro/db/schema/ims";
import { eq, and, desc, sql } from "drizzle-orm";
import { useDb } from "../lib/db-init.js";
import { 
  mockCustomers, 
  mockDevices, 
  mockDeviceModels, 
  mockDeviceAuditLogs,
  type Customer
} from "../lib/mock-data.js";
import { writeAudit } from "../lib/utils.js";

const customerTypeSchema = t.Union([
  t.Literal("PERSON"),
  t.Literal("COMPANY"),
]);

export const customerRoutes = new Elysia({ prefix: '/api/customers' })
  .get("/", async () => {
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

        // Returned devices
        const returnedLogs = await db
          .select({
            id: schema.deviceAuditLogs.deviceId,
            identifier: schema.deviceAuditLogs.deviceIdentifier,
            returnedAt: schema.deviceAuditLogs.createdAt,
            modelName: schema.deviceModels.name
          })
          .from(schema.deviceAuditLogs)
          .leftJoin(schema.devices, eq(schema.deviceAuditLogs.deviceId, schema.devices.id))
          .leftJoin(schema.deviceModels, eq(schema.devices.modelId, schema.deviceModels.id))
          .where(
            and(
              eq(schema.deviceAuditLogs.customerId, params.id),
              eq(schema.deviceAuditLogs.actionType, "RETURN")
            )
          )
          .orderBy(desc(schema.deviceAuditLogs.createdAt));
        
        const seen = new Set<string>();
        const returned = [];
        for (const log of returnedLogs) {
          const serial = log.identifier;
          if (serial && !seen.has(serial)) {
            seen.add(serial);
            returned.push({
              id: log.id,
              identifier: log.identifier,
              status: "IN_STOCK",
              modelName: log.modelName || "Unknown Model",
              returnedAt: log.returnedAt
            });
          }
        }

        return { dispatched, returned };
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

    const returnedLogs = mockDeviceAuditLogs.filter(
      log => log.customerId === params.id && log.actionType === 'RETURN'
    );
    const seenMem = new Set<string>();
    const returned = [];
    for (const log of returnedLogs) {
      const serial = log.deviceIdentifier;
      if (serial && !seenMem.has(serial)) {
        seenMem.add(serial);
        const dev = mockDevices.find(d => d.id === log.deviceId || d.identifier === serial);
        const modelName = dev ? (mockDeviceModels.find(m => m.id === dev.modelId)?.name || 'Unknown') : 'Unknown Model';
        returned.push({
          id: log.deviceId || '',
          identifier: serial,
          status: "IN_STOCK",
          modelName,
          returnedAt: log.createdAt
        });
      }
    }

    return { dispatched, returned };
  })
  .post("/", async ({ body, user }: any) => {
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
        const createdCustomer = res[0];
        if (!createdCustomer) {
          return { error: "Customer creation failed" };
        }
        await writeAudit("CUSTOMER_CREATE", `Created customer ${body.name}`, null, null, createdCustomer.id, user?.id);
        return createdCustomer;
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
    await writeAudit("CUSTOMER_CREATE", `Created customer ${body.name} (In-Memory)`, null, null, newCustomer.id, user?.id);
    return newCustomer;
  }, {
    body: t.Object({
      name: t.String({ minLength: 1 }),
      type: customerTypeSchema,
      email: t.Optional(t.String({ format: "email" })),
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
      name: t.String({ minLength: 1 }),
      type: customerTypeSchema,
      email: t.Optional(t.String({ format: "email" })),
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
  });

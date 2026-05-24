import { Elysia, t } from "elysia";
import { randomUUID } from "crypto";
import { db } from "../db/index.js";
import * as schema from "../db/schema.js";
import { eq, and, or, ilike, desc, sql } from "drizzle-orm";
import { useDb } from "../lib/db-init.js";
import { 
  mockDevices, 
  mockDeviceModels, 
  mockDeviceAuditLogs, 
  mockQcReports, 
  type Device,
  setMockDeviceRelationships,
  mockDeviceRelationships
} from "../lib/mock-data.js";
import { 
  writeAudit, 
  getCachedRegex, 
  cascadeDeviceStatusDb, 
  cascadeDeviceStatusMemory 
} from "../lib/utils.js";

export const deviceRoutes = new Elysia({ prefix: '/api/devices' })
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
        const whereClause = conditions.length > 0 ? and(...conditions) : undefined;

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
            linked: sql<number>`count(${schema.deviceRelationships.id})::int`
          })
          .from(schema.devices)
          .innerJoin(schema.deviceModels, eq(schema.devices.modelId, schema.deviceModels.id))
          .leftJoin(schema.customers, eq(schema.devices.customerId, schema.customers.id))
          .leftJoin(schema.deviceRelationships, eq(schema.devices.id, schema.deviceRelationships.primaryDeviceId))
          .where(whereClause)
          .groupBy(
            schema.devices.id,
            schema.deviceModels.id,
            schema.deviceModels.name,
            schema.deviceModels.assetType,
            schema.customers.id,
            schema.customers.name
          );
        
        return data;
      } catch (e) {
        console.error(e);
        return [];
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

    const modelMap = new Map(mockDeviceModels.map(m => [m.id, m]));
    const relCountMap = new Map<string, number>();
    for (const rel of mockDeviceRelationships) {
      relCountMap.set(rel.primaryDeviceId, (relCountMap.get(rel.primaryDeviceId) || 0) + 1);
    }

    return filtered.map(d => {
      const model = modelMap.get(d.modelId);
      const linkedCount = relCountMap.get(d.id) || 0;
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
    const modelMap = new Map(allModels.map(m => [m.id, m]));

    // 1. Intra-batch duplicates check
    const batchIdentifiers = new Set<string>();
    const itemsToIngest: typeof body.devices = [];

    for (const item of body.devices) {
      if (batchIdentifiers.has(item.identifier)) {
        errors.push(`Device '${item.identifier}': Duplicate serial in upload batch`);
        continue;
      }
      batchIdentifiers.add(item.identifier);

      // Pattern Validation
      const model = modelMap.get(item.modelId);
      if (model && model.identifierPattern) {
        try {
          const regex = getCachedRegex(model.identifierPattern);
          if (!regex.test(item.identifier)) {
            errors.push(`Device '${item.identifier}': Does not match validation pattern '${model.identifierPattern}'`);
            continue;
          }
        } catch (e) {
          console.error("Invalid regex format configured:", model.identifierPattern);
        }
      }
      itemsToIngest.push(item);
    }

    if (itemsToIngest.length === 0) {
      return { success: true, addedCount: 0, errors };
    }

    if (useDb) {
      try {
        // Check DB duplicate serials in bulk
        const existingDevices = await db
          .select({ identifier: schema.devices.identifier })
          .from(schema.devices)
          .where(sql`identifier IN (${sql.join(itemsToIngest.map(item => sql`${item.identifier}`), sql`, `)})`);
        
        const dbDuplicates = new Set(existingDevices.map(d => d.identifier));
        const finalInsertItems: any[] = [];

        for (const item of itemsToIngest) {
          if (dbDuplicates.has(item.identifier)) {
            errors.push(`Device '${item.identifier}': Serial already exists in database`);
            continue;
          }
          finalInsertItems.push({
            identifier: item.identifier,
            modelId: item.modelId,
            status: (item.status || "IN_STOCK") as any,
            metadata: item.metadata || {}
          });
        }

        if (finalInsertItems.length > 0) {
          // Transaction for bulk inserts
          await db.transaction(async (tx) => {
            const inserted = await tx.insert(schema.devices).values(finalInsertItems).returning();
            added.push(...inserted);

            // Bulk write audit logs
            const auditValues = inserted.map(device => ({
              actionType: "INGEST",
              details: `Registered single device '${device.identifier}' in stock via bulk upload`,
              deviceId: device.id,
              deviceIdentifier: device.identifier
            }));
            await tx.insert(schema.deviceAuditLogs).values(auditValues);
            
            // Summary Audit Log
            await tx.insert(schema.deviceAuditLogs).values({
              actionType: "INGEST",
              details: `Batch ingested ${inserted.length} devices into inventory`
            });
          });
        }

        return { success: true, addedCount: added.length, errors };
      } catch (e: any) {
        console.error("Database bulk ingestion failed:", e);
        return { success: false, addedCount: 0, errors: [...errors, e.message || String(e)] };
      }
    }

    // Memory Mode
    const existingInSystem = new Set(mockDevices.map(d => d.identifier));
    for (const item of itemsToIngest) {
      if (existingInSystem.has(item.identifier)) {
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

    if (body.ids.length === 0) {
      return { success: true, deletedCount: 0, errors };
    }

    if (useDb) {
      try {
        const idsToQuery = body.ids;
        const devicesToDelete = await db
          .select({ id: schema.devices.id, identifier: schema.devices.identifier })
          .from(schema.devices)
          .where(sql`id IN (${sql.join(idsToQuery.map(id => sql`${id}`), sql`, `)})`);
        
        if (devicesToDelete.length > 0) {
          const foundIds = devicesToDelete.map(d => d.id);
          await db.transaction(async (tx) => {
            // Delete relationships first to avoid constraint issues
            await tx
              .delete(schema.deviceRelationships)
              .where(
                or(
                  sql`primary_device_id IN (${sql.join(foundIds.map(id => sql`${id}`), sql`, `)})`,
                  sql`linked_device_id IN (${sql.join(foundIds.map(id => sql`${id}`), sql`, `)})`
                )
              );
            
            // Delete devices
            await tx
              .delete(schema.devices)
              .where(sql`id IN (${sql.join(foundIds.map(id => sql`${id}`), sql`, `)})`);
            
            // Bulk audit logs
            const auditValues = devicesToDelete.map(d => ({
              actionType: "DELETE",
              details: `Removed device '${d.identifier}' via bulk delete`,
              deviceId: null,
              deviceIdentifier: d.identifier
            }));
            await tx.insert(schema.deviceAuditLogs).values(auditValues);
            
            deletedIds.push(...foundIds);
          });
        }
        return { success: true, deletedCount: deletedIds.length, errors };
      } catch (e: any) {
        console.error("Database bulk delete failed:", e);
        return { success: false, deletedCount: 0, errors: [...errors, e.message || String(e)] };
      }
    }

    // Memory Mode
    for (const id of body.ids) {
      const idx = mockDevices.findIndex(d => d.id === id);
      if (idx !== -1) {
        const deviceObj = mockDevices[idx];
        if (deviceObj) {
          const identifier = deviceObj.identifier;
          mockDevices.splice(idx, 1);
          setMockDeviceRelationships(mockDeviceRelationships.filter(r => r.primaryDeviceId !== id && r.linkedDeviceId !== id));
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

        // If a new QC checklist is submitted, log to the qcReports table
        if (metadata && metadata.qcChecklist && metadata.qcStatus) {
          await db.insert(schema.qcReports).values({
            deviceId: params.id,
            technicianId: metadata.technicianId || "Default Technician",
            items: metadata.qcChecklist,
            overallStatus: metadata.qcStatus,
            completedAt: new Date()
          });
        }

        // Audit change
        if (oldDevice) {
          if (metadata.replacedBy) {
            await writeAudit("SWAP", `Hardware Swap: Unit replaced by '${metadata.replacedBy}' (Status updated to DAMAGED)`, params.id, body.identifier, null);
          } else if (metadata.replacesUnit) {
            await writeAudit("SWAP", `Hardware Swap: Unit deployed as replacement for '${metadata.replacesUnit}'`, params.id, body.identifier, null);
          } else if (oldDevice.status !== payload.status) {
            await writeAudit("STATUS_CHANGE", `Status changed from ${oldDevice.status} to ${payload.status}`, params.id, body.identifier, null);
          }
          if (oldDevice.customerId !== payload.customerId) {
            const action = payload.customerId ? "DISPATCH" : "RETURN";
            const detailText = payload.customerId 
              ? `Device '${body.identifier}' dispatched to customer`
              : `Device '${body.identifier}' returned to warehouse stock`;
            const targetCustomerId = payload.customerId || oldDevice.customerId;
            await writeAudit(action, detailText, params.id, body.identifier, targetCustomerId);
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

    // Log QC reports in memory
    if (metadata && metadata.qcChecklist && metadata.qcStatus) {
      mockQcReports.push({
        id: randomUUID(),
        deviceId: params.id,
        technicianId: metadata.technicianId || "Default Technician",
        items: metadata.qcChecklist,
        overallStatus: metadata.qcStatus,
        completedAt: new Date().toISOString()
      });
    }

    // Audit change
    if (metadata.replacedBy) {
      await writeAudit("SWAP", `Hardware Swap: Unit replaced by '${metadata.replacedBy}' (Status updated to DAMAGED)`, params.id, body.identifier, null);
    } else if (metadata.replacesUnit) {
      await writeAudit("SWAP", `Hardware Swap: Unit deployed as replacement for '${metadata.replacesUnit}'`, params.id, body.identifier, null);
    } else if (oldStatus !== payload.status) {
      await writeAudit("STATUS_CHANGE", `Status changed from ${oldStatus} to ${payload.status}`, params.id, body.identifier, null);
    }
    if (oldCustomerId !== payload.customerId) {
      const action = payload.customerId ? "DISPATCH" : "RETURN";
      const detailText = payload.customerId 
        ? `Device '${body.identifier}' dispatched to customer`
        : `Device '${body.identifier}' returned to warehouse stock`;
      const targetCustomerId = payload.customerId || oldCustomerId;
      await writeAudit(action, detailText, params.id, body.identifier, targetCustomerId);
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

          // Capability Matrix Validation
          const newModelRes = await tx
            .select()
            .from(schema.deviceModels)
            .where(eq(schema.deviceModels.id, newDevice.modelId))
            .limit(1);
          const newModel = newModelRes[0];
          if (!newModel) {
            return { error: "Replacement device model not found" };
          }

          const allowed = Array.isArray(newModel.allowedChildren) 
            ? newModel.allowedChildren 
            : JSON.parse((newModel.allowedChildren as string) || "[]");

          const childRels = await tx
            .select()
            .from(schema.deviceRelationships)
            .where(eq(schema.deviceRelationships.primaryDeviceId, body.oldDeviceId));

          if (childRels.length > 0) {
            const childIds = childRels.map(r => r.linkedDeviceId);
            const children = await tx
              .select({
                id: schema.devices.id,
                identifier: schema.devices.identifier,
                assetType: schema.deviceModels.assetType
              })
              .from(schema.devices)
              .innerJoin(schema.deviceModels, eq(schema.devices.modelId, schema.deviceModels.id))
              .where(sql`devices.id IN (${sql.join(childIds.map(id => sql`${id}`), sql`, `)})`);
            
            for (const child of children) {
              if (!allowed.includes(child.assetType)) {
                throw new Error(`Replacement model '${newModel.name}' does not accept child component '${child.identifier}' of type '${child.assetType}'`);
              }
            }
          }

          const customerId = oldDevice.customerId;
          const customerName = (oldDevice.metadata as Record<string, any>)?.customerName || "RMA Replacement Client";

          // Transfer relationships
          if (childRels.length > 0) {
            await tx
              .update(schema.deviceRelationships)
              .set({ primaryDeviceId: body.newDeviceId })
              .where(eq(schema.deviceRelationships.primaryDeviceId, body.oldDeviceId));
          }

          // Update old device
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

          // Update new device
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

          // Cascade status recursively
          await cascadeDeviceStatusDb(body.newDeviceId, "DISPATCHED", customerId, updatedNewMetadata, tx);

          // Audit logs
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

          if (childRels.length > 0) {
            const childIds = childRels.map(r => r.linkedDeviceId);
            const children = await tx
              .select({ id: schema.devices.id, identifier: schema.devices.identifier })
              .from(schema.devices)
              .where(sql`id IN (${sql.join(childIds.map(id => sql`${id}`), sql`, `)})`);
            
            const auditValues = children.flatMap(child => [
              {
                actionType: "LINK",
                details: `Inherited child asset '${child.identifier}' from faulty unit '${oldDevice.identifier}' during swap`,
                deviceId: newDevice.id,
                deviceIdentifier: newDevice.identifier
              },
              {
                actionType: "LINK",
                details: `Linked to replacement unit '${newDevice.identifier}' due to swap from '${oldDevice.identifier}'`,
                deviceId: child.id,
                deviceIdentifier: child.identifier
              }
            ]);
            if (auditValues.length > 0) {
              await tx.insert(schema.deviceAuditLogs).values(auditValues);
            }
          }

          return { success: true };
        });
      } catch (e: any) {
        console.error("Database transaction swap failed:", e);
        return { error: e.message || "Database execution failed" };
      }
    }

    // Memory Mode
    const oldIdx = mockDevices.findIndex(d => d.id === body.oldDeviceId);
    const newIdx = mockDevices.findIndex(d => d.id === body.newDeviceId);
    if (oldIdx === -1) return { error: "Faulty device not found" };
    if (newIdx === -1) return { error: "Replacement device not found" };

    const oldDevice = mockDevices[oldIdx] as Device;
    const newDevice = mockDevices[newIdx] as Device;

    if (!oldDevice || !newDevice) {
      return { error: "Faulty or replacement device not found in memory" };
    }

    if (newDevice.status !== "IN_STOCK") {
      return { error: `Replacement device is not in stock (current status: ${newDevice.status})` };
    }

    // Capability Matrix check in Memory
    const newModel = mockDeviceModels.find(m => m.id === newDevice.modelId);
    if (!newModel) return { error: "Replacement device model not found" };
    const allowed = newModel.allowedChildren || [];

    const childRels = mockDeviceRelationships.filter(r => r.primaryDeviceId === body.oldDeviceId);
    for (const rel of childRels) {
      const child = mockDevices.find(d => d.id === rel.linkedDeviceId);
      if (child) {
        const childModel = mockDeviceModels.find(m => m.id === child.modelId);
        if (childModel && !allowed.includes(childModel.assetType)) {
          return { error: `Validation failure: Replacement model '${newModel.name}' does not accept child component '${child.identifier}' of type '${childModel.assetType}'` };
        }
      }
    }

    const customerId = oldDevice.customerId;
    const customerName = oldDevice.metadata?.customerName || "RMA Replacement Client";

    // Transfer relationships in memory
    for (const rel of childRels) {
      rel.primaryDeviceId = body.newDeviceId;
    }

    // Update old device
    const updatedOldMetadata = {
      ...(oldDevice.metadata || {}),
      replacedBy: newDevice.identifier,
      swappedAt: new Date().toISOString()
    };
    const updatedOldDevice: Device = {
      ...oldDevice,
      status: "DAMAGED",
      customerId: undefined,
      metadata: updatedOldMetadata,
      updatedAt: new Date().toISOString()
    };
    mockDevices[oldIdx] = updatedOldDevice;

    // Update new device
    const updatedNewMetadata = {
      ...(newDevice.metadata || {}),
      customerName,
      replacesUnit: oldDevice.identifier,
      dispatchedAt: new Date().toISOString(),
      swappedAt: new Date().toISOString()
    };
    const updatedNewDevice: Device = {
      ...newDevice,
      status: "DISPATCHED",
      customerId: customerId,
      metadata: updatedNewMetadata,
      updatedAt: new Date().toISOString()
    };
    mockDevices[newIdx] = updatedNewDevice;

    // Cascade status recursively
    cascadeDeviceStatusMemory(body.newDeviceId, "DISPATCHED", customerId, updatedNewMetadata);

    // Audit logs in memory
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
    setMockDeviceRelationships(mockDeviceRelationships.filter(r => r.primaryDeviceId !== params.id && r.linkedDeviceId !== params.id));
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
  });

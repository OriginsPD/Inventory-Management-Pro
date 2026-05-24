import { Elysia, t } from "elysia";
import { randomUUID } from "crypto";
import { db } from "../db/index.js";
import * as schema from "../db/schema.js";
import { eq, and } from "drizzle-orm";
import { useDb } from "../lib/db-init.js";
import { 
  mockDevices, 
  mockDeviceModels, 
  mockDeviceRelationships,
  setMockDeviceRelationships
} from "../lib/mock-data.js";
import { 
  writeAudit, 
  inferAssetType,
  isAncestorDb,
  isAncestorMemory,
  buildRelationshipMaps
} from "../lib/utils.js";

export const linkRoutes = new Elysia({ prefix: '/api/device-links' })
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
      let primaryModel: any;
      let childModel: any;

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

    // Intra-batch duplicates check
    const childToParentBatch = new Map<string, string>();
    for (const link of body.links) {
      const existingParent = childToParentBatch.get(link.childISN);
      if (existingParent && existingParent !== link.primaryISN) {
        return {
          success: false,
          createdCount: 0,
          errors: [`Intra-batch error: child serial '${link.childISN}' is linked to multiple parents in the same request.`]
        };
      }
      childToParentBatch.set(link.childISN, link.primaryISN);
    }

    if (useDb) {
      try {
        const result = await db.transaction(async (tx) => {
          const addedCount = { val: 0 };
          
          // Pre-fetch default tracker template model
          const primaryTemplateRes = await tx
            .select()
            .from(schema.deviceModels)
            .where(eq(schema.deviceModels.assetType, "TRACKER" as any))
            .limit(1);
          const defaultTrackerTemplate = primaryTemplateRes[0];

          for (const link of body.links) {
            let primary: any = null;
            let child: any = null;

            // Find or create primary
            const pRes = await tx.select().from(schema.devices).where(eq(schema.devices.identifier, link.primaryISN));
            if (pRes.length > 0) {
              primary = pRes[0];
            } else {
              if (defaultTrackerTemplate) {
                const inserted = await tx.insert(schema.devices).values({
                  identifier: link.primaryISN,
                  modelId: defaultTrackerTemplate.id,
                  status: "IN_STOCK",
                  metadata: {}
                }).returning();
                primary = inserted[0];
                await tx.insert(schema.deviceAuditLogs).values({
                  actionType: "INGEST",
                  details: `Auto-created primary tracker '${link.primaryISN}' during pairing`,
                  deviceId: primary.id,
                  deviceIdentifier: primary.identifier
                });
              }
            }

            // Find or create child
            const cRes = await tx.select().from(schema.devices).where(eq(schema.devices.identifier, link.childISN));
            if (cRes.length > 0) {
              child = cRes[0];
            } else {
              const childType = inferAssetType(link.childISN, allModels);
              const mRes = await tx
                .select()
                .from(schema.deviceModels)
                .where(eq(schema.deviceModels.assetType, childType as any))
                .limit(1);
              const childTemplate = mRes[0];
              if (childTemplate) {
                const inserted = await tx.insert(schema.devices).values({
                  identifier: link.childISN,
                  modelId: childTemplate.id,
                  status: "IN_STOCK",
                  metadata: {}
                }).returning();
                child = inserted[0];
                await tx.insert(schema.deviceAuditLogs).values({
                  actionType: "INGEST",
                  details: `Auto-created child asset '${link.childISN}' (${childType}) during pairing`,
                  deviceId: child.id,
                  deviceIdentifier: child.identifier
                });
              }
            }

            if (primary && child) {
              // 1. Single Parent Constraint
              const otherParent = await tx
                .select()
                .from(schema.deviceRelationships)
                .where(eq(schema.deviceRelationships.linkedDeviceId, child.id))
                .limit(1);
              const firstParent = otherParent[0];
              if (firstParent && firstParent.primaryDeviceId !== primary.id) {
                throw new Error(`Child '${link.childISN}' is already linked to another parent.`);
              }

              // 2. Cycle Detection
              const isCycle = await isAncestorDb(child.id, primary.id, tx);
              if (isCycle) {
                throw new Error(`Circular dependency loop detected between '${link.childISN}' and '${link.primaryISN}'.`);
              }

              const dup = await tx
                .select()
                .from(schema.deviceRelationships)
                .where(
                  and(
                    eq(schema.deviceRelationships.primaryDeviceId, primary.id),
                    eq(schema.deviceRelationships.linkedDeviceId, child.id)
                  )
                );
              if (dup.length === 0) {
                await tx.insert(schema.deviceRelationships).values({
                  primaryDeviceId: primary.id,
                  linkedDeviceId: child.id
                });
                addedCount.val++;
                await tx.insert(schema.deviceAuditLogs).values({
                  actionType: "LINK",
                  details: `Linked tracker '${link.primaryISN}' with component '${link.childISN}'`,
                  deviceId: primary.id,
                  deviceIdentifier: link.primaryISN
                });
              }
            } else {
              throw new Error(`Could not resolve primary or child templates for '${link.primaryISN}' -> '${link.childISN}'.`);
            }
          }
          return { success: true, createdCount: addedCount.val };
        });
        return result;
      } catch (e: any) {
        console.error("Database relationship commit transaction rolled back:", e);
        return { success: false, createdCount: 0, errors: [e.message || String(e)] };
      }
    }

    // Memory Mode
    try {
      const childToParentMap = buildRelationshipMaps().childToParent;
      for (const link of body.links) {
        let primary = mockDevices.find(d => d.identifier === link.primaryISN);
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
            await writeAudit("INGEST", `Auto-created primary tracker '${link.primaryISN}' during pairing`, primary.id, link.primaryISN);
          }
        }

        let child = mockDevices.find(d => d.identifier === link.childISN);
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
            await writeAudit("INGEST", `Auto-created child asset '${link.childISN}' (${childType}) during pairing`, child.id, link.childISN);
          }
        }

        if (primary && child) {
          const otherParentId = childToParentMap.get(child.id);
          if (otherParentId && otherParentId !== primary.id) {
            throw new Error(`Child '${link.childISN}' is already linked to another parent.`);
          }

          const isCycle = isAncestorMemory(child.id, primary.id, childToParentMap);
          if (isCycle) {
            throw new Error(`Circular dependency loop detected between '${link.childISN}' and '${link.primaryISN}'.`);
          }

          const duplicate = mockDeviceRelationships.find(
            r => r.primaryDeviceId === primary!.id && r.linkedDeviceId === child!.id
          );
          if (!duplicate) {
            mockDeviceRelationships.push({
              id: randomUUID(),
              primaryDeviceId: primary.id,
              linkedDeviceId: child.id,
              createdAt: new Date().toISOString()
            });
            created++;
            childToParentMap.set(child.id, primary.id);
            await writeAudit("LINK", `Linked tracker '${link.primaryISN}' with component '${link.childISN}'`, primary.id, link.primaryISN);
          }
        } else {
          throw new Error(`Could not resolve primary or child templates for '${link.primaryISN}' -> '${link.childISN}'.`);
        }
      }
      return { success: true, createdCount: created, errors };
    } catch (e: any) {
      return { success: false, createdCount: 0, errors: [e.message || String(e)] };
    }
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
          setMockDeviceRelationships(mockDeviceRelationships.filter(
            r => !(r.primaryDeviceId === primary.id && r.linkedDeviceId === child.id)
          ));
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
  });

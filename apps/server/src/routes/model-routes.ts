import { Elysia, t } from "elysia";
import { randomUUID } from "crypto";
import { db } from "@ims_pro/db";
import * as schema from "@ims_pro/db/schema/ims";
import { eq } from "drizzle-orm";
import { useDb } from "../lib/db-init.js";
import { mockDeviceModels, type DeviceModel } from "../lib/mock-data.js";

const assetTypeSchema = t.Union([
  t.Literal("TRACKER"),
  t.Literal("SIM"),
  t.Literal("PERIPHERAL"),
  t.Literal("DASH_CAM"),
  t.Literal("SD_CARD"),
  t.Literal("PANIC_BUTTON"),
  t.Literal("FUEL_SENSOR"),
  t.Literal("KEYFOB"),
  t.Literal("TRAVEL_ADAPTER"),
]);

export const modelRoutes = new Elysia({ prefix: '/api/device-models' })
  .get("/", async () => {
    if (useDb) {
      try {
        return await db.select().from(schema.deviceModels).orderBy(schema.deviceModels.name);
      } catch (e) {
        console.error(e);
      }
    }
    return [...mockDeviceModels].sort((a, b) => a.name.localeCompare(b.name));
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
      name: t.String({ minLength: 1 }),
      brand: t.String({ minLength: 1 }),
      assetType: t.Optional(assetTypeSchema),
      allowedChildren: t.Optional(t.Array(assetTypeSchema)),
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
      name: t.String({ minLength: 1 }),
      brand: t.String({ minLength: 1 }),
      assetType: t.Optional(assetTypeSchema),
      allowedChildren: t.Optional(t.Array(assetTypeSchema)),
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
  });

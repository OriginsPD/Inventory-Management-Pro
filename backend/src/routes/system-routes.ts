import { Elysia } from "elysia";
import { db } from "../db/index.js";
import * as schema from "../db/schema.js";
import { desc } from "drizzle-orm";
import { useDb } from "../lib/db-init.js";
import { 
  mockDeviceAuditLogs, 
  mockDeviceModels, 
  mockDevices 
} from "../lib/mock-data.js";

export const systemRoutes = new Elysia()
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

  // -- Stock Alerts --
  .get("/api/stock-alerts", async () => {
    let allModels: any[];
    let allDevices: any[];

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
  });

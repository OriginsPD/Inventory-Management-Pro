import { Elysia } from "elysia";
import { db } from "../db/index.js";
import * as schema from "../db/schema.js";
import { eq, and, desc, sql, gte } from "drizzle-orm";
import { useDb } from "../lib/db-init.js";
import { mockDeviceAuditLogs, mockDevices, mockDeviceModels } from "../lib/mock-data.js";

export const analyticsRoutes = new Elysia({ prefix: '/api/analytics' })
  // -- Analytics: 7-Day Dispatches Trend --
  .get("/dispatches", async () => {
    const baseline = [14, 18, 15, 23, 20, 29, 36];
    let auditList: any[] = [];
    const sevenDaysAgo = new Date();
    sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);
    
    if (useDb) {
      try {
        auditList = await db
          .select()
          .from(schema.deviceAuditLogs)
          .where(
            and(
              eq(schema.deviceAuditLogs.actionType, "DISPATCH"),
              gte(schema.deviceAuditLogs.createdAt, sevenDaysAgo)
            )
          )
          .orderBy(desc(schema.deviceAuditLogs.createdAt));
      } catch (e) {
        console.error(e);
      }
    } else {
      const thresholdTime = sevenDaysAgo.getTime();
      auditList = mockDeviceAuditLogs.filter(
        log => log.actionType === "DISPATCH" && new Date(log.createdAt).getTime() >= thresholdTime
      );
    }

    const dateCounts = new Map<string, number>();
    for (const log of auditList) {
      const logDateKey = new Date(log.createdAt).toISOString().split("T")[0];
      if (logDateKey) {
        dateCounts.set(logDateKey, (dateCounts.get(logDateKey) || 0) + 1);
      }
    }

    const result = [];
    for (let i = 6; i >= 0; i--) {
      const date = new Date();
      date.setDate(date.getDate() - i);
      const dateStr = date.toLocaleDateString("en-US", { weekday: "short" });
      const dateKey = date.toISOString().split("T")[0];
      
      const realCount = dateKey ? (dateCounts.get(dateKey) || 0) : 0;

      result.push({
        day: dateStr,
        dispatches: (baseline[6 - i] ?? 0) + realCount
      });
    }
    return result;
  })

  // -- Analytics: Asset Distribution Breakdown --
  .get("/breakdown", async () => {
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
  });

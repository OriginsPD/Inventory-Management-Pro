import { Elysia } from "elysia";
import { db } from "../db/index.js";
import * as schema from "../db/schema.js";
import { eq, and, desc, sql, gte } from "drizzle-orm";
import { useDb } from "../lib/db-init.js";
import { mockDeviceAuditLogs, mockDevices, mockDeviceModels } from "../lib/mock-data.js";
import { AssetType } from "@ims-pro/shared";

export const analyticsRoutes = new Elysia({ prefix: '/api/analytics' })
  // -- Analytics: 7-Day Dispatches Trend --
  .get("/dispatches", async ({ query }) => {
    const period = String(query.period || "1d");
    const periodConfig: Record<string, { days: number; bucket: "hour" | "day" | "week" }> = {
      "1d": { days: 1, bucket: "hour" },
      "3m": { days: 90, bucket: "week" },
      "1y": { days: 365, bucket: "week" },
    };
    const selected = periodConfig[period] || periodConfig["1d"];

    let auditList: any[] = [];
    const sinceDate = new Date();
    sinceDate.setDate(sinceDate.getDate() - selected.days);
    
    if (useDb) {
      try {
        auditList = await db
          .select()
          .from(schema.deviceAuditLogs)
          .where(
            and(
              eq(schema.deviceAuditLogs.actionType, "DISPATCH"),
              gte(schema.deviceAuditLogs.createdAt, sinceDate)
            )
          )
          .orderBy(desc(schema.deviceAuditLogs.createdAt));
      } catch (e) {
        console.error(e);
      }
    } else {
      const thresholdTime = sinceDate.getTime();
      auditList = mockDeviceAuditLogs.filter(
        log => log.actionType === "DISPATCH" && new Date(log.createdAt).getTime() >= thresholdTime
      );
    }

    const bucketCounts = new Map<string, number>();

    const getWeekKey = (date: Date) => {
      const d = new Date(date);
      const day = d.getDay();
      const diff = d.getDate() - day + (day === 0 ? -6 : 1);
      d.setDate(diff);
      d.setHours(0, 0, 0, 0);
      return d.toISOString().split("T")[0] || "";
    };

    const getHourKey = (date: Date) => {
      const d = new Date(date);
      d.setMinutes(0, 0, 0);
      return d.toISOString();
    };

    for (const log of auditList) {
      const date = new Date(log.createdAt);
      const key = selected.bucket === "hour"
        ? getHourKey(date)
        : selected.bucket === "day"
          ? (date.toISOString().split("T")[0] || "")
          : getWeekKey(date);
      if (key) {
        bucketCounts.set(key, (bucketCounts.get(key) || 0) + 1);
      }
    }

    const result: { day: string; dispatches: number }[] = [];
    const steps =
      selected.bucket === "hour"
        ? 24
        : selected.bucket === "day"
          ? selected.days
          : Math.ceil(selected.days / 7);

    for (let i = steps - 1; i >= 0; i--) {
      const date = new Date();
      if (selected.bucket === "hour") {
        date.setHours(date.getHours() - i);
      } else if (selected.bucket === "day") {
        date.setDate(date.getDate() - i);
      } else {
        date.setDate(date.getDate() - i * 7);
      }

      const key = selected.bucket === "hour"
        ? getHourKey(date)
        : selected.bucket === "day"
          ? (date.toISOString().split("T")[0] || "")
          : getWeekKey(date);
      const realCount = key ? (bucketCounts.get(key) || 0) : 0;
      const label = selected.bucket === "hour"
        ? date.toLocaleTimeString("en-US", { hour: "numeric" })
        : date.toLocaleDateString("en-US", { month: "short", day: "numeric" });

      result.push({
        day: label,
        dispatches: realCount
      });
    }

    return result;
  })

  // -- Analytics: Asset Distribution Breakdown --
  .get("/breakdown", async () => {
    const breakdown = Object.fromEntries(
      AssetType.options.map((type) => [type, 0])
    ) as Record<string, number>;

    if (useDb) {
      try {
        const data = await db
          .select({
            type: schema.deviceModels.assetType,
          })
          .from(schema.devices)
          .innerJoin(schema.deviceModels, eq(schema.devices.modelId, schema.deviceModels.id));
        
        for (const row of data) {
          const type = String(row.type);
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
          const type = String(model.assetType);
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

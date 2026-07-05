import { Elysia } from 'elysia';
import { db } from '@ims_pro/db';
import * as schema from '@ims_pro/db/schema/ims';
import { eq, gte, desc } from 'drizzle-orm';
import { useDb } from '../lib/db-init.js';
import {
  mockDeviceAuditLogs,
  mockDeviceModels,
  mockDevices,
  mockQcReports,
} from '../lib/mock-data.js';

export const dashboardRoutes = new Elysia({ prefix: '/api/dashboard' })
  .get('/summary', async () => {
    let allDevices: any[] = [];
    let allModels: any[] = [];
    let stockAlerts: any[] = [];

    if (useDb) {
      try {
        allDevices = await db.select().from(schema.devices);
        allModels = await db.select().from(schema.deviceModels);
      } catch (e) {
        console.error(e);
        allDevices = mockDevices;
        allModels = mockDeviceModels;
      }
    } else {
      allDevices = mockDevices;
      allModels = mockDeviceModels;
    }

    stockAlerts = allModels.map((model: any) => {
      const maxStock = model.maxStock || 0;
      const inStock = allDevices.filter((d: any) => d.modelId === model.id && d.status === 'IN_STOCK').length;
      let level: 'HEALTHY' | 'WARNING' | 'LOW' = 'HEALTHY';
      if (maxStock > 0) {
        const ratio = inStock / maxStock;
        if (ratio < 0.3) level = 'LOW';
        else if (ratio < 0.6) level = 'WARNING';
      }
      return { modelId: model.id, name: model.name, level, inStock, maxStock };
    });

    const lowStockAlerts = stockAlerts.filter((a) => a.level === 'LOW' && (a.maxStock ?? 0) > 0).length;
    const warnStockAlerts = stockAlerts.filter((a) => a.level === 'WARNING' && (a.maxStock ?? 0) > 0).length;

    let qcPassRate = 0;
    let qcTotal = 0;

    if (useDb) {
      try {
        const qcRows = await db.select().from(schema.qcReports);
        qcTotal = qcRows.length;
        qcPassRate = qcTotal > 0
          ? Math.round((qcRows.filter((r) => r.overallStatus === 'PASS').length / qcTotal) * 1000) / 10
          : 0;
      } catch (e) {
        console.error(e);
      }
    } else {
      qcTotal = mockQcReports.length;
      qcPassRate = qcTotal > 0
        ? Math.round((mockQcReports.filter((r) => r.overallStatus === 'PASS').length / qcTotal) * 1000) / 10
        : 0;
    }

    return {
      totalDevices: allDevices.length,
      activeDispatched: allDevices.filter((d) => d.status === 'DISPATCHED').length,
      inStock: allDevices.filter((d) => d.status === 'IN_STOCK').length,
      inTesting: allDevices.filter((d) => d.status === 'TESTING').length,
      lowStockAlerts,
      warnStockAlerts,
      qcPassRate,
      qcTotal,
      stockAlerts,
    };
  })

  .get('/recent-activity', async () => {
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

  .get('/trends', async ({ query }) => {
    const period = String(query.period || '1d');
    const periodConfig: Record<string, { days: number; bucket: 'hour' | 'day' | 'week' }> = {
      '1d': { days: 1, bucket: 'hour' },
      '3m': { days: 90, bucket: 'week' },
      '1y': { days: 365, bucket: 'week' },
    };
    const selected = periodConfig[period] ?? periodConfig['1d']!;
    const sinceDate = new Date();
    sinceDate.setDate(sinceDate.getDate() - selected.days);

    let auditList: any[] = [];
    if (useDb) {
      try {
        auditList = await db
          .select()
          .from(schema.deviceAuditLogs)
          .where(gte(schema.deviceAuditLogs.createdAt, sinceDate))
          .orderBy(desc(schema.deviceAuditLogs.createdAt));
      } catch (e) {
        console.error(e);
        auditList = mockDeviceAuditLogs;
      }
    } else {
      auditList = mockDeviceAuditLogs.filter(
        (log) => new Date(log.createdAt).getTime() >= sinceDate.getTime(),
      );
    }

    const dispatches = auditList.filter((l) => l.actionType === 'DISPATCH').length;
    const ingestions = auditList.filter((l) => l.actionType === 'INGEST').length;

    return { period, dispatches, ingestions, total: auditList.length };
  });

export const qcRoutes = new Elysia({ prefix: '/api/qc' })
  .get('/stats', async () => {
    if (useDb) {
      try {
        const rows = await db.select().from(schema.qcReports);
        const total = rows.length;
        const passed = rows.filter((r) => r.overallStatus === 'PASS').length;
        return {
          total,
          passed,
          failed: total - passed,
          passRate: total > 0 ? Math.round((passed / total) * 1000) / 10 : 0,
        };
      } catch (e) {
        console.error(e);
      }
    }
    const total = mockQcReports.length;
    const passed = mockQcReports.filter((r) => r.overallStatus === 'PASS').length;
    return {
      total,
      passed,
      failed: total - passed,
      passRate: total > 0 ? Math.round((passed / total) * 1000) / 10 : 0,
    };
  });

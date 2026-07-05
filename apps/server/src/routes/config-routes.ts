import { Elysia, t } from 'elysia';
import { db } from '@ims_pro/db';
import * as schema from '@ims_pro/db/schema/ims';
import { eq, sql } from 'drizzle-orm';
import { useDb } from '../lib/db-init.js';
import { authMiddleware } from '../lib/middleware.js';
import { getMockSystemConfig, setMockSystemConfig } from '../lib/mock-preferences.js';

export const configRoutes = new Elysia({ prefix: '/api/config' })
  .use(authMiddleware)
  .get('/link-templates', async ({ user, set }: any) => {
    if (!user) {
      set.status = 401;
      return { error: 'Unauthorized' };
    }

    if (useDb) {
      try {
        const row = await db
          .select()
          .from(schema.systemConfig)
          .where(eq(schema.systemConfig.key, 'link_templates'))
          .limit(1);
        return row[0]?.value ?? [];
      } catch (e) {
        console.error(e);
      }
    }

    return getMockSystemConfig('link_templates') ?? [];
  })

  .put('/link-templates', async ({ user, body, set }: any) => {
    if (!user || user.role !== 'SUPER_USER') {
      set.status = 403;
      return { error: 'Forbidden' };
    }

    const { options } = body;

    if (useDb) {
      try {
        await db
          .insert(schema.systemConfig)
          .values({ key: 'link_templates', value: options, updatedAt: new Date() })
          .onConflictDoUpdate({
            target: schema.systemConfig.key,
            set: { value: options, updatedAt: new Date() },
          });
        return { success: true, options };
      } catch (e: any) {
        set.status = 400;
        return { error: e.message || 'Failed to save link templates' };
      }
    }

    setMockSystemConfig('link_templates', options);
    return { success: true, options };
  }, {
    body: t.Object({
      options: t.Array(t.Any()),
    }),
  })

  .get('/health', async () => {
    const started = Date.now();
    let dbOk = false;
    if (useDb) {
      try {
        await db.execute(sql`SELECT 1`);
        dbOk = true;
      } catch {
        dbOk = false;
      }
    } else {
      dbOk = true;
    }
    return {
      status: dbOk ? 'nominal' : 'degraded',
      engine: useDb ? 'postgresql' : 'in-memory',
      dbLatencyMs: Date.now() - started,
      version: '3.0.0',
    };
  });

import { randomUUID } from "crypto";
import { db } from "../db/index.js";
import * as schema from "../db/schema.js";
import { eq, sql } from "drizzle-orm";
import { useDb } from "./db-init.js";
import { mockDeviceAuditLogs, mockDevices, mockDeviceRelationships } from "./mock-data.js";

// Helper to write audit logs to Neon or in-memory
export async function writeAudit(
  action: string,
  text: string,
  deviceId?: string | null,
  deviceIdentifier?: string | null,
  customerId?: string | null
) {
  if (useDb) {
    try {
      await db.insert(schema.deviceAuditLogs).values({
        actionType: action,
        details: text,
        deviceId: deviceId || null,
        deviceIdentifier: deviceIdentifier || null,
        customerId: customerId || null
      });
    } catch (e) {
      console.error("Failed to write db audit log", e);
    }
  } else {
    mockDeviceAuditLogs.unshift({
      id: randomUUID(),
      actionType: action,
      details: text,
      deviceId: deviceId || undefined,
      deviceIdentifier: deviceIdentifier || undefined,
      customerId: customerId || undefined,
      createdAt: new Date().toISOString()
    });
    // Cap at 100 entries for memory health
    if (mockDeviceAuditLogs.length > 100) {
      mockDeviceAuditLogs.pop();
    }
  }
}

const regexCache = new Map<string, RegExp>();
export function getCachedRegex(pattern: string): RegExp {
  let regex = regexCache.get(pattern);
  if (!regex) {
    regex = new RegExp(pattern, "i");
    regexCache.set(pattern, regex);
  }
  return regex;
}

// Helper to infer device classification from serial string
export function inferAssetType(isn: string, models: any[]): string {
  const upper = isn.toUpperCase();
  
  // 1. Try to match isn against each model's pattern
  for (const m of models) {
    if (m.identifierPattern) {
      try {
        const regex = getCachedRegex(m.identifierPattern);
        if (regex.test(isn)) {
          return m.assetType;
        }
      } catch (e) {
        console.error(`Invalid regex pattern on model ${m.name}:`, m.identifierPattern);
      }
    }
  }

  // 2. Fallback to legacy heuristic matching
  if (upper.includes("SIM") || upper.startsWith("ICC")) return "SIM";
  if (upper.includes("SD")) return "SD_CARD";
  if (upper.includes("SOS") || upper.includes("PANIC") || upper.includes("FOB")) return "PANIC_BUTTON";
  return "TRACKER";
}


// Strict tree hierarchy helpers
export async function hasParentDb(deviceId: string): Promise<boolean> {
  try {
    const parentRes = await db
      .select()
      .from(schema.deviceRelationships)
      .where(eq(schema.deviceRelationships.linkedDeviceId, deviceId))
      .limit(1);
    return parentRes.length > 0;
  } catch (e) {
    console.error("Error in hasParentDb:", e);
    return false;
  }
}

export function hasParentMemory(deviceId: string): boolean {
  return mockDeviceRelationships.some(r => r.linkedDeviceId === deviceId);
}

export async function isAncestorDb(possibleAncestorId: string, currentDeviceId: string, tx?: any): Promise<boolean> {
  if (possibleAncestorId === currentDeviceId) return true;
  try {
    const client = tx || db;
    const result = await client.execute(sql`
      WITH RECURSIVE device_path AS (
        SELECT primary_device_id, linked_device_id 
        FROM device_relationships 
        WHERE linked_device_id = ${currentDeviceId}
        UNION ALL
        SELECT r.primary_device_id, r.linked_device_id 
        FROM device_relationships r
        INNER JOIN device_path dp ON r.linked_device_id = dp.primary_device_id
      )
      SELECT primary_device_id FROM device_path;
    `);
    const rows = Array.isArray(result) ? result : (result.rows || []);
    const ancestorIds = rows.map((row: any) => row.primary_device_id);
    return ancestorIds.includes(possibleAncestorId);
  } catch (e) {
    console.error("Error in isAncestorDb:", e);
  }
  return false;
}

export function buildRelationshipMaps() {
  const parentToChildren = new Map<string, string[]>();
  const childToParent = new Map<string, string>();
  for (const rel of mockDeviceRelationships) {
    childToParent.set(rel.linkedDeviceId, rel.primaryDeviceId);
    const children = parentToChildren.get(rel.primaryDeviceId) || [];
    children.push(rel.linkedDeviceId);
    parentToChildren.set(rel.primaryDeviceId, children);
  }
  return { parentToChildren, childToParent };
}

export function isAncestorMemory(
  possibleAncestorId: string,
  currentDeviceId: string,
  childToParentMap?: Map<string, string>
): boolean {
  if (possibleAncestorId === currentDeviceId) return true;
  const parentMap = childToParentMap || buildRelationshipMaps().childToParent;
  
  let currentId = currentDeviceId;
  const visited = new Set<string>();
  while (currentId) {
    if (visited.has(currentId)) break;
    visited.add(currentId);
    const parentId = parentMap.get(currentId);
    if (!parentId) break;
    if (parentId === possibleAncestorId) return true;
    currentId = parentId;
  }
  return false;
}

export async function cascadeDeviceStatusDb(
  deviceId: string,
  status: string,
  customerId: string | null,
  metadata: any,
  tx?: any
): Promise<void> {
  try {
    const client = tx || db;
    // 1. Fetch descendants recursively in a single query
    const descendants = await client.execute(sql`
      WITH RECURSIVE descendant_path AS (
        SELECT linked_device_id FROM device_relationships WHERE primary_device_id = ${deviceId}
        UNION ALL
        SELECT r.linked_device_id FROM device_relationships r
        INNER JOIN descendant_path dp ON r.primary_device_id = dp.linked_device_id
      )
      SELECT linked_device_id FROM descendant_path;
    `);

    const rows = Array.isArray(descendants) ? descendants : (descendants.rows || []);
    const childIds: string[] = rows.map((row: any) => row.linked_device_id);

    if (childIds.length > 0) {
      const patch: Record<string, any> = {};
      if (metadata.customerName) patch.customerName = metadata.customerName;
      if (metadata.dispatchedAt) patch.dispatchedAt = metadata.dispatchedAt;
      if (metadata.swappedAt) patch.swappedAt = metadata.swappedAt;
      if (metadata.qcStatus) patch.qcStatus = metadata.qcStatus;
      if (metadata.qcTestedAt) patch.qcTestedAt = metadata.qcTestedAt;

      let metadataExpr = sql`metadata || ${JSON.stringify(patch)}::jsonb`;
      if (!metadata.customerName) {
        metadataExpr = sql`${metadataExpr} - 'customerName'`;
      }
      if (!metadata.dispatchedAt) {
        metadataExpr = sql`${metadataExpr} - 'dispatchedAt'`;
      }

      await client
        .update(schema.devices)
        .set({
          status: status as any,
          customerId: customerId,
          metadata: sql`${metadataExpr}`,
          updatedAt: new Date()
        })
        .where(sql`id IN (${sql.join(childIds.map(id => sql`${id}`), sql`, `)})`);
    }
  } catch (e) {
    console.error("Error cascading status in DB:", e);
  }
}

export function cascadeDeviceStatusMemory(
  deviceId: string,
  status: string,
  customerId: string | undefined,
  metadata: any,
  parentToChildrenMap?: Map<string, string[]>
): void {
  const childrenMap = parentToChildrenMap || buildRelationshipMaps().parentToChildren;
  const devicesMap = new Map(mockDevices.map(d => [d.id, d]));
  
  const queue = [deviceId];
  const visited = new Set<string>();
  
  while (queue.length > 0) {
    const currentId = queue.shift()!;
    if (visited.has(currentId)) continue;
    visited.add(currentId);
    
    const children = childrenMap.get(currentId) || [];
    for (const childId of children) {
      const child = devicesMap.get(childId);
      if (child) {
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
        
        child.status = status;
        child.customerId = customerId;
        child.metadata = childMetadata;
        child.updatedAt = new Date().toISOString();
        
        queue.push(childId);
      }
    }
  }
}

export function toBetterAuthRequest(request: Request): Request {
  const url = new URL(request.url);
  const baseURL = process.env.BETTER_AUTH_URL || "http://localhost:3002";
  const targetUrl = new URL(url.pathname + url.search, baseURL);
  
  const headers = new Headers(request.headers);
  headers.set("host", targetUrl.host);
  
  const init: RequestInit = {
    method: request.method,
    headers
  };
  
  if (request.method !== "GET" && request.method !== "HEAD") {
    init.body = request.body;
    init.duplex = "half";
  }
  
  return new Request(targetUrl.toString(), init);
}

import { Elysia, t } from "elysia";
import { swagger } from "@elysiajs/swagger";
import { cors } from "@elysiajs/cors";
import { randomUUID } from "crypto";
import { db } from "./db/index.js";
import * as schema from "./db/schema.js";
import { eq, ne, and, or, like, ilike, desc, sql } from "drizzle-orm";
import { getBetterAuth, mockUsers, mockSessions, type InMemoryUser } from "./auth-service.js";

let useDb = false;

// Initialize connection test
async function initDbConnection() {
  const url = process.env.DATABASE_URL;
  console.log(`🔍 [IMS API] DATABASE_URL detected: ${url ? url.substring(0, 40) + '...' : 'NOT SET'}`);
  try {
    await db.select().from(schema.deviceModels).limit(1);
    useDb = true;
    console.log("⚡ [IMS API] Successfully connected to Neon DB / Postgres instance.");

    // Seed default admin user if not exists
    try {
      const existingAdmin = await db.select().from(schema.users).where(eq(schema.users.email, "admin@imspro.com")).limit(1);
      if (existingAdmin.length === 0) {
        console.log("Seeding default Super User admin@imspro.com in database...");
        const auth = getBetterAuth(true);
        if (auth) {
          await auth.api.signUpEmail({
            body: {
              email: "admin@imspro.com",
              password: "AdminPass123!",
              name: "System Admin"
            }
          });
          // Update the role to SUPER_USER
          await db.update(schema.users).set({ role: "SUPER_USER" }).where(eq(schema.users.email, "admin@imspro.com"));
          console.log("⚡ Super User admin@imspro.com seeded successfully.");
        }
      }
    } catch (err) {
      console.error("Failed to seed default Super User in database:", err);
    }
  } catch (e: any) {
    console.log("⚠️ [IMS API] Neon DB connection failed.");
    console.log(`   ❌ Error: ${e?.message || String(e)}`);
    if (process.env.NODE_ENV === 'production' || process.env.DATABASE_URL) {
      console.error("🚨 [IMS API] Database is configured but connection failed. Crashing server to prevent silent data loss.");
      process.exit(1);
    }
    console.log("ℹ️ [IMS API] Falling back to local In-Memory Database engine.");
    useDb = false;
  }
}

initDbConnection();

// In-Memory Database Fallbacks
interface DeviceModel {
  id: string;
  name: string;
  brand: string;
  assetType: string;
  allowedChildren: string[];
  maxStock?: number;
  identifierPattern?: string;
  createdAt: string;
  updatedAt: string;
}

interface Device {
  id: string;
  identifier: string;
  modelId: string;
  status: string;
  customerId?: string;
  metadata: Record<string, any>;
  createdAt: string;
  updatedAt: string;
}

interface Customer {
  id: string;
  name: string;
  type: 'PERSON' | 'COMPANY';
  phone?: string;
  email?: string;
  address?: string;
  taxId?: string;
  metadata: Record<string, any>;
  createdAt: string;
  updatedAt: string;
}

interface DeviceRelationship {
  id: string;
  primaryDeviceId: string;
  linkedDeviceId: string;
  createdAt: string;
}

interface AuditLog {
  id: string;
  actionType: string;
  details: string;
  createdAt: string;
  deviceId?: string;
  deviceIdentifier?: string;
  customerId?: string;
}

let mockQcReports: any[] = [];

let mockDeviceModels: DeviceModel[] = [
  {
    id: "m1",
    name: "Amber Shield V4",
    brand: "Amber Connect",
    assetType: "TRACKER",
    allowedChildren: ["SIM", "SD_CARD", "PANIC_BUTTON"],
    maxStock: 10,
    identifierPattern: "^TRK-\\d{6}$",
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  },
  {
    id: "m2",
    name: "Global IoT SIM Card",
    brand: "KORE Wireless",
    assetType: "SIM",
    allowedChildren: [],
    maxStock: 5,
    identifierPattern: "^SIM-\\d{6}$",
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  },
  {
    id: "m3",
    name: "SanDisk Industrial 32GB",
    brand: "SanDisk",
    assetType: "SD_CARD",
    allowedChildren: [],
    maxStock: 0,
    identifierPattern: "^SD-\\d{5}$",
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  },
  {
    id: "m4",
    name: "Wireless SOS Button",
    brand: "Amber Connect",
    assetType: "PANIC_BUTTON",
    allowedChildren: [],
    maxStock: 20,
    identifierPattern: "^PANIC-\\d{5}$",
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  }
];

let mockDevices: Device[] = [
  {
    id: "d1",
    identifier: "TRK-982103",
    modelId: "m1",
    status: "IN_STOCK",
    metadata: { firmware: "v1.0.4", hwRevision: "REV_A" },
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  },
  {
    id: "d2",
    identifier: "SIM-550192",
    modelId: "m2",
    status: "IN_STOCK",
    metadata: { carrier: "KORE Wireless", phoneNumber: "+18005550199" },
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  },
  {
    id: "d3",
    identifier: "SD-10293",
    modelId: "m3",
    status: "IN_STOCK",
    metadata: { capacity: "32GB", speedClass: "Class 10" },
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  }
];

let mockDeviceRelationships: DeviceRelationship[] = [];
let mockCustomers: Customer[] = [
  {
    id: "c1",
    name: "Acme Logistics",
    type: "COMPANY",
    email: "contact@acme-logs.com",
    phone: "+1 (555) 123-4567",
    address: "123 Supply Chain Ave, Industrial Park, NY",
    taxId: "TX-991023",
    metadata: {},
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  },
  {
    id: "c2",
    name: "John's Hauling",
    type: "PERSON",
    email: "john@hauling.com",
    phone: "+1 (555) 987-6543",
    address: "45 Hillside Terrace, Springfield, IL",
    metadata: {},
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  }
];
let mockDeviceAuditLogs: AuditLog[] = [
  {
    id: "l1",
    actionType: "INGEST",
    details: "Ingested Tracker unit TRK-982103 in warehouse stock",
    createdAt: new Date(Date.now() - 3600000).toISOString()
  },
  {
    id: "l2",
    actionType: "INGEST",
    details: "Ingested SIM Card SIM-550192",
    createdAt: new Date(Date.now() - 1800000).toISOString()
  }
];

// Helper to write audit logs to Neon or in-memory
async function writeAudit(
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
function getCachedRegex(pattern: string): RegExp {
  let regex = regexCache.get(pattern);
  if (!regex) {
    regex = new RegExp(pattern, "i");
    regexCache.set(pattern, regex);
  }
  return regex;
}

// Helper to infer device classification from serial string
function inferAssetType(isn: string, models: any[]): string {
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
async function hasParentDb(deviceId: string): Promise<boolean> {
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

function hasParentMemory(deviceId: string): boolean {
  return mockDeviceRelationships.some(r => r.linkedDeviceId === deviceId);
}

async function isAncestorDb(possibleAncestorId: string, currentDeviceId: string, tx?: any): Promise<boolean> {
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

function buildRelationshipMaps() {
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

function isAncestorMemory(
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

async function cascadeDeviceStatusDb(
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

function cascadeDeviceStatusMemory(
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

function toBetterAuthRequest(request: Request): Request {
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
    // @ts-expect-error: duplex property is required for request bodies in modern fetch
    init.duplex = "half";
  }
  
  return new Request(targetUrl.toString(), init);
}

const app = new Elysia()
  .use(swagger())
  .use(cors({
    credentials: true,
    origin: (request) => {
      const origin = request.headers.get("origin");
      if (!origin) return true;
      try {
        const url = new URL(origin);
        if (url.hostname === "localhost" || url.hostname === "127.0.0.1") {
          return origin;
        }
      } catch (_) {
        // ignore
      }
      return process.env.CORS_ORIGIN || "http://localhost:5173";
    }
  }))
  .derive(async ({ request }: { request: Request }) => {
    let user: any = null;
    let session: any = null;

    const cookies = request.headers.get("cookie") || "";
    let token = "";
    const match = cookies.match(/(?:^|; )better-auth\.session-token=([^;]*)/);
    if (match && match[1]) {
      token = decodeURIComponent(match[1]);
    }
    if (!token) {
      const authHeader = request.headers.get("authorization") || "";
      if (authHeader.startsWith("Bearer ")) {
        token = authHeader.substring(7);
      }
    }

    if (useDb) {
      try {
        const auth = getBetterAuth(useDb);
        if (auth) {
          const authSession = await auth.api.getSession({ headers: request.headers });
          if (authSession) {
            user = authSession.user;
            session = authSession.session;
          }
        }
      } catch (e) {
        // ignore
      }
    } else {
      if (token) {
        const mockSession = mockSessions.get(token);
        if (mockSession && mockSession.expiresAt > Date.now()) {
          const mockUser = Array.from(mockUsers.values()).find(u => u.id === mockSession.userId);
          if (mockUser) {
            user = {
              id: mockUser.id,
              name: mockUser.name,
              email: mockUser.email,
              role: mockUser.role
            };
            session = {
              id: token,
              userId: mockUser.id,
              expiresAt: mockSession.expiresAt,
              token
            };
          }
        }
      }
    }

    return { user, session } as { user: any; session: any };
  })
  .onBeforeHandle(({ request, user, set }: { request: Request; user: any; set: any }) => {
    const url = new URL(request.url);
    const path = url.pathname;
    const method = request.method;

    if (path.startsWith("/api") && !path.startsWith("/api/auth")) {
      if (!user) {
        set.status = 401;
        return { error: "Unauthorized: Session expired or invalid" };
      }

      if (["POST", "PUT", "PATCH", "DELETE"].includes(method)) {
        if (path.startsWith("/api/device-models")) {
          if (user.role !== "SUPER_USER") {
            set.status = 403;
            return { error: "Forbidden: Super User access required to manage device models" };
          }
        } else if (path.startsWith("/api/users")) {
          if (user.role !== "SUPER_USER") {
            set.status = 403;
            return { error: "Forbidden: Super User access required to manage users" };
          }
        } else {
          if (user.role !== "SUPER_USER" && user.role !== "TECHNICIAN") {
            set.status = 403;
            return { error: "Forbidden: Authorized Technician or Super User access required" };
          }
        }
      }
    }
  })

  // -- Auth routes --
  .group("/api/auth", (app) => app
    .post("/sign-in/email", async ({ body, set }) => {
      const { email, password } = body;
      
      if (useDb) {
        try {
          const auth = getBetterAuth(useDb);
          if (auth) {
            const baseURL = process.env.BETTER_AUTH_URL || "http://localhost:3002";
            const targetUrl = new URL("/api/auth/sign-in/email", baseURL);
            const rawResponse = await auth.handler(new Request(targetUrl.toString(), {
              method: "POST",
              headers: { 
                "Content-Type": "application/json",
                "host": targetUrl.host
              },
              body: JSON.stringify({ email, password })
            }));
            const setCookie = rawResponse.headers.get("set-cookie");
            if (setCookie) {
              set.headers["set-cookie"] = setCookie;
            }
            const data = await rawResponse.json();
            if (rawResponse.status >= 400) {
              set.status = rawResponse.status;
              return { error: data.message || "Invalid credentials" };
            }
            return data;
          }
        } catch (e: any) {
          set.status = 400;
          return { error: e.message || "Invalid credentials" };
        }
      }
      
      // Fallback Mock Sign-In
      const user = mockUsers.get(email);
      if (!user || user.passwordHash !== password) {
        set.status = 400;
        return { error: "Invalid email or password" };
      }
      
      const token = randomUUID();
      const expiresAt = Date.now() + 1000 * 60 * 60 * 24 * 7; // 7 days
      mockSessions.set(token, {
        id: token,
        userId: user.id,
        token: token,
        expiresAt,
        createdAt: new Date(),
        updatedAt: new Date(),
      });
      
      set.headers["set-cookie"] = `better-auth.session-token=${token}; Path=/; HttpOnly; SameSite=Lax; Max-Age=${60 * 60 * 24 * 7}`;
      return {
        session: {
          id: token,
          userId: user.id,
          expiresAt: new Date(expiresAt).toISOString(),
          token
        },
        user: {
          id: user.id,
          name: user.name,
          email: user.email,
          role: user.role
        }
      };
    }, {
      body: t.Object({
        email: t.String(),
        password: t.String()
      })
    })

    .get("/get-session", async ({ request, set }) => {
      const cookies = request.headers.get("cookie") || "";
      let token = "";
      const match = cookies.match(/(?:^|; )better-auth\.session-token=([^;]*)/);
      if (match && match[1]) {
        token = decodeURIComponent(match[1]);
      }
      if (!token) {
        const authHeader = request.headers.get("authorization") || "";
        if (authHeader.startsWith("Bearer ")) {
          token = authHeader.substring(7);
        }
      }

      if (useDb) {
        const auth = getBetterAuth(useDb);
        if (auth) {
          return await auth.handler(toBetterAuthRequest(request));
        }
      }

      // Fallback Mock session
      if (!token) {
        set.status = 401;
        return { session: null, user: null };
      }

      const mockSession = mockSessions.get(token);
      if (!mockSession || mockSession.expiresAt < Date.now()) {
        set.status = 401;
        return { session: null, user: null };
      }

      const mockUser = Array.from(mockUsers.values()).find(u => u.id === mockSession.userId);
      if (!mockUser) {
        set.status = 401;
        return { session: null, user: null };
      }

      return {
        session: {
          id: token,
          userId: mockUser.id,
          expiresAt: new Date(mockSession.expiresAt).toISOString(),
          token
        },
        user: {
          id: mockUser.id,
          name: mockUser.name,
          email: mockUser.email,
          role: mockUser.role
        }
      };
    })

    .post("/sign-out", async ({ request, set }) => {
      if (useDb) {
        const auth = getBetterAuth(useDb);
        if (auth) {
          return await auth.handler(toBetterAuthRequest(request));
        }
      }

      const cookies = request.headers.get("cookie") || "";
      let token = "";
      const match = cookies.match(/(?:^|; )better-auth\.session-token=([^;]*)/);
      if (match && match[1]) {
        token = decodeURIComponent(match[1]);
      }

      if (token) {
        mockSessions.delete(token);
      }

      set.headers["set-cookie"] = `better-auth.session-token=; Path=/; HttpOnly; SameSite=Lax; Max-Age=0`;
      return { success: true };
    })
  )

  // -- Users CRUD (Super User only) --
  .group("/api/users", (app: any) => app
    .onBeforeHandle(({ user, set }: any) => {
      if (!user || user.role !== "SUPER_USER") {
        set.status = 403;
        return { error: "Forbidden: Super User access required" };
      }
    })
    
    .get("/", async () => {
      if (useDb) {
        try {
          return await db
            .select({
              id: schema.users.id,
              name: schema.users.name,
              email: schema.users.email,
              role: schema.users.role,
              createdAt: schema.users.createdAt,
              updatedAt: schema.users.updatedAt
            })
            .from(schema.users);
        } catch (e) {
          console.error(e);
        }
      }
      
      return Array.from(mockUsers.values()).map(u => ({
        id: u.id,
        name: u.name,
        email: u.email,
        role: u.role,
        createdAt: u.createdAt,
        updatedAt: u.updatedAt
      }));
    })
    
    .post("/", async ({ body, set }: any) => {
      const { name, email, password, role } = body;
      
      if (useDb) {
        try {
          const auth = getBetterAuth(useDb);
          if (auth) {
            // Check if user already exists
            const existing = await db.select().from(schema.users).where(eq(schema.users.email, email)).limit(1);
            if (existing.length > 0) {
              set.status = 400;
              return { error: "User with this email already exists" };
            }
            
            const response = await auth.api.signUpEmail({
              body: { email, password, name }
            });
            // Update the role (signUpEmail doesn't take role directly)
            await db.update(schema.users).set({ role }).where(eq(schema.users.email, email));
            return { success: true, user: { ...response.user, role } };
          }
        } catch (e: any) {
          set.status = 400;
          return { error: e.message || "Failed to create user" };
        }
      }
      
      // Fallback Mock
      if (mockUsers.has(email)) {
        set.status = 400;
        return { error: "User with this email already exists" };
      }
      
      const newUser: InMemoryUser = {
        id: randomUUID(),
        name,
        email,
        role,
        passwordHash: password,
        createdAt: new Date(),
        updatedAt: new Date()
      };
      mockUsers.set(email, newUser);
      
      return {
        success: true,
        user: {
          id: newUser.id,
          name: newUser.name,
          email: newUser.email,
          role: newUser.role,
          createdAt: newUser.createdAt
        }
      };
    }, {
      body: t.Object({
        name: t.String(),
        email: t.String(),
        password: t.String(),
        role: t.String()
      })
    })

    .put("/:id", async ({ params, body, set }: any) => {
      const { name, email, role } = body;
      
      if (useDb) {
        try {
          const existing = await db
            .select()
            .from(schema.users)
            .where(and(eq(schema.users.email, email), ne(schema.users.id, params.id)))
            .limit(1);
          if (existing.length > 0) {
            set.status = 400;
            return { error: "User with this email already exists" };
          }
          
          const updated = await db
            .update(schema.users)
            .set({ name, email, role, updatedAt: new Date() })
            .where(eq(schema.users.id, params.id))
            .returning();
            
          return { success: true, user: updated[0] };
        } catch (e: any) {
          set.status = 400;
          return { error: e.message || "Failed to update user" };
        }
      }
      
      // Fallback Mock
      let foundUser: InMemoryUser | null = null;
      for (const u of mockUsers.values()) {
        if (u.id === params.id) {
          foundUser = u;
          break;
        }
      }
      
      if (!foundUser) {
        set.status = 404;
        return { error: "User not found" };
      }
      
      const clashingUser = mockUsers.get(email);
      if (clashingUser && clashingUser.id !== params.id) {
        set.status = 400;
        return { error: "User with this email already exists" };
      }
      
      mockUsers.delete(foundUser.email);
      const updatedUser: InMemoryUser = {
        ...foundUser,
        name,
        email,
        role,
        updatedAt: new Date()
      };
      mockUsers.set(email, updatedUser);
      
      return {
        success: true,
        user: {
          id: updatedUser.id,
          name: updatedUser.name,
          email: updatedUser.email,
          role: updatedUser.role
        }
      };
    }, {
      body: t.Object({
        name: t.String(),
        email: t.String(),
        role: t.String()
      })
    })

    .delete("/:id", async ({ params, set, user }: any) => {
      if (user && user.id === params.id) {
        set.status = 400;
        return { error: "You cannot delete your own account" };
      }
      
      if (useDb) {
        try {
          await db.delete(schema.users).where(eq(schema.users.id, params.id));
          return { success: true };
        } catch (e: any) {
          set.status = 400;
          return { error: e.message || "Failed to delete user" };
        }
      }
      
      let emailToDelete = "";
      for (const u of mockUsers.values()) {
        if (u.id === params.id) {
          emailToDelete = u.email;
          break;
        }
      }
      
      if (!emailToDelete) {
        set.status = 404;
        return { error: "User not found" };
      }
      
      mockUsers.delete(emailToDelete);
      return { success: true };
    })
  )

  .get("/", () => ({
    status: "online",
    engine: useDb ? "Neon PostgreSQL" : "Local In-Memory Engine",
    version: "2.3.0"
  }))
  
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

  // -- Analytics: 7-Day Dispatches Trend --
  .get("/api/analytics/dispatches", async () => {
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
              sql`created_at >= ${sevenDaysAgo}`
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
  .get("/api/analytics/breakdown", async () => {
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
  })

  // -- Device Models CRUD --
  .group("/api/device-models", (app) => app
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
        name: t.String(),
        brand: t.String(),
        assetType: t.Optional(t.String()),
        allowedChildren: t.Optional(t.Array(t.String())),
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
        name: t.String(),
        brand: t.String(),
        assetType: t.Optional(t.String()),
        allowedChildren: t.Optional(t.Array(t.String())),
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
    })
  )

  // -- Stock Alerts --
  .get("/api/stock-alerts", async () => {
    let allModels: any[] = [];
    let allDevices: any[] = [];

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
  })

  // -- Devices Inventory --
  .group("/api/devices", (app) => app
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
            mockDeviceRelationships = mockDeviceRelationships.filter(r => r.primaryDeviceId !== id && r.linkedDeviceId !== id);
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
      mockDeviceRelationships = mockDeviceRelationships.filter(r => r.primaryDeviceId !== params.id && r.linkedDeviceId !== params.id);
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
    })
  )

  // -- Device Linking (Polymorphic Matrix) --
  .group("/api/device-links", (app) => app
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
        let primaryModel: any = null;
        let childModel: any = null;

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
            mockDeviceRelationships = mockDeviceRelationships.filter(
              r => !(r.primaryDeviceId === primary.id && r.linkedDeviceId === child.id)
            );
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
    })
  )

  // -- Customer Management --
  .group("/api/customers", (app) => app
    .get("/", async ({ query }) => {
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
    .post("/", async ({ body }) => {
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
          await writeAudit("CUSTOMER_CREATE", `Created customer ${body.name}`);
          return res[0];
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
      await writeAudit("CUSTOMER_CREATE", `Created customer ${body.name} (In-Memory)`);
      return newCustomer;
    }, {
      body: t.Object({
        name: t.String(),
        type: t.String(),
        email: t.Optional(t.String()),
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
        name: t.String(),
        type: t.String(),
        email: t.Optional(t.String()),
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
    })
  )

  .listen(3002);

console.log(`🦊 Elysia API is running at ${app.server?.hostname}:${app.server?.port}`);
export type App = typeof app;

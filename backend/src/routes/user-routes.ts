import { Elysia, t } from "elysia";
import { randomUUID } from "crypto";
import { db } from "../db/index.js";
import * as schema from "../db/schema.js";
import { eq, ne, and } from "drizzle-orm";
import { getBetterAuth, mockUsers, type InMemoryUser } from "../auth-service.js";
import { useDb } from "../lib/db-init.js";

export const userRoutes = new Elysia({ prefix: '/api/users' })
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
  });

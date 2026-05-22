import { pgTable, uuid, varchar, timestamp, pgEnum, text, integer, boolean, index, jsonb } from 'drizzle-orm/pg-core';
import { AssetType, DeviceStatus } from '@ims-pro/shared';

// Mapping from shared Zod enums to Postgres Enums
export const assetTypeEnum = pgEnum('asset_type', [
  'TRACKER', 'SIM', 'PERIPHERAL', 'DASH_CAM', 'SD_CARD', 'PANIC_BUTTON', 'FUEL_SENSOR', 'KEYFOB', 'TRAVEL_ADAPTER'
]);

export const deviceStatusEnum = pgEnum('device_status', [
  'IN_STOCK', 'DISPATCHED', 'TESTING', 'DAMAGED', 'REPLACED', 'PROMOTIONAL', 'RMA'
]);

export const deviceModels = pgTable('device_models', {
  id: uuid('id').defaultRandom().primaryKey(),
  name: varchar('name', { length: 255 }).notNull(),
  brand: varchar('brand', { length: 255 }).notNull(),
  assetType: assetTypeEnum('asset_type').default('TRACKER').notNull(),
  allowedChildren: jsonb('allowed_children').default('[]').notNull(),
  maxStock: integer('max_stock').default(0).notNull(),
  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow().notNull(),
});

export const devices = pgTable('devices', {
  id: uuid('id').defaultRandom().primaryKey(),
  identifier: varchar('identifier', { length: 255 }).notNull().unique(),
  modelId: uuid('model_id')
    .references(() => deviceModels.id, { onDelete: 'restrict' })
    .notNull(),
  status: deviceStatusEnum('status').default('IN_STOCK').notNull(),
  customerId: uuid('customer_id')
    .references(() => customers.id, { onDelete: 'set null' }),
  metadata: jsonb('metadata').default('{}').notNull(),
  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow().notNull(),
}, (table) => ({
  modelIdIdx: index('devices_model_id_idx').on(table.modelId),
  statusIdx: index('devices_status_idx').on(table.status),
  customerIdIdx: index('devices_customer_id_idx').on(table.customerId),
}));

export const deviceRelationships = pgTable('device_relationships', {
  id: uuid('id').defaultRandom().primaryKey(),
  primaryDeviceId: uuid('primary_device_id')
    .references(() => devices.id, { onDelete: 'cascade' })
    .notNull(),
  linkedDeviceId: uuid('linked_device_id')
    .references(() => devices.id, { onDelete: 'cascade' })
    .notNull(),
  createdAt: timestamp('created_at').defaultNow().notNull(),
}, (table) => ({
  primaryDeviceIdIdx: index('device_relationships_primary_device_id_idx').on(table.primaryDeviceId),
  linkedDeviceIdIdx: index('device_relationships_linked_device_id_idx').on(table.linkedDeviceId),
  uniqueRelIdx: index('device_relationships_unique_idx').on(table.primaryDeviceId, table.linkedDeviceId),
}));

export const deviceAuditLogs = pgTable('device_audit_logs', {
  id: uuid('id').defaultRandom().primaryKey(),
  actionType: varchar('action_type', { length: 50 }).notNull(), // 'INGEST', 'LINK', 'DELETE', 'STATUS_CHANGE'
  details: text('details').notNull(),
  createdAt: timestamp('created_at').defaultNow().notNull(),
});

export const customerTypeEnum = pgEnum('customer_type', ['PERSON', 'COMPANY']);

export const customers = pgTable('customers', {
  id: uuid('id').defaultRandom().primaryKey(),
  name: varchar('name', { length: 255 }).notNull(),
  type: customerTypeEnum('type').default('COMPANY').notNull(),
  phone: varchar('phone', { length: 20 }),
  email: varchar('email', { length: 255 }),
  address: text('address'),
  taxId: varchar('tax_id', { length: 50 }),
  metadata: jsonb('metadata').default('{}').notNull(),
  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow().notNull(),
});

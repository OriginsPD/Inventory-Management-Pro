import { z } from 'zod';

export const CustomerType = z.enum(['PERSON', 'COMPANY']);
export type CustomerType = z.infer<typeof CustomerType>;

export const CustomerSchema = z.object({
  id: z.string().uuid().optional(),
  name: z.string().min(1, 'Name is required'),
  type: CustomerType.default('COMPANY'),
  email: z.string().email('Invalid email address').optional().or(z.literal('')),
  phone: z.string().optional(),
  address: z.string().optional(),
  taxId: z.string().optional(), // For companies
  metadata: z.record(z.any()).default({}).optional(),
  createdAt: z.date().optional(),
  updatedAt: z.date().optional(),
});

export type Customer = z.infer<typeof CustomerSchema>;

export const CreateCustomerSchema = CustomerSchema.omit({ id: true, createdAt: true, updatedAt: true });
export type CreateCustomer = z.infer<typeof CreateCustomerSchema>;

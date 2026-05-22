import { z } from 'zod';

export const QCCheckStatus = z.enum(['PASSED', 'FAILED', 'UNTESTED']);
export type QCCheckStatus = z.infer<typeof QCCheckStatus>;

export const QCCheckItemSchema = z.object({
  id: z.string(),
  label: z.string(),
  status: QCCheckStatus.default('UNTESTED'),
  critical: z.boolean().default(false),
  notes: z.string().optional(),
});

export type QCCheckItem = z.infer<typeof QCCheckItemSchema>;

export const QCReportSchema = z.object({
  deviceId: z.string().uuid(),
  technicianId: z.string().optional(),
  items: z.array(QCCheckItemSchema),
  overallStatus: z.enum(['PASSED', 'FAILED']),
  completedAt: z.date().default(() => new Date()),
});

export type QCReport = z.infer<typeof QCReportSchema>;

export const DEFAULT_QC_CHECKS: Omit<QCCheckItem, 'status'>[] = [
  { id: 'physical', label: 'Physical Condition (No damage)', critical: true },
  { id: 'power', label: 'Power On / Boot Sequence', critical: true },
  { id: 'led', label: 'LED Indicators Functional', critical: false },
  { id: 'sim', label: 'SIM Card Detected / Registered', critical: true },
  { id: 'gps', label: 'GPS Lock / Signal Strength', critical: true },
  { id: 'battery', label: 'Internal Battery Health', critical: false },
  { id: 'io', label: 'Input/Output Ports (Clean & Intact)', critical: false },
];

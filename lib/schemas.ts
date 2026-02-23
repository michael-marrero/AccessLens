import { z } from "zod";

export const findingsQuerySchema = z.object({
  status: z
    .enum(["open", "reviewed", "in_review", "escalated", "resolved", "suppressed", "false_positive"])
    .optional(),
  severity: z.enum(["low", "medium", "high", "critical"]).optional(),
  type: z.string().trim().min(1).max(100).optional(),
  identityId: z.string().uuid().optional()
});

export const findingIdSchema = z.object({
  id: z.string().uuid()
});

export const findingActionSchema = z.object({
  action: z.enum(["approve", "revoke", "investigate"]),
  note: z.string().trim().max(2000).optional()
});

export const recomputeBodySchema = z.object({
  tenantId: z.string().uuid().optional()
});

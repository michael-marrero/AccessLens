import { z } from "zod";

export const findingIdParamSchema = z.object({
  id: z.string().uuid()
});

export const dbFindingStatuses = [
  "open",
  "reviewed",
  "in_review",
  "escalated",
  "resolved",
  "suppressed",
  "false_positive"
] as const;

export const actionStatuses = [
  "OPEN",
  "IN_REVIEW",
  "ESCALATED",
  "RESOLVED",
  "SUPPRESSED",
  "FALSE_POSITIVE"
] as const;

export const findingPriorities = ["low", "medium", "high", "critical"] as const;

export const findingDispositions = [
  "revoked_entitlement",
  "user_verified_travel",
  "service_account_exception_approved",
  "compensating_control_exists",
  "false_positive_rule_tuning_needed",
  "other"
] as const;

export const findingActionPayloadSchema = z
  .object({
    status: z.enum(actionStatuses).optional(),
    assignedTo: z.string().uuid().nullable().optional(),
    priority: z.enum(findingPriorities).nullable().optional(),
    dueAt: z.string().trim().max(80).nullable().optional(),
    disposition: z.enum(findingDispositions).nullable().optional(),
    note: z.string().trim().max(2000).nullable().optional()
  })
  .superRefine((value, ctx) => {
    const hasAtLeastOneField = Object.values(value).some((entry) => entry !== undefined);
    if (!hasAtLeastOneField) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: "At least one action field must be provided"
      });
    }
  });

export type FindingActionPayload = z.infer<typeof findingActionPayloadSchema>;

const statusInputToDbMap: Record<(typeof actionStatuses)[number], (typeof dbFindingStatuses)[number]> = {
  OPEN: "open",
  IN_REVIEW: "in_review",
  ESCALATED: "escalated",
  RESOLVED: "resolved",
  SUPPRESSED: "suppressed",
  FALSE_POSITIVE: "false_positive"
};

export function mapActionStatusToDb(status: (typeof actionStatuses)[number]) {
  return statusInputToDbMap[status];
}

const statusDbToInputMap: Record<string, (typeof actionStatuses)[number]> = {
  open: "OPEN",
  reviewed: "IN_REVIEW",
  in_review: "IN_REVIEW",
  escalated: "ESCALATED",
  resolved: "RESOLVED",
  suppressed: "SUPPRESSED",
  false_positive: "FALSE_POSITIVE"
};

export function mapDbStatusToActionStatus(status: string): (typeof actionStatuses)[number] {
  return statusDbToInputMap[status] ?? "OPEN";
}

export function normalizeDbStatus(status: string): (typeof dbFindingStatuses)[number] {
  if (status === "reviewed") {
    return "in_review";
  }

  if ((dbFindingStatuses as readonly string[]).includes(status)) {
    return status as (typeof dbFindingStatuses)[number];
  }

  return "open";
}

const allowedTransitions: Record<string, string[]> = {
  open: ["in_review", "escalated", "resolved", "suppressed", "false_positive"],
  in_review: ["open", "escalated", "resolved", "suppressed", "false_positive"],
  escalated: ["in_review", "resolved", "suppressed", "false_positive"],
  resolved: ["resolved"],
  suppressed: ["suppressed"],
  false_positive: ["false_positive"]
};

export function isValidStatusTransition(fromStatus: string, toStatus: string) {
  const normalizedFrom = normalizeDbStatus(fromStatus);
  const normalizedTo = normalizeDbStatus(toStatus);

  if (normalizedFrom === normalizedTo) {
    return true;
  }

  return (allowedTransitions[normalizedFrom] ?? []).includes(normalizedTo);
}

export function isClosingStatus(status: string) {
  const normalized = normalizeDbStatus(status);
  return normalized === "resolved" || normalized === "suppressed" || normalized === "false_positive";
}

export function parseDueAt(value: string | null | undefined): string | null | undefined {
  if (value === undefined) {
    return undefined;
  }

  if (value === null || value.trim() === "") {
    return null;
  }

  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) {
    throw new Error("Invalid dueAt datetime format");
  }

  return parsed.toISOString();
}

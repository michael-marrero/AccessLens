import { ApiError } from "@/lib/errors";
import type { FindingPriority, FindingSeverity, FindingStatus, ProfileRole } from "@/lib/types";
import {
  isClosingStatus,
  isValidStatusTransition,
  mapActionStatusToDb,
  normalizeDbStatus,
  parseDueAt,
  type FindingActionPayload
} from "@/lib/findings/validation";

export type MutableFindingRecord = {
  id: string;
  tenant_id: string;
  status: FindingStatus;
  severity: FindingSeverity;
  assigned_to: string | null;
  priority: FindingPriority | null;
  due_at: string | null;
  disposition: string | null;
};

export type ReviewActionInsertParams = {
  tenantId: string;
  findingId: string;
  actorUserId: string;
  action: "update";
  note: string | null;
  previousStatus: string | null;
  newStatus: string | null;
  metadata: Record<string, unknown> | null;
};

export type FindingActionDeps = {
  getFindingById: (tenantId: string, findingId: string) => Promise<MutableFindingRecord | null>;
  getProfileById: (tenantId: string, profileId: string) => Promise<{ id: string } | null>;
  updateFindingById: (
    tenantId: string,
    findingId: string,
    patch: Partial<{
      status: string;
      assigned_to: string | null;
      priority: FindingPriority | null;
      due_at: string | null;
      disposition: string | null;
    }>
  ) => Promise<MutableFindingRecord>;
  insertReviewAction: (params: ReviewActionInsertParams) => Promise<void>;
};

export type ExecuteFindingActionInput = {
  tenantId: string;
  findingId: string;
  actorUserId: string;
  actorRole: ProfileRole;
  payload: FindingActionPayload;
};

type ChangeMap = Record<string, { previous: unknown; next: unknown }>;

function normalizeNote(note: string | null | undefined) {
  const trimmed = note?.trim();
  return trimmed ? trimmed : null;
}

function isHighOrCritical(severity: FindingSeverity) {
  return severity === "high" || severity === "critical";
}

export async function executeFindingAction(
  deps: FindingActionDeps,
  input: ExecuteFindingActionInput
): Promise<{
  finding: MutableFindingRecord;
  changes: ChangeMap;
  previousStatus: string;
  newStatus: string;
}> {
  if (!input.actorRole || !["admin", "analyst"].includes(input.actorRole)) {
    throw new ApiError(403, "You do not have access to this resource", "invalid role", "FORBIDDEN");
  }

  const finding = await deps.getFindingById(input.tenantId, input.findingId);
  if (!finding) {
    throw new ApiError(404, "Finding not found", "missing finding", "NOT_FOUND");
  }

  const note = normalizeNote(input.payload.note);

  const patch: Partial<{
    status: string;
    assigned_to: string | null;
    priority: FindingPriority | null;
    due_at: string | null;
    disposition: string | null;
  }> = {};
  const changes: ChangeMap = {};

  const previousStatus = normalizeDbStatus(finding.status);
  let newStatus = previousStatus;

  if (input.payload.status !== undefined) {
    const desiredStatus = mapActionStatusToDb(input.payload.status);
    if (!isValidStatusTransition(finding.status, desiredStatus)) {
      throw new ApiError(
        400,
        `Invalid status transition from ${previousStatus} to ${desiredStatus}`,
        "status transition rejected",
        "INVALID_STATUS_TRANSITION"
      );
    }

    newStatus = normalizeDbStatus(desiredStatus);

    if (normalizeDbStatus(finding.status) !== newStatus) {
      patch.status = newStatus;
      changes.status = {
        previous: normalizeDbStatus(finding.status),
        next: newStatus
      };
    }
  }

  if (input.payload.assignedTo !== undefined) {
    if (input.payload.assignedTo !== null) {
      const profile = await deps.getProfileById(input.tenantId, input.payload.assignedTo);
      if (!profile) {
        throw new ApiError(400, "Assigned user is invalid for this tenant", "unknown assignee", "INVALID_ASSIGNEE");
      }
    }

    if (finding.assigned_to !== input.payload.assignedTo) {
      patch.assigned_to = input.payload.assignedTo;
      changes.assigned_to = {
        previous: finding.assigned_to,
        next: input.payload.assignedTo
      };
    }
  }

  if (input.payload.priority !== undefined) {
    if (finding.priority !== input.payload.priority) {
      patch.priority = input.payload.priority;
      changes.priority = {
        previous: finding.priority,
        next: input.payload.priority
      };
    }
  }

  if (input.payload.dueAt !== undefined) {
    let parsedDueAt: string | null | undefined;
    try {
      parsedDueAt = parseDueAt(input.payload.dueAt);
    } catch {
      throw new ApiError(400, "Invalid due date format", "bad dueAt", "INVALID_DUE_AT");
    }

    if (finding.due_at !== parsedDueAt) {
      patch.due_at = parsedDueAt ?? null;
      changes.due_at = {
        previous: finding.due_at,
        next: parsedDueAt ?? null
      };
    }
  }

  if (input.payload.disposition !== undefined) {
    if (finding.disposition !== input.payload.disposition) {
      patch.disposition = input.payload.disposition;
      changes.disposition = {
        previous: finding.disposition,
        next: input.payload.disposition
      };
    }
  }

  if (isClosingStatus(newStatus) && isHighOrCritical(finding.severity) && !note) {
    throw new ApiError(
      400,
      "A note is required when closing high or critical findings",
      "missing close note",
      "NOTE_REQUIRED_FOR_CLOSE"
    );
  }

  if (isClosingStatus(newStatus) && !input.payload.disposition && !finding.disposition) {
    throw new ApiError(
      400,
      "Disposition is required when closing or suppressing a finding",
      "missing disposition",
      "DISPOSITION_REQUIRED"
    );
  }

  if (!Object.keys(changes).length && !note) {
    throw new ApiError(400, "No changes submitted", "empty action payload", "NO_CHANGES");
  }

  let updatedFinding = finding;
  if (Object.keys(changes).length) {
    updatedFinding = await deps.updateFindingById(input.tenantId, input.findingId, patch);
  }

  const finalStatus = normalizeDbStatus(updatedFinding.status);

  await deps.insertReviewAction({
    tenantId: input.tenantId,
    findingId: input.findingId,
    actorUserId: input.actorUserId,
    action: "update",
    note,
    previousStatus,
    newStatus: finalStatus,
    metadata: {
      changed_fields: changes,
      payload: {
        status: input.payload.status ?? null,
        assignedTo: input.payload.assignedTo ?? null,
        priority: input.payload.priority ?? null,
        dueAt: input.payload.dueAt ?? null,
        disposition: input.payload.disposition ?? null,
        notePresent: Boolean(note)
      }
    }
  });

  return {
    finding: updatedFinding,
    changes,
    previousStatus,
    newStatus: finalStatus
  };
}

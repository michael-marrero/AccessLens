import { ApiError } from "@/lib/errors";
import type { FindingStatus, ProfileRole, ReviewAction } from "@/lib/types";

export type FindingRecordForAction = {
  id: string;
  tenant_id: string;
  status: FindingStatus;
};

export type ExecuteFindingActionInput = {
  tenantId: string;
  findingId: string;
  actorUserId: string;
  actorRole: ProfileRole;
  action: ReviewAction;
  note?: string;
};

export type ExecuteFindingActionDeps = {
  getFindingById: (tenantId: string, findingId: string) => Promise<FindingRecordForAction | null>;
  insertReviewAction: (params: {
    tenantId: string;
    findingId: string;
    actorUserId: string;
    action: ReviewAction;
    note: string | null;
  }) => Promise<void>;
  updateFindingStatus: (tenantId: string, findingId: string, status: FindingStatus) => Promise<void>;
};

export function statusForAction(action: ReviewAction): FindingStatus {
  if (action === "investigate") {
    return "reviewed";
  }

  return "resolved";
}

export async function executeFindingAction(
  deps: ExecuteFindingActionDeps,
  input: ExecuteFindingActionInput
): Promise<{ findingId: string; status: FindingStatus; action: ReviewAction }> {
  if (!input.actorRole || !["admin", "analyst"].includes(input.actorRole)) {
    throw new ApiError(403, "You do not have permission to review findings");
  }

  const finding = await deps.getFindingById(input.tenantId, input.findingId);
  if (!finding) {
    throw new ApiError(404, "Finding not found");
  }

  const newStatus = statusForAction(input.action);

  await deps.insertReviewAction({
    tenantId: input.tenantId,
    findingId: input.findingId,
    actorUserId: input.actorUserId,
    action: input.action,
    note: input.note?.trim() || null
  });

  await deps.updateFindingStatus(input.tenantId, input.findingId, newStatus);

  return {
    findingId: input.findingId,
    status: newStatus,
    action: input.action
  };
}

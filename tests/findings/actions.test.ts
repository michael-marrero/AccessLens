import { describe, expect, it, vi } from "vitest";
import { executeFindingAction, type FindingActionDeps, type MutableFindingRecord } from "@/lib/findings/actions";

function makeFinding(overrides: Partial<MutableFindingRecord> = {}): MutableFindingRecord {
  return {
    id: "8b89f25f-a48f-4283-970f-bf84f51284a3",
    tenant_id: "22222222-2222-4222-8222-222222222222",
    status: "open",
    severity: "high",
    assigned_to: null,
    priority: null,
    due_at: null,
    disposition: null,
    ...overrides
  };
}

function makeDeps(finding: MutableFindingRecord | null): FindingActionDeps {
  const current = finding;

  return {
    getFindingById: vi.fn().mockResolvedValue(current),
    getProfileById: vi.fn().mockResolvedValue({ id: "9ec44bc4-6ba5-4f59-a1d2-f4f9d4a2ae42" }),
    updateFindingById: vi.fn(async (_, __, patch) => ({
      ...(current as MutableFindingRecord),
      ...patch
    })),
    insertReviewAction: vi.fn().mockResolvedValue(undefined)
  };
}

describe("executeFindingAction", () => {
  it("enforces high severity close note requirement", async () => {
    const deps = makeDeps(makeFinding({ severity: "critical" }));

    await expect(
      executeFindingAction(deps, {
        tenantId: "22222222-2222-4222-8222-222222222222",
        findingId: "8b89f25f-a48f-4283-970f-bf84f51284a3",
        actorUserId: "9ec44bc4-6ba5-4f59-a1d2-f4f9d4a2ae42",
        actorRole: "analyst",
        payload: {
          status: "RESOLVED",
          disposition: "other"
        }
      })
    ).rejects.toMatchObject({ code: "NOTE_REQUIRED_FOR_CLOSE" });
  });

  it("validates invalid status transitions", async () => {
    const deps = makeDeps(makeFinding({ status: "resolved", severity: "medium", disposition: "other" }));

    await expect(
      executeFindingAction(deps, {
        tenantId: "22222222-2222-4222-8222-222222222222",
        findingId: "8b89f25f-a48f-4283-970f-bf84f51284a3",
        actorUserId: "9ec44bc4-6ba5-4f59-a1d2-f4f9d4a2ae42",
        actorRole: "analyst",
        payload: {
          status: "IN_REVIEW",
          note: "Reopening"
        }
      })
    ).rejects.toMatchObject({ code: "INVALID_STATUS_TRANSITION" });
  });

  it("enforces tenant isolation via finding lookup", async () => {
    const deps = makeDeps(null);

    await expect(
      executeFindingAction(deps, {
        tenantId: "22222222-2222-4222-8222-222222222222",
        findingId: "8b89f25f-a48f-4283-970f-bf84f51284a3",
        actorUserId: "9ec44bc4-6ba5-4f59-a1d2-f4f9d4a2ae42",
        actorRole: "analyst",
        payload: {
          status: "IN_REVIEW",
          note: "Investigating"
        }
      })
    ).rejects.toMatchObject({ code: "NOT_FOUND" });
  });

  it("inserts an audit row when finding is updated", async () => {
    const finding = makeFinding({ severity: "medium" });
    const deps = makeDeps(finding);

    await executeFindingAction(deps, {
      tenantId: "22222222-2222-4222-8222-222222222222",
      findingId: "8b89f25f-a48f-4283-970f-bf84f51284a3",
      actorUserId: "9ec44bc4-6ba5-4f59-a1d2-f4f9d4a2ae42",
      actorRole: "analyst",
      payload: {
        status: "IN_REVIEW",
        note: "Started triage"
      }
    });

    expect(deps.updateFindingById).toHaveBeenCalledTimes(1);
    expect(deps.insertReviewAction).toHaveBeenCalledTimes(1);
    expect(deps.insertReviewAction).toHaveBeenCalledWith(
      expect.objectContaining({
        previousStatus: "open",
        newStatus: "in_review"
      })
    );
  });

  it("throws for unauthorized roles", async () => {
    const deps = makeDeps(makeFinding());

    await expect(
      executeFindingAction(deps, {
        tenantId: "22222222-2222-4222-8222-222222222222",
        findingId: "8b89f25f-a48f-4283-970f-bf84f51284a3",
        actorUserId: "9ec44bc4-6ba5-4f59-a1d2-f4f9d4a2ae42",
        actorRole: "viewer" as unknown as "admin",
        payload: {
          status: "IN_REVIEW",
          note: "Role check"
        }
      })
    ).rejects.toMatchObject({ code: "FORBIDDEN" });
  });
});

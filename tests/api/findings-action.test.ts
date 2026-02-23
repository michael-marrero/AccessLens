import { beforeEach, describe, expect, it, vi } from "vitest";
import { ApiError } from "@/lib/errors";

vi.mock("@/lib/auth/session", () => ({
  requireAuth: vi.fn(),
  requireRole: vi.fn()
}));

vi.mock("@/lib/logging", () => ({
  getRequestId: vi.fn().mockReturnValue("req-test"),
  log: vi.fn()
}));

const validFindingId = "8b89f25f-a48f-4283-970f-bf84f51284a3";

describe("POST /api/findings/[id]/action", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("returns 400 when payload validation fails", async () => {
    const { requireAuth, requireRole } = await import("@/lib/auth/session");
    vi.mocked(requireAuth).mockResolvedValue({
      userId: "user-1",
      email: "a@a.com",
      tenantId: "tenant-1",
      role: "analyst",
      fullName: "Analyst One"
    });
    vi.mocked(requireRole).mockImplementation(() => undefined);

    const { buildPostFindingActionHandler } = await import("@/lib/findings/action-route-handler");

    const deps = {
      getFindingById: vi.fn(),
      insertReviewAction: vi.fn(),
      updateFindingStatus: vi.fn()
    };

    const handler = buildPostFindingActionHandler(() => deps);
    const response = await handler(
      new Request("http://localhost/api/findings/id/action", {
        method: "POST",
        body: JSON.stringify({ action: "bad-action" })
      }),
      { params: { id: validFindingId } }
    );

    expect(response.status).toBe(400);
    expect(deps.insertReviewAction).not.toHaveBeenCalled();
  });

  it("returns 403 when role check fails", async () => {
    const { requireAuth, requireRole } = await import("@/lib/auth/session");
    vi.mocked(requireAuth).mockResolvedValue({
      userId: "user-1",
      email: "a@a.com",
      tenantId: "tenant-1",
      role: "analyst",
      fullName: "Analyst One"
    });
    vi.mocked(requireRole).mockImplementation(() => {
      throw new ApiError(403, "Forbidden");
    });

    const { buildPostFindingActionHandler } = await import("@/lib/findings/action-route-handler");

    const deps = {
      getFindingById: vi.fn(),
      insertReviewAction: vi.fn(),
      updateFindingStatus: vi.fn()
    };

    const handler = buildPostFindingActionHandler(() => deps);
    const response = await handler(
      new Request("http://localhost/api/findings/id/action", {
        method: "POST",
        body: JSON.stringify({ action: "approve" })
      }),
      { params: { id: validFindingId } }
    );

    expect(response.status).toBe(403);
    expect(deps.insertReviewAction).not.toHaveBeenCalled();
  });

  it("writes audit record and updates finding status", async () => {
    const { requireAuth, requireRole } = await import("@/lib/auth/session");
    vi.mocked(requireAuth).mockResolvedValue({
      userId: "9ec44bc4-6ba5-4f59-a1d2-f4f9d4a2ae42",
      email: "a@a.com",
      tenantId: "22222222-2222-4222-8222-222222222222",
      role: "analyst",
      fullName: "Analyst One"
    });
    vi.mocked(requireRole).mockImplementation(() => undefined);

    const { buildPostFindingActionHandler } = await import("@/lib/findings/action-route-handler");

    const deps = {
      getFindingById: vi.fn().mockResolvedValue({
        id: validFindingId,
        tenant_id: "22222222-2222-4222-8222-222222222222",
        status: "open"
      }),
      insertReviewAction: vi.fn().mockResolvedValue(undefined),
      updateFindingStatus: vi.fn().mockResolvedValue(undefined)
    };

    const handler = buildPostFindingActionHandler(() => deps);
    const response = await handler(
      new Request("http://localhost/api/findings/id/action", {
        method: "POST",
        body: JSON.stringify({ action: "revoke", note: " Access should be removed " })
      }),
      { params: { id: validFindingId } }
    );

    const body = await response.json();

    expect(response.status).toBe(201);
    expect(deps.getFindingById).toHaveBeenCalledWith(
      "22222222-2222-4222-8222-222222222222",
      validFindingId
    );
    expect(deps.insertReviewAction).toHaveBeenCalledWith({
      tenantId: "22222222-2222-4222-8222-222222222222",
      findingId: validFindingId,
      actorUserId: "9ec44bc4-6ba5-4f59-a1d2-f4f9d4a2ae42",
      action: "revoke",
      note: "Access should be removed"
    });
    expect(deps.updateFindingStatus).toHaveBeenCalledWith(
      "22222222-2222-4222-8222-222222222222",
      validFindingId,
      "resolved"
    );
    expect(body.data.status).toBe("resolved");
  });
});

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

vi.mock("@/lib/findings/queries", () => ({
  getFindingWorkspaceDetail: vi.fn().mockResolvedValue({
    finding: {
      id: "8b89f25f-a48f-4283-970f-bf84f51284a3",
      tenant_id: "22222222-2222-4222-8222-222222222222",
      identity_id: "11111111-1111-4111-8111-111111111111",
      application_id: null,
      finding_type: "service_interactive_login_anomaly",
      severity: "high",
      score: 88,
      status: "in_review",
      assigned_to: null,
      priority: null,
      due_at: null,
      disposition: null,
      confidence: null,
      detector_version: null,
      rule_ids: null,
      score_breakdown: null,
      explanation: null,
      evidence: {},
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
      identity: null,
      application: null,
      assigned_profile: null
    },
    ai: {
      recommendation: "investigate",
      confidence: null,
      rationale: []
    },
    tenant: null,
    recentEvents: [],
    entitlements: [],
    reviewActions: [],
    relatedOpenFindings: [],
    identityStats: {
      entitlementCount: 0,
      openFindingCount: 0,
      lastSuccessfulLoginAt: null
    }
  })
}));

const validFindingId = "8b89f25f-a48f-4283-970f-bf84f51284a3";

function mockAuthorizedAnalyst() {
  return {
    userId: "9ec44bc4-6ba5-4f59-a1d2-f4f9d4a2ae42",
    email: "analyst@accesslens.local",
    tenantId: "22222222-2222-4222-8222-222222222222",
    role: "analyst",
    fullName: "Analyst One"
  };
}

describe("POST /api/findings/[id]/action", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("returns forbidden for unauthenticated requests", async () => {
    const { requireAuth } = await import("@/lib/auth/session");
    vi.mocked(requireAuth).mockRejectedValue(new ApiError(401, "Authentication required", "no token", "UNAUTHORIZED"));

    const { buildPostFindingActionHandler } = await import("@/lib/findings/action-route-handler");
    const handler = buildPostFindingActionHandler(() => ({
      getFindingById: vi.fn(),
      getProfileById: vi.fn(),
      updateFindingById: vi.fn(),
      insertReviewAction: vi.fn()
    }));

    const response = await handler(new Request("http://localhost/api/findings/id/action", { method: "POST", body: "{}" }), {
      params: { id: validFindingId }
    });
    const body = await response.json();

    expect(response.status).toBe(401);
    expect(body.code).toBe("UNAUTHORIZED");
  });

  it("returns forbidden for disallowed roles", async () => {
    const { requireAuth, requireRole } = await import("@/lib/auth/session");
    vi.mocked(requireAuth).mockResolvedValue(mockAuthorizedAnalyst());
    vi.mocked(requireRole).mockImplementation(() => {
      throw new ApiError(403, "Forbidden", "viewer role", "FORBIDDEN");
    });

    const { buildPostFindingActionHandler } = await import("@/lib/findings/action-route-handler");
    const handler = buildPostFindingActionHandler(() => ({
      getFindingById: vi.fn(),
      getProfileById: vi.fn(),
      updateFindingById: vi.fn(),
      insertReviewAction: vi.fn()
    }));

    const response = await handler(
      new Request("http://localhost/api/findings/id/action", {
        method: "POST",
        body: JSON.stringify({ status: "IN_REVIEW", note: "test" })
      }),
      { params: { id: validFindingId } }
    );

    expect(response.status).toBe(403);
  });

  it("returns 400 for invalid payload", async () => {
    const { requireAuth, requireRole } = await import("@/lib/auth/session");
    vi.mocked(requireAuth).mockResolvedValue(mockAuthorizedAnalyst());
    vi.mocked(requireRole).mockImplementation(() => undefined);

    const { buildPostFindingActionHandler } = await import("@/lib/findings/action-route-handler");
    const deps = {
      getFindingById: vi.fn(),
      getProfileById: vi.fn(),
      updateFindingById: vi.fn(),
      insertReviewAction: vi.fn()
    };
    const handler = buildPostFindingActionHandler(() => deps);

    const response = await handler(
      new Request("http://localhost/api/findings/id/action", {
        method: "POST",
        body: JSON.stringify({})
      }),
      { params: { id: validFindingId } }
    );

    expect(response.status).toBe(400);
    expect(deps.insertReviewAction).not.toHaveBeenCalled();
  });

  it("returns 404 when finding is outside tenant scope", async () => {
    const { requireAuth, requireRole } = await import("@/lib/auth/session");
    vi.mocked(requireAuth).mockResolvedValue(mockAuthorizedAnalyst());
    vi.mocked(requireRole).mockImplementation(() => undefined);

    const { buildPostFindingActionHandler } = await import("@/lib/findings/action-route-handler");
    const deps = {
      getFindingById: vi.fn().mockResolvedValue(null),
      getProfileById: vi.fn(),
      updateFindingById: vi.fn(),
      insertReviewAction: vi.fn()
    };
    const handler = buildPostFindingActionHandler(() => deps);

    const response = await handler(
      new Request("http://localhost/api/findings/id/action", {
        method: "POST",
        body: JSON.stringify({ status: "IN_REVIEW", note: "triage started" })
      }),
      { params: { id: validFindingId } }
    );

    expect(response.status).toBe(404);
    expect(deps.insertReviewAction).not.toHaveBeenCalled();
  });

  it("writes audit when update succeeds", async () => {
    const { requireAuth, requireRole } = await import("@/lib/auth/session");
    vi.mocked(requireAuth).mockResolvedValue(mockAuthorizedAnalyst());
    vi.mocked(requireRole).mockImplementation(() => undefined);

    const { buildPostFindingActionHandler } = await import("@/lib/findings/action-route-handler");
    const deps = {
      getFindingById: vi.fn().mockResolvedValue({
        id: validFindingId,
        tenant_id: "22222222-2222-4222-8222-222222222222",
        status: "open",
        severity: "high",
        assigned_to: null,
        priority: null,
        due_at: null,
        disposition: null
      }),
      getProfileById: vi.fn().mockResolvedValue({ id: "9ec44bc4-6ba5-4f59-a1d2-f4f9d4a2ae42" }),
      updateFindingById: vi.fn().mockResolvedValue({
        id: validFindingId,
        tenant_id: "22222222-2222-4222-8222-222222222222",
        status: "in_review",
        severity: "high",
        assigned_to: null,
        priority: null,
        due_at: null,
        disposition: null
      }),
      insertReviewAction: vi.fn().mockResolvedValue(undefined)
    };
    const handler = buildPostFindingActionHandler(() => deps);

    const response = await handler(
      new Request("http://localhost/api/findings/id/action", {
        method: "POST",
        body: JSON.stringify({ status: "IN_REVIEW", note: "triage started" })
      }),
      { params: { id: validFindingId } }
    );

    const body = await response.json();

    expect(response.status).toBe(200);
    expect(deps.insertReviewAction).toHaveBeenCalledTimes(1);
    expect(deps.insertReviewAction).toHaveBeenCalledWith(
      expect.objectContaining({
        previousStatus: "open",
        newStatus: "in_review"
      })
    );
    expect(body.data.finding.finding.id).toBe(validFindingId);
  });
});

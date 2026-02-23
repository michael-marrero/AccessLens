import { describe, expect, it } from "vitest";
import { findingActionPayloadSchema } from "@/lib/findings/validation";

describe("findingActionPayloadSchema", () => {
  it("rejects empty payload", () => {
    const parsed = findingActionPayloadSchema.safeParse({});
    expect(parsed.success).toBe(false);
  });

  it("accepts a valid action payload", () => {
    const parsed = findingActionPayloadSchema.safeParse({
      status: "IN_REVIEW",
      assignedTo: null,
      priority: "high",
      dueAt: "2026-03-02T13:30",
      note: "Reviewing interactive login anomaly"
    });

    expect(parsed.success).toBe(true);
  });
});

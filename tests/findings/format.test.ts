import { describe, expect, it } from "vitest";
import { formatFindingTypeLabel } from "@/lib/findings/format";

describe("formatFindingTypeLabel", () => {
  it("maps known finding type labels", () => {
    expect(formatFindingTypeLabel("service_interactive_login_anomaly")).toBe("Service account interactive login");
    expect(formatFindingTypeLabel("new_privilege_unusual_country")).toBe("New privilege + unusual country");
  });

  it("falls back to title-cased labels", () => {
    expect(formatFindingTypeLabel("custom_policy_breach")).toBe("Custom Policy Breach");
  });
});

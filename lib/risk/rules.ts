import type {
  AccessEvent,
  Application,
  Entitlement,
  FindingSeverity,
  Identity,
  IdentityEntitlement
} from "@/lib/types";
import { FINDING_TYPES, TOXIC_ENTITLEMENTS } from "@/lib/risk/constants";

export type RiskFindingCandidate = {
  finding_type: string;
  severity: FindingSeverity;
  score: number;
  identity_id: string;
  application_id: string | null;
  evidence: Record<string, unknown>;
};

export type RiskEngineInput = {
  identities: Identity[];
  applications: Application[];
  entitlements: Entitlement[];
  identityEntitlements: IdentityEntitlement[];
  accessEvents: AccessEvent[];
  now?: Date;
  privilegeWeightThreshold: number;
};

function asDate(ts: string) {
  return new Date(ts);
}

function daysSince(date: Date, now: Date) {
  return Math.floor((now.getTime() - date.getTime()) / (1000 * 60 * 60 * 24));
}

function isSuccessfulLogin(event: AccessEvent) {
  return event.success && (event.event_type === "interactive_login" || event.event_type === "login");
}

function pickLatestEvent(events: AccessEvent[]) {
  return [...events].sort((a, b) => asDate(b.ts).getTime() - asDate(a.ts).getTime())[0];
}

export function ruleDormantPrivilegedAccount(input: RiskEngineInput): RiskFindingCandidate[] {
  const now = input.now ?? new Date();
  const cutoff = new Date(now);
  cutoff.setDate(cutoff.getDate() - 90);

  return input.identities
    .filter((identity) => identity.is_privileged)
    .flatMap((identity) => {
      const loginEvents = input.accessEvents.filter(
        (event) => event.identity_id === identity.id && isSuccessfulLogin(event)
      );
      const latest = loginEvents.length ? pickLatestEvent(loginEvents) : null;
      const isDormant = !latest || asDate(latest.ts).getTime() < cutoff.getTime();

      if (!isDormant) {
        return [];
      }

      const lastLoginDate = latest ? asDate(latest.ts) : null;
      const dormantDays = lastLoginDate ? daysSince(lastLoginDate, now) : 999;
      const severity: FindingSeverity = identity.privilege_level >= 8 || !lastLoginDate ? "critical" : "high";
      const score = Math.min(100, 70 + Math.round(dormantDays / 2));

      return [
        {
          finding_type: FINDING_TYPES.DORMANT_PRIVILEGED_ACCOUNT,
          severity,
          score,
          identity_id: identity.id,
          application_id: latest?.application_id ?? null,
          evidence: {
            is_privileged: identity.is_privileged,
            privilege_level: identity.privilege_level,
            last_success_login_ts: latest?.ts ?? null,
            dormant_days: dormantDays
          }
        }
      ];
    });
}

export function ruleServiceInteractiveLoginAnomaly(input: RiskEngineInput): RiskFindingCandidate[] {
  return input.identities
    .filter((identity) => identity.type === "service")
    .flatMap((identity) => {
      const interactiveLogins = input.accessEvents.filter(
        (event) => event.identity_id === identity.id && event.event_type === "interactive_login" && event.success
      );

      if (!interactiveLogins.length) {
        return [];
      }

      const latest = pickLatestEvent(interactiveLogins);

      return [
        {
          finding_type: FINDING_TYPES.SERVICE_INTERACTIVE_LOGIN_ANOMALY,
          severity: "high",
          score: 88,
          identity_id: identity.id,
          application_id: latest.application_id,
          evidence: {
            interactive_login_count: interactiveLogins.length,
            latest_interactive_login_ts: latest.ts,
            latest_country: latest.country,
            example_event_ids: interactiveLogins.slice(0, 5).map((event) => event.id)
          }
        }
      ];
    });
}

export function ruleExcessivePrivilegeCount(input: RiskEngineInput): RiskFindingCandidate[] {
  const entitlementById = new Map(input.entitlements.map((entitlement) => [entitlement.id, entitlement]));

  return input.identities.flatMap((identity) => {
    const grants = input.identityEntitlements.filter((grant) => grant.identity_id === identity.id);
    if (!grants.length) {
      return [];
    }

    const matchedEntitlements = grants
      .map((grant) => entitlementById.get(grant.entitlement_id))
      .filter((entitlement): entitlement is Entitlement => Boolean(entitlement));

    const totalWeight = matchedEntitlements.reduce((sum, entitlement) => sum + entitlement.privilege_weight, 0);
    if (totalWeight <= input.privilegeWeightThreshold) {
      return [];
    }

    const severity: FindingSeverity = totalWeight > input.privilegeWeightThreshold * 1.5 ? "critical" : "high";

    return [
      {
        finding_type: FINDING_TYPES.EXCESSIVE_PRIVILEGE_COUNT,
        severity,
        score: Math.min(100, 60 + Math.round((totalWeight / input.privilegeWeightThreshold) * 25)),
        identity_id: identity.id,
        application_id: null,
        evidence: {
          total_privilege_weight: totalWeight,
          threshold: input.privilegeWeightThreshold,
          entitlement_count: matchedEntitlements.length,
          top_entitlements: matchedEntitlements
            .sort((a, b) => b.privilege_weight - a.privilege_weight)
            .slice(0, 5)
            .map((entitlement) => ({ id: entitlement.id, name: entitlement.name, weight: entitlement.privilege_weight }))
        }
      }
    ];
  });
}

export function ruleToxicCombination(input: RiskEngineInput): RiskFindingCandidate[] {
  const entitlementById = new Map(input.entitlements.map((entitlement) => [entitlement.id, entitlement]));

  return input.identities.flatMap((identity) => {
    const grants = input.identityEntitlements.filter((grant) => grant.identity_id === identity.id);
    const names = new Set(
      grants
        .map((grant) => entitlementById.get(grant.entitlement_id)?.name.toLowerCase())
        .filter((name): name is string => Boolean(name))
    );

    const hasToxicCombo = TOXIC_ENTITLEMENTS.every((name) => names.has(name));
    if (!hasToxicCombo) {
      return [];
    }

    const toxicEntitlements = grants
      .map((grant) => entitlementById.get(grant.entitlement_id))
      .filter(
        (entitlement): entitlement is Entitlement =>
          Boolean(entitlement && TOXIC_ENTITLEMENTS.includes(entitlement.name.toLowerCase() as (typeof TOXIC_ENTITLEMENTS)[number]))
      );

    return [
      {
        finding_type: FINDING_TYPES.TOXIC_COMBINATION,
        severity: "critical",
        score: 97,
        identity_id: identity.id,
        application_id: toxicEntitlements[0]?.application_id ?? null,
        evidence: {
          toxic_entitlements: toxicEntitlements.map((entitlement) => ({
            id: entitlement.id,
            name: entitlement.name,
            application_id: entitlement.application_id
          }))
        }
      }
    ];
  });
}

export function ruleNewPrivilegeUnusualCountry(input: RiskEngineInput): RiskFindingCandidate[] {
  const now = input.now ?? new Date();
  const grantCutoff = new Date(now);
  grantCutoff.setDate(grantCutoff.getDate() - 7);

  return input.identities.flatMap((identity) => {
    const grants = input.identityEntitlements
      .filter((grant) => grant.identity_id === identity.id)
      .filter((grant) => asDate(grant.granted_at).getTime() >= grantCutoff.getTime())
      .sort((a, b) => asDate(b.granted_at).getTime() - asDate(a.granted_at).getTime());

    if (!grants.length) {
      return [];
    }

    const logins = input.accessEvents
      .filter((event) => event.identity_id === identity.id && event.event_type === "interactive_login" && event.success)
      .sort((a, b) => asDate(a.ts).getTime() - asDate(b.ts).getTime());

    for (const grant of grants) {
      const grantTime = asDate(grant.granted_at);
      const priorCountries = new Set(
        logins.filter((event) => asDate(event.ts).getTime() < grantTime.getTime()).map((event) => event.country)
      );
      const unusualEvent = logins.find(
        (event) => asDate(event.ts).getTime() >= grantTime.getTime() && !priorCountries.has(event.country)
      );

      if (!unusualEvent) {
        continue;
      }

      return [
        {
          finding_type: FINDING_TYPES.NEW_PRIVILEGE_UNUSUAL_COUNTRY,
          severity: "high",
          score: 84,
          identity_id: identity.id,
          application_id: unusualEvent.application_id,
          evidence: {
            grant_id: grant.id,
            grant_ts: grant.granted_at,
            unusual_country: unusualEvent.country,
            login_ts: unusualEvent.ts,
            prior_countries: [...priorCountries]
          }
        }
      ];
    }

    return [];
  });
}

export function computeRiskFindings(input: RiskEngineInput): RiskFindingCandidate[] {
  const findings = [
    ...ruleDormantPrivilegedAccount(input),
    ...ruleServiceInteractiveLoginAnomaly(input),
    ...ruleExcessivePrivilegeCount(input),
    ...ruleToxicCombination(input),
    ...ruleNewPrivilegeUnusualCountry(input)
  ];

  const deduped = new Map<string, RiskFindingCandidate>();
  for (const finding of findings) {
    const key = `${finding.finding_type}:${finding.identity_id}`;
    const existing = deduped.get(key);
    if (!existing || finding.score > existing.score) {
      deduped.set(key, finding);
    }
  }

  return [...deduped.values()].sort((a, b) => b.score - a.score);
}

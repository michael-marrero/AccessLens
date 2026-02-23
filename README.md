# AccessLens AI

AccessLens AI is a production-style MVP for identity access risk triage and policy assistance.

It provides:
- Supabase Auth login for analysts/admins
- Risk findings dashboard with filtering
- Production-style finding detail analyst workspace (summary, evidence tabs, identity context, timeline, metadata, audit)
- Action panel for status/assignment/priority/due-date/disposition updates
- Audit trail for every review action
- Admin risk recomputation and safe dev-only demo reset

## Stack

- Next.js App Router + TypeScript
- Tailwind CSS
- Supabase (Postgres + Auth)
- Zod validation
- Optional AI explanation provider abstraction (`mock` default, optional OpenAI)
- Vercel-ready project config

## Architecture

```text
app/
  api/
    findings/
      route.ts                  # GET /api/findings
      [id]/route.ts             # GET /api/findings/:id
      [id]/action/route.ts      # POST /api/findings/:id/action
    risk/recompute/route.ts     # POST /api/risk/recompute (admin)
    admin/seed-reset/route.ts   # POST /api/admin/seed-reset (dev-only)
    me/route.ts                 # GET /api/me
  login/page.tsx
  dashboard/page.tsx
  findings/[id]/page.tsx
  findings/[id]/loading.tsx
  findings/[id]/error.tsx
  findings/[id]/not-found.tsx
  admin/page.tsx
components/
  findings/                     # Finding detail workspace UI cards and badges
lib/
  auth/                         # Bearer token auth + role checks
  supabase/                     # Browser/server Supabase clients
  findings/                     # Detail queries, action workflow, validation, formatting
  risk/                         # Rules engine + recompute orchestration
  ai/                           # Provider interface, mock provider, optional OpenAI
  seed/                         # Deterministic demo data seed/reset logic
supabase/
  migrations/                   # SQL schema migrations
  seed.sql                      # Seed note for Supabase CLI flow
scripts/
  seed.ts                       # Creates demo auth users + seeded tenant data
tests/
  risk/                         # Unit tests for risk rules
  api/                          # Integration tests for findings action endpoint
```

## Data Model

Tables (and enums) are created by migration:
- `tenants`
- `profiles` (`role`: `admin | analyst`)
- `identities` (`type`: `human | service`)
- `applications`
- `entitlements`
- `identity_entitlements`
- `access_events`
- `risk_findings`
  `severity`: `low|medium|high|critical`
  `status`: `open|reviewed|in_review|escalated|resolved|suppressed|false_positive`
  additional fields: `assigned_to`, `priority`, `due_at`, `disposition`, `confidence`, `detector_version`, `rule_ids`, `score_breakdown`
- `review_actions`
  `action`: `approve|revoke|investigate|update`
  additional fields: `previous_status`, `new_status`, `metadata`

Migration file:
- [`supabase/migrations/20260223154000_init_schema.sql`](/Users/michaelmarrero/Documents/New%20project/AccessLens/supabase/migrations/20260223154000_init_schema.sql)
- [`supabase/migrations/20260223170000_finding_detail_workflow.sql`](/Users/michaelmarrero/Documents/New%20project/AccessLens/supabase/migrations/20260223170000_finding_detail_workflow.sql)

## MVP Risk Rules

Implemented in [`lib/risk/rules.ts`](/Users/michaelmarrero/Documents/New%20project/AccessLens/lib/risk/rules.ts):
1. Dormant privileged account (no successful login in 90 days)
2. Service account interactive login anomaly
3. Excessive privilege count (privilege weight sum > threshold)
4. Toxic combination (`create_vendor` + `approve_payment`)
5. New privilege + unusual country

## API Endpoints

- `GET /api/findings?status=&severity=&type=&identityId=`
- `GET /api/findings/[id]`
- `POST /api/findings/[id]/action`
- `POST /api/risk/recompute` (admin only)

Additional support endpoints:
- `GET /api/me`
- `POST /api/admin/seed-reset` (admin only, disabled in production)

All API inputs are validated via Zod schemas in:
- [`lib/schemas.ts`](/Users/michaelmarrero/Documents/New%20project/AccessLens/lib/schemas.ts)
- [`lib/findings/validation.ts`](/Users/michaelmarrero/Documents/New%20project/AccessLens/lib/findings/validation.ts)

## Auth + RBAC

- Supabase Auth is used for sign-in.
- API routes require a Bearer access token.
- Role checks use `profiles.role` via [`lib/auth/session.ts`](/Users/michaelmarrero/Documents/New%20project/AccessLens/lib/auth/session.ts).
- Allowed roles:
  - Findings read/action: `admin`, `analyst`
  - Risk recompute and seed-reset: `admin`

## Finding Detail Workflow

`/findings/[id]` is a server-loaded analyst workspace with:
- Header with breadcrumbs, badges, quick actions
- Summary card (`why this fired`, recommendation, top signals, score breakdown)
- Evidence tabs (`events`, `entitlements`, `rule evidence`, `raw json`)
- Identity context and related open findings
- Timeline/activity combining events + finding creation + review actions
- Sticky action panel on desktop
- Metadata and audit cards in the right column

Core query path:
- [`lib/findings/queries.ts`](/Users/michaelmarrero/Documents/New%20project/AccessLens/lib/findings/queries.ts)

## Action + Audit Workflow

`POST /api/findings/[id]/action` supports:
- status transitions (`OPEN`, `IN_REVIEW`, `ESCALATED`, `RESOLVED`, `SUPPRESSED`, `FALSE_POSITIVE`)
- assignment changes (`assigned_to`)
- priority, due date, disposition, and analyst notes
- validation rules:
  high/critical findings require note on close/suppress/false-positive
  invalid transitions are rejected
  tenant-scoped assignee validation
- enriched audit rows (`previous_status`, `new_status`, `metadata.changed_fields`)

Core logic:
- [`lib/findings/actions.ts`](/Users/michaelmarrero/Documents/New%20project/AccessLens/lib/findings/actions.ts)
- [`lib/findings/action-route-handler.ts`](/Users/michaelmarrero/Documents/New%20project/AccessLens/lib/findings/action-route-handler.ts)

## AI Explanation Module

Provider abstraction under [`lib/ai`](/Users/michaelmarrero/Documents/New%20project/AccessLens/lib/ai):
- Interface: `AiExplanationProvider`
- Default: `MockAiExplanationProvider`
- Optional: `OpenAiExplanationProvider` when `AI_PROVIDER=openai`
- Output schema is validated (`zod`) before explanation is returned/saved.

## Local Setup

1. Clone repo and install deps:

```bash
npm install
```

2. Copy env file:

```bash
cp .env.example .env.local
```

3. Fill env vars:
- `NEXT_PUBLIC_SUPABASE_URL`
- `NEXT_PUBLIC_SUPABASE_ANON_KEY`
- `SUPABASE_SERVICE_ROLE_KEY`
- optional AI vars

4. Apply migrations:

```bash
supabase db push
```

5. Seed demo users/data:

```bash
npm run seed
```

6. Run app:

```bash
npm run dev
```

Demo credentials:
- `admin@accesslens.local` / `Password123!`
- `analyst@accesslens.local` / `Password123!`

## Tests

Run tests:

```bash
npm test
```

Included:
- Risk rules unit tests: [`tests/risk/rules.test.ts`](/Users/michaelmarrero/Documents/New%20project/AccessLens/tests/risk/rules.test.ts)
- Action endpoint integration tests: [`tests/api/findings-action.test.ts`](/Users/michaelmarrero/Documents/New%20project/AccessLens/tests/api/findings-action.test.ts)
- Action validation and transition tests: [`tests/findings/actions.test.ts`](/Users/michaelmarrero/Documents/New%20project/AccessLens/tests/findings/actions.test.ts)
- Zod payload validation tests: [`tests/findings/validation.test.ts`](/Users/michaelmarrero/Documents/New%20project/AccessLens/tests/findings/validation.test.ts)
- Finding label formatting tests: [`tests/findings/format.test.ts`](/Users/michaelmarrero/Documents/New%20project/AccessLens/tests/findings/format.test.ts)

## Vercel + Supabase Deployment

1. Create a Supabase project.
2. Run SQL migration(s) in Supabase.
3. Create an admin user in Supabase Auth (or run seed script with service role key).
4. Add env vars in Vercel project settings:
   - `NEXT_PUBLIC_SUPABASE_URL`
   - `NEXT_PUBLIC_SUPABASE_ANON_KEY`
   - `SUPABASE_SERVICE_ROLE_KEY`
   - `DEMO_TENANT_ID`
   - `PRIVILEGE_WEIGHT_THRESHOLD`
   - `AI_PROVIDER`
   - `OPENAI_API_KEY` (optional)
   - `OPENAI_MODEL` (optional)
5. Deploy with Vercel (Next.js auto-detected). `vercel.json` is included.

Vercel config:
- [`vercel.json`](/Users/michaelmarrero/Documents/New%20project/AccessLens/vercel.json)

## Screenshots

Add screenshots to [`docs/screenshots`](/Users/michaelmarrero/Documents/New%20project/AccessLens/docs/screenshots):
- `login.png`
- `dashboard.png`
- `finding-detail.png`
- `admin.png`

You can then embed them in this README.

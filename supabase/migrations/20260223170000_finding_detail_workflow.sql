-- Add status/action values for advanced finding workflow.
alter type finding_status add value if not exists 'in_review';
alter type finding_status add value if not exists 'escalated';
alter type finding_status add value if not exists 'suppressed';
alter type finding_status add value if not exists 'false_positive';

alter type review_action_type add value if not exists 'update';

-- Optional finding metadata and assignment fields.
alter table risk_findings
  add column if not exists assigned_to uuid references profiles (id) on delete set null,
  add column if not exists priority text,
  add column if not exists due_at timestamptz,
  add column if not exists disposition text,
  add column if not exists confidence numeric,
  add column if not exists detector_version text,
  add column if not exists rule_ids jsonb,
  add column if not exists score_breakdown jsonb;

-- Action audit enrichment.
alter table review_actions
  add column if not exists previous_status text,
  add column if not exists new_status text,
  add column if not exists metadata jsonb;

-- Keep constraints additive and idempotent.
do $$
begin
  if not exists (
    select 1
    from pg_constraint
    where conname = 'risk_findings_priority_check'
  ) then
    alter table risk_findings
      add constraint risk_findings_priority_check
      check (priority is null or priority in ('low', 'medium', 'high', 'critical'));
  end if;

  if not exists (
    select 1
    from pg_constraint
    where conname = 'risk_findings_confidence_check'
  ) then
    alter table risk_findings
      add constraint risk_findings_confidence_check
      check (confidence is null or (confidence >= 0 and confidence <= 1));
  end if;
end;
$$;

create index if not exists idx_risk_findings_assigned_to on risk_findings (assigned_to);
create index if not exists idx_risk_findings_due_at on risk_findings (due_at);
create index if not exists idx_review_actions_prev_new_status on review_actions (previous_status, new_status);

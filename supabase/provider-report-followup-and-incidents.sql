-- Adds follow-up resolution tracking and Incident Reporting as a report type.

alter table public.provider_house_reports
  add column if not exists follow_up_resolved boolean not null default false,
  add column if not exists follow_up_resolved_at timestamptz,
  add column if not exists follow_up_resolved_by_auth_user_id uuid,
  add column if not exists follow_up_resolution_notes text;

alter table public.provider_house_reports
  drop constraint if exists provider_house_reports_type_check;

alter table public.provider_house_reports
  add constraint provider_house_reports_type_check check (
    report_type in (
      'annual_fire_drill',
      'weekly_house_meeting_minutes',
      'monthly_staff_meeting_minutes',
      'monthly_self_safety_assessment',
      'incident_reporting'
    )
  );

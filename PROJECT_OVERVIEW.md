# Halfway Portal Project Overview

## Current Repo Status

On branch main
Your branch is up to date with 'origin/main'.

Untracked files:
  (use "git add <file>..." to include in what will be committed)
	PROJECT_OVERVIEW.md

nothing added to commit but untracked files present (use "git add" to track)

## Recent Commits

15037c9 (HEAD -> main, origin/main, origin/HEAD) Stabilize pass request submit and sponsor alert
89479ed Fix resident portal pass submit and sponsor alert
587d962 Add resident portal tabs and sponsor updates
5dd9382 Simplify provider document portal links
8b87d15 Remove duplicate dashboard links and clean resident layout
3330752 Clean resident profile content layout
0931cc6 Clean resident tabs and remove duplicate dashboard link
287e523 Clean resident tabs and remove duplicate dashboard link
117d381 Show request counts in reports selector
fed7e98 Expand provider pass request review
fa68231 Expand resident pass request form
7d2148d Add provider pass request review
4e2633c Add resident portal pass requests
ff0714b Add document signing to resident portal
f97b2f2 Use payload RPC for staff maintenance requests
67edc8c Fix staff maintenance request house value
780f8f9 Use RPC for staff maintenance requests
4a49fc2 Fix staff maintenance request creation
e17db67 Add staff maintenance request actions
a40054c Show maintenance log in reports selector
8a6acf7 Add resident portal link generator
7750ae0 Add persistent resident portal
5cc36ce Add client maintenance request route
c8f5483 Add provider maintenance log
18f8c73 Add resident sponsor information fields

## Files Modified Since Medication/Staff/UA Build Phase

app/account/page.tsx
app/audit/page.tsx
app/auth/page.tsx
app/client/intake/[token]/page.tsx
app/client/maintenance/[token]/page.tsx
app/client/portal/[token]/page.tsx
app/client/rci/[token]/page.tsx
app/documents/page.tsx
app/houses/[id]/page.tsx
app/houses/page.tsx
app/onboarding/page.tsx
app/page.tsx
app/reports/page.tsx
app/residents/[id]/page.tsx
app/residents/page.tsx
app/staff/[id]/page.tsx
app/staff/page.tsx
app/ua-randomizer/page.tsx
components/AppHeader.tsx
components/PageShell.tsx
components/SetupNav.tsx
eslint.config.mjs
lib/audit.ts
supabase/client-intake-signing.sql
supabase/client-intake-storage-policy.sql
supabase/client-maintenance-requests.sql
supabase/document-house-targets.sql
supabase/document-signature-fields.sql
supabase/document-source-type.sql
supabase/house-fee-settings.sql
supabase/provider-house-report-houses.sql
supabase/provider-house-reports.sql
supabase/provider-report-followup-and-incidents.sql
supabase/resident-alerts-and-phase-one.sql
supabase/resident-discharge-contact-selection.sql
supabase/resident-document-assignment-policies.sql
supabase/resident-document-assignments.sql
supabase/resident-fee-ledger-generator.sql
supabase/resident-intake-profile-fields.sql
supabase/resident-maintenance-requests.sql
supabase/resident-pass-request-form-fields.sql
supabase/resident-pass-requests.sql
supabase/resident-portal-document-signing.sql
supabase/resident-portal-sponsor-updates.sql
supabase/resident-portal.sql
supabase/resident-readmission-admission-notes.sql
supabase/resident-readmission-snapshots.sql
supabase/resident-satisfaction-survey.sql
supabase/resident-sponsor-info.sql
supabase/staff-custom-permissions.sql
supabase/staff-employee-files.sql
supabase/ua-randomizer-policies.sql
supabase/ua-randomizer.sql
supabase/ua-repopulate-rolling-schedule.sql
supabase/ua-rolling-schedule.sql
supabase/ua-scheduled-log-link.sql

## Current App Routes / Pages

app/account/page.tsx
app/audit/page.tsx
app/auth/page.tsx
app/documents/page.tsx
app/favicon.ico
app/globals.css
app/houses/[id]/page.tsx
app/houses/page.tsx
app/layout.tsx
app/onboarding/page.tsx
app/page.tsx
app/reports/page.tsx
app/residents/[id]/page.tsx
app/residents/page.tsx
app/staff/[id]/page.tsx
app/staff/page.tsx
app/ua-randomizer/page.tsx

## Supabase SQL Files

supabase/client-intake-signing.sql
supabase/client-intake-storage-policy.sql
supabase/client-maintenance-requests.sql
supabase/client-rci-assessment.sql
supabase/client-rci-question-preview.sql
supabase/client-recovery-goals.sql
supabase/document-house-targets.sql
supabase/document-signature-fields.sql
supabase/document-source-type.sql
supabase/house-fee-settings.sql
supabase/medication-logs.sql
supabase/medication-records.sql
supabase/policies.sql
supabase/progress-notes.sql
supabase/provider-fee-settings.sql
supabase/provider-house-report-houses.sql
supabase/provider-house-reports.sql
supabase/provider-phase-levels.sql
supabase/provider-report-followup-and-incidents.sql
supabase/rci-assessments.sql
supabase/rci-real-assessment.sql
supabase/resident-alerts-and-phase-one.sql
supabase/resident-discharge-contact-selection.sql
supabase/resident-discharge-requirements.sql
supabase/resident-document-assignment-policies.sql
supabase/resident-document-assignments.sql
supabase/resident-emergency-contacts.sql
supabase/resident-fee-ledger-generator.sql
supabase/resident-fees.sql
supabase/resident-intake-profile-fields.sql
supabase/resident-lifecycle-guards.sql
supabase/resident-lifecycle.sql
supabase/resident-maintenance-requests.sql
supabase/resident-pass-request-form-fields.sql
supabase/resident-pass-requests.sql
supabase/resident-portal-document-signing.sql
supabase/resident-portal-sponsor-updates.sql
supabase/resident-portal.sql
supabase/resident-readmission-admission-notes.sql
supabase/resident-readmission-snapshots.sql
supabase/resident-roi-authorizations.sql
supabase/resident-roi-per-contact.sql
supabase/resident-satisfaction-survey.sql
supabase/resident-snapshot-fields.sql
supabase/resident-sponsor-info.sql
supabase/schema.sql
supabase/secure-policies.sql
supabase/staff-custom-permissions.sql
supabase/staff-employee-files.sql
supabase/storage-policies.sql
supabase/ua-ba-logs.sql
supabase/ua-randomizer-policies.sql
supabase/ua-randomizer.sql
supabase/ua-repopulate-rolling-schedule.sql
supabase/ua-rolling-schedule.sql
supabase/ua-scheduled-log-link.sql

## Recent Feature Summary From Commit History

- Stabilize pass request submit and sponsor alert
- Fix resident portal pass submit and sponsor alert
- Add resident portal tabs and sponsor updates
- Simplify provider document portal links
- Remove duplicate dashboard links and clean resident layout
- Clean resident profile content layout
- Clean resident tabs and remove duplicate dashboard link
- Clean resident tabs and remove duplicate dashboard link
- Show request counts in reports selector
- Expand provider pass request review
- Expand resident pass request form
- Add provider pass request review
- Add resident portal pass requests
- Add document signing to resident portal
- Use payload RPC for staff maintenance requests
- Fix staff maintenance request house value
- Use RPC for staff maintenance requests
- Fix staff maintenance request creation
- Add staff maintenance request actions
- Show maintenance log in reports selector
- Add resident portal link generator
- Add persistent resident portal
- Add client maintenance request route
- Add provider maintenance log
- Add resident sponsor information fields

# Dashboard Demo QA Record

Date: 2026-05-06
Lane: Dashboard/demo polish (`RF-75` through `RF-82`, plus `RF-100` language QA)

## Jira Reality Snapshot

- `RF-75` is in review in Jira, while current `develop` already contains the dashboard aggregation layer in both the Next compatibility reads and the Nest API overview endpoint.
- `RF-76`, `RF-77`, `RF-78`, and `RF-79` are still To Do in Jira, but current `develop` already renders KPI, pipeline/risk, overdue follow-up, and outcome widgets on `/dashboard`.
- `RF-80` is represented by the main dashboard recent activity digest using the shared audit/account activity stream.
- `RF-81` now has a durable walkthrough artifact at `docs/dashboard-demo-walkthrough.md`.
- `RF-82` should use this file as the regression record template for dashboard/demo closure evidence.
- `RF-100` is intentionally a demo-visible language pass only; it must not rename API routes, query params, audit event names, schema-backed fields, or implementation-facing Jira/branch cues.

## Manual Walkthrough Checklist

Use the seeded `Northstar Recruiting` workspace.

- [ ] Sign in as `test@test.com` / `admin123`.
- [ ] Open `/dashboard` and confirm the KPI cards show non-empty active clients, open jobs, live submissions, and overdue tasks.
- [ ] Confirm operational pulse, stage distribution, risk mix, at-risk submissions, stale work, overdue follow-ups, recent activity, placements, and time-to-submit render without taking down the page if one section fails.
- [ ] Click dashboard links to `/pipeline`, `/tasks`, `/clients`, `/jobs`, `/candidates`, `/documents`, and `/settings/activity`.
- [ ] In `/pipeline`, confirm the language treats the submission as the candidate-job work item.
- [ ] In `/tasks`, confirm overdue and current-user work mirrors dashboard execution pressure.
- [ ] In `/documents`, confirm document delivery/export actions and AI status labels do not imply AI blocks normal CRUD.
- [ ] Return to `/dashboard` and close on placements plus time-to-submit.

## Low-Data Workspace Checklist

- [ ] Sign up or use a workspace with no business records.
- [ ] Confirm dashboard sections show zeros or explanatory empty states.
- [ ] Confirm empty pipeline/task/document/activity/outcome sections do not crash.
- [ ] Confirm public marketing routes remain outside the authenticated workspace shell.

## Product Language QA Notes

Approved recruiter-facing vocabulary for the demo:

- `workspace` for tenant/account boundary.
- `client` for the paying company.
- `candidate` for the person being represented.
- `job` for the client role/requisition.
- `submission` for the candidate-job work item that carries stage, owner, risk, next step, tasks, notes, and outcome.
- `placement` for a submission that reaches `placed`.
- `AI status`, `summary`, `indexing`, and `automation run` for enhancement-layer observability, not source-of-truth business mutation.

Preserve implementation-facing terms where useful:

- Jira keys such as `RF-75` or `RF-100`.
- API route names such as `/dashboard/overview` and `/automation/runs`.
- Contract names, query params, audit actions, schema fields, and branch pack names.

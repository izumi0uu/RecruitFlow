# RecruitFlow Dashboard Demo Walkthrough

This walkthrough is the Phase 1 demo script for the seeded `Northstar Recruiting` workspace. It is intentionally short enough for a five-minute portfolio recording while still touching the core operating loop.

## Demo Account

- Owner: `test@test.com` / `admin123`
- Recruiter: `recruiter@test.com` / `admin123`
- Coordinator: `coordinator@test.com` / `admin123`

Start as the owner when explaining workspace health, billing/settings, and outcome metrics. Switch to recruiter or coordinator only when showing role-specific task ownership.

## Five-Minute Path

1. **Dashboard / workspace health**
   - Open `/dashboard`.
   - Point out the KPI cards: active clients, open jobs, live submissions, and overdue tasks.
   - Use the operational pulse chart to explain that the dashboard combines submission touches and follow-up pressure instead of acting as a vanity metrics page.

2. **Pipeline risk and execution pressure**
   - Stay on `/dashboard` and scan stage distribution, risk mix, at-risk submissions, stale work, and overdue follow-ups.
   - Explain that `candidate + job = submission`; the submission is the operational work item that carries stage, risk, next step, and task context.
   - Click into `/pipeline` from a dashboard widget or CTA.

3. **Client and job context**
   - From the pipeline or navigation, open `/clients` and then `/jobs`.
   - Use Lattice Labs, Quantum Works, or Harbor Health as the client narrative.
   - Show that jobs retain intake details, status, priority, and stage-template readiness without changing the client or candidate identities.

4. **Candidate and documents**
   - Open `/candidates` and inspect a profile with linked documents.
   - Move to `/documents` to show document status, secure delivery/export actions, and AI-ready summary/indexing status.
   - Clarify that Phase 1 AI status is an enhancement layer; failed or queued AI work does not block CRM CRUD.

5. **Tasks and activity**
   - Open `/tasks` from the dashboard overdue widget.
   - Show mine/workspace/overdue/snoozed/done filters and status actions.
   - Return to `/dashboard` and use the recent activity digest to connect audit/activity events back to the home surface.

6. **Outcome wrap-up**
   - End on `/dashboard` with placements and time-to-submit.
   - Explain the product story: RecruitFlow is a boutique recruiting agency operating system built from a SaaS starter, with workspace scoping, pipeline execution, tasks/activity, documents, and AI-safe observability.

## Seeded Story Beats

The demo seed in `lib/db/seed.ts` already carries the named records below, so this walkthrough should not require manual data setup after `pnpm db:seed`.

- **Nina Patel / Senior Full Stack Engineer**: healthy submitted candidate with panel prep follow-up.
- **Marcus Lee / Senior Full Stack Engineer**: client-interview work with timing risk.
- **Priya Nair / Principal AI Infrastructure Engineer**: offer-stage submission with compensation risk and AI-summary-ready documents.
- **Grace Kim / Account Executive**: placed submission for outcome metrics.
- **Theo Brooks / RevOps Lead**: failed AI summary example that demonstrates safe failure and retry narrative.

Backup records such as **Lila Chen**, **Rosa Martinez**, **BrightLayer Energy**, **Cedar Bank**, and **Northstar Commerce** provide alternate low-risk, timing-risk, and client-variety examples if the primary path needs a second pass.

When explaining outcomes, treat the dashboard's **Average cycle** tile as the demo-visible time-to-submit metric: it measures the average duration from job intake opening to first candidate submission, while the adjacent placements list shows closed wins.

## Low-Data Workspace Check

If a new or empty workspace is used instead of the seed, the dashboard should still render with zeros, empty-state copy, and local widget fallbacks. A low-data walkthrough should verify that empty pipeline, task, document, activity, placement, and time-to-submit sections are explanatory rather than blank.

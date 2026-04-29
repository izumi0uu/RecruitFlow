# RecruitFlow

RecruitFlow is evolving from a single Next.js runtime into a split `web + api + shared packages` workspace for the Phase 1 backend-extraction wave.

## Repository Shape

`RF-83` introduces the first extraction scaffold:

- `apps/api`: bootable NestJS API skeleton with a health endpoint
- `apps/web`: stable package boundary for the web shell
- `packages/contracts`: shared DTO and response-shape placeholders
- `packages/config`: shared runtime constants and startup conventions

Current boundary note:

- the live Next.js source still remains at the repository root for now
- `apps/web` is the stable workspace identity and command surface
- later cutover work can move source files under `apps/web` without changing developer-facing scripts again

## Session Bridge

- The web shell and Nest API now share the existing `session` cookie contract.
- The JWT is still signed with the shared `AUTH_SECRET`; this branch does not rewrite auth providers.
- `GET /auth/session` is the first protected Nest endpoint and returns `401` when the cookie is missing, invalid, or expired.
- `GET /workspaces/current` and `GET /memberships/current` now resolve the current workspace context through Nest instead of relying only on Next-local query helpers.

## Foundation Mutation Ownership

- `POST /auth/sign-up` now creates the user, workspace or invite-backed membership, audit entries, and session token through the Nest API.
- `POST /members/invitations` and `DELETE /members/:memberId` now own invite and membership mutations inside `apps/api`.
- `POST /billing/checkout` now owns Stripe checkout-session creation and workspace metadata binding.
- `POST /billing/portal` now owns Stripe customer-portal session creation and billing-portal audit logging.
- `POST /billing/webhooks/stripe` now owns Stripe webhook verification and subscription state sync.

Current web adapter note:

- `app/api/billing/checkout/route.ts` is a redirect shell that calls the API and forwards the user to Stripe.
- `lib/payments/actions.ts` keeps the settings-page portal form UX, but the actual portal session is now created through the API.
- `app/api/stripe/webhook/route.ts` is a raw-payload proxy that forwards Stripe webhooks into the API-owned handler.
- `app/api/stripe/checkout/route.ts` is now a post-checkout return shell only; it no longer writes billing state directly.

## Core CRM API Skeletons

- `GET /clients`, `GET /jobs`, `GET /candidates`, and `GET /submissions` now return guarded placeholder payloads from Nest-owned modules.
- These placeholder responses expose:
  - the current workspace-scoped auth context
  - the downstream owner branch and implementation story
  - the reserved route surface for list, detail, and create flows
  - the validated query contract coming from `packages/contracts`
- Shared placeholder query schemas now live in `@recruitflow/contracts` for:
  - `clientsListQuerySchema`
  - `jobsListQuerySchema`
  - `candidatesListQuerySchema`
  - `submissionsListQuerySchema`
- This keeps Wave 2 and Wave 3 branches from inventing transport shapes independently when they start real CRM implementation.

This project started from a Next.js SaaS starter and now carries RecruitFlow domain, workspace, billing, and dashboard behavior.

**Demo: [https://next-saas-start.vercel.app/](https://next-saas-start.vercel.app/)**

## Features

- Marketing landing page (`/`) with animated Terminal element
- Pricing page (`/pricing`) which connects to Stripe Checkout
- Dashboard pages with CRUD operations on users/teams
- Basic RBAC with Owner and Member roles
- Subscription management with Stripe Customer Portal
- Email/password authentication with JWTs stored to cookies
- Global middleware to protect logged-in routes
- Local middleware to protect Server Actions or validate Zod schemas
- Activity logging system for any user events

## Tech Stack

- **Framework**: [Next.js](https://nextjs.org/)
- **Database**: [Postgres](https://www.postgresql.org/)
- **ORM**: [Drizzle](https://orm.drizzle.team/)
- **Payments**: [Stripe](https://stripe.com/)
- **UI Library**: [shadcn/ui](https://ui.shadcn.com/)

## Getting Started

```bash
git clone https://github.com/nextjs/saas-starter
cd saas-starter
pnpm install
```

## Running Locally

[Install](https://docs.stripe.com/stripe-cli) and log in to your Stripe account:

```bash
stripe login
```

Use the included setup script to create your `.env` file:

```bash
pnpm db:setup
```

Run the database migrations and seed the database with the shared RecruitFlow demo workspace:

```bash
pnpm db:migrate
pnpm db:seed
```

This seed creates the following baseline:

- Workspace: `Northstar Recruiting`
- Owner: `test@test.com` / `admin123`
- Recruiter: `recruiter@test.com` / `admin123`
- Coordinator: `coordinator@test.com` / `admin123`

The seed also creates baseline clients, jobs, candidates, submissions, tasks,
documents, and audit history so the authenticated workspace routes load with
non-empty demo states.

You can also create new users through the `/sign-up` route.

Start the web shell:

```bash
pnpm dev:web
```

If `3001` is already in use locally, you can temporarily override it:

```bash
PORT=3101 pnpm dev:web
```

Start the Nest API in a second terminal:

```bash
pnpm dev:api
```

Or run both runtimes together:

```bash
pnpm dev:stack
```

Open [http://localhost:3001](http://localhost:3001) in your browser to see the web shell.
The API health endpoint is available at [http://localhost:4001/health](http://localhost:4001/health), and the JSON API contract catalogue is available at [http://localhost:4001/docs](http://localhost:4001/docs).

You can smoke-check both API observability surfaces from the terminal:

```bash
curl http://localhost:4001/health
curl -H "x-request-id: rf-local-smoke" http://localhost:4001/docs
```

The API echoes `x-request-id` on every response and logs `request_id`, method, path, status, and duration for each request.

You can listen for Stripe webhooks locally through their CLI to handle subscription change events:

```bash
stripe listen --forward-to localhost:3001/api/stripe/webhook
```

## Testing Payments

To test Stripe payments, use the following test card details:

- Card Number: `4242 4242 4242 4242`
- Expiration: Any future date
- CVC: Any 3-digit number

## Going to Production

When you're ready to deploy your SaaS application to production, follow these steps:

### Set up a production Stripe webhook

1. Go to the Stripe Dashboard and create a new webhook for your production environment.
2. Set the endpoint URL to your production API route (e.g., `https://yourdomain.com/api/stripe/webhook`).
3. Select the events you want to listen for (e.g., `checkout.session.completed`, `customer.subscription.updated`).

### Deploy to Vercel

1. Push your code to a GitHub repository.
2. Connect your repository to [Vercel](https://vercel.com/) and deploy it.
3. Follow the Vercel deployment process, which will guide you through setting up your project.

### Add environment variables

In your Vercel project settings (or during deployment), add all the necessary environment variables. Make sure to update the values for the production environment, including:

1. `BASE_URL`: Set this to your production domain.
2. `STRIPE_SECRET_KEY`: Use your Stripe secret key for the production environment.
3. `STRIPE_WEBHOOK_SECRET`: Use the webhook secret from the production webhook you created in step 1.
4. `POSTGRES_URL`: Set this to your production database URL.
5. `AUTH_SECRET`: Set this to a random string. `openssl rand -base64 32` will generate one.

## Other Templates

While this template is intentionally minimal and to be used as a learning resource, there are other paid versions in the community which are more full-featured:

- https://achromatic.dev
- https://shipfa.st
- https://makerkit.dev
- https://zerotoshipped.com
- https://turbostarter.dev

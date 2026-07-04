# White-Label Rollout Plan

Turn NSR Elite into a **multi-tenant SaaS** that contractors sign up for, brand as
their own, and roll out to their reps — one app in the stores, many isolated
organizations inside.

## Decisions (locked)
- **One multi-tenant app.** Contractors = **Organizations**; reps download the
  same platform app, log in, and see their org's branding. (Not per-contractor
  store apps.)
- **Self-serve SaaS.** Contractors sign up, brand, subscribe, and invite reps.
- **Integrations provided centrally** (platform-owned ATTOM, skip-trace, email,
  Mapbox), **metered per org**. **AccuLynx is the only per-org, optional**
  connection a contractor sets up themselves.
- Built to **scale as a product**.

## Delivery strategy — build the platform separately; NSR untouched
- Build the white-label platform as a **new repo + new Vercel project + new
  database + new (platform-branded) App Store app**. NSR's current app, data,
  and store listing stay **frozen and untouched** — zero blast radius.
- The platform is **one multi-tenant app** (many orgs inside), **not** a
  per-contractor clone.
- **Convergence (recommended):** once the platform is proven, import NSR onto it
  as **Org #1** in a single planned migration, then retire the standalone app →
  one codebase long-term. *(Alternative: keep NSR standalone forever = two
  codebases to maintain.)*
- Consequence: Phase 1 builds multi-tenancy on a **fresh, empty database** — no
  risky in-place migration of live data.

### Standing up the platform (runbook)
1. **Fork** this repo → new platform repo (e.g. `nsr-platform`).
2. New **Vercel project** + new **database** (Neon) for it — separate from NSR's.
3. Copy env config; generate a fresh `NEXTAUTH_SECRET`; point `DATABASE_URL` at
   the new DB. Central integration keys (ATTOM, skip-trace, SMTP, Mapbox) can be
   the same platform-owned keys.
4. Do all Phase 1 work there; seed demo orgs (never connect to NSR's DB).
5. New **App Store listing** under the platform brand; NSR's listing untouched.
6. Decide convergence (A) vs. standalone-forever (B) when the platform is proven.

## Open decisions (need answers to finalize)
1. **Platform brand.** The store app can't stay "NSR Elite" if NSR is just one
   customer — it needs a neutral **product name + icon** (e.g. "DoorKnocker
   Pro"). NSR becomes tenant #1.
2. **Pricing/packaging.** Per-seat vs flat monthly; plan tiers; are property data
   / skip trace included (with caps) or paid add-ons? (You carry the vendor cost,
   so metering + caps matter.)
3. **Data-cost model.** Included-with-caps vs usage-based overage billing.

---

## Architecture

### Tenancy (the foundation)
- New **`Organization`** model. Every tenant-owned row (`User`, `Lead`,
  `Territory`, `Appointment`, `DispositionStatus`, `Note`, `Photo`,
  `RepLocation`, `PropertyRecord` links, etc.) gets an **`organizationId`**.
- **Central scoping**: a Prisma client extension / request-scoped wrapper injects
  the current org filter on every query, so a missing `where` can't leak another
  tenant's data. This is the #1 correctness/security requirement.
- **A user belongs to one org.** Login resolves the org from the user's account →
  no org picker needed. Email is globally unique.
- Existing NSR data is migrated into **Organization #1**.

### Branding per org
- `WorkspaceSettings` becomes **per-organization**: company name, logo, brand
  color, favicon, login art.
- Branding resolves from the logged-in user's org and drives the app shell,
  login screen, watermark, emails, and PWA manifest. (Un-hardcode the NSR badge
  where it's currently fixed.)

### Integrations (central, metered) + AccuLynx (per-org, optional)
- **Central**: ATTOM property data, skip trace, email (platform SMTP), Mapbox —
  platform-owned keys. Add **per-org usage metering** (counts + cost) with
  **plan caps** to control spend, plus feature gates by plan.
- **AccuLynx**: optional per-org API key stored **encrypted** in the DB, with a
  per-org settings screen (today's AccuLynx settings, scoped to the org).
- **Email**: sent from the platform domain with the org's display name; keep
  SPF/DKIM on the platform domain for deliverability at scale.

### Self-serve onboarding & billing
- Public **signup** → create Organization + admin user → **branding wizard** →
  **Stripe** subscription → invite reps (reuse the existing invite flow,
  org-scoped).
- Plan tiers gate features (property data, skip trace) and set usage caps.

### Super-admin (platform owner) console
- Manage orgs, plans, and usage; impersonate for support (audited); suspend /
  cancel. Separate from an org's own admin.

### Mobile / stores
- **Rebrand the store app to the platform brand** (new name/icon/splash); NSR
  becomes a tenant. A single multi-tenant SaaS app is App-Store-friendly (avoids
  the per-client "template app" problem). Login → org → in-app branding.

---

## Phased roadmap

**Phase 1 — Multi-tenancy foundation** *(biggest, most critical)*
Organization model; `organizationId` on all tenant models + migration; central
query scoping; org in the auth session; migrate NSR → Org #1; isolation tests.

**Phase 2 — Per-org branding**
Per-org settings; dynamic branding across shell/login/emails/manifest.

**Phase 3 — Self-serve onboarding + billing**
Signup → org + admin → branding wizard → Stripe; plan tiers + feature gates;
org-scoped rep invites.

**Phase 4 — Central integrations, metered**
Org-scope property data / skip trace with per-org usage metering + caps;
per-org encrypted AccuLynx key + settings; per-org email sender identity.

**Phase 5 — Super-admin console**
Org/plan/usage management; audited impersonation; suspend.

**Phase 6 — Mobile rebrand & resubmit**
Platform name/icon/splash; login-resolved branding; store resubmission.

**Phase 7 — Custom domains (optional), polish, docs, launch.**

> Sequencing note: Phases 1–2 are prerequisites for everything. You can pilot
> with 1–2 concierge-onboarded orgs after Phase 2 while 3–5 are built.

---

## Top risks
- **Cross-tenant data leakage** — mitigate with centralized query scoping +
  tests; treat as the #1 gate before onboarding any real second tenant.
- **Vendor cost runaway** (central ATTOM/skip-trace) — per-org metering + caps +
  plan gating from day one.
- **App-store** — one genuine multi-tenant app is fine; the rename to a platform
  brand is the main task.
- **Email deliverability at scale** — platform domain with SPF/DKIM/DMARC.
- **Support & impersonation** — must be audited.

## Rough effort
Multi-month. Phase 1 (multi-tenancy) is the largest single chunk and the
highest-risk; budget real time for isolation testing before go-live.

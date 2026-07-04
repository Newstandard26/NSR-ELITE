# Phase 1 Spec — Multi-Tenancy Foundation (build-ready)

Introduce **Organization** tenancy with airtight data isolation. NSR becomes
**Org #1** with **zero behavior change**. No branding/billing/signup yet (later
phases).

> Built on a **fresh, separate deployment + empty database** (the white-label
> platform). NSR's live app and DB are **untouched**. So `organizationId` is
> `NOT NULL` from day one — no in-place migration or live-data backfill. NSR is
> imported later as a one-time **convergence** step (Phase 6+), done against the
> platform, never mutating NSR's production.

---

## 1. Data model

### New model
```prisma
model Organization {
  id        String   @id @default(cuid())
  name      String
  slug      String   @unique   // used later for subdomain/login routing
  createdAt DateTime @default(now())
  updatedAt DateTime @updatedAt
  // back-relations added on each scoped model
}
```

### Tenant-scoped models (add `organizationId` + relation + `@@index`)
`User`, `Lead`, `Territory`, `TerritoryAssignment`, `DispositionStatus`,
`Appointment`, `Note`, `Photo`, `RepLocation`, `LoginEvent`, `InviteToken`,
`Notification`, `LeadActivity`, `ImportLog`, `SyncLog`, `WorkspaceSettings`,
`IntegrationSettings`.

- `WorkspaceSettings` / `IntegrationSettings` stop being singletons — one row
  per org (drop the fixed `"default"` id; key by `organizationId`).
- `DispositionStatus` is **per-org** (each contractor customizes their pins);
  NSR's current pins move to Org #1.

### Intentionally GLOBAL (not scoped)
- **`PropertyRecord`** — the ATTOM/skip-trace cache is keyed by normalized
  address = public property data. Keeping it **shared across orgs** means two
  contractors looking up the same house pay for **one** lookup (big central-cost
  win). The tenant-private link is `Lead.propertyRecordId`, which *is* scoped via
  the Lead. *(Decision to confirm: acceptable that appended contact data is
  shared cache; it's the same homeowner. If not, scope it.)*

---

## 2. Migration strategy (fresh instance — no live-data risk)

The platform is a brand-new deployment with an **empty database**, so there's no
live data to migrate. Build it multi-tenant from the start:

- `organizationId` is **`NOT NULL`** on every scoped model from the first
  migration.
- The seed creates a **demo Organization + admin** for local/dev/test.
- Every request runs inside an org context (Sections 3–4), so there's no
  "unscoped legacy data" to reconcile.

**NSR convergence (later, separate — Phase 6+):** when the platform is proven,
import NSR's existing data into a new Org — export from NSR's DB, insert under
the new org id. One-time, planned, run against the *platform* (never mutating
NSR's production).

---

## 3. Central query scoping (the core safety mechanism)

Do **not** hand-add `organizationId` to every route (one miss = a leak). Scope
centrally:

**`lib/tenant.ts`** — request-scoped org via `AsyncLocalStorage`:
```ts
import { AsyncLocalStorage } from "node:async_hooks";
export const tenantStore = new AsyncLocalStorage<{ organizationId: string }>();
export const currentOrg = () => tenantStore.getStore()?.organizationId;
export const runInTenant = <T>(orgId: string, fn: () => Promise<T>) =>
  tenantStore.run({ organizationId: orgId }, fn);
```

**Prisma client extension** (`lib/db.ts`) injects the filter:
```ts
const SCOPED = new Set(["Lead","User","Territory","TerritoryAssignment",
  "DispositionStatus","Appointment","Note","Photo","RepLocation","LoginEvent",
  "InviteToken","Notification","LeadActivity","ImportLog","SyncLog",
  "WorkspaceSettings","IntegrationSettings"]);

prisma.$extends({ query: { $allModels: { async $allOperations({ model, operation, args, query }) {
  const org = currentOrg();
  if (!model || !SCOPED.has(model) || !org) return query(args);   // system ctx = unscoped
  if (["findMany","findFirst","count","aggregate","groupBy","updateMany","deleteMany"].includes(operation))
    args.where = { AND: [args.where ?? {}, { organizationId: org }] };
  else if (operation === "create") args.data = { ...args.data, organizationId: org };
  else if (operation === "createMany")
    args.data = (Array.isArray(args.data) ? args.data : [args.data]).map(d => ({ ...d, organizationId: org }));
  return query(args);
}}}});
```

**The `findUnique` / `update` / `delete` / `upsert` caveat:** Prisma only allows
unique fields in those `where`s, so you can't append `organizationId` there.
Rule: **never trust a bare id lookup.** Replace `findUnique({where:{id}})` with
`findFirst({where:{id}})` (auto-scoped), and for `update`/`delete` by id, first
`findFirst` to confirm ownership (else 404), then mutate. Provide a helper
`getOwned(model, id)` and codemod the ~handful of id-based lookups.

**Raw SQL:** the analytics route uses `$queryRaw` on `LoginEvent` — add
`AND "organizationId" = ${org}` manually. Audit for all `$queryRaw`/`$executeRaw`.

---

## 4. Auth / request context
- `authorize()` returns `organizationId`; JWT `jwt` callback stores it; `session`
  callback exposes `session.user.organizationId`.
- `requireUser()` / `requireRole()` wrap the handler in
  `runInTenant(user.organizationId, …)` so the extension sees the org. (Or a
  thin route wrapper.)
- **`events.signIn`** runs outside the request context → stamp `organizationId`
  explicitly when writing the `LoginEvent`.

---

## 5. Unscoped / system contexts (must be explicit)
- **Migrations & seed** — run with no org context (extension no-ops). Backfill
  sets org directly.
- **AccuLynx inbound webhook** — has no session; must resolve the org from the
  synced `Lead`/`SyncLog`, then `runInTenant(org, …)`.
- **Cron / background** — set org per job.
- **Super-admin (Phase 5)** — a deliberate cross-org context; out of Phase 1
  scope but the extension's "no org = unscoped" path is where it plugs in
  (guarded).

---

## 6. Route & query audit checklist
- ✅ Standard Prisma list/create calls — auto-scoped, no route change.
- ⚠️ **id-based `findUnique`/`update`/`delete`/`upsert`** — convert to
  ownership-checked `findFirst` + mutate. (Grep: `findUnique(`.)
- ⚠️ **`$queryRaw` / `$executeRaw`** — add org filter manually. (Analytics.)
- ⚠️ **Creates outside a request** (webhooks, events, seed) — stamp org explicitly.
- ⚠️ **`createMany` / CSV import** — extension stamps, but verify.

---

## 7. Isolation testing (the go-live gate)
- Seed **two** orgs (A, B) with overlapping-looking data.
- Automated tests, acting as an A user:
  - every list endpoint returns only A rows;
  - `GET/PATCH/DELETE` of a B record **by id** → 404 (not found), never data.
  - dashboard/leaderboard/analytics counts include only A.
- A regression test asserting `findFirst` of a B id under A context is `null`.
- **No second real tenant is onboarded until these pass.**

---

## 8. Rollout sequence (fresh platform)
1. Fork repo → platform repo; new Vercel project + empty DB.
2. Build `Organization` + `organizationId` (NOT NULL) + central scoping + auth
   org-context; seed a demo org.
3. Get the isolation test suite (Section 7) green — the go-live gate.
4. Deploy the platform to its own environment; pilot with seeded/test orgs.
5. **NSR stays on its existing app throughout — untouched.**
6. Convergence (later): a planned import of NSR as Org #1, if/when chosen.

## 9. Effort
X-Large; the largest single chunk of the white-label program. Most of the risk
is in Section 3 (scoping correctness) and Section 7 (proving isolation).

## Open confirmations
- PropertyRecord stays a **global shared cache** (cost win) — OK?
- Any models I should treat as global besides PropertyRecord?

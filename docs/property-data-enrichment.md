# Property Data Enrichment

Pull owner, value, equity, and contact info for a house from the map.

## How it works
1. A rep opens a lead (tap a pin) → the **Property data** panel in the lead card.
2. Tapping **Pull property data** calls `POST /api/leads/[id]/enrich`.
3. The service (`lib/property.ts`) returns data from the active provider, caches it
   in `PropertyRecord` (keyed by normalized address, 90-day TTL), links it to the
   lead, and auto-fills any blank owner/phone/email.

On-demand by design — each live lookup costs money, so we don't enrich on every tap.
Re-tapping the same address reuses the cache for free.

## Turning it on
Set these env vars (e.g. in Vercel):

| Var | Value | Purpose |
|---|---|---|
| `PROPERTY_ENRICHMENT_ENABLED` | `true` | Server: allow the enrich endpoint |
| `NEXT_PUBLIC_PROPERTY_ENRICHMENT_ENABLED` | `true` | Browser: show the button (keep in sync) |
| `PROPERTY_DATA_PROVIDER` | `mock` or `attom` | Data source (defaults to `mock`) |
| `ATTOM_API_KEY` | _your key_ | Required when provider is `attom` |

**Mock mode** (`mock`) returns deterministic, believable sample data per address —
use it to demo/test the flow before the ATTOM contract clears. Flip
`PROPERTY_DATA_PROVIDER=attom` + add `ATTOM_API_KEY` to go live.

## Providers
- **mock** — deterministic fake data, no external calls. Default.
- **attom** — live ATTOM `property/expandedprofile` + AVM. Implemented in
  `lib/property.ts`; verify the field mapping against real responses once a key
  is available.

## Not yet wired (Phase 2+)
- **Skip trace** (real phones/emails + estimated income) via a dedicated vendor
  (e.g. BatchData). ATTOM doesn't provide contact data; mock mode fills it in for
  now. The `PropertyRecord.phones/emails/estimatedIncomeBand` columns are ready.

## Compliance
- Income/equity are **modeled marketing estimates, not FCRA credit reports** —
  don't use them for credit/eligibility decisions.
- Skip-traced phones carry a `dnc` flag; honor DNC/TCPA before calling/texting.
- Verify the provider's data **storage/caching terms** against the 90-day cache.

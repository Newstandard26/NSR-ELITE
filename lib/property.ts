import { Prisma } from "@prisma/client";
import { prisma } from "@/lib/db";
import { logActivity } from "@/lib/activity";

// ---------------------------------------------------------------------------
// Property-data enrichment
//
// Pluggable provider behind a feature flag. Today it defaults to a deterministic
// MOCK so the whole "Pull property data" flow is usable before any vendor
// contract clears. Set PROPERTY_DATA_PROVIDER=attom (and ATTOM_API_KEY) to use
// live ATTOM data.
//
// Compliance note: estimatedIncomeBand / equity are MODELED marketing signals,
// not FCRA consumer reports. Do not use them to make credit/eligibility
// decisions. Skip-traced phones carry a `dnc` flag — honor it before outreach.
// ---------------------------------------------------------------------------

export interface PropertyPhone {
  number: string;
  type?: string;
  dnc?: boolean;
}

export interface PropertyEnrichment {
  source: "mock" | "attom" | "batchdata";
  ownerName?: string | null;
  ownerOccupied?: boolean | null;
  mailingAddress?: string | null;
  yearBuilt?: number | null;
  sqft?: number | null;
  beds?: number | null;
  baths?: number | null;
  lotSizeSqft?: number | null;
  lastSalePrice?: number | null;
  lastSaleDate?: string | null; // ISO date
  assessedValue?: number | null;
  avmValue?: number | null;
  avmLow?: number | null;
  avmHigh?: number | null;
  estimatedEquity?: number | null;
  mortgageBalanceEst?: number | null;
  estimatedIncomeBand?: string | null;
  phones?: PropertyPhone[];
  emails?: string[];
  raw?: unknown;
}

export interface AddressInput {
  address: string;
  city: string;
  state: string;
  zip: string;
  lat?: number;
  lng?: number;
}

// How long a cached PropertyRecord is considered fresh before we'd pay to
// re-fetch. Keep in sync with whatever your provider's storage terms allow.
const CACHE_TTL_DAYS = 90;

export function enrichmentEnabled(): boolean {
  return process.env.PROPERTY_ENRICHMENT_ENABLED === "true";
}

function activeProvider(): "mock" | "attom" | "batchdata" {
  const p = process.env.PROPERTY_DATA_PROVIDER;
  if (p === "batchdata" && process.env.BATCHDATA_API_KEY) return "batchdata";
  if (p === "attom" && process.env.ATTOM_API_KEY) return "attom";
  return "mock";
}

// Admin diagnostic: what the running server actually sees (never exposes the key
// itself). Reveals redeploy/typo/scope problems behind "still showing mock".
export function providerDiagnostics() {
  const providerEnv = process.env.PROPERTY_DATA_PROVIDER ?? null;
  const attomKey = process.env.ATTOM_API_KEY ?? "";
  const batchKey = process.env.BATCHDATA_API_KEY ?? "";
  return {
    activeProvider: activeProvider(),
    enrichmentEnabled: enrichmentEnabled(),
    PROPERTY_DATA_PROVIDER: providerEnv,
    ATTOM_API_KEY_present: attomKey.length > 0,
    ATTOM_API_KEY_length: attomKey.length,
    BATCHDATA_API_KEY_present: batchKey.length > 0,
    BATCHDATA_API_KEY_length: batchKey.length,
    PROPERTY_ENRICHMENT_ENABLED: process.env.PROPERTY_ENRICHMENT_ENABLED ?? null,
    NEXT_PUBLIC_PROPERTY_ENRICHMENT_ENABLED:
      process.env.NEXT_PUBLIC_PROPERTY_ENRICHMENT_ENABLED ?? null,
  };
}

export function normalizeAddress(a: AddressInput): string {
  return `${a.address}, ${a.city}, ${a.state} ${a.zip}`.toLowerCase().replace(/\s+/g, " ").trim();
}

// --- Mock provider ---------------------------------------------------------
// Deterministic pseudo-random derived from the address so a given house always
// returns the same believable data.
function hash(s: string): number {
  let h = 2166136261;
  for (let i = 0; i < s.length; i++) {
    h ^= s.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return h >>> 0;
}

function mockProvider(input: AddressInput): PropertyEnrichment {
  const seed = hash(normalizeAddress(input));
  const rnd = (n: number, lo: number, hi: number) =>
    lo + (((seed >>>n) % 1000) / 1000) * (hi - lo);

  const firstNames = ["James", "Maria", "Robert", "Linda", "David", "Patricia", "John", "Jennifer"];
  const lastNames = ["Smith", "Johnson", "Garcia", "Martinez", "Davis", "Lopez", "Wilson", "Nguyen"];
  const owner = `${firstNames[seed % firstNames.length]} ${lastNames[(seed >>>3) % lastNames.length]}`;

  const avm = Math.round(rnd(2, 180_000, 650_000) / 1000) * 1000;
  const mortgage = Math.round((avm * rnd(5, 0.1, 0.75)) / 1000) * 1000;
  const incomeBands = ["$50k–75k", "$75k–100k", "$100k–150k", "$150k–200k", "$200k+"];
  const ownerOccupied = seed % 4 !== 0;

  return {
    source: "mock",
    ownerName: owner,
    ownerOccupied,
    mailingAddress: ownerOccupied
      ? `${input.address}, ${input.city}, ${input.state} ${input.zip}`
      : `${100 + (seed % 900)} Mailing Ave, ${input.city}, ${input.state} ${input.zip}`,
    yearBuilt: Math.round(rnd(7, 1955, 2018)),
    sqft: Math.round(rnd(9, 1100, 3800) / 50) * 50,
    beds: 2 + (seed % 4),
    baths: 1 + ((seed >>>2) % 3),
    lotSizeSqft: Math.round(rnd(11, 4000, 15000) / 100) * 100,
    lastSalePrice: Math.round((avm * rnd(13, 0.6, 0.95)) / 1000) * 1000,
    lastSaleDate: new Date(2010 + (seed % 14), seed % 12, 1 + (seed % 27)).toISOString().slice(0, 10),
    assessedValue: Math.round((avm * 0.85) / 1000) * 1000,
    avmValue: avm,
    avmLow: Math.round((avm * 0.93) / 1000) * 1000,
    avmHigh: Math.round((avm * 1.07) / 1000) * 1000,
    estimatedEquity: Math.max(0, avm - mortgage),
    mortgageBalanceEst: mortgage,
    estimatedIncomeBand: incomeBands[seed % incomeBands.length],
    phones: [
      { number: `(${200 + (seed % 700)}) 555-${String(1000 + (seed % 9000)).slice(0, 4)}`, type: "mobile", dnc: seed % 5 === 0 },
      { number: `(${200 + ((seed >>>4) % 700)}) 555-${String(1000 + ((seed >>>4) % 9000)).slice(0, 4)}`, type: "landline", dnc: false },
    ],
    emails: [`${owner.toLowerCase().replace(/[^a-z]/g, ".")}@example.com`],
    raw: { mock: true, seed },
  };
}

// --- ATTOM provider --------------------------------------------------------
// Real-time per-address lookup. Implemented and ready; only used when
// PROPERTY_DATA_PROVIDER=attom and ATTOM_API_KEY is set. Untested against live
// data — verify the field mapping once a key is available.
async function attomProvider(input: AddressInput): Promise<PropertyEnrichment> {
  const key = process.env.ATTOM_API_KEY!;
  const base = "https://api.gateway.attomdata.com/propertyapi/v1.0.0";
  const address1 = encodeURIComponent(input.address);
  const address2 = encodeURIComponent(`${input.city}, ${input.state} ${input.zip}`);
  const url = `${base}/property/expandedprofile?address1=${address1}&address2=${address2}`;

  const res = await fetch(url, { headers: { apikey: key, accept: "application/json" } });
  if (!res.ok) throw new Error(`ATTOM request failed (HTTP ${res.status})`);
  const data = await res.json();
  const p = data?.property?.[0];
  if (!p) throw new Error("ATTOM returned no property match for this address");

  const num = (v: unknown): number | null => {
    const n = typeof v === "string" ? Number(v) : (v as number);
    return Number.isFinite(n) ? n : null;
  };
  const avm = num(p.avm?.amount?.value);
  const marketValue = num(p.assessment?.market?.mktttlvalue);
  const assessedValue = num(p.assessment?.assessed?.assdttlvalue);
  const mortgage = num(p.assessment?.mortgage?.lender?.amount) ?? num(p.assessment?.mortgage?.amount);
  // Value to display: AVM if the account has it, else market then assessed.
  const value = avm ?? marketValue ?? assessedValue;

  // ATTOM key casing varies by endpoint/account; check common variants.
  const owner = p.owner ?? p.assessment?.owner ?? {};
  const o1 = owner.owner1 ?? {};
  const joinedName = [o1.firstNameAndMi ?? o1.firstname ?? o1.firstName, o1.lastName ?? o1.lastname]
    .filter(Boolean)
    .join(" ");
  const ownerName = o1.fullName ?? o1.fullname ?? (joinedName || null);
  const absentee = p.summary?.absenteeInd ?? p.summary?.absenteeind;

  return {
    source: "attom",
    ownerName,
    ownerOccupied: absentee ? /owner occupied/i.test(String(absentee)) : null,
    mailingAddress: owner.mailingAddressOneLine ?? owner.mailingaddressoneline ?? null,
    yearBuilt:
      num(p.summary?.yearbuilt) ?? num(p.summary?.yearBuilt) ?? num(p.vintage?.yearbuilt) ?? num(p.building?.summary?.yearbuilt),
    sqft:
      num(p.building?.size?.livingsize) ??
      num(p.building?.size?.universalsize) ??
      num(p.building?.size?.bldgsize) ??
      num(p.building?.size?.grosssize),
    beds: num(p.building?.rooms?.beds),
    baths: num(p.building?.rooms?.bathstotal) ?? num(p.building?.rooms?.bathsTotal) ?? num(p.building?.rooms?.bathsfull),
    lotSizeSqft: num(p.lot?.lotsize2) ?? num(p.lot?.lotSize2),
    lastSalePrice:
      num(p.sale?.amount?.saleamt) ?? num(p.sale?.saleamt) ?? num(p.sale?.saleAmountData?.saleamt),
    lastSaleDate:
      p.sale?.salesearchdate ?? p.sale?.saleTransDate ?? p.sale?.amount?.salerecdate ?? null,
    assessedValue,
    avmValue: value,
    avmLow: num(p.avm?.amount?.low),
    avmHigh: num(p.avm?.amount?.high),
    estimatedEquity: value != null && mortgage != null ? Math.max(0, value - mortgage) : null,
    mortgageBalanceEst: mortgage,
    // ATTOM expandedprofile does not include skip-trace contact or income;
    // those arrive in Phase 2 via the skip-trace provider (e.g. BatchData).
    estimatedIncomeBand: null,
    phones: [],
    emails: [],
    raw: p,
  };
}

// --- BatchData provider ----------------------------------------------------
// BatchData (BatchLeads' API) returns property + skip-traced contacts (phones
// with DNC flags, emails) and demographics in one place — the full customer
// picture. Implemented from BatchData's documented Property Skip Trace API;
// verify the exact field mapping against a real response (Settings →
// Integrations shows the raw payload). Auth = Bearer token.
async function batchDataProvider(input: AddressInput): Promise<PropertyEnrichment> {
  const key = process.env.BATCHDATA_API_KEY!;
  const base = process.env.BATCHDATA_BASE_URL || "https://api.batchdata.com/api/v1";
  const url = `${base}/property/skip-trace`;

  const res = await fetch(url, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${key}`,
      "Content-Type": "application/json",
      accept: "application/json",
    },
    body: JSON.stringify({
      requests: [
        {
          propertyAddress: {
            street: input.address,
            city: input.city,
            state: input.state,
            zip: input.zip,
          },
        },
      ],
    }),
  });
  if (!res.ok) throw new Error(`BatchData request failed (HTTP ${res.status})`);
  const data = await res.json();

  // Response shape (defensive): results.persons[0] with name / phoneNumbers /
  // emails, plus an attached property object.
  const results = data?.results ?? data?.data ?? data;
  const person =
    results?.persons?.[0] ?? results?.person ?? results?.[0]?.persons?.[0] ?? null;
  const prop =
    results?.property ?? person?.property ?? results?.properties?.[0] ?? results?.[0]?.property ?? {};

  const num = (v: unknown): number | null => {
    const n = typeof v === "string" ? Number(String(v).replace(/[^0-9.-]/g, "")) : (v as number);
    return Number.isFinite(n) ? n : null;
  };

  const first = person?.name?.first ?? person?.firstName ?? "";
  const last = person?.name?.last ?? person?.lastName ?? "";
  const ownerName = person?.name?.full ?? (`${first} ${last}`.trim() || null);

  const phones: PropertyPhone[] = (person?.phoneNumbers ?? person?.phones ?? [])
    .map((p: Record<string, unknown>) => ({
      number: String(p.number ?? p.phone ?? ""),
      type: (p.type as string) ?? undefined,
      dnc: Boolean(p.dnc ?? p.doNotCall),
    }))
    .filter((p: PropertyPhone) => p.number);
  const emails: string[] = (person?.emails ?? [])
    .map((e: unknown) => (typeof e === "string" ? e : (e as { email?: string }).email))
    .filter(Boolean) as string[];

  const value =
    num(prop?.valuation?.estimatedValue) ??
    num(prop?.estimatedValue) ??
    num(prop?.avm?.value) ??
    num(prop?.assessment?.marketValue);
  const mortgage = num(prop?.openLoans?.[0]?.amount) ?? num(prop?.mortgageBalance);

  return {
    source: "batchdata",
    ownerName,
    ownerOccupied:
      prop?.owner?.ownerOccupied ?? prop?.ownerOccupied ?? (prop?.absenteeOwner === false ? true : null),
    mailingAddress: prop?.owner?.mailingAddress?.oneLine ?? prop?.mailingAddress ?? null,
    yearBuilt: num(prop?.building?.yearBuilt) ?? num(prop?.yearBuilt),
    sqft: num(prop?.building?.livingArea) ?? num(prop?.squareFeet) ?? num(prop?.building?.totalBuildingAreaSquareFeet),
    beds: num(prop?.building?.bedroomCount) ?? num(prop?.bedrooms),
    baths: num(prop?.building?.bathroomCount) ?? num(prop?.bathrooms),
    lotSizeSqft: num(prop?.lot?.lotSizeSquareFeet) ?? num(prop?.lotSquareFeet),
    lastSalePrice: num(prop?.sale?.lastSale?.price) ?? num(prop?.lastSalePrice),
    lastSaleDate: prop?.sale?.lastSale?.date ?? prop?.lastSaleDate ?? null,
    assessedValue: num(prop?.assessment?.assessedValue),
    avmValue: value,
    avmLow: num(prop?.valuation?.estimatedValueLow),
    avmHigh: num(prop?.valuation?.estimatedValueHigh),
    estimatedEquity:
      num(prop?.valuation?.equityCurrentEstimatedBalance) ??
      (value != null && mortgage != null ? Math.max(0, value - mortgage) : null),
    mortgageBalanceEst: mortgage,
    estimatedIncomeBand: person?.demographics?.incomeRange ?? person?.income ?? null,
    phones,
    emails,
    raw: data,
  };
}

async function fetchFromProvider(input: AddressInput): Promise<PropertyEnrichment> {
  switch (activeProvider()) {
    case "batchdata":
      return batchDataProvider(input);
    case "attom":
      return attomProvider(input);
    default:
      return mockProvider(input);
  }
}

// --- Orchestration ---------------------------------------------------------

function toRecordData(e: PropertyEnrichment) {
  return {
    source: e.source,
    ownerName: e.ownerName ?? null,
    ownerOccupied: e.ownerOccupied ?? null,
    mailingAddress: e.mailingAddress ?? null,
    yearBuilt: e.yearBuilt ?? null,
    sqft: e.sqft ?? null,
    beds: e.beds ?? null,
    baths: e.baths ?? null,
    lotSizeSqft: e.lotSizeSqft ?? null,
    lastSalePrice: e.lastSalePrice ?? null,
    lastSaleDate: e.lastSaleDate ? new Date(e.lastSaleDate) : null,
    assessedValue: e.assessedValue ?? null,
    avmValue: e.avmValue ?? null,
    avmLow: e.avmLow ?? null,
    avmHigh: e.avmHigh ?? null,
    estimatedEquity: e.estimatedEquity ?? null,
    mortgageBalanceEst: e.mortgageBalanceEst ?? null,
    estimatedIncomeBand: e.estimatedIncomeBand ?? null,
    phones: (e.phones ?? []) as unknown as Prisma.InputJsonValue,
    emails: (e.emails ?? []) as unknown as Prisma.InputJsonValue,
    raw: (e.raw ?? {}) as unknown as Prisma.InputJsonValue,
    fetchedAt: new Date(),
  };
}

// Enriches a lead with property data. Reuses a fresh cached PropertyRecord for
// the same address when available; otherwise calls the active provider and
// caches the result. Auto-fills empty owner/phone/email on the lead. Returns
// the PropertyRecord, or throws on hard failure.
export async function enrichLead(leadId: string, actor?: string, opts?: { force?: boolean }) {
  const lead = await prisma.lead.findUnique({ where: { id: leadId } });
  if (!lead) throw new Error("Lead not found");

  const normalized = normalizeAddress(lead);
  const cutoff = new Date(Date.now() - CACHE_TTL_DAYS * 86_400_000);

  let record = await prisma.propertyRecord.findUnique({ where: { normalizedAddress: normalized } });
  // Reuse the cache only if it's recent AND produced by the *current* provider —
  // otherwise a stale record from a previous provider (e.g. ATTOM) would keep
  // being served after switching to BatchData. `force` (Refresh) always re-fetches.
  const fresh = !opts?.force && record != null && record.fetchedAt >= cutoff && record.source === activeProvider();

  if (!fresh) {
    const enrichment = await fetchFromProvider(lead);
    const data = toRecordData(enrichment);
    record = await prisma.propertyRecord.upsert({
      where: { normalizedAddress: normalized },
      create: { normalizedAddress: normalized, ...data },
      update: data,
    });
  }

  // Link the record to the lead and auto-fill any blank contact fields.
  const phones = (record!.phones as unknown as PropertyPhone[]) ?? [];
  const emails = (record!.emails as unknown as string[]) ?? [];
  await prisma.lead.update({
    where: { id: leadId },
    data: {
      propertyRecordId: record!.id,
      enrichedAt: new Date(),
      ownerName: lead.ownerName || record!.ownerName || undefined,
      phone: lead.phone || phones[0]?.number || undefined,
      email: lead.email || emails[0] || undefined,
    },
  });

  await logActivity(
    leadId,
    "property_enriched",
    `Property data pulled (${record!.source}${fresh ? ", cached" : ""})`,
    actor,
  );

  return record!;
}

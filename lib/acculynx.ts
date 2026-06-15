// AccuLynx CRM service layer.
// ALL calls are server-side only — the API key is never exposed to the client.
// API docs index: https://apidocs.acculynx.com/llms.txt

const BASE_URL = process.env.ACCULYNX_BASE_URL || "https://api.acculynx.com/api/v2";

// ---------- Types ----------

export interface LeadPayload {
  name: string;
  address: string;
  city: string;
  state: string;
  zip: string;
  phone?: string | null;
  email?: string | null;
  notes?: string | null;
  // Canvassing lead id, stored on the AccuLynx contact for traceability.
  leadId?: string | null;
  // Assigned rep, used to set the AccuLynx sales owner. acculynxId is used
  // directly if known; otherwise repEmail is matched against AccuLynx users.
  repAcculynxId?: string | null;
  repEmail?: string | null;
  // Configured AccuLynx lead source id; falls back to auto-resolve when absent.
  leadSourceId?: string | null;
}

export interface LeadSource {
  id: string;
  name: string;
  isDefault?: boolean;
}

export interface AccuLynxJob {
  id: string;
  jobNumber?: string;
  customerName?: string;
  milestone?: string;
  source?: string;
  [key: string]: unknown;
}

export interface Financials {
  approvedJobValue?: number;
  [key: string]: unknown;
}

export interface AccuLynxUser {
  id: string;
  firstName?: string;
  lastName?: string;
  fullName?: string;
  email?: string;
  [key: string]: unknown;
}

export interface Milestone {
  milestone: string;
  date: string;
  [key: string]: unknown;
}

export interface ContactType {
  id: string;
  name: string;
  isDefault: boolean;
}

export interface JobFilterParams {
  dateFrom?: string;
  dateTo?: string;
  milestone?: string;
  assignedRep?: string;
}

export type MilestoneName =
  | "Lead"
  | "Prospect"
  | "Approved"
  | "Completed"
  | "Invoiced"
  | "Closed"
  | "Cancelled"
  | "Dead";

export class AccuLynxError extends Error {
  constructor(public status: number, message: string, public body?: unknown) {
    super(message);
    this.name = "AccuLynxError";
  }
}

// AccuLynx requires exactly 10 digits. Strip formatting and a leading US "1".
function normalizePhone(raw?: string | null): string | null {
  if (!raw) return null;
  let digits = raw.replace(/\D/g, "");
  if (digits.length === 11 && digits.startsWith("1")) digits = digits.slice(1);
  return digits.length === 10 ? digits : null;
}

export class AccuLynxService {
  private apiKey: string;
  private baseUrl: string;
  // Cached resolved contact type id (per account; stable for the process).
  private contactTypeId?: string;
  // Cached resolved lead source id.
  private leadSourceId?: string;
  // Cached AccuLynx users keyed by lowercased email, for rep auto-linking.
  private usersByEmail?: Map<string, string>;

  constructor(apiKey = process.env.ACCULYNX_API_KEY, baseUrl = BASE_URL) {
    if (!apiKey) {
      // Surface a clear error rather than failing deep inside a fetch.
      throw new AccuLynxError(500, "ACCULYNX_API_KEY is not configured");
    }
    this.apiKey = apiKey;
    this.baseUrl = baseUrl;
  }

  private async request<T>(
    path: string,
    init: RequestInit = {},
  ): Promise<T> {
    const res = await fetch(`${this.baseUrl}${path}`, {
      ...init,
      headers: {
        Authorization: `Bearer ${this.apiKey}`,
        "Content-Type": "application/json",
        Accept: "application/json",
        ...(init.headers || {}),
      },
      // Never cache CRM data.
      cache: "no-store",
    });

    if (!res.ok) {
      let body: unknown;
      try {
        body = await res.json();
      } catch {
        body = await res.text().catch(() => undefined);
      }
      throw new AccuLynxError(res.status, `AccuLynx ${init.method || "GET"} ${path} failed`, body);
    }

    // Some endpoints (notes, status updates) return no body.
    if (res.status === 204) return undefined as T;
    const text = await res.text();
    return (text ? JSON.parse(text) : undefined) as T;
  }

  /**
   * Create a canvassing lead in AccuLynx. AccuLynx V2 requires a two-step flow:
   * 1) POST /contacts to create the homeowner contact, 2) POST /jobs with that
   * contact's id.
   */
  async createLead(data: LeadPayload): Promise<AccuLynxJob> {
    const contact = await this.createContact(data);
    const leadSourceId = data.leadSourceId || (await this.resolveLeadSourceId());

    // AccuLynx /jobs expects a nested contact reference, a job-site
    // locationAddress (state as a 2-letter abbreviation), and a priority.
    const jobBody: Record<string, unknown> = {
      contact: { id: contact.id },
      locationAddress: {
        street1: data.address,
        city: data.city,
        state: data.state,
        country: "US",
        zipCode: data.zip,
      },
      priority: "Normal",
    };
    if (leadSourceId) jobBody.leadSource = { id: leadSourceId };
    if (data.notes) jobBody.notes = data.notes;

    const job = await this.request<AccuLynxJob>("/jobs", {
      method: "POST",
      body: JSON.stringify(jobBody),
    });

    // Assign the canvassing rep as the AccuLynx sales owner (best effort —
    // a failure here should not undo the created job). Capture diagnostics so
    // the UI can explain why a rep was/wasn't assigned.
    let assignedAcculynxUserId: string | undefined;
    const repAssignment: {
      attempted: boolean;
      repEmail?: string;
      matched: boolean;
      assigned: boolean;
      error?: string;
    } = { attempted: false, matched: false, assigned: false };
    try {
      let repId = data.repAcculynxId || undefined;
      if (repId) {
        repAssignment.attempted = true;
        repAssignment.matched = true;
      } else if (data.repEmail) {
        repAssignment.attempted = true;
        repAssignment.repEmail = data.repEmail;
        repId = await this.resolveUserIdByEmail(data.repEmail);
        repAssignment.matched = !!repId;
      }
      if (repId && job.id) {
        await this.assignSalesRep(job.id, repId);
        assignedAcculynxUserId = repId;
        repAssignment.assigned = true;
      }
    } catch (e) {
      repAssignment.error =
        e instanceof AccuLynxError
          ? `${e.message} (HTTP ${e.status}) ${JSON.stringify(e.body)}`
          : (e as Error).message;
      console.error("AccuLynx rep assignment failed:", repAssignment.error);
    }

    return { ...job, contactId: contact.id, assignedAcculynxUserId, repAssignment };
  }

  /** GET /lead-sources — list the account's active lead sources. */
  async getLeadSources(): Promise<LeadSource[]> {
    const res = await this.request<{ items?: LeadSource[] } | LeadSource[]>(
      "/lead-sources?pageSize=100",
    );
    return Array.isArray(res) ? res : res.items ?? [];
  }

  /** Resolve a lead source id, preferring "Canvassing", then the default. */
  private async resolveLeadSourceId(): Promise<string | null> {
    if (this.leadSourceId) return this.leadSourceId;
    try {
      const sources = await this.getLeadSources();
      if (sources.length === 0) return null;
      const chosen =
        sources.find((s) => /canvass/i.test(s.name)) ||
        sources.find((s) => s.isDefault) ||
        sources[0];
      this.leadSourceId = chosen.id;
      return chosen.id;
    } catch {
      // Best effort — the job can still be created without a lead source.
      return null;
    }
  }

  /** GET /contacts/contact-types — list the account's contact types. */
  async getContactTypes(): Promise<ContactType[]> {
    const res = await this.request<{ items?: ContactType[] }>(
      "/contacts/contact-types?pageSize=100",
    );
    return res.items ?? [];
  }

  /** Resolve a usable contact type id, preferring "Customer", then the default. */
  private async resolveContactTypeId(): Promise<string> {
    if (this.contactTypeId) return this.contactTypeId;
    const types = await this.getContactTypes();
    if (types.length === 0) {
      throw new AccuLynxError(500, "No AccuLynx contact types are configured for this account");
    }
    const chosen =
      types.find((t) => /customer/i.test(t.name)) ||
      types.find((t) => t.isDefault) ||
      types[0];
    this.contactTypeId = chosen.id;
    return chosen.id;
  }

  /** POST /contacts — create the homeowner contact. Returns the new contact id. */
  async createContact(data: LeadPayload): Promise<{ id: string }> {
    const name = (data.name || "").trim();
    const parts = name.split(/\s+/).filter(Boolean);
    const firstName = parts[0] || "Homeowner";
    const lastName = parts.slice(1).join(" ") || undefined;
    const contactTypeId = await this.resolveContactTypeId();

    const body: Record<string, unknown> = {
      contactTypeIds: [contactTypeId],
      firstName,
      ...(lastName ? { lastName } : {}),
      mailingAddress: {
        street1: data.address,
        city: data.city,
        zipCode: data.zip,
      },
    };

    // Phone must be exactly 10 digits per the AccuLynx schema.
    const phone = normalizePhone(data.phone);
    if (phone) body.phoneNumbers = [{ number: phone, type: "Mobile", primary: true }];

    if (data.email) {
      body.emailAddresses = [{ address: data.email, type: "Personal", primary: true }];
    }
    if (data.notes) body.note = data.notes;
    // Store the canvassing lead id on the AccuLynx contact for traceability.
    if (data.leadId) body.crossReference = data.leadId;

    return this.request<{ id: string }>("/contacts", {
      method: "POST",
      body: JSON.stringify(body),
    });
  }

  /** GET /jobs/{id} */
  getJob(jobId: string): Promise<AccuLynxJob> {
    return this.request<AccuLynxJob>(`/jobs/${encodeURIComponent(jobId)}`);
  }

  /** GET /jobs/{id}/financials — key field: approvedJobValue */
  getJobFinancials(jobId: string): Promise<Financials> {
    return this.request<Financials>(`/jobs/${encodeURIComponent(jobId)}/financials`);
  }

  /** GET /jobs/{id}/representatives/sales-owner — returns a user; resolve via getUsers(). */
  async getSalesOwner(jobId: string): Promise<AccuLynxUser> {
    const owner = await this.request<{ userId?: string; id?: string } & AccuLynxUser>(
      `/jobs/${encodeURIComponent(jobId)}/representatives/sales-owner`,
    );
    const userId = owner.userId || owner.id;
    if (userId && !owner.fullName) {
      const users = await this.getUsers();
      const match = users.find((u) => u.id === userId);
      if (match) return match;
    }
    return owner;
  }

  /** GET /jobs/{id}/milestone-history */
  getMilestoneHistory(jobId: string): Promise<Milestone[]> {
    return this.request<Milestone[]>(`/jobs/${encodeURIComponent(jobId)}/milestone-history`);
  }

  /** Update a job's milestone. */
  updateJobStatus(jobId: string, milestone: MilestoneName): Promise<void> {
    return this.request<void>(`/jobs/${encodeURIComponent(jobId)}/milestone`, {
      method: "PUT",
      body: JSON.stringify({ milestone }),
    });
  }

  /** GET /users — all AccuLynx users (paginated; AccuLynx uses pageStartIndex). */
  async getUsers(): Promise<AccuLynxUser[]> {
    const all: AccuLynxUser[] = [];
    // AccuLynx caps the users page size at 50.
    const pageSize = 50;
    let pageStartIndex = 0;
    // Safety cap to avoid runaway loops.
    for (let i = 0; i < 25; i++) {
      const res = await this.request<{ items?: AccuLynxUser[] } | AccuLynxUser[]>(
        `/users?pageSize=${pageSize}&pageStartIndex=${pageStartIndex}`,
      );
      const items = Array.isArray(res) ? res : res.items ?? [];
      all.push(...items);
      if (items.length < pageSize) break;
      pageStartIndex += pageSize;
    }
    return all;
  }

  /** Resolve an AccuLynx user id by email (cached). Returns undefined if no match. */
  async resolveUserIdByEmail(email: string): Promise<string | undefined> {
    if (!this.usersByEmail) {
      const users = await this.getUsers();
      this.usersByEmail = new Map();
      for (const u of users) {
        // Prefer active users; skip explicitly inactive ones.
        const status = (u as { status?: string }).status;
        if (status && status.toLowerCase() !== "active") continue;
        if (u.email) this.usersByEmail.set(u.email.toLowerCase(), u.id);
      }
    }
    return this.usersByEmail.get(email.toLowerCase());
  }

  /** POST /jobs/{id}/representatives/company — set the job's sales owner. */
  assignSalesRep(jobId: string, acculynxUserId: string): Promise<void> {
    return this.request<void>(
      `/jobs/${encodeURIComponent(jobId)}/representatives/company`,
      { method: "POST", body: JSON.stringify({ id: acculynxUserId }) },
    );
  }

  /** GET /jobs with optional filters. */
  listJobs(params: JobFilterParams = {}): Promise<AccuLynxJob[]> {
    const qs = new URLSearchParams();
    if (params.dateFrom) qs.set("dateFrom", params.dateFrom);
    if (params.dateTo) qs.set("dateTo", params.dateTo);
    if (params.milestone) qs.set("milestone", params.milestone);
    if (params.assignedRep) qs.set("assignedRep", params.assignedRep);
    const suffix = qs.toString() ? `?${qs.toString()}` : "";
    return this.request<AccuLynxJob[]>(`/jobs${suffix}`);
  }

  /** GET /ping — health check. Returns true on 200. */
  async ping(): Promise<boolean> {
    try {
      await this.request<unknown>("/ping");
      return true;
    } catch {
      return false;
    }
  }

  /** GET /milestones — list the account's job milestones. */
  async getMilestones(): Promise<{ id: string; name: string }[]> {
    const res = await this.request<{ items?: { id: string; name: string }[] } | { id: string; name: string }[]>(
      "/milestones?pageSize=50",
    );
    return Array.isArray(res) ? res : res.items ?? [];
  }

  /** POST /jobs/{id}/notes */
  addNote(jobId: string, note: string): Promise<void> {
    return this.request<void>(`/jobs/${encodeURIComponent(jobId)}/notes`, {
      method: "POST",
      body: JSON.stringify({ note }),
    });
  }
}

// Lazily-constructed shared instance for server routes.
let _service: AccuLynxService | null = null;
export function acculynx(): AccuLynxService {
  if (!_service) _service = new AccuLynxService();
  return _service;
}

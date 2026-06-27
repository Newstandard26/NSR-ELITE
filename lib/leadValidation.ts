// Customer-info gate: a lead may not be pushed to AccuLynx until it has a first
// name, last name, address, and phone. Email is optional. Shared by the server
// (the authoritative gate in pushLeadToAccuLynx) and the lead card UI.

export interface CustomerInfo {
  firstName?: string | null;
  lastName?: string | null;
  ownerName?: string | null;
  address?: string | null;
  phone?: string | null;
}

// Splits a legacy single "owner name" into first / rest, so existing leads with
// only ownerName still satisfy the gate (and pre-fill the form).
export function splitOwnerName(ownerName?: string | null): { first: string; last: string } {
  const parts = (ownerName || "").trim().split(/\s+/).filter(Boolean);
  return { first: parts[0] || "", last: parts.slice(1).join(" ") || "" };
}

// Returns the human-readable labels of any required customer fields that are
// missing. Empty array = ready to push.
export function missingCustomerFields(lead: CustomerInfo): string[] {
  const fromOwner = splitOwnerName(lead.ownerName);
  const first = (lead.firstName || "").trim() || fromOwner.first;
  const last = (lead.lastName || "").trim() || fromOwner.last;

  const missing: string[] = [];
  if (!first) missing.push("First name");
  if (!last) missing.push("Last name");
  if (!(lead.address || "").trim()) missing.push("Address");
  if (!(lead.phone || "").trim()) missing.push("Phone number");
  return missing;
}

// The full customer name to send to AccuLynx (structured names preferred).
export function customerFullName(lead: CustomerInfo): string {
  const fromOwner = splitOwnerName(lead.ownerName);
  const first = (lead.firstName || "").trim() || fromOwner.first;
  const last = (lead.lastName || "").trim() || fromOwner.last;
  return `${first} ${last}`.trim() || (lead.ownerName || "").trim();
}

// Shared client/server view types.

export interface DispositionStatusDTO {
  id: string;
  label: string;
  abbreviation: string | null;
  color: string;
  icon: string;
  pipelineStage: string | null;
  isDefault: boolean;
  isActive: boolean;
  sortOrder: number;
  _count?: { leads: number };
}

// SalesRabbit-style pipeline stages a disposition can map to.
export const PIPELINE_STAGES = [
  "Attempting Contact",
  "Customer",
  "Negotiating",
  "Lost – No Interest",
  "Lost – No Sale",
  "Lost – Canceled",
  "Lost – Disqualified",
  "Lost – Unfulfilled",
] as const;

export interface LeadDTO {
  id: string;
  address: string;
  city: string;
  state: string;
  zip: string;
  lat: number;
  lng: number;
  ownerName: string | null;
  phone: string | null;
  email: string | null;
  roofAge: number | null;
  insuranceCompany: string | null;
  dispositionStatusId: string | null;
  dispositionStatus: DispositionStatusDTO | null;
  repId: string | null;
  rep: { id: string; name: string } | null;
  territoryId: string | null;
  territory: { id: string; name: string } | null;
  acculynxJobId: string | null;
  acculynxStatus: string | null;
  createdAt?: string;
  updatedAt?: string;
  _count?: { notes: number; photos: number };
}

export interface NoteDTO {
  id: string;
  content: string;
  author: string;
  createdAt: string;
}

export interface RepStatsDTO {
  repId: string;
  name: string;
  knockedToday: number;
  knockedWeek: number;
  knockedMonth: number;
  appointmentsSet: number;
  acculynxLeads: number;
  conversionRate: number;
  rank?: number;
  isTopPerformer?: boolean;
}

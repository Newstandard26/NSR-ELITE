// Shared client/server view types.

export interface DispositionStatusDTO {
  id: string;
  label: string;
  color: string;
  icon: string;
  isDefault: boolean;
  isActive: boolean;
  sortOrder: number;
  _count?: { leads: number };
}

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

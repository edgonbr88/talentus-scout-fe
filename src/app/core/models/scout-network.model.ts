export type ScoutContactChannel = 'WHATSAPP' | 'EMAIL';

export interface ScoutNetworkItem {
  scoutProfileId: string;
  userId: string;
  fullName: string;
  profilePhotoUrl?: string | null;
  organizationName: string;
  clubId?: string | null;
  clubLogoUrl?: string | null;
  clubVerifiedOfficial: boolean;
  scoutRole: string;
  country?: string | null;
  state?: string | null;
  linkedinUrl?: string | null;
  sameClubAsViewer: boolean;
  whatsappAvailable: boolean;
  emailAvailable: boolean;
  createdAt: string;
}

export interface ScoutNetworkOrganizationOption {
  name: string;
  clubId?: string | null;
  logoUrl?: string | null;
  verifiedOfficial: boolean;
}

export interface ScoutNetworkFiltersResponse {
  organizations: ScoutNetworkOrganizationOption[];
  countries: string[];
  viewerOrganizationName?: string | null;
  canFilterSameClub: boolean;
}

export interface ScoutNetworkQueryParams {
  query?: string | null;
  clubId?: string | null;
  organizationName?: string | null;
  country?: string | null;
  sameClubOnly?: boolean;
  includeSelf?: boolean;
  page: number;
  size: number;
}

export interface ScoutNetworkContactResponse {
  channel: ScoutContactChannel;
  contactUrl: string;
  targetName: string;
  organizationName: string;
}

export interface ScoutNetworkSettings {
  profilePhotoUrl?: string | null;
  organizationName: string;
  scoutRole: string;
  country?: string | null;
  state?: string | null;
  linkedinUrl?: string | null;
  showInNetwork: boolean;
  showWhatsappInNetwork: boolean;
  showEmailInNetwork: boolean;
}

export interface UpdateScoutNetworkSettingsRequest {
  showInNetwork: boolean;
  showWhatsappInNetwork: boolean;
  showEmailInNetwork: boolean;
  linkedinUrl?: string | null;
  country?: string | null;
  state?: string | null;
}

export interface ScoutPhotoResponse {
  profilePhotoUrl: string;
}

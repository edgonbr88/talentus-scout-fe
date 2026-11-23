export interface ScoutDirectoryAthleteItem {
  id: string;
  firstName: string;
  lastName: string;
  birthDate: string;
  birthYear: number;
  category: string;
  primaryPosition: string;
  secondaryPosition?: string;
  preferredFoot: string;
  heightCm?: number | null;
  weightKg?: number | null;
  nationality: string;
  secondaryPassports?: string;
  hasEuropeanPassport: boolean;
  clubId?: string;
  clubName?: string;
  clubLogoUrl?: string;
  profilePhotoUrl?: string;
  slug: string;
  verifiedBadgesCount: number;
  hasVideo: boolean;
  featuredVideoPlaybackUrl?: string;
  featuredVideoThumbnailUrl?: string;
  featuredVideoTitle?: string;
  medicalCertifiedMetrics?: boolean;
  residenceCountry?: string;
  updatedAt: string;
}

export interface ScoutDirectoryFilters {
  query?: string | null;
  birthYear?: number | null;
  birthYearFrom?: number | null;
  birthYearTo?: number | null;
  primaryPosition?: string | null;
  preferredFoot?: string | null;
  clubId?: string | null;
  hasEuropeanPassport?: boolean | null;
  hasVideo?: boolean | null;
  residenceCountry?: string | null;
  minHeightCm?: number | null;
  maxHeightCm?: number | null;
  minWeightKg?: number | null;
  maxWeightKg?: number | null;
  page: number;
  size: number;
}

export interface PageResponse<T> {
  content: T[];
  totalElements: number;
  totalPages: number;
  size: number;
  number: number;
  first: boolean;
  last: boolean;
  empty: boolean;
}

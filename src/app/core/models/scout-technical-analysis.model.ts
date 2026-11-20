export interface TechnicalAnalysisItem {
  title: string;
  description: string;
}

export interface ScoutTechnicalAnalysis {
  id: string;
  athleteId: string;
  scoutUserId: string;
  scoutFullName: string;
  scoutRole: string;
  organizationName: string;
  strengths: TechnicalAnalysisItem[];
  improvementAreas: TechnicalAnalysisItem[];
  scoutingVerdict: string;
  editableByCurrentUser: boolean;
  deletableByCurrentUser: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface UpsertScoutTechnicalAnalysisRequest {
  strengths: TechnicalAnalysisItem[];
  improvementAreas: TechnicalAnalysisItem[];
  scoutingVerdict: string;
}

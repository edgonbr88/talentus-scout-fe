export type BulkImportSourceType = 'FILE_EXCEL' | 'FILE_CSV' | 'GOOGLE_SHEET';
export type BulkImportStatus = 'PENDING' | 'PROCESSING' | 'COMPLETED' | 'FAILED';

export interface BulkImportRowError {
  rowNumber: number;
  athleteName: string;
  reason: string;
  actionTaken: string;
}

export interface BulkImportJobResponse {
  id: string;
  organizationName: string;
  sourceType: BulkImportSourceType;
  fileName?: string;
  sheetId?: string;
  status: BulkImportStatus;
  totalRows: number;
  processedRows: number;
  successfulRows: number;
  failedRows: number;
  errorSummary?: string;
  warnings?: BulkImportRowError[];
  createdAt: string;
  updatedAt: string;
}

export interface GoogleSheetImportRequest {
  sheetUrlOrId: string;
}

export interface TutorActivationRequest {
  token: string;
  password: string;
}

export interface TutorRejectionRequest {
  token: string;
  reason?: string;
}

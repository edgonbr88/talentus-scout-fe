import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../../environments/environment';
import {
  BulkImportJobResponse,
  GoogleSheetImportRequest,
  TutorActivationRequest,
  TutorRejectionRequest
} from '../models/bulk-import.model';

@Injectable({
  providedIn: 'root'
})
export class BulkImportService {
  private readonly apiUrl = `${environment.apiBaseUrl}/api/v1/scout/bulk-import`;
  private readonly authUrl = `${environment.apiBaseUrl}/api/v1/auth/tutor`;

  constructor(private http: HttpClient) {}

  uploadFile(file: File): Observable<BulkImportJobResponse> {
    const formData = new FormData();
    formData.append('file', file);
    return this.http.post<BulkImportJobResponse>(`${this.apiUrl}/upload`, formData);
  }

  importGoogleSheet(sheetUrlOrId: string): Observable<BulkImportJobResponse> {
    const payload: GoogleSheetImportRequest = { sheetUrlOrId };
    return this.http.post<BulkImportJobResponse>(`${this.apiUrl}/google-sheet`, payload);
  }

  getJobStatus(jobId: string): Observable<BulkImportJobResponse> {
    return this.http.get<BulkImportJobResponse>(`${this.apiUrl}/jobs/${jobId}`);
  }

  getScoutJobs(): Observable<BulkImportJobResponse[]> {
    return this.http.get<BulkImportJobResponse[]>(`${this.apiUrl}/jobs`);
  }

  downloadTemplate(format: 'xlsx' | 'csv' = 'xlsx'): Observable<Blob> {
    return this.http.get(`${this.apiUrl}/template?format=${format}`, {
      responseType: 'blob'
    });
  }

  downloadErrorReport(jobId: string): Observable<Blob> {
    return this.http.get(`${this.apiUrl}/jobs/${jobId}/report`, {
      responseType: 'blob'
    });
  }

  activateTutor(payload: TutorActivationRequest): Observable<{ message: string }> {
    return this.http.post<{ message: string }>(`${this.authUrl}/activate`, payload);
  }

  rejectTutor(payload: TutorRejectionRequest): Observable<{ message: string }> {
    return this.http.post<{ message: string }>(`${this.authUrl}/reject`, payload);
  }
}

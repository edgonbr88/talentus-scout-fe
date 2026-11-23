import { Injectable, inject } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable } from 'rxjs';
import { PageResponse, ScoutDirectoryAthleteItem, ScoutDirectoryFilters } from '../models/scout-directory.model';
import { ContactClickResponse } from '../models/scout-contact.model';
import { CreateAthleteAchievementRequest, PublicBadgeDto } from '../models/athlete.model';
import {
  ScoutTechnicalAnalysis,
  UpsertScoutTechnicalAnalysisRequest
} from '../models/scout-technical-analysis.model';

@Injectable({
  providedIn: 'root'
})
export class ScoutDirectoryService {
  private http = inject(HttpClient);

  getDirectory(filters: ScoutDirectoryFilters): Observable<PageResponse<ScoutDirectoryAthleteItem>> {
    let params = new HttpParams()
      .set('page', filters.page.toString())
      .set('size', filters.size.toString());

    const trimmedQuery = filters.query?.trim();
    if (trimmedQuery) {
      params = params.set('query', trimmedQuery);
    }
    if (filters.birthYear !== undefined && filters.birthYear !== null) {
      params = params.set('birthYear', filters.birthYear.toString());
    }
    if (filters.birthYearFrom !== undefined && filters.birthYearFrom !== null) {
      params = params.set('birthYearFrom', filters.birthYearFrom.toString());
    }
    if (filters.birthYearTo !== undefined && filters.birthYearTo !== null) {
      params = params.set('birthYearTo', filters.birthYearTo.toString());
    }
    if (filters.primaryPosition) {
      params = params.set('primaryPosition', filters.primaryPosition);
    }
    if (filters.preferredFoot) {
      params = params.set('preferredFoot', filters.preferredFoot);
    }
    if (filters.clubId) {
      params = params.set('clubId', filters.clubId);
    }
    if (filters.hasEuropeanPassport !== undefined && filters.hasEuropeanPassport !== null) {
      params = params.set('hasEuropeanPassport', filters.hasEuropeanPassport.toString());
    }
    if (filters.hasVideo !== undefined && filters.hasVideo !== null) {
      params = params.set('hasVideo', filters.hasVideo.toString());
    }
    if (filters.residenceCountry) {
      params = params.set('residenceCountry', filters.residenceCountry);
    }
    if (filters.minHeightCm !== undefined && filters.minHeightCm !== null) {
      params = params.set('minHeightCm', filters.minHeightCm.toString());
    }
    if (filters.maxHeightCm !== undefined && filters.maxHeightCm !== null) {
      params = params.set('maxHeightCm', filters.maxHeightCm.toString());
    }
    if (filters.minWeightKg !== undefined && filters.minWeightKg !== null) {
      params = params.set('minWeightKg', filters.minWeightKg.toString());
    }
    if (filters.maxWeightKg !== undefined && filters.maxWeightKg !== null) {
      params = params.set('maxWeightKg', filters.maxWeightKg.toString());
    }

    return this.http.get<PageResponse<ScoutDirectoryAthleteItem>>('/api/v1/scouts/directory', { params });
  }

  getAvailableBirthYears(): Observable<number[]> {
    return this.http.get<number[]>('/api/v1/scouts/directory/birth-years');
  }

  contactAthleteTutor(athleteId: string): Observable<ContactClickResponse> {
    return this.http.post<ContactClickResponse>('/api/v1/scouts/contact-click', { athleteId });
  }

  logAthleteView(athleteId: string): Observable<void> {
    return this.http.post<void>(`/api/v1/scouts/log-view?athleteId=${athleteId}`, {});
  }

  createAthleteAchievement(
    athleteId: string,
    payload: CreateAthleteAchievementRequest
  ): Observable<PublicBadgeDto> {
    return this.http.post<PublicBadgeDto>(`/api/v1/scout/athletes/${athleteId}/achievements`, payload);
  }

  getTechnicalAnalyses(athleteId: string): Observable<ScoutTechnicalAnalysis[]> {
    return this.http.get<ScoutTechnicalAnalysis[]>(`/api/v1/scout/athletes/${athleteId}/technical-analyses`);
  }

  createTechnicalAnalysis(
    athleteId: string,
    payload: UpsertScoutTechnicalAnalysisRequest
  ): Observable<ScoutTechnicalAnalysis> {
    return this.http.post<ScoutTechnicalAnalysis>(`/api/v1/scout/athletes/${athleteId}/technical-analyses`, payload);
  }

  updateTechnicalAnalysis(
    athleteId: string,
    analysisId: string,
    payload: UpsertScoutTechnicalAnalysisRequest
  ): Observable<ScoutTechnicalAnalysis> {
    return this.http.put<ScoutTechnicalAnalysis>(
      `/api/v1/scout/athletes/${athleteId}/technical-analyses/${analysisId}`,
      payload
    );
  }

  deleteTechnicalAnalysis(athleteId: string, analysisId: string): Observable<void> {
    return this.http.delete<void>(`/api/v1/scout/athletes/${athleteId}/technical-analyses/${analysisId}`);
  }
}

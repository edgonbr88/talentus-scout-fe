import { Injectable, inject } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable } from 'rxjs';
import { PageResponse } from '../models/scout-directory.model';
import {
  ScoutContactChannel,
  ScoutNetworkContactResponse,
  ScoutNetworkFiltersResponse,
  ScoutNetworkItem,
  ScoutNetworkQueryParams,
  ScoutNetworkSettings,
  ScoutPhotoResponse,
  UpdateScoutNetworkSettingsRequest
} from '../models/scout-network.model';

@Injectable({
  providedIn: 'root'
})
export class ScoutNetworkService {
  private http = inject(HttpClient);
  private readonly networkUrl = '/api/v1/scouts/network';
  private readonly profileUrl = '/api/v1/scout/profile';

  getNetwork(filters: ScoutNetworkQueryParams): Observable<PageResponse<ScoutNetworkItem>> {
    let params = new HttpParams()
      .set('page', filters.page.toString())
      .set('size', filters.size.toString());

    const trimmedQuery = filters.query?.trim();
    if (trimmedQuery) {
      params = params.set('query', trimmedQuery);
    }
    if (filters.clubId) {
      params = params.set('clubId', filters.clubId);
    }
    if (filters.organizationName) {
      params = params.set('organizationName', filters.organizationName);
    }
    if (filters.country) {
      params = params.set('country', filters.country);
    }
    if (filters.sameClubOnly) {
      params = params.set('sameClubOnly', 'true');
    }
    if (filters.includeSelf) {
      params = params.set('includeSelf', 'true');
    }

    return this.http.get<PageResponse<ScoutNetworkItem>>(this.networkUrl, { params });
  }

  getFilters(): Observable<ScoutNetworkFiltersResponse> {
    return this.http.get<ScoutNetworkFiltersResponse>(`${this.networkUrl}/filters`);
  }

  contactScout(scoutProfileId: string, channel: ScoutContactChannel): Observable<ScoutNetworkContactResponse> {
    return this.http.post<ScoutNetworkContactResponse>(`${this.networkUrl}/${scoutProfileId}/contact`, { channel });
  }

  getMyNetworkSettings(): Observable<ScoutNetworkSettings> {
    return this.http.get<ScoutNetworkSettings>(`${this.profileUrl}/network-settings`);
  }

  updateMyNetworkSettings(payload: UpdateScoutNetworkSettingsRequest): Observable<ScoutNetworkSettings> {
    return this.http.put<ScoutNetworkSettings>(`${this.profileUrl}/network-settings`, payload);
  }

  uploadPublicPhoto(file: File): Observable<ScoutPhotoResponse> {
    const formData = new FormData();
    formData.append('file', file);
    return this.http.post<ScoutPhotoResponse>(`${this.profileUrl}/photo`, formData);
  }

  deletePublicPhoto(): Observable<void> {
    return this.http.delete<void>(`${this.profileUrl}/photo`);
  }
}

import { Component, DestroyRef, HostListener, OnInit, computed, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { RouterLink } from '@angular/router';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { Subject, debounceTime, merge } from 'rxjs';
import { ScoutNetworkService } from '../../core/services/scout-network.service';
import { AuthService } from '../../core/auth/auth.service';
import { MediaUrlPipe } from '../../core/pipes/media-url.pipe';
import { PageResponse } from '../../core/models/scout-directory.model';
import {
  ScoutContactChannel,
  ScoutNetworkFiltersResponse,
  ScoutNetworkItem,
  ScoutNetworkQueryParams,
  ScoutNetworkSettings
} from '../../core/models/scout-network.model';

@Component({
  selector: 'app-scout-network',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterLink, MediaUrlPipe],
  templateUrl: './scout-network.component.html',
  styleUrls: ['./scout-network.component.css']
})
export class ScoutNetworkComponent implements OnInit {
  private networkService = inject(ScoutNetworkService);
  private destroyRef = inject(DestroyRef);
  authService = inject(AuthService);

  private searchInput$ = new Subject<string>();
  private searchImmediate$ = new Subject<string>();

  // Listado y paginación
  colleagues = signal<ScoutNetworkItem[]>([]);
  totalElements = signal<number>(0);
  totalPages = signal<number>(0);
  currentPage = signal<number>(0);
  pageSize = signal<number>(12);
  isLoading = signal<boolean>(false);
  hasError = signal<boolean>(false);

  // Facetas y filtros
  facets = signal<ScoutNetworkFiltersResponse | null>(null);
  searchQuery = signal<string>('');
  selectedOrganization = signal<string>('');
  selectedCountry = signal<string>('');
  sameClubOnly = signal<boolean>(false);

  // Estado de contacto auditado por tarjeta/canal
  contactingKey = signal<string | null>(null);
  contactError = signal<string | null>(null);

  // Control de imágenes con fallo de carga
  failedPhotos = signal<Set<string>>(new Set<string>());
  failedClubLogos = signal<Set<string>>(new Set<string>());

  // Modal de Mi Perfil y Privacidad (solo SCOUT)
  showSettingsModal = signal<boolean>(false);
  isLoadingSettings = signal<boolean>(false);
  isSavingSettings = signal<boolean>(false);
  isUploadingPhoto = signal<boolean>(false);
  isDeletingPhoto = signal<boolean>(false);
  settingsError = signal<string | null>(null);
  settingsSuccess = signal<string | null>(null);

  mySettings = signal<ScoutNetworkSettings | null>(null);
  editShowInNetwork = signal<boolean>(true);
  editShowWhatsapp = signal<boolean>(true);
  editShowEmail = signal<boolean>(true);
  editCountry = signal<string>('');
  editState = signal<string>('');
  editLinkedinUrl = signal<string>('');

  readonly isScoutRole = computed(() => this.authService.currentUser()?.role === 'SCOUT');

  ngOnInit(): void {
    this.setupSearchDebounce();
    this.loadFilters();
    this.fetchColleagues(0);
  }

  private setupSearchDebounce(): void {
    merge(
      this.searchInput$.pipe(debounceTime(350)),
      this.searchImmediate$
    )
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe(() => {
        this.fetchColleagues(0);
      });
  }

  loadFilters(): void {
    this.networkService.getFilters().subscribe({
      next: (res) => this.facets.set(res),
      error: () => {}
    });
  }

  fetchColleagues(page = 0): void {
    this.isLoading.set(true);
    this.hasError.set(false);
    this.contactError.set(null);

    const trimmedQuery = this.searchQuery().trim();
    const orgOption = this.facets()?.organizations.find(o => o.name === this.selectedOrganization());

    const params: ScoutNetworkQueryParams = {
      page,
      size: this.pageSize(),
      query: trimmedQuery ? trimmedQuery : null,
      clubId: !this.sameClubOnly() && orgOption?.clubId ? orgOption.clubId : null,
      organizationName: !this.sameClubOnly() && !orgOption?.clubId && this.selectedOrganization()
        ? this.selectedOrganization()
        : null,
      country: this.selectedCountry() ? this.selectedCountry() : null,
      sameClubOnly: this.sameClubOnly()
    };

    this.networkService.getNetwork(params).subscribe({
      next: (response: PageResponse<ScoutNetworkItem>) => {
        this.colleagues.set(response.content || []);
        this.totalElements.set(response.totalElements || 0);
        this.totalPages.set(response.totalPages || 0);
        this.currentPage.set(response.number || 0);
        this.isLoading.set(false);
      },
      error: () => {
        this.hasError.set(true);
        this.isLoading.set(false);
      }
    });
  }

  onSearchQueryChange(value: string): void {
    this.searchQuery.set(value);
    this.searchInput$.next(value.trim());
  }

  onSearchEnter(): void {
    this.searchImmediate$.next(this.searchQuery().trim());
  }

  clearSearch(): void {
    this.searchQuery.set('');
    this.searchImmediate$.next('');
  }

  onOrganizationChange(orgName: string): void {
    this.selectedOrganization.set(orgName);
    if (orgName) {
      this.sameClubOnly.set(false);
    }
    this.fetchColleagues(0);
  }

  onCountryChange(country: string): void {
    this.selectedCountry.set(country);
    this.fetchColleagues(0);
  }

  toggleSameClubOnly(): void {
    const next = !this.sameClubOnly();
    this.sameClubOnly.set(next);
    if (next) {
      this.selectedOrganization.set('');
    }
    this.fetchColleagues(0);
  }

  hasActiveFilters(): boolean {
    return (
      this.searchQuery().trim().length > 0 ||
      !!this.selectedOrganization() ||
      !!this.selectedCountry() ||
      this.sameClubOnly()
    );
  }

  resetFilters(): void {
    this.searchQuery.set('');
    this.selectedOrganization.set('');
    this.selectedCountry.set('');
    this.sameClubOnly.set(false);
    this.fetchColleagues(0);
  }

  goToPage(page: number): void {
    if (page >= 0 && page < this.totalPages()) {
      this.fetchColleagues(page);
      if (typeof window !== 'undefined') {
        window.scrollTo({ top: 0, behavior: 'smooth' });
      }
    }
  }

  contactColleague(item: ScoutNetworkItem, channel: ScoutContactChannel): void {
    if (this.contactingKey()) {
      return;
    }

    const key = `${item.scoutProfileId}:${channel}`;
    this.contactingKey.set(key);
    this.contactError.set(null);

    this.networkService.contactScout(item.scoutProfileId, channel).subscribe({
      next: (res) => {
        this.contactingKey.set(null);
        this.openExternalContact(res.contactUrl, channel);
      },
      error: (err) => {
        this.contactingKey.set(null);
        this.contactError.set(err.error?.message || 'No se pudo iniciar el contacto con este colega.');
      }
    });
  }

  openExternalContact(url: string, channel: ScoutContactChannel): void {
    if (typeof window === 'undefined' || !url) return;
    if (channel === 'EMAIL') {
      window.location.href = url;
    } else {
      window.open(url, '_blank', 'noopener,noreferrer');
    }
  }

  isContacting(item: ScoutNetworkItem, channel: ScoutContactChannel): boolean {
    return this.contactingKey() === `${item.scoutProfileId}:${channel}`;
  }

  // --- Modal Mi Perfil y Privacidad ---
  openSettingsModal(): void {
    if (!this.isScoutRole()) return;
    this.showSettingsModal.set(true);
    this.isLoadingSettings.set(true);
    this.settingsError.set(null);
    this.settingsSuccess.set(null);

    this.networkService.getMyNetworkSettings().subscribe({
      next: (settings) => {
        this.applySettingsToState(settings);
        this.isLoadingSettings.set(false);
      },
      error: (err) => {
        this.isLoadingSettings.set(false);
        this.settingsError.set(err.error?.message || 'No se pudo cargar tu configuración de red.');
      }
    });
  }

  closeSettingsModal(): void {
    if (this.isSavingSettings() || this.isUploadingPhoto() || this.isDeletingPhoto()) {
      return;
    }
    this.showSettingsModal.set(false);
  }

  saveNetworkSettings(): void {
    this.isSavingSettings.set(true);
    this.settingsError.set(null);
    this.settingsSuccess.set(null);

    this.networkService.updateMyNetworkSettings({
      showInNetwork: this.editShowInNetwork(),
      showWhatsappInNetwork: this.editShowWhatsapp(),
      showEmailInNetwork: this.editShowEmail(),
      country: this.editCountry().trim() || null,
      state: this.editState().trim() || null,
      linkedinUrl: this.editLinkedinUrl().trim() || null
    }).subscribe({
      next: (updated) => {
        this.applySettingsToState(updated);
        this.isSavingSettings.set(false);
        this.settingsSuccess.set('Tus preferencias de privacidad en la Red de Scouts fueron guardadas.');
        this.loadFilters();
        this.fetchColleagues(this.currentPage());
      },
      error: (err) => {
        this.isSavingSettings.set(false);
        this.settingsError.set(err.error?.message || 'No se pudieron guardar tus preferencias.');
      }
    });
  }

  onPhotoSelected(event: Event): void {
    const input = event.target as HTMLInputElement;
    const file = input.files?.[0];
    if (!file) return;

    if (file.size > 5 * 1024 * 1024) {
      this.settingsError.set('La imagen excede el tamaño máximo permitido de 5MB.');
      input.value = '';
      return;
    }

    this.isUploadingPhoto.set(true);
    this.settingsError.set(null);
    this.settingsSuccess.set(null);

    this.networkService.uploadPublicPhoto(file).subscribe({
      next: (res) => {
        this.isUploadingPhoto.set(false);
        const current = this.mySettings();
        if (current) {
          this.mySettings.set({ ...current, profilePhotoUrl: res.profilePhotoUrl });
        }
        this.settingsSuccess.set('Tu foto pública de perfil se actualizó correctamente.');
        input.value = '';
      },
      error: (err) => {
        this.isUploadingPhoto.set(false);
        this.settingsError.set(err.error?.message || 'No se pudo subir la foto pública.');
        input.value = '';
      }
    });
  }

  deleteMyPhoto(): void {
    this.isDeletingPhoto.set(true);
    this.settingsError.set(null);
    this.settingsSuccess.set(null);

    this.networkService.deletePublicPhoto().subscribe({
      next: () => {
        this.isDeletingPhoto.set(false);
        const current = this.mySettings();
        if (current) {
          this.mySettings.set({ ...current, profilePhotoUrl: null });
        }
        this.settingsSuccess.set('Se eliminó tu foto pública de perfil.');
      },
      error: (err) => {
        this.isDeletingPhoto.set(false);
        this.settingsError.set(err.error?.message || 'No se pudo eliminar tu foto pública.');
      }
    });
  }

  private applySettingsToState(settings: ScoutNetworkSettings): void {
    this.mySettings.set(settings);
    this.editShowInNetwork.set(settings.showInNetwork);
    this.editShowWhatsapp.set(settings.showWhatsappInNetwork);
    this.editShowEmail.set(settings.showEmailInNetwork);
    this.editCountry.set(settings.country || '');
    this.editState.set(settings.state || '');
    this.editLinkedinUrl.set(settings.linkedinUrl || '');
  }

  getInitials(fullName: string): string {
    const parts = (fullName || '').trim().split(/\s+/).filter(Boolean);
    if (parts.length === 0) return 'TS';
    if (parts.length === 1) return parts[0].substring(0, 2).toUpperCase();
    return (parts[0].charAt(0) + parts[parts.length - 1].charAt(0)).toUpperCase();
  }

  onPhotoError(scoutProfileId: string): void {
    this.failedPhotos.update(prev => {
      const next = new Set(prev);
      next.add(scoutProfileId);
      return next;
    });
  }

  hasValidPhoto(item: ScoutNetworkItem): boolean {
    return !!item.profilePhotoUrl && !this.failedPhotos().has(item.scoutProfileId);
  }

  onClubLogoError(scoutProfileId: string): void {
    this.failedClubLogos.update(prev => {
      const next = new Set(prev);
      next.add(scoutProfileId);
      return next;
    });
  }

  hasValidClubLogo(item: ScoutNetworkItem): boolean {
    return !!item.clubLogoUrl && !this.failedClubLogos().has(item.scoutProfileId);
  }

  @HostListener('window:keydown.escape')
  onEscapeKey(): void {
    if (this.showSettingsModal()) {
      this.closeSettingsModal();
    }
  }
}

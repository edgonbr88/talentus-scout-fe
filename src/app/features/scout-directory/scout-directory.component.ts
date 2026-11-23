import { Component, DestroyRef, OnInit, inject, signal, HostListener } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterLink } from '@angular/router';
import { FormsModule } from '@angular/forms';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { Subject, debounceTime, merge } from 'rxjs';
import { ScoutDirectoryService } from '../../core/services/scout-directory.service';
import { AuthService } from '../../core/auth/auth.service';
import { PageResponse, ScoutDirectoryAthleteItem, ScoutDirectoryFilters } from '../../core/models/scout-directory.model';
import { VideoPlayerComponent } from '../../shared/components/video-player/video-player.component';
import { MediaUrlPipe } from '../../core/pipes/media-url.pipe';

@Component({
  selector: 'app-scout-directory',
  standalone: true,
  imports: [CommonModule, RouterLink, FormsModule, VideoPlayerComponent, MediaUrlPipe],
  templateUrl: './scout-directory.component.html',
  styleUrls: ['./scout-directory.component.css']
})
export class ScoutDirectoryComponent implements OnInit {
  private directoryService = inject(ScoutDirectoryService);
  private destroyRef = inject(DestroyRef);
  authService = inject(AuthService);

  private searchInput$ = new Subject<string>();
  private searchImmediate$ = new Subject<string>();
  private numericFilter$ = new Subject<void>();

  // Estados Reactivos con Signals
  athletes = signal<ScoutDirectoryAthleteItem[]>([]);
  totalElements = signal<number>(0);
  totalPages = signal<number>(0);
  currentPage = signal<number>(0);
  pageSize = signal<number>(12);
  isLoading = signal<boolean>(false);
  hasError = signal<boolean>(false);

  // Estado de Contacto Seguro WhatsApp
  contactingAthleteId = signal<string | null>(null);

  // Modal de Reproducción Rápida
  activeVideoModal = signal<ScoutDirectoryAthleteItem | null>(null);
  modalClubLogoFailed = signal<boolean>(false);

  // Control reactivo de escudos de club con error de carga
  failedClubLogos = signal<Set<string>>(new Set<string>());

  // Panel de Filtros Desplegable
  showAdvancedFilters = signal<boolean>(false);

  // Filtros seleccionados
  searchQuery = signal<string>('');
  selectedBirthYear = signal<number | null>(null);
  selectedBirthYearFrom = signal<number | null>(null);
  selectedBirthYearTo = signal<number | null>(null);
  birthYearFromInput = signal<string>('');
  birthYearToInput = signal<string>('');
  selectedPosition = signal<string>('');
  selectedFoot = signal<string>('');
  selectedResidenceCountry = signal<string>('');
  minHeightCm = signal<number | null>(null);
  maxHeightCm = signal<number | null>(null);
  minWeightKg = signal<number | null>(null);
  maxWeightKg = signal<number | null>(null);
  filterOnlyWithVideo = signal<boolean>(false);
  filterOnlyEuropeanPassport = signal<boolean>(false);

  // Opciones de Posiciones
  readonly positionOptions = [
    { value: '', label: 'Todas las posiciones' },
    { value: 'PORTERO', label: 'Portero (POR)' },
    { value: 'DEFENSA_CENTRAL', label: 'Defensa Central (DFC)' },
    { value: 'LATERAL_DERECHO', label: 'Lateral Derecho (LD)' },
    { value: 'LATERAL_IZQUIERDO', label: 'Lateral Izquierdo (LI)' },
    { value: 'PIVOTE_DEFENSIVO', label: 'Pivote Defensivo (MCD)' },
    { value: 'MEDIOCAMPISTA_CENTRAL', label: 'Mediocampista Central (MC)' },
    { value: 'MEDIOCAMPISTA_OFENSIVO', label: 'Mediocampista Ofensivo (MCO)' },
    { value: 'EXTREMO_DERECHO', label: 'Extremo Derecho (ED)' },
    { value: 'EXTREMO_IZQUIERDO', label: 'Extremo Izquierdo (EI)' },
    { value: 'DELANTERO_CENTRO', label: 'Delantero Centro (DC)' }
  ];

  // Opciones de Pierna Hábil
  readonly footOptions = [
    { value: '', label: 'Cualquier perfil' },
    { value: 'DIESTRO', label: 'Diestro' },
    { value: 'ZURDO', label: 'Zurdo' },
    { value: 'AMBIDIESTRO', label: 'Ambidiestro' }
  ];

  // Opciones de País de Residencia Autorizado
  readonly countryOptions: string[] = [
    'Venezuela',
    'Colombia',
    'Chile',
    'Perú',
    'Ecuador',
    'Bolivia'
  ];

  ngOnInit(): void {
    this.setupDebouncedFilters();
    this.fetchAthletes();
  }

  private setupDebouncedFilters(): void {
    merge(
      this.searchInput$.pipe(debounceTime(350)),
      this.searchImmediate$
    )
      .pipe(
        takeUntilDestroyed(this.destroyRef)
      )
      .subscribe(() => {
        this.fetchAthletes(0);
      });

    this.numericFilter$
      .pipe(
        debounceTime(350),
        takeUntilDestroyed(this.destroyRef)
      )
      .subscribe(() => {
        this.fetchAthletes(0);
      });
  }

  fetchAthletes(page = 0): void {
    this.isLoading.set(true);
    this.hasError.set(false);

    const trimmedQuery = this.searchQuery().trim();
    const filters: ScoutDirectoryFilters = {
      page,
      size: this.pageSize(),
      query: trimmedQuery ? trimmedQuery : null,
      birthYear: this.selectedBirthYear(),
      birthYearFrom: this.selectedBirthYearFrom(),
      birthYearTo: this.selectedBirthYearTo(),
      primaryPosition: this.selectedPosition() ? this.selectedPosition() : null,
      preferredFoot: this.selectedFoot() ? this.selectedFoot() : null,
      residenceCountry: this.selectedResidenceCountry() ? this.selectedResidenceCountry() : null,
      minHeightCm: this.minHeightCm(),
      maxHeightCm: this.maxHeightCm(),
      minWeightKg: this.minWeightKg(),
      maxWeightKg: this.maxWeightKg(),
      hasVideo: this.filterOnlyWithVideo() ? true : null,
      hasEuropeanPassport: this.filterOnlyEuropeanPassport() ? true : null
    };

    this.directoryService.getDirectory(filters).subscribe({
      next: (response: PageResponse<ScoutDirectoryAthleteItem>) => {
        this.athletes.set(response.content || []);
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

  onYearFromInputChange(value: string | number | null): void {
    const raw = value === null || value === undefined ? '' : String(value).trim();
    this.birthYearFromInput.set(raw);
    this.selectedBirthYear.set(null);

    if (!raw) {
      if (this.selectedBirthYearFrom() !== null) {
        this.selectedBirthYearFrom.set(null);
        this.numericFilter$.next();
      }
      return;
    }

    if (/^\d{4}$/.test(raw)) {
      const parsed = Number(raw);
      if (parsed >= 1900 && parsed <= 2100) {
        this.selectedBirthYearFrom.set(parsed);
        this.numericFilter$.next();
      }
    }
  }

  onYearToInputChange(value: string | number | null): void {
    const raw = value === null || value === undefined ? '' : String(value).trim();
    this.birthYearToInput.set(raw);
    this.selectedBirthYear.set(null);

    if (!raw) {
      if (this.selectedBirthYearTo() !== null) {
        this.selectedBirthYearTo.set(null);
        this.numericFilter$.next();
      }
      return;
    }

    if (/^\d{4}$/.test(raw)) {
      const parsed = Number(raw);
      if (parsed >= 1900 && parsed <= 2100) {
        this.selectedBirthYearTo.set(parsed);
        this.numericFilter$.next();
      }
    }
  }

  onBiometricRangeChange(
    field: 'minHeightCm' | 'maxHeightCm' | 'minWeightKg' | 'maxWeightKg',
    value: number | string | null
  ): void {
    const parsed = this.parsePositiveDecimal(value);
    this[field].set(parsed);
    this.numericFilter$.next();
  }

  private parsePositiveDecimal(value: number | string | null): number | null {
    if (value === null || value === undefined || value === '') {
      return null;
    }
    const num = typeof value === 'number' ? value : Number(String(value).trim());
    if (Number.isNaN(num) || num <= 0) {
      return null;
    }
    return num;
  }

  onFilterChange(): void {
    this.fetchAthletes(0);
  }

  toggleVideoFilter(): void {
    this.filterOnlyWithVideo.update((prev) => !prev);
    this.fetchAthletes(0);
  }

  togglePassportFilter(): void {
    this.filterOnlyEuropeanPassport.update((prev) => !prev);
    this.fetchAthletes(0);
  }

  toggleAdvancedFilters(): void {
    this.showAdvancedFilters.update((prev) => !prev);
  }

  hasActiveFilters(): boolean {
    return (
      this.searchQuery().trim().length > 0 ||
      this.selectedBirthYear() !== null ||
      this.selectedBirthYearFrom() !== null ||
      this.selectedBirthYearTo() !== null ||
      this.birthYearFromInput().length > 0 ||
      this.birthYearToInput().length > 0 ||
      !!this.selectedPosition() ||
      !!this.selectedFoot() ||
      !!this.selectedResidenceCountry() ||
      this.minHeightCm() !== null ||
      this.maxHeightCm() !== null ||
      this.minWeightKg() !== null ||
      this.maxWeightKg() !== null ||
      this.filterOnlyWithVideo() ||
      this.filterOnlyEuropeanPassport()
    );
  }

  resetFilters(): void {
    this.searchQuery.set('');
    this.selectedBirthYear.set(null);
    this.selectedBirthYearFrom.set(null);
    this.selectedBirthYearTo.set(null);
    this.birthYearFromInput.set('');
    this.birthYearToInput.set('');
    this.selectedPosition.set('');
    this.selectedFoot.set('');
    this.selectedResidenceCountry.set('');
    this.minHeightCm.set(null);
    this.maxHeightCm.set(null);
    this.minWeightKg.set(null);
    this.maxWeightKg.set(null);
    this.filterOnlyWithVideo.set(false);
    this.filterOnlyEuropeanPassport.set(false);
    this.fetchAthletes(0);
  }

  goToPage(page: number): void {
    if (page >= 0 && page < this.totalPages()) {
      this.fetchAthletes(page);
      if (typeof window !== 'undefined') {
        window.scrollTo({ top: 0, behavior: 'smooth' });
      }
    }
  }

  contactTutor(athlete: ScoutDirectoryAthleteItem, event?: Event): void {
    if (event) {
      event.stopPropagation();
    }
    if (this.contactingAthleteId()) {
      return;
    }

    this.contactingAthleteId.set(athlete.id);
    this.directoryService.contactAthleteTutor(athlete.id).subscribe({
      next: (response) => {
        this.contactingAthleteId.set(null);
        if (response.whatsappUrl && typeof window !== 'undefined') {
          window.open(response.whatsappUrl, '_blank', 'noopener,noreferrer');
        }
      },
      error: (err) => {
        this.contactingAthleteId.set(null);
        console.error('Error al generar enlace seguro de WhatsApp:', err);
      }
    });
  }

  openVideoModal(athlete: ScoutDirectoryAthleteItem): void {
    if (athlete.hasVideo && athlete.featuredVideoPlaybackUrl) {
      this.modalClubLogoFailed.set(false);
      this.activeVideoModal.set(athlete);
    }
  }

  closeVideoModal(): void {
    this.activeVideoModal.set(null);
    this.modalClubLogoFailed.set(false);
  }

  onClubLogoError(athleteId: string): void {
    this.failedClubLogos.update((prev) => {
      const updated = new Set(prev);
      updated.add(athleteId);
      return updated;
    });
  }

  isClubLogoLoaded(athlete: ScoutDirectoryAthleteItem): boolean {
    return !!athlete.clubLogoUrl && !this.failedClubLogos().has(athlete.id);
  }

  onModalClubLogoError(): void {
    this.modalClubLogoFailed.set(true);
  }

  @HostListener('window:keydown.escape')
  onEscapePress(): void {
    if (this.activeVideoModal()) {
      this.closeVideoModal();
    }
  }

  getPositionBadgeClass(position: string): string {
    const pos = (position || '').toUpperCase();
    if (pos.includes('DELANTERO') || pos.includes('EXTREMO')) {
      return 'badge-attack';
    }
    if (pos.includes('MEDIOCAMPISTA') || pos.includes('PIVOTE') || pos.includes('VOLANTE')) {
      return 'badge-midfield';
    }
    if (pos.includes('DEFENSA') || pos.includes('LATERAL') || pos.includes('CENTRAL')) {
      return 'badge-defense';
    }
    if (pos.includes('PORTERO') || pos.includes('ARQUERO')) {
      return 'badge-gk';
    }
    return 'badge-neutral';
  }
}

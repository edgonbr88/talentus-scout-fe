import { Component, EventEmitter, Input, OnChanges, OnInit, Output, SimpleChanges, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import {
  AbstractControl,
  FormBuilder,
  FormGroup,
  ReactiveFormsModule,
  ValidationErrors,
  ValidatorFn,
  Validators
} from '@angular/forms';
import { AthleteService } from '../../../core/services/athlete.service';
import { AthleteSummary, ClubDto, UpdateAthleteRequest } from '../../../core/models/athlete.model';

export type EditAthleteSection = 'GENERAL' | 'SOCIAL_LINKS';

const HOSTNAME_REGEX = /^[a-z0-9](?:[a-z0-9-]{0,61}[a-z0-9])?(?:\.[a-z0-9](?:[a-z0-9-]{0,61}[a-z0-9])?)+$/i;

export function httpsDomainValidator(allowedDomains?: string[]): ValidatorFn {
  return (control: AbstractControl): ValidationErrors | null => {
    const raw = control.value;
    if (raw === null || raw === undefined) {
      return null;
    }
    const trimmed = String(raw).trim();
    if (!trimmed) {
      return null;
    }
    if (trimmed.length > 500) {
      return { maxUrlLength: true };
    }
    if (/\s/.test(trimmed)) {
      return { invalidUrl: true };
    }

    let parsed: URL;
    try {
      parsed = new URL(trimmed);
    } catch {
      return { invalidUrl: true };
    }

    if (parsed.protocol !== 'https:') {
      return { requireHttps: true };
    }

    const host = parsed.hostname.toLowerCase();
    if (!host || !HOSTNAME_REGEX.test(host)) {
      return { invalidUrl: true };
    }

    if (allowedDomains && allowedDomains.length > 0) {
      const matches = allowedDomains.some(domain => host === domain || host.endsWith('.' + domain));
      if (!matches) {
        return { invalidDomain: { allowedDomains } };
      }
    }

    return null;
  };
}

function otherLabelRequiresUrlValidator(group: AbstractControl): ValidationErrors | null {
  const urlControl = group.get('otherVideoPlatformUrl');
  const labelControl = group.get('otherVideoPlatformLabel');
  if (!urlControl || !labelControl || urlControl.disabled || labelControl.disabled) {
    return null;
  }
  const url = String(urlControl.value ?? '').trim();
  const label = String(labelControl.value ?? '').trim();
  if (label && !url) {
    return { labelRequiresUrl: true };
  }
  return null;
}

@Component({
  selector: 'app-edit-athlete-modal',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule],
  templateUrl: './edit-athlete-modal.component.html',
  styleUrls: ['./edit-athlete-modal.component.css']
})
export class EditAthleteModalComponent implements OnInit, OnChanges {
  private fb = inject(FormBuilder);
  private athleteService = inject(AthleteService);

  @Input({ required: true }) athlete!: AthleteSummary;
  @Input() initialSection: EditAthleteSection = 'GENERAL';

  @Output() athleteUpdated = new EventEmitter<AthleteSummary>();
  @Output() closed = new EventEmitter<void>();
  @Output() upgradeRequested = new EventEmitter<AthleteSummary>();

  activeSection: EditAthleteSection = 'GENERAL';
  clubs: ClubDto[] = [];
  isLoadingClubs = false;
  isSubmitting = false;
  errorMessage: string | null = null;

  readonly positions = [
    'Portero',
    'Defensa Central',
    'Lateral Derecho',
    'Lateral Izquierdo',
    'Mediocampista Defensivo',
    'Mediocampista Central',
    'Mediocampista Ofensivo',
    'Extremo Derecho',
    'Extremo Izquierdo',
    'Delantero Centro'
  ];

  readonly preferredFeet = [
    { value: 'DERECHO', label: 'Diestro (Derecho)' },
    { value: 'IZQUIERDO', label: 'Zurdo (Izquierdo)' },
    { value: 'AMBIDIESTRO', label: 'Ambidiestro' }
  ];

  readonly editForm: FormGroup = this.fb.group(
    {
      primaryPosition: ['', [Validators.required, Validators.maxLength(50)]],
      secondaryPosition: ['', [Validators.maxLength(50)]],
      preferredFoot: ['DERECHO', [Validators.required, Validators.maxLength(20)]],
      currentClubId: [''],
      federationLicenseNumber: ['', [Validators.maxLength(50)]],
      secondaryPassports: ['', [Validators.maxLength(150)]],
      heightCm: [null, [Validators.min(90), Validators.max(230)]],
      weightKg: [null, [Validators.min(20), Validators.max(150)]],
      bio: ['', [Validators.maxLength(1000)]],
      isPublic: [true],
      instagramUrl: ['', [httpsDomainValidator(['instagram.com', 'instagr.am'])]],
      tiktokUrl: ['', [httpsDomainValidator(['tiktok.com'])]],
      youtubeUrl: ['', [httpsDomainValidator(['youtube.com', 'youtu.be'])]],
      otherVideoPlatformUrl: ['', [httpsDomainValidator()]],
      otherVideoPlatformLabel: ['', [Validators.maxLength(60)]]
    },
    { validators: [otherLabelRequiresUrlValidator] }
  );

  private readonly socialControlNames = [
    'instagramUrl',
    'tiktokUrl',
    'youtubeUrl',
    'otherVideoPlatformUrl',
    'otherVideoPlatformLabel'
  ];

  get isProActive(): boolean {
    return this.athlete?.subscriptionStatus === 'ACTIVE';
  }

  get hasStoredSocialLinks(): boolean {
    return Boolean(
      this.athlete?.instagramUrl ||
      this.athlete?.tiktokUrl ||
      this.athlete?.youtubeUrl ||
      this.athlete?.otherVideoPlatformUrl
    );
  }

  ngOnInit(): void {
    this.activeSection = this.initialSection || 'GENERAL';
    this.populateFormFromAthlete();
    this.loadClubs();
  }

  ngOnChanges(changes: SimpleChanges): void {
    if (changes['initialSection'] && !changes['initialSection'].firstChange) {
      this.activeSection = this.initialSection || 'GENERAL';
    }
    if (changes['athlete'] && !changes['athlete'].firstChange) {
      this.populateFormFromAthlete();
    }
  }

  setSection(section: EditAthleteSection): void {
    this.activeSection = section;
    this.errorMessage = null;
  }

  loadClubs(): void {
    this.isLoadingClubs = true;
    this.athleteService.getClubs().subscribe({
      next: (clubs) => {
        this.clubs = clubs || [];
        this.isLoadingClubs = false;
      },
      error: () => {
        this.clubs = [];
        this.isLoadingClubs = false;
      }
    });
  }

  populateFormFromAthlete(): void {
    if (!this.athlete) return;

    const normalizedFoot = this.normalizePreferredFoot(this.athlete.preferredFoot);

    this.editForm.patchValue(
      {
        primaryPosition: this.athlete.primaryPosition || '',
        secondaryPosition: this.athlete.secondaryPosition || '',
        preferredFoot: normalizedFoot,
        currentClubId: this.athlete.currentClub?.id || '',
        federationLicenseNumber: this.athlete.federationLicenseNumber || '',
        secondaryPassports: this.athlete.secondaryPassports || '',
        heightCm: this.athlete.heightCm ?? null,
        weightKg: this.athlete.weightKg ?? null,
        bio: this.athlete.bio || '',
        isPublic: this.athlete.isPublic ?? true,
        instagramUrl: this.athlete.instagramUrl || '',
        tiktokUrl: this.athlete.tiktokUrl || '',
        youtubeUrl: this.athlete.youtubeUrl || '',
        otherVideoPlatformUrl: this.athlete.otherVideoPlatformUrl || '',
        otherVideoPlatformLabel: this.athlete.otherVideoPlatformLabel || ''
      },
      { emitEvent: false }
    );

    for (const controlName of this.socialControlNames) {
      const ctrl = this.editForm.get(controlName);
      if (!ctrl) continue;
      if (this.isProActive) {
        ctrl.enable({ emitEvent: false });
      } else {
        ctrl.disable({ emitEvent: false });
      }
    }

    this.editForm.markAsPristine();
    this.editForm.markAsUntouched();
  }

  private normalizePreferredFoot(foot?: string): string {
    if (!foot) return 'DERECHO';
    const upper = foot.trim().toUpperCase();
    if (upper.startsWith('IZQ')) return 'IZQUIERDO';
    if (upper.startsWith('AMB')) return 'AMBIDIESTRO';
    if (upper.startsWith('DER')) return 'DERECHO';
    return foot;
  }

  isControlInvalid(controlName: string): boolean {
    const ctrl = this.editForm.get(controlName);
    return Boolean(ctrl && ctrl.invalid && (ctrl.dirty || ctrl.touched));
  }

  getUrlErrorMessage(controlName: string, platformLabel: string): string | null {
    const ctrl = this.editForm.get(controlName);
    if (!ctrl || !ctrl.errors || !(ctrl.dirty || ctrl.touched)) {
      return null;
    }
    if (ctrl.errors['requireHttps']) {
      return `El enlace de ${platformLabel} debe iniciar con https://.`;
    }
    if (ctrl.errors['invalidDomain']) {
      const domains = (ctrl.errors['invalidDomain'].allowedDomains as string[]).join(' o ');
      return `Usa un enlace oficial de ${platformLabel} (${domains}).`;
    }
    if (ctrl.errors['maxUrlLength']) {
      return 'El enlace supera el límite de 500 caracteres.';
    }
    if (ctrl.errors['invalidUrl']) {
      return `Ingresa una URL válida de ${platformLabel} (ej. https://...).`;
    }
    return null;
  }

  get hasLabelWithoutUrlError(): boolean {
    const labelCtrl = this.editForm.get('otherVideoPlatformLabel');
    return Boolean(
      this.editForm.hasError('labelRequiresUrl') &&
      (labelCtrl?.dirty || labelCtrl?.touched || this.editForm.touched)
    );
  }

  requestProUpgrade(): void {
    this.upgradeRequested.emit(this.athlete);
  }

  close(): void {
    if (!this.isSubmitting) {
      this.closed.emit();
    }
  }

  onSubmit(): void {
    this.errorMessage = null;
    this.editForm.markAllAsTouched();

    if (this.editForm.invalid) {
      const hasSocialError = this.socialControlNames.some(name => this.editForm.get(name)?.invalid)
        || this.editForm.hasError('labelRequiresUrl');
      if (hasSocialError && this.isProActive) {
        this.activeSection = 'SOCIAL_LINKS';
      } else {
        this.activeSection = 'GENERAL';
      }
      return;
    }

    this.isSubmitting = true;
    const raw = this.editForm.getRawValue();

    const payload: UpdateAthleteRequest = {
      primaryPosition: String(raw.primaryPosition || '').trim(),
      secondaryPosition: String(raw.secondaryPosition || '').trim(),
      preferredFoot: String(raw.preferredFoot || '').trim(),
      federationLicenseNumber: String(raw.federationLicenseNumber || '').trim(),
      secondaryPassports: String(raw.secondaryPassports || '').trim(),
      heightCm: raw.heightCm !== null && raw.heightCm !== '' ? Number(raw.heightCm) : null,
      weightKg: raw.weightKg !== null && raw.weightKg !== '' ? Number(raw.weightKg) : null,
      bio: String(raw.bio || '').trim(),
      isPublic: Boolean(raw.isPublic)
    };

    if (raw.currentClubId) {
      payload.currentClubId = raw.currentClubId;
    }

    if (this.isProActive) {
      const otherUrl = String(raw.otherVideoPlatformUrl || '').trim();
      payload.instagramUrl = String(raw.instagramUrl || '').trim();
      payload.tiktokUrl = String(raw.tiktokUrl || '').trim();
      payload.youtubeUrl = String(raw.youtubeUrl || '').trim();
      payload.otherVideoPlatformUrl = otherUrl;
      payload.otherVideoPlatformLabel = otherUrl ? String(raw.otherVideoPlatformLabel || '').trim() : '';
    }

    this.athleteService.updateAthlete(this.athlete.id, payload).subscribe({
      next: (updated) => {
        this.isSubmitting = false;
        this.athleteUpdated.emit(updated);
      },
      error: (err) => {
        this.isSubmitting = false;
        this.errorMessage =
          err?.error?.message ||
          err?.error?.detail ||
          'No se pudieron guardar los cambios de la ficha. Verifica los campos e intenta nuevamente.';
      }
    });
  }
}

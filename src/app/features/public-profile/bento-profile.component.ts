import { Component, OnInit, inject, signal, computed, PLATFORM_ID } from '@angular/core';
import { CommonModule, Location, isPlatformBrowser } from '@angular/common';
import { ActivatedRoute, Router, RouterModule } from '@angular/router';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { AthleteService } from '../../core/services/athlete.service';
import { SeoService } from '../../core/services/seo.service';
import { AuthService } from '../../core/auth/auth.service';
import { ScoutDirectoryService } from '../../core/services/scout-directory.service';
import { AchievementCategory, PublicAthleteResponse, PublicVideoDto } from '../../core/models/athlete.model';
import { VideoPlayerComponent } from '../../shared/components/video-player/video-player.component';
import { MediaUrlPipe } from '../../core/pipes/media-url.pipe';
import { BrandLogoComponent } from '../../shared/components/brand-logo/brand-logo.component';

@Component({
  selector: 'app-bento-profile',
  standalone: true,
  imports: [CommonModule, RouterModule, ReactiveFormsModule, VideoPlayerComponent, MediaUrlPipe, BrandLogoComponent],
  templateUrl: './bento-profile.component.html',
  styleUrls: ['./bento-profile.component.css']
})
export class BentoProfileComponent implements OnInit {
  private route = inject(ActivatedRoute);
  private router = inject(Router);
  private location = inject(Location);
  private athleteService = inject(AthleteService);
  private seoService = inject(SeoService);
  private authService = inject(AuthService);
  private scoutDirectoryService = inject(ScoutDirectoryService);
  private fb = inject(FormBuilder);
  private platformId = inject(PLATFORM_ID);

  private cameFromDirectory = false;

  public athlete = signal<PublicAthleteResponse | null>(null);
  public activeVideo = signal<PublicVideoDto | null>(null);
  public isLoading = signal<boolean>(true);
  public errorMessage = signal<string | null>(null);
  public copiedNotification = signal<boolean>(false);
  public isDownloadingCv = signal<boolean>(false);
  public isContacting = signal<boolean>(false);
  public showAuthPrompt = signal<boolean>(false);
  public showAchievementModal = signal<boolean>(false);
  public isSavingAchievement = signal<boolean>(false);
  public achievementError = signal<string | null>(null);
  public achievementSuccess = signal<string | null>(null);

  public readonly achievementCategories: { value: AchievementCategory; label: string }[] = [
    { value: 'TORNEO', label: 'Título o Torneo' },
    { value: 'INDIVIDUAL', label: 'Distinción Individual (MVP / Goleador)' },
    { value: 'CONVOCATORIA', label: 'Convocatoria Oficial' },
    { value: 'OTRO', label: 'Otro Logro Deportivo' }
  ];

  public achievementForm = this.fb.nonNullable.group({
    title: ['', [Validators.required, Validators.maxLength(150)]],
    category: ['TORNEO' as AchievementCategory, [Validators.required]],
    achievementDate: [''],
    description: ['', [Validators.maxLength(500)]]
  });

  public isScout = computed(() => {
    const role = this.authService.currentUser()?.role;
    return role === 'SCOUT' || role === 'ADMIN';
  });

  public canRegisterClubAchievement = computed(() => {
    const user = this.authService.currentUser();
    const a = this.athlete();
    if (!user || !a) return false;
    if (user.role === 'ADMIN') return true;
    if (user.role !== 'SCOUT' || user.scoutVerificationStatus !== 'APPROVED') return false;
    const clubName = a.club?.name?.trim().toLowerCase();
    const scoutOrg = user.organizationName?.trim().toLowerCase();
    return Boolean(clubName && scoutOrg && clubName === scoutOrg);
  });

  public birthYear = computed(() => {
    const a = this.athlete();
    if (!a?.birthDate) return null;
    return new Date(a.birthDate).getFullYear();
  });

  public formattedPassports = computed(() => {
    const a = this.athlete();
    if (!a?.secondaryPassports) return null;
    return a.secondaryPassports.trim();
  });

  ngOnInit(): void {
    const navState = this.router.getCurrentNavigation()?.extras?.state;
    const historyState = isPlatformBrowser(this.platformId) ? window.history.state : null;
    this.cameFromDirectory = Boolean(navState?.['fromDirectory'] || historyState?.fromDirectory);

    this.route.paramMap.subscribe(params => {
      const slug = params.get('slug');
      if (slug) {
        this.fetchProfile(slug);
      } else {
        this.errorMessage.set('Identificador de atleta inválido.');
        this.isLoading.set(false);
      }
    });
  }

  private fetchProfile(slug: string): void {
    this.isLoading.set(true);
    this.errorMessage.set(null);

    this.athleteService.getPublicAthleteBySlug(slug).subscribe({
      next: (data) => {
        this.athlete.set(data);
        if (data.videos && data.videos.length > 0) {
          this.activeVideo.set(data.videos[0]);
        }
        this.seoService.setAthleteProfileMeta(data);
        this.isLoading.set(false);

        // Si quien visualiza es un scout autenticado, registrar la visita para el radar
        if (this.isScout()) {
          this.scoutDirectoryService.logAthleteView(data.id).subscribe({
            error: () => {}
          });
        }
      },
      error: (err) => {
        this.isLoading.set(false);
        if (err.status === 404) {
          this.errorMessage.set('El perfil deportivo solicitado no existe o fue configurado como privado.');
        } else {
          this.errorMessage.set('Ocurrió un error al cargar la ficha del atleta. Intenta nuevamente.');
        }
      }
    });
  }

  selectVideo(video: PublicVideoDto): void {
    this.activeVideo.set(video);
  }

  contactTutor(): void {
    const a = this.athlete();
    if (!a || this.isContacting()) return;

    this.isContacting.set(true);
    this.scoutDirectoryService.contactAthleteTutor(a.id).subscribe({
      next: (response) => {
        this.isContacting.set(false);
        if (response.whatsappUrl && isPlatformBrowser(this.platformId)) {
          window.open(response.whatsappUrl, '_blank', 'noopener,noreferrer');
        }
      },
      error: (err) => {
        this.isContacting.set(false);
        console.error('Error al generar enlace seguro de WhatsApp:', err);
      }
    });
  }

  shareOnWhatsApp(): void {
    const a = this.athlete();
    if (!a) return;

    const currentUrl = isPlatformBrowser(this.platformId)
      ? window.location.href
      : `https://talentus.app/atleta/${a.slug}`;

    const text = `¡Descubre el perfil de ${a.fullName} (${a.primaryPosition}) en Talentus Scout!\nFicha deportiva, jugadas destacadas y biotipo oficial:\n${currentUrl}`;
    const encoded = encodeURIComponent(text);
    const whatsappUrl = `https://api.whatsapp.com/send?text=${encoded}`;

    if (isPlatformBrowser(this.platformId)) {
      window.open(whatsappUrl, '_blank', 'noopener,noreferrer');
    }
  }

  copyProfileLink(): void {
    if (!isPlatformBrowser(this.platformId)) return;
    const url = window.location.href;
    navigator.clipboard.writeText(url).then(() => {
      this.copiedNotification.set(true);
      setTimeout(() => this.copiedNotification.set(false), 3000);
    });
  }

  downloadCvPdf(): void {
    const a = this.athlete();
    if (!a) return;

    if (!this.authService.isAuthenticated()) {
      this.showAuthPrompt.set(true);
      return;
    }

    this.isDownloadingCv.set(true);
    this.athleteService.downloadAthleteCvPdf(a.id).subscribe({
      next: (blob) => {
        this.isDownloadingCv.set(false);
        if (isPlatformBrowser(this.platformId)) {
          const url = window.URL.createObjectURL(blob);
          const anchor = document.createElement('a');
          anchor.href = url;
          anchor.download = `CV_Deportivo_${a.slug || a.id}.pdf`;
          document.body.appendChild(anchor);
          anchor.click();
          document.body.removeChild(anchor);
          window.URL.revokeObjectURL(url);
        }
      },
      error: (err) => {
        this.isDownloadingCv.set(false);
        console.error('Error al descargar el CV:', err);
        if (err.status === 403) {
          alert('Solo el representante legal del atleta, scouts acreditados o administradores pueden descargar la Ficha Técnica oficial.');
        } else {
          alert('No se pudo generar la Ficha Técnica en PDF. Por favor intenta más tarde.');
        }
      }
    });
  }

  goBackToDirectory(): void {
    if (this.cameFromDirectory && isPlatformBrowser(this.platformId) && window.history.length > 1) {
      this.location.back();
      return;
    }
    this.router.navigate(['/scout/directory']);
  }

  openAchievementModal(): void {
    this.achievementError.set(null);
    this.achievementForm.reset({
      title: '',
      category: 'TORNEO',
      achievementDate: '',
      description: ''
    });
    this.showAchievementModal.set(true);
  }

  closeAchievementModal(): void {
    if (this.isSavingAchievement()) return;
    this.showAchievementModal.set(false);
    this.achievementError.set(null);
  }

  submitAchievement(): void {
    if (this.achievementForm.invalid || this.isSavingAchievement()) {
      this.achievementForm.markAllAsTouched();
      return;
    }

    const a = this.athlete();
    if (!a) return;

    const raw = this.achievementForm.getRawValue();
    this.isSavingAchievement.set(true);
    this.achievementError.set(null);

    this.scoutDirectoryService.createAthleteAchievement(a.id, {
      title: raw.title.trim(),
      category: raw.category,
      achievementDate: raw.achievementDate || undefined,
      description: raw.description?.trim() || undefined
    }).subscribe({
      next: (createdBadge) => {
        this.isSavingAchievement.set(false);
        this.athlete.update(curr => curr ? {
          ...curr,
          badges: [createdBadge, ...(curr.badges || [])]
        } : curr);
        this.showAchievementModal.set(false);
        this.achievementSuccess.set('Logro deportivo certificado en el perfil del atleta.');
        setTimeout(() => this.achievementSuccess.set(null), 3500);
      },
      error: (err) => {
        this.isSavingAchievement.set(false);
        const backendMessage = err?.error?.message;
        if (err?.status === 403) {
          this.achievementError.set(backendMessage || 'Solo puedes certificar logros de atletas que pertenezcan a tu mismo club u organización.');
        } else {
          this.achievementError.set(backendMessage || 'No se pudo registrar el logro. Verifica los datos e intenta nuevamente.');
        }
      }
    });
  }

  closeAuthPrompt(): void {
    this.showAuthPrompt.set(false);
  }
}

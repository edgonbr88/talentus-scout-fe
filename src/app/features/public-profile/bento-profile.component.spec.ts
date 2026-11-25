import { ComponentFixture, TestBed } from '@angular/core/testing';
import { signal, WritableSignal } from '@angular/core';
import { BentoProfileComponent } from './bento-profile.component';
import { AthleteService } from '../../core/services/athlete.service';
import { SeoService } from '../../core/services/seo.service';
import { AuthService } from '../../core/auth/auth.service';
import { Location } from '@angular/common';
import { ActivatedRoute, Router } from '@angular/router';
import { of } from 'rxjs';
import { PublicAthleteResponse } from '../../core/models/athlete.model';

import { ScoutDirectoryService } from '../../core/services/scout-directory.service';

describe('BentoProfileComponent', () => {
  let component: BentoProfileComponent;
  let fixture: ComponentFixture<BentoProfileComponent>;
  let athleteServiceSpy: jasmine.SpyObj<AthleteService>;
  let seoServiceSpy: jasmine.SpyObj<SeoService>;
  let scoutDirectoryServiceSpy: jasmine.SpyObj<ScoutDirectoryService>;
  let currentUserSignal: WritableSignal<any>;
  let authServiceSpy: any;

  const mockAthlete: PublicAthleteResponse = {
    id: 'test-uuid-001',
    slug: 'gabriel-perez-10',
    firstName: 'Gabriel',
    lastName: 'Pérez',
    fullName: 'Gabriel Pérez',
    age: 16,
    birthDate: '2010-06-15',
    gender: 'MALE',
    primaryPosition: 'Delantero Centro',
    secondaryPosition: 'Extremo Derecho',
    preferredFoot: 'Derecho',
    nationality: 'Venezolana',
    secondaryPassports: 'Español (UE)',
    club: {
      name: 'Deportivo Miranda Sub-16',
      city: 'Caracas',
      state: 'Miranda'
    },
    metrics: {
      heightCm: 174.5,
      weightKg: 63.0
    },
    badges: [
      {
        type: 'FEDERATION_LICENSE',
        title: 'Licencia Oficial FVF',
        verified: true,
        organizationName: 'Federación Venezolana de Fútbol'
      }
    ],
    videos: [
      {
        id: 'vid-01',
        title: 'Goles Clausura',
        category: 'HIGHLIGHTS',
        playbackUrl: 'https://cdn.talentus.app/videos/test.m3u8'
      }
    ]
  };

  beforeEach(async () => {
    athleteServiceSpy = jasmine.createSpyObj('AthleteService', ['getPublicAthleteBySlug', 'downloadAthleteCvPdf']);
    seoServiceSpy = jasmine.createSpyObj('SeoService', ['setAthleteProfileMeta']);
    scoutDirectoryServiceSpy = jasmine.createSpyObj('ScoutDirectoryService', [
      'logAthleteView',
      'contactAthleteTutor',
      'createAthleteAchievement',
      'getTechnicalAnalyses',
      'createTechnicalAnalysis',
      'updateTechnicalAnalysis',
      'deleteTechnicalAnalysis'
    ]);
    scoutDirectoryServiceSpy.logAthleteView.and.returnValue(of(null as any));
    scoutDirectoryServiceSpy.contactAthleteTutor.and.returnValue(of({ whatsappUrl: 'https://wa.me/test' } as any));
    scoutDirectoryServiceSpy.createAthleteAchievement.and.returnValue(of({
      type: 'SPORT_ACHIEVEMENT',
      title: 'Campeón Torneo Apertura',
      verified: true,
      organizationName: 'Deportivo Miranda Sub-16'
    }));
    scoutDirectoryServiceSpy.getTechnicalAnalyses.and.returnValue(of([]));
    currentUserSignal = signal<any>(null);
    authServiceSpy = {
      isAuthenticated: jasmine.createSpy('isAuthenticated').and.returnValue(false),
      currentUser: currentUserSignal
    };

    athleteServiceSpy.getPublicAthleteBySlug.and.returnValue(of(mockAthlete));

    await TestBed.configureTestingModule({
      imports: [BentoProfileComponent],
      providers: [
        { provide: AthleteService, useValue: athleteServiceSpy },
        { provide: SeoService, useValue: seoServiceSpy },
        { provide: ScoutDirectoryService, useValue: scoutDirectoryServiceSpy },
        { provide: AuthService, useValue: authServiceSpy },
        {
          provide: ActivatedRoute,
          useValue: {
            paramMap: of(new Map([['slug', 'gabriel-perez-10']]))
          }
        }
      ]
    }).compileComponents();

    fixture = TestBed.createComponent(BentoProfileComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create and load athlete data', () => {
    expect(component).toBeTruthy();
    expect(component.athlete()).toEqual(mockAthlete);
    expect(seoServiceSpy.setAthleteProfileMeta).toHaveBeenCalledWith(mockAthlete);
  });

  it('should render athlete name, club and metrics in Bento Grid', () => {
    const compiled = fixture.nativeElement as HTMLElement;
    expect(compiled.querySelector('.athlete-name')?.textContent).toContain('Gabriel Pérez');
    expect(compiled.querySelector('.pill-primary-position')?.textContent).toContain('Delantero Centro');
    expect(compiled.querySelector('.club-name')?.textContent).toContain('Deportivo Miranda Sub-16');
    expect(compiled.textContent).toContain('174.5 cm');
    expect(compiled.textContent).toContain('63 kg');
  });

  it('should display verified badges, whatsapp button and cv pdf button', () => {
    const compiled = fixture.nativeElement as HTMLElement;
    expect(compiled.querySelector('.badge-name')?.textContent).toContain('Licencia Oficial FVF');
    expect(compiled.querySelector('.btn-whatsapp-action')).toBeTruthy();
    expect(compiled.querySelector('.btn-pdf-dock')).toBeTruthy();
  });

  it('should show auth prompt modal when unauthenticated user clicks download CV', () => {
    component.downloadCvPdf();
    expect(component.showAuthPrompt()).toBeTrue();
  });

  it('should render top navigation bar with back button and breadcrumbs', () => {
    const compiled = fixture.nativeElement as HTMLElement;
    const backBtn = compiled.querySelector('.btn-back-directory');
    const breadcrumbs = compiled.querySelector('.profile-breadcrumbs');

    expect(backBtn).toBeTruthy();
    expect(backBtn?.textContent).toContain('Volver al Directorio');
    expect(backBtn?.getAttribute('aria-label')).toBe('Volver al directorio de talentos');
    expect(breadcrumbs?.textContent).toContain('Directorio de Talentos');
    expect(breadcrumbs?.textContent).toContain('Ficha de Gabriel Pérez');
  });

  it('should navigate to /scout/directory as fallback when not coming from directory', () => {
    const router = TestBed.inject(Router);
    const location = TestBed.inject(Location);
    const navSpy = spyOn(router, 'navigate');
    const backSpy = spyOn(location, 'back');

    component.goBackToDirectory();

    expect(backSpy).not.toHaveBeenCalled();
    expect(navSpy).toHaveBeenCalledWith(['/scout/directory']);
  });

  it('should use Location.back() when navigation came from directory', () => {
    const location = TestBed.inject(Location);
    const router = TestBed.inject(Router);
    const backSpy = spyOn(location, 'back');
    const navSpy = spyOn(router, 'navigate');

    window.history.replaceState({ fromDirectory: true }, '');
    component.ngOnInit();
    component.goBackToDirectory();

    if (window.history.length > 1) {
      expect(backSpy).toHaveBeenCalled();
      expect(navSpy).not.toHaveBeenCalled();
    } else {
      expect(navSpy).toHaveBeenCalledWith(['/scout/directory']);
    }

    window.history.replaceState({}, '');
  });

  it('should allow approved scout of same club to register achievement and update badges reactively', () => {
    currentUserSignal.set({
      id: 'scout-1',
      email: 'scout@miranda.com',
      fullName: 'Scout Miranda',
      role: 'SCOUT',
      scoutVerificationStatus: 'APPROVED',
      organizationName: 'Deportivo Miranda Sub-16'
    });
    fixture.detectChanges();

    const compiled = fixture.nativeElement as HTMLElement;
    expect(component.canRegisterClubAchievement()).toBeTrue();
    expect(compiled.querySelector('.btn-register-achievement')).toBeTruthy();

    component.openAchievementModal();
    component.achievementForm.setValue({
      title: 'Campeón Torneo Apertura',
      category: 'TORNEO',
      achievementDate: '2026-06-15',
      description: 'Final estatal'
    });
    component.submitAchievement();

    expect(scoutDirectoryServiceSpy.createAthleteAchievement).toHaveBeenCalledWith('test-uuid-001', {
      title: 'Campeón Torneo Apertura',
      category: 'TORNEO',
      achievementDate: '2026-06-15',
      description: 'Final estatal'
    });
    expect(component.athlete()?.badges[0].title).toBe('Campeón Torneo Apertura');
    expect(component.showAchievementModal()).toBeFalse();
  });

  it('should not allow scout from a different club to register achievement', () => {
    currentUserSignal.set({
      id: 'scout-2',
      email: 'scout@otro.com',
      fullName: 'Scout Otro',
      role: 'SCOUT',
      scoutVerificationStatus: 'APPROVED',
      organizationName: 'Caracas FC'
    });
    fixture.detectChanges();

    expect(component.canRegisterClubAchievement()).toBeFalse();
    expect((fixture.nativeElement as HTMLElement).querySelector('.btn-register-achievement')).toBeNull();
  });

  it('should hide technical analyses section for anonymous, tutor, athlete and pending scout', () => {
    const compiled = fixture.nativeElement as HTMLElement;
    expect(compiled.querySelector('app-scout-technical-analyses')).toBeNull();

    currentUserSignal.set({ id: 't1', email: 't@test.com', fullName: 'Tutor', role: 'TUTOR' });
    fixture.detectChanges();
    expect(compiled.querySelector('app-scout-technical-analyses')).toBeNull();

    currentUserSignal.set({ id: 'a1', email: 'a@test.com', fullName: 'Atleta', role: 'ATHLETE' });
    fixture.detectChanges();
    expect(compiled.querySelector('app-scout-technical-analyses')).toBeNull();

    currentUserSignal.set({
      id: 's-pend',
      email: 'p@test.com',
      fullName: 'Scout Pendiente',
      role: 'SCOUT',
      scoutVerificationStatus: 'PENDING'
    });
    fixture.detectChanges();
    expect(compiled.querySelector('app-scout-technical-analyses')).toBeNull();
  });

  it('should render technical analyses section for approved scout from any club and admin', () => {
    const compiled = fixture.nativeElement as HTMLElement;

    currentUserSignal.set({
      id: 'scout-other',
      email: 'scout@caracasfc.com',
      fullName: 'Scout Caracas',
      role: 'SCOUT',
      scoutVerificationStatus: 'APPROVED',
      organizationName: 'Caracas FC'
    });
    fixture.detectChanges();
    expect(compiled.querySelector('app-scout-technical-analyses')).toBeTruthy();

    currentUserSignal.set({
      id: 'admin-1',
      email: 'admin@talentus.com',
      fullName: 'Admin',
      role: 'ADMIN'
    });
    fixture.detectChanges();
    expect(compiled.querySelector('app-scout-technical-analyses')).toBeTruthy();
  });

  it('should hide social links Bento card for anonymous, tutor, athlete and pending scout even if socialLinks exists', () => {
    component.athlete.set({
      ...mockAthlete,
      socialLinks: {
        instagramUrl: 'https://instagram.com/gabriel10',
        tiktokUrl: 'https://www.tiktok.com/@gabriel10',
        youtubeUrl: 'https://youtu.be/xyz123',
        otherPlatformUrl: 'https://www.hudl.com/profile/10',
        otherPlatformLabel: 'Hudl'
      }
    });
    const compiled = fixture.nativeElement as HTMLElement;

    fixture.detectChanges();
    expect(compiled.querySelector('.card-social-links')).toBeNull();

    currentUserSignal.set({ id: 't1', email: 't@test.com', fullName: 'Tutor', role: 'TUTOR' });
    fixture.detectChanges();
    expect(compiled.querySelector('.card-social-links')).toBeNull();

    currentUserSignal.set({ id: 'a1', email: 'a@test.com', fullName: 'Atleta', role: 'ATHLETE' });
    fixture.detectChanges();
    expect(compiled.querySelector('.card-social-links')).toBeNull();

    currentUserSignal.set({
      id: 's-pend',
      email: 'p@test.com',
      fullName: 'Scout Pendiente',
      role: 'SCOUT',
      scoutVerificationStatus: 'PENDING'
    });
    fixture.detectChanges();
    expect(compiled.querySelector('.card-social-links')).toBeNull();
  });

  it('should render social links Bento card with safe https links for approved scout and admin', () => {
    component.athlete.set({
      ...mockAthlete,
      socialLinks: {
        instagramUrl: 'https://instagram.com/gabriel10',
        tiktokUrl: 'https://www.tiktok.com/@gabriel10',
        youtubeUrl: 'https://youtu.be/xyz123',
        otherPlatformUrl: 'https://www.hudl.com/profile/10',
        otherPlatformLabel: 'Hudl'
      }
    });
    const compiled = fixture.nativeElement as HTMLElement;

    currentUserSignal.set({
      id: 'scout-1',
      email: 'scout@club.com',
      fullName: 'Scout Aprobado',
      role: 'SCOUT',
      scoutVerificationStatus: 'APPROVED'
    });
    fixture.detectChanges();

    const socialCard = compiled.querySelector('.card-social-links');
    expect(socialCard).toBeTruthy();
    const links = Array.from(socialCard!.querySelectorAll('a.social-link-tile')) as HTMLAnchorElement[];
    expect(links.length).toBe(4);
    expect(links[0].getAttribute('href')).toBe('https://instagram.com/gabriel10');
    expect(links[0].getAttribute('rel')).toBe('noopener noreferrer');
    expect(links[0].getAttribute('target')).toBe('_blank');
    expect(socialCard!.textContent).toContain('Hudl');

    // Empty socialLinks -> hidden even for approved scout
    component.athlete.set({ ...mockAthlete, socialLinks: null });
    fixture.detectChanges();
    expect(compiled.querySelector('.card-social-links')).toBeNull();
  });
});


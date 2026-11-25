import { ComponentFixture, TestBed } from '@angular/core/testing';
import { of } from 'rxjs';
import { EditAthleteModalComponent } from './edit-athlete-modal.component';
import { AthleteService } from '../../../core/services/athlete.service';
import { AthleteSummary } from '../../../core/models/athlete.model';

describe('EditAthleteModalComponent (TS-86)', () => {
  let component: EditAthleteModalComponent;
  let fixture: ComponentFixture<EditAthleteModalComponent>;
  let athleteServiceSpy: jasmine.SpyObj<AthleteService>;

  const activeAthlete: AthleteSummary = {
    id: 'ath-pro-1',
    firstName: 'Mateo',
    lastName: 'Rivas',
    fullName: 'Mateo Rivas',
    birthDate: '2010-05-12',
    age: 16,
    primaryPosition: 'Mediocampista Ofensivo',
    secondaryPosition: 'Extremo Derecho',
    preferredFoot: 'DERECHO',
    heightCm: 173,
    weightKg: 62,
    bio: 'Volante creativo.',
    instagramUrl: 'https://www.instagram.com/mateo10',
    tiktokUrl: null,
    youtubeUrl: 'https://youtu.be/abc123',
    otherVideoPlatformUrl: 'https://www.hudl.com/profile/123',
    otherVideoPlatformLabel: 'Hudl',
    slug: 'mateo-rivas',
    isPublic: true,
    subscriptionStatus: 'ACTIVE',
    hasIdentityDocument: true,
    legalVerificationStatus: 'APPROVED'
  };

  const inactiveAthlete: AthleteSummary = {
    ...activeAthlete,
    id: 'ath-free-2',
    subscriptionStatus: 'INACTIVE'
  };

  beforeEach(async () => {
    athleteServiceSpy = jasmine.createSpyObj('AthleteService', ['getClubs', 'updateAthlete']);
    athleteServiceSpy.getClubs.and.returnValue(of([]));
    athleteServiceSpy.updateAthlete.and.callFake((_id, payload) =>
      of({
        ...activeAthlete,
        ...payload
      } as AthleteSummary)
    );

    await TestBed.configureTestingModule({
      imports: [EditAthleteModalComponent],
      providers: [{ provide: AthleteService, useValue: athleteServiceSpy }]
    }).compileComponents();
  });

  it('should render responsibility notice and enable social inputs when subscription is ACTIVE', () => {
    fixture = TestBed.createComponent(EditAthleteModalComponent);
    component = fixture.componentInstance;
    component.athlete = activeAthlete;
    component.initialSection = 'SOCIAL_LINKS';
    fixture.detectChanges();

    const el = fixture.nativeElement as HTMLElement;
    expect(component.activeSection).toBe('SOCIAL_LINKS');
    expect(component.editForm.get('instagramUrl')?.disabled).toBeFalse();
    expect(el.querySelector('.responsibility-callout')?.textContent).toContain('únicamente deportivo');
    expect(el.querySelector('.responsibility-callout')?.textContent).toContain('tutores o representantes legales');
    expect(el.querySelector('.pro-lock-panel')).toBeNull();
  });

  it('should disable social inputs and display Pro lock CTA when subscription is INACTIVE', () => {
    fixture = TestBed.createComponent(EditAthleteModalComponent);
    component = fixture.componentInstance;
    component.athlete = inactiveAthlete;
    component.initialSection = 'SOCIAL_LINKS';
    fixture.detectChanges();

    const el = fixture.nativeElement as HTMLElement;
    expect(component.editForm.get('instagramUrl')?.disabled).toBeTrue();
    expect(component.editForm.get('tiktokUrl')?.disabled).toBeTrue();
    expect(component.editForm.get('youtubeUrl')?.disabled).toBeTrue();
    expect(component.editForm.get('otherVideoPlatformUrl')?.disabled).toBeTrue();
    expect(component.editForm.get('otherVideoPlatformLabel')?.disabled).toBeTrue();
    expect(el.querySelector('.pro-lock-panel')).toBeTruthy();

    spyOn(component.upgradeRequested, 'emit');
    const upgradeBtn: HTMLButtonElement = el.querySelector('.btn-upgrade-pro')!;
    upgradeBtn.click();
    expect(component.upgradeRequested.emit).toHaveBeenCalledWith(inactiveAthlete);
  });

  it('should validate https and official domains reactively before submitting', () => {
    fixture = TestBed.createComponent(EditAthleteModalComponent);
    component = fixture.componentInstance;
    component.athlete = activeAthlete;
    component.initialSection = 'SOCIAL_LINKS';
    fixture.detectChanges();

    component.editForm.patchValue({
      instagramUrl: 'http://instagram.com/mateo',
      tiktokUrl: 'https://vimeo.com/1234',
      youtubeUrl: 'https://instagram.com/video'
    });
    component.onSubmit();
    fixture.detectChanges();

    expect(component.editForm.get('instagramUrl')?.hasError('requireHttps')).toBeTrue();
    expect(component.editForm.get('tiktokUrl')?.hasError('invalidDomain')).toBeTrue();
    expect(component.editForm.get('youtubeUrl')?.hasError('invalidDomain')).toBeTrue();
    expect(athleteServiceSpy.updateAthlete).not.toHaveBeenCalled();
  });

  it('should omit social link fields when saving basic sports info for INACTIVE athlete', () => {
    fixture = TestBed.createComponent(EditAthleteModalComponent);
    component = fixture.componentInstance;
    component.athlete = inactiveAthlete;
    component.initialSection = 'GENERAL';
    fixture.detectChanges();

    component.editForm.patchValue({ bio: 'Nueva biografía deportiva' });
    component.onSubmit();

    expect(athleteServiceSpy.updateAthlete).toHaveBeenCalledTimes(1);
    const [calledId, payload] = athleteServiceSpy.updateAthlete.calls.mostRecent().args;
    expect(calledId).toBe('ath-free-2');
    expect(payload.bio).toBe('Nueva biografía deportiva');
    expect(payload.instagramUrl).toBeUndefined();
    expect(payload.tiktokUrl).toBeUndefined();
    expect(payload.youtubeUrl).toBeUndefined();
    expect(payload.otherVideoPlatformUrl).toBeUndefined();
  });

  it('should send validated social link fields when saving for ACTIVE Pro athlete', () => {
    fixture = TestBed.createComponent(EditAthleteModalComponent);
    component = fixture.componentInstance;
    component.athlete = activeAthlete;
    component.initialSection = 'SOCIAL_LINKS';
    fixture.detectChanges();

    spyOn(component.athleteUpdated, 'emit');

    component.editForm.patchValue({
      instagramUrl: 'https://instagram.com/mateo_oficial',
      tiktokUrl: 'https://www.tiktok.com/@mateo_oficial',
      youtubeUrl: 'https://www.youtube.com/@mateo_oficial',
      otherVideoPlatformUrl: 'https://app.veo.co/matches/99',
      otherVideoPlatformLabel: 'Veo'
    });
    component.onSubmit();

    expect(athleteServiceSpy.updateAthlete).toHaveBeenCalledTimes(1);
    const [, payload] = athleteServiceSpy.updateAthlete.calls.mostRecent().args;
    expect(payload.instagramUrl).toBe('https://instagram.com/mateo_oficial');
    expect(payload.tiktokUrl).toBe('https://www.tiktok.com/@mateo_oficial');
    expect(payload.youtubeUrl).toBe('https://www.youtube.com/@mateo_oficial');
    expect(payload.otherVideoPlatformUrl).toBe('https://app.veo.co/matches/99');
    expect(payload.otherVideoPlatformLabel).toBe('Veo');
    expect(component.athleteUpdated.emit).toHaveBeenCalled();
  });
});

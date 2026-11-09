import { ComponentFixture, TestBed } from '@angular/core/testing';
import { RegisterAthleteComponent } from './register-athlete.component';
import { AuthService } from '../../../core/auth/auth.service';
import { Router } from '@angular/router';
import { of, throwError } from 'rxjs';

describe('RegisterAthleteComponent', () => {
  let component: RegisterAthleteComponent;
  let fixture: ComponentFixture<RegisterAthleteComponent>;
  let authServiceSpy: jasmine.SpyObj<AuthService>;
  let routerSpy: jasmine.SpyObj<Router>;

  beforeEach(async () => {
    authServiceSpy = jasmine.createSpyObj('AuthService', ['registerAdultAthlete']);
    routerSpy = jasmine.createSpyObj('Router', ['navigate']);

    await TestBed.configureTestingModule({
      imports: [RegisterAthleteComponent],
      providers: [
        { provide: AuthService, useValue: authServiceSpy },
        { provide: Router, useValue: routerSpy }
      ]
    }).compileComponents();

    fixture = TestBed.createComponent(RegisterAthleteComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create the component', () => {
    expect(component).toBeTruthy();
    expect(component.currentStep).toBe(1);
  });

  it('should detect underage if birthDate is less than 18 years ago', () => {
    // 14 years old
    const date = new Date();
    date.setFullYear(date.getFullYear() - 14);
    const dateStr = date.toISOString().split('T')[0];

    component.accountForm.patchValue({ birthDate: dateStr });
    component.onBirthDateChange();

    expect(component.isUnderage).toBeTrue();
    expect(component.calculatedAge).toBe(14);
  });

  it('should detect adult if birthDate is 18 years or older', () => {
    // 20 years old
    const date = new Date();
    date.setFullYear(date.getFullYear() - 20);
    const dateStr = date.toISOString().split('T')[0];

    component.accountForm.patchValue({ birthDate: dateStr });
    component.onBirthDateChange();

    expect(component.isUnderage).toBeFalse();
    expect(component.calculatedAge).toBe(20);
  });

  it('should not proceed to step 2 if underage', () => {
    component.accountForm.patchValue({
      fullName: 'Atleta Menor',
      email: 'menor@test.com',
      password: 'Password123!',
      phoneNumber: '+584121234567',
      birthDate: '2012-01-01',
      acceptTerms: true,
      acceptInstitutionalDiffusion: true
    });

    component.goToStep2();

    expect(component.currentStep).toBe(1);
    expect(component.errorMessage).toContain('LOPNNA');
  });

  it('should proceed to step 2 if form is valid and age >= 18', () => {
    component.accountForm.patchValue({
      fullName: 'Atleta Mayor',
      email: 'mayor@test.com',
      password: 'Password123!',
      phoneNumber: '+584121234567',
      birthDate: '2004-01-01',
      acceptTerms: true,
      acceptInstitutionalDiffusion: true
    });

    component.goToStep2();

    expect(component.currentStep).toBe(2);
    expect(component.errorMessage).toBeNull();
  });

  it('should submit registration and navigate to dashboard on success', () => {
    authServiceSpy.registerAdultAthlete.and.returnValue(of({
      userId: 'usr-1',
      athleteId: 'ath-1',
      token: 'jwt.token.fake',
      fullName: 'Atleta Mayor',
      email: 'mayor@test.com',
      role: 'ATHLETE',
      slug: 'atleta-mayor'
    }));

    component.accountForm.patchValue({
      fullName: 'Atleta Mayor',
      email: 'mayor@test.com',
      password: 'Password123!',
      phoneNumber: '+584121234567',
      birthDate: '2004-01-01',
      acceptTerms: true,
      acceptInstitutionalDiffusion: true
    });

    component.sportsForm.patchValue({
      primaryPosition: 'DELANTERO',
      preferredFoot: 'DERECHO',
      gender: 'MALE',
      nationality: 'Venezolana'
    });

    component.onSubmit();

    expect(authServiceSpy.registerAdultAthlete).toHaveBeenCalled();
    expect(routerSpy.navigate).toHaveBeenCalledWith(['/dashboard']);
  });

  it('should open and close terms modal', () => {
    component.openTermsModal();
    expect(component.showTermsModal).toBeTrue();

    component.closeTermsModal();
    expect(component.showTermsModal).toBeFalse();
  });
});

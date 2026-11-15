import { Component, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormBuilder, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { Router, RouterLink } from '@angular/router';
import { AuthService } from '../../../core/auth/auth.service';
import { BrandLogoComponent } from '../../../shared/components/brand-logo/brand-logo.component';
import { AthleteTermsModalComponent } from './athlete-terms-modal/athlete-terms-modal.component';

@Component({
  selector: 'app-register-athlete',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, RouterLink, BrandLogoComponent, AthleteTermsModalComponent],
  templateUrl: './register-athlete.component.html',
  styleUrl: './register-athlete.component.css'
})
export class RegisterAthleteComponent {
  private fb = inject(FormBuilder);
  private authService = inject(AuthService);
  private router = inject(Router);

  currentStep: 1 | 2 = 1;
  isLoading = false;
  errorMessage: string | null = null;
  showTermsModal = false;

  calculatedAge: number | null = null;
  isUnderage = false;

  idDocumentFile: File | null = null;
  selfieFile: File | null = null;

  positions = [
    { value: 'PORTERO', label: 'Portero (Arquero)' },
    { value: 'DEFENSA_CENTRAL', label: 'Defensa Central' },
    { value: 'LATERAL_DERECHO', label: 'Lateral Derecho' },
    { value: 'LATERAL_IZQUIERDO', label: 'Lateral Izquierdo' },
    { value: 'PIVOTE_DEFENSIVO', label: 'Pivote Defensivo (MCD)' },
    { value: 'MEDIOCENTRO', label: 'Mediocentro (MC)' },
    { value: 'MEDIOCENTRO_OFENSIVO', label: 'Mediocentro Ofensivo (MCO)' },
    { value: 'EXTREMO_DERECHO', label: 'Extremo Derecho' },
    { value: 'EXTREMO_IZQUIERDO', label: 'Extremo Izquierdo' },
    { value: 'DELANTERO', label: 'Delantero Centro' }
  ];

  accountForm: FormGroup = this.fb.group({
    fullName: ['', [Validators.required, Validators.maxLength(150)]],
    email: ['', [Validators.required, Validators.email, Validators.maxLength(255)]],
    password: ['', [Validators.required, Validators.minLength(8)]],
    phoneNumber: ['', [Validators.required, Validators.maxLength(30)]],
    birthDate: ['', [Validators.required]],
    acceptTerms: [false, [Validators.requiredTrue]],
    acceptInstitutionalDiffusion: [false, [Validators.requiredTrue]]
  });

  sportsForm: FormGroup = this.fb.group({
    primaryPosition: ['DELANTERO', [Validators.required]],
    secondaryPosition: [''],
    preferredFoot: ['DERECHO', [Validators.required]],
    gender: ['MALE', [Validators.required]],
    nationality: ['Venezolana', [Validators.required]],
    currentClubName: [''],
    heightCm: [null, [Validators.min(100), Validators.max(230)]],
    weightKg: [null, [Validators.min(30), Validators.max(150)]],
    bio: ['', [Validators.maxLength(1000)]],
    idDocumentType: ['V'],
    idDocumentNumber: ['']
  });

  onBirthDateChange(): void {
    const value = this.accountForm.get('birthDate')?.value;
    if (!value) {
      this.calculatedAge = null;
      this.isUnderage = false;
      return;
    }

    const birthDate = new Date(value);
    const today = new Date();
    let age = today.getFullYear() - birthDate.getFullYear();
    const monthDiff = today.getMonth() - birthDate.getMonth();
    if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < birthDate.getDate())) {
      age--;
    }

    this.calculatedAge = age;
    this.isUnderage = age < 18;
  }

  goToStep2(): void {
    this.accountForm.markAllAsTouched();
    this.onBirthDateChange();

    if (this.isUnderage) {
      this.errorMessage = 'Los atletas menores de 18 años deben ser registrados y representados por su tutor legal bajo la LOPNNA.';
      return;
    }

    if (this.accountForm.invalid) {
      this.errorMessage = 'Por favor completa todos los campos requeridos y acepta los términos legales.';
      return;
    }

    this.errorMessage = null;
    this.currentStep = 2;
  }

  goToStep1(): void {
    this.currentStep = 1;
    this.errorMessage = null;
  }

  onIdDocumentSelected(event: Event): void {
    const input = event.target as HTMLInputElement;
    if (input.files && input.files.length > 0) {
      this.idDocumentFile = input.files[0];
    }
  }

  onSelfieSelected(event: Event): void {
    const input = event.target as HTMLInputElement;
    if (input.files && input.files.length > 0) {
      this.selfieFile = input.files[0];
    }
  }

  onSubmit(): void {
    if (this.accountForm.invalid || this.sportsForm.invalid || this.isUnderage) {
      this.errorMessage = 'Por favor verifica la información ingresada antes de enviar.';
      return;
    }

    this.isLoading = true;
    this.errorMessage = null;

    const formData = new FormData();
    const acc = this.accountForm.value;
    const spt = this.sportsForm.value;

    formData.append('fullName', acc.fullName);
    formData.append('email', acc.email);
    formData.append('password', acc.password);
    formData.append('phoneNumber', acc.phoneNumber);
    formData.append('birthDate', acc.birthDate);
    formData.append('acceptTerms', String(acc.acceptTerms));
    formData.append('acceptInstitutionalDiffusion', String(acc.acceptInstitutionalDiffusion));

    formData.append('primaryPosition', spt.primaryPosition);
    if (spt.secondaryPosition) formData.append('secondaryPosition', spt.secondaryPosition);
    formData.append('preferredFoot', spt.preferredFoot);
    formData.append('gender', spt.gender);
    formData.append('nationality', spt.nationality);
    if (spt.currentClubName) formData.append('currentClubName', spt.currentClubName);
    if (spt.heightCm) formData.append('heightCm', String(spt.heightCm));
    if (spt.weightKg) formData.append('weightKg', String(spt.weightKg));
    if (spt.bio) formData.append('bio', spt.bio);

    if (spt.idDocumentType) formData.append('idDocumentType', spt.idDocumentType);
    if (spt.idDocumentNumber) formData.append('idDocumentNumber', spt.idDocumentNumber);
    if (this.idDocumentFile) formData.append('idDocumentFile', this.idDocumentFile);
    if (this.selfieFile) formData.append('selfieFile', this.selfieFile);

    this.authService.registerAdultAthlete(formData).subscribe({
      next: () => {
        this.isLoading = false;
        this.router.navigate(['/dashboard']);
      },
      error: (err) => {
        this.isLoading = false;
        if (err.status === 409) {
          this.errorMessage = 'Este correo electrónico ya se encuentra registrado. Inicia sesión o recupera tu contraseña.';
        } else if (err.error?.message) {
          this.errorMessage = err.error.message;
        } else {
          this.errorMessage = 'Ocurrió un error al procesar tu registro. Por favor intenta nuevamente.';
        }
      }
    });
  }

  openTermsModal(): void {
    this.showTermsModal = true;
  }

  closeTermsModal(): void {
    this.showTermsModal = false;
  }
}

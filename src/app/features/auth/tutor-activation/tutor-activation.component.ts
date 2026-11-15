import { Component, ElementRef, OnInit, ViewChild, inject, signal } from '@angular/core';
import { CommonModule, DOCUMENT } from '@angular/common';
import {
  AbstractControl,
  FormBuilder,
  FormGroup,
  FormsModule,
  ReactiveFormsModule,
  ValidationErrors,
  Validators
} from '@angular/forms';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { BulkImportService } from '../../../core/services/bulk-import.service';
import { BrandLogoComponent } from '../../../shared/components/brand-logo/brand-logo.component';

@Component({
  selector: 'app-tutor-activation',
  standalone: true,
  imports: [CommonModule, FormsModule, ReactiveFormsModule, RouterLink, BrandLogoComponent],
  templateUrl: './tutor-activation.component.html',
  styleUrl: './tutor-activation.component.css'
})
export class TutorActivationComponent implements OnInit {
  private fb = inject(FormBuilder);
  private route = inject(ActivatedRoute);
  private router = inject(Router);
  private bulkImportService = inject(BulkImportService);
  private document = inject(DOCUMENT);

  @ViewChild('rejectDialog') rejectDialogRef?: ElementRef<HTMLDialogElement>;

  token = signal<string>('');
  isRejectMode = signal<boolean>(false);
  rejectionReason: string = '';

  isSubmitting = signal<boolean>(false);
  hasSubmitted = signal<boolean>(false);
  showPassword = signal<boolean>(false);
  showConfirmPassword = signal<boolean>(false);

  successMessage = signal<string | null>(null);
  wasRejected = signal<boolean>(false);
  errorMessage = signal<string | null>(null);
  liveAnnouncement = signal<string>('');

  activationForm: FormGroup = this.fb.group(
    {
      password: ['', [Validators.required, Validators.minLength(8)]],
      confirmPassword: ['', [Validators.required]]
    },
    { validators: this.passwordMatchValidator }
  );

  ngOnInit(): void {
    const routePath = this.route.snapshot.routeConfig?.path || '';
    this.isRejectMode.set(routePath.includes('rechazar-tutor') || this.router.url.includes('rechazar-tutor'));
    const queryToken = this.route.snapshot.queryParams['token'] || '';
    this.token.set(queryToken);

    if (!queryToken) {
      const msg = 'El enlace no incluye un token de seguridad válido. Solicita una nueva invitación a tu academia o club.';
      this.errorMessage.set(msg);
      this.liveAnnouncement.set(msg);
    }
  }

  private passwordMatchValidator(control: AbstractControl): ValidationErrors | null {
    const pwd = control.get('password')?.value || '';
    const confirm = control.get('confirmPassword')?.value || '';
    if (!confirm) {
      return null;
    }
    return pwd === confirm ? null : { mismatch: true };
  }

  showPasswordError(): boolean {
    const ctrl = this.activationForm.get('password');
    return Boolean(ctrl && ctrl.invalid && (ctrl.touched || this.hasSubmitted()));
  }

  showConfirmError(): boolean {
    const ctrl = this.activationForm.get('confirmPassword');
    if (!ctrl) return false;
    const touchedOrSubmitted = ctrl.touched || this.hasSubmitted();
    return touchedOrSubmitted && (ctrl.invalid || Boolean(this.activationForm.hasError('mismatch')));
  }

  getPasswordDescribedBy(): string {
    return this.showPasswordError() ? 'password-rules password-error' : 'password-rules';
  }

  getConfirmDescribedBy(): string | null {
    return this.showConfirmError() ? 'confirm-password-error' : null;
  }

  togglePasswordVisibility(): void {
    this.showPassword.update((v) => !v);
  }

  toggleConfirmPasswordVisibility(): void {
    this.showConfirmPassword.update((v) => !v);
  }

  activateAccount(): void {
    this.hasSubmitted.set(true);
    this.activationForm.markAllAsTouched();
    this.errorMessage.set(null);

    if (!this.token()) {
      const msg = 'No se detectó un token de activación válido en el enlace.';
      this.errorMessage.set(msg);
      this.liveAnnouncement.set(msg);
      return;
    }

    if (this.activationForm.invalid) {
      const firstInvalidId = this.showPasswordError() ? 'tutor-password' : 'tutor-confirm-password';
      this.document.getElementById(firstInvalidId)?.focus();
      this.liveAnnouncement.set('Revisa los campos marcados antes de activar tu cuenta.');
      return;
    }

    const password = String(this.activationForm.get('password')?.value || '');
    this.isSubmitting.set(true);

    this.bulkImportService.activateTutor({ token: this.token(), password }).subscribe({
      next: (res) => {
        this.isSubmitting.set(false);
        this.wasRejected.set(false);
        const msg = res.message || 'Tu cuenta de tutor legal ha sido activada. Ya puedes ingresar al portal.';
        this.successMessage.set(msg);
        this.liveAnnouncement.set(msg);
      },
      error: (err) => {
        this.isSubmitting.set(false);
        const msg = err.error?.message || 'No se pudo activar tu cuenta. Es posible que el enlace haya expirado o ya fuera utilizado.';
        this.errorMessage.set(msg);
        this.liveAnnouncement.set(msg);
      }
    });
  }

  openRejectDialog(): void {
    this.errorMessage.set(null);
    const dialog = this.rejectDialogRef?.nativeElement;
    if (dialog && !dialog.open) {
      dialog.showModal();
    }
  }

  closeRejectDialog(): void {
    const dialog = this.rejectDialogRef?.nativeElement;
    if (dialog && dialog.open) {
      dialog.close();
    }
  }

  confirmRejection(): void {
    if (!this.token()) {
      const msg = 'No se detectó un token válido para procesar el rechazo.';
      this.errorMessage.set(msg);
      this.liveAnnouncement.set(msg);
      this.closeRejectDialog();
      return;
    }

    this.isSubmitting.set(true);
    this.errorMessage.set(null);

    this.bulkImportService.rejectTutor({ token: this.token(), reason: this.rejectionReason }).subscribe({
      next: (res) => {
        this.isSubmitting.set(false);
        this.closeRejectDialog();
        this.wasRejected.set(true);
        const msg = res.message || 'Has rechazado la vinculación. Los datos del representado han sido eliminados.';
        this.successMessage.set(msg);
        this.liveAnnouncement.set(msg);
      },
      error: (err) => {
        this.isSubmitting.set(false);
        this.closeRejectDialog();
        const msg = err.error?.message || 'No se pudo procesar el rechazo. Verifica que el enlace siga vigente.';
        this.errorMessage.set(msg);
        this.liveAnnouncement.set(msg);
      }
    });
  }
}

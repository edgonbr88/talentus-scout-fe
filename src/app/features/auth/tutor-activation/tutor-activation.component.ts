import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute, RouterModule } from '@angular/router';
import { BulkImportService } from '../../../core/services/bulk-import.service';

@Component({
  selector: 'app-tutor-activation',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterModule],
  templateUrl: './tutor-activation.component.html'
})
export class TutorActivationComponent implements OnInit {
  token: string = '';
  password: string = '';
  confirmPassword: string = '';
  rejectionReason: string = '';

  isSubmitting: boolean = false;
  successMessage: string | null = null;
  errorMessage: string | null = null;
  showRejectModal: boolean = false;

  constructor(
    private route: ActivatedRoute,
    private bulkImportService: BulkImportService
  ) {}

  ngOnInit(): void {
    this.token = this.route.snapshot.queryParams['token'] || '';
    if (!this.token) {
      this.errorMessage = 'El enlace de activación es inválido o no contiene un token válido.';
    }
  }

  activateAccount(): void {
    if (!this.password || this.password.length < 8) {
      this.errorMessage = 'La contraseña debe tener al menos 8 caracteres.';
      return;
    }

    if (this.password !== this.confirmPassword) {
      this.errorMessage = 'Las contraseñas no coinciden.';
      return;
    }

    this.isSubmitting = true;
    this.errorMessage = null;

    this.bulkImportService.activateTutor({ token: this.token, password: this.password }).subscribe({
      next: (res) => {
        this.isSubmitting = false;
        this.successMessage = res.message || '¡Tu cuenta ha sido activada con éxito! Ya puedes ingresar al portal.';
      },
      error: (err) => {
        this.isSubmitting = false;
        this.errorMessage = err.error?.message || 'Error al activar tu cuenta. Es posible que el token haya expirado.';
      }
    });
  }

  confirmRejection(): void {
    this.isSubmitting = true;
    this.errorMessage = null;

    this.bulkImportService.rejectTutor({ token: this.token, reason: this.rejectionReason }).subscribe({
      next: (res) => {
        this.isSubmitting = false;
        this.showRejectModal = false;
        this.successMessage = res.message || 'Has rechazado el registro. Los datos del representado han sido eliminados.';
      },
      error: (err) => {
        this.isSubmitting = false;
        this.errorMessage = err.error?.message || 'Error al procesar el rechazo.';
      }
    });
  }
}

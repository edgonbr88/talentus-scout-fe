import { Component, OnInit, OnDestroy, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormBuilder, FormGroup, FormsModule, ReactiveFormsModule, Validators } from '@angular/forms';
import { ActivatedRoute, RouterModule } from '@angular/router';
import { BulkImportService } from '../../core/services/bulk-import.service';
import { AuthService } from '../../core/auth/auth.service';
import {
  BulkImportJobResponse,
  ScoutIndividualAthleteRequest,
  ScoutIndividualAthleteResponse
} from '../../core/models/bulk-import.model';
import { Subscription, interval } from 'rxjs';
import { switchMap, take } from 'rxjs/operators';

@Component({
  selector: 'app-scout-bulk-import',
  standalone: true,
  imports: [CommonModule, FormsModule, ReactiveFormsModule, RouterModule],
  templateUrl: './scout-bulk-import.component.html',
  styleUrls: ['./scout-bulk-import.component.css']
})
export class ScoutBulkImportComponent implements OnInit, OnDestroy {
  private fb = inject(FormBuilder);
  private route = inject(ActivatedRoute);
  private authService = inject(AuthService);

  activeTab: 'file' | 'google' | 'individual' = 'file';
  selectedFile: File | null = null;
  googleSheetUrl: string = '';
  isUploading: boolean = false;
  errorMessage: string | null = null;
  activeJob: BulkImportJobResponse | null = null;
  recentJobs: BulkImportJobResponse[] = [];
  showOmittedDetails: boolean = false;
  isDownloadingReport: boolean = false;

  // Registro Individual (TS-82)
  individualForm: FormGroup;
  isSubmittingIndividual: boolean = false;
  individualSuccess: ScoutIndividualAthleteResponse | null = null;
  individualError: string | null = null;

  readonly genderOptions = ['Masculino', 'Femenino'];
  readonly positionOptions = [
    'Portero',
    'Defensa Central',
    'Lateral Derecho',
    'Lateral Izquierdo',
    'Pivote Defensivo',
    'Mediocampista Central',
    'Mediocampista Ofensivo',
    'Extremo Derecho',
    'Extremo Izquierdo',
    'Delantero Centro'
  ];
  readonly footOptions = ['Derecho', 'Izquierdo', 'Ambidiestro'];
  readonly countryOptions = ['Venezuela', 'Colombia', 'Chile', 'Perú', 'Ecuador', 'Bolivia'];

  private pollSub: Subscription | null = null;

  constructor(private bulkImportService: BulkImportService) {
    this.individualForm = this.buildIndividualForm();
  }

  get assignedClubName(): string {
    return this.authService.currentUser()?.organizationName || 'Asignado automáticamente desde tu perfil';
  }

  ngOnInit(): void {
    const initialTab = this.route.snapshot?.queryParamMap?.get('tab');
    if (initialTab === 'individual' || initialTab === 'google' || initialTab === 'file') {
      this.activeTab = initialTab;
    }
    this.loadRecentJobs();
  }

  ngOnDestroy(): void {
    this.stopPolling();
  }

  setTab(tab: 'file' | 'google' | 'individual'): void {
    this.activeTab = tab;
    this.errorMessage = null;
    this.individualError = null;
  }

  private buildIndividualForm(): FormGroup {
    return this.fb.group({
      primerNombre: ['', [Validators.required, Validators.maxLength(100)]],
      segundoNombre: ['', [Validators.maxLength(100)]],
      primerApellido: ['', [Validators.required, Validators.maxLength(100)]],
      segundoApellido: ['', [Validators.maxLength(100)]],
      cedulaIdentidadAtleta: ['', [Validators.maxLength(50)]],
      fechaNacimiento: ['', [Validators.required]],
      genero: ['Masculino', [Validators.required]],
      alturaCm: [null, [Validators.min(90), Validators.max(230)]],
      pesoKg: [null, [Validators.min(20), Validators.max(150)]],
      posicionPrincipal: ['', [Validators.required]],
      posicionSecundaria: [''],
      pieDominante: ['Derecho', [Validators.required]],
      nacionalidad: ['Venezuela', [Validators.required]],
      nombreCompletoTutor: ['', [Validators.required, Validators.maxLength(150)]],
      cedulaIdentidadTutor: ['', [Validators.maxLength(50)]],
      correoTutor: ['', [Validators.required, Validators.email]],
      telefonoTutor: ['', [Validators.pattern(/^$|^\+[1-9]\d{7,14}$/)]]
    });
  }

  submitIndividualAthlete(): void {
    this.individualError = null;
    this.individualSuccess = null;

    if (this.individualForm.invalid) {
      this.individualForm.markAllAsTouched();
      this.individualError = 'Revisa los campos obligatorios o corrige los formatos marcados antes de continuar.';
      return;
    }

    const raw = this.individualForm.getRawValue();
    const payload: ScoutIndividualAthleteRequest = {
      primerNombre: raw.primerNombre.trim(),
      segundoNombre: raw.segundoNombre?.trim() || null,
      primerApellido: raw.primerApellido.trim(),
      segundoApellido: raw.segundoApellido?.trim() || null,
      cedulaIdentidadAtleta: raw.cedulaIdentidadAtleta?.trim() || null,
      fechaNacimiento: raw.fechaNacimiento,
      genero: raw.genero,
      posicionPrincipal: raw.posicionPrincipal,
      posicionSecundaria: raw.posicionSecundaria || null,
      pieDominante: raw.pieDominante,
      nacionalidad: raw.nacionalidad,
      alturaCm: raw.alturaCm !== null && raw.alturaCm !== '' ? Number(raw.alturaCm) : null,
      pesoKg: raw.pesoKg !== null && raw.pesoKg !== '' ? Number(raw.pesoKg) : null,
      nombreCompletoTutor: raw.nombreCompletoTutor.trim(),
      cedulaIdentidadTutor: raw.cedulaIdentidadTutor?.trim() || null,
      correoTutor: raw.correoTutor.trim(),
      telefonoTutor: raw.telefonoTutor?.trim() || null
    };

    this.isSubmittingIndividual = true;
    this.bulkImportService.registerIndividualAthlete(payload).subscribe({
      next: (res) => {
        this.isSubmittingIndividual = false;
        this.individualSuccess = res;
        this.individualForm.reset({
          genero: 'Masculino',
          pieDominante: 'Derecho',
          nacionalidad: 'Venezuela',
          posicionPrincipal: '',
          posicionSecundaria: ''
        });
      },
      error: (err) => {
        this.isSubmittingIndividual = false;
        const fieldErrors = err.error?.errors;
        if (fieldErrors && typeof fieldErrors === 'object') {
          const firstMsg = Object.values(fieldErrors)[0];
          this.individualError = (firstMsg as string) || err.error?.message || 'Error de validación en el formulario.';
        } else {
          this.individualError = err.error?.message || 'No se pudo registrar el atleta. Verifica los datos e intenta nuevamente.';
        }
      }
    });
  }

  resetIndividualForm(): void {
    this.individualSuccess = null;
    this.individualError = null;
    this.individualForm.reset({
      genero: 'Masculino',
      pieDominante: 'Derecho',
      nacionalidad: 'Venezuela',
      posicionPrincipal: '',
      posicionSecundaria: ''
    });
  }

  hasFieldError(controlName: string): boolean {
    const control = this.individualForm.get(controlName);
    return !!control && control.invalid && (control.touched || control.dirty);
  }

  onFileSelected(event: any): void {
    const file = event.target.files?.[0];
    if (file) {
      const ext = file.name.split('.').pop()?.toLowerCase();
      if (ext !== 'xlsx' && ext !== 'csv') {
        this.errorMessage = 'Formato no soportado. Por favor sube un archivo Excel (.xlsx) o CSV (.csv).';
        this.selectedFile = null;
        return;
      }
      this.selectedFile = file;
      this.errorMessage = null;
    }
  }

  onDragOver(event: DragEvent): void {
    event.preventDefault();
    event.stopPropagation();
  }

  onDrop(event: DragEvent): void {
    event.preventDefault();
    event.stopPropagation();
    if (event.dataTransfer?.files?.length) {
      const file = event.dataTransfer.files[0];
      const ext = file.name.split('.').pop()?.toLowerCase();
      if (ext === 'xlsx' || ext === 'csv') {
        this.selectedFile = file;
        this.errorMessage = null;
      } else {
        this.errorMessage = 'Por favor arrastra un archivo .xlsx o .csv válido.';
      }
    }
  }

  downloadTemplate(format: 'xlsx' | 'csv'): void {
    this.bulkImportService.downloadTemplate(format).subscribe({
      next: (blob) => {
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `plantilla_carga_atletas.${format}`;
        a.click();
        window.URL.revokeObjectURL(url);
      },
      error: () => {
        this.errorMessage = 'No se pudo descargar la plantilla en este momento.';
      }
    });
  }

  startFileUpload(): void {
    if (!this.selectedFile) {
      this.errorMessage = 'Selecciona un archivo antes de continuar.';
      return;
    }

    this.isUploading = true;
    this.errorMessage = null;

    this.bulkImportService.uploadFile(this.selectedFile).subscribe({
      next: (job) => {
        this.isUploading = false;
        this.activeJob = job;
        this.selectedFile = null;
        this.startPolling(job.id);
        this.loadRecentJobs();
      },
      error: (err) => {
        this.isUploading = false;
        this.errorMessage = err.error?.message || 'Error al iniciar la carga del archivo.';
      }
    });
  }

  startGoogleSheetImport(): void {
    if (!this.googleSheetUrl || !this.googleSheetUrl.trim()) {
      this.errorMessage = 'Ingresa el enlace o ID de tu hoja de Google Sheets.';
      return;
    }

    this.isUploading = true;
    this.errorMessage = null;

    this.bulkImportService.importGoogleSheet(this.googleSheetUrl.trim()).subscribe({
      next: (job) => {
        this.isUploading = false;
        this.activeJob = job;
        this.googleSheetUrl = '';
        this.startPolling(job.id);
        this.loadRecentJobs();
      },
      error: (err) => {
        this.isUploading = false;
        this.errorMessage = err.error?.message || 'Error al conectar con Google Sheets. Verifica que esté compartido con la cuenta autorizada.';
      }
    });
  }

  private startPolling(jobId: string): void {
    this.stopPolling();
    let polls = 0;
    const maxPolls = 150; // ~5 minutos máximo
    this.pollSub = interval(2000)
      .pipe(
        take(maxPolls),
        switchMap(() => {
          polls++;
          return this.bulkImportService.getJobStatus(jobId);
        })
      )
      .subscribe({
        next: (job) => {
          this.activeJob = job;
          if (job.status === 'COMPLETED' || job.status === 'FAILED') {
            this.stopPolling();
            this.loadRecentJobs();
          } else if (polls >= maxPolls) {
            this.stopPolling();
            this.errorMessage = 'El proceso está tardando más de lo esperado. Verifica el historial en unos segundos.';
          }
        },
        error: () => {
          this.stopPolling();
        }
      });
  }

  private stopPolling(): void {
    if (this.pollSub) {
      this.pollSub.unsubscribe();
      this.pollSub = null;
    }
  }

  loadRecentJobs(): void {
    this.bulkImportService.getScoutJobs().subscribe({
      next: (jobs) => {
        this.recentJobs = jobs;
      },
      error: () => {}
    });
  }

  toggleOmittedDetails(): void {
    this.showOmittedDetails = !this.showOmittedDetails;
  }

  downloadErrorReport(jobId: string): void {
    this.isDownloadingReport = true;
    this.bulkImportService.downloadErrorReport(jobId).subscribe({
      next: (blob) => {
        this.isDownloadingReport = false;
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `reporte_advertencias_${jobId}.csv`;
        a.click();
        window.URL.revokeObjectURL(url);
      },
      error: () => {
        this.isDownloadingReport = false;
        this.errorMessage = 'No se pudo descargar el informe de advertencias.';
      }
    });
  }

  calculateProgress(): number {
    if (!this.activeJob || !this.activeJob.totalRows || this.activeJob.totalRows === 0) {
      return 0;
    }
    return Math.min(100, Math.round((this.activeJob.processedRows / this.activeJob.totalRows) * 100));
  }
}

import { Component, OnInit, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { RouterModule } from '@angular/router';
import { BulkImportService } from '../../core/services/bulk-import.service';
import { BulkImportJobResponse } from '../../core/models/bulk-import.model';
import { Subscription, interval } from 'rxjs';
import { switchMap } from 'rxjs/operators';

@Component({
  selector: 'app-scout-bulk-import',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterModule],
  templateUrl: './scout-bulk-import.component.html'
})
export class ScoutBulkImportComponent implements OnInit, OnDestroy {
  activeTab: 'file' | 'google' = 'file';
  selectedFile: File | null = null;
  googleSheetUrl: string = '';
  isUploading: boolean = false;
  errorMessage: string | null = null;
  activeJob: BulkImportJobResponse | null = null;
  recentJobs: BulkImportJobResponse[] = [];

  private pollSub: Subscription | null = null;

  constructor(private bulkImportService: BulkImportService) {}

  ngOnInit(): void {
    this.loadRecentJobs();
  }

  ngOnDestroy(): void {
    this.stopPolling();
  }

  setTab(tab: 'file' | 'google'): void {
    this.activeTab = tab;
    this.errorMessage = null;
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
    this.pollSub = interval(2000)
      .pipe(switchMap(() => this.bulkImportService.getJobStatus(jobId)))
      .subscribe({
        next: (job) => {
          this.activeJob = job;
          if (job.status === 'COMPLETED' || job.status === 'FAILED') {
            this.stopPolling();
            this.loadRecentJobs();
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

  downloadErrorReport(jobId: string): void {
    this.bulkImportService.downloadErrorReport(jobId).subscribe({
      next: (blob) => {
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `reporte_advertencias_${jobId}.csv`;
        a.click();
        window.URL.revokeObjectURL(url);
      },
      error: () => {
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

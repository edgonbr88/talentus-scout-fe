import { ComponentFixture, TestBed } from '@angular/core/testing';
import { ScoutBulkImportComponent } from './scout-bulk-import.component';
import { BulkImportService } from '../../core/services/bulk-import.service';
import { provideHttpClient } from '@angular/common/http';
import { provideHttpClientTesting } from '@angular/common/http/testing';
import { ActivatedRoute } from '@angular/router';
import { of, throwError } from 'rxjs';
import { BulkImportJobResponse } from '../../core/models/bulk-import.model';

describe('ScoutBulkImportComponent', () => {
  let component: ScoutBulkImportComponent;
  let fixture: ComponentFixture<ScoutBulkImportComponent>;
  let bulkImportServiceSpy: jasmine.SpyObj<BulkImportService>;

  const mockCompletedJobWithoutOmissions: BulkImportJobResponse = {
    id: 'job-101',
    organizationName: 'Academia Talentus',
    sourceType: 'FILE_EXCEL',
    fileName: 'atletas_sub15.xlsx',
    status: 'COMPLETED',
    totalRows: 25,
    processedRows: 25,
    successfulRows: 25,
    failedRows: 0,
    createdAt: '2026-11-17T10:00:00Z',
    updatedAt: '2026-11-17T10:01:00Z'
  };

  const mockCompletedJobWithOmissions: BulkImportJobResponse = {
    id: 'job-102',
    organizationName: 'Academia Talentus',
    sourceType: 'FILE_CSV',
    fileName: 'atletas_sub17.csv',
    status: 'COMPLETED',
    totalRows: 30,
    processedRows: 30,
    successfulRows: 26,
    failedRows: 4,
    warnings: [
      {
        rowNumber: 3,
        athleteName: 'Juan Pérez',
        reason: 'El atleta con documento V-30123456 ya se encuentra registrado en el radar de la academia.',
        actionTaken: 'OMITIDO_DUPLICADO'
      },
      {
        rowNumber: 8,
        athleteName: 'Carlos Rivas',
        reason: 'Correo electrónico del tutor no proporcionado o inválido.',
        actionTaken: 'FILA_OMITIDA'
      }
    ],
    createdAt: '2026-11-17T11:00:00Z',
    updatedAt: '2026-11-17T11:02:00Z'
  };

  const mockRecentJobs: BulkImportJobResponse[] = [
    mockCompletedJobWithoutOmissions,
    mockCompletedJobWithOmissions
  ];

  beforeEach(async () => {
    bulkImportServiceSpy = jasmine.createSpyObj('BulkImportService', [
      'uploadFile',
      'importGoogleSheet',
      'registerIndividualAthlete',
      'getJobStatus',
      'getScoutJobs',
      'downloadTemplate',
      'downloadErrorReport'
    ]);

    bulkImportServiceSpy.getScoutJobs.and.returnValue(of(mockRecentJobs));
    bulkImportServiceSpy.downloadTemplate.and.returnValue(of(new Blob(['dummy content'], { type: 'text/csv' })));
    bulkImportServiceSpy.downloadErrorReport.and.returnValue(of(new Blob(['dummy report'], { type: 'text/csv' })));

    await TestBed.configureTestingModule({
      imports: [ScoutBulkImportComponent],
      providers: [
        provideHttpClient(),
        provideHttpClientTesting(),
        { provide: BulkImportService, useValue: bulkImportServiceSpy },
        { provide: ActivatedRoute, useValue: { snapshot: { paramMap: new Map() } } }
      ]
    }).compileComponents();

    fixture = TestBed.createComponent(ScoutBulkImportComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('debe crearse correctamente e inicializar el historial de importaciones', () => {
    expect(component).toBeTruthy();
    expect(bulkImportServiceSpy.getScoutJobs).toHaveBeenCalled();
    expect(component.recentJobs.length).toBe(2);
  });

  it('debe alternar entre la pestaña de archivo local y Google Sheets', () => {
    expect(component.activeTab).toBe('file');

    component.setTab('google');
    expect(component.activeTab).toBe('google');

    component.setTab('file');
    expect(component.activeTab).toBe('file');
  });

  it('debe mostrar el estado vacío en el monitor cuando activeJob es null', () => {
    component.activeJob = null;
    fixture.detectChanges();

    const compiled = fixture.nativeElement as HTMLElement;
    const emptyState = compiled.querySelector('.bento-card-side .empty-state');
    expect(emptyState).toBeTruthy();
    expect(emptyState?.textContent).toContain('No hay importaciones en curso');
  });

  it('debe mostrar el callout de éxito esmeralda cuando la carga se completa sin omisiones (failedRows === 0)', () => {
    component.activeJob = mockCompletedJobWithoutOmissions;
    fixture.detectChanges();

    const compiled = fixture.nativeElement as HTMLElement;
    const successCallout = compiled.querySelector('.result-callout-success');
    const warningCallout = compiled.querySelector('.result-callout-warning');
    const downloadFooter = compiled.querySelector('.bento-side-footer');

    expect(successCallout).toBeTruthy();
    expect(successCallout?.textContent).toContain('Importación completada con éxito');
    expect(successCallout?.textContent).toContain('Todos los 25 registros fueron validados');
    expect(warningCallout).toBeFalsy();
    expect(downloadFooter).toBeFalsy();
  });

  it('debe mostrar el callout de advertencia ámbar y el botón de descarga cuando existen filas omitidas (failedRows > 0)', () => {
    component.activeJob = mockCompletedJobWithOmissions;
    fixture.detectChanges();

    const compiled = fixture.nativeElement as HTMLElement;
    const warningCallout = compiled.querySelector('.result-callout-warning');
    const successCallout = compiled.querySelector('.result-callout-success');
    const downloadBtn = compiled.querySelector('.btn-download-full');

    expect(warningCallout).toBeTruthy();
    expect(warningCallout?.textContent).toContain('Carga procesada con registros omitidos');
    expect(warningCallout?.textContent).toContain('Se incorporaron 26 de 30 atletas');
    expect(warningCallout?.textContent).toContain('Se omitieron 4 registros');
    expect(successCallout).toBeFalsy();
    expect(downloadBtn).toBeTruthy();
    expect(downloadBtn?.textContent).toContain('Descargar Informe de Omitidos (CSV)');
  });

  it('debe alternar la visualización del acordeón de filas omitidas con toggleOmittedDetails()', () => {
    component.activeJob = mockCompletedJobWithOmissions;
    expect(component.showOmittedDetails).toBeFalse();

    component.toggleOmittedDetails();
    expect(component.showOmittedDetails).toBeTrue();
    fixture.detectChanges();

    const compiled = fixture.nativeElement as HTMLElement;
    const previewBox = compiled.querySelector('.omitted-preview-box');
    expect(previewBox).toBeTruthy();

    const items = compiled.querySelectorAll('.omitted-item');
    expect(items.length).toBe(2);
    expect(items[0].textContent).toContain('Fila #3');
    expect(items[0].textContent).toContain('Juan Pérez');
    expect(items[0].textContent).toContain('Duplicado');

    component.toggleOmittedDetails();
    expect(component.showOmittedDetails).toBeFalse();
    fixture.detectChanges();

    const previewBoxClosed = compiled.querySelector('.omitted-preview-box');
    expect(previewBoxClosed).toBeFalsy();
  });

  it('debe invocar a downloadErrorReport en BulkImportService con el id del trabajo y gestionar el flag isDownloadingReport', () => {
    spyOn(window.URL, 'createObjectURL').and.returnValue('blob:dummy');
    spyOn(window.URL, 'revokeObjectURL').and.stub();

    component.downloadErrorReport('job-102');
    expect(bulkImportServiceSpy.downloadErrorReport).toHaveBeenCalledWith('job-102');
    expect(component.isDownloadingReport).toBeFalse();
  });

  it('debe manejar error al descargar informe de advertencias', () => {
    bulkImportServiceSpy.downloadErrorReport.and.returnValue(throwError(() => new Error('Error de red')));

    component.downloadErrorReport('job-999');
    expect(component.isDownloadingReport).toBeFalse();
    expect(component.errorMessage).toBe('No se pudo descargar el informe de advertencias.');
  });

  it('debe reflejar el conteo de omitidos y el botón de advertencias en la tabla de historial', () => {
    fixture.detectChanges();

    const compiled = fixture.nativeElement as HTMLElement;
    const rows = compiled.querySelectorAll('.custom-table tbody tr');
    expect(rows.length).toBe(2);

    // Primera fila (sin omitidos)
    expect(rows[0].querySelector('.badge-none')?.textContent?.trim()).toBe('0');
    expect(rows[0].querySelector('.btn-report')).toBeFalsy();

    // Segunda fila (con omitidos)
    expect(rows[1].querySelector('.badge-omitted')?.textContent?.trim()).toBe('4');
    const reportBtn = rows[1].querySelector('.btn-report');
    expect(reportBtn).toBeTruthy();
    expect(reportBtn?.textContent).toContain('Descargar Advertencias');
  });

  it('debe calcular el porcentaje de progreso correctamente', () => {
    component.activeJob = null;
    expect(component.calculateProgress()).toBe(0);

    component.activeJob = {
      ...mockCompletedJobWithOmissions,
      totalRows: 50,
      processedRows: 25
    };
    expect(component.calculateProgress()).toBe(50);
  });

  it('debe alternar a la pestaña de registro individual y validar campos obligatorios (TS-82)', () => {
    component.setTab('individual');
    expect(component.activeTab).toBe('individual');

    component.submitIndividualAthlete();
    expect(bulkImportServiceSpy.registerIndividualAthlete).not.toHaveBeenCalled();
    expect(component.individualError).toContain('Revisa los campos obligatorios');
  });

  it('debe registrar un atleta individualmente y mostrar confirmación LOPNNA (TS-82)', () => {
    bulkImportServiceSpy.registerIndividualAthlete.and.returnValue(of({
      athleteId: 'ath-99',
      slug: 'mateo-ramirez',
      athleteFullName: 'Mateo Ramírez',
      clubName: 'Academia Talentus',
      tutorEmail: 'tutor@ejemplo.com',
      isNewTutor: true,
      legalVerificationStatus: 'PENDING_REVIEW'
    }));

    component.setTab('individual');
    component.individualForm.patchValue({
      primerNombre: 'Mateo',
      primerApellido: 'Ramírez',
      fechaNacimiento: '2011-04-18',
      genero: 'Masculino',
      posicionPrincipal: 'Delantero Centro',
      pieDominante: 'Derecho',
      nacionalidad: 'Venezuela',
      alturaCm: 170,
      pesoKg: 60,
      nombreCompletoTutor: 'José Ramírez',
      correoTutor: 'tutor@ejemplo.com',
      telefonoTutor: '+584121234567'
    });

    component.submitIndividualAthlete();

    expect(bulkImportServiceSpy.registerIndividualAthlete).toHaveBeenCalledWith(jasmine.objectContaining({
      primerNombre: 'Mateo',
      primerApellido: 'Ramírez',
      correoTutor: 'tutor@ejemplo.com'
    }));
    expect(component.individualSuccess?.athleteFullName).toBe('Mateo Ramírez');
    expect(component.individualSuccess?.legalVerificationStatus).toBe('PENDING_REVIEW');
    expect(component.individualError).toBeNull();
  });

  it('debe mostrar el mensaje de error cuando falla el registro individual (TS-82)', () => {
    bulkImportServiceSpy.registerIndividualAthlete.and.returnValue(
      throwError(() => ({ status: 409, error: { message: 'El atleta con cédula/DNI V-31234567 ya se encuentra registrado en el sistema' } }))
    );

    component.setTab('individual');
    component.individualForm.patchValue({
      primerNombre: 'Mateo',
      primerApellido: 'Ramírez',
      fechaNacimiento: '2011-04-18',
      posicionPrincipal: 'Delantero Centro',
      nombreCompletoTutor: 'José Ramírez',
      correoTutor: 'tutor@ejemplo.com'
    });

    component.submitIndividualAthlete();

    expect(component.isSubmittingIndividual).toBeFalse();
    expect(component.individualSuccess).toBeNull();
    expect(component.individualError).toContain('ya se encuentra registrado');
  });
});

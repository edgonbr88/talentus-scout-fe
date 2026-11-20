import {
  Component,
  ElementRef,
  PLATFORM_ID,
  ViewChild,
  computed,
  effect,
  inject,
  input,
  signal,
  untracked
} from '@angular/core';
import { CommonModule, isPlatformBrowser } from '@angular/common';
import {
  AbstractControl,
  FormArray,
  FormBuilder,
  FormGroup,
  ReactiveFormsModule,
  Validators
} from '@angular/forms';
import { ScoutDirectoryService } from '../../../../core/services/scout-directory.service';
import {
  ScoutTechnicalAnalysis,
  TechnicalAnalysisItem,
  UpsertScoutTechnicalAnalysisRequest
} from '../../../../core/models/scout-technical-analysis.model';

@Component({
  selector: 'app-scout-technical-analyses',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule],
  templateUrl: './scout-technical-analyses.component.html',
  styleUrls: ['./scout-technical-analyses.component.css']
})
export class ScoutTechnicalAnalysesComponent {
  private fb = inject(FormBuilder);
  private scoutDirectoryService = inject(ScoutDirectoryService);
  private platformId = inject(PLATFORM_ID);

  public athleteId = input.required<string>();
  public athleteName = input<string>('el atleta');
  public isAdmin = input<boolean>(false);

  @ViewChild('analysisDialog')
  private analysisDialogRef?: ElementRef<HTMLDialogElement>;

  public analyses = signal<ScoutTechnicalAnalysis[]>([]);
  public isLoading = signal<boolean>(false);
  public loadError = signal<string | null>(null);
  public statusAnnouncement = signal<string>('');

  public isModalOpen = signal<boolean>(false);
  public editingAnalysisId = signal<string | null>(null);
  public isSaving = signal<boolean>(false);
  public formError = signal<string | null>(null);
  public submitAttempted = signal<boolean>(false);

  public pendingDeleteId = signal<string | null>(null);
  public isDeletingId = signal<string | null>(null);
  public deleteError = signal<string | null>(null);

  private pressedOutsideDialog = false;

  public myAnalysis = computed(() =>
    this.analyses().find((a) => a.editableByCurrentUser) ?? null
  );

  public otherAnalyses = computed(() =>
    this.analyses().filter((a) => !a.editableByCurrentUser)
  );

  public analysisForm = this.fb.group({
    strengths: this.fb.array<FormGroup>([]),
    improvementAreas: this.fb.array<FormGroup>([]),
    scoutingVerdict: [
      '',
      [Validators.required, this.nonBlankValidator, Validators.maxLength(2000)]
    ]
  });

  constructor() {
    effect(() => {
      const currentAthleteId = this.athleteId();
      if (currentAthleteId && isPlatformBrowser(this.platformId)) {
        untracked(() => this.loadAnalyses(currentAthleteId));
      }
    }, { allowSignalWrites: true });
  }

  get strengthsArray(): FormArray<FormGroup> {
    return this.analysisForm.get('strengths') as FormArray<FormGroup>;
  }

  get improvementAreasArray(): FormArray<FormGroup> {
    return this.analysisForm.get('improvementAreas') as FormArray<FormGroup>;
  }

  public loadAnalyses(athleteId: string = this.athleteId()): void {
    this.isLoading.set(true);
    this.loadError.set(null);

    this.scoutDirectoryService.getTechnicalAnalyses(athleteId).subscribe({
      next: (list) => {
        this.analyses.set(list || []);
        this.isLoading.set(false);
      },
      error: (err) => {
        this.isLoading.set(false);
        if (err?.status === 403) {
          this.loadError.set('Tu cuenta de scout debe estar aprobada para consultar análisis técnicos.');
        } else {
          this.loadError.set('No se pudieron cargar los análisis técnicos. Intenta nuevamente.');
        }
      }
    });
  }

  public openCreateModal(): void {
    this.editingAnalysisId.set(null);
    this.formError.set(null);
    this.submitAttempted.set(false);
    this.resetFormWithItems(
      [{ title: '', description: '' }],
      [{ title: '', description: '' }],
      ''
    );
    this.openNativeDialog();
  }

  public openEditModal(analysis: ScoutTechnicalAnalysis): void {
    if (!analysis.editableByCurrentUser) {
      return;
    }
    this.editingAnalysisId.set(analysis.id);
    this.formError.set(null);
    this.submitAttempted.set(false);
    this.resetFormWithItems(
      analysis.strengths?.length ? analysis.strengths : [{ title: '', description: '' }],
      analysis.improvementAreas?.length ? analysis.improvementAreas : [{ title: '', description: '' }],
      analysis.scoutingVerdict || ''
    );
    this.openNativeDialog();
  }

  public closeModal(): void {
    if (this.isSaving()) {
      return;
    }
    const dialog = this.analysisDialogRef?.nativeElement;
    if (dialog?.open) {
      dialog.close();
    } else {
      this.isModalOpen.set(false);
    }
  }

  public onNativeDialogClose(): void {
    const dialog = this.analysisDialogRef?.nativeElement;
    if (dialog) {
      dialog.returnValue = '';
    }
    this.isModalOpen.set(false);
    this.formError.set(null);
  }

  public onNativeDialogCancel(event: Event): void {
    if (this.isSaving()) {
      event.preventDefault();
    }
  }

  public onDialogPointerDown(event: PointerEvent): void {
    const dialog = this.analysisDialogRef?.nativeElement;
    if (!dialog || ('closedBy' in HTMLDialogElement.prototype)) {
      this.pressedOutsideDialog = false;
      return;
    }
    this.pressedOutsideDialog = this.isPointerOutsideDialog(event, dialog);
  }

  public onDialogPointerUp(event: PointerEvent): void {
    const dialog = this.analysisDialogRef?.nativeElement;
    if (!dialog || ('closedBy' in HTMLDialogElement.prototype)) {
      return;
    }
    if (this.pressedOutsideDialog && this.isPointerOutsideDialog(event, dialog)) {
      this.closeModal();
    }
    this.pressedOutsideDialog = false;
  }

  public addStrength(): void {
    if (this.strengthsArray.length >= 10) {
      return;
    }
    this.strengthsArray.push(this.createItemGroup());
  }

  public removeStrength(index: number): void {
    if (this.strengthsArray.length <= 1) {
      return;
    }
    this.strengthsArray.removeAt(index);
  }

  public addImprovementArea(): void {
    if (this.improvementAreasArray.length >= 10) {
      return;
    }
    this.improvementAreasArray.push(this.createItemGroup());
  }

  public removeImprovementArea(index: number): void {
    if (this.improvementAreasArray.length <= 1) {
      return;
    }
    this.improvementAreasArray.removeAt(index);
  }

  public submitAnalysis(): void {
    if (this.isSaving()) {
      return;
    }

    this.submitAttempted.set(true);
    this.analysisForm.markAllAsTouched();
    this.formError.set(null);

    if (this.analysisForm.invalid) {
      this.focusFirstInvalidField();
      return;
    }

    const raw = this.analysisForm.getRawValue();
    const payload: UpsertScoutTechnicalAnalysisRequest = {
      strengths: (raw.strengths || []).map((item) => ({
        title: (item['title'] || '').trim(),
        description: (item['description'] || '').trim()
      })),
      improvementAreas: (raw.improvementAreas || []).map((item) => ({
        title: (item['title'] || '').trim(),
        description: (item['description'] || '').trim()
      })),
      scoutingVerdict: (raw.scoutingVerdict || '').trim()
    };

    const editingId = this.editingAnalysisId();
    this.isSaving.set(true);

    const request$ = editingId
      ? this.scoutDirectoryService.updateTechnicalAnalysis(this.athleteId(), editingId, payload)
      : this.scoutDirectoryService.createTechnicalAnalysis(this.athleteId(), payload);

    request$.subscribe({
      next: (saved) => {
        this.isSaving.set(false);
        this.analyses.update((current) => {
          if (editingId) {
            return current.map((item) => (item.id === editingId ? saved : item));
          }
          return [saved, ...current];
        });
        this.statusAnnouncement.set(
          editingId
            ? 'Tu análisis técnico fue actualizado correctamente.'
            : 'Tu análisis técnico fue publicado para la red de scouts.'
        );
        this.closeModal();
      },
      error: (err) => {
        this.isSaving.set(false);
        const backendMessage = err?.error?.message;
        if (err?.status === 409) {
          this.formError.set(
            backendMessage ||
              'Ya registraste un análisis técnico para este atleta. Edita tu evaluación existente.'
          );
        } else if (err?.status === 403) {
          this.formError.set(
            backendMessage || 'No tienes autorización para modificar este análisis técnico.'
          );
        } else {
          this.formError.set(
            backendMessage || 'No se pudo guardar el análisis técnico. Revisa los campos e intenta de nuevo.'
          );
        }
      }
    });
  }

  public requestDelete(analysisId: string): void {
    this.deleteError.set(null);
    this.pendingDeleteId.set(analysisId);
  }

  public cancelDelete(): void {
    if (this.isDeletingId()) {
      return;
    }
    this.pendingDeleteId.set(null);
    this.deleteError.set(null);
  }

  public confirmDelete(analysis: ScoutTechnicalAnalysis): void {
    if (!analysis.deletableByCurrentUser || this.isDeletingId()) {
      return;
    }

    this.isDeletingId.set(analysis.id);
    this.deleteError.set(null);

    this.scoutDirectoryService.deleteTechnicalAnalysis(this.athleteId(), analysis.id).subscribe({
      next: () => {
        this.isDeletingId.set(null);
        this.pendingDeleteId.set(null);
        this.analyses.update((current) => current.filter((item) => item.id !== analysis.id));
        this.statusAnnouncement.set('El análisis técnico fue eliminado correctamente.');
      },
      error: (err) => {
        this.isDeletingId.set(null);
        this.deleteError.set(
          err?.error?.message || 'No se pudo eliminar el análisis técnico. Intenta nuevamente.'
        );
      }
    });
  }

  public shouldShowControlError(control: AbstractControl | null): boolean {
    return Boolean(control && control.invalid && (control.touched || this.submitAttempted()));
  }

  public formatDate(isoDate: string): string {
    if (!isoDate) return '';
    try {
      return new Intl.DateTimeFormat('es-VE', {
        day: '2-digit',
        month: 'short',
        year: 'numeric'
      }).format(new Date(isoDate));
    } catch {
      return isoDate;
    }
  }

  private createItemGroup(item?: TechnicalAnalysisItem): FormGroup {
    return this.fb.group({
      title: [
        item?.title || '',
        [Validators.required, this.nonBlankValidator, Validators.maxLength(120)]
      ],
      description: [
        item?.description || '',
        [Validators.required, this.nonBlankValidator, Validators.maxLength(600)]
      ]
    });
  }

  private resetFormWithItems(
    strengths: TechnicalAnalysisItem[],
    improvementAreas: TechnicalAnalysisItem[],
    verdict: string
  ): void {
    this.strengthsArray.clear();
    strengths.forEach((s) => this.strengthsArray.push(this.createItemGroup(s)));

    this.improvementAreasArray.clear();
    improvementAreas.forEach((i) => this.improvementAreasArray.push(this.createItemGroup(i)));

    this.analysisForm.get('scoutingVerdict')?.setValue(verdict);
    this.analysisForm.markAsPristine();
    this.analysisForm.markAsUntouched();
  }

  private nonBlankValidator(control: AbstractControl): { required: true } | null {
    const val = typeof control.value === 'string' ? control.value.trim() : '';
    return val.length > 0 ? null : { required: true };
  }

  private openNativeDialog(): void {
    this.isModalOpen.set(true);
    if (!isPlatformBrowser(this.platformId)) {
      return;
    }
    const dialog = this.analysisDialogRef?.nativeElement;
    if (dialog && typeof dialog.showModal === 'function' && !dialog.open) {
      dialog.showModal();
    }
  }

  private isPointerOutsideDialog(event: PointerEvent, dialog: HTMLDialogElement): boolean {
    const rect = dialog.getBoundingClientRect();
    return (
      event.clientX < rect.left ||
      event.clientX > rect.right ||
      event.clientY < rect.top ||
      event.clientY > rect.bottom
    );
  }

  private focusFirstInvalidField(): void {
    if (!isPlatformBrowser(this.platformId)) {
      return;
    }
    const dialog = this.analysisDialogRef?.nativeElement;
    if (!dialog) {
      return;
    }
    const firstInvalid = dialog.querySelector<HTMLElement>(
      'input.ng-invalid, textarea.ng-invalid'
    );
    firstInvalid?.focus();
  }
}

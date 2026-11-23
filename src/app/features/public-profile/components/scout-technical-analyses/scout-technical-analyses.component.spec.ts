import { ComponentFixture, TestBed } from '@angular/core/testing';
import { of, throwError } from 'rxjs';
import { ScoutTechnicalAnalysesComponent } from './scout-technical-analyses.component';
import { ScoutDirectoryService } from '../../../../core/services/scout-directory.service';
import { ScoutTechnicalAnalysis } from '../../../../core/models/scout-technical-analysis.model';

describe('ScoutTechnicalAnalysesComponent', () => {
  let component: ScoutTechnicalAnalysesComponent;
  let fixture: ComponentFixture<ScoutTechnicalAnalysesComponent>;
  let scoutDirectoryServiceSpy: jasmine.SpyObj<ScoutDirectoryService>;

  const colleagueReport: ScoutTechnicalAnalysis = {
    id: 'ana-colleague',
    athleteId: 'ath-1',
    scoutUserId: 'scout-2',
    scoutFullName: 'Carlos Mendoza',
    scoutRole: 'Ojeador Nacional',
    organizationName: 'Selección Regional',
    strengths: [{ title: 'Visión periférica', description: 'Identifica líneas de pase interiores.' }],
    improvementAreas: [{ title: 'Golpeo largo', description: 'Mejorar elevación en cambios de orientación.' }],
    scoutingVerdict: 'Perfil asociativo interesante para seguimiento.',
    editableByCurrentUser: false,
    deletableByCurrentUser: false,
    createdAt: '2026-11-18T12:00:00Z',
    updatedAt: '2026-11-18T12:00:00Z'
  };

  const myReport: ScoutTechnicalAnalysis = {
    id: 'ana-mine',
    athleteId: 'ath-1',
    scoutUserId: 'scout-1',
    scoutFullName: 'Miguel Morena',
    scoutRole: 'Jefe de Scouting',
    organizationName: 'Deportivo Miranda',
    strengths: [{ title: 'Élite técnica', description: 'Primer control limpio.' }],
    improvementAreas: [{ title: 'Seguridad en duelos', description: 'Afrontar contacto físico sin temor.' }],
    scoutingVerdict: 'Prospecto de altísima riqueza técnica.',
    editableByCurrentUser: true,
    deletableByCurrentUser: true,
    createdAt: '2026-11-19T12:00:00Z',
    updatedAt: '2026-11-19T12:00:00Z'
  };

  beforeEach(async () => {
    scoutDirectoryServiceSpy = jasmine.createSpyObj('ScoutDirectoryService', [
      'getTechnicalAnalyses',
      'createTechnicalAnalysis',
      'updateTechnicalAnalysis',
      'deleteTechnicalAnalysis'
    ]);
    scoutDirectoryServiceSpy.getTechnicalAnalyses.and.returnValue(of([]));

    await TestBed.configureTestingModule({
      imports: [ScoutTechnicalAnalysesComponent],
      providers: [{ provide: ScoutDirectoryService, useValue: scoutDirectoryServiceSpy }]
    }).compileComponents();

    fixture = TestBed.createComponent(ScoutTechnicalAnalysesComponent);
    component = fixture.componentInstance;
    fixture.componentRef.setInput('athleteId', 'ath-1');
    fixture.componentRef.setInput('athleteName', 'Fabio Ciarpaglini');
    fixture.componentRef.setInput('isAdmin', false);
    fixture.detectChanges();
  });

  it('should render empty state and CTA when no analyses exist', () => {
    const compiled = fixture.nativeElement as HTMLElement;
    expect(scoutDirectoryServiceSpy.getTechnicalAnalyses).toHaveBeenCalledWith('ath-1');
    expect(compiled.querySelector('.analyses-empty-state')).toBeTruthy();
    expect(compiled.querySelector('.btn-write-analysis')?.textContent).toContain('Redactar mi análisis');
  });

  it('should display own report with edit/delete actions and colleague report as read-only', () => {
    scoutDirectoryServiceSpy.getTechnicalAnalyses.and.returnValue(of([myReport, colleagueReport]));
    component.loadAnalyses('ath-1');
    fixture.detectChanges();

    const compiled = fixture.nativeElement as HTMLElement;
    const ownCard = compiled.querySelector('.analysis-report-own');
    const colleagueCard = compiled.querySelector('.analysis-report-colleague');

    expect(ownCard).toBeTruthy();
    expect(ownCard?.querySelector('.btn-report-edit')).toBeTruthy();
    expect(ownCard?.querySelector('.btn-report-delete')).toBeTruthy();
    expect(colleagueCard).toBeTruthy();
    expect(colleagueCard?.querySelector('.btn-report-edit')).toBeNull();
    expect(colleagueCard?.querySelector('.btn-report-delete')).toBeNull();
  });

  it('should create analysis with dynamic FormArray items and update list reactively', () => {
    scoutDirectoryServiceSpy.createTechnicalAnalysis.and.returnValue(of(myReport));

    component.openCreateModal();
    component.addStrength();
    expect(component.strengthsArray.length).toBe(2);

    component.strengthsArray.at(0).setValue({
      title: 'Élite técnica',
      description: 'Primer control limpio.'
    });
    component.strengthsArray.at(1).setValue({
      title: 'Lectura de juego',
      description: 'Asociación en espacios reducidos.'
    });
    component.improvementAreasArray.at(0).setValue({
      title: 'Seguridad en duelos',
      description: 'Afrontar contacto físico sin temor.'
    });
    component.analysisForm.get('scoutingVerdict')?.setValue('Prospecto de altísima riqueza técnica.');

    component.submitAnalysis();

    expect(scoutDirectoryServiceSpy.createTechnicalAnalysis).toHaveBeenCalledWith('ath-1', {
      strengths: [
        { title: 'Élite técnica', description: 'Primer control limpio.' },
        { title: 'Lectura de juego', description: 'Asociación en espacios reducidos.' }
      ],
      improvementAreas: [
        { title: 'Seguridad en duelos', description: 'Afrontar contacto físico sin temor.' }
      ],
      scoutingVerdict: 'Prospecto de altísima riqueza técnica.'
    });
    expect(component.myAnalysis()?.id).toBe('ana-mine');
  });

  it('should edit own analysis via updateTechnicalAnalysis', () => {
    const updatedReport = { ...myReport, scoutingVerdict: 'Dictamen actualizado.' };
    scoutDirectoryServiceSpy.updateTechnicalAnalysis.and.returnValue(of(updatedReport));
    component.analyses.set([myReport]);

    component.openEditModal(myReport);
    component.analysisForm.get('scoutingVerdict')?.setValue('Dictamen actualizado.');
    component.submitAnalysis();

    expect(scoutDirectoryServiceSpy.updateTechnicalAnalysis).toHaveBeenCalledWith('ath-1', 'ana-mine', {
      strengths: myReport.strengths,
      improvementAreas: myReport.improvementAreas,
      scoutingVerdict: 'Dictamen actualizado.'
    });
    expect(component.myAnalysis()?.scoutingVerdict).toBe('Dictamen actualizado.');
  });

  it('should delete own analysis after inline confirmation', () => {
    scoutDirectoryServiceSpy.deleteTechnicalAnalysis.and.returnValue(of(void 0));
    component.analyses.set([myReport, colleagueReport]);
    fixture.detectChanges();

    component.requestDelete('ana-mine');
    fixture.detectChanges();
    expect((fixture.nativeElement as HTMLElement).querySelector('.delete-confirm-bar')).toBeTruthy();

    component.confirmDelete(myReport);
    expect(scoutDirectoryServiceSpy.deleteTechnicalAnalysis).toHaveBeenCalledWith('ath-1', 'ana-mine');
    expect(component.analyses().length).toBe(1);
    expect(component.analyses()[0].id).toBe('ana-colleague');
  });

  it('should show moderation delete button on colleague report when isAdmin is true', () => {
    const adminModColleague: ScoutTechnicalAnalysis = {
      ...colleagueReport,
      deletableByCurrentUser: true
    };
    fixture.componentRef.setInput('isAdmin', true);
    component.analyses.set([adminModColleague]);
    fixture.detectChanges();

    const colleagueCard = (fixture.nativeElement as HTMLElement).querySelector('.analysis-report-colleague');
    expect(colleagueCard?.querySelector('.btn-report-delete')?.textContent).toContain('Moderar / Eliminar');
  });

  it('should display conflict message when backend responds 409', () => {
    scoutDirectoryServiceSpy.createTechnicalAnalysis.and.returnValue(
      throwError(() => ({ status: 409, error: { message: 'Ya registraste un análisis técnico para este atleta.' } }))
    );

    component.openCreateModal();
    component.strengthsArray.at(0).setValue({ title: 'A', description: 'Desc A' });
    component.improvementAreasArray.at(0).setValue({ title: 'B', description: 'Desc B' });
    component.analysisForm.get('scoutingVerdict')?.setValue('Veredicto');
    component.submitAnalysis();

    expect(component.formError()).toBe('Ya registraste un análisis técnico para este atleta.');
  });
});

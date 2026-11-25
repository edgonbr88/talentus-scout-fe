import { ComponentFixture, TestBed, fakeAsync, tick } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { signal } from '@angular/core';
import { of } from 'rxjs';
import { ScoutNetworkComponent } from './scout-network.component';
import { ScoutNetworkService } from '../../core/services/scout-network.service';
import { AuthService } from '../../core/auth/auth.service';
import { PageResponse } from '../../core/models/scout-directory.model';
import {
  ScoutNetworkFiltersResponse,
  ScoutNetworkItem,
  ScoutNetworkSettings
} from '../../core/models/scout-network.model';

describe('ScoutNetworkComponent (TS-85)', () => {
  let component: ScoutNetworkComponent;
  let fixture: ComponentFixture<ScoutNetworkComponent>;
  let networkServiceSpy: jasmine.SpyObj<ScoutNetworkService>;

  const mockItems: ScoutNetworkItem[] = [
    {
      scoutProfileId: 'sp-1',
      userId: 'u-1',
      fullName: 'Andrea Colega',
      profilePhotoUrl: 'https://cdn.talentus.app/photos/scouts/andrea.jpg',
      organizationName: 'Caracas FC Academy',
      clubId: 'club-1',
      clubLogoUrl: 'https://cdn.talentus.app/logos/caracas.png',
      clubVerifiedOfficial: true,
      scoutRole: 'Ojeadora Sub-17',
      country: 'Venezuela',
      state: 'Miranda',
      linkedinUrl: 'https://www.linkedin.com/in/andrea',
      sameClubAsViewer: true,
      whatsappAvailable: true,
      emailAvailable: false,
      createdAt: '2026-11-24T10:00:00Z'
    },
    {
      scoutProfileId: 'sp-2',
      userId: 'u-2',
      fullName: 'Diego Privado',
      profilePhotoUrl: null,
      organizationName: 'Bogota Club',
      clubId: null,
      clubLogoUrl: null,
      clubVerifiedOfficial: false,
      scoutRole: 'Director Deportivo',
      country: 'Colombia',
      state: 'Cundinamarca',
      linkedinUrl: null,
      sameClubAsViewer: false,
      whatsappAvailable: false,
      emailAvailable: false,
      createdAt: '2026-11-24T10:00:00Z'
    }
  ];

  const mockPage: PageResponse<ScoutNetworkItem> = {
    content: mockItems,
    totalElements: 2,
    totalPages: 1,
    size: 12,
    number: 0,
    first: true,
    last: true,
    empty: false
  };

  const mockFilters: ScoutNetworkFiltersResponse = {
    organizations: [
      { name: 'Caracas FC Academy', clubId: 'club-1', logoUrl: 'https://cdn.talentus.app/logos/caracas.png', verifiedOfficial: true },
      { name: 'Bogota Club', clubId: null, logoUrl: null, verifiedOfficial: false }
    ],
    countries: ['Colombia', 'Venezuela'],
    viewerOrganizationName: 'Caracas FC Academy',
    canFilterSameClub: true
  };

  const mockSettings: ScoutNetworkSettings = {
    profilePhotoUrl: null,
    organizationName: 'Caracas FC Academy',
    scoutRole: 'Director Deportivo',
    country: 'Venezuela',
    state: 'Distrito Capital',
    linkedinUrl: '',
    showInNetwork: true,
    showWhatsappInNetwork: true,
    showEmailInNetwork: true
  };

  beforeEach(async () => {
    networkServiceSpy = jasmine.createSpyObj('ScoutNetworkService', [
      'getNetwork',
      'getFilters',
      'contactScout',
      'getMyNetworkSettings',
      'updateMyNetworkSettings',
      'uploadPublicPhoto',
      'deletePublicPhoto'
    ]);

    networkServiceSpy.getNetwork.and.returnValue(of(mockPage));
    networkServiceSpy.getFilters.and.returnValue(of(mockFilters));
    networkServiceSpy.getMyNetworkSettings.and.returnValue(of(mockSettings));
    networkServiceSpy.updateMyNetworkSettings.and.returnValue(of({
      ...mockSettings,
      showWhatsappInNetwork: false
    }));

    const authServiceStub = {
      currentUser: signal({
        id: 'u-viewer',
        email: 'viewer@talentus.test',
        fullName: 'Roberto Viewer',
        role: 'SCOUT'
      })
    };

    await TestBed.configureTestingModule({
      imports: [ScoutNetworkComponent],
      providers: [
        provideRouter([]),
        { provide: ScoutNetworkService, useValue: networkServiceSpy },
        { provide: AuthService, useValue: authServiceStub }
      ]
    }).compileComponents();

    fixture = TestBed.createComponent(ScoutNetworkComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('debe cargar colegas y facetas iniciales, mostrando distintivo de mismo club y privacidad', () => {
    expect(component).toBeTruthy();
    expect(component.colleagues().length).toBe(2);

    const compiled = fixture.nativeElement as HTMLElement;
    expect(compiled.textContent).toContain('Andrea Colega');
    expect(compiled.textContent).toContain('Tu mismo club');
    expect(compiled.textContent).toContain('Canal oculto por privacidad');
  });

  it('debe filtrar por búsqueda de texto con debounce y por chip de mismo club', fakeAsync(() => {
    networkServiceSpy.getNetwork.calls.reset();

    component.onSearchQueryChange('Andrea');
    expect(networkServiceSpy.getNetwork).not.toHaveBeenCalled();
    tick(350);
    expect(networkServiceSpy.getNetwork).toHaveBeenCalledWith(jasmine.objectContaining({
      query: 'Andrea',
      page: 0
    }));

    networkServiceSpy.getNetwork.calls.reset();
    component.toggleSameClubOnly();
    expect(component.sameClubOnly()).toBeTrue();
    expect(networkServiceSpy.getNetwork).toHaveBeenCalledWith(jasmine.objectContaining({
      sameClubOnly: true,
      page: 0
    }));
  }));

  it('debe invocar contacto auditado de WhatsApp y abrir la URL externa', () => {
    const openSpy = spyOn(component, 'openExternalContact');
    networkServiceSpy.contactScout.and.returnValue(of({
      channel: 'WHATSAPP',
      contactUrl: 'https://wa.me/584142220002?text=Hola',
      targetName: 'Andrea Colega',
      organizationName: 'Caracas FC Academy'
    }));

    component.contactColleague(mockItems[0], 'WHATSAPP');

    expect(networkServiceSpy.contactScout).toHaveBeenCalledWith('sp-1', 'WHATSAPP');
    expect(openSpy).toHaveBeenCalledWith('https://wa.me/584142220002?text=Hola', 'WHATSAPP');
  });

  it('debe abrir el modal de perfil/privacidad para rol SCOUT y guardar preferencias', () => {
    component.openSettingsModal();
    expect(component.showSettingsModal()).toBeTrue();
    expect(networkServiceSpy.getMyNetworkSettings).toHaveBeenCalled();

    component.editShowWhatsapp.set(false);
    component.saveNetworkSettings();

    expect(networkServiceSpy.updateMyNetworkSettings).toHaveBeenCalledWith(jasmine.objectContaining({
      showWhatsappInNetwork: false
    }));
    expect(component.settingsSuccess()).toContain('guardadas');
  });
});

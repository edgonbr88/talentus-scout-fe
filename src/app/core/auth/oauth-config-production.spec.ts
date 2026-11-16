import { TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { provideRouter } from '@angular/router';
import { SocialAuthManagerService } from './social-auth-manager.service';
import { LoginComponent } from '../../features/auth/login/login.component';
import { environment } from '../../../environments/environment';

describe('TS-77: OAuth2 Hardening y Configuración en Producción', () => {
  let service: SocialAuthManagerService;
  let httpMock: HttpTestingController;

  beforeEach(() => {
    localStorage.clear();
    TestBed.configureTestingModule({
      providers: [
        provideHttpClient(),
        provideHttpClientTesting(),
        provideRouter([])
      ]
    });
    service = TestBed.inject(SocialAuthManagerService);
    httpMock = TestBed.inject(HttpTestingController);
  });

  afterEach(() => {
    httpMock.verify();
    localStorage.clear();
  });

  it('debe cargar el Google Client ID dinámicamente desde GET /api/v1/auth/oauth-config', async () => {
    const req = httpMock.expectOne(`${environment.apiBaseUrl}/auth/oauth-config`);
    expect(req.request.method).toBe('GET');
    req.flush({
      googleClientId: 'prod-google-123.apps.googleusercontent.com',
      microsoftClientId: 'ms-guid-456',
      mockEnabled: false
    });

    await service.ensureOAuthConfigLoaded();

    expect(service.getGoogleClientId()).toBe('prod-google-123.apps.googleusercontent.com');
    expect(service.getMicrosoftClientId()).toBe('ms-guid-456');
  });

  it('LoginComponent debe ocultar el botón de configuración técnica cuando isProduction es true', () => {
    const configReq = httpMock.expectOne(`${environment.apiBaseUrl}/auth/oauth-config`);
    configReq.flush({ googleClientId: '', microsoftClientId: '', mockEnabled: false });

    const fixture = TestBed.createComponent(LoginComponent);
    const component = fixture.componentInstance;

    // En desarrollo (!isProduction) el botón sí aparece
    (component as unknown as { isProduction: boolean }).isProduction = false;
    fixture.detectChanges();
    expect(fixture.nativeElement.querySelector('.btn-config-oauth')).not.toBeNull();

    // En producción (isProduction = true) el botón desaparece y openConfigModal se ignora
    (component as unknown as { isProduction: boolean }).isProduction = true;
    component.openConfigModal('all');
    fixture.detectChanges();

    expect(component.showConfigModal).toBeFalse();
    expect(fixture.nativeElement.querySelector('.btn-config-oauth')).toBeNull();
  });
});

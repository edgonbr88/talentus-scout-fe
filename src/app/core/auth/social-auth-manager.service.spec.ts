import { TestBed } from '@angular/core/testing';
import { SocialAuthManagerService } from './social-auth-manager.service';
import { routes } from '../../app.routes';
import { LoginComponent } from '../../features/auth/login/login.component';

describe('SocialAuthManagerService y Ruta OAuth', () => {
  let service: SocialAuthManagerService;

  beforeEach(() => {
    localStorage.clear();
    TestBed.configureTestingModule({});
    service = TestBed.inject(SocialAuthManagerService);
  });

  afterEach(() => {
    localStorage.clear();
    if (window.location.hash) {
      window.history.replaceState(null, '', window.location.pathname);
    }
  });

  it('debe tener registrada la ruta auth/login apuntando a LoginComponent en app.routes.ts', () => {
    const authLoginRoute = routes.find(r => r.path === 'auth/login');
    expect(authLoginRoute).toBeDefined();
    expect(authLoginRoute?.component).toBe(LoginComponent);
  });

  it('debe retornar false si no hay id_token, access_token ni error en la URL', () => {
    window.history.replaceState(null, '', '/auth/login');
    expect(service.handleOAuthCallbackIfPresent()).toBeFalse();
  });

  it('debe capturar id_token en hash, guardarlo en localStorage, notificar y cerrar el popup cuando está en contexto popup', () => {
    localStorage.setItem('talentus_oauth_pending_provider', 'google');
    const closeSpy = spyOn(window, 'close');
    window.history.replaceState(null, '', '/auth/login#id_token=eyJhbGciOiJSUzI1NiJ9.mock.sig&token_type=Bearer');

    const handled = service.handleOAuthCallbackIfPresent();

    expect(handled).toBeTrue();
    expect(localStorage.getItem('talentus_oauth_pending_token')).toBe('eyJhbGciOiJSUzI1NiJ9.mock.sig');
    expect(closeSpy).toHaveBeenCalled();
    expect(window.location.hash).toBe('');
  });

  it('debe capturar error OAuth en hash/query, guardarlo en localStorage y cerrar el popup', () => {
    localStorage.setItem('talentus_oauth_pending_provider', 'google');
    const closeSpy = spyOn(window, 'close');
    window.history.replaceState(null, '', '/auth/login#error=access_denied');

    const handled = service.handleOAuthCallbackIfPresent();

    expect(handled).toBeTrue();
    expect(localStorage.getItem('talentus_oauth_pending_error')).toContain('cancelado o denegado');
    expect(closeSpy).toHaveBeenCalled();
  });
});

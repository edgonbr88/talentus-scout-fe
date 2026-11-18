import { TestBed } from '@angular/core/testing';
import { provideHttpClient, withInterceptors } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { provideRouter, Router } from '@angular/router';
import { AuthService } from './auth.service';
import { jwtInterceptor } from './jwt.interceptor';

describe('TS-78: AuthService + jwtInterceptor hidratación de sesión tras redirección externa', () => {
  let httpMock: HttpTestingController;
  let router: Router;

  beforeEach(() => {
    localStorage.clear();
    TestBed.configureTestingModule({
      providers: [
        provideHttpClient(withInterceptors([jwtInterceptor])),
        provideHttpClientTesting(),
        provideRouter([])
      ]
    });
    httpMock = TestBed.inject(HttpTestingController);
    router = TestBed.inject(Router);
    spyOn(router, 'navigate');
  });

  afterEach(() => {
    httpMock.verify();
    localStorage.clear();
  });

  it('debe cargar /api/v1/auth/me con Bearer token sin provocar NG0200 ni cerrar sesión al volver de VexPay', async () => {
    localStorage.setItem('talentus_token', 'jwt-persistente-vexpay');

    const authService = TestBed.inject(AuthService);
    expect(authService.isAuthenticated()).toBeTrue();

    await new Promise((resolve) => queueMicrotask(() => resolve(undefined)));

    const req = httpMock.expectOne('/api/v1/auth/me');
    expect(req.request.headers.get('Authorization')).toBe('Bearer jwt-persistente-vexpay');
    req.flush({
      id: 'usr-1',
      email: 'tutor@talentus.app',
      fullName: 'Carlos Tutor',
      role: 'TUTOR',
      status: 'ACTIVE',
      isProfileCompleted: true
    });

    expect(authService.isAuthenticated()).toBeTrue();
    expect(authService.currentUser()?.role).toBe('TUTOR');
    expect(localStorage.getItem('talentus_token')).toBe('jwt-persistente-vexpay');
    expect(router.navigate).not.toHaveBeenCalledWith(['/login']);
  });

  it('debe cerrar sesión si el servidor responde 401 al validar el token', async () => {
    localStorage.setItem('talentus_token', 'jwt-expirado');

    const authService = TestBed.inject(AuthService);
    await new Promise((resolve) => queueMicrotask(() => resolve(undefined)));

    const req = httpMock.expectOne('/api/v1/auth/me');
    req.flush({ message: 'Unauthorized' }, { status: 401, statusText: 'Unauthorized' });

    expect(authService.isAuthenticated()).toBeFalse();
    expect(localStorage.getItem('talentus_token')).toBeNull();
    expect(router.navigate).toHaveBeenCalledWith(['/login']);
  });
});

import { TestBed } from '@angular/core/testing';
import { Router } from '@angular/router';
import { bulkImportGuard } from './bulk-import.guard';
import { AuthService } from './auth.service';
import { signal } from '@angular/core';

describe('bulkImportGuard', () => {
  let mockAuthService: jasmine.SpyObj<AuthService>;
  let mockRouter: jasmine.SpyObj<Router>;

  beforeEach(() => {
    mockAuthService = jasmine.createSpyObj('AuthService', [], {
      isAuthenticated: signal(false),
      canAccessBulkImport: signal(false),
      isAdmin: signal(false),
      isVerifiedScout: signal(false),
      isScout: signal(false)
    });
    mockRouter = jasmine.createSpyObj('Router', ['navigate']);

    TestBed.configureTestingModule({
      providers: [
        { provide: AuthService, useValue: mockAuthService },
        { provide: Router, useValue: mockRouter }
      ]
    });
  });

  it('debe permitir acceso cuando el usuario está autenticado y tiene permiso canAccessBulkImport', () => {
    (mockAuthService.isAuthenticated as any).set(true);
    (mockAuthService.canAccessBulkImport as any).set(true);

    const result = TestBed.runInInjectionContext(() => bulkImportGuard({} as any, {} as any));
    expect(result).toBeTrue();
    expect(mockRouter.navigate).not.toHaveBeenCalled();
  });

  it('debe redirigir a /login cuando el usuario no está autenticado', () => {
    (mockAuthService.isAuthenticated as any).set(false);

    const result = TestBed.runInInjectionContext(() => bulkImportGuard({} as any, {} as any));
    expect(result).toBeFalse();
    expect(mockRouter.navigate).toHaveBeenCalledWith(['/login']);
  });

  it('debe redirigir a /admin/scouts cuando el usuario es ADMIN', () => {
    (mockAuthService.isAuthenticated as any).set(true);
    (mockAuthService.canAccessBulkImport as any).set(false);
    (mockAuthService.isAdmin as any).set(true);

    const result = TestBed.runInInjectionContext(() => bulkImportGuard({} as any, {} as any));
    expect(result).toBeFalse();
    expect(mockRouter.navigate).toHaveBeenCalledWith(['/admin/scouts']);
  });

  it('debe redirigir a /scout/directory cuando es un scout verificado sin permiso de carga masiva', () => {
    (mockAuthService.isAuthenticated as any).set(true);
    (mockAuthService.canAccessBulkImport as any).set(false);
    (mockAuthService.isAdmin as any).set(false);
    (mockAuthService.isVerifiedScout as any).set(true);

    const result = TestBed.runInInjectionContext(() => bulkImportGuard({} as any, {} as any));
    expect(result).toBeFalse();
    expect(mockRouter.navigate).toHaveBeenCalledWith(['/scout/directory']);
  });

  it('debe redirigir a /auth/scout-pending-audit cuando es un scout no verificado', () => {
    (mockAuthService.isAuthenticated as any).set(true);
    (mockAuthService.canAccessBulkImport as any).set(false);
    (mockAuthService.isAdmin as any).set(false);
    (mockAuthService.isVerifiedScout as any).set(false);
    (mockAuthService.isScout as any).set(true);

    const result = TestBed.runInInjectionContext(() => bulkImportGuard({} as any, {} as any));
    expect(result).toBeFalse();
    expect(mockRouter.navigate).toHaveBeenCalledWith(['/auth/scout-pending-audit']);
  });

  it('debe redirigir a /dashboard para otros roles autenticados (ej. tutor o atleta)', () => {
    (mockAuthService.isAuthenticated as any).set(true);
    (mockAuthService.canAccessBulkImport as any).set(false);
    (mockAuthService.isAdmin as any).set(false);
    (mockAuthService.isVerifiedScout as any).set(false);
    (mockAuthService.isScout as any).set(false);

    const result = TestBed.runInInjectionContext(() => bulkImportGuard({} as any, {} as any));
    expect(result).toBeFalse();
    expect(mockRouter.navigate).toHaveBeenCalledWith(['/dashboard']);
  });
});

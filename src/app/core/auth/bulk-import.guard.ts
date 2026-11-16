import { CanActivateFn, Router } from '@angular/router';
import { inject } from '@angular/core';
import { AuthService } from './auth.service';

export const bulkImportGuard: CanActivateFn = () => {
  const authService = inject(AuthService);
  const router = inject(Router);

  if (!authService.isAuthenticated()) {
    router.navigate(['/login']);
    return false;
  }

  if (authService.canAccessBulkImport()) {
    return true;
  }

  if (authService.isAdmin()) {
    router.navigate(['/admin/scouts']);
    return false;
  }

  if (authService.isVerifiedScout()) {
    router.navigate(['/scout/directory']);
    return false;
  }

  if (authService.isScout()) {
    router.navigate(['/auth/scout-pending-audit']);
    return false;
  }

  router.navigate(['/dashboard']);
  return false;
};

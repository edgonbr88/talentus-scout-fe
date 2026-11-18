import { CanActivateFn, Router } from '@angular/router';
import { inject, PLATFORM_ID } from '@angular/core';
import { isPlatformBrowser } from '@angular/common';
import { AuthService } from './auth.service';

export const authGuard: CanActivateFn = () => {
  const authService = inject(AuthService);
  const router = inject(Router);
  const platformId = inject(PLATFORM_ID);

  if (!isPlatformBrowser(platformId)) {
    return false;
  }

  if (authService.isAuthenticated()) {
    if (authService.needsProfileCompletion()) {
      router.navigate(['/auth/complete-profile']);
      return false;
    }
    return true;
  }

  router.navigate(['/login']);
  return false;
};

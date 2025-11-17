import { inject } from '@angular/core';
import { Router } from '@angular/router';
import { SetupService } from '../services/setup.service';

export const setupGuard = () => {
  const setupService = inject(SetupService);
  const router = inject(Router);

  const hostname = window.location.hostname;
  const isDev = hostname === 'localhost' || hostname === '127.0.0.1';

  if (!setupService.isSetupComplete()) {
    router.navigate(['/setup']);
    return false;
  }

  // In dev: once setup is complete, allow home so we can see logs
  return true;
};

export const setupCompleteGuard = () => {
  const setupService = inject(SetupService);
  const router = inject(Router);

  const hostname = window.location.hostname;
  const isDev = hostname === 'localhost' || hostname === '127.0.0.1';

  if (isDev) {
    return true;
  }

  if (setupService.isSetupComplete()) {
    router.navigate(['/']);
    return false;
  }
  return true;
};

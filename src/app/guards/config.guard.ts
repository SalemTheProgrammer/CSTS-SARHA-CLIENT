import { inject } from '@angular/core';
import { Router } from '@angular/router';
import { StorageService } from '../services/storage.service';

export const configGuard = async () => {
  const storageService = inject(StorageService);
  const router = inject(Router);

  const hasConfig = await storageService.hasConfig();
  
  if (!hasConfig) {
    router.navigate(['/import']);
    return false;
  }
  
  return true;
};

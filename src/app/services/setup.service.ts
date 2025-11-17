import { Injectable } from '@angular/core';

@Injectable({
  providedIn: 'root'
})
export class SetupService {
  private readonly SETUP_KEY = 'app_setup_complete';
  private readonly PASSPHRASE_KEY = 'app_passphrase';
  private readonly ENCRYPTED_FILE_KEY = 'app_encrypted_file';

  isSetupComplete(): boolean {
    return localStorage.getItem(this.SETUP_KEY) === 'true';
  }

  savePassphrase(passphrase: string): void {
    localStorage.setItem(this.PASSPHRASE_KEY, passphrase);
    localStorage.setItem(this.SETUP_KEY, 'true');
  }

  getPassphrase(): string | null {
    return localStorage.getItem(this.PASSPHRASE_KEY);
  }

  resetSetup(): void {
    localStorage.removeItem(this.SETUP_KEY);
    localStorage.removeItem(this.PASSPHRASE_KEY);
    localStorage.removeItem(this.ENCRYPTED_FILE_KEY);
  }

  saveEncryptedFile(content: string): void {
    localStorage.setItem(this.ENCRYPTED_FILE_KEY, content);
    localStorage.setItem(this.SETUP_KEY, 'true');
  }

  getEncryptedFile(): string | null {
    return localStorage.getItem(this.ENCRYPTED_FILE_KEY);
  }
}

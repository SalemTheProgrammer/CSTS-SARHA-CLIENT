import { Injectable } from '@angular/core';
import { invoke } from '@tauri-apps/api/core';
import { CryptoService } from './crypto.service';

@Injectable({
  providedIn: 'root'
})
export class DataService {
  constructor(private cryptoService: CryptoService) {}

  async saveEncryptedName(name: string): Promise<void> {
    // Encrypt the name before saving
    const encryptedName = this.cryptoService.encrypt({ name });
    
    // Save ONLY encrypted data to database
    await invoke('save_encrypted_data', { encryptedName });
  }

  async getDecryptedNames(): Promise<string[]> {
    // Get encrypted data from database
    const encryptedNames = await invoke<string[]>('get_encrypted_data');
    
    // Decrypt for display only (not saved)
    const decryptedNames: string[] = [];
    for (const encrypted of encryptedNames) {
      try {
        const decrypted = this.cryptoService.decrypt(encrypted);
        decryptedNames.push(decrypted.name);
      } catch (error) {
        console.error('Failed to decrypt name:', error);
      }
    }
    
    return decryptedNames;
  }

  async deleteAllData(): Promise<void> {
    await invoke('delete_all_data');
  }
}

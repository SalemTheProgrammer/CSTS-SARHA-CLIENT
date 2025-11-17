import { Injectable } from '@angular/core';
import { invoke } from '@tauri-apps/api/core';

@Injectable({
  providedIn: 'root'
})
export class StorageService {
  async saveEncryptedConfig(encryptedData: string): Promise<void> {
    await invoke('save_encrypted_config', { encryptedData });
  }

  async getEncryptedConfig(): Promise<string> {
    return await invoke<string>('get_encrypted_config');
  }

  async hasConfig(): Promise<boolean> {
    return await invoke<boolean>('has_config');
  }
}

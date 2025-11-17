import { Injectable } from '@angular/core';
import { CryptoService } from './crypto.service';
import { StorageService } from './storage.service';

export interface AppConfig {
  deviceIp: string;
  deviceName: string;
}

@Injectable({
  providedIn: 'root'
})
export class ConfigService {
  private config: AppConfig | null = null;

  constructor(
    private cryptoService: CryptoService,
    private storageService: StorageService
  ) {}

  async loadConfig(): Promise<AppConfig> {
    const encrypted = await this.storageService.getEncryptedConfig();
    const decrypted = this.cryptoService.decrypt(encrypted);
    this.config = decrypted;
    return this.config!;
  }

  async saveConfig(configText: string): Promise<void> {
    const configObj = JSON.parse(configText);
    const encrypted = this.cryptoService.encrypt(configObj);
    await this.storageService.saveEncryptedConfig(encrypted);
    this.config = configObj;
  }

  getConfig(): AppConfig | null {
    return this.config;
  }
}

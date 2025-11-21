import { Injectable } from '@angular/core';
import { CryptoService } from './crypto.service';
import { StorageService } from './storage.service';

export interface AppConfig {
  deviceIp: string;
  deviceName: string;
  numeroArgument?: string | number;
  numeroAgrument?: string | number;
  nom?: string;
  societe?: string;
  numeroNavire?: string;
  immatricule?: string;
  numeroASV?: string;
  indicatifAppel?: string;
  portAttache?: string;
  latitude?: number;
  longitude?: number;
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
    let configObj: AppConfig;

    // Prefer plain JSON when possible to avoid false positives with base64 validation
    try {
      const parsed = JSON.parse(configText);
      configObj = parsed as AppConfig;
    } catch (_jsonErr) {
      // Not valid JSON; try to treat as encrypted payload
      if (!this.cryptoService.isValidEncryptedFormat(configText)) {
        throw new Error('Input is neither valid JSON nor a valid encrypted string.');
      }
      const decrypted: any = this.cryptoService.decrypt(configText);
      configObj = decrypted as AppConfig;
    }

    const encrypted = this.cryptoService.encrypt(configObj);
    await this.storageService.saveEncryptedConfig(encrypted);
    this.config = configObj;
  }

  getConfig(): AppConfig | null {
    return this.config;
  }
}

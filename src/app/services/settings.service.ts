import { Injectable } from '@angular/core';
import { invoke } from '@tauri-apps/api/core';

export interface AppSettings {
  downloadPath: string;
  autoDownload: boolean;
}

@Injectable({
  providedIn: 'root'
})
export class SettingsService {
  private settings: AppSettings = {
    downloadPath: '',
    autoDownload: true
  };
  
  private hasDownloadedThisSession = false;

  constructor() {
    this.loadSettings();
  }

  async loadSettings(): Promise<void> {
    const saved = localStorage.getItem('sarha_settings');
    if (saved) {
      this.settings = JSON.parse(saved);
    } else {
      // Get default downloads path
      try {
        this.settings.downloadPath = await invoke<string>('get_downloads_path');
      } catch (error) {
        console.error('Failed to get downloads path:', error);
      }
    }
  }

  getSettings(): AppSettings {
    return { ...this.settings };
  }

  async updateSettings(settings: Partial<AppSettings>): Promise<void> {
    this.settings = { ...this.settings, ...settings };
    localStorage.setItem('sarha_settings', JSON.stringify(this.settings));
  }

  getDownloadPath(): string {
    return this.settings.downloadPath;
  }

  isAutoDownloadEnabled(): boolean {
    return this.settings.autoDownload;
  }

  hasDownloaded(): boolean {
    return this.hasDownloadedThisSession;
  }

  markAsDownloaded(): void {
    this.hasDownloadedThisSession = true;
  }

  resetDownloadFlag(): void {
    this.hasDownloadedThisSession = false;
  }
}

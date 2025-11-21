import { Injectable } from '@angular/core';
import { fetch } from '@tauri-apps/plugin-http';
import { environment } from '../../environments/environment';

@Injectable({
  providedIn: 'root'
})
export class DeviceService {
  private readonly DEFAULT_DEVICE_URL = environment.defaultDeviceUrl;
  private readonly TIMEOUT_MS = environment.connectionTimeout;
  private readonly STORAGE_KEY = 'custom_device_url';

  /**
   * Get the current API URL (custom or default)
   */
  getApiUrl(): string {
    const customUrl = localStorage.getItem(this.STORAGE_KEY);
    return customUrl || this.DEFAULT_DEVICE_URL;
  }

  /**
   * Set a custom API URL
   */
  setApiUrl(url: string): void {
    if (this.validateApiUrl(url)) {
      localStorage.setItem(this.STORAGE_KEY, url);
    } else {
      throw new Error('Invalid API URL format');
    }
  }

  /**
   * Reset to default API URL
   */
  resetApiUrl(): void {
    localStorage.removeItem(this.STORAGE_KEY);
  }

  /**
   * Validate API URL format
   */
  validateApiUrl(url: string): boolean {
    try {
      const urlObj = new URL(url);
      return urlObj.protocol === 'http:' || urlObj.protocol === 'https:';
    } catch {
      return false;
    }
  }

  /**
   * Check device connection with optional custom URL
   */
  async checkDeviceConnection(customUrl?: string): Promise<boolean> {
    const targetUrl = customUrl || this.getApiUrl();

    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), this.TIMEOUT_MS);

      const response = await fetch(targetUrl, {
        method: 'GET',
        signal: controller.signal
      });

      clearTimeout(timeoutId);
      return response.ok || response.status < 500;
    } catch (error) {
      console.error('Device connection check failed:', error);
      return false;
    }
  }
}

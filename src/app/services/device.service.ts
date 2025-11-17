import { Injectable } from '@angular/core';
import { fetch } from '@tauri-apps/plugin-http';

@Injectable({
  providedIn: 'root'
})
export class DeviceService {
  private readonly DEVICE_URL = 'http://192.168.1.140';
  private readonly TIMEOUT_MS = 5000;

  async checkDeviceConnection(): Promise<boolean> {
    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), this.TIMEOUT_MS);

      const response = await fetch(this.DEVICE_URL, {
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

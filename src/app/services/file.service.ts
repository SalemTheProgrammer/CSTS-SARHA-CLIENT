import { Injectable } from '@angular/core';
import { fetch } from '@tauri-apps/plugin-http';
import { DeviceService } from './device.service';

export interface DeviceFile {
  name: string;
  size: string;
  sizeBytes: number;
  downloadUrl: string;
}

@Injectable({
  providedIn: 'root'
})
export class FileService {
  private cachedFiles: DeviceFile[] | null = null;
  private lastFetchTime: number = 0;

  constructor(private deviceService: DeviceService) { }

  /**
   * Get the current device URL dynamically
   */
  private getDeviceUrl(): string {
    return this.deviceService.getApiUrl();
  }

  async fetchFileList(forceRefresh: boolean = false): Promise<DeviceFile[]> {
    const now = Date.now();

    // Return cached files if available (indefinite cache until forceRefresh)
    if (!forceRefresh && this.cachedFiles) {
      return this.cachedFiles;
    }
    try {
      const deviceUrl = this.getDeviceUrl();
      const response = await fetch(deviceUrl, {
        method: 'GET'
      });

      if (!response.ok) {
        throw new Error('Failed to fetch file list');
      }

      const html = await response.text();
      this.cachedFiles = this.parseFileList(html);
      this.lastFetchTime = now;
      return this.cachedFiles;
    } catch (error) {
      console.error('Error fetching file list:', error);
      throw error;
    }
  }

  clearCache(): void {
    this.cachedFiles = null;
    this.lastFetchTime = 0;
  }

  private parseFileList(html: string): DeviceFile[] {
    const parser = new DOMParser();
    const doc = parser.parseFromString(html, 'text/html');
    const rows = doc.querySelectorAll('table tr');
    const files: DeviceFile[] = [];
    const deviceUrl = this.getDeviceUrl();

    rows.forEach((row, index) => {
      if (index === 0) return; // Skip header row

      const cells = row.querySelectorAll('td');
      if (cells.length >= 2) {
        const name = cells[0].textContent?.trim() || '';
        const sizeText = cells[1].textContent?.trim() || '';
        const sizeBytes = this.parseSizeToBytes(sizeText);

        // Only include non-empty files (> 1 KB)
        if (sizeBytes > 1024) {
          files.push({
            name,
            size: sizeText,
            sizeBytes,
            downloadUrl: `${deviceUrl}/download?file=${encodeURIComponent(name)}`
          });
        }
      }
    });

    return files;
  }

  private parseSizeToBytes(sizeText: string): number {
    const match = sizeText.match(/([\d.]+)\s*(B|KB|MB|GB)/i);
    if (!match) return 0;

    const value = parseFloat(match[1]);
    const unit = match[2].toUpperCase();

    switch (unit) {
      case 'B': return value;
      case 'KB': return value * 1024;
      case 'MB': return value * 1024 * 1024;
      case 'GB': return value * 1024 * 1024 * 1024;
      default: return 0;
    }
  }

  async downloadFile(file: DeviceFile): Promise<Blob> {
    try {
      const deviceUrl = this.getDeviceUrl();

      // Le serveur utilise un formulaire POST avec le paramètre "download"
      const formData = new FormData();
      formData.append('download', `download_${file.name}`);

      const response = await fetch(deviceUrl, {
        method: 'POST',
        body: formData
      });

      if (!response.ok) {
        throw new Error(`Failed to download file: ${file.name}`);
      }

      return await response.blob();
    } catch (error) {
      console.error('Error downloading file:', error);
      throw error;
    }
  }
}

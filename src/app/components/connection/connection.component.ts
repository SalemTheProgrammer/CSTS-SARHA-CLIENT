import { Component, OnInit } from '@angular/core';
import { Router } from '@angular/router';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { DeviceService, ApInfo } from '../../services/device.service';

type ConnectionMode = 'wifi' | 'ap' | 'configuring';

@Component({
  selector: 'app-connection',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './connection.component.html',
  styleUrls: ['./connection.component.css']
})
export class ConnectionComponent implements OnInit {
  // Connection states
  isConnecting = true;
  connectionFailed = false;
  connectionSuccess = false;
  connectionMode: ConnectionMode = 'wifi';

  // API configuration
  showApiConfig = false;
  customApiUrl = '';
  apiUrlError = '';
  currentApiUrl = '';

  // Access Point info
  apInfo: ApInfo | null = null;

  constructor(
    private deviceService: DeviceService,
    private router: Router
  ) { }

  ngOnInit(): void {
    this.currentApiUrl = this.deviceService.getApiUrl();
    this.customApiUrl = this.currentApiUrl;
    this.tryWifiConnection();
  }

  /**
   * Try WiFi connection first (default behavior)
   */
  async tryWifiConnection(): Promise<void> {
    this.connectionMode = 'wifi';
    this.isConnecting = true;
    this.connectionFailed = false;
    this.connectionSuccess = false;

    const isConnected = await this.deviceService.checkDeviceConnection();

    if (isConnected) {
      this.connectionSuccess = true;
      setTimeout(() => {
        this.router.navigate(['/main']);
      }, 2000);
    } else {
      this.connectionFailed = true;
    }

    this.isConnecting = false;
  }

  /**
   * Switch to Access Point mode
   */
  switchToApMode(): void {
    this.connectionMode = 'ap';
    this.connectionFailed = false;
    this.apInfo = this.deviceService.getDeviceApInfo();
  }

  /**
   * Return to WiFi mode
   */
  backToWifi(): void {
    this.connectionMode = 'wifi';
    this.apInfo = null;
    this.tryWifiConnection();
  }

  /**
   * Retry connection
   */
  retry(): void {
    if (this.connectionMode === 'wifi') {
      this.tryWifiConnection();
    } else {
      this.backToWifi();
    }
  }

  /**
   * Open API configuration panel
   */
  openApiConfig(): void {
    this.showApiConfig = true;
    this.customApiUrl = this.deviceService.getApiUrl();
    this.apiUrlError = '';
  }

  /**
   * Close API configuration panel
   */
  closeApiConfig(): void {
    this.showApiConfig = false;
    this.apiUrlError = '';
  }

  /**
   * Save API configuration
   */
  async saveApiConfig(): Promise<void> {
    this.apiUrlError = '';

    if (!this.customApiUrl.trim()) {
      this.apiUrlError = 'API URL cannot be empty';
      return;
    }

    if (!this.deviceService.validateApiUrl(this.customApiUrl)) {
      this.apiUrlError = 'Invalid URL format. Must start with http:// or https://';
      return;
    }

    try {
      this.deviceService.setApiUrl(this.customApiUrl);
      this.currentApiUrl = this.customApiUrl;
      this.closeApiConfig();

      // Retry connection with new URL
      this.tryWifiConnection();
    } catch (error) {
      this.apiUrlError = 'Failed to save API URL';
    }
  }

  /**
   * Reset to default API URL
   */
  resetToDefault(): void {
    this.deviceService.resetApiUrl();
    this.customApiUrl = this.deviceService.getApiUrl();
    this.currentApiUrl = this.customApiUrl;
    this.apiUrlError = '';
  }
}

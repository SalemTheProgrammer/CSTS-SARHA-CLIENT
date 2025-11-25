import { Component, OnInit, OnDestroy, HostListener } from '@angular/core';
import { Router } from '@angular/router';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { DeviceService } from '../../services/device.service';

@Component({
  selector: 'app-connection',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './connection.component.html',
  styleUrls: ['./connection.component.css']
})
export class ConnectionComponent implements OnInit, OnDestroy {
  // Connection states
  isConnecting = false; // Don't show loading spinner
  connectionFailed = true; // Show status cards by default
  connectionSuccess = false;
  isWifiConnected = navigator.onLine; // Track actual network status

  // API configuration
  showPasswordPrompt = false;
  showApiConfig = false;
  customApiUrl = '';
  configPassword = '';
  passwordError = '';
  apiUrlError = '';
  currentApiUrl = '';
  private readonly REQUIRED_PASSWORD = 'CST_sarha_2025';

  // Retry countdown
  retryCountdown = 2;
  private retryInterval: any;

  constructor(
    private deviceService: DeviceService,
    private router: Router
  ) { }

  ngOnInit(): void {
    this.currentApiUrl = this.deviceService.getApiUrl();
    this.customApiUrl = this.currentApiUrl;
    this.updateNetworkStatus(); // Initial check
    this.tryWifiConnection();
  }

  ngOnDestroy(): void {
    // Clear interval on component destroy
    if (this.retryInterval) {
      clearInterval(this.retryInterval);
    }
  }

  @HostListener('window:online')
  @HostListener('window:offline')
  updateNetworkStatus(): void {
    this.isWifiConnected = navigator.onLine;
  }

  /**
   * Try WiFi connection
   */
  async tryWifiConnection(): Promise<void> {
    // Don't show connecting state, keep showing status cards
    this.connectionFailed = true; // Always show status cards
    this.connectionSuccess = false;

    const isConnected = await this.deviceService.checkDeviceConnection();

    if (isConnected) {
      this.connectionSuccess = true;
      this.connectionFailed = false;
      // Clear retry interval if it exists
      if (this.retryInterval) {
        clearInterval(this.retryInterval);
      }
      setTimeout(() => {
        this.router.navigate(['/main']);
      }, 2000);
    } else {
      this.connectionFailed = true;
      this.startRetryCountdown();
    }
  }

  /**
   * Start countdown for automatic retry
   */
  startRetryCountdown(): void {
    this.retryCountdown = 2;

    // Clear any existing interval
    if (this.retryInterval) {
      clearInterval(this.retryInterval);
    }

    this.retryInterval = setInterval(() => {
      this.retryCountdown--;

      if (this.retryCountdown <= 0) {
        clearInterval(this.retryInterval);
        // Keep status cards visible during retry
        this.retry();
      }
    }, 1000);
  }

  /**
   * Retry connection
   */
  retry(): void {
    this.tryWifiConnection();
  }

  /**
   * Open password prompt (first step)
   */
  openApiConfig(): void {
    this.showPasswordPrompt = true;
    this.configPassword = '';
    this.passwordError = '';
  }

  /**
   * Verify password and open configuration if correct
   */
  verifyPassword(): void {
    if (this.configPassword !== this.REQUIRED_PASSWORD) {
      this.passwordError = 'Incorrect password. Access denied.';
      return;
    }

    // Password is correct, show the configuration modal
    this.showPasswordPrompt = false;
    this.showApiConfig = true;
    this.customApiUrl = this.deviceService.getApiUrl();
    this.configPassword = '';
    this.passwordError = '';
    this.apiUrlError = '';
  }

  /**
   * Close password prompt
   */
  closePasswordPrompt(): void {
    this.showPasswordPrompt = false;
    this.configPassword = '';
    this.passwordError = '';
  }

  /**
   * Close API configuration panel
   */
  closeApiConfig(): void {
    this.showApiConfig = false;
    this.apiUrlError = '';
    this.configPassword = '';
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

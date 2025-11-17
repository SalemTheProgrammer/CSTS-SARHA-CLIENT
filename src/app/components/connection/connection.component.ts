import { Component, OnInit } from '@angular/core';
import { Router } from '@angular/router';
import { CommonModule } from '@angular/common';
import { DeviceService } from '../../services/device.service';

@Component({
  selector: 'app-connection',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './connection.component.html',
  styleUrls: ['./connection.component.css']
})
export class ConnectionComponent implements OnInit {
  isConnecting = true;
  connectionFailed = false;
  connectionSuccess = false;

  constructor(
    private deviceService: DeviceService,
    private router: Router
  ) {}

  ngOnInit(): void {
    this.checkConnection();
  }

  async checkConnection(): Promise<void> {
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

  retry(): void {
    this.checkConnection();
  }
}

import { Component, OnInit, OnDestroy } from "@angular/core";
import { Router, NavigationEnd, RouterOutlet } from "@angular/router";
import { DeviceService } from "./services/device.service";
import { filter } from "rxjs/operators";

@Component({
  selector: "app-root",
  imports: [RouterOutlet],
  templateUrl: "./app.component.html",
  styleUrl: "./app.component.css",
})
export class AppComponent implements OnInit, OnDestroy {
  private connectionCheckInterval: any;
  private readonly CHECK_INTERVAL_MS = 5000; // Check every 5 seconds
  private currentRoute = '';

  constructor(
    private deviceService: DeviceService,
    private router: Router
  ) { }

  ngOnInit(): void {
    // Track current route
    this.router.events
      .pipe(filter(event => event instanceof NavigationEnd))
      .subscribe((event: any) => {
        this.currentRoute = event.url;
      });

    // Start connection monitoring
    this.startConnectionMonitoring();
  }

  ngOnDestroy(): void {
    // Clean up interval on component destroy
    if (this.connectionCheckInterval) {
      clearInterval(this.connectionCheckInterval);
    }
  }

  /**
   * Start periodic connection monitoring
   */
  private startConnectionMonitoring(): void {
    this.connectionCheckInterval = setInterval(async () => {
      // Skip check if we're already on the connection page
      if (this.currentRoute.includes('/connection')) {
        return;
      }

      // Check device connection
      const isConnected = await this.deviceService.checkDeviceConnection();

      // Redirect to connection page if disconnected
      if (!isConnected) {
        console.log('Device disconnected, redirecting to connection page...');
        this.router.navigate(['/connection']);
      }
    }, this.CHECK_INTERVAL_MS);
  }
}

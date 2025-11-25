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
export class AppComponent implements OnInit {
  private currentRoute = '';

  constructor(
    private router: Router
  ) { }

  ngOnInit(): void {
    // Track current route
    this.router.events
      .pipe(filter(event => event instanceof NavigationEnd))
      .subscribe((event: any) => {
        this.currentRoute = event.url;
      });
  }
}

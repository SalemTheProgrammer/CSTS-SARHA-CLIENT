import { Routes } from "@angular/router";
import { ImportConfigComponent } from './components/import-config/import-config.component';
import { ConnectionComponent } from './components/connection/connection.component';
import { MainComponent } from './components/main/main.component';
import { SettingsComponent } from './components/settings/settings.component';
import { configGuard } from './guards/config.guard';
import { GraphiqueComponent } from './components/graphique/graphique.component';

export const routes: Routes = [
  { path: '', redirectTo: '/connection', pathMatch: 'full' },
  { path: 'import', component: ImportConfigComponent },
  { path: 'connection', component: ConnectionComponent, canActivate: [configGuard] },
  { path: 'main', component: MainComponent, canActivate: [configGuard] },
  { path: 'settings', component: SettingsComponent, canActivate: [configGuard] },
  { path: 'graphique', component: GraphiqueComponent, canActivate: [configGuard] }
];
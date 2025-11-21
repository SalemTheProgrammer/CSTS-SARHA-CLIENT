import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { open } from '@tauri-apps/plugin-dialog';
import { SettingsService, AppSettings } from '../../services/settings.service';
import { ChartSettingsService, ChartSettings } from '../../services/chart-settings.service';
import { SetupService } from '../../services/setup.service';
import { StorageService } from '../../services/storage.service';
import { GraphiqueDataService } from '../../services/graphique-data.service';

@Component({
  selector: 'app-settings',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './settings.component.html',
  styleUrls: ['./settings.component.css']
})
export class SettingsComponent implements OnInit {
  settings: AppSettings = {
    downloadPath: '',
    autoDownload: true
  };

  chartSettings: ChartSettings = {
    pointsPerPage: 1440,
    displayStep: 1,
    tempMin: -55,
    tempMax: 125,
    sensors: []
  };

  constructor(
    private settingsService: SettingsService,
    private chartSettingsService: ChartSettingsService,
    private router: Router,
    private setupService: SetupService,
    private storageService: StorageService,
    private graphiqueDataService: GraphiqueDataService
  ) {}

  async ngOnInit(): Promise<void> {
    await this.settingsService.loadSettings();
    this.settings = this.settingsService.getSettings();
    this.chartSettings = this.chartSettingsService.getSettings();
  }

  async selectFolder(): Promise<void> {
    try {
      const selected = await open({
        directory: true,
        multiple: false,
        title: 'Choisir le dossier de téléchargement'
      });

      if (selected && typeof selected === 'string') {
        this.settings.downloadPath = selected;
      }
    } catch (error) {
      console.error('Error selecting folder:', error);
    }
  }

  get activeSensors() {
    return this.chartSettings.sensors.filter(s => s.enabled);
  }

  addSensor(): void {
    const nextSensor = this.chartSettings.sensors.find(s => !s.enabled);
    if (nextSensor) {
      nextSensor.enabled = true;
    } else {
      alert('Maximum 12 capteurs atteints.');
    }
  }

  removeSensor(id: number): void {
    const sensor = this.chartSettings.sensors.find(s => s.id === id);
    if (sensor) {
      sensor.enabled = false;
      // Optional: reset values?
      sensor.label = '';
      sensor.min = undefined;
      sensor.max = undefined;
      sensor.mode = undefined;
    }
  }

  async saveSettings(): Promise<void> {
    await this.settingsService.updateSettings(this.settings);
    this.chartSettingsService.saveSettings(this.chartSettings);
    alert('Paramètres enregistrés avec succès');
  }

  resetChartSettings(): void {
    this.chartSettings = this.chartSettingsService.resetToDefaults();
  }

  goBack(): void {
    this.router.navigate(['/main']);
  }

  async resetApp(): Promise<void> {
    const confirmReset = confirm(
      'Réinitialiser l\'application supprimera les paramètres sauvegardés et nécessitera une nouvelle configuration. Continuer ?'
    );
    if (!confirmReset) {
      return;
    }

    try {
      // Clear setup-related keys (passphrase, flags, encrypted file placeholder)
      this.setupService.resetSetup();

      // Clear cached chart data
      this.graphiqueDataService.clearData();

      // Clear UI/settings preferences
      localStorage.removeItem('sarha_settings');
      localStorage.removeItem('chart_settings');

      // Optionally reset in-memory flags
      this.settingsService.loadSettings();
      this.chartSettingsService.resetToDefaults();

      // Remove persisted encrypted config in backend (if implemented)
      await this.storageService.deleteConfig();

      alert('Application réinitialisée. Vous allez être redirigé vers l\'import.');
      // Navigate to import to pick the file to decrypt
      this.router.navigateByUrl('/import');
    } catch (e) {
      console.error('Erreur lors de la réinitialisation', e);
      alert('Échec de la réinitialisation. Consultez la console.');
    }
  }

}

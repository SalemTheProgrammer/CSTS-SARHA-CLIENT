import { Injectable } from '@angular/core';

export interface SensorConfig {
  id: number;
  enabled: boolean;
  label: string;
  color: string;
  min?: number;
  max?: number;
  mode?: number; // Consigne
}

export interface ChartSettings {
  pointsPerPage: number;      // nombre des points par page
  displayStep: number;         // pas d'affichage
  tempMin: number;            // température minimum
  tempMax: number;            // température maximum
  sensors: SensorConfig[];
}

@Injectable({
  providedIn: 'root'
})
export class ChartSettingsService {
  private readonly STORAGE_KEY = 'chart_settings';
  
  private defaultSensors: SensorConfig[] = [
    { id: 1, enabled: true, label: 'Frigo', min: 4, mode: 0, color: 'rgb(255, 99, 132)' },
    { id: 2, enabled: true, label: 'Stock', min: -20, mode: 0, color: 'rgb(54, 162, 235)' },
    { id: 3, enabled: true, label: 'Tunnel', min: -40, mode: 0, color: '#000000' },
    { id: 4, enabled: false, label: '', mode: 0, color: '#00994C' },
    { id: 5, enabled: false, label: '', mode: 0, color: '#0000CC' },
    { id: 6, enabled: false, label: '', mode: 0, color: '#994C00' },
    { id: 7, enabled: false, label: '', mode: 0, color: '#6600CC' },
    { id: 8, enabled: false, label: '', mode: 0, color: '#CC00CC' },
    { id: 9, enabled: false, label: '', mode: 0, color: '#00FFFF' },
    { id: 10, enabled: false, label: '', mode: 0, color: '#999900' },
    { id: 11, enabled: false, label: '', mode: 0, color: '#0066CC' },
    { id: 12, enabled: false, label: '', mode: 0, color: '#FF6666' },
  ];

  private defaultSettings: ChartSettings = {
    pointsPerPage: 1440,
    displayStep: 1,
    tempMin: -55,
    tempMax: 125,
    sensors: this.defaultSensors
  };

  constructor() {}

  getSettings(): ChartSettings {
    const stored = localStorage.getItem(this.STORAGE_KEY);
    if (stored) {
      try {
        const parsed = JSON.parse(stored);
        // Merge with defaults to ensure sensors exist if loading old settings
        if (!parsed.sensors || parsed.sensors.length === 0) {
          parsed.sensors = [...this.defaultSensors];
        }
        return parsed;
      } catch (e) {
        console.error('Failed to parse chart settings', e);
      }
    }
    return { ...this.defaultSettings };
  }

  saveSettings(settings: ChartSettings): void {
    localStorage.setItem(this.STORAGE_KEY, JSON.stringify(settings));
  }

  resetToDefaults(): ChartSettings {
    const defaults = { ...this.defaultSettings };
    this.saveSettings(defaults);
    return defaults;
  }
}

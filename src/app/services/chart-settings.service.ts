import { Injectable } from '@angular/core';

export interface ChartSettings {
  pointsPerPage: number;      // nombre des points par page
  displayStep: number;         // pas d'affichage
  tempMin: number;            // température minimum
  tempMax: number;            // température maximum
}

@Injectable({
  providedIn: 'root'
})
export class ChartSettingsService {
  private readonly STORAGE_KEY = 'chart_settings';
  
  private defaultSettings: ChartSettings = {
    pointsPerPage: 1440,
    displayStep: 1,
    tempMin: -30,
    tempMax: 50
  };

  constructor() {}

  getSettings(): ChartSettings {
    const stored = localStorage.getItem(this.STORAGE_KEY);
    if (stored) {
      try {
        return JSON.parse(stored);
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

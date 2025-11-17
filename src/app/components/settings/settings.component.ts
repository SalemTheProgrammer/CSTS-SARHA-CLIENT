import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { open } from '@tauri-apps/plugin-dialog';
import { SettingsService, AppSettings } from '../../services/settings.service';

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

  constructor(
    private settingsService: SettingsService,
    private router: Router
  ) {}

  async ngOnInit(): Promise<void> {
    await this.settingsService.loadSettings();
    this.settings = this.settingsService.getSettings();
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

  async saveSettings(): Promise<void> {
    await this.settingsService.updateSettings(this.settings);
    alert('Paramètres enregistrés avec succès');
  }

  goBack(): void {
    this.router.navigate(['/main']);
  }
}

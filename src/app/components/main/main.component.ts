import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router } from '@angular/router';
import { writeTextFile } from '@tauri-apps/plugin-fs';
import { ConfigService, AppConfig } from '../../services/config.service';
import { FileService, DeviceFile } from '../../services/file.service';
import { SettingsService } from '../../services/settings.service';
import { SetupService } from '../../services/setup.service';

@Component({
  selector: 'app-main',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './main.component.html',
  styleUrls: ['./main.component.css']
})
export class MainComponent implements OnInit {
  config: AppConfig | null = null;
  files: DeviceFile[] = [];
  isLoading = true;
  errorMessage = '';
  isDownloading = false;
  downloadProgress = 0;
  downloadTotal = 0;
  isLoadingGraph = false;
  constructor(
    private configService: ConfigService,
    private fileService: FileService,
    private settingsService: SettingsService,
    private setupService: SetupService,
    private router: Router
  ) {}

  async ngOnInit(): Promise<void> {
    this.config = this.configService.getConfig();
    await this.settingsService.loadSettings();
    await this.loadFiles();
  }

  async loadFiles(forceRefresh: boolean = false): Promise<void> {
    this.isLoading = true;
    this.errorMessage = '';

    try {
      this.files = await this.fileService.fetchFileList(forceRefresh);
      
      // Auto-download if enabled and not already downloaded in this session
      if (forceRefresh && this.settingsService.isAutoDownloadEnabled() && !this.settingsService.hasDownloaded()) {
        await this.downloadAllFiles();
        this.settingsService.markAsDownloaded();
      }
    } catch (error) {
      this.errorMessage = 'Erreur lors du chargement des fichiers';
      console.error(error);
    } finally {
      this.isLoading = false;
    }
  }

  async downloadAllFiles(): Promise<void> {
    const downloadPath = this.settingsService.getDownloadPath();
    if (!downloadPath) {
      console.warn('No download path configured');
      return;
    }

    this.isDownloading = true;
    this.downloadProgress = 0;
    this.downloadTotal = this.files.length;

    for (let i = 0; i < this.files.length; i++) {
      try {
        const file = this.files[i];
        const blob = await this.fileService.downloadFile(file);
        const text = await blob.text();
        
        const filePath = `${downloadPath}/${file.name}`;
        await writeTextFile(filePath, text);
        
        this.downloadProgress = i + 1;
      } catch (error) {
        console.error(`Failed to download file ${this.files[i].name}:`, error);
      }
    }

    this.isDownloading = false;
  }

  async downloadFile(file: DeviceFile): Promise<void> {
    try {
      const blob = await this.fileService.downloadFile(file);
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = file.name;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      window.URL.revokeObjectURL(url);
    } catch (error) {
      alert(`Erreur lors du téléchargement de ${file.name}`);
      console.error(error);
    }
  }

  // Add method to view graph for a file
  async viewGraph(file: DeviceFile): Promise<void> {
    this.isLoadingGraph = true;
    try {
      // Download the file content first
      const blob = await this.fileService.downloadFile(file);
      const text = await blob.text();
      
      console.log('Downloaded file:', file.name);
      console.log('File content length:', text.length);
      console.log('First 200 chars:', text.substring(0, 200));
      
      if (!text || text.trim().length === 0) {
        alert(`Le fichier ${file.name} est vide.`);
        return;
      }
      
      // Store it in SetupService so GraphiqueComponent can access it
      this.setupService.saveEncryptedFile(text);
      
      // Navigate to the graphic component
      this.router.navigate(['/graphique']);
    } catch (error) {
      alert(`Erreur lors du chargement du fichier ${file.name}`);
      console.error(error);
    } finally {
      this.isLoadingGraph = false;
    }
  }

  async refresh(): Promise<void> {
    this.settingsService.resetDownloadFlag(); // Reset pour permettre un nouveau téléchargement
    this.fileService.clearCache(); // Clear cache to force refresh
    await this.loadFiles(true);
  }

  openSettings(): void {
    this.router.navigate(['/settings']);
  }
}
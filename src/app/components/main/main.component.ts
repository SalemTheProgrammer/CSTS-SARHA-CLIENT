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
  private downloadedFiles: Map<string, string> = new Map(); // Cache for downloaded file contents

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
      const previousFiles = [...this.files];
      this.files = await this.fileService.fetchFileList(forceRefresh);

      // Only auto-download on manual refresh (Actualiser button)
      if (forceRefresh && this.settingsService.isAutoDownloadEnabled()) {
        // Check if files have changed
        const filesChanged = this.haveFilesChanged(previousFiles, this.files);

        if (filesChanged || !this.settingsService.hasDownloaded()) {
          await this.downloadAllFiles();
          this.settingsService.markAsDownloaded();
        }
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

        // Cache the file content
        this.downloadedFiles.set(file.name, text);

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
      let text: string;

      // Check if file is already cached
      if (this.downloadedFiles.has(file.name)) {
        text = this.downloadedFiles.get(file.name)!;
        console.log('Using cached file:', file.name);
      } else {
        // Download the file content if not cached
        console.log('Downloading file:', file.name);
        const blob = await this.fileService.downloadFile(file);
        text = await blob.text();

        // Cache the file content for future use
        this.downloadedFiles.set(file.name, text);
      }

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

  // Add method to print graph for a file
  async printGraph(file: DeviceFile): Promise<void> {
    this.isLoadingGraph = true;
    try {
      let text: string;

      // Check if file is already cached
      if (this.downloadedFiles.has(file.name)) {
        text = this.downloadedFiles.get(file.name)!;
        console.log('Using cached file:', file.name);
      } else {
        // Download the file content if not cached
        console.log('Downloading file:', file.name);
        const blob = await this.fileService.downloadFile(file);
        text = await blob.text();

        // Cache the file content for future use
        this.downloadedFiles.set(file.name, text);
      }

      console.log('File content length:', text.length);
      console.log('First 200 chars:', text.substring(0, 200));

      if (!text || text.trim().length === 0) {
        alert(`Le fichier ${file.name} est vide.`);
        return;
      }

      // Store it in SetupService so GraphiqueComponent can access it
      this.setupService.saveEncryptedFile(text);

      // Navigate to the graphic component and trigger print
      this.router.navigate(['/graphique']).then(() => {
        // Wait a bit for the component to load and render, then trigger print
        setTimeout(() => {
          // Trigger the actual print functionality from the graphique component
          window.print();
        }, 2000); // Wait 2 seconds for charts to render
      });
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

  // Check if files have changed (by comparing names and sizes)
  private haveFilesChanged(oldFiles: DeviceFile[], newFiles: DeviceFile[]): boolean {
    if (oldFiles.length !== newFiles.length) {
      return true;
    }

    for (let i = 0; i < oldFiles.length; i++) {
      const oldFile = oldFiles[i];
      const newFile = newFiles.find(f => f.name === oldFile.name);

      if (!newFile || newFile.sizeBytes !== oldFile.sizeBytes) {
        return true;
      }
    }

    return false;
  }

  openSettings(): void {
    this.router.navigate(['/settings']);
  }

  // Extract date from filename (format: CST_STU_003_20251117_1052.txt)
  extractDateFromFilename(filename: string): string {
    const dateMatch = filename.match(/(\d{8})/);
    if (dateMatch) {
      const dateStr = dateMatch[1];
      const year = dateStr.substring(0, 4);
      const month = dateStr.substring(4, 6);
      const day = dateStr.substring(6, 8);
      return `${day}/${month}/${year}`;
    }
    return filename; // fallback to original filename if no date found
  }
}
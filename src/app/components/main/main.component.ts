import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router } from '@angular/router';
import { writeTextFile, writeFile } from '@tauri-apps/plugin-fs';
import { save } from '@tauri-apps/plugin-dialog';
import { isTauri } from '@tauri-apps/api/core';
import { ConfigService, AppConfig } from '../../services/config.service';
import { FileService, DeviceFile } from '../../services/file.service';
import { SettingsService } from '../../services/settings.service';
import { SetupService } from '../../services/setup.service';
import { PrintService } from '../../services/print.service';
import { GraphiqueDataService } from '../../services/graphique-data.service';
import { LocalFileStorageService } from '../../services/local-file-storage.service';
import { FileHistoryService } from '../../services/file-history.service';
import { BackgroundSyncService } from '../../services/background-sync.service';
import { FileItemComponent } from './file-item/file-item.component';
import { DeleteConfirmationComponent } from './delete-confirmation/delete-confirmation.component';
import { CodePromptComponent } from '../code-prompt/code-prompt.component';

@Component({
    selector: 'app-main',
    standalone: true,
    imports: [CommonModule, FileItemComponent, DeleteConfirmationComponent, CodePromptComponent],
    templateUrl: './main.component.html',
    styleUrls: ['./main.component.css']
})
export class MainComponent implements OnInit {
    config: AppConfig | null = null;
    files: DeviceFile[] = [];
    paginatedFiles: DeviceFile[] = [];
    currentPage = 1;
    itemsPerPage = 5;
    totalPages = 1;
    isLoading = true;
    errorMessage = '';
    isDownloading = false;
    downloadProgress = 0;
    downloadTotal = 0;

    // Track which file/action is currently processing
    processingFile: string | null = null;
    processingAction: 'view' | 'download' | 'print' | 'delete' | null = null;

    // Delete confirmation popup state
    showDeletePopup = false;
    fileToDelete: DeviceFile | null = null;

    // Logo click counter for admin access
    logoClickCount = 0;
    logoClickTimer: any = null;
    showCodePrompt = false;

    private downloadedFiles: Map<string, string> = new Map(); // Cache for downloaded file contents

    constructor(
        private configService: ConfigService,
        private fileService: FileService,
        private settingsService: SettingsService,
        private setupService: SetupService,
        private router: Router,
        private printService: PrintService,
        private graphiqueDataService: GraphiqueDataService,
        private localFileStorage: LocalFileStorageService,
        private fileHistory: FileHistoryService,
        private backgroundSyncService: BackgroundSyncService
    ) { }

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

            if (this.files.length > 0) {
                const latestFile = this.files[0];

                // 1. Ensure latest file is available immediately
                const isUpToDate = await this.localFileStorage.isFileUpToDate(latestFile);
                if (!isUpToDate) {
                    console.log('Downloading latest file immediately:', latestFile.name);
                    const blob = await this.fileService.downloadFile(latestFile);
                    await this.localFileStorage.saveToBothLocations(latestFile, blob);
                    await this.fileHistory.recordDownload(latestFile);
                }

                // 2. Sync the rest in background with a timeout
                const historyFiles = this.files.slice(1);
                if (historyFiles.length > 0) {
                    setTimeout(() => {
                        this.backgroundSyncService.start(historyFiles);
                    }, 2000); // 2 second delay
                }
            }

            this.updatePagination();
        } catch (error) {
            console.error('Error loading files:', error);
        } finally {
            this.isLoading = false;
        }
    }

    updatePagination(): void {
        // Show only the latest file (files are already sorted by lastModified)
        this.paginatedFiles = this.files.length > 0 ? [this.files[0]] : [];
        this.totalPages = 1; // Only one page with the latest file
        this.currentPage = 1;
    }

    async changePage(page: number): Promise<void> {
        if (page >= 1 && page <= this.totalPages) {
            this.currentPage = page;
            this.updatePagination();

            // Removed auto-download on pagination as requested
            // Files will be downloaded on demand when clicking "Voir" or "Télécharger"
        }
    }





    async downloadFile(file: DeviceFile): Promise<void> {
        try {
            const blob = await this.fileService.downloadFile(file);
            const text = await blob.text();

            const hasTauri = (window as any).__TAURI__ !== undefined;

            if (hasTauri) {
                // Tauri desktop: ask where to save and write via filesystem plugin
                const filePath = await save({
                    defaultPath: file.name,
                    filters: [
                        { name: 'Data files', extensions: ['dat', 'txt'] },
                    ],
                });

                if (!filePath) {
                    return; // user cancelled
                }

                await writeTextFile(filePath, text);
            } else {
                // Browser/dev fallback: use a regular anchor download
                const url = window.URL.createObjectURL(new Blob([text], { type: 'text/plain' }));
                const a = document.createElement('a');
                a.href = url;
                a.download = file.name;
                document.body.appendChild(a);
                a.click();
                document.body.removeChild(a);
                window.URL.revokeObjectURL(url);
            }
        } catch (error) {
            alert(`Erreur lors du téléchargement de ${file.name}`);
            console.error(error);
        }
    }

    async viewGraph(file: DeviceFile): Promise<void> {
        if (this.processingFile) return;

        this.processingFile = file.name;
        this.processingAction = 'view';

        try {
            let text: string;

            // Check if cached file is up to date
            const isUpToDate = await this.localFileStorage.isFileUpToDate(file);

            if (isUpToDate) {
                // Use cached version - file hasn't changed
                console.log('Using up-to-date cached file:', file.name);
                const blob = await this.localFileStorage.getFile(file.name);
                text = await blob.text();
                await this.fileHistory.recordAccess(file.name);
            } else {
                // File is new or has changed - download and update cache
                console.log('Downloading new/changed file:', file.name);
                const blob = await this.fileService.downloadFile(file);
                text = await blob.text();

                // Save to both locations (admin encrypted + user unencrypted)
                await this.localFileStorage.saveToBothLocations(file, blob);
                await this.fileHistory.recordDownload(file);
            }

            console.log('File content length:', text.length);
            console.log('First 200 chars:', text.substring(0, 200));

            if (!text || text.trim().length === 0) {
                alert(`Le fichier ${file.name} est vide.`);
                return;
            }

            // Store it in SetupService so GraphiqueComponent can access it
            this.setupService.saveEncryptedFile(text);

            // Clear previous graph data to force reload
            this.graphiqueDataService.clearData();

            // Navigate to the graphic component
            this.router.navigate(['/graphique']);
        } catch (error) {
            alert(`Erreur lors du chargement du fichier ${file.name}`);
            console.error(error);
        } finally {
            this.processingFile = null;
            this.processingAction = null;
        }
    }

    // Add method to print graph for a file
    async printGraph(file: DeviceFile): Promise<void> {
        if (this.processingFile) return;

        this.processingFile = file.name;
        this.processingAction = 'print';

        try {
            let text: string;

            // Check if cached file is up to date
            const isUpToDate = await this.localFileStorage.isFileUpToDate(file);

            if (isUpToDate) {
                // Use cached version - file hasn't changed
                console.log('Using up-to-date cached file:', file.name);
                const blob = await this.localFileStorage.getFile(file.name);
                text = await blob.text();
                await this.fileHistory.recordAccess(file.name);
            } else {
                // File is new or has changed - download and update cache
                console.log('Downloading new/changed file:', file.name);
                const blob = await this.fileService.downloadFile(file);
                text = await blob.text();

                // Save to both locations (admin encrypted + user unencrypted)
                await this.localFileStorage.saveToBothLocations(file, blob);
                await this.fileHistory.recordDownload(file);
            }

            console.log('File content length:', text.length);
            console.log('First 200 chars:', text.substring(0, 200));

            if (!text || text.trim().length === 0) {
                alert(`Le fichier ${file.name} est vide.`);
                return;
            }

            // Direct print without navigating to the route
            this.printService.printGraphFromFileContent(text);
        } catch (error) {
            alert(`Erreur lors du chargement du fichier ${file.name}`);
            console.error(error);
        } finally {
            this.processingFile = null;
            this.processingAction = null;
        }
    }

    // Download graph as PDF (reuse print layout; user selects "Enregistrer au format PDF" in dialog)
    async downloadGraphPdf(file: DeviceFile): Promise<void> {
        if (this.processingFile) return;

        console.log('Starting PDF download for:', file.name);
        this.processingFile = file.name;
        this.processingAction = 'download';

        try {
            let text: string;

            // Reuse cached content when available
            if (this.downloadedFiles.has(file.name)) {
                text = this.downloadedFiles.get(file.name)!;
                console.log('Using cached file content');
            } else {
                console.log('Downloading file content...');
                const blob = await this.fileService.downloadFile(file);
                text = await blob.text();
                this.downloadedFiles.set(file.name, text);
                console.log('File content downloaded');
            }

            if (!text || text.trim().length === 0) {
                alert(`Le fichier ${file.name} est vide.`);
                return;
            }

            // Use the print service to open the print dialog
            // The user can then select "Save as PDF" from the print dialog
            await this.printService.printGraphFromFileContent(text);

        } catch (error) {
            alert(`Erreur lors de la génération du PDF pour ${file.name}`);
            console.error('PDF Generation Error:', error);
        } finally {
            this.processingFile = null;
            this.processingAction = null;
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

    openHistory(): void {
        this.router.navigate(['/history']);
    }

    // Show delete confirmation popup
    confirmDelete(file: DeviceFile): void {
        if (this.processingFile) return;

        this.fileToDelete = file;
        this.showDeletePopup = true;
    }

    // Cancel delete operation
    cancelDelete(): void {
        this.showDeletePopup = false;
        this.fileToDelete = null;
    }

    // Delete file after confirmation
    async deleteFile(): Promise<void> {
        if (!this.fileToDelete || this.processingFile) return;

        this.processingFile = this.fileToDelete.name;
        this.processingAction = 'delete';
        this.showDeletePopup = false;

        try {
            await this.fileService.deleteFile(this.fileToDelete);

            // Record deletion in history
            await this.fileHistory.recordDeletion(this.fileToDelete);

            // Remove from cache if present
            this.downloadedFiles.delete(this.fileToDelete.name);

            // Refresh file list
            await this.loadFiles(true);

            // Show success message (optional)
            console.log(`File ${this.fileToDelete.name} deleted successfully`);
        } catch (error) {
            alert(`Erreur lors de la suppression du fichier ${this.fileToDelete.name}`);
            console.error('Delete error:', error);
        } finally {
            this.processingFile = null;
            this.processingAction = null;
            this.fileToDelete = null;
        }
    }
    // Logo click handler for admin access
    onLogoClick(): void {
        this.logoClickCount++;

        // Reset timer on each click
        if (this.logoClickTimer) {
            clearTimeout(this.logoClickTimer);
        }

        // Reset counter after 2 seconds of inactivity
        this.logoClickTimer = setTimeout(() => {
            this.logoClickCount = 0;
        }, 2000);

        // Show code prompt on 4th click
        if (this.logoClickCount >= 4) {
            this.logoClickCount = 0;
            this.showCodePrompt = true;
        }
    }

    // Code prompt success handler
    onCodeSuccess(): void {
        this.showCodePrompt = false;
        this.router.navigate(['/admin']);
    }

    // Code prompt cancel handler
    onCodeCancel(): void {
        this.showCodePrompt = false;
    }
}

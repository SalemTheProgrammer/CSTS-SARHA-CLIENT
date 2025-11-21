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
    processingAction: 'view' | 'download' | 'print' | null = null;

    private downloadedFiles: Map<string, string> = new Map(); // Cache for downloaded file contents

    constructor(
        private configService: ConfigService,
        private fileService: FileService,
        private settingsService: SettingsService,
        private setupService: SetupService,
        private router: Router,
        private printService: PrintService,
        private graphiqueDataService: GraphiqueDataService
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

            // Only auto-download on manual refresh (Actualiser button)
            // OR if it's the first load and we haven't downloaded yet
            const shouldAutoDownload = this.settingsService.isAutoDownloadEnabled() &&
                (!this.settingsService.hasDownloaded() || forceRefresh);

            if (shouldAutoDownload) {
                // Check if files have changed
                const filesChanged = this.haveFilesChanged(previousFiles, this.files);

                if (filesChanged || !this.settingsService.hasDownloaded()) {
                    // Stop loading spinner before starting download spinner to avoid double loading indicators
                    this.isLoading = false;
                    await this.downloadAllFiles();
                    this.settingsService.markAsDownloaded();
                }
            }

            this.updatePagination();
        } catch (error) {
            // Only show error if we don't have any files (e.g. network error on first load)
            // If we have cached files or local files, just log the error
            if (this.files.length === 0) {
                this.errorMessage = 'Erreur lors du chargement des fichiers';
            }
            console.error('Error loading files:', error);
        } finally {
            this.isLoading = false;
        }
    }

    updatePagination(): void {
        this.totalPages = Math.ceil(this.files.length / this.itemsPerPage);
        const startIndex = (this.currentPage - 1) * this.itemsPerPage;
        this.paginatedFiles = this.files.slice(startIndex, startIndex + this.itemsPerPage);
    }

    async changePage(page: number): Promise<void> {
        if (page >= 1 && page <= this.totalPages) {
            this.currentPage = page;
            this.updatePagination();

            // Removed auto-download on pagination as requested
            // Files will be downloaded on demand when clicking "Voir" or "Télécharger"
        }
    }

    async downloadPageFiles(): Promise<void> {
        const downloadPath = this.settingsService.getDownloadPath();
        if (!downloadPath) return;

        // Filter files on current page that are not local and not cached
        const filesToDownload = this.paginatedFiles.filter(f =>
            f.downloadUrl !== 'local' && !this.downloadedFiles.has(f.name)
        );

        if (filesToDownload.length === 0) return;

        this.isDownloading = true;
        this.downloadTotal = filesToDownload.length;
        this.downloadProgress = 0;

        // Download files sequentially or in parallel
        for (let i = 0; i < filesToDownload.length; i++) {
            const file = filesToDownload[i];
            try {
                const blob = await this.fileService.downloadFile(file);
                const text = await blob.text();

                this.downloadedFiles.set(file.name, text);

                const filePath = `${downloadPath}/${file.name}`;
                await writeTextFile(filePath, text);
            } catch (error) {
                console.error(`Failed to download file ${file.name}:`, error);
            } finally {
                this.downloadProgress++;
            }
        }

        this.isDownloading = false;
        this.downloadProgress = 0;
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

        // Filter out local files (like the sample file)
        const allDeviceFiles = this.files.filter(f => f.downloadUrl !== 'local');

        if (allDeviceFiles.length === 0) {
            this.isDownloading = false;
            return;
        }

        // Only download the latest 5 files initially
        const filesToDownload = allDeviceFiles.slice(0, 5);

        this.downloadTotal = filesToDownload.length;
        this.downloadProgress = 0;

        // Concurrency limit
        const CONCURRENCY_LIMIT = 3;
        let currentIndex = 0;

        const downloadNext = async (): Promise<void> => {
            if (currentIndex >= filesToDownload.length) return;

            const index = currentIndex++;
            const file = filesToDownload[index];

            try {
                const blob = await this.fileService.downloadFile(file);
                const text = await blob.text();

                // Cache the file content
                this.downloadedFiles.set(file.name, text);

                const filePath = `${downloadPath}/${file.name}`;
                await writeTextFile(filePath, text);

            } catch (error) {
                console.error(`Failed to download file ${file.name}:`, error);
                // Don't stop the whole process for one failed file
            } finally {
                this.downloadProgress++;
            }

            // Continue with next file
            await downloadNext();
        };

        // Start initial batch
        const initialPromises = [];
        for (let i = 0; i < Math.min(CONCURRENCY_LIMIT, filesToDownload.length); i++) {
            initialPromises.push(downloadNext());
        }

        await Promise.all(initialPromises);

        this.isDownloading = false;
        this.downloadProgress = 0; // Reset progress after completion
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

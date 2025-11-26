import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router } from '@angular/router';
import { writeTextFile } from '@tauri-apps/plugin-fs';
import { FileService, DeviceFile } from '../../services/file.service';
import { SettingsService } from '../../services/settings.service';
import { SetupService } from '../../services/setup.service';
import { PrintService } from '../../services/print.service';
import { GraphiqueDataService } from '../../services/graphique-data.service';
import { LocalFileStorageService } from '../../services/local-file-storage.service';
import { FileHistoryService } from '../../services/file-history.service';
import { DeleteConfirmationComponent } from '../main/delete-confirmation/delete-confirmation.component';

@Component({
    selector: 'app-history',
    standalone: true,
    imports: [CommonModule, DeleteConfirmationComponent],
    templateUrl: './history.component.html',
    styleUrls: ['./history.component.css']
})
export class HistoryComponent implements OnInit {
    files: DeviceFile[] = [];
    paginatedFiles: DeviceFile[] = [];
    currentPage = 1;
    itemsPerPage = 7;
    totalPages = 1;
    isLoading = true;
    isDownloading = false;
    downloadProgress = 0;
    downloadTotal = 0;

    // Track which file/action is currently processing
    processingFile: string | null = null;
    processingAction: 'view' | 'print' | 'delete' | null = null;

    // Delete confirmation popup
    showDeletePopup = false;
    fileToDelete: DeviceFile | null = null;

    // Preserve pagination state when navigating
    private savedCurrentPage = 1;

    private downloadedFiles: Map<string, string> = new Map();

    constructor(
        private fileService: FileService,
        private settingsService: SettingsService,
        private setupService: SetupService,
        private printService: PrintService,
        private graphiqueDataService: GraphiqueDataService,
        private localFileStorage: LocalFileStorageService,
        private fileHistory: FileHistoryService,
        private router: Router
    ) { }

    async ngOnInit(): Promise<void> {
        await this.loadFiles();
        // Restore pagination state if saved
        if (this.savedCurrentPage > 1) {
            console.log('Restoring pagination to page:', this.savedCurrentPage);
            this.currentPage = this.savedCurrentPage;
            this.updatePagination();
        }
    }

    async loadFiles(): Promise<void> {
        this.isLoading = true;
        try {
            this.files = await this.fileService.fetchFileList(false);
            this.updatePagination();
        } catch (error) {
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

    changePage(page: number): void {
        if (page >= 1 && page <= this.totalPages) {
            this.currentPage = page;
            this.updatePagination();
        }
    }

    async downloadAllFiles(): Promise<void> {
        const downloadPath = this.settingsService.getDownloadPath();
        if (!downloadPath) {
            alert('Veuillez configurer un chemin de téléchargement dans les paramètres');
            return;
        }

        this.isDownloading = true;
        this.downloadProgress = 0;

        const allDeviceFiles = this.files.filter(f => f.downloadUrl !== 'local');
        this.downloadTotal = allDeviceFiles.length;

        for (let i = 0; i < allDeviceFiles.length; i++) {
            const file = allDeviceFiles[i];
            try {
                const blob = await this.fileService.downloadFile(file);
                const text = await blob.text();

                const filePath = `${downloadPath}/${file.name}`;
                await writeTextFile(filePath, text);

                this.downloadProgress++;
            } catch (error) {
                console.error(`Failed to download file ${file.name}:`, error);
            }
        }

        this.isDownloading = false;
        this.downloadProgress = 0;
        alert(`${allDeviceFiles.length} fichiers téléchargés avec succès!`);
    }

    goBack(): void {
        this.router.navigate(['/main']);
    }

    extractDateFromFilename(filename: string): string {
        const dateMatch = filename.match(/(\d{8})/);
        if (dateMatch) {
            const dateStr = dateMatch[1];
            const year = dateStr.substring(0, 4);
            const month = dateStr.substring(4, 6);
            const day = dateStr.substring(6, 8);
            return `${day}/${month}/${year}`;
        }
        return filename;
    }

    async viewGraph(file: DeviceFile): Promise<void> {
        if (this.processingFile) return;

        // Save current pagination state before navigation
        this.savedCurrentPage = this.currentPage;
        console.log('Saved pagination page:', this.savedCurrentPage);

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

    // Show delete confirmation popup
    confirmDelete(file: DeviceFile): void {
        if (this.processingFile) return;

        this.fileToDelete = file;
        this.showDeletePopup = true;
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
            await this.loadFiles();

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

    // Cancel delete
    cancelDelete(): void {
        this.showDeletePopup = false;
        this.fileToDelete = null;
    }
}

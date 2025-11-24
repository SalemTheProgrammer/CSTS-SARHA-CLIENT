import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router } from '@angular/router';
import { writeTextFile } from '@tauri-apps/plugin-fs';
import { FileService, DeviceFile } from '../../services/file.service';
import { SettingsService } from '../../services/settings.service';
import { SetupService } from '../../services/setup.service';
import { PrintService } from '../../services/print.service';
import { GraphiqueDataService } from '../../services/graphique-data.service';

@Component({
    selector: 'app-history',
    standalone: true,
    imports: [CommonModule],
    templateUrl: './history.component.html',
    styleUrls: ['./history.component.css']
})
export class HistoryComponent implements OnInit {
    files: DeviceFile[] = [];
    paginatedFiles: DeviceFile[] = [];
    currentPage = 1;
    itemsPerPage = 5;
    totalPages = 1;
    isLoading = true;
    isDownloading = false;
    downloadProgress = 0;
    downloadTotal = 0;

    // Track which file/action is currently processing
    processingFile: string | null = null;
    processingAction: 'view' | 'print' | null = null;

    private downloadedFiles: Map<string, string> = new Map();

    constructor(
        private fileService: FileService,
        private settingsService: SettingsService,
        private setupService: SetupService,
        private printService: PrintService,
        private graphiqueDataService: GraphiqueDataService,
        private router: Router
    ) { }

    async ngOnInit(): Promise<void> {
        await this.loadFiles();
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
}

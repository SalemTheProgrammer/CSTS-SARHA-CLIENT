import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { FileHistoryService, FileHistoryEntry } from '../../services/file-history.service';
import { LocalFileStorageService } from '../../services/local-file-storage.service';
import { SetupService } from '../../services/setup.service';
import { GraphiqueDataService } from '../../services/graphique-data.service';

@Component({
    selector: 'app-admin-screen',
    standalone: true,
    imports: [CommonModule, FormsModule],
    templateUrl: './admin-screen.component.html',
    styleUrls: ['./admin-screen.component.css']
})
export class AdminScreenComponent implements OnInit {
    allFiles: FileHistoryEntry[] = [];
    filteredFiles: FileHistoryEntry[] = [];
    paginatedFiles: FileHistoryEntry[] = [];
    currentPage = 1;
    itemsPerPage = 5;
    totalPages = 1;
    isLoading = true;

    // Track which file is currently processing
    processingFile: string | null = null;

    // Filter properties
    statusFilter: 'all' | 'active' | 'deleted' = 'all';
    searchQuery: string = '';
    startDate: string = '';
    endDate: string = '';

    constructor(
        private fileHistoryService: FileHistoryService,
        private localFileStorage: LocalFileStorageService,
        private setupService: SetupService,
        private graphiqueDataService: GraphiqueDataService,
        private router: Router
    ) { }

    async ngOnInit(): Promise<void> {
        await this.loadHistory();
    }

    async loadHistory(): Promise<void> {
        try {
            this.isLoading = true;
            this.allFiles = await this.fileHistoryService.getHistory();
            this.applyFilters();
        } catch (error) {
            console.error('Error loading file history:', error);
        } finally {
            this.isLoading = false;
        }
    }

    applyFilters(): void {
        let filtered = [...this.allFiles];

        // Filter by status
        if (this.statusFilter === 'active') {
            filtered = filtered.filter(f => !f.deletedAt);
        } else if (this.statusFilter === 'deleted') {
            filtered = filtered.filter(f => f.deletedAt);
        }

        // Filter by search query (file name)
        if (this.searchQuery.trim()) {
            const query = this.searchQuery.toLowerCase();
            filtered = filtered.filter(f => f.fileName.toLowerCase().includes(query));
        }

        // Filter by date range
        if (this.startDate) {
            const start = new Date(this.startDate);
            start.setHours(0, 0, 0, 0);
            filtered = filtered.filter(f => new Date(f.downloadedAt) >= start);
        }

        if (this.endDate) {
            const end = new Date(this.endDate);
            end.setHours(23, 59, 59, 999);
            filtered = filtered.filter(f => new Date(f.downloadedAt) <= end);
        }

        this.filteredFiles = filtered;
        this.currentPage = 1; // Reset to first page when filters change
        this.updatePagination();
    }

    updatePagination(): void {
        this.totalPages = Math.ceil(this.filteredFiles.length / this.itemsPerPage);
        const startIndex = (this.currentPage - 1) * this.itemsPerPage;
        this.paginatedFiles = this.filteredFiles.slice(startIndex, startIndex + this.itemsPerPage);
    }

    changePage(page: number): void {
        if (page >= 1 && page <= this.totalPages) {
            this.currentPage = page;
            this.updatePagination();
        }
    }

    clearFilters(): void {
        this.statusFilter = 'all';
        this.searchQuery = '';
        this.startDate = '';
        this.endDate = '';
        this.applyFilters();
    }

    async viewGraph(file: FileHistoryEntry): Promise<void> {
        if (this.processingFile) return;

        this.processingFile = file.fileName;

        try {
            // Check if file exists in local storage
            const hasFile = await this.localFileStorage.hasFile(file.fileName);

            if (!hasFile) {
                alert(`Le fichier ${file.fileName} n'est plus disponible en local.`);
                return;
            }

            // Get file from local storage
            const blob = await this.localFileStorage.getFile(file.fileName);
            const text = await blob.text();

            // Record access
            await this.fileHistoryService.recordAccess(file.fileName);

            if (!text || text.trim().length === 0) {
                alert(`Le fichier ${file.fileName} est vide.`);
                return;
            }

            // Store it in SetupService so GraphiqueComponent can access it
            this.setupService.saveEncryptedFile(text);

            // Clear previous graph data to force reload
            this.graphiqueDataService.clearData();

            // Navigate to the graphic component
            this.router.navigate(['/graphique']);
        } catch (error) {
            alert(`Erreur lors du chargement du fichier ${file.fileName}`);
            console.error(error);
        } finally {
            this.processingFile = null;
        }
    }

    goBack(): void {
        this.router.navigate(['/main']);
    }

    formatDate(date: Date): string {
        return new Date(date).toLocaleDateString('fr-FR', {
            day: '2-digit',
            month: '2-digit',
            year: 'numeric'
        });
    }

    formatTime(date: Date): string {
        return new Date(date).toLocaleTimeString('fr-FR', {
            hour: '2-digit',
            minute: '2-digit',
            second: '2-digit'
        });
    }

    async deleteFile(file: FileHistoryEntry): Promise<void> {
        if (this.processingFile) return;

        const confirmed = confirm(`Êtes-vous sûr de vouloir supprimer le fichier ${file.fileName} ?`);
        if (!confirmed) return;

        this.processingFile = file.fileName;

        try {
            // Delete file from local storage
            await this.localFileStorage.deleteFile(file.fileName);
            
            // Record deletion in history
            await this.fileHistoryService.recordDeletionByName(file.fileName);
            
            // Reload history to reflect changes
            await this.loadHistory();
        } catch (error) {
            alert(`Erreur lors de la suppression du fichier ${file.fileName}`);
            console.error(error);
        } finally {
            this.processingFile = null;
        }
    }

    formatDateTime(date: Date): string {
        return `${this.formatDate(date)} ${this.formatTime(date)}`;
    }
}

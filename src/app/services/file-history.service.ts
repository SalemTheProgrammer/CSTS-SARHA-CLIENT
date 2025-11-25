import { Injectable } from '@angular/core';
import { invoke } from '@tauri-apps/api/core';
import { CryptoService } from './crypto.service';
import { DeviceFile } from './file.service';

export interface FileHistoryEntry {
    fileName: string;
    fileSize: string;
    fileSizeBytes: number;
    downloadedAt: Date;
    lastAccessedAt?: Date;
    deletedAt?: Date;
    deletedFrom: 'device' | null;
}

@Injectable({
    providedIn: 'root'
})
export class FileHistoryService {
    private history: FileHistoryEntry[] = [];
    private historyLoaded = false;

    constructor(private cryptoService: CryptoService) {
        this.loadHistory();
    }

    /**
     * Load history from encrypted storage
     */
    private async loadHistory(): Promise<void> {
        try {
            const encryptedHistory = await invoke<string>('get_file_history');

            if (encryptedHistory && encryptedHistory.trim() !== '') {
                const historyData = this.cryptoService.decrypt(encryptedHistory);
                this.history = historyData.map((entry: any) => ({
                    ...entry,
                    downloadedAt: new Date(entry.downloadedAt),
                    lastAccessedAt: entry.lastAccessedAt ? new Date(entry.lastAccessedAt) : undefined,
                    deletedAt: entry.deletedAt ? new Date(entry.deletedAt) : undefined
                }));
            } else {
                this.history = [];
            }

            this.historyLoaded = true;
        } catch (error) {
            console.error('Error loading file history:', error);
            this.history = [];
            this.historyLoaded = true;
        }
    }

    /**
     * Save history to encrypted storage
     */
    private async saveHistory(): Promise<void> {
        try {
            const encryptedHistory = this.cryptoService.encrypt(this.history);
            await invoke('save_file_history', { encryptedHistory });
        } catch (error) {
            console.error('Error saving file history:', error);
            throw error;
        }
    }

    /**
     * Record a file download event
     */
    async recordDownload(file: DeviceFile): Promise<void> {
        // Wait for history to load if not loaded yet
        while (!this.historyLoaded) {
            await new Promise(resolve => setTimeout(resolve, 100));
        }

        // Check if file already exists in history
        const existingEntry = this.history.find(entry => entry.fileName === file.name);

        if (existingEntry) {
            // Update existing entry
            existingEntry.lastAccessedAt = new Date();
            // Don't update downloadedAt - keep original download time
        } else {
            // Create new entry
            const newEntry: FileHistoryEntry = {
                fileName: file.name,
                fileSize: file.size,
                fileSizeBytes: file.sizeBytes,
                downloadedAt: new Date(),
                lastAccessedAt: new Date(),
                deletedFrom: null
            };
            this.history.push(newEntry);
        }

        await this.saveHistory();
    }

    /**
     * Record a file access event (for view/print operations)
     */
    async recordAccess(fileName: string): Promise<void> {
        // Wait for history to load if not loaded yet
        while (!this.historyLoaded) {
            await new Promise(resolve => setTimeout(resolve, 100));
        }

        const entry = this.history.find(e => e.fileName === fileName);

        if (entry) {
            entry.lastAccessedAt = new Date();
            await this.saveHistory();
        }
    }

    /**
     * Record a file deletion from device by filename
     */
    async recordDeletionByName(fileName: string): Promise<void> {
        // Wait for history to load if not loaded yet
        while (!this.historyLoaded) {
            await new Promise(resolve => setTimeout(resolve, 100));
        }

        const entry = this.history.find(e => e.fileName === fileName);

        if (entry) {
            entry.deletedAt = new Date();
            entry.deletedFrom = 'device';
        } else {
            // If not in history yet, add it as a deleted file
            const newEntry: FileHistoryEntry = {
                fileName: fileName,
                fileSize: 'Unknown',
                fileSizeBytes: 0,
                downloadedAt: new Date(), // We don't know when it was originally downloaded
                deletedAt: new Date(),
                deletedFrom: 'device'
            };
            this.history.push(newEntry);
        }

        await this.saveHistory();
    }

    /**
     * Record a file deletion from device
     */
    async recordDeletion(file: DeviceFile): Promise<void> {
        // Wait for history to load if not loaded yet
        while (!this.historyLoaded) {
            await new Promise(resolve => setTimeout(resolve, 100));
        }

        const entry = this.history.find(e => e.fileName === file.name);

        if (entry) {
            entry.deletedAt = new Date();
            entry.deletedFrom = 'device';
        } else {
            // If not in history yet, add it as a deleted file
            const newEntry: FileHistoryEntry = {
                fileName: file.name,
                fileSize: file.size,
                fileSizeBytes: file.sizeBytes,
                downloadedAt: new Date(), // We don't know when it was originally downloaded
                deletedAt: new Date(),
                deletedFrom: 'device'
            };
            this.history.push(newEntry);
        }

        await this.saveHistory();
    }

    /**
     * Get all history entries
     */
    async getHistory(): Promise<FileHistoryEntry[]> {
        // Wait for history to load if not loaded yet
        while (!this.historyLoaded) {
            await new Promise(resolve => setTimeout(resolve, 100));
        }

        // Return a copy sorted by download date (newest first)
        return [...this.history].sort((a, b) => b.downloadedAt.getTime() - a.downloadedAt.getTime());
    }

    /**
     * Get all files that were deleted from device
     */
    async getDeletedFiles(): Promise<FileHistoryEntry[]> {
        const allHistory = await this.getHistory();
        return allHistory.filter(entry => entry.deletedFrom === 'device');
    }

    /**
     * Get all files that are currently downloaded (not deleted)
     */
    async getDownloadedFiles(): Promise<FileHistoryEntry[]> {
        const allHistory = await this.getHistory();
        return allHistory.filter(entry => !entry.deletedAt);
    }
}

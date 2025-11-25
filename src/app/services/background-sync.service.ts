import { Injectable } from '@angular/core';
import { DeviceFile, FileService } from './file.service';
import { LocalFileStorageService } from './local-file-storage.service';
import { FileHistoryService } from './file-history.service';

@Injectable({
    providedIn: 'root'
})
export class BackgroundSyncService {
    private isSyncing = false;

    constructor(
        private fileService: FileService,
        private localFileStorage: LocalFileStorageService,
        private fileHistory: FileHistoryService
    ) { }

    /**
     * Start background synchronization of files
     * This runs silently and doesn't block the UI
     */
    start(files: DeviceFile[]): void {
        if (this.isSyncing || !files || files.length === 0) {
            return;
        }

        this.isSyncing = true;
        console.log('🔄 Background sync started...');

        // Run in a detached promise to not block the main thread
        this.syncFiles(files).finally(() => {
            this.isSyncing = false;
            console.log('✅ Background sync completed');
        });
    }

    private async syncFiles(files: DeviceFile[]): Promise<void> {
        // Process files sequentially to avoid overwhelming the device/network
        for (const file of files) {
            try {
                // Check if we already have the latest version
                const isUpToDate = await this.localFileStorage.isFileUpToDate(file);

                if (!isUpToDate) {
                    // File is new or changed - download it
                    // console.log(`⬇️ Background downloading: ${file.name}`);

                    const blob = await this.fileService.downloadFile(file);
                    await this.localFileStorage.saveToBothLocations(file, blob);
                    await this.fileHistory.recordDownload(file);

                    // console.log(`💾 Cached: ${file.name}`);
                }
            } catch (error) {
                console.warn(`⚠️ Failed to sync ${file.name}:`, error);
                // Continue to next file even if one fails
            }

            // Small delay between files to be nice to the CPU/Network
            await new Promise(resolve => setTimeout(resolve, 100));
        }
    }
}

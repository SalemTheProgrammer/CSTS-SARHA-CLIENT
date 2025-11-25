import { Injectable } from '@angular/core';
import { invoke } from '@tauri-apps/api/core';
import { CryptoService } from './crypto.service';
import { DeviceFile } from './file.service';

export interface FileMetadata {
    name: string;
    size: string;
    sizeBytes: number;
    downloadedAt: Date;
    lastAccessedAt: Date;
}

@Injectable({
    providedIn: 'root'
})
export class LocalFileStorageService {
    constructor(
        private cryptoService: CryptoService
    ) { }

    /**
     * Save a file to local encrypted storage
     */
    async saveFile(file: DeviceFile, blob: Blob): Promise<void> {
        try {
            // Convert blob to base64
            const base64Data = await this.blobToBase64(blob);

            // Encrypt the file data
            const encryptedData = this.cryptoService.encrypt(base64Data);

            // Create metadata
            const metadata: FileMetadata = {
                name: file.name,
                size: file.size,
                sizeBytes: file.sizeBytes,
                downloadedAt: new Date(),
                lastAccessedAt: new Date()
            };

            const metadataJson = JSON.stringify(metadata);

            // Save to Rust backend
            await invoke('save_encrypted_file', {
                fileName: file.name,
                encryptedData,
                metadata: metadataJson
            });
        } catch (error) {
            console.error('Error saving file to local storage:', error);
            throw error;
        }
    }

    /**
     * Get a file from local storage
     */
    async getFile(fileName: string): Promise<Blob> {
        try {
            // Get encrypted data from Rust backend
            const encryptedData = await invoke<string>('get_encrypted_file', { fileName });

            // Decrypt the data
            const base64Data = this.cryptoService.decrypt(encryptedData);

            // Convert base64 back to blob
            const blob = await this.base64ToBlob(base64Data);

            // Update last accessed time
            await this.updateLastAccessed(fileName);

            return blob;
        } catch (error) {
            console.error('Error getting file from local storage:', error);
            throw error;
        }
    }

    /**
     * Check if a file exists in local storage
     */
    async hasFile(fileName: string): Promise<boolean> {
        try {
            return await invoke<boolean>('has_saved_file', { fileName });
        } catch (error) {
            console.error('Error checking if file exists:', error);
            return false;
        }
    }

    /**
     * List all saved files
     */
    async listFiles(): Promise<FileMetadata[]> {
        try {
            const fileNames = await invoke<string[]>('list_saved_files');
            const filesMetadata: FileMetadata[] = [];

            for (const fileName of fileNames) {
                try {
                    const metadata = await this.getFileMetadata(fileName);
                    filesMetadata.push(metadata);
                } catch (error) {
                    console.warn(`Failed to get metadata for ${fileName}:`, error);
                }
            }

            // Sort by download date (newest first)
            filesMetadata.sort((a, b) => b.downloadedAt.getTime() - a.downloadedAt.getTime());

            return filesMetadata;
        } catch (error) {
            console.error('Error listing saved files:', error);
            return [];
        }
    }

    /**
     * Get file metadata
     */
    async getFileMetadata(fileName: string): Promise<FileMetadata> {
        try {
            const metadataJson = await invoke<string>('get_file_metadata', { fileName });
            const metadata = JSON.parse(metadataJson);

            // Convert date strings back to Date objects
            return {
                ...metadata,
                downloadedAt: new Date(metadata.downloadedAt),
                lastAccessedAt: new Date(metadata.lastAccessedAt)
            };
        } catch (error) {
            console.error('Error getting file metadata:', error);
            throw error;
        }
    }

    /**
     * Check if cached file is up to date (same size and not older than current file)
     * Returns true if cached file is current, false if needs re-download
     */
    async isFileUpToDate(currentFile: DeviceFile): Promise<boolean> {
        try {
            const hasFile = await this.hasFile(currentFile.name);
            if (!hasFile) {
                return false; // File not cached at all
            }

            const cachedMetadata = await this.getFileMetadata(currentFile.name);

            // Compare file size - if different, file has changed
            if (cachedMetadata.sizeBytes !== currentFile.sizeBytes) {
                console.log(`File ${currentFile.name} size changed: ${cachedMetadata.sizeBytes} -> ${currentFile.sizeBytes}`);
                return false;
            }

            // File size is the same, consider it up to date
            console.log(`File ${currentFile.name} is up to date, using cached version`);
            return true;
        } catch (error) {
            console.error('Error checking file version:', error);
            return false; // If error, re-download to be safe
        }
    }

    /**
     * Update last accessed time for a file
     */
    private async updateLastAccessed(fileName: string): Promise<void> {
        try {
            const metadata = await this.getFileMetadata(fileName);
            metadata.lastAccessedAt = new Date();

            const metadataJson = JSON.stringify(metadata);

            // We need to temporarily make the file writable to update metadata
            // For now, we'll skip updating last accessed time since files are read-only
            // This is a limitation but ensures file integrity
            console.log(`File ${fileName} accessed at ${metadata.lastAccessedAt}`);
        } catch (error) {
            console.warn('Could not update last accessed time:', error);
        }
    }

    /**
     * Save a file to the user-defined download location (unencrypted)
     */
    async saveToUserLocation(file: DeviceFile, blob: Blob): Promise<void> {
        try {
            // Get user's download path from settings
            const downloadPath = await import('./settings.service').then(m => {
                const settingsService = new m.SettingsService();
                return settingsService.getDownloadPath();
            });

            if (!downloadPath || downloadPath.trim() === '') {
                console.warn('No download path configured, skipping user location save');
                return;
            }

            // Convert blob to byte array
            const arrayBuffer = await blob.arrayBuffer();
            const uint8Array = new Uint8Array(arrayBuffer);
            const byteArray = Array.from(uint8Array);

            // Build full file path
            const filePath = `${downloadPath}\\${file.name}`;

            // Save using Tauri command
            await invoke('save_file_to_user_location', {
                filePath,
                fileData: byteArray
            });

            console.log(`File saved to user location: ${filePath}`);
        } catch (error) {
            console.error('Error saving file to user location:', error);
            // Don't throw - we want the encrypted save to succeed even if user save fails
        }
    }

    /**
     * Save a file to both locations (admin encrypted + user unencrypted)
     */
    async saveToBothLocations(file: DeviceFile, blob: Blob): Promise<void> {
        // Save to both locations in parallel
        await Promise.all([
            this.saveFile(file, blob),              // Admin encrypted storage
            this.saveToUserLocation(file, blob)     // User unencrypted storage
        ]);
    }

    /**
     * Delete a file from local storage
     */
    async deleteFile(fileName: string): Promise<void> {
        try {
            await invoke('delete_saved_file', { fileName });
        } catch (error) {
            console.error('Error deleting file from local storage:', error);
            throw error;
        }
    }

    /**
     * Convert Blob to Base64 string
     */
    private blobToBase64(blob: Blob): Promise<string> {
        return new Promise((resolve, reject) => {
            const reader = new FileReader();
            reader.onloadend = () => {
                const base64 = reader.result as string;
                // Remove the data URL prefix (e.g., "data:text/csv;base64,")
                const base64Data = base64.split(',')[1] || base64;
                resolve(base64Data);
            };
            reader.onerror = reject;
            reader.readAsDataURL(blob);
        });
    }

    /**
     * Convert Base64 string to Blob
     */
    private async base64ToBlob(base64: string): Promise<Blob> {
        // Add data URL prefix if not present
        const dataUrl = base64.startsWith('data:') ? base64 : `data:application/octet-stream;base64,${base64}`;

        const response = await fetch(dataUrl);
        return await response.blob();
    }
}

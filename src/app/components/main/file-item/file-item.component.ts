import { Component, EventEmitter, Input, Output } from '@angular/core';
import { CommonModule } from '@angular/common';
import { DeviceFile } from '../../../services/file.service';

@Component({
    selector: 'app-file-item',
    standalone: true,
    imports: [CommonModule],
    templateUrl: './file-item.component.html',
})
export class FileItemComponent {
    @Input() file!: DeviceFile;
    @Input() processingFile: string | null = null;
    @Input() processingAction: 'view' | 'download' | 'print' | 'delete' | null = null;

    @Output() view = new EventEmitter<DeviceFile>();
    @Output() print = new EventEmitter<DeviceFile>();
    @Output() delete = new EventEmitter<DeviceFile>();

    onView() {
        this.view.emit(this.file);
    }

    onPrint() {
        this.print.emit(this.file);
    }

    onDelete() {
        this.delete.emit(this.file);
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
}

import { Component, EventEmitter, Input, Output } from '@angular/core';
import { CommonModule } from '@angular/common';
import { DeviceFile } from '../../../services/file.service';

@Component({
    selector: 'app-delete-confirmation',
    standalone: true,
    imports: [CommonModule],
    templateUrl: './delete-confirmation.component.html',
})
export class DeleteConfirmationComponent {
    @Input() file: DeviceFile | null = null;
    @Output() confirm = new EventEmitter<void>();
    @Output() cancel = new EventEmitter<void>();

    onConfirm() {
        this.confirm.emit();
    }

    onCancel() {
        this.cancel.emit();
    }
}

import { Component, EventEmitter, Output } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';

@Component({
    selector: 'app-code-prompt',
    standalone: true,
    imports: [CommonModule, FormsModule],
    templateUrl: './code-prompt.component.html',
    styleUrls: ['./code-prompt.component.css']
})
export class CodePromptComponent {
    @Output() success = new EventEmitter<void>();
    @Output() cancel = new EventEmitter<void>();

    code: string = '';
    error: string = '';
    private readonly VALID_CODE = '5264';

    onSubmit(): void {
        if (this.code === this.VALID_CODE) {
            this.success.emit();
        } else {
            this.error = 'Code incorrect';
            this.code = '';
        }
    }

    onCancel(): void {
        this.cancel.emit();
    }

    onCodeInput(): void {
        this.error = '';
    }
}

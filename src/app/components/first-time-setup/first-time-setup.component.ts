import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { SetupService } from '../../services/setup.service';
import { CryptoService } from '../../services/crypto.service';

@Component({
  selector: 'app-first-time-setup',
  standalone: true,
  imports: [
    CommonModule,
    FormsModule
  ],
  templateUrl: './first-time-setup.component.html',
  styleUrls: ['./first-time-setup.component.css']
})
export class FirstTimeSetupComponent {
  passphraseText = '';
  isDragging = false;

  constructor(
    private setupService: SetupService,
    private router: Router,
    private cryptoService: CryptoService
  ) {}

  onDragOver(event: DragEvent): void {
    event.preventDefault();
    event.stopPropagation();
    this.isDragging = true;
  }

  onDragLeave(event: DragEvent): void {
    event.preventDefault();
    event.stopPropagation();
    this.isDragging = false;
  }

  onDrop(event: DragEvent): void {
    event.preventDefault();
    event.stopPropagation();
    this.isDragging = false;

    const files = event.dataTransfer?.files;
    if (files && files.length > 0) {
      this.readFile(files[0]);
    }
  }

  onFileSelected(event: Event): void {
    const input = event.target as HTMLInputElement;
    if (input.files && input.files.length > 0) {
      this.readFile(input.files[0]);
    }
  }

  private readFile(file: File): void {
    if (!file.name.endsWith('.txt')) {
      alert('Veuillez télécharger un fichier .txt');
      return;
    }

    const reader = new FileReader();
    reader.onload = (e) => {
      const content = e.target?.result as string;
      this.passphraseText = content.trim();
    };
    reader.onerror = () => {
      alert('Erreur lors de la lecture du fichier');
    };
    reader.readAsText(file);
  }

  savePassphrase(): void {
    const trimmedFile = this.passphraseText.trim();
    
    if (!trimmedFile) {
      alert('Veuillez télécharger un fichier chiffré');
      return;
    }
    
    this.setupService.saveEncryptedFile(trimmedFile);
    // Use the fixed passphrase from the crypto service
    this.setupService.savePassphrase('@CTSDOINGCRAZYWORK14@@@@KATCHEPMAYOUNEZ20255');
    alert('Configuration terminée !');
    
    setTimeout(() => {
      this.router.navigate(['/']);
    }, 500);
  }


}

import { Component } from '@angular/core';
import { Router } from '@angular/router';
import { CommonModule } from '@angular/common';
import { ConfigService } from '../../services/config.service';

@Component({
  selector: 'app-import-config',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './import-config.component.html',
  styleUrls: ['./import-config.component.css']
})
export class ImportConfigComponent {
  errorMessage = '';
  isLoading = false;
  isDragging = false;

  constructor(
    private configService: ConfigService,
    private router: Router
  ) {}

  async onFileSelected(event: Event): Promise<void> {
    const input = event.target as HTMLInputElement;
    if (!input.files || input.files.length === 0) return;

    const file = input.files[0];
    this.isLoading = true;
    this.errorMessage = '';

    try {
      const text = await file.text();
      await this.configService.saveConfig(text);
      this.router.navigate(['/connection']);
    } catch (error) {
      this.errorMessage = 'Erreur lors de l\'importation du fichier. Le contenu est invalide ou corrompu.';
    } finally {
      this.isLoading = false;
    }
  }

  onDragOver(event: DragEvent): void {
    event.preventDefault();
    this.isDragging = true;
  }

  onDragLeave(event: DragEvent): void {
    event.preventDefault();
    this.isDragging = false;
  }

  async onDrop(event: DragEvent): Promise<void> {
    event.preventDefault();
    this.isDragging = false;
    if (!event.dataTransfer || event.dataTransfer.files.length === 0) return;
    const file = event.dataTransfer.files[0];
    this.isLoading = true;
    this.errorMessage = '';
    try {
      const text = await file.text();
      await this.configService.saveConfig(text);
      this.router.navigate(['/connection']);
    } catch (error) {
      this.errorMessage = 'Erreur lors de l\'importation du fichier. Le contenu est invalide ou corrompu.';
    } finally {
      this.isLoading = false;
    }
  }
}

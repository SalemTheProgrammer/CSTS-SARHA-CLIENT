import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router } from '@angular/router';
import { Chart, registerables } from 'chart.js';
import { MareeRow } from './graphique-types.util';
import { decryptText } from './graphique-decrypt.util';
import { formatDate, calculateDuration } from './graphique-datetime.util';
import { computeTotalDistance } from './graphique-distance.util';
import { paginate } from './graphique-paginate.util';

import { SetupService } from '../../services/setup.service';

// Register Chart.js components
Chart.register(...registerables);

@Component({
  selector: 'app-graphique',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './graphique.component.html',
  styleUrls: ['./graphique.component.css'],
})
export class GraphiqueComponent implements OnInit {
  charts: Chart[] = [];

  data: MareeRow[] = [];
  spliteddata: MareeRow[][] = [];

  // Global stats (no header/company fields anymore)
  startDate: string | null = null;
  endDate: string | null = null;
  duration: string | null = null;
  distance = 0;

  // Header info loaded from encrypted file in SetupService
  company: string | null = null;
  shipName: string | null = null;
  registration: string | null = null;
  asvNumber: string | null = null;
  callSign: string | null = null;
  maree: string | null = null;

  private readonly invalidTempSentinel = -127;

  private seriesConfig = [
    { key: 'Temp1', label: 'Temp1', color: 'rgb(255, 99, 132)' },
    { key: 'Temp2', label: 'Temp2', color: 'rgb(54, 162, 235)' },
    { key: 'Temp3', label: 'Temp3', color: '#000' },
    { key: 'Temp4', label: 'Temp4', color: '#00994C' },
    { key: 'Temp5', label: 'Temp5', color: '#0000CC' },
    { key: 'Temp6', label: 'Temp6', color: '#994C00' },
    { key: 'Temp7', label: 'Temp7', color: '#6600CC' },
    { key: 'Temp8', label: 'Temp8', color: '#CC00CC' },
    { key: 'Temp9', label: 'Temp9', color: '#00FFFF' },
    { key: 'Temp10', label: 'Temp10', color: '#999900' },
    { key: 'Temp11', label: 'Temp11', color: '#0066CC' },
    { key: 'Temp12', label: 'Temp12', color: '#FF6666' },
  ];

  constructor(
    private setupService: SetupService,
    private router: Router
  ) {}

  async ngOnInit(): Promise<void> {
    const encryptedFile = this.setupService.getEncryptedFile();
    if (encryptedFile) {
      await this.loadFromContent(encryptedFile);
    }
  }

  async handleFileSelect(event: Event): Promise<void> {
    const target = event.target as HTMLInputElement;
    const files = target.files as FileList;
    const file = files && files[0];

    if (!file) return;
    const reader = new FileReader();
    reader.onload = async (e) => {
      const contents = e.target?.result as string;

      if (!contents) {
        alert('Le fichier sélectionné est invalide.');
        return;
      }
      await this.loadFromContent(contents);
    };

    reader.readAsText(file);
  }

  private async loadFromContent(contents: string): Promise<void> {
    this.resetState();

    if (!contents) {
      console.error('No content provided to loadFromContent');
      alert('Aucun contenu de fichier disponible.');
      return;
    }

    console.log('Loading content, length:', contents.length);

    const parsed = this.parseCSV(contents);

    if (!parsed || !parsed.length) {
      console.error('Failed to parse CSV or no data rows found');
      alert('Le fichier sélectionné est invalide/Vide.');
      return;
    }

    this.data = parsed;

    this.data.sort((a, b) => {
      const dateA = formatDate(a.Date, a.TimeOfDay).getTime();
      const dateB = formatDate(b.Date, b.TimeOfDay).getTime();
      return dateA - dateB;
    });

    this.distance = computeTotalDistance(this.data);

    const dataFilter = [...this.data];
    this.spliteddata = await paginate(dataFilter, 1440 * 4);

    let lastRow: MareeRow | undefined;
    this.spliteddata.forEach((page) => {
      if (lastRow) {
        page.unshift(lastRow);
      }
      lastRow = page[page.length - 1];
    });

    this.renderTable(dataFilter);

    console.log('\n=== CREATING CHARTS ===');
    console.log('Number of chart pages:', this.spliteddata.length);
    
    setTimeout(() => {
      this.spliteddata.forEach((page, index) => {
        console.log(`Creating chart ${index} with ${page.length} data points`);
        this.createChart(page, index);
      });
    }, 300);
  }

  private resetState(): void {
    this.data = [];
    this.spliteddata = [];
    this.startDate = null;
    this.endDate = null;
    this.duration = null;
    this.distance = 0;

    this.charts.forEach((c) => c.destroy());
    this.charts = [];
  }

  parseCSV(contents: string): MareeRow[] | null {
    if (!contents || contents.trim().length === 0) {
      console.error('Empty file content');
      return null;
    }

    const allLines = contents.split('\n');
    
    if (allLines.length < 22) {
      console.error('File does not have enough lines for header data');
      return null;
    }

    const headerLines = [...allLines];

    console.log('=== FILE HEADER DEBUG ===');
    console.log('Total lines in file:', allLines.length);
    console.log('\nFirst 22 header lines (encrypted):');
    for (let i = 0; i < Math.min(22, headerLines.length); i++) {
      console.log(`Line ${i}:`, headerLines[i]);
    }

    console.log('\n=== DECRYPTED HEADER INFO ===');
    
    // decrypt header/meta info from stored file with safety checks
    this.company = headerLines[0] ? decryptText(headerLines[0].split(',')[1] || '') : '';
    console.log('Line 0 - Company:', this.company);
    
    this.shipName = headerLines[1] ? decryptText(headerLines[1].split(',')[1] || '') : '';
    console.log('Line 1 - Ship Name:', this.shipName);
    
    this.registration = headerLines[2] ? decryptText(headerLines[2].split(',')[1] || '') : '';
    console.log('Line 2 - Registration:', this.registration);
    
    this.asvNumber = headerLines[3] ? decryptText(headerLines[3].split(',')[1] || '') : '';
    console.log('Line 3 - ASV Number:', this.asvNumber);
    
    this.callSign = headerLines[4] ? decryptText(headerLines[4].split(',')[1] || '') : '';
    console.log('Line 4 - Call Sign:', this.callSign);
    
    this.maree = headerLines[17] ? decryptText(headerLines[17].split(',')[1] || '') : '';
    console.log('Line 17 - Maree:', this.maree);

    // Read sensor names from line 20 (CSV header row)
    console.log('\n=== SENSOR NAMES (Line 20 - CSV Header) ===');
    if (headerLines[20]) {
      const decryptedHeaderLine = decryptText(headerLines[20]);
      console.log('Line 20 (decrypted):', decryptedHeaderLine);
      
      const headerColumns = decryptedHeaderLine.split(',');
      console.log('Header columns:', headerColumns);
      
      // Columns 3-14 should be the 12 temperature sensor names
      // Based on the data structure: index 0=row#, 1=date, 2=time, 3-14=Temp1-12
      for (let i = 0; i < 12; i++) {
        const columnIndex = 3 + i;
        if (headerColumns[columnIndex]) {
          const sensorName = headerColumns[columnIndex].trim();
          console.log(`  -> Sensor ${i + 1} (column ${columnIndex}):`, sensorName);
          
          if (sensorName && sensorName !== '**') {
            this.seriesConfig[i].label = sensorName;
          }
        }
      }
    }

    console.log('\n=== UPDATED SERIES CONFIG ===');
    console.log(this.seriesConfig);

    const lines = allLines.slice(22); // skip header/meta lines completely
    if (!lines.length) return null;

    const dataLines = lines.filter((line) => line.length > 0);

    console.log('\n=== DATA ROWS ===');
    console.log('Total data lines:', dataLines.length);
    console.log('First 3 data lines (encrypted):');
    for (let i = 0; i < Math.min(3, dataLines.length); i++) {
      console.log(`Data line ${i}:`, dataLines[i]);
    }

    const data: MareeRow[] = dataLines.map((line, index) => {
      const decryptedLine = decryptText(line);
      
      if (index < 3) {
        console.log(`\nData line ${index} (decrypted):`, decryptedLine);
      }
      const values = decryptedLine.split(',');

      const date = values[1] || '';
      const timeOfDay = values[2] || '';

      const toNum = (val: string | undefined) => (val && val.trim() !== '' ? parseFloat(val) : NaN);

      const row: MareeRow = {
        Date: date,
        TimeOfDay: timeOfDay,
        Temp1: toNum(values[3]),
        Temp2: toNum(values[4]),
        Temp3: toNum(values[5]),
        Temp4: toNum(values[6]),
        Temp5: toNum(values[7]),
        Temp6: toNum(values[8]),
        Temp7: toNum(values[9]),
        Temp8: toNum(values[10]),
        Temp9: toNum(values[11]),
        Temp10: toNum(values[12]),
        Temp11: toNum(values[13]),
        Temp12: toNum(values[14]),
        A1: toNum(values[15]),
        A2: toNum(values[16]),
        A3: toNum(values[17]),
        A4: toNum(values[18]),
        A5: toNum(values[19]),
        A6: toNum(values[20]),
        A7: toNum(values[21]),
        A8: toNum(values[22]),
        A9: toNum(values[23]),
        A10: toNum(values[24]),
        A11: toNum(values[25]),
        A12: toNum(values[26]),
        Latitude: toNum(values[27]),
        Longitude: toNum(values[28]),
      };

      if (index < 3) {
        console.log(`Parsed row ${index}:`, row);
      }

      return row;
    });

    console.log('\n=== PARSED DATA SUMMARY ===');
    console.log('Total parsed rows:', data.length);
    console.log('First row:', data[0]);
    console.log('Last row:', data[data.length - 1]);

    return data;
  }

  renderTable(data: MareeRow[]): void {
    const validEntries = data.filter((entry) => entry.Date && entry.TimeOfDay);
    if (!validEntries.length) return;

    this.startDate = `${validEntries[0].Date} ${validEntries[0].TimeOfDay}`;
    this.endDate = `${validEntries[validEntries.length - 1].Date} ${validEntries[validEntries.length - 1].TimeOfDay}`;
    this.duration = calculateDuration(this.startDate, this.endDate);
  }

  createChart(data: MareeRow[], index: number): void {
    console.log(`\n=== Creating Chart ${index} ===`);
    console.log('Data points:', data.length);
    
    const canvasId = 'chart' + index;
    const canvasElement = document.getElementById(canvasId);
    
    if (!canvasElement) {
      console.error(`Canvas element not found: ${canvasId}`);
      return;
    }
    
    console.log('Canvas element found:', canvasId);
    
    // Create multi-line labels: [date, time]
    const labels = data.map((entry) => [entry.Date, entry.TimeOfDay]);

    const datasets: any[] = [];
    const lastValid: { [tempKey: string]: number } = {};

    this.seriesConfig.forEach((cfg) => {
      const nom = cfg.label;

      const tempSeries = data.map((entry) => {
        const raw = (entry as any)[cfg.key] as number;
        if (raw !== this.invalidTempSentinel && !isNaN(raw)) {
          lastValid[cfg.key] = raw;
          return raw;
        }
        return lastValid[cfg.key] ?? raw;
      });

      // Only add this sensor to the chart if it has at least one valid reading
      const hasValidData = tempSeries.some(val => val !== this.invalidTempSentinel && !isNaN(val));
      
      if (hasValidData) {
        datasets.push({
          label: nom,
          borderColor: cfg.color,
          data: tempSeries,
          pointRadius: 0,
          fill: false,
          borderWidth: 1,
        });
      }
    });

    console.log('Datasets created:', datasets.length);
    console.log('Active sensors:', datasets.map(d => d.label));

    const chart = new Chart(canvasId, {
      type: 'line',
      data: {
        labels,
        datasets,
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        scales: {
          x: {
            display: true,
            ticks: {
              font: {
                size: 10,
              },
              maxRotation: 0,
              minRotation: 0,
              autoSkip: true,
              maxTicksLimit: 20,
            },
            title: {
              display: true,
              text: 'Date et Heure',
              font: {
                size: 14,
              },
            },
          },
          y: {
            display: true,
            ticks: {
              font: {
                size: 11,
              },
            },
            title: {
              display: true,
              text: 'Températures °C',
              font: {
                size: 14,
              },
            },
          },
        },
        plugins: {
          legend: {
            display: true,
            position: 'top',
            labels: {
              font: {
                size: 11,
              },
              boxWidth: 20,
              padding: 10,
            },
          },
          title: {
            display: false,
          },
        },
      },
    });

    this.charts.push(chart);
  }



  goBack(): void {
    this.router.navigate(['/main']);
  }
}

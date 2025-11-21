import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { Chart, registerables } from 'chart.js';
import 'chartjs-adapter-moment';
import { MareeRow } from './graphique-types.util';
import { decryptText } from './graphique-decrypt.util';
import { formatDate, calculateDuration } from './graphique-datetime.util';
import { computeTotalDistance, doDistance } from './graphique-distance.util';
import { paginate } from './graphique-paginate.util';
// import { CONSIGNES } from './consignes.config'; // Deprecated in favor of settings

import { SetupService } from '../../services/setup.service';
import { ChartSettingsService, ChartSettings } from '../../services/chart-settings.service';
import { ConfigService, AppConfig } from '../../services/config.service';
import { GraphiqueDataService } from '../../services/graphique-data.service';

// Register Chart.js components
Chart.register(...registerables);

@Component({
  selector: 'app-graphique',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './graphique.component.html',
  styleUrls: ['./graphique.component.css'],
})
export class GraphiqueComponent implements OnInit {
  charts: Chart[] = [];

  data: MareeRow[] = [];
  spliteddata: MareeRow[][] = [];
  chartSettings: ChartSettings;

  // Global stats (no header/company fields anymore)
  startDate: string | null = null;
  endDate: string | null = null;
  duration: string | null = null;
  distance = 0;
  distanceKm = 0;
  directDistance = 0;
  directDistanceKm = 0;
  sensorCount = 0;

  // Header info coming from decrypted AppConfig metadata
  company: string | null = null;
  shipName: string | null = null;
  registration: string | null = null;
  asvNumber: string | null = null;
  callSign: string | null = null;
  maree: string | null = null;
  portAttache: string | null = null;
  latitude: number | null = null;
  longitude: number | null = null;
  vesselNumber: string | null = null;
  deviceIp: string | null = null;

  // Print header info
  printDate: string = '';
  printTime: string = '';
  activeSensors: string[] = [];
  sensorNames: { [key: string]: string } = {};



  private readonly invalidTempSentinel = -127;

  get activeSensorsDisplay(): string {
    return this.activeSensors.join(', ') || '—';
  }

  // Helper for template to check NaN
  isNaN(val: any): boolean {
    return isNaN(val);
  }

  // seriesConfig is now replaced by chartSettings.sensors

  constructor(
    private setupService: SetupService,
    private chartSettingsService: ChartSettingsService,
    private router: Router,
    private configService: ConfigService,
    private graphiqueDataService: GraphiqueDataService
  ) {
    this.chartSettings = this.chartSettingsService.getSettings();
  }

  private applyConfigMetadata(cfg: AppConfig): void {

    const toStringValue = (value: string | number | undefined | null): string | null => {
      if (value === undefined || value === null) return null;
      return typeof value === 'number' ? String(value) : value;
    };

    this.company = toStringValue(cfg.societe) ?? null;
    this.shipName = toStringValue(cfg.nom) ?? toStringValue(cfg.deviceName);
    this.registration = toStringValue(cfg.immatricule);
    this.vesselNumber = toStringValue(cfg.numeroNavire);
    this.asvNumber = toStringValue(cfg.numeroASV);
    this.callSign = toStringValue(cfg.indicatifAppel);

    const mareeValue = cfg.numeroAgrument ?? cfg.numeroArgument;
    this.maree = toStringValue(mareeValue);

    this.portAttache = toStringValue(cfg.portAttache);
    this.latitude = cfg.latitude ?? null;
    this.longitude = cfg.longitude ?? null;
    this.deviceIp = toStringValue(cfg.deviceIp);
  }

  async ngOnInit(): Promise<void> {
    try {
      const cfg = await this.configService.loadConfig();
      this.applyConfigMetadata(cfg);
    } catch (e) {
      console.warn('Failed to load AppConfig for header fields', e);
    }

    // Reload chart settings in case they were changed in settings page
    this.chartSettings = this.chartSettingsService.getSettings();

    if (this.graphiqueDataService.hasData()) {
      this.restoreFromState();
    } else {
      const encryptedFile = this.setupService.getEncryptedFile();
      if (encryptedFile) {
        await this.loadFromContent(encryptedFile);
      }
    }
  }

  private restoreFromState(): void {
    const state = this.graphiqueDataService.getState();
    if (!state) return;

    this.data = state.data;
    this.spliteddata = state.spliteddata;
    this.sensorNames = state.sensorNames;
    this.startDate = state.startDate;
    this.endDate = state.endDate;
    this.duration = state.duration;
    this.distance = state.distance;
    this.distanceKm = state.distanceKm;
    this.directDistance = state.directDistance;
    this.directDistanceKm = state.directDistanceKm;
    this.sensorCount = state.sensorCount;
    this.activeSensors = state.activeSensors;

    // Destroy existing charts before re-rendering with new settings
    this.charts.forEach((c) => c.destroy());
    this.charts = [];

    // Re-render charts with current settings
    setTimeout(() => {
      this.createChartsChunked(0);
    }, 100);
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

    const parsed = this.parseCSV(contents);

    if (!parsed || !parsed.length) {
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
    this.distanceKm = parseFloat((this.distance * 1.852).toFixed(2));

    // Nombre de sonde: count sensors Temp1..Temp12 that have at least one valid value
    this.activeSensors = [];
    const sensors = this.chartSettings.sensors || [];

    this.sensorCount = sensors.reduce((count, sensor) => {
      if (!sensor.enabled) return count; // Skip disabled sensors

      const key = `Temp${sensor.id}`;
      const hasValid = this.data.some(row => {
        const val = (row as any)[key] as number;
        return !isNaN(val) && val !== this.invalidTempSentinel;
      });
      if (hasValid) {
        const sensorName = sensor.label || this.sensorNames[key] || `Temp${sensor.id}`;
        this.activeSensors.push(sensorName);
      }
      return count + (hasValid ? 1 : 0);
    }, 0);

    // Direct distance between first and last valid coordinate points
    const coordFilter = this.data.filter(row =>
      !isNaN(row.Latitude) && !isNaN(row.Longitude) && row.Latitude !== 0 && row.Longitude !== 0
    );
    if (coordFilter.length >= 2) {
      const firstCoord = coordFilter[0];
      const lastCoord = coordFilter[coordFilter.length - 1];
      this.directDistance = doDistance(
        Number(firstCoord.Latitude),
        Number(firstCoord.Longitude),
        Number(lastCoord.Latitude),
        Number(lastCoord.Longitude)
      );
      this.directDistance = Math.round(this.directDistance * 1000) / 1000;
      this.directDistanceKm = parseFloat((this.directDistance * 1.852).toFixed(2));
    } else {
      this.directDistance = 0;
      this.directDistanceKm = 0;
    }

    const dataFilter = [...this.data];

    // Adjust effective points per page based on display step
    // If displayStep = 60 (1 hour), we want each chart to cover 60x more time
    // to maintain a consistent number of displayed points per chart
    const effectivePointsPerPage = this.chartSettings.pointsPerPage * this.chartSettings.displayStep;
    console.log(`Pagination: pointsPerPage=${this.chartSettings.pointsPerPage}, displayStep=${this.chartSettings.displayStep}, effective=${effectivePointsPerPage}`);

    this.spliteddata = await paginate(dataFilter, effectivePointsPerPage);

    let lastRow: MareeRow | undefined;
    this.spliteddata.forEach((page) => {
      if (lastRow) {
        page.unshift(lastRow);
      }
      lastRow = page[page.length - 1];
    });

    this.renderTable(dataFilter);

    // Save state to service
    this.graphiqueDataService.setState({
      data: this.data,
      spliteddata: this.spliteddata,
      sensorNames: this.sensorNames,
      startDate: this.startDate,
      endDate: this.endDate,
      duration: this.duration,
      distance: this.distance,
      distanceKm: this.distanceKm,
      directDistance: this.directDistance,
      directDistanceKm: this.directDistanceKm,
      sensorCount: this.sensorCount,
      activeSensors: this.activeSensors
    });

    // Optimize chart creation by chunking
    setTimeout(() => {
      this.createChartsChunked(0);
    }, 100);
  }

  private createChartsChunked(index: number): void {
    if (index >= this.spliteddata.length) return;

    this.createChart(this.spliteddata[index], index);

    // Process next chart in next tick to avoid freezing UI
    setTimeout(() => {
      this.createChartsChunked(index + 1);
    }, 50);
  }

  private resetState(): void {
    this.data = [];
    this.spliteddata = [];
    this.startDate = null;
    this.endDate = null;
    this.duration = null;
    this.distance = 0;
    this.distanceKm = 0;
    this.directDistance = 0;
    this.directDistanceKm = 0;
    this.sensorCount = 0;

    this.charts.forEach((c) => c.destroy());
    this.charts = [];
  }

  parseCSV(contents: string): MareeRow[] | null {
    if (!contents || contents.trim().length === 0) {
      console.error('Empty file content');
      return null;
    }

    const allLines = contents.split('\n');

    // Find header row
    let headerRowIndex = -1;
    // Check first 25 lines
    for (let i = 0; i < Math.min(allLines.length, 25); i++) {
      // Check plain text
      if ((allLines[i].includes('SavingID') && allLines[i].includes('Date')) ||
        (allLines[i].includes('Date') && allLines[i].includes('Time'))) {
        headerRowIndex = i;
        break;
      }
      // Check decrypted
      const decrypted = decryptText(allLines[i]);
      if ((decrypted.includes('SavingID') && decrypted.includes('Date')) ||
        (decrypted.includes('Date') && decrypted.includes('Time'))) {
        headerRowIndex = i;
        break;
      }
    }

    if (headerRowIndex === -1) headerRowIndex = 20;

    // Parse header
    let headerLine = allLines[headerRowIndex];
    // If header looks encrypted (doesn't have commas or expected keywords), decrypt it
    if (!headerLine.includes(',') || (!headerLine.includes('Date') && !headerLine.includes('SavingID'))) {
      headerLine = decryptText(headerLine);
    }

    const headerColumns = headerLine.split(',').map(c => c.trim());

    // Map column names to indices
    const colMap: { [key: string]: number } = {};
    headerColumns.forEach((col, idx) => {
      colMap[col] = idx;
    });

    // Extract sensor names (indices 3 to 14)
    this.sensorNames = {};
    for (let i = 1; i <= 12; i++) {
      const colIdx = 2 + i; // 3 to 14
      if (colIdx < headerColumns.length) {
        const colName = headerColumns[colIdx];
        if (colName && colName.length > 0) {
          this.sensorNames[`Temp${i}`] = colName;
        }
      }
    }

    const dataLines = allLines.slice(headerRowIndex + 1).filter(l => l.trim().length > 0);

    const data: MareeRow[] = dataLines.map((line, index) => {
      let values: string[];
      // Check if line needs decryption
      // If it contains a date format like dd/mm/yyyy, it's likely plain text
      if (line.includes(',') && line.match(/\d+\/\d+\/\d+/)) {
        values = line.split(',');
      } else {
        // Try decrypting
        // Since decryptText is now O(N), this is fast enough
        values = decryptText(line).split(',');
      }

      const toNum = (val: string | undefined) => (val && val.trim() !== '' ? parseFloat(val) : NaN);

      // Helper to get value by column name
      const getVal = (colName: string) => {
        const idx = colMap[colName];
        return idx !== undefined ? values[idx] : undefined;
      };

      // Helper to get value by index relative to Time of Day (legacy fallback)
      const getValByIndex = (offset: number) => {
        // Fallback logic if column mapping failed
        // In legacy format: 0=ID, 1=Date, 2=Time, 3=Temp1...
        return values[offset];
      };

      const row: MareeRow = {
        Date: getVal('Date') || getValByIndex(1) || '',
        TimeOfDay: getVal('Time of Day') || getValByIndex(2) || '',
        Latitude: toNum(getVal('Latitude') || getVal('Lat')),
        Longitude: toNum(getVal('Longitude') || getVal('Long') || getVal('Lng')),
        // Map sensors based on fixed positions (3 to 14)
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
        // Map status flags/consignes
        A1: toNum(getVal('AF') || getValByIndex(15)),
        A2: toNum(getVal('AS') || getValByIndex(16)),
        A3: toNum(getVal('AT') || getValByIndex(17)),
        // Legacy fallbacks for A4-A12 if needed, or just leave undefined
      };

      // Fallback for Lat/Lon if not found by name but we have enough columns (Legacy format)
      if (isNaN(row.Latitude) && values.length > 27) {
        row.Latitude = toNum(values[27]);
        row.Longitude = toNum(values[28]);
      }

      return row;
    });

    return data;
  }

  renderTable(data: MareeRow[]): void {
    const validEntries = data.filter((entry) => entry.Date && entry.TimeOfDay);
    if (!validEntries.length) return;

    const normalizeTimeWithSeconds = (timeStr: string): string => {
      const parts = timeStr.split(':');
      if (parts.length === 2) {
        // HH:mm  -> HH:mm:00
        return `${parts[0]}:${parts[1]}:00`;
      }
      if (parts.length >= 3) {
        // HH:mm:ss or longer -> keep first 3 parts
        return `${parts[0]}:${parts[1]}:${parts[2]}`;
      }
      return timeStr;
    };

    const first = validEntries[0];
    const last = validEntries[validEntries.length - 1];

    this.startDate = `${first.Date} ${normalizeTimeWithSeconds(first.TimeOfDay)}`;
    this.endDate = `${last.Date} ${normalizeTimeWithSeconds(last.TimeOfDay)}`;
    this.duration = calculateDuration(this.startDate, this.endDate);
  }

  createChart(data: MareeRow[], index: number): void {
    const canvasId = 'chart' + index;
    const canvasElement = document.getElementById(canvasId);

    console.log(`Attempting to create chart ${index}, canvas found:`, !!canvasElement);

    if (!canvasElement) {
      console.error(`Canvas element not found for chart ${index}`);
      return;
    }

    // Apply display step from settings (in minutes)
    const stepMinutes = this.chartSettings.displayStep;
    console.log(`Chart ${index}: Applying displayStep=${stepMinutes} minutes to ${data.length} data points`);

    // Time-based filtering: keep points at stepMinutes intervals
    let filteredData: MareeRow[] = [];
    if (data.length > 0) {
      // Always include the first point
      filteredData.push(data[0]);
      let lastIncludedTime = formatDate(data[0].Date, data[0].TimeOfDay).getTime();

      for (let i = 1; i < data.length; i++) {
        const currentTime = formatDate(data[i].Date, data[i].TimeOfDay).getTime();
        const timeDiffMinutes = (currentTime - lastIncludedTime) / (1000 * 60);

        // Include this point if enough time has passed
        if (timeDiffMinutes >= stepMinutes) {
          filteredData.push(data[i]);
          lastIncludedTime = currentTime;
        }
      }
    }
    console.log(`  After ${stepMinutes}-minute interval filtering: ${filteredData.length} points remaining`);

    // Check if we have any valid temperature data in the filtered set
    const sampleTemps = filteredData.slice(0, 10).map(d => ({
      Temp1: d.Temp1,
      Temp2: d.Temp2,
      Temp3: d.Temp3
    }));
    console.log(`  Sample temperatures from filtered data:`, sampleTemps);

    // Filter out consecutive duplicates (same Date and Time)
    const uniqueData: MareeRow[] = [];
    if (filteredData.length > 0) {
      uniqueData.push(filteredData[0]);
      for (let i = 1; i < filteredData.length; i++) {
        const prev = uniqueData[uniqueData.length - 1];
        const curr = filteredData[i];
        if (curr.Date !== prev.Date || curr.TimeOfDay !== prev.TimeOfDay) {
          uniqueData.push(curr);
        }
      }
    }
    filteredData = uniqueData;

    // Pre-calculate X values (Dates)
    const xValues = filteredData.map((entry) => formatDate(entry.Date, entry.TimeOfDay));

    const datasets: any[] = [];
    const lastValid: { [tempKey: string]: number } = {};

    // Use sensors from settings
    const sensors = this.chartSettings.sensors || [];

    console.log(`Chart ${index}: Processing ${sensors.length} sensors from settings`);
    sensors.forEach(s => {
      console.log(`  Sensor ${s.id} (${s.label}): enabled=${s.enabled}, color=${s.color}, min=${s.min}, max=${s.max}`);
    });

    sensors.forEach((sensor, idx) => {
      // Skip disabled sensors
      if (!sensor.enabled) {
        console.log(`  Skipping disabled sensor: ${sensor.id} (${sensor.label})`);
        return;
      }

      const key = `Temp${sensor.id}`;
      // Use label from settings if available, otherwise fallback to file header or default
      const nom = sensor.label || this.sensorNames[key] || `Temp${sensor.id}`;

      // Log first few raw values to debug
      console.log(`  Processing ${nom} (${key}):`, {
        firstEntry: filteredData[0],
        rawValue: (filteredData[0] as any)[key],
        sampleRawValues: filteredData.slice(0, 3).map(e => (e as any)[key])
      });

      const tempSeries = filteredData.map((entry, i) => {
        const raw = (entry as any)[key] as number;
        const x = xValues[i];

        // If we have a valid value (not -127 and not NaN), use it and update lastValid
        if (raw !== this.invalidTempSentinel && !isNaN(raw)) {
          lastValid[key] = raw;
          return { x, y: raw };
        }

        // If we have a lastValid value, use it (carry forward last good value)
        // Otherwise, return null (we haven't found a valid value yet)
        const val = lastValid[key] !== undefined ? lastValid[key] : null;
        return { x, y: val };
      });

      const hasValidData = tempSeries.some(val => val.y !== this.invalidTempSentinel && val.y !== null && !isNaN(val.y));

      console.log(`  Sensor ${sensor.id} (${nom}): hasValidData=${hasValidData}, sample data:`, tempSeries.slice(0, 5));

      if (hasValidData) {
        console.log(`    -> Adding temperature dataset for ${nom}`);
        datasets.push({
          label: nom,
          borderColor: sensor.color,
          data: tempSeries,
          pointRadius: 0,
          fill: false,
          borderWidth: 2,
        });
      } else {
        console.log(`    -> Skipping ${nom} - no valid data found`);
      }

      // Add Min consigne from settings
      if (sensor.min !== undefined && sensor.min !== null) {
        const consigneSeries = filteredData.map((_, i) => ({
          x: xValues[i],
          y: sensor.min
        }));
        datasets.push({
          label: `Min ${nom}`,
          borderColor: sensor.color,
          data: consigneSeries,
          pointRadius: 0,
          fill: false,
          borderWidth: 1,
          borderDash: [5, 5],
        });
      }

      // Add Max consigne from settings
      if (sensor.max !== undefined && sensor.max !== null) {
        const consigneSeries = filteredData.map((_, i) => ({
          x: xValues[i],
          y: sensor.max
        }));
        datasets.push({
          label: `Max ${nom}`,
          borderColor: sensor.color,
          data: consigneSeries,
          pointRadius: 0,
          fill: false,
          borderWidth: 1,
          borderDash: [5, 5],
        });
      }
    });

    console.log(`Chart ${index}: Created ${datasets.length} datasets`);
    datasets.forEach(ds => {
      console.log(`  - ${ds.label}: ${ds.data.length} points, color: ${ds.borderColor}`);
    });

    // Custom plugin to draw Date labels (Tachograph style)
    const tachographPlugin = {
      id: 'tachographAxis',
      afterDraw: (chart: any) => {
        const ctx = chart.ctx;
        const xAxis = chart.scales.x;
        const yPos = xAxis.bottom;

        ctx.save();
        ctx.font = 'bold 11px Arial';
        ctx.textAlign = 'center';
        ctx.fillStyle = '#000';

        // Draw separator line between time ticks and date labels
        ctx.beginPath();
        ctx.moveTo(xAxis.left, yPos + 20);
        ctx.lineTo(xAxis.right, yPos + 20);
        ctx.strokeStyle = '#ccc';
        ctx.lineWidth = 0.5;
        ctx.stroke();

        // Find all midnight boundaries for day changes
        if (xValues.length === 0) {
          ctx.restore();
          return;
        }

        // Get the time range displayed in the chart
        const startTime = xValues[0].getTime();
        const endTime = xValues[xValues.length - 1].getTime();

        // Find all midnight (00:00) timestamps in the range
        const midnights: { timestamp: number; date: string }[] = [];

        // Start from the first data point's date at midnight
        const firstDate = new Date(xValues[0]);
        firstDate.setHours(0, 0, 0, 0);

        // If the first point is after midnight, we need to include that day's midnight
        if (firstDate.getTime() < startTime) {
          // Move to next midnight
          firstDate.setDate(firstDate.getDate() + 1);
        }

        // Collect all midnights in the range
        let currentMidnight = new Date(firstDate);
        while (currentMidnight.getTime() <= endTime) {
          if (currentMidnight.getTime() >= startTime && currentMidnight.getTime() <= endTime) {
            const day = String(currentMidnight.getDate()).padStart(2, '0');
            const month = String(currentMidnight.getMonth() + 1).padStart(2, '0');
            const year = currentMidnight.getFullYear();
            midnights.push({
              timestamp: currentMidnight.getTime(),
              date: `${day}/${month}/${year}`
            });
          }
          currentMidnight.setDate(currentMidnight.getDate() + 1);
        }

        // Draw the first day (from start to first midnight, or to end if no midnight)
        let currentDayStart = xAxis.left;
        const firstDay = new Date(xValues[0]);
        const day = String(firstDay.getDate()).padStart(2, '0');
        const month = String(firstDay.getMonth() + 1).padStart(2, '0');
        const year = firstDay.getFullYear();
        const firstDateStr = `${day}/${month}/${year}`;

        if (midnights.length > 0) {
          // Draw first partial day
          const firstMidnightPos = xAxis.getPixelForValue(midnights[0].timestamp);
          const centerX = (currentDayStart + firstMidnightPos) / 2;
          if (centerX >= xAxis.left && centerX <= xAxis.right) {
            ctx.fillText(firstDateStr, centerX, yPos + 35);
          }

          // Draw midnight separator
          ctx.beginPath();
          ctx.moveTo(firstMidnightPos, yPos);
          ctx.lineTo(firstMidnightPos, yPos + 20);
          ctx.strokeStyle = '#000';
          ctx.lineWidth = 1;
          ctx.stroke();

          currentDayStart = firstMidnightPos;

          // Draw remaining days
          for (let i = 0; i < midnights.length; i++) {
            const nextBoundary = i < midnights.length - 1
              ? xAxis.getPixelForValue(midnights[i + 1].timestamp)
              : xAxis.right;

            const centerX = (currentDayStart + nextBoundary) / 2;
            if (centerX >= xAxis.left && centerX <= xAxis.right) {
              ctx.fillText(midnights[i].date, centerX, yPos + 35);
            }

            if (i < midnights.length - 1) {
              // Draw midnight separator
              ctx.beginPath();
              ctx.moveTo(nextBoundary, yPos);
              ctx.lineTo(nextBoundary, yPos + 20);
              ctx.strokeStyle = '#000';
              ctx.lineWidth = 1;
              ctx.stroke();
            }

            currentDayStart = nextBoundary;
          }
        } else {
          // No midnights in range, just draw the single day
          const centerX = (xAxis.left + xAxis.right) / 2;
          if (centerX >= xAxis.left && centerX <= xAxis.right) {
            ctx.fillText(firstDateStr, centerX, yPos + 35);
          }
        }

        ctx.restore();
      }
    };

    // Plugin to draw minor Y-axis ticks between main ticks
    const minorTicksPlugin = {
      id: 'minorYAxisTicks',
      afterDraw: (chart: any) => {
        const yAxis = chart.scales.y;
        if (!yAxis) return;

        const ctx = chart.ctx;
        const ticks = yAxis.ticks || [];
        if (!ticks.length || ticks.length < 2) return;

        ctx.save();
        // Slightly darker and thicker so minor ticks are clearly visible
        ctx.strokeStyle = '#aaaaaa';
        ctx.lineWidth = 0.6;

        // Draw 9 minor ticks between each pair of main ticks
        for (let i = 0; i < ticks.length - 1; i++) {
          const startVal = ticks[i].value;
          const endVal = ticks[i + 1].value;

          const startY = yAxis.getPixelForValue(startVal);
          const endY = yAxis.getPixelForValue(endVal);

          for (let j = 1; j <= 9; j++) {
            const ratio = j / 10;
            const y = startY + (endY - startY) * ratio;

            // Minor tick mark (left side, a bit longer)
            ctx.beginPath();
            ctx.moveTo(yAxis.left - 6, y);
            ctx.lineTo(yAxis.left, y);
            ctx.stroke();

            // Very light horizontal grid line across the chart area
            ctx.save();
            ctx.strokeStyle = '#e5e5e5';
            ctx.lineWidth = 0.3;
            ctx.beginPath();
            ctx.moveTo(yAxis.left, y);
            ctx.lineTo(yAxis.right, y);
            ctx.stroke();
            ctx.restore();
          }
        }

        ctx.restore();
      }
    };

    // Calculate dynamic min/max to include consignes
    let yMin = this.chartSettings.tempMin;
    let yMax = this.chartSettings.tempMax;

    // Check active consignes (Min/Max) to expand range if needed
    datasets.forEach(ds => {
      if (ds.label && (ds.label.startsWith('Min ') || ds.label.startsWith('Max '))) {
        const val = ds.data[0]?.y; // Consigne is constant
        if (val !== undefined && val !== null) {
          if (val < yMin) yMin = val - 5; // Add padding
          if (val > yMax) yMax = val + 5;
        }
      }
    });

    const chart = new Chart(canvasId, {
      type: 'line',
      data: {
        datasets,
      },
      plugins: [tachographPlugin, minorTicksPlugin],
      options: {
        responsive: true,
        maintainAspectRatio: false,
        layout: {
          padding: {
            top: 10,
            bottom: 40,
          },
        },
        scales: {
          x: {
            type: 'time',
            time: {
              unit: 'hour',
              displayFormats: {
                hour: 'HH:mm'
              }
            },
            // Set min/max to enforce exact time range based on pointsPerPage (in minutes)
            min: xValues.length > 0 ? xValues[0].getTime() : undefined,
            max: xValues.length > 0 ? xValues[0].getTime() + (this.chartSettings.pointsPerPage * 60 * 1000) : undefined,
            grid: {
              // Vertical grid lines for "millimetre paper" effect
              display: true,
              drawOnChartArea: true,
              drawTicks: true,
              color: '#e0e0e0',
              lineWidth: 0.4,
            },
            border: {
              display: true,
              color: '#000',
              width: 1,
            },
            ticks: {
              autoSkip: true,
              maxTicksLimit: 24,
              source: 'auto'
            },
            title: {
              display: false,
            },
          },
          y: {
            display: true,
            min: yMin,
            max: yMax,
            grid: {
              // Main horizontal grid lines slightly darker
              color: '#d0d0d0',
              lineWidth: 0.7,
            },
            ticks: {
              // Main labeled ticks every 10°C
              stepSize: 10,
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
                size: 14,
              },
              boxWidth: 15,
              padding: 8,
            },
            maxHeight: 100,
          },
          title: {
            display: false,
          },
          tooltip: {
            callbacks: {
              title: (tooltipItems: any) => {
                if (!tooltipItems || !tooltipItems.length) {
                  return '';
                }

                const first = tooltipItems[0];
                const value = first.parsed && first.parsed.x !== undefined ? first.parsed.x : first.label;

                const date = value instanceof Date ? value : new Date(value);
                if (isNaN(date.getTime())) {
                  return '';
                }

                const hours = String(date.getHours()).padStart(2, '0');
                const minutes = String(date.getMinutes()).padStart(2, '0');
                return `${hours}:${minutes}`;
              }
            }
          },
        },
      },
    });

    this.charts.push(chart);
  }

  handlePrint(): void {
    // Save original title
    const originalTitle = document.title;

    // Change title for print
    document.title = 'CST F3S 2024';

    // Set current date and time for print header
    const now = new Date();
    const day = String(now.getDate()).padStart(2, '0');
    const month = String(now.getMonth() + 1).padStart(2, '0');
    const year = now.getFullYear();
    const hours = String(now.getHours()).padStart(2, '0');
    const minutes = String(now.getMinutes()).padStart(2, '0');
    const seconds = String(now.getSeconds()).padStart(2, '0');

    this.printDate = `Édité ${day}/${month}/${year}`;
    this.printTime = `${hours}:${minutes}:${seconds}`;

    // Increase chart resolution for print
    this.charts.forEach((chart, index) => {
      const canvas = document.getElementById('chart' + index) as HTMLCanvasElement;
      if (canvas) {
        // Set higher resolution for print
        const ctx = canvas.getContext('2d');
        if (ctx) {
          // Store original size
          const originalWidth = canvas.width;
          const originalHeight = canvas.height;

          // Increase resolution (2x for better quality)
          canvas.width = originalWidth * 2;
          canvas.height = originalHeight * 2;
          canvas.style.width = originalWidth + 'px';
          canvas.style.height = originalHeight + 'px';

          // Scale context to match
          ctx.scale(2, 2);

          // Redraw chart
          chart.resize();
        }
      }
    });

    // Print after a short delay to ensure rendering is complete
    setTimeout(() => {
      window.print();

      // Restore original title and reset resolution after print
      setTimeout(() => {
        document.title = originalTitle;
        this.charts.forEach((chart) => {
          chart.resize();
        });
      }, 100);
    }, 300);
  }




  goBack(): void {
    this.router.navigate(['/main']);
  }
}

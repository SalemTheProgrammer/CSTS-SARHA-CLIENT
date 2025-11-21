import { Injectable } from '@angular/core';
import { Chart, registerables } from 'chart.js';
import 'chartjs-adapter-moment';
import jsPDF from 'jspdf';
import html2canvas from 'html2canvas';
import { ChartSettingsService, ChartSettings } from './chart-settings.service';
import { ConfigService } from './config.service';
import { MareeRow } from '../components/graphique/graphique-types.util';
import { decryptText } from '../components/graphique/graphique-decrypt.util';
import { calculateDuration, formatDate } from '../components/graphique/graphique-datetime.util';
import { computeTotalDistance } from '../components/graphique/graphique-distance.util';
import { paginate } from '../components/graphique/graphique-paginate.util';

Chart.register(...registerables);

interface ParsedResult {
  data: MareeRow[];
  company: string | null;
  shipName: string | null;
  registration: string | null;
  asvNumber: string | null;
  callSign: string | null;
  maree: string | null;
  vesselNumber: string | null;
  sensorNames: { [key: string]: string };
}

@Injectable({ providedIn: 'root' })
export class PrintService {
  private readonly invalidTempSentinel = -127;

  constructor(
    private chartSettingsService: ChartSettingsService,
    private configService: ConfigService,
  ) { }

  async printGraphFromFileContent(contents: string): Promise<void> {
    if (!contents || contents.trim().length === 0) {
      throw new Error('Empty content');
    }

    // Use a visible iframe to ensure print dialog works correctly
    // Some browsers restrict printing from hidden iframes
    const iframe = document.createElement('iframe');
    iframe.style.position = 'fixed';
    iframe.style.right = '0';
    iframe.style.bottom = '0';
    iframe.style.width = '1px'; // Minimal width
    iframe.style.height = '1px'; // Minimal height
    iframe.style.border = '0';
    iframe.style.opacity = '0.01'; // Almost invisible but technically visible
    iframe.style.pointerEvents = 'none'; // Don't interfere with clicks
    document.body.appendChild(iframe);

    // Ensure configuration is loaded so Marée Numéro / Numéro agrument match GraphiqueComponent
    try {
      if (!this.configService.getConfig()) {
        await this.configService.loadConfig();
      }
    } catch (e) {
      console.warn('Failed to load AppConfig before printing', e);
    }

    const chartSettings = this.chartSettingsService.getSettings();
    const parsed = this.parseCSV(contents);
    const data = parsed.data;

    data.sort((a, b) => {
      const dateA = formatDate(a.Date, a.TimeOfDay).getTime();
      const dateB = formatDate(b.Date, b.TimeOfDay).getTime();
      return dateA - dateB;
    });

    const distance = computeTotalDistance(data);
    const pages = await paginate([...data], chartSettings.pointsPerPage);

    let lastRow: MareeRow | undefined;
    pages.forEach((page) => {
      if (lastRow) page.unshift(lastRow);
      lastRow = page[page.length - 1];
    });

    const container = document.createElement('div');
    container.style.position = 'fixed';
    container.style.left = '-10000px';
    container.style.top = '0';
    container.style.width = '0';
    container.style.height = '0';
    document.body.appendChild(container);

    try {
      pages.forEach((page, index) => {
        const tableWrap = document.createElement('div');
        tableWrap.id = 'dataTable' + index;
        tableWrap.innerHTML = this.buildHeaderTableHtml(parsed, data.length, distance, data);
        container.appendChild(tableWrap);

        const canvas = document.createElement('canvas');
        canvas.id = 'chart' + index;
        canvas.style.width = '100%';
        canvas.style.height = '600px';
        canvas.width = 1600;
        canvas.height = 740;
        container.appendChild(canvas);

        this.createChart(canvas, page, chartSettings, parsed.sensorNames);
      });

      await new Promise((res) => setTimeout(res, 300));

      const html = this.buildPrintHtml(pages, parsed, data.length, distance, data);
      const doc = iframe.contentDocument || iframe.contentWindow?.document;
      if (!doc) {
        throw new Error('Unable to access iframe document');
      }
      doc.open();
      doc.write(html);
      doc.close();
    } finally {
      document.body.removeChild(container);
      setTimeout(() => {
        if (iframe.parentNode) iframe.parentNode.removeChild(iframe);
      }, 2000);
    }
  }

  // Build a PDF blob from the same layout used for printing
  async generatePdfFromFileContent(contents: string): Promise<Blob> {
    if (!contents || contents.trim().length === 0) {
      throw new Error('Empty content');
    }

    // Ensure configuration is loaded for header values
    try {
      if (!this.configService.getConfig()) {
        await this.configService.loadConfig();
      }
    } catch (e) {
      console.warn('Failed to load AppConfig before PDF generation', e);
    }

    const chartSettings = this.chartSettingsService.getSettings();
    const parsed = this.parseCSV(contents);
    const data = parsed.data;

    data.sort((a, b) => {
      const dateA = formatDate(a.Date, a.TimeOfDay).getTime();
      const dateB = formatDate(b.Date, b.TimeOfDay).getTime();
      return dateA - dateB;
    });

    const distance = computeTotalDistance(data);
    const pages = await paginate([...data], chartSettings.pointsPerPage);

    let lastRow: MareeRow | undefined;
    pages.forEach((page) => {
      if (lastRow) page.unshift(lastRow);
      lastRow = page[page.length - 1];
    });

    // Create a container that is visible but off-screen to ensure rendering works
    // html2canvas sometimes fails with elements that are display:none or completely hidden
    const container = document.createElement('div');
    container.style.position = 'absolute';
    container.style.left = '-9999px';
    container.style.top = '0';
    container.style.width = '1123px'; // Fixed width for A4 landscape
    container.style.zIndex = '-1000';
    container.style.background = '#fff';
    document.body.appendChild(container);

    const pageDivs: HTMLDivElement[] = [];

    try {
      console.log(`Generating PDF with ${pages.length} pages...`);

      // Build DOM pages (header table + chart canvas) off-screen
      pages.forEach((page, index) => {
        const pageDiv = document.createElement('div');
        pageDiv.style.width = '1123px'; // approx A4 landscape width at 96dpi
        pageDiv.style.padding = '20px';
        pageDiv.style.backgroundColor = '#ffffff'; // Ensure white background
        pageDiv.style.boxSizing = 'border-box';

        // Use the exact same structure as buildPrintHtml
        pageDiv.className = 'chart-page';
        pageDiv.style.display = 'flex';
        pageDiv.style.flexDirection = 'column';
        pageDiv.style.minHeight = '100vh';
        pageDiv.style.boxSizing = 'border-box';
        pageDiv.style.padding = '1cm';
        pageDiv.style.position = 'relative';
        pageDiv.style.margin = '0';
        pageDiv.style.backgroundColor = '#ffffff';

        const contentDiv = document.createElement('div');
        contentDiv.className = 'chart-content';
        contentDiv.style.flexGrow = '1';
        contentDiv.style.display = 'flex';
        contentDiv.style.flexDirection = 'column';

        const titleH2 = document.createElement('h2');
        titleH2.style.textAlign = 'center';
        titleH2.style.fontSize = '14px'; // Match GraphiqueComponent print style
        titleH2.style.margin = '4px 0 8px 0'; // Match GraphiqueComponent print style
        titleH2.innerText = 'Relevé de température';
        contentDiv.appendChild(titleH2);

        const tableWrap = document.createElement('div');
        tableWrap.id = 'pdfDataTable' + index;
        tableWrap.innerHTML = this.buildHeaderTableHtml(parsed, data.length, distance, data);
        contentDiv.appendChild(tableWrap);

        const canvas = document.createElement('canvas');
        canvas.id = 'pdfChart' + index;
        canvas.style.width = '100%';
        canvas.style.height = 'auto'; // Let it scale naturally
        canvas.width = 1600;
        canvas.height = 400;
        canvas.style.display = 'block';
        canvas.style.margin = '6px 0 0 0'; // Match GraphiqueComponent print style
        contentDiv.appendChild(canvas);

        pageDiv.appendChild(contentDiv);

        // Add footer
        const now = new Date();
        const day = String(now.getDate()).padStart(2, '0');
        const month = String(now.getMonth() + 1).padStart(2, '0');
        const year = now.getFullYear();
        const hours = String(now.getHours()).padStart(2, '0');
        const minutes = String(now.getMinutes()).padStart(2, '0');
        const seconds = String(now.getSeconds()).padStart(2, '0');

        const printDate = `Edité le ${day}/${month}/${year} à ${hours}:${minutes}:${seconds}`; // Match GraphiqueComponent format

        const footerDiv = document.createElement('div');
        footerDiv.className = 'pageFooter'; // Match GraphiqueComponent class
        footerDiv.style.display = 'flex';
        footerDiv.style.justifyContent = 'space-between';
        footerDiv.style.alignItems = 'center';
        footerDiv.style.marginTop = '6mm'; // Match GraphiqueComponent style
        footerDiv.style.fontSize = '12px'; // Match GraphiqueComponent style
        footerDiv.style.fontWeight = 'bolder'; // Match GraphiqueComponent style
        footerDiv.style.width = '100%';

        footerDiv.innerHTML = `
          <div class="copyrightpageFooter" style="text-align: left;">${printDate}</div>
          <div class="innerpageFooter" style="text-align: right;">© CST UP 2023 Page ${index + 1}/${pages.length}</div>
        `;
        pageDiv.appendChild(footerDiv);

        container.appendChild(pageDiv);
        pageDivs.push(pageDiv);

        this.createChart(canvas, page, chartSettings, parsed.sensorNames);
      });

      // Wait for charts to render
      console.log('Waiting for charts to render...');
      await new Promise((res) => setTimeout(res, 1000)); // Increased timeout to ensure rendering

      const doc = new jsPDF({ orientation: 'landscape', unit: 'pt', format: 'a4' });
      const pageWidth = doc.internal.pageSize.getWidth();
      const pageHeight = doc.internal.pageSize.getHeight();

      console.log('Capturing pages with html2canvas...');
      for (let i = 0; i < pageDivs.length; i++) {
        if (i > 0) doc.addPage();

        const pageDiv = pageDivs[i];

        // Use html2canvas with logging and specific settings
        // Increase scale to improve resolution (3 or 4 is usually good for print)
        const canvas = await html2canvas(pageDiv, {
          scale: 3,
          logging: false,
          useCORS: true,
          allowTaint: true,
          backgroundColor: '#ffffff'
        });

        const imgData = canvas.toDataURL('image/png');

        const imgWidth = pageWidth - 40; // 20pt margins
        const imgHeight = (canvas.height * imgWidth) / canvas.width;

        doc.addImage(imgData, 'PNG', 20, 20, imgWidth, Math.min(imgHeight, pageHeight - 40));
        console.log(`Page ${i + 1} added to PDF`);
      }

      const blob = doc.output('blob');
      console.log('PDF Blob generated successfully');
      return blob;
    } catch (err) {
      console.error('Error inside generatePdfFromFileContent:', err);
      throw err;
    } finally {
      if (document.body.contains(container)) {
        document.body.removeChild(container);
      }
    }
  }

  private buildHeaderTableHtml(parsed: ParsedResult, totalRows: number, distance: number, data: MareeRow[]): string {
    const validEntries = data.filter((e) => e.Date && e.TimeOfDay);
    const startDate = validEntries.length ? `${validEntries[0].Date} ${validEntries[0].TimeOfDay}` : '';
    const endDate = validEntries.length ? `${validEntries[validEntries.length - 1].Date} ${validEntries[validEntries.length - 1].TimeOfDay}` : '';
    const duration = startDate && endDate ? calculateDuration(startDate, endDate) : '';

    // Calculate active sensors
    const chartSettings = this.chartSettingsService.getSettings();
    const sensors = chartSettings.sensors || [];
    const activeSensors: string[] = [];

    sensors.forEach(sensor => {
      if (!sensor.enabled) return;

      const key = `Temp${sensor.id}`;
      const hasValid = data.some(row => {
        const val = (row as any)[key] as number;
        return !isNaN(val) && val !== this.invalidTempSentinel;
      });
      if (hasValid) {
        const sensorName = sensor.label || parsed.sensorNames[key] || `Temp${sensor.id}`;
        activeSensors.push(sensorName);
      }
    });
    const activeSensorsText = activeSensors.join(', ');
    const sensorCount = activeSensors.length;

    const distanceText = isNaN(distance) ? '—' : distance.toFixed(3);

    const thCell = 'border:1px solid #000;background:#a5f3fc;text-align:right;padding:8px 12px;white-space:nowrap;font-weight:600;font-size:9px;color:#000;';
    const tdCell = 'border:1px solid #000;text-align:center;padding:8px 12px;font-size:9px;color:#000;background:#fff;';
    const tdCellBold = 'border:1px solid #000;text-align:center;padding:8px 12px;font-size:11px;font-weight:700;color:#000;background:#fff;';
    const headCell = 'border:1px solid #000;background:#e5e7eb;text-align:center;padding:8px;font-weight:700;color:#000;';

    return `
      <table style="width:100%;max-width:100%;border-collapse:collapse;margin:10px auto;font-size:9px;">
        <thead>
          <tr>
            <th colspan="4" style="${headCell}">NAVIRE</th>
            <th colspan="4" style="${headCell}">MAREE</th>
          </tr>
        </thead>
        <tbody style="color:#000;background:#fff;">
          <tr>
            <th style="${thCell}">Société :</th>
            <td style="${tdCell}">${parsed.company ?? '—'}</td>
            <th style="${thCell}">Nom du Navire :</th>
            <td style="${tdCell}">${parsed.shipName ?? '—'}</td>
            <th style="${thCell}">Num Maree :</th>
            <td style="${tdCell}">${parsed.vesselNumber ?? '—'}</td>
            <th style="${thCell}">Date départ :</th>
            <td style="${tdCell}">${startDate || '—'}</td>
          </tr>
          <tr>
            <th style="${thCell}">Agrément Num. :</th>
            <td style="${tdCell}">${parsed.maree ?? '—'}</td>
            <th style="${thCell}">Numéro ASV :</th>
            <td style="${tdCell}">${parsed.asvNumber ?? '—'}</td>
            <th style="${thCell}">Nb Point :</th>
            <td style="${tdCell}">${totalRows}</td>
            <th style="${thCell}">Date d'Arrivée :</th>
            <td style="${tdCell}">${endDate || '—'}</td>
          </tr>
          <tr>
            <th style="${thCell}">Immatriculation :</th>
            <td style="${tdCell}">${parsed.registration ?? '—'}</td>
            <th style="${thCell}">Indicatif d'appel :</th>
            <td style="${tdCell}">${parsed.callSign ?? '—'}</td>
            <th style="${thCell}">Trajet Mille Marin :</th>
            <td style="${tdCell}">${distanceText}</td>
            <th style="${thCell}">Durée :</th>
            <td style="${tdCell}">${duration || '—'}</td>
          </tr>
        </tbody>
      </table>
    `;
  }

  private buildPrintHtml(pages: MareeRow[][], parsed: ParsedResult, totalRows: number, distance: number, data: MareeRow[]): string {
    const now = new Date();
    const day = String(now.getDate()).padStart(2, '0');
    const month = String(now.getMonth() + 1).padStart(2, '0');
    const year = now.getFullYear();
    const hours = String(now.getHours()).padStart(2, '0');
    const minutes = String(now.getMinutes()).padStart(2, '0');
    const seconds = String(now.getSeconds()).padStart(2, '0');

    const printDate = `Édité ${day}/${month}/${year}`;
    const printTime = `${hours}:${minutes}:${seconds}`;

    let chartsHtml = '';

    for (let index = 0; index < pages.length; index++) {
      const chartCanvas = document.getElementById('chart' + index) as HTMLCanvasElement;
      const table = document.getElementById('dataTable' + index);

      chartsHtml += '<div class="chart-page">';
      chartsHtml += '<div class="chart-content">';
      chartsHtml += '<h2 style="text-align:center;font-size:20px;font-weight:600;margin:20px 0 16px 0;">Relevé de température</h2>';
      chartsHtml += table ? table.outerHTML : '';
      if (chartCanvas) {
        chartsHtml += `<div style="width:100%;max-width:100%;margin:0 auto;"><img src="${chartCanvas.toDataURL()}" alt="Graphique" style="width:100%;height:auto;display:block;margin:5px auto;padding:10px;"></div>`;
      }
      chartsHtml += '</div>';
      chartsHtml += `<div class="print-footer">
        <div class="print-footer-left">${printDate}&nbsp;&nbsp;&nbsp;${printTime}</div>
        <div class="print-footer-center"></div>
        <div class="print-footer-right">© CST F3S 2024 Page ${index + 1}/${pages.length}</div>
      </div>`;
      chartsHtml += '</div>';
    }

    return `
      <html>
        <head>
          <title>Relevé de température - ${printDate}</title>
          <base href="/">
          <style type="text/css">
            @page {
              size: A4 landscape;
              margin: 0mm;
            }

            html, body {
              margin: 0 !important;
              padding: 0 !important;
              width: 100%;
              height: 100%;
            }

            body {
              font-family: Arial, Helvetica, sans-serif;
              color: #000;
            }

            * {
              print-color-adjust: exact !important;
              -webkit-print-color-adjust: exact !important;
            }

            .chart-page {
              display: flex;
              flex-direction: column;
              height: 100vh; /* Use fixed height for print page */
              box-sizing: border-box;
              padding: 1cm;
              page-break-after: always !important;
              page-break-inside: avoid !important;
              break-after: page !important;
              break-inside: avoid-page !important;
              width: 100%;
              position: relative;
              margin: 0 !important;
            }

            .chart-page:last-of-type {
              page-break-after: auto !important;
              break-after: auto !important;
            }

            .chart-content {
              flex-grow: 1;
              display: flex;
              flex-direction: column;
            }

            .print-footer {
              display: flex;
              justify-content: space-between;
              align-items: center;
              padding: 8px 10px;
              font-size: 10px;
              font-weight: 600;
              color: #000;
              margin-top: auto;
              flex-shrink: 0;
            }

            .print-footer-left {
              flex: 1;
              text-align: left;
            }

            .print-footer-center {
              flex: 1;
              text-align: center;
              font-size: 11px;
              font-weight: 700;
            }

            .print-footer-right {
              flex: 1;
              text-align: right;
            }

            table {
              border-collapse: collapse;
              width: 100%;
              page-break-inside: avoid !important;
            }

            th, td {
              border: 1px solid #000;
              padding: 8px 12px;
              text-align: left;
              font-size: 9px;
              color: #000;
            }
          </style>
        </head>
        <body onload="window.print();window.close()">
          ${chartsHtml}
        </body>
      </html>
    `;
  }

  private createChart(canvas: HTMLCanvasElement, data: MareeRow[], chartSettings: ChartSettings, sensorNames: { [key: string]: string } = {}): void {
    const step = chartSettings.displayStep;
    let filteredData = data.filter((_, index) => index % step === 0);

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
    const sensors = chartSettings.sensors || [];

    // Calculate dynamic min/max to include consignes
    let yMin = chartSettings.tempMin;
    let yMax = chartSettings.tempMax;

    sensors.forEach((sensor) => {
      if (!sensor.enabled) return;

      const key = `Temp${sensor.id}`;
      const nom = sensor.label || sensorNames[key] || `Temp${sensor.id}`;

      const tempSeries = filteredData.map((entry, i) => {
        const raw = (entry as any)[key] as number;
        const x = xValues[i];
        if (raw !== this.invalidTempSentinel && !isNaN(raw)) {
          lastValid[key] = raw;
          return { x, y: raw };
        }
        const val = lastValid[key] ?? null;
        return { x, y: val };
      });

      const hasValidData = tempSeries.some((v) => v.y !== this.invalidTempSentinel && v.y !== null && !isNaN(v.y));

      if (hasValidData) {
        datasets.push({
          label: nom,
          borderColor: sensor.color,
          data: tempSeries,
          pointRadius: 0,
          fill: false,
          borderWidth: 2,
        });
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

        // Expand Y-axis range if needed
        if (sensor.min < yMin) yMin = sensor.min - 5;
        if (sensor.min > yMax) yMax = sensor.min + 5;
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

        // Expand Y-axis range if needed
        if (sensor.max < yMin) yMin = sensor.max - 5;
        if (sensor.max > yMax) yMax = sensor.max + 5;
      }
    });


    // Custom plugin to draw Date labels (Tachograph style)
    const tachographPlugin = {
      id: 'tachographAxis',
      afterDraw: (chart: any) => {
        const ctx = chart.ctx;
        const xAxis = chart.scales.x;
        const yPos = xAxis.bottom;

        ctx.save();
        ctx.font = 'bold 14px Arial'; // Larger font for print
        ctx.textAlign = 'center';
        ctx.fillStyle = '#000';

        // Draw separator line between time ticks and date labels
        ctx.beginPath();
        ctx.moveTo(xAxis.left, yPos + 20);
        ctx.lineTo(xAxis.right, yPos + 20);
        ctx.strokeStyle = '#ccc';
        ctx.lineWidth = 0.5;
        ctx.stroke();

        let lastDate = '';
        let currentDayStart = xAxis.left;

        // Iterate to find day boundaries
        filteredData.forEach((entry, i) => {
          if (entry.Date !== lastDate) {
            // Use timestamp to get pixel position
            const xPos = xAxis.getPixelForValue(xValues[i].getTime());

            if (lastDate !== '') {
              const centerX = (currentDayStart + xPos) / 2;
              // Only draw if visible
              if (centerX >= xAxis.left && centerX <= xAxis.right) {
                ctx.fillText(lastDate, centerX, yPos + 38);
              }

              // Draw vertical separator for day change
              ctx.beginPath();
              ctx.moveTo(xPos, yPos);
              ctx.lineTo(xPos, yPos + 20);
              ctx.strokeStyle = '#000';
              ctx.lineWidth = 1;
              ctx.stroke();
            }

            currentDayStart = xPos;
            lastDate = entry.Date;
          }
        });

        // Draw last day
        if (lastDate !== '') {
          const centerX = (currentDayStart + xAxis.right) / 2;
          if (centerX >= xAxis.left && centerX <= xAxis.right) {
            ctx.fillText(lastDate, centerX, yPos + 38);
          }
        }

        ctx.restore();
      }
    };

    // Plugin to draw minor Y-axis ticks between main ticks (match GraphiqueComponent)
    const minorTicksPlugin = {
      id: 'minorYAxisTicks',
      afterDraw: (chart: any) => {
        const yAxis = chart.scales.y;
        if (!yAxis) return;

        const ctx = chart.ctx;
        const ticks = yAxis.ticks || [];
        if (!ticks.length || ticks.length < 2) return;

        ctx.save();
        ctx.strokeStyle = '#aaaaaa';
        ctx.lineWidth = 0.6;

        for (let i = 0; i < ticks.length - 1; i++) {
          const startVal = ticks[i].value;
          const endVal = ticks[i + 1].value;

          const startY = yAxis.getPixelForValue(startVal);
          const endY = yAxis.getPixelForValue(endVal);

          for (let j = 1; j <= 9; j++) {
            const ratio = j / 10;
            const y = startY + (endY - startY) * ratio;

            ctx.beginPath();
            ctx.moveTo(yAxis.left - 6, y);
            ctx.lineTo(yAxis.left, y);
            ctx.stroke();

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

    new Chart(canvas, {
      type: 'line',
      data: { datasets },
      plugins: [tachographPlugin, minorTicksPlugin],
      options: {
        responsive: false,
        maintainAspectRatio: false,
        // Extra bottom padding for bigger labels in print
        layout: { padding: { top: 10, bottom: 55 } },
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
            max: xValues.length > 0 ? xValues[0].getTime() + (chartSettings.pointsPerPage * 60 * 1000) : undefined,
            grid: {
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
              color: '#d0d0d0',
              lineWidth: 0.7,
            },
            ticks: {
              stepSize: 10,
              font: { size: 11 },
            },
            title: {
              display: true,
              text: 'Températures °C',
              font: { size: 14 },
            },
          },
        },
        plugins: {
          legend: {
            display: true,
            position: 'top',
            labels: { font: { size: 14 }, boxWidth: 15, padding: 8 },
            maxHeight: 100
          },
          title: {
            display: false, // Title is now handled outside the chart
          },
        },
      },
    });
  }

  private parseCSV(contents: string): ParsedResult {
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

    // Extract sensor names (indices 3 to 14)
    const sensorNames: { [key: string]: string } = {};
    for (let i = 1; i <= 12; i++) {
      const colIdx = 2 + i; // 3 to 14
      if (colIdx < headerColumns.length) {
        const colName = headerColumns[colIdx];
        if (colName && colName.length > 0) {
          sensorNames[`Temp${i}`] = colName;
        }
      }
    }

    // Parse metadata (lines 0-17) - handle potential encryption
    const getMeta = (idx: number) => {
      const line = allLines[idx];
      if (!line) return '';

      // Try to decrypt first, as metadata lines are often fully encrypted or mixed
      try {
        const decrypted = decryptText(line);
        // Check if decryption resulted in a readable format (e.g., "Label,Value")
        if (decrypted.includes(',')) {
          const parts = decrypted.split(',');
          if (parts.length > 1) {
            return parts[1].trim();
          }
        }
      } catch (e) {
        // Ignore decryption errors
      }

      // Fallback: Try to split the original line by comma
      if (line.includes(',')) {
        const parts = line.split(',');
        if (parts.length > 1) {
          return parts[1].trim();
        }
      }

      return '';
    };

    const company = getMeta(0);
    const shipName = getMeta(1);
    const registration = getMeta(2);
    const asvNumber = getMeta(3);
    const callSign = getMeta(4);
    let vesselNumber = getMeta(5);
    let maree = getMeta(17);

    // Override from AppConfig
    const cfg = this.configService.getConfig();
    if (cfg) {
      const toStringValue = (value: string | number | undefined | null): string | null => {
        if (value === undefined || value === null) return null;
        return typeof value === 'number' ? String(value) : value;
      };
      const vesselFromCfg = toStringValue(cfg.numeroNavire);
      if (vesselFromCfg !== null) vesselNumber = vesselFromCfg;
      const mareeValue = (cfg as any).numeroAgrument ?? (cfg as any).numeroArgument;
      const mareeFromCfg = toStringValue(mareeValue);
      if (mareeFromCfg !== null) maree = mareeFromCfg;
    }

    const dataLines = allLines.slice(headerRowIndex + 1).filter(l => l.trim().length > 0);
    const toNum = (val: string | undefined) => (val && val.trim() !== '' ? parseFloat(val) : NaN);

    const data: MareeRow[] = dataLines.map((line) => {
      let values: string[];
      // Check if line needs decryption
      if (line.includes(',') && line.match(/\d+\/\d+\/\d+/)) {
        values = line.split(',');
      } else {
        values = decryptText(line).split(',');
      }

      return {
        Date: values[1] || '',
        TimeOfDay: values[2] || '',
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
        // Legacy A1-A12 mapping (indices 15-26)
        A1: toNum(values[15]),
        A2: toNum(values[16]),
        A3: toNum(values[17]),
        // ...
        Latitude: toNum(values[27]), // Fallback index
        Longitude: toNum(values[28]),
      } as MareeRow;
    });

    return { data, company, shipName, registration, asvNumber, callSign, maree, vesselNumber, sensorNames };
  }
}

// Utility functions extracted from Graphique component
import moment from 'moment';

export interface MareeRow {
  Date: string;
  TimeOfDay: string;
  Latitude: number;
  Longitude: number;
  Temp1?: number;
  Temp2?: number;
  Temp3?: number;
  Temp4?: number;
  Temp5?: number;
  Temp6?: number;
  Temp7?: number;
  Temp8?: number;
  Temp9?: number;
  Temp10?: number;
  Temp11?: number;
  Temp12?: number;
  A1?: number;
  A2?: number;
  A3?: number;
  A4?: number;
  A5?: number;
  A6?: number;
  A7?: number;
  A8?: number;
  A9?: number;
  A10?: number;
  A11?: number;
  A12?: number;
  [key: string]: any;
}

const INVALID_TEMP_SENTINEL = -127;

// ========================= DECRYPT =========================
export function decryptText(encryptedText: string): string {
  const Ref: string[] = [
    '0','1','2','3','4','5','6','7','8','9',
    '.','-','A','B','C','D','E','F','G','H',
    'I','J','K','L','M','N','O','P','Q','R',
    'S','T','U','V','W','X','Y','Z','a','b',
    'c','d','e','f','g','h','i','j','k','l',
    'm','n','o','p','q','r','s','t','u','v',
    'w','x','y','z'
  ];

  const EncryptCle: string[] = [
    'Dm','An','fo','Up','nq','1r','.s','ot','uC','Nv',
    '0Q','F1','2u','3k','4M','O5','d6','7P','8y','x9',
    '0S','JT','UR','iV','zW','KX','YI','Zw','aL','Xb',
    'T.','-V','A4','B6','Ch','vD','jE','F9','G8','gH',
    'Yc','bd','Be','fG','gH','ah','Zi','jE','kl','lt',
    'pI','Jq','K5','LW','M7','N3','O2','mP','eQ','SR',
    'ws','xr','yc','z-'
  ];

  let decryptedText = '';
  let i = 0;

  while (i < encryptedText.length) {
    let decryptedChar = '';
    let found = false;

    for (let j = 3; j >= 2; j--) {
      const encryptedChar = encryptedText.substr(i, j);
      const index = EncryptCle.indexOf(encryptedChar);
      if (index !== -1) {
        decryptedChar = Ref[index];
        i += j;
        found = true;
        break;
      }
    }

    if (!found) {
      decryptedChar = encryptedText.substr(i, 1);
      i++;
    }

    decryptedText += decryptedChar;
  }

  return decryptedText;
}

// ========================= DATE / TIME =========================
export function strToDate(dtStr: string | null): Date | null {
  if (!dtStr) return null;

  const dateParts = dtStr.split('/');
  const timeParts = dateParts[2].split(' ')[1].split(':');
  dateParts[2] = dateParts[2].split(' ')[0];

  return new Date(+dateParts[2], +dateParts[1] - 1, +dateParts[0], +timeParts[0], +timeParts[1]);
}

export function formatDate(date: string, time: string): Date {
  const [day, month, year] = date.split('/');
  const [hour, minute] = time.split(':');
  return new Date(`${year}-${month}-${day}T${hour}:${minute}`);
}

export function calculateDuration(startDate: string, endDate: string): string {
  const start = strToDate(startDate);
  const end = strToDate(endDate);
  if (!start || !end) return '';

  const durationInMs = end.valueOf() - start.valueOf();
  const durationInSecs = Math.floor(durationInMs / 1000);
  const durationInMins = Math.floor(durationInSecs / 60);
  const durationInHours = Math.floor(durationInMins / 60);
  const durationInDays = Math.floor(durationInHours / 24);
  const remainingHours = durationInHours % 24;
  const remainingMins = durationInMins % 60;

  return `${durationInDays} Jr, ${remainingHours} Hr et ${remainingMins} Mn`;
}

// ========================= DISTANCE =========================
export function doDistance(latA: number, lngA: number, latB: number, lngB: number): number {
  if (latA === 0 || lngA === 0 || latB === 0 || lngB === 0) return 0;
  return (
    3440.0647948 *
    Math.acos(
      Math.cos(latA * (Math.PI / 180)) *
        Math.cos(latB * (Math.PI / 180)) *
        Math.cos(lngB * (Math.PI / 180) - lngA * (Math.PI / 180)) +
        Math.sin(latA * (Math.PI / 180)) * Math.sin(latB * (Math.PI / 180))
    )
  );
}

export function computeTotalDistance(data: MareeRow[]): number {
  let distance = 0;
  let prevRow: MareeRow | null = null;

  for (const row of data) {
    if (prevRow) {
      const val = doDistance(
        Number(prevRow.Latitude),
        Number(prevRow.Longitude),
        Number(row.Latitude),
        Number(row.Longitude)
      );
      distance += val || 0;
    }
    if (Number(row.Latitude) !== 0 && Number(row.Longitude) !== 0) {
      prevRow = row;
    }
  }

  return Math.round(distance * 1000) / 1000;
}

// ========================= PAGINATION =========================
export async function paginate(arr: MareeRow[], size: number): Promise<MareeRow[][]> {
  return arr.reduce((acc: MareeRow[][], val: MareeRow, i: number) => {
    const idx = Math.floor(i / size);
    const page = acc[idx] || (acc[idx] = []);
    page.push(val);
    return acc;
  }, []);
}

// ========================= PRINT =========================
export function buildPrintHtml(spliteddata: MareeRow[]): string {
  let chartsHtml = '';

  for (let index = 0; index < spliteddata.length; index++) {
    const chartCanvas = document.getElementById('chart' + index) as HTMLCanvasElement;
    const table = document.getElementById('dataTable' + index);

    chartsHtml += '<div class="content">';
    chartsHtml += '<h2 style="text-align:center;font-">Réleveé de températures</h2>';
    chartsHtml += table ? table.outerHTML : '';
    if (chartCanvas) {
      chartsHtml += `<img src="${chartCanvas.toDataURL()}" alt="Graphique" style="width:100%;display:block;margin-bottom:0px;margin-top:0px">`;
    }
    chartsHtml += `<div class="pageFooter" style="font-size: 12px;font-weight: bolder;">
        <div class="copyrightpageFooter">Edité le ${moment().format('DD/MM/yyyy à HH:mm:ss')}</div>
        <div class="innerpageFooter">© CST UP 2023 Page ${index + 1}/${spliteddata.length}</div>
      </div>
    </div>`;
  }

  return `
    <html>
      <head>
        <title></title>
        <base href="/">
        <style type="text/css">
          @page {
            size: landscape;
            margin-top: 2mm;
            margin-left: 2mm;
            margin-right: 5mm;
            margin-bottom: 0mm;
          }
          table {
            border-collapse: collapse;
          }
          th, td {
            border: 1px solid black;
            padding: 2px;
            text-align: left;
          }
          body{
            counter-reset: page;
          }
          .content {
            display: table;
            height: 100%;
          }
          .pageFooter {
            display: table-footer-group;
            position: relative;
            width: 100% !important;
            bottom: 15px;
            height: 20px !important;
          }
          .innerpageFooter{
            position: absolute;
            right: 10px;
            bottom: 0px;
          }
          .copyrightpageFooter{
            position: absolute;
            left: 10px;
            bottom: 0px;
          }
        </style>
      </head>
      <body onload="window.print();window.close()" style="padding:0;margin:0;">
        ${chartsHtml}
      </body>
    </html>
  `;
}

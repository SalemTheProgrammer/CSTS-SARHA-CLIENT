import moment from 'moment';
import { MareeRow } from './graphique-types.util';

export function buildPrintHtml(spliteddata: MareeRow[]): string {
  let chartsHtml = '';

  for (let index = 0; index < spliteddata.length; index++) {
    const chartCanvas = document.getElementById('chart' + index) as HTMLCanvasElement;
    const table = document.getElementById('dataTable' + index);

    chartsHtml += '<div class="content">';
    chartsHtml += '<h2 style="text-align:center;font-size:14px;margin:4px 0 8px 0;">Relevé de température</h2>';
    chartsHtml += table ? table.outerHTML : '';
    if (chartCanvas) {
      chartsHtml += `<img src="${chartCanvas.toDataURL()}" alt="Graphique" style="width:100%;height:auto;display:block;margin:6px 0 0 0;page-break-inside:avoid;">`;
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
          @page { size: A4 landscape; margin: 6mm 8mm 8mm 8mm; }
          html, body { height: 100%; }
          body { margin: 0; padding: 0; font-family: Arial, Helvetica, sans-serif; color: #000; }
          table { border-collapse: collapse; width: 100%; }
          th, td { border: 1px solid black; padding: 2px; text-align: left; }
          .content { page-break-after: always; padding-bottom: 8mm; }
          .content:last-child { page-break-after: auto; }
          img { max-width: 100%; height: auto; }
          .pageFooter { display: flex; align-items: center; justify-content: space-between; margin-top: 6mm; }
          .innerpageFooter { text-align: right; }
          .copyrightpageFooter { text-align: left; }
        </style>
      </head>
      <body onload="window.print();window.close()" style="padding:0;margin:0;">
        ${chartsHtml}
      </body>
    </html>
  `;
}

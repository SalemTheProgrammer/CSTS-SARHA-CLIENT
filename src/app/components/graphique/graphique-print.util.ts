import moment from 'moment';
import { MareeRow } from './graphique-types.util';

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

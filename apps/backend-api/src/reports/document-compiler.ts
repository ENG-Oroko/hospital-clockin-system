import { Injectable, Logger } from '@nestjs/common';
import * as ExcelJS from 'exceljs';
import pdfMake from 'pdfmake/build/pdfmake';
import pdfFonts from 'pdfmake/build/vfs_fonts';

pdfMake.vfs = (pdfFonts as any).pdfMake.vfs;

type ReportRow = Record<string, string | number | boolean | null>;
type CompiledReportPayload = {
  summary?: Record<string, unknown>;
  rows?: Array<Record<string, unknown>>;
};

@Injectable()
export class DocumentCompiler {
  private readonly logger = new Logger(DocumentCompiler.name);

  private normalizeValue(value: unknown): string | number | boolean | null {
    if (value === null || value === undefined) {
      return null;
    }

    if (typeof value === 'string' || typeof value === 'number' || typeof value === 'boolean') {
      return value;
    }

    if (value instanceof Date) {
      return value.toISOString();
    }

    if (Array.isArray(value) || typeof value === 'object') {
      try {
        return JSON.stringify(value);
      } catch {
        return String(value);
      }
    }

    return String(value);
  }

  async compileToExcelBuffer(rows: Array<Record<string, unknown>>, sheetName = 'Report'): Promise<Buffer> {
    const workbook = new ExcelJS.Workbook();
    const sheet = workbook.addWorksheet(sheetName);

    if (!rows || rows.length === 0) {
      sheet.addRow(['No data']);
    } else {
      const columns = Object.keys(rows[0]);
      sheet.addRow(columns);

      for (const row of rows) {
        sheet.addRow(columns.map((column) => this.normalizeValue(row[column])));
      }

      sheet.columns.forEach((col) => {
        let maxWidth = 12;
        col.eachCell({ includeEmpty: true }, (cell) => {
          const text = cell.value === null || cell.value === undefined ? '' : String(cell.value);
          const len = text.length;
          if (len > maxWidth) maxWidth = len;
        });
        col.width = Math.min(50, maxWidth + 2);
      });

      sheet.properties.defaultRowHeight = 16;
    }

    const buffer = await workbook.xlsx.writeBuffer();
    return Buffer.from(buffer);
  }

  async compileToPdfBuffer(compiledData: CompiledReportPayload): Promise<Buffer> {
    const summary = compiledData?.summary ?? {};
    const rows = Array.isArray(compiledData?.rows) ? compiledData.rows : [];
    const columns = rows.length > 0 ? Object.keys(rows[0]) : [];

    const docDefinition: any = {
      info: { title: 'Report' },
      content: [
        { text: 'Report Summary', style: 'header' },
        {
          table: {
            widths: ['auto', '*'],
            body: Object.entries(summary).map(([key, value]) => [
              { text: key, bold: true },
              { text: this.normalizeValue(value) ?? '' },
            ]),
          },
          layout: 'lightHorizontalLines',
        },
      ],
      styles: {
        header: { fontSize: 14, bold: true, margin: [0, 10, 0, 6] },
        tableHeader: { bold: true, fillColor: '#f3f3f3' },
        tableCell: { margin: [0, 2, 0, 2] },
      },
      defaultStyle: { fontSize: 9, columnGap: 10 },
    };

    if (rows.length > 0) {
      const body = [columns.map((column) => ({ text: column, style: 'tableHeader' }))];
      for (const row of rows) {
        body.push(
          columns.map((column) => ({
            text: String(this.normalizeValue(row[column]) ?? ''),
            style: 'tableCell',
          })),
        );
      }

      docDefinition.content.push({ text: 'Rows', style: 'header' });
      docDefinition.content.push({
        table: {
          headerRows: 1,
          widths: columns.map(() => '*'),
          body,
        },
        layout: 'lightHorizontalLines',
      });
    }

    return new Promise<Buffer>((resolve, reject) => {
      try {
        const pdfDocGenerator = (pdfMake as any).createPdf(docDefinition);
        pdfDocGenerator.getBuffer((buffer: Uint8Array) => resolve(Buffer.from(buffer)));
      } catch (error) {
        this.logger.error('PDF compilation failed', error as Error);
        reject(error);
      }
    });
  }
}

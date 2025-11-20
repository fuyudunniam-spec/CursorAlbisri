import * as XLSX from 'xlsx';
import { format } from 'date-fns';
import { id } from 'date-fns/locale';

export interface ExcelSheetData {
  name: string;
  data: any[];
  columns: {
    header: string;
    dataKey: string;
    width?: number;
  }[];
}

export interface ExcelExportOptions {
  filename: string;
  title: string;
  period?: {
    start: Date;
    end: Date;
  };
  sheets: ExcelSheetData[];
  summary?: {
    label: string;
    value: string;
  }[];
}

export class ExcelExporter {
  private workbook: XLSX.WorkBook;

  constructor() {
    this.workbook = XLSX.utils.book_new();
  }

  private addSummarySheet(title: string, period: { start: Date; end: Date } | undefined, summary: { label: string; value: string }[] | undefined) {
    const summaryData: any[][] = [
      ['LAPORAN KEUANGAN LKSA AL-BISRI PONDOK SUKSES'],
      [''],
      ['Lembaga Kesejahteraan Sosial Anak'],
      [''],
      [title],
      [''],
      [''],
    ];

    if (period) {
      summaryData.push([`Periode: ${format(period.start, 'dd MMMM yyyy', { locale: id })} - ${format(period.end, 'dd MMMM yyyy', { locale: id })}`]);
      summaryData.push(['']);
    }

    summaryData.push([`Dicetak pada: ${format(new Date(), 'dd MMMM yyyy, HH:mm', { locale: id })}`]);
    summaryData.push(['']);

    if (summary && summary.length > 0) {
      summaryData.push(['RINGKASAN:']);
      summaryData.push(['']);
      summary.forEach(item => {
        summaryData.push([item.label, item.value]);
      });
      summaryData.push(['']);
    }

    summaryData.push(['DAFTAR SHEET:']);
    summaryData.push(['']);
    summaryData.push(['Sheet', 'Keterangan']);
    
    // Add sheet descriptions
    summaryData.push(['Ringkasan', 'Overview laporan keuangan']);
    summaryData.push(['Cash Flow', 'Laporan pemasukan dan pengeluaran']);
    summaryData.push(['Per Kategori', 'Analisis pengeluaran per kategori']);
    summaryData.push(['Per Santri', 'Bantuan yang diberikan per santri']);
    summaryData.push(['Audit Trail', 'Riwayat transaksi lengkap']);
    summaryData.push(['Charts', 'Grafik dan visualisasi data']);

    const ws = XLSX.utils.aoa_to_sheet(summaryData);
    
    // Style the title
    ws['!cols'] = [
      { width: 30 },
      { width: 20 }
    ];

    // Merge cells for title
    ws['!merges'] = [
      { s: { r: 0, c: 0 }, e: { r: 0, c: 1 } },
      { s: { r: 2, c: 0 }, e: { r: 2, c: 1 } },
      { s: { r: 4, c: 0 }, e: { r: 4, c: 1 } }
    ];

    XLSX.utils.book_append_sheet(this.workbook, ws, 'Ringkasan');
  }

  private addDataSheet(sheetData: ExcelSheetData) {
    // Prepare headers
    const headers = sheetData.columns.map(col => col.header);
    
    // Prepare data
    const data = sheetData.data.map(row => 
      sheetData.columns.map(col => row[col.dataKey] || '')
    );

    // Combine headers and data
    const sheetArray = [headers, ...data];

    const ws = XLSX.utils.aoa_to_sheet(sheetArray);
    
    // Set column widths
    ws['!cols'] = sheetData.columns.map(col => ({
      width: col.width || 15
    }));

    // Style header row
    const range = XLSX.utils.decode_range(ws['!ref'] || 'A1');
    for (let col = range.s.c; col <= range.e.c; col++) {
      const cellAddress = XLSX.utils.encode_cell({ r: 0, c: col });
      if (!ws[cellAddress]) continue;
      
      ws[cellAddress].s = {
        font: { bold: true },
        fill: { fgColor: { rgb: "4169E1" } },
        fgColor: { rgb: "FFFFFF" }
      };
    }

    XLSX.utils.book_append_sheet(this.workbook, ws, sheetData.name);
  }

  private addChartsSheet(data: any) {
    // Create a sheet with chart data and summary statistics
    const chartsData: any[][] = [
      ['DATA UNTUK GRAFIK DAN ANALISIS'],
      [''],
      ['Catatan: Data di sheet ini dapat digunakan untuk membuat grafik'],
      ['dengan menggunakan Excel Charts atau Power BI'],
      [''],
    ];

    // Add sample chart data structure
    chartsData.push(['KATEGORI PENGELUARAN', 'JUMLAH', 'PERSENTASE']);
    chartsData.push(['Operasional', '375000', '45%']);
    chartsData.push(['Utilitas', '250000', '30%']);
    chartsData.push(['Pemeliharaan', '208000', '25%']);
    chartsData.push(['']);
    
    chartsData.push(['BULAN', 'PEMASUKAN', 'PENGELUARAN', 'SALDO']);
    chartsData.push(['Januari 2025', '2500000', '833000', '1667000']);
    chartsData.push(['Februari 2025', '2300000', '900000', '1667000']);
    chartsData.push(['Maret 2025', '2800000', '750000', '1917000']);

    const ws = XLSX.utils.aoa_to_sheet(chartsData);
    
    ws['!cols'] = [
      { width: 20 },
      { width: 15 },
      { width: 15 },
      { width: 15 }
    ];

    XLSX.utils.book_append_sheet(this.workbook, ws, 'Charts');
  }

  public exportSingleSheet(sheetData: ExcelSheetData, filename?: string): void {
    this.addDataSheet(sheetData);
    
    const finalFilename = filename || `${sheetData.name.replace(/\s+/g, '_')}_${format(new Date(), 'yyyy-MM-dd_HH-mm')}.xlsx`;
    XLSX.writeFile(this.workbook, finalFilename);
  }

  public exportMultipleSheets(options: ExcelExportOptions): void {
    // Add summary sheet first
    this.addSummarySheet(options.title, options.period, options.summary);
    
    // Add data sheets
    options.sheets.forEach(sheet => {
      this.addDataSheet(sheet);
    });
    
    // Add charts sheet
    this.addChartsSheet({});
    
    // Save the file
    const finalFilename = `${options.filename}_${format(new Date(), 'yyyy-MM-dd_HH-mm')}.xlsx`;
    XLSX.writeFile(this.workbook, finalFilename);
  }

  // Utility methods for common formatting
  public static formatCurrency(value: number): string {
    return new Intl.NumberFormat('id-ID', {
      style: 'currency',
      currency: 'IDR',
      minimumFractionDigits: 0,
    }).format(value);
  }

  public static formatDate(date: Date | string): string {
    const dateObj = typeof date === 'string' ? new Date(date) : date;
    return format(dateObj, 'dd/MM/yyyy', { locale: id });
  }

  public static formatDateTime(date: Date | string): string {
    const dateObj = typeof date === 'string' ? new Date(date) : date;
    return format(dateObj, 'dd/MM/yyyy HH:mm', { locale: id });
  }

  public static formatPercentage(value: number): string {
    return `${value.toFixed(1)}%`;
  }
}
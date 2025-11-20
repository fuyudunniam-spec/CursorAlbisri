import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import { format } from 'date-fns';
import { id } from 'date-fns/locale';

export interface PDFExportOptions {
  title: string;
  subtitle?: string;
  period?: {
    start: Date;
    end: Date;
  };
  data: any[];
  columns: {
    header: string;
    dataKey: string;
    width?: number;
    render?: (value: any, row?: any) => string;
  }[];
  summary?: {
    label: string;
    value: string;
  }[];
}

export class PDFExporter {
  private doc: jsPDF;
  private currentY: number = 0;
  private pageHeight: number = 0;
  private margin: number = 20;

  constructor() {
    this.doc = new jsPDF();
    this.pageHeight = this.doc.internal.pageSize.height;
  }

  /**
   * Export single report
   */
  public exportSingleReport(options: PDFExportOptions): void {
    this.addHeader(options.title, options.subtitle);
    
    if (options.period) {
      this.addPeriodInfo(options.period);
    }

    if (options.summary) {
      this.addSummary(options.summary);
    }

    this.addDataTable(options.data, options.columns);
    this.addFooter();
    
    this.downloadPDF(options.title);
  }

  /**
   * Export multiple reports in one PDF
   */
  public exportMultipleReports(reports: PDFExportOptions[]): void {
    // Cover page
    this.addCoverPage();
    
    reports.forEach((report, index) => {
      if (index > 0) {
        this.doc.addPage();
        this.currentY = this.margin;
      }
      
      this.addReportHeader(report.title, report.subtitle);
      
      if (report.period) {
        this.addPeriodInfo(report.period);
      }

      if (report.summary) {
        this.addSummary(report.summary);
      }

      this.addDataTable(report.data, report.columns);
      
      if (index < reports.length - 1) {
        this.addPageBreak();
      }
    });

    this.addFinalFooter();
    this.downloadPDF('Laporan_Keuangan_Lengkap');
  }

  private addCoverPage(): void {
    // Title
    this.doc.setFontSize(24);
    this.doc.setFont('helvetica', 'bold');
    this.doc.text('LAPORAN KEUANGAN LENGKAP', this.getCenterX('LAPORAN KEUANGAN LENGKAP'), 80);
    
    // Subtitle
    this.doc.setFontSize(16);
    this.doc.setFont('helvetica', 'normal');
    this.doc.text('LKSA Al-Bisri Pondok Sukses', this.getCenterX('LKSA Al-Bisri Pondok Sukses'), 100);
    
    // Date
    this.doc.setFontSize(12);
    this.doc.text(`Dibuat: ${format(new Date(), 'dd MMMM yyyy, HH:mm', { locale: id })}`, this.getCenterX(`Dibuat: ${format(new Date(), 'dd MMMM yyyy, HH:mm', { locale: id })}`), 120);
    
    // Watermark
    this.doc.setFontSize(10);
    this.doc.setTextColor(200, 200, 200);
    this.doc.text('LKSA Al-Bisri', this.getCenterX('LKSA Al-Bisri'), this.pageHeight - 20);
    
    this.currentY = 150;
  }

  private addHeader(title: string, subtitle?: string): void {
    // Logo placeholder (you can add actual logo here)
    this.doc.setFontSize(20);
    this.doc.setFont('helvetica', 'bold');
    this.doc.setTextColor(0, 0, 0);
    this.doc.text('LKSA Al-Bisri', this.margin, 30);
    
    // Title
    this.doc.setFontSize(18);
    this.doc.text(title, this.margin, 45);
    
    if (subtitle) {
      this.doc.setFontSize(12);
      this.doc.setFont('helvetica', 'normal');
      this.doc.text(subtitle, this.margin, 55);
    }
    
    this.currentY = 70;
  }

  private addReportHeader(title: string, subtitle?: string): void {
    this.doc.setFontSize(16);
    this.doc.setFont('helvetica', 'bold');
    this.doc.text(title, this.margin, this.currentY);
    this.currentY += 15;
    
    if (subtitle) {
      this.doc.setFontSize(10);
      this.doc.setFont('helvetica', 'normal');
      this.doc.text(subtitle, this.margin, this.currentY);
      this.currentY += 15;
    }
  }

  private addPeriodInfo(period: { start: Date; end: Date }): void {
    this.doc.setFontSize(10);
    this.doc.setFont('helvetica', 'normal');
    const periodText = `Periode: ${format(period.start, 'dd MMMM yyyy', { locale: id })} - ${format(period.end, 'dd MMMM yyyy', { locale: id })}`;
    this.doc.text(periodText, this.margin, this.currentY);
    this.currentY += 20;
  }

  private addSummary(summary: { label: string; value: string }[]): void {
    this.doc.setFontSize(12);
    this.doc.setFont('helvetica', 'bold');
    this.doc.text('RINGKASAN', this.margin, this.currentY);
    this.currentY += 15;

    this.doc.setFontSize(10);
    this.doc.setFont('helvetica', 'normal');
    
    summary.forEach(item => {
      this.doc.text(`${item.label}:`, this.margin, this.currentY);
      this.doc.text(item.value, this.margin + 80, this.currentY);
      this.currentY += 10;
    });
    
    this.currentY += 10;
  }

  private addDataTable(data: any[], columns: any[]): void {
    if (data.length === 0) {
      this.doc.setFontSize(10);
      this.doc.text('Tidak ada data untuk ditampilkan', this.margin, this.currentY);
      return;
    }

    // Prepare table data
    const tableData = data.map(row => 
      columns.map(col => {
        const value = row[col.dataKey];
        return col.render ? col.render(value, row) : String(value || '');
      })
    );

    const headers = columns.map(col => col.header);

    // Check if table fits on current page
    const estimatedTableHeight = (data.length + 1) * 8;
    if (this.currentY + estimatedTableHeight > this.pageHeight - 40) {
      this.doc.addPage();
      this.currentY = this.margin;
    }

    // Calculate total width and adjust if needed
    const totalWidth = columns.reduce((sum, col) => sum + (col.width || 20), 0);
    const maxWidth = this.pageWidth - (2 * this.margin); // ~165mm for A4
    
    let adjustedColumns = columns;
    if (totalWidth > maxWidth) {
      // Scale down all columns proportionally
      const scaleFactor = maxWidth / totalWidth;
      adjustedColumns = columns.map(col => ({
        ...col,
        width: col.width ? Math.floor(col.width * scaleFactor) : 20
      }));
      
      console.warn(`Table width ${totalWidth}mm exceeded page width. Scaled to ${maxWidth}mm`);
    }

    autoTable(this.doc, {
      head: [headers],
      body: tableData,
      startY: this.currentY,
      margin: { left: this.margin, right: this.margin },
      styles: {
        fontSize: 8,
        cellPadding: 3,
        overflow: 'linebreak', // Allow text wrapping
        cellWidth: 'wrap'
      },
      headStyles: {
        fillColor: [65, 105, 225],
        textColor: [255, 255, 255],
        fontStyle: 'bold',
        halign: 'center'
      },
      alternateRowStyles: {
        fillColor: [245, 245, 245],
      },
      columnStyles: adjustedColumns.reduce((acc, col, index) => {
        if (col.width) {
          acc[index] = { 
            cellWidth: col.width,
            halign: ['pemasukan', 'pengeluaran', 'saldo'].includes(col.dataKey) ? 'right' : 'left'
          };
        }
        return acc;
      }, {} as any),
    });

    this.currentY = (this.doc as any).lastAutoTable.finalY + 10;
  }

  private addPageBreak(): void {
    this.doc.addPage();
    this.currentY = this.margin;
  }

  private addFooter(): void {
    const footerY = this.pageHeight - 20;
    
    // Page number
    this.doc.setFontSize(8);
    this.doc.text(`Halaman ${this.doc.getCurrentPageInfo().pageNumber}`, this.getCenterX(`Halaman ${this.doc.getCurrentPageInfo().pageNumber}`), footerY);
    
    // Watermark
    this.doc.setTextColor(200, 200, 200);
    this.doc.text('LKSA Al-Bisri', this.getCenterX('LKSA Al-Bisri'), footerY - 10);
  }

  private addFinalFooter(): void {
    this.doc.addPage();
    this.currentY = this.margin;
    
    this.doc.setFontSize(12);
    this.doc.setFont('helvetica', 'bold');
    this.doc.text('LAPORAN KEUANGAN LENGKAP - LKSA AL-BISRI', this.getCenterX('LAPORAN KEUANGAN LENGKAP - LKSA AL-BISRI'), 100);
    
    this.doc.setFontSize(10);
    this.doc.setFont('helvetica', 'normal');
    this.doc.text('Dibuat dengan sistem informasi manajemen LKSA Al-Bisri', this.getCenterX('Dibuat dengan sistem informasi manajemen LKSA Al-Bisri'), 120);
    this.doc.text(`Tanggal: ${format(new Date(), 'dd MMMM yyyy, HH:mm', { locale: id })}`, this.getCenterX(`Tanggal: ${format(new Date(), 'dd MMMM yyyy, HH:mm', { locale: id })}`), 140);
    
    // Signature placeholder
    this.doc.text('Tanda Tangan:', this.margin, 180);
    this.doc.text('_________________________', this.margin, 200);
    this.doc.text('Kepala LKSA Al-Bisri', this.margin, 220);
    
    this.addFooter();
  }

  private downloadPDF(filename: string): void {
    const finalFilename = `${filename.replace(/\s+/g, '_')}_${format(new Date(), 'yyyy-MM-dd_HH-mm')}.pdf`;
    this.doc.save(finalFilename);
  }

  private getCenterX(text: string): number {
    const textWidth = this.doc.getTextWidth(text);
    return (this.doc.internal.pageSize.width - textWidth) / 2;
  }

  // Static utility methods
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
}
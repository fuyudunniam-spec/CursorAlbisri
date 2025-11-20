import jsPDF from 'jspdf';
import 'jspdf-autotable';
import * as XLSX from 'xlsx';

// Extend jsPDF type to include autoTable
declare module 'jspdf' {
  interface jsPDF {
    autoTable: (options: any) => jsPDF;
  }
}

export interface ExportData {
  headers: string[];
  rows: any[][];
  title: string;
  subtitle?: string;
}

export const exportToPDF = (data: ExportData): void => {
  const doc = new jsPDF();
  
  // Add title
  doc.setFontSize(16);
  doc.text(data.title, 14, 22);
  
  // Add subtitle if provided
  if (data.subtitle) {
    doc.setFontSize(12);
    doc.text(data.subtitle, 14, 30);
  }
  
  // Add date
  const currentDate = new Date().toLocaleDateString('id-ID');
  doc.setFontSize(10);
  doc.text(`Tanggal: ${currentDate}`, 14, 38);
  
  // Create table
  doc.autoTable({
    head: [data.headers],
    body: data.rows,
    startY: 45,
    styles: {
      fontSize: 10,
      cellPadding: 3,
    },
    headStyles: {
      fillColor: [59, 130, 246], // Blue color
      textColor: 255,
      fontStyle: 'bold',
    },
    alternateRowStyles: {
      fillColor: [248, 250, 252], // Light gray
    },
    margin: { top: 45, right: 14, bottom: 14, left: 14 },
  });
  
  // Add footer
  const pageCount = doc.getNumberOfPages();
  for (let i = 1; i <= pageCount; i++) {
    doc.setPage(i);
    doc.setFontSize(8);
    doc.text(
      `Halaman ${i} dari ${pageCount}`,
      doc.internal.pageSize.getWidth() - 30,
      doc.internal.pageSize.getHeight() - 10
    );
  }
  
  // Save the PDF
  doc.save(`${data.title.replace(/\s+/g, '_')}_${currentDate}.pdf`);
};

export const exportToExcel = (data: ExportData): void => {
  // Create workbook
  const wb = XLSX.utils.book_new();
  
  // Prepare data for worksheet
  const wsData = [
    [data.title],
    data.subtitle ? [data.subtitle] : [],
    [`Tanggal: ${new Date().toLocaleDateString('id-ID')}`],
    [], // Empty row
    data.headers,
    ...data.rows,
  ];
  
  // Create worksheet
  const ws = XLSX.utils.aoa_to_sheet(wsData);
  
  // Set column widths
  const colWidths = data.headers.map(() => ({ wch: 20 }));
  ws['!cols'] = colWidths;
  
  // Style the title row
  if (ws['A1']) {
    ws['A1'].s = {
      font: { bold: true, size: 16 },
      alignment: { horizontal: 'center' }
    };
  }
  
  // Style the header row
  const headerRowIndex = data.subtitle ? 4 : 3;
  data.headers.forEach((_, index) => {
    const cellAddress = XLSX.utils.encode_cell({ r: headerRowIndex, c: index });
    if (ws[cellAddress]) {
      ws[cellAddress].s = {
        font: { bold: true },
        fill: { fgColor: { rgb: '3B82F6' } },
        alignment: { horizontal: 'center' }
      };
    }
  });
  
  // Add worksheet to workbook
  XLSX.utils.book_append_sheet(wb, ws, 'Laporan');
  
  // Save the Excel file
  const currentDate = new Date().toLocaleDateString('id-ID');
  XLSX.writeFile(wb, `${data.title.replace(/\s+/g, '_')}_${currentDate}.xlsx`);
};

// Utility function to format currency for export
export const formatCurrencyForExport = (amount: number): string => {
  return new Intl.NumberFormat('id-ID', {
    style: 'currency',
    currency: 'IDR',
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(amount);
};

// Utility function to format date for export
export const formatDateForExport = (dateString: string): string => {
  return new Date(dateString).toLocaleDateString('id-ID');
};

// Predefined export templates for common reports
export const createCashFlowReport = (transactions: any[]): ExportData => {
  const headers = ['Tanggal', 'Jenis', 'Kategori', 'Deskripsi', 'Jumlah', 'Akun'];
  
  const rows = transactions.map(transaction => [
    formatDateForExport(transaction.tanggal),
    transaction.jenis_transaksi,
    transaction.kategori,
    transaction.deskripsi || '',
    formatCurrencyForExport(transaction.jumlah),
    transaction.akun_kas_nama || 'Kas Utama'
  ]);
  
  return {
    headers,
    rows,
    title: 'Laporan Cash Flow',
    subtitle: `Periode: ${new Date().toLocaleDateString('id-ID')}`
  };
};

export const createCategoryReport = (categoryData: any[]): ExportData => {
  const headers = ['Kategori', 'Total Pengeluaran', 'Persentase', 'Jumlah Transaksi'];
  
  const total = categoryData.reduce((sum, item) => sum + item.total, 0);
  
  const rows = categoryData.map(item => [
    item.kategori,
    formatCurrencyForExport(item.total),
    `${((item.total / total) * 100).toFixed(1)}%`,
    item.count
  ]);
  
  return {
    headers,
    rows,
    title: 'Laporan Per Kategori',
    subtitle: `Total Pengeluaran: ${formatCurrencyForExport(total)}`
  };
};

export const createSantriReport = (santriData: any[]): ExportData => {
  const headers = ['ID Santri', 'Nama Santri', 'Program', 'Total Bantuan', 'Jumlah Alokasi'];
  
  const rows = santriData.map(santri => [
    santri.id_santri,
    santri.nama_lengkap,
    santri.program,
    formatCurrencyForExport(santri.total_bantuan),
    santri.jumlah_alokasi
  ]);
  
  return {
    headers,
    rows,
    title: 'Laporan Per Santri',
    subtitle: 'Bantuan yang diberikan ke setiap santri'
  };
};

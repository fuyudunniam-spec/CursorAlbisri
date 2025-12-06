/**
 * Transfer Export Utilities
 * 
 * Handles exporting transfer data to Excel and PDF formats.
 * 
 * Requirements: AC-4.4
 */

import * as XLSX from 'xlsx';
import { format } from 'date-fns';
import { id as localeId } from 'date-fns/locale';
import type { TransferWithItem, TransferFilters } from '@/types/transfer.types';
import { ExcelExporter, type ExcelSheetData } from './excelExporter';

const DESTINATION_LABELS: Record<string, string> = {
  koperasi: "Koperasi",
  distribusi: "Distribusi Bantuan",
  dapur: "Dapur",
  asrama: "Asrama",
  kantor: "Kantor",
  lainnya: "Lainnya"
};

const STATUS_LABELS: Record<string, string> = {
  pending: "Menunggu Approval",
  approved: "Disetujui",
  rejected: "Ditolak",
  completed: "Selesai"
};

/**
 * Export transfer history to Excel
 * 
 * Creates an Excel file with transfer data including filters applied.
 * 
 * Requirements: AC-4.4
 * 
 * @param transfers - Transfer data to export
 * @param filters - Filters that were applied
 */
export function exportTransferToExcel(
  transfers: TransferWithItem[],
  filters?: TransferFilters
): void {
  const exporter = new ExcelExporter();

  // Prepare summary data
  const summary: { label: string; value: string }[] = [
    { label: 'Total Transfer', value: transfers.length.toString() },
    { 
      label: 'Total Kuantitas', 
      value: transfers.reduce((sum, t) => sum + t.jumlah, 0).toString() + ' unit'
    },
    {
      label: 'Total Nilai HPP',
      value: ExcelExporter.formatCurrency(
        transfers.reduce((sum, t) => sum + ((t.hpp_yayasan || 0) * t.jumlah), 0)
      )
    }
  ];

  // Add filter info to summary
  if (filters) {
    if (filters.tujuan) {
      summary.push({
        label: 'Filter Tujuan',
        value: DESTINATION_LABELS[filters.tujuan] || filters.tujuan
      });
    }
    if (filters.status) {
      summary.push({
        label: 'Filter Status',
        value: STATUS_LABELS[filters.status] || filters.status
      });
    }
    if (filters.date_from && filters.date_to) {
      summary.push({
        label: 'Periode',
        value: `${ExcelExporter.formatDate(filters.date_from)} - ${ExcelExporter.formatDate(filters.date_to)}`
      });
    }
  }

  // Prepare transfer data sheet
  const transferSheet: ExcelSheetData = {
    name: 'Riwayat Transfer',
    columns: [
      { header: 'Tanggal', dataKey: 'tanggal', width: 12 },
      { header: 'Item', dataKey: 'item_name', width: 25 },
      { header: 'Jumlah', dataKey: 'jumlah', width: 10 },
      { header: 'Satuan', dataKey: 'satuan', width: 10 },
      { header: 'Tujuan', dataKey: 'tujuan', width: 18 },
      { header: 'Status', dataKey: 'status', width: 15 },
      { header: 'HPP', dataKey: 'hpp', width: 15 },
      { header: 'Total Nilai', dataKey: 'total_nilai', width: 15 },
      { header: 'Kondisi', dataKey: 'kondisi', width: 12 },
      { header: 'Catatan', dataKey: 'catatan', width: 30 }
    ],
    data: transfers.map(t => ({
      tanggal: ExcelExporter.formatDate(t.created_at),
      item_name: t.item_name,
      jumlah: t.jumlah,
      satuan: t.item_satuan || '-',
      tujuan: DESTINATION_LABELS[t.tujuan] || t.tujuan,
      status: STATUS_LABELS[t.status] || t.status,
      hpp: t.hpp_yayasan ? ExcelExporter.formatCurrency(t.hpp_yayasan) : '-',
      total_nilai: t.hpp_yayasan ? ExcelExporter.formatCurrency(t.hpp_yayasan * t.jumlah) : '-',
      kondisi: t.kondisi_barang ? (t.kondisi_barang === 'baik' ? 'Baik' : 'Rusak') : '-',
      catatan: t.catatan || '-'
    }))
  };

  // Group by destination
  const byDestination = transfers.reduce((acc, t) => {
    const dest = t.tujuan;
    if (!acc[dest]) {
      acc[dest] = [];
    }
    acc[dest].push(t);
    return acc;
  }, {} as Record<string, TransferWithItem[]>);

  const destinationSheet: ExcelSheetData = {
    name: 'Per Tujuan',
    columns: [
      { header: 'Tujuan', dataKey: 'tujuan', width: 20 },
      { header: 'Jumlah Transfer', dataKey: 'count', width: 15 },
      { header: 'Total Unit', dataKey: 'quantity', width: 15 },
      { header: 'Total Nilai', dataKey: 'value', width: 18 }
    ],
    data: Object.entries(byDestination).map(([dest, items]) => ({
      tujuan: DESTINATION_LABELS[dest] || dest,
      count: items.length,
      quantity: items.reduce((sum, t) => sum + t.jumlah, 0),
      value: ExcelExporter.formatCurrency(
        items.reduce((sum, t) => sum + ((t.hpp_yayasan || 0) * t.jumlah), 0)
      )
    }))
  };

  // Group by status
  const byStatus = transfers.reduce((acc, t) => {
    const status = t.status;
    if (!acc[status]) {
      acc[status] = [];
    }
    acc[status].push(t);
    return acc;
  }, {} as Record<string, TransferWithItem[]>);

  const statusSheet: ExcelSheetData = {
    name: 'Per Status',
    columns: [
      { header: 'Status', dataKey: 'status', width: 20 },
      { header: 'Jumlah Transfer', dataKey: 'count', width: 15 },
      { header: 'Total Unit', dataKey: 'quantity', width: 15 }
    ],
    data: Object.entries(byStatus).map(([status, items]) => ({
      status: STATUS_LABELS[status] || status,
      count: items.length,
      quantity: items.reduce((sum, t) => sum + t.jumlah, 0)
    }))
  };

  // Export
  const period = filters?.date_from && filters?.date_to ? {
    start: new Date(filters.date_from),
    end: new Date(filters.date_to)
  } : undefined;

  exporter.exportMultipleSheets({
    filename: 'Riwayat_Transfer_Inventaris',
    title: 'RIWAYAT TRANSFER INVENTARIS YAYASAN',
    period,
    summary,
    sheets: [transferSheet, destinationSheet, statusSheet]
  });
}

/**
 * Export transfer history to PDF
 * 
 * Creates a PDF file with transfer data.
 * 
 * Requirements: AC-4.4
 * 
 * @param transfers - Transfer data to export
 * @param filters - Filters that were applied
 */
export async function exportTransferToPDF(
  transfers: TransferWithItem[],
  filters?: TransferFilters
): Promise<void> {
  // Import jsPDF dynamically to avoid SSR issues
  const { jsPDF } = await import('jspdf');
  await import('jspdf-autotable');

  const doc = new jsPDF();
  
  // Header
  doc.setFontSize(16);
  doc.text('RIWAYAT TRANSFER INVENTARIS YAYASAN', 14, 15);
  
  doc.setFontSize(10);
  doc.text('LKSA AL-BISRI PONDOK SUKSES', 14, 22);
  
  // Period
  let yPos = 30;
  if (filters?.date_from && filters?.date_to) {
    doc.setFontSize(9);
    doc.text(
      `Periode: ${format(new Date(filters.date_from), 'dd MMMM yyyy', { locale: localeId })} - ${format(new Date(filters.date_to), 'dd MMMM yyyy', { locale: localeId })}`,
      14,
      yPos
    );
    yPos += 7;
  }

  // Filters
  if (filters?.tujuan || filters?.status) {
    doc.setFontSize(9);
    const filterText: string[] = [];
    if (filters.tujuan) {
      filterText.push(`Tujuan: ${DESTINATION_LABELS[filters.tujuan] || filters.tujuan}`);
    }
    if (filters.status) {
      filterText.push(`Status: ${STATUS_LABELS[filters.status] || filters.status}`);
    }
    doc.text(filterText.join(' | '), 14, yPos);
    yPos += 7;
  }

  // Summary
  doc.setFontSize(9);
  doc.text(`Total Transfer: ${transfers.length}`, 14, yPos);
  yPos += 5;
  doc.text(`Total Kuantitas: ${transfers.reduce((sum, t) => sum + t.jumlah, 0)} unit`, 14, yPos);
  yPos += 5;
  const totalValue = transfers.reduce((sum, t) => sum + ((t.hpp_yayasan || 0) * t.jumlah), 0);
  doc.text(`Total Nilai: ${ExcelExporter.formatCurrency(totalValue)}`, 14, yPos);
  yPos += 10;

  // Table
  const tableData = transfers.map(t => [
    ExcelExporter.formatDate(t.created_at),
    t.item_name,
    t.jumlah.toString(),
    DESTINATION_LABELS[t.tujuan] || t.tujuan,
    STATUS_LABELS[t.status] || t.status,
    t.hpp_yayasan ? ExcelExporter.formatCurrency(t.hpp_yayasan * t.jumlah) : '-'
  ]);

  (doc as any).autoTable({
    startY: yPos,
    head: [['Tanggal', 'Item', 'Jumlah', 'Tujuan', 'Status', 'Total Nilai']],
    body: tableData,
    styles: { fontSize: 8 },
    headStyles: { fillColor: [65, 105, 225] },
    columnStyles: {
      0: { cellWidth: 25 },
      1: { cellWidth: 50 },
      2: { cellWidth: 20 },
      3: { cellWidth: 30 },
      4: { cellWidth: 25 },
      5: { cellWidth: 30 }
    }
  });

  // Footer
  const pageCount = (doc as any).internal.getNumberOfPages();
  for (let i = 1; i <= pageCount; i++) {
    doc.setPage(i);
    doc.setFontSize(8);
    doc.text(
      `Dicetak pada: ${format(new Date(), 'dd MMMM yyyy, HH:mm', { locale: localeId })}`,
      14,
      doc.internal.pageSize.height - 10
    );
    doc.text(
      `Halaman ${i} dari ${pageCount}`,
      doc.internal.pageSize.width - 40,
      doc.internal.pageSize.height - 10
    );
  }

  // Save
  const filename = `Riwayat_Transfer_${format(new Date(), 'yyyy-MM-dd_HH-mm')}.pdf`;
  doc.save(filename);
}

/**
 * Export transfer summary to Excel
 * 
 * Creates a summary report with aggregations.
 * 
 * Requirements: AC-4.3, AC-4.4
 * 
 * @param summaryData - Aggregated summary data
 * @param period - Date range
 */
export function exportTransferSummaryToExcel(
  summaryData: {
    byDestination: { tujuan: string; count: number; quantity: number; value: number }[];
    byStatus: { status: string; count: number }[];
    trends: { date: string; count: number; quantity: number }[];
  },
  period: { from: Date; to: Date }
): void {
  const exporter = new ExcelExporter();

  const summary: { label: string; value: string }[] = [
    {
      label: 'Total Transfer',
      value: summaryData.byDestination.reduce((sum, d) => sum + d.count, 0).toString()
    },
    {
      label: 'Total Kuantitas',
      value: summaryData.byDestination.reduce((sum, d) => sum + d.quantity, 0).toString() + ' unit'
    },
    {
      label: 'Total Nilai',
      value: ExcelExporter.formatCurrency(
        summaryData.byDestination.reduce((sum, d) => sum + d.value, 0)
      )
    }
  ];

  const destinationSheet: ExcelSheetData = {
    name: 'Per Tujuan',
    columns: [
      { header: 'Tujuan', dataKey: 'tujuan', width: 20 },
      { header: 'Jumlah Transfer', dataKey: 'count', width: 15 },
      { header: 'Total Unit', dataKey: 'quantity', width: 15 },
      { header: 'Total Nilai', dataKey: 'value', width: 18 }
    ],
    data: summaryData.byDestination.map(d => ({
      tujuan: DESTINATION_LABELS[d.tujuan] || d.tujuan,
      count: d.count,
      quantity: d.quantity,
      value: ExcelExporter.formatCurrency(d.value)
    }))
  };

  const statusSheet: ExcelSheetData = {
    name: 'Per Status',
    columns: [
      { header: 'Status', dataKey: 'status', width: 20 },
      { header: 'Jumlah Transfer', dataKey: 'count', width: 15 }
    ],
    data: summaryData.byStatus.map(s => ({
      status: STATUS_LABELS[s.status] || s.status,
      count: s.count
    }))
  };

  const trendsSheet: ExcelSheetData = {
    name: 'Trend Harian',
    columns: [
      { header: 'Tanggal', dataKey: 'date', width: 15 },
      { header: 'Jumlah Transfer', dataKey: 'count', width: 15 },
      { header: 'Total Unit', dataKey: 'quantity', width: 15 }
    ],
    data: summaryData.trends.map(t => ({
      date: ExcelExporter.formatDate(t.date),
      count: t.count,
      quantity: t.quantity
    }))
  };

  exporter.exportMultipleSheets({
    filename: 'Summary_Transfer_Inventaris',
    title: 'SUMMARY TRANSFER INVENTARIS YAYASAN',
    period: { start: period.from, end: period.to },
    summary,
    sheets: [destinationSheet, statusSheet, trendsSheet]
  });
}

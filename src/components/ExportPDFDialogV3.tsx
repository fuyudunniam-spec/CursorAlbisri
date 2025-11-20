import React, { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Checkbox } from '@/components/ui/checkbox';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Calendar } from '@/components/ui/calendar';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { CalendarIcon, FileText, Download, Loader2 } from 'lucide-react';
import { format } from 'date-fns';
import { id } from 'date-fns/locale';
import { cn } from '@/lib/utils';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';

class LocalPDFExporter {
  private doc: jsPDF;
  constructor(orientation: 'portrait' | 'landscape' = 'landscape') {
    this.doc = new jsPDF({ orientation });
  }
  static formatDate(input: string | Date) {
    const d = typeof input === 'string' ? new Date(input) : input;
    const pad = (n: number) => n.toString().padStart(2, '0');
    return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
  }
  
  // Helper: Generate description from rincian_pengeluaran
  static generateDescriptionFromDetails(rincianPengeluaran: any[]): string {
    if (!rincianPengeluaran || rincianPengeluaran.length === 0) {
      return '-';
    }
    const maxItemsToShow = 3;
    const items = rincianPengeluaran.slice(0, maxItemsToShow);
    const remainingCount = rincianPengeluaran.length - maxItemsToShow;
    const itemDescriptions = items.map((item: any) => {
      const qty = item.jumlah || 1;
      const name = item.nama_item || 'Item';
      return `${name} (${qty})`;
    });
    if (remainingCount > 0) {
      itemDescriptions.push(`dan ${remainingCount} item lainnya`);
    }
    return itemDescriptions.join(', ');
  }
  
  // Helper: Clean auto-post description
  static cleanAutoPostDescription(deskripsi: string): string {
    if (!deskripsi) return '-';
    if (deskripsi.includes('Auto-post dari donasi:')) {
      const match = deskripsi.match(/Auto-post dari donasi:\s*(.+)$/);
      return match ? match[1].trim() : deskripsi;
    }
    if (deskripsi.includes('Auto-post dari penjualan:')) {
      const match = deskripsi.match(/Auto-post dari penjualan:\s*(.+)$/);
      return match ? match[1].trim() : deskripsi;
    }
    if (deskripsi.includes('Auto-post dari overhead:')) {
      const match = deskripsi.match(/Auto-post dari overhead:\s*(.+)$/);
      return match ? match[1].trim() : deskripsi;
    }
    return deskripsi;
  }
  
  // Helper: Extract nama from auto-post
  static extractNamaFromAutoPost(deskripsi: string): string | null {
    if (!deskripsi) return null;
    if (deskripsi.includes('Auto-post dari donasi:')) {
      const match = deskripsi.match(/Auto-post dari donasi:\s*(.+)$/);
      return match ? match[1].trim() : null;
    }
    if (deskripsi.includes('Auto-post dari penjualan:')) {
      const match = deskripsi.match(/Auto-post dari penjualan:\s*(.+)$/);
      return match ? match[1].trim() : null;
    }
    if (deskripsi.includes('Auto-post dari overhead:')) {
      const match = deskripsi.match(/Auto-post dari overhead:\s*(.+)$/);
      return match ? match[1].trim() : null;
    }
    return null;
  }
  
  // Helper: Load image as base64
  private async loadImage(url: string, fallback?: string): Promise<string> {
    return new Promise((resolve, reject) => {
      const img = new Image();
      // Don't set crossOrigin for local files
      img.onload = () => {
        const canvas = document.createElement('canvas');
        canvas.width = img.width;
        canvas.height = img.height;
        const ctx = canvas.getContext('2d');
        ctx?.drawImage(img, 0, 0);
        resolve(canvas.toDataURL('image/png'));
      };
      img.onerror = () => {
        if (fallback) {
          const img2 = new Image();
          img2.onload = () => {
            const canvas = document.createElement('canvas');
            canvas.width = img2.width;
            canvas.height = img2.height;
            const ctx = canvas.getContext('2d');
            ctx?.drawImage(img2, 0, 0);
            resolve(canvas.toDataURL('image/png'));
          };
          img2.onerror = () => reject(new Error('Failed to load image'));
          img2.src = fallback;
        } else {
          reject(new Error('Failed to load image'));
        }
      };
      img.src = url;
    });
  }
  
  // Add cover page with logo and title
  private async addCoverPage(accountName: string, period: any) {
    // Get page dimensions
    const pageWidth = this.doc.internal.pageSize.getWidth();
    const pageHeight = this.doc.internal.pageSize.getHeight();
    
    // Try to load logo, but don't fail if it doesn't work
    let logoLoaded = false;
    let logoSize = 120; // Same size as watermark
    let logoY = 30; // Fixed position from top
    
    try {
      // Try local logo first (same as donasi module)
      const logoUrl = `${window.location.origin}/kop-albisri.png`;
      const logoData = await this.loadImage(logoUrl);
      
      const logoX = (pageWidth - logoSize) / 2;
      this.doc.addImage(logoData, 'PNG', logoX, logoY, logoSize, logoSize);
      logoLoaded = true;
    } catch (error) {
      // Logo failed to load, continue without it
      // Adjust logoY since we won't have logo
      logoY = 40;
    }
    
    // Title - centered
    this.doc.setFontSize(20);
    this.doc.setFont('helvetica', 'bold');
    this.doc.text(
      `Laporan Keuangan (${accountName})`, 
      pageWidth / 2, 
      logoY + (logoLoaded ? logoSize + 5 : 15), 
      { align: 'center' }
    );
    
    // Yayasan name
    this.doc.setFontSize(14);
    this.doc.setFont('helvetica', 'normal');
    this.doc.text(
      'Yayasan Pesantren Anak Yatim Al-Bisri', 
      pageWidth / 2, 
      logoY + (logoLoaded ? logoSize + 12 : 25), 
      { align: 'center' }
    );
    
    // Period - extract month names
    const monthNames = [
      'Januari', 'Februari', 'Maret', 'April', 'Mei', 'Juni', 
      'Juli', 'Agustus', 'September', 'Oktober', 'November', 'Desember'
    ];
    const periodStart = new Date(period.start);
    const periodEnd = new Date(period.end);
    
    const startMonth = monthNames[periodStart.getMonth()];
    const startYear = periodStart.getFullYear();
    const endMonth = monthNames[periodEnd.getMonth()];
    const endYear = periodEnd.getFullYear();
    
    // Format period text
    let periodText = '';
    if (startMonth === endMonth && startYear === endYear) {
      // Same month: "September 2024"
      periodText = `${startMonth} ${startYear}`;
    } else if (startYear === endYear) {
      // Same year, different months: "September - Oktober 2024"
      periodText = `${startMonth} - ${endMonth} ${startYear}`;
    } else {
      // Different years: "September 2024 - Oktober 2025"
      periodText = `${startMonth} ${startYear} - ${endMonth} ${endYear}`;
    }
    
    this.doc.text(
      `Periode: ${periodText}`, 
      pageWidth / 2, 
      logoY + (logoLoaded ? logoSize + 19 : 35), 
      { align: 'center' }
    );
    
    // Add new page after cover
    this.doc.addPage();
  }
  
  // Add watermark to all pages (except cover page)
  async addWatermarkToAllPages() {
    const logoUrl = `${window.location.origin}/kop-albisri.png`;
    
    try {
      // Create a separate canvas to apply opacity, blur, and grayscale
      const img = new Image();
      
      const loadImagePromise = new Promise<HTMLImageElement>((resolve, reject) => {
        img.onload = () => resolve(img);
        img.onerror = () => reject(new Error('Failed to load image'));
        img.src = logoUrl;
      });
      
      const loadedImg = await loadImagePromise;
      
      // Create canvas with effects applied
      const canvas = document.createElement('canvas');
      canvas.width = loadedImg.width;
      canvas.height = loadedImg.height;
      const ctx = canvas.getContext('2d');
      
      if (ctx) {
        // Draw image (keep original colors, no grayscale)
        ctx.drawImage(loadedImg, 0, 0);
        
        // Apply transparency to the entire canvas data
        const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
        const data = imageData.data;
        const opacity = 0.03; // 3% opacity - sangat pucat
        
        for (let i = 0; i < data.length; i += 4) {
          // Make watermark very faint by blending with white background
          // Original approach: multiply by opacity (makes darker colors darker)
          // Better approach: blend with white background
          data[i] = data[i] * opacity + 255 * (1 - opacity);     // R
          data[i + 1] = data[i + 1] * opacity + 255 * (1 - opacity); // G
          data[i + 2] = data[i + 2] * opacity + 255 * (1 - opacity); // B
          // Alpha channel remains unchanged
        }
        ctx.putImageData(imageData, 0, 0);
      }
      
      const watermarkData = canvas.toDataURL('image/png');
      const pageCount = this.doc.internal.pages.length - 1;
      
      // Start from page 2 (skip cover page)
      for (let i = 2; i <= pageCount; i++) {
        this.doc.setPage(i);
        
        // Get page dimensions
        const pageWidth = this.doc.internal.pageSize.getWidth();
        const pageHeight = this.doc.internal.pageSize.getHeight();
        
        // Calculate watermark size and position (centered, much larger)
        const watermarkSize = 120; // mm - much larger for watermark effect
        const watermarkX = (pageWidth - watermarkSize) / 2;
        const watermarkY = (pageHeight - watermarkSize) / 2;
        
        // Add watermarked image with full opacity since we already applied transparency in canvas
        this.doc.addImage(watermarkData, 'PNG', watermarkX, watermarkY, watermarkSize, watermarkSize, undefined, 'FAST');
      }
    } catch (error) {
      // Watermark failed to load, continue without it - not critical
    }
  }
  
  renderGenericTable(report: { title?: string; subtitle?: string; columns: any[]; data: any[] }, period: any) {
    const periodText = `${LocalPDFExporter.formatDate(period.start)} s/d ${LocalPDFExporter.formatDate(period.end)}`;
    const title = report?.title || 'Laporan';
    const subtitle = report?.subtitle || '';
    this.doc.setFontSize(16);
    this.doc.text(title, 14, 18);
    this.doc.setFontSize(10);
    this.doc.text(`Periode: ${periodText}`, 14, 26);
    if (subtitle) this.doc.text(subtitle, 14, 32);
    const columns: any[] = Array.isArray(report?.columns) ? report.columns : [];
    const dataRows: any[] = Array.isArray(report?.data) ? report.data : [];
    if (columns.length && dataRows.length) {
      const head = [columns.map((c: any) => (typeof c === 'string' ? c : c.header || c))];
      const keys = columns.map((c: any) => (typeof c === 'string' ? c : c.dataKey || c));
      const body = dataRows.map((row: any) => Array.isArray(row) ? row : keys.map((k: any) => String(row[k] ?? '')));
      autoTable(this.doc, { head, body, startY: 40, styles: { fontSize: 9 }, headStyles: { fillColor: [33,150,243] } });
    }
  }
  async exportCashFlowPerAccount(data: any, period: any) {
    // Add cover page first
    await this.addCoverPage(data.accountName || 'Akun', period);
    
    const periodText = `${LocalPDFExporter.formatDate(period.start)} s/d ${LocalPDFExporter.formatDate(period.end)}`;
    this.doc.setFontSize(16);
    this.doc.text(`Arus Kas - ${data.accountName || 'Akun'}`, 14, 18);
    this.doc.setFontSize(10);
    this.doc.text(`Periode: ${periodText}`, 14, 26);
    
    // Summary Cards - Create card-style boxes in a single row
    const y0 = 34;
    
    // Calculate card dimensions for single row layout
    const pageWidth = this.doc.internal.pageSize.getWidth();
    const margin = 14;
    const availableWidth = pageWidth - (2 * margin);
    const cardSpacing = 8;
    const numCards = 4;
    const cardWidth = (availableWidth - (cardSpacing * (numCards - 1))) / numCards;
    const cardHeight = 18;
    const cardsStartX = margin;
    const cardsStartY = y0 + 6;
    
    // Card data
    const cards = [
      { label: 'Saldo Awal', value: data.saldoAwal || 0 },
      { label: 'Total Pemasukan', value: data.totalPemasukan || 0 },
      { label: 'Total Pengeluaran', value: data.totalPengeluaran || 0 },
      { label: 'Saldo Akhir', value: data.saldoAkhir || 0 }
    ];
    
    // Draw cards in a single row
    cards.forEach((card, index) => {
      const cardX = cardsStartX + (index * (cardWidth + cardSpacing));
      
      // Card background with light grey
      this.doc.setFillColor(245, 245, 245);
      this.doc.rect(cardX, cardsStartY, cardWidth, cardHeight, 'F');
      
      // Card border
      this.doc.setDrawColor(200, 200, 200);
      this.doc.setLineWidth(0.5);
      this.doc.rect(cardX, cardsStartY, cardWidth, cardHeight, 'S');
      
      // Label text
      this.doc.setFontSize(9);
      this.doc.setTextColor(100, 100, 100);
      this.doc.text(card.label, cardX + 3, cardsStartY + 6);
      
      // Value text with dynamic font size
      this.doc.setTextColor(0, 0, 0);
      this.doc.setFont('helvetica', 'bold');
      const formattedValue = new Intl.NumberFormat('id-ID',{
        style:'currency',
        currency:'IDR',
        minimumFractionDigits:0
      }).format(card.value);
      
      // Calculate optimal font size to fit within card
      const maxFontSize = 10;
      const minFontSize = 7;
      const padding = 6; // total horizontal padding
      const availableWidthForValue = cardWidth - padding;
      
      let fontSize = maxFontSize;
      let textWidth;
      
      do {
        this.doc.setFontSize(fontSize);
        textWidth = this.doc.getTextWidth(formattedValue);
        if (textWidth > availableWidthForValue && fontSize > minFontSize) {
          fontSize--;
        } else {
          break;
        }
      } while (fontSize >= minFontSize);
      
      this.doc.text(formattedValue, cardX + 3, cardsStartY + 14);
      
      // Reset font
      this.doc.setFont('helvetica', 'normal');
      this.doc.setFontSize(10);
      this.doc.setTextColor(0, 0, 0);
    });
    
    // Calculate next Y position after cards
    const y = cardsStartY + cardHeight + 8;
    
    // Rincian Pemasukan
    const startIncomeY = y + 2;
    autoTable(this.doc, {
      head: [['Tanggal','No. Ref','Kategori','Deskripsi','Jumlah']],
      body: (data.incomeRows||[]).map((r:any)=>[r.tanggal,r.noBukti,r.kategori,r.deskripsi,new Intl.NumberFormat('id-ID',{style:'currency',currency:'IDR',minimumFractionDigits:0}).format(r.jumlah||0)]),
      startY: startIncomeY, 
      styles:{fontSize:9, textColor: [0, 0, 0], fontStyle: 'normal'}, 
      headStyles:{fillColor:[76,175,80], textColor: [255, 255, 255], fontStyle: 'bold'},
      foot: [
        ['','','','TOTAL', new Intl.NumberFormat('id-ID',{style:'currency',currency:'IDR',minimumFractionDigits:0}).format((data.incomeRows||[]).reduce((s:any,r:any)=>s+(r.jumlah||0),0))]
      ],
      footStyles: { fillColor: [100, 100, 100], fontStyle: 'bold', textColor: [255, 255, 255] },
      showFoot: 'lastPage'
    });
    
    // Rincian Transaksi (all transactions) - Page 2
    this.doc.addPage();
    this.doc.setFontSize(12);
    this.doc.text('Rincian Transaksi', 14, 18);
    
    // Prepare combined rows with DESKRIPSI/PENERIMA format
    const combinedRowsFormatted = (data.combinedRows||[]).map((r:any) => [
      r.tanggal,
      r.noBukti,
      r.kategori,
      r.deskripsi_penerima,
      r.pemasukan > 0 ? new Intl.NumberFormat('id-ID',{style:'currency',currency:'IDR',minimumFractionDigits:0}).format(r.pemasukan) : '',
      r.pengeluaran > 0 ? new Intl.NumberFormat('id-ID',{style:'currency',currency:'IDR',minimumFractionDigits:0}).format(r.pengeluaran) : ''
    ]);
    
    const jumlah = (data.totalPemasukan||0) - (data.totalPengeluaran||0);
    
    // Format footer values
    const totalPemasukanFormatted = new Intl.NumberFormat('id-ID',{style:'currency',currency:'IDR',minimumFractionDigits:0}).format(data.totalPemasukan||0);
    const totalPengeluaranFormatted = new Intl.NumberFormat('id-ID',{style:'currency',currency:'IDR',minimumFractionDigits:0}).format(data.totalPengeluaran||0);
    const saldoAkhirFormatted = new Intl.NumberFormat('id-ID',{style:'currency',currency:'IDR',minimumFractionDigits:0}).format(data.saldoAkhir||0);
    
    autoTable(this.doc, {
      head: [['TGL','NO. BUKTI','KATEGORI','DESKRIPSI/PENERIMA','PEMASUKAN','PENGELUARAN']],
      body: combinedRowsFormatted,
      startY: 24, 
      styles:{fontSize:9, textColor: [0, 0, 0], fontStyle: 'normal'}, 
      headStyles:{fillColor:[33,150,243], textColor: [255, 255, 255], fontStyle: 'bold'},
      foot: [
        ['','','','JUMLAH', totalPemasukanFormatted, totalPengeluaranFormatted],
        ['','','','SALDO', '', saldoAkhirFormatted]
      ],
      footStyles: { fillColor: [150, 150, 150], fontStyle: 'bold', textColor: [255, 255, 255] },
      showFoot: 'lastPage'
    });
    // do not save here; allow composing multiple sections
  }
  addPage() { this.doc.addPage(); }
  save(filename: string) { this.doc.save(filename); }
}
import { ReportFormatterV3, PeriodFilter } from '@/utils/export/reportFormatterV3';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

// Helper functions to replace KeuanganService
// Helper khusus: ambil data arus kas per akun untuk template baru
const fetchCashflowPerAccount = async (
  period: PeriodFilter,
  accountId: string,
  accountName: string,
  includeDraft: boolean = false
) => {
  // Ambil saldo awal akun
  const { data: akun } = await supabase
    .from('akun_kas')
    .select('saldo_awal')
    .eq('id', accountId)
    .single();

  // Ambil transaksi posted pada periode untuk akun (dengan rincian_pengeluaran)
  // Ensure dates are set to start/end of day to include all transactions
  const startDate = new Date(period.start);
  startDate.setHours(0, 0, 0, 0);
  const endDate = new Date(period.end);
  endDate.setHours(23, 59, 59, 999);
  
  console.log('[EXPORT PDF] Fetching transactions:', {
    start: startDate.toISOString().split('T')[0],
    end: endDate.toISOString().split('T')[0],
    accountId,
    includeDraft
  });
  
  // Build query
  let query = supabase
    .from('keuangan')
    .select('id, tanggal, nomor_bukti, jenis_transaksi, kategori, deskripsi, jumlah, penerima_pembayar, status, rincian_pengeluaran(nama_item, jumlah, satuan, harga_satuan)')
    .eq('akun_kas_id', accountId)
    .gte('tanggal', startDate.toISOString().split('T')[0])
    .lte('tanggal', endDate.toISOString().split('T')[0])
    .order('tanggal', { ascending: true });
  
  // Filter status
  if (includeDraft) {
    // Sertakan semua transaksi aktif (posted, draft, Selesai, cancelled)
    query = query.in('status', ['posted', 'draft', 'Selesai', 'selesai', 'cancelled']);
  } else {
    // Default: hanya posted
    query = query.eq('status', 'posted');
  }
  
  const { data: txs } = await query;
  
  console.log('[EXPORT PDF] Fetched transactions:', txs?.length || 0, 'records');

  const all = txs || [];
  const totalPemasukan = all.filter(t => t.jenis_transaksi === 'Pemasukan').reduce((s, t) => s + (t.jumlah || 0), 0);
  const totalPengeluaran = all.filter(t => t.jenis_transaksi === 'Pengeluaran').reduce((s, t) => s + (t.jumlah || 0), 0);
  const saldoAwal = akun?.saldo_awal || 0;
  const selisih = totalPemasukan - totalPengeluaran;
  const saldoAkhir = saldoAwal + selisih;
  
  console.log('[EXPORT PDF] Transaction summary:', {
    total: all.length,
    pemasukan: all.filter(t => t.jenis_transaksi === 'Pemasukan').length,
    pengeluaran: all.filter(t => t.jenis_transaksi === 'Pengeluaran').length,
    totalPemasukan,
    totalPengeluaran
  });

  const incomeRows = all
    .filter(t => t.jenis_transaksi === 'Pemasukan')
    .map(t => ({
      tanggal: LocalPDFExporter.formatDate(t.tanggal),
      noBukti: t.nomor_bukti || (t.id || '').slice(0, 8),
      kategori: t.kategori || '-',
      deskripsi: t.deskripsi || t.kategori || '-',
      jumlah: t.jumlah || 0,
    }));

  const expenseRows = all
    .filter(t => t.jenis_transaksi === 'Pengeluaran')
    .map(t => ({
      tanggal: LocalPDFExporter.formatDate(t.tanggal),
      noBukti: t.nomor_bukti || (t.id || '').slice(0, 8),
      kategori: t.kategori || '-',
      deskripsi: t.deskripsi || t.kategori || '-',
      jumlah: t.jumlah || 0,
    }));

  const combinedRows = all.map(t => {
    // Generate description from rincian_pengeluaran if available
    let finalDeskripsi = '-';
    if (t.jenis_transaksi === 'Pengeluaran' && t.rincian_pengeluaran && t.rincian_pengeluaran.length > 0) {
      finalDeskripsi = LocalPDFExporter.generateDescriptionFromDetails(t.rincian_pengeluaran);
    } else if (t.deskripsi) {
      finalDeskripsi = LocalPDFExporter.cleanAutoPostDescription(t.deskripsi);
    }
    
    // Extract nama from auto-post description or use penerima_pembayar
    const namaPenerima = LocalPDFExporter.extractNamaFromAutoPost(t.deskripsi) || t.penerima_pembayar || '-';
    
    // Combine deskripsi and penerima with "/" separator
    const deskripsiPenerima = `${finalDeskripsi}/${namaPenerima}`;
    
    return {
      tanggal: LocalPDFExporter.formatDate(t.tanggal),
      noBukti: t.nomor_bukti || (t.id || '').slice(0, 8),
      kategori: t.kategori || '-',
      deskripsi_penerima: deskripsiPenerima,
      pemasukan: t.jenis_transaksi === 'Pemasukan' ? (t.jumlah || 0) : 0,
      pengeluaran: t.jenis_transaksi === 'Pengeluaran' ? (t.jumlah || 0) : 0,
    };
  });
  
  console.log('[EXPORT PDF] Combined rows:', {
    total: combinedRows.length,
    withPemasukan: combinedRows.filter(r => r.pemasukan > 0).length,
    withPengeluaran: combinedRows.filter(r => r.pengeluaran > 0).length
  });

  return {
    accountName,
    saldoAwal,
    totalPemasukan,
    totalPengeluaran,
    saldoAkhir,
    selisih,
    incomeRows,
    expenseRows,
    combinedRows,
  };
};
const getComprehensiveReportData = async (period: PeriodFilter, accountId?: string) => {
  try {
    // Get cash flow data
    let q1 = supabase
      .from('keuangan')
      .select(`
        *,
        akun_kas:akun_kas_id(nama, kode, tipe),
        rincian_pengeluaran(nama_item, jumlah, satuan, harga_satuan, total)
      `)
      .gte('tanggal', period.start.toISOString())
      .lte('tanggal', period.end.toISOString())
      .order('tanggal', { ascending: false });
    if (accountId) q1 = q1.eq('akun_kas_id', accountId);
    const { data: cashFlowData } = await q1;

    // Get student aid data using the complete function
    const studentAidData = await getStudentAidReport(period);

    return {
      cashFlow: cashFlowData || [],
      studentAid: studentAidData || [],
      incomeStatement: cashFlowData || [],
      expenses: cashFlowData?.filter(t => t.jenis_transaksi === 'Pengeluaran') || []
    };
  } catch (error) {
    console.error('Error fetching comprehensive data:', error);
    return {
      cashFlow: [],
      studentAid: [],
      incomeStatement: [],
      expenses: []
    };
  }
};

const getIncomeStatementData = async (period: PeriodFilter, accountId?: string) => {
  try {
    let q = supabase
      .from('keuangan')
      .select('*')
      .gte('tanggal', period.start.toISOString())
      .lte('tanggal', period.end.toISOString())
      .order('tanggal', { ascending: false });
    if (accountId) q = q.eq('akun_kas_id', accountId);
    const { data } = await q;

    return data || [];
  } catch (error) {
    console.error('Error fetching income statement data:', error);
    return [];
  }
};

const getCashFlowByAccount = async (period: PeriodFilter, accountId?: string) => {
  try {
    let q = supabase
      .from('keuangan')
      .select(`
        *,
        akun_kas:akun_kas_id(nama, kode, tipe, saldo_saat_ini, saldo_awal),
        rincian_pengeluaran(nama_item, jumlah, satuan, harga_satuan, total)
      `)
      .gte('tanggal', period.start.toISOString())
      .lte('tanggal', period.end.toISOString())
      .order('tanggal', { ascending: false });
    if (accountId) q = q.eq('akun_kas_id', accountId);
    const { data } = await q;

    if (!data || data.length === 0) return [];

    // Group by account and calculate summary
    const accountGroups = data.reduce((acc, transaction) => {
      const accountId = transaction.akun_kas_id;
      const account = transaction.akun_kas;
      
      if (!acc[accountId]) {
        acc[accountId] = {
          akun: {
            nama: account?.nama || 'Unknown Account',
            kode: account?.kode || '',
            tipe: account?.tipe || 'Kas',
            saldo_awal: account?.saldo_awal || 0,
            saldo_akhir: account?.saldo_saat_ini || 0
          },
          transaksi: [],
          summary: {
            totalPemasukan: 0,
            totalPengeluaran: 0,
            selisih: 0
          }
        };
      }
      
      acc[accountId].transaksi.push(transaction);
      
      if (transaction.jenis_transaksi === 'Pemasukan') {
        acc[accountId].summary.totalPemasukan += transaction.jumlah || 0;
      } else {
        acc[accountId].summary.totalPengeluaran += transaction.jumlah || 0;
      }
      
      return acc;
    }, {} as any);

    // Calculate selisih for each account
    Object.values(accountGroups).forEach((group: any) => {
      group.summary.selisih = group.summary.totalPemasukan - group.summary.totalPengeluaran;
    });

    return Object.values(accountGroups);
  } catch (error) {
    console.error('Error fetching cash flow data:', error);
    return [];
  }
};

const getStudentAidReport = async (period: PeriodFilter) => {
  try {
    console.log('[STUDENT AID] Fetching data for period:', period.start, 'to', period.end);
    console.log('[STUDENT AID] Period details:', {
      startMonth: period.start.getMonth() + 1,
      endMonth: period.end.getMonth() + 1,
      startYear: period.start.getFullYear(),
      endYear: period.end.getFullYear(),
      startDate: period.start.toISOString(),
      endDate: period.end.toISOString()
    });
    
    // Get overhead allocations - fix date filter
    const { data: overheadData, error: overheadError } = await supabase
      .from('alokasi_overhead_per_santri')
      .select(`
        *,
        santri:santri_id(nama_lengkap, nisn, kategori)
      `)
      .gte('bulan', period.start.getMonth() + 1)
      .lte('bulan', period.end.getMonth() + 1)
      .gte('tahun', period.start.getFullYear())
      .lte('tahun', period.end.getFullYear());
    
    if (overheadError) {
      console.error('[STUDENT AID] Overhead error:', overheadError);
    } else {
      console.log('[STUDENT AID] Overhead data:', overheadData?.length || 0, 'records');
    }
    
    // Get direct allocations (alokasi langsung) - try multiple date filters
    const { data: directData, error: directError } = await supabase
      .from('alokasi_pengeluaran_santri')
      .select(`
        *,
        santri:santri_id(nama_lengkap, nisn, kategori),
        keuangan:keuangan_id(tanggal, kategori, sub_kategori)
      `)
      .gte('created_at', period.start.toISOString())
      .lte('created_at', period.end.toISOString());
    
    // Also try to get data from keuangan table date range (in case created_at is different)
    const { data: directDataAlt, error: directErrorAlt } = await supabase
      .from('alokasi_pengeluaran_santri')
      .select(`
        *,
        santri:santri_id(nama_lengkap, nisn, kategori),
        keuangan:keuangan_id(tanggal, kategori, sub_kategori)
      `)
      .gte('keuangan.tanggal', period.start.toISOString())
      .lte('keuangan.tanggal', period.end.toISOString());
    
    // Combine both results and remove duplicates
    const allDirectData = [...(directData || []), ...(directDataAlt || [])];
    const uniqueDirectData = allDirectData.filter((item, index, self) => 
      index === self.findIndex(t => t.id === item.id)
    );

    if (directError) {
      console.error('[STUDENT AID] Direct error:', directError);
    } else {
      console.log('[STUDENT AID] Direct data:', directData?.length || 0, 'records');
    }
    
    if (directErrorAlt) {
      console.error('[STUDENT AID] Direct alt error:', directErrorAlt);
    } else {
      console.log('[STUDENT AID] Direct alt data:', directDataAlt?.length || 0, 'records');
    }
    
    console.log('[STUDENT AID] Combined direct data:', uniqueDirectData.length, 'records');

    // Merge and group by student
    const studentMap = new Map();
    
    // Process overhead allocations
    (overheadData || []).forEach(item => {
      const santriId = item.santri_id;
      if (!studentMap.has(santriId)) {
        studentMap.set(santriId, {
          santri: {
            nama: item.santri?.nama_lengkap || 'Unknown Student',
            nisn: item.santri?.nisn || '-',
            kategori: item.santri?.kategori || 'Unknown'
          },
          totalBantuan: 0,
          breakdown: []
        });
      }
      const student = studentMap.get(santriId);
      const totalAlokasi = (item.spp_pendidikan || 0) + (item.asrama_kebutuhan || 0);
      student.totalBantuan += totalAlokasi;
      
      if (item.spp_pendidikan > 0) {
      student.breakdown.push({
        tanggal: item.created_at,
        jenisBantuan: 'SPP & Pendidikan',
        nominal: item.spp_pendidikan || 0,
        dariTransaksi: `Alokasi ${item.bulan}/${item.tahun}`,
        keterangan: `Alokasi overhead bulanan`
      });
      }
      
      if (item.asrama_kebutuhan > 0) {
      student.breakdown.push({
        tanggal: item.created_at,
        jenisBantuan: 'Asrama & Konsumsi',
        nominal: item.asrama_kebutuhan || 0,
        dariTransaksi: `Alokasi ${item.bulan}/${item.tahun}`,
        keterangan: `Alokasi overhead bulanan`
      });
      }
    });
    
    // Process direct allocations (use combined data)
    uniqueDirectData.forEach(item => {
      const santriId = item.santri_id;
      if (!studentMap.has(santriId)) {
        studentMap.set(santriId, {
          santri: {
            nama: item.santri?.nama_lengkap || 'Unknown Student',
            nisn: item.santri?.nisn || '-',
            kategori: item.santri?.kategori || 'Unknown'
          },
          totalBantuan: 0,
          breakdown: []
        });
      }
      const student = studentMap.get(santriId);
      student.totalBantuan += item.nominal_alokasi || 0;
      student.breakdown.push({
        tanggal: item.created_at,
        jenisBantuan: item.jenis_bantuan || 'Bantuan Langsung',
        nominal: item.nominal_alokasi || 0,
        dariTransaksi: `${item.keuangan?.kategori || ''} - ${item.keuangan?.sub_kategori || ''}`,
        keterangan: item.keterangan || item.periode || '-'
      });
    });

    const result = Array.from(studentMap.values());
    console.log('[STUDENT AID] Final result:', result.length, 'students');
    console.log('[STUDENT AID] Sample data:', result[0]);
    
    return result;
  } catch (error) {
    console.error('Error fetching student aid data:', error);
    return [];
  }
};

const getDetailedExpenses = async (period: PeriodFilter) => {
  try {
    const { data } = await supabase
      .from('keuangan')
      .select(`
        *,
        akun_kas:akun_kas_id(nama),
        rincian_pengeluaran(*),
        alokasi_pengeluaran_santri(
          id,
          santri_id,
          nominal_alokasi,
          jenis_bantuan,
          periode,
          keterangan,
          santri:santri_id(nama_lengkap, nisn)
        )
      `)
      .eq('jenis_transaksi', 'Pengeluaran')
      .gte('tanggal', period.start.toISOString())
      .lte('tanggal', period.end.toISOString())
      .order('tanggal', { ascending: false });

    // Transform data to include alokasi info
    return (data || []).map(item => ({
      ...item,
      totalAlokasiSantri: item.alokasi_pengeluaran_santri?.length || 0,
      nominalPerSantri: item.alokasi_pengeluaran_santri?.reduce(
        (sum, alloc) => sum + (alloc.nominal_alokasi || 0), 0
      ) || 0,
      alokasiDetails: item.alokasi_pengeluaran_santri || []
    }));
  } catch (error) {
    console.error('Error fetching detailed expenses data:', error);
    return [];
  }
};

interface ExportPDFDialogV3Props {
  open: boolean;
  onClose: () => void;
  onExport?: (filename: string) => void;
  selectedAccountId?: string;
  selectedAccountName?: string;
}

const ExportPDFDialogV3: React.FC<ExportPDFDialogV3Props> = ({
  open,
  onClose,
  onExport,
  selectedAccountId,
  selectedAccountName
}) => {
  const [loading, setLoading] = useState(false);
  const [exportProgress, setExportProgress] = useState<string>('');
  const [periodType, setPeriodType] = useState<'monthly' | 'custom'>('monthly');
  const [selectedMonth, setSelectedMonth] = useState<string>('');
  const [customStartDate, setCustomStartDate] = useState<Date>();
  const [customEndDate, setCustomEndDate] = useState<Date>();
  const [includeDraft, setIncludeDraft] = useState(false);

  // Generate month options for the last 12 months
  const monthOptions = React.useMemo(() => {
    const options = [];
    const now = new Date();
    
    for (let i = 0; i < 12; i++) {
      const date = new Date(now.getFullYear(), now.getMonth() - i, 1);
      const monthYear = format(date, 'MMMM yyyy', { locale: id });
      const value = format(date, 'yyyy-MM');
      options.push({ label: monthYear, value });
    }
    
    return options;
  }, []);

  const getSelectedPeriod = (): PeriodFilter | null => {
    if (periodType === 'monthly') {
      if (!selectedMonth) return null;
      
      const [year, month] = selectedMonth.split('-').map(Number);
      const startDate = new Date(year, month - 1, 1);
      const endDate = new Date(year, month, 0); // Last day of the month
      
      console.log('[EXPORT PDF] Selected period:', {
        selectedMonth,
        startDate: startDate.toISOString(),
        endDate: endDate.toISOString()
      });
      
      return { start: startDate, end: endDate };
    } else {
      if (!customStartDate || !customEndDate) return null;
      return { start: customStartDate, end: customEndDate };
    }
  };

  const handleExport = async () => {
    const period = getSelectedPeriod();
    if (!period) {
      toast.error('Pilih periode terlebih dahulu');
      return;
    }

    setLoading(true);
    setExportProgress('Mempersiapkan export...');
    
    try {
      if (!selectedAccountId || !selectedAccountName) {
        toast.error('Pilih akun kas terlebih dahulu');
        setLoading(false);
        return;
      }
      
      // Use landscape orientation for better table layout
      const exporterMain = new LocalPDFExporter('landscape');
      
      setExportProgress('Membuat Laporan Keuangan...');
      const dataCash = await fetchCashflowPerAccount(period, selectedAccountId, selectedAccountName, includeDraft);
      await exporterMain.exportCashFlowPerAccount(dataCash, period);
      
      // Add watermark to all pages (SKIP TEMPORARY - watermark causes issues)
      // setExportProgress('Menambahkan watermark...');
      // await exporterMain.addWatermarkToAllPages();
      
      const suffix = selectedAccountName ? `_${(selectedAccountName || '').replace(/\s+/g,'_')}` : '';
      exporterMain.save(`Laporan_Keuangan${suffix}_${format(new Date(), 'yyyy-MM-dd_HH-mm')}.pdf`);
      
      setExportProgress('');
      toast.success('PDF berhasil diexport');
      
    } catch (error) {
      console.error('Export error:', error);
      toast.error('Gagal export PDF. Silakan coba lagi.');
    } finally {
      setLoading(false);
      setExportProgress('');
    }
  };

  const handleClose = () => {
    if (!loading) {
      onClose();
    }
  };

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <FileText className="w-5 h-5" />
            Export PDF Laporan Keuangan
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-6">
          <div className="bg-blue-50 border border-blue-200 rounded-lg p-3">
            <p className="text-sm text-blue-800">
              <strong>Template:</strong> Summary Cards, Rincian Pemasukan, dan Rincian Transaksi
            </p>
          </div>

          {/* Pilih Periode */}
          <div className="space-y-3">
            <Label className="text-base font-semibold">Pilih Periode</Label>
            <Tabs value={periodType} onValueChange={(value) => setPeriodType(value as 'monthly' | 'custom')}>
              <TabsList className="grid w-full grid-cols-2">
                <TabsTrigger value="monthly">Bulanan</TabsTrigger>
                <TabsTrigger value="custom">Custom Range</TabsTrigger>
              </TabsList>
              
              <TabsContent value="monthly" className="space-y-3">
                <div>
                  <Label htmlFor="month-select">Pilih Bulan</Label>
                  <Select value={selectedMonth} onValueChange={setSelectedMonth} disabled={loading}>
                    <SelectTrigger>
                      <SelectValue placeholder="Pilih bulan..." />
                    </SelectTrigger>
                    <SelectContent>
                      {monthOptions.map((option) => (
                        <SelectItem key={option.value} value={option.value}>
                          {option.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </TabsContent>
              
              <TabsContent value="custom" className="space-y-3">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label>Tanggal Mulai</Label>
                    <Popover>
                      <PopoverTrigger asChild>
                        <Button
                          variant="outline"
                          className={cn(
                            "w-full justify-start text-left font-normal",
                            !customStartDate && "text-muted-foreground"
                          )}
                          disabled={loading}
                        >
                          <CalendarIcon className="mr-2 h-4 w-4" />
                          {customStartDate ? format(customStartDate, "dd/MM/yyyy") : "Pilih tanggal"}
                        </Button>
                      </PopoverTrigger>
                      <PopoverContent className="w-auto p-0">
                        <Calendar
                          mode="single"
                          selected={customStartDate}
                          onSelect={setCustomStartDate}
                          initialFocus
                        />
                      </PopoverContent>
                    </Popover>
                  </div>
                  
                  <div>
                    <Label>Tanggal Akhir</Label>
                    <Popover>
                      <PopoverTrigger asChild>
                        <Button
                          variant="outline"
                          className={cn(
                            "w-full justify-start text-left font-normal",
                            !customEndDate && "text-muted-foreground"
                          )}
                          disabled={loading}
                        >
                          <CalendarIcon className="mr-2 h-4 w-4" />
                          {customEndDate ? format(customEndDate, "dd/MM/yyyy") : "Pilih tanggal"}
                        </Button>
                      </PopoverTrigger>
                      <PopoverContent className="w-auto p-0">
                        <Calendar
                          mode="single"
                          selected={customEndDate}
                          onSelect={setCustomEndDate}
                          initialFocus
                        />
                      </PopoverContent>
                    </Popover>
                  </div>
                </div>
              </TabsContent>
            </Tabs>
          </div>

          {/* Opsi tambahan dihilangkan untuk kesederhanaan */}
          
          {/* Opsi Include Draft */}
          <div className="flex items-center space-x-2 pt-2 border-t">
            <Checkbox 
              id="includeDraft" 
              checked={includeDraft}
              onCheckedChange={(checked) => setIncludeDraft(checked === true)}
              disabled={loading}
            />
            <Label 
              htmlFor="includeDraft" 
              className="text-sm font-normal cursor-pointer"
            >
              Sertakan SEMUA transaksi (Draft, Cancelled, Selesai, Posted)
            </Label>
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={handleClose} disabled={loading}>
            Batal
          </Button>
          <Button 
            onClick={handleExport} 
            disabled={loading || (!selectedMonth && periodType === 'monthly') || (!customStartDate || !customEndDate) && periodType === 'custom'}
            className="min-w-[120px]"
          >
            {loading ? (
              <>
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                Export...
              </>
            ) : (
              <>
                <Download className="w-4 h-4 mr-2" />
                Export PDF
              </>
            )}
          </Button>
        </DialogFooter>
        
        {/* Progress Indicator */}
        {loading && exportProgress && (
          <div className="px-6 pb-4">
            <div className="bg-blue-50 border border-blue-200 rounded-lg p-3">
              <div className="flex items-center gap-2">
                <Loader2 className="w-4 h-4 animate-spin text-blue-600" />
                <span className="text-sm text-blue-800">{exportProgress}</span>
              </div>
            </div>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
};

export default ExportPDFDialogV3;

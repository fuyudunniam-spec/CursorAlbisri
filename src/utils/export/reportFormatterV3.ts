import { format, startOfMonth, endOfMonth, subMonths, startOfYear, endOfYear } from 'date-fns';
import { id } from 'date-fns/locale';
// Hindari ketergantungan langsung ke PDFExporterV3 untuk stabilitas build
const formatCurrencyLocal = (value: number): string => {
  return new Intl.NumberFormat('id-ID', {
    style: 'currency',
    currency: 'IDR',
    minimumFractionDigits: 0,
  }).format(value || 0);
};

const formatDateLocal = (date: Date | string): string => {
  const dateObj = typeof date === 'string' ? new Date(date) : date;
  return format(dateObj, 'dd/MM/yyyy', { locale: id });
};

export interface PeriodFilter {
  start: Date;
  end: Date;
}

export interface SummaryBox {
  label: string;
  value: string;
  color: 'blue' | 'green' | 'red' | 'yellow';
}

export interface GroupedData {
  groupHeader: string;
  groupSubtitle?: string;
  groupTotal: number;
  subItems: any[];
  groupFooter?: string[];
  showSubTotal?: boolean;
}

export interface IncomeStatementData {
  kategori: string;
  totalKategori: number;
  persentase: number;
  transaksiCount: number;
  subKategori: Array<{
    nama: string;
    total: number;
    count: number;
    items: Array<{
      tanggal: string;
      deskripsi: string;
      jumlah: number;
    }>;
  }>;
}

export interface CashFlowByAccountData {
  akun: {
    nama: string;
    saldo_awal: number;
    saldo_akhir: number;
  };
  transaksi: Array<{
    tanggal: string;
    jenis_transaksi: 'Pemasukan' | 'Pengeluaran';
    kategori: string;
    deskripsi: string;
    jumlah: number;
    saldo: number;
  }>;
  summary: {
    totalPemasukan: number;
    totalPengeluaran: number;
    selisih: number;
  };
}

export interface StudentAidData {
  santri: {
    nama: string;
    nisn: string;
    kategori: string;
  };
  totalBantuan: number;
  breakdown: Array<{
    tanggal: string;
    jenisBantuan: string;
    nominal: number;
    dariTransaksi: string;
    keterangan: string;
  }>;
}

export interface DetailedExpenseData {
  id: string;
  tanggal: string;
  kategori: string;
  jumlah: number;
  penerima_pembayar?: string;
  akun_kas?: {
    nama: string;
  };
  rincian_pengeluaran?: Array<{
    nama_item: string;
    jumlah: number;
    satuan: string;
    harga_satuan: number;
  }>;
  alokasi_pengeluaran_santri?: Array<{
    santri_id: string;
    nominal_alokasi: number;
    jenis_bantuan: string;
    keterangan?: string;
    santri?: {
      nama_lengkap: string;
      nisn: string;
    };
  }>;
  alokasiSantri?: Array<{
    nama: string;
    nominal: number;
  }>;
  totalAlokasiSantri?: number;
  nominalPerSantri?: number;
  alokasiDetails?: any[];
}

export class ReportFormatterV3 {
  
  // Text truncation helper
  public static truncateText(text: string, maxLength: number = 30): string {
    if (!text || text.length <= maxLength) return text || '';
    return text.substring(0, maxLength - 3) + '...';
  }

  // Extract nama from auto-post description
  public static extractNamaFromAutoPost(deskripsi: string): string | null {
    if (!deskripsi) return null;
    
    // Extract nama from "Auto-post dari donasi: Hambali" -> "Hambali"
    if (deskripsi.includes('Auto-post dari donasi:')) {
      const match = deskripsi.match(/Auto-post dari donasi:\s*(.+)$/);
      return match ? match[1].trim() : null;
    }
    
    // Extract nama from "Auto-post dari penjualan: Beras 5kg" -> "Beras 5kg"
    if (deskripsi.includes('Auto-post dari penjualan:')) {
      const match = deskripsi.match(/Auto-post dari penjualan:\s*(.+)$/);
      return match ? match[1].trim() : null;
    }
    
    // Extract nama from "Auto-post dari overhead: SPP & Asrama" -> "SPP & Asrama"
    if (deskripsi.includes('Auto-post dari overhead:')) {
      const match = deskripsi.match(/Auto-post dari overhead:\s*(.+)$/);
      return match ? match[1].trim() : null;
    }
    
    return null;
  }

  // Clean auto-post description
  public static cleanAutoPostDescription(deskripsi: string): string {
    if (!deskripsi) return '-';
    
    // Remove auto-post prefix and return clean description
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

  // Generate description from rincian_pengeluaran (detail items)
  public static generateDescriptionFromDetails(rincianPengeluaran: any[]): string {
    if (!rincianPengeluaran || rincianPengeluaran.length === 0) {
      return '-';
    }

    const maxItemsToShow = 3;
    const items = rincianPengeluaran.slice(0, maxItemsToShow);
    const remainingCount = rincianPengeluaran.length - maxItemsToShow;

    const itemDescriptions = items.map(item => {
      const qty = item.jumlah || 1;
      const name = item.nama_item || 'Item';
      return `${name} (${qty})`;
    });

    if (remainingCount > 0) {
      itemDescriptions.push(`dan ${remainingCount} item lainnya`);
    }

    return itemDescriptions.join(', ');
  }

  // Executive Summary Report Formatting
  public static formatExecutiveSummary(data: any[], period: PeriodFilter) {
    const totalPemasukan = data
      .filter(item => item.jenis_transaksi === 'Pemasukan')
      .reduce((sum, item) => sum + (item.jumlah || 0), 0);
    
    const totalPengeluaran = data
      .filter(item => item.jenis_transaksi === 'Pengeluaran')
      .reduce((sum, item) => sum + (item.jumlah || 0), 0);

    const saldoBersih = totalPemasukan - totalPengeluaran;
    const jumlahTransaksi = data.length;

    // Group by kategori untuk breakdown
    const pemasukanByKategori = data
      .filter(item => item.jenis_transaksi === 'Pemasukan')
      .reduce((acc, item) => {
        const kategori = item.kategori || 'Lainnya';
        if (!acc[kategori]) acc[kategori] = 0;
        acc[kategori] += item.jumlah || 0;
        return acc;
      }, {} as Record<string, number>);

    const pengeluaranByKategori = data
      .filter(item => item.jenis_transaksi === 'Pengeluaran')
      .reduce((acc, item) => {
        const kategori = item.kategori || 'Lainnya';
        if (!acc[kategori]) acc[kategori] = 0;
        acc[kategori] += item.jumlah || 0;
        return acc;
      }, {} as Record<string, number>);

    const summary: SummaryBox[] = [
      {
        label: 'Total Pemasukan',
        value: formatCurrencyLocal(totalPemasukan),
        color: 'green'
      },
      {
        label: 'Total Pengeluaran',
        value: formatCurrencyLocal(totalPengeluaran),
        color: 'red'
      },
      {
        label: 'Saldo Bersih',
        value: formatCurrencyLocal(saldoBersih),
        color: saldoBersih >= 0 ? 'green' : 'red'
      },
      {
        label: 'Jumlah Transaksi',
        value: jumlahTransaksi.toString(),
        color: 'blue'
      }
    ];

    return {
      title: 'Ringkasan Eksekutif',
      subtitle: 'Overview saldo, pemasukan, pengeluaran, dan bantuan santri',
      period,
      data: [],
      columns: [],
      summary,
      grouped: false,
      showGroupTotal: false,
      executiveSummary: {
        totalPemasukan,
        totalPengeluaran,
        saldoBersih,
        jumlahTransaksi,
        pemasukanByKategori,
        pengeluaranByKategori
      }
    };
  }

  // Income Detail Report Formatting
  public static formatIncomeDetailReport(data: any[], period: PeriodFilter) {
    const incomeData = data.filter(item => item.jenis_transaksi === 'Pemasukan');
    const totalPemasukan = incomeData.reduce((sum, item) => sum + (item.jumlah || 0), 0);

    const summary: SummaryBox[] = [
      {
        label: 'Total Pemasukan',
        value: formatCurrencyLocal(totalPemasukan),
        color: 'green'
      },
      {
        label: 'Jumlah Transaksi',
        value: incomeData.length.toString(),
        color: 'blue'
      }
    ];

    const formattedData = incomeData.map(item => {
      // Extract nama from auto-post description
      const namaDonatur = this.extractNamaFromAutoPost(item.deskripsi) || 
                         item.penerima_pembayar || 
                         '-';
      
      // Clean description (remove auto-post prefix)
      const cleanDeskripsi = this.cleanAutoPostDescription(item.deskripsi);

      return {
        tanggal: formatDateLocal(item.tanggal),
        no_bukti: item.nomor_bukti || this.truncateText(item.referensi || item.id?.substring(0, 8) || '-', 8),
        kategori: this.truncateText(item.kategori || '-', 15),
        deskripsi: this.truncateText(cleanDeskripsi, 30),
        donatur: this.truncateText(namaDonatur, 20),
        jumlah: formatCurrencyLocal(item.jumlah || 0)
      };
    });

    const columns = [
      { header: 'TGL', dataKey: 'tanggal', width: 12, align: 'center' as const },
      { header: 'NO. BUKTI', dataKey: 'no_bukti', width: 15, align: 'center' as const },
      { header: 'KATEGORI', dataKey: 'kategori', width: 18, align: 'left' as const },
      { header: 'DESKRIPSI', dataKey: 'deskripsi', width: 30, align: 'left' as const },
      { header: 'DONATUR', dataKey: 'donatur', width: 20, align: 'left' as const },
      { header: 'JUMLAH', dataKey: 'jumlah', width: 15, align: 'right' as const }
    ];

    return {
      title: 'Rincian Pemasukan',
      subtitle: 'Detail transaksi pemasukan per tanggal',
      period,
      data: formattedData,
      columns,
      summary,
      grouped: false,
      showGroupTotal: true,
      totalField: 'jumlah'
    };
  }

  // Expense Detail Report Formatting
  public static formatExpenseDetailReport(data: any[], period: PeriodFilter) {
    const expenseData = data.filter(item => item.jenis_transaksi === 'Pengeluaran');
    const totalPengeluaran = expenseData.reduce((sum, item) => sum + (item.jumlah || 0), 0);

    const summary: SummaryBox[] = [
      {
        label: 'Total Pengeluaran',
        value: formatCurrencyLocal(totalPengeluaran),
        color: 'red'
      },
      {
        label: 'Jumlah Transaksi',
        value: expenseData.length.toString(),
        color: 'blue'
      }
    ];

    const formattedData = expenseData.map(item => {
      // Extract nama from auto-post description
      const namaPenerima = this.extractNamaFromAutoPost(item.deskripsi) || 
                          item.penerima_pembayar || 
                          '-';
      
      // Generate description from rincian_pengeluaran if available, otherwise clean existing description
      let finalDeskripsi = '-';
      if (item.rincian_pengeluaran && item.rincian_pengeluaran.length > 0) {
        finalDeskripsi = this.generateDescriptionFromDetails(item.rincian_pengeluaran);
      } else if (item.deskripsi) {
        finalDeskripsi = this.cleanAutoPostDescription(item.deskripsi);
      }

      return {
        tanggal: formatDateLocal(item.tanggal),
        no_bukti: item.nomor_bukti || this.truncateText(item.referensi || item.id?.substring(0, 8) || '-', 8),
        kategori: this.truncateText(item.kategori || '-', 15),
        deskripsi: this.truncateText(finalDeskripsi, 30),
        penerima: this.truncateText(namaPenerima, 20),
        jumlah: formatCurrencyLocal(item.jumlah || 0)
      };
    });

    const columns = [
      { header: 'TGL', dataKey: 'tanggal', width: 12, align: 'center' as const },
      { header: 'NO. BUKTI', dataKey: 'no_bukti', width: 15, align: 'center' as const },
      { header: 'KATEGORI', dataKey: 'kategori', width: 18, align: 'left' as const },
      { header: 'DESKRIPSI', dataKey: 'deskripsi', width: 30, align: 'left' as const },
      { header: 'PENERIMA', dataKey: 'penerima', width: 20, align: 'left' as const },
      { header: 'JUMLAH', dataKey: 'jumlah', width: 15, align: 'right' as const }
    ];

    return {
      title: 'Rincian Pengeluaran',
      subtitle: 'Detail transaksi pengeluaran per tanggal',
      period,
      data: formattedData,
      columns,
      summary,
      grouped: false,
      showGroupTotal: true,
      totalField: 'jumlah'
    };
  }

  // All Transactions Report Formatting (Combined Pemasukan & Pengeluaran)
  public static formatAllTransactions(data: any[], period: PeriodFilter, saldoAwal: number) {
    // Sort by date ascending
    const sortedData = [...data].sort((a, b) => 
      new Date(a.tanggal).getTime() - new Date(b.tanggal).getTime()
    );
    
    const totalPemasukan = sortedData
      .filter(item => item.jenis_transaksi === 'Pemasukan')
      .reduce((sum, item) => sum + (item.jumlah || 0), 0);
    
    const totalPengeluaran = sortedData
      .filter(item => item.jenis_transaksi === 'Pengeluaran')
      .reduce((sum, item) => sum + (item.jumlah || 0), 0);
    
    const jumlah = totalPemasukan - totalPengeluaran;
    const saldoAkhir = saldoAwal + jumlah;

    const summary: SummaryBox[] = [
      {
        label: 'Total Pemasukan',
        value: formatCurrencyLocal(totalPemasukan),
        color: 'green'
      },
      {
        label: 'Total Pengeluaran',
        value: formatCurrencyLocal(totalPengeluaran),
        color: 'red'
      },
      {
        label: 'Saldo Awal',
        value: formatCurrencyLocal(saldoAwal),
        color: 'blue'
      },
      {
        label: 'Saldo Akhir',
        value: formatCurrencyLocal(saldoAkhir),
        color: 'blue'
      }
    ];

    // Format data dengan DESKRIPSI/PENERIMA digabung
    const formattedData = sortedData.map(item => {
      // Generate description from rincian_pengeluaran if available, otherwise clean existing description
      let finalDeskripsi = '-';
      if (item.jenis_transaksi === 'Pengeluaran' && item.rincian_pengeluaran && item.rincian_pengeluaran.length > 0) {
        finalDeskripsi = this.generateDescriptionFromDetails(item.rincian_pengeluaran);
      } else if (item.deskripsi) {
        finalDeskripsi = this.cleanAutoPostDescription(item.deskripsi);
      }
      
      // Extract nama from auto-post description or use penerima_pembayar
      const namaPenerima = this.extractNamaFromAutoPost(item.deskripsi) || 
                          item.penerima_pembayar || 
                          '-';
      
      const deskripsiPenerima = `${finalDeskripsi}/${namaPenerima}`;

      return {
        tanggal: formatDateLocal(item.tanggal),
        no_bukti: item.nomor_bukti || this.truncateText(item.referensi || item.id?.substring(0, 8) || '-', 8),
        kategori: this.truncateText(item.kategori || '-', 15),
        deskripsi_penerima: this.truncateText(deskripsiPenerima, 40),
        pemasukan: item.jenis_transaksi === 'Pemasukan' ? formatCurrencyLocal(item.jumlah || 0) : '',
        pengeluaran: item.jenis_transaksi === 'Pengeluaran' ? formatCurrencyLocal(item.jumlah || 0) : ''
      };
    });

    const columns = [
      { header: 'TGL', dataKey: 'tanggal', width: 12, align: 'center' as const },
      { header: 'NO. BUKTI', dataKey: 'no_bukti', width: 15, align: 'center' as const },
      { header: 'KATEGORI', dataKey: 'kategori', width: 18, align: 'left' as const },
      { header: 'DESKRIPSI/PENERIMA', dataKey: 'deskripsi_penerima', width: 35, align: 'left' as const },
      { header: 'PEMASUKAN', dataKey: 'pemasukan', width: 15, align: 'right' as const },
      { header: 'PENGELUARAN', dataKey: 'pengeluaran', width: 15, align: 'right' as const }
    ];

    return {
      title: 'Rincian Transaksi',
      subtitle: 'Detail transaksi pemasukan dan pengeluaran per tanggal',
      period,
      data: formattedData,
      columns,
      summary,
      grouped: false,
      showGroupTotal: true,
      totals: {
        totalPemasukan,
        totalPengeluaran,
        jumlah,
        saldoAkhir
      }
    };
  }

  // Cash Flow by Account with Separate Columns
  public static formatCashFlowByAccountWithSeparateColumns(data: any[], period: PeriodFilter) {
    const totalPemasukan = data
      .filter(item => item.jenis_transaksi === 'Pemasukan')
      .reduce((sum, item) => sum + (item.jumlah || 0), 0);
    
    const totalPengeluaran = data
      .filter(item => item.jenis_transaksi === 'Pengeluaran')
      .reduce((sum, item) => sum + (item.jumlah || 0), 0);

    const saldoBersih = totalPemasukan - totalPengeluaran;

    const summary: SummaryBox[] = [
      {
        label: 'Total Pemasukan',
        value: formatCurrencyLocal(totalPemasukan),
        color: 'green'
      },
      {
        label: 'Total Pengeluaran',
        value: formatCurrencyLocal(totalPengeluaran),
        color: 'red'
      },
      {
        label: 'Saldo Bersih',
        value: formatCurrencyLocal(saldoBersih),
        color: saldoBersih >= 0 ? 'green' : 'red'
      }
    ];

    const formattedData = data.map((item, index) => {
      // Calculate running balance
      const runningBalance = data.slice(0, index + 1).reduce((sum, tx) => {
        const amount = tx.jenis_transaksi === 'Pemasukan' ? tx.jumlah : -tx.jumlah;
        return sum + (amount || 0);
      }, 0);

      // Generate description from rincian_pengeluaran if available, otherwise clean existing description
      let finalDeskripsi = '-';
      if (item.jenis_transaksi === 'Pengeluaran' && item.rincian_pengeluaran && item.rincian_pengeluaran.length > 0) {
        finalDeskripsi = this.generateDescriptionFromDetails(item.rincian_pengeluaran);
      } else if (item.deskripsi) {
        finalDeskripsi = this.cleanAutoPostDescription(item.deskripsi);
      }

      return {
        tanggal: formatDateLocal(item.tanggal),
        no_bukti: item.nomor_bukti || this.truncateText(item.referensi || item.id?.substring(0, 8) || '-', 8),
        kategori: this.truncateText(item.kategori || '-', 20),
        deskripsi: this.truncateText(finalDeskripsi, 35),
        pemasukan: item.jenis_transaksi === 'Pemasukan' ? formatCurrencyLocal(item.jumlah || 0) : '',
        pengeluaran: item.jenis_transaksi === 'Pengeluaran' ? formatCurrencyLocal(item.jumlah || 0) : '',
        saldo: formatCurrencyLocal(runningBalance)
      };
    });

    const columns = [
      { header: 'TANGGAL', dataKey: 'tanggal', width: 12, align: 'center' as const },
      { header: 'NO. BUKTI', dataKey: 'no_bukti', width: 15, align: 'center' as const },
      { header: 'KATEGORI', dataKey: 'kategori', width: 20, align: 'left' as const },
      { header: 'DESKRIPSI', dataKey: 'deskripsi', width: 35, align: 'left' as const },
      { header: 'PEMASUKAN', dataKey: 'pemasukan', width: 12, align: 'right' as const },
      { header: 'PENGELUARAN', dataKey: 'pengeluaran', width: 12, align: 'right' as const },
      { header: 'SALDO', dataKey: 'saldo', width: 12, align: 'right' as const }
    ];

    return {
      title: 'Arus Kas per Akun',
      subtitle: 'Detail transaksi dengan kolom pemasukan dan pengeluaran terpisah',
      period,
      data: formattedData,
      columns,
      summary,
      grouped: false,
      showGroupTotal: true
    };
  }

  // Student Aid Summary Report Formatting
  public static formatStudentAidSummary(data: StudentAidData[], period: PeriodFilter) {
    const totalBantuan = data.reduce((sum, item) => sum + item.totalBantuan, 0);
    const jumlahSantri = data.length;
    const rataRataBantuan = jumlahSantri > 0 ? totalBantuan / jumlahSantri : 0;

    const summary: SummaryBox[] = [
      {
        label: 'Total Bantuan',
        value: formatCurrencyLocal(totalBantuan),
        color: 'green'
      },
      {
        label: 'Jumlah Santri',
        value: jumlahSantri.toString(),
        color: 'blue'
      },
      {
        label: 'Rata-rata per Santri',
        value: formatCurrencyLocal(rataRataBantuan),
        color: 'yellow'
      }
    ];

    const formattedData = data.map(item => {
      // Debug logging
      console.log('[STUDENT AID FORMATTER] Processing student:', item.santri?.nama);
      console.log('[STUDENT AID FORMATTER] Breakdown items:', item.breakdown);
      
      // Calculate breakdown from student aid data
      const sppPendidikan = item.breakdown
        .filter(b => b.jenisBantuan?.includes('SPP') || b.jenisBantuan?.includes('Pendidikan'))
        .reduce((sum, b) => sum + (b.nominal || 0), 0);
      
      const asramaKonsumsi = item.breakdown
        .filter(b => b.jenisBantuan?.includes('Asrama') || b.jenisBantuan?.includes('Konsumsi'))
        .reduce((sum, b) => sum + (b.nominal || 0), 0);
      
      // Fix: Calculate bantuan langsung as the difference between total and SPP+Asrama
      const totalSppAsrama = sppPendidikan + asramaKonsumsi;
      const bantuanLangsung = Math.max(0, item.totalBantuan - totalSppAsrama);
      
      // Alternative: Also try to get from breakdown if available
      const bantuanLangsungFromBreakdown = item.breakdown
        .filter(b => {
          const jenis = b.jenisBantuan?.toLowerCase() || '';
          return jenis.includes('langsung') || 
                 jenis.includes('bantuan') || 
                 jenis.includes('donasi') ||
                 jenis.includes('tunai') ||
                 jenis === 'bantuan langsung';
        })
        .reduce((sum, b) => sum + (b.nominal || 0), 0);
      
      // Use the higher value (either calculated or from breakdown)
      const finalBantuanLangsung = Math.max(bantuanLangsung, bantuanLangsungFromBreakdown);

      console.log('[STUDENT AID FORMATTER] Calculated amounts:', {
        sppPendidikan,
        asramaKonsumsi,
        bantuanLangsung,
        bantuanLangsungFromBreakdown,
        finalBantuanLangsung,
        totalBantuan: item.totalBantuan
      });

      // Combine SPP & Pendidikan + Asrama & Konsumsi
      const sppAsrama = sppPendidikan + asramaKonsumsi;

      return {
        nama: this.truncateText(item.santri?.nama || 'Unknown Student', 35), // Increased from 20 to 35
        nis: this.truncateText(item.santri?.nisn || '-', 12),
        kategori: this.truncateText(item.santri?.kategori || 'Unknown', 15),
        spp_asrama: formatCurrencyLocal(sppAsrama), // Combined column
        bantuan_langsung: formatCurrencyLocal(finalBantuanLangsung), // Use final calculated value
        total: formatCurrencyLocal(item.totalBantuan)
      };
    });

    const columns = [
      { header: 'NAMA SANTRI', dataKey: 'nama', width: 35, align: 'left' as const },
      { header: 'NIS', dataKey: 'nis', width: 12, align: 'center' as const },
      { header: 'KATEGORI', dataKey: 'kategori', width: 15, align: 'left' as const },
      { header: 'SPP & ASRAMA', dataKey: 'spp_asrama', width: 15, align: 'right' as const },
      { header: 'BANTUAN LANGSUNG', dataKey: 'bantuan_langsung', width: 15, align: 'right' as const },
      { header: 'TOTAL', dataKey: 'total', width: 15, align: 'right' as const }
    ];

    return {
      title: 'Bantuan Santri',
      subtitle: 'Rincian bantuan per santri dengan breakdown',
      period,
      data: formattedData,
      columns,
      summary,
      grouped: false,
      showGroupTotal: true,
      totalField: 'total'
    };
  }
  
  // Period helper methods
  public static getPeriodPresets(): { label: string; start: Date; end: Date }[] {
    const now = new Date();
    
    return [
      {
        label: 'Bulan Ini',
        start: startOfMonth(now),
        end: endOfMonth(now)
      },
      {
        label: '3 Bulan Terakhir',
        start: startOfMonth(subMonths(now, 2)),
        end: endOfMonth(now)
      },
      {
        label: '6 Bulan Terakhir',
        start: startOfMonth(subMonths(now, 5)),
        end: endOfMonth(now)
      },
      {
        label: '1 Tahun Terakhir',
        start: startOfMonth(subMonths(now, 11)),
        end: endOfMonth(now)
      },
      {
        label: 'Tahun Ini',
        start: startOfYear(now),
        end: endOfYear(now)
      }
    ];
  }

  public static formatPeriod(period: PeriodFilter): string {
    return `${format(period.start, 'dd MMMM yyyy', { locale: id })} - ${format(period.end, 'dd MMMM yyyy', { locale: id })}`;
  }

  // Income Statement Report Formatting (Grouped by Kategori)
  public static formatIncomeStatementGrouped(data: IncomeStatementData[], period: PeriodFilter) {
    const totalPemasukan = data
      .filter(item => item.kategori.includes('Pemasukan') || item.kategori.includes('Donasi'))
      .reduce((sum, item) => sum + item.totalKategori, 0);
    
    const totalPengeluaran = data
      .filter(item => !item.kategori.includes('Pemasukan') && !item.kategori.includes('Donasi'))
      .reduce((sum, item) => sum + item.totalKategori, 0);

    const saldoBersih = totalPemasukan - totalPengeluaran;

    const summary: SummaryBox[] = [
      {
        label: 'Total Pemasukan',
        value: formatCurrencyLocal(totalPemasukan || 0),
        color: 'green'
      },
      {
        label: 'Total Pengeluaran',
        value: formatCurrencyLocal(totalPengeluaran || 0),
        color: 'red'
      },
      {
        label: 'Saldo Bersih',
        value: formatCurrencyLocal(saldoBersih || 0),
        color: (saldoBersih || 0) >= 0 ? 'green' : 'red'
      }
    ];

    // Convert to grouped format for PDF
    const groupedData: GroupedData[] = data.map(item => ({
      groupHeader: `${item.kategori} (${item.transaksiCount} transaksi)`,
      groupTotal: item.totalKategori,
      subItems: item.subKategori.map(sub => ({
        subKategori: sub.nama,
        total: sub.total,
        count: sub.count,
        persentase: ((sub.total / item.totalKategori) * 100).toFixed(1) + '%'
      })),
      showSubTotal: true
    }));

    const columns = [
      { header: 'Sub-kategori', dataKey: 'subKategori', width: 40 },
      { header: 'Total', dataKey: 'total', width: 30, render: (value: number) => formatCurrencyLocal(value), align: 'right' as const },
      { header: 'Jumlah', dataKey: 'count', width: 20, align: 'center' as const },
      { header: 'Persentase', dataKey: 'persentase', width: 20, align: 'center' as const }
    ];

    return {
      title: 'Laporan Laba Rugi',
      subtitle: `Analisis pemasukan vs pengeluaran per kategori`,
      period,
      data: groupedData,
      columns,
      summary,
      grouped: true,
      groupBy: 'kategori',
      showGroupTotal: true
    };
  }

  // Cash Flow by Account Report Formatting (detailed per account)
  public static formatCashFlowByAccount(data: CashFlowByAccountData[], period: PeriodFilter) {
    const totalSaldoAwal = data.reduce((sum, item) => sum + (item.akun?.saldo_awal || 0), 0);
    const totalSaldoAkhir = data.reduce((sum, item) => sum + (item.akun?.saldo_akhir || 0), 0);
    const totalPemasukan = data.reduce((sum, item) => sum + (item.summary?.totalPemasukan || 0), 0);
    const totalPengeluaran = data.reduce((sum, item) => sum + (item.summary?.totalPengeluaran || 0), 0);

    const summary: SummaryBox[] = [
      {
        label: 'Saldo Awal',
        value: formatCurrencyLocal(totalSaldoAwal || 0),
        color: 'blue'
      },
      {
        label: 'Total Pemasukan',
        value: formatCurrencyLocal(totalPemasukan || 0),
        color: 'green'
      },
      {
        label: 'Total Pengeluaran',
        value: formatCurrencyLocal(totalPengeluaran || 0),
        color: 'red'
      },
      {
        label: 'Saldo Akhir',
        value: formatCurrencyLocal(totalSaldoAkhir || 0),
        color: 'blue'
      }
    ];

    // Convert to grouped format by account (with subtitle and footer)
    const groupedData: GroupedData[] = data.map(item => ({
      groupHeader: `${item.akun?.nama || 'Unknown Account'}`,
      groupSubtitle: `Saldo Awal: ${formatCurrencyLocal(item.akun?.saldo_awal || 0)} | Saldo Akhir: ${formatCurrencyLocal(item.akun?.saldo_akhir || 0)}`,
      groupTotal: item.summary?.selisih || 0,
      subItems: (item.transaksi || []).map((trans, index) => {
        const t: any = trans as any;
        const kategori = trans.kategori || t.kategori_nama || (trans.jenis_transaksi === 'Pengeluaran' ? 'Operasional' : 'Pemasukan Lainnya');
        const referensi = t.referensi || t.nomor || t.no_ref;
        const deskripsiRaw = trans.deskripsi || t.keterangan || t.catatan || '';
        const deskripsi = (deskripsiRaw && String(deskripsiRaw).trim() !== '') ? String(deskripsiRaw) : (referensi || kategori || '-');
        
        // Calculate running balance
        const saldoAwal = item.akun?.saldo_awal || 0;
        const runningBalance = saldoAwal + (item.transaksi || []).slice(0, index + 1).reduce((sum, tx) => {
          const amount = tx.jenis_transaksi === 'Pemasukan' ? tx.jumlah : -tx.jumlah;
          return sum + amount;
        }, 0);
        
        return {
          tanggal: formatDateLocal(trans.tanggal),
          jenis: trans.jenis_transaksi === 'Pemasukan' ? 'Pemasukan' : 'Pengeluaran',
          kategori,
          deskripsi,
          jumlah: (trans.jenis_transaksi === 'Pemasukan' ? '+' : '-') + formatCurrencyLocal(trans.jumlah || 0),
          saldo: formatCurrencyLocal(runningBalance)
        };
      }),
      groupFooter: [
        `Total Pemasukan: ${formatCurrencyLocal(item.summary?.totalPemasukan || 0)}`,
        `Total Pengeluaran: ${formatCurrencyLocal(item.summary?.totalPengeluaran || 0)}`,
        `Saldo Akhir: ${formatCurrencyLocal(item.akun?.saldo_akhir || 0)}`
      ],
      showSubTotal: false
    }));

    const columns = [
      { header: 'Tanggal', dataKey: 'tanggal', width: 14 },
      { header: 'Jenis', dataKey: 'jenis', width: 14 },
      { header: 'Kategori', dataKey: 'kategori', width: 18 },
      { header: 'Deskripsi', dataKey: 'deskripsi', width: 26 },
      { header: 'Jumlah', dataKey: 'jumlah', width: 14, align: 'right' as const },
      { header: 'Saldo', dataKey: 'saldoRunning', width: 14, align: 'right' as const }
    ];

    return {
      title: 'Laporan Arus Kas per Akun',
      subtitle: `Detail transaksi dan mutasi setiap akun kas`,
      period,
      data: groupedData,
      columns,
      summary,
      grouped: true,
      groupBy: 'akun',
      showGroupTotal: false,
      showGroupFooter: true
    };
  }

  // Student Aid Report Formatting (detailed per student)
  public static formatStudentAidDetailed(data: StudentAidData[], period: PeriodFilter) {
    const totalBantuan = data.reduce((sum, item) => sum + item.totalBantuan, 0);
    const jumlahSantri = data.length;
    const rataRataBantuan = jumlahSantri > 0 ? totalBantuan / jumlahSantri : 0;

    const summary: SummaryBox[] = [
      {
        label: 'Total Bantuan',
        value: formatCurrencyLocal(totalBantuan || 0),
        color: 'green'
      },
      {
        label: 'Jumlah Santri',
        value: (jumlahSantri || 0).toString(),
        color: 'blue'
      },
      {
        label: 'Rata-rata per Santri',
        value: formatCurrencyLocal(rataRataBantuan || 0),
        color: 'yellow'
      }
    ];

    // Convert to grouped format by student (with subtitle)
    const groupedData: GroupedData[] = data.map(item => ({
      groupHeader: `${item.santri?.nama || 'Unknown Student'} (${item.santri?.nisn || '-'})`,
      groupSubtitle: `${item.santri?.kategori || 'Unknown'} | Total Bantuan: ${formatCurrencyLocal(item.totalBantuan || 0)}`,
      groupTotal: item.totalBantuan || 0,
      subItems: (item.breakdown || []).map(b => ({
        tanggal: formatDateLocal(b.tanggal),
        jenisBantuan: b.jenisBantuan || '-',
        nominal: formatCurrencyLocal(b.nominal || 0),
        dariTransaksi: b.dariTransaksi || '-',
        keterangan: (b.keterangan && b.keterangan.trim() !== '') ? b.keterangan : '-'
      })),
      showSubTotal: true
    }));

    const columns = [
      { header: 'Tanggal', dataKey: 'tanggal', width: 14 },
      { header: 'Jenis Bantuan', dataKey: 'jenisBantuan', width: 22 },
      { header: 'Nominal', dataKey: 'nominal', width: 18, align: 'right' as const },
      { header: 'Transaksi', dataKey: 'dariTransaksi', width: 18 },
      { header: 'Keterangan', dataKey: 'keterangan', width: 28 }
    ];

    return {
      title: 'Laporan Bantuan per Santri',
      subtitle: `Detail bantuan yang diberikan ke setiap santri`,
      period,
      data: groupedData,
      columns,
      summary,
      grouped: true,
      groupBy: 'santri',
      showGroupTotal: true
    };
  }

  // Detailed Expenses Report Formatting
  public static formatDetailedExpenses(data: DetailedExpenseData[], period: PeriodFilter, options?: { showRincianItem?: boolean; showAlokasiSantri?: boolean }) {
    const showRincianItem = options?.showRincianItem !== false; // default true
    const showAlokasiSantri = options?.showAlokasiSantri !== false; // default true
    
    const totalPengeluaran = data.reduce((sum, item) => sum + (item.jumlah || 0), 0);
    const totalTransaksi = data.length;
    const totalAlokasiSantri = data.reduce((sum, item) => sum + (item.totalAlokasiSantri || 0), 0);

    const summary: SummaryBox[] = [
      {
        label: 'Total Pengeluaran',
        value: formatCurrencyLocal(totalPengeluaran || 0),
        color: 'red'
      },
      {
        label: 'Jumlah Transaksi',
        value: (totalTransaksi || 0).toString(),
        color: 'blue'
      },
      {
        label: 'Total Alokasi Santri',
        value: (totalAlokasiSantri || 0).toString(),
        color: 'green'
      }
    ];

    // Convert to grouped format by transaction with compact layout
    const groupedData: GroupedData[] = data.map(item => {
      const headerTanggal = formatDateLocal(item.tanggal);
      
      // Clean kategori text - remove any encoding artifacts
      const cleanKategori = (item.kategori || '')
        .replace(/&[0-9]+&/g, '') // Remove &X& patterns
        .replace(/&[A-Za-z]+&/g, '') // Remove &Letter& patterns
        .replace(/[&]{1,}/g, '') // Remove any & symbols
        .replace(/[!']/g, '') // Remove ! and ' symbols
        .replace(/[^\w\s\-\.]/g, '') // Remove any non-word, non-space, non-dash, non-dot characters
        .replace(/\s+/g, ' ') // Normalize spaces
        .trim();
      
      const subtitleParts: string[] = [];
      if (item.penerima_pembayar) {
        // Clean penerima text
        const cleanPenerima = (item.penerima_pembayar || '')
          .replace(/&[0-9]+&/g, '')
          .replace(/&[A-Za-z]+&/g, '')
          .replace(/[&]{1,}/g, '')
          .replace(/[!']/g, '')
          .replace(/[^\w\s\-\.]/g, '') // Remove any non-word, non-space, non-dash, non-dot characters
          .replace(/\s+/g, ' ')
          .trim();
        subtitleParts.push(`Penerima: ${cleanPenerima}`);
      }
      if (item.akun_kas?.nama) {
        // Clean akun kas text
        const cleanMetode = (item.akun_kas.nama || '')
          .replace(/&[0-9]+&/g, '')
          .replace(/&[A-Za-z]+&/g, '')
          .replace(/[&]{1,}/g, '')
          .replace(/[!']/g, '')
          .replace(/[^\w\s\-\.]/g, '') // Remove any non-word, non-space, non-dash, non-dot characters
          .replace(/\s+/g, ' ')
          .trim();
        subtitleParts.push(`Akun: ${cleanMetode}`);
      }

      const groupFooter: string[] = [];
      if (showAlokasiSantri && item.alokasi_pengeluaran_santri && item.alokasi_pengeluaran_santri.length > 0) {
        item.alokasi_pengeluaran_santri.forEach(alloc => {
          groupFooter.push(
            `${alloc.santri?.nama_lengkap || 'Unknown'} (${alloc.jenis_bantuan}): ${formatCurrencyLocal(alloc.nominal_alokasi || 0)}`
          );
        });
        
        const totalAlokasi = item.alokasi_pengeluaran_santri.reduce(
          (sum, alloc) => sum + (alloc.nominal_alokasi || 0), 0
        );
        groupFooter.push(`Total Alokasi: ${formatCurrencyLocal(totalAlokasi)}`);
      } else if ((item.totalAlokasiSantri || 0) > 0 && (item.nominalPerSantri || 0) > 0) {
        const totalAlokasi = item.totalAlokasiSantri * item.nominalPerSantri;
        groupFooter.push(
          `Alokasi Santri: ${item.totalAlokasiSantri} santri × ${formatCurrencyLocal(item.nominalPerSantri)} = ${formatCurrencyLocal(totalAlokasi)}`
        );
      }

      // Only show group header if there are multiple items
      const hasMultipleItems = showRincianItem && item.rincian_pengeluaran && item.rincian_pengeluaran.length > 1;
      
      const subItems = [];
      if (showRincianItem && item.rincian_pengeluaran && item.rincian_pengeluaran.length > 0) {
        item.rincian_pengeluaran.forEach(rincian => {
          subItems.push({
            detail: rincian.nama_item,
            jumlah: `${rincian.jumlah} ${rincian.satuan}`,
            harga: formatCurrencyLocal(rincian.harga_satuan),
            total: formatCurrencyLocal(rincian.jumlah * rincian.harga_satuan),
            // For single items, include transaction info in the row
            info: item.rincian_pengeluaran.length === 1 
              ? `${headerTanggal} • ${cleanKategori}${subtitleParts.length > 0 ? '\n' + subtitleParts.join(' • ') : ''}`
              : ''
          });
        });
      }
      
      const group: any = {
        groupHeader: hasMultipleItems ? `${headerTanggal} • ${cleanKategori} — ${formatCurrencyLocal(item.jumlah)}` : null,
        groupSubtitle: hasMultipleItems ? subtitleParts.join(' • ') : null,
        groupTotal: item.jumlah,
        subItems: showRincianItem ? subItems : [],
        groupFooter: showAlokasiSantri ? groupFooter : [],
        showSubTotal: showRincianItem && subItems.length > 1
      };
      return group;
    });

    // Modify columns based on options
    const columns = [
      { header: 'Detail', dataKey: 'detail', width: 35 },
      { header: 'Jumlah', dataKey: 'jumlah', width: 15 },
      { header: 'Harga Satuan', dataKey: 'harga', width: 15, align: 'right' as const },
      { header: 'Total', dataKey: 'total', width: 15, align: 'right' as const }
    ];
    
    if (showRincianItem) {
      columns.push({ header: 'Rincian Item', dataKey: 'rincian', width: 25 });
    }
    if (showAlokasiSantri) {
      columns.push({ header: 'Alokasi Santri', dataKey: 'alokasi', width: 25 });
    }
    
    columns.push({ header: 'Info Transaksi', dataKey: 'info', width: 20 });

    return {
      title: 'Laporan Rincian Pengeluaran',
      subtitle: `Detail pengeluaran dengan breakdown item dan alokasi santri`,
      period,
      data: groupedData,
      columns,
      summary,
      grouped: true,
      groupBy: 'transaksi',
      showGroupTotal: true,
      showGroupFooter: true as any
    };
  }

  // Comprehensive Report (Only two focused reports)
  public static formatComprehensiveReport(allData: {
    incomeStatement: IncomeStatementData[];
    cashFlow: CashFlowByAccountData[];
    studentAid: StudentAidData[];
    detailedExpenses: DetailedExpenseData[];
  }, period: PeriodFilter) {
    const reports = [] as any[];

    if (allData.cashFlow.length > 0) {
      reports.push(this.formatCashFlowByAccount(allData.cashFlow, period));
    }

    if (allData.studentAid.length > 0) {
      reports.push(this.formatStudentAidDetailed(allData.studentAid, period));
    }

    return reports;
  }

  // Utility methods
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

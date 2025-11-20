import { format, startOfMonth, endOfMonth, subMonths, startOfYear, endOfYear } from 'date-fns';
import { id } from 'date-fns/locale';

export interface PeriodFilter {
  start: Date;
  end: Date;
}

export interface CashFlowData {
  totalPemasukan: number;
  totalPengeluaran: number;
  saldoAkhir: number;
  breakdown: {
    bulan: string;
    pemasukan: number;
    pengeluaran: number;
    saldo: number;
  }[];
}

export interface KategoriData {
  kategori: string;
  total: number;
  persentase: number;
  count: number;
}

export interface SantriBantuanData {
  id: string;
  nama: string;
  kategori: string;
  totalBantuan: number;
  breakdown: {
    jenis: string;
    nominal: number;
  }[];
}

export interface AuditTrailData {
  id: string;
  tanggal: Date;
  jenis: string;
  kategori: string;
  jumlah: number;
  user: string;
  akun: string;
  status: string;
  deskripsi?: string;
}

export class ReportFormatter {
  
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

  // Cash Flow Report Formatting
  public static formatCashFlowReport(data: CashFlowData, period: PeriodFilter) {
    // Enhanced summary with saldo awal
    const summary = [
      {
        label: 'Saldo Awal',
        value: this.formatCurrency(data.saldoAwal || 0)
      },
      {
        label: 'Total Pemasukan',
        value: this.formatCurrency(data.totalPemasukan)
      },
      {
        label: 'Total Pengeluaran',
        value: this.formatCurrency(data.totalPengeluaran)
      },
      {
        label: 'Saldo Akhir',
        value: this.formatCurrency(data.saldoAkhir)
      }
    ];

    // Use detailed transactions if available, otherwise use monthly breakdown
    const useDetailedTransactions = data.transactions && data.transactions.length > 0;
    
    if (useDetailedTransactions) {
      // Detailed transaction columns with optimized widths for A4
      // Total width: 20+15+15+30+20+20+20 = 140mm (fits A4 with margin)
      const columns = [
        { header: 'Tanggal', dataKey: 'tanggal', width: 20, render: (value: Date) => this.formatDate(value) },
        { header: 'Kode', dataKey: 'kode', width: 15 },
        { header: 'Kategori', dataKey: 'kategori', width: 15 },
        { header: 'Deskripsi', dataKey: 'deskripsi', width: 30 },
        { header: 'Pemasukan', dataKey: 'pemasukan', width: 20, render: (value: number) => value > 0 ? this.formatCurrency(value) : '-' },
        { header: 'Pengeluaran', dataKey: 'pengeluaran', width: 20, render: (value: number) => value > 0 ? this.formatCurrency(value) : '-' },
        { header: 'Saldo', dataKey: 'saldo', width: 20, render: (value: number) => this.formatCurrency(value) }
      ];

      return {
        title: 'Laporan Cash Flow',
        subtitle: `Detail transaksi pemasukan dan pengeluaran periode ${this.formatPeriod(period)}`,
        period,
        data: data.transactions,
        columns,
        summary
      };
    } else {
      // Fallback to monthly breakdown with optimized widths
      // Total width: 25+30+30+30 = 115mm (fits A4 with margin)
      const columns = [
        { header: 'Bulan', dataKey: 'bulan', width: 25 },
        { header: 'Pemasukan', dataKey: 'pemasukan', width: 30, render: (value: number) => this.formatCurrency(value) },
        { header: 'Pengeluaran', dataKey: 'pengeluaran', width: 30, render: (value: number) => this.formatCurrency(value) },
        { header: 'Saldo', dataKey: 'saldo', width: 30, render: (value: number) => this.formatCurrency(value) }
      ];

      return {
        title: 'Laporan Cash Flow',
        subtitle: `Ringkasan pemasukan vs pengeluaran per bulan`,
        period,
        data: data.breakdown,
        columns,
        summary
      };
    }
  }

  // Kategori Report Formatting
  public static formatKategoriReport(data: KategoriData[], period: PeriodFilter) {
    const total = data.reduce((sum, item) => sum + item.total, 0);
    
    const summary = [
      {
        label: 'Total Pengeluaran',
        value: this.formatCurrency(total)
      },
      {
        label: 'Jumlah Kategori',
        value: data.length.toString()
      },
      {
        label: 'Kategori Terbesar',
        value: data.length > 0 ? data[0].kategori : '-'
      }
    ];

    const columns = [
      { header: 'Kategori', dataKey: 'kategori', width: 120 },
      { header: 'Total', dataKey: 'total', width: 80, render: (value: number) => this.formatCurrency(value) },
      { header: 'Persentase', dataKey: 'persentase', width: 60, render: (value: number) => `${value.toFixed(1)}%` },
      { header: 'Jumlah Transaksi', dataKey: 'count', width: 80 }
    ];

    return {
      title: 'Laporan Per Kategori',
      subtitle: `Analisis pengeluaran berdasarkan kategori`,
      period,
      data,
      columns,
      summary
    };
  }

  // Santri Bantuan Report Formatting
  public static formatSantriBantuanReport(data: SantriBantuanData[], period: PeriodFilter) {
    const totalBantuan = data.reduce((sum, item) => sum + item.totalBantuan, 0);
    
    const summary = [
      {
        label: 'Total Bantuan',
        value: this.formatCurrency(totalBantuan)
      },
      {
        label: 'Jumlah Santri',
        value: data.length.toString()
      },
      {
        label: 'Rata-rata per Santri',
        value: data.length > 0 ? this.formatCurrency(totalBantuan / data.length) : 'Rp 0'
      }
    ];

    const columns = [
      { header: 'Nama Santri', dataKey: 'nama', width: 150 },
      { header: 'Kategori', dataKey: 'kategori', width: 80 },
      { header: 'Total Bantuan', dataKey: 'totalBantuan', width: 100, render: (value: number) => this.formatCurrency(value) },
      { header: 'Komponen', dataKey: 'komponen', width: 120, render: (value: any, row: any) => {
        return row.breakdown?.map((b: any) => `${b.jenis}: ${this.formatCurrency(b.nominal)}`).join(', ') || '-';
      }}
    ];

    return {
      title: 'Laporan Per Santri',
      subtitle: `Bantuan yang diberikan ke setiap santri`,
      period,
      data,
      columns,
      summary
    };
  }

  // Audit Trail Report Formatting
  public static formatAuditTrailReport(data: AuditTrailData[], period: PeriodFilter) {
    const totalTransaksi = data.reduce((sum, item) => sum + item.jumlah, 0);
    
    const summary = [
      {
        label: 'Total Transaksi',
        value: this.formatCurrency(totalTransaksi)
      },
      {
        label: 'Jumlah Record',
        value: data.length.toString()
      },
      {
        label: 'Periode',
        value: this.formatPeriod(period)
      }
    ];

    const columns = [
      { header: 'Tanggal', dataKey: 'tanggal', width: 80, render: (value: Date) => this.formatDateTime(value) },
      { header: 'Jenis', dataKey: 'jenis', width: 60 },
      { header: 'Kategori', dataKey: 'kategori', width: 80 },
      { header: 'Jumlah', dataKey: 'jumlah', width: 80, render: (value: number) => this.formatCurrency(value) },
      { header: 'User', dataKey: 'user', width: 60 },
      { header: 'Akun', dataKey: 'akun', width: 60 },
      { header: 'Status', dataKey: 'status', width: 60 },
      { header: 'Deskripsi', dataKey: 'deskripsi', width: 100 }
    ];

    return {
      title: 'Audit Trail',
      subtitle: `Riwayat lengkap transaksi dengan metadata`,
      period,
      data,
      columns,
      summary
    };
  }

  // Excel-specific formatting
  public static formatCashFlowExcel(data: CashFlowData, period: PeriodFilter) {
    const summarySheet = {
      name: 'Ringkasan',
      data: [
        ['Saldo Awal', this.formatCurrency(data.saldoAwal || 0)],
        ['Total Pemasukan', this.formatCurrency(data.totalPemasukan)],
        ['Total Pengeluaran', this.formatCurrency(data.totalPengeluaran)],
        ['Saldo Akhir', this.formatCurrency(data.saldoAkhir)],
        ['Periode', this.formatPeriod(period)]
      ],
      columns: [
        { header: 'Keterangan', dataKey: 'label', width: 20 },
        { header: 'Nilai', dataKey: 'value', width: 20 }
      ]
    };

    // Include detailed transactions sheet if available
    if (data.transactions && data.transactions.length > 0) {
      const transactionSheet = {
        name: 'Detail Transaksi',
        data: data.transactions,
        columns: [
          { header: 'Tanggal', dataKey: 'tanggal', width: 12 },
          { header: 'Kode', dataKey: 'kode', width: 15 },
          { header: 'Kategori', dataKey: 'kategori', width: 15 },
          { header: 'Deskripsi', dataKey: 'deskripsi', width: 30 },
          { header: 'Akun', dataKey: 'akun', width: 12 },
          { header: 'Pemasukan', dataKey: 'pemasukan', width: 15 },
          { header: 'Pengeluaran', dataKey: 'pengeluaran', width: 15 },
          { header: 'Saldo', dataKey: 'saldo', width: 15 },
          { header: 'User', dataKey: 'user', width: 10 },
          { header: 'Status', dataKey: 'status', width: 10 }
        ]
      };

      const monthlySheet = {
        name: 'Per Bulan',
        data: data.breakdown,
        columns: [
          { header: 'Bulan', dataKey: 'bulan', width: 15 },
          { header: 'Pemasukan', dataKey: 'pemasukan', width: 20 },
          { header: 'Pengeluaran', dataKey: 'pengeluaran', width: 20 },
          { header: 'Saldo', dataKey: 'saldo', width: 20 }
        ]
      };

      return [summarySheet, transactionSheet, monthlySheet];
    } else {
      // Fallback to monthly breakdown only
      const monthlySheet = {
        name: 'Per Bulan',
        data: data.breakdown,
        columns: [
          { header: 'Bulan', dataKey: 'bulan', width: 15 },
          { header: 'Pemasukan', dataKey: 'pemasukan', width: 20 },
          { header: 'Pengeluaran', dataKey: 'pengeluaran', width: 20 },
          { header: 'Saldo', dataKey: 'saldo', width: 20 }
        ]
      };

      return [summarySheet, monthlySheet];
    }
  }

  // Common utility methods
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
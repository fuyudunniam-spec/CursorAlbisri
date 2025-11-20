export interface PeriodFilter {
  start: Date;
  end: Date;
}

export interface CashFlowData {
  saldoAwal: number;
  totalPemasukan: number;
  totalPengeluaran: number;
  saldoAkhir: number;
  breakdown: {
    bulan: string;
    pemasukan: number;
    pengeluaran: number;
    saldo: number;
  }[];
  transactions?: Array<{
    id: string;
    tanggal: Date;
    kode: string;
    jenis: string;
    kategori: string;
    deskripsi: string;
    akun: string;
    pemasukan: number;
    pengeluaran: number;
    saldo: number;
    user: string;
    status: string;
  }>;
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
  breakdown: Array<{
    jenis: string;
    nominal: number;
  }>;
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

// Legacy types for backward compatibility
export interface CategoryData {
  kategori: string;
  nominal: number;
  persentase: number;
  breakdown: {
    subkategori: string;
    nominal: number;
  }[];
}

export interface SantriData {
  id: string;
  nisn: string;
  nama: string;
  kategori: string;
  totalBantuan: number;
  breakdown: {
    jenisBantuan: string;
    nominal: number;
  }[];
}

export interface AuditData {
  id: string;
  tanggal: Date;
  user: string;
  akunKas: string;
  jenis: string;
  nominal: number;
  status: 'posted' | 'draft';
}
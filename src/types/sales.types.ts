export interface SalesTransaction {
  id: string;
  item_id: string;
  nama_barang: string;
  kategori: string;
  jumlah: number;
  harga_dasar: number;
  sumbangan: number;
  harga_satuan: number; // calculated: (harga_dasar * jumlah + sumbangan) / jumlah
  total_nilai: number; // harga_dasar * jumlah + sumbangan
  pembeli: string;
  tanggal: string;
  catatan?: string;
  keuangan_id?: string;
  created_at: string;
}

export interface SalesFormData {
  item_id: string;
  jumlah: number;
  harga_dasar: number;
  sumbangan: number;
  pembeli: string;
  tanggal: string;
  catatan?: string;
}

export interface SalesStats {
  totalPenjualan: number;
  totalTransaksi: number;
  totalJumlah: number;
  rataRataPenjualan: number;
  kategoriSummary: Record<string, { total: number; jumlah: number; transaksi: number }>;
  itemSummary: Array<{ nama: string; total: number; jumlah: number; transaksi: number; item_id: string }>;
}

export interface SalesFilters {
  startDate?: string;
  endDate?: string;
  kategori?: string;
  item_id?: string;
  pembeli?: string;
}

export interface PriceBreakdown {
  hargaDasar: number;
  sumbangan: number;
  total: number;
  hargaSatuan: number;
}

export interface SalesSummary {
  totalPenjualan: number;
  totalTransaksi: number;
  totalJumlah: number;
  rataRataPenjualan: number;
  kategoriSummary: Record<string, { total: number; jumlah: number; transaksi: number }>;
  itemSummary: Array<{ nama: string; total: number; jumlah: number; transaksi: number; item_id: string }>;
}

export interface SalesChartData {
  labels: string[];
  datasets: Array<{
    label: string;
    data: number[];
    backgroundColor?: string;
    borderColor?: string;
  }>;
}

export interface SalesExportData {
  tanggal: string;
  nama_barang: string;
  kategori: string;
  jumlah: number;
  harga_dasar: number;
  sumbangan: number;
  total_nilai: number;
  pembeli: string;
  catatan?: string;
}

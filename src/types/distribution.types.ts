export interface DistributionTransaction {
  id: string;
  item_id: string;
  nama_barang: string;
  kategori: string;
  jumlah: number;
  penerima: string;
  penerima_santri_id?: string;
  tanggal: string;
  catatan?: string;
  created_at: string;
}

export interface DistributionFormData {
  item_id: string;
  jumlah: number;
  penerima: string;
  penerima_santri_id?: string;
  tanggal: string;
  catatan?: string;
}

export interface MassDistributionData {
  item_id: string;
  distributions: Array<{
    penerima: string;
    penerima_santri_id?: string;
    jumlah: number;
    catatan?: string;
  }>;
  tanggal: string;
}

export interface DistributionStats {
  totalDistribusi: number;
  totalTransaksi: number;
  totalJumlah: number;
  penerimaSummary: Record<string, { total: number; transaksi: number }>;
  itemSummary: Record<string, { total: number; transaksi: number; item_id: string }>;
}

export interface DistributionFilters {
  startDate?: string;
  endDate?: string;
  item_id?: string;
  penerima?: string;
  penerima_santri_id?: string;
}

export interface SantriOption {
  id: string;
  nama_lengkap: string;
  id_santri: string;
  kelas?: string;
  program?: string;
}

export interface RecipientOption {
  value: string;
  label: string;
  type: 'santri' | 'unit' | 'kelas';
  santri_id?: string;
}

export interface MassDistributionFormData {
  item_id: string;
  tanggal: string;
  distributions: Array<{
    penerima: string;
    penerima_santri_id?: string;
    jumlah: number;
    catatan?: string;
  }>;
}

export interface DistributionExportData {
  tanggal: string;
  nama_barang: string;
  kategori: string;
  jumlah: number;
  penerima: string;
  penerima_santri_id?: string;
  catatan?: string;
}

export interface DistributionChartData {
  labels: string[];
  datasets: Array<{
    label: string;
    data: number[];
    backgroundColor?: string;
    borderColor?: string;
  }>;
}

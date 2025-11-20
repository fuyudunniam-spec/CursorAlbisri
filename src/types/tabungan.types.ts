export interface TabunganSantri {
  id: string;
  santri_id: string;
  tanggal: string;
  jenis: 'Setoran' | 'Penarikan' | 'Reward Prestasi' | 'Reward Akademik' | 'Reward Non-Akademik' | 'Transfer Masuk' | 'Koreksi';
  nominal: number;
  saldo_sebelum: number;
  saldo_sesudah: number;
  referensi_id?: string;
  referensi_tabel?: string;
  referensi_keterangan?: string;
  deskripsi: string;
  catatan?: string;
  petugas_id?: string;
  petugas_nama?: string;
  bukti_file?: string;
  created_at: string;
  created_by?: string;
}

export interface TabunganSantriWithSantri extends TabunganSantri {
  santri: {
    id: string;
    id_santri?: string;
    nama_lengkap: string;
    nisn?: string;
    kelas?: string;
    kategori?: string;
  };
}

export interface SaldoTabunganSantri {
  santri_id: string;
  saldo: number;
  santri: {
    id: string;
    id_santri?: string;
    nama_lengkap: string;
    nisn?: string;
    kelas?: string;
    kategori?: string;
  };
}

export interface SetorTabunganRequest {
  santri_id: string;
  nominal: number;
  deskripsi?: string;
  catatan?: string;
  bukti_file?: string;
  petugas_id?: string;
  petugas_nama?: string;
}

export interface TarikTabunganRequest {
  santri_id: string;
  nominal: number;
  deskripsi?: string;
  catatan?: string;
  bukti_file?: string;
  petugas_id?: string;
  petugas_nama?: string;
}

export interface SetorMassalRequest {
  santri_ids: string[];
  nominal: number;
  deskripsi?: string;
  catatan?: string;
  petugas_id?: string;
  petugas_nama?: string;
}

export interface TarikMassalRequest {
  santri_ids: string[];
  nominal: number;
  deskripsi?: string;
  catatan?: string;
  petugas_id?: string;
  petugas_nama?: string;
}

export interface TarikMassalResult {
  success: string[];
  failed: string[];
  success_count: number;
  failed_count: number;
}

export interface TabunganStats {
  total_saldo: number;
  total_setoran_bulan_ini: number;
  total_penarikan_bulan_ini: number;
  jumlah_santri_aktif: number;
  rata_rata_saldo: number;
}

export interface TabunganFilter {
  santri_id?: string;
  jenis?: string;
  tanggal_mulai?: string;
  tanggal_selesai?: string;
  search?: string;
  limit?: number;
  offset?: number;
}

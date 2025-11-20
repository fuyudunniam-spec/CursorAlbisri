// Santri Types - Consistent naming standard
// All types related to santri management

export type StatusApproval = 'pending' | 'disetujui' | 'ditolak';

export type KategoriSantri = 
  | 'Binaan Mukim' 
  | 'Binaan Non-Mukim' 
  | 'Reguler' 
  | 'Mahasiswa' 
  | 'Santri TPO';

export type StatusSosial = 'Yatim' | 'Piatu' | 'Yatim Piatu' | 'Dhuafa' | 'Lengkap';

export type TipePembayaran = 'Mandiri' | 'Bantuan Yayasan';

export type StatusSantri = 'Aktif' | 'Non-Aktif' | 'Alumni';

export type JenisKelamin = 'Laki-laki' | 'Perempuan';

export type RumpunKelas = 'TPQ' | 'Madin' | 'Tahfidz';

export interface SantriData {
  id?: string;
  nisn?: string; // Renamed from nis
  id_santri?: string; // Auto-generated ID
  
  // Administrasi
  kategori: KategoriSantri;
  angkatan: string;
  tanggal_masuk: string;
  status_santri: StatusSantri;
  tipe_pembayaran: TipePembayaran;
  
  // Approval workflow
  status_approval: StatusApproval;
  approved_at?: string;
  approved_by?: string;
  catatan_approval?: string;
  rejected_at?: string;
  rejected_by?: string;
  catatan_penolakan?: string;
  
  // Personal
  nama_lengkap: string;
  tempat_lahir: string;
  tanggal_lahir: string;
  jenis_kelamin: JenisKelamin;
  agama: string;
  status_sosial: StatusSosial;
  no_whatsapp: string;
  alamat: string;
  foto_profil?: string;
  
  // Additional personal info
  nik: string; // Made required
  nomor_kk?: string;
  dusun?: string;
  desa_kelurahan?: string;
  kecamatan?: string;
  kabupaten_kota?: string;
  provinsi?: string;
  
  // Health info (from santri table)
  golongan_darah?: string;
  riwayat_penyakit?: string;
  pernah_rawat_inap?: boolean;
  keterangan_rawat_inap?: string;
  disabilitas_khusus?: string;
  obat_khusus?: string;
  
  // Additional fields
  kewarganegaraan?: string;
  nama_panggilan?: string;
  ukuran_seragam?: string;
  // warna_seragam removed
  kelas_internal?: string;
  program_spp?: boolean;
  program_bantuan?: boolean;
  kelas_tpq?: string;
  rombel_tpq?: string;
  kelas_madin?: string;
  rombel_madin?: string;
  aktivitas_akademik?: string;
  prestasi?: string;
  
  // Penempatan kelas sederhana
  rumpun_kelas?: RumpunKelas;
  nama_kelas?: string;
  
  // Additional for Binaan
  anak_ke?: number; // Anak ke-
  jumlah_saudara?: number;
  hobi?: string; // Optional for all categories
  cita_cita?: string; // Optional for all categories
  
  // School info (for Binaan Mukim after approval)
  jenjang_sekolah?: string; // Jenjang sekolah formal (SD, SMP, SMA, SMK, MA)
  nama_sekolah?: string; // Nama sekolah formal
  alamat_sekolah?: string; // Alamat sekolah formal
  kelas_sekolah?: string; // Kelas di sekolah formal
  nomor_wali_kelas?: string; // Nomor WhatsApp wali kelas
  
  // Timestamps
  created_at?: string;
  updated_at?: string;
}

export interface WaliData {
  id?: string;
  santri_id?: string;
  nama_lengkap: string;
  hubungan_keluarga: string;
  no_whatsapp: string;
  alamat: string;
  pekerjaan?: string;
  penghasilan_bulanan?: number;
  is_utama: boolean;
}

export interface ProgramData {
  id?: string;
  santri_id?: string;
  program_id?: string;
  nama_program: string;
  kelas_program: string;
  rombel?: string;
}

export interface RiwayatPendidikan {
  id?: string;
  santri_id?: string;
  jenjang: string;
  nama_sekolah: string;
  tahun_masuk?: string;
  tahun_lulus?: string;
  nilai_rata_rata?: number;
  prestasi?: string;
  created_at?: string;
  updated_at?: string;
}

export interface KondisiKesehatan {
  id?: string;
  santri_id?: string;
  golongan_darah?: string;
  tinggi_badan?: number;
  berat_badan?: number;
  riwayat_penyakit?: string;
  alergi?: string;
  kondisi_khusus?: string;
  // kontak_darurat fields removed - redundant with wali data
  created_at?: string;
  updated_at?: string;
}

export interface DokumenData {
  id?: string;
  jenis_dokumen: string;
  label?: string;
  required?: boolean;
  file?: File;
  uploaded?: boolean;
  status_verifikasi?: string;
  nama_file?: string;
  path_file?: string;
}

// For approval workflow
export interface ApprovalSantriData extends SantriData {
  wali?: WaliData[];
  dokumen_count?: {
    total: number;
    verified: number;
    pending: number;
  };
  bantuan_auto?: {
    template_id: string;
    template_name: string;
    bundling: any;
    total_nominal: number;
  };
}

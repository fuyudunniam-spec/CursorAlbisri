/**
 * ============================================
 * SANTRI CONSTANTS
 * ============================================
 * 
 * Centralized constants untuk dropdown options, validation rules, dll.
 * SINGLE SOURCE OF TRUTH untuk semua hardcoded values.
 * 
 * @version 1.0
 * @date 2025-01-10
 */

import { 
  SANTRI_KATEGORI, 
  SANTRI_STATUS, 
  STATUS_KELUARGA,
  TIPE_PEMBAYARAN,
  JENIS_KELAMIN,
  AGAMA
} from '@/types/santri.types';

// ============================================
// DROPDOWN OPTIONS
// ============================================

export const KATEGORI_OPTIONS = [
  {
    value: 'Santri Binaan Mukim',
    label: 'Santri Binaan Mukim',
    description: 'Santri binaan yang tinggal di pesantren dengan subsidi penuh/sebagian',
    icon: 'Home',
    default_tipe_pembayaran: 'Subsidi Penuh',
  },
  {
    value: 'Santri Binaan Non-Mukim',
    label: 'Santri Binaan Non-Mukim',
    description: 'Santri binaan yang tidak tinggal di pesantren (TPQ/Madin dengan bantuan yayasan)',
    icon: 'School',
    default_tipe_pembayaran: 'Subsidi Sebagian',
  },
  {
    value: 'Mahasantri Reguler',
    label: 'Mahasantri Reguler',
    description: 'Mahasiswa jalur reguler (berbayar)',
    icon: 'GraduationCap',
    default_tipe_pembayaran: 'Bayar Sendiri',
  },
  {
    value: 'Mahasantri Bantuan',
    label: 'Mahasantri Bantuan',
    description: 'Mahasiswa penerima bantuan yayasan',
    icon: 'Award',
    default_tipe_pembayaran: 'Bantuan Yayasan',
  },
  {
    value: 'Santri TPQ',
    label: 'Santri TPQ',
    description: 'Program TPQ untuk anak-anak (berbayar)',
    icon: 'BookOpen',
    default_tipe_pembayaran: 'Bayar Sendiri',
  },
  {
    value: 'Santri Madin',
    label: 'Santri Madin',
    description: 'Program Madrasah Diniyah (berbayar)',
    icon: 'Book',
    default_tipe_pembayaran: 'Bayar Sendiri',
  },
] as const;

export const STATUS_OPTIONS = SANTRI_STATUS.map(status => ({
  value: status,
  label: status,
}));

export const STATUS_KELUARGA_OPTIONS = [
  {
    value: 'Yatim',
    label: 'Yatim (Ayah meninggal)',
    requires_docs: ['Akta Kematian Ayah'],
  },
  {
    value: 'Piatu',
    label: 'Piatu (Ibu meninggal)',
    requires_docs: ['Akta Kematian Ibu'],
  },
  {
    value: 'Yatim Piatu',
    label: 'Yatim Piatu (Kedua orang tua meninggal)',
    requires_docs: ['Akta Kematian Ayah', 'Akta Kematian Ibu'],
  },
  {
    value: 'Dhuafa',
    label: 'Dhuafa (Keluarga Prasejahtera)',
    requires_docs: ['SKTM'],
  },
  {
    value: 'Utuh',
    label: 'Utuh (Kedua orang tua lengkap)',
    requires_docs: [],
  },
  {
    value: 'Lengkap',
    label: 'Lengkap',
    requires_docs: [],
  },
] as const;

export const TIPE_PEMBAYARAN_OPTIONS = TIPE_PEMBAYARAN.map(tipe => ({
  value: tipe,
  label: tipe,
}));

export const JENIS_KELAMIN_OPTIONS = JENIS_KELAMIN.map(jk => ({
  value: jk,
  label: jk,
}));

export const AGAMA_OPTIONS = AGAMA.map(agama => ({
  value: agama,
  label: agama,
}));

export const HUBUNGAN_KELUARGA_OPTIONS = [
  'Ayah',
  'Ibu',
  'Kakek',
  'Nenek',
  'Paman',
  'Bibi',
  'Kakak',
  'Adik',
  'Saudara',
  'Wali',
  'Lainnya',
] as const;

export const GOLONGAN_DARAH_OPTIONS = [
  'A',
  'B',
  'AB',
  'O',
  'A+',
  'A-',
  'B+',
  'B-',
  'AB+',
  'AB-',
  'O+',
  'O-',
  'Tidak Tahu',
] as const;

export const PENDIDIKAN_OPTIONS = [
  'Tidak Sekolah',
  'SD',
  'SMP',
  'SMA/SMK',
  'D1',
  'D2',
  'D3',
  'S1',
  'S2',
  'S3',
  'Lainnya',
] as const;

export const PEKERJAAN_OPTIONS = [
  'Tidak Bekerja',
  'Ibu Rumah Tangga',
  'Petani',
  'Buruh',
  'Pedagang',
  'Wiraswasta',
  'PNS',
  'TNI/Polri',
  'Guru',
  'Dosen',
  'Dokter',
  'Perawat',
  'Karyawan Swasta',
  'Lainnya',
] as const;

export const PENGHASILAN_OPTIONS = [
  'Tidak Berpenghasilan',
  'Kurang dari Rp 500.000',
  'Rp 500.000 - Rp 1.000.000',
  'Rp 1.000.000 - Rp 2.000.000',
  'Rp 2.000.000 - Rp 3.000.000',
  'Rp 3.000.000 - Rp 5.000.000',
  'Rp 5.000.000 - Rp 10.000.000',
  'Lebih dari Rp 10.000.000',
] as const;

export const UKURAN_SERAGAM_OPTIONS = [
  'XS',
  'S',
  'M',
  'L',
  'XL',
  'XXL',
  'XXXL',
] as const;

// ============================================
// DOKUMEN TYPES
// ============================================

export const JENIS_DOKUMEN = [
  'KTP',
  'KTP Santri',
  'KTP Wali',
  'KTP Ayah',
  'KTP Ibu',
  'KTP Kakek',
  'KTP Nenek',
  'KK',
  'Kartu Keluarga',
  'Akta Lahir',
  'Akta Kelahiran',
  'Akta Kematian Ayah',
  'Akta Kematian Ibu',
  'SKTM',
  'Surat Domisili',
  'Surat Keterangan Sehat',
  'Pas Foto',
  'Ijazah',
  'Transkrip Nilai',
  'Surat Rekomendasi',
  'Dokumen Lainnya',
] as const;

export const KATEGORI_DOKUMEN = [
  'Identitas',
  'Pendidikan',
  'Kesehatan',
  'Keluarga',
  'Keterangan',
  'Lainnya',
] as const;

export const STATUS_DOKUMEN = [
  'Ada',
  'Tidak Ada',
  'Dalam Proses',
  'Belum Diverifikasi',
  'Diverifikasi',
  'Ditolak',
  'Kadaluarsa',
] as const;

// ============================================
// VALIDATION RULES
// ============================================

export const VALIDATION_RULES = {
  nik: {
    length: 16,
    pattern: /^\d{16}$/,
    message: 'NIK harus 16 digit angka',
  },
  nomor_kk: {
    length: 16,
    pattern: /^\d{16}$/,
    message: 'Nomor KK harus 16 digit angka',
  },
  no_whatsapp: {
    pattern: /^(\+62|62|0)[0-9]{9,13}$/,
    message: 'Format: 08xxxxxxxxxx atau +628xxxxxxxxxx',
  },
  email: {
    pattern: /^[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}$/,
    message: 'Format email tidak valid',
  },
  nama_lengkap: {
    minLength: 3,
    maxLength: 200,
    message: 'Nama lengkap minimal 3 karakter',
  },
  angkatan: {
    pattern: /^\d{4}$/,
    message: 'Format angkatan: YYYY (contoh: 2024)',
  },
} as const;

// ============================================
// UPLOAD LIMITS
// ============================================

export const UPLOAD_LIMITS = {
  foto_profil: {
    maxSize: 2 * 1024 * 1024, // 2MB
    allowedTypes: ['image/jpeg', 'image/jpg', 'image/png'],
    message: 'Foto profil maksimal 2MB (JPG/PNG)',
  },
  dokumen: {
    maxSize: 5 * 1024 * 1024, // 5MB
    allowedTypes: [
      'image/jpeg',
      'image/jpg',
      'image/png',
      'application/pdf',
      'application/msword',
      'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    ],
    message: 'Dokumen maksimal 5MB (PDF/JPG/PNG/DOC/DOCX)',
  },
} as const;

// ============================================
// COLOR SCHEMES (for badges, cards, etc)
// ============================================

export const STATUS_COLORS = {
  Aktif: 'bg-green-100 text-green-800 border-green-200',
  'Non-Aktif': 'bg-red-100 text-red-800 border-red-200',
  Alumni: 'bg-blue-100 text-blue-800 border-blue-200',
  Cuti: 'bg-yellow-100 text-yellow-800 border-yellow-200',
  DO: 'bg-gray-100 text-gray-800 border-gray-200',
  Pindah: 'bg-purple-100 text-purple-800 border-purple-200',
} as const;

export const KATEGORI_COLORS = {
  'Santri Binaan Mukim': 'bg-blue-100 text-blue-800 border-blue-200',
  'Santri Binaan Non-Mukim': 'bg-green-100 text-green-800 border-green-200',
  'Mahasantri Reguler': 'bg-purple-100 text-purple-800 border-purple-200',
  'Mahasantri Bantuan': 'bg-orange-100 text-orange-800 border-orange-200',
  'Santri TPQ': 'bg-pink-100 text-pink-800 border-pink-200',
  'Santri Madin': 'bg-indigo-100 text-indigo-800 border-indigo-200',
} as const;

// ============================================
// HELPER FUNCTIONS
// ============================================

/**
 * Get status badge color
 */
export const getStatusColor = (status: string): string => {
  return STATUS_COLORS[status as keyof typeof STATUS_COLORS] || 'bg-gray-100 text-gray-800 border-gray-200';
};

/**
 * Get kategori badge color
 */
export const getKategoriColor = (kategori: string): string => {
  return KATEGORI_COLORS[kategori as keyof typeof KATEGORI_COLORS] || 'bg-gray-100 text-gray-800 border-gray-200';
};

/**
 * Get default tipe pembayaran for kategori
 */
export const getDefaultTipePembayaran = (kategori: string): string => {
  const option = KATEGORI_OPTIONS.find(opt => opt.value === kategori);
  return option?.default_tipe_pembayaran || 'Bayar Sendiri';
};

/**
 * Get required documents for status keluarga
 */
export const getRequiredDocsForStatusKeluarga = (status_anak: string): string[] => {
  const option = STATUS_KELUARGA_OPTIONS.find(opt => opt.value === status_anak);
  return option?.requires_docs || [];
};


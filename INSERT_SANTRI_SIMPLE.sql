-- INSERT SANTRI SEDERHANA
-- Jalankan di Supabase SQL Editor

-- Insert santri
INSERT INTO santri (
  nis, nama_lengkap, tempat_lahir, tanggal_lahir, jenis_kelamin, 
  agama, status_anak, no_whatsapp, alamat, kategori, 
  angkatan, tanggal_masuk, status_santri, tipe_pembayaran
)
VALUES (
  'NIS2501001', 'Zabadi', 'Jakarta', '2010-05-15', 'Laki-laki', 
  'Islam', 'Anak Kandung', '+6281234567890', 'Jl. Merdeka No. 123, Jakarta Pusat', 'Santri Reguler', 
  '2025', '2025-01-01', 'Aktif', 'Bayar Sendiri'
)
ON CONFLICT (nis) DO NOTHING;

-- Insert wali
INSERT INTO santri_wali (santri_id, nama_lengkap, hubungan_keluarga, no_whatsapp, is_utama)
SELECT s.id, 'Budi Santoso', 'Ayah', '+6281234567892', true
FROM santri s WHERE s.nis = 'NIS2501001'
ON CONFLICT DO NOTHING;

-- Insert program (dengan nama_program yang benar)
INSERT INTO santri_programs (santri_id, nama_program, kelas_program, rombel)
SELECT s.id, 'TPQ Reguler', 'Kelas 1', 'A'
FROM santri s WHERE s.nis = 'NIS2501001'
ON CONFLICT DO NOTHING;

-- Verify all data
SELECT 
  s.nama_lengkap,
  s.kategori,
  sw.nama_lengkap as wali_nama,
  sp.nama_program,
  sp.kelas_program
FROM santri s
LEFT JOIN santri_wali sw ON s.id = sw.santri_id AND sw.is_utama = true
LEFT JOIN santri_programs sp ON s.id = sp.santri_id
WHERE s.nis = 'NIS2501001';

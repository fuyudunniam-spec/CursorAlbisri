-- Insert sample data untuk testing modul inventaris
-- Jalankan script ini di Supabase SQL Editor

-- 1. Insert sample inventaris items
INSERT INTO inventaris (
  nama_barang, 
  kategori, 
  kondisi, 
  tipe_item, 
  zona, 
  lokasi, 
  jumlah_awal, 
  min_stock, 
  harga_satuan, 
  tanggal_masuk, 
  tanggal_kadaluarsa,
  keterangan
) VALUES 
-- Barang makanan
('Beras Premium 5kg', 'Makanan', 'Baik', 'Komoditas', 'Gedung Putra', 'Gudang A', 50, 10, 45000, '2024-01-15', '2025-01-15', 'Beras premium untuk konsumsi santri'),
('Minyak Goreng 1L', 'Makanan', 'Baik', 'Komoditas', 'Gedung Putra', 'Gudang A', 30, 5, 15000, '2024-01-20', '2025-01-20', 'Minyak goreng untuk dapur'),
('Gula Pasir 1kg', 'Makanan', 'Baik', 'Komoditas', 'Gedung Putra', 'Gudang A', 25, 8, 12000, '2024-01-18', '2025-01-18', 'Gula untuk konsumsi harian'),

-- Barang kebersihan
('Sabun Mandi 100g', 'Kebersihan', 'Baik', 'Komoditas', 'Gedung Putra', 'Gudang B', 100, 20, 5000, '2024-01-10', '2026-01-10', 'Sabun mandi untuk santri'),
('Shampoo 400ml', 'Kebersihan', 'Baik', 'Komoditas', 'Gedung Putri', 'Gudang C', 80, 15, 25000, '2024-01-12', '2026-01-12', 'Shampoo untuk santri putri'),
('Pasta Gigi 150g', 'Kebersihan', 'Baik', 'Komoditas', 'Gedung Putra', 'Gudang B', 60, 10, 8000, '2024-01-14', '2026-01-14', 'Pasta gigi untuk santri'),

-- Barang pendidikan
('Buku Tulis 38 Lembar', 'Pendidikan', 'Baik', 'Aset', 'Gedung Putra', 'Ruang Kelas', 200, 50, 3000, '2024-01-05', NULL, 'Buku tulis untuk pembelajaran'),
('Pulpen Hitam', 'Pendidikan', 'Baik', 'Aset', 'Gedung Putra', 'Ruang Kelas', 150, 30, 2000, '2024-01-08', NULL, 'Pulpen untuk menulis'),
('Pensil 2B', 'Pendidikan', 'Baik', 'Aset', 'Gedung Putri', 'Ruang Kelas', 120, 25, 1500, '2024-01-09', NULL, 'Pensil untuk menggambar'),

-- Barang kesehatan
('Paracetamol 500mg', 'Kesehatan', 'Baik', 'Komoditas', 'Klinik', 'Lemari Obat', 50, 10, 500, '2024-01-16', '2025-01-16', 'Obat penurun demam'),
('Betadine 60ml', 'Kesehatan', 'Baik', 'Komoditas', 'Klinik', 'Lemari Obat', 20, 5, 15000, '2024-01-17', '2025-01-17', 'Antiseptik untuk luka'),
('Kapas 100gr', 'Kesehatan', 'Baik', 'Komoditas', 'Klinik', 'Lemari Obat', 30, 8, 8000, '2024-01-19', '2026-01-19', 'Kapas untuk perawatan'),

-- Barang elektronik
('Laptop Lenovo ThinkPad', 'Elektronik', 'Baik', 'Aset', 'Gedung Putra', 'Ruang Admin', 5, 1, 8000000, '2024-01-01', NULL, 'Laptop untuk administrasi'),
('Printer HP LaserJet', 'Elektronik', 'Baik', 'Aset', 'Gedung Putra', 'Ruang Admin', 2, 1, 2500000, '2024-01-02', NULL, 'Printer untuk dokumen'),
('Kalkulator Scientific', 'Elektronik', 'Baik', 'Aset', 'Gedung Putra', 'Ruang Kelas', 20, 5, 150000, '2024-01-03', NULL, 'Kalkulator untuk matematika'),

-- Barang dengan stok rendah (untuk testing alerts)
('Tissue 200 Lembar', 'Kebersihan', 'Baik', 'Komoditas', 'Gedung Putra', 'Gudang B', 3, 10, 12000, '2024-01-11', '2025-01-11', 'Tissue untuk kebersihan'),
('Detergen 1kg', 'Kebersihan', 'Baik', 'Komoditas', 'Gedung Putri', 'Gudang C', 2, 8, 18000, '2024-01-13', '2025-01-13', 'Detergen untuk cucian'),

-- Barang mendekati kadaluarsa (untuk testing alerts)
('Susu UHT 1L', 'Makanan', 'Baik', 'Komoditas', 'Gedung Putra', 'Gudang A', 15, 5, 12000, '2024-01-25', '2024-02-15', 'Susu UHT untuk sarapan'),
('Roti Tawar', 'Makanan', 'Baik', 'Komoditas', 'Gedung Putra', 'Gudang A', 8, 3, 8000, '2024-01-28', '2024-02-05', 'Roti untuk sarapan');

-- 2. Insert sample transaksi untuk testing
INSERT INTO transaksi_inventaris (
  inventaris_id,
  tipe,
  jumlah,
  harga_satuan,
  total_harga,
  penerima,
  catatan,
  tanggal_transaksi
) VALUES 
-- Transaksi masuk
(1, 'Masuk', 50, 45000, 2250000, 'Admin Gudang', 'Pembelian awal beras premium', '2024-01-15'),
(2, 'Masuk', 30, 15000, 450000, 'Admin Gudang', 'Pembelian minyak goreng', '2024-01-20'),
(3, 'Masuk', 25, 12000, 300000, 'Admin Gudang', 'Pembelian gula pasir', '2024-01-18'),
(4, 'Masuk', 100, 5000, 500000, 'Admin Gudang', 'Pembelian sabun mandi', '2024-01-10'),
(5, 'Masuk', 80, 25000, 2000000, 'Admin Gudang', 'Pembelian shampoo', '2024-01-12'),
(6, 'Masuk', 60, 8000, 480000, 'Admin Gudang', 'Pembelian pasta gigi', '2024-01-14'),
(7, 'Masuk', 200, 3000, 600000, 'Admin Gudang', 'Pembelian buku tulis', '2024-01-05'),
(8, 'Masuk', 150, 2000, 300000, 'Admin Gudang', 'Pembelian pulpen', '2024-01-08'),
(9, 'Masuk', 120, 1500, 180000, 'Admin Gudang', 'Pembelian pensil', '2024-01-09'),
(10, 'Masuk', 50, 500, 25000, 'Admin Gudang', 'Pembelian paracetamol', '2024-01-16'),
(11, 'Masuk', 20, 15000, 300000, 'Admin Gudang', 'Pembelian betadine', '2024-01-17'),
(12, 'Masuk', 30, 8000, 240000, 'Admin Gudang', 'Pembelian kapas', '2024-01-19'),
(13, 'Masuk', 5, 8000000, 40000000, 'Admin Gudang', 'Pembelian laptop', '2024-01-01'),
(14, 'Masuk', 2, 2500000, 5000000, 'Admin Gudang', 'Pembelian printer', '2024-01-02'),
(15, 'Masuk', 20, 150000, 3000000, 'Admin Gudang', 'Pembelian kalkulator', '2024-01-03'),
(16, 'Masuk', 3, 12000, 36000, 'Admin Gudang', 'Pembelian tissue', '2024-01-11'),
(17, 'Masuk', 2, 18000, 36000, 'Admin Gudang', 'Pembelian detergen', '2024-01-13'),
(18, 'Masuk', 15, 12000, 180000, 'Admin Gudang', 'Pembelian susu UHT', '2024-01-25'),
(19, 'Masuk', 8, 8000, 64000, 'Admin Gudang', 'Pembelian roti tawar', '2024-01-28'),

-- Transaksi keluar (konsumsi harian)
(1, 'Keluar', 5, 45000, 225000, 'Santri A', 'Konsumsi harian', '2024-01-20'),
(1, 'Keluar', 3, 45000, 135000, 'Santri B', 'Konsumsi harian', '2024-01-22'),
(2, 'Keluar', 2, 15000, 30000, 'Dapur', 'Konsumsi harian', '2024-01-21'),
(3, 'Keluar', 1, 12000, 12000, 'Dapur', 'Konsumsi harian', '2024-01-23'),
(4, 'Keluar', 10, 5000, 50000, 'Santri C', 'Konsumsi harian', '2024-01-25'),
(5, 'Keluar', 5, 25000, 125000, 'Santri D', 'Konsumsi harian', '2024-01-26'),
(6, 'Keluar', 3, 8000, 24000, 'Santri E', 'Konsumsi harian', '2024-01-27'),
(7, 'Keluar', 20, 3000, 60000, 'Kelas A', 'Konsumsi harian', '2024-01-28'),
(8, 'Keluar', 15, 2000, 30000, 'Kelas B', 'Konsumsi harian', '2024-01-29'),
(9, 'Keluar', 10, 1500, 15000, 'Kelas C', 'Konsumsi harian', '2024-01-30');

-- 3. Update total_harga untuk semua transaksi
UPDATE transaksi_inventaris 
SET total_harga = jumlah * harga_satuan 
WHERE total_harga IS NULL OR total_harga = 0;

-- 4. Verifikasi data
SELECT 
  'Inventaris Items' as table_name,
  COUNT(*) as total_records
FROM inventaris
UNION ALL
SELECT 
  'Transaksi Records' as table_name,
  COUNT(*) as total_records
FROM transaksi_inventaris
UNION ALL
SELECT 
  'Total Nilai Inventaris' as table_name,
  SUM(jumlah_awal * harga_satuan) as total_records
FROM inventaris;

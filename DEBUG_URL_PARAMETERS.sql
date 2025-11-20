-- DEBUG URL PARAMETERS ISSUE
-- Data santri sudah ada, sekarang check ID yang tepat

-- 1. Get exact ID untuk Ahmad Zabadi
SELECT 
  id,
  nis,
  nama_lengkap,
  kategori,
  status_santri
FROM santri 
WHERE nis = 'NIS2501001'
  OR nama_lengkap ILIKE '%Ahmad Zabadi%'
  OR nama_lengkap ILIKE '%Zabadi%';

-- 2. Test dengan ID yang didapat
-- Copy ID dari hasil query di atas, lalu test URL:
-- http://localhost:8080/santri-profile?santriId=[ID_HERE]&santriName=Ahmad%20Zabadi

-- 3. Check apakah ada data wali dan program
SELECT 
  s.id as santri_id,
  s.nis,
  s.nama_lengkap as santri_nama,
  sw.nama_lengkap as wali_nama,
  sp.nama_program,
  sp.kelas_program
FROM santri s
LEFT JOIN santri_wali sw ON s.id = sw.santri_id AND sw.is_utama = true
LEFT JOIN santri_programs sp ON s.id = sp.santri_id
WHERE s.nis = 'NIS2501001';

-- 4. Check program beasiswa juga
SELECT 
  id,
  nama_program,
  jenis,
  status
FROM program_beasiswa 
WHERE status = 'aktif';

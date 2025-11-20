-- Script untuk menambahkan data santri Pesantren Anak Yatim Al-Bisri
-- Data akan diinsert ke tabel santri dan santri_wali
-- Dokumen dan kelengkapan lainnya akan diedit manual

-- 1. MOH NASSA FIOI KAUTSAR (NASA)
INSERT INTO public.santri (
  nama_lengkap, jenis_kelamin, tempat_lahir, tanggal_lahir, 
  alamat, no_whatsapp, nik, kategori, tipe_pembayaran, 
  status_approval, created_at, updated_at
) VALUES (
  'MOH NASSA FIOI KAUTSAR', 'Laki-laki', 'LAMONGAN', '2010-12-06',
  'Waru Lor 004/003, Paciran, LAMONGAN', '6283133055205', '3524140812100002', 
  'Reguler', 'Mandiri', 'disetujui', NOW(), NOW()
) RETURNING id;

-- 2. IVANA FAUZUN NAJAH (VANA)
INSERT INTO public.santri (
  nama_lengkap, jenis_kelamin, tempat_lahir, tanggal_lahir, 
  alamat, no_whatsapp, nik, kategori, tipe_pembayaran, 
  status_approval, status_sosial, nama_sekolah, tahun_lulus,
  created_at, updated_at
) VALUES (
  'IVANA FAUZUN NAJAH', 'Perempuan', 'LAMONGAN', '2008-01-16',
  'Kel. Weru, RT/RW: 003/003, Kec. Paciran, Kab. Lamongan', '087757432430', '3524145601080007',
  'Binaan Non-Mukim', 'Beasiswa', 'disetujui', 'Dhuafa', 'SMP AL ISLAH SURABAYA', '2021',
  NOW(), NOW()
) RETURNING id;

-- 3. GANDARI FEBYANA SYARASWATI (FEBY)
INSERT INTO public.santri (
  nama_lengkap, jenis_kelamin, tempat_lahir, tanggal_lahir, 
  alamat, no_whatsapp, nik, kategori, tipe_pembayaran, 
  status_approval, status_sosial, nama_sekolah, tahun_lulus,
  created_at, updated_at
) VALUES (
  'GANDARI FEBYANA SYARASWATI', 'Perempuan', 'JAKARTA', '2007-02-17',
  'Tarik, Tunggul, Gondang, SRAGEN', '082140392304', '3314065702070001',
  'Binaan Non-Mukim', 'Beasiswa', 'disetujui', 'Piatu', 'SMP PESANTREN TEMULUS', '2022',
  NOW(), NOW()
) RETURNING id;

-- 4. FIRZA PUTRI (PUTRI)
INSERT INTO public.santri (
  nama_lengkap, jenis_kelamin, tempat_lahir, tanggal_lahir, 
  alamat, no_whatsapp, nik, kategori, tipe_pembayaran, 
  status_approval, status_sosial, nama_sekolah, tahun_lulus,
  created_at, updated_at
) VALUES (
  'FIRZA PUTRI', 'Perempuan', 'Lamongan', '2008-06-27',
  'Sidokumpul Paciran Lamongan RT 09 RW 03', '085607806056', '3524146706080004',
  'Binaan Non-Mukim', 'Beasiswa', 'disetujui', 'Piatu', 'SMP AL ISLAH SURABAYA', '2023',
  NOW(), NOW()
) RETURNING id;

-- 5. DELIA PUSPITASARI (DELLA)
INSERT INTO public.santri (
  nama_lengkap, jenis_kelamin, tempat_lahir, tanggal_lahir, 
  alamat, no_whatsapp, nik, kategori, tipe_pembayaran, 
  status_approval, status_sosial, nama_sekolah, tahun_lulus,
  created_at, updated_at
) VALUES (
  'DELIA PUSPITASARI', 'Perempuan', 'Kuningan, Jawa Barat', '2010-12-28',
  'Dusun Kliwon RT 004 RW 002, KUNINGAN', '081572099614', '3208106812090004',
  'Binaan Non-Mukim', 'Beasiswa', 'disetujui', 'Dhuafa', 'SDN 1 GERESIK', '2023',
  NOW(), NOW()
) RETURNING id;

-- 6. NISA RHOUDHOTUL JANNAH (NISA)
INSERT INTO public.santri (
  nama_lengkap, jenis_kelamin, tempat_lahir, tanggal_lahir, 
  alamat, no_whatsapp, nik, kategori, tipe_pembayaran, 
  status_approval, status_sosial, nama_sekolah, tahun_lulus,
  created_at, updated_at
) VALUES (
  'NISA RHOUDHOTUL JANNAH', 'Perempuan', 'SURABAYA', '2011-04-25',
  'Kalibokor, RT RW 005, Pucang Sewu, Gubeng, Surabaya', '085608471668', '3578086504110003',
  'Binaan Non-Mukim', 'Beasiswa', 'disetujui', 'Piatu', 'SDN KERTAJAYA IV/210', '2024',
  NOW(), NOW()
) RETURNING id;

-- 7. LAILATUL FADLLLYAH (ELLA)
INSERT INTO public.santri (
  nama_lengkap, jenis_kelamin, tempat_lahir, tanggal_lahir, 
  alamat, no_whatsapp, nik, kategori, tipe_pembayaran, 
  status_approval, status_sosial, nama_sekolah, tahun_lulus,
  created_at, updated_at
) VALUES (
  'LAILATUL FADLLLYAH', 'Perempuan', 'LAMONGAN', '2011-10-22',
  'Kel Weru, RT/RW 002/005, Kec. Paciran, Kab. Lamongan', '083853741486', '352507961011002',
  'Binaan Non-Mukim', 'Beasiswa', 'disetujui', 'Yatim', 'MI MATHLABUL HUDA', '2024',
  NOW(), NOW()
) RETURNING id;

-- 8. NAZWA PUTRI MEYDINA IKSAN (NAZWA)
INSERT INTO public.santri (
  nama_lengkap, jenis_kelamin, tempat_lahir, tanggal_lahir, 
  alamat, no_whatsapp, nik, kategori, tipe_pembayaran, 
  status_approval, status_sosial, nama_sekolah, tahun_lulus,
  created_at, updated_at
) VALUES (
  'NAZWA PUTRI MEYDINA IKSAN', 'Perempuan', 'SIDOARJO', '2010-05-01',
  'Kalijaten 08/02, Taman, SIDOARJO', '087714063154', '3515134105090004',
  'Binaan Non-Mukim', 'Beasiswa', 'disetujui', 'Dhuafa', 'SDN KALIJATEN', '2023',
  NOW(), NOW()
) RETURNING id;

-- 9. AULIYA WIDIYA SHOLIHAH (AULIYA)
INSERT INTO public.santri (
  nama_lengkap, jenis_kelamin, tempat_lahir, tanggal_lahir, 
  alamat, no_whatsapp, nik, kategori, tipe_pembayaran, 
  status_approval, status_sosial, nama_sekolah, tahun_lulus,
  created_at, updated_at
) VALUES (
  'AULIYA WIDIYA SHOLIHAH', 'Perempuan', 'LAMONGAN', '2008-06-21',
  'Campurejo, GRESIK', '083133055205', '3524146106080003',
  'Binaan Non-Mukim', 'Beasiswa', 'disetujui', 'Yatim Piatu', 'SMP', '2023',
  NOW(), NOW()
) RETURNING id;

-- 10. SYAMIRA NUR SAFIKA BILQIS (BILQIS)
INSERT INTO public.santri (
  nama_lengkap, jenis_kelamin, tempat_lahir, tanggal_lahir, 
  alamat, no_whatsapp, nik, kategori, tipe_pembayaran, 
  status_approval, status_sosial, nama_sekolah, tahun_lulus,
  created_at, updated_at
) VALUES (
  'SYAMIRA NUR SAFIKA BILQIS', 'Perempuan', 'BANGKALAN', '2007-11-12',
  'Dusun Lebak Barat, Kec. Sepuluh, Kab. Bangkalan', '085922372139', '3526085211070001',
  'Binaan Non-Mukim', 'Beasiswa', 'disetujui', 'Dhuafa', 'SMP AL ISLAH SURABAYA', '2023',
  NOW(), NOW()
) RETURNING id;

-- 11. INATIL IZZA (IZZA)
INSERT INTO public.santri (
  nama_lengkap, jenis_kelamin, tempat_lahir, tanggal_lahir, 
  alamat, no_whatsapp, nik, kategori, tipe_pembayaran, 
  status_approval, status_sosial, nama_sekolah, tahun_lulus,
  created_at, updated_at
) VALUES (
  'INATIL IZZA', 'Perempuan', 'BANGKALAN', '2008-12-14',
  'Pulo Wonokromo, RT/RW 001/006, Kel. Wonokromo, Kec. Wonokromo, Kab. Surabaya', '088991970113', '3526135412080002',
  'Binaan Non-Mukim', 'Beasiswa', 'disetujui', 'Yatim', 'MI AL BUKHORI', '2023',
  NOW(), NOW()
) RETURNING id;

-- 12. MUHAMAD WISAM SYAKRONI ZAIDAN PUTRA (ZIDAN)
INSERT INTO public.santri (
  nama_lengkap, jenis_kelamin, tempat_lahir, tanggal_lahir, 
  alamat, no_whatsapp, nik, kategori, tipe_pembayaran, 
  status_approval, status_sosial, nama_sekolah, tahun_lulus,
  created_at, updated_at
) VALUES (
  'MUHAMAD WISAM SYAKRONI ZAIDAN PUTRA', 'Laki-laki', 'BANGKALAN', '2010-06-26',
  'Dsn. Lebak Barat, BANGKALAN', '08999918085', '3526082606100001',
  'Binaan Non-Mukim', 'Beasiswa', 'disetujui', 'Dhuafa', 'SDN SEPULUH 1', '2024',
  NOW(), NOW()
) RETURNING id;

-- 13. ASSYIFA PUTRI AURA DZAKIA (SYIFA)
INSERT INTO public.santri (
  nama_lengkap, jenis_kelamin, tempat_lahir, tanggal_lahir, 
  alamat, no_whatsapp, nik, kategori, tipe_pembayaran, 
  status_approval, status_sosial, nama_sekolah, tahun_lulus,
  created_at, updated_at
) VALUES (
  'ASSYIFA PUTRI AURA DZAKIA', 'Perempuan', 'SEMARANG', '2016-12-14',
  'Kel. Tambakboyo, Kec. Ambarawa, Kab. Semarang, Prov. Jateng', NULL, '3322205412160001',
  'Binaan Non-Mukim', 'Beasiswa', 'disetujui', 'Dhuafa', 'TK AZ-ZAHRA', '2023',
  NOW(), NOW()
) RETURNING id;

-- 14. SEPTA AFRIANI REMILDA (MILDA)
INSERT INTO public.santri (
  nama_lengkap, jenis_kelamin, tempat_lahir, tanggal_lahir, 
  alamat, no_whatsapp, nik, kategori, tipe_pembayaran, 
  status_approval, status_sosial, nama_sekolah, tahun_lulus,
  created_at, updated_at
) VALUES (
  'SEPTA AFRIANI REMILDA', 'Perempuan', 'TRENGGALEK', '2015-09-03',
  'Dusun Gebang, RT/RW 031/010, Kel. Kertosono, Kec. Panggul, Kota Trenggalek', NULL, '350301430915002',
  'Binaan Non-Mukim', 'Beasiswa', 'disetujui', 'Dhuafa', NULL, '2021',
  NOW(), NOW()
) RETURNING id;

-- 15. MUHAMAD FAKI (FAKI)
INSERT INTO public.santri (
  nama_lengkap, jenis_kelamin, tempat_lahir, tanggal_lahir, 
  alamat, no_whatsapp, nik, kategori, tipe_pembayaran, 
  status_approval, status_sosial, nama_sekolah, tahun_lulus,
  created_at, updated_at
) VALUES (
  'MUHAMAD FAKI', 'Laki-laki', 'BANGKALAN', '2007-09-21',
  'Wonokromo Tengah 5/6, Kel. Wonokomo, Kec. Wonokromo, Kab. Surabaya', '081515407685', '3526032109070006',
  'Binaan Non-Mukim', 'Beasiswa', 'disetujui', 'Yatim', 'SMP AL ISLAH SURABAYA', '2023',
  NOW(), NOW()
) RETURNING id;

-- 16. ACHMAD MAULANA (AHMAD)
INSERT INTO public.santri (
  nama_lengkap, jenis_kelamin, tempat_lahir, tanggal_lahir, 
  alamat, no_whatsapp, nik, kategori, tipe_pembayaran, 
  status_approval, status_sosial, nama_sekolah, tahun_lulus,
  created_at, updated_at
) VALUES (
  'ACHMAD MAULANA', 'Laki-laki', 'Surabaya', '2014-04-01',
  'Wonokromo, Gunung anyar lor II, Surabaya', '087749895740', '3578040103140003',
  'Binaan Non-Mukim', 'Beasiswa', 'disetujui', 'Dhuafa', 'Al Furqon', '2020',
  NOW(), NOW()
) RETURNING id;

-- 17. AULIYA UL-LUBABAH (ULUL)
INSERT INTO public.santri (
  nama_lengkap, jenis_kelamin, tempat_lahir, tanggal_lahir, 
  alamat, no_whatsapp, nik, kategori, tipe_pembayaran, 
  status_approval, status_sosial, nama_sekolah, tahun_lulus,
  created_at, updated_at
) VALUES (
  'AULIYA UL-LUBABAH', 'Perempuan', 'ACEH UTARA', '2012-02-15',
  'Warulor RT/RW 001/001, Kel. Warulor, Kec. Paciran, Kab. Lamongan', '082146771987', '1108195502120001',
  'Binaan Non-Mukim', 'Beasiswa', 'disetujui', 'Dhuafa', 'MI. TANWIRUL QULUB YPP', '2024',
  NOW(), NOW()
) RETURNING id;

-- 18. MUHAMAD HAFIDH ASY'ARI (HAFIDH)
INSERT INTO public.santri (
  nama_lengkap, jenis_kelamin, tempat_lahir, tanggal_lahir, 
  alamat, no_whatsapp, nik, kategori, tipe_pembayaran, 
  status_approval, status_sosial, nama_sekolah, tahun_lulus,
  created_at, updated_at
) VALUES (
  'MUHAMAD HAFIDH ASY'ARI', 'Laki-laki', 'MAGETAN', '2009-03-25',
  'Tambakmas RT/RW 007/001, Kec. Sukomoro, Kab. Magetan', '08176870855', '3520092503090001',
  'Binaan Non-Mukim', 'Beasiswa', 'disetujui', 'Dhuafa', 'MTS TANADA', '2025',
  NOW(), NOW()
) RETURNING id;

-- 19. INTAN NUR AINI (INTAN)
INSERT INTO public.santri (
  nama_lengkap, jenis_kelamin, tempat_lahir, tanggal_lahir, 
  alamat, no_whatsapp, nik, kategori, tipe_pembayaran, 
  status_approval, status_sosial, nama_sekolah, tahun_lulus,
  created_at, updated_at
) VALUES (
  'INTAN NUR AINI', 'Perempuan', 'MAGETAN', '2012-07-09',
  'Tambakmas, 007/001, Kec. Sukomoro, Kab. Magetan', '087758139338', '352009490712001',
  'Binaan Non-Mukim', 'Beasiswa', 'disetujui', 'Dhuafa', 'MIS TANADA', '2025',
  NOW(), NOW()
) RETURNING id;

-- 20. MOCHAMAD IRSYAD HAFIZH (IRSYAD)
INSERT INTO public.santri (
  nama_lengkap, jenis_kelamin, tempat_lahir, tanggal_lahir, 
  alamat, no_whatsapp, nik, kategori, tipe_pembayaran, 
  status_approval, status_sosial, nama_sekolah, tahun_lulus,
  created_at, updated_at
) VALUES (
  'MOCHAMAD IRSYAD HAFIZH', 'Perempuan', 'GRESIK', '2010-02-17',
  'PERUMTAS ll Blok L3 No.19, GRESIK', NULL, '357804170210001',
  'Binaan Non-Mukim', 'Beasiswa', 'disetujui', 'Dhuafa', NULL, '2023',
  NOW(), NOW()
) RETURNING id;

-- 21. SHAFAQNAAZ EL HAMZAH (SHANAZ)
INSERT INTO public.santri (
  nama_lengkap, jenis_kelamin, tempat_lahir, tanggal_lahir, 
  alamat, no_whatsapp, nik, kategori, tipe_pembayaran, 
  status_approval, status_sosial, nama_sekolah, tahun_lulus,
  created_at, updated_at
) VALUES (
  'SHAFAQNAAZ EL HAMZAH', 'Perempuan', 'SURABAYA', '2015-11-19',
  'Surabaya, Kel. Wonokromo, Kec. Wonokromo, Kab. Surabaya', NULL, '3578045911150002',
  'Binaan Non-Mukim', 'Beasiswa', 'disetujui', 'Dhuafa', 'TK AZ-ZAHRA', '2021',
  NOW(), NOW()
) RETURNING id;

-- 22. RAZA SYIRAZI EL HAMZAH (RAZA)
INSERT INTO public.santri (
  nama_lengkap, jenis_kelamin, tempat_lahir, tanggal_lahir, 
  alamat, no_whatsapp, nik, kategori, tipe_pembayaran, 
  status_approval, status_sosial, nama_sekolah, tahun_lulus,
  created_at, updated_at
) VALUES (
  'RAZA SYIRAZI EL HAMZAH', 'Laki-laki', 'SURABAYA', '2015-11-19',
  'Gunung anyar lor II, Surabaya', '088994128189', '2578041911140002',
  'Binaan Non-Mukim', 'Beasiswa', 'disetujui', 'Dhuafa', 'Swandayani', '2019',
  NOW(), NOW()
) RETURNING id;

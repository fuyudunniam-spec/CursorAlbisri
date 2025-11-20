-- Script batch untuk insert semua santri sekaligus
-- Data santri Pesantren Anak Yatim Al-Bisri

-- 1. MOH NASSA FIOI KAUTSAR (sudah diinsert)
-- 2. IVANA FAUZUN NAJAH (sudah diinsert) 
-- 3. GANDARI FEBYANA SYARASWATI (sudah diinsert)
-- 4. FIRZA PUTRI (sudah diinsert)
-- 5. DELIA PUSPITASARI (sudah diinsert)

-- 6. NISA RHOUDHOTUL JANNAH
INSERT INTO public.santri (
  nama_lengkap, nis, jenis_kelamin, tempat_lahir, tanggal_lahir, 
  alamat, no_whatsapp, nik, kategori, tipe_pembayaran, 
  status_approval, status_sosial, nama_sekolah,
  created_at, updated_at
) VALUES (
  'NISA RHOUDHOTUL JANNAH', 'AB-006', 'Perempuan', 'SURABAYA', '2011-04-25',
  'Kalibokor, RT RW 005, Pucang Sewu, Gubeng, Surabaya', '085608471668', '3578086504110003',
  'Binaan Non-Mukim', 'Beasiswa', 'disetujui', 'Piatu', 'SDN KERTAJAYA IV/210',
  NOW(), NOW()
);

-- 7. LAILATUL FADLLLYAH
INSERT INTO public.santri (
  nama_lengkap, nis, jenis_kelamin, tempat_lahir, tanggal_lahir, 
  alamat, no_whatsapp, nik, kategori, tipe_pembayaran, 
  status_approval, status_sosial, nama_sekolah,
  created_at, updated_at
) VALUES (
  'LAILATUL FADLLLYAH', 'AB-007', 'Perempuan', 'LAMONGAN', '2011-10-22',
  'Kel Weru, RT/RW 002/005, Kec. Paciran, Kab. Lamongan', '083853741486', '352507961011002',
  'Binaan Non-Mukim', 'Beasiswa', 'disetujui', 'Yatim', 'MI MATHLABUL HUDA',
  NOW(), NOW()
);

-- 8. NAZWA PUTRI MEYDINA IKSAN
INSERT INTO public.santri (
  nama_lengkap, nis, jenis_kelamin, tempat_lahir, tanggal_lahir, 
  alamat, no_whatsapp, nik, kategori, tipe_pembayaran, 
  status_approval, status_sosial, nama_sekolah,
  created_at, updated_at
) VALUES (
  'NAZWA PUTRI MEYDINA IKSAN', 'AB-008', 'Perempuan', 'SIDOARJO', '2010-05-01',
  'Kalijaten 08/02, Taman, SIDOARJO', '087714063154', '3515134105090004',
  'Binaan Non-Mukim', 'Beasiswa', 'disetujui', 'Dhuafa', 'SDN KALIJATEN',
  NOW(), NOW()
);

-- 9. AULIYA WIDIYA SHOLIHAH
INSERT INTO public.santri (
  nama_lengkap, nis, jenis_kelamin, tempat_lahir, tanggal_lahir, 
  alamat, no_whatsapp, nik, kategori, tipe_pembayaran, 
  status_approval, status_sosial, nama_sekolah,
  created_at, updated_at
) VALUES (
  'AULIYA WIDIYA SHOLIHAH', 'AB-009', 'Perempuan', 'LAMONGAN', '2008-06-21',
  'Campurejo, GRESIK', '083133055205', '3524146106080003',
  'Binaan Non-Mukim', 'Beasiswa', 'disetujui', 'Yatim Piatu', 'SMP',
  NOW(), NOW()
);

-- 10. SYAMIRA NUR SAFIKA BILQIS
INSERT INTO public.santri (
  nama_lengkap, nis, jenis_kelamin, tempat_lahir, tanggal_lahir, 
  alamat, no_whatsapp, nik, kategori, tipe_pembayaran, 
  status_approval, status_sosial, nama_sekolah,
  created_at, updated_at
) VALUES (
  'SYAMIRA NUR SAFIKA BILQIS', 'AB-010', 'Perempuan', 'BANGKALAN', '2007-11-12',
  'Dusun Lebak Barat, Kec. Sepuluh, Kab. Bangkalan', '085922372139', '3526085211070001',
  'Binaan Non-Mukim', 'Beasiswa', 'disetujui', 'Dhuafa', 'SMP AL ISLAH SURABAYA',
  NOW(), NOW()
);

-- 11. INATIL IZZA
INSERT INTO public.santri (
  nama_lengkap, nis, jenis_kelamin, tempat_lahir, tanggal_lahir, 
  alamat, no_whatsapp, nik, kategori, tipe_pembayaran, 
  status_approval, status_sosial, nama_sekolah,
  created_at, updated_at
) VALUES (
  'INATIL IZZA', 'AB-011', 'Perempuan', 'BANGKALAN', '2008-12-14',
  'Pulo Wonokromo, RT/RW 001/006, Kel. Wonokromo, Kec. Wonokromo, Kab. Surabaya', '088991970113', '3526135412080002',
  'Binaan Non-Mukim', 'Beasiswa', 'disetujui', 'Yatim', 'MI AL BUKHORI',
  NOW(), NOW()
);

-- 12. MUHAMAD WISAM SYAKRONI ZAIDAN PUTRA
INSERT INTO public.santri (
  nama_lengkap, nis, jenis_kelamin, tempat_lahir, tanggal_lahir, 
  alamat, no_whatsapp, nik, kategori, tipe_pembayaran, 
  status_approval, status_sosial, nama_sekolah,
  created_at, updated_at
) VALUES (
  'MUHAMAD WISAM SYAKRONI ZAIDAN PUTRA', 'AB-012', 'Laki-laki', 'BANGKALAN', '2010-06-26',
  'Dsn. Lebak Barat, BANGKALAN', '08999918085', '3526082606100001',
  'Binaan Non-Mukim', 'Beasiswa', 'disetujui', 'Dhuafa', 'SDN SEPULUH 1',
  NOW(), NOW()
);

-- 13. ASSYIFA PUTRI AURA DZAKIA
INSERT INTO public.santri (
  nama_lengkap, nis, jenis_kelamin, tempat_lahir, tanggal_lahir, 
  alamat, no_whatsapp, nik, kategori, tipe_pembayaran, 
  status_approval, status_sosial, nama_sekolah,
  created_at, updated_at
) VALUES (
  'ASSYIFA PUTRI AURA DZAKIA', 'AB-013', 'Perempuan', 'SEMARANG', '2016-12-14',
  'Kel. Tambakboyo, Kec. Ambarawa, Kab. Semarang, Prov. Jateng', NULL, '3322205412160001',
  'Binaan Non-Mukim', 'Beasiswa', 'disetujui', 'Dhuafa', 'TK AZ-ZAHRA',
  NOW(), NOW()
);

-- 14. SEPTA AFRIANI REMILDA
INSERT INTO public.santri (
  nama_lengkap, nis, jenis_kelamin, tempat_lahir, tanggal_lahir, 
  alamat, no_whatsapp, nik, kategori, tipe_pembayaran, 
  status_approval, status_sosial, nama_sekolah,
  created_at, updated_at
) VALUES (
  'SEPTA AFRIANI REMILDA', 'AB-014', 'Perempuan', 'TRENGGALEK', '2015-09-03',
  'Dusun Gebang, RT/RW 031/010, Kel. Kertosono, Kec. Panggul, Kota Trenggalek', NULL, '350301430915002',
  'Binaan Non-Mukim', 'Beasiswa', 'disetujui', 'Dhuafa', NULL,
  NOW(), NOW()
);

-- 15. MUHAMAD FAKI
INSERT INTO public.santri (
  nama_lengkap, nis, jenis_kelamin, tempat_lahir, tanggal_lahir, 
  alamat, no_whatsapp, nik, kategori, tipe_pembayaran, 
  status_approval, status_sosial, nama_sekolah,
  created_at, updated_at
) VALUES (
  'MUHAMAD FAKI', 'AB-015', 'Laki-laki', 'BANGKALAN', '2007-09-21',
  'Wonokromo Tengah 5/6, Kel. Wonokomo, Kec. Wonokromo, Kab. Surabaya', '081515407685', '3526032109070006',
  'Binaan Non-Mukim', 'Beasiswa', 'disetujui', 'Yatim', 'SMP AL ISLAH SURABAYA',
  NOW(), NOW()
);

-- 16. ACHMAD MAULANA
INSERT INTO public.santri (
  nama_lengkap, nis, jenis_kelamin, tempat_lahir, tanggal_lahir, 
  alamat, no_whatsapp, nik, kategori, tipe_pembayaran, 
  status_approval, status_sosial, nama_sekolah,
  created_at, updated_at
) VALUES (
  'ACHMAD MAULANA', 'AB-016', 'Laki-laki', 'Surabaya', '2014-04-01',
  'Wonokromo, Gunung anyar lor II, Surabaya', '087749895740', '3578040103140003',
  'Binaan Non-Mukim', 'Beasiswa', 'disetujui', 'Dhuafa', 'Al Furqon',
  NOW(), NOW()
);

-- 17. AULIYA UL-LUBABAH
INSERT INTO public.santri (
  nama_lengkap, nis, jenis_kelamin, tempat_lahir, tanggal_lahir, 
  alamat, no_whatsapp, nik, kategori, tipe_pembayaran, 
  status_approval, status_sosial, nama_sekolah,
  created_at, updated_at
) VALUES (
  'AULIYA UL-LUBABAH', 'AB-017', 'Perempuan', 'ACEH UTARA', '2012-02-15',
  'Warulor RT/RW 001/001, Kel. Warulor, Kec. Paciran, Kab. Lamongan', '082146771987', '1108195502120001',
  'Binaan Non-Mukim', 'Beasiswa', 'disetujui', 'Dhuafa', 'MI. TANWIRUL QULUB YPP',
  NOW(), NOW()
);

-- 18. MUHAMAD HAFIDH ASY'ARI
INSERT INTO public.santri (
  nama_lengkap, nis, jenis_kelamin, tempat_lahir, tanggal_lahir, 
  alamat, no_whatsapp, nik, kategori, tipe_pembayaran, 
  status_approval, status_sosial, nama_sekolah,
  created_at, updated_at
) VALUES (
  'MUHAMAD HAFIDH ASY''ARI', 'AB-018', 'Laki-laki', 'MAGETAN', '2009-03-25',
  'Tambakmas RT/RW 007/001, Kec. Sukomoro, Kab. Magetan', '08176870855', '3520092503090001',
  'Binaan Non-Mukim', 'Beasiswa', 'disetujui', 'Dhuafa', 'MTS TANADA',
  NOW(), NOW()
);

-- 19. INTAN NUR AINI
INSERT INTO public.santri (
  nama_lengkap, nis, jenis_kelamin, tempat_lahir, tanggal_lahir, 
  alamat, no_whatsapp, nik, kategori, tipe_pembayaran, 
  status_approval, status_sosial, nama_sekolah,
  created_at, updated_at
) VALUES (
  'INTAN NUR AINI', 'AB-019', 'Perempuan', 'MAGETAN', '2012-07-09',
  'Tambakmas, 007/001, Kec. Sukomoro, Kab. Magetan', '087758139338', '352009490712001',
  'Binaan Non-Mukim', 'Beasiswa', 'disetujui', 'Dhuafa', 'MIS TANADA',
  NOW(), NOW()
);

-- 20. MOCHAMAD IRSYAD HAFIZH
INSERT INTO public.santri (
  nama_lengkap, nis, jenis_kelamin, tempat_lahir, tanggal_lahir, 
  alamat, no_whatsapp, nik, kategori, tipe_pembayaran, 
  status_approval, status_sosial, nama_sekolah,
  created_at, updated_at
) VALUES (
  'MOCHAMAD IRSYAD HAFIZH', 'AB-020', 'Perempuan', 'GRESIK', '2010-02-17',
  'PERUMTAS ll Blok L3 No.19, GRESIK', NULL, '357804170210001',
  'Binaan Non-Mukim', 'Beasiswa', 'disetujui', 'Dhuafa', NULL,
  NOW(), NOW()
);

-- 21. SHAFAQNAAZ EL HAMZAH
INSERT INTO public.santri (
  nama_lengkap, nis, jenis_kelamin, tempat_lahir, tanggal_lahir, 
  alamat, no_whatsapp, nik, kategori, tipe_pembayaran, 
  status_approval, status_sosial, nama_sekolah,
  created_at, updated_at
) VALUES (
  'SHAFAQNAAZ EL HAMZAH', 'AB-021', 'Perempuan', 'SURABAYA', '2015-11-19',
  'Surabaya, Kel. Wonokromo, Kec. Wonokromo, Kab. Surabaya', NULL, '3578045911150002',
  'Binaan Non-Mukim', 'Beasiswa', 'disetujui', 'Dhuafa', 'TK AZ-ZAHRA',
  NOW(), NOW()
);

-- 22. RAZA SYIRAZI EL HAMZAH
INSERT INTO public.santri (
  nama_lengkap, nis, jenis_kelamin, tempat_lahir, tanggal_lahir, 
  alamat, no_whatsapp, nik, kategori, tipe_pembayaran, 
  status_approval, status_sosial, nama_sekolah,
  created_at, updated_at
) VALUES (
  'RAZA SYIRAZI EL HAMZAH', 'AB-022', 'Laki-laki', 'SURABAYA', '2015-11-19',
  'Gunung anyar lor II, Surabaya', '088994128189', '2578041911140002',
  'Binaan Non-Mukim', 'Beasiswa', 'disetujui', 'Dhuafa', 'Swandayani',
  NOW(), NOW()
);

-- Script batch untuk insert semua data wali santri
-- Data wali untuk santri Pesantren Anak Yatim Al-Bisri

-- Data wali untuk DELIA PUSPITASARI (AB-005)
INSERT INTO public.santri_wali (santri_id, nama_lengkap, hubungan_keluarga, no_telepon, alamat, pekerjaan, pendidikan, penghasilan_bulanan, is_utama, created_at, updated_at) VALUES
((SELECT id FROM santri WHERE nis = 'AB-005'), 'ENGKOS JARKASIH', 'Ayah', '0856-0430-4754', 'jln . wonorejo GG 4 no 137 , Kelurahan Wonorejo', 'Buruh / Pekerja Harian', 'SD / MI', '< Rp 1.000.000', true, NOW(), NOW()),
((SELECT id FROM santri WHERE nis = 'AB-005'), 'DEWI YULIYATIN', 'Ibu', '0857-5918-1054', 'dusun pon rt 004 rw 007', 'Buruh / Pekerja Harian', 'SMP / MTs', '< Rp 1.000.000', false, NOW(), NOW());

-- Data wali untuk NISA RHOUDHOTUL JANNAH (AB-006)
INSERT INTO public.santri_wali (santri_id, nama_lengkap, hubungan_keluarga, no_telepon, alamat, pekerjaan, pendidikan, penghasilan_bulanan, is_utama, created_at, updated_at) VALUES
((SELECT id FROM santri WHERE nis = 'AB-006'), 'ECHYAH BURHANI', 'Ayah', '0858-8877-6247', 'kalibokor V no 12B', 'Buruh / Pekerja Harian', 'SMA / MA / SMK', '< Rp 1.000.000', true, NOW(), NOW()),
((SELECT id FROM santri WHERE nis = 'AB-006'), 'MEGA AMALIA PUTRI', 'Kakak', '0858-8877-6247', 'kalibokor V no 12B', 'Buruh / Pekerja Harian', 'SMP / MTs', '< Rp 1.000.000', false, NOW(), NOW());

-- Data wali untuk LAILATUL FADLLLYAH (AB-007)
INSERT INTO public.santri_wali (santri_id, nama_lengkap, hubungan_keluarga, no_telepon, alamat, pekerjaan, pendidikan, penghasilan_bulanan, is_utama, created_at, updated_at) VALUES
((SELECT id FROM santri WHERE nis = 'AB-007'), 'KUSMAWATI', 'Ibu', '0857-3942-9399', 'KEL.WERU ,RT/RW 02/05 , KEC.PACIRAN ,KAB . LAMONGAN', 'Buruh / Pekerja Harian', 'SMA / MA / SMK', '< Rp 1.000.000', true, NOW(), NOW()),
((SELECT id FROM santri WHERE nis = 'AB-007'), 'NASRULLAH KAFAF', 'Kakak', '0813-4974-6127', 'KEL.WERU ,RT/RW 02/05 , KEC.PACIRAN ,KAB . LAMONGAN', 'Buruh / Pekerja Harian', 'SMP / MTs', 'Rp 1.000.000 – Rp 2.000.000', false, NOW(), NOW());

-- Data wali untuk NAZWA PUTRI MEYDINA IKSAN (AB-008)
INSERT INTO public.santri_wali (santri_id, nama_lengkap, hubungan_keluarga, no_telepon, alamat, pekerjaan, pendidikan, penghasilan_bulanan, is_utama, created_at, updated_at) VALUES
((SELECT id FROM santri WHERE nis = 'AB-008'), 'MAY INDRAWATI', 'Ibu', '085954429038', 'Kalijaten sepanjang', 'Pedagang / Wirausaha', 'SMA / MA / SMK', 'Rp 1.000.000 – Rp 2.000.000', true, NOW(), NOW()),
((SELECT id FROM santri WHERE nis = 'AB-008'), 'NUR IKSAN', 'Ayah', '085954429038', 'Kalijaten sepanjang', 'Pegawai Swasta', 'SMA / MA / SMK', 'Rp 1.000.000 – Rp 2.000.000', false, NOW(), NOW());

-- Data wali untuk AULIYA WIDIYA SHOLIHAH (AB-009)
INSERT INTO public.santri_wali (santri_id, nama_lengkap, hubungan_keluarga, no_telepon, alamat, pekerjaan, pendidikan, penghasilan_bulanan, is_utama, created_at, updated_at) VALUES
((SELECT id FROM santri WHERE nis = 'AB-009'), 'SA''DIYAH', 'BU DHE', '+62 881-0364-49755', 'mbabrik', 'Ibu Rumah Tangga', 'SMA / MA / SMK', 'Tidak Bekerja', true, NOW(), NOW());

-- Data wali untuk SYAMIRA NUR SAFIKA BILQIS (AB-010)
INSERT INTO public.santri_wali (santri_id, nama_lengkap, hubungan_keluarga, no_telepon, alamat, pekerjaan, pendidikan, penghasilan_bulanan, is_utama, created_at, updated_at) VALUES
((SELECT id FROM santri WHERE nis = 'AB-010'), 'SUGANI', 'Ayah', '0858-0854-2264', 'dusun lebak barat sebelah sdn sepuluh 1', 'Buruh / Pekerja Harian', 'SMA / MA / SMK', '< Rp 1.000.000', true, NOW(), NOW()),
((SELECT id FROM santri WHERE nis = 'AB-010'), 'HANIFAH', 'Ibu', '0815-1545-9969', 'dusun lebak barat sebelah sdn sepuluh 1', 'Buruh / Pekerja Harian', 'SMA / MA / SMK', 'Rp 2.000.001 – Rp 3.000.000', false, NOW(), NOW());

-- Data wali untuk INATIL IZZA (AB-011)
INSERT INTO public.santri_wali (santri_id, nama_lengkap, hubungan_keluarga, no_telepon, alamat, pekerjaan, pendidikan, penghasilan_bulanan, is_utama, created_at, updated_at) VALUES
((SELECT id FROM santri WHERE nis = 'AB-011'), 'SUILAH', 'Ibu', '0877-0102-8961', 'karangrejo gang ll no 3B', 'Tidak bekerja', 'SD / MI', 'Tidak Bekerja', true, NOW(), NOW()),
((SELECT id FROM santri WHERE nis = 'AB-011'), 'MUHAMMAD AYYUB', 'Paman', '0819-9144-6333', 'karangrejo gang ll no 3B', 'Pegawai Swasta', 'SD / MI', 'Rp 1.000.000 – Rp 2.000.000', false, NOW(), NOW());

-- Data wali untuk MUHAMAD WISAM SYAKRONI ZAIDAN PUTRA (AB-012)
INSERT INTO public.santri_wali (santri_id, nama_lengkap, hubungan_keluarga, no_telepon, alamat, pekerjaan, pendidikan, penghasilan_bulanan, is_utama, created_at, updated_at) VALUES
((SELECT id FROM santri WHERE nis = 'AB-012'), 'SUGANI', 'Ayah', '0858-0854-2264', 'DUSUN LEBAK BARAT SEBELAH SDN SEPULUH 1', 'Buruh / Pekerja Harian', 'SMA / MA / SMK', '< Rp 1.000.000', true, NOW(), NOW()),
((SELECT id FROM santri WHERE nis = 'AB-012'), 'HANIFAH', 'Ibu', '0815-1545-9969', 'DUSUN LEBAK BARAT SEBELAH SDN SEPULUH 1', 'Buruh / Pekerja Harian', 'SMA / MA / SMK', 'Rp 2.000.001 – Rp 3.000.000', false, NOW(), NOW());

-- Data wali untuk ASSYIFA PUTRI AURA DZAKIA (AB-013)
INSERT INTO public.santri_wali (santri_id, nama_lengkap, hubungan_keluarga, no_telepon, alamat, pekerjaan, pendidikan, penghasilan_bulanan, is_utama, created_at, updated_at) VALUES
((SELECT id FROM santri WHERE nis = 'AB-013'), 'CYNTHIA NOORRAHMI RAMADHANI', 'Ibu', '0895 4196 74437', 'TAMBAKBOYO RT 004 RW 001 DESA TAMBAKBOYO , KEC. AMBARAWA , KAB.SEMARANG, PROV. JAWA TENGAH', 'Buruh / Pekerja Harian', 'SMA / MA / SMK', '< Rp 1.000.000', true, NOW(), NOW());

-- Data wali untuk SEPTA AFRIANI REMILDA (AB-014)
INSERT INTO public.santri_wali (santri_id, nama_lengkap, hubungan_keluarga, no_telepon, alamat, pekerjaan, pendidikan, penghasilan_bulanan, is_utama, created_at, updated_at) VALUES
((SELECT id FROM santri WHERE nis = 'AB-014'), 'TUTUT SANDIATI', 'Ibu', '0821-1783-1171', 'RTW 31 RW 10 DESA KERTOSONO', 'Ibu Rumah Tangga', 'SMA / MA / SMK', '< Rp 1.000.000', true, NOW(), NOW());

-- Data wali untuk MUHAMAD FAKI (AB-015)
INSERT INTO public.santri_wali (santri_id, nama_lengkap, hubungan_keluarga, no_telepon, alamat, pekerjaan, pendidikan, penghasilan_bulanan, is_utama, created_at, updated_at) VALUES
((SELECT id FROM santri WHERE nis = 'AB-015'), 'SIAMI', 'Ibu', '0899-0848-000', 'WONOKROMO TENGAH 5/6 , KEL.WONOKOMO , KEC.WONOKROMO , KAB.SURABAYA', 'Pedagang / Wirausaha', 'SMA / MA / SMK', '< Rp 1.000.000', true, NOW(), NOW());

-- Data wali untuk ACHMAD MAULANA (AB-016)
INSERT INTO public.santri_wali (santri_id, nama_lengkap, hubungan_keluarga, no_telepon, alamat, pekerjaan, pendidikan, penghasilan_bulanan, is_utama, created_at, updated_at) VALUES
((SELECT id FROM santri WHERE nis = 'AB-016'), 'ROSIDAH', 'Ibu', '0887785467570', 'WONOKROMO TENGAH 1/4-B', 'ART', 'SD / MI', 'Tidak tahu', true, NOW(), NOW());

-- Data wali untuk AULIYA UL-LUBABAH (AB-017)
INSERT INTO public.santri_wali (santri_id, nama_lengkap, hubungan_keluarga, no_telepon, alamat, pekerjaan, pendidikan, penghasilan_bulanan, is_utama, created_at, updated_at) VALUES
((SELECT id FROM santri WHERE nis = 'AB-017'), 'RUBIAH', 'Ibu', '0821-4677-1987', 'RT/RW 001/001 , KEL.WARULOR , KEC.PACIRAN , KAB.LAMONGAN', 'Ibu Rumah Tangga', 'SMP / MTs', 'Tidak Bekerja', true, NOW(), NOW());

-- Data wali untuk MUHAMAD HAFIDH ASY'ARI (AB-018)
INSERT INTO public.santri_wali (santri_id, nama_lengkap, hubungan_keluarga, no_telepon, alamat, pekerjaan, pendidikan, penghasilan_bulanan, is_utama, created_at, updated_at) VALUES
((SELECT id FROM santri WHERE nis = 'AB-018'), 'SUWANDI', 'Ayah', '0814-5503-1674', 'jalan wadungasri dalam gang bogoran RT 02 RW 03 belok kanan pos ronda belok kanan kost nomer 13', 'Buruh / Pekerja Harian', 'SMP / MTs', '< Rp 1.000.000', true, NOW(), NOW()),
((SELECT id FROM santri WHERE nis = 'AB-018'), 'SUYATMI', 'Ibu', '0814-5503-1674', 'jalan wadungasri dalam gang bogoran RT 02 RW 03 belok kanan pos ronda belok kanan kost nomer 13', 'Buruh / Pekerja Harian', 'SMP / MTs', '< Rp 1.000.000', false, NOW(), NOW());

-- Data wali untuk INTAN NUR AINI (AB-019)
INSERT INTO public.santri_wali (santri_id, nama_lengkap, hubungan_keluarga, no_telepon, alamat, pekerjaan, pendidikan, penghasilan_bulanan, is_utama, created_at, updated_at) VALUES
((SELECT id FROM santri WHERE nis = 'AB-019'), 'SUWANDI', 'Ayah', '0814-5503-1674', 'jalan wadung asri dalam gang bogoran RT 02 RW 03 belok kanan pos ronda belok kanan kost nomer 13', 'Buruh / Pekerja Harian', 'SMP / MTs', '< Rp 1.000.000', true, NOW(), NOW()),
((SELECT id FROM santri WHERE nis = 'AB-019'), 'SUYATMI', 'Ibu', '0877-2406-9838', 'jalan wadung asri dalam gang bogoran RT 02 RW 03 belok kanan pos ronda belok kanan kost nomer 13', 'Buruh / Pekerja Harian', 'SMP / MTs', '< Rp 1.000.000', false, NOW(), NOW());

-- Data wali untuk MOCHAMAD IRSYAD HAFIZH (AB-020)
INSERT INTO public.santri_wali (santri_id, nama_lengkap, hubungan_keluarga, no_telepon, alamat, pekerjaan, pendidikan, penghasilan_bulanan, is_utama, created_at, updated_at) VALUES
((SELECT id FROM santri WHERE nis = 'AB-020'), 'MOCH . NUR HADI', 'Ayah', NULL, 'PERUMTAS lll BLOK L3 NO 19', 'Buruh / Pekerja Harian', 'SMA / MA / SMK', '< Rp 1.000.000', true, NOW(), NOW()),
((SELECT id FROM santri WHERE nis = 'AB-020'), 'AFIFAH', 'Ibu', NULL, 'PERUMTAS lll BLOK L3 NO 19', 'Ibu Rumah Tangga', 'SMA / MA / SMK', '< Rp 1.000.000', false, NOW(), NOW());

-- Data wali untuk SHAFAQNAAZ EL HAMZAH (AB-021)
INSERT INTO public.santri_wali (santri_id, nama_lengkap, hubungan_keluarga, no_telepon, alamat, pekerjaan, pendidikan, penghasilan_bulanan, is_utama, created_at, updated_at) VALUES
((SELECT id FROM santri WHERE nis = 'AB-021'), 'ZANUAR RUDY HAMZAH', 'Ayah', NULL, 'WONOKROMO 7/38 , KEL.WONOKROMO , KEC.WONOKROMO , KAB.SURABAYA', 'Buruh / Pekerja Harian', 'SMA / MA / SMK', 'Rp 1.000.000 – Rp 2.000.000', true, NOW(), NOW());

-- Data wali untuk RAZA SYIRAZI EL HAMZAH (AB-022)
INSERT INTO public.santri_wali (santri_id, nama_lengkap, hubungan_keluarga, no_telepon, alamat, pekerjaan, pendidikan, penghasilan_bulanan, is_utama, created_at, updated_at) VALUES
((SELECT id FROM santri WHERE nis = 'AB-022'), 'ZANUAR RUDY HAMZAH', 'Ayah', '085707183185', 'Wonokromo 7/38', 'Pegawai Swasta', 'SD / MI', 'Tidak tahu', true, NOW(), NOW());

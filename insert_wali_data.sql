-- Script untuk menambahkan data wali santri
-- Data wali akan diinsert ke tabel santri_wali
-- Menggunakan santri_id yang sudah diinsert sebelumnya

-- Catatan: Untuk mendapatkan santri_id, jalankan query:
-- SELECT id, nama_lengkap FROM santri WHERE nama_lengkap LIKE '%[NAMA_SANTRI]%';

-- Data Wali untuk IVANA FAUZUN NAJAH
INSERT INTO public.santri_wali (
  santri_id, nama_lengkap, hubungan_keluarga, jenis_kelamin, 
  tempat_lahir, tanggal_lahir, alamat, no_whatsapp, 
  pekerjaan, pendidikan_terakhir, penghasilan_bulanan, 
  tinggal_bersama, bersedia_hadir, is_utama, created_at, updated_at
) VALUES (
  (SELECT id FROM santri WHERE nama_lengkap = 'IVANA FAUZUN NAJAH' LIMIT 1),
  'MINANUR ROHMAN', 'Ayah', 'Laki-laki', 
  'LAMONGAN', '1973-08-21', 'sebelah selatan masjid mathlabul huda RT03, RW 03', 
  '087717274901', 'Petani / Nelayan', 'SMA / MA / SMK', 'Rp 1.000.000 – Rp 2.000.000',
  true, true, true, NOW(), NOW()
);

INSERT INTO public.santri_wali (
  santri_id, nama_lengkap, hubungan_keluarga, jenis_kelamin, 
  tempat_lahir, tanggal_lahir, alamat, no_whatsapp, 
  pekerjaan, pendidikan_terakhir, penghasilan_bulanan, 
  tinggal_bersama, bersedia_hadir, is_utama, created_at, updated_at
) VALUES (
  (SELECT id FROM santri WHERE nama_lengkap = 'IVANA FAUZUN NAJAH' LIMIT 1),
  'MUHIZATUNNIKMAH', 'Ibu', 'Perempuan', 
  'LAMONGAN', '1978-07-20', 'sebelah selatan masjid mathlabul huda RT03, RW 03', 
  '087717274901', 'Tidak bekerja', 'SMA / MA / SMK', 'Tidak Bekerja',
  true, true, false, NOW(), NOW()
);

-- Data Wali untuk GANDARI FEBYANA SYARASWATI
INSERT INTO public.santri_wali (
  santri_id, nama_lengkap, hubungan_keluarga, jenis_kelamin, 
  tempat_lahir, tanggal_lahir, alamat, no_whatsapp, 
  pekerjaan, pendidikan_terakhir, penghasilan_bulanan, 
  tinggal_bersama, bersedia_hadir, is_utama, created_at, updated_at
) VALUES (
  (SELECT id FROM santri WHERE nama_lengkap = 'GANDARI FEBYANA SYARASWATI' LIMIT 1),
  'SUPARNI', 'Bibi', 'Perempuan', 
  'Sragen', '1982-01-31', 'Perum Gunung Anyar Emas blok J2 no 205', 
  '082140392304', 'Pedagang / Wirausaha', 'SMA / MA / SMK', 'Rp 1.000.000 – Rp 2.000.000',
  true, true, true, NOW(), NOW()
);

INSERT INTO public.santri_wali (
  santri_id, nama_lengkap, hubungan_keluarga, jenis_kelamin, 
  tempat_lahir, tanggal_lahir, alamat, no_whatsapp, 
  pekerjaan, pendidikan_terakhir, penghasilan_bulanan, 
  tinggal_bersama, bersedia_hadir, is_utama, created_at, updated_at
) VALUES (
  (SELECT id FROM santri WHERE nama_lengkap = 'GANDARI FEBYANA SYARASWATI' LIMIT 1),
  'SUNARSIH MARGO MURDIANTO', 'ibuk angkat', 'Perempuan', 
  'Sragen', '1970-04-24', 'Tarik, Tunggul, Gondang', 
  '+852 5111 4340', 'Pegawai Swasta', 'SMA / MA / SMK', 'Rp 1.000.000 – Rp 2.000.000',
  false, false, false, NOW(), NOW()
);

-- Data Wali untuk FIRZA PUTRI
INSERT INTO public.santri_wali (
  santri_id, nama_lengkap, hubungan_keluarga, jenis_kelamin, 
  tempat_lahir, tanggal_lahir, alamat, no_whatsapp, 
  pekerjaan, pendidikan_terakhir, penghasilan_bulanan, 
  tinggal_bersama, bersedia_hadir, is_utama, created_at, updated_at
) VALUES (
  (SELECT id FROM santri WHERE nama_lengkap = 'FIRZA PUTRI' LIMIT 1),
  'AHMAD YATIM', 'Ayah', 'Laki-laki', 
  'LAMONGAN', NULL, 'SIDOKUMPUL PACIRAN LAMONGAN RT 09 RW 03', 
  '+62 857-3558-4489', 'Petani / Nelayan', 'SMA / MA / SMK', '< Rp 1.000.000',
  true, true, true, NOW(), NOW()
);

INSERT INTO public.santri_wali (
  santri_id, nama_lengkap, hubungan_keluarga, jenis_kelamin, 
  tempat_lahir, tanggal_lahir, alamat, no_whatsapp, 
  pekerjaan, pendidikan_terakhir, penghasilan_bulanan, 
  tinggal_bersama, bersedia_hadir, is_utama, created_at, updated_at
) VALUES (
  (SELECT id FROM santri WHERE nama_lengkap = 'FIRZA PUTRI' LIMIT 1),
  'MUAWIYAH', 'Ibu', 'Perempuan', 
  'LAMONGAN', NULL, 'Sidokumpul Paciran Lamongan RT 09 RW 03', 
  '+62 857-3558-4489', 'Ibu Rumah Tangga', 'SMA / MA / SMK', '< Rp 1.000.000',
  true, true, false, NOW(), NOW()
);

-- Data Wali untuk DELIA PUSPITASARI
INSERT INTO public.santri_wali (
  santri_id, nama_lengkap, hubungan_keluarga, jenis_kelamin, 
  tempat_lahir, tanggal_lahir, alamat, no_whatsapp, 
  pekerjaan, pendidikan_terakhir, penghasilan_bulanan, 
  tinggal_bersama, bersedia_hadir, is_utama, created_at, updated_at
) VALUES (
  (SELECT id FROM santri WHERE nama_lengkap = 'DELIA PUSPITASARI' LIMIT 1),
  'ENGKOS JARKASIH', 'Ayah', 'Laki-laki', 
  'KUNINGAN', '1979-10-17', 'jln . wonorejo GG 4 no 137 , Kelurahan Wonorejo', 
  '0856-0430-4754', 'Buruh / Pekerja Harian', 'SD / MI', '< Rp 1.000.000',
  true, true, true, NOW(), NOW()
);

INSERT INTO public.santri_wali (
  santri_id, nama_lengkap, hubungan_keluarga, jenis_kelamin, 
  tempat_lahir, tanggal_lahir, alamat, no_whatsapp, 
  pekerjaan, pendidikan_terakhir, penghasilan_bulanan, 
  tinggal_bersama, bersedia_hadir, is_utama, created_at, updated_at
) VALUES (
  (SELECT id FROM santri WHERE nama_lengkap = 'DELIA PUSPITASARI' LIMIT 1),
  'DEWI YULIYATIN', 'Ibu', 'Perempuan', 
  'KUNINGAN', '1991-10-08', 'dusun pon rt 004 rw 007', 
  '0857-5918-1054', 'Buruh / Pekerja Harian', 'SMP / MTs', '< Rp 1.000.000',
  true, true, false, NOW(), NOW()
);

-- Data Wali untuk NISA RHOUDHOTUL JANNAH
INSERT INTO public.santri_wali (
  santri_id, nama_lengkap, hubungan_keluarga, jenis_kelamin, 
  tempat_lahir, tanggal_lahir, alamat, no_whatsapp, 
  pekerjaan, pendidikan_terakhir, penghasilan_bulanan, 
  tinggal_bersama, bersedia_hadir, is_utama, created_at, updated_at
) VALUES (
  (SELECT id FROM santri WHERE nama_lengkap = 'NISA RHOUDHOTUL JANNAH' LIMIT 1),
  'ECHYAH BURHANI', 'Ayah', 'Laki-laki', 
  'SURABAYA', '1978-12-10', 'kalibokor V no 12B', 
  '0858-8877-6247', 'Buruh / Pekerja Harian', 'SMA / MA / SMK', '< Rp 1.000.000',
  true, true, true, NOW(), NOW()
);

INSERT INTO public.santri_wali (
  santri_id, nama_lengkap, hubungan_keluarga, jenis_kelamin, 
  tempat_lahir, tanggal_lahir, alamat, no_whatsapp, 
  pekerjaan, pendidikan_terakhir, penghasilan_bulanan, 
  tinggal_bersama, bersedia_hadir, is_utama, created_at, updated_at
) VALUES (
  (SELECT id FROM santri WHERE nama_lengkap = 'NISA RHOUDHOTUL JANNAH' LIMIT 1),
  'MEGA AMALIA PUTRI', 'Kakak', 'Perempuan', 
  '2006-04-22', '2006-04-22', 'kalibokor V no 12B', 
  '0858-8877-6247', 'Buruh / Pekerja Harian', 'SMP / MTs', '< Rp 1.000.000',
  true, true, false, NOW(), NOW()
);

-- Data Wali untuk LAILATUL FADLLLYAH
INSERT INTO public.santri_wali (
  santri_id, nama_lengkap, hubungan_keluarga, jenis_kelamin, 
  tempat_lahir, tanggal_lahir, alamat, no_whatsapp, 
  pekerjaan, pendidikan_terakhir, penghasilan_bulanan, 
  tinggal_bersama, bersedia_hadir, is_utama, created_at, updated_at
) VALUES (
  (SELECT id FROM santri WHERE nama_lengkap = 'LAILATUL FADLLLYAH' LIMIT 1),
  'KUSMAWATI', 'Ibu', 'Perempuan', 
  'LAMONGAN', '1977-11-29', 'KEL.WERU ,RT/RW 02/05 , KEC.PACIRAN ,KAB . LAMONGAN', 
  '0857-3942-9399', 'Buruh / Pekerja Harian', 'SMA / MA / SMK', '< Rp 1.000.000',
  true, true, true, NOW(), NOW()
);

INSERT INTO public.santri_wali (
  santri_id, nama_lengkap, hubungan_keluarga, jenis_kelamin, 
  tempat_lahir, tanggal_lahir, alamat, no_whatsapp, 
  pekerjaan, pendidikan_terakhir, penghasilan_bulanan, 
  tinggal_bersama, bersedia_hadir, is_utama, created_at, updated_at
) VALUES (
  (SELECT id FROM santri WHERE nama_lengkap = 'LAILATUL FADLLLYAH' LIMIT 1),
  'NASRULLAH KAFAF', 'Kakak', 'Laki-laki', 
  'LAMONGAN', '2004-02-13', 'KEL.WERU ,RT/RW 02/05 , KEC.PACIRAN ,KAB . LAMONGAN', 
  '0813-4974-6127', 'Buruh / Pekerja Harian', 'SMP / MTs', 'Rp 1.000.000 – Rp 2.000.000',
  true, true, false, NOW(), NOW()
);

-- Data Wali untuk NAZWA PUTRI MEYDINA IKSAN
INSERT INTO public.santri_wali (
  santri_id, nama_lengkap, hubungan_keluarga, jenis_kelamin, 
  tempat_lahir, tanggal_lahir, alamat, no_whatsapp, 
  pekerjaan, pendidikan_terakhir, penghasilan_bulanan, 
  tinggal_bersama, bersedia_hadir, is_utama, created_at, updated_at
) VALUES (
  (SELECT id FROM santri WHERE nama_lengkap = 'NAZWA PUTRI MEYDINA IKSAN' LIMIT 1),
  'MAY INDRAWATI', 'Ibu', 'Perempuan', 
  'SURABAYA', '1984-05-18', 'Kalijaten sepanjang', 
  '085954429038', 'Pedagang / Wirausaha', 'SMA / MA / SMK', 'Rp 1.000.000 – Rp 2.000.000',
  true, true, true, NOW(), NOW()
);

INSERT INTO public.santri_wali (
  santri_id, nama_lengkap, hubungan_keluarga, jenis_kelamin, 
  tempat_lahir, tanggal_lahir, alamat, no_whatsapp, 
  pekerjaan, pendidikan_terakhir, penghasilan_bulanan, 
  tinggal_bersama, bersedia_hadir, is_utama, created_at, updated_at
) VALUES (
  (SELECT id FROM santri WHERE nama_lengkap = 'NAZWA PUTRI MEYDINA IKSAN' LIMIT 1),
  'NUR IKSAN', 'Ayah', 'Laki-laki', 
  'SIDOARJO', '1981-09-28', 'Kalijaten sepanjang', 
  '085954429038', 'Pegawai Swasta', 'SMA / MA / SMK', 'Rp 1.000.000 – Rp 2.000.000',
  true, true, false, NOW(), NOW()
);

-- Data Wali untuk AULIYA WIDIYA SHOLIHAH
INSERT INTO public.santri_wali (
  santri_id, nama_lengkap, hubungan_keluarga, jenis_kelamin, 
  tempat_lahir, tanggal_lahir, alamat, no_whatsapp, 
  pekerjaan, pendidikan_terakhir, penghasilan_bulanan, 
  tinggal_bersama, bersedia_hadir, is_utama, created_at, updated_at
) VALUES (
  (SELECT id FROM santri WHERE nama_lengkap = 'AULIYA WIDIYA SHOLIHAH' LIMIT 1),
  'SA''DIYAH', 'BU DHE', 'Perempuan', 
  'LAMONGAN', NULL, 'mbabrik', 
  '+62 881-0364-49755', 'Ibu Rumah Tangga', 'SMA / MA / SMK', 'Tidak Bekerja',
  true, true, true, NOW(), NOW()
);

-- Data Wali untuk SYAMIRA NUR SAFIKA BILQIS
INSERT INTO public.santri_wali (
  santri_id, nama_lengkap, hubungan_keluarga, jenis_kelamin, 
  tempat_lahir, tanggal_lahir, alamat, no_whatsapp, 
  pekerjaan, pendidikan_terakhir, penghasilan_bulanan, 
  tinggal_bersama, bersedia_hadir, is_utama, created_at, updated_at
) VALUES (
  (SELECT id FROM santri WHERE nama_lengkap = 'SYAMIRA NUR SAFIKA BILQIS' LIMIT 1),
  'SUGANI', 'Ayah', 'Laki-laki', 
  'BANGKALAN', '1972-01-14', 'dusun lebak barat sebelah sdn sepuluh 1', 
  '0858-0854-2264', 'Buruh / Pekerja Harian', 'SMA / MA / SMK', '< Rp 1.000.000',
  true, true, true, NOW(), NOW()
);

INSERT INTO public.santri_wali (
  santri_id, nama_lengkap, hubungan_keluarga, jenis_kelamin, 
  tempat_lahir, tanggal_lahir, alamat, no_whatsapp, 
  pekerjaan, pendidikan_terakhir, penghasilan_bulanan, 
  tinggal_bersama, bersedia_hadir, is_utama, created_at, updated_at
) VALUES (
  (SELECT id FROM santri WHERE nama_lengkap = 'SYAMIRA NUR SAFIKA BILQIS' LIMIT 1),
  'HANIFAH', 'Ibu', 'Perempuan', 
  'BANGKALAN', '1987-03-21', 'dusun lebak barat sebelah sdn sepuluh 1', 
  '0815-1545-9969', 'Buruh / Pekerja Harian', 'SMA / MA / SMK', 'Rp 2.000.001 – Rp 3.000.000',
  true, true, false, NOW(), NOW()
);

-- Data Wali untuk INATIL IZZA
INSERT INTO public.santri_wali (
  santri_id, nama_lengkap, hubungan_keluarga, jenis_kelamin, 
  tempat_lahir, tanggal_lahir, alamat, no_whatsapp, 
  pekerjaan, pendidikan_terakhir, penghasilan_bulanan, 
  tinggal_bersama, bersedia_hadir, is_utama, created_at, updated_at
) VALUES (
  (SELECT id FROM santri WHERE nama_lengkap = 'INATIL IZZA' LIMIT 1),
  'SUILAH', 'Ibu', 'Perempuan', 
  'BANGKALAN', '1974-07-05', 'karangrejo gang ll no 3B', 
  '0877-0102-8961', 'Tidak bekerja', 'SD / MI', 'Tidak Bekerja',
  true, true, true, NOW(), NOW()
);

INSERT INTO public.santri_wali (
  santri_id, nama_lengkap, hubungan_keluarga, jenis_kelamin, 
  tempat_lahir, tanggal_lahir, alamat, no_whatsapp, 
  pekerjaan, pendidikan_terakhir, penghasilan_bulanan, 
  tinggal_bersama, bersedia_hadir, is_utama, created_at, updated_at
) VALUES (
  (SELECT id FROM santri WHERE nama_lengkap = 'INATIL IZZA' LIMIT 1),
  'MUHAMMAD AYYUB', 'Paman', 'Laki-laki', 
  'BANGKALAN', '1994-01-15', 'karangrejo gang ll no 3B', 
  '0819-9144-6333', 'Pegawai Swasta', 'SD / MI', 'Rp 1.000.000 – Rp 2.000.000',
  true, true, false, NOW(), NOW()
);

-- Data Wali untuk MUHAMAD WISAM SYAKRONI ZAIDAN PUTRA
INSERT INTO public.santri_wali (
  santri_id, nama_lengkap, hubungan_keluarga, jenis_kelamin, 
  tempat_lahir, tanggal_lahir, alamat, no_whatsapp, 
  pekerjaan, pendidikan_terakhir, penghasilan_bulanan, 
  tinggal_bersama, bersedia_hadir, is_utama, created_at, updated_at
) VALUES (
  (SELECT id FROM santri WHERE nama_lengkap = 'MUHAMAD WISAM SYAKRONI ZAIDAN PUTRA' LIMIT 1),
  'SUGANI', 'Ayah', 'Laki-laki', 
  'BANGKALAN', '1972-01-14', 'DUSUN LEBAK BARAT SEBELAH SDN SEPULUH 1', 
  '0858-0854-2264', 'Buruh / Pekerja Harian', 'SMA / MA / SMK', '< Rp 1.000.000',
  true, true, true, NOW(), NOW()
);

INSERT INTO public.santri_wali (
  santri_id, nama_lengkap, hubungan_keluarga, jenis_kelamin, 
  tempat_lahir, tanggal_lahir, alamat, no_whatsapp, 
  pekerjaan, pendidikan_terakhir, penghasilan_bulanan, 
  tinggal_bersama, bersedia_hadir, is_utama, created_at, updated_at
) VALUES (
  (SELECT id FROM santri WHERE nama_lengkap = 'MUHAMAD WISAM SYAKRONI ZAIDAN PUTRA' LIMIT 1),
  'HANIFAH', 'Ibu', 'Perempuan', 
  'BANGKALAN', '1987-03-21', 'DUSUN LEBAK BARAT SEBELAH SDN SEPULUH 1', 
  '0815-1545-9969', 'Buruh / Pekerja Harian', 'SMA / MA / SMK', 'Rp 2.000.001 – Rp 3.000.000',
  true, true, false, NOW(), NOW()
);

-- Data Wali untuk ASSYIFA PUTRI AURA DZAKIA
INSERT INTO public.santri_wali (
  santri_id, nama_lengkap, hubungan_keluarga, jenis_kelamin, 
  tempat_lahir, tanggal_lahir, alamat, no_whatsapp, 
  pekerjaan, pendidikan_terakhir, penghasilan_bulanan, 
  tinggal_bersama, bersedia_hadir, is_utama, created_at, updated_at
) VALUES (
  (SELECT id FROM santri WHERE nama_lengkap = 'ASSYIFA PUTRI AURA DZAKIA' LIMIT 1),
  'CYNTHIA NOORRAHMI RAMADHANI', 'Ibu', 'Perempuan', 
  'PALANGKARAYA', '1994-03-09', 'TAMBAKBOYO RT 004 RW 001 DESA TAMBAKBOYO , KEC. AMBARAWA , KAB.SEMARANG, PROV. JAWA TENGAH', 
  '0895 4196 74437', 'Buruh / Pekerja Harian', 'SMA / MA / SMK', '< Rp 1.000.000',
  true, true, true, NOW(), NOW()
);

-- Data Wali untuk SEPTA AFRIANI REMILDA
INSERT INTO public.santri_wali (
  santri_id, nama_lengkap, hubungan_keluarga, jenis_kelamin, 
  tempat_lahir, tanggal_lahir, alamat, no_whatsapp, 
  pekerjaan, pendidikan_terakhir, penghasilan_bulanan, 
  tinggal_bersama, bersedia_hadir, is_utama, created_at, updated_at
) VALUES (
  (SELECT id FROM santri WHERE nama_lengkap = 'SEPTA AFRIANI REMILDA' LIMIT 1),
  'TUTUT SANDIATI', 'Ibu', 'Perempuan', 
  'TRENGGALEK', NULL, 'RTW 31 RW 10 DESA KERTOSONO', 
  '0821-1783-1171', 'Ibu Rumah Tangga', 'SMA / MA / SMK', '< Rp 1.000.000',
  true, true, true, NOW(), NOW()
);

-- Data Wali untuk MUHAMAD FAKI
INSERT INTO public.santri_wali (
  santri_id, nama_lengkap, hubungan_keluarga, jenis_kelamin, 
  tempat_lahir, tanggal_lahir, alamat, no_whatsapp, 
  pekerjaan, pendidikan_terakhir, penghasilan_bulanan, 
  tinggal_bersama, bersedia_hadir, is_utama, created_at, updated_at
) VALUES (
  (SELECT id FROM santri WHERE nama_lengkap = 'MUHAMAD FAKI' LIMIT 1),
  'SIAMI', 'Ibu', 'Perempuan', 
  'BANGKALAN', '1983-03-22', 'WONOKROMO TENGAH 5/6 , KEL.WONOKOMO , KEC.WONOKROMO , KAB.SURABAYA', 
  '0899-0848-000', 'Pedagang / Wirausaha', 'SMA / MA / SMK', '< Rp 1.000.000',
  true, true, true, NOW(), NOW()
);

-- Data Wali untuk ACHMAD MAULANA
INSERT INTO public.santri_wali (
  santri_id, nama_lengkap, hubungan_keluarga, jenis_kelamin, 
  tempat_lahir, tanggal_lahir, alamat, no_whatsapp, 
  pekerjaan, pendidikan_terakhir, penghasilan_bulanan, 
  tinggal_bersama, bersedia_hadir, is_utama, created_at, updated_at
) VALUES (
  (SELECT id FROM santri WHERE nama_lengkap = 'ACHMAD MAULANA' LIMIT 1),
  'ROSIDAH', 'Ibu', 'Perempuan', 
  'Sampang', '1984-06-02', 'WONOKROMO TENGAH 1/4-B', 
  '0887785467570', 'ART', 'SD / MI', 'Tidak tahu',
  true, true, true, NOW(), NOW()
);

-- Data Wali untuk AULIYA UL-LUBABAH
INSERT INTO public.santri_wali (
  santri_id, nama_lengkap, hubungan_keluarga, jenis_kelamin, 
  tempat_lahir, tanggal_lahir, alamat, no_whatsapp, 
  pekerjaan, pendidikan_terakhir, penghasilan_bulanan, 
  tinggal_bersama, bersedia_hadir, is_utama, created_at, updated_at
) VALUES (
  (SELECT id FROM santri WHERE nama_lengkap = 'AULIYA UL-LUBABAH' LIMIT 1),
  'RUBIAH', 'Ibu', 'Perempuan', 
  'SAUNEUBOK LAPANG', '1989-03-01', 'RT/RW 001/001 , KEL.WARULOR , KEC.PACIRAN , KAB.LAMONGAN', 
  '0821-4677-1987', 'Ibu Rumah Tangga', 'SMP / MTs', 'Tidak Bekerja',
  true, true, true, NOW(), NOW()
);

-- Data Wali untuk MUHAMAD HAFIDH ASY'ARI
INSERT INTO public.santri_wali (
  santri_id, nama_lengkap, hubungan_keluarga, jenis_kelamin, 
  tempat_lahir, tanggal_lahir, alamat, no_whatsapp, 
  pekerjaan, pendidikan_terakhir, penghasilan_bulanan, 
  tinggal_bersama, bersedia_hadir, is_utama, created_at, updated_at
) VALUES (
  (SELECT id FROM santri WHERE nama_lengkap = 'MUHAMAD HAFIDH ASY'ARI' LIMIT 1),
  'SUWANDI', 'Ayah', 'Laki-laki', 
  'MAGETAN', '1976-11-11', 'jalan wadungasri dalam gang bogoran RT 02 RW 03 belok kanan pos ronda belok kanan kost nomer 13', 
  '0814-5503-1674', 'Buruh / Pekerja Harian', 'SMP / MTs', '< Rp 1.000.000',
  true, true, true, NOW(), NOW()
);

INSERT INTO public.santri_wali (
  santri_id, nama_lengkap, hubungan_keluarga, jenis_kelamin, 
  tempat_lahir, tanggal_lahir, alamat, no_whatsapp, 
  pekerjaan, pendidikan_terakhir, penghasilan_bulanan, 
  tinggal_bersama, bersedia_hadir, is_utama, created_at, updated_at
) VALUES (
  (SELECT id FROM santri WHERE nama_lengkap = 'MUHAMAD HAFIDH ASY'ARI' LIMIT 1),
  'SUYATMI', 'Ibu', 'Perempuan', 
  'MAGETAN', '1978-05-03', 'jalan wadungasri dalam gang bogoran RT 02 RW 03 belok kanan pos ronda belok kanan kost nomer 13', 
  '0814-5503-1674', 'Buruh / Pekerja Harian', 'SMP / MTs', '< Rp 1.000.000',
  true, true, false, NOW(), NOW()
);

-- Data Wali untuk INTAN NUR AINI
INSERT INTO public.santri_wali (
  santri_id, nama_lengkap, hubungan_keluarga, jenis_kelamin, 
  tempat_lahir, tanggal_lahir, alamat, no_whatsapp, 
  pekerjaan, pendidikan_terakhir, penghasilan_bulanan, 
  tinggal_bersama, bersedia_hadir, is_utama, created_at, updated_at
) VALUES (
  (SELECT id FROM santri WHERE nama_lengkap = 'INTAN NUR AINI' LIMIT 1),
  'SUWANDI', 'Ayah', 'Laki-laki', 
  'MAGETAN', '1976-11-11', 'jalan wadung asri dalam gang bogoran RT 02 RW 03 belok kanan pos ronda belok kanan kost nomer 13', 
  '0814-5503-1674', 'Buruh / Pekerja Harian', 'SMP / MTs', '< Rp 1.000.000',
  true, true, true, NOW(), NOW()
);

INSERT INTO public.santri_wali (
  santri_id, nama_lengkap, hubungan_keluarga, jenis_kelamin, 
  tempat_lahir, tanggal_lahir, alamat, no_whatsapp, 
  pekerjaan, pendidikan_terakhir, penghasilan_bulanan, 
  tinggal_bersama, bersedia_hadir, is_utama, created_at, updated_at
) VALUES (
  (SELECT id FROM santri WHERE nama_lengkap = 'INTAN NUR AINI' LIMIT 1),
  'SUYATMI', 'Ibu', 'Perempuan', 
  'MAGETAN', '1978-05-03', 'jalan wadung asri dalam gang bogoran RT 02 RW 03 belok kanan pos ronda belok kanan kost nomer 13', 
  '0877-2406-9838', 'Buruh / Pekerja Harian', 'SMP / MTs', '< Rp 1.000.000',
  true, true, false, NOW(), NOW()
);

-- Data Wali untuk MOCHAMAD IRSYAD HAFIZH
INSERT INTO public.santri_wali (
  santri_id, nama_lengkap, hubungan_keluarga, jenis_kelamin, 
  tempat_lahir, tanggal_lahir, alamat, no_whatsapp, 
  pekerjaan, pendidikan_terakhir, penghasilan_bulanan, 
  tinggal_bersama, bersedia_hadir, is_utama, created_at, updated_at
) VALUES (
  (SELECT id FROM santri WHERE nama_lengkap = 'MOCHAMAD IRSYAD HAFIZH' LIMIT 1),
  'MOCH . NUR HADI', 'Ayah', 'Laki-laki', 
  'SURABAYA', '1975-08-02', 'PERUMTAS lll BLOK L3 NO 19', 
  NULL, 'Buruh / Pekerja Harian', 'SMA / MA / SMK', '< Rp 1.000.000',
  true, true, true, NOW(), NOW()
);

INSERT INTO public.santri_wali (
  santri_id, nama_lengkap, hubungan_keluarga, jenis_kelamin, 
  tempat_lahir, tanggal_lahir, alamat, no_whatsapp, 
  pekerjaan, pendidikan_terakhir, penghasilan_bulanan, 
  tinggal_bersama, bersedia_hadir, is_utama, created_at, updated_at
) VALUES (
  (SELECT id FROM santri WHERE nama_lengkap = 'MOCHAMAD IRSYAD HAFIZH' LIMIT 1),
  'AFIFAH', 'Ibu', 'Perempuan', 
  'GRESIK', '1985-04-20', 'PERUMTAS lll BLOK L3 NO 19', 
  NULL, 'Ibu Rumah Tangga', 'SMA / MA / SMK', '< Rp 1.000.000',
  true, true, false, NOW(), NOW()
);

-- Data Wali untuk SHAFAQNAAZ EL HAMZAH
INSERT INTO public.santri_wali (
  santri_id, nama_lengkap, hubungan_keluarga, jenis_kelamin, 
  tempat_lahir, tanggal_lahir, alamat, no_whatsapp, 
  pekerjaan, pendidikan_terakhir, penghasilan_bulanan, 
  tinggal_bersama, bersedia_hadir, is_utama, created_at, updated_at
) VALUES (
  (SELECT id FROM santri WHERE nama_lengkap = 'SHAFAQNAAZ EL HAMZAH' LIMIT 1),
  'ZANUAR RUDY HAMZAH', 'Ayah', 'Laki-laki', 
  'SURABAYA', '1985-01-25', 'WONOKROMO 7/38 , KEL.WONOKROMO , KEC.WONOKROMO , KAB.SURABAYA', 
  NULL, 'Buruh / Pekerja Harian', 'SMA / MA / SMK', 'Rp 1.000.000 – Rp 2.000.000',
  true, true, true, NOW(), NOW()
);

-- Data Wali untuk RAZA SYIRAZI EL HAMZAH
INSERT INTO public.santri_wali (
  santri_id, nama_lengkap, hubungan_keluarga, jenis_kelamin, 
  tempat_lahir, tanggal_lahir, alamat, no_whatsapp, 
  pekerjaan, pendidikan_terakhir, penghasilan_bulanan, 
  tinggal_bersama, bersedia_hadir, is_utama, created_at, updated_at
) VALUES (
  (SELECT id FROM santri WHERE nama_lengkap = 'RAZA SYIRAZI EL HAMZAH' LIMIT 1),
  'ZANUAR RUDY HAMZAH', 'Ayah', 'Laki-laki', 
  'Wonokromo', NULL, 'Wonokromo 7/38', 
  '085707183185', 'Pegawai Swasta', 'SD / MI', 'Tidak tahu',
  true, true, true, NOW(), NOW()
);

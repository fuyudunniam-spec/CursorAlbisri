# 📚 MODUL SANTRI - Dokumentasi Lengkap

> **Sistem Manajemen Data Santri Komprehensif**  
> **Version**: 2.0  
> **Last Updated**: Oktober 10, 2025  
> **Status**: ✅ Production Ready

---

## 📑 Daftar Isi

1. [Overview](#overview)
2. [Database Schema](#database-schema)
3. [Fitur Utama](#fitur-utama)
4. [Setup & Instalasi](#setup--instalasi)
5. [Cara Penggunaan](#cara-penggunaan)
6. [Troubleshooting](#troubleshooting)

---

## 🎯 Overview

Modul Santri adalah sistem manajemen data santri yang mencakup:
- **Data Santri** - Biodata lengkap dengan kategori dan program
- **Program Santri** - Manajemen program dengan tarif komponen terstruktur
- **Dokumen Santri** - Upload dan tracking dokumen dengan requirement otomatis
- **Wali Santri** - Data wali/orang tua
- **Riwayat Status** - Tracking perubahan status santri

### Kategori Santri:
1. **Santri Binaan Mukim** - Santri asrama dengan bantuan penuh
2. **Santri Binaan Non-Mukim** - Santri pulang-pergi dengan bantuan
3. **Mahasantri Reguler** - Mahasiswa mandiri
4. **Mahasantri Beasiswa** - Mahasiswa dengan beasiswa
5. **Santri TPQ** - Santri TPQ anak-anak
6. **Santri Madin** - Santri Madrasah Diniyah

---

## 🗄️ Database Schema

### 1. **Tabel `santri`**

**Kolom Utama:**
```sql
- id (UUID, PK)
- nama_lengkap (VARCHAR, REQUIRED)
- nik (VARCHAR, UNIQUE)
- tempat_lahir, tanggal_lahir
- jenis_kelamin ('Laki-laki' | 'Perempuan')
- alamat_lengkap, kota, provinsi, kode_pos
- no_telepon, email
- agama (default: 'Islam')

-- Kategori & Program
- kategori (Santri Binaan Mukim/Non-Mukim/Mahasantri/TPQ/Madin)
- angkatan (VARCHAR, e.g., '2024')
- program_id (UUID, FK → program_santri)
- status_santri ('Aktif' | 'Nonaktif' | 'Alumni' | 'Cuti' | 'DO')
- tipe_pembayaran ('Bayar Sendiri' | 'Beasiswa Penuh' | 'Beasiswa Sebagian' | 'Gratis')

-- Kontak & Foto
- no_whatsapp (VARCHAR)
- foto_profil (TEXT, base64 atau URL)

-- Status Keluarga
- status_anak ('Yatim' | 'Piatu' | 'Yatim Piatu' | 'Dhuafa' | 'Utuh')

-- Metadata
- created_at, updated_at
```

**Indexes:**
- `idx_santri_kategori` on kategori
- `idx_santri_angkatan` on angkatan
- `idx_santri_status_anak` on status_anak
- `idx_santri_program_id` on program_id
- `idx_santri_status` on status_santri

### 2. **Tabel `santri_wali`**

```sql
- id (UUID, PK)
- santri_id (UUID, FK → santri)
- tipe_wali ('Ayah' | 'Ibu' | 'Wali')
- nama_wali (VARCHAR, REQUIRED)
- hubungan (VARCHAR)
- nik_wali (VARCHAR)
- tempat_lahir, tanggal_lahir
- alamat, no_telepon, no_whatsapp, email
- pekerjaan, penghasilan_bulanan
- status_hidup (BOOLEAN)
- created_at, updated_at
```

### 3. **Tabel `program_santri`**

```sql
- id (UUID, PK)
- kode_program (VARCHAR, UNIQUE, e.g., 'SANTRI-MUKIM')
- nama_program (VARCHAR, e.g., 'Santri Mukim SD/SMP/SMA')
- kategori ('Mukim' | 'Non-Mukim' | 'Mahasantri' | 'TPQ' | 'Madin' | 'Khusus')
- deskripsi (TEXT)
- status ('aktif' | 'nonaktif')
- total_tarif_per_bulan (DECIMAL, computed dari komponen)
- created_at, updated_at
```

**Default Programs:**
1. Santri Mukim SD/SMP/SMA (SANTRI-MUKIM) - Rp 1.500.000/bulan
2. Santri Non-Mukim TPQ (TPQ-NON-MUKIM) - Rp 25.000/bulan
3. Mahasantri Mukim (MAHASANTRI-MUKIM) - Rp 2.500.000/bulan
4. Santri Non-Mukim Madin (MADIN-NON-MUKIM) - Rp 50.000/bulan

### 4. **Tabel `komponen_biaya_program`**

```sql
- id (UUID, PK)
- program_id (UUID, FK → program_santri)
- nama_komponen (VARCHAR, e.g., 'Pendidikan Formal', 'Asrama & Konsumsi')
- kategori_komponen ('Pendidikan' | 'Asrama' | 'Konsumsi' | 'Fasilitas' | 'Lainnya')
- tarif_per_bulan (DECIMAL)
- is_wajib (BOOLEAN, default: true)
- keterangan (TEXT)
- urutan (INT)
- created_at, updated_at
```

**Contoh Komponen untuk Santri Mukim:**
- Pendidikan Formal: Rp 500.000
- Asrama & Konsumsi: Rp 800.000
- Pendidikan Internal (TPQ/Madin): Rp 100.000
- Lain-lain: Rp 100.000

### 5. **Tabel `dokumen_santri`**

```sql
- id (UUID, PK)
- santri_id (UUID, FK → santri)
- nama_dokumen (VARCHAR, e.g., 'KTP', 'Kartu Keluarga', 'Akta Kelahiran')
- kategori_dokumen ('Identitas' | 'Pendidikan' | 'Kesehatan' | 'Keluarga' | 'Lainnya')
- file_data (TEXT, base64)
- file_type (VARCHAR, e.g., 'application/pdf', 'image/jpeg')
- file_size (INT, bytes)
- tanggal_upload (DATE)
- status_verifikasi ('pending' | 'diverifikasi' | 'ditolak' | 'kadaluarsa')
- verifikasi_oleh (UUID, FK → auth.users)
- tanggal_verifikasi (TIMESTAMP)
- catatan_verifikasi (TEXT)
- tanggal_kadaluarsa (DATE)
- is_required (BOOLEAN)
- created_at, updated_at
```

**Document Requirements (Conditional):**
```
Santri Binaan Mukim → REQUIRED:
  - KTP Wali
  - Kartu Keluarga
  - Akta Kelahiran
  - Surat Keterangan Sehat
  - Pas Foto
  - Surat Rekomendasi
  - (Conditional) SKTM jika Dhuafa
  - (Conditional) Akta Kematian Ayah jika Yatim

Santri Binaan Non-Mukim → REQUIRED:
  - KTP Wali
  - Kartu Keluarga
  - Pas Foto

TPQ/Madin → OPTIONAL (minimal Kartu Keluarga)
```

### 6. **Tabel `riwayat_status_santri`**

```sql
- id (UUID, PK)
- santri_id (UUID, FK → santri)
- status_lama (VARCHAR)
- status_baru (VARCHAR)
- tanggal_perubahan (TIMESTAMP)
- alasan (TEXT)
- changed_by (UUID, FK → auth.users)
- created_at
```

---

## ✨ Fitur Utama

### 1. **CRUD Data Santri**

**Create:**
- Form multi-step dengan validasi
- Auto-generate fields berdasarkan kategori
- Upload foto profil (base64)
- Data wali (minimal 1, bisa lebih)

**Read:**
- List view dengan pagination
- Search: nama, NIK, alamat
- Filter: kategori, angkatan, status, program
- Detail view dengan tabs (Biodata, Wali, Dokumen, Program, Riwayat)

**Update:**
- Edit semua fields
- Track perubahan status otomatis (riwayat)
- Update foto

**Delete:**
- Soft delete (update status → nonaktif)
- Cascade delete wali & dokumen (optional)

### 2. **CSV Import/Export**

**Import:**
```csv
nama_lengkap,nik,tempat_lahir,tanggal_lahir,jenis_kelamin,kategori,angkatan,...
```
- UTF-8 dengan BOM
- Validasi per row
- Error handling per santri
- Bulk insert setelah validasi

**Export:**
- Export filtered data
- Include: biodata + wali + program
- Format Excel-compatible CSV

### 3. **Upload & Verifikasi Dokumen**

**Upload:**
- Component: `<UploadDokumenSantri />`
- Multiple files (max 5MB per file)
- Supported: PDF, JPG, PNG, DOCX
- Base64 encoding (no bucket needed)
- Auto-detect requirement based on kategori + status_anak

**Verification:**
- Component: `<DokumenVerifikasi />`
- Admin review dokumen
- Status: pending → diverifikasi/ditolak
- Catatan verifikasi
- Tanggal kadaluarsa (untuk KTP, KK, dll)

**Preview:**
- Component: `<DokumenPreview />`
- Inline PDF viewer
- Image viewer
- Download option

### 4. **Program Management**

**Page:** `/program-santri`

**Features:**
- List all programs dengan komponen
- Add/edit/deactivate program
- Manage komponen biaya
- Auto-calculate total tarif
- Assign santri to program

**Use Case:**
```
1. Admin buat program baru "Santri Kalong"
2. Tambah komponen:
   - Pendidikan: Rp 200.000
   - Konsumsi (2x sehari): Rp 300.000
3. Total otomatis: Rp 500.000/bulan
4. Assign santri ke program ini
5. Program tarif digunakan untuk:
   - Generate tagihan pembayaran
   - Calculate beasiswa (% dari total)
```

### 5. **Form Adaptif**

Form santri berubah berdasarkan:

**Kategori:**
```
Binaan Mukim:
  → Show: data asrama, requirement dokumen lengkap
  
Mahasantri:
  → Show: kampus, jurusan, semester
  
TPQ/Madin:
  → Simplified form, minimal data
```

**Status Anak:**
```
Yatim → Required: Akta Kematian Ayah
Dhuafa → Required: SKTM
Utuh → Standard documents
```

---

## 🚀 Setup & Instalasi

### Step 1: Run Database Migrations

**Via Supabase Dashboard:**

1. Login ke https://supabase.com/dashboard
2. Pilih project Anda
3. Go to **SQL Editor**
4. Run migrations **dengan urutan**:

**Migration 1:** Program Santri System
```bash
File: supabase/migrations/20251010000000_create_program_santri_system.sql
```
- Creates: `program_santri`, `komponen_biaya_program`, `riwayat_status_santri`
- Inserts: 4 default programs dengan komponen

**Migration 2:** Enhance Santri Table
```bash
File: supabase/migrations/20251010030000_enhance_santri_table.sql
```
- Adds: `kategori`, `angkatan`, `status_anak`, `no_whatsapp`, `foto_profil`, `program_id`
- Creates: Indexes untuk performance

**Migration 3:** Dokumen Santri Table
```bash
File: supabase/migrations/20251010040000_create_dokumen_santri_table.sql
```
- Creates: `dokumen_santri`
- Includes: Verification workflow

### Step 2: Verify Database

```sql
-- Check tables
SELECT table_name FROM information_schema.tables 
WHERE table_schema = 'public' 
AND table_name IN ('santri', 'santri_wali', 'program_santri', 'komponen_biaya_program', 'dokumen_santri', 'riwayat_status_santri');

-- Check programs
SELECT nama_program, total_tarif_per_bulan FROM program_santri WHERE status = 'aktif';

-- Check santri dengan program
SELECT s.nama_lengkap, s.kategori, p.nama_program 
FROM santri s 
LEFT JOIN program_santri p ON p.id = s.program_id 
LIMIT 10;
```

### Step 3: Update Existing Santri (Optional)

Jika ada santri existing tanpa kategori/program:

```sql
-- Set kategori default based on status_mukim
UPDATE santri 
SET kategori = CASE 
  WHEN status_mukim = 'Mukim' THEN 'Santri Binaan Mukim'
  WHEN status_mukim = 'Non-Mukim' THEN 'Santri Binaan Non-Mukim'
  ELSE 'Santri TPQ'
END,
status_anak = 'Utuh',
angkatan = '2024'
WHERE kategori IS NULL;

-- Assign to default programs
UPDATE santri s
SET program_id = (
  SELECT id FROM program_santri 
  WHERE kode_program = CASE 
    WHEN s.kategori = 'Santri Binaan Mukim' THEN 'SANTRI-MUKIM'
    WHEN s.kategori LIKE '%TPQ%' THEN 'TPQ-NON-MUKIM'
    ELSE 'SANTRI-MUKIM'
  END
  LIMIT 1
)
WHERE program_id IS NULL;
```

---

## 📖 Cara Penggunaan

### A. Menambah Santri Baru

**URL:** `/santri` → Click "Tambah Santri"

**Steps:**
1. **Tab Biodata:**
   - Isi nama lengkap, NIK, tempat/tanggal lahir
   - Pilih **Kategori** (Binaan Mukim/Non-Mukim/Mahasantri/TPQ/Madin)
   - Pilih **Program** dari dropdown (akan muncul program sesuai kategori)
   - Pilih **Status Anak** (Yatim/Piatu/Dhuafa/Utuh)
   - Upload foto profil (optional)
   
2. **Tab Data Wali:**
   - Minimal 1 wali (Ayah/Ibu/Wali lainnya)
   - Isi nama, hubungan, NIK, kontak
   - Isi pekerjaan & penghasilan (untuk beasiswa assessment)
   - Click "Tambah Wali" untuk wali kedua
   
3. **Tab Data Program:**
   - Lihat detail program yang dipilih
   - Lihat komponen biaya
   - Total tarif per bulan
   
4. **Tab Dokumen:**
   - Sistem auto-detect dokumen yang required
   - Upload dokumen satu per satu
   - Klik "Upload Dokumen" → pilih file → set nama dokumen
   - File akan di-encode base64 (no bucket needed)

**Save** → Data tersimpan, redirect ke detail santri

### B. Mengelola Program Santri

**URL:** `/program-santri`

**Membuat Program Baru:**
1. Click "Tambah Program"
2. Isi:
   - Kode Program (e.g., SANTRI-KALONG)
   - Nama Program (e.g., Santri Kalong Sore)
   - Kategori (Mukim/Non-Mukim/dll)
   - Deskripsi
3. Save

**Menambah Komponen Biaya:**
1. Click program card
2. Section "Komponen Biaya" → "Tambah Komponen"
3. Isi:
   - Nama Komponen (e.g., "Konsumsi 2x Sehari")
   - Kategori Komponen (Konsumsi)
   - Tarif: Rp 300.000
   - Is Wajib: Yes
4. Save
5. Total tarif program auto-update

**Use Case:**
```
Program: Mahasantri Subsidi
- Pendidikan Formal: Rp 1.000.000 (wajib)
- Asrama: Rp 500.000 (wajib)
- Konsumsi: Rp 600.000 (optional)
- Fasilitas: Rp 400.000 (optional)

Total Wajib: Rp 1.500.000
Total Lengkap: Rp 2.500.000

→ Santri bisa pilih paket sesuai kemampuan
```

### C. Upload & Verifikasi Dokumen

**Upload (by Santri/Admin):**
1. Go to detail santri → Tab "Dokumen"
2. Click "Upload Dokumen"
3. Pilih file (PDF/JPG/PNG, max 5MB)
4. Set nama dokumen (atau pilih dari dropdown)
5. Set kategori dokumen
6. Upload → Status: pending

**Verifikasi (by Admin):**
1. Go to dokumen list atau santri detail
2. Click dokumen → Preview muncul
3. Review isi dokumen
4. Options:
   - ✅ Verifikasi → Status: diverifikasi
   - ❌ Tolak → Input alasan → Status: ditolak
   - 📅 Set Tanggal Kadaluarsa (untuk KTP, KK, dll)

**Auto-Reminder:** (Future)
- Email/notif jika dokumen akan kadaluarsa (30 hari sebelum)

### D. Export Data Santri

**URL:** `/santri` → Filter data → Click "Export CSV"

**Export includes:**
- Biodata santri
- Data wali (first wali only)
- Program name & tarif
- Status

**Use for:**
- Laporan bulanan
- Import ke sistem lain
- Backup data

### E. Assign Santri ke Program

**Opsi 1: Saat Create**
- Pilih program di form tambah santri

**Opsi 2: Edit Existing**
- Edit santri → Update field `program_id`

**Opsi 3: Bulk Update (SQL)**
```sql
-- Assign semua santri mukim angkatan 2024 ke program "Santri Mukim"
UPDATE santri 
SET program_id = (SELECT id FROM program_santri WHERE kode_program = 'SANTRI-MUKIM')
WHERE kategori = 'Santri Binaan Mukim' 
AND angkatan = '2024'
AND program_id IS NULL;
```

---

## 🛠️ Troubleshooting

### Error: "Program dropdown kosong"

**Penyebab:** Belum ada program aktif  
**Solusi:**
1. Go to `/program-santri`
2. Create minimal 1 program
3. Set status = 'aktif'
4. Refresh form santri

### Error: "Upload dokumen failed"

**Possible causes:**
- File terlalu besar (max 5MB)
- Format tidak didukung (hanya PDF/JPG/PNG/DOCX)
- Base64 encoding error

**Solusi:**
- Compress file jika > 5MB
- Convert ke format yang didukung
- Check browser console untuk error detail

### Error: "relation program_santri does not exist"

**Penyebab:** Migration belum di-run  
**Solusi:** Run migration `20251010000000_create_program_santri_system.sql`

### Data Santri Existing Tanpa Kategori

**Solusi:** Run query update di Step 3 instalasi

### Form Tidak Muncul Field Kategori/Program

**Solusi:**
1. Hard refresh browser (Ctrl+Shift+R)
2. Check apakah migration `20251010030000_enhance_santri_table.sql` sudah run
3. Verify kolom `kategori` dan `program_id` exist di table santri

---

## 📊 Statistics & Reports

### Available Queries:

**1. Santri by Kategori:**
```sql
SELECT kategori, COUNT(*) as jumlah
FROM santri
WHERE status_santri = 'Aktif'
GROUP BY kategori
ORDER BY jumlah DESC;
```

**2. Santri by Program:**
```sql
SELECT 
  p.nama_program,
  COUNT(s.id) as jumlah_santri,
  p.total_tarif_per_bulan,
  COUNT(s.id) * p.total_tarif_per_bulan as total_revenue_potential
FROM program_santri p
LEFT JOIN santri s ON s.program_id = p.id AND s.status_santri = 'Aktif'
WHERE p.status = 'aktif'
GROUP BY p.id, p.nama_program, p.total_tarif_per_bulan
ORDER BY jumlah_santri DESC;
```

**3. Santri yang Perlu Dokumen:**
```sql
SELECT 
  s.nama_lengkap,
  s.kategori,
  s.status_anak,
  COUNT(d.id) as jumlah_dokumen_uploaded
FROM santri s
LEFT JOIN dokumen_santri d ON d.santri_id = s.id
WHERE s.kategori IN ('Santri Binaan Mukim', 'Santri Binaan Non-Mukim')
AND s.status_santri = 'Aktif'
GROUP BY s.id, s.nama_lengkap, s.kategori, s.status_anak
HAVING COUNT(d.id) < 5  -- Expected minimum documents
ORDER BY jumlah_dokumen_uploaded ASC;
```

**4. Dokumen Pending Verification:**
```sql
SELECT 
  s.nama_lengkap,
  d.nama_dokumen,
  d.tanggal_upload,
  CURRENT_DATE - d.tanggal_upload as hari_pending
FROM dokumen_santri d
JOIN santri s ON s.id = d.santri_id
WHERE d.status_verifikasi = 'pending'
ORDER BY d.tanggal_upload ASC;
```

---

## 🎯 Integration dengan Modul Lain

### 1. **Beasiswa**

Santri dengan `kategori` + `status_anak` digunakan untuk:
- Auto-detect eligibility untuk beasiswa Yatim/Dhuafa
- Program tarif sebagai basis perhitungan beasiswa
- Dokumen SKTM/Akta Kematian untuk verifikasi

### 2. **Keuangan - Pembayaran**

Program tarif digunakan untuk:
- Generate tagihan pembayaran bulanan
- Auto-calculate total tagihan berdasarkan komponen
- Diskon beasiswa berdasarkan % dari total tarif

### 3. **Monitoring**

Data santri digunakan untuk:
- Tracking kehadiran
- Penilaian akademik
- Rapor & evaluasi

### 4. **Koperasi**

Data santri untuk:
- Member koperasi
- Transaksi pembelian
- Saldo tabungan

---

## 🎓 Best Practices

### 1. **Data Entry**

- **NIK** harus unique (validasi duplikasi)
- **Kategori** harus sesuai dengan kondisi real santri
- **Program** pilih yang sesuai dengan kategori
- **Dokumen** upload segera setelah santri terdaftar
- **Foto profil** untuk identifikasi (recommended)

### 2. **Program Management**

- Review tarif setiap tahun ajaran baru
- Nonaktifkan program yang sudah tidak digunakan (jangan delete)
- Komponen biaya harus jelas & transparent
- Update dokumentasi jika ada perubahan

### 3. **Document Management**

- Verifikasi dokumen maksimal 7 hari setelah upload
- Set tanggal kadaluarsa untuk dokumen identitas
- Backup dokumen penting secara berkala
- Arsip dokumen santri yang sudah alumni

### 4. **Security**

- RLS policies protect data per user
- Admin only bisa verifikasi dokumen
- Santri/Wali hanya bisa upload (not verify)
- Sensitive documents (SKTM, Akta) are protected

---

## 📝 File Komponen

### Pages:
- `src/pages/Santri.tsx` - Main list & CRUD
- `src/pages/SantriEdit.tsx` - Edit form
- `src/pages/SantriProfile.tsx` - Detail view
- `src/pages/ProgramSantri.tsx` - Program management

### Components:
- `src/components/SantriForm.tsx` - Form create/edit
- `src/components/SantriPreview.tsx` - Preview card
- `src/components/SantriProfilePreview.tsx` - Profile detail
- `src/components/UploadDokumenSantri.tsx` - Upload interface
- `src/components/DokumenPreview.tsx` - Document viewer
- `src/components/DokumenVerifikasi.tsx` - Verification interface

---

## 🏁 Summary

### ✅ Apa yang Sudah Ada:

- ✅ Database schema lengkap (6 tables)
- ✅ CRUD santri dengan form adaptif
- ✅ Program management dengan komponen biaya
- ✅ Upload dokumen dengan base64 (no bucket)
- ✅ Verifikasi dokumen workflow
- ✅ CSV import/export
- ✅ Integration dengan beasiswa & pembayaran
- ✅ Tracking riwayat status

### 🔄 Apa yang Bisa Ditingkatkan (Future):

- [ ] Bulk edit santri (update multiple santri)
- [ ] Document reminder (email/WA untuk dokumen kadaluarsa)
- [ ] QR code untuk santri ID card
- [ ] Print ID card otomatis
- [ ] Absensi integration
- [ ] Parent portal (login untuk wali)

---

**Modul Santri siap digunakan untuk mengelola data santri dengan lebih terstruktur dan professional!** ✅

---

**Created:** Oktober 10, 2025  
**Version:** 2.0  
**Type:** Complete System Documentation


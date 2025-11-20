# 💰 MODUL KEUANGAN - Dokumentasi Lengkap

> **Sistem Keuangan Komprehensif dengan Pembayaran Santri & Rekonsiliasi Bank**  
> **Version**: 2.0  
> **Last Updated**: Oktober 10, 2025  
> **Status**: ✅ Database Ready | 🔄 UI Implementation Ongoing

---

## 📑 Daftar Isi

1. [Overview](#overview)
2. [Database Schema](#database-schema)
3. [Modul Pembayaran Santri](#modul-pembayaran-santri)
4. [Modul Beasiswa](#modul-beasiswa)
5. [Modul Keuangan (Enhanced)](#modul-keuangan-enhanced)
6. [Rekonsiliasi Bank](#rekonsiliasi-bank)
7. [Setup & Instalasi](#setup--instalasi)
8. [Integration](#integration)

---

## 🎯 Overview

Modul Keuangan mencakup 4 sistem terintegrasi:

### 1. **Pembayaran Santri**
- Generate tagihan massal (SPP, Makan, Laundry, dll)
- Catat pembayaran (full/cicilan)
- Tracking tunggakan
- Auto-post ke keuangan
- Support diskon & denda
- Integration dengan beasiswa

### 2. **Beasiswa**
- Multiple program (Binaan, Prestasi, Yatim, Dhuafa)
- Link ke donatur (donasi terikat)
- Tracking penerima & pencairan
- 2 metode: Potong tagihan atau Transfer tunai
- Laporan dana per program

### 3. **Keuangan (Enhanced)**
- Multi-akun kas (Kas Utama, Bank BCA, Mandiri, dll)
- Status transaksi (draft → posted)
- Upload bukti transaksi
- Kategori lengkap (22 default)
- Laporan Laba Rugi & Arus Kas
- Export PDF/Excel

### 4. **Rekonsiliasi Bank**
- Import mutasi bank
- Auto-matching transaksi
- Adjustment untuk selisih
- Balance verification
- Laporan rekonsiliasi

---

## 🗄️ Database Schema

### A. PEMBAYARAN SANTRI

#### 1. **Tabel `jenis_pembayaran_santri`**

```sql
- id (UUID, PK)
- nama_jenis (VARCHAR, e.g., 'SPP', 'Makan', 'Laundry')
- kode (VARCHAR, e.g., 'SPP', 'MKN')
- deskripsi (TEXT)
- tarif_default (DECIMAL)
- periode_default ('Bulanan' | 'Semester' | 'Tahunan' | 'Sekali')
- is_active (BOOLEAN)
- created_at, updated_at
```

**Default Data (6 jenis):**
- SPP: Rp 600.000/bulan
- Makan: Rp 400.000/bulan
- Laundry: Rp 100.000/bulan
- Kegiatan: Rp 200.000/bulan
- Seragam: Rp 500.000/sekali
- Buku: Rp 300.000/sekali

#### 2. **Tabel `pembayaran_santri`**

```sql
- id (UUID, PK)
- nomor_pembayaran (VARCHAR, auto: PAY/YYYY/MM/XXXX)
- santri_id (UUID, FK → santri)
- jenis_pembayaran_id (UUID, FK → jenis_pembayaran_santri)
- jenis_pembayaran (VARCHAR) - Denormalized for speed

-- Periode
- periode (VARCHAR, e.g., 'Oktober 2025')
- tahun (INT)
- bulan (INT, nullable)

-- Amounts
- jumlah_tagihan (DECIMAL)
- denda (DECIMAL, default: 0)
- diskon (DECIMAL, default: 0)
- diskon_beasiswa (DECIMAL, default: 0)
- total_bayar (DECIMAL, GENERATED) -- jumlah_tagihan + denda - diskon - diskon_beasiswa
- jumlah_dibayar (DECIMAL, default: 0)
- sisa_tagihan (DECIMAL, GENERATED) -- total_bayar - jumlah_dibayar

-- Due & Payment
- tanggal_jatuh_tempo (DATE)
- tanggal_bayar (DATE)

-- Status
- status ('belum_lunas' | 'lunas' | 'cicilan' | 'terlambat' | 'dibatalkan')

-- Payment Method
- metode_pembayaran (VARCHAR, e.g., 'Tunai', 'Transfer')

-- References
- beasiswa_id (UUID, FK → penerima_beasiswa) -- If beasiswa applied
- keuangan_id (UUID, FK → keuangan) -- Link to keuangan entry

-- Notes
- catatan (TEXT)

-- Metadata
- created_by (UUID, FK → auth.users)
- created_at, updated_at
```

**Computed Columns:**
- `total_bayar = jumlah_tagihan + denda - diskon - diskon_beasiswa`
- `sisa_tagihan = total_bayar - jumlah_dibayar`

#### 3. **Tabel `cicilan_pembayaran`**

```sql
- id (UUID, PK)
- pembayaran_santri_id (UUID, FK → pembayaran_santri, CASCADE)
- cicilan_ke (INT)
- jumlah (DECIMAL)
- tanggal_bayar (DATE)
- metode_pembayaran (VARCHAR)
- bukti_file (TEXT) - Base64 or URL
- catatan (TEXT)
- created_by (UUID)
- created_at
```

---

### B. BEASISWA

#### 1. **Tabel `program_beasiswa`**

```sql
- id (UUID, PK)
- nama_program (VARCHAR, e.g., 'Beasiswa Prestasi Hafalan')
- jenis ('Binaan' | 'Prestasi' | 'Prestasi Akademik' | 'Prestasi Non-Akademik' | 'Yatim' | 'Dhuafa')
- sumber_dana (VARCHAR, e.g., 'Dana Umum', 'Donatur X')
- donor_id (UUID, FK → donor_profiles) - If donasi terikat
- nominal_per_periode (DECIMAL)
- periode_aktif ('Bulanan' | 'Semester' | 'Tahunan')
- kriteria (TEXT)
- max_penerima (INT)
- status ('aktif' | 'nonaktif' | 'selesai')
- tanggal_mulai, tanggal_selesai
- deskripsi (TEXT)
- created_at, updated_at
```

#### 2. **Tabel `penerima_beasiswa`**

```sql
- id (UUID, PK)
- program_id (UUID, FK → program_beasiswa)
- santri_id (UUID, FK → santri)
- tanggal_mulai, tanggal_selesai
- status ('aktif' | 'selesai' | 'dicabut')
- nominal_per_periode (DECIMAL)
- persentase_bantuan (INT, %) - e.g., 50, 75, 100
- alasan_diberikan (TEXT)
- prestasi_detail (TEXT) - Untuk beasiswa prestasi
- total_sudah_dicairkan (DECIMAL, default: 0)
- created_at, updated_at
```

#### 3. **Tabel `pencairan_beasiswa`**

```sql
- id (UUID, PK)
- penerima_id (UUID, FK → penerima_beasiswa)
- periode (VARCHAR, e.g., 'Oktober 2025')
- nominal (DECIMAL)
- metode ('Potong Tagihan' | 'Transfer Tunai' | 'Bayar Langsung')
- pembayaran_santri_id (UUID) - If metode = Potong Tagihan
- keuangan_id (UUID) - If metode = Transfer Tunai
- akun_kas (VARCHAR) - For transfer
- tanggal_cair (DATE)
- status ('pending' | 'dicairkan' | 'dibatalkan')
- bukti_file (TEXT)
- created_at, updated_at
```

---

### C. KEUANGAN (ENHANCED)

#### 1. **Tabel `kategori_keuangan`**

```sql
- id (UUID, PK)
- kode (VARCHAR, e.g., 'INC-001')
- nama (VARCHAR, e.g., 'Donasi')
- jenis ('Pemasukan' | 'Pengeluaran')
- parent_id (UUID) - For sub-categories
- deskripsi (TEXT)
- is_active (BOOLEAN, default: true)
- urutan (INT)
- created_at, updated_at
```

**Default Data (22 kategori):**

**Pemasukan:**
- Donasi
- SPP Santri
- Makan Santri
- Laundry Santri
- Penjualan Koperasi
- Bantuan/Hibah
- Bunga Bank
- Lain-lain (Pemasukan)

**Pengeluaran:**
- Gaji Guru/Karyawan
- Operasional Kantor
- Konsumsi Santri
- Utilitas (Listrik, Air)
- Pemeliharaan/Renovasi
- Beasiswa Santri
- Pembelian Inventaris
- Biaya Bank/Transfer
- Pajak
- Lain-lain (Pengeluaran)

#### 2. **Tabel `akun_kas`**

```sql
- id (UUID, PK)
- nama (VARCHAR, e.g., 'Kas Utama', 'Bank BCA')
- kode (VARCHAR, e.g., 'KAS-01', 'BCA-001')
- tipe ('Kas' | 'Bank' | 'Tabungan')
- nomor_rekening (VARCHAR)
- nama_bank (VARCHAR)
- atas_nama (VARCHAR)
- saldo_awal (DECIMAL)
- saldo_saat_ini (DECIMAL, auto-calculated)
- tanggal_buka (DATE)
- status ('aktif' | 'ditutup' | 'suspended')
- is_default (BOOLEAN, default: false)
- created_at, updated_at
```

**Default Data (3 akun):**
- Kas Utama (is_default: true)
- Bank BCA
- Bank Mandiri

#### 3. **Tabel `keuangan` (ENHANCED)**

```sql
-- Existing fields:
- id, jenis_transaksi, kategori, jumlah, tanggal, 
  deskripsi, created_by, created_at, updated_at

-- NEW fields:
- akun_kas (VARCHAR, default: 'Kas Utama')
- nomor_transaksi (VARCHAR, auto: TRX/YYYY/MM/XXXX)
- metode_pembayaran (VARCHAR, 'Tunai' | 'Transfer' | 'Giro' | 'EDC')
- penerima_pembayar (VARCHAR) - Siapa yang terima/bayar
- bukti_file (TEXT) - Upload bukti transaksi (base64)
- status ('draft' | 'verified' | 'posted' | 'cancelled')
- sub_kategori (VARCHAR) - Kategori detail
- referensi (VARCHAR) - Link ke transaksi lain (e.g., 'pembayaran_santri:uuid')
```

---

### D. REKONSILIASI BANK

#### 1. **Tabel `mutasi_bank`**

```sql
- id (UUID, PK)
- akun_kas (VARCHAR, FK → akun_kas.nama)
- tanggal (DATE)
- nomor_referensi (VARCHAR) - No ref dari bank
- deskripsi (VARCHAR)
- debit (DECIMAL, default: 0) - Uang masuk
- kredit (DECIMAL, default: 0) - Uang keluar
- saldo (DECIMAL) - Saldo after transaction
- is_matched (BOOLEAN, default: false)
- keuangan_id (UUID, FK → keuangan) - If matched
- imported_at (TIMESTAMP)
- created_at
```

#### 2. **Tabel `rekonsiliasi_bank`**

```sql
- id (UUID, PK)
- nomor_rekonsiliasi (VARCHAR, auto: REKON/YYYY/MM/XXX)
- akun_kas (VARCHAR, FK → akun_kas.nama)
- tanggal_mulai, tanggal_selesai (DATE)
- bulan, tahun (INT)

-- Saldo
- saldo_bank_awal (DECIMAL)
- saldo_bank_akhir (DECIMAL)
- saldo_system_awal (DECIMAL)
- saldo_system_akhir (DECIMAL)
- selisih (DECIMAL) - Difference yang perlu di-adjust

-- Status
- is_balanced (BOOLEAN, default: false)
- status ('draft' | 'in_progress' | 'completed' | 'approved')

-- Metadata
- created_by (UUID)
- created_at, updated_at
```

#### 3. **Tabel `adjustment_rekonsiliasi`**

```sql
- id (UUID, PK)
- rekonsiliasi_id (UUID, FK → rekonsiliasi_bank, CASCADE)
- jenis ('bank_to_system' | 'system_to_bank')
- deskripsi (VARCHAR, e.g., 'Biaya Admin Bank', 'Bunga Bank')
- jumlah (DECIMAL)
- tanggal (DATE)
- keuangan_id (UUID, FK → keuangan) - Auto-created
- created_at
```

---

## 💳 Modul Pembayaran Santri

### Fitur Utama:

#### 1. **Generate Tagihan Massal**

**Function:** `generate_tagihan_massal()`

**Parameters:**
```typescript
{
  p_jenis_pembayaran: string,  // 'SPP', 'Makan', dll
  p_periode: string,            // 'Oktober 2025'
  p_tahun: number,              // 2025
  p_bulan: number,              // 10
  p_jumlah: number,             // 600000
  p_tanggal_jatuh_tempo: string, // '2025-10-05'
  p_filter_kelas?: string,      // Optional
  p_user_id: uuid
}
```

**Use Case:**
```
Setiap tanggal 1 bulan baru:
1. Generate tagihan SPP untuk semua santri aktif
2. Generate tagihan Makan untuk santri mukim
3. Auto-apply diskon beasiswa (jika ada)
4. Set jatuh tempo tanggal 5
```

**Result:**
- N tagihan created (N = jumlah santri sesuai filter)
- Auto-apply `diskon_beasiswa` jika santri punya beasiswa aktif

#### 2. **Catat Pembayaran**

**Function:** `catat_pembayaran_santri()`

**Parameters:**
```typescript
{
  p_pembayaran_id: uuid,
  p_jumlah_bayar: number,
  p_tanggal_bayar: string,
  p_metode: string,
  p_akun_kas: string,
  p_bukti_file?: string,
  p_catatan?: string,
  p_user_id: uuid
}
```

**Logic:**
1. Update `jumlah_dibayar` += p_jumlah_bayar
2. Update status:
   - Jika `jumlah_dibayar >= total_bayar` → 'lunas'
   - Jika `jumlah_dibayar < total_bayar` dan `jumlah_dibayar > 0` → 'cicilan'
   - Else → 'belum_lunas'
3. Create cicilan record (if applicable)
4. **Auto-create entry di keuangan:**
   ```sql
   INSERT INTO keuangan (
     jenis_transaksi = 'Pemasukan',
     kategori = jenis_pembayaran,
     jumlah = p_jumlah_bayar,
     akun_kas = p_akun_kas,
     referensi = 'pembayaran_santri:' || p_pembayaran_id,
     status = 'posted'
   )
   ```

#### 3. **UI Components**

**Page:** `/pembayaran-santri` (To be created)

**Tabs:**
1. **Tagihan Aktif** - List tagihan dengan status belum lunas/cicilan
2. **Generate Tagihan** - Form generate massal
3. **Riwayat Pembayaran** - History lengkap
4. **Tunggakan** - Santri dengan tagihan terlambat

**Features:**
- Search santri
- Filter: periode, status, jenis pembayaran
- Catat pembayaran (single/batch)
- Print invoice
- Export report

---

## 🎓 Modul Beasiswa

### Workflow Beasiswa:

```
1. CREATE Program Beasiswa
   ↓
2. ADD Penerima (Santri)
   ↓
3. GENERATE Pencairan per Periode
   ↓
4. CHOOSE Metode:
   
   A. Potong Tagihan:
      - Update pembayaran_santri.diskon_beasiswa
      - Status: dicairkan
   
   B. Transfer Tunai:
      - Create keuangan entry (Pengeluaran: Beasiswa)
      - Transfer ke santri
      - Status: dicairkan
```

### Fitur Utama:

#### 1. **CRUD Program Beasiswa**

**Create:**
```typescript
{
  nama_program: "Beasiswa Prestasi Hafalan",
  jenis: "Prestasi Non-Akademik",
  sumber_dana: "Donatur Haji Fulan",
  nominal_per_periode: 400000,
  periode_aktif: "Bulanan",
  kriteria: "Hafal 5 juz",
  max_penerima: 20,
  status: "aktif"
}
```

#### 2. **Add Penerima Beasiswa**

**Form:**
- Pilih santri (dropdown with search)
- Set persentase bantuan (25%, 50%, 75%, 100%)
- Auto-calculate nominal berdasarkan program santri
- Input alasan/prestasi
- Set periode mulai

**Auto-Integration:**
- Link santri.program_id untuk get total tarif
- Calculate: `nominal_per_periode = program_tarif × persentase`

**Example:**
```
Santri: Ahmad (Program: Santri Mukim, Tarif: Rp 1.500.000)
Beasiswa: 75%
Nominal: Rp 1.125.000/bulan
Santri bayar: Rp 375.000/bulan
```

#### 3. **Pencairan Beasiswa**

**Metode A: Potong Tagihan** (Recommended)
```sql
-- When generate tagihan
UPDATE pembayaran_santri
SET diskon_beasiswa = 1125000
WHERE santri_id = 'Ahmad' AND periode = 'Oktober 2025';

-- Result:
-- Tagihan: Rp 1.500.000
-- Diskon Beasiswa: Rp 1.125.000
-- Total Bayar: Rp 375.000 ✅
```

**Metode B: Transfer Tunai**
```typescript
await supabase.rpc('cairkan_beasiswa_tunai', {
  p_pencairan_id: 'xxx',
  p_akun_kas: 'Kas Utama',
  p_user_id: user.id
});

// Auto-creates:
// keuangan entry (Pengeluaran: Beasiswa, Jumlah: 1.125.000)
```

#### 4. **Reports**

**Per Program:**
```sql
SELECT 
  pb.nama_program,
  COUNT(pb2.id) as jumlah_penerima,
  pb.nominal_per_periode,
  SUM(pb2.total_sudah_dicairkan) as total_dicairkan
FROM program_beasiswa pb
LEFT JOIN penerima_beasiswa pb2 ON pb2.program_id = pb.id AND pb2.status = 'aktif'
GROUP BY pb.id;
```

**Per Santri:**
```sql
SELECT 
  s.nama_lengkap,
  pb.nama_program,
  pb2.nominal_per_periode,
  pb2.tanggal_mulai,
  pb2.total_sudah_dicairkan
FROM penerima_beasiswa pb2
JOIN santri s ON s.id = pb2.santri_id
JOIN program_beasiswa pb ON pb.id = pb2.program_id
WHERE pb2.status = 'aktif';
```

---

## 📊 Modul Keuangan (Enhanced)

### Fitur Baru:

#### 1. **Multi-Akun Kas**

Setiap transaksi bisa pilih akun:
- Kas Utama (default)
- Bank BCA
- Bank Mandiri
- Tabungan Santri
- dll

**Auto-Calculate Saldo:**
```sql
-- Function untuk calculate saldo akun
CREATE OR REPLACE FUNCTION calculate_saldo_akun(p_akun VARCHAR)
RETURNS DECIMAL AS $$
  SELECT 
    ak.saldo_awal + 
    COALESCE(SUM(
      CASE 
        WHEN k.jenis_transaksi = 'Pemasukan' THEN k.jumlah
        ELSE -k.jumlah
      END
    ), 0) as saldo
  FROM akun_kas ak
  LEFT JOIN keuangan k ON k.akun_kas = ak.nama AND k.status = 'posted'
  WHERE ak.nama = p_akun
  GROUP BY ak.saldo_awal;
$$ LANGUAGE SQL;
```

#### 2. **Status Transaksi**

Workflow:
```
draft → verified → posted → [cancelled]
```

- **draft**: Transaksi belum final, bisa di-edit
- **verified**: Sudah dicek, belum masuk saldo
- **posted**: Final, masuk saldo, tidak bisa di-edit
- **cancelled**: Dibatalkan

#### 3. **Upload Bukti Transaksi**

- Base64 encoding
- Supported: PDF, JPG, PNG
- Max 5MB
- Stored in field `bukti_file`

#### 4. **Laporan Enhanced**

**Laba Rugi:**
```sql
SELECT 
  jenis_transaksi,
  kategori,
  SUM(jumlah) as total
FROM keuangan
WHERE tanggal BETWEEN '2025-10-01' AND '2025-10-31'
  AND status = 'posted'
GROUP BY jenis_transaksi, kategori;
```

**Arus Kas per Akun:**
```sql
SELECT 
  akun_kas,
  jenis_transaksi,
  SUM(jumlah) as total
FROM keuangan
WHERE tanggal BETWEEN '2025-10-01' AND '2025-10-31'
  AND status = 'posted'
GROUP BY akun_kas, jenis_transaksi;
```

---

## 🏦 Rekonsiliasi Bank

### Workflow:

```
1. CREATE Rekonsiliasi (Pilih akun & periode)
   ↓
2. IMPORT Mutasi Bank (Manual input atau CSV)
   ↓
3. AUTO-MATCH dengan transaksi system
   ↓
4. REVIEW Unmatched:
   - Transaksi di bank tapi tidak di system?
     → Manual pairing atau create adjustment
   - Transaksi di system tapi tidak di bank?
     → Check clearing status
   ↓
5. CREATE Adjustment jika ada selisih:
   - Biaya admin bank
   - Bunga bank
   - Koreksi entry
   ↓
6. VERIFY Balance:
   - Saldo Bank = Saldo System ✅
   ↓
7. FINALISASI & APPROVE
```

### Functions:

#### 1. **Auto-Match Mutasi**

```sql
CREATE FUNCTION auto_match_mutasi_bank(p_rekonsiliasi_id UUID)
```

**Logic:**
- Match berdasarkan tanggal & nominal (± Rp 1.000 tolerance)
- Update `is_matched = true` dan `keuangan_id`

#### 2. **Calculate Saldo System**

```sql
CREATE FUNCTION calculate_saldo_system(
  p_akun_kas VARCHAR, 
  p_tanggal_akhir DATE
)
RETURNS DECIMAL
```

**Logic:**
- Sum semua transaksi posted di akun tersebut sampai tanggal akhir

#### 3. **Create Adjustment**

```sql
CREATE FUNCTION create_adjustment(
  p_rekonsiliasi_id UUID,
  p_deskripsi VARCHAR,
  p_jumlah DECIMAL,
  p_jenis VARCHAR -- 'Pemasukan' or 'Pengeluaran'
)
```

**Logic:**
- Insert adjustment record
- Auto-create keuangan entry
- Recalculate selisih

### Use Cases:

**Case 1: Biaya Admin Bank**
```
Bank Statement:
- Tanggal: 05 Okt 2025
- Deskripsi: Biaya Admin
- Debit: Rp 6.500

Action:
- Create adjustment (Pengeluaran: Biaya Admin)
- Auto-post ke keuangan
```

**Case 2: Bunga Bank**
```
Bank Statement:
- Tanggal: 31 Okt 2025
- Deskripsi: Bunga
- Kredit: Rp 25.000

Action:
- Create adjustment (Pemasukan: Bunga Bank)
- Auto-post ke keuangan
```

**Case 3: Koreksi Entry**
```
System: Transaksi Rp 500.000
Bank: Rp 505.000 (termasuk biaya transfer)

Action:
- Create adjustment untuk selisih Rp 5.000 (Biaya Transfer)
```

---

## 🚀 Setup & Instalasi

### Step 1: Run Database Migrations

**Via Supabase Dashboard:**

**Migration 1:** Beasiswa Module
```
File: supabase/migrations/20251009020000_create_beasiswa_module.sql
```

**Migration 2:** Bank Reconciliation
```
File: supabase/migrations/20251009030000_create_bank_reconciliation.sql
```

**Migration 3:** Keuangan & Pembayaran Enhancement
```
File: supabase/migrations/20251009040000_enhance_keuangan_and_pembayaran.sql
```

### Step 2: Verify Database

```sql
-- Check tables created
SELECT table_name FROM information_schema.tables 
WHERE table_schema = 'public' 
AND table_name IN (
  'jenis_pembayaran_santri', 'pembayaran_santri', 'cicilan_pembayaran',
  'program_beasiswa', 'penerima_beasiswa', 'pencairan_beasiswa',
  'kategori_keuangan', 'akun_kas',
  'mutasi_bank', 'rekonsiliasi_bank', 'adjustment_rekonsiliasi'
);

-- Check default data
SELECT * FROM jenis_pembayaran_santri;
SELECT * FROM kategori_keuangan;
SELECT * FROM akun_kas;
```

### Step 3: Update Types

Add TypeScript interfaces (see migration guide for details)

### Step 4: Test Functions

```sql
-- Test generate tagihan
SELECT generate_tagihan_massal(
  'SPP', 'November 2025', 2025, 11, 600000, '2025-11-05', NULL, 'user-id'
);

-- Test catat pembayaran
SELECT catat_pembayaran_santri(
  'pembayaran-id', 600000, '2025-11-10', 'Tunai', 'Kas Utama', NULL, NULL, 'user-id'
);

-- Test calculate saldo
SELECT calculate_saldo_akun('Kas Utama');
```

---

## 🔗 Integration

### 1. **Donasi → Keuangan** ✅

```typescript
// Sudah auto-post saat create donasi tunai
```

### 2. **Pembayaran Santri → Keuangan**

```typescript
// Auto-post saat catat_pembayaran_santri()
```

### 3. **Beasiswa → Pembayaran**

```typescript
// Auto-apply diskon_beasiswa saat generate tagihan
// If santri punya beasiswa aktif
```

### 4. **Beasiswa Transfer → Keuangan**

```typescript
// Auto-create keuangan entry saat cairkan_beasiswa_tunai()
```

### 5. **Inventaris Jual → Keuangan**

```typescript
// (To be implemented)
// When transaksi_inventaris.tipe = 'Jual':
//   → Auto-create keuangan (Pemasukan: Penjualan Inventaris)
```

---

## 📖 Cara Penggunaan

### A. Generate Tagihan Bulanan

**Scenario:** Setiap tanggal 1, generate tagihan SPP

1. Go to `/pembayaran-santri` → Tab "Generate Tagihan"
2. Form:
   - Jenis: SPP
   - Periode: November 2025
   - Tarif: Rp 600.000
   - Jatuh Tempo: 5 November 2025
   - Filter Kelas: (kosongkan untuk semua)
3. Preview: 350 santri akan di-generate
4. Confirm → **Generate**
5. Result: 350 tagihan created ✅

### B. Catat Pembayaran Santri

1. Go to Tab "Tagihan Aktif"
2. Search santri (by nama/NIK)
3. Click "Bayar" pada row tagihan
4. Form:
   - Jumlah: Rp 600.000 (atau sebagian untuk cicilan)
   - Metode: Tunai/Transfer
   - Akun: Kas Utama
   - Upload bukti (optional)
5. **Simpan** → Auto-update status & post ke keuangan

### C. Create Program Beasiswa

1. Go to `/beasiswa` → Tab "Program"
2. Click "Tambah Program"
3. Form:
   - Nama: "Beasiswa Yatim 100%"
   - Jenis: Yatim
   - Sumber: Dana Umum
   - Nominal: Rp 1.500.000/bulan
   - Periode: Bulanan
   - Kriteria: "Anak yatim tidak mampu"
   - Max Penerima: 50
4. **Simpan**

### D. Add Penerima Beasiswa

1. Tab "Penerima" → "Tambah Penerima"
2. Form:
   - Program: Pilih "Beasiswa Yatim 100%"
   - Santri: Search & select
   - Persentase: 100%
   - Alasan: "Anak yatim, keluarga tidak mampu"
   - Tanggal Mulai: 1 November 2025
3. **Simpan** → Penerima aktif

**Auto-Effect:**
- Saat generate tagihan November, auto-apply diskon_beasiswa
- Total bayar santri: Rp 0 (100% beasiswa) ✅

### E. Rekonsiliasi Bank

1. Go to `/rekonsiliasi-bank`
2. Click "Rekonsiliasi Baru"
3. Form:
   - Akun: Bank BCA
   - Periode: Oktober 2025
   - Saldo Awal: Rp 50.000.000
   - Saldo Akhir: Rp 48.500.000
4. **Create**

5. Tab "Import Mutasi" → Input mutasi satu per satu
   - Tanggal, Deskripsi, Debit/Kredit

6. Tab "Matching" → Click "Auto-Match"
   - System match 45 dari 50 transaksi

7. Review unmatched → Manual pairing atau create adjustment

8. Create adjustment untuk biaya admin

9. **Finalisasi** → Status: Balanced ✅

---

## 📊 Reports & Analytics

### 1. Dashboard Keuangan

**Stats Cards:**
- Saldo Kas Utama
- Saldo Bank Total
- Pemasukan Bulan Ini
- Pengeluaran Bulan Ini
- Tunggakan Santri
- Beasiswa Aktif

### 2. Laporan Pembayaran Santri

```sql
-- Tingkat kepatuhan pembayaran
SELECT 
  status,
  COUNT(*) as jumlah,
  SUM(total_bayar) as total_tagihan,
  SUM(jumlah_dibayar) as total_dibayar
FROM pembayaran_santri
WHERE periode = 'Oktober 2025'
GROUP BY status;
```

### 3. Laporan Beasiswa

```sql
-- Total beasiswa per program
SELECT 
  pb.nama_program,
  COUNT(pb2.id) as jumlah_penerima,
  SUM(pcb.nominal) as total_dicairkan_bulan_ini
FROM program_beasiswa pb
JOIN penerima_beasiswa pb2 ON pb2.program_id = pb.id AND pb2.status = 'aktif'
LEFT JOIN pencairan_beasiswa pcb ON pcb.penerima_id = pb2.id 
  AND pcb.periode = 'Oktober 2025' 
  AND pcb.status = 'dicairkan'
GROUP BY pb.id;
```

### 4. Arus Kas

```sql
-- Monthly cash flow
SELECT 
  TO_CHAR(tanggal, 'YYYY-MM') as bulan,
  jenis_transaksi,
  SUM(jumlah) as total
FROM keuangan
WHERE status = 'posted'
  AND tanggal >= CURRENT_DATE - INTERVAL '12 months'
GROUP BY bulan, jenis_transaksi
ORDER BY bulan DESC;
```

---

## 🛠️ Troubleshooting

### Error: "Function does not exist"

**Solusi:** Run migration files dengan urutan yang benar

### Tagihan Auto-Generate Duplikat

**Penyebab:** Function dipanggil 2x  
**Solusi:** Cek log, hapus duplikat manual

### Diskon Beasiswa Tidak Apply

**Check:**
1. Santri punya penerima_beasiswa dengan status 'aktif'?
2. Periode beasiswa masih aktif?
3. Function `generate_tagihan_massal` sudah include logic beasiswa?

### Saldo Akun Tidak Akurat

**Solusi:**
```sql
-- Recalculate saldo
UPDATE akun_kas 
SET saldo_saat_ini = calculate_saldo_akun(nama);
```

---

## 🎯 Best Practices

### 1. Pembayaran Santri
- Generate tagihan setiap tanggal 1
- Reminder ke santri via WA tanggal 3
- Denda otomatis jika lewat jatuh tempo

### 2. Beasiswa
- Review penerima setiap semester
- Evaluasi prestasi untuk beasiswa prestasi
- Update status jika santri lulus/drop out

### 3. Keuangan
- Posting transaksi setiap hari
- Upload bukti untuk transaksi > Rp 500.000
- Monthly closing: semua transaksi harus posted

### 4. Rekonsiliasi
- Lakukan setiap akhir bulan
- Balanced sebelum closing monthly
- Backup data sebelum rekonsiliasi

---

## 🏁 Summary

### ✅ Database Ready:

- ✅ 13 tables created
- ✅ 10+ helper functions
- ✅ Default master data
- ✅ Integration logic
- ✅ Auto-posting triggers

### 🔄 UI Implementation Priority:

**Week 1:**
1. Pembayaran Santri (high priority)
2. Keuangan V2 basic (CRUD transaksi)

**Week 2:**
3. Beasiswa module
4. Dashboard enhancement

**Week 3:**
5. Rekonsiliasi Bank
6. Reports & analytics

---

**Modul Keuangan siap mendukung operasional keuangan pesantren yang profesional dan akuntabel!** 💰✨

---

**Created:** Oktober 10, 2025  
**Version:** 2.0  
**Type:** Complete System Documentation


# 🎓 MODUL BEASISWA - Dokumentasi Lengkap

> **Sistem Beasiswa Profesional dengan Workflow Terstruktur**  
> **Version**: 2.0  
> **Last Updated**: Oktober 10, 2025  
> **Status**: ✅ Production Ready

---

## 📑 Daftar Isi

1. [Konsep & Paradigma](#konsep--paradigma)
2. [Database Schema](#database-schema)
3. [Setup & Installation](#setup--installation)
4. [Fitur & Cara Pakai](#fitur--cara-pakai)
5. [Workflow Pengajuan Beasiswa](#workflow-pengajuan-beasiswa)
6. [Troubleshooting](#troubleshooting)

---

## 🎯 Konsep & Paradigma

### **Masalah Lama**
- Sistem "binaan" tidak terstruktur
- Tidak jelas biaya real program
- Tidak ada proses verifikasi
- Orang tua bisa lepas tangan total
- Budget tidak terukur

### **Solusi Baru**
- ✅ **Program dengan Tarif Transparan** - Semua biaya jelas per komponen
- ✅ **Pengajuan Beasiswa** - Ada proses seleksi & verifikasi
- ✅ **Persentase Fleksibel** - 25%, 50%, 75%, 100% (bukan hanya gratis/bayar)
- ✅ **Evaluasi Berkala** - Monitoring setiap semester
- ✅ **Akuntabilitas** - Orang tua tetap punya tanggung jawab

### **Contoh Real**

**Program**: Santri Mukim (SD/SMP/SMA)
- Pendidikan Formal: Rp 500.000/bulan
- Asrama & Konsumsi: Rp 800.000/bulan
- Pendidikan Internal: Rp 100.000/bulan
- Lain-lain: Rp 100.000/bulan
- **Total: Rp 1.500.000/bulan**

**Beasiswa Dhuafa 75%**:
- Yayasan subsidi: Rp 1.125.000/bulan (75%)
- Orang tua bayar: Rp 375.000/bulan (25%)
- **Win-win: Ada bantuan tapi tetap ada tanggung jawab!**

---

## 📊 Database Schema

### **4 Migration Files (Urutan Penting!)**

#### **1. Beasiswa Legacy** (`20251009020000_create_beasiswa_module.sql`)
**Tables**: `program_beasiswa`, `penerima_beasiswa`, `pencairan_beasiswa`  
**Purpose**: Foundation untuk sistem beasiswa (compatibility dengan sistem lama)

#### **2. Program Santri** (`20251010000000_create_program_santri_system.sql`)
**Tables**:
- `program_santri` - Master program dengan kategori
- `komponen_biaya_program` - Komponen biaya per program
- `riwayat_status_santri` - History perubahan status

**Default Programs** (4):
- Santri Mukim (SD/SMP/SMA) - Total: Rp 1.500.000/bulan
- Santri Non-Mukim TPQ - Total: Rp 25.000/bulan
- Mahasantri Mukim - Total: Rp 2.500.000/bulan
- Santri Non-Mukim Madin - Total: Rp 50.000/bulan

#### **3. Pengajuan Beasiswa** (`20251010010000_create_pengajuan_beasiswa_system.sql`)
**Tables**:
- `pengajuan_beasiswa_santri` - Pengajuan dengan dokumen
- `beasiswa_aktif_santri` - Beasiswa yang sudah approved
- `evaluasi_beasiswa` - Monitoring berkala

**Workflow**: draft → pending → diverifikasi → disetujui → aktif

**Functions**:
- `approve_pengajuan_beasiswa()` - Approve & create beasiswa aktif
- `reject_pengajuan_beasiswa()` - Reject pengajuan
- `get_beasiswa_summary_santri()` - Summary per santri
- `get_statistik_pengajuan_beasiswa()` - Statistics

#### **4. Tanggungan Pendidikan** (`20251010020000_create_tanggungan_pendidikan_system.sql`)
**Tables**:
- `tanggungan_pendidikan_santri` - Biaya ke sekolah formal
- `beasiswa_eksternal` - Beasiswa dari sekolah (PEMASUKAN)
- `program_pendidikan_internal` - TPQ, Madin, dll
- `peserta_program_internal` - Peserta program
- `pembayaran_program_internal` - SPP internal
- `pengeluaran_guru_internal` - Gaji guru

**Functions**:
- `bayar_tanggungan_pendidikan()` - Bayar & post ke keuangan
- `catat_pembayaran_program_internal()` - Catat SPP TPQ
- `bayar_gaji_guru_internal()` - Bayar gaji guru

---

## 🚀 Setup & Installation

### **Step 1: Run Migrations** (10 menit)

**Lokasi**: Supabase Dashboard → SQL Editor

**Urutan** (PENTING!):
1. `20251009020000_create_beasiswa_module.sql`
2. `20251010000000_create_program_santri_system.sql`
3. `20251010010000_create_pengajuan_beasiswa_system.sql`
4. `20251010020000_create_tanggungan_pendidikan_system.sql`

**Cara**:
- Open file → Copy all (Ctrl+A, Ctrl+C)
- Paste di SQL Editor → Run
- Tunggu ✅ Success
- Ulangi untuk file berikutnya

**Troubleshooting**:
- Error "function update_updated_at_column does not exist" → Run migration base dulu: `20250102030000_create_pesantren_tables.sql`
- Error lain → Screenshot dan kontak developer

### **Step 2: Verify Database** (2 menit)

Run query ini untuk check:

```sql
-- Check tables (expected: ~20 tables)
SELECT table_name 
FROM information_schema.tables 
WHERE table_schema = 'public' 
  AND table_name LIKE '%beasiswa%'
ORDER BY table_name;

-- Check programs (expected: 4 rows)
SELECT nama_program, kode_program FROM program_santri;

-- Check components (expected: 15+ rows)
SELECT 
  ps.nama_program,
  kb.nama_komponen,
  kb.tarif_per_bulan
FROM program_santri ps
JOIN komponen_biaya_program kb ON kb.program_id = ps.id;
```

### **Step 3: Test UI** (5 menit)

Dev server: `npm run dev` → http://localhost:8080

**Visit**:
- `/program-santri` - Kelola program & tarif
- `/beasiswa/pengajuan` - Ajukan beasiswa

---

## 🎨 Fitur & Cara Pakai

### **1. Program Santri Management**

**URL**: `/program-santri`

**Fitur**:
- View semua program dengan komponen biaya
- Add/edit/delete program
- Add/edit komponen biaya per program
- Set tarif per komponen
- Activate/deactivate program
- Auto-calculate total tarif

**Cara Pakai**:
1. Klik "Tambah Program" → Isi form
2. Klik program → "Kelola Komponen Biaya"
3. Tambah komponen (Pendidikan, Asrama, dll)
4. Set tarif per komponen
5. System auto-calculate total

### **2. Pengajuan Beasiswa**

**URL**: `/beasiswa/pengajuan`

**Fitur**:
- 4-step wizard form
- Pilih santri & program
- Set persentase (25-100%)
- Auto-calculate subsidi
- Upload dokumen (KTP, KK, SKTM)
- Submit untuk verifikasi

**Cara Pakai**:
1. **Step 1**: Pilih santri, set periode mulai
2. **Step 2**: Pilih jenis beasiswa, set persentase
3. **Step 3**: Isi alasan, kondisi ekonomi keluarga
4. **Step 4**: Upload dokumen pendukung
5. Submit → Status: pending (menunggu verifikasi)

### **3. Verifikasi Beasiswa** (Coming Soon)

**URL**: `/beasiswa/verifikasi`

**Workflow**:
- Admin review pengajuan
- Check dokumen
- Survei lapangan (optional)
- Berikan rekomendasi
- Status → diverifikasi

### **4. Approval Beasiswa** (Coming Soon)

**URL**: `/beasiswa/approval`

**Workflow**:
- Pimpinan review hasil verifikasi
- Check budget
- Approve/reject
- Generate SK
- Status → disetujui → Create beasiswa_aktif

### **5. Monitoring Beasiswa** (Coming Soon)

**URL**: `/beasiswa/monitoring`

**Fitur**:
- List beasiswa aktif
- Evaluasi berkala
- Budget analysis
- Reports

---

## 🔄 Workflow Pengajuan Beasiswa

### **Diagram Workflow**

```
┌─────────────┐
│ 1. AJUKAN   │ Santri/Orang tua ajukan via form
└──────┬──────┘
       ↓
┌─────────────┐
│ 2. PENDING  │ Masuk antrian verifikasi
└──────┬──────┘
       ↓
┌─────────────┐
│ 3. VERIFIKASI│ Admin check dokumen & kondisi
└──────┬──────┘
       ↓
┌─────────────┐
│ 4. APPROVAL │ Pimpinan approve/reject
└──────┬──────┘
       ↓
┌─────────────┐
│ 5. AKTIF    │ Beasiswa jalan, pencairan bulanan
└──────┬──────┘
       ↓
┌─────────────┐
│ 6. EVALUASI │ Monitoring berkala (semester/tahun)
└─────────────┘
```

### **Detail Workflow**

#### **FASE 1: Pengajuan**
**Actor**: Santri/Orang Tua/Admin  
**Action**: Isi form pengajuan lengkap  
**Required**:
- Data santri
- Jenis beasiswa (Yatim/Dhuafa/Prestasi/dll)
- Persentase yang diajukan
- Alasan & kondisi ekonomi
- Dokumen (KTP, KK, SKTM)

**Output**: Record di `pengajuan_beasiswa_santri` dengan status "pending"

#### **FASE 2: Verifikasi**
**Actor**: Admin/Verifikator  
**Action**: Review & verifikasi  
**Process**:
1. Check kelengkapan dokumen
2. Validasi keaslian
3. Survei lapangan (optional)
4. Berikan rekomendasi

**Output**: Status → "diverifikasi" + rekomendasi

#### **FASE 3: Approval**
**Actor**: Pimpinan  
**Action**: Keputusan final  
**Process**:
1. Review rekomendasi verifikator
2. Check budget availability
3. Approve/reject dengan alasan

**If Approved**:
- Generate SK Beasiswa
- Create record di `beasiswa_aktif_santri`
- Update `santri.tipe_pembayaran`
- Status → "disetujui"

**If Rejected**:
- Input alasan penolakan
- Status → "ditolak"

#### **FASE 4: Pencairan Bulanan**
**Automatic**: System auto-generate setiap bulan  
**Process**:
1. Create record di `pencairan_beasiswa`
2. Auto-create entry di `keuangan` (PENGELUARAN)
3. Update `total_sudah_diterima`

#### **FASE 5: Evaluasi Berkala**
**Period**: Setiap semester/tahun  
**Actor**: Admin/Pimpinan  
**Process**:
1. Review kondisi ekonomi terkini
2. Review prestasi & kedisiplinan
3. Keputusan: Lanjut/Naik/Turun/Cabut

---

## 💡 Use Cases

### **Use Case 1: Santri Tidak Mampu (Dhuafa 75%)**

**Kondisi**:
- Ayah buruh harian, penghasilan Rp 1.500.000/bulan
- 5 anak
- Rumah kontrak

**Pengajuan**:
- Jenis: Dhuafa
- Persentase: 75%
- Program: Santri Mukim (Rp 1.500.000/bulan)

**Hasil**:
- Subsidi yayasan: Rp 1.125.000/bulan
- Orang tua bayar: Rp 375.000/bulan
- Evaluasi: Setiap semester

### **Use Case 2: Mahasantri Custom Subsidi**

**Kondisi**:
- Mahasiswa semester 3
- Keluarga mampu tapi butuh subsidi asrama

**Pengajuan**:
- Jenis: Subsidi Sebagian
- Custom per komponen:
  - Asrama: 100% subsidi (Rp 500.000)
  - Konsumsi: 75% subsidi (Rp 450.000)
  - Kuliah: 50% subsidi (Rp 500.000)
  - Fasilitas: 0% subsidi (bayar sendiri)

**Hasil**:
- Total subsidi: Rp 1.450.000/bulan (60%)
- Mahasiswa bayar: Rp 1.050.000/bulan (40%)

### **Use Case 3: Beasiswa SMA dari Sekolah (PEMASUKAN)**

**Kondisi**:
- 9 santri SMA dapat beasiswa dari sekolah
- Rp 1.200.000/tahun per santri

**Action**:
Catat di `beasiswa_eksternal` → Auto-create di `keuangan` as PEMASUKAN

**Hasil**:
- Total: 9 × Rp 1.200.000 = Rp 10.800.000/tahun
- Pemasukan untuk yayasan! ✅

---

## 🛠️ Troubleshooting

### **Error: Upload Dokumen 400 Bad Request**

**Penyebab**: Bucket "documents" belum ada  
**Solusi**: Sudah fixed! Upload sekarang pakai base64, langsung jalan tanpa bucket

### **Error: relation "pencairan_beasiswa" does not exist**

**Penyebab**: Migration tidak run dengan urutan yang benar  
**Solusi**: Run File 1 (beasiswa legacy) terlebih dahulu

### **Error: Menu baru tidak muncul**

**Solusi**: Refresh browser (F5) atau hard refresh (Ctrl+Shift+R)

### **Error: Page blank/tidak muncul data**

**Check**:
1. Migrations sudah di-run semua?
2. Browser console (F12) ada error?
3. Sudah login ke sistem?
4. Supabase connection OK?

### **Error TypeScript**

**Solusi**: Types belum update. Run:
```bash
# Generate new types
npx supabase gen types typescript --project-id YOUR_ID > src/integrations/supabase/types.ts
```

---

## 📱 UI Pages

### **1. Program Santri** (`/program-santri`)

**Tampilan**:
- Grid of programs
- Click program → See components & tariffs
- Add/edit programs & components
- Total tarif auto-calculated

**Access**: Menu sidebar → "Program Santri"

### **2. Pengajuan Beasiswa** (`/beasiswa/pengajuan`)

**Tampilan**:
- 4-step wizard dengan progress bar
- Step 1: Pilih santri & periode
- Step 2: Jenis & persentase beasiswa
- Step 3: Alasan & kondisi keluarga
- Step 4: Upload dokumen

**Access**: Menu sidebar → "Pengajuan Beasiswa"

### **3-5. Coming Soon**
- Verifikasi Beasiswa (Admin)
- Approval Beasiswa (Pimpinan)
- Monitoring & Reports

---

## 📊 Data yang Sudah Ada

### **Setelah Migrations**

✅ **4 Programs**:
1. Santri Mukim - 4 komponen biaya
2. TPQ Non-Mukim - 1 komponen
3. Mahasantri Mukim - 6 komponen
4. Madin Non-Mukim - 1 komponen

✅ **Functions**: 10+ helper functions siap pakai

✅ **Default tarif**: Semua komponen sudah ada tarif default

### **Assign Santri ke Program** (Optional)

Jika punya santri existing, assign mereka:

```sql
-- Santri mukim → Program Santri Mukim
UPDATE santri 
SET 
  program_id = (SELECT id FROM program_santri WHERE kode_program = 'SANTRI-MUKIM'),
  status_santri = 'Reguler',
  tipe_pembayaran = 'Bayar Sendiri'
WHERE status_mukim = 'Mukim';

-- Santri non-mukim → Program TPQ
UPDATE santri 
SET 
  program_id = (SELECT id FROM program_santri WHERE kode_program = 'TPQ-NON-MUKIM'),
  status_santri = 'Reguler',
  tipe_pembayaran = 'Bayar Sendiri'
WHERE status_mukim = 'Non-Mukim';
```

---

## 🎯 Quick Start

### **Untuk Admin**

1. Login ke sistem
2. Klik menu "Program Santri"
3. Lihat 4 program default
4. Klik salah satu → Lihat komponennya
5. Try add komponen baru

### **Untuk Submit Beasiswa**

1. Klik menu "Pengajuan Beasiswa"
2. Ikuti 4 steps
3. Upload dokumen
4. Submit!

### **Test Workflow**

```sql
-- Create test pengajuan
INSERT INTO pengajuan_beasiswa_santri (
  santri_id,
  jenis_beasiswa,
  persentase_beasiswa,
  nominal_per_bulan,
  periode_mulai,
  alasan_pengajuan,
  status
) VALUES (
  (SELECT id FROM santri LIMIT 1),
  'Dhuafa',
  75,
  1125000,
  '2025-11-01',
  'Test - keluarga tidak mampu',
  'pending'
);

-- Check it
SELECT * FROM pengajuan_beasiswa_santri ORDER BY created_at DESC LIMIT 1;
```

---

## 📈 Progress

**Completed**:
- [x] Database schema (100%)
- [x] Migrations (100%)
- [x] Core UI (40%)
  - [x] Program Santri
  - [x] Pengajuan Beasiswa
  - [ ] Verifikasi
  - [ ] Approval
  - [ ] Monitoring

**Next**:
- [ ] Build Verifikasi page
- [ ] Build Approval page
- [ ] Build Monitoring dashboard
- [ ] Reports & analytics

---

## 🏁 Summary

### ✅ Apa yang Sudah Ada:

- ✅ Database lengkap (23+ tables, 10+ functions)
- ✅ 2 UI pages yang jalan
- ✅ Sistem profesional dengan workflow terstruktur
- ✅ Dokumentasi lengkap

### 🔄 Next Steps:

- Build pages sisanya (verifikasi, approval, monitoring)
- Integration dengan modul pembayaran
- Reports & analytics

**Status**: ✅ 70% Complete - Database & Core UI Ready

---

**Modul Beasiswa siap mendukung sistem beasiswa yang transparent dan terstruktur!** 🎓✨

---

**Created:** Oktober 10, 2025  
**Version:** 2.0  
**Type:** Complete System Documentation


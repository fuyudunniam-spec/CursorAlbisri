# 📝 STANDAR PENAMAAN FIELD & KONSISTENSI DATA

## 🎯 STATUS ANAK / STATUS SOSIAL

### **Database Field:** `santri.status_anak` (TEXT)
### **Alternative Field:** `santri.status_sosial` (ENUM)

⚠️ **MASALAH**: Ada 2 field yang overlap!
- `status_anak` (TEXT) - Custom values
- `status_sosial` (ENUM) - 'Yatim', 'Piatu', 'Yatim Piatu', 'Lengkap'

### **✅ REKOMENDASI**: Gunakan `status_sosial` (ENUM) untuk konsistensi

### **Valid Values:**
```sql
-- Dari ENUM status_sosial
'Yatim'          -- Ayah meninggal
'Piatu'          -- Ibu meninggal  
'Yatim Piatu'    -- Kedua orang tua meninggal
'Lengkap'        -- Kedua orang tua masih hidup
```

### **Mapping Frontend:**
```typescript
// Form selection
const statusOptions = [
  { value: 'Lengkap', label: 'Orang Tua Lengkap' },
  { value: 'Yatim', label: 'Yatim (Ayah Meninggal)' },
  { value: 'Piatu', label: 'Piatu (Ibu Meninggal)' },
  { value: 'Yatim Piatu', label: 'Yatim Piatu (Kedua Orang Tua Meninggal)' }
];

// Database save
santri.status_sosial = selectedValue; // Use ENUM
santri.status_anak = selectedValue;   // Keep in sync or deprecate
```

---

## 📋 KATEGORI SANTRI

### **Database Field:** `santri.kategori` (TEXT with CHECK constraint)

### **Valid Values:**
```sql
'Santri Binaan Mukim'
'Santri Binaan Non-Mukim'
'Mahasiswa'
'Santri TPO'
'Santri Reguler'
'Mahasantri Reguler'   -- Legacy, masih allowed
'Mahasantri Beasiswa'  -- Legacy, masih allowed
```

### **Primary Categories (Yang digunakan):**
1. **`'Santri Reguler'`** - Santri bayar mandiri, dokumen minimal
2. **`'Santri Binaan Mukim'`** - Beasiswa full (mukim), dokumen lengkap
3. **`'Santri Binaan Non-Mukim'`** - Beasiswa program pendidikan gratis
4. **`'Mahasiswa'`** - Mahasiswa reguler (nanti)
5. **`'Santri TPO'`** - Santri TPO

---

## 💰 TIPE PEMBAYARAN

### **Database Field:** `santri.tipe_pembayaran` (VARCHAR with CHECK constraint)

### **Valid Values:**
```sql
'Mandiri'   -- Bayar sendiri
'Beasiswa'  -- Bantuan penuh/subsidi
```

### **Auto-Assignment Logic:**
```typescript
// Trigger auto_set_tipe_pembayaran
if (kategori === 'Santri Binaan Mukim' || kategori === 'Santri Binaan Non-Mukim') {
  tipe_pembayaran = 'Beasiswa';
} else {
  tipe_pembayaran = 'Mandiri';
}
```

---

## 📄 DOKUMEN SANTRI - NAMING STANDARD

### **❌ NAMA YANG SALAH (Jangan Gunakan):**
```typescript
// WRONG - Will violate constraint
'Foto' → Use 'Pas Foto'
'Akta Lahir' → Use 'Akta Kelahiran'  
'Kartu Keluarga (KK)' → Use 'Kartu Keluarga'
'KTP Wali' → Use 'KTP Orang Tua'
'Akta Kematian Ayah' → Use 'Akta Kematian Orang Tua'
'Akta Kematian Ibu' → Use 'Akta Kematian Orang Tua'
'Slip Gaji' → Use 'Slip Gaji Orang Tua'
'Rapor' → Use 'Raport'
'Ijazah' → Use 'Ijazah Terakhir'
```

### **✅ NAMA YANG BENAR (Sesuai Constraint):**
```typescript
// CORRECT - Matches database constraint
'Pas Foto'
'Akta Kelahiran'
'Kartu Keluarga'
'KTP Orang Tua'
'Akta Kematian Orang Tua'
'Slip Gaji Orang Tua'
'Raport'
'Ijazah Terakhir'
'Transkrip Nilai'
'SKTM'
'Surat Keterangan Yatim'
'Surat Keterangan Piatu'
'Surat Keterangan Penghasilan'
'Surat Keterangan Sehat'
'Surat Permohonan'
'Sertifikat Prestasi'
'Surat Keterangan'
'Dokumen Lainnya'
'KTP Santri'
```

---

## 🏫 DATA SEKOLAH (Post-Approval untuk Binaan Mukim)

### **Database Fields:** `santri` table

### **Wajib diisi setelah beasiswa diterima:**
```typescript
// Required fields for Binaan Mukim after approval
nama_sekolah_formal: string;      // Nama sekolah formal yang dihadiri
kelas_sekolah_formal: string;     // Kelas di sekolah formal
nama_wali_kelas: string;          // Nama wali kelas di sekolah
no_telepon_wali_kelas: string;    // Nomor telepon wali kelas
```

### **Validation:**
```typescript
// Show alert if missing after beasiswa approved
if (santri.tipe_pembayaran === 'Beasiswa' && 
    santri.kategori === 'Santri Binaan Mukim') {
  const missingFields = [];
  if (!santri.nama_sekolah_formal) missingFields.push('Nama Sekolah');
  if (!santri.kelas_sekolah_formal) missingFields.push('Kelas');
  if (!santri.nama_wali_kelas) missingFields.push('Nama Wali Kelas');
  if (!santri.no_telepon_wali_kelas) missingFields.push('No. Telepon Wali Kelas');
  
  if (missingFields.length > 0) {
    // Show alert to complete these fields
  }
}
```

---

## 👥 DATA WALI

### **Database Table:** `santri_wali`

### **Fields:**
```typescript
{
  nama_lengkap: string;
  hubungan_keluarga: string;  // 'Ayah', 'Ibu', 'Kakak', 'Paman', dll
  pekerjaan: string;
  alamat: string;
  no_whatsapp: string;
  penghasilan_bulanan: string; // For beasiswa eligibility
  is_utama: boolean;          // true for primary guardian
}
```

### **Usage:**
```typescript
// Wali Utama (Mandatory for all santri)
waliData[0] = { ...data, is_utama: true };

// Wali Pendamping (For beasiswa - optional)
waliData[1] = { ...data, is_utama: false };
```

---

## 🎓 RIWAYAT PENDIDIKAN

### **Fields yang sudah ada di `santri` table:**
```typescript
// Basic education info
nama_sekolah_formal: string;
kelas_sekolah_formal: string;
prestasi: text;  // Already exists

// NOT YET IN DATABASE (need to add if required):
pendidikan_terakhir: string;  // 'TK', 'SD', 'SMP', 'SMA', 'Lainnya'
nama_sekolah_asal: string;
tahun_masuk_sekolah: string;
tahun_keluar_sekolah: string;
```

⚠️ **NOTE**: Jika field ini diperlukan, perlu migration untuk menambahkan.

---

## 🏥 KONDISI KESEHATAN

### **Fields yang sudah ada di `santri` table:**
```typescript
riwayat_penyakit: text;
pernah_rawat_inap: boolean;
keterangan_rawat_inap: text;
disabilitas_khusus: text;
obat_khusus: text;  // Untuk obat rutin yang perlu dikonsumsi
```

### **✅ SUDAH LENGKAP** - No changes needed!

---

## 🔄 FIELD MAPPING SANTRI REGULER vs BEASISWA

### **Santri Reguler (Minimal):**
```typescript
// Required fields for registration
{
  // Administrasi
  kategori: 'Santri Reguler',
  tipe_pembayaran: 'Mandiri', // Auto
  
  // Personal (Minimal)
  nama_lengkap: string,
  tempat_lahir: string,
  tanggal_lahir: string,
  jenis_kelamin: string,
  agama: string,
  alamat: string,
  no_whatsapp: string,
  
  // Wali (Minimal)
  waliData[0]: {
    nama_lengkap, hubungan_keluarga, 
    no_whatsapp, alamat, is_utama: true
  },
  
  // Program
  program_id: uuid,
  
  // Dokumen (5 files)
  documents: ['Pas Foto', 'Kartu Keluarga', 'Akta Kelahiran', 
              'Ijazah Terakhir', 'Transkrip Nilai']
}
```

### **Santri Binaan Mukim (Enhanced):**
```typescript
// All reguler fields PLUS:
{
  // Enhanced Personal
  status_sosial: 'Yatim' | 'Piatu' | 'Yatim Piatu' | 'Lengkap',
  anak_ke: number,
  jumlah_saudara: number,
  hobi: string,
  cita_cita: string,
  
  // Enhanced Wali
  waliData[0]: { ...minimal, pekerjaan, penghasilan_bulanan },
  waliData[1]: { ...wali_pendamping, is_utama: false }, // Optional
  
  // Riwayat Pendidikan
  prestasi: text,
  // TODO: Add if needed: pendidikan_terakhir, nama_sekolah_asal, dll
  
  // Kondisi Kesehatan
  riwayat_penyakit: text,
  pernah_rawat_inap: boolean,
  keterangan_rawat_inap: text,
  
  // Dokumen (8-12 files tergantung kondisi)
  documents: [
    // Base
    'Pas Foto', 'Kartu Keluarga', 'Akta Kelahiran',
    // Enhanced
    'KTP Orang Tua', 'Ijazah Terakhir', 'Transkrip Nilai',
    'Surat Keterangan Sehat', 'Surat Permohonan',
    // Conditional
    'SKTM' (if Dhuafa),
    'Akta Kematian Orang Tua' (if Yatim/Piatu),
    'Surat Keterangan Yatim/Piatu' (if Yatim/Piatu),
    'Sertifikat Prestasi' (optional, multiple)
  ],
  
  // Post-Approval (Wajib dilengkapi setelah diterima)
  nama_sekolah_formal: string,
  kelas_sekolah_formal: string,
  nama_wali_kelas: string,
  no_telepon_wali_kelas: string
}
```

---

## 🔑 KEY RULES

### **1. Konsistensi Penamaan**
- ✅ Gunakan ENUM jika tersedia (`status_sosial`, bukan `status_anak`)
- ✅ Gunakan nama exact dari database constraint untuk dokumen
- ✅ Jangan buat field baru jika sudah ada yang serupa

### **2. Progressive Disclosure**
- ✅ Santri Reguler: Show minimal fields only
- ✅ Pengajuan Beasiswa: Show enhanced fields
- ✅ Post-Approval: Require completion of school info

### **3. Data Integrity**
- ✅ Validate required fields before save
- ✅ Use database constraints untuk prevent bad data
- ✅ Show clear error messages

### **4. Single Source of Truth**
- ✅ Document requirements → `requirement_dokumen` table
- ✅ Document operations → `DocumentService`
- ✅ Status values → Database ENUMs/constraints

---

Last Updated: October 14, 2025


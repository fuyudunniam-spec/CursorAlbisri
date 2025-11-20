# 📋 STANDAR PENAMAAN DOKUMEN SANTRI

## ✅ Valid Document Types (Database Constraint)

Berikut adalah **20 jenis dokumen** yang valid dan **HARUS** digunakan di seluruh aplikasi:

### **Dokumen Reguler (Semua Santri)**
1. `'Pas Foto'` - Pas foto santri 3x4 atau 4x6
2. `'Kartu Keluarga'` - Fotokopi Kartu Keluarga
3. `'Akta Kelahiran'` - Fotokopi Akta Kelahiran santri
4. `'Ijazah Terakhir'` - Ijazah pendidikan terakhir (opsional)
5. `'Surat Keterangan Sehat'` - Surat keterangan sehat dari dokter

### **Dokumen Beasiswa (Pengajuan Beasiswa)**
6. `'KTP Orang Tua'` - Fotokopi KTP Ayah dan Ibu (atau wali)
7. `'SKTM'` - Surat Keterangan Tidak Mampu
8. `'Slip Gaji Orang Tua'` - Slip gaji atau surat keterangan penghasilan
9. `'Akta Kematian Orang Tua'` - Akta kematian Ayah/Ibu (untuk Yatim/Piatu)
10. `'Sertifikat Prestasi'` - Sertifikat/piagam prestasi
11. `'Raport'` - Raport terakhir (untuk prestasi akademik)
12. `'Surat Keterangan Penghasilan'` - Surat keterangan penghasilan orang tua
13. `'Surat Keterangan Tidak Mampu'` - SKTM dari kelurahan
14. `'Surat Keterangan Yatim'` - Surat keterangan yatim dari RT/RW
15. `'Surat Keterangan Piatu'` - Surat keterangan piatu dari RT/RW
16. `'Surat Permohonan'` - Surat permohonan beasiswa

### **Dokumen Optional (Tambahan)**
17. `'Transkrip Nilai'` - Transkrip nilai akademik
18. `'KTP Santri'` - KTP santri (jika sudah punya)
19. `'Surat Keterangan'` - Surat keterangan lainnya
20. `'Dokumen Lainnya'` - Dokumen pendukung lainnya

---

## 🚫 NAMA DOKUMEN YANG **TIDAK BOLEH** DIGUNAKAN

Jangan gunakan nama-nama berikut karena **TIDAK SESUAI** dengan database constraint:

❌ `'Foto'` → ✅ Gunakan `'Pas Foto'`
❌ `'KTP Wali'` → ✅ Gunakan `'KTP Orang Tua'`
❌ `'Rapor'` → ✅ Gunakan `'Raport'`
❌ `'Slip Gaji'` → ✅ Gunakan `'Slip Gaji Orang Tua'`
❌ `'Akta Kematian Ayah'` → ✅ Gunakan `'Akta Kematian Orang Tua'`
❌ `'Akta Kematian Ibu'` → ✅ Gunakan `'Akta Kematian Orang Tua'`
❌ `'Ijazah'` → ✅ Gunakan `'Ijazah Terakhir'`
❌ `'Akta Nikah'`, `'BPJS'`, `'Riwayat Imunisasi'`, `'NISN'`, `'Rekening Listrik'`, dll → ✅ Gunakan `'Dokumen Lainnya'`

---

## 📊 Kategori Dokumen

### **Reguler** (Untuk semua santri)
- Diperlukan saat pendaftaran awal
- Wajib: Pas Foto, Kartu Keluarga, Akta Kelahiran, Surat Keterangan Sehat
- Opsional: Ijazah Terakhir

### **Beasiswa** (Untuk pengajuan beasiswa)
- Diperlukan saat mengajukan beasiswa
- Dokumen wajib tergantung jenis beasiswa:
  - **Yatim/Piatu**: Akta Kematian Orang Tua, Surat Keterangan Yatim/Piatu
  - **Dhuafa**: SKTM, Slip Gaji Orang Tua
  - **Prestasi Akademik**: Sertifikat Prestasi, Raport
  - **Prestasi Non-Akademik**: Sertifikat Prestasi

### **Optional** (Dokumen tambahan)
- Tidak wajib, tapi mendukung aplikasi
- Transkrip Nilai, KTP Santri, Surat Keterangan, Dokumen Lainnya

---

## 🔧 Implementation Guide

### **1. Saat Upload Dokumen**
```typescript
// ✅ CORRECT
const jenisDokumen = 'Pas Foto';
const jenisDokumen = 'Akta Kematian Orang Tua';
const jenisDokumen = 'Slip Gaji Orang Tua';

// ❌ WRONG - Will violate constraint
const jenisDokumen = 'Foto';
const jenisDokumen = 'Akta Kematian Ayah';
const jenisDokumen = 'Slip Gaji';
```

### **2. Saat Query Database**
```typescript
// Get documents from database
const { data } = await supabase
  .from('dokumen_santri')
  .select('*')
  .eq('jenis_dokumen', 'Pas Foto'); // ✅ Use exact match
```

### **3. Saat Insert ke Database**
```typescript
// Insert new document
await supabase
  .from('dokumen_santri')
  .insert({
    santri_id: santriId,
    jenis_dokumen: 'Pas Foto', // ✅ Must match constraint
    nama_dokumen: 'Pas Foto',
    nama_file: file.name,
    path_file: filePath,
    status_verifikasi: 'Belum Diverifikasi'
  });
```

### **4. Saat Menggunakan DocumentService**
```typescript
// Use DocumentService for consistency
import { DocumentService } from '@/services/document.service';

// Upload with service
await DocumentService.uploadDocument(
  santriId, 
  'Pas Foto', // ✅ Will validate against constraint
  file
);
```

---

## 🗂️ File Path Structure

Gunakan struktur path yang konsisten:

```
santri/{santriId}/{jenisDokumen}/{timestamp}.{ext}
```

**Example:**
```
santri/4f302b67-aafe-4525-ae56-4c24b80bbbbb/Pas Foto/1760422045008.png
santri/4f302b67-aafe-4525-ae56-4c24b80bbbbb/Kartu Keluarga/1760422055123.pdf
```

---

## 🔍 Verification Status

Status verifikasi yang valid:
- `'Belum Diverifikasi'` - Default saat upload
- `'Diverifikasi'` - Sudah diverifikasi admin
- `'Ditolak'` - Ditolak dengan catatan

---

## 📁 Storage Bucket

**Bucket Name:** `santri-documents` (bukan `dokumen-santri`)

---

## ⚠️ Troubleshooting

### Error: "violates check constraint dokumen_santri_jenis_dokumen_check"
**Cause:** Nama dokumen tidak sesuai dengan constraint
**Solution:** Periksa spelling dan gunakan nama exact dari daftar 20 dokumen valid di atas

### Error: "Object not found"
**Cause:** Bucket name atau path file salah
**Solution:** Pastikan menggunakan bucket `'santri-documents'` dan path format `santri/{santriId}/{jenisDokumen}/{fileName}`

---

## 📋 Quick Reference Table

| Frontend Display | Database Value (jenis_dokumen) | Kategori | Required |
|-----------------|-------------------------------|----------|----------|
| Pas Foto 3x4 | `'Pas Foto'` | Reguler | Ya |
| Kartu Keluarga (KK) | `'Kartu Keluarga'` | Reguler | Ya |
| Akta Kelahiran | `'Akta Kelahiran'` | Reguler | Ya |
| Surat Keterangan Sehat | `'Surat Keterangan Sehat'` | Reguler | Ya |
| Ijazah Terakhir | `'Ijazah Terakhir'` | Reguler | Tidak |
| KTP Orang Tua/Wali | `'KTP Orang Tua'` | Beasiswa | Ya |
| SKTM | `'SKTM'` | Beasiswa | Ya (Dhuafa) |
| Akta Kematian | `'Akta Kematian Orang Tua'` | Beasiswa | Ya (Yatim/Piatu) |
| Surat Keterangan Yatim | `'Surat Keterangan Yatim'` | Beasiswa | Ya (Yatim) |
| Surat Keterangan Piatu | `'Surat Keterangan Piatu'` | Beasiswa | Ya (Piatu) |
| Slip Gaji Orang Tua | `'Slip Gaji Orang Tua'` | Beasiswa | Ya (Dhuafa) |
| Raport | `'Raport'` | Beasiswa | Ya (Prestasi) |
| Sertifikat Prestasi | `'Sertifikat Prestasi'` | Beasiswa | Ya (Prestasi) |
| Surat Permohonan | `'Surat Permohonan'` | Beasiswa | Ya |
| Transkrip Nilai | `'Transkrip Nilai'` | Optional | Tidak |
| Surat Keterangan | `'Surat Keterangan'` | Optional | Tidak |
| Dokumen Lainnya | `'Dokumen Lainnya'` | Optional | Tidak |

---

## 🎯 Best Practices

1. **Always use DocumentService** untuk operasi dokumen
2. **Never hardcode** nama dokumen - ambil dari `requirement_dokumen` table
3. **Validate** nama dokumen sebelum insert
4. **Use consistent** file path structure
5. **Log errors** untuk debugging
6. **Test uploads** dengan berbagai jenis dokumen

---

Last Updated: October 14, 2025


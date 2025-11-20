# 🧪 PANDUAN TESTING SISTEM DOKUMEN & BEASISWA

## 📋 OVERVIEW

Panduan ini menjelaskan langkah-langkah testing untuk memastikan sistem bekerja dengan baik dari pendaftaran santri hingga approval beasiswa.

---

## ✅ PRE-TESTING CHECKLIST

### **1. Database:**
- ✅ Migrations applied: `standardize_document_types`, `add_missing_dokumen_requirements`
- ✅ Constraint `dokumen_santri_jenis_dokumen_check` updated (20 valid types)
- ✅ Table `requirement_dokumen` populated (21 rows)

### **2. Frontend:**
- ✅ All duplicate files removed (7 files)
- ✅ All components using `status_sosial` (not `status_anak`)
- ✅ All document names match database constraint
- ✅ `DocumentService` implemented and used

### **3. Storage:**
- ✅ Bucket name: `'santri-documents'`
- ✅ RLS policies active
- ✅ Path structure: `santri/{santriId}/{jenisDokumen}/{fileName}`

---

## 🎯 TEST SCENARIO 1: PENDAFTARAN SANTRI REGULER

### **Objective:** Verify minimal registration flow

### **Steps:**

#### **1. Navigate to Santri Page**
```
URL: http://localhost:8080/santri
Expected: List of santri with "Tambah Santri" button
```

#### **2. Click "Tambah Santri"**
```
Expected: Dialog opens with SantriFormFixed
Tabs: Informasi Pribadi, Data Wali, Program, Dokumen
```

#### **3. Fill Tab 1: Informasi Pribadi (Minimal)**
```
✅ Required Fields:
- Kategori: Select "Santri Reguler"
- Nama Lengkap: "Test Santri Reguler"
- Tempat Lahir: "Jakarta"
- Tanggal Lahir: "2010-01-01"
- Jenis Kelamin: "Laki-laki"
- Agama: "Islam" (default)
- Status Sosial: "Lengkap" (default)
- Alamat: "Jl. Test No. 123"
- No. WhatsApp: "08123456789"

✅ Auto-set Fields (by trigger):
- tipe_pembayaran: Should auto-set to "Mandiri"
- NIS: Auto-generated
```

#### **4. Fill Tab 2: Data Wali (Minimal)**
```
✅ Required Fields:
- Nama Lengkap: "Bapak Test"
- Hubungan Keluarga: "Ayah"
- No. WhatsApp: "08123456790"
- Alamat: "Jl. Test No. 123"
- Is Utama: true (checkbox checked)

❌ Optional Fields (skip for reguler):
- Pekerjaan
- Penghasilan Bulanan
```

#### **5. Fill Tab 3: Program**
```
✅ Required:
- Pilih Program: Select dari dropdown (e.g., "Santri Mukim SD")
- Kelas: "1"
- Rombel: "A" (optional)
```

#### **6. Fill Tab 4: Upload Dokumen**
```
✅ Expected Documents (5 total):
1. Pas Foto (wajib) - Upload JPG/PNG
2. Kartu Keluarga (wajib) - Upload PDF/JPG
3. Akta Kelahiran (wajib) - Upload PDF/JPG
4. Ijazah Terakhir (opsional) - Can skip
5. Transkrip Nilai (opsional) - Can skip

⚠️ Validation:
- Max file size: 10MB
- Allowed types: PDF, JPG, PNG
- Document names must match exactly
```

#### **7. Save**
```
Click "Simpan Data Santri"

✅ Expected Results:
- Toast success: "Data santri berhasil disimpan"
- Dialog closes
- Santri appears in list
- Database checks:
  * santri.tipe_pembayaran = 'Mandiri'
  * santri.kategori = 'Santri Reguler'
  * santri.status_sosial = 'Lengkap'
  * dokumen_santri has 3+ rows (wajib docs)
  * santri_wali has 1 row
  * santri_programs has 1 row
```

---

## 🎯 TEST SCENARIO 2: PENGAJUAN BEASISWA YATIM

### **Objective:** Verify beasiswa application flow untuk Yatim

### **Steps:**

#### **1. Open Santri Profile**
```
Click santri name → View Profile
Expected: Profile page with tabs
```

#### **2. Click "Ajukan Beasiswa"**
```
Button location: Top right of profile
Expected: PengajuanBeasiswaForm dialog opens
Progress: Step 1/3 highlighted
```

#### **3. Step 1: Pilih Jenis Beasiswa**
```
✅ Select: "🕌 Beasiswa Yatim"
Radio button value: "Yatim"

Expected UI:
- Card highlights with blue border
- Shows "Coverage: 100%"
- Shows "📄 Dokumen tambahan: Akta Kematian Ayah"

✅ Fill Alasan:
Textarea: "Ayah telah meninggal dunia sejak 2 tahun lalu. Ibu bekerja sebagai buruh dengan penghasilan tidak tetap. Kami sangat memerlukan bantuan beasiswa untuk pendidikan."

Expected Validation:
- Character counter shows: 154/20 ✅
- "Selanjutnya" button enabled
```

#### **4. Step 2: Kondisi Kesehatan**
```
✅ Riwayat Penyakit:
Select: "Tidak Ada" or "Ada"

If "Ada":
- Kondisi Khusus: (optional)
- Alergi: (optional)
- Obat Rutin: (optional)

Expected Validation:
- "Selanjutnya" button enabled after selection
```

#### **5. Step 3: Upload Dokumen Tambahan**
```
✅ Expected Alert:
- Shows "Sudah Ada: Pas Foto, Kartu Keluarga, Akta Kelahiran"
- Shows "Perlu Upload: Dokumen yang ditandai (*) wajib"

✅ Required Documents for Yatim:
1. ✅ Akta Kematian Orang Tua * (WAJIB)
2. ✅ Surat Keterangan Yatim * (WAJIB)
3. ✅ Surat Permohonan * (WAJIB)

Expected UI:
- Cards show "WAJIB" badge for required docs
- "Pilih File" button highlighted blue
- After upload: Green border, checkmark, file name shown
- File size displayed
- "Ganti File" option available

✅ Summary Card:
- Shows "3 dari 3 dokumen wajib telah diupload"
- Green checkmark: "Siap Diajukan"
```

#### **6. Submit**
```
Click "Ajukan Beasiswa" button

✅ Expected Process:
1. Update santri.status_sosial = 'Yatim'
2. Create pengajuan_beasiswa_santri record
   - jenis_beasiswa: 'Yatim'
   - status: 'pending'
   - persentase_beasiswa: 100
3. Upload all documents to storage
4. Insert dokumen_santri records with pengajuan_beasiswa_id
5. Toast success
6. Dialog closes
7. Profile refreshes

✅ Database Checks:
- pengajuan_beasiswa_santri: 1 new row, status = 'pending'
- dokumen_santri: 3+ new rows (linked to pengajuan_id)
- santri.status_sosial = 'Yatim'
```

---

## 🎯 TEST SCENARIO 3: VERIFIKASI & APPROVAL

### **Objective:** Test admin flow

### **Steps:**

#### **1. Navigate to Verifikasi Beasiswa**
```
URL: http://localhost:8080/verifikasi-beasiswa
Expected: List of pending pengajuan
```

#### **2. Click "Verifikasi"**
```
Expected: Show detail pengajuan
Can view uploaded documents
```

#### **3. Verify**
```
Action: Click "Setujui Verifikasi"
Expected:
- status changes to 'diverifikasi'
- verified_at timestamp set
- verified_by set to current user
```

#### **4. Navigate to Approval**
```
URL: http://localhost:8080/approval-beasiswa
Expected: List of verified pengajuan
```

#### **5. Approve**
```
Action: Click "Setujui"
Fill: Nomor SK, Catatan Approval

Expected: Trigger auto_create_beasiswa_aktif fires
- beasiswa_aktif_santri: 1 new row created
- santri.tipe_pembayaran = 'Beasiswa'
- pengajuan_beasiswa_santri.status = 'disetujui'
```

---

## 🎯 TEST SCENARIO 4: POST-APPROVAL VALIDATION

### **Objective:** Verify alert for missing school info

### **Steps:**

#### **1. View Profile (Binaan Mukim Recipient)**
```
Navigate: /santri/profile?santriId=xxx
Expected: Profile page loads
```

#### **2. Check for Alert**
```
✅ If Binaan Mukim AND Missing School Info:

Expected Alert:
┌─────────────────────────────────────────┐
│ ⚠️ Data Sekolah Belum Lengkap!         │
│                                         │
│ Sebagai penerima beasiswa Binaan Mukim, │
│ Anda wajib melengkapi data sekolah:    │
│                                         │
│ • Nama Sekolah                         │
│ • Kelas                                │
│ • Nama Wali Kelas                      │
│ • Nomor Telepon Wali Kelas             │
│                                         │
│ [Lengkapi Sekarang]                    │
└─────────────────────────────────────────┘

Alert Color: Amber/Yellow
Position: Below stat cards, above tabs
```

#### **3. Click "Lengkapi Sekarang"**
```
Expected: Navigate to edit form
Auto-focus: Data sekolah section (if exists)
```

#### **4. Fill School Info**
```
✅ Required Fields:
- Nama Sekolah: "SDN Test Jakarta"
- Kelas: "1"
- Nama Wali Kelas: "Ibu Test"
- No. Telepon Wali Kelas: "08123456791"
```

#### **5. Save & Re-check Profile**
```
Expected:
- Data saved successfully
- Navigate back to profile
- ✅ Alert TIDAK MUNCUL LAGI
- All school info displayed in "Informasi Pribadi" tab
```

---

## 🎯 TEST SCENARIO 5: BEASISWA DHUAFA

### **Objective:** Test Dhuafa (different from Yatim/Piatu)

### **Key Differences:**

#### **Status Sosial:**
```
- Yatim/Piatu/Yatim Piatu: status_sosial diupdate
- Dhuafa: status_sosial tetap 'Lengkap' (kedua ortu hidup)
```

#### **Required Documents:**
```
1. ✅ SKTM * (Surat Keterangan Tidak Mampu)
2. ✅ Slip Gaji Orang Tua *
3. ✅ Surat Keterangan Penghasilan (opsional)
4. ✅ Surat Permohonan *
```

#### **Validation:**
```
Ensure SKTM dan Slip Gaji show as required
Ensure status_sosial remains 'Lengkap'
Ensure jenis_beasiswa = 'Dhuafa'
```

---

## 🎯 TEST SCENARIO 6: UPLOAD DARI PROFILE (Dokumen Tab)

### **Objective:** Test document upload from profile view

### **Steps:**

#### **1. Open Profile → Dokumen Tab**
```
Expected:
- Shows dokumen minimal (if reguler)
- Shows dokumen lengkap (if beasiswa)
- Sections: Minimal, Khusus, Pelengkap
```

#### **2. Upload New Document**
```
Action: Click file input, select file
Expected:
- Upload progress (if shown)
- File saved to storage
- Record created in dokumen_santri
- UI updates immediately
- File name, size, status shown
```

#### **3. Verify Document**
```
Action: Click "Verifikasi" button
Expected:
- Dialog opens
- Can select status: Terverifikasi, Belum Diverifikasi, Ditolak
- Can add catatan
- Save updates dokumen_santri
- Badge updates in UI
```

#### **4. Download Document**
```
Action: Click "Download" button
Expected:
- Creates signed URL
- File downloads successfully
- Filename preserved
```

#### **5. Delete Document**
```
Action: Click delete button
Expected:
- Confirmation prompt (if implemented)
- Removes from storage
- Removes from database
- UI updates immediately
```

---

## ⚠️ VALIDATION CHECKS

### **✅ Document Name Validation:**
```typescript
// Test these and ensure NO errors:
Valid Names:
- 'Pas Foto' ✅
- 'Akta Kelahiran' ✅
- 'Kartu Keluarga' ✅
- 'KTP Orang Tua' ✅
- 'Akta Kematian Orang Tua' ✅
- 'SKTM' ✅
- 'Surat Keterangan Yatim' ✅
- 'Surat Permohonan' ✅

// These should FAIL:
Invalid Names:
- 'Foto' ❌
- 'Akta Lahir' ❌
- 'KK' ❌
- 'KTP Wali' ❌
```

### **✅ Status Sosial Validation:**
```typescript
// Valid ENUM values:
- 'Yatim' ✅
- 'Piatu' ✅
- 'Yatim Piatu' ✅
- 'Lengkap' ✅

// Invalid values:
- 'Anak Yatim' ❌
- 'Anak Piatu' ❌
- 'Dhuafa' ❌ (this is jenis_beasiswa, not status_sosial)
```

### **✅ Auto-Assignment Validation:**
```typescript
// Trigger: auto_set_tipe_pembayaran

Test Case 1: Santri Reguler
- kategori = 'Santri Reguler'
- Expected: tipe_pembayaran = 'Mandiri'

Test Case 2: Santri Binaan Mukim
- kategori = 'Santri Binaan Mukim'
- Expected: tipe_pembayaran = 'Beasiswa'

Test Case 3: Beasiswa Approved
- pengajuan status = 'disetujui'
- Expected: 
  * beasiswa_aktif_santri created
  * santri.tipe_pembayaran = 'Beasiswa'
```

---

## 🐛 COMMON ERRORS TO CHECK

### **Error 1: Constraint Violation**
```
Error: "violates check constraint dokumen_santri_jenis_dokumen_check"
Check: Document name in console log
Fix: Ensure exact match with 20 valid types
```

### **Error 2: Storage Not Found**
```
Error: "Object not found" or "Bad Request"
Check: Bucket name and file path in console
Fix: Should be 'santri-documents' and 'santri/{id}/{type}/{file}'
```

### **Error 3: RLS Permission Denied**
```
Error: "new row violates row-level security policy"
Check: User is authenticated
Fix: Ensure logged in, check RLS policies
```

### **Error 4: Infinite Re-render**
```
Error: Browser hangs, console spam
Check: useEffect dependencies
Fix: Use useMemo for calculated values
```

---

## 📊 UI/UX CHECKLIST

### **✅ Modern & Professional:**
- [ ] Colors consistent (blue for primary, green for success, amber for warning)
- [ ] Icons meaningful and contextual
- [ ] Badges used appropriately
- [ ] Cards have proper spacing and shadows
- [ ] Gradients used subtly for visual interest

### **✅ Elegant & Clean:**
- [ ] No cluttered UI
- [ ] Clear visual hierarchy
- [ ] Proper whitespace
- [ ] Consistent font sizes
- [ ] Smooth transitions and animations

### **✅ User-Friendly:**
- [ ] Clear labels and instructions
- [ ] Visual feedback on actions (loading states, success/error)
- [ ] Progress indicators clear
- [ ] Error messages helpful
- [ ] Validation messages informative

### **✅ Responsive:**
- [ ] Mobile: Single column layout
- [ ] Tablet: 2 columns for documents
- [ ] Desktop: 3 columns for documents
- [ ] All forms scrollable on small screens
- [ ] Touch-friendly buttons (min 44x44px)

---

## 🎨 VISUAL DESIGN CHECKLIST

### **PengajuanBeasiswaForm:**
- ✅ Multi-step progress indicator with labels
- ✅ Checkmark icons for completed steps
- ✅ Color-coded cards (blue when selected)
- ✅ Document cards with status (green/amber/gray borders)
- ✅ "WAJIB" badges on required documents
- ✅ File size shown after upload
- ✅ Summary card shows completion status
- ✅ Gradient footer for better separation

### **UploadDokumenSantri:**
- ✅ Progress bar for completion percentage
- ✅ Stats cards (%, completed, total)
- ✅ Grid layout responsive (1/2/3 columns)
- ✅ Clear status icons and badges
- ✅ Action buttons well organized
- ✅ Format info shown

### **DokumenSantriTab:**
- ✅ Section separation (Minimal, Khusus, Pelengkap)
- ✅ Progress indicators per section
- ✅ Color-coded status badges
- ✅ Direct file input in cards
- ✅ Preview & verification dialogs
- ✅ Download functionality
- ✅ Responsive grid layout

### **SantriProfile:**
- ✅ Post-approval alert (amber, prominent)
- ✅ Missing fields listed clearly
- ✅ "Lengkapi Sekarang" CTA button
- ✅ Conditional tabs based on tipe_pembayaran
- ✅ Stat cards for key metrics

---

## 📝 TESTING DATA

### **Sample Santri Reguler:**
```json
{
  "nama_lengkap": "Ahmad Test Reguler",
  "tempat_lahir": "Jakarta",
  "tanggal_lahir": "2010-05-15",
  "jenis_kelamin": "Laki-laki",
  "agama": "Islam",
  "status_sosial": "Lengkap",
  "kategori": "Santri Reguler",
  "tipe_pembayaran": "Mandiri",
  "alamat": "Jl. Raya Test No. 123",
  "no_whatsapp": "081234567890"
}
```

### **Sample Santri Yatim (After Beasiswa):**
```json
{
  "nama_lengkap": "Fatimah Test Yatim",
  "status_sosial": "Yatim",
  "kategori": "Santri Binaan Mukim",
  "tipe_pembayaran": "Beasiswa",
  "nama_sekolah_formal": "SDN Test Jakarta",
  "kelas_sekolah_formal": "3",
  "nama_wali_kelas": "Ibu Wali Test",
  "no_telepon_wali_kelas": "082345678901"
}
```

---

## 🚦 EXPECTED BEHAVIOR MATRIX

| Kategori | Tipe Pembayaran | Tabs Shown | Documents Required | Post-Approval |
|----------|----------------|------------|-------------------|---------------|
| Santri Reguler | Mandiri | Info, Monitoring, Tagihan | 5 (3 wajib) | - |
| Santri Binaan Mukim | Beasiswa | Info, Hak & Bantuan, Tabungan, Monitoring | 8-12 (depends on status) | ⚠️ Alert jika missing school info |
| Santri Binaan Non-Mukim | Beasiswa | Info, Hak & Bantuan, Tabungan, Monitoring | 3-5 (minimal) | - |

---

## ✅ SUCCESS CRITERIA

### **All tests pass if:**
1. ✅ Santri reguler can be registered with minimal data (5 docs)
2. ✅ Beasiswa application works for all types (Yatim/Piatu/Yatim Piatu/Dhuafa)
3. ✅ Document upload works without constraint violations
4. ✅ Verification system updates status correctly
5. ✅ Approval triggers create beasiswa_aktif_santri
6. ✅ Post-approval alert shows for missing school info
7. ✅ Alert disappears after completing school info
8. ✅ No infinite re-renders
9. ✅ No console errors
10. ✅ UI is responsive on all screen sizes

---

## 📞 TROUBLESHOOTING

### **If documents fail to upload:**
1. Check console for exact error message
2. Verify document name matches constraint
3. Check file size < 10MB
4. Verify bucket name is `'santri-documents'`
5. Check RLS policies

### **If form validation fails:**
1. Check required fields are filled
2. Check character count (min 20 for alasan)
3. Check all wajib documents uploaded
4. Check console for validation errors

### **If post-approval alert not showing:**
1. Verify tipe_pembayaran = 'Beasiswa'
2. Verify kategori = 'Santri Binaan Mukim'
3. Check if all 4 school fields are empty
4. Clear browser cache and refresh

---

## 🎯 FINAL CHECKLIST

Before declaring "READY FOR PRODUCTION":

- [ ] All 6 test scenarios pass
- [ ] No console errors
- [ ] No linter errors
- [ ] UI is responsive (test mobile, tablet, desktop)
- [ ] All document types work
- [ ] All status types work (Yatim, Piatu, Yatim Piatu, Dhuafa)
- [ ] Post-approval alert works
- [ ] Verification system works
- [ ] Download documents works
- [ ] Delete documents works

---

**Happy Testing!** 🚀

Last Updated: October 14, 2025


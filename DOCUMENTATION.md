# 🏫 Dokumentasi Sistem Manajemen Pesantren Al-Bisri

**Type**: LKSA (Lembaga Kesejahteraan Sosial Anak)  
**Status**: ✅ Production Ready  
**Version**: 2.0  
**Last Updated**: Oktober 23, 2025

---

## 📑 Daftar Isi

1. [Overview Sistem](#overview-sistem)
2. [Tech Stack](#tech-stack)
3. [Quick Start](#quick-start)
4. [Arsitektur Sistem](#arsitektur-sistem)
5. [Database Schema Overview](#database-schema-overview)
6. [Modul-Modul Utama](#modul-modul-utama)
7. [User Roles & Permissions](#user-roles--permissions)
8. [API & Endpoints](#api--endpoints)
9. [Deployment](#deployment)
10. [Troubleshooting Common Issues](#troubleshooting-common-issues)
11. [Roadmap & Future Development](#roadmap--future-development)
12. [Changelog](#changelog)

---

## 🎯 Overview Sistem

Sistem Manajemen Pesantren Al-Bisri adalah aplikasi web komprehensif untuk mengelola LKSA (Lembaga Kesejahteraan Sosial Anak) dengan fitur:

### ✅ Modul yang Sudah Production Ready

- **📚 Modul Santri** - Manajemen data santri lengkap
- **🎁 Modul Donasi** - Sistem donasi dengan donor tracking
- **📦 Modul Inventaris** - Manajemen stok dan aset
- **💰 Modul Keuangan** - Sistem keuangan multi-akun
- **🎓 Modul Beasiswa** - Workflow beasiswa terstruktur
- **📊 Modul Monitoring** - Tracking dan laporan

### 🎯 Fitur Utama

- **CRUD Lengkap** untuk semua entitas
- **Workflow Approval** untuk beasiswa dan santri
- **Multi-akun Kas** dengan rekonsiliasi bank
- **Donor Tracking** dengan tier system
- **Export/Import** CSV dan PDF
- **Role-based Access** control
- **Real-time Alerts** dan monitoring

---

## 🛠️ Tech Stack

### Frontend
- **React** 18+ with TypeScript
- **Vite** - Build tool
- **shadcn/ui** - UI components
- **Tailwind CSS** - Styling
- **React Hook Form** + **Zod** - Form validation
- **TanStack Query** - Data fetching
- **date-fns** - Date formatting
- **jsPDF** + **jspdf-autotable** - PDF export
- **Lucide React** - Icons

### Backend
- **Supabase** - PostgreSQL database + Auth
- **Row Level Security (RLS)** - Data protection
- **Database Functions** - Business logic
- **Triggers** - Auto-updates

### Development
- **ESLint** - Code linting
- **TypeScript** - Type safety
- **Git** - Version control

---

## 🚀 Quick Start

### 1. Install Dependencies

```bash
npm install
```

### 2. Setup Environment

Buat file `.env.local`:

```bash
VITE_SUPABASE_URL=your-project-url
VITE_SUPABASE_ANON_KEY=your-anon-key
```

### 3. Run Database Migrations

Via Supabase Dashboard → SQL Editor, jalankan migrations dengan urutan:

1. `20250102030000_create_pesantren_tables.sql`
2. `20251008000000_create_donations_module.sql`
3. `20251009000000_create_donor_profiles.sql`
4. `20251009020000_create_beasiswa_module.sql`
5. `20251010000000_santri_complete.sql`
6. `20251018000000_create_akun_kas_system.sql`

### 4. Start Development Server

```bash
npm run dev
```

Server akan berjalan di: **http://localhost:8080**

---

## 🏗️ Arsitektur Sistem

### System Architecture

```
┌─────────────────────────────────────────────────────────────────┐
│                    STUDENT MANAGEMENT SYSTEM                    │
└─────────────────────────────────────────────────────────────────┘
                              ↓
        ┌─────────────────────┴─────────────────────┐
        ↓                                           ↓
┌───────────────────┐                   ┌───────────────────┐
│   REGISTRATION    │                   │   OPERATIONAL     │
│     MODULES       │                   │     MODULES       │
└───────────────────┘                   └───────────────────┘
        ↓                                           ↓
┌───────────────────┐                   ┌───────────────────┐
│ 1. Data Santri    │                   │ 4. Program Santri │
│ 2. Approval       │                   │ 5. Beasiswa       │
│ 3. Ploating Kelas │                   │ 6. Keuangan       │
└───────────────────┘                   │ 7. Donasi         │
                                        │ 8. Inventaris     │
                                        │ 9. Monitoring     │
                                        └───────────────────┘
```

### Data Flow

**Registration → Approval → Ploating → Active**

1. **Registration** - Input data santri dengan form adaptif
2. **Approval** - Review dan verifikasi data
3. **Ploating** - Assignment ke program/kelas
4. **Active** - Santri aktif dengan beasiswa/tagihan

---

## 🗄️ Database Schema Overview

### Core Tables (30+ tables)

**Santri Management:**
- `santri` - Data santri utama
- `santri_wali` - Data wali/orang tua
- `dokumen_santri` - Dokumen upload
- `program_santri` - Program dengan tarif
- `komponen_biaya_program` - Komponen biaya

**Beasiswa:**
- `program_beasiswa` - Master program beasiswa
- `pengajuan_beasiswa_santri` - Pengajuan workflow
- `beasiswa_aktif_santri` - Beasiswa approved
- `pencairan_beasiswa` - History pencairan

**Keuangan:**
- `keuangan` - Transaksi keuangan
- `akun_kas` - Multi-akun kas
- `pembayaran_santri` - Tagihan & pembayaran
- `cicilan_pembayaran` - Cicilan pembayaran

**Donasi:**
- `donations` - Header donasi
- `donation_items` - Detail items
- `donor_profiles` - Profile donor dengan tier

**Inventaris:**
- `inventaris` - Master item
- `transaksi_inventaris` - History transaksi

---

## 📚 Modul-Modul Utama

### 6.1 Modul Santri 📚

**Status**: ✅ Production Ready (90%)

**Fitur Utama:**
- CRUD data santri dengan form wizard
- Program santri dengan komponen biaya terstruktur
- Upload dokumen dengan verifikasi
- CSV import/export
- Form adaptif berdasarkan kategori

**Kategori Santri:**
- Santri Binaan Mukim/Non-Mukim
- Mahasantri Reguler/Beasiswa
- Santri TPQ/Madin

**Database Tables:**
- `santri`, `santri_wali`, `dokumen_santri`
- `program_santri`, `komponen_biaya_program`
- `riwayat_status_santri`

**URL Routes:**
- `/santri` - List & CRUD santri
- `/santri/profile/:id` - Detail santri
- `/santri/add` - Tambah santri
- `/program-santri` - Kelola program

### 6.2 Modul Beasiswa 🎓

**Status**: 🔄 Development (50%)

**Fitur Utama:**
- Program beasiswa dengan tarif transparan
- Workflow pengajuan → verifikasi → approval
- Persentase fleksibel (25%, 50%, 75%, 100%)
- Evaluasi berkala
- Integration dengan pembayaran santri

**Workflow:**
1. **Pengajuan** - Form 4-step wizard
2. **Verifikasi** - Admin review dokumen
3. **Approval** - Pimpinan keputusan final
4. **Aktif** - Pencairan bulanan otomatis

**Database Tables:**
- `program_beasiswa`, `pengajuan_beasiswa_santri`
- `beasiswa_aktif_santri`, `pencairan_beasiswa`

**URL Routes:**
- `/program-beasiswa` - Kelola program
- `/beasiswa/pengajuan` - Form pengajuan
- `/beasiswa/verifikasi` - Verifikasi (Coming Soon)
- `/beasiswa/approval` - Approval (Coming Soon)

### 6.3 Modul Keuangan 💰

**Status**: 🔄 Development (60%)

**Fitur Utama:**
- Multi-akun kas (Kas, Bank, Tabungan)
- Pembayaran santri dengan generate tagihan
- Rekonsiliasi bank dengan auto-matching
- Laporan laba rugi & arus kas
- Status transaksi (draft → posted)

**Database Tables:**
- `keuangan`, `akun_kas`, `kategori_keuangan`
- `pembayaran_santri`, `cicilan_pembayaran`
- `mutasi_bank`, `rekonsiliasi_bank`

**URL Routes:**
- `/keuangan-v3` - Keuangan advanced
- `/keuangan` - Basic keuangan
- `/tagihan-santri` - Pembayaran santri
- `/rekonsiliasi-bank` - Rekonsiliasi (Coming Soon)

### 6.4 Modul Donasi 🎁

**Status**: ✅ Production Ready (95%)

**Fitur Utama:**
- Donasi multi-tipe (tunai, makanan, barang)
- Donor tracking dengan tier & badges
- Hajat management untuk doa maghrib
- Export CSV/PDF dengan filter
- Print nota & daftar hajat

**Donor Tier System:**
- 💎 Diamond (≥Rp 10jt, 12+ bulan konsisten)
- 🏆 Platinum (≥Rp 5jt, 6+ bulan konsisten)
- 🥇 Gold (≥Rp 2jt, 3+ bulan konsisten)
- 🥈 Silver (≥Rp 500rb, 5+ donasi)
- 🥉 Bronze (Donatur baru)

**Database Tables:**
- `donations`, `donation_items`, `donor_profiles`

**URL Routes:**
- `/donasi` - Main donasi system

### 6.5 Modul Inventaris 📦

**Status**: ✅ Production Ready (90%)

**Fitur Utama:**
- CRUD inventaris dengan form validation
- Stock warnings & alerts
- Search & filter multi-field
- Export CSV Excel-compatible
- Real-time monitoring

**Database Tables:**
- `inventaris`, `transaksi_inventaris`

**URL Routes:**
- `/inventaris` - Main inventory system

### 6.6 Modul Monitoring 📊

**Status**: 🔄 Development (30%)

**Fitur Utama:**
- Progress tracking santri
- Absensi & penilaian
- Reports & analytics
- Dashboard overview

**URL Routes:**
- `/monitoring` - Monitoring dashboard

---

## 👥 User Roles & Permissions

### Role Hierarchy

- **Admin** - Full access ke semua modul
- **Bendahara** - Access ke keuangan, pembayaran, donasi
- **Staff Santri** - Access ke data santri, dokumen
- **Staff Beasiswa** - Access ke pengajuan & verifikasi beasiswa
- **Pimpinan** - Read-only access + approval beasiswa
- **Viewer** - Read-only access

### Permission Matrix

| Module | Admin | Bendahara | Staff Santri | Staff Beasiswa | Pimpinan | Viewer |
|--------|-------|-----------|---------------|----------------|----------|--------|
| Santri | ✅ | ❌ | ✅ | ❌ | 👁️ | 👁️ |
| Beasiswa | ✅ | ❌ | ❌ | ✅ | ✅ | 👁️ |
| Keuangan | ✅ | ✅ | ❌ | ❌ | 👁️ | 👁️ |
| Donasi | ✅ | ✅ | ❌ | ❌ | 👁️ | 👁️ |
| Inventaris | ✅ | ❌ | ❌ | ❌ | 👁️ | 👁️ |
| Monitoring | ✅ | ✅ | ✅ | ✅ | ✅ | 👁️ |

---

## 🔗 API & Endpoints

### Supabase Integration

**Authentication:**
```typescript
const { data, error } = await supabase.auth.signInWithPassword({
  email: 'user@example.com',
  password: 'password'
});
```

**Database Queries:**
```typescript
// Get santri data
const { data: santri } = await supabase
  .from('santri')
  .select('*')
  .eq('status_santri', 'Aktif');

// Insert donasi
const { data: donation } = await supabase
  .from('donations')
  .insert({
    donation_type: 'cash',
    cash_amount: 500000,
    donor_name: 'Ibu Siti'
  });
```

**Database Functions:**
- `generate_tagihan_massal()` - Generate tagihan santri
- `catat_pembayaran_santri()` - Record payment
- `calculate_donor_tier()` - Update donor tier
- `approve_pengajuan_beasiswa()` - Approve scholarship

---

## 🚀 Deployment

### Via Lovable (Recommended)

1. Visit [Lovable Project](https://lovable.dev/projects/9d860f02-6d80-43a3-b792-aef268da3f22)
2. Click Share → Publish
3. Domain: Custom domain available

### Via Vercel/Netlify

```bash
# Build production
npm run build

# Deploy dist/ folder
```

### Environment Variables

```bash
VITE_SUPABASE_URL=your-project-url
VITE_SUPABASE_ANON_KEY=your-anon-key
```

---

## 🛠️ Troubleshooting Common Issues

### Error: "Function does not exist"

**Solusi:** Run migration files dengan urutan yang benar

### Data Santri Tidak Tampil

**Check:**
1. Migrations sudah di-run semua?
2. Browser console (F12) ada error?
3. Supabase connection OK?

**Quick Fix:**
```sql
-- Check santri data
SELECT COUNT(*) FROM santri WHERE status_santri = 'Aktif';
```

### Upload Dokumen Failed

**Penyebab:** File terlalu besar atau format tidak didukung
**Solusi:** 
- Max 5MB per file
- Supported: PDF, JPG, PNG, DOCX
- Check browser console untuk error detail

### Tier Donor Tidak Update

**Solusi:**
```sql
-- Manual trigger update
SELECT update_donor_profile_stats();
```

### Export CSV Encoding Error

**Solusi:** System sudah pakai UTF-8 BOM, tapi jika masih error:
1. Open di Notepad → Save As → Encoding: UTF-8
2. Atau open di Google Sheets dulu → Download as Excel

---

## 🗺️ Roadmap & Future Development

### Phase 1 (Completed)
- ✅ Core modules (Santri, Donasi, Inventaris)
- ✅ Database schema & migrations
- ✅ Basic UI/UX

### Phase 2 (In Progress)
- 🔄 Beasiswa workflow completion
- 🔄 Keuangan advanced features
- 🔄 Monitoring dashboard

### Phase 3 (Planned)
- 📧 Email notifications
- 📱 SMS notifications
- 📊 Advanced analytics
- 📄 PDF reports
- 📤 Excel import/export
- 🔐 Role-based access control
- 📱 Mobile app
- 🌐 Parent portal

### Phase 4 (Future)
- 🤖 AI-powered insights
- 📈 Predictive analytics
- 🔗 Third-party integrations
- 🌍 Multi-language support

---

## 📝 Changelog

### [2.0.0] - 2025-10-23

#### Added
- Master documentation consolidation
- Donor tracking system with tier & badges
- Multi-akun kas system
- Beasiswa workflow with approval process
- Advanced keuangan with bank reconciliation
- Real-time inventory alerts

#### Changed
- Consolidated documentation (157 → 10 files)
- Improved beasiswa workflow
- Enhanced UI/UX across all modules
- Better error handling and validation

#### Fixed
- Various bugfixes (see git history)
- Database schema optimizations
- Performance improvements

### [1.0.0] - 2024-xx-xx
- Initial release
- Basic CRUD untuk santri, keuangan, inventaris
- Authentication & authorization
- Basic reporting

---

## 📞 Support & Contact

### Getting Help

1. **Check Documentation** - Lihat bagian troubleshooting
2. **Browser Console** - Press F12 untuk error messages
3. **Network Tab** - Check API errors
4. **Verify Supabase** - Connection status
5. **Check Migrations** - Pastikan semua migrations sudah di-run

### Common Resources

- **Supabase Dashboard**: https://supabase.com/dashboard
- **Lovable Project**: https://lovable.dev/projects/9d860f02-6d80-43a3-b792-aef268da3f22
- **Git Repository**: [Your Git URL]

### Development Team

- **Maintainer**: Development Team
- **For**: LKSA Pesantren Al-Bisri, Kudus
- **Last Updated**: Oktober 23, 2025

---

**Sistem Manajemen Pesantren Al-Bisri - Terorganisir, Transparan, Profesional** ✨

---

*Dokumentasi ini menggantikan 157 file MD yang sebelumnya tersebar dan sulit di-navigate. Semua informasi penting telah dikonsolidasi dalam satu file yang mudah dipahami dan di-maintain.*

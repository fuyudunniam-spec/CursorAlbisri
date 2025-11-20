# 🎁 MODUL DONASI - Dokumentasi Lengkap

> **Sistem Manajemen Donasi & Donor Relationship Management**  
> **Version**: 2.0  
> **Last Updated**: Oktober 10, 2025  
> **Status**: ✅ Production Ready

---

## 📑 Daftar Isi

1. [Overview](#overview)
2. [Database Schema](#database-schema)
3. [Fitur Utama](#fitur-utama)
4. [Donor Tracking System](#donor-tracking-system)
5. [Setup & Instalasi](#setup--instalasi)
6. [Cara Penggunaan](#cara-penggunaan)
7. [Export & Reports](#export--reports)

---

## 🎯 Overview

Modul Donasi adalah sistem manajemen donasi komprehensif dengan fitur:
- **Donasi Multi-Tipe** - Tunai, Makanan, Barang/Aset
- **Donor Tracking** - Tier system & achievement badges
- **Hajat Management** - Tracking hajat untuk doa maghrib
- **Export Capabilities** - CSV & PDF dengan filter
- **Auto-Categorization** - Smart detection makanan vs aset
- **Print Features** - Nota penerimaan & daftar hajat

### Tipe Donasi:
1. **Uang Tunai** → Masuk ke kas keuangan
2. **Makanan Siap Saji** → Langsung habis (konsumsi)
3. **Barang/Aset** → Masuk gudang inventaris

---

## 🗄️ Database Schema

### 1. **Tabel `donations`**

```sql
- id (UUID, PK)
- donation_type ('cash' | 'in_kind' | 'pledge')
- donation_date (DATE, default: today)

-- Donor Info
- donor_name (VARCHAR, REQUIRED)
- donor_phone (VARCHAR)
- donor_email (VARCHAR)
- donor_address (TEXT)

-- Cash Donations
- cash_amount (DECIMAL, for donation_type = 'cash')

-- Purpose
- hajat_doa (TEXT) - Hajat/doa yang diminta
- notes (TEXT) - Catatan tambahan

-- Status & Posting
- status ('pending' | 'received' | 'posted' | 'cancelled')
- posted_to_stock_at (TIMESTAMP) - Kapan di-post ke inventaris
- posted_to_finance_at (TIMESTAMP) - Kapan di-post ke keuangan

-- Metadata
- created_by (UUID, FK → auth.users)
- created_at, updated_at
```

### 2. **Tabel `donation_items`**

```sql
- id (UUID, PK)
- donation_id (UUID, FK → donations, CASCADE)

-- Item Info
- raw_item_name (VARCHAR) - Nama barang asli
- quantity (INT)
- uom (VARCHAR, e.g., 'kg', 'buah', 'porsi')
- estimated_value (DECIMAL) - Estimasi nilai dalam rupiah

-- Inventory Mapping
- mapped_item_id (UUID, FK → inventaris) - Link ke inventaris (optional)
- mapping_status ('unmapped' | 'mapped' | 'posted')
- is_posted_to_stock (BOOLEAN, default: false)

-- Food Items
- expiry_date (DATE) - Untuk makanan
- is_consumable (BOOLEAN) - Makanan siap konsumsi = true

-- Metadata
- created_at, updated_at
```

### 3. **Tabel `donor_profiles`** 🆕

```sql
- id (UUID, PK)
- donor_name (VARCHAR, UNIQUE) - Nama donatur
- donor_phone (VARCHAR)
- donor_email (VARCHAR)
- donor_address (TEXT)

-- Statistics
- first_donation_date (DATE)
- last_donation_date (DATE)
- total_donations_count (INT)
- total_cash_amount (DECIMAL)
- total_goods_value (DECIMAL)
- total_goods_count (INT) - Jumlah donasi barang

-- Consistency Tracking
- consecutive_months (INT) - Bulan berturut-turut
- longest_streak (INT) - Streak terpanjang
- current_streak_active (BOOLEAN)
- last_donation_month (VARCHAR, 'YYYY-MM')

-- Tier & Recognition
- donor_tier ('Diamond' | 'Platinum' | 'Gold' | 'Silver' | 'Bronze')
- badges (JSONB) - Array of badge codes
- tier_updated_at (TIMESTAMP)

-- Recency
- days_since_last_donation (INT)
- donor_status ('Active' | 'Recent' | 'Lapsed' | 'Inactive')

-- Additional
- special_notes (TEXT)
- preferred_contact_method (VARCHAR)

-- Metadata
- created_at, updated_at
```

**Auto-Update Triggers:**
- Setiap ada donasi baru/update → trigger `trg_update_donor_profile`
- Function: `update_donor_profile_stats()` → calculate tier & badges

---

## ✨ Fitur Utama

### 1. **Input Donasi Multi-Tipe**

**Form Features:**
```
┌─────────────────────────────────────┐
│ Tipe Donasi                         │
│ ○ Uang Tunai                        │
│ ○ Makanan/Konsumsi                  │
│ ○ Barang/Aset                       │
├─────────────────────────────────────┤
│ Data Donatur:                       │
│ • Nama (Required)                   │
│ • No HP (Optional)                  │
│ • Alamat (Optional)                 │
├─────────────────────────────────────┤
│ JIKA TUNAI:                         │
│ • Jumlah Uang: Rp ___               │
├─────────────────────────────────────┤
│ JIKA MAKANAN/BARANG:                │
│ • Nama Item                         │
│ • Jumlah + Satuan                   │
│ • Estimasi Nilai (Optional)         │
│ • [+ Tambah Item]                   │
├─────────────────────────────────────┤
│ Hajat/Doa:                          │
│ • [Text area]                       │
├─────────────────────────────────────┤
│ Tanggal: [Date Picker]              │
└─────────────────────────────────────┘
[Simpan] [Batal]
```

**Smart Features:**
- Dropdown donatur (auto-suggest dari donor_profiles)
- Auto-populate phone/address jika donatur sudah pernah donasi
- Multiple items untuk donasi barang
- Auto-detect makanan vs aset berdasarkan keyword

### 2. **Dashboard Stats (3 Cards)**

```
┌─────────────────────────────────────────────────────────┐
│ ┌──────────────┐ ┌──────────────┐ ┌─────────────────┐ │
│ │ 🎁 Donasi    │ │ 💰 Pemasukan │ │ 🕌 Hajat Hari   │ │
│ │ Bulan Ini    │ │ Kas          │ │ Ini             │ │
│ │              │ │              │ │                 │ │
│ │ 45 donasi    │ │ Rp 15.5 juta │ │ 8 hajat         │ │
│ │ 32 donatur   │ │ (tunai)      │ │ (doa maghrib)   │ │
│ └──────────────┘ └──────────────┘ └─────────────────┘ │
└─────────────────────────────────────────────────────────┘
```

### 3. **Tab Navigation (2 Tabs)**

#### **Tab 1: 📋 Hajat Hari Ini**

Display card-style untuk setiap hajat:

```
┌──────────────────────────────────────────────────┐
│ 💎 Ibu Siti (Diamond Donor)                      │
│ ☎ 0812-3456-7890                                 │
│ 📍 Jl. Masjid No. 15, Kudus                      │
├──────────────────────────────────────────────────┤
│ Donasi:                                          │
│ • Uang Tunai: Rp 500.000                         │
│ • Nasi Kotak: 50 porsi                           │
├──────────────────────────────────────────────────┤
│ 🤲 Hajat:                                        │
│ "Untuk arwah almarhum suami, semoga husnul      │
│  khatimah dan diterima amal ibadahnya."         │
├──────────────────────────────────────────────────┤
│ [📄 Print Nota] [📱 Share WA] [✏️ Edit]        │
└──────────────────────────────────────────────────┘
```

**Actions:**
- **Print Nota** - Bukti penerimaan donasi
- **Share WA** - Kirim ucapan terima kasih via WhatsApp
- **Edit/Delete** - Modify donasi

**Print Daftar Hajat:**
- Button di atas cards: "🖨️ Print Semua Hajat"
- Format untuk ustadz baca saat doa maghrib

#### **Tab 2: 🔍 Riwayat Donasi**

**Filter & Search:**
```
┌────────────────────────────────────────────────────┐
│ 🔍 Search: [_______________]  📁 [Semua Kategori ▼]│
│ 📥 [Export CSV] 📄 [Export PDF]                   │
└────────────────────────────────────────────────────┘
```

**Filter Options:**
- Semua Kategori
- Uang Tunai
- Makanan Siap Saji
- Aset/Barang

**Table (8 Columns):**

| Tanggal | Nama Donatur | No HP | Alamat | Kategori | Detail | Status | Aksi |
|---------|-------------|--------|---------|----------|--------|--------|------|
| 10 Okt 2025 | **Ibu Siti**<br/>💎 Diamond | 0812-xxx | Jl. Masjid... | 💰 Tunai | Rp 500.000 | ✅ Kas Masuk | ⋮ |
| 10 Okt 2025 | Pak Ahmad<br/>🥇 Gold | 0813-xxx | Kudus | 🍱 Makanan | Nasi Kotak 50 porsi | ✅ Langsung Habis | ⋮ |
| 09 Okt 2025 | Bu Fatimah<br/>🥈 Silver | - | - | 📦 Aset | Beras 50kg, Minyak 10L | ✅ Masuk Gudang | ⋮ |

**Aksi Dropdown (⋮):**
- 📄 Print Nota
- ✏️ Edit
- 🗑️ Hapus

**Features:**
- Real-time search (nama, HP, alamat, hajat)
- Filter kategori
- Pagination
- Hover effects
- Loading skeleton
- Empty state

### 4. **Donor Tracking & Tier System** 🆕

#### **Tier Levels (5):**

| Tier | Kriteria | Icon | Color |
|------|----------|------|-------|
| 💎 **Diamond** | Total ≥ Rp 10jt, 12+ bulan konsisten, 24+ donasi | 💎 | Blue-purple gradient |
| 🏆 **Platinum** | Total ≥ Rp 5jt, 6+ bulan konsisten, 12+ donasi | 🏆 | Gray gradient |
| 🥇 **Gold** | Total ≥ Rp 2jt, 3+ bulan konsisten, 6+ donasi | 🥇 | Yellow gradient |
| 🥈 **Silver** | Total ≥ Rp 500rb, 5+ donasi | 🥈 | Gray-silver |
| 🥉 **Bronze** | Donatur baru atau < 5 donasi | 🥉 | Orange-bronze |

**Auto-Calculation:**
- Tier dihitung otomatis setiap ada donasi baru
- Function: `calculate_donor_tier()`
- Update real-time di UI

#### **Achievement Badges (7):**

| Badge | Kriteria | Icon |
|-------|----------|------|
| **Consistent Supporter** | 6+ bulan berturut-turut | ⭐ |
| **Reliable Partner** | 12+ bulan berturut-turut | 🎯 |
| **Founding Supporter** | Donatur > 1 tahun | 🌟 |
| **Major Contributor** | Donasi tunggal > Rp 5 juta | 💎 |
| **Food Hero** | 10+ kali donasi makanan | 🍱 |
| **Asset Supporter** | 10+ kali donasi barang | 📦 |
| **Streak Master** | 18+ bulan berturut-turut | 🔥 |

**Display:**
- Badge muncul di bawah tier (max 3 visible + tooltip untuk sisanya)
- Auto-assigned via function: `assign_donor_badges()`

#### **Donor Status (Recency):**

| Status | Kriteria | Indicator |
|--------|----------|-----------|
| 🟢 **Active** | < 30 hari terakhir donasi | Green dot |
| 🔵 **Recent** | 30-60 hari | Blue dot |
| 🟡 **Lapsed** | 60-90 hari ⚠️ | Orange dot (follow-up needed) |
| ⚪ **Inactive** | > 90 hari | Gray dot (re-engagement) |

**Auto-Update:** Daily job `update_donor_recency()`

#### **Donor Badge Component:**

```tsx
<DonorBadge 
  profile={donorProfile}
  showTier={true}
  showBadges={true}
  compact={false}
/>
```

**Display in Table:**
```
Ibu Siti
💎 Diamond ⭐🎯🌟 (+2 more)
```

**Tooltip on Hover:**
```
┌─────────────────────────────────────┐
│ 💎 Diamond Donor                    │
│ Total: Rp 15.500.000                │
│ Donasi: 28 kali (18 bulan konsisten)│
│                                     │
│ Badges:                             │
│ ⭐ Consistent Supporter             │
│ 🎯 Reliable Partner                 │
│ 🌟 Founding Supporter               │
│ 💎 Major Contributor                │
│ 🔥 Streak Master                    │
│                                     │
│ Status: 🟢 Active (5 hari lalu)     │
└─────────────────────────────────────┘
```

---

## 🔄 Auto-Categorization

### Smart Detection for Barang:

**Keywords Makanan:**
```javascript
['nasi', 'makanan', 'konsumsi', 'aqiqah', 'snack', 'roti', 
 'gorengan', 'kue', 'minuman', 'air mineral']
```
→ Category: **Makanan Siap Saji** → Status: Langsung Habis

**Keywords Aset:**
```javascript
['beras', 'minyak', 'gula', 'kursi', 'meja', 'komputer', 
 'printer', 'buku', 'alat', 'peralatan']
```
→ Category: **Aset/Barang** → Status: Masuk Gudang (optional: post to inventaris)

**Default:** Jika tidak match → Manual categorization

---

## 📊 Export & Reports

### 1. **Export CSV**

**Features:**
- UTF-8 encoding dengan BOM (Excel-compatible)
- Filter-aware (hanya export data yang terfilter)
- Filename: `donasi-{kategori}-{tanggal}.csv`

**Columns:**
```csv
Tanggal,Nama Donatur,No HP,Alamat,Kategori,Detail,Status,Hajat/Doa
10/10/2025,Ibu Siti,0812-3456-7890,Kudus,Uang Tunai,"Rp 500.000",Kas Masuk,"Untuk arwah..."
10/10/2025,Pak Ahmad,0813-xxx,Kudus,Makanan,"Nasi Kotak 50 porsi",Langsung Habis,"Syukuran..."
```

### 2. **Export PDF**

**Features:**
- Professional formatting dengan jsPDF + autotable
- Header berwarna (blue theme)
- Info: tanggal export + filter yang digunakan
- Filename: `donasi-{kategori}-{tanggal}.pdf`

**Layout:**
```
┌──────────────────────────────────────────────────┐
│          LAPORAN DONASI PESANTREN AL-BISRI       │
│          Filter: Semua Kategori                  │
│          Periode: Oktober 2025                   │
│          Dicetak: 10 Oktober 2025                │
├──────────────────────────────────────────────────┤
│ Tanggal │ Nama │ Kategori │ Detail │ Status     │
├──────────────────────────────────────────────────┤
│ ...     │ ...  │ ...      │ ...    │ ...        │
└──────────────────────────────────────────────────┘
          Total Donasi: 45 | Total Nilai: Rp 25jt
```

### 3. **Print Nota Donasi**

**Template:**
```
┌────────────────────────────────────────────┐
│        PESANTREN AL-BISRI                  │
│     TANDA TERIMA DONASI                    │
│                                            │
│ No: DONASI/2025/10/0045                    │
│ Tanggal: 10 Oktober 2025                   │
├────────────────────────────────────────────┤
│ Terima dari:                               │
│ Nama    : Ibu Siti                         │
│ Alamat  : Jl. Masjid No. 15, Kudus         │
│ No HP   : 0812-3456-7890                   │
├────────────────────────────────────────────┤
│ Berupa:                                    │
│ • Uang Tunai    : Rp 500.000               │
│ • Nasi Kotak    : 50 porsi                 │
├────────────────────────────────────────────┤
│ Untuk Hajat:                               │
│ "Untuk arwah almarhum suami..."            │
├────────────────────────────────────────────┤
│                                            │
│ Kudus, 10 Oktober 2025                     │
│                                            │
│                                            │
│         (___________________)              │
│              Penerima                      │
└────────────────────────────────────────────┘
```

### 4. **Print Daftar Hajat (untuk Doa Maghrib)**

```
═══════════════════════════════════════════════════
          DAFTAR HAJAT - 10 OKTOBER 2025
             UNTUK DOA MAGHRIB
═══════════════════════════════════════════════════

1. Ibu Siti (Kudus)
   Donasi: Rp 500.000 + Nasi Kotak 50 porsi
   Hajat: Untuk arwah almarhum suami, semoga 
          husnul khatimah...

2. Pak Ahmad (Kudus)
   Donasi: Rp 300.000
   Hajat: Syukuran atas kelancaran usaha...

3. Bu Fatimah (Jepara)
   Donasi: Beras 50kg, Minyak 10L
   Hajat: Kesembuhan anak yang sakit...

═══════════════════════════════════════════════════
         Total: 8 Hajat | Semoga Terkabul
═══════════════════════════════════════════════════
```

---

## 🚀 Setup & Instalasi

### Step 1: Run Database Migrations

**Migration Files:**
1. `supabase/migrations/20251008000000_create_donasi_system.sql`
   - Creates: `donations`, `donation_items`
   
2. `supabase/migrations/20251009000000_create_donor_profiles.sql`
   - Creates: `donor_profiles`
   - Functions: `calculate_donor_tier()`, `assign_donor_badges()`, `update_donor_profile_stats()`
   - Triggers: `trg_update_donor_profile`
   - Views: `v_top_donors`, `v_at_risk_donors`
   - Migrates: Existing donor data ke donor_profiles

**Via Supabase Dashboard:**
```
1. Login https://supabase.com/dashboard
2. SQL Editor → New Query
3. Copy-paste migration 1 → Run
4. New Query → Copy-paste migration 2 → Run
5. Verify success ✅
```

### Step 2: Verify Database

```sql
-- Check tables
SELECT table_name FROM information_schema.tables 
WHERE table_schema = 'public' 
AND table_name IN ('donations', 'donation_items', 'donor_profiles');

-- Check donor profiles migrated
SELECT donor_name, donor_tier, badges, total_cash_amount
FROM donor_profiles 
ORDER BY total_cash_amount DESC 
LIMIT 10;

-- Check views
SELECT * FROM v_top_donors LIMIT 5;
```

### Step 3: Install Frontend Dependencies

```bash
npm install jspdf jspdf-autotable
```

### Step 4: Test UI

1. Navigate ke `/donasi`
2. Test input donasi (tunai, makanan, barang)
3. Check tier badge muncul di table
4. Test filter & search
5. Test export CSV/PDF
6. Test print nota & hajat

---

## 📖 Cara Penggunaan

### A. Input Donasi Baru

1. Click **"Catat Donasi"**
2. Pilih tipe:
   - **Tunai** → Input jumlah uang
   - **Makanan/Konsumsi** → Input nama item, jumlah, porsi
   - **Barang/Aset** → Input nama item, jumlah, satuan, estimasi nilai
3. Isi data donatur (auto-suggest jika sudah pernah donasi)
4. Isi hajat/doa (optional tapi recommended)
5. **Simpan** → Donasi tercatat
6. **Bonus:** Tier donatur auto-update!

**Tips:**
- Gunakan dropdown donatur untuk consistency
- Isi no HP untuk kontak follow-up
- Hajat penting untuk doa maghrib

### B. Melihat Hajat Hari Ini

1. Go to tab **"📋 Hajat Hari Ini"**
2. Lihat cards hajat dengan detail donatur & donasi
3. Actions:
   - **Print Nota** → Berikan ke donatur
   - **Share WA** → Kirim terima kasih
   - **Print Semua** → Untuk ustadz (doa maghrib)

### C. Tracking Donor Performance

**Di Tabel Riwayat:**
- Lihat tier badge di kolom "Nama Donatur"
- Hover badge → Lihat detail statistik
- Identify VIP donors (Diamond/Platinum)

**Check Top Donors:**
```sql
SELECT * FROM v_top_donors LIMIT 10;
```

**Check At-Risk Donors:**
```sql
SELECT * FROM v_at_risk_donors; -- Major donors yang lapsed
```

### D. Filter & Export

**Scenario 1: Laporan Donasi Tunai Bulan Ini**
1. Tab "Riwayat Donasi"
2. Filter: "Uang Tunai"
3. Search: kosongkan (all)
4. Export CSV → `donasi-uang-tunai-2025-10-10.csv`

**Scenario 2: Laporan Donasi Makanan (untuk Pengurus Dapur)**
1. Filter: "Makanan Siap Saji"
2. Export PDF → Berikan ke pengurus dapur

**Scenario 3: Laporan Lengkap untuk Bendahara**
1. Filter: "Semua Kategori"
2. Export CSV → Import ke Excel untuk analisis

---

## 🎯 Business Scenarios

### Scenario 1: Daily Operations

**Pagi Hari:**
1. Buka tab "Hajat Hari Ini"
2. Check jumlah hajat
3. Print daftar hajat → Berikan ke ustadz
4. Optional: Share via WhatsApp

**Sore Hari:**
1. Input donasi yang masuk hari ini
2. Print nota untuk donatur
3. Check tier update (ada donor naik tier?)

### Scenario 2: Monthly Report

**Akhir Bulan:**
1. Tab "Riwayat Donasi"
2. No filter (all categories)
3. Export CSV → Monthly report
4. Export PDF → Print untuk pengurus
5. Review top donors:
   ```sql
   SELECT * FROM v_top_donors LIMIT 20;
   ```

### Scenario 3: Donor Appreciation

**Quarterly Event:**
1. Query v_top_donors
2. Undang Diamond/Platinum donors
3. Print certificates dengan tier badges
4. Personal thank you + impact report

### Scenario 4: Retention Management

**Weekly Review:**
1. Check at-risk donors:
   ```sql
   SELECT * FROM v_at_risk_donors;
   ```
2. Identify major donors yang lapsed
3. Assign follow-up task (telepon/WA)
4. Send personalized message

---

## 🏆 Donor Relationship Management

### Communication Strategy by Tier:

**💎 Diamond/Platinum:**
- Personal phone calls
- Quarterly face-to-face meetings
- Exclusive updates
- VIP events
- Impact reports

**🥇 Gold:**
- Monthly email newsletters
- Special events
- Annual appreciation
- Detailed impact reports

**🥈 Silver:**
- Regular email updates
- Annual appreciation letters
- Group events

**🥉 Bronze:**
- Welcome package
- Onboarding materials
- Nurture to higher tiers

### Recognition Ideas:

1. **Tier Upgrade Celebration**
   - Certificate of appreciation
   - Social media post (with permission)
   - Small gift/token

2. **Annual Donor Gala**
   - Invite Diamond/Platinum
   - Share impact stories
   - Donor spotlight

3. **Badges Achievement**
   - Digital badge untuk social media
   - Physical plaque untuk major milestones

---

## 📊 Analytics Queries

### 1. Donor Distribution by Tier

```sql
SELECT 
  donor_tier,
  COUNT(*) as jumlah_donor,
  SUM(total_cash_amount) as total_donasi
FROM donor_profiles
GROUP BY donor_tier
ORDER BY 
  CASE donor_tier
    WHEN 'Diamond' THEN 1
    WHEN 'Platinum' THEN 2
    WHEN 'Gold' THEN 3
    WHEN 'Silver' THEN 4
    ELSE 5
  END;
```

### 2. Monthly Donation Trend

```sql
SELECT 
  TO_CHAR(donation_date, 'YYYY-MM') as bulan,
  COUNT(*) as jumlah_donasi,
  SUM(CASE WHEN donation_type = 'cash' THEN cash_amount ELSE 0 END) as total_tunai
FROM donations
WHERE donation_date >= CURRENT_DATE - INTERVAL '12 months'
GROUP BY bulan
ORDER BY bulan DESC;
```

### 3. Top Donors This Month

```sql
SELECT 
  dp.donor_name,
  dp.donor_tier,
  COUNT(d.id) as donasi_bulan_ini,
  SUM(d.cash_amount) as total_bulan_ini
FROM donor_profiles dp
LEFT JOIN donations d ON d.donor_name = dp.donor_name
  AND d.donation_date >= DATE_TRUNC('month', CURRENT_DATE)
  AND d.status IN ('received', 'posted')
GROUP BY dp.id, dp.donor_name, dp.donor_tier
ORDER BY total_bulan_ini DESC NULLS LAST
LIMIT 10;
```

### 4. Badge Distribution

```sql
SELECT 
  jsonb_array_elements_text(badges) as badge,
  COUNT(*) as jumlah
FROM donor_profiles
WHERE jsonb_array_length(badges) > 0
GROUP BY badge
ORDER BY jumlah DESC;
```

---

## 🛠️ Troubleshooting

### Tier Tidak Update Setelah Donasi

**Solusi:**
```sql
-- Manual trigger update
SELECT update_donor_profile_stats();

-- Or per donor:
SELECT calculate_donor_tier('Nama Donatur');
SELECT assign_donor_badges('Nama Donatur');
```

### Export CSV Encoding Error di Excel

**Penyebab:** Excel tidak detect UTF-8  
**Solusi:** System sudah pakai UTF-8 BOM, tapi jika masih error:
1. Open di Notepad → Save As → Encoding: UTF-8
2. Atau open di Google Sheets dulu → Download as Excel

### Donor Badge Tidak Muncul di UI

**Check:**
1. Migration `20251009000000_create_donor_profiles.sql` sudah run?
2. Component `<DonorBadge />` sudah di-import?
3. Browser console ada error?

---

## 🎓 Best Practices

### 1. Data Entry
- **Nama donatur** harus konsisten (jangan "Ibu Siti" vs "Ny. Siti")
- **No HP** untuk follow-up & WhatsApp
- **Hajat** sebisa mungkin diisi (untuk doa maghrib)
- **Estimasi nilai** untuk barang (untuk laporan)

### 2. Donor Management
- Review at-risk donors setiap minggu
- Follow-up lapsed donors dalam 7 hari
- Appreciation untuk tier upgrade
- Quarterly donor appreciation events

### 3. Reporting
- Export monthly report untuk bendahara
- Print hajat setiap hari untuk ustadz
- Quarterly analytics untuk strategi fundraising

### 4. Security
- RLS policies protect data
- Only admin bisa delete donasi
- Donor personal info is confidential

---

## 📝 File Komponen

### Pages:
- `src/pages/DonasiV2.tsx` - Main page dengan semua fitur
- `src/pages/DonasiReports.tsx` - Reporting & analytics (optional)

### Components:
- `src/components/DonorBadge.tsx` - Tier & badge display
- `src/components/DonasiReports.tsx` - Report components

### Schemas:
- `src/schemas/donasi.schema.ts` - Zod validation (if exists)

---

## 🏁 Summary

### ✅ Apa yang Sudah Ada:

- ✅ Database lengkap (3 tables)
- ✅ CRUD donasi multi-tipe
- ✅ Donor tracking dengan tier & badges
- ✅ Hajat management
- ✅ Export CSV/PDF
- ✅ Print nota & daftar hajat
- ✅ Smart categorization (makanan vs aset)
- ✅ Auto-update tier & badges
- ✅ At-risk donor detection

### 🔄 Future Enhancements:

- [ ] Tab "🏆 Top Donatur" dengan leaderboard
- [ ] Alert banner untuk at-risk major donors
- [ ] Donor detail dialog (full profile view)
- [ ] Certificate generator untuk tier achievements
- [ ] Email/SMS notification untuk tier upgrades
- [ ] WhatsApp broadcast by tier
- [ ] Campaign tracking per donor
- [ ] Donor retention dashboard

---

**Modul Donasi siap membantu Anda mengelola donasi dan hubungan dengan donatur secara professional!** 🎁✨

---

**Created:** Oktober 10, 2025  
**Version:** 2.0  
**Type:** Complete System Documentation


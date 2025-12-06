# 🏪 Modul Koperasi

Modul untuk mengelola operasional koperasi yayasan, termasuk penjualan, inventaris, dan keuangan koperasi.

## 📁 Struktur Folder

```
koperasi/
├── Dashboard/              # Dashboard koperasi
│   └── DashboardKoperasi.tsx
├── MasterData/            # Master data produk & supplier
│   ├── MasterProdukPage.tsx
│   ├── SupplierPage.tsx
│   └── components/
│       └── ProdukFormDialog.tsx
├── Kasir/                 # POS/Kasir
│   ├── KasirPage.tsx
│   └── components/
│       ├── ShiftControl.tsx
│       ├── ProductSelector.tsx
│       └── PaymentDialog.tsx
├── Inventaris/            # Stock management
│   └── StockKoperasiPage.tsx
├── Penjualan/            # Sales history
│   └── RiwayatPenjualanPage.tsx
├── Keuangan/             # Financial management
│   ├── KeuanganUnifiedPage.tsx  # Unified financial page (replaces Penjualan, Pembelian, Operasional pages)
│   ├── BagiHasilPage.tsx
│   ├── SkemaBagiHasilPage.tsx
│   ├── LaporanKeuanganPage.tsx
│   └── components/
│       ├── AkunKasFilter.tsx
│       └── ProfitSharingBreakdown.tsx
└── Laporan/              # Reports
    └── LaporanPage.tsx
```

## 🎯 Fitur MVP

### ✅ Implemented
- Master Produk (CRUD)
- Kasir/POS dengan shift management
- Multi-item sales
- Payment processing (cash/transfer)
- Auto-post ke keuangan
- Stock management
- Dashboard dengan stats

### 🚧 Coming Soon
- Master Supplier
- Pembelian dari supplier
- Transfer dari inventaris yayasan
- Laporan penjualan
- Laporan laba rugi
- Print struk

## 🔗 Related Files

**Service Layer:**
- `src/services/koperasi.service.ts`

**Types:**
- `src/types/koperasi.types.ts`

**Database:**
- `supabase/migrations/20251126120000_create_koperasi_schema.sql`
- `supabase/migrations/20251126130000_koperasi_auto_post_trigger.sql`

**Documentation:**
- `KOPERASI_MVP_GUIDE.md`
- `KOPERASI_QUICK_START.md`
- `MODUL_KOPERASI.md`

## 🚀 Quick Start

1. Apply database migrations
2. Login dengan role `koperasi_admin`
3. Buka `/koperasi`
4. Follow guide di `KOPERASI_QUICK_START.md`

## 📞 Support

Lihat dokumentasi lengkap di root folder:
- `KOPERASI_MVP_GUIDE.md` - User guide
- `KOPERASI_MVP_IMPLEMENTATION_SUMMARY.md` - Technical summary

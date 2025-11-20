# Perbaikan Double Entry - Kode Aplikasi

## 🚨 Masalah yang Ditemukan

### 1. **Penjualan Inventaris → Double Entry**
- **Lokasi**: `src/pages/InventarisRefactored.tsx`
- **Masalah**: Penjualan inventaris otomatis masuk ke tabel `keuangan`
- **Dampak**: Saldo bertambah 2x (dari inventaris + keuangan)

### 2. **Donasi → Potential Double Entry**
- **Lokasi**: `src/pages/Donasi.tsx` (Line 164-174)
- **Masalah**: Donasi uang otomatis masuk ke tabel `keuangan`
- **Dampak**: Saldo bertambah 2x (dari donasi + keuangan)

## 🛠️ Perbaikan yang Diperlukan

### **1. Fix InventarisRefactored.tsx**

**MASALAH**: Penjualan inventaris otomatis masuk ke keuangan
**SOLUSI**: Hapus auto-insert ke keuangan, biarkan hanya di transaksi_inventaris

```typescript
// SEBELUM (Line 794-808):
if (keluarMode === 'Penjualan') {
  const totalPemasukan = (hargaDasar * adjustJumlah) + sumbangan;
  payload.harga_satuan = Math.max(0, Math.floor(totalPemasukan / adjustJumlah));
  
  // ❌ HAPUS: Auto-insert ke keuangan
  // await supabase.from('keuangan').insert([...]);
}

// SESUDAH:
if (keluarMode === 'Penjualan') {
  const totalPemasukan = (hargaDasar * adjustJumlah) + sumbangan;
  payload.harga_satuan = Math.max(0, Math.floor(totalPemasukan / adjustJumlah));
  
  // ✅ Hanya simpan di transaksi_inventaris
  // Tidak ada auto-insert ke keuangan
}
```

### **2. Fix Donasi.tsx**

**MASALAH**: Donasi uang otomatis masuk ke keuangan
**SOLUSI**: Hapus auto-insert ke keuangan, biarkan hanya di donasi table

```typescript
// SEBELUM (Line 164-174):
if (formData.jenis_donasi === "Uang") {
  await supabase.from('keuangan').insert([{
    jenis_transaksi: 'Pemasukan',
    kategori: 'Donasi',
    jumlah: parseFloat(formData.jumlah),
    tanggal: formData.tanggal_donasi,
    deskripsi: `Donasi dari ${formData.nama_donatur}`,
    referensi: 'donasi'
  }]);
}

// SESUDAH:
// ❌ HAPUS: Auto-insert ke keuangan
// Biarkan hanya di donasi table
// User bisa manual input ke keuangan jika perlu
```

### **3. Update Dashboard Keuangan**

**MASALAH**: Dashboard menampilkan double entry
**SOLUSI**: Filter out auto entries

```typescript
// src/modules/keuangan/DashboardKeuangan.tsx

const DashboardKeuangan = () => {
  const { data: stats } = useQuery({
    queryKey: ['keuangan-dashboard'],
    queryFn: async () => {
      // ✅ Gunakan view yang sudah filter double entry
      const { data: keuanganData } = await supabase
        .from('view_keuangan_dashboard') // View yang filter auto entries
        .select('*');
      
      // Atau filter manual:
      const { data: keuanganData } = await supabase
        .from('keuangan')
        .select('*')
        .eq('status', 'posted')
        .not('referensi', 'in', ['inventaris_penjualan', 'donasi_auto']);
      
      return calculateStats(keuanganData);
    }
  });
};
```

### **4. Update Services**

**MASALAH**: Service layer tidak handle double entry
**SOLUSI**: Tambahkan validation

```typescript
// src/services/keuangan.service.ts

export const addKeuanganTransaction = async (data: KeuanganData) => {
  // ✅ Cek double entry sebelum insert
  const { data: existing } = await supabase
    .from('keuangan')
    .select('id')
    .eq('referensi', data.referensi)
    .eq('jumlah', data.jumlah)
    .eq('tanggal', data.tanggal)
    .gte('created_at', new Date(Date.now() - 60000).toISOString());
  
  if (existing && existing.length > 0) {
    throw new Error('Double entry detected');
  }
  
  // Insert transaksi
  const { data: result, error } = await supabase
    .from('keuangan')
    .insert([data]);
  
  if (error) throw error;
  return result;
};
```

## 🎯 Implementasi Step by Step

### **Step 1: Backup Data**
```bash
# Jalankan script audit dulu
psql -f AUDIT_DOUBLE_ENTRY.sql

# Backup database
pg_dump your_database > backup_before_fix.sql
```

### **Step 2: Fix Database**
```bash
# Jalankan script perbaikan
psql -f FIX_DOUBLE_ENTRY.sql
```

### **Step 3: Update Code**
1. **Hapus auto-insert** di InventarisRefactored.tsx
2. **Hapus auto-insert** di Donasi.tsx  
3. **Update Dashboard** untuk filter double entry
4. **Update Services** untuk validation

### **Step 4: Test**
1. **Test penjualan inventaris** - pastikan tidak double entry
2. **Test donasi** - pastikan tidak double entry
3. **Test dashboard** - pastikan saldo akurat

## 🔍 Monitoring

### **Query untuk Monitor Double Entry**
```sql
-- Monitor double entry
SELECT 
  referensi,
  COUNT(*) as jumlah,
  SUM(jumlah) as total
FROM keuangan 
WHERE referensi IN ('inventaris_penjualan', 'donasi_auto')
GROUP BY referensi;
```

### **Alert System**
```typescript
// Tambahkan alert jika ada duplikasi
const checkForDuplicates = async () => {
  const { data } = await supabase
    .from('keuangan')
    .select('referensi, jumlah, tanggal, COUNT(*)')
    .group('referensi, jumlah, tanggal')
    .having('COUNT(*) > 1');
  
  if (data && data.length > 0) {
    console.warn('Duplicate entries detected:', data);
  }
};
```

## ✅ Checklist Perbaikan

- [ ] Backup database
- [ ] Jalankan AUDIT_DOUBLE_ENTRY.sql
- [ ] Jalankan FIX_DOUBLE_ENTRY.sql
- [ ] Update InventarisRefactored.tsx
- [ ] Update Donasi.tsx
- [ ] Update Dashboard Keuangan
- [ ] Update Services
- [ ] Test penjualan inventaris
- [ ] Test donasi
- [ ] Test dashboard
- [ ] Monitor double entry
- [ ] Dokumentasi perbaikan

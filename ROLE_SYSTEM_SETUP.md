# Role System Setup Guide

## Cara Mengatasi Loading Stuck

Jika aplikasi stuck di loading page, kemungkinan:
1. **User belum punya role di database** - System akan default ke role 'santri'
2. **Migration belum di-run** - Run migration untuk update enum
3. **Error di console** - Cek browser console untuk error details

**Solusi cepat:**
- Refresh halaman (F5)
- Cek console browser untuk error message
- Pastikan user sudah login via Supabase Auth

## Setup Role untuk Testing

### Opsi 1: Assign Role via SQL (Recommended untuk Testing)

1. Buka Supabase Dashboard → SQL Editor
2. Cari User ID dari `auth.users` table:
   ```sql
   SELECT id, email FROM auth.users;
   ```
3. Assign role ke user:
   ```sql
   -- Contoh: Assign role admin_keuangan
   INSERT INTO user_roles (user_id, role)
   VALUES ('your-user-id-here', 'admin_keuangan')
   ON CONFLICT (user_id, role) DO NOTHING;
   
   -- Atau assign multiple roles
   INSERT INTO user_roles (user_id, role) VALUES
   ('user-id-1', 'admin'),
   ('user-id-2', 'admin_keuangan'),
   ('user-id-3', 'admin_inventaris'),
   ('user-id-4', 'admin_akademik'),
   ('user-id-5', 'santri')
   ON CONFLICT (user_id, role) DO NOTHING;
   ```

### Opsi 2: Gunakan Role Switcher (Temporary untuk Testing)

1. Login ke aplikasi dengan akun apa saja
2. Buka `/settings`
3. Di section "Role Switcher", pilih role yang ingin ditest
4. Menu akan otomatis update berdasarkan role yang dipilih
5. **Note:** Role switcher hanya untuk testing, tidak menyimpan ke database

### Opsi 3: Buat User Baru dengan Role (Via Register)

1. Register user baru via `/auth` page
2. System akan auto-assign role 'santri' (default)
3. Assign role yang diinginkan via SQL (Opsi 1)

## Role yang Tersedia

Setelah migration di-run, role yang tersedia:
- `admin` - Full access semua modul
- `admin_keuangan` - Access: Keuangan, Pembayaran, Tabungan, Donasi
- `admin_inventaris` - Access: Inventaris, Distribusi, Penjualan
- `admin_akademik` - Access: Santri, Monitoring, Plotting Kelas
- `pengurus` - Read-only access ke beberapa modul
- `santri` - Limited access (profil sendiri, tabungan sendiri)

## Testing Checklist

1. ✅ Run migration untuk update enum
2. ✅ Assign role ke user via SQL
3. ✅ Login dengan user tersebut
4. ✅ Cek menu yang muncul (harus sesuai role)
5. ✅ Test role switcher di Settings page
6. ✅ Cek permission matrix di Settings

## Troubleshooting

**Problem: App stuck di loading**
- Cek console browser untuk error
- Pastikan Supabase connection OK
- User akan default ke 'santri' jika tidak punya role

**Problem: Menu tidak sesuai role**
- Refresh halaman setelah assign role
- Cek role di Settings page
- Pastikan role sudah tersimpan di database

**Problem: Role switcher tidak bekerja**
- Clear localStorage: `localStorage.removeItem("test_role_override")`
- Refresh halaman
- Role switcher hanya untuk testing, tidak persist


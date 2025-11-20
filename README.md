# 🏫 Sistem Manajemen Pesantren Al-Bisri

**Type**: LKSA (Lembaga Kesejahteraan Sosial Anak)  
**Status**: ✅ Production Ready  
**Version**: 2.0

---

## 🚀 Quick Start

```bash
# Install dependencies
npm install

# Start dev server
npm run dev
```

Server akan jalan di: **http://localhost:8080**

---

## 🎛️ Feature Flags

### Module Dashboards (Alpha)

Toggle new module dashboard pages:

```bash
# Enable feature
VITE_MODULE_DASHBOARD_ALPHA=true npm run dev

# Disable feature (default)
VITE_MODULE_DASHBOARD_ALPHA=false npm run dev
```

When enabled:
- New sidebar section "MODULE DASHBOARDS" appears
- Access mini-dashboards: `/santri-dashboard`, `/keuangan-dashboard`, `/inventaris-dashboard`, `/akademik`, `/administrasi`
- Original pages remain unchanged and accessible

When disabled:
- App behaves exactly as before
- All original routes and navigation remain intact

---

## 📚 Dokumentasi

**📖 [DOCUMENTATION.md](./DOCUMENTATION.md)** - Dokumentasi lengkap sistem

Dokumentasi komprehensif mencakup:

### ✅ Modul Production Ready
- **📚 Modul Santri** - Manajemen data santri lengkap
- **🎁 Modul Donasi** - Sistem donasi dengan donor tracking  
- **📦 Modul Inventaris** - Manajemen stok dan aset

### 🔄 Modul Development
- **💰 Modul Keuangan** - Multi-akun kas & rekonsiliasi bank
- **🎓 Modul Beasiswa** - Workflow approval terstruktur
- **📊 Modul Monitoring** - Dashboard & analytics

### 📋 Quick Reference
- **🚀 [Quick Start Guide](./DOCUMENTATION.md#quick-start)** - Setup dalam 5 menit
- **🛠️ [Troubleshooting](./DOCUMENTATION.md#troubleshooting-common-issues)** - Solusi masalah umum
- **📝 [Changelog](./CHANGELOG.md)** - History perubahan sistem

---

## 🎯 Fitur Utama

### ✅ Modul Santri
- Management data santri mukim & non-mukim
- Program santri dengan tarif komponen
- Upload dokumen dengan verifikasi
- CSV import/export


### ✅ Modul Donasi
- Input donasi multi-tipe (tunai/makanan/barang)
- Donor tracking & recognition (tier, badges)
- Hajat untuk doa maghrib
- Export & print features

### ✅ Modul Keuangan
- Pembayaran santri (generate tagihan, cicilan)
- Multi-akun kas (Kas, Bank, Tabungan)
- Laporan laba rugi & arus kas
- Rekonsiliasi bank

### ✅ Modul Inventaris
- Stock management
- Search & filter
- Export CSV
- Stock warnings

### ✅ Modul Monitoring
- Progress tracking santri
- Absensi & penilaian
- Reports & analytics

---

## 📱 Pages Available

### Core Pages
- `/` - Dashboard
- `/santri` - Data Santri
- `/santri/profile/:id` - Profile Santri Detail
- `/santri/edit/:id` - Edit Data Santri

### Program & Bantuan
- `/program-santri` - Kelola program & tarif komponen

### Financial
- `/keuangan` - Keuangan & transaksi
- `/pembayaran-santri` - Pembayaran & tagihan santri (Coming Soon)
- `/donasi` - Donasi management

### Others
- `/inventaris` - Inventaris & stock management
- `/monitoring` - Monitoring & reporting
- `/settings` - Settings & user management

---

## 🗄️ Database Structure

### Core Tables:
- `santri` - Data santri
- `santri_wali` - Data wali/orang tua
- `dokumen_santri` - Dokumen upload
- `program_santri` - Program dengan tarif
- `komponen_biaya_program` - Komponen biaya program


### Keuangan:
- `keuangan` - Transaksi keuangan (enhanced)
- `kategori_keuangan` - Master kategori (22 default)
- `akun_kas` - Master akun kas
- `jenis_pembayaran_santri` - Master jenis pembayaran
- `pembayaran_santri` - Tagihan & pembayaran
- `cicilan_pembayaran` - Cicilan pembayaran

### Rekonsiliasi Bank:
- `mutasi_bank` - Import mutasi bank
- `rekonsiliasi_bank` - Header rekonsiliasi
- `adjustment_rekonsiliasi` - Adjustment & koreksi

### Donasi:
- `donations` - Header donasi
- `donation_items` - Detail items donasi
- `donor_profiles` - Profile donor dengan tier & badges

### Inventaris:
- `inventaris` - Master item
- `transaksi_inventaris` - History transaksi (Coming Soon)

### Others:
- `monitoring_kegiatan` - Monitoring activities
- `auth.users` - User management (Supabase Auth)

**Total**: 30+ tables dengan relationship yang terstruktur

---

## 🔐 User Roles

- **Admin** - Full access ke semua modul
- **Bendahara** - Access ke keuangan, pembayaran, donasi
- **Staff Santri** - Access ke data santri, dokumen
- **Staff Beasiswa** - Access ke pengajuan & verifikasi beasiswa
- **Pimpinan** - Read-only access + approval beasiswa
- **Viewer** - Read-only access

---

## 🛠️ Tech Stack

### Frontend:
- **React** 18+ with TypeScript
- **Vite** - Build tool
- **shadcn/ui** - UI components
- **Tailwind CSS** - Styling
- **React Hook Form** + **Zod** - Form validation
- **TanStack Query** - Data fetching (optional)
- **date-fns** - Date formatting
- **jsPDF** + **jspdf-autotable** - PDF export
- **Lucide React** - Icons

### Backend:
- **Supabase** - PostgreSQL database + Auth
- **Row Level Security (RLS)** - Data protection
- **Database Functions** - Business logic
- **Triggers** - Auto-updates

### Development:
- **ESLint** - Code linting
- **TypeScript** - Type safety
- **Git** - Version control

---

## 📦 Installation & Setup

### 1. Clone Repository

```bash
git clone <YOUR_GIT_URL>
cd albisri-pondok-sukses
```

### 2. Install Dependencies

```bash
npm install
```

### 3. Setup Supabase

1. Create account di https://supabase.com
2. Create new project
3. Copy Project URL & Anon Key
4. Set environment variables:

```bash
# .env.local
VITE_SUPABASE_URL=your-project-url
VITE_SUPABASE_ANON_KEY=your-anon-key
```

### 4. Run Database Migrations

Via Supabase Dashboard → SQL Editor:
1. Run migrations dari folder `supabase/migrations/` (23 files)
2. Run dengan urutan timestamp (ascending)

**Key Migrations:**
- `20251010000000_create_program_santri_system.sql` - Program santri
- `20251010030000_enhance_santri_table.sql` - Enhanced santri fields
- `20251010040000_create_dokumen_santri_table.sql` - Dokumen system
- `20251009020000_create_beasiswa_module.sql` - Beasiswa tables
- `20251009030000_create_bank_reconciliation.sql` - Rekonsiliasi bank
- `20251009040000_enhance_keuangan_and_pembayaran.sql` - Pembayaran santri
- `20251009000000_create_donor_profiles.sql` - Donor tracking

### 5. Start Development Server

```bash
npm run dev
```

Open: http://localhost:8080

---

## 📖 Documentation

Baca dokumentasi lengkap untuk setiap modul:


---

## 🚢 Deployment

### Via Vercel (Recommended)

#### Prerequisites
- GitHub/GitLab/Bitbucket repository
- Vercel account (free tier available)
- Supabase project URL and Anon Key

#### Quick Deploy

1. **Connect Repository to Vercel**
   - Visit [vercel.com](https://vercel.com)
   - Click "New Project"
   - Import your Git repository
   - Vercel will auto-detect Vite configuration

2. **Configure Environment Variables**
   
   In Vercel Dashboard → Project Settings → Environment Variables, add:
   
   ```
   VITE_SUPABASE_URL=https://your-project.supabase.co
   VITE_SUPABASE_ANON_KEY=your-anon-key-here
   ```
   
   Apply to: **Production**, **Preview**, and **Development**

3. **Deploy**
   - Click "Deploy"
   - Vercel will build and deploy automatically
   - Your app will be live at `https://your-project.vercel.app`

#### Build Configuration

The project includes `vercel.json` with optimized settings:
- Build Command: `npm run build`
- Output Directory: `dist`
- SPA Routing: Configured for client-side routing

#### Environment Variables Setup

**Required Variables:**
- `VITE_SUPABASE_URL` - Your Supabase project URL
- `VITE_SUPABASE_ANON_KEY` - Your Supabase anonymous/public key

**How to get these values:**
1. Go to [Supabase Dashboard](https://supabase.com/dashboard)
2. Select your project
3. Go to Settings → API
4. Copy "Project URL" and "anon/public" key

#### Troubleshooting Deployment

**Issue: 404 on page refresh**
- ✅ Solution: `vercel.json` is configured with SPA rewrites
- Verify the file exists in your repository root

**Issue: Environment variables not working**
- Check variable names use `VITE_` prefix
- Verify variables are set in Vercel dashboard
- Redeploy after adding variables

**Issue: Build fails**
- Check build logs in Vercel dashboard
- Verify `npm run build` works locally
- Ensure all dependencies are in `package.json`

**Issue: Supabase connection errors**
- Verify environment variables are correct
- Check Supabase project is active
- Ensure CORS is configured in Supabase (usually auto-configured)

**Issue: TypeScript errors during build**
- Run `npm run build` locally to see errors
- Fix type errors before deploying
- Check `tsconfig.json` configuration

#### Continuous Deployment

Once connected, Vercel automatically:
- Deploys on every push to main branch
- Creates preview deployments for pull requests
- Runs build checks before deployment

#### Custom Domain

1. Go to Vercel Dashboard → Project Settings → Domains
2. Add your custom domain
3. Configure DNS records as instructed
4. SSL certificate is automatically provisioned

For detailed deployment guide, see [DEPLOYMENT.md](./DEPLOYMENT.md)

### Via Lovable

1. Visit [Lovable Project](https://lovable.dev/projects/9d860f02-6d80-43a3-b792-aef268da3f22)
2. Click Share → Publish
3. Domain: Custom domain available

### Via Netlify

```bash
# Build production
npm run build

# Deploy dist/ folder
# Configure build settings:
# - Build command: npm run build
# - Publish directory: dist
# - Add environment variables in Netlify dashboard
```

---

## 🤝 Contributing

### Development Workflow:

1. Create feature branch
2. Make changes
3. Test locally
4. Commit with descriptive message
5. Push to repository
6. Create pull request

### Code Standards:

- Follow ESLint rules
- Use TypeScript properly
- Write descriptive comments
- Update documentation if needed

---

## 🐛 Known Issues & Limitations

### Current Limitations:

- **Pembayaran Santri UI** - Belum dibangun (database ready)
- **Rekonsiliasi Bank UI** - Belum dibangun (database ready)
- **Verifikasi Beasiswa UI** - Belum dibangun (database ready)
- **Approval Beasiswa UI** - Belum dibangun (database ready)
- **Transaksi Inventaris UI** - Belum dibangun (database ready)

### Workarounds:

Semua modul bisa diakses via SQL Editor di Supabase untuk sementara.

---

## 📞 Support & Contact

Jika ada pertanyaan atau issue:

1. Check dokumentasi modul terkait
2. Lihat browser console untuk error
3. Check network tab untuk API errors
4. Verify Supabase connection
5. Check migrations sudah di-run semua

---

## 📄 License

Proprietary - Pesantren Al-Bisri

---

## 🎉 Changelog

### Version 2.0 (Oktober 2025)

**New Features:**
- ✅ Modul Beasiswa dengan workflow approval
- ✅ Program Santri dengan komponen biaya
- ✅ Donor Tracking System (tier & badges)
- ✅ Rekonsiliasi Bank (database)
- ✅ Pembayaran Santri (database)
- ✅ Enhanced Keuangan (multi-akun)
- ✅ Dokumen Upload dengan verifikasi
- ✅ Form validation dengan Zod
- ✅ Export CSV/PDF

**Improvements:**
- ✅ Dokumentasi komprehensif (5 files)
- ✅ Database optimization
- ✅ Better UI/UX
- ✅ Type safety improvements

### Version 1.0 (2024)

- Initial release
- Basic CRUD untuk santri, keuangan, inventaris
- Authentication & authorization
- Basic reporting

---

**Sistem Manajemen Pesantren Al-Bisri - Terorganisir, Transparan, Profesional** ✨

---

**Last Updated**: Oktober 10, 2025  
**Maintained by**: Development Team  
**For**: LKSA Pesantren Al-Bisri, Kudus

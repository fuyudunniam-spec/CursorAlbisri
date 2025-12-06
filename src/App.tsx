import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { lazy, Suspense } from "react";
import Layout from "./components/Layout";
import ErrorBoundary from "./components/ErrorBoundary";
import Dashboard from "./pages/Dashboard";
import Santri from "./pages/Santri";
import SantriEnhanced from "./pages/SantriEnhanced";
import SantriProfileEnhanced from "./pages/SantriProfileEnhanced";
import SantriProfileMinimal from "./pages/SantriProfileMinimal";
import SantriProfileMaster from "./pages/SantriProfileMaster";
import SantriProfileFull from "./pages/SantriProfileFull";
import Monitoring from "./pages/Monitoring";
import Tabungan from "./pages/Tabungan";
import TabunganRouter from "./pages/TabunganRouter";
import TabunganSantriAdmin from "./pages/TabunganSantriAdmin";
import LaporanTabungan from "./pages/LaporanTabungan";
import DonasiDashboard from "./pages/DonasiDashboard";
import Inventaris from "./pages/Inventaris";
import InventarisRefactored from "./pages/InventarisRefactored";
// Removed: InventarisV2, InventarisV2Simple - using new dashboard structure
import InventarisTest from "./pages/InventarisTest";
import InventarisDebug from "./pages/InventarisDebug";
import Koperasi from "./pages/Koperasi";
import Keuangan from "./pages/Keuangan";
import Auth from "./pages/Auth";
import NotFound from "./pages/NotFound";
import Settings from "./pages/Settings";
import SantriProfile from "./pages/SantriProfile";
import SantriAccountManagement from "./pages/SantriAccountManagement";
import ChangePassword from "./pages/ChangePassword";
// Removed: ProgramSantri, ApprovalSantri (no longer used)
import PloatingKelas from "./pages/PloatingKelas";
import TagihanSantri from "./pages/TagihanSantri";
import ProgramSantriBiayaManager from "./components/ProgramSantriBiayaManager";

// Lazy imports for module dashboards
const DashboardSantri = lazy(() => import('./modules/santri/DashboardSantri'));
const DashboardKeuangan = lazy(() => import('./modules/keuangan/DashboardKeuangan'));
const DashboardAkademik = lazy(() => import('./modules/akademik/DashboardAkademik'));
const MasterKelasPage = lazy(() => import('./modules/akademik/MasterKelasPage'));
const PloatingKelasSimple = lazy(() => import('./modules/akademik/PloatingKelasSimple'));
const KelasPage = lazy(() => import('./modules/akademik/KelasPage'));
const SemesterManagementPage = lazy(() => import('./modules/akademik/SemesterManagementPage'));
const PresensiKelasPage = lazy(() => import('./modules/akademik/PresensiKelasPage'));
const SetoranHarianPage = lazy(() => import('./modules/akademik/SetoranHarianPage'));
const PerizinanSantriPage = lazy(() => import('./modules/akademik/PerizinanSantriPage'));
const JurnalPertemuanPage = lazy(() => import('./modules/akademik/JurnalPertemuanPage'));
const PertemuanPage = lazy(() => import('./modules/akademik/PertemuanPage'));
const DashboardPengajar = lazy(() => import('./modules/akademik/DashboardPengajar'));
const ProfilPengajarPage = lazy(() => import('./modules/akademik/ProfilPengajarPage'));
const DashboardAdmin = lazy(() => import('./modules/admin/DashboardAdmin'));
// Temporarily use direct import instead of lazy loading to fix Vite bundling issue
import UserManagementPage from './modules/admin/UserManagementPage';

// Lazy imports for inventory modules
const InventarisMasterPage = lazy(() => import('./modules/inventaris/MasterData/InventarisMasterPage'));
const PenjualanPage = lazy(() => import('./modules/inventaris/Sales/PenjualanPage'));
const DistribusiPage = lazy(() => import('./modules/inventaris/Distribution/DistribusiPage'));
const DistribusiPaketPage = lazy(() => import('./modules/inventaris/Distribution/DistribusiPaketPage'));
const MasterPaketPage = lazy(() => import('./modules/inventaris/Distribution/MasterPaketPage'));
const RiwayatInventarisYayasanPage = lazy(() => import('./modules/inventaris/Transactions/RiwayatInventarisYayasanPage'));
const KeuanganAuditPage = lazy(() => import('./pages/admin/KeuanganAuditPage'));
const KeuanganV3 = lazy(() => import('./pages/KeuanganV3'));
const InventarisDashboard = lazy(() => import('./pages/InventarisDashboard'));

// Lazy imports for koperasi modules
const DashboardKoperasi = lazy(() => import('./modules/koperasi/Dashboard/DashboardKoperasi'));
const MasterProdukPage = lazy(() => import('./modules/koperasi/MasterData/MasterProdukPage'));
const SupplierPage = lazy(() => import('./modules/koperasi/MasterData/SupplierPage'));
const KasirPage = lazy(() => import('./modules/koperasi/Kasir/KasirPage'));
const StockKoperasiPage = lazy(() => import('./modules/koperasi/Inventaris/StockKoperasiPage'));
const TransferInventarisPage = lazy(() => import('./modules/koperasi/Transfer/TransferInventarisPage'));
const RiwayatPenjualanPage = lazy(() => import('./modules/koperasi/Penjualan/RiwayatPenjualanPage'));
const KeuanganKoperasiPage = lazy(() => import('./modules/koperasi/Keuangan/KeuanganUnifiedPage'));
const KeuanganDashboardKoperasi = lazy(() => import('./modules/koperasi/Keuangan/KeuanganDashboard'));
// Using KeuanganUnifiedPage for all keuangan routes (replaces separate pages)
const KeuanganPembelianPage = lazy(() => import('./modules/koperasi/Keuangan/KeuanganUnifiedPage'));
const KeuanganOperasionalPage = lazy(() => import('./modules/koperasi/Keuangan/KeuanganUnifiedPage'));
// BagiHasilPage merged into KelolaHPPDanBagiHasilPage
const KelolaHPPDanBagiHasilPage = lazy(() => import('./modules/koperasi/Keuangan/KelolaHPPDanBagiHasilPage'));
const LaporanKoperasiPage = lazy(() => import('./modules/koperasi/Laporan/LaporanPage'));
// Force rebuild for lazy load fix

const queryClient = new QueryClient();

const App = () => (
  <ErrorBoundary>
    <QueryClientProvider client={queryClient}>
      <TooltipProvider>
        <Toaster />
        <Sonner />
        <BrowserRouter future={{ v7_startTransition: true, v7_relativeSplatPath: true }}>
          <Routes>
            <Route path="/auth" element={<Auth />} />
            <Route path="/" element={
              <Layout>
                <Dashboard />
              </Layout>
            } />
            {/* Module Dashboard Routes */}
            <Route path="/santri-dashboard" element={
              <Layout>
                <Suspense fallback={<div>Loading...</div>}>
                  <DashboardSantri />
                </Suspense>
              </Layout>
            } />
            <Route path="/keuangan-dashboard" element={
              <Layout>
                <Suspense fallback={<div>Loading...</div>}>
                  <DashboardKeuangan />
                </Suspense>
              </Layout>
            } />
            <Route path="/inventaris-dashboard" element={
              <Layout>
                <Suspense fallback={<div>Loading...</div>}>
                  <InventarisDashboard />
                </Suspense>
              </Layout>
            } />
            {/* Inventory Module Routes */}
            <Route path="/inventaris" element={
              <Layout>
                <Suspense fallback={<div>Loading...</div>}>
                  <InventarisDashboard />
                </Suspense>
              </Layout>
            } />
            <Route path="/inventaris/master" element={
              <Layout>
                <Suspense fallback={<div>Loading...</div>}>
                  <InventarisMasterPage />
                </Suspense>
              </Layout>
            } />
            {/* Sales removed from yayasan inventory - all sales now through koperasi */}
            <Route path="/inventaris/sales" element={
              <Navigate to="/koperasi/kasir" replace />
            } />
            <Route path="/inventaris/distribution" element={
              <Layout>
                <Suspense fallback={<div>Loading...</div>}>
                  <DistribusiPage />
                </Suspense>
              </Layout>
            } />
            <Route path="/inventaris/distribution/distribusi-paket" element={
              <Layout>
                <Suspense fallback={<div>Loading...</div>}>
                  <DistribusiPaketPage />
                </Suspense>
              </Layout>
            } />
            <Route path="/inventaris/distribution/master-paket" element={
              <Layout>
                <Suspense fallback={<div>Loading...</div>}>
                  <MasterPaketPage />
                </Suspense>
              </Layout>
            } />
            <Route path="/inventaris/riwayat" element={
              <Layout>
                <Suspense fallback={<div>Loading...</div>}>
                  <RiwayatInventarisYayasanPage />
                </Suspense>
              </Layout>
            } />
            {/* Koperasi Module Routes */}
            <Route path="/koperasi" element={
              <Layout>
                <Suspense fallback={<div>Loading...</div>}>
                  <DashboardKoperasi />
                </Suspense>
              </Layout>
            } />
            <Route path="/koperasi/master" element={
              <Layout>
                <Suspense fallback={<div>Loading...</div>}>
                  <MasterProdukPage />
                </Suspense>
              </Layout>
            } />
            <Route path="/koperasi/master/supplier" element={
              <Layout>
                <Suspense fallback={<div>Loading...</div>}>
                  <SupplierPage />
                </Suspense>
              </Layout>
            } />
            <Route path="/koperasi/kasir" element={
              <Layout>
                <Suspense fallback={<div>Loading...</div>}>
                  <KasirPage />
                </Suspense>
              </Layout>
            } />
            <Route path="/koperasi/inventaris" element={
              <Layout>
                <Suspense fallback={<div>Loading...</div>}>
                  <StockKoperasiPage />
                </Suspense>
              </Layout>
            } />
            <Route path="/koperasi/transfer" element={
              <Layout>
                <Suspense fallback={<div>Loading...</div>}>
                  <TransferInventarisPage />
                </Suspense>
              </Layout>
            } />
            <Route path="/koperasi/penjualan" element={
              <Layout>
                <Suspense fallback={<div>Loading...</div>}>
                  <RiwayatPenjualanPage />
                </Suspense>
              </Layout>
            } />
            <Route path="/koperasi/keuangan/dashboard" element={
              <Layout>
                <Suspense fallback={<div>Loading...</div>}>
                  <KeuanganDashboardKoperasi />
                </Suspense>
              </Layout>
            } />
            <Route path="/koperasi/keuangan" element={
              <Layout>
                <Suspense fallback={<div>Loading...</div>}>
                  <KeuanganKoperasiPage />
                </Suspense>
              </Layout>
            } />
            <Route path="/koperasi/keuangan/pembelian" element={
              <Layout>
                <Suspense fallback={<div>Loading...</div>}>
                  <KeuanganPembelianPage />
                </Suspense>
              </Layout>
            } />
            <Route path="/koperasi/keuangan/operasional" element={
              <Layout>
                <Suspense fallback={<div>Loading...</div>}>
                  <KeuanganOperasionalPage />
                </Suspense>
              </Layout>
            } />
            <Route path="/koperasi/keuangan/kelola-hpp" element={
              <Layout>
                <Suspense fallback={<div>Loading...</div>}>
                  <KelolaHPPDanBagiHasilPage />
                </Suspense>
              </Layout>
            } />
            <Route path="/koperasi/laporan" element={
              <Layout>
                <Suspense fallback={<div>Loading...</div>}>
                  <LaporanKoperasiPage />
                </Suspense>
              </Layout>
            } />
            <Route path="/admin/keuangan-audit" element={
              <Layout>
                <Suspense fallback={<div>Loading...</div>}>
                  <KeuanganAuditPage />
                </Suspense>
              </Layout>
            } />
            <Route path="/admin/users" element={
              <Layout>
                <UserManagementPage />
              </Layout>
            } />
            <Route path="/admin/data-master" element={
              <Layout>
                <UserManagementPage />
              </Layout>
            } />
            <Route path="/akademik" element={
              <Layout>
                <Suspense fallback={<div>Loading...</div>}>
                  <DashboardAkademik />
                </Suspense>
              </Layout>
            } />
            <Route path="/akademik/kelas" element={
              <Layout>
                <Suspense fallback={<div>Loading...</div>}>
                  <KelasPage />
                </Suspense>
              </Layout>
            } />
            {/* Backward compatibility - redirect old routes */}
            <Route path="/akademik/master" element={
              <Layout>
                <Suspense fallback={<div>Loading...</div>}>
                  <KelasPage />
                </Suspense>
              </Layout>
            } />
            <Route path="/akademik/semester" element={
              <Layout>
                <Suspense fallback={<div>Loading...</div>}>
                  <SemesterManagementPage />
                </Suspense>
              </Layout>
            } />
            <Route path="/akademik/presensi" element={
              <Layout>
                <Suspense fallback={<div>Loading...</div>}>
                  <PertemuanPage />
                </Suspense>
              </Layout>
            } />
            <Route path="/akademik/setoran" element={
              <Layout>
                <Suspense fallback={<div>Loading...</div>}>
                  <SetoranHarianPage />
                </Suspense>
              </Layout>
            } />
            <Route path="/akademik/pertemuan" element={
              <Layout>
                <Suspense fallback={<div>Loading...</div>}>
                  <PertemuanPage />
                </Suspense>
              </Layout>
            } />
            {/* Backward compatibility - redirect old routes */}
            <Route path="/akademik/jurnal" element={
              <Layout>
                <Suspense fallback={<div>Loading...</div>}>
                  <PertemuanPage />
                </Suspense>
              </Layout>
            } />
            <Route path="/akademik/pengajar" element={
              <Layout>
                <Suspense fallback={<div>Loading...</div>}>
                  <DashboardPengajar />
                </Suspense>
              </Layout>
            } />
            <Route path="/akademik/pengajar/profil" element={
              <Layout>
                <Suspense fallback={<div>Loading...</div>}>
                  <ProfilPengajarPage />
                </Suspense>
              </Layout>
            } />
            <Route path="/akademik/perizinan" element={
              <Layout>
                <Suspense fallback={<div>Loading...</div>}>
                  <PerizinanSantriPage />
                </Suspense>
              </Layout>
            } />
            <Route path="/administrasi" element={
              <Layout>
                <Suspense fallback={<div>Loading...</div>}>
                  <DashboardAdmin />
                </Suspense>
              </Layout>
            } />
            <Route path="/santri" element={
              <Layout>
                <SantriEnhanced />
              </Layout>
            } />
            <Route path="/santri/add" element={<SantriProfileFull mode="add" />} />
            <Route path="/santri/profile" element={
              <Layout>
                <SantriProfileMaster />
              </Layout>
            } />
            <Route path="/santri/profile-enhanced" element={
              <Layout>
                <SantriProfileEnhanced />
              </Layout>
            } />
            <Route path="/santri/program-management/:santriId" element={
              <Layout>
                <ProgramSantriBiayaManager />
              </Layout>
            } />
            <Route path="/monitoring" element={
              <Layout>
                <Monitoring />
              </Layout>
            } />
            <Route path="/tabungan" element={
              <Layout>
                <TabunganRouter />
              </Layout>
            } />
            <Route path="/tabungan-santri" element={
              <Layout>
                <TabunganSantriAdmin />
              </Layout>
            } />
            <Route path="/laporan-tabungan" element={
              <Layout>
                <LaporanTabungan />
              </Layout>
            } />
            <Route path="/donasi" element={
              <Layout>
                <DonasiDashboard />
              </Layout>
            } />
            <Route path="/donasi-dashboard" element={
              <Layout>
                <DonasiDashboard />
              </Layout>
            } />
            {/* Removed: Route /inventaris and /inventaris-v2 using InventarisV2 - now using new dashboard structure */}
            <Route path="/inventaris-test" element={
              <Layout>
                <InventarisTest />
              </Layout>
            } />
            <Route path="/inventaris-legacy" element={
              <Layout>
                <InventarisRefactored />
              </Layout>
            } />
            <Route path="/inventaris-old" element={
              <Layout>
                <Inventaris />
              </Layout>
            } />
            <Route path="/koperasi-old" element={
              <Layout>
                <Koperasi />
              </Layout>
            } />
            <Route path="/keuangan" element={
              <Layout>
                <Keuangan />
              </Layout>
            } />
            <Route path="/keuangan-v3" element={
              <Layout>
                <Suspense fallback={<div>Loading...</div>}>
                  <KeuanganV3 />
                </Suspense>
              </Layout>
            } />
            <Route path="/ploating-kelas" element={
              <Layout>
                <PloatingKelas />
              </Layout>
            } />
            <Route path="/tagihan-santri" element={
              <Layout>
                <TagihanSantri />
              </Layout>
            } />
            <Route path="/settings" element={
              <Layout>
                <Settings />
              </Layout>
            } />
            <Route path="/admin/santri-accounts" element={
              <Layout>
                <SantriAccountManagement />
              </Layout>
            } />
            <Route path="/change-password" element={
              <Layout>
                <ChangePassword />
              </Layout>
            } />
            {/* ADD ALL CUSTOM ROUTES ABOVE THE CATCH-ALL "*" ROUTE */}
            <Route path="*" element={<NotFound />} />
          </Routes>
        </BrowserRouter>
      </TooltipProvider>
    </QueryClientProvider>
  </ErrorBoundary>
);

export default App;

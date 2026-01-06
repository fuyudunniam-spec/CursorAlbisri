import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { lazy, Suspense } from "react";
import Layout from "./components/Layout";
import ErrorBoundary from "./components/ErrorBoundary";
import Dashboard from "./pages/Dashboard";
import SantriEnhanced from "./pages/SantriEnhanced";
// Removed legacy profile imports - files deleted, routes redirected to canonical /santri/profile5
import Monitoring from "./pages/Monitoring";
import Tabungan from "./pages/Tabungan";
import TabunganRouter from "./pages/TabunganRouter";
import TabunganSantriAdmin from "./pages/TabunganSantriAdmin";
import LaporanTabungan from "./pages/LaporanTabungan";
import DonasiDashboard from "./pages/DonasiDashboard";
// Modul Kebutuhan Layanan Santri - DINONAKTIFKAN (files removed)
import MasterDonatur from "./pages/MasterDonatur";
// Removed legacy imports - files deleted after routing canonical consolidation
import Auth from "./pages/Auth";
import NotFound from "./pages/NotFound";
// ProfileLayout with nested routes is the canonical profile implementation
import SantriOnboarding from "./pages/SantriOnboarding";
import SantriAccountManagement from "./pages/SantriAccountManagement";
import ChangePassword from "./pages/ChangePassword";
import ProfileLayout from "./components/ProfileLayout";
import ProfileRedirect from "./components/ProfileRedirect";
import InformasiPage from "./pages/santri/InformasiPage";
import AkademikPage from "./pages/santri/AkademikPage";
import KeuanganPage from "./pages/santri/KeuanganPage";
import TabunganPage from "./pages/santri/TabunganPage";
import LayananPage from "./pages/santri/LayananPage";
import DokumenPage from "./pages/santri/DokumenPage";
// Removed: ProgramSantri, ApprovalSantri (no longer used)
// Removed: PloatingKelas - redirecting to /akademik/kelas?tab=plotting
import TagihanSantri from "./pages/TagihanSantri";

// Lazy imports for module dashboards
// Removed: DashboardSantri, DashboardKeuangan - routes redirected to canonical routes
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
const InputNilaiPage = lazy(() => import('./modules/akademik/InputNilaiPage'));
const RapotPage = lazy(() => import('./modules/akademik/RapotPage'));
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
const RiwayatPenyaluranBantuanPage = lazy(() => import('./modules/keuangan/PenyaluranBantuan/RiwayatPenyaluranBantuanPage'));
const InventarisDashboard = lazy(() => import('./pages/InventarisDashboard'));

// Lazy imports for koperasi modules
const DashboardKoperasi = lazy(() => import('./modules/koperasi/Dashboard/DashboardKoperasi'));
const MasterProdukPage = lazy(() => import('./modules/koperasi/MasterData/MasterProdukPage'));
const SupplierPage = lazy(() => import('./modules/koperasi/MasterData/SupplierPage'));
const KasirPage = lazy(() => import('./modules/koperasi/Kasir/KasirPage'));
const StockKoperasiPage = lazy(() => import('./modules/koperasi/Inventaris/StockKoperasiPage'));
const TransferInventarisPage = lazy(() => import('./modules/koperasi/Transfer/TransferInventarisPage'));
const RiwayatPenjualanPage = lazy(() => import('./modules/koperasi/Penjualan/RiwayatPenjualanPage'));
const PembelianPage = lazy(() => import('./modules/koperasi/Pembelian/PembelianPage'));
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
            {/* Module Dashboard Routes - Redirected to canonical routes */}
            <Route path="/santri-dashboard" element={<Navigate to="/santri" replace />} />
            <Route path="/keuangan-dashboard" element={<Navigate to="/keuangan-v3" replace />} />
            <Route path="/inventaris-dashboard" element={<Navigate to="/inventaris" replace />} />
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
            <Route path="/koperasi/pembelian" element={
              <Layout>
                <Suspense fallback={<div>Loading...</div>}>
                  <PembelianPage />
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
            <Route path="/akademik/master" element={<Navigate to="/akademik/kelas" replace />} />
            <Route path="/akademik/semester" element={
              <Layout>
                <Suspense fallback={<div>Loading...</div>}>
                  <SemesterManagementPage />
                </Suspense>
              </Layout>
            } />
            <Route path="/akademik/presensi" element={<Navigate to="/akademik/pertemuan?tab=presensi" replace />} />
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
            <Route path="/akademik/jurnal" element={<Navigate to="/akademik/pertemuan?tab=jurnal" replace />} />
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
            <Route path="/akademik/nilai" element={
              <Layout>
                <Suspense fallback={<div>Loading...</div>}>
                  <InputNilaiPage />
                </Suspense>
              </Layout>
            } />
            <Route path="/akademik/rapot" element={<Navigate to="/akademik/nilai" replace />} />
            <Route path="/administrasi" element={<Navigate to="/admin/users" replace />} />
            <Route path="/santri" element={
              <Layout>
                <Suspense fallback={<div>Loading...</div>}>
                  <SantriEnhanced />
                </Suspense>
              </Layout>
            } />
            <Route path="/santri/add" element={<Navigate to="/santri" replace />} />
            <Route path="/santri/onboarding" element={<SantriOnboarding />} />
            {/* Legacy profile route - redirect to new nested route structure */}
            <Route path="/santri/profile" element={
              <Layout>
                <ProfileRedirect />
              </Layout>
            } />
            {/* New nested profile routes */}
            <Route path="/santri/profile/:id" element={
              <Layout>
                <ProfileLayout />
              </Layout>
            }>
              <Route index element={<InformasiPage />} />
              <Route path="informasi" element={<InformasiPage />} />
              <Route path="akademik" element={<AkademikPage />} />
              <Route path="keuangan" element={<KeuanganPage />} />
              <Route path="tabungan" element={<TabunganPage />} />
              <Route path="layanan" element={<LayananPage />} />
              <Route path="dokumen" element={<DokumenPage />} />
            </Route>
            {/* Backward compatibility - redirect old profile routes */}
            <Route path="/santri/profile-enhanced" element={<Navigate to="/santri/profile" replace />} />
            <Route path="/santri/profile-minimal" element={<Navigate to="/santri/profile" replace />} />
            <Route path="/santri/profile-master" element={<Navigate to="/santri/profile" replace />} />
            <Route path="/santri/profile-redesigned" element={<Navigate to="/santri/profile" replace />} />
            {/* Legacy profile routes removed - all use ProfileLayout with nested routes */}
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
            <Route path="/donasi-dashboard" element={<Navigate to="/donasi" replace />} />
            {/* Modul Kebutuhan Layanan Santri - DINONAKTIFKAN (routes removed) */}
            <Route path="/donasi/master-donatur" element={
              <Layout>
                <MasterDonatur />
              </Layout>
            } />
            {/* Legacy routes - redirected to canonical routes */}
            <Route path="/inventaris-test" element={<Navigate to="/inventaris" replace />} />
            <Route path="/inventaris-legacy" element={<Navigate to="/inventaris" replace />} />
            <Route path="/inventaris-old" element={<Navigate to="/inventaris" replace />} />
            <Route path="/koperasi-old" element={<Navigate to="/koperasi" replace />} />
            <Route path="/keuangan" element={<Navigate to="/keuangan-v3" replace />} />
            <Route path="/keuangan-v3" element={
              <Layout>
                <Suspense fallback={<div>Loading...</div>}>
                  <KeuanganV3 />
                </Suspense>
              </Layout>
            } />
            <Route path="/keuangan-v3/penyaluran-bantuan" element={
              <Layout>
                <Suspense fallback={<div>Loading...</div>}>
                  <RiwayatPenyaluranBantuanPage />
                </Suspense>
              </Layout>
            } />
            {/* Redirect old ploating-kelas route to akademik/kelas with plotting tab */}
            <Route path="/ploating-kelas" element={<Navigate to="/akademik/kelas?tab=plotting" replace />} />
            <Route path="/tagihan-santri" element={
              <Layout>
                <TagihanSantri />
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

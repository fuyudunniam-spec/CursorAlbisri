import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { lazy, Suspense } from "react";
import Layout from "./components/Layout";
import ErrorBoundary from "./components/ErrorBoundary";
import Dashboard from "./pages/Dashboard";
import Santri from "./pages/Santri";
import SantriEnhanced from "./pages/SantriEnhanced";
import SantriProfileEnhanced from "./pages/SantriProfileEnhanced";
import SantriProfileMinimal from "./pages/SantriProfileMinimal";
import SantriProfileFull from "./pages/SantriProfileFull";
import Monitoring from "./pages/Monitoring";
import Tabungan from "./pages/Tabungan";
import TabunganRouter from "./pages/TabunganRouter";
import TabunganSantriAdmin from "./pages/TabunganSantriAdmin";
import LaporanTabungan from "./pages/LaporanTabungan";
import Donasi from "./pages/Donasi";
import DonasiRefactored from "./pages/DonasiRefactored";
import DonasiV2 from "./pages/DonasiV2";
import Inventaris from "./pages/Inventaris";
import InventarisRefactored from "./pages/InventarisRefactored";
import InventarisV2 from "./pages/InventarisV2";
import InventarisV2Simple from "./pages/InventarisV2Simple";
import InventarisTest from "./pages/InventarisTest";
import InventarisDebug from "./pages/InventarisDebug";
import Koperasi from "./pages/Koperasi";
import Keuangan from "./pages/Keuangan";
import KeuanganV3 from "./pages/KeuanganV3";
import Auth from "./pages/Auth";
import NotFound from "./pages/NotFound";
import Settings from "./pages/Settings";
import SantriProfile from "./pages/SantriProfile";
import SantriAccountManagement from "./pages/SantriAccountManagement";
import ChangePassword from "./pages/ChangePassword";
// Removed: ProgramSantri, ApprovalSantri (no longer used)
import PloatingKelas from "./pages/PloatingKelas";
import TagihanSantri from "./pages/TagihanSantri";
import ProgramSantriManagement from "./components/ProgramSantriManagement";

// Lazy imports for module dashboards
const DashboardSantri = lazy(() => import('./modules/santri/DashboardSantri'));
const DashboardKeuangan = lazy(() => import('./modules/keuangan/DashboardKeuangan'));
const DashboardInventaris = lazy(() => import('./modules/inventaris/DashboardInventaris'));
const DashboardAkademik = lazy(() => import('./modules/akademik/DashboardAkademik'));
const MasterKelasPage = lazy(() => import('./modules/akademik/MasterKelasPage'));
const PloatingKelasSimple = lazy(() => import('./modules/akademik/PloatingKelasSimple'));
const DashboardAdmin = lazy(() => import('./modules/admin/DashboardAdmin'));

// Lazy imports for inventory modules
const InventarisMasterPage = lazy(() => import('./modules/inventaris/MasterData/InventarisMasterPage'));
const PenjualanPage = lazy(() => import('./modules/inventaris/Sales/PenjualanPage'));
const DistribusiPage = lazy(() => import('./modules/inventaris/Distribution/DistribusiPage'));
const TransactionHistoryPage = lazy(() => import('./modules/inventaris/Transactions/TransactionHistoryPage'));
const KeuanganAuditPage = lazy(() => import('./pages/admin/KeuanganAuditPage'));

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
                  <DashboardInventaris />
                </Suspense>
              </Layout>
            } />
            {/* Inventory Module Routes */}
            <Route path="/inventaris" element={
              <Layout>
                <Suspense fallback={<div>Loading...</div>}>
                  <DashboardInventaris />
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
            <Route path="/inventaris/sales" element={
              <Layout>
                <Suspense fallback={<div>Loading...</div>}>
                  <PenjualanPage />
                </Suspense>
              </Layout>
            } />
            <Route path="/inventaris/distribution" element={
              <Layout>
                <Suspense fallback={<div>Loading...</div>}>
                  <DistribusiPage />
                </Suspense>
              </Layout>
            } />
            <Route path="/inventaris/transactions" element={
              <Layout>
                <Suspense fallback={<div>Loading...</div>}>
                  <TransactionHistoryPage />
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
            <Route path="/akademik" element={
              <Layout>
                <Suspense fallback={<div>Loading...</div>}>
                  <DashboardAkademik />
                </Suspense>
              </Layout>
            } />
            <Route path="/akademik/master" element={
              <Layout>
                <Suspense fallback={<div>Loading...</div>}>
                  <MasterKelasPage />
                </Suspense>
              </Layout>
            } />
            <Route path="/akademik/kelas" element={
              <Layout>
                <Suspense fallback={<div>Loading...</div>}>
                  <PloatingKelasSimple />
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
          <SantriProfileMinimal />
        </Layout>
      } />
            <Route path="/santri/profile-enhanced" element={
              <Layout>
                <SantriProfileEnhanced />
              </Layout>
            } />
            <Route path="/santri/program-management/:santriId" element={
              <Layout>
                <ProgramSantriManagement />
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
                <DonasiV2 />
              </Layout>
            } />
            <Route path="/donasi-refactored" element={
              <Layout>
                <DonasiRefactored />
              </Layout>
            } />
            <Route path="/donasi-old" element={
              <Layout>
                <Donasi />
              </Layout>
            } />
            <Route path="/inventaris" element={
              <Layout>
                <InventarisV2 />
              </Layout>
            } />
            <Route path="/inventaris-v2" element={
              <Layout>
                <InventarisV2 />
              </Layout>
            } />
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
            <Route path="/koperasi" element={
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
                <KeuanganV3 />
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

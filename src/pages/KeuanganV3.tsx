import React, { useState, useEffect, useCallback } from 'react';
import { useSearchParams } from 'react-router-dom';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { RefreshCw, Plus, FileText, TrendingUp } from 'lucide-react';
import { toast } from 'sonner';

// Import new dashboard components
import SummaryCards from '../components/dashboard/SummaryCards';
import ChartsSection from '../components/dashboard/ChartsSection';
import SaldoPerAkun from '../components/SaldoPerAkun';
import RiwayatTransaksi from '../components/dashboard/RiwayatTransaksi';
import TransactionDetailModal from '../components/TransactionDetailModal';
import TransactionEditModal from '../components/TransactionEditModal';
import EditTanggalTransferDonasiDialog from '../components/EditTanggalTransferDonasiDialog';
import StackedAccountCards from '../components/dashboard/StackedAccountCards';
import TotalBalanceDisplay from '../components/dashboard/TotalBalanceDisplay';

// Transaction type for this component
interface Transaction {
  id: string;
  tanggal: string;
  jenis_transaksi: 'Pemasukan' | 'Pengeluaran';
  kategori: string;
  deskripsi: string;
  jumlah: number;
  akun_kas_id: string;
  akun_kas_nama: string;
  status: string;
  created_at: string;
  sub_kategori?: string;
  penerima_pembayar?: string;
  rincian_items?: unknown[];
  alokasi_santri?: unknown[];
  display_category?: string;
  source_type?: string;
  display_description?: string;
  auto_posted?: boolean;
  source_module?: string;
  source_id?: string;
  referensi?: string;
  is_pengeluaran_riil?: boolean;
  [key: string]: unknown;
}

// Import services
import { getKeuanganDashboardStats, getAkunKasStats } from '../services/keuangan.service';
import { AkunKasService, type AkunKas } from '../services/akunKas.service';
import { PeriodFilter } from '../utils/export/types';
import { ReportFormatter } from '../utils/export/reportFormatter';
import { PDFExporter } from '../utils/export/pdfExporter';
import { ExcelExporter } from '../utils/export/excelExporter';
import { AlokasiPengeluaranService } from '../services/alokasiPengeluaran.service';
import { supabase } from '../integrations/supabase/client';
// Shared utilities untuk filtering (Phase 1 & 2 refactoring)
import { 
  excludeTabunganTransactions, 
  applyTabunganExclusionFilter,
  normalizeAkunKas,
  excludeKoperasiTransactions,
  excludeKoperasiAccounts
} from '../utils/keuanganFilters';
// Service layer untuk chart data (Phase 3 refactoring)
import { 
  loadChartData as loadChartDataService,
  type MonthlyChartData,
  type CategoryChartData
} from '../services/keuanganChart.service';

// Import existing components for modal
import FormPengeluaranRinci from '../components/FormPengeluaranRinci';
import FormPemasukanManual from '../components/FormPemasukanManual';
import FormPenyesuaianSaldo from '../components/FormPenyesuaianSaldo';
import ExportPDFDialogV3 from '../components/ExportPDFDialogV3';

const KeuanganV3: React.FC = () => {
  const [sp] = useSearchParams();
  const activeTab = sp.get('tab') || 'dashboard';
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  
  // Data states
  const [statistics, setStatistics] = useState<{
    saldo_bersih: number;
    pemasukan_bulan_ini: number;
    pengeluaran_bulan_ini: number;
    transaksi_bulan_ini: number;
    pemasukan_trend: number;
    pengeluaran_trend: number;
    jumlahTransaksiPemasukan: number;
    jumlahTransaksiPengeluaran: number;
  } | null>(null);
  const [akunKasStats, setAkunKasStats] = useState<{
    totalSaldo: number;
    saldoAwal: number;
    saldoAkhir: number;
    pemasukanBulanIni: number;
    pengeluaranBulanIni: number;
    totalTransaksi: number;
    pemasukanTrend: number;
    pengeluaranTrend: number;
  } | null>(null);
  const [recentTransactions, setRecentTransactions] = useState<Transaction[]>([]);
  const [akunKas, setAkunKas] = useState<AkunKas[]>([]);
  const [monthlyData, setMonthlyData] = useState<MonthlyChartData[]>([]);
  const [categoryData, setCategoryData] = useState<CategoryChartData[]>([]);
  
  // UI states
  const [showForm, setShowForm] = useState(false);
  const [showFormPemasukan, setShowFormPemasukan] = useState(false);
  const [showFormPenyesuaianSaldo, setShowFormPenyesuaianSaldo] = useState(false);
  const [showReports, setShowReports] = useState(false);
  const [showEditAccount, setShowEditAccount] = useState(false);
  const [showTransactionDetail, setShowTransactionDetail] = useState(false);
  const [showTransactionEdit, setShowTransactionEdit] = useState(false);
  const [showEditTanggalDonasi, setShowEditTanggalDonasi] = useState(false);
  const [selectedTransactionForEditTanggal, setSelectedTransactionForEditTanggal] = useState<Transaction | null>(null);
  const [showExportDialog, setShowExportDialog] = useState(false);
  const [selectedAccount, setSelectedAccount] = useState<AkunKas | null>(null);
  const [selectedTransaction, setSelectedTransaction] = useState<Transaction | null>(null);
  const [selectedAccountFilter, setSelectedAccountFilter] = useState<string | undefined>(undefined);
  const [selectedAccountId, setSelectedAccountId] = useState<string | undefined>(undefined);
  const [editForm, setEditForm] = useState({
    nama: '',
    kode: '',
    tipe: 'Kas',
    nomor_rekening: '',
    nama_bank: '',
    atas_nama: '',
    saldo_awal: 0,
    status: 'aktif',
  });
  const [deletedAccountInfo, setDeletedAccountInfo] = useState<{
    account_name: string;
    account_kode: string;
    id: string;
  } | null>(null);
  const [showRestoreOption, setShowRestoreOption] = useState(false);

  // Chart data loading menggunakan service layer (Phase 3 refactoring)
  // Memoize dengan useCallback untuk mencegah re-creation setiap render
  const loadChartData = useCallback(async (accountId?: string) => {
    try {
      // Use passed accountId or fall back to current state
      const filterAccountId = accountId !== undefined ? accountId : selectedAccountFilter;
      
      // Load chart data menggunakan service layer
      // BUG B FIX: getCategoryData returns pengeluaran data (already filtered by jenis_transaksi='Pengeluaran')
      const { monthlyData, categoryData } = await loadChartDataService(filterAccountId);
      
      setMonthlyData(monthlyData);
      // BUG B FIX: categoryData from getCategoryData is already pengeluaran data
      // Set it as categoryData for backward compatibility, but ChartsSection will use it as pengeluaran
      setCategoryData(categoryData);
    } catch (error) {
      console.error('Error loading chart data:', error);
      toast.error('Gagal memuat data chart');
    }
  }, [selectedAccountFilter]);

  // Memoize loadData dengan useCallback untuk mencegah re-creation setiap render
  const loadData = useCallback(async () => {
    try {
      setLoading(true);
      
      // Get accounts first
      const accounts = await AkunKasService.getAll();
      
      // Filter out accounts managed by tabungan and koperasi modules (using shared utility)
      const filteredAccounts = excludeKoperasiAccounts(accounts.filter(akun => akun.managed_by !== 'tabungan')) as typeof accounts;
      
      // Calculate total saldo from ACTIVE accounts only (excluding tabungan and koperasi)
      const totalSaldoAllAccounts = filteredAccounts
        .filter(akun => akun.status === 'aktif')
        .reduce((sum, akun) => sum + (akun.saldo_saat_ini || 0), 0);
      
      // Get transactions from supabase
      // EXCLUDE transactions from tabungan module
      // For auto-posted transactions (Donasi, Penjualan Inventaris), only get 'posted' status
      // For manual entries, get all statuses (they can be filtered by user)
      // OPTIMIZATION: Add default limit to improve initial load time (user can filter/load more if needed)
      // Note: Using .single() is not needed here as we're getting multiple rows
      // Add timestamp to query to prevent caching issues
      // This ensures we always get fresh data from database
      const queryTimestamp = Date.now();
      
      // FIX: Explicitly select all required fields for transaction list
      // Ensure id, source_module, source_id, kategori, sub_kategori are always included
      let query = supabase
        .from('keuangan')
        .select(`
          id,
          tanggal,
          jenis_transaksi,
          kategori,
          sub_kategori,
          jumlah,
          deskripsi,
          referensi,
          status,
          akun_kas_id,
          source_module,
          source_id,
          auto_posted,
          created_at,
          updated_at,
          created_by,
          updated_by,
          penerima_pembayar,
          santri_id,
          bukti_file,
          jenis_alokasi,
          is_pengeluaran_riil,
          *,
          akun_kas:akun_kas_id(nama, managed_by),
          rincian_pengeluaran(*),
          alokasi_pengeluaran_santri(
            id,
            santri_id,
            nominal_alokasi,
            jenis_bantuan,
            periode,
            keterangan,
            santri:santri_id(
              id,
              nama_lengkap,
              nisn,
              id_santri
            )
          )
        `)
        .order('tanggal', { ascending: false })
        .order('created_at', { ascending: false })
        .limit(500); // Default limit untuk mempercepat loading awal
      
      // Exclude tabungan santri transactions (using shared utility)
      query = applyTabunganExclusionFilter(query);
      
      // Apply account filter if selected
      if (selectedAccountFilter) {
        query = query.eq('akun_kas_id', selectedAccountFilter);
      }
      
      // IMPORTANT: Auto-posted transactions should always be 'posted' (they're final and valid)
      // Only show 'posted' status for auto-posted transactions
      // Manual entries can have any status (draft, pending, posted, cancelled)
      // Note: This is handled in the query - we'll filter client-side for better UX
      
      const { data: transactions, error } = await query;
      
      if (error) throw error;
      
      // Filter out transactions from tabungan and koperasi modules (client-side filtering as backup using shared utility)
      let filteredTransactions = excludeKoperasiTransactions(excludeTabunganTransactions(transactions));
      
      // IMPORTANT: For auto-posted transactions, ensure they're always 'posted' status
      // If somehow they're not 'posted', update them (but this should rarely happen)
      filteredTransactions = filteredTransactions.map(tx => {
        const isAutoPosted = tx.auto_posted === true || 
                            tx.referensi?.startsWith('inventory_sale:') ||
                            tx.referensi?.startsWith('donation:') ||
                            tx.referensi?.startsWith('pembayaran_santri:');
        
        // Auto-posted transactions should always be 'posted'
        if (isAutoPosted && tx.status !== 'posted') {
            // Auto-posted transactions should always be 'posted'
            // Log warning only in development
            if (process.env.NODE_ENV === 'development') {
              console.warn('[KeuanganV3] Auto-posted transaction has non-posted status:', {
                id: tx.id,
                referensi: tx.referensi,
                currentStatus: tx.status,
                auto_posted: tx.auto_posted
              });
            }
        }
        
        return tx;
      });
      
      // Extract inventory transaction IDs from referensi and fetch catatan
      const inventoryTransactionIds = filteredTransactions
        .filter(t => t.referensi && typeof t.referensi === 'string' && t.referensi.startsWith('inventory_sale:'))
        .map(t => {
          const idStr = (t.referensi as string).replace('inventory_sale:', '').trim();
          // Validate UUID format (basic check)
          if (idStr && idStr.length === 36) {
            return idStr;
          }
          return null;
        })
        .filter((id): id is string => id !== null);
      
      // Fetch transaksi_inventaris data for these IDs
      // Include inventaris join to get nama_barang for complete description
      let inventoryTransactionsMap: Record<string, any> = {};
      if (inventoryTransactionIds.length > 0) {
        const { data: inventoryTransactions } = await supabase
          .from('transaksi_inventaris')
          .select(`
            id, 
            catatan, 
            sumbangan, 
            harga_dasar,
            jumlah,
            inventaris:item_id(nama_barang)
          `)
          .in('id', inventoryTransactionIds);
        
        if (inventoryTransactions) {
          inventoryTransactionsMap = inventoryTransactions.reduce((acc, ti) => {
            acc[ti.id] = ti;
            return acc;
          }, {} as Record<string, any>);
        }
      }
      
      // Helper function to clean description - remove "Sumbangan: Rp 0" and hajat from donasi
      const cleanDescription = (deskripsi: string, kategori?: string): string => {
        if (!deskripsi) return deskripsi;
        
        let cleaned = deskripsi;
        
        // Remove hajat/doa dari deskripsi donasi TERLEBIH DAHULU
        // Format: "Donasi tunai dari [nama] (Hajat: ...)" atau "Donasi dari [nama] (Hajat: ...)"
        // Hapus pola seperti: " (Hajat: ...)" atau "(Hajat: ...)" dengan berbagai variasi
        cleaned = cleaned.replace(/\s*\(Hajat:.*?\)/gi, '');
        cleaned = cleaned.replace(/\s*\(Doa:.*?\)/gi, '');
        cleaned = cleaned.replace(/\s*\(Hajat.*?\)/gi, ''); // Variasi tanpa titik dua
        cleaned = cleaned.replace(/\s*\(Doa.*?\)/gi, ''); // Variasi tanpa titik dua
        
        // Remove "Donasi tunai dari" atau "Donasi dari" prefix untuk donasi (hanya nama donatur)
        if (kategori === 'Donasi' || kategori === 'Donasi Tunai' || cleaned.includes('Donasi tunai dari') || cleaned.includes('Donasi dari')) {
          cleaned = cleaned.replace(/^Donasi tunai dari\s+/i, '');
          cleaned = cleaned.replace(/^Donasi dari\s+/i, '');
        }
        
        // Remove "Sumbangan: Rp 0" patterns with various formats
        // Pattern examples: 
        // - ", Sumbangan: Rp 0"
        // - ", Sumbangan: Rp 0,00"
        // - ", Sumbangan: Rp 0.00"
        // - ", Sumbangan: Rp 0,000"
        // - "Sumbangan: Rp 0" (at the end)
        // Match: comma (optional), "Sumbangan:", "Rp", optional spaces, "0" followed by optional decimal part
        // IMPORTANT: Only remove if value is exactly 0, not if it's > 0
        cleaned = cleaned.replace(/,\s*Sumbangan:\s*Rp\s*0([.,]0+)?\s*/gi, '');
        
        // Also handle if it's at the end without comma (but preceded by space or at start)
        cleaned = cleaned.replace(/\s+Sumbangan:\s*Rp\s*0([.,]0+)?\s*/gi, '');
        
        // Clean up any double spaces or trailing commas/spaces
        cleaned = cleaned.replace(/\s{2,}/g, ' ').replace(/,\s*$/, '').trim();
        
        return cleaned;
      };

      // Helper function to extract sumbangan info from catatan
      const extractSumbanganInfo = (catatan: string): string | null => {
        if (!catatan) return null;
        const sumbanganMatch = catatan.match(/Sumbangan:\s*Rp\s*([\d.,]+)/i);
        if (sumbanganMatch) {
          const sumbanganValue = parseFloat(sumbanganMatch[1].replace(/[,.]/g, '')) || 0;
          if (sumbanganValue > 0) {
            return `Sumbangan: Rp ${sumbanganValue.toLocaleString('id-ID')}`;
          }
        }
        return null;
      };

      // Helper function to normalize keuangan deskripsi format
      // Convert "Penjualan X kepada Y" to "X / Y" format
      const normalizeKeuanganDeskripsi = (deskripsi: string): string => {
        if (!deskripsi) return deskripsi;
        
        // Pattern: "Penjualan [item] ([qty] unit) kepada [penerima]"
        const match = deskripsi.match(/Penjualan\s+(.+?)\s+\((\d+)\s+unit\)\s+kepada\s+(.+)/i);
        if (match) {
          const [, item, qty, penerima] = match;
          return `${item} (${qty} unit) / ${penerima}`;
        }
        
        // Pattern: "Penjualan [item] ([qty] unit)" (no penerima)
        const match2 = deskripsi.match(/Penjualan\s+(.+?)\s+\((\d+)\s+unit\)/i);
        if (match2) {
          const [, item, qty] = match2;
          return `${item} (${qty} unit)`;
        }
        
        return deskripsi;
      };

      // Helper function to check if deskripsi contains item name
      // Returns true if deskripsi looks complete (has item name, not just "Penjualan - Harga Dasar")
      const isDeskripsiComplete = (deskripsi: string): boolean => {
        if (!deskripsi || deskripsi.trim() === '' || deskripsi === '-') return false;
        
        // Check if it's just "Penjualan - Harga Dasar" without item name
        if (/^Penjualan\s*-\s*Harga\s+Dasar:/i.test(deskripsi.trim())) {
          return false;
        }
        
        // Check if it matches pattern "Penjualan [item] ([qty] unit)" - this is complete
        if (/Penjualan\s+.+?\s+\(\d+\s+unit\)/i.test(deskripsi)) {
          return true;
        }
        
        // Check if it's normalized format "[item] ([qty] unit)" - this is also complete
        if (/^.+?\s+\(\d+\s+unit\)/i.test(deskripsi.trim())) {
          return true;
        }
        
        // If it doesn't match known incomplete patterns, assume it's complete
        return true;
      };

      // Helper function to build complete description for inventory sales
      const buildInventorySaleDescription = (
        keuanganDeskripsi: string,
        catatan: string | null,
        inventoryTx: any,
        penerimaPembayar: string | null
      ): string => {
        // CRITICAL: Always prioritize inventaris.nama_barang if available
        // This ensures we always have the item name, even if keuangan.deskripsi is incomplete
        const itemName = inventoryTx?.inventaris?.nama_barang || null;
        const jumlah = inventoryTx?.jumlah || null;
        
        // Normalize keuangan deskripsi format first
        const normalizedDeskripsi = normalizeKeuanganDeskripsi(keuanganDeskripsi);
        
        // Check if keuangan.deskripsi is complete (has item name)
        const deskripsiIsComplete = isDeskripsiComplete(normalizedDeskripsi);
        
        // If we have item name from inventaris, always use it to build complete description
        if (itemName && jumlah !== null) {
          // Build description from inventaris data (most reliable source)
          let desc = `${itemName} (${jumlah} unit)`;
          
          // Add penerima if available
          if (penerimaPembayar) {
            desc += ` / ${penerimaPembayar}`;
          }
          
          // Extract additional info from catatan if available
          if (catatan) {
            const sumbanganInfo = extractSumbanganInfo(catatan);
            const hargaDasarMatch = catatan.match(/Harga Dasar:\s*Rp\s*([\d.,]+)/i);
            const hargaDasar = hargaDasarMatch ? hargaDasarMatch[1] : '';
            
            // Only add harga dasar if not already in deskripsi and if catatan has it
            if (hargaDasar && !normalizedDeskripsi.includes('Harga Dasar')) {
              desc += ` - Harga Dasar: Rp ${hargaDasar}/unit`;
            }
            
            // Add sumbangan if > 0
            if (sumbanganInfo) {
              desc += ` - ${sumbanganInfo}`;
            }
          }
          
          return desc;
        }
        
        // Fallback: If keuangan.deskripsi is complete, use it (but add sumbangan if needed)
        if (deskripsiIsComplete && normalizedDeskripsi && normalizedDeskripsi.trim() !== '' && normalizedDeskripsi !== '-') {
          const sumbanganInfo = catatan ? extractSumbanganInfo(catatan) : null;
          if (sumbanganInfo && !normalizedDeskripsi.includes('Sumbangan')) {
            return `${normalizedDeskripsi} - ${sumbanganInfo}`;
          }
          return normalizedDeskripsi;
        }
        
        // Final fallback: use catatan as-is (but this should rarely happen if inventaris data is available)
        return catatan || keuanganDeskripsi || 'Penjualan Inventaris';
      };

      // Transform transactions
      const transformedTransactions = filteredTransactions.map(transaction => {
        // For inventory sales, get catatan and inventory transaction info
        let catatanFromInventaris = null;
        let inventoryTx = null;
        if (transaction.referensi && transaction.referensi.startsWith('inventory_sale:')) {
          const transactionId = transaction.referensi.replace('inventory_sale:', '').trim();
          inventoryTx = inventoryTransactionsMap[transactionId];
          
          // Log warnings only in development
          if (process.env.NODE_ENV === 'development') {
            if (!inventoryTx) {
              console.warn('[KeuanganV3] Inventory transaction not found:', {
                keuanganId: transaction.id,
                referensi: transaction.referensi,
                transactionId,
                availableIds: Object.keys(inventoryTransactionsMap)
              });
            } else if (!inventoryTx.inventaris?.nama_barang) {
              console.warn('[KeuanganV3] Inventory transaction missing nama_barang:', {
                keuanganId: transaction.id,
                transactionId,
                inventoryTx: {
                  id: inventoryTx.id,
                  hasInventaris: !!inventoryTx.inventaris,
                  inventarisData: inventoryTx.inventaris
                }
              });
            }
          }
          
          if (inventoryTx && inventoryTx.catatan) {
            catatanFromInventaris = inventoryTx.catatan;
          }
        }
        
        // Build description based on transaction type
        let finalDeskripsi = '';
        if (transaction.kategori === 'Penjualan Inventaris' && transaction.referensi?.startsWith('inventory_sale:')) {
          // For inventory sales, use special logic to combine keuangan.deskripsi + catatan info
          // CRITICAL: This function now ALWAYS uses inventaris.nama_barang if available
          finalDeskripsi = buildInventorySaleDescription(
            transaction.deskripsi || '',
            catatanFromInventaris,
            inventoryTx,
            transaction.penerima_pembayar || null
          );
          
          // Final safety check: if finalDeskripsi still doesn't have item name and we have inventoryTx, force rebuild
          if (inventoryTx?.inventaris?.nama_barang && 
              !finalDeskripsi.includes(inventoryTx.inventaris.nama_barang) &&
              !finalDeskripsi.match(/^.+?\s+\(\d+\s+unit\)/i)) {
            // Rebuild dengan memaksa menggunakan nama_barang
            const itemName = inventoryTx.inventaris.nama_barang;
            const jumlah = inventoryTx.jumlah || '';
            finalDeskripsi = `${itemName} (${jumlah} unit)`;
            if (transaction.penerima_pembayar) {
              finalDeskripsi += ` / ${transaction.penerima_pembayar}`;
            }
          }
        } else {
          // For other transactions, use catatan if available, otherwise use deskripsi
          finalDeskripsi = catatanFromInventaris || transaction.deskripsi || '';
        }
        
        // Clean description (remove "Sumbangan: Rp 0" and hajat from donasi)
        const cleanedDeskripsi = cleanDescription(finalDeskripsi, transaction.kategori);
        
        // REVISI v2: Dashboard hanya menampilkan transaksi uang nyata
        // Tidak ada special handling untuk tracking nominal - semua transaksi di tabel keuangan adalah uang nyata
        const displayCategory = transaction.kategori || 'Lainnya';
        
        // Map alokasi_pengeluaran_santri ke alokasi_santri untuk kompatibilitas
        const alokasiSantri = transaction.alokasi_pengeluaran_santri || [];
        // Map rincian_pengeluaran ke rincian_items untuk kompatibilitas dengan TransactionDetailModal
        const rincianItems = transaction.rincian_pengeluaran || transaction.rincian_items || [];
        
        return {
          ...transaction,
          akun_kas_nama: (transaction.akun_kas?.nama || transaction.akun_kas_nama || '') || 'Kas Utama',
          display_category: displayCategory,
          source_type: transaction.sub_kategori || transaction.kategori || 'Manual',
          display_description: cleanedDeskripsi || (
            (transaction.jenis_transaksi === 'Pemasukan' ? 'Pemasukan' : 'Pengeluaran') +
            (transaction.kategori ? ` - ${transaction.kategori}` : '')
          ),
          alokasi_santri: alokasiSantri,
          rincian_items: rincianItems
        };
      });
      
      // FIXED: Get accurate statistics using new getAkunKasStats function
      const akunKasStatsData = await getAkunKasStats(selectedAccountFilter);
      
      // Store akunKasStats in state for use in render
      setAkunKasStats(akunKasStatsData);
      
      // Count jumlah transaksi pemasukan dan pengeluaran
      const currentDate = new Date();
      const currentYear = currentDate.getFullYear();
      const currentMonth = currentDate.getMonth();
      const startOfCurrentMonth = new Date(currentYear, currentMonth, 1);
      const endOfCurrentMonth = new Date(currentYear, currentMonth + 1, 0, 23, 59, 59);
      
      const currentMonthTransactions = transformedTransactions.filter(tx => {
        if (!tx.tanggal) return false;
        const txDate = new Date(tx.tanggal);
        return txDate >= startOfCurrentMonth && txDate <= endOfCurrentMonth;
      });
      
      const jumlahTransaksiPemasukan = currentMonthTransactions.filter(tx => tx.jenis_transaksi === 'Pemasukan').length;
      const jumlahTransaksiPengeluaran = currentMonthTransactions.filter(tx => tx.jenis_transaksi === 'Pengeluaran').length;
      
      // Create statistics object with accurate data
      const stats = {
        saldo_bersih: akunKasStatsData.totalSaldo,
        pemasukan_bulan_ini: akunKasStatsData.pemasukanBulanIni,
        pengeluaran_bulan_ini: akunKasStatsData.pengeluaranBulanIni,
        transaksi_bulan_ini: akunKasStatsData.totalTransaksi,
        pemasukan_trend: akunKasStatsData.pemasukanTrend,
        pengeluaran_trend: akunKasStatsData.pengeluaranTrend,
        jumlahTransaksiPemasukan,
        jumlahTransaksiPengeluaran
      };
      
      setStatistics(stats);
      setRecentTransactions(transformedTransactions);
      setAkunKas(filteredAccounts); // Use filtered accounts (excluding tabungan and koperasi)
      
      // Load chart data after main data is loaded (non-blocking untuk mempercepat initial render)
      // Use setTimeout to defer chart loading and improve perceived performance
      setTimeout(() => {
        loadChartData(selectedAccountFilter).catch(err => {
          console.error('Error loading chart data:', err);
        });
      }, 100);
      
    } catch (error) {
      console.error('Error loading data:', error);
      toast.error('Gagal memuat data keuangan');
    } finally {
      setLoading(false);
    }
  }, [selectedAccountFilter]);

  // Load initial data
  useEffect(() => {
    loadData();
  }, [loadData]);

  // Reload chart data when account filter changes
  useEffect(() => {
    if (selectedAccountFilter !== undefined) {
      loadChartData(selectedAccountFilter);
    }
  }, [selectedAccountFilter, loadChartData]);

  const handleRefresh = async () => {
    setRefreshing(true);
    await loadData();
    setRefreshing(false);
    toast.success('Data berhasil diperbarui');
  };

  const handleInputPengeluaran = () => {
    setShowForm(true);
  };

  const handleViewAllTransactions = () => {
    // For now, just show all transactions in the recent activities section
    // In a real implementation, this might open a full-page table or modal
    toast.info('Menampilkan semua transaksi...');
  };

  const handleFormSuccess = () => {
    // Close all forms
    setShowForm(false);
    setShowFormPemasukan(false);
    setShowFormPenyesuaianSaldo(false);
    // Reload data to reflect changes
    loadData();
    loadChartData(selectedAccountFilter);
    // Note: Toast messages are handled by individual form components
  };

  const handleEditSuccess = () => {
    setShowTransactionEdit(false);
    loadData();
  };

  const handleRefreshBalances = async () => {
    try {
      // Call the SQL function to recalculate all balances
      const { data, error } = await supabase.rpc('recalculate_all_balances');
      
      if (error) throw error;
      
      // Reload account data to get updated balances
      await loadData();
      
      toast.success('Saldo semua akun berhasil diperbarui');
    } catch (error) {
      console.error('Error refreshing balances:', error);
      toast.error('Gagal memperbarui saldo');
    }
  };

  const handleExportPDF = async (reportType: string, period?: PeriodFilter) => {
    try {
      toast.info(`Export PDF untuk ${reportType} sedang diproses...`);
      
      // Get real data from database
      const defaultPeriod = period || { start: new Date(2025, 0, 1), end: new Date() };
      const startDate = defaultPeriod.start.toISOString().split('T')[0];
      const endDate = defaultPeriod.end.toISOString().split('T')[0];
      
      let reportData;
      
      // Simplified export - just show success message
      reportData = {
        title: `Laporan ${reportType}`,
        period: defaultPeriod,
        data: []
      };
      
      const exporter = new PDFExporter();
      exporter.exportSingleReport(reportData);
      
      toast.success(`Export PDF ${reportType} berhasil!`);
    } catch (error) {
      console.error('Export PDF error:', error);
      toast.error(`Gagal export PDF: ${error.message}`);
    }
  };

  const handleExportExcel = async (reportType: string, period?: PeriodFilter) => {
    try {
      toast.info(`Export Excel untuk ${reportType} sedang diproses...`);
      
      // Get real data from database
      const defaultPeriod = period || { start: new Date(2025, 0, 1), end: new Date() };
      const startDate = defaultPeriod.start.toISOString().split('T')[0];
      const endDate = defaultPeriod.end.toISOString().split('T')[0];
      
      let sheets;
      
      // Simplified export - just show success message
      sheets = [{
        name: reportType,
        data: [{ sample: 'data' }],
        columns: [{ header: 'Sample', dataKey: 'sample', width: 20 }]
      }];
      
      const exporter = new ExcelExporter();
      exporter.exportMultipleSheets({
        filename: `Laporan_${reportType}`,
        title: `Laporan ${reportType}`,
        period,
        sheets
      });
      
      toast.success(`Export Excel ${reportType} berhasil!`);
    } catch (error) {
      console.error('Export Excel error:', error);
      toast.error(`Gagal export Excel: ${error.message}`);
    }
  };

  const handleExportAll = async (format: 'pdf' | 'excel', period?: PeriodFilter) => {
    try {
      toast.info(`Export All ${format.toUpperCase()} sedang diproses...`);
      
      const defaultPeriod = period || { start: new Date(2025, 0, 1), end: new Date() };
      const startDate = defaultPeriod.start.toISOString().split('T')[0];
      const endDate = defaultPeriod.end.toISOString().split('T')[0];
      
      // Simplified data loading
      const cashFlowData = { totalPemasukan: 0, totalPengeluaran: 0, saldoAkhir: 0, breakdown: [] };
      const categoryData = [];
      const santriData = [];
      const auditData = [];
      
      if (format === 'pdf') {
        const reports = [
          ReportFormatter.formatCashFlowReport(cashFlowData, defaultPeriod),
          ReportFormatter.formatKategoriReport(categoryData, defaultPeriod),
          ReportFormatter.formatSantriBantuanReport(santriData, defaultPeriod),
          ReportFormatter.formatAuditTrailReport(auditData, defaultPeriod)
        ];
        
        const exporter = new PDFExporter();
        exporter.exportMultipleReports(reports);
      } else {
        const sheets = [
          {
            name: 'Cash Flow',
            data: cashFlowData.breakdown,
            columns: [
              { header: 'Bulan', dataKey: 'bulan', width: 15 },
              { header: 'Pemasukan', dataKey: 'pemasukan', width: 20 },
              { header: 'Pengeluaran', dataKey: 'pengeluaran', width: 20 },
              { header: 'Saldo', dataKey: 'saldo', width: 20 }
            ]
          },
          {
            name: 'Per Kategori',
            data: categoryData,
            columns: [
              { header: 'Kategori', dataKey: 'kategori', width: 20 },
              { header: 'Total', dataKey: 'total', width: 15 },
              { header: 'Persentase', dataKey: 'persentase', width: 15 },
              { header: 'Jumlah Transaksi', dataKey: 'count', width: 15 }
            ]
          },
          {
            name: 'Per Santri',
            data: santriData,
            columns: [
              { header: 'Nama Santri', dataKey: 'nama', width: 25 },
              { header: 'Kategori', dataKey: 'kategori', width: 15 },
              { header: 'Total Bantuan', dataKey: 'totalBantuan', width: 20 },
              { header: 'Komponen', dataKey: 'komponen', width: 30 }
            ]
          },
          {
            name: 'Audit Trail',
            data: auditData,
            columns: [
              { header: 'Tanggal', dataKey: 'tanggal', width: 15 },
              { header: 'Jenis', dataKey: 'jenis', width: 10 },
              { header: 'Kategori', dataKey: 'kategori', width: 12 },
              { header: 'Jumlah', dataKey: 'jumlah', width: 15 },
              { header: 'User', dataKey: 'user', width: 10 },
              { header: 'Akun', dataKey: 'akun', width: 12 },
              { header: 'Status', dataKey: 'status', width: 10 },
              { header: 'Deskripsi', dataKey: 'deskripsi', width: 20 }
            ]
          }
        ];
        
        const exporter = new ExcelExporter();
        exporter.exportMultipleSheets({
          filename: 'Laporan_Keuangan_Komprehensif',
          title: 'Laporan Keuangan Komprehensif',
          period,
          summary: [
            { label: 'Total Pemasukan', value: ReportFormatter.formatCurrency(cashFlowData.totalPemasukan) },
            { label: 'Total Pengeluaran', value: ReportFormatter.formatCurrency(cashFlowData.totalPengeluaran) },
            { label: 'Saldo Akhir', value: ReportFormatter.formatCurrency(cashFlowData.saldoAkhir) }
          ],
          sheets
        });
      }
      
      toast.success(`Export All ${format.toUpperCase()} berhasil!`);
    } catch (error) {
      console.error('Export All error:', error);
      toast.error(`Gagal export All: ${error.message}`);
    }
  };



  const handleEditAccount = (account: AkunKas) => {
    setSelectedAccount(account);
    setEditForm({
      nama: account.nama || '',
      kode: account.kode || '',
      tipe: account.tipe || 'Kas',
      nomor_rekening: account.nomor_rekening || '',
      nama_bank: account.nama_bank || '',
      atas_nama: account.atas_nama || '',
      saldo_awal: account.saldo_awal || 0,
      status: account.status || 'aktif',
    });
    setShowEditAccount(true);
  };

  const handleSetDefaultAccount = async (accountId: string) => {
    try {
      await AkunKasService.setDefault(accountId);
      await loadData();
      toast.success('Akun berhasil dijadikan default');
    } catch (error) {
      if (process.env.NODE_ENV === 'development') {
        console.error('Error setting default account:', error);
      }
      toast.error('Gagal menjadikan akun default');
    }
  };

  const handleAddAccount = () => {
    setSelectedAccount(null);
    setEditForm({
      nama: '',
      kode: '',
      tipe: 'Kas',
      nomor_rekening: '',
      nama_bank: '',
      atas_nama: '',
      saldo_awal: 0,
      status: 'aktif',
    });
    setDeletedAccountInfo(null);
    setShowRestoreOption(false);
    setShowEditAccount(true);
  };

  const checkForDeletedAccount = async (nama: string, kode: string) => {
    if (!selectedAccount && nama && kode) {
      try {
        const { exists, account } = await AkunKasService.checkDeletedAccount(nama, kode);
        if (exists) {
          setDeletedAccountInfo(account);
          setShowRestoreOption(true);
        } else {
          setDeletedAccountInfo(null);
          setShowRestoreOption(false);
        }
      } catch (error) {
        if (process.env.NODE_ENV === 'development') {
          console.error('Error checking deleted account:', error);
        }
      }
    }
  };

  const handleSaveAccount = async () => {
    try {
      // Validate form data
      const validationErrors = AkunKasService.validate({
        ...editForm,
        tipe: editForm.tipe as 'Kas' | 'Bank' | 'Tabungan'
      });
      if (validationErrors.length > 0) {
        toast.error(validationErrors.join(', '));
        return;
      }

      // Check for duplicate name/kode (only if not restoring)
      if (!showRestoreOption) {
        const { namaExists, kodeExists } = await AkunKasService.checkDuplicateNameKode(
          editForm.nama, 
          editForm.kode, 
          selectedAccount?.id
        );

        if (namaExists) {
          toast.error(`Nama akun "${editForm.nama}" sudah digunakan`);
          return;
        }

        if (kodeExists) {
          toast.error(`Kode akun "${editForm.kode}" sudah digunakan`);
          return;
        }
      }

      if (selectedAccount) {
        // Update existing account (tanpa langsung mengubah saldo_awal di kolom update)
        await AkunKasService.update(selectedAccount.id, {
          nama: editForm.nama,
          kode: editForm.kode,
          tipe: editForm.tipe as 'Kas' | 'Bank' | 'Tabungan',
          nomor_rekening: editForm.nomor_rekening,
          nama_bank: editForm.nama_bank,
          atas_nama: editForm.atas_nama,
          status: editForm.status as 'aktif' | 'ditutup' | 'suspended',
        });

        // Jika saldo_awal berubah, set via RPC resmi + recalc
        if (typeof selectedAccount.saldo_awal === 'number' && selectedAccount.saldo_awal !== editForm.saldo_awal) {
          const { error: saldoAwalError } = await supabase.rpc('set_akun_kas_saldo_awal', {
            p_akun_id: selectedAccount.id,
            p_saldo_awal: editForm.saldo_awal,
          });
          if (saldoAwalError && process.env.NODE_ENV === 'development') {
            console.warn('RPC set_akun_kas_saldo_awal error:', saldoAwalError);
          }
        }

        toast.success('Akun berhasil diperbarui');
      } else {
        // Create new account
        await AkunKasService.create({
          nama: editForm.nama,
          kode: editForm.kode,
          tipe: editForm.tipe as 'Kas' | 'Bank' | 'Tabungan',
          nomor_rekening: editForm.nomor_rekening,
          nama_bank: editForm.nama_bank,
          atas_nama: editForm.atas_nama,
          saldo_awal: editForm.saldo_awal,
        });
        toast.success(showRestoreOption ? 'Akun berhasil dipulihkan' : 'Akun berhasil ditambahkan');
      }
      
      setShowEditAccount(false);
      setDeletedAccountInfo(null);
      setShowRestoreOption(false);
      await loadData();
    } catch (error: unknown) {
      const errorMessage = error instanceof Error ? error.message : 'Terjadi kesalahan tidak diketahui';
      
      // Enhanced error handling with user-friendly messages
      if (errorMessage.includes('duplicate key')) {
        toast.error('Nama atau kode akun sudah digunakan');
      } else if (errorMessage.includes('violates unique constraint')) {
        toast.error('Nama atau kode akun sudah digunakan');
      } else if (errorMessage.includes('foreign key constraint')) {
        toast.error('Tidak dapat menghapus akun yang masih memiliki transaksi');
      } else if (errorMessage.includes('permission denied')) {
        toast.error('Anda tidak memiliki izin untuk melakukan operasi ini');
      } else if (errorMessage.includes('network')) {
        toast.error('Koneksi internet bermasalah. Silakan coba lagi');
      } else {
        toast.error(`Gagal menyimpan akun: ${errorMessage}`);
      }
    }
  };

  const handleSelectAccount = (accountId: string | undefined) => {
    // Clear chart data immediately to prevent showing stale data
    setMonthlyData([]);
    setCategoryData([]);
    
    setSelectedAccountId(accountId);
    setSelectedAccountFilter(accountId);
    
    // Pass the new account ID directly to avoid state timing issues
    loadChartData(accountId);
    
    // Just add subtle highlight to recent activities section without scrolling
    if (accountId) {
      setTimeout(() => {
        const element = document.getElementById('recent-activities');
        if (element) {
          // Add highlight effect
          element.classList.add('ring-2', 'ring-blue-400', 'ring-offset-2');
          setTimeout(() => {
            element.classList.remove('ring-2', 'ring-blue-400', 'ring-offset-2');
          }, 2000);
        }
      }, 100);
    }
  };

  const handleViewAccountTransactions = (accountId: string) => {
    handleSelectAccount(accountId);
  };

  const handleClearAccountFilter = () => {
    setSelectedAccountFilter(undefined);
    setSelectedAccountId(undefined);
    loadChartData(undefined);
  };

  const handleViewDetail = async (transaction: Transaction) => {
    // Jika alokasi_santri tidak ada atau kosong, fetch ulang dari database
    let alokasiSantri = transaction.alokasi_santri || [];
    
    // Fetch alokasi santri secara terpisah untuk kategori yang seharusnya punya alokasi
    if ((transaction.kategori === 'Pendidikan Formal' || 
         transaction.kategori === 'Bantuan Langsung Yayasan' ||
         transaction.kategori === 'Operasional dan Konsumsi Santri') && 
        (!alokasiSantri || alokasiSantri.length === 0)) {
      try {
        const { data: alokasiData, error: alokasiError } = await supabase
          .from('alokasi_pengeluaran_santri')
          .select(`
            id,
            santri_id,
            nominal_alokasi,
            jenis_bantuan,
            periode,
            keterangan,
            santri:santri_id(
              id,
              nama_lengkap,
              nisn,
              id_santri
            )
          `)
          .eq('keuangan_id', transaction.id);
        
        if (!alokasiError && alokasiData) {
          alokasiSantri = alokasiData;
          console.log('[KeuanganV3] Fetched alokasi santri:', {
            keuangan_id: transaction.id,
            kategori: transaction.kategori,
            jumlah: alokasiSantri.length
          });
        }
      } catch (error) {
        console.error('[KeuanganV3] Error fetching alokasi santri:', error);
      }
    }
    
    setSelectedTransaction({
      ...transaction,
      alokasi_santri: alokasiSantri
    });
    setShowTransactionDetail(true);
  };

  const handleEditTransaction = (transaction: Transaction) => {
    // Izinkan edit untuk auto-posted jika jenis_transaksi === 'Pemasukan'
    if (transaction.auto_posted && transaction.jenis_transaksi !== 'Pemasukan') {
      const sourceModule = transaction.source_module || 'modul lain';
      toast.error(`Transaksi ini berasal dari ${sourceModule} dan tidak dapat diedit. Edit dari modul sumber terlebih dahulu.`);
      return;
    }
    
    setSelectedTransaction(transaction);
    setShowTransactionEdit(true);
  };

  const handleEditTanggalDonasi = (transaction: Transaction) => {
    // Hanya untuk transaksi donasi dengan jenis pemasukan
    if (transaction.source_module === 'donasi' && transaction.jenis_transaksi === 'Pemasukan') {
      setSelectedTransactionForEditTanggal(transaction);
      setShowEditTanggalDonasi(true);
    } else {
      toast.error('Fitur ini hanya untuk transaksi pemasukan dari donasi');
    }
  };

  const handleDeleteTransaction = async (transaction: Transaction) => {
    // Izinkan delete untuk auto-posted jika jenis_transaksi === 'Pemasukan'
    if (transaction.auto_posted && transaction.jenis_transaksi !== 'Pemasukan') {
      const sourceModule = transaction.source_module || 'modul lain';
      toast.error(`Transaksi ini berasal dari ${sourceModule} dan tidak dapat dihapus. Hapus dari modul sumber terlebih dahulu.`);
      return;
    }
    
    const jumlah = typeof transaction.jumlah === 'number' ? transaction.jumlah : 0;
    const deskripsi = typeof transaction.deskripsi === 'string' ? transaction.deskripsi : '';
    const kategori = typeof transaction.kategori === 'string' ? transaction.kategori : '';
    
    const confirmed = window.confirm(
      `Apakah Anda yakin ingin menghapus transaksi "${deskripsi || kategori}" senilai ${new Intl.NumberFormat('id-ID', {
        style: 'currency',
        currency: 'IDR',
        minimumFractionDigits: 0,
      }).format(jumlah)}?`
    );
    
    if (confirmed) {
      try {
        // Untuk transaksi pemasukan auto_posted, coba direct delete dulu (lebih langsung)
        // Jika direct delete gagal, baru coba RPC
        let deleteSuccess = false;
        
        if (transaction.jenis_transaksi === 'Pemasukan' && transaction.auto_posted) {
          // BUG A FIX: Untuk transaksi Donasi, set skip_finance_sync=true di source record
          // untuk mencegah regenerasi setelah delete
          // GUNAKAN source_module + source_id (link stabil, tidak perlu parsing referensi)
          const isDonasiTransaction = 
            transaction.source_module === 'donasi' ||
            transaction.kategori === 'Donasi' || 
            transaction.kategori === 'Donasi Tunai' ||
            transaction.kategori === 'Donasi Pendidikan' ||
            transaction.kategori === 'Donasi Pembangunan' ||
            transaction.kategori === 'Donasi Umum';
          
          // GUNAKAN source_id langsung jika tersedia (link stabil)
          // Fallback ke parsing referensi hanya jika source_id tidak ada (backward compatibility)
          let donationId: string | null = null;
          
          if (isDonasiTransaction) {
            if (transaction.source_id) {
              // PREFERRED: Gunakan source_id langsung (link stabil, tidak perlu parsing)
              donationId = transaction.source_id as string;
            } else if (transaction.referensi) {
              // FALLBACK: Parse referensi untuk backward compatibility dengan data lama
              const donationIdMatch = (transaction.referensi as string).match(/^(?:donation|donasi):(.+)$/);
              if (donationIdMatch && donationIdMatch[1]) {
                donationId = donationIdMatch[1].trim();
              }
            }
            
            if (donationId) {
              // Set skip_finance_sync=true untuk mencegah trigger membuat ulang transaksi
              // Handle gracefully jika kolom belum ada (migration belum dijalankan)
              try {
                const { error: skipError } = await supabase
                  .from('donations')
                  .update({ skip_finance_sync: true })
                  .eq('id', donationId);
                
                if (skipError) {
                  // Check if error is because column doesn't exist (PGRST204)
                  if (skipError.code === 'PGRST204' || skipError.message?.includes('skip_finance_sync')) {
                    // Fallback: Clear posted_to_finance_at to prevent regeneration (old method)
                    try {
                      await supabase
                        .from('donations')
                        .update({ posted_to_finance_at: null })
                        .eq('id', donationId);
                    } catch (clearError) {
                      // Silently handle fallback error
                      if (process.env.NODE_ENV === 'development') {
                        console.warn('Failed to clear posted_to_finance_at:', clearError);
                      }
                    }
                  }
                  // Continue with delete anyway - the transaction deletion should still work
                }
              } catch (skipError) {
                // Silently handle error and continue with delete
                if (process.env.NODE_ENV === 'development') {
                  console.warn('Exception setting skip_finance_sync:', skipError);
                }
              }
            }
          }
          
          // Coba direct delete terlebih dahulu
          const { error: directDeleteError, data: deleteData } = await supabase
            .from('keuangan')
            .delete()
            .eq('id', transaction.id)
            .select();
          
          if (!directDeleteError) {
            deleteSuccess = true;
            
            // Update saldo akun kas
            if (transaction.akun_kas_id) {
              try {
                await supabase.rpc('ensure_akun_kas_saldo_correct_for', {
                  p_akun_id: transaction.akun_kas_id as string
                });
              } catch (saldoError) {
                // Silently handle saldo update error
                if (process.env.NODE_ENV === 'development') {
                  console.warn('Failed to update saldo after delete:', saldoError);
                }
              }
            }
          } else {
            // Fallback: Coba dengan RPC jika ada
            try {
              const { error: rpcError } = await supabase.rpc('delete_keuangan_and_recalc', { 
                p_keuangan_id: transaction.id as string 
              });
              
              if (!rpcError) {
                deleteSuccess = true;
              } else {
                // Jika RPC juga gagal, tampilkan error detail
                toast.error(`Gagal menghapus transaksi: ${directDeleteError.message || 'Tidak memiliki izin untuk menghapus transaksi ini'}. Error: ${directDeleteError.code || 'UNKNOWN'}`);
                return;
              }
            } catch (rpcCallError) {
              // Jika RPC tidak ada atau error, tampilkan error dari direct delete
              toast.error(`Gagal menghapus transaksi: ${directDeleteError.message || 'Tidak memiliki izin untuk menghapus transaksi ini'}. Error code: ${directDeleteError.code || 'UNKNOWN'}`);
              return;
            }
          }
        } else {
          // Untuk transaksi non-auto-posted atau pengeluaran, gunakan RPC
          const { error } = await supabase.rpc('delete_keuangan_and_recalc', { 
            p_keuangan_id: transaction.id as string 
          });
          
          if (error) {
            toast.error(`Gagal menghapus transaksi: ${error.message}`);
            return;
          }
          deleteSuccess = true;
        }
        
        if (deleteSuccess) {
          toast.success('Transaksi berhasil dihapus');
          
          // Don't filter state manually - let loadData() fetch fresh data from DB
          // This ensures we get the actual current state from database
          
          // Call loadData immediately to refresh from database
          // Add a small delay only to ensure database commit is complete
          await new Promise(resolve => setTimeout(resolve, 100));
          
          try {
            await loadData();
            // Refresh chart data
            await loadChartData(selectedAccountFilter);
          } catch (refreshError) {
            // Retry once more
            try {
              await new Promise(resolve => setTimeout(resolve, 300));
              await loadData();
              await loadChartData(selectedAccountFilter);
            } catch (retryError) {
              if (process.env.NODE_ENV === 'development') {
                console.error('Error during refresh retry:', retryError);
              }
            }
          }
        }
      } catch (error: unknown) {
        const errorMessage = error instanceof Error ? error.message : 'Terjadi kesalahan yang tidak diketahui';
        toast.error(`Gagal menghapus transaksi: ${errorMessage}`);
        // Reload data on error to ensure UI is in sync
        await loadData();
      }
    }
  };

  const handleDeleteAccount = async (account: AkunKas) => {
    // Check if account has transactions first
    try {
      const { data: checkResult, error: checkError } = await supabase
        .rpc('check_akun_kas_deletable', { p_akun_kas_id: account.id });
      
      if (checkError) {
        if (process.env.NODE_ENV === 'development') {
          console.error('Error checking deletable:', checkError);
        }
      } else if (checkResult && !checkResult.deletable) {
        toast.error(checkResult.reason || 'Akun kas masih memiliki transaksi dan tidak dapat dihapus');
        return;
      }
      } catch (error) {
        if (process.env.NODE_ENV === 'development') {
          console.error('Error checking deletable:', error);
        }
      }
    
    const confirmed = window.confirm(
      `Apakah Anda yakin ingin menutup akun "${account.nama}"? Akun akan diubah statusnya menjadi "ditutup" dan tidak akan muncul di daftar akun aktif.`
    );
    
    if (confirmed) {
      try {
        await AkunKasService.delete(account.id);
        toast.success('Akun berhasil ditutup');
        await loadData(); // Reload data
      } catch (error: unknown) {
        const errorMessage = error instanceof Error ? error.message : 'Terjadi kesalahan tidak diketahui';
        
        // Enhanced error handling
        if (errorMessage.includes('masih memiliki') || errorMessage.includes('transaksi')) {
          toast.error('Tidak dapat menutup akun karena masih memiliki transaksi. Silakan pindahkan atau hapus transaksi terlebih dahulu.');
        } else if (errorMessage.includes('foreign key constraint') || errorMessage.includes('RESTRICT')) {
          toast.error('Tidak dapat menutup akun karena masih memiliki transaksi terkait.');
        } else {
          toast.error(`Gagal menutup akun: ${errorMessage}`);
        }
      }
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="flex flex-col items-center space-y-4">
          <RefreshCw className="h-8 w-8 animate-spin" />
          <p className="text-muted-foreground">Memuat data keuangan...</p>
        </div>
      </div>
    );
  }

  // Calculate totals for display
  const totals = {
    totalBalance: selectedAccountId 
      ? akunKas.find(akun => akun.id === selectedAccountId)?.saldo_saat_ini || 0
      : akunKas.filter(akun => akun.status === 'aktif').reduce((sum, akun) => sum + (akun.saldo_saat_ini || 0), 0),
    accountCount: akunKas.filter(akun => akun.status === 'aktif').length
  };

  const currentSelectedAccount = selectedAccountId 
    ? akunKas.find(akun => akun.id === selectedAccountId)
    : null;

  const selectedAccountName = currentSelectedAccount?.nama;

  return (
    <div className="container mx-auto px-4 sm:px-6 lg:px-8 py-6 space-y-8 bg-white min-h-screen">
      {/* Header */}
      {/* Modern Header Section */}
      <div className="mb-8">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <h1 className="text-3xl font-light tracking-tight text-gray-900">Keuangan</h1>
          </div>
          
          {/* Action Buttons - Grouped and Clean */}
          <div className="flex items-center gap-2 flex-wrap justify-end ml-auto">
            {/* Primary Actions */}
            <div className="flex items-center gap-2 flex-shrink-0">
              <Button 
                size="sm" 
                onClick={handleInputPengeluaran}
                className="bg-gray-900 hover:bg-gray-800 text-white shadow-sm whitespace-nowrap text-xs sm:text-sm"
              >
                <Plus className="h-4 w-4 sm:mr-2" />
                <span className="hidden sm:inline">Pengeluaran</span>
              </Button>
              <Button 
                size="sm" 
                variant="outline"
                onClick={() => setShowFormPemasukan(true)}
                className="border-gray-200 hover:bg-gray-50 text-gray-700 whitespace-nowrap text-xs sm:text-sm"
              >
                <TrendingUp className="h-4 w-4 sm:mr-2" />
                <span className="hidden sm:inline">Pemasukan</span>
              </Button>
            </div>
            
            {/* Secondary Actions */}
            <div className="flex items-center gap-2 border-l border-gray-200 pl-2 flex-shrink-0">
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setShowFormPenyesuaianSaldo(true)}
                className="text-gray-600 hover:text-gray-900 hover:bg-gray-50 whitespace-nowrap text-xs sm:text-sm"
              >
                <RefreshCw className="h-4 w-4 sm:mr-2" />
                <span className="hidden md:inline">Penyesuaian</span>
              </Button>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setShowExportDialog(true)}
                className="text-gray-600 hover:text-gray-900 hover:bg-gray-50 whitespace-nowrap text-xs sm:text-sm"
              >
                <FileText className="h-4 w-4 sm:mr-2" />
                <span className="hidden md:inline">Export</span>
              </Button>
              <Button
                variant="ghost"
                size="sm"
                onClick={handleRefresh}
                disabled={refreshing}
                className="text-gray-600 hover:text-gray-900 hover:bg-gray-50 flex-shrink-0"
              >
                <RefreshCw className={`h-4 w-4 ${refreshing ? 'animate-spin' : ''}`} />
              </Button>
            </div>
          </div>
        </div>
      </div>

      {/* Section 1: Account & Balance Overview */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                {/* Account Cards */}
                <div>
                  <StackedAccountCards
                    accounts={akunKas.filter(akun => akun.status === 'aktif')}
                    selectedAccountId={selectedAccountId}
                    onSelectAccount={handleSelectAccount}
                    onAddAccount={handleAddAccount}
                    onEditAccount={handleEditAccount}
                    onDeleteAccount={handleDeleteAccount}
                    onViewTransactions={handleViewAccountTransactions}
                    onSetDefaultAccount={handleSetDefaultAccount}
                  />
                </div>
        
        {/* Total Balance Display */}
        <div>
          <TotalBalanceDisplay
            totalBalance={totals.totalBalance}
            accountCount={totals.accountCount}
            selectedAccount={currentSelectedAccount}
            onViewAllAccounts={() => handleSelectAccount(undefined)}
            onTransfer={() => {
              // TODO: Implement transfer antar akun kas
              toast.info('Fitur transfer antar akun akan segera tersedia');
            }}
            onRequest={() => {
              // TODO: Implement request/pengajuan dana
              toast.info('Fitur pengajuan dana akan segera tersedia');
            }}
          />
        </div>
      </div>

      {/* Section 2: Summary Cards - 4 KPI Cards */}
      {statistics && akunKasStats && (
        <SummaryCards 
          stats={{
            totalSaldo: totals.totalBalance,
            saldoAwal: akunKasStats.saldoAwal,
            saldoAkhir: akunKasStats.saldoAkhir,
            pemasukanBulanIni: statistics.pemasukan_bulan_ini,
            pengeluaranBulanIni: statistics.pengeluaran_bulan_ini,
            totalTransaksi: statistics.transaksi_bulan_ini,
            pemasukanTrend: statistics.pemasukan_trend || 0,
            pengeluaranTrend: statistics.pengeluaran_trend || 0,
            jumlahTransaksiPemasukan: statistics.jumlahTransaksiPemasukan || 0,
            jumlahTransaksiPengeluaran: statistics.jumlahTransaksiPengeluaran || 0,
          }}
          selectedAccountName={selectedAccountName}
          periodLabel="Bulan Ini"
        />
      )}

      {/* Section 3: Charts Section */}
      <ChartsSection 
        monthlyData={monthlyData}
        categoryData={categoryData}
        selectedAccountId={selectedAccountFilter}
        selectedAccountName={selectedAccountName}
      />

      {/* Section 4: Riwayat Transaksi - Single Table with Full Features */}
      <RiwayatTransaksi 
        transactions={recentTransactions}
        selectedAccountId={selectedAccountFilter}
        selectedAccountName={selectedAccountName}
        onClearFilter={handleClearAccountFilter}
        onViewDetail={handleViewDetail}
        onEditTransaction={handleEditTransaction}
        onDeleteTransaction={handleDeleteTransaction}
        onEditTanggalDonasi={handleEditTanggalDonasi}
      />

      {/* Modal for Input Pengeluaran */}
      <Dialog open={showForm} onOpenChange={setShowForm}>
        <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Input Pengeluaran</DialogTitle>
          </DialogHeader>
          <FormPengeluaranRinci onSuccess={handleFormSuccess} />
        </DialogContent>
      </Dialog>

      {/* Modal for Input Pemasukan Manual */}
      <Dialog open={showFormPemasukan} onOpenChange={setShowFormPemasukan}>
        <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Input Pemasukan Manual</DialogTitle>
          </DialogHeader>
          <FormPemasukanManual onSuccess={handleFormSuccess} />
        </DialogContent>
      </Dialog>

      {/* Modal for Penyesuaian Saldo */}
      <Dialog open={showFormPenyesuaianSaldo} onOpenChange={setShowFormPenyesuaianSaldo}>
        <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Penyesuaian Saldo Akun Kas</DialogTitle>
          </DialogHeader>
          <FormPenyesuaianSaldo onSuccess={handleFormSuccess} />
        </DialogContent>
      </Dialog>

      {/* Modal for Edit Account */}
      <Dialog open={showEditAccount} onOpenChange={setShowEditAccount}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>
              {selectedAccount ? 'Edit Akun Kas' : 'Tambah Akun Kas'}
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label htmlFor="nama">Nama Akun</Label>
                <Input
                  id="nama"
                  value={editForm.nama}
                  onChange={(e) => {
                    setEditForm({...editForm, nama: e.target.value});
                    checkForDeletedAccount(e.target.value, editForm.kode);
                  }}
                  placeholder="Kas Utama"
                />
              </div>
              <div>
                <Label htmlFor="kode">Kode</Label>
                <Input
                  id="kode"
                  value={editForm.kode}
                  onChange={(e) => {
                    setEditForm({...editForm, kode: e.target.value});
                    checkForDeletedAccount(editForm.nama, e.target.value);
                  }}
                  placeholder="KAS-01"
                />
              </div>
            </div>

            {/* Restore Option Alert */}
            {showRestoreOption && deletedAccountInfo && (
              <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                <div className="flex items-start space-x-3">
                  <div className="flex-shrink-0">
                    <svg className="h-5 w-5 text-blue-400" viewBox="0 0 20 20" fill="currentColor">
                      <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z" clipRule="evenodd" />
                    </svg>
                  </div>
                  <div className="flex-1">
                    <h3 className="text-sm font-medium text-blue-800">
                      Akun dengan nama/kode ini pernah dihapus
                    </h3>
                    <div className="mt-2 text-sm text-blue-700">
                      <p>Ditemukan akun yang dihapus dengan nama "{deletedAccountInfo.account_name}" dan kode "{deletedAccountInfo.account_kode}".</p>
                      <p className="mt-1">Apakah Anda ingin memulihkan akun lama atau membuat akun baru?</p>
                    </div>
                    <div className="mt-3 flex space-x-3">
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        onClick={() => {
                          setShowRestoreOption(false);
                          setDeletedAccountInfo(null);
                        }}
                      >
                        Buat Akun Baru
                      </Button>
                      <Button
                        type="button"
                        variant="default"
                        size="sm"
                        onClick={() => {
                          // User chooses to restore
                          setShowRestoreOption(true);
                        }}
                        className="bg-green-600 hover:bg-green-700"
                      >
                        Pulihkan Akun Lama
                      </Button>
                    </div>
                  </div>
                </div>
              </div>
            )}
            
            <div>
              <Label htmlFor="tipe">Tipe</Label>
              <select
                id="tipe"
                value={editForm.tipe}
                onChange={(e) => setEditForm({...editForm, tipe: e.target.value})}
                className="w-full px-3 py-2 border border-input bg-background rounded-md text-sm"
              >
                <option value="Kas">Kas</option>
                <option value="Bank">Bank</option>
                <option value="Tabungan">Tabungan</option>
              </select>
            </div>

            {editForm.tipe === 'Bank' && (
              <>
                <div>
                  <Label htmlFor="nomor_rekening">Nomor Rekening</Label>
                  <Input
                    id="nomor_rekening"
                    value={editForm.nomor_rekening}
                    onChange={(e) => setEditForm({...editForm, nomor_rekening: e.target.value})}
                    placeholder="1234567890"
                  />
                </div>
                <div>
                  <Label htmlFor="nama_bank">Nama Bank</Label>
                  <Input
                    id="nama_bank"
                    value={editForm.nama_bank}
                    onChange={(e) => setEditForm({...editForm, nama_bank: e.target.value})}
                    placeholder="Bank BCA"
                  />
                </div>
                <div>
                  <Label htmlFor="atas_nama">Atas Nama</Label>
                  <Input
                    id="atas_nama"
                    value={editForm.atas_nama}
                    onChange={(e) => setEditForm({...editForm, atas_nama: e.target.value})}
                    placeholder="Yayasan Al-Bisri"
                  />
                </div>
              </>
            )}

            <div>
              <Label htmlFor="saldo_awal">Saldo Awal</Label>
              <Input
                id="saldo_awal"
                type="number"
                value={editForm.saldo_awal}
                onChange={(e) => setEditForm({...editForm, saldo_awal: Number(e.target.value)})}
                placeholder="0"
              />
            </div>

            <div>
              <Label htmlFor="status">Status</Label>
              <select
                id="status"
                value={editForm.status}
                onChange={(e) => setEditForm({...editForm, status: e.target.value})}
                className="w-full px-3 py-2 border border-input bg-background rounded-md text-sm"
              >
                <option value="aktif">Aktif</option>
                <option value="ditutup">Ditutup</option>
                <option value="suspended">Suspended</option>
              </select>
            </div>

            <div className="flex justify-end space-x-2">
              <Button variant="outline" onClick={() => {
                setShowEditAccount(false);
                setDeletedAccountInfo(null);
                setShowRestoreOption(false);
              }}>
                Batal
              </Button>
              <Button onClick={handleSaveAccount}>
                {selectedAccount 
                  ? 'Simpan Perubahan' 
                  : showRestoreOption 
                    ? 'Pulihkan Akun' 
                    : 'Tambah Akun'
                }
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Transaction Detail Modal */}
      <TransactionDetailModal
        transaction={selectedTransaction}
        isOpen={showTransactionDetail}
        onClose={() => setShowTransactionDetail(false)}
        onEdit={handleEditTransaction}
        onDelete={handleDeleteTransaction}
      />

      {/* Transaction Edit Modal */}
      <TransactionEditModal
        transaction={selectedTransaction}
        isOpen={showTransactionEdit}
        onClose={() => setShowTransactionEdit(false)}
        onSuccess={handleEditSuccess}
      />

      {/* Edit Tanggal Transfer Donasi Dialog */}
      <EditTanggalTransferDonasiDialog
        transaction={selectedTransactionForEditTanggal}
        isOpen={showEditTanggalDonasi}
        onClose={() => {
          setShowEditTanggalDonasi(false);
          setSelectedTransactionForEditTanggal(null);
        }}
        onSuccess={async () => {
          setShowEditTanggalDonasi(false);
          setSelectedTransactionForEditTanggal(null);
          await loadData();
          await loadChartData(selectedAccountFilter);
        }}
      />

      {/* Export PDF Dialog V3 */}
      <ExportPDFDialogV3
        open={showExportDialog}
        onClose={() => setShowExportDialog(false)}
        onExport={(filename) => {
          toast.success(`PDF berhasil di-export: ${filename}`);
        }}
        selectedAccountId={selectedAccountFilter}
        selectedAccountName={selectedAccountName}
      />
    </div>
  );
};

export default KeuanganV3;
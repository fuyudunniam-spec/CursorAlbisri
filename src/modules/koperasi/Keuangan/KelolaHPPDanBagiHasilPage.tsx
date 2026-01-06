import { useState, useEffect } from 'react';
import { useQuery, useQueryClient, useMutation } from '@tanstack/react-query';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Checkbox } from '@/components/ui/checkbox';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Plus, Edit, Settings, Package, DollarSign, TrendingUp, AlertCircle, CheckCircle2, Calculator, History, PieChart, RefreshCw, Calendar, Wallet } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { format, startOfMonth, endOfMonth, startOfYear, endOfYear, subMonths, startOfDay, endOfDay } from 'date-fns';
import { id as localeId } from 'date-fns/locale';
import SkemaBagiHasilPage from './SkemaBagiHasilPage';
import ProfitSharingBreakdown from './components/ProfitSharingBreakdown';
import RiwayatTransaksi from '@/components/dashboard/RiwayatTransaksi';
import TransactionDetailModal from '@/components/TransactionDetailModal';
import { addKeuanganKoperasiTransaction } from '@/services/keuanganKoperasi.service';
import type { MonthlySummary } from '@/types/koperasi.types';

interface InventoryItem {
  id: string;
  kode_inventaris: string | null;
  nama_barang: string;
  kategori: string;
  tipe_item: string;
  jumlah: number;
  satuan: string | null;
  harga_perolehan: number | null;
  hpp_yayasan: number | null;
  is_komoditas: boolean | null;
  boleh_dijual_koperasi: boolean | null;
  sumber: string | null;
  created_at: string;
}

interface SoldItem {
  item_id: string;
  nama_barang: string;
  kode_inventaris: string | null;
  kode_barang: string | null; // kode_barang dari kop_barang (YYS-#### atau KOP-####)
  owner_type: 'yayasan' | 'koperasi'; // owner_type dari kop_barang
  kategori: string;
  total_terjual: number;
  total_nilai: number;
  hpp_yayasan: number | null;
  harga_perolehan: number | null;
  tanggal_penjualan_terakhir: string | null;
}

const KelolaHPPDanBagiHasilPage = () => {
  const queryClient = useQueryClient();
  const [activeTab, setActiveTab] = useState('kalkulator');
  const [showHPPDialog, setShowHPPDialog] = useState(false);
  const [editingItem, setEditingItem] = useState<InventoryItem | null>(null);
  const [hppValue, setHppValue] = useState<string>('');
  const [searchTerm, setSearchTerm] = useState('');
  const [filterKategori, setFilterKategori] = useState<string>('all');
  const [filterOwnerType, setFilterOwnerType] = useState<'all' | 'yayasan' | 'koperasi'>('all');
  const [filterStatus, setFilterStatus] = useState<'all' | 'with_hpp' | 'without_hpp'>('all');
  
  // State untuk Riwayat Bagi Hasil (dari BagiHasilPage)
  const [dateFilter, setDateFilter] = useState<string>('semua');
  const [transactions, setTransactions] = useState<any[]>([]);
  const [showTransactionDetail, setShowTransactionDetail] = useState(false);
  const [selectedTransaction, setSelectedTransaction] = useState<any>(null);
  const [kasKoperasiId, setKasKoperasiId] = useState<string | null>(null);
  const [monthlySummaries, setMonthlySummaries] = useState<MonthlySummary[]>([]);
  const [showPaymentDialog, setShowPaymentDialog] = useState(false);
  const [selectedSummary, setSelectedSummary] = useState<MonthlySummary | null>(null);
  const [processingPayment, setProcessingPayment] = useState(false);

  // State untuk Kalkulator
  const [calculationMode, setCalculationMode] = useState<'atur-hpp' | 'akumulatif'>('atur-hpp');
  const [selectedItemIds, setSelectedItemIds] = useState<Set<string>>(new Set());
  // Default bagi hasil: 50:50 (bisa diubah sesuai kesepakatan)
  // Jika HPP sudah ditentukan, bagi hasil tidak digunakan (margin langsung jadi laba koperasi)
  const [bagiHasilYayasan, setBagiHasilYayasan] = useState<number>(50);
  const [bagiHasilKoperasi, setBagiHasilKoperasi] = useState<number>(50);
  const [selectedCostOperasionalIds, setSelectedCostOperasionalIds] = useState<Set<string>>(new Set());
  const [isSavingDecision, setIsSavingDecision] = useState(false);
  const [pendingHppChanges, setPendingHppChanges] = useState<Record<string, number>>({}); // item_id -> hpp value

  // Fetch inventory items (komoditas yang boleh dijual koperasi)
  const { data: inventoryItems = [], isLoading: isLoadingItems } = useQuery({
    queryKey: ['inventaris-komoditas', searchTerm, filterKategori, filterStatus],
    queryFn: async () => {
      let query = supabase
        .from('inventaris')
        .select('*')
        .or('is_komoditas.eq.true,boleh_dijual_koperasi.eq.true')
        .order('nama_barang');

      if (searchTerm) {
        query = query.or(`nama_barang.ilike.%${searchTerm}%,kode_inventaris.ilike.%${searchTerm}%`);
      }

      if (filterKategori !== 'all') {
        query = query.eq('kategori', filterKategori);
      }

      const { data, error } = await query;
      if (error) throw error;

      let filtered = data || [];

      // Filter by HPP status
      if (filterStatus === 'with_hpp') {
        filtered = filtered.filter(item => item.hpp_yayasan !== null && item.hpp_yayasan > 0);
      } else if (filterStatus === 'without_hpp') {
        filtered = filtered.filter(item => item.hpp_yayasan === null || item.hpp_yayasan === 0);
      }

      return filtered as InventoryItem[];
    },
  });

  // Functions untuk Riwayat Bagi Hasil Tab (dipindahkan ke atas untuk digunakan di query)
  const getDateRangeForBagiHasil = () => {
    const now = new Date();
    let startDate: Date;
    let endDate: Date;

    switch (dateFilter) {
      case 'hari-ini':
        startDate = startOfDay(now);
        endDate = endOfDay(now);
        break;
      case 'minggu-ini':
        const dayOfWeek = now.getDay();
        const weekStart = new Date(now);
        weekStart.setDate(now.getDate() - dayOfWeek);
        startDate = startOfDay(weekStart);
        const weekEnd = new Date(weekStart);
        weekEnd.setDate(weekStart.getDate() + 6);
        endDate = endOfDay(weekEnd);
        break;
      case 'bulan-ini':
        startDate = startOfMonth(now);
        endDate = endOfMonth(now);
        break;
      case 'bulan-lalu':
        const lastMonth = subMonths(now, 1);
        startDate = startOfMonth(lastMonth);
        endDate = endOfMonth(lastMonth);
        break;
      case 'tahun-ini':
        startDate = startOfYear(now);
        endDate = endOfYear(now);
        break;
      case 'tahun-lalu':
        const lastYear = now.getFullYear() - 1;
        startDate = startOfYear(new Date(lastYear, 0, 1));
        endDate = endOfYear(new Date(lastYear, 11, 31));
        break;
      case 'semua':
        // Untuk 'semua', return range yang sangat luas untuk mengambil semua data
        // Menggunakan tanggal sangat lama hingga hari ini
        startDate = new Date(0); // Epoch start (1970-01-01)
        endDate = endOfDay(now); // Today end of day
        break;
      default:
        // Default to 'semua' behavior - tampilkan semua data
        startDate = new Date(0); // Epoch start (1970-01-01)
        endDate = endOfDay(now); // Today end of day
    }

    return { startDate, endDate };
  };

  // Fetch Kas Koperasi
  useEffect(() => {
    const fetchKasKoperasi = async () => {
      const { data, error } = await supabase
        .from('akun_kas')
        .select('id')
        .eq('managed_by', 'koperasi')
        .eq('status', 'aktif')
        .limit(1)
        .single();
      
      if (!error && data) {
        setKasKoperasiId(data.id);
      }
    };
    fetchKasKoperasi();
  }, []);

  // Fetch cost operasional dari keuangan (EXCLUDE kewajiban/hutang ke yayasan DAN transfer ke yayasan)
  // Cost operasional hanya pengeluaran operasional biasa, BUKAN kewajiban pembayaran ke yayasan
  // BUKAN juga transfer ke yayasan (transfer laba/rugi adalah distribusi laba, bukan cost operasional)
  // IMPORTANT: Mengambil dari KEDUA tabel (keuangan dan keuangan_koperasi) untuk sinkronisasi dengan riwayat transaksi
  // Sama seperti di KeuanganUnifiedPage untuk konsistensi data
  const { data: costOperasional = [] } = useQuery({
    queryKey: ['koperasi-cost-operasional', getDateRangeForBagiHasil().startDate, getDateRangeForBagiHasil().endDate, kasKoperasiId],
    queryFn: async () => {
      const dateRange = getDateRangeForBagiHasil();
      
      // Get akun kas koperasi untuk filter (sama seperti di KeuanganUnifiedPage)
      // IMPORTANT: Gunakan filter yang sama persis dengan KeuanganUnifiedPage untuk konsistensi
      const { data: akunKasData } = await supabase
        .from('akun_kas')
        .select('id, nama, managed_by')
        .eq('status', 'aktif');
      
      // Filter sama seperti di KeuanganUnifiedPage: managed_by === 'koperasi' || nama includes 'koperasi'
      const koperasiAccountIds = (akunKasData || [])
        .filter(akun => akun.managed_by === 'koperasi' || akun.nama?.toLowerCase().includes('koperasi'))
        .map(akun => akun.id);
      
      if (koperasiAccountIds.length === 0) {
        return [];
      }
      
      // 1. Ambil dari keuangan (source_module = 'koperasi') - transaksi baru
      let keuanganQuery = supabase
        .from('keuangan')
        .select('id, tanggal, deskripsi, jumlah, kategori, sub_kategori, penerima_pembayar, akun_kas_id')
        .eq('jenis_transaksi', 'Pengeluaran')
        .eq('status', 'posted')
        .eq('source_module', 'koperasi')
        .in('akun_kas_id', koperasiAccountIds);
      
      // Apply date filter (skip if 'semua')
      if (dateFilter !== 'semua') {
        keuanganQuery = keuanganQuery.gte('tanggal', dateRange.startDate.toISOString());
        keuanganQuery = keuanganQuery.lte('tanggal', dateRange.endDate.toISOString());
      }
      
      const { data: dataKeuangan, error: errorKeuangan } = await keuanganQuery.order('tanggal', { ascending: false });

      if (errorKeuangan) throw errorKeuangan;
      
      // 2. Ambil dari keuangan_koperasi (tabel lama) - untuk backward compatibility
      let koperasiQuery = supabase
        .from('keuangan_koperasi')
        .select('id, tanggal, deskripsi, jumlah, kategori, sub_kategori, penerima_pembayar, akun_kas_id')
        .eq('jenis_transaksi', 'Pengeluaran')
        .eq('status', 'posted')
        .in('akun_kas_id', koperasiAccountIds);
      
      // Apply date filter (skip if 'semua')
      if (dateFilter !== 'semua') {
        koperasiQuery = koperasiQuery.gte('tanggal', dateRange.startDate.toISOString());
        koperasiQuery = koperasiQuery.lte('tanggal', dateRange.endDate.toISOString());
      }
      
      const { data: dataKoperasi, error: errorKoperasi } = await koperasiQuery.order('tanggal', { ascending: false });

      if (errorKoperasi) throw errorKoperasi;
      
      // 3. Gabungkan data dari kedua tabel (sama seperti di KeuanganUnifiedPage)
      // Prioritaskan keuangan_koperasi untuk deduplication
      const transactionMap = new Map();
      
      // Masukkan dari keuangan_koperasi dulu
      (dataKoperasi || []).forEach((item: any) => {
        transactionMap.set(item.id, item);
      });
      
      // Tambahkan dari keuangan hanya jika ID belum ada
      (dataKeuangan || []).forEach((item: any) => {
        if (!transactionMap.has(item.id)) {
          transactionMap.set(item.id, item);
        }
      });
      
      // Convert map back to array
      const allData = Array.from(transactionMap.values());
      
      // Filter out kewajiban/hutang ke yayasan DAN transfer ke yayasan
      // Cost operasional hanya pengeluaran operasional biasa, BUKAN kewajiban pembayaran ke yayasan
      // BUKAN juga transfer ke yayasan (transfer laba/rugi)
      // Kewajiban ke yayasan hanya muncul saat "Simpan Keputusan" di mode "Atur HPP"
      const filtered = allData.filter(item => {
        const kategori = (item.kategori || '').toLowerCase();
        const subKategori = (item.sub_kategori || '').toLowerCase();
        const deskripsi = (item.deskripsi || '').toLowerCase();
        
        // EXCLUDE transfer ke yayasan (transfer laba/rugi)
        // Transfer ke yayasan BUKAN cost operasional, melainkan distribusi laba/rugi
        const isTransferYayasan = 
          kategori === 'transfer ke yayasan' ||
          subKategori === 'transfer ke yayasan' ||
          subKategori === 'laba/rugi bulanan' ||
          deskripsi.includes('transfer ke yayasan') ||
          deskripsi.includes('transfer laba/rugi') ||
          deskripsi.includes('transfer ke bank operasional umum');
        
        if (isTransferYayasan) {
          return false; // Exclude transfer ke yayasan
        }
        
        // EXCLUDE semua yang terkait kewajiban/hutang ke yayasan
        // Termasuk variasi: "Kewajiban", "Hutang ke Yayasan", "Kewajiban Penjualan", dll
        const isKewajiban = 
          kategori === 'kewajiban' ||
          kategori === 'hutang ke yayasan' ||
          kategori.includes('kewajiban') ||
          kategori.includes('hutang') ||
          subKategori === 'kewajiban penjualan inventaris yayasan' ||
          subKategori === 'pembayaran omset penjualan inventaris yayasan' ||
          subKategori.includes('kewajiban') ||
          subKategori.includes('hutang') ||
          deskripsi.includes('kewajiban penjualan') ||
          deskripsi.includes('kewajiban:') ||
          deskripsi.includes('hutang ke yayasan') ||
          deskripsi.includes('pembayaran omset penjualan inventaris yayasan') ||
          deskripsi.includes('pembayaran omset');
        
        return !isKewajiban;
      });
      
      return filtered;
    },
    enabled: !!kasKoperasiId,
  });

  // Fetch sold items (items that have been sold via koperasi)
  // Mengambil data penjualan hanya dari kop_penjualan (modul penjualan koperasi)
  // Semua data penjualan sudah terpusat di kop_penjualan setelah migrasi
  // Menggunakan hpp_snapshot, margin, bagian_yayasan, dan bagian_koperasi dari kop_penjualan_detail
  // Data ini HARUS sama dengan yang ada di modul penjualan untuk konsistensi
  const { data: soldItems = [], isLoading: isLoadingSold } = useQuery({
    queryKey: ['inventaris-sold-items', getDateRangeForBagiHasil().startDate, getDateRangeForBagiHasil().endDate],
    queryFn: async () => {
      const dateRange = getDateRangeForBagiHasil();
      
      // Hanya mengambil data dari kop_penjualan (modul penjualan koperasi)
      // Semua data penjualan sudah terpusat di kop_penjualan setelah migrasi
      // Mengambil SEMUA owner_type (yayasan dan koperasi), filter akan dilakukan di UI
      let kopPenjualanQuery = supabase
        .from('kop_penjualan')
        .select(`
          id,
          tanggal,
          total_transaksi,
          status_pembayaran,
          kop_penjualan_detail(
            id,
            barang_id,
            jumlah,
            harga_satuan_jual,
            subtotal,
            hpp_snapshot,
            margin,
            bagian_yayasan,
            bagian_koperasi,
            barang_nama_snapshot,
            barang_kode_snapshot,
            barang_owner_type_snapshot,
            barang_bagi_hasil_snapshot,
            barang_kategori_snapshot,
            kop_barang(
              id,
              nama_barang,
              kode_barang,
              owner_type,
              bagi_hasil_yayasan,
              kategori_id,
              kop_kategori:kategori_id(
                nama
              )
            )
          )
        `)
        // PERUBAHAN: Ambil SEMUA penjualan (lunas, hutang, cicilan) karena barang sudah terjual
        // Status pembayaran tidak mempengaruhi apakah penjualan masuk ke kalkulator HPP
        // Barang sudah keluar dari stok, jadi harus dihitung di HPP
        .in('status_pembayaran', ['lunas', 'hutang', 'cicilan']);
      
      // Apply date filter (skip if 'semua')
      if (dateFilter !== 'semua') {
        kopPenjualanQuery = kopPenjualanQuery.gte('tanggal', dateRange.startDate.toISOString());
        kopPenjualanQuery = kopPenjualanQuery.lte('tanggal', dateRange.endDate.toISOString());
      }
      
      const { data: kopPenjualan, error: kopError } = await kopPenjualanQuery.order('tanggal', { ascending: false });

      if (kopError) {
        throw new Error(`Gagal memuat data penjualan: ${kopError.message}`);
      }
      
      // Process semua penjualan (yayasan dan koperasi)
      // AMBIL SEMUA BARANG (baik yang punya inventaris_id maupun tidak)
      // Karena ada barang koperasi yang tidak punya inventaris_id
      const filteredKopPenjualan: any[] = [];
      (kopPenjualan || []).forEach((penjualan: any) => {
        (penjualan.kop_penjualan_detail || []).forEach((detail: any) => {
          const kopBarang = detail.kop_barang;
          
          // PERUBAHAN: Gunakan snapshot jika kop_barang NULL (barang sudah dihapus)
          // Dengan denormalisasi, history tetap lengkap meski barang dihapus
          const namaBarang = kopBarang?.nama_barang || detail.barang_nama_snapshot || 'Barang Dihapus';
          const kodeBarang = kopBarang?.kode_barang || detail.barang_kode_snapshot || null;
          const ownerType = kopBarang?.owner_type || detail.barang_owner_type_snapshot || 'koperasi';
          const kategori = kopBarang?.kop_kategori?.nama || detail.barang_kategori_snapshot || 'Koperasi';
          const barangId = kopBarang?.id || detail.barang_id; // Gunakan barang_id dari detail jika kop_barang NULL
          
          // Skip jika tidak ada identifier sama sekali (tidak seharusnya terjadi)
          if (!barangId && !detail.barang_id) {
            console.warn('Penjualan detail tanpa barang_id:', detail);
            return;
          }
          
          filteredKopPenjualan.push({
            source: 'kop_penjualan',
            penjualan_id: penjualan.id,
            tanggal: penjualan.tanggal,
            barang_id: barangId || detail.barang_id, // Identifier utama
            item_id: barangId || detail.barang_id, // Gunakan barang_id (bisa NULL jika barang dihapus)
            jumlah: detail.jumlah,
            harga_satuan: detail.harga_satuan_jual,
            harga_total: detail.subtotal,
            hpp_snapshot: detail.hpp_snapshot,
            margin: detail.margin,
            bagian_yayasan: detail.bagian_yayasan,
            bagian_koperasi: detail.bagian_koperasi,
            kode_barang: kodeBarang, // Dari kop_barang atau snapshot
            owner_type: ownerType, // Dari kop_barang atau snapshot
            nama_barang: namaBarang, // Dari kop_barang atau snapshot (history tetap lengkap)
            kategori: kategori, // Dari kop_kategori atau snapshot
          });
        });
      });

      // Semua transaksi sekarang hanya dari kop_penjualan
      const allTransactions = filteredKopPenjualan;

      // Group by barang_id (kop_barang.id) untuk memastikan semua barang terhitung
      // PERUBAHAN: Handle barang yang sudah dihapus (barang_id bisa NULL, gunakan snapshot)
      const grouped = allTransactions.reduce((acc: Record<string, SoldItem>, tx: any) => {
        // Gunakan barang_id sebagai key untuk grouping
        // Jika barang_id NULL (barang sudah dihapus), gunakan kombinasi nama+kode dari snapshot
        const groupKey = tx.barang_id || `deleted_${tx.kode_barang || tx.nama_barang || 'unknown'}`;

        if (!acc[groupKey]) {
          acc[groupKey] = {
            item_id: tx.barang_id, // Gunakan barang_id sebagai item_id untuk konsistensi
            nama_barang: tx.nama_barang || 'Unknown', // Dari kop_barang langsung
            kode_inventaris: null, // DIHAPUS - tidak ada lagi referensi ke inventaris
            kode_barang: tx.kode_barang || null, // YYS-#### atau KOP-####
            owner_type: tx.owner_type || 'koperasi', // 'yayasan' atau 'koperasi'
            kategori: tx.kategori || 'Koperasi', // Dari kop_kategori atau default
            total_terjual: 0,
            total_nilai: 0,
            // Gunakan hpp_snapshot dari kop_penjualan_detail (snapshot saat penjualan)
            hpp_yayasan: tx.hpp_snapshot || null,
            harga_perolehan: null, // DIHAPUS - tidak ada lagi referensi ke inventaris
            tanggal_penjualan_terakhir: null,
          };
        }

        // Akumulasi jumlah terjual
        acc[groupKey].total_terjual += tx.jumlah || 0;
        
        // Akumulasi nilai penjualan (subtotal dari kop_penjualan_detail)
        const nilaiTransaksi = tx.harga_total || ((tx.harga_satuan || 0) * (tx.jumlah || 0));
        acc[groupKey].total_nilai += nilaiTransaksi;
        
        // Update HPP dengan hpp_snapshot dari kop_penjualan_detail jika ada
        // hpp_snapshot adalah nilai HPP yang digunakan saat transaksi penjualan
        if (tx.hpp_snapshot && tx.hpp_snapshot > 0) {
          // Gunakan hpp_snapshot yang paling baru (terakhir)
          if (!acc[groupKey].hpp_yayasan || tx.hpp_snapshot > 0) {
            acc[groupKey].hpp_yayasan = tx.hpp_snapshot;
          }
        }
        
        // Update tanggal penjualan terakhir
        if (!acc[groupKey].tanggal_penjualan_terakhir || 
            new Date(tx.tanggal) > new Date(acc[groupKey].tanggal_penjualan_terakhir || '')) {
          acc[groupKey].tanggal_penjualan_terakhir = tx.tanggal;
        }

        return acc;
      }, {});

      return Object.values(grouped);
    },
  });

  // Fetch categories
  const { data: categories = [] } = useQuery({
    queryKey: ['inventaris-kategori'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('inventaris')
        .select('kategori')
        .not('kategori', 'is', null);

      if (error) throw error;

      // Filter out null, undefined, and empty string categories
      const uniqueCategories = Array.from(
        new Set(
          (data || [])
            .map(item => item.kategori)
            .filter(cat => cat && cat.trim() !== '') // Filter out empty strings
        )
      );
      return uniqueCategories.sort();
    },
  });

  // Update HPP mutation
  const updateHppMutation = useMutation({
    mutationFn: async ({ itemId, hpp }: { itemId: string; hpp: number }) => {
      const { data: user } = await supabase.auth.getUser();
      
      const { error } = await supabase
        .from('inventaris')
        .update({
          hpp_yayasan: hpp,
          updated_by: user.user?.id,
          updated_at: new Date().toISOString(),
        })
        .eq('id', itemId);

      if (error) throw error;
    },
    onSuccess: () => {
      toast.success('HPP berhasil diperbarui');
      queryClient.invalidateQueries({ queryKey: ['inventaris-komoditas'] });
      queryClient.invalidateQueries({ queryKey: ['inventaris-sold-items'] });
      setShowHPPDialog(false);
      setEditingItem(null);
      setHppValue('');
    },
    onError: (error: any) => {
      toast.error(error.message || 'Gagal memperbarui HPP');
    },
  });

  const handleEditHPP = async (item: InventoryItem) => {
    // Fetch full item data from database to ensure we have latest HPP
    try {
      const { data: fullItem, error } = await supabase
        .from('inventaris')
        .select('*')
        .eq('id', item.id)
        .single();

      if (error) {
        // Fallback to provided item if fetch fails
        setEditingItem(item);
      } else {
        setEditingItem(fullItem as InventoryItem);
        // Gunakan pending HPP jika ada, jika tidak gunakan HPP dari database
        const currentHpp = pendingHppChanges[fullItem.id] ?? fullItem.hpp_yayasan ?? fullItem.harga_perolehan ?? 0;
        setHppValue(currentHpp.toString());
        setShowHPPDialog(true);
        return;
      }
    } catch (error) {
      // Fallback to provided item
      const errorMessage = error instanceof Error ? error.message : 'Gagal memuat data item';
      toast.error(errorMessage);
      setEditingItem(item);
    }

    // Fallback: use provided item data
    const currentHpp = pendingHppChanges[item.id] ?? item.hpp_yayasan ?? item.harga_perolehan ?? 0;
    setHppValue(currentHpp.toString());
    setShowHPPDialog(true);
  };

  const handleSaveHPP = () => {
    if (!editingItem) return;

    const hpp = parseFloat(hppValue);
    if (isNaN(hpp) || hpp < 0) {
      toast.error('HPP harus berupa angka positif');
      return;
    }

    // Simpan ke pendingHppChanges (tidak langsung ke database)
    setPendingHppChanges(prev => ({
      ...prev,
      [editingItem.id]: hpp
    }));

    toast.success('HPP berhasil diatur (akan disimpan saat simpan keputusan)');
    setShowHPPDialog(false);
    setEditingItem(null);
    setHppValue('');
    
    // Refresh soldItems untuk update display
    queryClient.invalidateQueries({ queryKey: ['inventaris-sold-items'] });
  };

  const formatCurrency = (amount: number | null | undefined) => {
    if (amount === null || amount === undefined) return '-';
    return new Intl.NumberFormat('id-ID', {
      style: 'currency',
      currency: 'IDR',
      minimumFractionDigits: 0,
    }).format(amount);
  };

  // Logic Kalkulasi
  const calculateResults = () => {
    // Filter selected items
    const selectedItems: SoldItem[] = (soldItems as SoldItem[]).filter((item: SoldItem) => selectedItemIds.has(item.item_id));
    
    // Calculate total penjualan (omset)
    const totalPenjualan = selectedItems.reduce((sum, item) => sum + (item.total_nilai || 0), 0);
    
    // Calculate total cost operasional
    const selectedCosts = costOperasional.filter((cost: any) => selectedCostOperasionalIds.has(cost.id));
    const totalCostOperasional = selectedCosts.reduce((sum, cost: any) => sum + (cost.jumlah || 0), 0);
    
    if (calculationMode === 'akumulatif') {
      // Mode Akumulatif: Langsung bagi hasil dari omset - cost operasional
      const labaRugiBersih = totalPenjualan - totalCostOperasional;
      const bagianYayasan = (labaRugiBersih * bagiHasilYayasan) / 100;
      const bagianKoperasi = (labaRugiBersih * bagiHasilKoperasi) / 100;
      
      return {
        totalPenjualan,
        totalHPP: 0, // Tidak ada HPP di mode akumulatif
        totalMargin: totalPenjualan, // Margin = omset (karena HPP = 0)
        totalCostOperasional,
        labaRugiBersih,
        bagianYayasan,
        bagianKoperasi,
      };
    } else {
      // Mode Atur HPP: Gunakan HPP per item (dari pendingHppChanges atau database)
      // Tidak ada bagi hasil - margin langsung menjadi laba koperasi
      const totalHPP = selectedItems.reduce((sum, item: SoldItem) => {
        // Gunakan pending HPP jika ada, jika tidak gunakan HPP dari database
        const hpp = pendingHppChanges[item.item_id] ?? item.hpp_yayasan ?? 0;
        const qty = item.total_terjual || 0;
        return sum + (hpp * qty);
      }, 0);
      
      // Calculate margin
      const totalMargin = totalPenjualan - totalHPP;
      
      // Calculate laba/rugi bersih (margin - cost operasional)
      // Laba bersih ini langsung menjadi bagian koperasi (tidak perlu bagi hasil)
      const labaRugiBersih = totalMargin - totalCostOperasional;
      
      return {
        totalPenjualan,
        totalHPP,
        totalMargin,
        totalCostOperasional,
        labaRugiBersih,
        bagianYayasan: 0, // Tidak ada bagi hasil di mode atur HPP
        bagianKoperasi: labaRugiBersih, // Laba bersih langsung menjadi bagian koperasi
      };
    }
  };

  const calculationResults = calculateResults();

  // Handler untuk checkbox item
  const handleToggleItem = (itemId: string) => {
    setSelectedItemIds(prev => {
      const newSet = new Set(prev);
      if (newSet.has(itemId)) {
        newSet.delete(itemId);
      } else {
        newSet.add(itemId);
      }
      return newSet;
    });
  };

  const handleSelectAllItems = () => {
    if (selectedItemIds.size === soldItems.length) {
      setSelectedItemIds(new Set());
    } else {
      setSelectedItemIds(new Set((soldItems as SoldItem[]).map((item: SoldItem) => item.item_id)));
    }
  };

  // Handler untuk checkbox cost operasional
  const handleToggleCost = (costId: string) => {
    setSelectedCostOperasionalIds(prev => {
      const newSet = new Set(prev);
      if (newSet.has(costId)) {
        newSet.delete(costId);
      } else {
        newSet.add(costId);
      }
      return newSet;
    });
  };

  const handleSelectAllCosts = () => {
    if (selectedCostOperasionalIds.size === costOperasional.length) {
      setSelectedCostOperasionalIds(new Set());
    } else {
      setSelectedCostOperasionalIds(new Set(costOperasional.map(cost => cost.id)));
    }
  };

  // Handler untuk simpan keputusan
  const handleSaveDecision = async () => {
    if (selectedItemIds.size === 0) {
      toast.error('Pilih minimal satu item terjual');
      return;
    }

    // Validasi bagi hasil hanya untuk mode akumulatif
    if (calculationMode === 'akumulatif' && bagiHasilYayasan + bagiHasilKoperasi !== 100) {
      toast.error('Total bagi hasil harus 100%');
      return;
    }

    setIsSavingDecision(true);
    try {
      const results = calculationResults;
      const dateRange = getDateRangeForBagiHasil();
      const { data: user } = await supabase.auth.getUser();

      // Generate entry keuangan berdasarkan mode dan hasil kalkulasi
      if (calculationMode === 'akumulatif') {
        // Mode Akumulatif: Langsung bagi hasil dari omset - cost operasional
        if (results.labaRugiBersih > 0) {
          // Ada laba -> Pemasukan untuk koperasi
          await addKeuanganKoperasiTransaction({
            jenis_transaksi: 'Pemasukan',
            kategori: 'Bagi Hasil',
            sub_kategori: 'Bagi Hasil Penjualan Inventaris Yayasan (Akumulatif)',
            jumlah: Number(results.bagianKoperasi),
            tanggal: new Date().toISOString().split('T')[0],
            deskripsi: `Bagi Hasil Koperasi dari Penjualan Inventaris Yayasan - Mode Akumulatif (${format(new Date(dateRange.startDate), 'd MMM yyyy', { locale: localeId })} - ${format(new Date(dateRange.endDate), 'd MMM yyyy', { locale: localeId })})`,
            akun_kas_id: kasKoperasiId,
            referensi: `bagi-hasil-akumulatif:${Date.now()}`,
          });

          // Kewajiban ke yayasan (bagian yayasan)
          await addKeuanganKoperasiTransaction({
            jenis_transaksi: 'Pengeluaran',
            kategori: 'Kewajiban',
            sub_kategori: 'Bagi Hasil Yayasan (Akumulatif)',
            jumlah: Number(results.bagianYayasan),
            tanggal: new Date().toISOString().split('T')[0],
            deskripsi: `Bagi Hasil Yayasan dari Penjualan Inventaris Yayasan - Mode Akumulatif (${format(new Date(dateRange.startDate), 'd MMM yyyy', { locale: localeId })} - ${format(new Date(dateRange.endDate), 'd MMM yyyy', { locale: localeId })})`,
            akun_kas_id: kasKoperasiId,
            referensi: `bagi-hasil-akumulatif:${Date.now()}`,
          });
        } else {
          // Tidak ada laba -> Semua omset jadi kewajiban ke yayasan
          await addKeuanganKoperasiTransaction({
            jenis_transaksi: 'Pengeluaran',
            kategori: 'Kewajiban',
            sub_kategori: 'Pembayaran Omset Penjualan Inventaris Yayasan (Akumulatif)',
            jumlah: results.totalPenjualan,
            tanggal: new Date().toISOString().split('T')[0],
            deskripsi: `Pembayaran Omset Penjualan Inventaris Yayasan - Mode Akumulatif, Tidak ada laba (${format(new Date(dateRange.startDate), 'd MMM yyyy', { locale: localeId })} - ${format(new Date(dateRange.endDate), 'd MMM yyyy', { locale: localeId })})`,
            akun_kas_id: kasKoperasiId,
            referensi: `bagi-hasil-akumulatif:${Date.now()}`,
          });
        }
      } else {
        // Mode Atur HPP: Tidak ada bagi hasil, margin langsung menjadi laba koperasi
        if (results.labaRugiBersih > 0) {
          // Ada margin/laba -> Pemasukan untuk koperasi (margin - cost operasional)
          await addKeuanganKoperasiTransaction({
            jenis_transaksi: 'Pemasukan',
            kategori: 'Jasa Pengelolaan',
            sub_kategori: 'Jasa Pengelolaan Inventaris Yayasan',
            jumlah: Number(results.labaRugiBersih), // Langsung laba bersih, tidak ada bagi hasil
            tanggal: new Date().toISOString().split('T')[0],
            deskripsi: `Jasa Pengelolaan Inventaris Yayasan - Margin dikurangi cost operasional (${format(new Date(dateRange.startDate), 'd MMM yyyy', { locale: localeId })} - ${format(new Date(dateRange.endDate), 'd MMM yyyy', { locale: localeId })})`,
            akun_kas_id: kasKoperasiId,
            referensi: `hpp-kalkulator:${Date.now()}`,
          });

          // Kewajiban ke yayasan (HPP saja, karena margin sudah jadi laba koperasi)
          await addKeuanganKoperasiTransaction({
            jenis_transaksi: 'Pengeluaran',
            kategori: 'Hutang ke Yayasan',
            sub_kategori: 'Kewajiban Penjualan Inventaris Yayasan (HPP)',
            jumlah: Number(results.totalHPP),
            tanggal: new Date().toISOString().split('T')[0],
            deskripsi: `Kewajiban Penjualan Inventaris Yayasan - HPP yang harus dibayar (${format(new Date(dateRange.startDate), 'd MMM yyyy', { locale: localeId })} - ${format(new Date(dateRange.endDate), 'd MMM yyyy', { locale: localeId })})`,
            akun_kas_id: kasKoperasiId,
            referensi: `hpp-kalkulator:${Date.now()}`,
          });
        } else {
          // Tidak ada margin atau rugi -> Pengeluaran untuk pembayaran omset
          await addKeuanganKoperasiTransaction({
            jenis_transaksi: 'Pengeluaran',
            kategori: 'Hutang ke Yayasan',
            sub_kategori: 'Pembayaran Omset Penjualan Inventaris Yayasan',
            jumlah: results.totalPenjualan,
            tanggal: new Date().toISOString().split('T')[0],
            deskripsi: `Pembayaran Omset Penjualan Inventaris Yayasan - Tidak ada margin (${format(new Date(dateRange.startDate), 'd MMM yyyy', { locale: localeId })} - ${format(new Date(dateRange.endDate), 'd MMM yyyy', { locale: localeId })})`,
            akun_kas_id: kasKoperasiId,
            referensi: `hpp-kalkulator:${Date.now()}`,
          });
        }
      }

      // Jika mode atur-hpp, simpan HPP ke database
      if (calculationMode === 'atur-hpp' && Object.keys(pendingHppChanges).length > 0) {
        const { data: user } = await supabase.auth.getUser();
        
        // Update HPP untuk semua item yang ada di pendingHppChanges
        for (const [itemId, hpp] of Object.entries(pendingHppChanges)) {
          await supabase
            .from('inventaris')
            .update({
              hpp_yayasan: hpp,
              updated_by: user.user?.id,
              updated_at: new Date().toISOString(),
            })
            .eq('id', itemId);
        }
      }

      // Simpan log bagi hasil
      await supabase.from('koperasi_bagi_hasil_log').insert({
        periode_start: dateRange.startDate.toISOString(),
        periode_end: dateRange.endDate.toISOString(),
        total_penjualan: results.totalPenjualan,
        total_hpp: results.totalHPP,
        total_margin: results.totalMargin,
        cost_operasional: results.totalCostOperasional,
        laba_bersih: results.labaRugiBersih,
        bagi_hasil_yayasan: calculationMode === 'akumulatif' ? results.bagianYayasan : 0,
        bagi_hasil_koperasi: calculationMode === 'akumulatif' ? results.bagianKoperasi : results.labaRugiBersih,
        skema_yayasan: calculationMode === 'akumulatif' ? bagiHasilYayasan : 0,
        skema_koperasi: calculationMode === 'akumulatif' ? bagiHasilKoperasi : 100,
        mode_kalkulasi: calculationMode,
        status: 'processed',
        created_by: user.user?.id,
      });

      toast.success('Keputusan berhasil disimpan dan entry keuangan telah dibuat');
      
      // Reset selections dan pending changes
      setSelectedItemIds(new Set());
      setSelectedCostOperasionalIds(new Set());
      setPendingHppChanges({});
      
      // Refresh data
      queryClient.invalidateQueries({ queryKey: ['koperasi-cost-operasional'] });
      queryClient.invalidateQueries({ queryKey: ['inventaris-sold-items'] });
      queryClient.invalidateQueries({ queryKey: ['koperasi-bagi-hasil'] });
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Gagal menyimpan keputusan';
      toast.error(errorMessage);
    } finally {
      setIsSavingDecision(false);
    }
  };


  const loadBagiHasilData = async () => {
    try {
      const { data: kasKoperasi, error: kasError } = await supabase
        .from('akun_kas')
        .select('id, nama, saldo_saat_ini')
        .eq('nama', 'Kas Koperasi')
        .eq('status', 'aktif')
        .single();

      if (kasError) {
        toast.error('Akun Kas Koperasi tidak ditemukan');
        return;
      }

      setKasKoperasiId(kasKoperasi.id);
      await Promise.all([
        loadTransactionsWithFilter(kasKoperasi.id),
        loadMonthlySummaries()
      ]);
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Gagal memuat data bagi hasil';
      toast.error(errorMessage);
    }
  };

  const loadMonthlySummaries = async () => {
    try {
      const { data, error } = await supabase
        .from('koperasi_bagi_hasil_log')
        .select('*')
        .limit(12);

      if (error) throw error;

      // Transform data to match MonthlySummary interface
      const transformedData: MonthlySummary[] = (data || []).map((item: any) => ({
        id: item.id,
        bulan: item.bulan || new Date(item.periode_start || new Date()).getMonth() + 1,
        tahun: item.tahun || new Date(item.periode_start || new Date()).getFullYear(),
        total_penjualan: Number(item.total_penjualan || 0),
        bagian_yayasan: Number(item.bagi_hasil_yayasan || 0),
        bagian_koperasi: Number(item.bagi_hasil_koperasi || 0),
        status: item.status === 'paid' || item.tanggal_bayar ? 'paid' : 'unpaid',
        tanggal_bayar: item.tanggal_bayar || null,
        created_at: item.created_at || new Date().toISOString(),
      }));

      const sortedData = transformedData.sort((a, b) => {
        if (a.tahun !== b.tahun) {
          return b.tahun - a.tahun;
        }
        return b.bulan - a.bulan;
      });

      setMonthlySummaries(sortedData);
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Gagal memuat ringkasan bulanan';
      toast.error(errorMessage);
    }
  };

  const loadTransactionsWithFilter = async (accountId?: string) => {
    try {
      const akunId = accountId || kasKoperasiId;
      if (!akunId) return;

      const { startDate, endDate } = getDateRangeForBagiHasil();

      let txQuery = supabase
        .from('keuangan_koperasi')
        .select(`
          *,
          akun_kas:akun_kas_id(nama, saldo_saat_ini)
        `)
        .eq('akun_kas_id', akunId)
        .eq('kategori', 'Bagi Hasil');
      
      // Apply date filter (skip if 'semua')
      if (dateFilter !== 'semua') {
        txQuery = txQuery.gte('tanggal', startDate.toISOString());
        txQuery = txQuery.lte('tanggal', endDate.toISOString());
      }
      
      const { data: txData, error: txError } = await txQuery
        .order('tanggal', { ascending: false })
        .order('created_at', { ascending: false });

      if (txError) throw txError;

      const transformedTx = (txData || []).map(tx => ({
        ...tx,
        akun_kas_nama: tx.akun_kas?.nama || 'Kas Koperasi',
        display_category: tx.kategori || 'Bagi Hasil',
        source_type: tx.sub_kategori || tx.kategori || 'Manual',
        display_description: tx.deskripsi || 'Bagi Hasil'
      }));

      setTransactions(transformedTx);
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Gagal memuat data transaksi';
      toast.error(errorMessage);
    }
  };

  const handlePaymentClick = (summary: MonthlySummary) => {
    setSelectedSummary(summary);
    setShowPaymentDialog(true);
  };

  const handleConfirmPayment = async () => {
    if (!selectedSummary) return;

    try {
      setProcessingPayment(true);

      const { data, error } = await supabase.rpc('process_payment_to_yayasan', {
        p_bulan: selectedSummary.bulan,
        p_tahun: selectedSummary.tahun
      });

      if (error) throw error;

      toast.success('Pembayaran berhasil diproses');
      
      await Promise.all([
        loadMonthlySummaries(),
        loadTransactionsWithFilter()
      ]);

      setShowPaymentDialog(false);
      setSelectedSummary(null);
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Gagal memproses pembayaran';
      toast.error(errorMessage);
    } finally {
      setProcessingPayment(false);
    }
  };

  const getMonthName = (month: number) => {
    const months = [
      'Januari', 'Februari', 'Maret', 'April', 'Mei', 'Juni',
      'Juli', 'Agustus', 'September', 'Oktober', 'November', 'Desember'
    ];
    return months[month - 1];
  };

  const formatCurrencyBagiHasil = (amount: number) => {
    return new Intl.NumberFormat('id-ID', {
      style: 'currency',
      currency: 'IDR',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0
    }).format(amount);
  };

  const getFilterLabel = () => {
    const { startDate, endDate } = getDateRangeForBagiHasil();
    return `Periode: ${format(startDate, 'd MMMM yyyy', { locale: localeId })} - ${format(endDate, 'd MMMM yyyy', { locale: localeId })}`;
  };

  const handleViewTransaction = (transaction: any) => {
    setSelectedTransaction(transaction);
    setShowTransactionDetail(true);
  };

  // Load bagi hasil data when tab is active
  useEffect(() => {
    if (activeTab === 'riwayat') {
      loadBagiHasilData();
    }
  }, [activeTab, dateFilter]);

  return (
    <div className="space-y-6 p-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Kalkulator HPP & Bagi Hasil</h1>
          <p className="text-gray-500 mt-1 text-sm">
            Atur HPP dan bagi hasil penjualan inventaris yayasan
          </p>
        </div>
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">
        <TabsList className="grid w-full grid-cols-2">
          <TabsTrigger value="kalkulator" className="flex items-center gap-2">
            <Calculator className="h-4 w-4" />
            Kalkulator
          </TabsTrigger>
          <TabsTrigger value="riwayat" className="flex items-center gap-2">
            <History className="h-4 w-4" />
            Riwayat
          </TabsTrigger>
        </TabsList>

        {/* Tab: Kalkulator (FITUR UTAMA - Semua fitur di sini) */}
        <TabsContent value="kalkulator" className="space-y-4">
          {/* Section 1: Mode Kalkulasi & Filter Periode */}
          <Card>
            <CardHeader className="pb-3">
              <div className="flex items-center justify-between">
                <CardTitle className="text-lg">Mode Kalkulasi</CardTitle>
                <Select value={dateFilter} onValueChange={setDateFilter}>
                  <SelectTrigger className="w-[180px] h-9">
                    <Calendar className="h-4 w-4 mr-2" />
                    <SelectValue placeholder="Periode" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="semua">Semua Waktu</SelectItem>
                    <SelectItem value="hari-ini">Hari Ini</SelectItem>
                    <SelectItem value="minggu-ini">Minggu Ini</SelectItem>
                    <SelectItem value="bulan-ini">Bulan Ini</SelectItem>
                    <SelectItem value="bulan-lalu">Bulan Lalu</SelectItem>
                    <SelectItem value="tahun-ini">Tahun Ini</SelectItem>
                    <SelectItem value="tahun-lalu">Tahun Lalu</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </CardHeader>
            <CardContent>
              <RadioGroup value={calculationMode} onValueChange={(value: 'atur-hpp' | 'akumulatif') => setCalculationMode(value)} className="space-y-2">
                <div className="flex items-start space-x-3 p-3 border rounded-lg hover:bg-gray-50/50 transition-colors cursor-pointer">
                  <RadioGroupItem value="atur-hpp" id="mode-atur-hpp" className="mt-1" />
                  <Label htmlFor="mode-atur-hpp" className="flex-1 cursor-pointer">
                    <p className="font-semibold text-sm">Atur HPP per Item</p>
                    <p className="text-xs text-gray-500 mt-0.5">Model kulakan - margin langsung jadi laba koperasi</p>
                  </Label>
                </div>
                <div className="flex items-start space-x-3 p-3 border rounded-lg hover:bg-gray-50/50 transition-colors cursor-pointer">
                  <RadioGroupItem value="akumulatif" id="mode-akumulatif" className="mt-1" />
                  <Label htmlFor="mode-akumulatif" className="flex-1 cursor-pointer">
                    <p className="font-semibold text-sm">Bagi Hasil Akumulatif</p>
                    <p className="text-xs text-gray-500 mt-0.5">Tanpa HPP - langsung bagi hasil dari laba/rugi</p>
                  </Label>
                </div>
              </RadioGroup>
            </CardContent>
          </Card>

          {/* Section 2: Daftar Item Terjual */}
          <Card>
            <CardHeader className="pb-3">
              <div className="flex items-center justify-between">
                <CardTitle className="text-lg">Item Terjual</CardTitle>
                <div className="flex items-center gap-2">
                  <Input
                    placeholder="Cari item..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="w-48 h-9"
                  />
                  <Select value={filterKategori} onValueChange={setFilterKategori}>
                    <SelectTrigger className="w-40 h-9">
                      <SelectValue placeholder="Kategori" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">Semua Kategori</SelectItem>
                      {categories
                        .filter(cat => cat && cat.trim() !== '') // Additional safety filter
                        .map((cat) => (
                          <SelectItem key={cat} value={cat}>
                            {cat}
                          </SelectItem>
                        ))}
                    </SelectContent>
                  </Select>
                  <Select value={filterOwnerType} onValueChange={(value: 'all' | 'yayasan' | 'koperasi') => setFilterOwnerType(value)}>
                    <SelectTrigger className="w-40 h-9">
                      <SelectValue placeholder="Owner Type" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">Semua Owner</SelectItem>
                      <SelectItem value="yayasan">Yayasan (YYS)</SelectItem>
                      <SelectItem value="koperasi">Koperasi (KOP)</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
            </CardHeader>
            <CardContent>
              {/* Summary Card untuk Item Terpilih */}
              {selectedItemIds.size > 0 && (
                <div className="mb-4 p-4 bg-blue-50 rounded-lg border border-blue-200">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-6">
                      <div>
                        <p className="text-sm text-gray-600">Item Terpilih</p>
                        <p className="text-2xl font-bold text-blue-600">{selectedItemIds.size} item</p>
                      </div>
                      <div>
                        <p className="text-sm text-gray-600">Total Omset Terpilih</p>
                        <p className="text-2xl font-bold text-blue-600">
                          {formatCurrency(
                            (soldItems as SoldItem[])
                              .filter((item: SoldItem) => selectedItemIds.has(item.item_id))
                              .reduce((sum: number, item: SoldItem) => sum + (item.total_nilai || 0), 0)
                          )}
                        </p>
                      </div>
                    </div>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setSelectedItemIds(new Set())}
                    >
                      Batal Pilih Semua
                    </Button>
                  </div>
                </div>
              )}

              {isLoadingSold ? (
                <div className="text-center py-12">
                  <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-gray-900 mx-auto"></div>
                  <p className="text-sm text-gray-500 mt-2">Memuat data...</p>
                </div>
              ) : soldItems.length === 0 ? (
                <div className="text-center py-12 text-gray-500">
                  <Package className="h-12 w-12 mx-auto mb-3 opacity-50" />
                  <p className="font-medium">Belum ada item terjual</p>
                  <p className="text-sm mt-1">Periode: {format(new Date(getDateRangeForBagiHasil().startDate), 'd MMM yyyy', { locale: localeId })} - {format(new Date(getDateRangeForBagiHasil().endDate), 'd MMM yyyy', { locale: localeId })}</p>
                </div>
              ) : (() => {
                // Filter soldItems berdasarkan searchTerm, filterKategori, dan filterOwnerType
                const filteredSoldItems = (soldItems as SoldItem[]).filter((item: SoldItem) => {
                  const matchesSearch = !searchTerm || 
                    item.nama_barang.toLowerCase().includes(searchTerm.toLowerCase()) ||
                    (item.kode_inventaris && item.kode_inventaris.toLowerCase().includes(searchTerm.toLowerCase())) ||
                    (item.kode_barang && item.kode_barang.toLowerCase().includes(searchTerm.toLowerCase()));
                  const matchesCategory = filterKategori === 'all' || item.kategori === filterKategori;
                  const matchesOwnerType = filterOwnerType === 'all' || item.owner_type === filterOwnerType;
                  return matchesSearch && matchesCategory && matchesOwnerType;
                }) as SoldItem[];

                return (
                  <div className="space-y-4">
                    {/* Header dengan Select All */}
                    <div className="flex items-center gap-3 p-3 bg-gray-50 rounded-lg border">
                      <Checkbox
                        checked={filteredSoldItems.length > 0 && filteredSoldItems.every(item => selectedItemIds.has(item.item_id))}
                        onCheckedChange={(checked) => {
                          if (checked) {
                            filteredSoldItems.forEach(item => {
                              if (!selectedItemIds.has(item.item_id)) {
                                handleToggleItem(item.item_id);
                              }
                            });
                          } else {
                            filteredSoldItems.forEach(item => {
                              if (selectedItemIds.has(item.item_id)) {
                                handleToggleItem(item.item_id);
                              }
                            });
                          }
                        }}
                      />
                      <span className="text-sm font-medium text-gray-700">
                        {(() => {
                          const selectedCount = filteredSoldItems.filter(item => selectedItemIds.has(item.item_id)).length;
                          return selectedCount > 0 
                            ? `${selectedCount} dari ${filteredSoldItems.length} item dipilih`
                            : `Pilih Semua (${filteredSoldItems.length} item)`
                        })()}
                      </span>
                    </div>

                    {/* Table */}
                    <div className="overflow-x-auto border rounded-lg">
                      <Table>
                        <TableHeader>
                          <TableRow className="bg-muted/50">
                            <TableHead className="w-12"></TableHead>
                            <TableHead>Kode Barang</TableHead>
                            <TableHead>Kode Inventaris</TableHead>
                            <TableHead>Nama Barang</TableHead>
                            <TableHead>Owner</TableHead>
                            <TableHead>Kategori</TableHead>
                            <TableHead className="text-right">Qty Terjual</TableHead>
                            <TableHead className="text-right">Nilai Penjualan</TableHead>
                            {calculationMode === 'atur-hpp' && (
                              <>
                                <TableHead className="text-right">HPP/Unit</TableHead>
                                <TableHead className="text-right">Total HPP</TableHead>
                              </>
                            )}
                            <TableHead className="text-right">
                              {calculationMode === 'atur-hpp' ? 'Margin' : 'Nilai Penjualan'}
                            </TableHead>
                            <TableHead>Status HPP</TableHead>
                            <TableHead className="text-center">Aksi</TableHead>
                          </TableRow>
                        </TableHeader>
                        <TableBody>
                          {filteredSoldItems.length === 0 ? (
                            <TableRow>
                              <TableCell colSpan={calculationMode === 'atur-hpp' ? 13 : 11} className="text-center py-8 text-gray-500">
                                Tidak ada item yang sesuai dengan filter
                              </TableCell>
                            </TableRow>
                          ) : (
                            filteredSoldItems.map((item) => {
                          const isSelected = selectedItemIds.has(item.item_id);
                          // Gunakan pending HPP jika ada, jika tidak gunakan HPP dari database
                          const hppPerUnit = pendingHppChanges[item.item_id] ?? item.hpp_yayasan ?? 0;
                          const totalHPP = hppPerUnit * (item.total_terjual || 0);
                          const margin = (item.total_nilai || 0) - totalHPP;
                          const hasPendingHpp = pendingHppChanges[item.item_id] !== undefined;
                          
                          // Buat objek minimal untuk handleEditHPP (fungsi akan fetch ulang dari database)
                          const minimalItemForEdit: InventoryItem = {
                            id: item.item_id,
                            kode_inventaris: item.kode_inventaris,
                            nama_barang: item.nama_barang,
                            kategori: item.kategori,
                            tipe_item: '',
                            jumlah: 0,
                            satuan: null,
                            harga_perolehan: item.harga_perolehan,
                            hpp_yayasan: item.hpp_yayasan,
                            is_komoditas: null,
                            boleh_dijual_koperasi: null,
                            sumber: null,
                            created_at: '',
                          };
                          
                          return (
                            <TableRow 
                              key={item.item_id}
                              className={isSelected ? 'bg-blue-50 border-blue-200' : ''}
                            >
                              <TableCell>
                                <Checkbox
                                  checked={isSelected}
                                  onCheckedChange={() => handleToggleItem(item.item_id)}
                                />
                              </TableCell>
                              <TableCell className="font-mono text-sm font-semibold">
                                {item.kode_barang || '-'}
                              </TableCell>
                              <TableCell className="font-mono text-xs text-gray-500">
                                {item.kode_inventaris || '-'}
                              </TableCell>
                              <TableCell className="font-medium">{item.nama_barang}</TableCell>
                              <TableCell>
                                <Badge 
                                  variant={item.owner_type === 'yayasan' ? 'default' : 'secondary'}
                                  className={item.owner_type === 'yayasan' ? 'bg-blue-100 text-blue-700' : 'bg-purple-100 text-purple-700'}
                                >
                                  {item.owner_type === 'yayasan' ? 'YYS' : 'KOP'}
                                </Badge>
                              </TableCell>
                              <TableCell>
                                <Badge variant="outline">{item.kategori}</Badge>
                              </TableCell>
                              <TableCell className="text-right">
                                {item.total_terjual.toLocaleString('id-ID')} pcs
                              </TableCell>
                              <TableCell className="text-right font-semibold">
                                {formatCurrency(item.total_nilai)}
                              </TableCell>
                              <TableCell className="text-right">
                                {calculationMode === 'atur-hpp' ? (
                                  <div className="flex items-center gap-2 justify-end">
                                    {hasPendingHpp && (
                                      <Badge variant="outline" className="bg-yellow-50 text-yellow-700 text-xs">
                                        Baru
                                      </Badge>
                                    )}
                                    {formatCurrency(hppPerUnit)}
                                  </div>
                                ) : (
                                  <span className="text-gray-400">-</span>
                                )}
                              </TableCell>
                              <TableCell className="text-right">
                                {calculationMode === 'atur-hpp' ? formatCurrency(totalHPP) : <span className="text-gray-400">-</span>}
                              </TableCell>
                              <TableCell className={`text-right font-semibold ${margin >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                                {calculationMode === 'atur-hpp' ? formatCurrency(margin) : formatCurrency(item.total_nilai || 0)}
                              </TableCell>
                              <TableCell>
                                {calculationMode === 'atur-hpp' ? (
                                  hppPerUnit > 0 ? (
                                    <Badge variant="default" className="bg-green-100 text-green-700">
                                      <CheckCircle2 className="h-3 w-3 mr-1" />
                                      {hasPendingHpp ? 'HPP Baru' : 'Sudah Diatur'}
                                    </Badge>
                                  ) : (
                                    <Badge variant="outline" className="bg-red-50 text-red-700">
                                      <AlertCircle className="h-3 w-3 mr-1" />
                                      Perlu Diatur
                                    </Badge>
                                  )
                                ) : (
                                  <Badge variant="outline" className="bg-gray-100 text-gray-700">
                                    Mode Akumulatif
                                  </Badge>
                                )}
                              </TableCell>
                              <TableCell className="text-center">
                                {calculationMode === 'atur-hpp' ? (
                                  <Button
                                    variant={hppPerUnit > 0 ? "outline" : "default"}
                                    size="sm"
                                    onClick={() => handleEditHPP(minimalItemForEdit)}
                                  >
                                    <Edit className="h-4 w-4 mr-1" />
                                    {hppPerUnit > 0 ? 'Edit HPP' : 'Set HPP'}
                                  </Button>
                                ) : (
                                  <span className="text-sm text-gray-400">-</span>
                                )}
                              </TableCell>
                            </TableRow>
                          );
                            })
                          )}
                        </TableBody>
                      </Table>
                    </div>
                  </div>
                );
              })()}
            </CardContent>
          </Card>

          {/* Section 3: Skema Bagi Hasil - Hanya untuk mode Akumulatif */}
          {calculationMode === 'akumulatif' && (
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-lg">Skema Bagi Hasil</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-2 gap-4 max-w-md">
                  <div>
                    <Label htmlFor="bagi_hasil_yayasan" className="text-sm">Yayasan (%)</Label>
                    <Input
                      id="bagi_hasil_yayasan"
                      type="number"
                      min="0"
                      max="100"
                      value={bagiHasilYayasan}
                      onChange={(e) => {
                        const val = parseFloat(e.target.value) || 0;
                        setBagiHasilYayasan(val);
                        setBagiHasilKoperasi(100 - val);
                      }}
                      className="mt-1 h-9"
                    />
                  </div>
                  <div>
                    <Label htmlFor="bagi_hasil_koperasi" className="text-sm">Koperasi (%)</Label>
                    <Input
                      id="bagi_hasil_koperasi"
                      type="number"
                      min="0"
                      max="100"
                      value={bagiHasilKoperasi}
                      onChange={(e) => {
                        const val = parseFloat(e.target.value) || 0;
                        setBagiHasilKoperasi(val);
                        setBagiHasilYayasan(100 - val);
                      }}
                      className="mt-1 h-9"
                    />
                  </div>
                </div>
                <p className="text-xs text-gray-500 mt-2">
                  Total: {bagiHasilYayasan + bagiHasilKoperasi}% {bagiHasilYayasan + bagiHasilKoperasi !== 100 && <span className="text-red-500">(Harus 100%)</span>}
                </p>
              </CardContent>
            </Card>
          )}

          {/* Section 4: Cost Operasional */}
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-lg">Cost Operasional</CardTitle>
            </CardHeader>
            <CardContent>
              {costOperasional.length === 0 ? (
                <div className="text-center py-8 text-gray-500">
                  <p className="text-sm">Tidak ada pengeluaran operasional pada periode ini</p>
                </div>
              ) : (
                <div className="space-y-2">
                  <div className="flex items-center justify-between mb-4">
                    <Label>Pilih Cost Operasional</Label>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={handleSelectAllCosts}
                    >
                      {selectedCostOperasionalIds.size === costOperasional.length ? 'Batal Pilih Semua' : 'Pilih Semua'}
                    </Button>
                  </div>
                  <div className="max-h-60 overflow-y-auto border rounded-lg">
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead className="w-12">
                            <input
                              type="checkbox"
                              checked={selectedCostOperasionalIds.size === costOperasional.length && costOperasional.length > 0}
                              onChange={handleSelectAllCosts}
                            />
                          </TableHead>
                          <TableHead>Tanggal</TableHead>
                          <TableHead>Deskripsi</TableHead>
                          <TableHead>Kategori</TableHead>
                          <TableHead className="text-right">Jumlah</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {costOperasional.map((cost: any) => (
                          <TableRow key={cost.id}>
                            <TableCell>
                              <input
                                type="checkbox"
                                checked={selectedCostOperasionalIds.has(cost.id)}
                                onChange={() => handleToggleCost(cost.id)}
                              />
                            </TableCell>
                            <TableCell className="text-sm">
                              {format(new Date(cost.tanggal), 'd MMM yyyy', { locale: localeId })}
                            </TableCell>
                            <TableCell className="text-sm">
                              {(() => {
                                // Prioritas: deskripsi > sub_kategori > kategori > penerima_pembayar > '-'
                                const desc = cost.deskripsi?.trim();
                                if (desc) return desc;
                                
                                const subKat = cost.sub_kategori?.trim();
                                if (subKat) return subKat;
                                
                                const kat = cost.kategori?.trim();
                                if (kat) return kat;
                                
                                const penerima = cost.penerima_pembayar?.trim();
                                if (penerima) return penerima;
                                
                                return '-';
                              })()}
                            </TableCell>
                            <TableCell>
                              <Badge variant="outline">{cost.kategori || '-'}</Badge>
                            </TableCell>
                            <TableCell className="text-right font-semibold">
                              {formatCurrency(Number(cost.jumlah || 0))}
                            </TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </div>
                  {selectedCostOperasionalIds.size > 0 && (
                    <div className="mt-4 p-3 bg-blue-50 rounded-lg">
                      <p className="text-sm font-semibold text-blue-900">
                        Total Cost Operasional Terpilih: {formatCurrency(
                          costOperasional
                            .filter((cost: any) => selectedCostOperasionalIds.has(cost.id))
                            .reduce((sum: number, cost: any) => sum + (Number(cost.jumlah) || 0), 0)
                        )}
                      </p>
                    </div>
                  )}
                </div>
              )}
            </CardContent>
          </Card>

          {/* Section 5: Summary Kalkulasi */}
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-lg">Ringkasan Kalkulasi</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-6">
                {/* Summary Cards - Minimalis */}
                <div className="grid grid-cols-4 gap-3">
                  <div className="p-3 bg-gray-50 rounded-lg border border-gray-200">
                    <p className="text-xs text-gray-500 mb-1">Omset</p>
                    <p className="text-lg font-bold truncate">{formatCurrency(calculationResults.totalPenjualan)}</p>
                  </div>
                  {calculationMode === 'atur-hpp' && (
                    <>
                      <div className="p-3 bg-gray-50 rounded-lg border border-gray-200">
                        <p className="text-xs text-gray-500 mb-1">HPP</p>
                        <p className="text-lg font-bold truncate">{formatCurrency(calculationResults.totalHPP)}</p>
                      </div>
                      <div className="p-3 bg-blue-50 rounded-lg border border-blue-200">
                        <p className="text-xs text-gray-500 mb-1">Margin</p>
                        <p className={`text-lg font-bold truncate ${calculationResults.totalMargin >= 0 ? 'text-blue-600' : 'text-red-600'}`}>
                          {formatCurrency(calculationResults.totalMargin)}
                        </p>
                      </div>
                    </>
                  )}
                  <div className={`p-3 rounded-lg border ${calculationMode === 'atur-hpp' ? 'bg-orange-50 border-orange-200' : 'bg-gray-50 border-gray-200'}`}>
                    <p className="text-xs text-gray-500 mb-1">Cost Ops</p>
                    <p className="text-lg font-bold truncate">{formatCurrency(calculationResults.totalCostOperasional)}</p>
                  </div>
                </div>

                {/* Laba/Rugi Bersih - Highlight */}
                <div className={`p-4 rounded-lg border-2 ${calculationResults.labaRugiBersih >= 0 ? 'bg-green-50 border-green-300' : 'bg-red-50 border-red-300'}`}>
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm font-semibold text-gray-700 mb-1">Laba/Rugi Bersih</p>
                      <p className={`text-2xl font-bold ${calculationResults.labaRugiBersih >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                    {formatCurrency(calculationResults.labaRugiBersih)}
                  </p>
                </div>
                  </div>
                </div>

                {/* Tabel Perbandingan Side-by-Side */}
                {calculationMode === 'akumulatif' && (
                  <div className="grid grid-cols-2 gap-4">
                    <div className="border rounded-lg overflow-hidden">
                      <div className="bg-purple-50 px-4 py-2 border-b">
                        <p className="text-sm font-semibold text-gray-700">Yayasan</p>
                      </div>
                      <div className="p-4">
                        <div className="flex items-baseline justify-between mb-2">
                          <span className="text-xs text-gray-500">Persentase</span>
                          <span className="text-lg font-bold text-purple-600">{bagiHasilYayasan}%</span>
                        </div>
                        <div className="flex items-baseline justify-between">
                          <span className="text-xs text-gray-500">Nilai</span>
                          <span className={`text-xl font-bold ${calculationResults.bagianYayasan >= 0 ? 'text-purple-600' : 'text-red-600'}`}>
                        {formatCurrency(calculationResults.bagianYayasan)}
                          </span>
                    </div>
                      </div>
                    </div>
                    <div className="border rounded-lg overflow-hidden">
                      <div className="bg-indigo-50 px-4 py-2 border-b">
                        <p className="text-sm font-semibold text-gray-700">Koperasi</p>
                      </div>
                      <div className="p-4">
                        <div className="flex items-baseline justify-between mb-2">
                          <span className="text-xs text-gray-500">Persentase</span>
                          <span className="text-lg font-bold text-indigo-600">{bagiHasilKoperasi}%</span>
                        </div>
                        <div className="flex items-baseline justify-between">
                          <span className="text-xs text-gray-500">Nilai</span>
                          <span className={`text-xl font-bold ${calculationResults.bagianKoperasi >= 0 ? 'text-indigo-600' : 'text-red-600'}`}>
                        {formatCurrency(calculationResults.bagianKoperasi)}
                          </span>
                        </div>
                      </div>
                    </div>
                  </div>
                )}

                {calculationMode === 'atur-hpp' && (
                  <div className="border rounded-lg overflow-hidden">
                    <div className="bg-indigo-50 px-4 py-2 border-b">
                      <p className="text-sm font-semibold text-gray-700">Koperasi</p>
                    </div>
                    <div className="p-4">
                      <div className="flex items-baseline justify-between mb-3">
                        <span className="text-sm text-gray-600">Laba Bersih</span>
                        <span className={`text-xl font-bold ${calculationResults.labaRugiBersih >= 0 ? 'text-indigo-600' : 'text-red-600'}`}>
                      {formatCurrency(calculationResults.labaRugiBersih)}
                        </span>
                      </div>
                      <div className="pt-3 border-t">
                        <div className="flex items-baseline justify-between">
                          <span className="text-sm text-gray-600">Kewajiban ke Yayasan (HPP)</span>
                          <span className="text-lg font-semibold text-gray-700">{formatCurrency(calculationResults.totalHPP)}</span>
                        </div>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            </CardContent>
          </Card>

          {/* Section 6: Simpan Keputusan */}
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-lg">Simpan Keputusan</CardTitle>
            </CardHeader>
            <CardContent>
              <Button 
                size="lg" 
                className="w-full"
                onClick={handleSaveDecision}
                disabled={isSavingDecision || selectedItemIds.size === 0 || (calculationMode === 'akumulatif' && bagiHasilYayasan + bagiHasilKoperasi !== 100)}
              >
                {isSavingDecision ? (
                  <>
                    <RefreshCw className="h-5 w-5 mr-2 animate-spin" />
                    Menyimpan...
                  </>
                ) : (
                  <>
                    <PieChart className="h-5 w-5 mr-2" />
                    Simpan Keputusan
                  </>
                )}
              </Button>
              {selectedItemIds.size === 0 && (
                <p className="text-xs text-red-500 mt-2 text-center">
                  Pilih minimal satu item terjual
                </p>
              )}
              {calculationMode === 'akumulatif' && bagiHasilYayasan + bagiHasilKoperasi !== 100 && (
                <p className="text-xs text-red-500 mt-2 text-center">
                  Total bagi hasil harus 100%
                </p>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* Tab: Riwayat */}
        <TabsContent value="riwayat" className="space-y-4">
          <Tabs defaultValue="terjual" className="space-y-4">
            <TabsList>
              <TabsTrigger value="terjual" className="flex items-center gap-2">
                <TrendingUp className="h-4 w-4" />
                Item Terjual
              </TabsTrigger>
              <TabsTrigger value="bagi-hasil" className="flex items-center gap-2">
                <History className="h-4 w-4" />
                Riwayat Bagi Hasil
              </TabsTrigger>
            </TabsList>

            {/* Sub-tab: Item Terjual */}
            <TabsContent value="terjual" className="space-y-4">
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-lg">Item Terjual</CardTitle>
            </CardHeader>
            <CardContent>
              {isLoadingSold ? (
                <div className="text-center py-12">
                  <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-gray-900 mx-auto"></div>
                  <p className="text-sm text-gray-500 mt-2">Memuat data...</p>
                </div>
              ) : soldItems.length === 0 ? (
                <div className="text-center py-12 text-gray-500">
                  <Package className="h-12 w-12 mx-auto mb-3 opacity-50" />
                  <p className="font-medium">Belum ada item terjual</p>
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Kode</TableHead>
                        <TableHead>Nama Barang</TableHead>
                        <TableHead>Kategori</TableHead>
                        <TableHead className="text-right">Total Terjual</TableHead>
                        <TableHead className="text-right">Total Nilai</TableHead>
                        <TableHead className="text-right">HPP Yayasan</TableHead>
                        <TableHead>Status HPP</TableHead>
                        <TableHead>Tanggal Terakhir</TableHead>
                        <TableHead className="text-center">Aksi</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {soldItems.map((item: SoldItem) => {
                        // Create a minimal InventoryItem from soldItems data
                        // This ensures button always appears even if item not in inventoryItems
                        const minimalItem: InventoryItem = {
                          id: item.item_id,
                          kode_inventaris: item.kode_inventaris,
                          nama_barang: item.nama_barang,
                          kategori: item.kategori,
                          tipe_item: 'Komoditas',
                          jumlah: item.total_terjual,
                          satuan: 'pcs',
                          harga_perolehan: item.harga_perolehan,
                          hpp_yayasan: item.hpp_yayasan,
                          is_komoditas: true,
                          boleh_dijual_koperasi: true,
                          sumber: null,
                          created_at: item.tanggal_penjualan_terakhir || new Date().toISOString(),
                        };
                        
                        return (
                          <TableRow key={item.item_id}>
                            <TableCell className="font-mono text-sm">
                              {item.kode_inventaris || '-'}
                            </TableCell>
                            <TableCell className="font-medium">{item.nama_barang}</TableCell>
                            <TableCell>
                              <Badge variant="outline">{item.kategori}</Badge>
                            </TableCell>
                            <TableCell className="text-right">
                              {item.total_terjual.toLocaleString('id-ID')} pcs
                            </TableCell>
                            <TableCell className="text-right font-semibold">
                              {formatCurrency(item.total_nilai)}
                            </TableCell>
                            <TableCell className="text-right">
                              {formatCurrency(item.hpp_yayasan)}
                            </TableCell>
                            <TableCell>
                              {item.hpp_yayasan && item.hpp_yayasan > 0 ? (
                                <Badge variant="default" className="bg-green-100 text-green-700">
                                  <CheckCircle2 className="h-3 w-3 mr-1" />
                                  Sudah Diatur
                                </Badge>
                              ) : (
                                <Badge variant="outline" className="bg-red-50 text-red-700">
                                  <AlertCircle className="h-3 w-3 mr-1" />
                                  Perlu Diatur
                                </Badge>
                              )}
                            </TableCell>
                            <TableCell className="text-sm text-gray-600">
                              {item.tanggal_penjualan_terakhir
                                ? format(new Date(item.tanggal_penjualan_terakhir), 'd MMM yyyy', { locale: localeId })
                                : '-'}
                            </TableCell>
                            <TableCell className="text-center">
                              <Button
                                variant={item.hpp_yayasan && item.hpp_yayasan > 0 ? "outline" : "default"}
                                size="sm"
                                onClick={() => handleEditHPP(minimalItem)}
                                className={item.hpp_yayasan && item.hpp_yayasan > 0 ? "" : "bg-green-600 hover:bg-green-700 text-white"}
                              >
                                <Edit className="h-4 w-4 mr-1" />
                                {item.hpp_yayasan && item.hpp_yayasan > 0 ? 'Edit HPP' : 'Set HPP'}
                              </Button>
                            </TableCell>
                          </TableRow>
                        );
                      })}
                    </TableBody>
                  </Table>
                </div>
              )}
            </CardContent>
          </Card>
            </TabsContent>

            {/* Sub-tab: Riwayat Bagi Hasil */}
            <TabsContent value="bagi-hasil" className="space-y-4">
          <div className="space-y-6">
            {/* Header */}
            <div className="flex items-center justify-between">
              <div>
                <h2 className="text-2xl font-bold text-gray-900">Riwayat Bagi Hasil</h2>
                <p className="text-sm text-gray-500 mt-1">{getFilterLabel()}</p>
              </div>
              <div className="flex items-center gap-3">
                <Select value={dateFilter} onValueChange={setDateFilter}>
                  <SelectTrigger className="w-[180px]">
                    <Calendar className="h-4 w-4 mr-2" />
                    <SelectValue placeholder="Pilih periode" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="semua">Semua Waktu</SelectItem>
                    <SelectItem value="hari-ini">Hari Ini</SelectItem>
                    <SelectItem value="minggu-ini">Minggu Ini</SelectItem>
                    <SelectItem value="bulan-ini">Bulan Ini</SelectItem>
                    <SelectItem value="bulan-lalu">Bulan Lalu</SelectItem>
                    <SelectItem value="tahun-ini">Tahun Ini</SelectItem>
                    <SelectItem value="tahun-lalu">Tahun Lalu</SelectItem>
                  </SelectContent>
                </Select>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => {
                    loadBagiHasilData();
                    toast.success('Data berhasil diperbarui');
                  }}
                >
                  <RefreshCw className="h-4 w-4 mr-2" />
                  Refresh
                </Button>
              </div>
            </div>

            {/* Profit Sharing Breakdown */}
            <ProfitSharingBreakdown 
              startDate={getDateRangeForBagiHasil().startDate}
              endDate={getDateRangeForBagiHasil().endDate}
            />

            {/* Monthly Summary Table */}
            <Card>
              <CardHeader>
                <CardTitle>Ringkasan Bagi Hasil Bulanan</CardTitle>
                <p className="text-sm text-gray-500 mt-1">
                  Pembagian hasil penjualan produk yayasan (70:30)
                </p>
              </CardHeader>
              <CardContent>
                {monthlySummaries.length === 0 ? (
                  <div className="text-center py-12 text-gray-500">
                    <DollarSign className="h-12 w-12 mx-auto mb-4 opacity-50" />
                    <p>Belum ada data bagi hasil</p>
                  </div>
                ) : (
                  <div className="overflow-x-auto">
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>Periode</TableHead>
                          <TableHead className="text-right">Total Penjualan</TableHead>
                          <TableHead className="text-right">Bagian Yayasan</TableHead>
                          <TableHead className="text-right">Bagian Koperasi</TableHead>
                          <TableHead className="text-center">Status</TableHead>
                          <TableHead className="text-center">Tanggal Bayar</TableHead>
                          <TableHead className="text-center">Aksi</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {monthlySummaries.map((summary) => (
                          <TableRow 
                            key={summary.id}
                            className={summary.status === 'unpaid' && summary.bagian_yayasan > 0 ? 'bg-amber-50' : ''}
                          >
                            <TableCell className="font-medium">
                              {getMonthName(summary.bulan)} {summary.tahun}
                            </TableCell>
                            <TableCell className="text-right font-mono">
                              {formatCurrencyBagiHasil(summary.total_penjualan)}
                            </TableCell>
                            <TableCell className="text-right font-mono text-emerald-600 font-semibold">
                              {formatCurrencyBagiHasil(summary.bagian_yayasan)}
                            </TableCell>
                            <TableCell className="text-right font-mono text-blue-600 font-semibold">
                              {formatCurrencyBagiHasil(summary.bagian_koperasi)}
                            </TableCell>
                            <TableCell className="text-center">
                              {summary.status === 'paid' ? (
                                <Badge variant="outline" className="bg-green-50 text-green-700">
                                  <CheckCircle2 className="h-3 w-3 mr-1" />
                                  Lunas
                                </Badge>
                              ) : summary.bagian_yayasan > 0 ? (
                                <Badge variant="outline" className="bg-amber-50 text-amber-700">
                                  <AlertCircle className="h-3 w-3 mr-1" />
                                  Belum Bayar
                                </Badge>
                              ) : (
                                <Badge variant="outline">Tidak Ada</Badge>
                              )}
                            </TableCell>
                            <TableCell className="text-center text-sm text-gray-600">
                              {summary.tanggal_bayar 
                                ? format(new Date(summary.tanggal_bayar), 'd MMM yyyy', { locale: localeId })
                                : '-'
                              }
                            </TableCell>
                            <TableCell className="text-center">
                              {summary.status === 'unpaid' && summary.bagian_yayasan > 0 ? (
                                <Button
                                  size="sm"
                                  onClick={() => handlePaymentClick(summary)}
                                  className="bg-emerald-600 hover:bg-emerald-700"
                                >
                                  <Wallet className="h-4 w-4 mr-1" />
                                  Bayar
                                </Button>
                              ) : (
                                <span className="text-sm text-gray-400">-</span>
                              )}
                            </TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Transactions List */}
            <Card>
              <CardHeader>
                <CardTitle>Riwayat Transaksi Bagi Hasil</CardTitle>
                <p className="text-sm text-gray-500 mt-1">
                  {transactions.length} transaksi tercatat
                </p>
              </CardHeader>
              <CardContent>
                {transactions.length === 0 ? (
                  <div className="text-center py-12 text-gray-500">
                    <PieChart className="h-12 w-12 mx-auto mb-4 opacity-50" />
                    <p>Belum ada transaksi bagi hasil</p>
                  </div>
                ) : (
                  <RiwayatTransaksi
                    transactions={transactions}
                    onViewDetail={handleViewTransaction}
                  />
                )}
              </CardContent>
            </Card>
          </div>

          {/* Payment Confirmation Dialog */}
          <Dialog open={showPaymentDialog} onOpenChange={setShowPaymentDialog}>
            <DialogContent className="sm:max-w-[500px]">
              <DialogHeader>
                <DialogTitle className="flex items-center gap-2">
                  <Wallet className="h-5 w-5 text-emerald-600" />
                  Konfirmasi Pembayaran Bagi Hasil
                </DialogTitle>
                <DialogDescription>
                  Pastikan data pembayaran sudah benar sebelum melanjutkan
                </DialogDescription>
              </DialogHeader>
              
              {selectedSummary && (
                <div className="space-y-4 py-4">
                  <div className="bg-gray-50 rounded-lg p-4 space-y-3">
                    <div className="flex justify-between items-center">
                      <span className="text-sm text-gray-600">Periode</span>
                      <span className="font-semibold">
                        {getMonthName(selectedSummary.bulan)} {selectedSummary.tahun}
                      </span>
                    </div>
                    <div className="flex justify-between items-center">
                      <span className="text-sm text-gray-600">Total Penjualan</span>
                      <span className="font-mono">
                        {formatCurrencyBagiHasil(selectedSummary.total_penjualan)}
                      </span>
                    </div>
                    <div className="border-t border-gray-200 pt-3">
                      <div className="flex justify-between items-center">
                        <span className="text-sm text-gray-600">Bagian Yayasan (70%)</span>
                        <span className="font-mono text-emerald-600 font-semibold">
                          {formatCurrencyBagiHasil(selectedSummary.bagian_yayasan)}
                        </span>
                      </div>
                    </div>
                    <div className="flex justify-between items-center">
                      <span className="text-sm text-gray-600">Bagian Koperasi</span>
                      <span className="font-mono text-blue-600 font-semibold">
                        {formatCurrencyBagiHasil(selectedSummary.bagian_koperasi)}
                      </span>
                    </div>
                  </div>

                  <div className="bg-amber-50 border border-amber-200 rounded-lg p-4">
                    <div className="flex gap-3">
                      <AlertCircle className="h-5 w-5 text-amber-600 flex-shrink-0 mt-0.5" />
                      <div className="text-sm text-amber-800">
                        <p className="font-semibold mb-1">Perhatian</p>
                        <p>
                          Pembayaran akan mengurangi saldo Kas Koperasi sebesar{' '}
                          <span className="font-semibold">{formatCurrencyBagiHasil(selectedSummary.bagian_yayasan)}</span>.
                          Pastikan saldo kas mencukupi.
                        </p>
                      </div>
                    </div>
                  </div>
                </div>
              )}

              <DialogFooter>
                <Button
                  variant="outline"
                  onClick={() => {
                    setShowPaymentDialog(false);
                    setSelectedSummary(null);
                  }}
                  disabled={processingPayment}
                >
                  Batal
                </Button>
                <Button
                  onClick={handleConfirmPayment}
                  disabled={processingPayment}
                  className="bg-emerald-600 hover:bg-emerald-700 text-white"
                >
                  {processingPayment ? (
                    <>
                      <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
                      Memproses...
                    </>
                  ) : (
                    <>
                      <CheckCircle2 className="h-4 w-4 mr-2" />
                      Konfirmasi Pembayaran
                    </>
                  )}
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>

          {/* Transaction Detail Modal */}
          {showTransactionDetail && selectedTransaction && (
            <TransactionDetailModal
              transaction={selectedTransaction}
              isOpen={showTransactionDetail}
              onClose={() => {
                setShowTransactionDetail(false);
                setSelectedTransaction(null);
              }}
            />
          )}
            </TabsContent>
          </Tabs>
        </TabsContent>
      </Tabs>

      {/* Dialog: Edit HPP */}
      <Dialog open={showHPPDialog} onOpenChange={setShowHPPDialog}>
        <DialogContent className="sm:max-w-[500px]">
          <DialogHeader>
            <DialogTitle>
              {editingItem ? `Atur HPP: ${editingItem.nama_barang}` : 'Atur HPP Item'}
            </DialogTitle>
            <DialogDescription>
              Tentukan HPP (Harga Pokok Penjualan) Yayasan per unit untuk item ini.
              HPP ini akan digunakan sebagai dasar perhitungan margin dan bagi hasil.
            </DialogDescription>
          </DialogHeader>

          {editingItem && (
            <div className="space-y-4 py-4">
              <div className="bg-gray-50 rounded-lg p-4 space-y-2">
                <div className="flex justify-between text-sm">
                  <span className="text-gray-600">Kode Inventaris:</span>
                  <span className="font-mono font-semibold">{editingItem.kode_inventaris || '-'}</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-gray-600">Harga Perolehan:</span>
                  <span className="font-semibold">{formatCurrency(editingItem.harga_perolehan)}</span>
                </div>
                {editingItem.hpp_yayasan && editingItem.hpp_yayasan > 0 && (
                  <div className="flex justify-between text-sm">
                    <span className="text-gray-600">HPP Saat Ini:</span>
                    <span className="font-semibold text-blue-600">
                      {formatCurrency(editingItem.hpp_yayasan)}
                    </span>
                  </div>
                )}
              </div>

              <div>
                <Label htmlFor="hpp_value">HPP Yayasan per Unit (Rp) *</Label>
                <Input
                  id="hpp_value"
                  type="number"
                  min="0"
                  step="100"
                  value={hppValue}
                  onChange={(e) => setHppValue(e.target.value)}
                  placeholder={editingItem.harga_perolehan?.toString() || '0'}
                  className="mt-1"
                />
                <p className="text-xs text-gray-500 mt-1">
                  HPP biasanya sama dengan harga perolehan, atau bisa disesuaikan untuk memperhitungkan biaya pengelolaan
                </p>
              </div>
            </div>
          )}

          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={() => {
                setShowHPPDialog(false);
                setEditingItem(null);
                setHppValue('');
              }}
            >
              Batal
            </Button>
            <Button
              type="button"
              onClick={handleSaveHPP}
              disabled={updateHppMutation.isPending || !hppValue}
            >
              {updateHppMutation.isPending ? 'Menyimpan...' : 'Simpan HPP'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default KelolaHPPDanBagiHasilPage;

import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from '@/components/ui/command';
import { 
  Plus, 
  Trash2, 
  Users, 
  Calculator,
  Save,
  X,
  Calendar,
  Check,
  ChevronsUpDown
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { supabase } from '../integrations/supabase/client';
import { AkunKasService, AkunKas } from '../services/akunKas.service';
import { AlokasiPengeluaranService } from '../services/alokasiPengeluaran.service';
import { MasterDataKeuanganService, type MasterKategoriPengeluaran, type MasterSubKategoriPengeluaran } from '../services/masterDataKeuangan.service';
import { toast } from 'sonner';
import { useQuery } from '@tanstack/react-query';

interface CreateKeuanganWithDetailsData {
  tanggal: string;
  kategori: string;
  sub_kategori: string;
  akun_kas_id: string;
  penerima_pembayar: string;
  deskripsi: string;
  jumlah: number;
  jenis_alokasi: string;
  status: string;
  is_pengeluaran_riil?: boolean; // Baru: untuk tracking nominal vs pengeluaran riil
  rincian_items: RincianItem[];
  alokasi_santri: any[];
}

// Helper function untuk get alokasi config (dipindahkan ke luar komponen agar bisa diakses dari createKeuanganWithDetails)
const getAlokasiConfigHelper = (kategoriValue: string): {
  autoPost: boolean;
  isPengeluaranRiil: boolean;
  tipeAlokasi?: 'pengeluaran_riil' | 'tracking_nominal';
  alokasiKe?: 'formal' | 'pesantren' | 'asrama_konsumsi' | 'bantuan_langsung';
  perluPilihSantri: boolean;
  autoGenerateOverhead?: boolean;
  defaultJenisAlokasi?: string;
  createLayananSantri: boolean;
  info: string;
} => {
  const configs: Record<string, {
    autoPost: boolean;
    isPengeluaranRiil: boolean;
    tipeAlokasi?: 'pengeluaran_riil' | 'tracking_nominal';
    alokasiKe?: 'formal' | 'pesantren' | 'asrama_konsumsi' | 'bantuan_langsung';
    perluPilihSantri: boolean;
    autoGenerateOverhead?: boolean;
    defaultJenisAlokasi?: string;
    createLayananSantri: boolean;
    info: string;
  }> = {
    'Pendidikan Pesantren': {
      autoPost: false,
      isPengeluaranRiil: true,
      tipeAlokasi: 'pengeluaran_riil',
      alokasiKe: 'pesantren',
      perluPilihSantri: false,
      defaultJenisAlokasi: '',
      createLayananSantri: false,
      info: 'Pengeluaran riil yang mengurangi saldo kas. Tidak otomatis dibagi ke santri. Alokasi ke santri hanya jika user secara eksplisit memilih santri.'
    },
    'Pendidikan Formal': {
      autoPost: false,
      isPengeluaranRiil: true,
      tipeAlokasi: 'pengeluaran_riil',
      alokasiKe: 'formal',
      perluPilihSantri: true,
      defaultJenisAlokasi: 'langsung',
      createLayananSantri: false,
      info: 'Pilih santri untuk tracking/audit di modul keuangan. Alokasi ini TIDAK akan muncul di tab "Laporan Layanan / Beasiswa Santri" di profil santri. Layanan periodik dicatat via Generate Layanan Periodik.'
    },
    'Operasional dan Konsumsi Santri': {
      autoPost: true,
      isPengeluaranRiil: true,
      tipeAlokasi: 'pengeluaran_riil',
      alokasiKe: 'asrama_konsumsi',
      perluPilihSantri: false,
      autoGenerateOverhead: true,
      defaultJenisAlokasi: 'overhead',
      createLayananSantri: false,
      info: 'Auto-post ke semua santri binaan mukim. Auto-generate ke biaya asrama & konsumsi. Mengurangi saldo kas.'
    },
    'Bantuan Langsung Yayasan': {
      autoPost: false,
      isPengeluaranRiil: true,
      tipeAlokasi: 'pengeluaran_riil',
      alokasiKe: 'bantuan_langsung',
      perluPilihSantri: true,
      defaultJenisAlokasi: 'langsung',
      createLayananSantri: true,
      info: 'Pilih santri manual. Akan muncul di profil santri pada tab "Laporan Layanan / Beasiswa Santri". Bisa breakdown detail per jenis bantuan (uang saku, obat, kacamata, dll).'
    },
    'Operasional Yayasan': {
      autoPost: false,
      isPengeluaranRiil: true,
      perluPilihSantri: false,
      defaultJenisAlokasi: '',
      createLayananSantri: false,
      info: 'Tidak dialokasikan ke santri. Pengeluaran operasional yayasan (gaji, fasilitas, maintenance, dll).'
    }
  };
  
  return configs[kategoriValue] || {
    autoPost: false,
    isPengeluaranRiil: true,
    perluPilihSantri: false,
    defaultJenisAlokasi: '',
    createLayananSantri: false,
    info: 'Pilih jenis alokasi sesuai kebutuhan.'
  };
};

const createKeuanganWithDetails = async (data: CreateKeuanganWithDetailsData) => {
  console.log('[DEBUG] createKeuanganWithDetails input data:', {
    tanggal: data.tanggal,
    jenis_transaksi: 'Pengeluaran',
    kategori: data.kategori,
    sub_kategori: data.sub_kategori,
    akun_kas_id: data.akun_kas_id,
    penerima_pembayar: data.penerima_pembayar,
    deskripsi: data.deskripsi,
    jumlah: data.jumlah,
    jenis_alokasi: data.jenis_alokasi,
    is_pengeluaran_riil: data.is_pengeluaran_riil,
    status: 'posted'
  });

  // Create main transaction
  // Try with is_pengeluaran_riil first, fallback if migration not applied
  let keuangan: any = null;
  
  const insertDataBase = {
    tanggal: data.tanggal,
    jenis_transaksi: 'Pengeluaran',
    kategori: data.kategori,
    sub_kategori: data.sub_kategori,
    akun_kas_id: data.akun_kas_id,
    penerima_pembayar: data.penerima_pembayar,
    deskripsi: data.deskripsi,
    jumlah: data.jumlah,
    jenis_alokasi: data.jenis_alokasi,
    status: 'posted'
  };
  
  // Try insert with is_pengeluaran_riil if set
  if (data.is_pengeluaran_riil !== undefined) {
    const { data: keuanganWithField, error: errorWithField } = await supabase
      .from('keuangan')
      .insert({ ...insertDataBase, is_pengeluaran_riil: data.is_pengeluaran_riil })
      .select()
      .single();
    
    if (errorWithField && (errorWithField.message?.includes('is_pengeluaran_riil') || errorWithField.code === 'PGRST204')) {
      // Migration not applied, retry without field
      console.warn('[DEBUG] Migration not applied yet, retrying without is_pengeluaran_riil');
      const { data: keuanganRetry, error: errorRetry } = await supabase
        .from('keuangan')
        .insert(insertDataBase)
        .select()
        .single();
      
      if (errorRetry) {
        console.error('[DEBUG] keuanganError (retry):', errorRetry);
        throw errorRetry;
      }
      keuangan = keuanganRetry;
    } else if (errorWithField) {
      console.error('[DEBUG] keuanganError:', errorWithField);
      throw errorWithField;
    } else {
      keuangan = keuanganWithField;
    }
  } else {
    // No is_pengeluaran_riil field, insert normally
    const { data: keuanganNormal, error: errorNormal } = await supabase
      .from('keuangan')
      .insert(insertDataBase)
      .select()
      .single();
    
    if (errorNormal) {
      console.error('[DEBUG] keuanganError:', errorNormal);
      throw errorNormal;
    }
    keuangan = keuanganNormal;
  }
  
  if (!keuangan) {
    throw new Error('Failed to create keuangan transaction');
  }
  
  console.log('[DEBUG] keuangan created successfully:', keuangan);
  
      console.log('[DEBUG] keuangan created successfully:', keuangan);
      
      // REVISI v2: Ensure saldo akun kas is correct after transaction (per-account)
      // Semua transaksi pengeluaran di tabel keuangan adalah pengeluaran riil (mengurangi saldo kas)
      // Tidak ada lagi tracking_nominal yang tidak mengurangi saldo
      try {
        const { error: saldoError } = await supabase.rpc('ensure_akun_kas_saldo_correct_for', {
          p_akun_id: data.akun_kas_id
        });
        if (saldoError) {
          console.warn('[DEBUG] Warning ensuring saldo correct (per-account):', saldoError);
        } else {
          console.log('[DEBUG] Saldo akun kas ensured correct (per-account)');
        }
      } catch (saldoErr) {
        console.warn('[DEBUG] Error ensuring saldo correct (per-account):', saldoErr);
      }
      
      // Refresh handled by parent pages (loadData/loadChartData). No full reload here.
  
  // Create rincian items
  if (data.rincian_items.length > 0) {
    const rincianData = data.rincian_items.map(item => ({
      keuangan_id: keuangan.id,
      nama_item: item.nama_item,
      jumlah: item.jumlah,
      satuan: item.satuan,
      harga_satuan: item.harga_satuan
      // total tidak perlu di-insert karena generated column
    }));
    
    const { error: rincianError } = await supabase
      .from('rincian_pengeluaran')
      .insert(rincianData);
    
    if (rincianError) throw rincianError;
  }
  
  // REVISI v2: Create alokasi santri - HANYA jika user eksplisit memilih santri
  // Tidak ada lagi auto-generate overhead
  // JANGAN buat alokasi untuk kategori "Operasional Yayasan" dan "Pendidikan Pesantren" (tanpa pilih santri)
  if (data.kategori === 'Operasional Yayasan') {
    // Kategori ini tidak dialokasikan ke santri, skip pembuatan alokasi
    console.log('[SKIP] Operasional Yayasan tidak dialokasikan ke santri');
  } else if (data.alokasi_santri.length > 0) {
    // REVISI v2: Hanya buat alokasi jika user eksplisit memilih santri
    console.log('Alokasi santri data:', data.alokasi_santri);
    
    // Map rincian items untuk mencari rincian_id berdasarkan nama_item
    const rincianMap = new Map();
    if (data.rincian_items.length > 0) {
      // Get rincian items yang sudah di-insert
      const { data: insertedRincian } = await supabase
        .from('rincian_pengeluaran')
        .select('id, nama_item')
        .eq('keuangan_id', keuangan.id);
      
      if (insertedRincian) {
        insertedRincian.forEach(rincian => {
          rincianMap.set(rincian.nama_item, rincian.id);
        });
      }
    }
    
    // REVISI v2: Hanya alokasi manual (user pilih santri)
    const alokasiData = data.alokasi_santri.map(item => {
      // Cari rincian_id berdasarkan jenis_bantuan (yang seharusnya sama dengan nama_item)
      const rincianId = rincianMap.get(item.jenis_bantuan) || null;
      
      return {
        keuangan_id: keuangan.id,
        rincian_id: rincianId, // Link ke rincian item jika ada
        santri_id: item.santri_id,
        nominal_alokasi: item.nominal_alokasi || item.jumlah || 0,
        jenis_bantuan: item.jenis_bantuan || 'Bantuan Langsung',
        persentase_alokasi: item.persentase_alokasi || 0,
        periode: item.periode || new Date().toLocaleDateString('id-ID', { month: 'long', year: 'numeric' }),
        keterangan: item.keterangan || '',
        tipe_alokasi: item.tipe_alokasi || 'pengeluaran_riil',
        alokasi_ke: item.alokasi_ke || null
      };
    });
    
    if (alokasiData.length > 0) {
      console.log('Mapped alokasi data:', alokasiData);
      
      const { error: alokasiError } = await supabase
        .from('alokasi_pengeluaran_santri')
        .insert(alokasiData);
      
      if (alokasiError) throw alokasiError;
      
      // ⭐ REVISI v2: Create Ledger Layanan Santri HANYA untuk kategori "Bantuan Langsung Yayasan"
      // Sesuai Spec-keuanganv2.md 5.4: Hanya bantuan langsung yang wajib create Ledger Layanan Santri
      // Kategori lain (Pendidikan Formal, dll) hanya membuat alokasi_pengeluaran_santri untuk tracking/audit
      // dan TIDAK akan muncul di profil santri tab "Laporan Layanan / Beasiswa Santri"
      
      // Get config untuk check apakah perlu create Ledger Layanan Santri
      const config = getAlokasiConfigHelper(data.kategori);
      
      // Create Ledger Layanan Santri untuk "Bantuan Langsung Yayasan" dan "Pendidikan Formal"
      if (config.createLayananSantri && data.kategori === 'Bantuan Langsung Yayasan' && alokasiData.length > 0) {
        // Parse periode from tanggal transaksi (format: YYYY-MM)
        const transaksiDate = new Date(data.tanggal);
        const periode = `${transaksiDate.getFullYear()}-${String(transaksiDate.getMonth() + 1).padStart(2, '0')}`;
        
        // Delete existing entries for this keuangan_id to avoid duplicates
        const { error: deleteError } = await supabase
          .from('ledger_layanan_santri')
          .delete()
          .eq('referensi_keuangan_id', keuangan.id)
          .eq('pilar_layanan', 'bantuan_langsung')
          .eq('sumber_perhitungan', 'bantuan_langsung');
        
        if (deleteError) {
          console.error('[ERROR] Failed to delete existing Bantuan Langsung entries:', deleteError);
        }
        
        // Create ledger entries for each allocation
        const ledgerEntries = alokasiData.map(alokasi => ({
          santri_id: alokasi.santri_id,
          periode: periode,
          pilar_layanan: 'bantuan_langsung' as const,
          nilai_layanan: alokasi.nominal_alokasi || 0,
          sumber_perhitungan: 'bantuan_langsung' as const,
          referensi_keuangan_id: keuangan.id,
        }));
        
        const { error: ledgerError } = await supabase
          .from('ledger_layanan_santri')
          .insert(ledgerEntries);
        
        if (ledgerError) {
          console.error('[ERROR] Failed to create ledger_layanan_santri:', ledgerError);
          // Don't throw - alokasi sudah dibuat, ledger error tidak harus block transaksi
        } else {
          console.log('[INFO] Ledger Layanan Santri created for Bantuan Langsung Yayasan');
        }
      } else if (data.kategori === 'Pendidikan Formal' && alokasiData.length > 0) {
        // REVISI: Pendidikan Formal juga perlu sync ke ledger_layanan_santri
        // Tapi hanya untuk tracking, tidak untuk display di profil santri (akan di-override oleh generate periodik)
        const transaksiDate = new Date(data.tanggal);
        const periode = `${transaksiDate.getFullYear()}-${String(transaksiDate.getMonth() + 1).padStart(2, '0')}`;
        
        // Delete existing entries for this keuangan_id to avoid conflicts
        const { error: deleteError } = await supabase
          .from('ledger_layanan_santri')
          .delete()
          .eq('referensi_keuangan_id', keuangan.id)
          .eq('pilar_layanan', 'pendidikan_formal')
          .eq('sumber_perhitungan', 'bantuan_langsung');
        
        if (deleteError) {
          console.error('[ERROR] Failed to delete existing Pendidikan Formal entries:', deleteError);
        }
        
        const ledgerEntries = alokasiData.map(alokasi => ({
          santri_id: alokasi.santri_id,
          periode: periode,
          pilar_layanan: 'pendidikan_formal' as const,
          nilai_layanan: alokasi.nominal_alokasi || 0,
          sumber_perhitungan: 'bantuan_langsung' as const, // Direct allocation
          referensi_keuangan_id: keuangan.id,
        }));
        
        const { error: ledgerError } = await supabase
          .from('ledger_layanan_santri')
          .insert(ledgerEntries);
        
        if (ledgerError) {
          console.error('[ERROR] Failed to sync Pendidikan Formal to ledger_layanan_santri:', ledgerError);
        } else {
          console.log('[INFO] Pendidikan Formal synced to ledger_layanan_santri');
        }
      } else {
        console.log(`[INFO] Kategori "${data.kategori}" - alokasi hanya untuk tracking/audit, TIDAK create Ledger Layanan Santri`);
      }
    }
  }
  
  return keuangan;
};

interface RincianItem {
  id: string;
  nama_item: string;
  jumlah: number;
  satuan: string;
  harga_satuan: number;
  total: number;
  keterangan?: string;
}

interface AlokasiSantri {
  id: string;
  santri_id: string;
  nama_lengkap: string;
  id_santri: string;
  nominal_alokasi: number;
  persentase_alokasi: number;
  jenis_bantuan: string;
  periode: string;
  keterangan?: string;
  tipe_alokasi?: 'pengeluaran_riil' | 'tracking_nominal';
  alokasi_ke?: 'formal' | 'pesantren' | 'asrama_konsumsi' | 'bantuan_langsung';
}

interface SantriOption {
  id: string;
  nama_lengkap: string;
  id_santri: string;
  program?: string;
}

interface FormPengeluaranRinciProps {
  onSuccess?: () => void;
}

const FormPengeluaranRinci: React.FC<FormPengeluaranRinciProps> = ({ onSuccess }) => {
  // Form state
  const [tanggal, setTanggal] = useState(new Date().toISOString().split('T')[0]);
  const [kategori, setKategori] = useState('');
  const [subKategori, setSubKategori] = useState('');
  const [akunKasId, setAkunKasId] = useState('');
  const [penerimaPembayar, setPenerimaPembayar] = useState('');
  const [catatan, setCatatan] = useState('');
  const [jenisAlokasi, setJenisAlokasi] = useState('');

  // Rincian items
  const [rincianItems, setRincianItems] = useState<RincianItem[]>([]);

  // Alokasi santri
  const [alokasiSantri, setAlokasiSantri] = useState<AlokasiSantri[]>([]);
  const [selectedSantriIds, setSelectedSantriIds] = useState<string[]>([]);

  // Options
  const [akunKasOptions, setAkunKasOptions] = useState<AkunKas[]>([]);
  const [santriOptions, setSantriOptions] = useState<SantriOption[]>([]);
  
  // Master data keuangan
  const [kategoriOptions, setKategoriOptions] = useState<MasterKategoriPengeluaran[]>([]);
  const [subKategoriOptions, setSubKategoriOptions] = useState<MasterSubKategoriPengeluaran[]>([]);
  const [selectedKategoriId, setSelectedKategoriId] = useState<string>('');

  // UI state
  const [loading, setLoading] = useState(false);
  const [showSantriPicker, setShowSantriPicker] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [programFilter, setProgramFilter] = useState<'all' | 'Mukim' | 'Non-Mukim'>('all');
  const [showNominalDialog, setShowNominalDialog] = useState(false);
  const [batchNominal, setBatchNominal] = useState('');
  const [jumlahSantriBinaanMukim, setJumlahSantriBinaanMukim] = useState<number | null>(null);
  const [loadingJumlahSantri, setLoadingJumlahSantri] = useState(false);
  
  // Range periode state
  const [useRangePeriode, setUseRangePeriode] = useState(false);
  const [periodeDari, setPeriodeDari] = useState('');
  const [periodeSampai, setPeriodeSampai] = useState('');
  const [nominalPerBulan, setNominalPerBulan] = useState('');
  
  // Sub kategori combobox state
  const [subKategoriOpen, setSubKategoriOpen] = useState(false);
  const [subKategoriSearch, setSubKategoriSearch] = useState('');
  const [historicalSubKategori, setHistoricalSubKategori] = useState<string[]>([]);

  // Load jumlah santri binaan mukim aktif
  const loadJumlahSantriBinaanMukim = async () => {
    try {
      setLoadingJumlahSantri(true);
      const { count, error } = await supabase
        .from('santri')
        .select('*', { count: 'exact', head: true })
        .eq('status_santri', 'Aktif')
        .or('kategori.ilike.%binaan%mukim%,kategori.ilike.%mukim%binaan%');
      
      if (error) throw error;
      setJumlahSantriBinaanMukim(count || 0);
    } catch (error) {
      console.error('Error loading jumlah santri binaan mukim:', error);
      setJumlahSantriBinaanMukim(null);
    } finally {
      setLoadingJumlahSantri(false);
    }
  };

  // Load jumlah santri saat kategori auto-post dipilih
  useEffect(() => {
    if (kategori) {
      const config = getAlokasiConfig(kategori);
      if (config.autoPost) {
        loadJumlahSantriBinaanMukim();
      } else {
        setJumlahSantriBinaanMukim(null);
      }
    }
  }, [kategori]);

  // Helper function untuk auto-detect config berdasarkan kategori
  // Wrapper untuk getAlokasiConfigHelper (untuk kompatibilitas dengan kode yang sudah ada)
  const getAlokasiConfig = (kategoriValue: string) => {
    return getAlokasiConfigHelper(kategoriValue);
  };

  // Auto-set kategori Pembangunan ketika akun kas pembangunan dipilih
  useEffect(() => {
    if (akunKasId) {
      const selectedAkun = akunKasOptions.find(akun => akun.id === akunKasId);
      if (selectedAkun && selectedAkun.nama.toLowerCase().includes('pembangunan')) {
        // Auto-set kategori ke Pembangunan
        if (kategori !== 'Pembangunan') {
          setKategori('Pembangunan');
        }
        // Auto-set sub_kategori jika belum ada atau tidak valid
        if (!subKategori || (subKategori !== 'Material' && subKategori !== 'Gaji Karyawan')) {
          setSubKategori('Material'); // Default ke Material
        }
      }
    }
  }, [akunKasId, akunKasOptions]);

  // Auto-select santri berdasarkan mapping di master data
  const [lastMappingCheck, setLastMappingCheck] = useState<{ kategori: string; subKategori: string } | null>(null);
  const [isManualSelection, setIsManualSelection] = useState(false);
  
  useEffect(() => {
    const loadSantriMapping = async () => {
      if (!kategori) {
        setLastMappingCheck(null);
        setIsManualSelection(false);
        return;
      }

      const currentCheck = { kategori, subKategori: subKategori || '' };
      
      // Jika kategori atau sub kategori berubah, reset manual selection flag
      if (lastMappingCheck && 
          (lastMappingCheck.kategori !== currentCheck.kategori || 
           lastMappingCheck.subKategori !== currentCheck.subKategori)) {
        setIsManualSelection(false);
        // Clear alokasi santri saat kategori/subKategori berubah
        setAlokasiSantri([]);
        setSelectedSantriIds([]);
      }

      // Skip jika sudah pernah check mapping untuk kombinasi kategori+subKategori yang sama
      if (lastMappingCheck && 
          lastMappingCheck.kategori === currentCheck.kategori && 
          lastMappingCheck.subKategori === currentCheck.subKategori) {
        return;
      }

      // Skip jika user sudah memilih santri manual
      if (isManualSelection && alokasiSantri.length > 0) {
        return;
      }

      try {
        const mappingResult = await MasterDataKeuanganService.getMappingWithPriority(
          kategori,
          subKategori || undefined
        );

        setLastMappingCheck(currentCheck);

        if (!mappingResult.mapping || !mappingResult.mapping.aktif) {
          return;
        }

        const mapping = mappingResult.mapping;

        // Jika tipe = 'tidak_dialokasikan', tidak perlu auto-select
        if (mapping.tipe_alokasi === 'tidak_dialokasikan') {
          return;
        }

        // Jika tipe = 'seluruh_binaan_mukim', load semua santri binaan mukim
        if (mapping.tipe_alokasi === 'seluruh_binaan_mukim') {
          const { data: santriBinaanMukim, error } = await supabase
            .from('santri')
            .select('id, nama_lengkap, id_santri')
            .eq('status_santri', 'Aktif')
            .or('kategori.ilike.%binaan%mukim%,kategori.ilike.%mukim%binaan%');

          if (error) throw error;

          if (santriBinaanMukim && santriBinaanMukim.length > 0) {
            const newAllocations: AlokasiSantri[] = santriBinaanMukim.map((santri) => ({
              id: `alloc-${Date.now()}-${santri.id}`,
              santri_id: santri.id,
              nama_lengkap: santri.nama_lengkap,
              id_santri: santri.id_santri || '',
              nominal_alokasi: 0,
              persentase_alokasi: 0,
              jenis_bantuan: subKategori || kategori,
              periode: new Date().toLocaleDateString('id-ID', { month: 'long', year: 'numeric' }),
              keterangan: '',
            }));

            setAlokasiSantri(newAllocations);
            setSelectedSantriIds(santriBinaanMukim.map(s => s.id));
            toast.success(`${santriBinaanMukim.length} santri binaan mukim otomatis dipilih`);
          }
        }

        // Jika tipe = 'pilih_santri', load santri dari mapping
        if (mapping.tipe_alokasi === 'pilih_santri' && 'santri_list' in mapping && mapping.santri_list) {
          const santriList = mapping.santri_list;
          if (santriList.length > 0) {
            const newAllocations: AlokasiSantri[] = santriList.map((item) => {
              const santri = santriOptions.find(s => s.id === item.santri_id);
              return {
                id: `alloc-${Date.now()}-${item.santri_id}`,
                santri_id: item.santri_id,
                nama_lengkap: item.santri_nama,
                id_santri: item.santri_id_santri || '',
                nominal_alokasi: 0,
                persentase_alokasi: 0,
                jenis_bantuan: subKategori || kategori,
                periode: new Date().toLocaleDateString('id-ID', { month: 'long', year: 'numeric' }),
                keterangan: '',
              };
            });

            setAlokasiSantri(newAllocations);
            setSelectedSantriIds(santriList.map(item => item.santri_id));
            toast.success(`${santriList.length} santri otomatis dipilih berdasarkan mapping`);
          }
        }
      } catch (error) {
        console.error('Error loading santri mapping:', error);
        // Jangan tampilkan error toast, karena ini opsional
      }
    };

    // Delay sedikit untuk menghindari race condition
    const timeoutId = setTimeout(() => {
      loadSantriMapping();
    }, 500);

    return () => clearTimeout(timeoutId);
  }, [kategori, subKategori, santriOptions]);

  // Auto-update jenis alokasi saat kategori berubah
  useEffect(() => {
    if (kategori) {
      const config = getAlokasiConfig(kategori);
      if (config.defaultJenisAlokasi && jenisAlokasi !== config.defaultJenisAlokasi) {
        setJenisAlokasi(config.defaultJenisAlokasi);
        // Clear alokasi santri jika tidak perlu pilih santri
        if (!config.perluPilihSantri) {
          setAlokasiSantri([]);
          setSelectedSantriIds([]);
        }
      }
      // Reset sub_kategori untuk kategori dengan dropdown
      if (kategori === 'Operasional dan Konsumsi Santri') {
        // Jika sub_kategori tidak valid, reset ke kosong
        if (subKategori && subKategori !== 'Konsumsi' && subKategori !== 'Operasional') {
          setSubKategori('');
        }
      } else if (kategori === 'Operasional Yayasan') {
        // Jika sub_kategori tidak valid, reset ke kosong
        const validSubKategori = ['Gaji & Honor', 'Utilitas', 'Maintenance', 'Administrasi', 'Lain-lain'];
        if (subKategori && !validSubKategori.includes(subKategori)) {
          setSubKategori('');
        }
      } else {
        // Untuk kategori lain, reset sub_kategori jika sebelumnya adalah dropdown value
        const dropdownValues = ['Konsumsi', 'Operasional', 'Gaji & Honor', 'Utilitas', 'Maintenance', 'Administrasi', 'Lain-lain'];
        if (dropdownValues.includes(subKategori)) {
          setSubKategori('');
        }
      }
      // Reset range periode jika kategori bukan Pendidikan Formal
      if (kategori !== 'Pendidikan Formal') {
        setUseRangePeriode(false);
        setPeriodeDari('');
        setPeriodeSampai('');
        setNominalPerBulan('');
      }
    } else {
      // Reset semua jika kategori kosong
      setSubKategori('');
      setUseRangePeriode(false);
      setPeriodeDari('');
      setPeriodeSampai('');
      setNominalPerBulan('');
    }
  }, [kategori, jenisAlokasi, subKategori]);

  // Helper function untuk mendapatkan sub kategori options dari master data
  interface SubKategoriOption {
    value: string;
    label: string;
    isCustom?: boolean;
  }
  
  const getSubKategoriOptions = (kategoriValue: string): SubKategoriOption[] => {
    // Jika ada sub kategori dari master data, gunakan itu
    if (subKategoriOptions.length > 0) {
      const options: SubKategoriOption[] = subKategoriOptions
        .filter(sub => sub.aktif)
        .map(sub => ({ value: sub.nama, label: sub.nama }));
      
      // Tambahkan opsi custom untuk menambah sub kategori baru
      options.push({ value: '', label: 'Tambah Sub Kategori Baru...', isCustom: true });
      
      return options;
    }
    
    // Fallback: ambil dari historical jika master data belum loaded
    const options: SubKategoriOption[] = historicalSubKategori
      .filter(sub => sub && sub.trim() !== '')
      .map(sub => ({ value: sub, label: sub }));
    
    // Tambahkan opsi custom jika belum ada
    if (!options.some(opt => opt.value === 'Tambah Sub Kategori Baru...')) {
      options.push({ value: '', label: 'Tambah Sub Kategori Baru...', isCustom: true });
    }
    
    return options;
  };

  // Load historical sub kategori
  useEffect(() => {
    const loadHistoricalSubKategori = async () => {
      if (!kategori) {
        setHistoricalSubKategori([]);
        return;
      }
      
      try {
        const { data, error } = await supabase
          .from('keuangan')
          .select('sub_kategori')
          .eq('kategori', kategori)
          .not('sub_kategori', 'is', null)
          .neq('sub_kategori', '')
          .limit(50);
        
        if (error) throw error;
        
        const uniqueSubKategori = Array.from(
          new Set((data || []).map(item => item.sub_kategori).filter(Boolean))
        ).sort() as string[];
        
        setHistoricalSubKategori(uniqueSubKategori);
      } catch (error) {
        console.error('Error loading historical sub kategori:', error);
        setHistoricalSubKategori([]);
      }
    };
    
    loadHistoricalSubKategori();
  }, [kategori]);

  // Load kategori dari master data
  const { data: kategoriList } = useQuery({
    queryKey: ['master-kategori-pengeluaran-form'],
    queryFn: () => MasterDataKeuanganService.getKategoriPengeluaran({ 
      jenis: 'Pengeluaran',
      aktifOnly: true 
    }),
  });

  // Load sub kategori berdasarkan kategori yang dipilih
  const { data: subKategoriList } = useQuery({
    queryKey: ['master-sub-kategori-form', selectedKategoriId],
    queryFn: () => {
      if (!selectedKategoriId) return Promise.resolve([]);
      return MasterDataKeuanganService.getSubKategoriByKategori(selectedKategoriId);
    },
    enabled: !!selectedKategoriId,
  });

  // Update kategori options saat data loaded
  useEffect(() => {
    if (kategoriList) {
      setKategoriOptions(kategoriList);
    }
  }, [kategoriList]);

  // Update sub kategori options saat data loaded
  useEffect(() => {
    if (subKategoriList) {
      setSubKategoriOptions(subKategoriList);
    } else {
      setSubKategoriOptions([]);
    }
  }, [subKategoriList]);

  // Update selectedKategoriId saat kategori berubah
  useEffect(() => {
    if (kategori && kategoriList) {
      const foundKategori = kategoriList.find(k => k.nama === kategori);
      if (foundKategori) {
        setSelectedKategoriId(foundKategori.id);
      } else {
        setSelectedKategoriId('');
      }
    } else {
      setSelectedKategoriId('');
    }
  }, [kategori, kategoriList]);

  // Load initial data
  useEffect(() => {
    loadInitialData();
  }, []);

  const loadInitialData = async () => {
    try {
      const [akunKas, santri] = await Promise.all([
        AkunKasService.getActive(),
        AlokasiPengeluaranService.getAvailableSantri(),
      ]);
      
      // Sembunyikan akun yang dikelola modul Tabungan dari form keuangan
      const filteredAkun = (akunKas || []).filter((a: any) => a?.managed_by !== 'tabungan');
      setAkunKasOptions(filteredAkun as any);
      setSantriOptions(santri);
      
      // Set default akun kas
      const defaultAkun = filteredAkun.find((akun: any) => akun.is_default);
      if (defaultAkun) {
        setAkunKasId(defaultAkun.id);
        console.log('[DEBUG] Default akun kas set to:', defaultAkun.nama, defaultAkun.id);
      } else {
        console.warn('[DEBUG] No default akun kas found, available options:', akunKas.map(akun => ({ nama: akun.nama, id: akun.id, is_default: akun.is_default })));
      }
    } catch (error) {
      console.error('Error loading initial data:', error);
      toast.error('Gagal memuat data awal');
    }
  };

  const addRincianItem = () => {
    const newItem: RincianItem = {
      id: `item-${Date.now()}`,
      nama_item: '',
      jumlah: 1,
      satuan: 'unit',
      harga_satuan: 0,
      total: 0,
      keterangan: '',
    };
    setRincianItems([...rincianItems, newItem]);
  };

  const updateRincianItem = (id: string, field: keyof RincianItem, value: any) => {
    setRincianItems(items =>
      items.map(item => {
        if (item.id === id) {
          const updated = { ...item, [field]: value };
          if (field === 'jumlah' || field === 'harga_satuan') {
            // Validasi dan konversi ke number
            const jumlah = typeof updated.jumlah === 'string' ? parseFloat(updated.jumlah) || 0 : updated.jumlah;
            const hargaSatuan = typeof updated.harga_satuan === 'string' ? parseFloat(updated.harga_satuan) || 0 : updated.harga_satuan;
            
            // Pastikan nilai positif
            updated.jumlah = Math.max(0, jumlah);
            updated.harga_satuan = Math.max(0, hargaSatuan);
            updated.total = updated.jumlah * updated.harga_satuan;
            
            console.log(`[DEBUG] updateRincianItem: ${field}=${value}, jumlah=${updated.jumlah}, harga=${updated.harga_satuan}, total=${updated.total}`);
          }
          return updated;
        }
        return item;
      })
    );
  };

  const removeRincianItem = (id: string) => {
    setRincianItems(items => items.filter(item => item.id !== id));
  };

  const addSantriToAllocation = (santriId: string) => {
    const santri = santriOptions.find(s => s.id === santriId);
    if (!santri || alokasiSantri.find(a => a.santri_id === santriId)) return;

    // Mark sebagai manual selection
    setIsManualSelection(true);

    const newAllocation: AlokasiSantri = {
      id: `alloc-${Date.now()}`,
      santri_id: santriId,
      nama_lengkap: santri.nama_lengkap,
      id_santri: santri.id_santri || '',
      nominal_alokasi: 0,
      persentase_alokasi: 0,
      jenis_bantuan: subKategori || 'Bantuan',
      periode: new Date().toLocaleDateString('id-ID', { month: 'long', year: 'numeric' }),
      keterangan: '',
    };

    setAlokasiSantri([...alokasiSantri, newAllocation]);
    setSelectedSantriIds([...selectedSantriIds, santriId]);
    setShowSantriPicker(false);
  };

  const updateAlokasiSantri = (id: string, field: keyof AlokasiSantri, value: any) => {
    // Mark sebagai manual selection saat user mengubah alokasi
    setIsManualSelection(true);
    
    setAlokasiSantri(items =>
      items.map(item => {
        if (item.id === id) {
          const updated = { ...item, [field]: value };
          // Jika mengubah nominal, update persentase juga
          if (field === 'nominal_alokasi') {
            const totalAlokasi = items.reduce((sum, alloc) => {
              const nominal = alloc.id === id ? value : alloc.nominal_alokasi;
              return sum + (nominal || 0);
            }, 0);
            const persentase = totalAlokasi > 0 ? (value / totalAlokasi) * 100 : 0;
            updated.persentase_alokasi = persentase;
          }
          return updated;
        }
        return item;
      })
    );
  };

  // Fungsi untuk mengisi nominal alokasi untuk semua santri sekaligus
  const handleSetNominalForAll = () => {
    if (alokasiSantri.length === 0) {
      toast.error('Pilih santri dulu');
      return;
    }
    setShowNominalDialog(true);
  };

  const applyBatchNominal = () => {
    // Mark sebagai manual selection saat user mengubah nominal
    setIsManualSelection(true);
    
    const nominalValue = parseFloat(batchNominal.replace(/[^\d]/g, '')) || 0;
    if (nominalValue <= 0) {
      toast.error('Nominal harus lebih dari 0');
      return;
    }
    
    const totalAlokasi = nominalValue * alokasiSantri.length;
    const persentasePerSantri = 100 / alokasiSantri.length;
    
    setAlokasiSantri(items =>
      items.map(item => ({
        ...item,
        nominal_alokasi: nominalValue,
        persentase_alokasi: persentasePerSantri,
      }))
    );
    
    setShowNominalDialog(false);
    setBatchNominal('');
    toast.success(`Nominal ${formatCurrency(nominalValue)} diisi untuk semua ${alokasiSantri.length} santri (Total: ${formatCurrency(totalAlokasi)})`);
  };

  const removeAlokasiSantri = (id: string) => {
    // Mark sebagai manual selection saat user menghapus santri
    setIsManualSelection(true);
    
    const allocation = alokasiSantri.find(a => a.id === id);
    if (allocation) {
      setSelectedSantriIds(ids => ids.filter(id => id !== allocation.santri_id));
    }
    setAlokasiSantri(items => items.filter(item => item.id !== id));
  };

  // Auto-generate alokasi dari rincian item (detail per jenis bantuan)
  const autoGenerateAllocationFromRincian = () => {
    // Mark sebagai manual selection saat user menggunakan auto-generate
    setIsManualSelection(true);
    
    if (rincianItems.length === 0) {
      toast.error('Isi rincian item dulu');
      return;
    }
    
    if (selectedSantriIds.length === 0) {
      toast.error('Pilih santri dulu');
      return;
    }

    // Get config untuk menentukan tipe alokasi
    const config = kategori ? getAlokasiConfig(kategori) : null;

    // Generate alokasi untuk setiap santri berdasarkan setiap rincian item
    const newAllocations: AlokasiSantri[] = [];
    const periode = new Date().toLocaleDateString('id-ID', { month: 'long', year: 'numeric' });
    const jumlahSantri = selectedSantriIds.length;
    
    selectedSantriIds.forEach(santriId => {
      const santri = santriOptions.find(s => s.id === santriId);
      if (!santri) return;
      
      // Untuk setiap rincian item, buat alokasi terpisah
      rincianItems.forEach(rincian => {
        // Hitung nominal per santri untuk rincian ini
        // Jika jumlah rincian = jumlah santri, berarti 1:1
        // Jika jumlah rincian berbeda, bagi rata total rincian ke semua santri
        const nominalPerSantri = rincian.jumlah === jumlahSantri 
          ? rincian.harga_satuan  // 1:1 mapping
          : rincian.total / jumlahSantri; // Bagi rata
        
        const totalRincian = rincianItems.reduce((sum, item) => sum + item.total, 0);
        const persentase = totalRincian > 0 
          ? (nominalPerSantri / totalRincian) * 100 
          : 0;

        newAllocations.push({
          id: `alloc-${santriId}-${rincian.id}-${Date.now()}-${Math.random()}`,
          santri_id: santriId,
          nama_lengkap: santri.nama_lengkap,
          id_santri: santri.id_santri || '',
          nominal_alokasi: nominalPerSantri,
          persentase_alokasi: persentase,
          jenis_bantuan: rincian.nama_item, // Gunakan nama item sebagai jenis bantuan
          periode: periode,
          keterangan: `${rincian.nama_item} - ${rincian.jumlah} ${rincian.satuan} @ ${formatCurrency(rincian.harga_satuan)}`,
          tipe_alokasi: config?.tipeAlokasi || 'pengeluaran_riil',
          alokasi_ke: config?.alokasiKe || undefined
        });
      });
    });

    // Hitung total per santri untuk validasi
    const totalPerSantri = rincianItems.reduce((sum, item) => sum + item.total, 0) / jumlahSantri;
    
    setAlokasiSantri(newAllocations);
    
    toast.success(
      `✅ Alokasi otomatis dibuat!\n` +
      `${rincianItems.length} jenis bantuan × ${jumlahSantri} santri = ${newAllocations.length} alokasi\n` +
      `Total per santri: ${formatCurrency(totalPerSantri)}`
    );
  };

  // Auto-split sederhana (total dibagi rata, tanpa detail per rincian)
  const autoSplitAllocation = () => {
    // Jika ada rincian items, gunakan total dari rincian
    // Jika tidak ada rincian items, minta input total
    const totalAmount = rincianItems.length > 0 
      ? rincianItems.reduce((sum, item) => sum + item.total, 0)
      : 0;
    
    if (totalAmount === 0 && alokasiSantri.length > 0) {
      // Jika tidak ada rincian items, gunakan total dari alokasi yang sudah ada
      const existingTotal = alokasiSantri.reduce((sum, alloc) => sum + (alloc.nominal_alokasi || 0), 0);
      if (existingTotal > 0) {
        const amountPerSantri = existingTotal / alokasiSantri.length;
        const percentagePerSantri = 100 / alokasiSantri.length;
        setAlokasiSantri(items =>
          items.map(item => ({
            ...item,
            nominal_alokasi: amountPerSantri,
            persentase_alokasi: percentagePerSantri,
          }))
        );
        return;
      }
    }
    
    if (totalAmount === 0) {
      toast.error('Tidak ada total untuk dibagi. Isi rincian item dulu atau isi nominal alokasi manual.');
      return;
    }
    
    const amountPerSantri = totalAmount / alokasiSantri.length;
    const percentagePerSantri = 100 / alokasiSantri.length;

    setAlokasiSantri(items =>
      items.map(item => ({
        ...item,
        nominal_alokasi: amountPerSantri,
        persentase_alokasi: percentagePerSantri,
      }))
    );
    
    toast.success(`Total ${formatCurrency(totalAmount)} dibagi rata ke ${alokasiSantri.length} santri (${formatCurrency(amountPerSantri)} per santri)`);
  };

  // Fungsi untuk membuat rincian item dari alokasi santri (jika user mulai dari alokasi dulu)
  const createRincianFromAllocation = () => {
    if (alokasiSantri.length === 0) {
      toast.error('Pilih santri dulu untuk membuat rincian item');
      return;
    }
    
    const totalAlokasi = alokasiSantri.reduce((sum, alloc) => sum + (alloc.nominal_alokasi || 0), 0);
    if (totalAlokasi === 0) {
      toast.error('Isi nominal alokasi dulu');
      return;
    }
    
    // Buat 1 rincian item dengan total dari alokasi
    const jenisBantuan = alokasiSantri[0]?.jenis_bantuan || subKategori || 'Bantuan Santri';
    const newItem: RincianItem = {
      id: `item-${Date.now()}`,
      nama_item: jenisBantuan,
      jumlah: alokasiSantri.length,
      satuan: 'santri',
      harga_satuan: totalAlokasi / alokasiSantri.length,
      total: totalAlokasi,
      keterangan: `Otomatis dibuat dari alokasi ${alokasiSantri.length} santri`
    };
    
    setRincianItems([newItem]);
    toast.success('Rincian item dibuat dari total alokasi santri');
  };

  const calculateTotal = () => {
    const total = rincianItems.reduce((sum, item) => {
      // Validasi dan konversi ke number
      const jumlah = typeof item.jumlah === 'string' ? parseFloat(item.jumlah) || 0 : item.jumlah;
      const hargaSatuan = typeof item.harga_satuan === 'string' ? parseFloat(item.harga_satuan) || 0 : item.harga_satuan;
      
      // Pastikan nilai positif
      const validJumlah = Math.max(0, jumlah);
      const validHargaSatuan = Math.max(0, hargaSatuan);
      const itemTotal = validJumlah * validHargaSatuan;
      
      console.log(`[DEBUG] Item: ${item.nama_item}, Jumlah: ${jumlah}->${validJumlah}, Harga: ${hargaSatuan}->${validHargaSatuan}, Total: ${itemTotal}`);
      return sum + itemTotal;
    }, 0);
    
    // Pastikan total adalah integer positif
    const validTotal = Math.max(0, Math.round(total));
    console.log(`[DEBUG] calculateTotal() result: ${total}->${validTotal}`);
    return validTotal;
  };

  const validateForm = (): string[] => {
    const errors: string[] = [];

    if (!tanggal) errors.push('Tanggal harus diisi');
    if (!kategori) errors.push('Kategori harus diisi');
    if (!akunKasId) errors.push('Akun kas harus dipilih');
    
    // Get config berdasarkan kategori
    const config = kategori ? getAlokasiConfig(kategori) : null;
    
    // Validasi rincian items
    if (rincianItems.length === 0) {
      errors.push('Minimal harus ada 1 rincian item');
    }
    
    // Validasi berdasarkan kategori
    if (config) {
      if (config.autoPost) {
        // Kategori dengan auto-post (Pesantren, Operasional & Konsumsi)
        // Tidak perlu pilih santri manual, tapi perlu rincian items
        if (alokasiSantri.length > 0) {
          errors.push(`${kategori} tidak memerlukan alokasi santri manual. Sistem akan otomatis membagi ke semua santri binaan mukim.`);
        }
      } else if (config.perluPilihSantri) {
        // Kategori yang perlu pilih santri manual (Formal, Bantuan Langsung)
        if (jenisAlokasi === 'langsung' && alokasiSantri.length === 0) {
          errors.push(`Untuk ${kategori}, pilih minimal 1 santri atau isi rincian item dulu lalu klik "Auto-Generate dari Rincian"`);
        }
      }
      // Operasional Yayasan: tidak perlu validasi alokasi santri
    }
    
    rincianItems.forEach((item, index) => {
      if (!item.nama_item) errors.push(`Rincian ${index + 1}: Nama item harus diisi`);
      if (item.jumlah <= 0) errors.push(`Rincian ${index + 1}: Jumlah harus lebih dari 0`);
      if (item.harga_satuan <= 0) errors.push(`Rincian ${index + 1}: Harga satuan harus lebih dari 0`);
    });

    // Validasi alokasi santri hanya untuk jenis alokasi "langsung"
    if (jenisAlokasi === 'langsung' && alokasiSantri.length > 0) {
      alokasiSantri.forEach((alloc, index) => {
        if (!alloc.jenis_bantuan) errors.push(`Alokasi ${index + 1}: Jenis bantuan harus diisi`);
        if (!alloc.periode) errors.push(`Alokasi ${index + 1}: Periode harus diisi`);
        if (alloc.nominal_alokasi <= 0) errors.push(`Alokasi ${index + 1}: Nominal alokasi harus lebih dari 0`);
      });
      
      // Validasi: jika ada rincian items DAN alokasi santri, total harus sama
      if (rincianItems.length > 0) {
        const totalRincian = calculateTotal();
        const totalAlokasi = alokasiSantri.reduce((sum, alloc) => sum + (alloc.nominal_alokasi || 0), 0);
        if (Math.abs(totalRincian - totalAlokasi) > 100) { // Toleransi 100 rupiah
          errors.push(`Total rincian item (${formatCurrency(totalRincian)}) harus sama dengan total alokasi santri (${formatCurrency(totalAlokasi)})`);
        }
      }
    }

    return errors;
  };

  const handleSubmit = async () => {
    const errors = validateForm();
    if (errors.length > 0) {
      errors.forEach(error => toast.error(error));
      return;
    }

    setLoading(true);
    try {
      // Debug logging untuk akun kas yang dipilih
      const selectedAkun = akunKasOptions.find(akun => akun.id === akunKasId);
      console.log('[DEBUG] FormPengeluaranRinci submit:', {
        akunKasId,
        selectedAkun: selectedAkun ? { nama: selectedAkun.nama, id: selectedAkun.id } : 'NOT FOUND',
        totalAmount: calculateTotal(),
        availableOptions: akunKasOptions.map(akun => ({ nama: akun.nama, id: akun.id, is_default: akun.is_default }))
      });

      // Hitung total: dari rincian items jika ada, atau dari alokasi santri
      const totalAmount = rincianItems.length > 0 
        ? calculateTotal() 
        : alokasiSantri.reduce((sum, alloc) => sum + (alloc.nominal_alokasi || 0), 0);
      
      // Jika tidak ada rincian items tapi ada alokasi (hanya untuk langsung), buat rincian item otomatis
      let finalRincianItems = rincianItems;
      if (rincianItems.length === 0 && alokasiSantri.length > 0 && jenisAlokasi === 'langsung') {
        const jenisBantuan = alokasiSantri[0]?.jenis_bantuan || subKategori || 'Bantuan Santri';
        finalRincianItems = [{
          id: `auto-${Date.now()}`,
          nama_item: jenisBantuan,
          jumlah: alokasiSantri.length,
          satuan: 'santri',
          harga_satuan: totalAmount / alokasiSantri.length,
          total: totalAmount,
          keterangan: `Otomatis dibuat dari alokasi ${alokasiSantri.length} santri`
        }];
      }
      
      // REVISI v2: Get config untuk menentukan alokasi
      const config = kategori ? getAlokasiConfig(kategori) : null;
      
      // REVISI v2: Alokasi hanya jika user eksplisit pilih santri (tidak ada auto-post)
      let finalAlokasiSantri = alokasiSantri;
      if (config) {
        // Hanya kategori yang perlu pilih santri yang boleh punya alokasi
        if (!config.perluPilihSantri) {
          finalAlokasiSantri = [];
        }
      } else if (jenisAlokasi === 'overhead' || jenisAlokasi === '') {
        // REVISI v2: Overhead tidak lagi digunakan untuk auto-generate
        finalAlokasiSantri = [];
      }

      // REVISI v3: Determine jenis_alokasi berdasarkan config
      // Support untuk overhead, langsung, dan tidak dialokasikan
      let finalJenisAlokasi = jenisAlokasi;
      if (config && config.defaultJenisAlokasi !== undefined) {
        // Gunakan defaultJenisAlokasi dari config jika tersedia
        finalJenisAlokasi = config.defaultJenisAlokasi;
      } else if (config) {
        // Fallback: jika tidak ada defaultJenisAlokasi, gunakan logika lama
        if (!config.perluPilihSantri) {
          finalJenisAlokasi = ''; // Tidak ada alokasi
        } else {
          finalJenisAlokasi = 'langsung'; // Hanya alokasi langsung (user pilih santri)
        }
      }

      // Determine is_pengeluaran_riil berdasarkan config
      const isPengeluaranRiil = config ? config.isPengeluaranRiil : true;

      const formData: CreateKeuanganWithDetailsData = {
        tanggal,
        kategori,
        jumlah: totalAmount,
        deskripsi: '', // REMOVED: Field catatan dihapus, deskripsi kosong
        akun_kas_id: akunKasId,
        sub_kategori: subKategori,
        penerima_pembayar: penerimaPembayar,
        jenis_alokasi: finalJenisAlokasi,
        status: 'posted',
        is_pengeluaran_riil: isPengeluaranRiil,
        rincian_items: finalRincianItems.map(item => ({
          id: item.id,
          nama_item: item.nama_item,
          jumlah: item.jumlah,
          satuan: item.satuan,
          harga_satuan: item.harga_satuan,
          total: item.total,
          keterangan: item.keterangan,
        })),
        alokasi_santri: finalAlokasiSantri.map(alloc => ({
          santri_id: alloc.santri_id,
          nominal_alokasi: alloc.nominal_alokasi,
          persentase_alokasi: alloc.persentase_alokasi,
          jenis_bantuan: alloc.jenis_bantuan,
          periode: alloc.periode,
          keterangan: alloc.keterangan,
          tipe_alokasi: alloc.tipe_alokasi || (config?.tipeAlokasi || 'pengeluaran_riil'),
          alokasi_ke: alloc.alokasi_ke || (config?.alokasiKe || undefined),
        })),
      };

      await createKeuanganWithDetails(formData);
      
      // Reset form
      setTanggal(new Date().toISOString().split('T')[0]);
      setKategori('');
      setSubKategori('');
      setPenerimaPembayar('');
      // REMOVED: setCatatan('') - field catatan sudah dihapus
      setJenisAlokasi('');
      setRincianItems([]);
      setAlokasiSantri([]);
      setSelectedSantriIds([]);
      setUseRangePeriode(false);
      setPeriodeDari('');
      setPeriodeSampai('');
      setNominalPerBulan('');
      setIsManualSelection(false);
      setLastMappingCheck(null);

      toast.success('Pengeluaran berhasil disimpan');
      onSuccess?.();
    } catch (error) {
      console.error('Error saving expense:', error);
      toast.error('Gagal menyimpan pengeluaran');
    } finally {
      setLoading(false);
    }
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('id-ID', {
      style: 'currency',
      currency: 'IDR',
      minimumFractionDigits: 0,
    }).format(amount);
  };

  // Generate bulan options (12 bulan terakhir + 12 bulan ke depan)
  const generateBulanOptions = () => {
    const options: Array<{ value: string; label: string }> = [];
    const now = new Date();
    
    // Generate dari 12 bulan lalu sampai 12 bulan ke depan
    for (let i = -12; i <= 12; i++) {
      const date = new Date(now.getFullYear(), now.getMonth() + i, 1);
      const monthYear = date.toLocaleDateString('id-ID', { month: 'long', year: 'numeric' });
      const value = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
      options.push({ value, label: monthYear });
    }
    
    return options;
  };

  // Generate list bulan dalam range
  const generateBulanInRange = (dari: string, sampai: string): string[] => {
    if (!dari || !sampai) return [];
    
    const [tahunDari, bulanDari] = dari.split('-').map(Number);
    const [tahunSampai, bulanSampai] = sampai.split('-').map(Number);
    
    const bulanList: string[] = [];
    let currentYear = tahunDari;
    let currentMonth = bulanDari;
    
    while (
      currentYear < tahunSampai || 
      (currentYear === tahunSampai && currentMonth <= bulanSampai)
    ) {
      const date = new Date(currentYear, currentMonth - 1, 1);
      const monthYear = date.toLocaleDateString('id-ID', { month: 'long', year: 'numeric' });
      bulanList.push(monthYear);
      
      currentMonth++;
      if (currentMonth > 12) {
        currentMonth = 1;
        currentYear++;
      }
    }
    
    return bulanList;
  };

  // Auto-generate alokasi untuk range periode
  const generateAlokasiRangePeriode = () => {
    if (!useRangePeriode || !periodeDari || !periodeSampai) {
      toast.error('Pilih periode dari dan sampai');
      return;
    }

    if (selectedSantriIds.length === 0) {
      toast.error('Pilih santri dulu');
      return;
    }

    const nominalValue = parseFloat(nominalPerBulan.replace(/[^\d]/g, '')) || 0;
    if (nominalValue <= 0) {
      toast.error('Nominal per bulan harus diisi');
      return;
    }

    const bulanList = generateBulanInRange(periodeDari, periodeSampai);
    if (bulanList.length === 0) {
      toast.error('Range periode tidak valid');
      return;
    }

    // Get config untuk menentukan tipe alokasi
    const config = kategori ? getAlokasiConfig(kategori) : null;
    const jenisBantuan = subKategori || 'SPP Pendidikan Formal';

    // Generate alokasi untuk setiap santri × setiap bulan
    const newAllocations: AlokasiSantri[] = [];
    
    selectedSantriIds.forEach(santriId => {
      const santri = santriOptions.find(s => s.id === santriId);
      if (!santri) return;

      bulanList.forEach(bulan => {
        newAllocations.push({
          id: `alloc-${santriId}-${bulan}-${Date.now()}-${Math.random()}`,
          santri_id: santriId,
          nama_lengkap: santri.nama_lengkap,
          id_santri: santri.id_santri || '',
          nominal_alokasi: nominalValue,
          persentase_alokasi: 0, // Akan dihitung setelah semua alokasi dibuat
          jenis_bantuan: jenisBantuan,
          periode: bulan,
          keterangan: `SPP ${bulan}`,
          tipe_alokasi: config?.tipeAlokasi || 'pengeluaran_riil',
          alokasi_ke: config?.alokasiKe || 'formal',
        });
      });
    });

    // Hitung persentase
    const totalAlokasi = newAllocations.reduce((sum, a) => sum + a.nominal_alokasi, 0);
    newAllocations.forEach(alloc => {
      alloc.persentase_alokasi = totalAlokasi > 0 ? (alloc.nominal_alokasi / totalAlokasi) * 100 : 0;
    });

    // Tambahkan ke alokasi yang sudah ada (atau replace jika kosong)
    if (alokasiSantri.length === 0) {
      setAlokasiSantri(newAllocations);
    } else {
      setAlokasiSantri([...alokasiSantri, ...newAllocations]);
    }

    const total = nominalValue * bulanList.length * selectedSantriIds.length;
    toast.success(
      `✅ Alokasi untuk ${selectedSantriIds.length} santri × ${bulanList.length} bulan = ${newAllocations.length} alokasi\n` +
      `Nominal per bulan: ${formatCurrency(nominalValue)}\n` +
      `Total: ${formatCurrency(total)}`
    );

    // Reset range form
    setUseRangePeriode(false);
    setPeriodeDari('');
    setPeriodeSampai('');
    setNominalPerBulan('');
  };

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Plus className="h-5 w-5" />
            Input Pengeluaran
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* Basic Information */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="tanggal">Tanggal *</Label>
              <Input
                id="tanggal"
                type="date"
                value={tanggal}
                onChange={(e) => setTanggal(e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="kategori">Kategori *</Label>
              <Select 
                value={kategori} 
                onValueChange={(value) => {
                  setKategori(value);
                  // Reset sub kategori saat kategori berubah
                  setSubKategori('');
                }}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Pilih kategori" />
                </SelectTrigger>
                <SelectContent>
                  {kategoriOptions.length > 0 ? (
                    kategoriOptions.map((kat) => (
                      <SelectItem key={kat.id} value={kat.nama}>
                        {kat.nama}
                      </SelectItem>
                    ))
                  ) : (
                    // Fallback untuk backward compatibility
                    <>
                      <SelectItem value="Pendidikan Pesantren">
                        Pendidikan Pesantren
                      </SelectItem>
                      <SelectItem value="Pendidikan Formal">
                        Pendidikan Formal
                      </SelectItem>
                      <SelectItem value="Operasional dan Konsumsi Santri">
                        Operasional & Konsumsi Santri
                      </SelectItem>
                      <SelectItem value="Bantuan Langsung Yayasan">
                        Bantuan Langsung Yayasan
                      </SelectItem>
                      <SelectItem value="Operasional Yayasan">
                        Operasional Yayasan
                      </SelectItem>
                      <SelectItem value="Pembangunan">
                        Pembangunan
                      </SelectItem>
                    </>
                  )}
                </SelectContent>
              </Select>
              {kategori && (() => {
                const config = getAlokasiConfig(kategori);
                return config ? (
                  <p className="text-xs text-muted-foreground mt-1">
                    {config.info}
                  </p>
                ) : null;
              })()}
            </div>
            <div className="space-y-2">
              <Label htmlFor="subKategori">Sub Kategori</Label>
              <Popover open={subKategoriOpen} onOpenChange={setSubKategoriOpen}>
                <PopoverTrigger asChild>
                  <Button
                    variant="outline"
                    role="combobox"
                    aria-expanded={subKategoriOpen}
                    className="w-full justify-between"
                  >
                    {subKategori || "Pilih atau ketik sub kategori"}
                    <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-full p-0" align="start">
                  <Command>
                    <CommandInput 
                      placeholder="Cari atau ketik sub kategori..." 
                      value={subKategoriSearch}
                      onValueChange={setSubKategoriSearch}
                    />
                    <CommandList>
                      <CommandEmpty>
                        {subKategoriSearch ? (
                          <div className="py-2 px-4">
                            <Button
                              variant="ghost"
                              className="w-full justify-start"
                              onClick={() => {
                                setSubKategori(subKategoriSearch);
                                setSubKategoriOpen(false);
                                setSubKategoriSearch('');
                              }}
                            >
                              <Plus className="mr-2 h-4 w-4" />
                              Gunakan "{subKategoriSearch}"
                            </Button>
                          </div>
                        ) : (
                          'Tidak ada sub kategori'
                        )}
                      </CommandEmpty>
                      <CommandGroup>
                        {getSubKategoriOptions(kategori).map((option) => (
                          <CommandItem
                            key={option.value}
                            value={option.value}
                            onSelect={() => {
                              if (option.isCustom && option.value === '') {
                                // Opsi "Tambah Sub Kategori Baru..." - biarkan user ketik
                                setSubKategoriOpen(false);
                                // Focus ke input manual (akan dibuat di bawah)
                              } else if (option.isCustom && option.value === 'Lain-lain') {
                                // Opsi "Lain-lain" - biarkan user ketik
                                setSubKategori('');
                                setSubKategoriOpen(false);
                              } else {
                                setSubKategori(option.value);
                                setSubKategoriOpen(false);
                                setSubKategoriSearch('');
                              }
                            }}
                          >
                            <Check
                              className={cn(
                                "mr-2 h-4 w-4",
                                subKategori === option.value ? "opacity-100" : "opacity-0"
                              )}
                            />
                            {option.label}
                          </CommandItem>
                        ))}
                      </CommandGroup>
                    </CommandList>
                  </Command>
                </PopoverContent>
              </Popover>
              {/* Input manual untuk custom sub kategori */}
              <Input
                id="subKategori"
                value={subKategori}
                onChange={(e) => setSubKategori(e.target.value)}
                placeholder="Pilih dari daftar atau ketik sub kategori manual"
                onFocus={() => setSubKategoriOpen(false)}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="akunKas">Akun Kas *</Label>
              <Select value={akunKasId} onValueChange={setAkunKasId}>
                <SelectTrigger>
                  <SelectValue placeholder="Pilih akun kas" />
                </SelectTrigger>
                <SelectContent>
                  {akunKasOptions.map(akun => (
                    <SelectItem key={akun.id} value={akun.id}>
                      {akun.nama} ({akun.kode})
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label htmlFor="penerima">Penerima Pembayar</Label>
              <Input
                id="penerima"
                value={penerimaPembayar}
                onChange={(e) => setPenerimaPembayar(e.target.value)}
                placeholder="e.g., SMA Negeri 1 Kudus"
              />
            </div>
            {/* REMOVED: Field Catatan dihapus sesuai permintaan user */}
          </div>

          {/* REVISI v2: Alokasi ke Santri - Hanya jika user eksplisit pilih santri */}
          {(() => {
            const config = kategori ? getAlokasiConfig(kategori) : null;
            
            // REVISI v2: Tidak ada lagi auto-post, hanya tampilkan info untuk kategori yang perlu pilih santri
            if (!kategori) return null;
            
            // Kategori yang tidak perlu alokasi (Operasional Yayasan, Pendidikan Pesantren)
            if (kategori === 'Operasional Yayasan') {
              return (
                <div className="bg-gray-50 dark:bg-gray-900/20 p-4 rounded-lg border border-gray-200">
                  <div className="flex items-start gap-3">
                    <div className="mt-0.5">
                      <X className="h-5 w-5 text-gray-600" />
                    </div>
                    <div className="flex-1">
                      <h4 className="font-semibold text-gray-900 dark:text-gray-100 mb-1">
                        Operasional Yayasan - Tidak Dialokasikan
                      </h4>
                      <p className="text-sm text-gray-700 dark:text-gray-300">
                        Pengeluaran ini <strong>tidak dialokasikan ke santri</strong>. 
                        Dicatat sebagai pengeluaran operasional yayasan dan akan mengurangi saldo kas.
                      </p>
                    </div>
                  </div>
                </div>
              );
            }
            
            // REVISI v2: Pendidikan Pesantren tidak otomatis dialokasikan
            if (kategori === 'Pendidikan Pesantren') {
              return (
                <div className="bg-blue-50 dark:bg-blue-900/20 p-4 rounded-lg border border-blue-200">
                  <div className="flex items-start gap-3">
                    <div className="mt-0.5">
                      <X className="h-5 w-5 text-blue-600" />
                    </div>
                    <div className="flex-1">
                      <h4 className="font-semibold text-blue-900 dark:text-blue-100 mb-1">
                        Pendidikan Pesantren - Pengeluaran Riil
                      </h4>
                      <p className="text-sm text-blue-800 dark:text-blue-200">
                        Pengeluaran ini <strong>mengurangi saldo kas</strong> dan <strong>tidak otomatis dialokasikan ke santri</strong>.
                        Alokasi ke santri hanya jika Anda secara eksplisit memilih santri.
                      </p>
                    </div>
                  </div>
                </div>
              );
            }

            // Kategori yang perlu pilih santri manual (Pendidikan Formal, Bantuan Langsung)
            if (config && config.perluPilihSantri) {
              return (
                <div className="space-y-4">
                  <div className="space-y-3">
                    <div className="flex items-center justify-between">
                      <Label className="text-base font-semibold">Alokasi ke Santri (Wajib)</Label>
                    </div>
                    
                    {config && (
                      <div className="ml-6 p-3 bg-blue-50 dark:bg-blue-900/20 rounded-lg border border-blue-200">
                        <p className="text-xs text-blue-800 dark:text-blue-200">
                          {config.info}
                        </p>
                      </div>
                    )}

                    {/* Radio button untuk alokasi langsung */}
                    <div className="space-y-3 mt-3">
                      <div className="flex items-center space-x-3">
                        <input
                          type="radio"
                          id="alokasi-langsung"
                          name="jenis_alokasi"
                          value="langsung"
                          checked={jenisAlokasi === 'langsung'}
                          onChange={(e) => setJenisAlokasi(e.target.value)}
                          className="h-4 w-4"
                        />
                        <Label htmlFor="alokasi-langsung" className="font-normal cursor-pointer">
                          Langsung untuk santri tertentu
                        </Label>
                      </div>
                    </div>

                    {/* Dropdown daftar santri untuk kategori Bantuan Langsung */}
                    {kategori === 'Bantuan Langsung Yayasan' && selectedSantriIds.length > 0 && (
                      <div className="mt-4 space-y-2">
                        <Label className="text-sm font-medium">Daftar Santri yang Memperoleh Bantuan:</Label>
                        <Select>
                          <SelectTrigger className="w-full">
                            <SelectValue placeholder={`${selectedSantriIds.length} santri dipilih`} />
                          </SelectTrigger>
                          <SelectContent>
                            {selectedSantriIds.map(santriId => {
                              const santri = santriOptions.find(s => s.id === santriId);
                              const allocations = alokasiSantri.filter(a => a.santri_id === santriId);
                              const totalPerSantri = allocations.reduce((sum, a) => sum + (a.nominal_alokasi || 0), 0);
                              return (
                                <SelectItem key={santriId} value={santriId} disabled>
                                  <div className="flex items-center justify-between w-full">
                                    <div>
                                      <div className="font-medium">{santri?.nama_lengkap || 'Tidak Diketahui'}</div>
                                      <div className="text-xs text-muted-foreground">
                                        {santri?.id_santri || ''}
                                      </div>
                                    </div>
                                    <div className="text-right ml-4">
                                      <div className="text-sm font-semibold">{formatCurrency(totalPerSantri)}</div>
                                      {allocations.length > 1 && (
                                        <div className="text-xs text-muted-foreground">
                                          {allocations.length} jenis bantuan
                                        </div>
                                      )}
                                    </div>
                                  </div>
                                </SelectItem>
                              );
                            })}
                          </SelectContent>
                        </Select>
                        <p className="text-xs text-muted-foreground">
                          Total: {selectedSantriIds.length} santri • {formatCurrency(alokasiSantri.reduce((sum, alloc) => sum + alloc.nominal_alokasi, 0))}
                        </p>
                      </div>
                    )}
                  </div>
                </div>
              );
            }
            
            return null;
          })()}

          <Separator />

          {/* Rincian Items */}
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-lg font-semibold">Rincian Item</h3>
                <p className="text-xs text-muted-foreground mt-1">
                  {jenisAlokasi === 'langsung' && alokasiSantri.length > 0 
                    ? 'Opsional - Bisa dibuat dari alokasi santri atau diisi manual'
                    : 'Wajib diisi untuk detail pengeluaran'}
                </p>
              </div>
              <div className="flex gap-2">
                {jenisAlokasi === 'langsung' && alokasiSantri.length > 0 && rincianItems.length === 0 && (
                  <Button variant="outline" size="sm" onClick={createRincianFromAllocation}>
                    <Calculator className="h-4 w-4 mr-2" />
                    Buat dari Alokasi
                  </Button>
                )}
                <Button variant="outline" size="sm" onClick={addRincianItem}>
                  <Plus className="h-4 w-4 mr-2" />
                  Tambah Item
                </Button>
              </div>
            </div>

            {rincianItems.map((item, index) => (
              <Card key={item.id} className="p-4">
                <div className="grid grid-cols-1 md:grid-cols-6 gap-4 items-end">
                  <div className="space-y-2">
                    <Label>Nama Item *</Label>
                    <Input
                      value={item.nama_item}
                      onChange={(e) => updateRincianItem(item.id, 'nama_item', e.target.value)}
                      placeholder="e.g., Beras IR64"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>Jumlah *</Label>
                    <Input
                      type="number"
                      value={item.jumlah}
                      onChange={(e) => updateRincianItem(item.id, 'jumlah', parseFloat(e.target.value) || 0)}
                      min="0"
                      step="0.01"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>Satuan</Label>
                    <Input
                      value={item.satuan}
                      onChange={(e) => updateRincianItem(item.id, 'satuan', e.target.value)}
                      placeholder="kg, liter, unit"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>Harga Satuan *</Label>
                    <Input
                      type="number"
                      value={item.harga_satuan}
                      onChange={(e) => updateRincianItem(item.id, 'harga_satuan', parseFloat(e.target.value) || 0)}
                      min="0"
                      step="100"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>Total</Label>
                    <div className="p-2 bg-muted rounded-md text-sm font-medium">
                      {formatCurrency(item.total)}
                    </div>
                  </div>
                  <div className="space-y-2">
                    <Button
                      variant="destructive"
                      size="sm"
                      onClick={() => removeRincianItem(item.id)}
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
                <div className="mt-2">
                  <Input
                    value={item.keterangan || ''}
                    onChange={(e) => updateRincianItem(item.id, 'keterangan', e.target.value)}
                    placeholder="Keterangan item (opsional)"
                  />
                </div>
              </Card>
            ))}

            {rincianItems.length > 0 && (
              <div className="flex justify-end">
                <Badge variant="outline" className="text-lg px-4 py-2">
                  Total: {formatCurrency(calculateTotal())}
                </Badge>
              </div>
            )}
          </div>

          <Separator />

          {/* Alokasi Santri - Tampil berdasarkan config kategori */}
          {(() => {
            const config = kategori ? getAlokasiConfig(kategori) : null;
            const perluTampilkanAlokasi = config && config.perluPilihSantri && !config.autoPost;
            
            if (!perluTampilkanAlokasi) return null;

            return (
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <div>
                    <h3 className="text-lg font-semibold">
                      Alokasi Santri (Wajib)
                    </h3>
                    <p className="text-xs text-muted-foreground mt-1">
                      Isi rincian item dulu (SPP, Buku, dll), lalu pilih santri dan klik "Auto-Generate" untuk membuat alokasi detail per jenis bantuan.
                    </p>
                  </div>
              <div className="flex gap-2 flex-wrap">
                {selectedSantriIds.length > 0 && rincianItems.length > 0 && (
                  <Button 
                    variant="default" 
                    size="sm" 
                    onClick={autoGenerateAllocationFromRincian}
                    className="bg-green-600 hover:bg-green-700 text-white"
                  >
                    <Calculator className="h-4 w-4 mr-2" />
                    Auto-Generate dari Rincian
                  </Button>
                )}
                {selectedSantriIds.length > 0 && kategori === 'Pendidikan Formal' && (
                  <Button 
                    variant="default" 
                    size="sm" 
                    onClick={() => setUseRangePeriode(!useRangePeriode)}
                    className="bg-sky-600 hover:bg-sky-700 text-white"
                  >
                    <Calendar className="h-4 w-4 mr-2" />
                    {useRangePeriode ? 'Batal Range Periode' : 'Bayar Range Periode'}
                  </Button>
                )}
                {alokasiSantri.length > 0 && (
                  <>
                    <Button variant="outline" size="sm" onClick={handleSetNominalForAll}>
                      <Calculator className="h-4 w-4 mr-2" />
                      Isi Nominal Semua
                    </Button>
                    {rincianItems.length > 0 && (
                      <Button variant="outline" size="sm" onClick={autoSplitAllocation}>
                        <Calculator className="h-4 w-4 mr-2" />
                        Bagi Rata Total
                      </Button>
                    )}
                  </>
                )}
                <Button 
                  variant="outline" 
                  size="sm" 
                  onClick={() => setShowSantriPicker(!showSantriPicker)}
                >
                  <Users className="h-4 w-4 mr-2" />
                  Pilih Santri
                </Button>
              </div>
            </div>

            {/* Range Periode Section */}
            {useRangePeriode && kategori === 'Pendidikan Formal' && (
              <Card className="mb-4 border-sky-200 bg-sky-50">
                <CardHeader className="pb-3">
                  <CardTitle className="text-base flex items-center gap-2">
                    <Calendar className="h-4 w-4 text-sky-600" />
                    Bayar SPP untuk Range Periode
                  </CardTitle>
                  <p className="text-xs text-muted-foreground mt-1">
                    Pilih periode dari dan sampai, lalu isi nominal per bulan. Sistem akan otomatis membuat alokasi untuk semua bulan dalam range.
                  </p>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label>Dari Periode</Label>
                      <Select value={periodeDari} onValueChange={setPeriodeDari}>
                        <SelectTrigger>
                          <SelectValue placeholder="Pilih bulan awal" />
                        </SelectTrigger>
                        <SelectContent>
                          {generateBulanOptions().map(option => (
                            <SelectItem 
                              key={option.value} 
                              value={option.value}
                              disabled={periodeSampai ? option.value > periodeSampai : false}
                            >
                              {option.label}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="space-y-2">
                      <Label>Sampai Periode</Label>
                      <Select value={periodeSampai} onValueChange={setPeriodeSampai}>
                        <SelectTrigger>
                          <SelectValue placeholder="Pilih bulan akhir" />
                        </SelectTrigger>
                        <SelectContent>
                          {generateBulanOptions().map(option => (
                            <SelectItem 
                              key={option.value} 
                              value={option.value}
                              disabled={periodeDari ? option.value < periodeDari : false}
                            >
                              {option.label}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                  </div>
                  
                  <div className="space-y-2">
                    <Label>Nominal per Bulan</Label>
                    <Input
                      type="text"
                      value={nominalPerBulan}
                      onChange={(e) => {
                        const value = e.target.value.replace(/[^\d]/g, '');
                        setNominalPerBulan(value);
                      }}
                      placeholder="Contoh: 650000"
                      className="text-lg"
                    />
                    {nominalPerBulan && periodeDari && periodeSampai && (
                      <div className="p-3 bg-white rounded-md border border-sky-200">
                        <div className="space-y-1 text-sm">
                          <div className="flex justify-between">
                            <span className="text-muted-foreground">Periode yang akan dibuat:</span>
                            <span className="font-semibold">{generateBulanInRange(periodeDari, periodeSampai).length} bulan</span>
                          </div>
                          <div className="flex justify-between">
                            <span className="text-muted-foreground">Santri yang dipilih:</span>
                            <span className="font-semibold">{selectedSantriIds.length} santri</span>
                          </div>
                          <div className="flex justify-between">
                            <span className="text-muted-foreground">Nominal per bulan:</span>
                            <span className="font-semibold">{formatCurrency(parseFloat(nominalPerBulan) || 0)}</span>
                          </div>
                          <div className="pt-2 border-t border-sky-200 flex justify-between">
                            <span className="font-semibold">Total Alokasi:</span>
                            <span className="font-bold text-sky-700 text-lg">
                              {formatCurrency(
                                (parseFloat(nominalPerBulan) || 0) * 
                                generateBulanInRange(periodeDari, periodeSampai).length * 
                                selectedSantriIds.length
                              )}
                            </span>
                          </div>
                          {periodeDari && periodeSampai && (
                            <div className="pt-2 border-t border-sky-200">
                              <p className="text-xs text-muted-foreground mb-1">Bulan yang akan dibuat:</p>
                              <p className="text-xs font-medium">
                                {generateBulanInRange(periodeDari, periodeSampai).join(', ')}
                              </p>
                            </div>
                          )}
                        </div>
                      </div>
                    )}
                  </div>

                  <div className="flex gap-2">
                    <Button
                      variant="default"
                      size="sm"
                      onClick={generateAlokasiRangePeriode}
                      disabled={!periodeDari || !periodeSampai || !nominalPerBulan || selectedSantriIds.length === 0}
                      className="bg-sky-600 hover:bg-sky-700 text-white"
                    >
                      <Calculator className="h-4 w-4 mr-2" />
                      Generate Alokasi untuk Range Periode
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => {
                        setUseRangePeriode(false);
                        setPeriodeDari('');
                        setPeriodeSampai('');
                        setNominalPerBulan('');
                      }}
                    >
                      Batal
                    </Button>
                  </div>
                </CardContent>
              </Card>
            )}

            {/* Santri Picker */}
            {showSantriPicker && (
              <Card className="mb-4">
                <CardContent className="pt-4">
                  {/* Search & Filter Bar */}
                  <div className="flex gap-2 mb-3">
                    <Input
                      placeholder="Cari nama atau ID santri..."
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                      className="flex-1"
                    />
                    <Select value={programFilter} onValueChange={(v) => setProgramFilter(v as any)}>
                      <SelectTrigger className="w-40">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="all">Semua</SelectItem>
                        <SelectItem value="Mukim">Mukim</SelectItem>
                        <SelectItem value="Non-Mukim">Non-Mukim</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  {/* Santri List */}
                  <div className="max-h-64 overflow-y-auto border rounded-md">
                    {santriOptions
                      .filter(santri => {
                        // Filter by search
                        const matchSearch = !searchQuery || 
                          santri.nama_lengkap?.toLowerCase().includes(searchQuery.toLowerCase()) ||
                          santri.id_santri?.toLowerCase().includes(searchQuery.toLowerCase());
                        
                        // Filter by program
                        const matchProgram = programFilter === 'all' || 
                          santri.program?.includes(programFilter);
                        
                        // Filter already selected
                        const notSelected = !selectedSantriIds.includes(santri.id);
                        
                        return matchSearch && matchProgram && notSelected;
                      })
                      .map(santri => (
                        <button
                          key={santri.id}
                          type="button"
                          className="w-full px-4 py-3 text-left hover:bg-accent border-b last:border-0 transition-colors"
                          onClick={() => addSantriToAllocation(santri.id)}
                        >
                          <div className="flex justify-between items-center">
                            <div>
                              <div className="font-medium">{santri.nama_lengkap}</div>
                              <div className="text-sm text-muted-foreground">
                                {santri.id_santri}
                                {santri.program && ` • ${santri.program}`}
                              </div>
                            </div>
                            <Plus className="h-4 w-4 text-muted-foreground" />
                          </div>
                        </button>
                      ))}
                  </div>

                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    className="w-full mt-2"
                    onClick={() => setShowSantriPicker(false)}
                  >
                    <X className="h-4 w-4 mr-2" />
                    Tutup
                  </Button>
                </CardContent>
              </Card>
            )}

            {/* Alokasi List */}
            {/* Group alokasi by santri untuk tampilan yang lebih rapi */}
            {(() => {
              // Group alokasi by santri_id
              const groupedBySantri: { [key: string]: AlokasiSantri[] } = {};
              alokasiSantri.forEach(alloc => {
                if (!groupedBySantri[alloc.santri_id]) {
                  groupedBySantri[alloc.santri_id] = [];
                }
                groupedBySantri[alloc.santri_id].push(alloc);
              });

              return Object.entries(groupedBySantri).map(([santriId, allocations]) => {
                const firstAlloc = allocations[0];
                const totalPerSantri = allocations.reduce((sum, a) => sum + (a.nominal_alokasi || 0), 0);
                
                return (
                  <Card key={santriId} className="p-4 border-l-4 border-l-blue-500">
                    <div className="mb-3 pb-2 border-b">
                      <div className="flex items-center justify-between">
                        <div>
                          <div className="font-semibold text-lg">{firstAlloc.nama_lengkap}</div>
                          <div className="text-xs text-muted-foreground">
                            ID Santri: {santriOptions.find(s => s.id === santriId)?.id_santri || firstAlloc.id_santri || ''}
                          </div>
                        </div>
                        <div className="text-right">
                          <div className="text-xs text-muted-foreground">Total Alokasi</div>
                          <div className="font-bold text-blue-600">{formatCurrency(totalPerSantri)}</div>
                        </div>
                      </div>
                    </div>
                    
                    <div className="space-y-2">
                      {allocations.map((alloc, idx) => (
                        <div key={alloc.id} className="grid grid-cols-1 md:grid-cols-5 gap-3 p-3 bg-muted/50 rounded-md">
                          <div className="space-y-1">
                            <Label className="text-xs">Jenis Bantuan</Label>
                            <Input
                              value={alloc.jenis_bantuan}
                              onChange={(e) => updateAlokasiSantri(alloc.id, 'jenis_bantuan', e.target.value)}
                              placeholder="e.g., SPP SMA"
                              className="h-8 text-sm"
                            />
                          </div>
                          <div className="space-y-1">
                            <Label className="text-xs">Periode</Label>
                            <Input
                              value={alloc.periode}
                              onChange={(e) => updateAlokasiSantri(alloc.id, 'periode', e.target.value)}
                              placeholder="e.g., Januari 2025"
                              className="h-8 text-sm"
                            />
                          </div>
                          <div className="space-y-1">
                            <Label className="text-xs">Nominal</Label>
                            <Input
                              type="number"
                              value={alloc.nominal_alokasi}
                              onChange={(e) => updateAlokasiSantri(alloc.id, 'nominal_alokasi', parseFloat(e.target.value) || 0)}
                              min="0"
                              step="100"
                              className="h-8 text-sm"
                            />
                            <div className="text-xs text-muted-foreground">
                              {formatCurrency(alloc.nominal_alokasi)}
                            </div>
                          </div>
                          <div className="space-y-1">
                            <Label className="text-xs">Keterangan</Label>
                            <Input
                              value={alloc.keterangan || ''}
                              onChange={(e) => updateAlokasiSantri(alloc.id, 'keterangan', e.target.value)}
                              placeholder="Opsional"
                              className="h-8 text-sm"
                            />
                          </div>
                          <div className="flex items-end">
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => removeAlokasiSantri(alloc.id)}
                              className="text-red-600 hover:text-red-700"
                            >
                              <Trash2 className="h-4 w-4" />
                            </Button>
                          </div>
                        </div>
                      ))}
                    </div>
                  </Card>
                );
              });
            })()}

            {alokasiSantri.length > 0 && (
              <div className="flex justify-end">
                <Badge variant="outline" className="text-lg px-4 py-2">
                  Total Alokasi: {formatCurrency(alokasiSantri.reduce((sum, alloc) => sum + alloc.nominal_alokasi, 0))}
                </Badge>
              </div>
            )}
          </div>
            );
          })()}
          
          {/* REVISI v2: Info untuk kategori - tidak ada lagi auto-post */}
          {/* REMOVED: Auto-post info section - tidak sesuai spec v2 */}

          <Separator />

          {/* Dialog untuk mengisi nominal batch */}
          <Dialog open={showNominalDialog} onOpenChange={setShowNominalDialog}>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Isi Nominal Alokasi untuk Semua Santri</DialogTitle>
              </DialogHeader>
              <div className="space-y-4 py-4">
                <div>
                  <Label>Nominal per Santri</Label>
                  <Input
                    type="text"
                    value={batchNominal}
                    onChange={(e) => {
                      const value = e.target.value.replace(/[^\d]/g, '');
                      setBatchNominal(value);
                    }}
                    placeholder="Contoh: 650000"
                    className="text-lg"
                  />
                  {batchNominal && (
                    <p className="text-sm text-muted-foreground mt-2">
                      {formatCurrency(parseFloat(batchNominal) || 0)} × {alokasiSantri.length} santri = {formatCurrency((parseFloat(batchNominal) || 0) * alokasiSantri.length)}
                    </p>
                  )}
                </div>
                <div className="bg-blue-50 p-3 rounded-lg">
                  <p className="text-sm text-blue-900">
                    Nominal ini akan diisi untuk semua <strong>{alokasiSantri.length} santri</strong> yang sudah dipilih.
                  </p>
                </div>
              </div>
              <DialogFooter>
                <Button variant="outline" onClick={() => {
                  setShowNominalDialog(false);
                  setBatchNominal('');
                }}>
                  Batal
                </Button>
                <Button onClick={applyBatchNominal} disabled={!batchNominal || parseFloat(batchNominal) <= 0}>
                  Terapkan
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>

          {/* Submit Button */}
          <div className="flex justify-end space-x-2">
            <Button variant="outline" disabled={loading}>
              Batal
            </Button>
            <Button onClick={handleSubmit} disabled={loading}>
              {loading ? (
                <>
                  <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                  Menyimpan...
                </>
              ) : (
                <>
                  <Save className="h-4 w-4 mr-2" />
                  Simpan Pengeluaran
                </>
              )}
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default FormPengeluaranRinci;

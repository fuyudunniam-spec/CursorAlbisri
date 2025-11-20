import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { 
  Plus, 
  Trash2, 
  Users, 
  Calculator,
  Save,
  X
} from 'lucide-react';
import { supabase } from '../integrations/supabase/client';
import { AkunKasService, AkunKas } from '../services/akunKas.service';
import { AlokasiPengeluaranService } from '../services/alokasiPengeluaran.service';
import { toast } from 'sonner';

interface CreateKeuanganWithDetailsData {
  tanggal: string;
  kategori: string;
  sub_kategori: string;
  akun_kas_id: string;
  penerima_pembayar: string;
  deskripsi: string;
  jumlah: number;
  jenis_alokasi: string;
  rincian_items: RincianItem[];
  alokasi_santri: any[];
}

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
    status: 'posted'
  });

  // Create main transaction
  const { data: keuangan, error: keuanganError } = await supabase
    .from('keuangan')
    .insert({
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
    })
    .select()
    .single();
  
  if (keuanganError) {
    console.error('[DEBUG] keuanganError:', keuanganError);
    throw keuanganError;
  }
  
      console.log('[DEBUG] keuangan created successfully:', keuangan);
      
      // Ensure saldo akun kas is correct after transaction (per-account)
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
  
  // Create alokasi santri
  if (data.alokasi_santri.length > 0) {
    console.log('Alokasi santri data:', data.alokasi_santri);
    
    const alokasiData = data.alokasi_santri.map(item => ({
      keuangan_id: keuangan.id,
      santri_id: item.santri_id,
      nominal_alokasi: item.nominal_alokasi || item.jumlah || 0,
      jenis_bantuan: item.jenis_bantuan || 'Bantuan Langsung',
      persentase_alokasi: item.persentase_alokasi || 0,
      periode: item.periode || new Date().toLocaleDateString('id-ID', { month: 'long', year: 'numeric' }),
      keterangan: item.keterangan || ''
    }));
    
    console.log('Mapped alokasi data:', alokasiData);
    
    const { error: alokasiError } = await supabase
      .from('alokasi_pengeluaran_santri')
      .insert(alokasiData);
    
    if (alokasiError) throw alokasiError;
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
  nisn: string;
  nominal_alokasi: number;
  persentase_alokasi: number;
  jenis_bantuan: string;
  periode: string;
  keterangan?: string;
}

interface SantriOption {
  id: string;
  nama_lengkap: string;
  nisn: string;
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

  // UI state
  const [loading, setLoading] = useState(false);
  const [showSantriPicker, setShowSantriPicker] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [programFilter, setProgramFilter] = useState<'all' | 'Mukim' | 'Non-Mukim'>('all');

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

    const newAllocation: AlokasiSantri = {
      id: `alloc-${Date.now()}`,
      santri_id: santriId,
      nama_lengkap: santri.nama_lengkap,
      nisn: santri.nisn,
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
    setAlokasiSantri(items =>
      items.map(item => {
        if (item.id === id) {
          return { ...item, [field]: value };
        }
        return item;
      })
    );
  };

  const removeAlokasiSantri = (id: string) => {
    const allocation = alokasiSantri.find(a => a.id === id);
    if (allocation) {
      setSelectedSantriIds(ids => ids.filter(id => id !== allocation.santri_id));
    }
    setAlokasiSantri(items => items.filter(item => item.id !== id));
  };

  const autoSplitAllocation = () => {
    const totalAmount = rincianItems.reduce((sum, item) => sum + item.total, 0);
    const amountPerSantri = totalAmount / alokasiSantri.length;
    const percentagePerSantri = 100 / alokasiSantri.length;

    setAlokasiSantri(items =>
      items.map(item => ({
        ...item,
        nominal_alokasi: amountPerSantri,
        persentase_alokasi: percentagePerSantri,
      }))
    );
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
    if (rincianItems.length === 0) errors.push('Minimal harus ada 1 rincian item');
    
    rincianItems.forEach((item, index) => {
      if (!item.nama_item) errors.push(`Rincian ${index + 1}: Nama item harus diisi`);
      if (item.jumlah <= 0) errors.push(`Rincian ${index + 1}: Jumlah harus lebih dari 0`);
      if (item.harga_satuan <= 0) errors.push(`Rincian ${index + 1}: Harga satuan harus lebih dari 0`);
    });

    if (alokasiSantri.length > 0) {
      alokasiSantri.forEach((alloc, index) => {
        if (!alloc.jenis_bantuan) errors.push(`Alokasi ${index + 1}: Jenis bantuan harus diisi`);
        if (!alloc.periode) errors.push(`Alokasi ${index + 1}: Periode harus diisi`);
        if (alloc.nominal_alokasi <= 0) errors.push(`Alokasi ${index + 1}: Nominal alokasi harus lebih dari 0`);
      });
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

      const formData: CreateKeuanganWithDetailsData = {
        tanggal,
        jenis_transaksi: 'Pengeluaran',
        kategori,
        jumlah: calculateTotal(),
        deskripsi: catatan,
        akun_kas_id: akunKasId,
        sub_kategori: subKategori,
        penerima_pembayar: penerimaPembayar,
        jenis_alokasi: jenisAlokasi,
        status: 'posted',
        rincian_items: rincianItems.map(item => ({
          nama_item: item.nama_item,
          jumlah: item.jumlah,
          satuan: item.satuan,
          harga_satuan: item.harga_satuan,
          keterangan: item.keterangan,
        })),
        alokasi_santri: alokasiSantri.map(alloc => ({
          santri_id: alloc.santri_id,
          nominal_alokasi: alloc.nominal_alokasi,
          persentase_alokasi: alloc.persentase_alokasi,
          jenis_bantuan: alloc.jenis_bantuan,
          periode: alloc.periode,
          keterangan: alloc.keterangan,
        })),
      };

      await createKeuanganWithDetails(formData);
      
      // Reset form
      setTanggal(new Date().toISOString().split('T')[0]);
      setKategori('');
      setSubKategori('');
      setPenerimaPembayar('');
      setCatatan('');
      setJenisAlokasi('');
      setRincianItems([]);
      setAlokasiSantri([]);
      setSelectedSantriIds([]);

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

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Plus className="h-5 w-5" />
            Input Pengeluaran dengan Rincian & Alokasi Santri
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
              <Select value={kategori} onValueChange={setKategori}>
                <SelectTrigger>
                  <SelectValue placeholder="Pilih kategori" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="Kebutuhan Santri Bantuan">Kebutuhan Santri Bantuan</SelectItem>
                  <SelectItem value="Gaji Karyawan">Gaji Karyawan</SelectItem>
                  <SelectItem value="Utilitas">Utilitas</SelectItem>
                  <SelectItem value="Operasional">Operasional</SelectItem>
                  <SelectItem value="Maintenance">Maintenance</SelectItem>
                  <SelectItem value="Lainnya">Lainnya</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label htmlFor="subKategori">Sub Kategori</Label>
              <Input
                id="subKategori"
                value={subKategori}
                onChange={(e) => setSubKategori(e.target.value)}
                placeholder="e.g., SPP Formal, Konsumsi, Buku"
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
            <div className="space-y-2">
              <Label htmlFor="catatan">Catatan</Label>
              <Textarea
                id="catatan"
                value={catatan}
                onChange={(e) => setCatatan(e.target.value)}
                placeholder="Catatan tambahan..."
                rows={2}
              />
            </div>
          </div>

          {/* Alokasi ke Santri */}
          <div className="space-y-4">
            <div className="space-y-3">
              <Label className="text-base font-semibold">Alokasi ke Santri</Label>
              <div className="space-y-3">
                <div className="flex items-center space-x-3">
                  <input
                    type="radio"
                    id="alokasi-none"
                    name="jenis_alokasi"
                    value=""
                    checked={jenisAlokasi === ''}
                    onChange={(e) => setJenisAlokasi(e.target.value)}
                    className="h-4 w-4"
                  />
                  <Label htmlFor="alokasi-none" className="font-normal cursor-pointer">
                    Tidak dialokasikan (Operasional kantor, dll)
                  </Label>
                </div>
                
                <div className="flex items-center space-x-3">
                  <input
                    type="radio"
                    id="alokasi-overhead"
                    name="jenis_alokasi"
                    value="overhead"
                    checked={jenisAlokasi === 'overhead'}
                    onChange={(e) => setJenisAlokasi(e.target.value)}
                    className="h-4 w-4"
                  />
                  <Label htmlFor="alokasi-overhead" className="font-normal cursor-pointer">
                    Overhead - Dibagi ke semua santri binaan mukim
                  </Label>
                </div>
                
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
              
              {jenisAlokasi === 'langsung' && (
                <div className="ml-6 p-4 bg-blue-50 dark:bg-blue-900/20 rounded-lg">
                  <Label className="text-sm font-medium text-blue-900 dark:text-blue-100">
                    Pilih Santri untuk Alokasi Langsung
                  </Label>
                  <p className="text-xs text-blue-700 dark:text-blue-300 mt-1">
                    Gunakan bagian "Alokasi Santri" di bawah untuk memilih santri spesifik
                  </p>
                </div>
              )}
            </div>
          </div>

          <Separator />

          {/* Rincian Items */}
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="text-lg font-semibold">Rincian Item</h3>
              <Button variant="outline" size="sm" onClick={addRincianItem}>
                <Plus className="h-4 w-4 mr-2" />
                Tambah Item
              </Button>
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

          {/* Alokasi Santri */}
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="text-lg font-semibold">Alokasi Santri (Opsional)</h3>
              <div className="flex gap-2">
                {alokasiSantri.length > 0 && (
                  <Button variant="outline" size="sm" onClick={autoSplitAllocation}>
                    <Calculator className="h-4 w-4 mr-2" />
                    Auto-Split
                  </Button>
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
            {alokasiSantri.map((alloc, index) => (
              <Card key={alloc.id} className="p-4">
                <div className="grid grid-cols-1 md:grid-cols-6 gap-4 items-end">
                  <div className="space-y-2">
                    <Label>Santri</Label>
                    <div className="p-2 bg-muted rounded-md text-sm">
                      <div className="font-medium">{alloc.nama_lengkap}</div>
                      <div className="text-xs text-muted-foreground">
                        ID: {santriOptions.find(s => s.id === alloc.santri_id)?.id_santri || alloc.nisn}
                      </div>
                    </div>
                  </div>
                  <div className="space-y-2">
                    <Label>Jenis Bantuan *</Label>
                    <Input
                      value={alloc.jenis_bantuan}
                      onChange={(e) => updateAlokasiSantri(alloc.id, 'jenis_bantuan', e.target.value)}
                      placeholder="e.g., SPP SMA, Konsumsi"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>Periode *</Label>
                    <Input
                      value={alloc.periode}
                      onChange={(e) => updateAlokasiSantri(alloc.id, 'periode', e.target.value)}
                      placeholder="e.g., Oktober 2025"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>Nominal Alokasi *</Label>
                    <Input
                      type="number"
                      value={alloc.nominal_alokasi}
                      onChange={(e) => updateAlokasiSantri(alloc.id, 'nominal_alokasi', parseFloat(e.target.value) || 0)}
                      min="0"
                      step="100"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>Persentase</Label>
                    <div className="p-2 bg-muted rounded-md text-sm">
                      {alloc.persentase_alokasi.toFixed(2)}%
                    </div>
                  </div>
                  <div className="space-y-2">
                    <Button
                      variant="destructive"
                      size="sm"
                      onClick={() => removeAlokasiSantri(alloc.id)}
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
                <div className="mt-2">
                  <Input
                    value={alloc.keterangan || ''}
                    onChange={(e) => updateAlokasiSantri(alloc.id, 'keterangan', e.target.value)}
                    placeholder="Keterangan alokasi (opsional)"
                  />
                </div>
              </Card>
            ))}

            {alokasiSantri.length > 0 && (
              <div className="flex justify-end">
                <Badge variant="outline" className="text-lg px-4 py-2">
                  Total Alokasi: {formatCurrency(alokasiSantri.reduce((sum, alloc) => sum + alloc.nominal_alokasi, 0))}
                </Badge>
              </div>
            )}
          </div>

          <Separator />

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

import React, { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Separator } from '@/components/ui/separator';
import { Badge } from '@/components/ui/badge';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { X, Save, Plus, Trash2, Users, Eye } from 'lucide-react';
import { toast } from 'sonner';
import { supabase } from '../integrations/supabase/client';
import { AkunKasService, AkunKas } from '../services/akunKas.service';
import { AlokasiPengeluaranService, AlokasiPengeluaranSantri } from '../services/alokasiPengeluaran.service';

// Helper functions to replace KeuanganService
const updateTransaction = async (id: string, data: any) => {
  const { error } = await supabase
    .from('keuangan')
    .update(data)
    .eq('id', id);
  
  if (error) throw error;
  
  // Ensure saldo akun kas is correct after update (per-account)
  try {
    // Prioritaskan akun_kas_id terbaru bila ada di data, kalau tidak ambil dari transaksi existing (fetch singkat)
    let targetAkunId = data?.akun_kas_id;
    if (!targetAkunId) {
      const { data: currentTx } = await supabase
        .from('keuangan')
        .select('akun_kas_id')
        .eq('id', id)
        .single();
      targetAkunId = currentTx?.akun_kas_id;
    }
    if (targetAkunId) {
      const { error: saldoError } = await supabase.rpc('ensure_akun_kas_saldo_correct_for', { p_akun_id: targetAkunId });
      if (saldoError) {
        // Failed to ensure saldo correct, but transaction update already succeeded
      }
    }
  } catch (saldoErr) {
    // Error ensuring saldo correct, but transaction update already succeeded
  }
};

const getRincianPengeluaran = async (keuanganId: string) => {
  const { data, error } = await supabase
    .from('rincian_pengeluaran')
    .select('*')
    .eq('keuangan_id', keuanganId);
  
  if (error) throw error;
  return data || [];
};

const deleteRincianPengeluaran = async (id: string) => {
  const { error } = await supabase
    .from('rincian_pengeluaran')
    .delete()
    .eq('id', id);
  
  if (error) throw error;
};

const createRincianPengeluaran = async (data: any) => {
  const { error } = await supabase
    .from('rincian_pengeluaran')
    .insert(data);
  
  if (error) throw error;
};

interface TransactionEditModalProps {
  transaction: any;
  isOpen: boolean;
  onClose: () => void;
  onSuccess?: () => void;
}

interface RincianItem {
  id?: string;
  nama_item: string;
  jumlah: number;
  satuan: string;
  harga_satuan: number;
  total: number;
  keterangan?: string;
}

const TransactionEditModal: React.FC<TransactionEditModalProps> = ({
  transaction,
  isOpen,
  onClose,
  onSuccess
}) => {
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  
  // Form data
  const [formData, setFormData] = useState({
    tanggal: '',
    kategori: '',
    sub_kategori: '',
    akun_kas_id: '',
    penerima_pembayar: '',
    deskripsi: '',
    jumlah: 0,
    jenis_alokasi: ''
  });

  // Rincian items
  const [rincianItems, setRincianItems] = useState<RincianItem[]>([]);
  
  // Options
  const [akunKasOptions, setAkunKasOptions] = useState<AkunKas[]>([]);
  
  // Alokasi santri (untuk transaksi dengan alokasi khusus)
  const [alokasiSantri, setAlokasiSantri] = useState<Array<AlokasiPengeluaranSantri & { santri?: { nama_lengkap?: string; id_santri?: string; nisn?: string } }>>([]);
  const [loadingAlokasi, setLoadingAlokasi] = useState(false);
  const [editingAlokasi, setEditingAlokasi] = useState<{ [key: string]: any }>({});

  // Load initial data
  useEffect(() => {
    if (transaction && isOpen) {
      loadInitialData();
    } else if (!isOpen) {
      // Reset state when dialog is closed
      setAlokasiSantri([]);
      setLoadingAlokasi(false);
      setEditingAlokasi({});
    }
  }, [transaction, isOpen]);

  // Auto-set kategori Pembangunan ketika akun kas pembangunan dipilih
  useEffect(() => {
    if (formData.akun_kas_id) {
      const selectedAkun = akunKasOptions.find(akun => akun.id === formData.akun_kas_id);
      if (selectedAkun && selectedAkun.nama.toLowerCase().includes('pembangunan')) {
        // Auto-set kategori ke Pembangunan
        if (formData.kategori !== 'Pembangunan') {
          setFormData(prev => ({ ...prev, kategori: 'Pembangunan' }));
        }
        // Auto-set sub_kategori jika belum ada atau tidak valid
        if (!formData.sub_kategori || (formData.sub_kategori !== 'Material' && formData.sub_kategori !== 'Gaji Karyawan')) {
          setFormData(prev => ({ ...prev, sub_kategori: 'Material' })); // Default ke Material
        }
      }
    }
  }, [formData.akun_kas_id, akunKasOptions]);

  // Reset sub_kategori when kategori changes
  useEffect(() => {
    if (!formData.kategori) return;
    
    if (formData.kategori === 'Operasional dan Konsumsi Santri') {
      // Jika sub_kategori tidak valid, reset ke kosong
      if (formData.sub_kategori && formData.sub_kategori !== 'Konsumsi' && formData.sub_kategori !== 'Operasional') {
        setFormData(prev => ({ ...prev, sub_kategori: '' }));
      }
    } else if (formData.kategori === 'Operasional Yayasan') {
      // Jika sub_kategori tidak valid, reset ke kosong
      const validSubKategori = ['Gaji & Honor', 'Utilitas', 'Maintenance', 'Administrasi', 'Lain-lain'];
      if (formData.sub_kategori && !validSubKategori.includes(formData.sub_kategori)) {
        setFormData(prev => ({ ...prev, sub_kategori: '' }));
      }
    } else if (formData.kategori === 'Pembangunan') {
      // Jika sub_kategori tidak valid untuk Pembangunan, reset ke Material
      if (formData.sub_kategori && formData.sub_kategori !== 'Material' && formData.sub_kategori !== 'Gaji Karyawan') {
        setFormData(prev => ({ ...prev, sub_kategori: 'Material' }));
      }
    } else {
      // Untuk kategori lain, reset sub_kategori jika sebelumnya adalah dropdown value
      const dropdownValues = ['Konsumsi', 'Operasional', 'Gaji & Honor', 'Utilitas', 'Maintenance', 'Administrasi', 'Lain-lain', 'Material', 'Gaji Karyawan'];
      if (dropdownValues.includes(formData.sub_kategori)) {
        setFormData(prev => ({ ...prev, sub_kategori: '' }));
      }
    }
  }, [formData.kategori]);

  const loadInitialData = async () => {
    try {
      setLoading(true);
      
      // Load akun kas options dan rincian items secara paralel untuk performa lebih baik
      // Only load rincian for Pengeluaran
      const isPemasukan = transaction.jenis_transaksi === 'Pemasukan';
      const [accounts, rincianData] = await Promise.all([
        AkunKasService.getActive(),
        isPemasukan ? Promise.resolve([]) : getRincianPengeluaran(transaction.id).catch(() => []) // Jika error atau pemasukan, return empty array
      ]);
      
      // Filter akun yang dikelola modul Tabungan
      const filtered = (accounts || []).filter((a: any) => a?.managed_by !== 'tabungan');
      setAkunKasOptions(filtered as any);
      

      // Set form data from transaction
      const jenisAlokasi = transaction.jenis_alokasi || 'none';
      setFormData({
        tanggal: transaction.tanggal || '',
        kategori: transaction.kategori || '',
        sub_kategori: transaction.sub_kategori || '',
        akun_kas_id: transaction.akun_kas_id || '',
        penerima_pembayar: transaction.penerima_pembayar || '',
        deskripsi: transaction.deskripsi || '',
        jumlah: transaction.jumlah || 0,
        jenis_alokasi: jenisAlokasi
      });
      
      // Load alokasi santri jika jenis alokasi adalah 'langsung'
      // Jangan load alokasi untuk kategori "Operasional Yayasan" karena tidak dialokasikan ke santri
      if (!isPemasukan && jenisAlokasi === 'langsung' && transaction.kategori !== 'Operasional Yayasan') {
        await loadAlokasiSantri(transaction.id);
      } else if (transaction.kategori === 'Operasional Yayasan') {
        // Pastikan tidak ada alokasi untuk Operasional Yayasan
        setAlokasiSantri([]);
      }

      // Set rincian items - only for Pengeluaran
      if (!isPemasukan) {
        if (rincianData && rincianData.length > 0) {
          // Gunakan rincian dari database
          setRincianItems(rincianData.map((item: any) => ({
            id: item.id,
            nama_item: item.nama_item || '',
            jumlah: item.jumlah || 1,
            satuan: item.satuan || 'unit',
            harga_satuan: item.harga_satuan || 0,
            total: item.total || (item.jumlah || 1) * (item.harga_satuan || 0),
            keterangan: item.keterangan || ''
          })));
        } else if (transaction.rincian_items && transaction.rincian_items.length > 0) {
          // Fallback ke rincian_items dari props jika ada
          setRincianItems(transaction.rincian_items);
        } else {
          // Create default rincian item - gunakan deskripsi atau kosong, BUKAN kategori
          setRincianItems([{
            nama_item: transaction.deskripsi || '', // Gunakan deskripsi, bukan kategori
            jumlah: 1,
            satuan: 'unit',
            harga_satuan: transaction.jumlah || 0,
            total: transaction.jumlah || 0,
            keterangan: ''
          }]);
        }
      } else {
        // For Pemasukan, no rincian items needed
        setRincianItems([]);
      }
    } catch (error) {
      toast.error('Gagal memuat data transaksi');
    } finally {
      setLoading(false);
    }
  };

  const handleInputChange = (field: string, value: any) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  const handleRincianChange = (index: number, field: string, value: any) => {
    const updatedItems = [...rincianItems];
    updatedItems[index] = { ...updatedItems[index], [field]: value };
    
    // Recalculate total
    if (field === 'jumlah' || field === 'harga_satuan') {
      updatedItems[index].total = updatedItems[index].jumlah * updatedItems[index].harga_satuan;
    }
    
    setRincianItems(updatedItems);
    
    // Update total amount
    const totalAmount = updatedItems.reduce((sum, item) => sum + item.total, 0);
    setFormData(prev => ({ ...prev, jumlah: totalAmount }));
  };

  const addRincianItem = () => {
    setRincianItems(prev => [...prev, {
      nama_item: '',
      jumlah: 1,
      satuan: 'unit',
      harga_satuan: 0,
      total: 0,
      keterangan: ''
    }]);
  };

  const removeRincianItem = (index: number) => {
    if (rincianItems.length > 1) {
      setRincianItems(prev => prev.filter((_, i) => i !== index));
    }
  };

  const handleSave = async () => {
    try {
      setSaving(true);

      // Validate form
      if (!formData.tanggal || !formData.kategori || !formData.akun_kas_id) {
        toast.error('Mohon lengkapi semua field yang wajib diisi');
        return;
      }

      // Only validate rincian items for Pengeluaran
      if (!isPemasukan && rincianItems.length === 0) {
        toast.error('Minimal harus ada 1 item rincian');
        return;
      }

      // Jika kategori diubah menjadi "Operasional Yayasan", hapus semua alokasi yang ada
      // karena kategori ini tidak dialokasikan ke santri
      if (formData.kategori === 'Operasional Yayasan') {
        // Hapus semua alokasi untuk transaksi ini
        const { error: deleteAlokasiError } = await supabase
          .from('alokasi_pengeluaran_santri')
          .delete()
          .eq('keuangan_id', transaction.id);
        
        if (deleteAlokasiError) {
          // Failed to delete alokasi, but main update already succeeded
        }
      }

      // Update transaction
      await updateTransaction(transaction.id, {
        tanggal: formData.tanggal,
        kategori: formData.kategori,
        sub_kategori: formData.sub_kategori,
        akun_kas_id: formData.akun_kas_id,
        penerima_pembayar: formData.penerima_pembayar,
        deskripsi: formData.deskripsi,
        jumlah: formData.jumlah,
        jenis_alokasi: formData.kategori === 'Operasional Yayasan' ? null : (formData.jenis_alokasi === 'none' ? null : formData.jenis_alokasi)
      });

      // Update rincian items (only for Pengeluaran)
      if (!isPemasukan && rincianItems.length > 0) {
        // Get existing rincian items
        const existingRincian = await getRincianPengeluaran(transaction.id);
        const existingIds = new Set(existingRincian.map((item: any) => item.id));
        const newItems = rincianItems.filter(item => !item.id || !existingIds.has(item.id));
        const updatedItems = rincianItems.filter(item => item.id && existingIds.has(item.id));
        const deletedIds = existingRincian
          .map((item: any) => item.id)
          .filter((id: string) => !rincianItems.some(item => item.id === id));
        
        // Delete removed items
        for (const id of deletedIds) {
          await deleteRincianPengeluaran(id);
        }
        
        // Update existing items
        for (const item of updatedItems) {
          if (item.id) {
            const { error } = await supabase
              .from('rincian_pengeluaran')
              .update({
                nama_item: item.nama_item,
                jumlah: item.jumlah,
                satuan: item.satuan,
                harga_satuan: item.harga_satuan,
                keterangan: item.keterangan
              })
              .eq('id', item.id);
            
            if (error) throw error;
          }
        }
        
        // Create new items
        for (const item of newItems) {
          await createRincianPengeluaran({
            keuangan_id: transaction.id,
            nama_item: item.nama_item,
            jumlah: item.jumlah,
            satuan: item.satuan,
            harga_satuan: item.harga_satuan,
            keterangan: item.keterangan
            // total tidak perlu di-insert karena generated column
          });
        }
      } else {
        // Jika tidak ada rincian items, hapus semua yang ada
        const existingRincian = await getRincianPengeluaran(transaction.id);
        for (const item of existingRincian) {
          await deleteRincianPengeluaran(item.id);
        }
      }

      toast.success('Transaksi berhasil diperbarui');
      onSuccess?.();
      onClose();
    } catch (error) {
      toast.error('Gagal memperbarui transaksi');
    } finally {
      setSaving(false);
    }
  };

  const loadAlokasiSantri = async (keuanganId: string) => {
    try {
      setLoadingAlokasi(true);
      const allocations = await AlokasiPengeluaranService.getByKeuanganId(keuanganId);
      
      // Load santri data for each allocation
      const allocationsWithSantri = await Promise.all(
        allocations.map(async (alloc) => {
          try {
            const { data: santriData } = await supabase
              .from('santri')
              .select('nama_lengkap, id_santri')
              .eq('id', alloc.santri_id)
              .single();
            
            return {
              ...alloc,
              santri: santriData || undefined
            };
          } catch (error) {
            return alloc;
          }
        })
      );
      
      setAlokasiSantri(allocationsWithSantri);
      // Initialize editing state
      const editState: { [key: string]: any } = {};
      allocationsWithSantri.forEach(alloc => {
        if (alloc.id) {
          editState[alloc.id] = {
            nominal_alokasi: alloc.nominal_alokasi,
            jenis_bantuan: alloc.jenis_bantuan,
            periode: alloc.periode,
            keterangan: alloc.keterangan || ''
          };
        }
      });
      setEditingAlokasi(editState);
    } catch (error) {
      // Error loading alokasi santri - handled silently
      toast.error('Gagal memuat data alokasi santri');
    } finally {
      setLoadingAlokasi(false);
    }
  };

  const handleAlokasiChange = (alokasiId: string, field: string, value: any) => {
    setEditingAlokasi(prev => ({
      ...prev,
      [alokasiId]: {
        ...prev[alokasiId],
        [field]: value
      }
    }));
  };

  const handleSaveAlokasi = async () => {
    try {
      setSaving(true);
      
      // Update each alokasi
      for (const [alokasiId, changes] of Object.entries(editingAlokasi)) {
        if (changes && Object.keys(changes).length > 0) {
          await AlokasiPengeluaranService.update(alokasiId, changes);
        }
      }
      
      // Reload alokasi to reflect changes
      await loadAlokasiSantri(transaction.id);
      
      toast.success('Alokasi santri berhasil diperbarui');
    } catch (error) {
      toast.error('Gagal memperbarui alokasi santri');
    } finally {
      setSaving(false);
    }
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('id-ID', {
      style: 'currency',
      currency: 'IDR',
      minimumFractionDigits: 0,
    }).format(amount);
  };

  if (!transaction) return null;

  // Determine transaction type
  const isPemasukan = transaction.jenis_transaksi === 'Pemasukan';
  
  // Kategori options based on transaction type
  const kategoriPemasukan = [
    'Bunga Bank',
    'Hibah/Bantuan',
    'Lain-lain (Pemasukan)',
    'Pemasukan Lainnya'
  ];
  
  const kategoriPengeluaran = [
    'Pendidikan Pesantren',
    'Pendidikan Formal',
    'Operasional dan Konsumsi Santri',
    'Bantuan Langsung Yayasan',
    'Operasional Yayasan',
    'Pembangunan'
  ];

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Save className="h-5 w-5" />
            Edit {isPemasukan ? 'Pemasukan' : 'Pengeluaran'}
          </DialogTitle>
        </DialogHeader>

        {loading ? (
          <div className="flex items-center justify-center py-8">
            <div className="text-center">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto mb-4"></div>
              <p className="text-muted-foreground">Memuat data transaksi...</p>
            </div>
          </div>
        ) : (
          <div className="space-y-6">
            {/* Basic Information */}
            <Card>
              <CardHeader>
                <CardTitle className="text-lg">Informasi Dasar</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <Label htmlFor="tanggal">Tanggal *</Label>
                    <Input
                      id="tanggal"
                      type="date"
                      value={formData.tanggal}
                      onChange={(e) => handleInputChange('tanggal', e.target.value)}
                    />
                  </div>
                  
                  <div>
                    <Label htmlFor="kategori">Kategori *</Label>
                    <Select value={formData.kategori} onValueChange={(value) => handleInputChange('kategori', value)}>
                      <SelectTrigger>
                        <SelectValue placeholder="Pilih kategori" />
                      </SelectTrigger>
                      <SelectContent>
                        {isPemasukan ? (
                          // Kategori untuk Pemasukan
                          kategoriPemasukan.map(kat => (
                            <SelectItem key={kat} value={kat}>{kat}</SelectItem>
                          ))
                        ) : (
                          // Kategori untuk Pengeluaran
                          kategoriPengeluaran.map(kat => (
                            <SelectItem key={kat} value={kat}>{kat}</SelectItem>
                          ))
                        )}
                      </SelectContent>
                    </Select>
                  </div>
                  
                  <div>
                    <Label htmlFor="sub_kategori">Sub Kategori</Label>
                    {!isPemasukan && formData.kategori === 'Operasional dan Konsumsi Santri' ? (
                      <Select value={formData.sub_kategori} onValueChange={(value) => handleInputChange('sub_kategori', value)}>
                        <SelectTrigger>
                          <SelectValue placeholder="Pilih sub kategori" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="Konsumsi">Konsumsi</SelectItem>
                          <SelectItem value="Operasional">Operasional</SelectItem>
                        </SelectContent>
                      </Select>
                    ) : !isPemasukan && formData.kategori === 'Operasional Yayasan' ? (
                      <Select value={formData.sub_kategori} onValueChange={(value) => handleInputChange('sub_kategori', value)}>
                        <SelectTrigger>
                          <SelectValue placeholder="Pilih sub kategori" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="Gaji & Honor">Gaji & Honor</SelectItem>
                          <SelectItem value="Utilitas">Utilitas</SelectItem>
                          <SelectItem value="Maintenance">Maintenance</SelectItem>
                          <SelectItem value="Administrasi">Administrasi</SelectItem>
                          <SelectItem value="Lain-lain">Lain-lain</SelectItem>
                        </SelectContent>
                      </Select>
                    ) : !isPemasukan && formData.kategori === 'Pembangunan' ? (
                      <Select value={formData.sub_kategori} onValueChange={(value) => handleInputChange('sub_kategori', value)}>
                        <SelectTrigger>
                          <SelectValue placeholder="Pilih sub kategori" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="Material">Material</SelectItem>
                          <SelectItem value="Gaji Karyawan">Gaji Karyawan</SelectItem>
                        </SelectContent>
                      </Select>
                    ) : (
                      <Input
                        id="sub_kategori"
                        value={formData.sub_kategori}
                        onChange={(e) => handleInputChange('sub_kategori', e.target.value)}
                        placeholder={isPemasukan ? "Contoh: Bunga Bank" : "e.g., SPP Formal, Konsumsi, Buku"}
                      />
                    )}
                  </div>
                  
                  <div>
                    <Label htmlFor="akun_kas">Akun Kas *</Label>
                    <Select value={formData.akun_kas_id} onValueChange={(value) => handleInputChange('akun_kas_id', value)}>
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
                  
                  {!isPemasukan && (
                    <div>
                      <Label htmlFor="jenis_alokasi">Alokasi ke Santri</Label>
                      <Select 
                        value={formData.jenis_alokasi || 'none'} 
                        onValueChange={async (value) => {
                          handleInputChange('jenis_alokasi', value);
                          // Load alokasi santri jika jenis alokasi adalah 'langsung'
                          if (value === 'langsung') {
                            await loadAlokasiSantri(transaction.id);
                          } else {
                            setAlokasiSantri([]);
                          }
                        }}
                      >
                        <SelectTrigger>
                          <SelectValue placeholder="Pilih jenis alokasi" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="none">Tidak dialokasikan</SelectItem>
                          <SelectItem value="overhead">Overhead - Dibagi ke semua santri binaan mukim</SelectItem>
                          <SelectItem value="langsung">Langsung untuk santri tertentu</SelectItem>
                        </SelectContent>
                      </Select>
                      <p className="text-xs text-muted-foreground mt-1">
                        Pilih bagaimana pengeluaran ini dialokasikan ke santri
                      </p>
                    </div>
                  )}
                  
                  <div>
                    <Label htmlFor="penerima_pembayar">{isPemasukan ? 'Penerima/Pemberi' : 'Penerima/Pembayar'}</Label>
                    <Input
                      id="penerima_pembayar"
                      value={formData.penerima_pembayar}
                      onChange={(e) => handleInputChange('penerima_pembayar', e.target.value)}
                      placeholder={isPemasukan ? "e.g., Bank BCA, Pemerintah Daerah" : "Nama penerima atau pembayar"}
                    />
                  </div>
                  
                  <div>
                    <Label htmlFor="jumlah">Total Jumlah</Label>
                    <Input
                      id="jumlah"
                      type="number"
                      value={formData.jumlah}
                      onChange={(e) => handleInputChange('jumlah', Number(e.target.value))}
                      placeholder="0"
                    />
                    <p className="text-sm text-muted-foreground mt-1">
                      {formatCurrency(formData.jumlah)}
                    </p>
                  </div>
                </div>
                
                <div>
                  <Label htmlFor="deskripsi">Deskripsi</Label>
                  <Textarea
                    id="deskripsi"
                    value={formData.deskripsi}
                    onChange={(e) => handleInputChange('deskripsi', e.target.value)}
                    placeholder="Deskripsi tambahan..."
                    rows={3}
                  />
                </div>
              </CardContent>
            </Card>

            {/* Rincian Items - Only show for Pengeluaran */}
            {!isPemasukan && (
              <Card>
                <CardHeader>
                  <div className="flex items-center justify-between">
                    <CardTitle className="text-lg">Rincian Item</CardTitle>
                    <Button onClick={addRincianItem} size="sm">
                      <Plus className="h-4 w-4 mr-2" />
                      Tambah Item
                    </Button>
                  </div>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    {rincianItems.map((item, index) => (
                      <div key={index} className="border rounded-lg p-4">
                        <div className="flex items-center justify-between mb-4">
                          <h4 className="font-medium">Item {index + 1}</h4>
                          {rincianItems.length > 1 && (
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => removeRincianItem(index)}
                              className="text-red-600 hover:text-red-700"
                            >
                              <Trash2 className="h-4 w-4" />
                            </Button>
                          )}
                        </div>
                        
                        <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
                          <div>
                            <Label>Nama Item</Label>
                            <Input
                              value={item.nama_item}
                              onChange={(e) => handleRincianChange(index, 'nama_item', e.target.value)}
                              placeholder="Nama item"
                            />
                          </div>
                          
                          <div>
                            <Label>Jumlah</Label>
                            <Input
                              type="number"
                              value={item.jumlah}
                              onChange={(e) => handleRincianChange(index, 'jumlah', Number(e.target.value))}
                              placeholder="0"
                            />
                          </div>
                          
                          <div>
                            <Label>Satuan</Label>
                            <Input
                              value={item.satuan}
                              onChange={(e) => handleRincianChange(index, 'satuan', e.target.value)}
                              placeholder="unit"
                            />
                          </div>
                          
                          <div>
                            <Label>Harga Satuan</Label>
                            <Input
                              type="number"
                              value={item.harga_satuan}
                              onChange={(e) => handleRincianChange(index, 'harga_satuan', Number(e.target.value))}
                              placeholder="0"
                            />
                          </div>
                          
                          <div>
                            <Label>Total</Label>
                            <Input
                              type="number"
                              value={item.total}
                              readOnly
                              className="bg-gray-50"
                            />
                            <p className="text-sm text-muted-foreground mt-1">
                              {formatCurrency(item.total)}
                            </p>
                          </div>
                        </div>
                        
                        <div className="mt-4">
                          <Label>Keterangan</Label>
                          <Input
                            value={item.keterangan || ''}
                            onChange={(e) => handleRincianChange(index, 'keterangan', e.target.value)}
                            placeholder="Keterangan item"
                          />
                        </div>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            )}

            {/* Distribusi Bantuan ke Santri - Only show for Pengeluaran with alokasi langsung */}
            {!isPemasukan && (formData.jenis_alokasi === 'langsung' || transaction.jenis_alokasi === 'langsung') && (
              <Card>
                <CardHeader>
                  <div className="flex items-center justify-between">
                    <CardTitle className="text-lg flex items-center gap-2">
                      <Users className="h-5 w-5" />
                      Distribusi Bantuan ke Santri
                    </CardTitle>
                    <div className="flex gap-2">
                      <Button 
                        variant="outline" 
                        size="sm"
                        onClick={() => loadAlokasiSantri(transaction.id)}
                        disabled={loadingAlokasi || saving}
                      >
                        <Eye className="h-4 w-4 mr-2" />
                        {loadingAlokasi ? 'Memuat...' : 'Refresh'}
                      </Button>
                      {alokasiSantri.length > 0 && Object.keys(editingAlokasi).length > 0 && (
                        <Button 
                          variant="default" 
                          size="sm"
                          onClick={handleSaveAlokasi}
                          disabled={saving || loadingAlokasi}
                        >
                          <Save className="h-4 w-4 mr-2" />
                          {saving ? 'Menyimpan...' : 'Simpan Perubahan'}
                        </Button>
                      )}
                    </div>
                  </div>
                </CardHeader>
                <CardContent>
                  {loadingAlokasi ? (
                    <div className="flex items-center justify-center py-8">
                      <div className="text-center">
                        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto mb-4"></div>
                        <p className="text-muted-foreground">Memuat data distribusi...</p>
                      </div>
                    </div>
                  ) : alokasiSantri.length === 0 ? (
                    <div className="text-center py-8 text-muted-foreground">
                      <Users className="w-12 h-12 mx-auto mb-4 opacity-50" />
                      <p>Belum ada distribusi bantuan ke santri</p>
                      <p className="text-xs mt-2">Distribusi bantuan akan ditampilkan di sini setelah dialokasikan</p>
                    </div>
                  ) : (
                    <div className="space-y-4">
                      <div className="bg-blue-50 p-3 rounded-lg">
                        <div className="flex items-center justify-between">
                          <span className="text-sm font-medium text-blue-900">
                            Total Santri: {alokasiSantri.length}
                          </span>
                          <span className="text-sm font-semibold text-blue-700">
                            Total Alokasi: {formatCurrency(
                              alokasiSantri.reduce((sum, alloc) => {
                                const editData = editingAlokasi[alloc.id || ''];
                                const nominal = editData?.nominal_alokasi !== undefined 
                                  ? editData.nominal_alokasi 
                                  : alloc.nominal_alokasi || 0;
                                return sum + nominal;
                              }, 0)
                            )}
                          </span>
                        </div>
                      </div>
                      
                      <div className="overflow-x-auto">
                        <Table>
                          <TableHeader>
                            <TableRow>
                              <TableHead>No</TableHead>
                              <TableHead>Nama Santri</TableHead>
                              <TableHead>ID Santri</TableHead>
                              <TableHead>Jenis Bantuan</TableHead>
                              <TableHead>Periode</TableHead>
                              <TableHead className="text-right">Nominal Alokasi</TableHead>
                              <TableHead className="text-right">Persentase</TableHead>
                            </TableRow>
                          </TableHeader>
                          <TableBody>
                            {alokasiSantri.map((alloc, index) => {
                              const editData = editingAlokasi[alloc.id || ''] || {};
                              const nominal = editData.nominal_alokasi !== undefined 
                                ? editData.nominal_alokasi 
                                : alloc.nominal_alokasi || 0;
                              const jenisBantuan = editData.jenis_bantuan !== undefined 
                                ? editData.jenis_bantuan 
                                : alloc.jenis_bantuan || '';
                              const periode = editData.periode !== undefined 
                                ? editData.periode 
                                : alloc.periode || '';
                              const keterangan = editData.keterangan !== undefined 
                                ? editData.keterangan 
                                : alloc.keterangan || '';
                              
                              return (
                                <TableRow key={alloc.id || index}>
                                  <TableCell className="font-medium">{index + 1}</TableCell>
                                  <TableCell>
                                    <div>
                                      <p className="font-medium">
                                        {alloc.santri?.nama_lengkap || 'Santri tidak ditemukan'}
                                      </p>
                                    </div>
                                  </TableCell>
                                  <TableCell>
                                    <Badge variant="outline" className="font-mono text-xs">
                                      {alloc.santri?.id_santri || '-'}
                                    </Badge>
                                  </TableCell>
                                  <TableCell>
                                    <Input
                                      value={jenisBantuan}
                                      onChange={(e) => handleAlokasiChange(alloc.id || '', 'jenis_bantuan', e.target.value)}
                                      className="h-8 text-xs"
                                      placeholder="Jenis bantuan"
                                    />
                                  </TableCell>
                                  <TableCell>
                                    <Input
                                      value={periode}
                                      onChange={(e) => handleAlokasiChange(alloc.id || '', 'periode', e.target.value)}
                                      className="h-8 text-xs"
                                      placeholder="Periode"
                                    />
                                  </TableCell>
                                  <TableCell className="text-right">
                                    <Input
                                      type="number"
                                      value={nominal}
                                      onChange={(e) => handleAlokasiChange(alloc.id || '', 'nominal_alokasi', parseFloat(e.target.value) || 0)}
                                      className="h-8 text-right font-semibold text-blue-600"
                                      min="0"
                                      step="1000"
                                    />
                                    <p className="text-xs text-muted-foreground mt-1">
                                      {formatCurrency(nominal)}
                                    </p>
                                  </TableCell>
                                  <TableCell className="text-right">
                                    <span className="text-sm">
                                      {alloc.persentase_alokasi ? `${alloc.persentase_alokasi.toFixed(2)}%` : '-'}
                                    </span>
                                  </TableCell>
                                </TableRow>
                              );
                            })}
                          </TableBody>
                        </Table>
                      </div>
                      
                      {/* Keterangan untuk setiap alokasi */}
                      {alokasiSantri.length > 0 && (
                        <div className="space-y-2 mt-4">
                          <Label className="text-sm font-medium">Keterangan Alokasi</Label>
                          {alokasiSantri.map((alloc, index) => {
                            const editData = editingAlokasi[alloc.id || ''] || {};
                            const keterangan = editData.keterangan !== undefined 
                              ? editData.keterangan 
                              : alloc.keterangan || '';
                            
                            return (
                              <div key={alloc.id || index} className="space-y-1">
                                <div className="flex items-center gap-2">
                                  <span className="text-xs text-muted-foreground w-32 truncate">
                                    {alloc.santri?.nama_lengkap || `Santri ${index + 1}`}:
                                  </span>
                                  <Input
                                    value={keterangan}
                                    onChange={(e) => handleAlokasiChange(alloc.id || '', 'keterangan', e.target.value)}
                                    className="h-8 text-xs"
                                    placeholder="Keterangan (opsional)"
                                  />
                                </div>
                              </div>
                            );
                          })}
                        </div>
                      )}
                    </div>
                  )}
                </CardContent>
              </Card>
            )}
          </div>
        )}

        {/* Action Buttons */}
        <div className="flex justify-end space-x-2 pt-4 border-t">
          <Button variant="outline" onClick={onClose} disabled={saving}>
            <X className="h-4 w-4 mr-2" />
            Batal
          </Button>
          <Button onClick={handleSave} disabled={saving || loading}>
            <Save className="h-4 w-4 mr-2" />
            {saving ? 'Menyimpan...' : 'Simpan Perubahan'}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default TransactionEditModal;

import React, { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Separator } from '@/components/ui/separator';
import { X, Save, Plus, Trash2 } from 'lucide-react';
import { toast } from 'sonner';
import { supabase } from '../integrations/supabase/client';
import { AkunKasService, AkunKas } from '../services/akunKas.service';

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
        console.warn('[DEBUG] Warning ensuring saldo correct after update (per-account):', saldoError);
      } else {
        console.log('[DEBUG] Saldo akun kas ensured correct after update (per-account)');
      }
    }
  } catch (saldoErr) {
    console.warn('[DEBUG] Error ensuring saldo correct after update (per-account):', saldoErr);
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

  // Load initial data
  useEffect(() => {
    if (transaction && isOpen) {
      loadInitialData();
    }
  }, [transaction, isOpen]);

  const loadInitialData = async () => {
    try {
      setLoading(true);
      
      // Load akun kas options dan sembunyikan akun yang dikelola modul Tabungan
      const accounts = await AkunKasService.getActive();
      const filtered = (accounts || []).filter((a: any) => a?.managed_by !== 'tabungan');
      setAkunKasOptions(filtered as any);

      // Set form data from transaction
      setFormData({
        tanggal: transaction.tanggal || '',
        kategori: transaction.kategori || '',
        sub_kategori: transaction.sub_kategori || '',
        akun_kas_id: transaction.akun_kas_id || '',
        penerima_pembayar: transaction.penerima_pembayar || '',
        deskripsi: transaction.deskripsi || '',
        jumlah: transaction.jumlah || 0,
        jenis_alokasi: transaction.jenis_alokasi || 'none'
      });

      // Set rincian items if any
      if (transaction.rincian_items && transaction.rincian_items.length > 0) {
        setRincianItems(transaction.rincian_items);
      } else {
        // Create default rincian item
        setRincianItems([{
          nama_item: transaction.kategori || '',
          jumlah: 1,
          satuan: 'unit',
          harga_satuan: transaction.jumlah || 0,
          total: transaction.jumlah || 0,
          keterangan: transaction.deskripsi || ''
        }]);
      }
    } catch (error) {
      console.error('Error loading initial data:', error);
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

      if (rincianItems.length === 0) {
        toast.error('Minimal harus ada 1 item rincian');
        return;
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
        jenis_alokasi: formData.jenis_alokasi === 'none' ? null : formData.jenis_alokasi
      });

      // Update rincian items (if any)
      if (rincianItems.length > 0) {
        // Delete existing rincian items
        const existingRincian = await getRincianPengeluaran(transaction.id);
        for (const item of existingRincian) {
          await deleteRincianPengeluaran(item.id);
        }
        
        // Create new rincian items
        for (const item of rincianItems) {
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
      }

      toast.success('Transaksi berhasil diperbarui');
      onSuccess?.();
      onClose();
    } catch (error) {
      console.error('Error updating transaction:', error);
      toast.error('Gagal memperbarui transaksi');
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

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Save className="h-5 w-5" />
            Edit Transaksi
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
                    <Input
                      id="kategori"
                      value={formData.kategori}
                      onChange={(e) => handleInputChange('kategori', e.target.value)}
                      placeholder="Contoh: Operasional"
                    />
                  </div>
                  
                  <div>
                    <Label htmlFor="sub_kategori">Sub Kategori</Label>
                    <Input
                      id="sub_kategori"
                      value={formData.sub_kategori}
                      onChange={(e) => handleInputChange('sub_kategori', e.target.value)}
                      placeholder="Contoh: Listrik"
                    />
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
                  
                  <div>
                    <Label htmlFor="jenis_alokasi">Alokasi ke Santri</Label>
                    <Select value={formData.jenis_alokasi} onValueChange={(value) => handleInputChange('jenis_alokasi', value)}>
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
                  
                  <div>
                    <Label htmlFor="penerima_pembayar">Penerima/Pembayar</Label>
                    <Input
                      id="penerima_pembayar"
                      value={formData.penerima_pembayar}
                      onChange={(e) => handleInputChange('penerima_pembayar', e.target.value)}
                      placeholder="Nama penerima atau pembayar"
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

            {/* Rincian Items */}
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

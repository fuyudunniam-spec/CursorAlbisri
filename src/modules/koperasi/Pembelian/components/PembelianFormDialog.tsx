import { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { Plus, Trash2, ShoppingCart, Package, DollarSign, Truck, Tag, AlertCircle } from 'lucide-react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { Card, CardContent } from '@/components/ui/card';
import { Alert, AlertDescription } from '@/components/ui/alert';

interface PembelianFormDialogProps {
  open: boolean;
  onClose: () => void;
}

interface ItemPembelian {
  barang_id: string;
  nama_barang: string;
  satuan: string;
  jumlah: number;
  harga_satuan: number;
  subtotal: number;
}

export default function PembelianFormDialog({ open, onClose }: PembelianFormDialogProps) {
  const queryClient = useQueryClient();
  const [formData, setFormData] = useState({
    supplier_id: '',
    nomor_faktur: '',
    tanggal: new Date().toISOString().split('T')[0],
    status_pembayaran: 'lunas',
    jatuh_tempo: '',
    ongkir: 0,
    diskon: 0,
    catatan: '',
  });
  const [items, setItems] = useState<ItemPembelian[]>([]);
  const [selectedBarang, setSelectedBarang] = useState('');
  const [errors, setErrors] = useState<Record<string, string>>({});

  // Fetch suppliers
  const { data: suppliers = [] } = useQuery({
    queryKey: ['koperasi-suppliers'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('kop_supplier')
        .select('*')
        .order('nama');
      if (error) throw error;
      return data;
    },
    enabled: open,
  });

  // Fetch barang
  const { data: barangList = [] } = useQuery({
    queryKey: ['koperasi-barang-list'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('kop_barang')
        .select('id, kode_barang, nama_barang, harga_beli, satuan_dasar, stok_saat_ini')
        .eq('is_active', true)
        .order('nama_barang');
      if (error) throw error;
      return data;
    },
    enabled: open,
  });

  const saveMutation = useMutation({
    mutationFn: async (data: any) => {
      // Generate nomor faktur if empty
      if (!data.nomor_faktur) {
        const timestamp = Date.now().toString().slice(-6);
        data.nomor_faktur = `PB-${timestamp}`;
      }

      // Calculate totals
      const subtotal = items.reduce((sum, item) => sum + item.subtotal, 0);
      const total = subtotal + Number(data.ongkir) - Number(data.diskon);
      
      // Determine payment amounts
      let totalBayar = 0;
      let sisaHutang = 0;
      
      if (data.status_pembayaran === 'lunas') {
        totalBayar = total;
        sisaHutang = 0;
      } else {
        totalBayar = 0;
        sisaHutang = total;
      }

      // Insert pembelian header
      const { data: pembelian, error: pembelianError } = await supabase
        .from('kop_pembelian')
        .insert({
          ...data,
          total_pembelian: total,
          total_bayar: totalBayar,
          sisa_hutang: sisaHutang,
          status: 'completed',
        })
        .select()
        .single();

      if (pembelianError) throw pembelianError;

      // Insert pembelian details
      const details = items.map(item => ({
        pembelian_id: pembelian.id,
        barang_id: item.barang_id,
        jumlah: item.jumlah,
        harga_satuan_beli: item.harga_satuan,
        subtotal: item.subtotal,
      }));

      const { error: detailError } = await supabase
        .from('kop_pembelian_detail')
        .insert(details);

      if (detailError) throw detailError;

      return pembelian;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['koperasi-pembelian'] });
      queryClient.invalidateQueries({ queryKey: ['koperasi-hutang-list'] });
      toast.success('Pembelian berhasil disimpan');
      onClose();
    },
    onError: (error: any) => {
      toast.error(error.message || 'Gagal menyimpan pembelian');
    },
  });

  const handleAddItem = () => {
    if (!selectedBarang) {
      toast.error('Pilih barang terlebih dahulu');
      return;
    }

    const barang = barangList.find((b: any) => b.id === selectedBarang);
    if (!barang) return;

    const existingItem = items.find(item => item.barang_id === selectedBarang);
    if (existingItem) {
      toast.error('Barang sudah ditambahkan');
      return;
    }

    const hargaBeli = Number(barang.harga_beli || 0);
    setItems([...items, {
      barang_id: barang.id,
      nama_barang: barang.nama_barang,
      satuan: barang.satuan_dasar || 'pcs',
      jumlah: 1,
      harga_satuan: hargaBeli,
      subtotal: hargaBeli,
    }]);
    setSelectedBarang('');
  };

  const handleUpdateItem = (index: number, field: string, value: any) => {
    const newItems = [...items];
    newItems[index] = { ...newItems[index], [field]: value };
    
    if (field === 'jumlah' || field === 'harga_satuan') {
      newItems[index].subtotal = newItems[index].jumlah * newItems[index].harga_satuan;
    }
    
    setItems(newItems);
  };

  const handleRemoveItem = (index: number) => {
    setItems(items.filter((_, i) => i !== index));
  };

  const validateForm = (): boolean => {
    const newErrors: Record<string, string> = {};

    if (!formData.supplier_id) {
      newErrors.supplier_id = 'Supplier harus dipilih';
    }

    if (!formData.tanggal) {
      newErrors.tanggal = 'Tanggal harus diisi';
    }

    if (items.length === 0) {
      newErrors.items = 'Tambahkan minimal 1 barang';
    }

    // Validate items
    items.forEach((item, index) => {
      if (item.jumlah <= 0) {
        newErrors[`item_${index}_jumlah`] = 'Jumlah harus lebih dari 0';
      }
      if (item.harga_satuan < 0) {
        newErrors[`item_${index}_harga`] = 'Harga tidak boleh negatif';
      }
    });

    if (formData.status_pembayaran === 'hutang' || formData.status_pembayaran === 'cicilan') {
      if (!formData.jatuh_tempo) {
        newErrors.jatuh_tempo = 'Jatuh tempo harus diisi untuk hutang/cicilan';
      }
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!validateForm()) {
      toast.error('Mohon lengkapi form dengan benar');
      return;
    }

    saveMutation.mutate(formData);
  };

  const calculateSubtotal = () => {
    return items.reduce((sum, item) => sum + item.subtotal, 0);
  };

  const calculateTotal = () => {
    const subtotal = calculateSubtotal();
    return subtotal + Number(formData.ongkir || 0) - Number(formData.diskon || 0);
  };

  useEffect(() => {
    if (!open) {
      setFormData({
        supplier_id: '',
        nomor_faktur: '',
        tanggal: new Date().toISOString().split('T')[0],
        status_pembayaran: 'lunas',
        jatuh_tempo: '',
        ongkir: 0,
        diskon: 0,
        catatan: '',
      });
      setItems([]);
      setSelectedBarang('');
      setErrors({});
    }
  }, [open]);

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-5xl max-h-[95vh] overflow-y-auto">
        <DialogHeader className="border-b pb-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-red-50 flex items-center justify-center">
              <ShoppingCart className="h-5 w-5 text-red-600" />
            </div>
            <div>
              <DialogTitle className="text-xl">Form Pembelian Barang</DialogTitle>
              <p className="text-sm text-gray-500 mt-0.5">Isi data pembelian dengan lengkap</p>
            </div>
          </div>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-6 pt-2">
          {/* Error Alert */}
          {Object.keys(errors).length > 0 && (
            <Alert variant="destructive">
              <AlertCircle className="h-4 w-4" />
              <AlertDescription>
                Mohon perbaiki kesalahan pada form sebelum menyimpan
              </AlertDescription>
            </Alert>
          )}

          {/* Informasi Supplier & Faktur */}
          <Card className="border-l-4 border-l-blue-500">
            <CardContent className="pt-6">
              <div className="flex items-center gap-2 mb-4">
                <Package className="h-5 w-5 text-blue-600" />
                <h3 className="font-semibold text-gray-900">Informasi Supplier & Faktur</h3>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label className="text-sm font-medium">
                    Supplier <span className="text-red-500">*</span>
                  </Label>
                  <Select
                    value={formData.supplier_id}
                    onValueChange={(value) => {
                      setFormData({ ...formData, supplier_id: value });
                      setErrors({ ...errors, supplier_id: '' });
                    }}
                  >
                    <SelectTrigger className={errors.supplier_id ? 'border-red-500' : ''}>
                      <SelectValue placeholder="Pilih supplier" />
                    </SelectTrigger>
                    <SelectContent>
                      {suppliers.map((s: any) => (
                        <SelectItem key={s.id} value={s.id}>
                          <div className="flex flex-col">
                            <span className="font-medium">{s.nama}</span>
                            {s.kontak && <span className="text-xs text-gray-500">{s.kontak}</span>}
                          </div>
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  {errors.supplier_id && (
                    <p className="text-xs text-red-500 mt-1">{errors.supplier_id}</p>
                  )}
                </div>
                <div>
                  <Label className="text-sm font-medium">No. Faktur</Label>
                  <Input
                    value={formData.nomor_faktur}
                    onChange={(e) => setFormData({ ...formData, nomor_faktur: e.target.value })}
                    placeholder="Auto-generate jika kosong"
                    className="font-mono"
                  />
                  <p className="text-xs text-gray-500 mt-1">Kosongkan untuk generate otomatis</p>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4 mt-4">
                <div>
                  <Label className="text-sm font-medium">
                    Tanggal <span className="text-red-500">*</span>
                  </Label>
                  <Input
                    type="date"
                    value={formData.tanggal}
                    onChange={(e) => {
                      setFormData({ ...formData, tanggal: e.target.value });
                      setErrors({ ...errors, tanggal: '' });
                    }}
                    className={errors.tanggal ? 'border-red-500' : ''}
                  />
                  {errors.tanggal && (
                    <p className="text-xs text-red-500 mt-1">{errors.tanggal}</p>
                  )}
                </div>
                <div>
                  <Label className="text-sm font-medium">
                    Status Pembayaran <span className="text-red-500">*</span>
                  </Label>
                  <Select
                    value={formData.status_pembayaran}
                    onValueChange={(value) => setFormData({ ...formData, status_pembayaran: value })}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="lunas">
                        <div className="flex items-center gap-2">
                          <div className="w-2 h-2 rounded-full bg-green-500"></div>
                          <span>Lunas</span>
                        </div>
                      </SelectItem>
                      <SelectItem value="hutang">
                        <div className="flex items-center gap-2">
                          <div className="w-2 h-2 rounded-full bg-red-500"></div>
                          <span>Hutang</span>
                        </div>
                      </SelectItem>
                      <SelectItem value="cicilan">
                        <div className="flex items-center gap-2">
                          <div className="w-2 h-2 rounded-full bg-orange-500"></div>
                          <span>Cicilan</span>
                        </div>
                      </SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>

              {(formData.status_pembayaran === 'hutang' || formData.status_pembayaran === 'cicilan') && (
                <div className="mt-4">
                  <Label className="text-sm font-medium">
                    Jatuh Tempo <span className="text-red-500">*</span>
                  </Label>
                  <Input
                    type="date"
                    value={formData.jatuh_tempo}
                    onChange={(e) => {
                      setFormData({ ...formData, jatuh_tempo: e.target.value });
                      setErrors({ ...errors, jatuh_tempo: '' });
                    }}
                    className={errors.jatuh_tempo ? 'border-red-500' : ''}
                  />
                  {errors.jatuh_tempo && (
                    <p className="text-xs text-red-500 mt-1">{errors.jatuh_tempo}</p>
                  )}
                </div>
              )}
            </CardContent>
          </Card>

          {/* Daftar Barang */}
          <Card className="border-l-4 border-l-green-500">
            <CardContent className="pt-6">
              <div className="flex items-center gap-2 mb-4">
                <Package className="h-5 w-5 text-green-600" />
                <h3 className="font-semibold text-gray-900">Daftar Barang</h3>
              </div>

              {/* Item Selector */}
              <div className="flex gap-2 mb-4">
                <Select value={selectedBarang} onValueChange={setSelectedBarang}>
                  <SelectTrigger className="flex-1">
                    <SelectValue placeholder="Pilih barang untuk ditambahkan" />
                  </SelectTrigger>
                  <SelectContent>
                    {barangList.map((b: any) => (
                      <SelectItem key={b.id} value={b.id}>
                        <div className="flex flex-col">
                          <span className="font-medium">{b.nama_barang}</span>
                          <span className="text-xs text-gray-500">
                            Stok: {b.stok_saat_ini || 0} {b.satuan_dasar} | Harga Beli: Rp {Number(b.harga_beli || 0).toLocaleString('id-ID')}
                          </span>
                        </div>
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <Button type="button" onClick={handleAddItem} className="bg-green-600 hover:bg-green-700">
                  <Plus className="w-4 h-4 mr-2" />
                  Tambah
                </Button>
              </div>

              {errors.items && (
                <Alert variant="destructive" className="mb-4">
                  <AlertCircle className="h-4 w-4" />
                  <AlertDescription>{errors.items}</AlertDescription>
                </Alert>
              )}

              {/* Items List */}
              {items.length > 0 ? (
                <div className="space-y-3">
                  {/* Header */}
                  <div className="grid grid-cols-12 gap-2 px-3 py-2 bg-gray-50 rounded-lg text-xs font-semibold text-gray-600">
                    <div className="col-span-4">Nama Barang</div>
                    <div className="col-span-2 text-center">Jumlah</div>
                    <div className="col-span-2 text-center">Satuan</div>
                    <div className="col-span-2 text-right">Harga Satuan</div>
                    <div className="col-span-2 text-right">Subtotal</div>
                  </div>

                  {/* Items */}
                  {items.map((item, index) => (
                    <div key={index} className="grid grid-cols-12 gap-2 items-center p-3 border rounded-lg hover:bg-gray-50 transition-colors">
                      <div className="col-span-4">
                        <p className="font-medium text-sm">{item.nama_barang}</p>
                      </div>
                      <div className="col-span-2">
                        <Input
                          type="number"
                          value={item.jumlah}
                          onChange={(e) => {
                            handleUpdateItem(index, 'jumlah', Number(e.target.value));
                            setErrors({ ...errors, [`item_${index}_jumlah`]: '' });
                          }}
                          className={`text-center ${errors[`item_${index}_jumlah`] ? 'border-red-500' : ''}`}
                          min="1"
                        />
                      </div>
                      <div className="col-span-2 text-center text-sm text-gray-600">
                        {item.satuan}
                      </div>
                      <div className="col-span-2">
                        <Input
                          type="number"
                          value={item.harga_satuan}
                          onChange={(e) => {
                            handleUpdateItem(index, 'harga_satuan', Number(e.target.value));
                            setErrors({ ...errors, [`item_${index}_harga`]: '' });
                          }}
                          className={`text-right ${errors[`item_${index}_harga`] ? 'border-red-500' : ''}`}
                          min="0"
                        />
                      </div>
                      <div className="col-span-1 text-right font-semibold text-sm">
                        Rp {item.subtotal.toLocaleString('id-ID')}
                      </div>
                      <div className="col-span-1 flex justify-end">
                        <Button
                          type="button"
                          size="sm"
                          variant="ghost"
                          onClick={() => handleRemoveItem(index)}
                          className="text-red-600 hover:text-red-700 hover:bg-red-50"
                        >
                          <Trash2 className="w-4 h-4" />
                        </Button>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-center py-12 border-2 border-dashed rounded-lg">
                  <Package className="h-12 w-12 text-gray-300 mx-auto mb-3" />
                  <p className="text-sm text-gray-500">Belum ada barang ditambahkan</p>
                  <p className="text-xs text-gray-400 mt-1">Pilih barang dari dropdown di atas</p>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Biaya Tambahan */}
          <Card className="border-l-4 border-l-orange-500">
            <CardContent className="pt-6">
              <div className="flex items-center gap-2 mb-4">
                <DollarSign className="h-5 w-5 text-orange-600" />
                <h3 className="font-semibold text-gray-900">Biaya Tambahan</h3>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label className="text-sm font-medium flex items-center gap-2">
                    <Truck className="h-4 w-4 text-gray-500" />
                    Ongkir
                  </Label>
                  <Input
                    type="number"
                    value={formData.ongkir}
                    onChange={(e) => setFormData({ ...formData, ongkir: Number(e.target.value) })}
                    min="0"
                    placeholder="0"
                  />
                </div>
                <div>
                  <Label className="text-sm font-medium flex items-center gap-2">
                    <Tag className="h-4 w-4 text-gray-500" />
                    Diskon
                  </Label>
                  <Input
                    type="number"
                    value={formData.diskon}
                    onChange={(e) => setFormData({ ...formData, diskon: Number(e.target.value) })}
                    min="0"
                    placeholder="0"
                  />
                </div>
              </div>

              <div className="mt-4">
                <Label className="text-sm font-medium">Catatan</Label>
                <Textarea
                  value={formData.catatan}
                  onChange={(e) => setFormData({ ...formData, catatan: e.target.value })}
                  rows={2}
                  placeholder="Catatan tambahan (opsional)"
                />
              </div>
            </CardContent>
          </Card>

          {/* Summary */}
          <Card className="bg-gradient-to-br from-blue-50 to-indigo-50 border-blue-200">
            <CardContent className="pt-6">
              <div className="space-y-3">
                <div className="flex justify-between items-center text-sm">
                  <span className="text-gray-600">Subtotal Barang:</span>
                  <span className="font-semibold">Rp {calculateSubtotal().toLocaleString('id-ID')}</span>
                </div>
                <div className="flex justify-between items-center text-sm">
                  <span className="text-gray-600">Ongkir:</span>
                  <span className="font-semibold">Rp {Number(formData.ongkir || 0).toLocaleString('id-ID')}</span>
                </div>
                <div className="flex justify-between items-center text-sm">
                  <span className="text-gray-600">Diskon:</span>
                  <span className="font-semibold text-red-600">- Rp {Number(formData.diskon || 0).toLocaleString('id-ID')}</span>
                </div>
                <div className="border-t border-blue-200 pt-3 flex justify-between items-center">
                  <span className="text-lg font-bold text-gray-900">Total Pembelian:</span>
                  <span className="text-2xl font-bold text-blue-600">
                    Rp {calculateTotal().toLocaleString('id-ID')}
                  </span>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Actions */}
          <div className="flex justify-end gap-3 pt-4 border-t">
            <Button type="button" variant="outline" onClick={onClose} disabled={saveMutation.isPending}>
              Batal
            </Button>
            <Button 
              type="submit" 
              disabled={saveMutation.isPending || items.length === 0}
              className="bg-blue-600 hover:bg-blue-700"
            >
              {saveMutation.isPending ? (
                <>
                  <RefreshCw className="w-4 h-4 mr-2 animate-spin" />
                  Menyimpan...
                </>
              ) : (
                <>
                  <ShoppingCart className="w-4 h-4 mr-2" />
                  Simpan Pembelian
                </>
              )}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}

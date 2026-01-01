import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { 
  Package, 
  Plus, 
  Trash2, 
  AlertCircle,
  Search,
  RefreshCw,
  ShoppingCart
} from 'lucide-react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { addKeuanganKoperasiTransaction } from '@/services/keuanganKoperasi.service';

interface ItemPembelian {
  barang_id: string;
  nama_barang: string;
  satuan: string;
  jumlah: number;
  harga_satuan: number;
  biaya_lain: number;
  subtotal: number;
}

export default function InputPembelian() {
  const queryClient = useQueryClient();
  const [formData, setFormData] = useState({
    supplier_nama: '',
    tanggal_faktur: new Date().toISOString().split('T')[0],
    nomor_faktur: '',
    ongkos_kirim: 0,
    status_penerimaan: 'pending' as 'pending' | 'received',
  });
  const [items, setItems] = useState<ItemPembelian[]>([]);
  const [searchBarang, setSearchBarang] = useState('');
  const [errors, setErrors] = useState<Record<string, string>>({});

  // Fetch barang list
  const { data: barangList = [] } = useQuery({
    queryKey: ['koperasi-barang-list', searchBarang],
    queryFn: async () => {
      let query = supabase
        .from('kop_barang')
        .select('id, kode_barang, nama_barang, harga_beli, satuan_dasar, stok')
        .eq('is_active', true)
        .order('nama_barang', { ascending: true });

      if (searchBarang) {
        query = query.or(`nama_barang.ilike.%${searchBarang}%,kode_barang.ilike.%${searchBarang}%`);
      }

      const { data, error } = await query;
      if (error) throw error;
      return data || [];
    },
  });

  const saveMutation = useMutation({
    mutationFn: async (data: any) => {
      // Generate nomor faktur jika kosong
      if (!data.nomor_faktur) {
        const today = new Date().toISOString().split('T')[0].replace(/-/g, '');
        const { count } = await supabase
          .from('kop_pembelian')
          .select('*', { count: 'exact', head: true })
          .gte('created_at', `${today}T00:00:00`);
        data.nomor_faktur = `PB-${today}-${String((count || 0) + 1).padStart(4, '0')}`;
      }

      // Cari atau buat supplier
      let supplierId = '';
      if (data.supplier_nama) {
        const { data: existingSupplier } = await supabase
          .from('kop_supplier')
          .select('id')
          .eq('nama_supplier', data.supplier_nama)
          .eq('is_active', true)
          .maybeSingle();

        if (existingSupplier) {
          supplierId = existingSupplier.id;
        } else {
          // Buat supplier baru
          const { data: newSupplier, error: supplierError } = await supabase
            .from('kop_supplier')
            .insert({
              nama_supplier: data.supplier_nama,
              is_active: true,
            })
            .select()
            .single();
          
          if (supplierError) throw supplierError;
          supplierId = newSupplier.id;
        }
      }

      const subtotal = items.reduce((sum, item) => sum + item.subtotal, 0);
      const total = subtotal + Number(data.ongkos_kirim || 0);

      // Insert pembelian header
      const { data: pembelian, error: pembelianError } = await supabase
        .from('kop_pembelian')
        .insert({
          supplier_id: supplierId || null,
          supplier_nama: data.supplier_nama || null,
          nomor_faktur: data.nomor_faktur,
          tanggal: data.tanggal_faktur,
          ongkir: data.ongkos_kirim || 0,
          total_pembelian: total,
          total_bayar: total, // Default lunas
          sisa_hutang: 0,
          status_pembayaran: 'lunas',
          status: data.status_penerimaan === 'received' ? 'completed' : 'pending',
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

      // Update stok dan harga_beli untuk setiap item
      for (const item of items) {
        const { data: currentBarang, error: fetchError } = await supabase
          .from('kop_barang')
          .select('stok, harga_beli')
          .eq('id', item.barang_id)
          .single();

        if (fetchError) {
          console.error(`Error fetching barang ${item.barang_id}:`, fetchError);
          continue;
        }

        const currentStok = Number(currentBarang?.stok || 0);
        const currentHargaBeli = Number(currentBarang?.harga_beli || 0);
        const newStok = currentStok + item.jumlah;
        
        const updateData: any = { stok: newStok };

        if (item.harga_satuan !== currentHargaBeli && item.harga_satuan > 0) {
          updateData.harga_beli = item.harga_satuan;
        }

        const { error: updateError } = await supabase
          .from('kop_barang')
          .update(updateData)
          .eq('id', item.barang_id);

        if (updateError) {
          console.error(`Error updating barang ${item.barang_id}:`, updateError);
        }
      }

      // Auto-post ke keuangan jika status received
      if (data.status_penerimaan === 'received' && total > 0) {
        try {
          await addKeuanganKoperasiTransaction({
            tanggal: data.tanggal_faktur,
            jenis_transaksi: 'Pengeluaran',
            kategori: 'Pembelian Barang',
            sub_kategori: 'Kulakan',
            jumlah: total,
            deskripsi: `Pembelian dari ${data.supplier_nama || 'Supplier'} - ${data.nomor_faktur}`,
            referensi: `koperasi_pembelian:${pembelian.id}`,
            status: 'posted',
          });
        } catch (keuanganError) {
          console.warn('Gagal auto-post ke keuangan:', keuanganError);
        }
      }

      return pembelian;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['koperasi-pembelian'] });
      queryClient.invalidateQueries({ queryKey: ['koperasi-produk-with-stock'] });
      queryClient.invalidateQueries({ queryKey: ['koperasi-barang-list'] });
      queryClient.invalidateQueries({ queryKey: ['koperasi-pembelian-stats'] });
      toast.success('Pembelian berhasil disimpan dan stok diperbarui');
      
      // Reset form
      setFormData({
        supplier_nama: '',
        tanggal_faktur: new Date().toISOString().split('T')[0],
        nomor_faktur: '',
        ongkos_kirim: 0,
        status_penerimaan: 'pending',
      });
      setItems([]);
      setErrors({});
    },
    onError: (error: any) => {
      toast.error(error.message || 'Gagal menyimpan pembelian');
    },
  });

  const handleAddItem = (produk: any) => {
    const existingItem = items.find(item => item.barang_id === produk.id);
    if (existingItem) {
      // Update jumlah jika sudah ada
      handleUpdateItem(items.indexOf(existingItem), 'jumlah', existingItem.jumlah + 1);
      return;
    }

    const hargaBeli = Number(produk.harga_beli || 0);
    setItems([...items, {
      barang_id: produk.id,
      nama_barang: produk.nama_barang,
      satuan: produk.satuan_dasar || 'pcs',
      jumlah: 1,
      harga_satuan: hargaBeli,
      biaya_lain: 0,
      subtotal: hargaBeli,
    }]);
  };

  const handleUpdateItem = (index: number, field: string, value: any) => {
    const newItems = [...items];
    newItems[index] = { ...newItems[index], [field]: value };
    
    if (field === 'jumlah' || field === 'harga_satuan' || field === 'biaya_lain') {
      newItems[index].subtotal = (newItems[index].jumlah * newItems[index].harga_satuan) + (newItems[index].biaya_lain || 0);
    }
    
    setItems(newItems);
  };

  const handleRemoveItem = (index: number) => {
    setItems(items.filter((_, i) => i !== index));
  };

  const validateForm = (): boolean => {
    const newErrors: Record<string, string> = {};

    if (!formData.supplier_nama) {
      newErrors.supplier_nama = 'Nama supplier harus diisi';
    }

    if (!formData.tanggal_faktur) {
      newErrors.tanggal_faktur = 'Tanggal faktur harus diisi';
    }

    if (items.length === 0) {
      newErrors.items = 'Tambahkan minimal 1 barang';
    }

    items.forEach((item, index) => {
      if (item.jumlah <= 0) {
        newErrors[`item_${index}_jumlah`] = 'Jumlah harus lebih dari 0';
      }
      if (item.harga_satuan < 0) {
        newErrors[`item_${index}_harga`] = 'Harga tidak boleh negatif';
      }
    });

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

  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
      {/* Left Panel - Pilih Barang */}
      <Card className="border border-gray-200 shadow-sm">
        <CardHeader className="border-b bg-gray-50/50">
          <CardTitle className="text-xl font-bold">Pilih Barang</CardTitle>
        </CardHeader>
        <CardContent className="pt-6">
          {/* Search Bar */}
          <div className="relative mb-6">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
            <Input
              placeholder="Cari barang..."
              value={searchBarang}
              onChange={(e) => setSearchBarang(e.target.value)}
              className="pl-10 h-11"
            />
          </div>

          {/* Daftar Barang */}
          <div className="space-y-2 max-h-[600px] overflow-y-auto">
            {barangList.length === 0 ? (
              <div className="text-center py-12 text-gray-500">
                <Package className="h-12 w-12 mx-auto mb-3 text-gray-400" />
                <p>Belum ada produk</p>
              </div>
            ) : (
              barangList.map((produk: any) => {
                const stok = Number(produk.stok || 0);
                const hargaBeli = Number(produk.harga_beli || 0);
                const isInCart = items.some(item => item.barang_id === produk.id);
                
                return (
                  <div
                    key={produk.id}
                    onClick={() => handleAddItem(produk)}
                    className={`p-4 border rounded-lg transition-all cursor-pointer ${
                      isInCart
                        ? 'border-green-300 bg-green-50/50'
                        : 'border-gray-200 hover:border-blue-300 hover:bg-blue-50/50 hover:shadow-sm'
                    }`}
                  >
                    <div className="flex items-center justify-between">
                      <div className="flex-1 min-w-0">
                        <p className={`font-semibold text-sm truncate ${
                          isInCart ? 'text-green-700' : 'text-gray-900'
                        }`}>
                          {produk.nama_barang}
                        </p>
                        <div className="flex items-center gap-3 mt-1 text-xs text-gray-600">
                          <span>Stok: <span className={`font-medium ${
                            stok === 0 ? 'text-red-600' : stok <= 5 ? 'text-orange-600' : 'text-green-600'
                          }`}>{stok} {produk.satuan_dasar}</span></span>
                          <span>•</span>
                          <span>Beli: <span className="font-medium">Rp {hargaBeli.toLocaleString('id-ID')}</span></span>
                        </div>
                      </div>
                      <Button
                        size="sm"
                        variant={isInCart ? "outline" : "default"}
                        className={isInCart ? "border-green-300 text-green-700" : ""}
                        onClick={(e) => {
                          e.stopPropagation();
                          handleAddItem(produk);
                        }}
                      >
                        <Plus className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </CardContent>
      </Card>

      {/* Right Panel - Form Pembelian */}
      <Card className="border border-gray-200 shadow-sm">
        <CardHeader className="border-b bg-gray-50/50">
          <CardTitle className="text-xl font-bold">Form Pembelian</CardTitle>
        </CardHeader>
        <CardContent className="pt-6">
          <form onSubmit={handleSubmit} className="space-y-6">
            {/* Error Alert */}
            {Object.keys(errors).length > 0 && (
              <Alert variant="destructive" className="border-red-200 bg-red-50">
                <AlertCircle className="h-4 w-4" />
                <AlertDescription className="text-red-800">
                  Mohon perbaiki kesalahan pada form sebelum menyimpan
                </AlertDescription>
              </Alert>
            )}

            {/* Input Fields */}
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label className="text-sm font-semibold text-gray-700">
                  Nama Supplier <span className="text-red-500">*</span>
                </Label>
                <Input
                  value={formData.supplier_nama}
                  onChange={(e) => {
                    setFormData({ ...formData, supplier_nama: e.target.value });
                    setErrors({ ...errors, supplier_nama: '' });
                  }}
                  placeholder="Contoh: Toko Makmur"
                  className={`h-11 ${errors.supplier_nama ? 'border-red-500' : ''}`}
                />
                {errors.supplier_nama && (
                  <p className="text-xs text-red-600">{errors.supplier_nama}</p>
                )}
              </div>

              <div className="space-y-2">
                <Label className="text-sm font-semibold text-gray-700">
                  Tanggal Faktur <span className="text-red-500">*</span>
                </Label>
                <Input
                  type="date"
                  value={formData.tanggal_faktur}
                  onChange={(e) => {
                    setFormData({ ...formData, tanggal_faktur: e.target.value });
                    setErrors({ ...errors, tanggal_faktur: '' });
                  }}
                  className={`h-11 ${errors.tanggal_faktur ? 'border-red-500' : ''}`}
                />
                {errors.tanggal_faktur && (
                  <p className="text-xs text-red-600">{errors.tanggal_faktur}</p>
                )}
              </div>

              <div className="space-y-2">
                <Label className="text-sm font-semibold text-gray-700">Nomor Faktur</Label>
                <Input
                  value={formData.nomor_faktur}
                  onChange={(e) => setFormData({ ...formData, nomor_faktur: e.target.value })}
                  placeholder="Nomor dari supplier"
                  className="h-11"
                />
                <p className="text-xs text-gray-500">Kosongkan untuk auto-generate</p>
              </div>

              <div className="space-y-2">
                <Label className="text-sm font-semibold text-gray-700">Ongkos Kirim</Label>
                <Input
                  type="number"
                  value={formData.ongkos_kirim}
                  onChange={(e) => setFormData({ ...formData, ongkos_kirim: Number(e.target.value) })}
                  min="0"
                  placeholder="0"
                  className="h-11"
                />
              </div>

              <div className="space-y-2 col-span-2">
                <Label className="text-sm font-semibold text-gray-700">Status Penerimaan</Label>
                <Select
                  value={formData.status_penerimaan}
                  onValueChange={(value) => setFormData({ ...formData, status_penerimaan: value as any })}
                >
                  <SelectTrigger className="h-11">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="pending">Belum Diterima (Pending)</SelectItem>
                    <SelectItem value="received">Sudah Diterima</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            {/* Item Details Table */}
            <div className="space-y-4">
              <h3 className="font-semibold text-gray-900">Detail Barang</h3>
              {items.length === 0 ? (
                <div className="text-center py-12 border-2 border-dashed border-gray-200 rounded-lg bg-gray-50/50">
                  <Package className="h-12 w-12 mx-auto mb-3 text-gray-400" />
                  <p className="text-sm text-gray-600">Belum ada barang dipilih</p>
                </div>
              ) : (
                <div className="border rounded-lg overflow-hidden">
                  <Table>
                    <TableHeader>
                      <TableRow className="bg-gray-50">
                        <TableHead className="font-semibold">Nama Barang</TableHead>
                        <TableHead className="text-center font-semibold">Jml</TableHead>
                        <TableHead className="text-right font-semibold">Harga Beli</TableHead>
                        <TableHead className="text-right font-semibold">Biaya Lain</TableHead>
                        <TableHead className="text-right font-semibold">Subtotal</TableHead>
                        <TableHead className="w-[50px]"></TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {items.map((item, index) => (
                        <TableRow key={index}>
                          <TableCell className="font-medium">{item.nama_barang}</TableCell>
                          <TableCell>
                            <Input
                              type="number"
                              value={item.jumlah}
                              onChange={(e) => {
                                handleUpdateItem(index, 'jumlah', Number(e.target.value));
                                setErrors({ ...errors, [`item_${index}_jumlah`]: '' });
                              }}
                              className="w-20 text-center h-9"
                              min="1"
                            />
                          </TableCell>
                          <TableCell>
                            <Input
                              type="number"
                              value={item.harga_satuan}
                              onChange={(e) => {
                                handleUpdateItem(index, 'harga_satuan', Number(e.target.value));
                                setErrors({ ...errors, [`item_${index}_harga`]: '' });
                              }}
                              className="w-32 text-right h-9"
                              min="0"
                            />
                          </TableCell>
                          <TableCell>
                            <Input
                              type="number"
                              value={item.biaya_lain}
                              onChange={(e) => {
                                handleUpdateItem(index, 'biaya_lain', Number(e.target.value));
                              }}
                              className="w-32 text-right h-9"
                              min="0"
                            />
                          </TableCell>
                          <TableCell className="text-right font-semibold">
                            Rp {item.subtotal.toLocaleString('id-ID')}
                          </TableCell>
                          <TableCell>
                            <Button
                              type="button"
                              size="sm"
                              variant="ghost"
                              onClick={() => handleRemoveItem(index)}
                              className="text-red-600 hover:text-red-700 hover:bg-red-50 h-8 w-8 p-0"
                            >
                              <Trash2 className="h-4 w-4" />
                            </Button>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              )}

              {/* Subtotal */}
              <div className="flex justify-between items-center pt-4 border-t">
                <span className="text-lg font-bold text-gray-900">Subtotal Item:</span>
                <span className="text-xl font-bold text-blue-600">
                  Rp {calculateSubtotal().toLocaleString('id-ID')}
                </span>
              </div>
            </div>

            {/* Submit Button */}
            <div className="flex justify-end pt-4 border-t">
              <Button 
                type="submit" 
                disabled={saveMutation.isPending || items.length === 0}
                className="bg-blue-600 hover:bg-blue-700 text-white shadow-sm h-11 px-8"
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
        </CardContent>
      </Card>
    </div>
  );
}


















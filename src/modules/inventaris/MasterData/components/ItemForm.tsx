import React, { useState, useMemo } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { Switch } from '@/components/ui/switch';
import { X, Save } from 'lucide-react';
import { createInventoryItem, updateInventoryItem } from '@/services/inventaris.service';
import { useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import { getKategoriOptions, SATUAN_OPTIONS, ZONA_OPTIONS } from '@/utils/inventaris.utils';

interface ItemFormProps {
  onClose: () => void;
  editItem?: any;
}

const ItemForm = ({ onClose, editItem }: ItemFormProps) => {
  const [formData, setFormData] = useState({
    nama_barang: editItem?.nama_barang || '',
    tipe_item: editItem?.tipe_item || '',
    kategori: editItem?.kategori || '',
    zona: editItem?.zona || '',
    lokasi: editItem?.lokasi || '',
    kondisi: editItem?.kondisi || 'Baik',
    jumlah: editItem?.jumlah || '',
    satuan: editItem?.satuan || 'pcs',
    harga_perolehan: editItem?.harga_perolehan || '',
    sumber: editItem?.sumber || null,
    has_expiry: editItem?.has_expiry || false,
    tanggal_kedaluwarsa: editItem?.tanggal_kedaluwarsa || '',
    min_stock: editItem?.min_stock || '',
    owner_type: editItem?.owner_type || 'yayasan',
    boleh_dijual_koperasi: editItem?.boleh_dijual_koperasi || false
  });

  const [isSubmitting, setIsSubmitting] = useState(false);
  const queryClient = useQueryClient();

  // Get kategori options based on tipe_item
  const kategoriOptions = useMemo(() => {
    return getKategoriOptions(formData.tipe_item || 'Aset');
  }, [formData.tipe_item]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);

    try {
      const payload = {
        ...formData,
        jumlah: parseFloat(formData.jumlah) || 0,
        harga_perolehan: parseFloat(formData.harga_perolehan) || 0,
        min_stock: parseFloat(formData.min_stock) || 0,
        tanggal_kedaluwarsa: formData.has_expiry ? formData.tanggal_kedaluwarsa : null
      };

      if (editItem) {
        await updateInventoryItem(editItem.id, payload);
      } else {
        await createInventoryItem(payload);
      }
      
      // Refresh data
      queryClient.invalidateQueries({ queryKey: ['inventory-master'] });
      queryClient.invalidateQueries({ queryKey: ['low-stock'] });
      queryClient.invalidateQueries({ queryKey: ['near-expiry'] });
      queryClient.invalidateQueries({ queryKey: ['koperasi-produk'] });
      queryClient.invalidateQueries({ queryKey: ['koperasi-produk-with-stock'] });
      queryClient.invalidateQueries({ queryKey: ['koperasi-yayasan-items'] });
      
      toast.success(editItem ? 'Item berhasil diperbarui' : 'Item berhasil ditambahkan');
      onClose();
    } catch (error) {
      console.error('Error saving item:', error);
      toast.error('Gagal menyimpan item');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <Card className="w-full max-w-2xl max-h-[90vh] overflow-y-auto">
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle>{editItem ? 'Edit Item' : 'Tambah Item Baru'}</CardTitle>
          <Button variant="ghost" size="sm" onClick={onClose}>
            <X className="h-4 w-4" />
          </Button>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <Label htmlFor="nama_barang">Nama Barang *</Label>
                <Input
                  id="nama_barang"
                  value={formData.nama_barang}
                  onChange={(e) => setFormData({...formData, nama_barang: e.target.value})}
                  placeholder="Masukkan nama barang"
                  required
                />
              </div>

              <div>
                <Label htmlFor="tipe_item">Tipe Item *</Label>
                <Select 
                  value={formData.tipe_item} 
                  onValueChange={(value) => {
                    setFormData({...formData, tipe_item: value, kategori: ''}); // Reset kategori when tipe changes
                  }}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Pilih tipe item" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="Aset">Aset</SelectItem>
                    <SelectItem value="Komoditas">Komoditas</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div>
                <Label htmlFor="kategori">Kategori *</Label>
                <Select 
                  value={formData.kategori} 
                  onValueChange={(value) => setFormData({...formData, kategori: value})}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Pilih kategori" />
                  </SelectTrigger>
                  <SelectContent>
                    {kategoriOptions.map((kategori) => (
                      <SelectItem key={kategori} value={kategori}>
                        {kategori}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div>
                <Label htmlFor="zona">Zona</Label>
                <Select 
                  value={formData.zona} 
                  onValueChange={(value) => setFormData({...formData, zona: value})}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Pilih zona" />
                  </SelectTrigger>
                  <SelectContent>
                    {ZONA_OPTIONS.map((option) => (
                      <SelectItem key={option.value} value={option.value}>
                        {option.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div>
                <Label htmlFor="lokasi">Lokasi *</Label>
                <Input
                  id="lokasi"
                  value={formData.lokasi}
                  onChange={(e) => setFormData({...formData, lokasi: e.target.value})}
                  placeholder="Contoh: Lt. 1 Gudang, Dapur, dll"
                  required
                />
              </div>

              <div>
                <Label htmlFor="kondisi">Kondisi *</Label>
                <Select value={formData.kondisi} onValueChange={(value) => setFormData({...formData, kondisi: value})}>
                  <SelectTrigger>
                    <SelectValue placeholder="Pilih kondisi" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="Baik">Baik</SelectItem>
                    <SelectItem value="Rusak Ringan">Rusak Ringan</SelectItem>
                    <SelectItem value="Perlu Perbaikan">Perlu Perbaikan</SelectItem>
                    <SelectItem value="Rusak Berat">Rusak Berat</SelectItem>
                    <SelectItem value="Butuh Perbaikan">Butuh Perbaikan</SelectItem>
                    <SelectItem value="Rusak">Rusak</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div>
                <Label htmlFor="jumlah">Jumlah Stok *</Label>
                <Input
                  id="jumlah"
                  type="number"
                  value={formData.jumlah}
                  onChange={(e) => setFormData({...formData, jumlah: e.target.value})}
                  placeholder="0"
                  required
                />
              </div>

              <div>
                <Label htmlFor="satuan">Satuan</Label>
                <Select 
                  value={formData.satuan} 
                  onValueChange={(value) => setFormData({...formData, satuan: value})}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Pilih satuan" />
                  </SelectTrigger>
                  <SelectContent>
                    {SATUAN_OPTIONS.map((satuan) => (
                      <SelectItem key={satuan} value={satuan}>
                        {satuan}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div>
                <Label htmlFor="harga_perolehan">Harga Perolehan</Label>
                <Input
                  id="harga_perolehan"
                  type="number"
                  value={formData.harga_perolehan}
                  onChange={(e) => setFormData({...formData, harga_perolehan: e.target.value})}
                  placeholder="0"
                />
              </div>

              <div>
                <Label htmlFor="sumber">Sumber</Label>
                <Select
                  value={formData.sumber || undefined}
                  onValueChange={(value) => setFormData({...formData, sumber: value as "Pembelian" | "Donasi"})}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Pilih sumber (opsional)" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="Pembelian">Pembelian</SelectItem>
                    <SelectItem value="Donasi">Donasi</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div>
                <Label htmlFor="min_stock">Minimal Stok</Label>
                <Input
                  id="min_stock"
                  type="number"
                  value={formData.min_stock}
                  onChange={(e) => setFormData({...formData, min_stock: e.target.value})}
                  placeholder="0"
                />
              </div>

              <div>
                <Label htmlFor="owner_type">Sumber / Owner *</Label>
                <Select
                  value={formData.owner_type}
                  onValueChange={(value) => setFormData({ ...formData, owner_type: value })}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Pilih sumber barang" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="yayasan">Yayasan</SelectItem>
                    <SelectItem value="koperasi">Koperasi</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            {/* Expiry Section */}
            <div className="space-y-4">
              <div className="flex items-center space-x-2">
                <Switch
                  id="has_expiry"
                  checked={formData.has_expiry}
                  onCheckedChange={(checked) => setFormData({ ...formData, has_expiry: checked })}
                />
                <Label htmlFor="has_expiry">Barang memiliki tanggal kedaluwarsa</Label>
              </div>

              {formData.has_expiry && (
                <div>
                  <Label htmlFor="tanggal_kedaluwarsa">Tanggal Kedaluwarsa</Label>
                  <Input
                    id="tanggal_kedaluwarsa"
                    type="date"
                    value={formData.tanggal_kedaluwarsa}
                    onChange={(e) =>
                      setFormData({ ...formData, tanggal_kedaluwarsa: e.target.value })
                    }
                  />
                </div>
              )}
            </div>

            {/* Koperasi Section */}
            {formData.tipe_item === 'Komoditas' && (
              <div className="space-y-4 border-t pt-4">
                <div className="flex items-center space-x-2">
                  <Switch
                    id="boleh_dijual_koperasi"
                    checked={formData.boleh_dijual_koperasi}
                    onCheckedChange={(checked) =>
                      setFormData({ ...formData, boleh_dijual_koperasi: checked })
                    }
                  />
                  <Label htmlFor="boleh_dijual_koperasi">Boleh Dijual di Koperasi</Label>
                </div>
                {formData.boleh_dijual_koperasi && (
                  <div className="bg-blue-50 p-3 rounded-md text-sm text-blue-800">
                    <p>
                      Item ini akan muncul di kasir koperasi. Pastikan harga jual sudah diatur di
                      Master Produk Koperasi.
                    </p>
                  </div>
                )}
              </div>
            )}

            <div className="flex gap-2 pt-4">
              <Button type="submit" disabled={isSubmitting} className="flex items-center gap-2">
                <Save className="h-4 w-4" />
                {isSubmitting ? 'Menyimpan...' : editItem ? 'Update' : 'Simpan'}
              </Button>
              <Button type="button" variant="outline" onClick={onClose}>
                Batal
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>
    </div>
  );
};

export default ItemForm;
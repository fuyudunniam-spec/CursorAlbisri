import React, { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { Switch } from '@/components/ui/switch';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { Calendar } from '@/components/ui/calendar';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { CalendarIcon } from 'lucide-react';
import { format } from 'date-fns';

interface InventarisFormProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess: () => void;
  editData?: any;
}

export const InventarisForm: React.FC<InventarisFormProps> = ({
  open,
  onOpenChange,
  onSuccess,
  editData
}) => {
  const [loading, setLoading] = useState(false);
  const [formData, setFormData] = useState({
    nama_barang: editData?.nama_barang || '',
    tipe: editData?.tipe || 'Komoditas',
    kategori: editData?.kategori || '',
    lokasi: editData?.lokasi || '',
    kondisi: editData?.kondisi || 'Baik',
    jumlah: editData?.jumlah || 0,
    satuan: editData?.satuan || 'Unit',
    harga_perolehan: editData?.harga_perolehan || 0,
    perishable: editData?.perishable || false,
    tanggal_kedaluwarsa: editData?.tanggal_kedaluwarsa || null,
    source: editData?.source || 'Manual',
    supplier: editData?.supplier || '',
    keterangan: editData?.keterangan || '',
    maintenance_terakhir: editData?.maintenance_terakhir || null,
    maintenance_berikutnya: editData?.maintenance_berikutnya || null,
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      if (editData) {
        const { error } = await supabase
          .from('inventaris')
          .update(formData)
          .eq('id', editData.id);

        if (error) throw error;
        toast.success('Data inventaris berhasil diperbarui');
      } else {
        const { error } = await supabase
          .from('inventaris')
          .insert([formData]);

        if (error) throw error;
        toast.success('Data inventaris berhasil ditambahkan');
      }

      onSuccess();
      onOpenChange(false);
    } catch (error) {
      console.error('Error saving inventaris:', error);
      toast.error('Gagal menyimpan data inventaris');
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>
            {editData ? 'Edit Data Inventaris' : 'Tambah Data Inventaris'}
          </DialogTitle>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="nama_barang">Nama Barang *</Label>
              <Input
                id="nama_barang"
                value={formData.nama_barang}
                onChange={(e) => setFormData({ ...formData, nama_barang: e.target.value })}
                required
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="tipe">Tipe *</Label>
              <Select
                value={formData.tipe}
                onValueChange={(value) => setFormData({ ...formData, tipe: value })}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="Aset">Aset</SelectItem>
                  <SelectItem value="Komoditas">Komoditas</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="kategori">Kategori *</Label>
              <Input
                id="kategori"
                value={formData.kategori}
                onChange={(e) => setFormData({ ...formData, kategori: e.target.value })}
                placeholder="Elektronik, Furniture, Makanan, dll"
                required
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="lokasi">Lokasi</Label>
              <Input
                id="lokasi"
                value={formData.lokasi}
                onChange={(e) => setFormData({ ...formData, lokasi: e.target.value })}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="kondisi">Kondisi</Label>
              <Select
                value={formData.kondisi}
                onValueChange={(value) => setFormData({ ...formData, kondisi: value })}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="Baik">Baik</SelectItem>
                  <SelectItem value="Perlu perbaikan">Perlu perbaikan</SelectItem>
                  <SelectItem value="Rusak">Rusak</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="jumlah">Jumlah *</Label>
              <Input
                id="jumlah"
                type="number"
                value={formData.jumlah}
                onChange={(e) => setFormData({ ...formData, jumlah: parseInt(e.target.value) || 0 })}
                required
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="satuan">Satuan *</Label>
              <Input
                id="satuan"
                value={formData.satuan}
                onChange={(e) => setFormData({ ...formData, satuan: e.target.value })}
                placeholder="Unit, Kg, Box, dll"
                required
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="harga_perolehan">Harga Perolehan {formData.tipe === 'Komoditas' && '*'}</Label>
              <Input
                id="harga_perolehan"
                type="number"
                value={formData.harga_perolehan}
                onChange={(e) => setFormData({ ...formData, harga_perolehan: parseFloat(e.target.value) || 0 })}
                required={formData.tipe === 'Komoditas'}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="source">Sumber</Label>
              <Select
                value={formData.source}
                onValueChange={(value) => setFormData({ ...formData, source: value })}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="Manual">Manual</SelectItem>
                  <SelectItem value="Donasi">Donasi</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="supplier">Supplier</Label>
              <Input
                id="supplier"
                value={formData.supplier}
                onChange={(e) => setFormData({ ...formData, supplier: e.target.value })}
              />
            </div>

            <div className="space-y-2 flex items-center gap-2">
              <Switch
                id="perishable"
                checked={formData.perishable}
                onCheckedChange={(checked) => setFormData({ ...formData, perishable: checked })}
              />
              <Label htmlFor="perishable">Perishable (Mudah Rusak)</Label>
            </div>

            {formData.perishable && (
              <div className="space-y-2">
                <Label>Tanggal Kedaluwarsa</Label>
                <Popover>
                  <PopoverTrigger asChild>
                    <Button variant="outline" className="w-full justify-start text-left">
                      <CalendarIcon className="mr-2 h-4 w-4" />
                      {formData.tanggal_kedaluwarsa ? format(new Date(formData.tanggal_kedaluwarsa), 'PPP') : 'Pilih tanggal'}
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-auto p-0">
                    <Calendar
                      mode="single"
                      selected={formData.tanggal_kedaluwarsa ? new Date(formData.tanggal_kedaluwarsa) : undefined}
                      onSelect={(date) => setFormData({ ...formData, tanggal_kedaluwarsa: date?.toISOString().split('T')[0] || null })}
                    />
                  </PopoverContent>
                </Popover>
              </div>
            )}

            {formData.tipe === 'Aset' && (
              <>
                <div className="space-y-2">
                  <Label>Maintenance Terakhir</Label>
                  <Popover>
                    <PopoverTrigger asChild>
                      <Button variant="outline" className="w-full justify-start text-left">
                        <CalendarIcon className="mr-2 h-4 w-4" />
                        {formData.maintenance_terakhir ? format(new Date(formData.maintenance_terakhir), 'PPP') : 'Pilih tanggal'}
                      </Button>
                    </PopoverTrigger>
                    <PopoverContent className="w-auto p-0">
                      <Calendar
                        mode="single"
                        selected={formData.maintenance_terakhir ? new Date(formData.maintenance_terakhir) : undefined}
                        onSelect={(date) => setFormData({ ...formData, maintenance_terakhir: date?.toISOString().split('T')[0] || null })}
                      />
                    </PopoverContent>
                  </Popover>
                </div>

                <div className="space-y-2">
                  <Label>Maintenance Berikutnya</Label>
                  <Popover>
                    <PopoverTrigger asChild>
                      <Button variant="outline" className="w-full justify-start text-left">
                        <CalendarIcon className="mr-2 h-4 w-4" />
                        {formData.maintenance_berikutnya ? format(new Date(formData.maintenance_berikutnya), 'PPP') : 'Pilih tanggal'}
                      </Button>
                    </PopoverTrigger>
                    <PopoverContent className="w-auto p-0">
                      <Calendar
                        mode="single"
                        selected={formData.maintenance_berikutnya ? new Date(formData.maintenance_berikutnya) : undefined}
                        onSelect={(date) => setFormData({ ...formData, maintenance_berikutnya: date?.toISOString().split('T')[0] || null })}
                      />
                    </PopoverContent>
                  </Popover>
                </div>
              </>
            )}
          </div>

          <div className="space-y-2">
            <Label htmlFor="keterangan">Keterangan</Label>
            <Textarea
              id="keterangan"
              value={formData.keterangan}
              onChange={(e) => setFormData({ ...formData, keterangan: e.target.value })}
              rows={3}
            />
          </div>

          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              Batal
            </Button>
            <Button type="submit" disabled={loading}>
              {loading ? 'Menyimpan...' : editData ? 'Update' : 'Simpan'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
};

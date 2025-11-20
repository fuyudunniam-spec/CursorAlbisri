import React, { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { toast } from 'sonner';
import { createSalesTransaction } from '@/services/sales.service';
import { SalesFormData } from '@/types/sales.types';
import { useQuery } from '@tanstack/react-query';
import { listInventory } from '@/services/inventaris.service';
import { Calculator, Package, DollarSign, Heart } from 'lucide-react';

const salesSchema = z.object({
  item_id: z.string().min(1, 'Item harus dipilih'),
  jumlah: z.number().int('Jumlah harus bilangan bulat').min(1, 'Jumlah minimal 1'),
  harga_dasar: z.number().min(0, 'Harga dasar tidak boleh negatif'),
  sumbangan: z.number().min(0, 'Sumbangan tidak boleh negatif'),
  pembeli: z.string().min(1, 'Nama pembeli harus diisi'),
  tanggal: z.string().min(1, 'Tanggal harus diisi'),
  catatan: z.string().optional()
});

type SalesFormData = z.infer<typeof salesSchema>;

interface SalesFormProps {
  onSuccess: () => void;
  onCancel: () => void;
}

const SalesForm: React.FC<SalesFormProps> = ({ onSuccess, onCancel }) => {
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [selectedItem, setSelectedItem] = useState<any>(null);

  const {
    register,
    handleSubmit,
    formState: { errors },
    setValue,
    watch,
    reset
  } = useForm<SalesFormData>({
    resolver: zodResolver(salesSchema),
    defaultValues: {
      item_id: '',
      jumlah: 1,
      harga_dasar: 0,
      sumbangan: 0,
      pembeli: '',
      tanggal: new Date().toISOString().split('T')[0],
      catatan: ''
    }
  });

  // Fetch inventory items
  const { data: inventoryData } = useQuery({
    queryKey: ['inventory-items-for-sales'],
    queryFn: () => listInventory({ page: 1, pageSize: 100 }, { tipe_item: 'Komoditas' })
  });

  const watchedValues = watch();
  const totalNilai = (watchedValues.harga_dasar * watchedValues.jumlah) + watchedValues.sumbangan;
  const hargaSatuan = watchedValues.jumlah > 0 ? Math.floor(totalNilai / watchedValues.jumlah) : 0;

  // Update selected item when item_id changes
  React.useEffect(() => {
    if (watchedValues.item_id && inventoryData?.data) {
      const item = inventoryData.data.find(i => i.id === watchedValues.item_id);
      setSelectedItem(item);
    }
  }, [watchedValues.item_id, inventoryData]);

  const onSubmit = async (data: SalesFormData) => {
    try {
      setIsSubmitting(true);

      await createSalesTransaction(data);
      toast.success('Penjualan berhasil dicatat!');
      onSuccess();
    } catch (error) {
      console.error('Error creating sales transaction:', error);
      toast.error('Gagal mencatat penjualan');
    } finally {
      setIsSubmitting(false);
    }
  };

  const formatRupiah = (amount: number) => {
    return new Intl.NumberFormat('id-ID', {
      style: 'currency',
      currency: 'IDR',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0
    }).format(amount);
  };

  return (
    <Dialog open={true} onOpenChange={onCancel}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Package className="h-5 w-5" />
            Form Penjualan Inventaris
          </DialogTitle>
        </DialogHeader>

        <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Left Column - Form Fields */}
            <div className="space-y-4">
              {/* Item Selection */}
              <div className="space-y-2">
                <Label htmlFor="item_id">Item yang Dijual *</Label>
                <Select
                  value={watchedValues.item_id}
                  onValueChange={(value) => setValue('item_id', value)}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Pilih item yang akan dijual" />
                  </SelectTrigger>
                  <SelectContent>
                    {inventoryData?.data?.map((item) => (
                      <SelectItem key={item.id} value={item.id}>
                        <div className="flex items-center gap-2">
                          <span>{item.nama_barang}</span>
                          <span className="text-sm text-muted-foreground">
                            (Stok: {item.jumlah || 0} {item.satuan})
                          </span>
                        </div>
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                {errors.item_id && (
                  <p className="text-sm text-red-500">{errors.item_id.message}</p>
                )}
              </div>

              {/* Item Info */}
              {selectedItem && (
                <Card>
                  <CardHeader className="pb-2">
                    <CardTitle className="text-sm">Info Item</CardTitle>
                  </CardHeader>
                  <CardContent className="pt-0">
                    <div className="text-sm space-y-1">
                      <div><strong>Kategori:</strong> {selectedItem.kategori}</div>
                      <div><strong>Lokasi:</strong> {selectedItem.zona} - {selectedItem.lokasi}</div>
                      <div><strong>Stok Tersedia:</strong> {selectedItem.jumlah || 0} {selectedItem.satuan}</div>
                      {selectedItem.harga_perolehan && (
                        <div><strong>Harga Perolehan:</strong> {formatRupiah(selectedItem.harga_perolehan)}</div>
                      )}
                    </div>
                  </CardContent>
                </Card>
              )}

              {/* Jumlah */}
              <div className="space-y-2">
                <Label htmlFor="jumlah">Jumlah *</Label>
                <Input
                  id="jumlah"
                  type="number"
                  {...register('jumlah', { valueAsNumber: true })}
                  placeholder="1"
                  className={errors.jumlah ? 'border-red-500' : ''}
                />
                {errors.jumlah && (
                  <p className="text-sm text-red-500">{errors.jumlah.message}</p>
                )}
              </div>

              {/* Pembeli */}
              <div className="space-y-2">
                <Label htmlFor="pembeli">Nama Pembeli *</Label>
                <Input
                  id="pembeli"
                  {...register('pembeli')}
                  placeholder="Nama pembeli"
                  className={errors.pembeli ? 'border-red-500' : ''}
                />
                {errors.pembeli && (
                  <p className="text-sm text-red-500">{errors.pembeli.message}</p>
                )}
              </div>

              {/* Tanggal */}
              <div className="space-y-2">
                <Label htmlFor="tanggal">Tanggal Penjualan *</Label>
                <Input
                  id="tanggal"
                  type="date"
                  {...register('tanggal')}
                  className={errors.tanggal ? 'border-red-500' : ''}
                />
                {errors.tanggal && (
                  <p className="text-sm text-red-500">{errors.tanggal.message}</p>
                )}
              </div>

              {/* Catatan */}
              <div className="space-y-2">
                <Label htmlFor="catatan">Catatan</Label>
                <Textarea
                  id="catatan"
                  {...register('catatan')}
                  placeholder="Catatan tambahan (opsional)"
                  rows={3}
                />
              </div>
            </div>

            {/* Right Column - Price Breakdown */}
            <div className="space-y-4">
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Calculator className="h-5 w-5" />
                    Breakdown Harga
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  {/* Harga Dasar */}
                  <div className="space-y-2">
                    <Label htmlFor="harga_dasar" className="flex items-center gap-2">
                      <DollarSign className="h-4 w-4" />
                      Harga Dasar per Unit *
                    </Label>
                    <Input
                      id="harga_dasar"
                      type="number"
                      {...register('harga_dasar', { valueAsNumber: true })}
                      placeholder="0"
                      className={errors.harga_dasar ? 'border-red-500' : ''}
                    />
                    {errors.harga_dasar && (
                      <p className="text-sm text-red-500">{errors.harga_dasar.message}</p>
                    )}
                  </div>

                  {/* Sumbangan */}
                  <div className="space-y-2">
                    <Label htmlFor="sumbangan" className="flex items-center gap-2">
                      <Heart className="h-4 w-4" />
                      Sumbangan/Infaq
                    </Label>
                    <Input
                      id="sumbangan"
                      type="number"
                      {...register('sumbangan', { valueAsNumber: true })}
                      placeholder="0"
                      className={errors.sumbangan ? 'border-red-500' : ''}
                    />
                    {errors.sumbangan && (
                      <p className="text-sm text-red-500">{errors.sumbangan.message}</p>
                    )}
                  </div>

                  {/* Calculation Summary */}
                  <div className="border-t pt-4 space-y-2">
                    <div className="flex justify-between">
                      <span>Harga Dasar ({watchedValues.jumlah} × {formatRupiah(watchedValues.harga_dasar)}):</span>
                      <span className="font-medium">
                        {formatRupiah(watchedValues.harga_dasar * watchedValues.jumlah)}
                      </span>
                    </div>
                    <div className="flex justify-between">
                      <span>Sumbangan:</span>
                      <span className="font-medium">
                        {formatRupiah(watchedValues.sumbangan)}
                      </span>
                    </div>
                    <div className="border-t pt-2 flex justify-between font-bold text-lg">
                      <span>Total Nilai:</span>
                      <span className="text-green-600">{formatRupiah(totalNilai)}</span>
                    </div>
                    <div className="flex justify-between text-sm text-muted-foreground">
                      <span>Harga per Unit:</span>
                      <span>{formatRupiah(hargaSatuan)}</span>
                    </div>
                  </div>
                </CardContent>
              </Card>

              {/* Auto-Post Info */}
              <Card className="bg-blue-50 border-blue-200">
                <CardContent className="pt-4">
                  <div className="text-sm text-blue-800">
                    <div className="font-medium mb-2">ℹ️ Auto-Post ke Keuangan</div>
                    <p>
                      Transaksi ini akan otomatis tercatat di modul Keuangan dengan referensi 
                      "inventory_sale" untuk tracking yang terintegrasi.
                    </p>
                  </div>
                </CardContent>
              </Card>
            </div>
          </div>

          {/* Actions */}
          <div className="flex justify-end space-x-2 pt-4 border-t">
            <Button type="button" variant="outline" onClick={onCancel}>
              Batal
            </Button>
            <Button type="submit" disabled={isSubmitting}>
              {isSubmitting ? 'Menyimpan...' : 'Simpan Penjualan'}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
};

export default SalesForm;

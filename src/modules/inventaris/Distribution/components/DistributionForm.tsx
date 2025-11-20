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
import { createDistributionTransaction } from '@/services/distribution.service';
import { DistributionFormData } from '@/types/distribution.types';
import { useQuery } from '@tanstack/react-query';
import { listInventory } from '@/services/inventaris.service';
import { getSantriForDistribution } from '@/services/distribution.service';
import { Package, Users, User, Building } from 'lucide-react';

const distributionSchema = z.object({
  item_id: z.string().min(1, 'Item harus dipilih'),
  jumlah: z.number().int('Jumlah harus bilangan bulat').min(1, 'Jumlah minimal 1'),
  penerima: z.string().min(1, 'Nama penerima harus diisi'),
  penerima_santri_id: z.string().optional(),
  tanggal: z.string().min(1, 'Tanggal harus diisi'),
  catatan: z.string().optional()
});

type DistributionFormData = z.infer<typeof distributionSchema>;

interface DistributionFormProps {
  onSuccess: () => void;
  onCancel: () => void;
}

const DistributionForm: React.FC<DistributionFormProps> = ({ onSuccess, onCancel }) => {
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [selectedItem, setSelectedItem] = useState<any>(null);
  const [recipientType, setRecipientType] = useState<'santri' | 'unit' | 'manual'>('manual');
  const [santriSearch, setSantriSearch] = useState('');

  const {
    register,
    handleSubmit,
    formState: { errors },
    setValue,
    watch,
    reset
  } = useForm<DistributionFormData>({
    resolver: zodResolver(distributionSchema),
    defaultValues: {
      item_id: '',
      jumlah: 1,
      penerima: '',
      penerima_santri_id: '',
      tanggal: new Date().toISOString().split('T')[0],
      catatan: ''
    }
  });

  // Fetch inventory items
  const { data: inventoryData } = useQuery({
    queryKey: ['inventory-items-for-distribution'],
    queryFn: () => listInventory({ page: 1, pageSize: 100 }, {})
  });

  // Fetch santri for selection
  const { data: santriData } = useQuery({
    queryKey: ['santri-for-distribution', santriSearch],
    queryFn: () => getSantriForDistribution(santriSearch),
    enabled: recipientType === 'santri'
  });

  const watchedValues = watch();

  // Update selected item when item_id changes
  React.useEffect(() => {
    if (watchedValues.item_id && inventoryData?.data) {
      const item = inventoryData.data.find(i => i.id === watchedValues.item_id);
      setSelectedItem(item);
    }
  }, [watchedValues.item_id, inventoryData]);

  const onSubmit = async (data: DistributionFormData) => {
    try {
      setIsSubmitting(true);

      await createDistributionTransaction(data);
      toast.success('Distribusi berhasil dicatat!');
      onSuccess();
    } catch (error) {
      console.error('Error creating distribution transaction:', error);
      toast.error('Gagal mencatat distribusi');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleSantriSelect = (santri: any) => {
    setValue('penerima', santri.nama_lengkap);
    setValue('penerima_santri_id', santri.id);
    setSantriSearch('');
  };

  const recipientOptions = [
    { value: 'manual', label: 'Manual Input', icon: User },
    { value: 'santri', label: 'Santri', icon: Users },
    { value: 'unit', label: 'Unit/Kelas', icon: Building }
  ];

  return (
    <Dialog open={true} onOpenChange={onCancel}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Package className="h-5 w-5" />
            Form Distribusi Inventaris
          </DialogTitle>
        </DialogHeader>

        <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
          <div className="grid grid-cols-1 gap-6">
            {/* Item Selection */}
            <div className="space-y-2">
              <Label htmlFor="item_id">Item yang Didistribusikan *</Label>
              <Select
                value={watchedValues.item_id}
                onValueChange={(value) => setValue('item_id', value)}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Pilih item yang akan didistribusikan" />
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
                    <div><strong>Tipe:</strong> {selectedItem.tipe_item}</div>
                    <div><strong>Lokasi:</strong> {selectedItem.zona} - {selectedItem.lokasi}</div>
                    <div><strong>Stok Tersedia:</strong> {selectedItem.jumlah || 0} {selectedItem.satuan}</div>
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

            {/* Recipient Type Selection */}
            <div className="space-y-2">
              <Label>Tipe Penerima</Label>
              <div className="grid grid-cols-3 gap-2">
                {recipientOptions.map((option) => {
                  const Icon = option.icon;
                  return (
                    <Button
                      key={option.value}
                      type="button"
                      variant={recipientType === option.value ? 'default' : 'outline'}
                      onClick={() => setRecipientType(option.value as any)}
                      className="flex items-center gap-2"
                    >
                      <Icon className="h-4 w-4" />
                      {option.label}
                    </Button>
                  );
                })}
              </div>
            </div>

            {/* Recipient Selection */}
            {recipientType === 'santri' && (
              <div className="space-y-2">
                <Label htmlFor="santri-search">Cari Santri</Label>
                <Input
                  id="santri-search"
                  placeholder="Nama atau ID santri..."
                  value={santriSearch}
                  onChange={(e) => setSantriSearch(e.target.value)}
                />
                {santriData && santriData.length > 0 && (
                  <div className="max-h-40 overflow-y-auto border rounded-md">
                    {santriData.map((santri) => (
                      <div
                        key={santri.id}
                        className="p-2 hover:bg-gray-50 cursor-pointer border-b"
                        onClick={() => handleSantriSelect(santri)}
                      >
                        <div className="font-medium">{santri.nama_lengkap}</div>
                        <div className="text-sm text-muted-foreground">
                          {santri.id_santri} • {santri.kelas} • {santri.program}
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}

            {/* Manual Recipient Input */}
            {recipientType === 'manual' && (
              <div className="space-y-2">
                <Label htmlFor="penerima">Nama Penerima *</Label>
                <Input
                  id="penerima"
                  {...register('penerima')}
                  placeholder="Nama penerima"
                  className={errors.penerima ? 'border-red-500' : ''}
                />
                {errors.penerima && (
                  <p className="text-sm text-red-500">{errors.penerima.message}</p>
                )}
              </div>
            )}

            {/* Unit/Kelas Input */}
            {recipientType === 'unit' && (
              <div className="space-y-2">
                <Label htmlFor="penerima">Unit/Kelas *</Label>
                <Input
                  id="penerima"
                  {...register('penerima')}
                  placeholder="Nama unit atau kelas"
                  className={errors.penerima ? 'border-red-500' : ''}
                />
                {errors.penerima && (
                  <p className="text-sm text-red-500">{errors.penerima.message}</p>
                )}
              </div>
            )}

            {/* Tanggal */}
            <div className="space-y-2">
              <Label htmlFor="tanggal">Tanggal Distribusi *</Label>
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
                placeholder="Catatan distribusi (opsional)"
                rows={3}
              />
            </div>

            {/* Info Card */}
            <Card className="bg-blue-50 border-blue-200">
              <CardContent className="pt-4">
                <div className="text-sm text-blue-800">
                  <div className="font-medium mb-2">ℹ️ Informasi Distribusi</div>
                  <p>
                    Distribusi ini tidak akan tercatat di modul Keuangan karena bukan transaksi finansial. 
                    Hanya untuk tracking inventaris dan penerima.
                  </p>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Actions */}
          <div className="flex justify-end space-x-2 pt-4 border-t">
            <Button type="button" variant="outline" onClick={onCancel}>
              Batal
            </Button>
            <Button type="submit" disabled={isSubmitting}>
              {isSubmitting ? 'Menyimpan...' : 'Simpan Distribusi'}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
};

export default DistributionForm;

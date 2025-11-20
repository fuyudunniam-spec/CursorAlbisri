import React, { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { useForm, useFieldArray } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { toast } from 'sonner';
import { createMassDistribution } from '@/services/distribution.service';
import { MassDistributionData } from '@/types/distribution.types';
import { useQuery } from '@tanstack/react-query';
import { listInventory } from '@/services/inventaris.service';
import { getSantriForDistribution } from '@/services/distribution.service';
import { 
  Package, 
  Users, 
  Plus, 
  Trash2, 
  User, 
  Building,
  CheckCircle,
  AlertTriangle
} from 'lucide-react';

const massDistributionSchema = z.object({
  item_id: z.string().min(1, 'Item harus dipilih'),
  tanggal: z.string().min(1, 'Tanggal harus diisi'),
  distributions: z.array(z.object({
    penerima: z.string().min(1, 'Nama penerima harus diisi'),
    penerima_santri_id: z.string().optional(),
    jumlah: z.number().int('Jumlah harus bilangan bulat').min(1, 'Jumlah minimal 1'),
    catatan: z.string().optional()
  })).min(1, 'Minimal 1 penerima')
});

type MassDistributionFormData = z.infer<typeof massDistributionSchema>;

interface MassDistributionProps {
  onSuccess: () => void;
  onCancel: () => void;
}

const MassDistribution: React.FC<MassDistributionProps> = ({ onSuccess, onCancel }) => {
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [selectedItem, setSelectedItem] = useState<any>(null);
  const [santriSearch, setSantriSearch] = useState('');
  const [showPreview, setShowPreview] = useState(false);

  const {
    register,
    handleSubmit,
    formState: { errors },
    setValue,
    watch,
    control
  } = useForm<MassDistributionFormData>({
    resolver: zodResolver(massDistributionSchema),
    defaultValues: {
      item_id: '',
      tanggal: new Date().toISOString().split('T')[0],
      distributions: [
        { penerima: '', penerima_santri_id: '', jumlah: 1, catatan: '' }
      ]
    }
  });

  const { fields, append, remove } = useFieldArray({
    control,
    name: 'distributions'
  });

  // Fetch inventory items
  const { data: inventoryData } = useQuery({
    queryKey: ['inventory-items-for-mass-distribution'],
    queryFn: () => listInventory({ page: 1, pageSize: 100 }, {})
  });

  // Fetch santri for selection
  const { data: santriData } = useQuery({
    queryKey: ['santri-for-mass-distribution', santriSearch],
    queryFn: () => getSantriForDistribution(santriSearch),
    enabled: santriSearch.length > 0
  });

  const watchedValues = watch();

  // Update selected item when item_id changes
  React.useEffect(() => {
    if (watchedValues.item_id && inventoryData?.data) {
      const item = inventoryData.data.find(i => i.id === watchedValues.item_id);
      setSelectedItem(item);
    }
  }, [watchedValues.item_id, inventoryData]);

  const onSubmit = async (data: MassDistributionFormData) => {
    try {
      setIsSubmitting(true);

      await createMassDistribution(data);
      toast.success(`Distribusi massal berhasil! ${data.distributions.length} penerima.`);
      onSuccess();
    } catch (error) {
      console.error('Error creating mass distribution:', error);
      toast.error('Gagal mencatat distribusi massal');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleSantriSelect = (santri: any, index: number) => {
    setValue(`distributions.${index}.penerima`, santri.nama_lengkap);
    setValue(`distributions.${index}.penerima_santri_id`, santri.id);
    setSantriSearch('');
  };

  const addRecipient = () => {
    append({ penerima: '', penerima_santri_id: '', jumlah: 1, catatan: '' });
  };

  const removeRecipient = (index: number) => {
    if (fields.length > 1) {
      remove(index);
    }
  };

  const totalItems = watchedValues.distributions?.reduce((sum, dist) => sum + (dist.jumlah || 0), 0) || 0;
  const availableStock = selectedItem?.jumlah || 0;
  const isStockSufficient = totalItems <= availableStock;

  return (
    <Dialog open={true} onOpenChange={onCancel}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Users className="h-5 w-5" />
            Distribusi Massal Inventaris
          </DialogTitle>
        </DialogHeader>

        <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Left Column - Item Selection */}
            <div className="space-y-4">
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

              {/* Stock Check */}
              {selectedItem && (
                <Card className={isStockSufficient ? 'bg-green-50 border-green-200' : 'bg-red-50 border-red-200'}>
                  <CardContent className="pt-4">
                    <div className="flex items-center gap-2">
                      {isStockSufficient ? (
                        <CheckCircle className="h-4 w-4 text-green-600" />
                      ) : (
                        <AlertTriangle className="h-4 w-4 text-red-600" />
                      )}
                      <div className="text-sm">
                        <div className="font-medium">
                          {isStockSufficient ? 'Stok Cukup' : 'Stok Tidak Cukup'}
                        </div>
                        <div className="text-muted-foreground">
                          Total: {totalItems} / Tersedia: {availableStock}
                        </div>
                      </div>
                    </div>
                  </CardContent>
                </Card>
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
            </div>

            {/* Right Column - Recipients */}
            <div className="space-y-4">
              <div className="flex justify-between items-center">
                <Label>Daftar Penerima</Label>
                <Button type="button" onClick={addRecipient} size="sm" variant="outline">
                  <Plus className="h-4 w-4 mr-1" />
                  Tambah Penerima
                </Button>
              </div>

              <div className="space-y-3 max-h-96 overflow-y-auto">
                {fields.map((field, index) => (
                  <Card key={field.id} className="p-4">
                    <div className="space-y-3">
                      <div className="flex justify-between items-center">
                        <span className="text-sm font-medium">Penerima #{index + 1}</span>
                        {fields.length > 1 && (
                          <Button
                            type="button"
                            onClick={() => removeRecipient(index)}
                            size="sm"
                            variant="outline"
                            className="text-red-600 hover:text-red-700"
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        )}
                      </div>

                      {/* Santri Search */}
                      <div className="space-y-2">
                        <Label htmlFor={`santri-search-${index}`}>Cari Santri (Opsional)</Label>
                        <Input
                          id={`santri-search-${index}`}
                          placeholder="Nama atau ID santri..."
                          value={santriSearch}
                          onChange={(e) => setSantriSearch(e.target.value)}
                        />
                        {santriData && santriData.length > 0 && (
                          <div className="max-h-32 overflow-y-auto border rounded-md">
                            {santriData.map((santri) => (
                              <div
                                key={santri.id}
                                className="p-2 hover:bg-gray-50 cursor-pointer border-b"
                                onClick={() => handleSantriSelect(santri, index)}
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

                      {/* Manual Input */}
                      <div className="space-y-2">
                        <Label htmlFor={`penerima-${index}`}>Nama Penerima *</Label>
                        <Input
                          id={`penerima-${index}`}
                          {...register(`distributions.${index}.penerima`)}
                          placeholder="Nama penerima"
                        />
                        {errors.distributions?.[index]?.penerima && (
                          <p className="text-sm text-red-500">
                            {errors.distributions[index]?.penerima?.message}
                          </p>
                        )}
                      </div>

                      <div className="grid grid-cols-2 gap-2">
                        <div className="space-y-2">
                          <Label htmlFor={`jumlah-${index}`}>Jumlah *</Label>
                          <Input
                            id={`jumlah-${index}`}
                            type="number"
                            {...register(`distributions.${index}.jumlah`, { valueAsNumber: true })}
                            placeholder="1"
                          />
                          {errors.distributions?.[index]?.jumlah && (
                            <p className="text-sm text-red-500">
                              {errors.distributions[index]?.jumlah?.message}
                            </p>
                          )}
                        </div>

                        <div className="space-y-2">
                          <Label htmlFor={`catatan-${index}`}>Catatan</Label>
                          <Input
                            id={`catatan-${index}`}
                            {...register(`distributions.${index}.catatan`)}
                            placeholder="Opsional"
                          />
                        </div>
                      </div>
                    </div>
                  </Card>
                ))}
              </div>

              {errors.distributions && (
                <p className="text-sm text-red-500">{errors.distributions.message}</p>
              )}
            </div>
          </div>

          {/* Summary */}
          <Card className="bg-blue-50 border-blue-200">
            <CardContent className="pt-4">
              <div className="text-sm text-blue-800">
                <div className="font-medium mb-2">📊 Ringkasan Distribusi Massal</div>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <div><strong>Total Penerima:</strong> {fields.length}</div>
                    <div><strong>Total Item:</strong> {totalItems}</div>
                  </div>
                  <div>
                    <div><strong>Stok Tersedia:</strong> {availableStock}</div>
                    <div><strong>Status:</strong> 
                      <Badge variant={isStockSufficient ? 'default' : 'destructive'} className="ml-2">
                        {isStockSufficient ? 'Siap' : 'Stok Kurang'}
                      </Badge>
                    </div>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Actions */}
          <div className="flex justify-end space-x-2 pt-4 border-t">
            <Button type="button" variant="outline" onClick={onCancel}>
              Batal
            </Button>
            <Button 
              type="submit" 
              disabled={isSubmitting || !isStockSufficient}
            >
              {isSubmitting ? 'Menyimpan...' : 'Simpan Distribusi Massal'}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
};

export default MassDistribution;

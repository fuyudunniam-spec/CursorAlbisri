import { memo, useState, useEffect } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Checkbox } from "@/components/ui/checkbox";
import { Badge } from "@/components/ui/badge";
import { useCreateTransaction } from "@/hooks/useInventoryTransactions";
import { useInventoryList } from "@/hooks/useInventory";
import { supabase } from "@/integrations/supabase/client";
import { formatRupiah } from "@/utils/inventaris.utils";
import { Users, Package, Calendar, FileText } from "lucide-react";

const massDistributionSchema = z.object({
  item_id: z.string().min(1, "Pilih item terlebih dahulu"),
  jumlah_per_santri: z.number().int("Jumlah harus berupa bilangan bulat").min(1, "Jumlah minimal 1"),
  kategori_bantuan: z.string().min(1, "Pilih kategori bantuan"),
  tanggal: z.string().min(1, "Tanggal wajib diisi"),
  catatan: z.string().max(500, "Catatan maksimal 500 karakter").optional(),
  selected_santri: z.array(z.string()).min(1, "Pilih minimal 1 santri"),
});

type MassDistributionFormData = z.infer<typeof massDistributionSchema>;

type Santri = {
  id: string;
  nama_lengkap: string;
  status_santri: string;
  kategori: string;
};

type Props = {
  isOpen: boolean;
  onClose: () => void;
};

const MassDistributionForm = memo(({ isOpen, onClose }: Props) => {
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [santriList, setSantriList] = useState<Santri[]>([]);
  const [selectedSantri, setSelectedSantri] = useState<string[]>([]);
  const [isLoadingSantri, setIsLoadingSantri] = useState(false);
  const createMutation = useCreateTransaction();
  
  const { data: inventoryData } = useInventoryList(
    { page: 1, pageSize: 1000 },
    {},
    { column: "nama_barang", direction: "asc" }
  );

  const form = useForm<MassDistributionFormData>({
    resolver: zodResolver(massDistributionSchema),
    defaultValues: {
      item_id: "",
      jumlah_per_santri: 1,
      kategori_bantuan: "",
      tanggal: new Date().toISOString().split('T')[0],
      catatan: "",
      selected_santri: [],
    }
  });

  // Update form when selectedSantri changes
  useEffect(() => {
    form.setValue("selected_santri", selectedSantri);
  }, [selectedSantri, form]);

  // Load santri binaan when component mounts
  useEffect(() => {
    if (isOpen) {
      loadSantriBinaan();
    }
  }, [isOpen]);

  const loadSantriBinaan = async () => {
    try {
      setIsLoadingSantri(true);
      const { data, error } = await supabase
        .from('santri')
        .select('id, nama_lengkap, status_santri, kategori')
        .in('kategori', ['Binaan Mukim', 'Binaan Non-Mukim'])
        .eq('status', 'Aktif')
        .order('nama_lengkap');

      if (error) throw error;
      setSantriList(data || []);
    } catch (error) {
      console.error('Error loading santri:', error);
    } finally {
      setIsLoadingSantri(false);
    }
  };

  const selectedItemId = form.watch("item_id");
  const jumlahPerSantri = form.watch("jumlah_per_santri");
  const totalSantri = selectedSantri.length;
  const totalQuantity = jumlahPerSantri * totalSantri;

  // Get selected item details
  const selectedItem = inventoryData?.data?.find((item: any) => item.id === selectedItemId);
  const availableStock = selectedItem?.jumlah || 0;

  const onSubmit = async (data: MassDistributionFormData) => {
    try {
      setIsSubmitting(true);
      
      // Check stock availability
      if (totalQuantity > availableStock) {
        alert(`Stok tidak mencukupi! Tersedia: ${availableStock}, Dibutuhkan: ${totalQuantity}`);
        return;
      }

      // Create transactions for each selected santri
      const transactions = selectedSantri.map(santriId => {
        const santri = santriList.find(s => s.id === santriId);
        return {
          item_id: data.item_id,
          tipe: "Keluar" as const,
          keluar_mode: "Distribusi" as const,
          jumlah: data.jumlah_per_santri,
          tanggal: data.tanggal,
          catatan: `Distribusi ke ${santri?.nama_lengkap} - ${data.catatan || ''}`.trim(),
          penerima: santri?.nama_lengkap || '',
          penerima_santri_id: santriId,
          kategori_barang: data.kategori_bantuan,
          nama_barang: selectedItem?.nama_barang || '',
          satuan: selectedItem?.satuan || 'pcs',
          harga_satuan: null, // Distribusi tidak punya harga
        };
      });

      // Submit all transactions
      for (const transaction of transactions) {
        await createMutation.mutateAsync(transaction);
      }
      
      form.reset();
      setSelectedSantri([]);
      onClose();
      
      alert(`Berhasil mendistribusikan ${totalQuantity} ${selectedItem?.satuan} ke ${totalSantri} santri binaan!`);
    } catch (error) {
      console.error("Error saving mass distribution:", error);
      alert("Terjadi kesalahan saat menyimpan distribusi massal!");
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleClose = () => {
    form.reset();
    setSelectedSantri([]);
    onClose();
  };

  const toggleSantri = (santriId: string) => {
    setSelectedSantri(prev => 
      prev.includes(santriId) 
        ? prev.filter(id => id !== santriId)
        : [...prev, santriId]
    );
  };

  const selectAllSantri = () => {
    setSelectedSantri(santriList.map(s => s.id));
  };

  const clearSelection = () => {
    setSelectedSantri([]);
  };

  return (
    <Dialog open={isOpen} onOpenChange={handleClose}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Package className="h-5 w-5" />
            Distribusi Massal ke Santri Binaan
          </DialogTitle>
        </DialogHeader>

        <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
          {/* Item Selection */}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label htmlFor="item_id">Item yang akan didistribusikan *</Label>
              <Select
                value={form.watch("item_id")}
                onValueChange={(value) => form.setValue("item_id", value)}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Pilih item" />
                </SelectTrigger>
                <SelectContent>
                  {inventoryData?.data?.map((item: any) => (
                    <SelectItem key={item.id} value={item.id}>
                      {item.nama_barang} ({item.jumlah || 0} {item.satuan})
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              {form.formState.errors.item_id && (
                <p className="text-sm text-red-600">{form.formState.errors.item_id.message}</p>
              )}
            </div>

            <div>
              <Label htmlFor="kategori_bantuan">Kategori Bantuan *</Label>
              <Select
                value={form.watch("kategori_bantuan")}
                onValueChange={(value) => form.setValue("kategori_bantuan", value)}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Pilih kategori" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="Sembako">Sembako</SelectItem>
                  <SelectItem value="Seragam">Seragam</SelectItem>
                  <SelectItem value="Buku">Buku</SelectItem>
                  <SelectItem value="Alat Tulis">Alat Tulis</SelectItem>
                  <SelectItem value="Kesehatan">Kesehatan</SelectItem>
                  <SelectItem value="Lainnya">Lainnya</SelectItem>
                </SelectContent>
              </Select>
              {form.formState.errors.kategori_bantuan && (
                <p className="text-sm text-red-600">{form.formState.errors.kategori_bantuan.message}</p>
              )}
            </div>
          </div>

          {/* Quantity and Date */}
          <div className="grid grid-cols-3 gap-4">
            <div>
              <Label htmlFor="jumlah_per_santri">Jumlah per Santri *</Label>
              <Input
                type="number"
                min="1"
                {...form.register("jumlah_per_santri", { valueAsNumber: true })}
              />
              {form.formState.errors.jumlah_per_santri && (
                <p className="text-sm text-red-600">{form.formState.errors.jumlah_per_santri.message}</p>
              )}
            </div>

            <div>
              <Label htmlFor="tanggal">Tanggal Distribusi *</Label>
              <Input
                type="date"
                {...form.register("tanggal")}
              />
              {form.formState.errors.tanggal && (
                <p className="text-sm text-red-600">{form.formState.errors.tanggal.message}</p>
              )}
            </div>

            <div>
              <Label>Total Quantity</Label>
              <div className="p-2 bg-gray-50 rounded-md">
                <div className="text-sm font-medium">
                  {totalQuantity} {selectedItem?.satuan || 'unit'}
                </div>
                <div className="text-xs text-gray-500">
                  Stok tersedia: {availableStock} {selectedItem?.satuan || 'unit'}
                </div>
                {totalQuantity > availableStock && (
                  <div className="text-xs text-red-500 font-medium">
                    ⚠️ Stok tidak mencukupi!
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Santri Selection */}
          <div>
            <div className="flex items-center justify-between mb-3">
              <Label className="text-base font-medium">Pilih Santri Binaan *</Label>
              <div className="flex gap-2">
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={selectAllSantri}
                  disabled={isLoadingSantri}
                >
                  Pilih Semua
                </Button>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={clearSelection}
                >
                  Hapus Pilihan
                </Button>
              </div>
            </div>

            {isLoadingSantri ? (
              <div className="text-center py-4">Memuat data santri...</div>
            ) : (
              <div className="grid grid-cols-2 gap-2 max-h-60 overflow-y-auto border rounded-md p-3">
                {santriList.map((santri) => (
                  <div key={santri.id} className="flex items-center space-x-2">
                    <Checkbox
                      id={santri.id}
                      checked={selectedSantri.includes(santri.id)}
                      onCheckedChange={() => toggleSantri(santri.id)}
                    />
                    <Label
                      htmlFor={santri.id}
                      className="flex-1 cursor-pointer text-sm"
                    >
                      <div className="font-medium">{santri.nama_lengkap}</div>
                      <div className="flex gap-1">
                        <Badge variant="secondary" className="text-xs">
                          {santri.kategori}
                        </Badge>
                        <Badge variant="outline" className="text-xs">
                          {santri.status_santri}
                        </Badge>
                      </div>
                    </Label>
                  </div>
                ))}
              </div>
            )}

            {selectedSantri.length > 0 && (
              <div className="mt-2 p-2 bg-blue-50 rounded-md">
                <div className="text-sm font-medium text-blue-800">
                  Terpilih: {selectedSantri.length} santri
                </div>
                <div className="text-xs text-blue-600">
                  Total distribusi: {totalQuantity} {selectedItem?.satuan || 'unit'}
                </div>
              </div>
            )}
          </div>

          {/* Notes */}
          <div>
            <Label htmlFor="catatan">Catatan (Opsional)</Label>
            <Textarea
              placeholder="Tambahkan catatan untuk distribusi ini..."
              {...form.register("catatan")}
            />
            {form.formState.errors.catatan && (
              <p className="text-sm text-red-600">{form.formState.errors.catatan.message}</p>
            )}
          </div>

          <DialogFooter>
            <Button type="button" variant="outline" onClick={handleClose}>
              Batal
            </Button>
            <Button 
              type="submit" 
              disabled={isSubmitting || selectedSantri.length === 0 || totalQuantity > availableStock}
            >
              {isSubmitting ? "Menyimpan..." : `Distribusi ke ${selectedSantri.length} Santri`}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
});

export default MassDistributionForm;

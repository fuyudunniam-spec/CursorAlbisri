import { memo, useState, useEffect } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { useCreateInventoryItem, useUpdateInventoryItem } from "@/hooks/useInventory";
import { formatRupiah, parseRupiah, getKategoriOptions, ZONA_OPTIONS, SATUAN_OPTIONS, getContohNamaBarang, CONTOH_NAMA_BARANG_BY_CATEGORY, normalizeKondisi } from "@/utils/inventaris.utils";

const inventorySchema = z.object({
  nama_barang: z.string().min(3, "Nama barang minimal 3 karakter").max(100, "Nama barang maksimal 100 karakter"),
  tipe_item: z.enum(["Aset", "Komoditas"], { errorMap: () => ({ message: "Pilih tipe item yang valid" }) }),
  kategori: z.string().min(1, "Kategori wajib dipilih"),
  zona: z.enum(["Gedung Putra", "Gedung Putri", "Area luar"], { errorMap: () => ({ message: "Pilih zona yang valid" }) }),
  lokasi: z.string().min(1, "Lokasi wajib diisi"),
  kondisi: z.enum(["Baik", "Perlu perbaikan", "Rusak"], { errorMap: () => ({ message: "Pilih kondisi yang valid" }) }),
  jumlah: z.number().int("Jumlah harus berupa bilangan bulat").min(0, "Jumlah tidak boleh negatif"),
  satuan: z.string().min(1, "Satuan wajib diisi"),
  harga_perolehan: z.number().min(0, "Harga tidak boleh negatif").optional(),
  sumber: z.enum(["Pembelian", "Donasi"]).optional().nullable(),
  has_expiry: z.boolean().optional().default(false),
  tanggal_kedaluwarsa: z.string().optional().nullable(),
  min_stock: z.number().int("Min-stock harus bilangan bulat").min(0, "Min-stock tidak boleh negatif").default(10),
  keterangan: z.string().max(500, "Keterangan maksimal 500 karakter").optional(),
});

type InventoryFormData = z.infer<typeof inventorySchema>;

type Props = {
  isOpen: boolean;
  onClose: () => void;
  editingItem?: any;
};

const InventoryForm = memo(({ isOpen, onClose, editingItem }: Props) => {
  const [isSubmitting, setIsSubmitting] = useState(false);
  const createMutation = useCreateInventoryItem();
  const updateMutation = useUpdateInventoryItem(editingItem?.id || "");

  const form = useForm<InventoryFormData>({
    resolver: zodResolver(inventorySchema),
    defaultValues: {
      nama_barang: "",
      tipe_item: "Aset",
      kategori: "",
      zona: "Gedung Putra",
      lokasi: "",
      kondisi: "Baik",
      jumlah: 0,
      satuan: "pcs",
      harga_perolehan: 0,
      sumber: null,
      has_expiry: false,
      tanggal_kedaluwarsa: null,
      min_stock: 10,
      keterangan: "",
    }
  });

  const selectedTipeItem = form.watch("tipe_item");
  const selectedKategori = form.watch("kategori");
  const hasExpiry = form.watch("has_expiry");

  const kategoriOptions = getKategoriOptions(selectedTipeItem);
  const contohNama = getContohNamaBarang(selectedKategori || "");

  // Auto-populate form when editing
  useEffect(() => {
    if (editingItem && isOpen) {
      form.reset({
        nama_barang: editingItem.nama_barang || "",
        tipe_item: editingItem.tipe_item || "Aset",
        kategori: editingItem.kategori || "",
        zona: editingItem.zona || "Gedung Putra",
        lokasi: editingItem.lokasi || "",
        kondisi: editingItem.kondisi ? normalizeKondisi(editingItem.kondisi) : "Baik",
        jumlah: editingItem.jumlah || 0,
        satuan: editingItem.satuan || "pcs",
        harga_perolehan: editingItem.harga_perolehan || 0,
        sumber: editingItem.sumber || null,
        has_expiry: editingItem.has_expiry || false,
        tanggal_kedaluwarsa: editingItem.tanggal_kedaluwarsa || null,
        min_stock: editingItem.min_stock || 10,
        keterangan: editingItem.keterangan || "",
      });
    } else if (!isOpen) {
      form.reset();
    }
  }, [editingItem, isOpen, form]);

  const onSubmit = async (data: InventoryFormData) => {
    try {
      setIsSubmitting(true);
      
      if (editingItem) {
        await updateMutation.mutateAsync(data);
      } else {
        await createMutation.mutateAsync(data);
      }
      
      form.reset();
      onClose();
    } catch (error) {
      console.error("Error saving inventory item:", error);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleClose = () => {
    form.reset();
    onClose();
  };

  return (
    <Dialog open={isOpen} onOpenChange={handleClose}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>
            {editingItem ? "Edit Item Inventaris" : "Tambah Item Inventaris Baru"}
          </DialogTitle>
        </DialogHeader>

        <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label htmlFor="nama_barang">Nama Barang *</Label>
              <Input
                {...form.register("nama_barang")}
                placeholder={contohNama}
                className="font-medium"
              />
              {form.formState.errors.nama_barang && (
                <p className="text-sm text-red-600">{form.formState.errors.nama_barang.message}</p>
              )}
              {/* Helper text yang muncul jika kategori sudah dipilih */}
              {selectedKategori && CONTOH_NAMA_BARANG_BY_CATEGORY[selectedKategori] && (
                <div className="mt-1 p-2 bg-blue-50 border border-blue-200 rounded text-xs">
                  <p className="font-medium text-blue-900 mb-1">
                    💡 Format yang disarankan untuk {selectedKategori}:
                  </p>
                  <ul className="list-disc list-inside space-y-0.5 text-blue-800">
                    {CONTOH_NAMA_BARANG_BY_CATEGORY[selectedKategori].slice(0, 3).map((contoh, idx) => (
                      <li key={idx}>{contoh}</li>
                    ))}
                  </ul>
                  <p className="text-blue-700 mt-1">
                    Pastikan nama mencantumkan ukuran/spesifikasi agar laporan jelas!
                  </p>
                </div>
              )}
              {/* Helper text umum jika kategori belum dipilih */}
              {!selectedKategori && (
                <p className="text-xs text-gray-500 mt-1">
                  💡 <strong>Penting:</strong> Cantumkan spesifikasi/ukuran di nama barang agar laporan jelas.
                  <br />
                  ✅ Contoh baik: "Beras 25kg", "Minyak Goreng 2 liter", "Indomie Goreng 70gr"
                  <br />
                  ❌ Contoh kurang jelas: "Beras", "Minyak", "Indomie"
                </p>
              )}
            </div>

            <div>
              <Label htmlFor="tipe_item">Tipe Item *</Label>
              <Select
                value={form.watch("tipe_item")}
                onValueChange={(value: any) => {
                  form.setValue("tipe_item", value);
                  form.setValue("kategori", ""); // Reset kategori when tipe changes
                }}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="Aset">Aset</SelectItem>
                  <SelectItem value="Komoditas">Komoditas</SelectItem>
                </SelectContent>
              </Select>
              {form.formState.errors.tipe_item && (
                <p className="text-sm text-red-600">{form.formState.errors.tipe_item.message}</p>
              )}
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label htmlFor="kategori">Kategori *</Label>
              <Select
                value={form.watch("kategori")}
                onValueChange={(value) => form.setValue("kategori", value)}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Pilih kategori" />
                </SelectTrigger>
                <SelectContent>
                  {kategoriOptions.map(kategori => (
                    <SelectItem key={kategori} value={kategori}>{kategori}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
              {form.formState.errors.kategori && (
                <p className="text-sm text-red-600">{form.formState.errors.kategori.message}</p>
              )}
            </div>

            <div>
              <Label htmlFor="kondisi">Kondisi *</Label>
              <Select
                value={form.watch("kondisi")}
                onValueChange={(value: any) => form.setValue("kondisi", value)}
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
              {form.formState.errors.kondisi && (
                <p className="text-sm text-red-600">{form.formState.errors.kondisi.message}</p>
              )}
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label htmlFor="zona">Zona *</Label>
              <Select
                value={form.watch("zona")}
                onValueChange={(value: any) => form.setValue("zona", value)}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {ZONA_OPTIONS.map(option => (
                    <SelectItem key={option.value} value={option.value}>{option.label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
              {form.formState.errors.zona && (
                <p className="text-sm text-red-600">{form.formState.errors.zona.message}</p>
              )}
            </div>

            <div>
              <Label htmlFor="lokasi">Lokasi *</Label>
              <Input
                {...form.register("lokasi")}
                placeholder="Masukkan lokasi spesifik"
              />
              {form.formState.errors.lokasi && (
                <p className="text-sm text-red-600">{form.formState.errors.lokasi.message}</p>
              )}
            </div>
          </div>

          <div className="grid grid-cols-3 gap-4">
            <div>
              <Label htmlFor="jumlah">Jumlah *</Label>
              <Input
                type="number"
                {...form.register("jumlah", { valueAsNumber: true })}
                min="0"
              />
              {form.formState.errors.jumlah && (
                <p className="text-sm text-red-600">{form.formState.errors.jumlah.message}</p>
              )}
            </div>

            <div>
              <Label htmlFor="satuan">Satuan *</Label>
              <Select
                value={form.watch("satuan")}
                onValueChange={(value) => form.setValue("satuan", value)}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {SATUAN_OPTIONS.map(satuan => (
                    <SelectItem key={satuan} value={satuan}>{satuan}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
              {form.formState.errors.satuan && (
                <p className="text-sm text-red-600">{form.formState.errors.satuan.message}</p>
              )}
            </div>

            <div>
              <Label htmlFor="harga_perolehan">Harga Perolehan</Label>
              <Input
                type="text"
                placeholder="Rp 0"
                value={form.watch("harga_perolehan") ? formatRupiah(form.watch("harga_perolehan")!) : ""}
                onChange={(e) => {
                  const value = parseRupiah(e.target.value);
                  form.setValue("harga_perolehan", value);
                }}
              />
              {form.formState.errors.harga_perolehan && (
                <p className="text-sm text-red-600">{form.formState.errors.harga_perolehan.message}</p>
              )}
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label htmlFor="sumber">Sumber</Label>
              <Select
                value={form.watch("sumber") || undefined}
                onValueChange={(value) => form.setValue("sumber", value as "Pembelian" | "Donasi")}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Pilih sumber (opsional)" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="Pembelian">Pembelian</SelectItem>
                  <SelectItem value="Donasi">Donasi</SelectItem>
                </SelectContent>
              </Select>
              {form.formState.errors.sumber && (
                <p className="text-sm text-red-600">{form.formState.errors.sumber.message}</p>
              )}
            </div>

            <div>
              <Label htmlFor="min_stock">Min Stock</Label>
              <Input
                type="number"
                {...form.register("min_stock", { valueAsNumber: true })}
                min="0"
              />
              {form.formState.errors.min_stock && (
                <p className="text-sm text-red-600">{form.formState.errors.min_stock.message}</p>
              )}
            </div>
          </div>

          <div className="flex items-center space-x-2">
            <Switch
              id="has_expiry"
              checked={hasExpiry}
              onCheckedChange={(checked) => {
                form.setValue("has_expiry", checked);
                if (!checked) form.setValue("tanggal_kedaluwarsa", null);
              }}
            />
            <Label htmlFor="has_expiry">Memiliki tanggal kedaluwarsa</Label>
          </div>

          {hasExpiry && (
            <div>
              <Label htmlFor="tanggal_kedaluwarsa">Tanggal Kedaluwarsa</Label>
              <Input
                type="date"
                {...form.register("tanggal_kedaluwarsa")}
                min={new Date().toISOString().split('T')[0]}
              />
              {form.formState.errors.tanggal_kedaluwarsa && (
                <p className="text-sm text-red-600">{form.formState.errors.tanggal_kedaluwarsa.message}</p>
              )}
            </div>
          )}

          <div>
            <Label htmlFor="keterangan">Keterangan</Label>
            <Textarea
              {...form.register("keterangan")}
              placeholder="Keterangan tambahan (opsional)"
              rows={3}
            />
            {form.formState.errors.keterangan && (
              <p className="text-sm text-red-600">{form.formState.errors.keterangan.message}</p>
            )}
          </div>

          <DialogFooter>
            <Button type="button" variant="outline" onClick={handleClose}>
              Batal
            </Button>
            <Button type="submit" disabled={isSubmitting}>
              {isSubmitting ? "Menyimpan..." : "Simpan"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
});

InventoryForm.displayName = "InventoryForm";

export default InventoryForm;

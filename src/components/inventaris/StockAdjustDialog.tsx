import { memo, useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { useCreateTransaction } from "@/hooks/useInventoryTransactions";
import { formatRupiah, parseRupiah } from "@/utils/inventaris.utils";

const adjustSchema = z.object({
  item_id: z.string().min(1, "Pilih item terlebih dahulu"),
  tipe: z.enum(["Masuk", "Keluar"], { errorMap: () => ({ message: "Pilih tipe penyesuaian" }) }),
  jumlah: z.number().int("Jumlah harus berupa bilangan bulat").min(1, "Jumlah minimal 1"),
  harga_satuan: z.number().min(0, "Harga tidak boleh negatif").optional(),
  penerima: z.string().min(3, "Nama penerima minimal 3 karakter").optional(),
  alasan: z.string().min(5, "Alasan minimal 5 karakter"),
  tanggal: z.string().min(1, "Tanggal wajib diisi"),
});

type AdjustFormData = z.infer<typeof adjustSchema>;

type Props = {
  isOpen: boolean;
  onClose: () => void;
  item?: {
    id: string;
    nama_barang: string;
    jumlah: number;
    satuan: string;
  };
};

const StockAdjustDialog = memo(({ isOpen, onClose, item }: Props) => {
  const [isSubmitting, setIsSubmitting] = useState(false);
  const createTransaction = useCreateTransaction();

  const form = useForm<AdjustFormData>({
    resolver: zodResolver(adjustSchema),
    defaultValues: {
      item_id: item?.id || "",
      tipe: "Masuk",
      jumlah: 1,
      harga_satuan: 0,
      penerima: "",
      alasan: "",
      tanggal: new Date().toISOString().split('T')[0],
    }
  });

  const selectedTipe = form.watch("tipe");
  const currentStock = item?.jumlah || 0;

  const onSubmit = async (data: AdjustFormData) => {
    try {
      setIsSubmitting(true);
      
      // Create transaction record
      await createTransaction.mutateAsync({
        item_id: data.item_id,
        tipe: data.tipe,
        jumlah: data.jumlah,
        harga_satuan: data.harga_satuan,
        penerima: data.penerima,
        tanggal: data.tanggal,
        catatan: `Penyesuaian stok: ${data.alasan}`,
      });
      
      form.reset();
      onClose();
    } catch (error) {
      console.error("Error adjusting stock:", error);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleClose = () => {
    form.reset();
    onClose();
  };

  if (!item) return null;

  return (
    <Dialog open={isOpen} onOpenChange={handleClose}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle>Penyesuaian Stok - {item.nama_barang}</DialogTitle>
        </DialogHeader>

        <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
          <div className="p-4 bg-gray-50 rounded-lg">
            <h4 className="font-medium mb-2">Informasi Item</h4>
            <div className="grid grid-cols-2 gap-4 text-sm">
              <div>
                <span className="text-gray-600">Stok Saat Ini:</span>
                <span className="ml-2 font-medium">{currentStock} {item.satuan}</span>
              </div>
              <div>
                <span className="text-gray-600">Satuan:</span>
                <span className="ml-2 font-medium">{item.satuan}</span>
              </div>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label htmlFor="tipe">Tipe Penyesuaian *</Label>
              <select
                {...form.register("tipe")}
                className="w-full px-3 py-2 border rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              >
                <option value="Masuk">Tambah Stok (+)</option>
                <option value="Keluar">Kurangi Stok (-)</option>
              </select>
              {form.formState.errors.tipe && (
                <p className="text-sm text-red-600">{form.formState.errors.tipe.message}</p>
              )}
            </div>

            <div>
              <Label htmlFor="jumlah">Jumlah *</Label>
              <Input
                type="number"
                {...form.register("jumlah", { valueAsNumber: true })}
                min="1"
                placeholder="Masukkan jumlah"
              />
              {form.formState.errors.jumlah && (
                <p className="text-sm text-red-600">{form.formState.errors.jumlah.message}</p>
              )}
              {selectedTipe === "Keluar" && currentStock > 0 && (
                <p className="text-sm text-gray-600">
                  Stok tersedia: {currentStock} {item.satuan}
                </p>
              )}
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label htmlFor="harga_satuan">Harga Satuan</Label>
              <Input
                type="text"
                placeholder="Rp 0"
                value={form.watch("harga_satuan") ? formatRupiah(form.watch("harga_satuan")!) : ""}
                onChange={(e) => {
                  const value = parseRupiah(e.target.value);
                  form.setValue("harga_satuan", value);
                }}
              />
              {form.formState.errors.harga_satuan && (
                <p className="text-sm text-red-600">{form.formState.errors.harga_satuan.message}</p>
              )}
            </div>

            <div>
              <Label htmlFor="penerima">Penerima</Label>
              <Input
                {...form.register("penerima")}
                placeholder="Nama penerima (opsional)"
              />
              {form.formState.errors.penerima && (
                <p className="text-sm text-red-600">{form.formState.errors.penerima.message}</p>
              )}
            </div>
          </div>

          <div>
            <Label htmlFor="alasan">Alasan Penyesuaian *</Label>
            <Textarea
              {...form.register("alasan")}
              placeholder="Jelaskan alasan penyesuaian stok..."
              rows={3}
            />
            {form.formState.errors.alasan && (
              <p className="text-sm text-red-600">{form.formState.errors.alasan.message}</p>
            )}
          </div>

          <div>
            <Label htmlFor="tanggal">Tanggal Penyesuaian *</Label>
            <Input
              type="date"
              {...form.register("tanggal")}
              max={new Date().toISOString().split('T')[0]}
            />
            {form.formState.errors.tanggal && (
              <p className="text-sm text-red-600">{form.formState.errors.tanggal.message}</p>
            )}
          </div>

          <div className="p-4 bg-blue-50 border border-blue-200 rounded-lg">
            <h4 className="font-medium text-blue-800 mb-2">Preview Perubahan</h4>
            <div className="text-sm text-blue-700">
              <p>Stok saat ini: {currentStock} {item.satuan}</p>
              <p>
                {selectedTipe === "Masuk" ? "Tambah" : "Kurangi"}: {form.watch("jumlah") || 0} {item.satuan}
              </p>
              <p className="font-medium">
                Stok setelah penyesuaian: {
                  selectedTipe === "Masuk" 
                    ? currentStock + (form.watch("jumlah") || 0)
                    : Math.max(0, currentStock - (form.watch("jumlah") || 0))
                } {item.satuan}
              </p>
            </div>
          </div>

          <DialogFooter>
            <Button type="button" variant="outline" onClick={handleClose}>
              Batal
            </Button>
            <Button type="submit" disabled={isSubmitting}>
              {isSubmitting ? "Menyimpan..." : "Simpan Penyesuaian"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
});

StockAdjustDialog.displayName = "StockAdjustDialog";

export default StockAdjustDialog;

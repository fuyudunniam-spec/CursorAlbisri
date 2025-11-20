import { memo, useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { useCreateTransaction, useUpdateTransaction } from "@/hooks/useInventoryTransactions";
import { toast } from "@/hooks/use-toast";
import { useInventoryList } from "@/hooks/useInventory";
import { formatRupiah, parseRupiah } from "@/utils/inventaris.utils";

const transactionSchema = z.object({
  item_id: z.string().min(1, "Pilih item terlebih dahulu"),
  tipe: z.enum(["Masuk", "Keluar", "Stocktake"], {
    errorMap: () => ({ message: "Pilih tipe transaksi yang valid" })
  }),
  keluar_mode: z.enum(["Penjualan", "Distribusi"]).optional(),
  jumlah: z.number().int("Jumlah harus berupa bilangan bulat").min(1, "Jumlah minimal 1"),
  harga_satuan: z.number().min(0, "Harga tidak boleh negatif").optional(),
  harga_dasar: z.number().min(0, "Harga dasar tidak boleh negatif").optional(),
  sumbangan: z.number().min(0, "Sumbangan tidak boleh negatif").optional(),
  penerima: z.string().min(3, "Nama penerima minimal 3 karakter").optional(),
  tanggal: z.string().min(1, "Tanggal wajib diisi"),
  catatan: z.string().max(500, "Catatan maksimal 500 karakter").optional(),
  before_qty: z.number().int().min(0).optional(),
  after_qty: z.number().int().min(0).optional(),
});

type TransactionFormData = z.infer<typeof transactionSchema>;

type Props = {
  isOpen: boolean;
  onClose: () => void;
  editingTransaction?: any;
  availableStock?: number;
};

const TransactionForm = memo(({ isOpen, onClose, editingTransaction, availableStock = 0 }: Props) => {
  const [isSubmitting, setIsSubmitting] = useState(false);
  const createMutation = useCreateTransaction();
  const updateMutation = useUpdateTransaction(editingTransaction?.id || "");
  
  const { data: inventoryData } = useInventoryList(
    { page: 1, pageSize: 1000 },
    {},
    { column: "nama_barang", direction: "asc" }
  );

  const form = useForm<TransactionFormData>({
    resolver: zodResolver(transactionSchema),
    defaultValues: {
      item_id: "",
      tipe: "Masuk",
      keluar_mode: "Distribusi",
      jumlah: 1,
      harga_satuan: 0,
      harga_dasar: 0,
      sumbangan: 0,
      penerima: "",
      tanggal: new Date().toISOString().split('T')[0],
      catatan: "",
      before_qty: 0,
      after_qty: 0,
    }
  });

  const selectedTipe = form.watch("tipe");
  const selectedItemId = form.watch("item_id");
  const keluarMode = form.watch("keluar_mode");
  const hargaDasar = form.watch("harga_dasar");
  const sumbangan = form.watch("sumbangan");

  const onSubmit = async (data: TransactionFormData) => {
    try {
      setIsSubmitting(true);
      
      // Siapkan data untuk submit (termasuk field breakdown yang baru)
      const submitData: any = {
        item_id: data.item_id,
        tipe: data.tipe,
        jumlah: data.jumlah,
        tanggal: data.tanggal,
        catatan: data.catatan || null,
        penerima: data.penerima || null,
        before_qty: data.before_qty || null,
        after_qty: data.after_qty || null,
        keluar_mode: data.keluar_mode || null,
        harga_dasar: data.harga_dasar || null,
        sumbangan: data.sumbangan || null,
      };

      // Jika penjualan, hitung harga_satuan dari harga_dasar + sumbangan
      if (data.tipe === "Keluar" && data.keluar_mode === "Penjualan") {
        submitData.harga_satuan = (data.harga_dasar || 0) + (data.sumbangan || 0);
        // Simpan breakdown di catatan
        const breakdown = `Penjualan - Harga Dasar: Rp ${formatRupiah(data.harga_dasar || 0)}/unit, Sumbangan: Rp ${formatRupiah(data.sumbangan || 0)}`;
        submitData.catatan = submitData.catatan 
          ? `${breakdown} · ${submitData.catatan}` 
          : breakdown;
      } else if (data.tipe === "Keluar" && data.keluar_mode === "Distribusi") {
        submitData.harga_satuan = null; // Distribusi tidak punya harga
        submitData.catatan = submitData.catatan 
          ? `Distribusi · ${submitData.catatan}` 
          : "Distribusi";
      }
      
      // Debug: log data yang akan dikirim
      console.log("=== DEBUG TRANSACTION FORM ===");
      console.log("Data yang akan dikirim ke database:", submitData);
      console.log("Editing transaction:", editingTransaction);
      console.log("================================");
      
      if (editingTransaction) {
        await updateMutation.mutateAsync(submitData);
        toast.success("Transaksi berhasil diperbarui");
      } else {
        const result: any = await createMutation.mutateAsync(submitData);
        // Tampilkan indikator jika fallback keuangan digunakan
        if (result?._fallbackUsed) {
          toast.success("Transaksi tersimpan & otomatis dipost ke Keuangan");
        } else {
          toast.success("Transaksi tersimpan");
        }
      }
      
      form.reset();
      onClose();
    } catch (error) {
      console.error("Error saving transaction:", error);
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
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle>
            {editingTransaction ? "Edit Transaksi" : "Tambah Transaksi Baru"}
          </DialogTitle>
        </DialogHeader>

        <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label htmlFor="item_id">Item *</Label>
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
              <Label htmlFor="tipe">Tipe Transaksi *</Label>
              <Select
                value={form.watch("tipe")}
                onValueChange={(value: any) => form.setValue("tipe", value)}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="Masuk">Masuk</SelectItem>
                  <SelectItem value="Keluar">Keluar</SelectItem>
                  <SelectItem value="Stocktake">Stocktake</SelectItem>
                </SelectContent>
              </Select>
              {form.formState.errors.tipe && (
                <p className="text-sm text-red-600">{form.formState.errors.tipe.message}</p>
              )}
            </div>
          </div>

          {selectedTipe === "Keluar" && (
            <div>
              <Label>Mode Transaksi</Label>
              <Select
                value={keluarMode || "Distribusi"}
                onValueChange={(value: any) => {
                  form.setValue("keluar_mode", value);
                  // Reset breakdown saat ganti mode
                  if (value === "Distribusi") {
                    form.setValue("harga_dasar", 0);
                    form.setValue("sumbangan", 0);
                  }
                }}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="Penjualan">Penjualan</SelectItem>
                  <SelectItem value="Distribusi">Distribusi</SelectItem>
                </SelectContent>
              </Select>
            </div>
          )}

          {selectedTipe === "Keluar" && keluarMode === "Penjualan" && (
            <div className="col-span-2 space-y-4 p-4 bg-green-50 rounded-lg border border-green-200">
              <div className="font-medium text-sm text-green-800">Breakdown Harga Penjualan</div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label>Harga Dasar per Unit (Rp)</Label>
                  <Input
                    type="number"
                    {...form.register("harga_dasar", { valueAsNumber: true })}
                    placeholder="0"
                  />
                </div>
                <div>
                  <Label>Sumbangan Tambahan (Rp)</Label>
                  <Input
                    type="number"
                    {...form.register("sumbangan", { valueAsNumber: true })}
                    placeholder="0"
                  />
                </div>
              </div>
              {(hargaDasar || 0) > 0 || (sumbangan || 0) > 0 ? (
                <div className="bg-white p-3 rounded border border-green-300">
                  <div className="text-xs text-gray-600 mb-1">Total Harga per Unit:</div>
                  <div className="text-lg font-bold text-green-700">
                    {formatRupiah((hargaDasar || 0) + (sumbangan || 0))}
                  </div>
                  <div className="text-xs text-gray-500 mt-1">
                    {formatRupiah(hargaDasar || 0)} (dasar) + {formatRupiah(sumbangan || 0)} (sumbangan)
                  </div>
                </div>
              ) : null}
            </div>
          )}

          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label htmlFor="jumlah">Jumlah *</Label>
              <Input
                type="number"
                {...form.register("jumlah", { valueAsNumber: true })}
                min="1"
              />
              {form.formState.errors.jumlah && (
                <p className="text-sm text-red-600">{form.formState.errors.jumlah.message}</p>
              )}
              {selectedTipe === "Keluar" && availableStock > 0 && (
                <p className="text-sm text-gray-600">Stok tersedia: {availableStock}</p>
              )}
            </div>

            {selectedTipe !== "Keluar" || keluarMode !== "Penjualan" ? (
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
            ) : (
              <div></div>
            )}
          </div>

          {selectedTipe === "Stocktake" && (
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label htmlFor="before_qty">Stok Sebelum</Label>
                <Input
                  type="number"
                  {...form.register("before_qty", { valueAsNumber: true })}
                  min="0"
                />
              </div>
              <div>
                <Label htmlFor="after_qty">Stok Sesudah</Label>
                <Input
                  type="number"
                  {...form.register("after_qty", { valueAsNumber: true })}
                  min="0"
                />
              </div>
            </div>
          )}

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

          <div>
            <Label htmlFor="tanggal">Tanggal *</Label>
            <Input
              type="date"
              {...form.register("tanggal")}
            />
            {form.formState.errors.tanggal && (
              <p className="text-sm text-red-600">{form.formState.errors.tanggal.message}</p>
            )}
          </div>

          <div>
            <Label htmlFor="catatan">Catatan</Label>
            <Textarea
              {...form.register("catatan")}
              placeholder="Catatan tambahan (opsional)"
              rows={3}
            />
            {form.formState.errors.catatan && (
              <p className="text-sm text-red-600">{form.formState.errors.catatan.message}</p>
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

TransactionForm.displayName = "TransactionForm";

export default TransactionForm;

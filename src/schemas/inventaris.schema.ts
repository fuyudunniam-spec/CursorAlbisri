import { z } from "zod";

// Schema untuk Inventaris
export const inventarisSchema = z.object({
  nama_barang: z.string()
    .min(3, "Nama barang minimal 3 karakter")
    .max(100, "Nama barang maksimal 100 karakter"),
  
  tipe_item: z.enum(["Aset", "Komoditas"], {
    errorMap: () => ({ message: "Pilih tipe item yang valid" })
  }),
  
  kategori: z.string()
    .min(1, "Kategori wajib dipilih"),
  
  zona: z.enum(["Gedung Putra", "Gedung Putri", "Area luar"], {
    errorMap: () => ({ message: "Pilih zona yang valid" })
  }),
  
  lokasi: z.string()
    .min(1, "Lokasi wajib diisi"),
  
  // Kondisi akan dinamis di UI; skema tetap membolehkan nilai valid
  kondisi: z.enum(["Baik", "Butuh Perbaikan", "Rusak", "Rusak Ringan", "Perlu Perbaikan", "Rusak Berat"], {
    errorMap: () => ({ message: "Pilih kondisi yang valid" })
  }),
  
  jumlah: z.number()
    .int("Jumlah harus berupa bilangan bulat")
    .min(0, "Jumlah tidak boleh negatif"),
  
  satuan: z.string()
    .min(1, "Satuan wajib diisi (contoh: pcs, kg, liter)"),
  
  supplier: z.string()
    .optional()
    .nullable(),
  
  // Fields for expiry tracking
  has_expiry: z.boolean().optional().default(false),
  
  tanggal_kedaluwarsa: z.string()
    .optional()
    .nullable()
    .refine((date) => {
      if (!date) return true;
      return new Date(date) > new Date();
    }, "Tanggal kedaluwarsa harus di masa depan"),
  
  keterangan: z.string()
    .max(500, "Keterangan maksimal 500 karakter")
    .optional()
    .nullable(),

  // Minimum stock for alerting
  min_stock: z.number()
    .int("Min-stock harus bilangan bulat")
    .min(0, "Min-stock tidak boleh negatif")
    .default(10),
});

// Base transaksi
export const transaksiInventarisSchemaBase = z.object({
  item_id: z.string().min(1, "Pilih item terlebih dahulu"),
  tanggal: z.string().refine((date) => new Date(date) <= new Date(), "Tanggal transaksi tidak boleh di masa depan"),
  catatan: z.string().max(500, "Catatan maksimal 500 karakter").optional().nullable(),
});

// Masuk/Keluar (plain object for discriminatedUnion)
const transaksiMasukKeluar = transaksiInventarisSchemaBase.extend({
  tipe: z.enum(["Masuk", "Keluar"], {
    errorMap: () => ({ message: "Pilih tipe transaksi yang valid" })
  }),
  jumlah: z.number().int("Jumlah harus berupa bilangan bulat").min(1, "Jumlah minimal 1"),
  harga_satuan: z.number().min(0, "Harga tidak boleh negatif").optional().nullable(),
  penerima: z.string().min(3, "Nama penerima minimal 3 karakter").optional().nullable(),
});

// Stocktake (plain object for discriminatedUnion)
const transaksiStocktakeObject = transaksiInventarisSchemaBase.extend({
  tipe: z.literal("Stocktake"),
  before_qty: z.number().int().min(0, "Sebelum penyesuaian tidak boleh negatif"),
  after_qty: z.number().int().min(0, "Setelah penyesuaian tidak boleh negatif"),
  jumlah: z.number().int().min(1).optional(),
  harga_satuan: z.number().min(0).optional().nullable(),
  penerima: z.string().optional().nullable(),
});

export const transaksiInventarisSchema = z
  .discriminatedUnion("tipe", [transaksiMasukKeluar, transaksiStocktakeObject])
  .superRefine((data, ctx) => {
    if (data.tipe === "Stocktake") {
      const d = data as any;
      if (d.after_qty === undefined || d.before_qty === undefined) {
        ctx.addIssue({ code: z.ZodIssueCode.custom, message: "Isi stok sesudah & sebelum untuk Stocktake", path: ["after_qty"] });
      }
      if (d.jumlah !== undefined && d.jumlah < 1) {
        ctx.addIssue({ code: z.ZodIssueCode.custom, message: "Jumlah penyesuaian minimal 1", path: ["jumlah"] });
      }
    }
});

// Validation dengan stock check
export const createTransaksiWithStockCheck = (availableStock: number) => {
  return transaksiInventarisSchema.superRefine((data, ctx) => {
    if (data.tipe === "Keluar") {
      const jumlah = (data as any).jumlah as number;
      if (jumlah > availableStock) {
        ctx.addIssue({ code: z.ZodIssueCode.custom, path: ["jumlah"], message: `Jumlah melebihi stok tersedia (${availableStock})` });
      }
    }
    if (data.tipe === "Stocktake") {
      const beforeQty = (data as any).before_qty as number;
      if (typeof beforeQty === 'number' && beforeQty < 0) {
        ctx.addIssue({ code: z.ZodIssueCode.custom, path: ["before_qty"], message: "Sebelum penyesuaian tidak valid" });
      }
    }
  });
};

export type InventarisFormData = z.infer<typeof inventarisSchema>;
export type TransaksiInventarisFormData = z.infer<typeof transaksiInventarisSchema>;


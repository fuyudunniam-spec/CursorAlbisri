import { z } from "zod";

// ================================================
// DONATION TYPES
// ================================================
export const donationTypeEnum = z.enum(["cash", "in_kind", "pledge", "mixed"], {
  errorMap: () => ({ message: "Pilih tipe donasi yang valid" })
});

export const donationStatusEnum = z.enum(["pending", "received", "posted", "cancelled"], {
  errorMap: () => ({ message: "Status donasi tidak valid" })
});

export const mappingStatusEnum = z.enum(["unmapped", "suggested", "mapped", "new_item_created"], {
  errorMap: () => ({ message: "Status pemetaan tidak valid" })
});

// ================================================
// DONATION HEADER SCHEMA
// ================================================
export const donationHeaderSchema = z.object({
  // Type and donor
  donation_type: donationTypeEnum,
  donor_name: z.string()
    .min(3, "Nama donatur minimal 3 karakter")
    .max(200, "Nama donatur maksimal 200 karakter"),
  donor_email: z.string()
    .email("Format email tidak valid")
    .optional()
    .nullable()
    .or(z.literal("")),
  donor_phone: z.string()
    .max(50, "Nomor telepon maksimal 50 karakter")
    .optional()
    .nullable()
    .or(z.literal("")),
  donor_address: z.string()
    .max(500, "Alamat maksimal 500 karakter")
    .optional()
    .nullable()
    .or(z.literal("")),
  
  // Dates
  donation_date: z.string()
    .refine((date) => {
      const d = new Date(date);
      return !isNaN(d.getTime());
    }, "Format tanggal tidak valid"),
  received_date: z.string()
    .optional()
    .nullable()
    .refine((date) => {
      if (!date) return true;
      const d = new Date(date);
      return !isNaN(d.getTime());
    }, "Format tanggal tidak valid"),
  
  // Cash-specific
  cash_amount: z.number()
    .min(0, "Jumlah tidak boleh negatif")
    .optional()
    .nullable(),
  payment_method: z.string()
    .max(50, "Metode pembayaran maksimal 50 karakter")
    .optional()
    .nullable()
    .or(z.literal("")),
  akun_kas_id: z.string()
    .uuid("ID akun kas tidak valid")
    .optional()
    .nullable()
    .or(z.literal("")),
  
  // Restrictions
  is_restricted: z.boolean().default(false),
  restricted_tag: z.string()
    .max(100, "Tag restriksi maksimal 100 karakter")
    .optional()
    .nullable()
    .or(z.literal("")),
  notes: z.string()
    .max(1000, "Catatan maksimal 1000 karakter")
    .optional()
    .nullable()
    .or(z.literal("")),
  hajat_doa: z.string()
    .max(500, "Hajat/doa maksimal 500 karakter")
    .optional()
    .nullable()
    .or(z.literal("")),
  
  // Status
  status: donationStatusEnum.default("pending"),
}).superRefine((data, ctx) => {
  // Validate cash donations must have amount
  if (data.donation_type === "cash") {
    if (!data.cash_amount || data.cash_amount <= 0) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: "Jumlah donasi tunai harus lebih dari 0",
        path: ["cash_amount"]
      });
    }
    // Validate akun_kas_id for cash donations
    if (!data.akun_kas_id) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: "Akun kas wajib dipilih untuk donasi tunai",
        path: ["akun_kas_id"]
      });
    }
  }
  
  // Validate mixed donations must have either cash_amount or items (or both)
  if (data.donation_type === "mixed") {
    const hasCash = data.cash_amount && data.cash_amount > 0;
    // Items validation will be done in fullDonationSchema
    // Here we just ensure cash_amount is valid if provided
    if (data.cash_amount !== null && data.cash_amount !== undefined && data.cash_amount < 0) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: "Jumlah donasi tunai tidak boleh negatif",
        path: ["cash_amount"]
      });
    }
    // Validate akun_kas_id for mixed donations with cash
    if (hasCash && !data.akun_kas_id) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: "Akun kas wajib dipilih untuk donasi campuran dengan tunai",
        path: ["akun_kas_id"]
      });
    }
  }
  
  // Validate received_date not before donation_date
  if (data.received_date && data.donation_date) {
    const donationDate = new Date(data.donation_date);
    const receivedDate = new Date(data.received_date);
    if (receivedDate < donationDate) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: "Tanggal terima tidak boleh sebelum tanggal donasi",
        path: ["received_date"]
      });
    }
  }
  
  // If restricted, must have tag
  if (data.is_restricted && !data.restricted_tag) {
    ctx.addIssue({
      code: z.ZodIssueCode.custom,
      message: "Tag restriksi wajib diisi untuk donasi terbatas",
      path: ["restricted_tag"]
    });
  }
});

// ================================================
// DONATION ITEM SCHEMA
// ================================================
export const donationItemSchema = z.object({
  // Raw item info
  raw_item_name: z.string()
    .min(2, "Nama item minimal 2 karakter")
    .max(200, "Nama item maksimal 200 karakter"),
  item_description: z.string()
    .max(500, "Deskripsi maksimal 500 karakter")
    .optional()
    .nullable()
    .or(z.literal("")),
  
  // Item type: inventory (masuk inventaris) or direct_consumption (langsung dikonsumsi)
  item_type: z.enum(["inventory", "direct_consumption"]).default("inventory"),
  
  // Quantity and UoM (REQUIRED)
  quantity: z.number()
    .positive("Jumlah harus lebih dari 0")
    .min(0.001, "Jumlah minimal 0.001"),
  uom: z.string()
    .min(1, "Satuan wajib diisi (contoh: pcs, kg, liter)")
    .max(50, "Satuan maksimal 50 karakter"),
  
  // Value
  estimated_value: z.number()
    .min(0, "Nilai taksir tidak boleh negatif")
    .optional()
    .nullable(),
  
  // Expiry
  expiry_date: z.string()
    .optional()
    .nullable()
    .refine((date) => {
      if (!date) return true;
      const d = new Date(date);
      return !isNaN(d.getTime()) && d > new Date();
    }, "Tanggal kedaluwarsa harus di masa depan"),
  
  // Mapping (only required for inventory items)
  mapped_item_id: z.string()
    .uuid("ID item tidak valid")
    .optional()
    .nullable()
    .or(z.literal("")),
  mapping_status: mappingStatusEnum.default("unmapped"),
  suggested_item_id: z.string()
    .uuid("ID item tidak valid")
    .optional()
    .nullable()
    .or(z.literal("")),
  
  // Posting status
  is_posted_to_stock: z.boolean().optional().default(false),
}).superRefine((data, ctx) => {
  // If inventory type and mapped, must have mapped_item_id
  if (data.item_type === "inventory" && data.mapping_status === "mapped" && !data.mapped_item_id) {
    ctx.addIssue({
      code: z.ZodIssueCode.custom,
      message: "Item inventaris yang dipetakan harus memiliki ID item",
      path: ["mapped_item_id"]
    });
  }
  
  // Direct consumption items don't need mapping
  if (data.item_type === "direct_consumption") {
    // Can skip mapping requirement
  }
});

// ================================================
// FULL DONATION FORM SCHEMA
// ================================================
export const fullDonationSchema = z.object({
  header: donationHeaderSchema,
  items: z.array(donationItemSchema).min(0, "Minimal 0 item untuk donasi tunai/janji"),
}).superRefine((data, ctx) => {
  // In-kind donations must have at least 1 item
  if (data.header.donation_type === "in_kind") {
    if (!data.items || data.items.length === 0) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: "Donasi barang harus memiliki minimal 1 item",
        path: ["items"]
      });
    }
    
    // Check each item has required fields
    data.items.forEach((item, index) => {
      if (!item.quantity || item.quantity <= 0) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message: `Item ${index + 1}: Jumlah harus lebih dari 0`,
          path: ["items", index, "quantity"]
        });
      }
      
      if (!item.uom || item.uom.trim() === "") {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message: `Item ${index + 1}: Satuan wajib diisi`,
          path: ["items", index, "uom"]
        });
      }
    });
  }
  
  // Cash donations should not have items
  if (data.header.donation_type === "cash" && data.items && data.items.length > 0) {
    ctx.addIssue({
      code: z.ZodIssueCode.custom,
      message: "Donasi tunai tidak boleh memiliki item barang",
      path: ["items"]
    });
  }
  
  // Mixed donations must have either cash_amount or items (or both)
  if (data.header.donation_type === "mixed") {
    const hasCash = data.header.cash_amount && data.header.cash_amount > 0;
    const hasItems = data.items && data.items.length > 0;
    
    if (!hasCash && !hasItems) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: "Donasi campuran harus memiliki minimal tunai atau barang",
        path: ["header"]
      });
    }
    
    // Validate items if present
    if (hasItems) {
      data.items.forEach((item, index) => {
        if (!item.quantity || item.quantity <= 0) {
          ctx.addIssue({
            code: z.ZodIssueCode.custom,
            message: `Item ${index + 1}: Jumlah harus lebih dari 0`,
            path: ["items", index, "quantity"]
          });
        }
        
        if (!item.uom || item.uom.trim() === "") {
          ctx.addIssue({
            code: z.ZodIssueCode.custom,
            message: `Item ${index + 1}: Satuan wajib diisi`,
            path: ["items", index, "uom"]
          });
        }
      });
    }
  }
});

// ================================================
// ITEM MAPPING SCHEMA
// ================================================
export const itemMappingSchema = z.object({
  donation_item_id: z.string().uuid("ID item donasi tidak valid"),
  mapped_item_id: z.string().uuid("ID item inventaris tidak valid"),
  create_new_item: z.boolean().default(false),
  
  // If creating new item
  new_item_data: z.object({
    nama_barang: z.string().min(2, "Nama barang minimal 2 karakter"),
    kategori: z.string().min(1, "Kategori wajib diisi"),
    satuan: z.string().min(1, "Satuan wajib diisi"),
    tipe_item: z.enum(["Aset", "Komoditas"]).default("Komoditas"),
    zona: z.enum(["Gedung Putra", "Gedung Putri", "Area luar"]).default("Gedung Putra"),
    lokasi: z.string().default("Gudang Utama"),
    kondisi: z.string().default("Baik"),
    has_expiry: z.boolean().default(false),
  }).optional().nullable(),
}).superRefine((data, ctx) => {
  // If create_new_item is true, must have new_item_data
  if (data.create_new_item && !data.new_item_data) {
    ctx.addIssue({
      code: z.ZodIssueCode.custom,
      message: "Data item baru wajib diisi jika membuat item baru",
      path: ["new_item_data"]
    });
  }
  
  // If not creating new item, must have mapped_item_id
  if (!data.create_new_item && !data.mapped_item_id) {
    ctx.addIssue({
      code: z.ZodIssueCode.custom,
      message: "Pilih item inventaris yang akan dipetakan",
      path: ["mapped_item_id"]
    });
  }
});

// ================================================
// POST TO STOCK SCHEMA
// ================================================
export const postToStockSchema = z.object({
  donation_id: z.string().uuid("ID donasi tidak valid"),
  default_location: z.string().default("Gudang Utama"),
  items_to_post: z.array(z.object({
    donation_item_id: z.string().uuid(),
    override_location: z.string().optional(),
  })).min(1, "Minimal 1 item harus dipilih untuk diposting"),
});

// ================================================
// TYPE EXPORTS
// ================================================
export type DonationHeader = z.infer<typeof donationHeaderSchema>;
export type DonationItem = z.infer<typeof donationItemSchema>;
export type FullDonation = z.infer<typeof fullDonationSchema>;
export type ItemMapping = z.infer<typeof itemMappingSchema>;
export type PostToStock = z.infer<typeof postToStockSchema>;

// ================================================
// HELPER: Check if item is perishable
// ================================================
export const isItemPerishable = (itemName: string): boolean => {
  const perishableKeywords = [
    'makanan', 'minuman', 'roti', 'kue', 'buah', 'sayur',
    'daging', 'ikan', 'susu', 'telur', 'nasi', 'lauk',
    'obat', 'vitamin', 'suplemen', 'medicine'
  ];
  
  const lowerName = itemName.toLowerCase();
  return perishableKeywords.some(keyword => lowerName.includes(keyword));
};

// ================================================
// VALIDATION HELPERS
// ================================================
export const validateDonationWithPerishableCheck = (
  donation: FullDonation
): { valid: boolean; errors: string[] } => {
  const errors: string[] = [];
  
  if (donation.header.donation_type === "in_kind") {
    donation.items.forEach((item, index) => {
      // Check if perishable items have expiry date
      if (isItemPerishable(item.raw_item_name) && !item.expiry_date) {
        errors.push(
          `Item ${index + 1} (${item.raw_item_name}): Item yang mudah rusak harus memiliki tanggal kedaluwarsa`
        );
      }
      
      // Check quantity > 0
      if (item.quantity <= 0) {
        errors.push(`Item ${index + 1}: Jumlah harus lebih dari 0`);
      }
      
      // Check UoM is not empty
      if (!item.uom || item.uom.trim() === "") {
        errors.push(`Item ${index + 1}: Satuan wajib diisi`);
      }
    });
  }
  
  return {
    valid: errors.length === 0,
    errors
  };
};


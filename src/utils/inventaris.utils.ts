import { type ClassValue, clsx } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

// Format currency to Rupiah
export const formatRupiah = (amount: number | null | undefined): string => {
  if (amount === null || amount === undefined) return "Rp 0";
  return new Intl.NumberFormat('id-ID', {
    style: 'currency',
    currency: 'IDR',
    minimumFractionDigits: 0,
    maximumFractionDigits: 0
  }).format(amount);
};

// Parse formatted rupiah back to number
export const parseRupiah = (value: string): number => {
  const cleaned = value.replace(/[^0-9]/g, '');
  return parseInt(cleaned) || 0;
};

// Export data to CSV
export const exportToCSV = (data: any[], filename: string) => {
  if (data.length === 0) {
    alert("Tidak ada data untuk diekspor");
    return;
  }

  // Get headers from first object
  const headers = Object.keys(data[0]);
  
  // Create CSV content
  const csvContent = [
    headers.join(','), // Header row
    ...data.map(row => 
      headers.map(header => {
        const cell = row[header];
        // Escape commas and quotes
        const escaped = String(cell ?? '').replace(/"/g, '""');
        return `"${escaped}"`;
      }).join(',')
    )
  ].join('\n');

  // Create blob and download
  const blob = new Blob(['\ufeff' + csvContent], { type: 'text/csv;charset=utf-8;' });
  const link = document.createElement('a');
  const url = URL.createObjectURL(blob);
  
  link.setAttribute('href', url);
  link.setAttribute('download', `${filename}_${new Date().toISOString().split('T')[0]}.csv`);
  link.style.visibility = 'hidden';
  
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
};

// Format date to Indonesian locale
export const formatDate = (date: string | null | undefined): string => {
  if (!date) return '-';
  return new Date(date).toLocaleDateString('id-ID', {
    day: 'numeric',
    month: 'long',
    year: 'numeric'
  });
};

// Get kondisi badge color
export const getKondisiColor = (kondisi: string): string => {
  const colors: Record<string, string> = {
    "Baik": "bg-green-500/10 text-green-700 border-green-500/20",
    "Butuh Perbaikan": "bg-orange-500/10 text-orange-700 border-orange-500/20",
    "Rusak": "bg-red-500/10 text-red-700 border-red-500/20",
    // legacy values (tetap diberi warna agar kompatibel terhadap data lama)
    "Rusak Ringan": "bg-yellow-500/10 text-yellow-700 border-yellow-500/20",
    "Rusak Berat": "bg-red-500/10 text-red-700 border-red-500/20",
    "Perlu Perbaikan": "bg-orange-500/10 text-orange-700 border-orange-500/20",
  };
  return colors[kondisi] || "bg-gray-500/10 text-gray-700 border-gray-500/20";
};

// Check if stock is low
export const isStockLow = (jumlah: number | null, threshold: number = 10): boolean => {
  return (jumlah ?? 0) < threshold && (jumlah ?? 0) > 0;
};

// Check if out of stock
export const isOutOfStock = (jumlah: number | null): boolean => {
  return (jumlah ?? 0) === 0;
};

// Check if stock is low based on per-item min_stock
export const isStockBelowMin = (jumlah: number | null, minStock: number | null | undefined): boolean => {
  const threshold = typeof minStock === 'number' ? Math.max(minStock, 0) : 10;
  return isStockLow(jumlah, threshold);
};

// Calculate total value
export const calculateTotalValue = (items: Array<{ jumlah: number | null, harga_perolehan: number | null }>): number => {
  return items.reduce((total, item) => {
    return total + ((item.jumlah ?? 0) * (item.harga_perolehan ?? 0));
  }, 0);
};

// Group items by category
export const groupByCategory = (items: Array<{ kategori: string }>): Record<string, number> => {
  return items.reduce((acc, item) => {
    acc[item.kategori] = (acc[item.kategori] || 0) + 1;
    return acc;
  }, {} as Record<string, number>);
};

// Item types
export const TIPE_ITEM_OPTIONS = [
  { value: "Aset", label: "Aset" },
  { value: "Komoditas", label: "Komoditas" }
];

// Categories based on item type
export const KATEGORI_ASET = [
  "Elektronik & IT",
  "Furniture",
  "Peralatan Olahraga",
  "Kendaraan",
  "Peralatan Medis",
  "Peralatan Kebersihan",
  "Alat Tulis & Kantor",
  "Buku & Perpustakaan",
  "Lainnya"
];

export const KATEGORI_KOMODITAS = [
  "Makanan & Minuman",
  "Bahan Makanan",
  "Obat-obatan",
  "Peralatan Kebersihan",
  "Alat Tulis & Kantor",
  "Bahan Bangunan",
  "Pakaian & Tekstil",
  "Lainnya"
];

// Zone options
export const ZONA_OPTIONS = [
  { value: "Gedung Putra", label: "Gedung Putra" },
  { value: "Gedung Putri", label: "Gedung Putri" },
  { value: "Area luar", label: "Area luar" }
];

// Get categories based on item type
export const getKategoriOptions = (tipeItem: string): string[] => {
  return tipeItem === "Aset" ? KATEGORI_ASET : KATEGORI_KOMODITAS;
};

// Satuan options
export const SATUAN_OPTIONS = [
  "pcs",
  "unit",
  "set",
  "kg",
  "gram",
  "liter",
  "ml",
  "meter",
  "pak",
  "dus",
  "karton",
  "buah",
  "karung",
];

// Contoh nama barang yang baik per kategori (untuk panduan input)
export const CONTOH_NAMA_BARANG_BY_CATEGORY: Record<string, string[]> = {
  "Bahan Makanan": [
    "Beras 25kg",
    "Beras 50kg", 
    "Gula Pasir 1kg",
    "Minyak Goreng 2 liter",
    "Tepung Terigu 1kg"
  ],
  "Makanan & Minuman": [
    "Indomie Goreng 70gr",
    "Susu UHT 1 liter",
    "Telur Ayam 1kg",
    "Roti Tawar 400gr"
  ],
  "Obat-obatan": [
    "Paracetamol 500mg",
    "Vitamin C 1000mg",
    "Obat Batuk Sirup 100ml"
  ],
  "Peralatan Kebersihan": [
    "Sabun Mandi 90gr",
    "Detergen Bubuk 1kg",
    "Pembersih Lantai 800ml"
  ],
  "Alat Tulis & Kantor": [
    "Pensil 2B",
    "Buku Tulis 38 lembar",
    "Kertas A4 70gr"
  ],
  "Bahan Bangunan": [
    "Semen 50kg",
    "Pasir 1m3",
    "Cat Tembok 5kg"
  ],
  "Elektronik & IT": [
    "Laptop Lenovo ThinkPad",
    "Monitor 24 inch",
    "Printer Canon IP2770"
  ],
  "Furniture": [
    "Meja Belajar 120cm",
    "Kursi Plastik Standar",
    "Lemari Baju 3 Pintu"
  ],
  "Peralatan Olahraga": [
    "Bola Sepak Ukuran 5",
    "Raket Badminton Yonex",
    "Matras Olahraga 1.8m"
  ],
  "Peralatan Medis": [
    "Tensimeter Digital",
    "Termometer Digital",
    "Stetoskop Standar"
  ],
  "Kendaraan": [
    "Motor Honda Beat",
    "Sepeda Gunung Polygon",
    "Sepeda Lipat 20 inch"
  ],
  "Buku & Perpustakaan": [
    "Buku Pelajaran IPA Kelas 7",
    "Ensiklopedia Indonesia Jilid 1",
    "Kamus Bahasa Inggris"
  ],
  "Pakaian & Tekstil": [
    "Seragam Putih Putra",
    "Mukena Katun",
    "Seprai Single 120x200"
  ]
};

// Get contoh nama barang untuk kategori tertentu
export const getContohNamaBarang = (kategori: string): string => {
  const contoh = CONTOH_NAMA_BARANG_BY_CATEGORY[kategori];
  if (contoh && contoh.length > 0) {
    return `Contoh: ${contoh[0]}`;
  }
  return "Contoh: Beras 25kg, Minyak Goreng 2 liter, Indomie Goreng 70gr";
};


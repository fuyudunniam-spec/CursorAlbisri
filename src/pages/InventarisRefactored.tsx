import { useState, useEffect } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
  DialogFooter,
} from "@/components/ui/dialog";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Package,
  Plus,
  Search,
  Download,
  Edit,
  Trash2,
  AlertTriangle,
  DollarSign,
  TrendingDown,
  TrendingUp,
  ShoppingCart,
  RefreshCw,
  FileDown,
  Layers,
} from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
// Harga perolehan dihapus dari form; tetap impor jika masih dipakai di tempat lain
// import { NumericFormat } from "react-number-format";
import {
  inventarisSchema,
  type InventarisFormData,
} from "@/schemas/inventaris.schema";
import {
  formatRupiah,
  exportToCSV,
  formatDate,
  getKondisiColor,
  isStockLow,
  isStockBelowMin,
  isOutOfStock,
  calculateTotalValue,
  TIPE_ITEM_OPTIONS,
  KATEGORI_ASET,
  KATEGORI_KOMODITAS,
  ZONA_OPTIONS,
  getKategoriOptions,
  SATUAN_OPTIONS,
} from "@/utils/inventaris.utils";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger, DropdownMenuSeparator } from "@/components/ui/dropdown-menu";

// Lightweight component for multi-item receipt
const MultiReceiptForm = ({ onClose, onSaved, items }: { onClose: () => void; onSaved: () => void; items: Array<{ id: string; nama_barang: string; satuan?: string | null }> }) => {
  const [rows, setRows] = useState<Array<{ item_id: string; item_name: string; jumlah: number; satuan: string; expiry: string; catatan: string }>>([
    { item_id: "", item_name: "", jumlah: 1, satuan: "pcs", expiry: "", catatan: "" },
  ]);
  const [tanggal, setTanggal] = useState<string>(new Date().toISOString().split('T')[0]);
  const [sumber, setSumber] = useState<string>('Donasi');
  const [donatur, setDonatur] = useState<string>('');
  const [saving, setSaving] = useState<boolean>(false);

  const addRow = () => setRows((r) => [...r, { item_id: "", item_name: "", jumlah: 1, satuan: "pcs", expiry: "", catatan: "" }]);
  const removeRow = (idx: number) => setRows((r) => r.filter((_, i) => i !== idx));
  const updateRow = (idx: number, patch: Partial<(typeof rows)[number]>) => setRows((r) => r.map((row, i) => (i === idx ? { ...row, ...patch } : row)));
  const onSelectItem = (idx: number, itemId: string) => {
    const found = items.find(i => i.id === itemId);
    updateRow(idx, { item_id: itemId, item_name: found?.nama_barang || "", satuan: (found?.satuan as string) || rows[idx].satuan });
  };

  const canSave = rows.every(r => r.item_id && (r.jumlah || 0) > 0);
  const save = async () => {
    try {
      setSaving(true);
      for (const row of rows) {
        if (!row.item_id) continue; // minimal
        const payload: any = { item_id: row.item_id, tipe: 'Masuk', jumlah: Math.max(1, Math.floor(row.jumlah || 0)), tanggal, catatan: row.catatan || sumber, penerima: donatur || null };
        if (row.expiry) {
          const { data: batchIns, error: be } = await (supabase as any).from('receive_entries').insert([{ item_id: row.item_id, expiry_date: row.expiry, qty: payload.jumlah }]).select('id').single();
          if (be) throw be;
          payload.batch_id = batchIns.id;
        }
        const { error: te } = await supabase.from('transaksi_inventaris').insert([payload]);
        if (te) throw te;
      }
      await onSaved();
    } catch (e) {
      toast.error('Gagal menyimpan penerimaan multi-item');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-3 gap-4">
        <div className="space-y-2">
          <Label>Sumber</Label>
          <Select value={sumber} onValueChange={setSumber}>
            <SelectTrigger><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="Donasi">Donasi</SelectItem>
              <SelectItem value="Pembelian">Pembelian</SelectItem>
              <SelectItem value="Retur">Retur</SelectItem>
              <SelectItem value="Lainnya">Lainnya</SelectItem>
            </SelectContent>
          </Select>
        </div>
        <div className="space-y-2">
          <Label>Donatur/Pemasok</Label>
          <Input value={donatur} onChange={(e) => setDonatur(e.target.value)} placeholder="Nama Donatur/Pemasok (opsional)" />
        </div>
        <div className="space-y-2">
          <Label>Tanggal</Label>
          <Input type="date" value={tanggal} onChange={(e) => setTanggal(e.target.value)} />
        </div>
      </div>

      <div className="overflow-x-auto">
        <table className="w-full">
          <thead className="bg-muted/50 border-b">
            <tr>
              <th className="px-3 py-2 text-left text-sm">Item</th>
              <th className="px-3 py-2 text-left text-sm">Jumlah</th>
              <th className="px-3 py-2 text-left text-sm">Satuan</th>
              <th className="px-3 py-2 text-left text-sm">Expiry</th>
              <th className="px-3 py-2 text-left text-sm">Catatan</th>
              <th className="px-3 py-2 text-center text-sm">Aksi</th>
            </tr>
          </thead>
          <tbody className="divide-y">
            {rows.map((row, idx) => (
              <tr key={idx}>
                <td className="px-3 py-2">
                  <Select value={row.item_id} onValueChange={(v) => onSelectItem(idx, v)}>
                    <SelectTrigger>
                      <SelectValue placeholder="Pilih item" />
                    </SelectTrigger>
                    <SelectContent>
                      {items.map((it) => (
                        <SelectItem key={it.id} value={it.id}>{it.nama_barang}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </td>
                <td className="px-3 py-2">
                  <Input type="number" value={row.jumlah} onChange={(e) => updateRow(idx, { jumlah: parseInt(e.target.value || '0', 10) })} />
                </td>
                <td className="px-3 py-2">
                  <Input value={row.satuan} onChange={(e) => updateRow(idx, { satuan: e.target.value })} />
                </td>
                <td className="px-3 py-2">
                  <Input type="date" value={row.expiry} onChange={(e) => updateRow(idx, { expiry: e.target.value })} />
                </td>
                <td className="px-3 py-2">
                  <Input value={row.catatan} onChange={(e) => updateRow(idx, { catatan: e.target.value })} />
                </td>
                <td className="px-3 py-2 text-center">
                  <Button size="sm" variant="ghost" onClick={() => removeRow(idx)}>Hapus</Button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <div className="flex justify-between">
        <Button variant="outline" onClick={addRow}>+ Tambah Baris</Button>
        <div className="flex gap-2">
          <Button variant="outline" onClick={onClose}>Batal</Button>
          <Button onClick={save} disabled={saving || !canSave}>{saving ? 'Menyimpan...' : 'Simpan'}</Button>
        </div>
      </div>
    </div>
  );
};

interface InventarisData {
  id: string;
  nama_barang: string;
  tipe_item: string; // UI field; DB may store as 'tipe'
  kategori: string;
  zona: string;
  lokasi: string | null;
  kondisi: string | null;
  jumlah: number | null;
  satuan: string | null;
  supplier: string | null;
  has_expiry: boolean | null;
  tanggal_kedaluwarsa: string | null;
  keterangan: string | null;
  created_at: string | null;
  updated_at: string | null;
  min_stock?: number | null;
}

const InventarisRefactored = () => {
  const [inventarisData, setInventarisData] = useState<InventarisData[]>([]);
  const [loading, setLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [isMultiReceiptOpen, setIsMultiReceiptOpen] = useState(false);
  const [selectedItem, setSelectedItem] = useState<InventarisData | null>(null);
  const [itemToDelete, setItemToDelete] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState("");
  const [filterKategori, setFilterKategori] = useState<string>("all");
  const [filterKondisi, setFilterKondisi] = useState<string>("all");
  const [activeTab, setActiveTab] = useState<string>("inventaris");

  // Transactions state
  const [transactions, setTransactions] = useState<any[]>([]);
  const [loadingTx, setLoadingTx] = useState<boolean>(false);
  const [nearExpiry, setNearExpiry] = useState<any[]>([]);
  const [loadingExpiry, setLoadingExpiry] = useState<boolean>(false);
  const [txEditOpen, setTxEditOpen] = useState(false);
  const [txEditing, setTxEditing] = useState<any>(null);
  const [txEditRecipient, setTxEditRecipient] = useState<string>("");
  const [txEditNote, setTxEditNote] = useState<string>("");
  const [txSaving, setTxSaving] = useState(false);
  // Edit transaction breakdown state
  const [txEditJumlah, setTxEditJumlah] = useState<number>(0);
  const [txEditHargaDasar, setTxEditHargaDasar] = useState<number>(0);
  const [txEditSumbangan, setTxEditSumbangan] = useState<number>(0);
  const [txEditHasBreakdown, setTxEditHasBreakdown] = useState<boolean>(false);
  // Detail transaction dialog state
  const [txDetailOpen, setTxDetailOpen] = useState(false);
  const [txDetail, setTxDetail] = useState<any>(null);

  // Quick stock adjust dialog state
  const [isAdjustOpen, setIsAdjustOpen] = useState(false);
  const [adjustType, setAdjustType] = useState<"Masuk" | "Keluar" | "Stocktake">("Masuk");
  const [adjustItem, setAdjustItem] = useState<InventarisData | null>(null);
  const [adjustJumlah, setAdjustJumlah] = useState<number>(1);
  const [adjustExpiry, setAdjustExpiry] = useState<string>("");
  const [adjustRecipient, setAdjustRecipient] = useState<string>("");
  const [adjustReason, setAdjustReason] = useState<string>("");
  const [manualBatch, setManualBatch] = useState<boolean>(false);
  const [batches, setBatches] = useState<Array<{ id: string; expiry_date: string | null; qty: number }>>([]);
  const [selectedBatchId, setSelectedBatchId] = useState<string>("");
  // Keluar sub-type: Penjualan vs Distribusi (harga hanya untuk Penjualan)
  const [keluarMode, setKeluarMode] = useState<'Penjualan' | 'Distribusi'>('Distribusi');
  const [hargaSatuan, setHargaSatuan] = useState<number>(0);
  // Explicit breakdown for sales transactions
  const [hargaDasar, setHargaDasar] = useState<number>(0);
  const [sumbangan, setSumbangan] = useState<number>(0);
  const [adjustBeforeQty, setAdjustBeforeQty] = useState<number>(0);
  const [adjustAfterQty, setAdjustAfterQty] = useState<number>(0);
  const [adjustNote, setAdjustNote] = useState<string>("");
  const [adjustDate, setAdjustDate] = useState<string>(new Date().toISOString().split('T')[0]);
  const [isAdjustSubmitting, setIsAdjustSubmitting] = useState(false);
  
  // Riwayat filter state
  const [riwayatFilterTipe, setRiwayatFilterTipe] = useState<string>("all");
  
  // Time period filter state
  const [timePeriod, setTimePeriod] = useState<"mingguan" | "bulanan" | "tahunan">("bulanan");
  const [selectedPeriod, setSelectedPeriod] = useState<string>("");

  // Helper functions for time period filtering
  const getPeriodOptions = () => {
    const now = new Date();
    const options: { value: string; label: string }[] = [];
    
    if (timePeriod === "mingguan") {
      // Generate last 8 weeks
      for (let i = 0; i < 8; i++) {
        const weekStart = new Date(now);
        weekStart.setDate(now.getDate() - (now.getDay() + (i * 7)));
        const weekEnd = new Date(weekStart);
        weekEnd.setDate(weekStart.getDate() + 6);
        
        const weekLabel = `Minggu ${weekStart.getDate()}-${weekEnd.getDate()} ${weekStart.toLocaleDateString('id-ID', { month: 'short', year: 'numeric' })}`;
        const weekValue = weekStart.toISOString().split('T')[0];
        
        options.push({ value: weekValue, label: weekLabel });
      }
    } else if (timePeriod === "bulanan") {
      // Generate last 12 months
      for (let i = 0; i < 12; i++) {
        const month = new Date(now.getFullYear(), now.getMonth() - i, 1);
        const monthLabel = month.toLocaleDateString('id-ID', { month: 'long', year: 'numeric' });
        const monthValue = month.toISOString().split('T')[0];
        
        options.push({ value: monthValue, label: monthLabel });
      }
    } else if (timePeriod === "tahunan") {
      // Generate last 5 years
      for (let i = 0; i < 5; i++) {
        const year = now.getFullYear() - i;
        options.push({ value: `${year}-01-01`, label: year.toString() });
      }
    }
    
    return options;
  };

  const isInSelectedPeriod = (date: string) => {
    if (!selectedPeriod) return true;
    
    const transactionDate = new Date(date);
    const periodStart = new Date(selectedPeriod);
    
    if (timePeriod === "mingguan") {
      const periodEnd = new Date(periodStart);
      periodEnd.setDate(periodStart.getDate() + 6);
      return transactionDate >= periodStart && transactionDate <= periodEnd;
    } else if (timePeriod === "bulanan") {
      const periodEnd = new Date(periodStart.getFullYear(), periodStart.getMonth() + 1, 0);
      return transactionDate >= periodStart && transactionDate <= periodEnd;
    } else if (timePeriod === "tahunan") {
      const periodEnd = new Date(periodStart.getFullYear(), 11, 31);
      return transactionDate >= periodStart && transactionDate <= periodEnd;
    }
    
    return false;
  };

  // Initialize selectedPeriod when timePeriod changes (only if no period is selected)
  useEffect(() => {
    // Don't auto-select period - let user choose manually
  }, [timePeriod, selectedPeriod]);

  // React Hook Form setup
  const {
    register,
    handleSubmit,
    setValue,
    watch,
    reset,
    formState: { errors, isDirty },
  } = useForm<InventarisFormData>({
    resolver: zodResolver(inventarisSchema),
    defaultValues: {
      nama_barang: "",
      tipe_item: "Aset",
      kategori: "",
      zona: "Gedung Putra",
      lokasi: "",
      kondisi: "Baik",
      jumlah: 0,
      satuan: "pcs",
      supplier: "",
      has_expiry: false,
      tanggal_kedaluwarsa: "",
      keterangan: "",
      min_stock: 10,
    },
  });

  const formMode = selectedItem ? "edit" : "create";

  // Fetch inventaris data
  useEffect(() => {
    fetchInventarisData();
    fetchTransactions();
    fetchNearExpiry();
  }, []);

  // Subtle notifications on load
  useEffect(() => {
    if (!loading && inventarisData.length > 0) {
      const low = inventarisData.filter((i) => isStockBelowMin(i.jumlah, i.min_stock ?? 10) || isOutOfStock(i.jumlah));
      if (low.length > 0) {
        toast.info(`${low.length} item stok rendah/habis`, { duration: 3000 });
      }
    }
  }, [loading]);

  const fetchInventarisData = async () => {
    try {
      setLoading(true);
      const { data, error } = await supabase
        .from("inventaris")
        .select("*")
        .order("created_at", { ascending: false });

      if (error) throw error;
      const normalized = (data || []).map((row: any) => ({
        ...row,
        // normalize tipe -> tipe_item for UI compatibility
        tipe_item: row.tipe ?? row.tipe_item ?? "Aset",
      }));
      setInventarisData(normalized as InventarisData[]);
    } catch (error) {
      console.error("Error fetching inventaris data:", error);
      toast.error("Gagal memuat data inventaris");
    } finally {
      setLoading(false);
    }
  };

  const fetchTransactions = async () => {
    try {
      setLoadingTx(true);
      const { data, error } = await supabase
        .from("transaksi_inventaris")
        .select("id,item_id,tipe,jumlah,harga_satuan,tanggal,catatan,batch_id,item:inventaris(nama_barang,satuan)")
        .order("created_at", { ascending: false })
        .limit(50);
      if (error) throw error;
      setTransactions(data || []);
    } catch (e) {
      console.error("Error fetching transaksi:", e);
    } finally {
      setLoadingTx(false);
    }
  };

  const fetchNearExpiry = async () => {
    try {
      setLoadingExpiry(true);
      const today = new Date();
      const next30 = new Date();
      next30.setDate(today.getDate() + 30);
      const { data, error } = await (supabase as any)
        .from('receive_entries')
        .select('id,item_id,expiry_date,qty,item:inventaris(nama_barang,satuan)')
        .gte('expiry_date', today.toISOString().split('T')[0])
        .lte('expiry_date', next30.toISOString().split('T')[0])
        .order('expiry_date', { ascending: true })
        .limit(20);
      if (error) throw error;
      setNearExpiry(data || []);
    } catch (e) {
      console.error('Error fetching near-expiry:', e);
    } finally {
      setLoadingExpiry(false);
    }
  };

  // Parse breakdown from transaction note
  const parseBreakdown = (catatan: string, hargaSatuan: number, jumlah: number) => {
    // Check if has breakdown format
    const hasBreakdown = catatan?.includes('Harga Dasar:') && catatan?.includes('Sumbangan:');
    
    if (hasBreakdown) {
      // Parse: "Penjualan - Harga Dasar: Rp 750.000/karung, Sumbangan: Rp 50.000"
      const hargaMatch = catatan.match(/Harga Dasar: Rp ([\d.,]+)/);
      const sumbanganMatch = catatan.match(/Sumbangan: Rp ([\d.,]+)/);
      
      const hargaDasar = hargaMatch ? parseFloat(hargaMatch[1].replace(/\./g, '').replace(',', '.')) : 0;
      const sumbangan = sumbanganMatch ? parseFloat(sumbanganMatch[1].replace(/\./g, '').replace(',', '.')) : 0;
      
      return { hasBreakdown: true, hargaDasar, sumbangan };
    } else if (catatan?.includes('Penjualan - Harga:')) {
      // Parse simple format: "Penjualan - Harga: Rp 800.000/karung"
      const hargaMatch = catatan.match(/Harga: Rp ([\d.,]+)/);
      const hargaDasar = hargaMatch ? parseFloat(hargaMatch[1].replace(/\./g, '').replace(',', '.')) : hargaSatuan;
      
      return { hasBreakdown: true, hargaDasar, sumbangan: 0 };
    } else {
      // No breakdown, use harga_satuan directly
      return { hasBreakdown: false, hargaDasar: hargaSatuan, sumbangan: 0 };
    }
  };

  const openEditTx = (t: any) => {
    setTxEditing(t);
    setTxEditRecipient(t.penerima || "");
    setTxEditNote(t.catatan || "");
    setTxEditJumlah(t.jumlah || 0);
    
    // Parse breakdown if this is a sales transaction
    if (t.tipe === 'Keluar' && t.harga_satuan) {
      const breakdown = parseBreakdown(t.catatan || "", t.harga_satuan, t.jumlah);
      setTxEditHasBreakdown(breakdown.hasBreakdown);
      setTxEditHargaDasar(breakdown.hargaDasar);
      setTxEditSumbangan(breakdown.sumbangan);
    } else {
      setTxEditHasBreakdown(false);
      setTxEditHargaDasar(0);
      setTxEditSumbangan(0);
    }
    
    setTxEditOpen(true);
  };

  const saveEditTx = async () => {
    if (!txEditing) return;
    try {
      setTxSaving(true);
      
      let updateData: any = {
        penerima: txEditRecipient || null,
        jumlah: txEditJumlah
      };
      
      // If this is a sales transaction with breakdown
      if (txEditing.tipe === 'Keluar' && txEditing.harga_satuan && txEditHasBreakdown) {
        // Calculate new harga_satuan from breakdown
        const totalPemasukan = (txEditHargaDasar * txEditJumlah) + txEditSumbangan;
        updateData.harga_satuan = Math.max(0, Math.floor(totalPemasukan / txEditJumlah));
        
        // Update catatan with new breakdown
        const breakdownNote = txEditSumbangan > 0 
          ? `Penjualan - Harga Dasar: ${formatRupiah(txEditHargaDasar)}/unit, Sumbangan: ${formatRupiah(txEditSumbangan)}`
          : `Penjualan - Harga: ${formatRupiah(txEditHargaDasar)}/unit`;
        
        updateData.catatan = txEditNote ? `${txEditNote} · ${breakdownNote}` : breakdownNote;
      } else {
        // For non-sales transactions, just update catatan
        updateData.catatan = txEditNote || null;
      }
      
      const { error } = await supabase
        .from('transaksi_inventaris')
        .update(updateData)
        .eq('id', txEditing.id);
      
      if (error) throw error;
      
      toast.success('Transaksi berhasil diperbarui');
      setTxEditOpen(false);
      await fetchInventarisData();
      await fetchTransactions();
    } catch (e) {
      console.error('Gagal menyimpan perubahan transaksi:', e);
      toast.error('Gagal menyimpan perubahan transaksi');
    } finally {
      setTxSaving(false);
    }
  };

  const deleteTx = async (t: any) => {
    if (!confirm('Hapus transaksi ini? Stok akan disesuaikan otomatis.')) return;
    try {
      const { error } = await supabase
        .from('transaksi_inventaris')
        .delete()
        .eq('id', t.id);
      if (error) throw error;
      toast.success('Transaksi dihapus');
      await fetchInventarisData();
      await fetchTransactions();
    } catch (e) {
      toast.error('Gagal menghapus transaksi');
    }
  };

  // Calculate stats
  const totalItem = inventarisData.length;
  // Period helpers (bulan berjalan)
  const now = new Date();
  const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
  const endOfMonth = new Date(now.getFullYear(), now.getMonth() + 1, 0);
  const isInThisMonth = (d: string) => {
    const dt = new Date(d);
    return dt >= startOfMonth && dt <= endOfMonth;
  };

  // Ikhtisar Penjualan menggunakan harga_total untuk konsistensi dengan keuangan
  const salesTxMonth = transactions.filter((t) => 
    t.tipe === "Keluar" && 
    t.keluar_mode === "Penjualan" && 
    t.harga_total > 0 && 
    t.tanggal && 
    isInThisMonth(t.tanggal)
  );
  
  const distribusiTxMonth = transactions.filter((t) => 
    t.tipe === "Keluar" && 
    (t.keluar_mode !== "Penjualan" || !t.harga_total || t.harga_total === 0) && 
    t.tanggal && 
    isInThisMonth(t.tanggal)
  );
  
  // Statistik penjualan bulan ini (menggunakan harga_total untuk akurasi)
  const salesQty = salesTxMonth.reduce((acc, t) => acc + Number(t.jumlah || 0), 0);
  const salesAmount = salesTxMonth.reduce((acc, t) => acc + Number(t.harga_total || 0), 0);
  const distribusiQty = distribusiTxMonth.reduce((acc, t) => acc + Number(t.jumlah || 0), 0);
  
  // Total penjualan keseluruhan (untuk card total penjualan)
  const allSalesTx = transactions.filter((t) => 
    t.tipe === "Keluar" && 
    t.keluar_mode === "Penjualan" && 
    t.harga_total > 0
  );
  const totalSalesAmount = allSalesTx.reduce((acc, t) => acc + Number(t.harga_total || 0), 0);
  const totalSalesCount = allSalesTx.length;
  const expiredCount = nearExpiry.filter((b) => {
    const d = new Date(b.expiry_date);
    const today = new Date();
    return d < new Date(today.getFullYear(), today.getMonth(), today.getDate());
  }).length;
  const nearExpiryCount = nearExpiry.length;

  const lowStockTop10 = [...inventarisData]
    .filter((i) => isStockBelowMin(i.jumlah, i.min_stock ?? 10) || isOutOfStock(i.jumlah))
    .sort((a, b) => (a.jumlah ?? 0) - (b.jumlah ?? 0))
    .slice(0, 10);

  // Filter data
  const filteredData = inventarisData.filter((item) => {
    const matchesSearch =
      item.nama_barang.toLowerCase().includes(searchTerm.toLowerCase()) ||
      item.kategori.toLowerCase().includes(searchTerm.toLowerCase()) ||
      item.lokasi?.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesKategori =
      filterKategori === "all" || item.kategori === filterKategori;
    const matchesKondisi =
      filterKondisi === "all" || item.kondisi === filterKondisi;

    return matchesSearch && matchesKategori && matchesKondisi;
  });

  // Get unique categories from data
  const categoriesInData = Array.from(
    new Set(inventarisData.map((item) => item.kategori))
  );

  // Handle form submission
  const onSubmit = async (data: InventarisFormData) => {
    setIsSubmitting(true);

    try {
      const { data: userData } = await supabase.auth.getUser();
      const userId = userData.user?.id;

      const submitData = {
        nama_barang: data.nama_barang,
        // Use tipe_item column (we added via migration); mapping handled on read
        tipe_item: data.tipe_item,
        kategori: data.kategori,
        zona: data.zona,
        lokasi: data.lokasi,
        kondisi: data.kondisi,
        jumlah: data.jumlah,
        satuan: data.satuan,
        supplier: data.supplier || null,
        has_expiry: data.has_expiry || false,
        tanggal_kedaluwarsa: data.has_expiry ? data.tanggal_kedaluwarsa : null,
        keterangan: data.keterangan || null,
        min_stock: data.min_stock ?? 10,
        updated_at: new Date().toISOString(),
        updated_by: userId,
      };

      if (formMode === "edit" && selectedItem) {
        // Update existing item
        const { error } = await supabase
          .from("inventaris")
          .update(submitData as any)
          .eq("id", selectedItem.id);

        if (error) throw error;
        toast.success("Inventaris berhasil diupdate!");
      } else {
        // Insert new item
        const { error } = await supabase
          .from("inventaris")
          .insert([
            {
              ...submitData,
              created_at: new Date().toISOString(),
              created_by: userId,
            } as any,
          ]);

        if (error) throw error;
        toast.success("Inventaris berhasil ditambahkan!");
      }

      setIsDialogOpen(false);
      resetForm();
      fetchInventarisData();
      fetchTransactions();
    } catch (error) {
      console.error("Error submitting inventaris:", error);
      toast.error("Gagal menyimpan inventaris");
    } finally {
      setIsSubmitting(false);
    }
  };

  const resetForm = () => {
    reset({
      nama_barang: "",
      tipe_item: "Aset",
      kategori: "",
      zona: "Gedung Putra",
      lokasi: "",
      kondisi: "Baik",
      jumlah: 0,
      satuan: "pcs",
      supplier: "",
      has_expiry: false,
      tanggal_kedaluwarsa: "",
      keterangan: "",
      min_stock: 10,
    });
    setSelectedItem(null);
  };

  const handleEdit = (item: InventarisData) => {
    setSelectedItem(item);
    reset({
      nama_barang: item.nama_barang,
      tipe_item: (item.tipe_item as "Aset" | "Komoditas") || "Aset",
      kategori: item.kategori,
      zona: (item.zona as "Gedung Putra" | "Gedung Putri" | "Area luar") || "Gedung Putra",
      lokasi: item.lokasi || "",
      kondisi: (item.kondisi as any) || "Baik",
      jumlah: item.jumlah || 0,
      satuan: item.satuan || "pcs",
      supplier: item.supplier || "",
      has_expiry: item.has_expiry || false,
      tanggal_kedaluwarsa: item.tanggal_kedaluwarsa || "",
      keterangan: item.keterangan || "",
      min_stock: (item.min_stock as number | undefined) ?? 10,
    });
    setIsDialogOpen(true);
  };

  const handleQuickAdjust = (item: InventarisData, type: "Masuk" | "Keluar" | "Stocktake") => {
    setAdjustItem(item);
    setAdjustType(type);
    const current = item.jumlah || 0;
    setAdjustBeforeQty(current);
    setAdjustAfterQty(current);
    setAdjustJumlah(1);
    setAdjustNote("");
    setAdjustRecipient("");
    setAdjustReason("");
    setManualBatch(false);
    setSelectedBatchId("");
    setKeluarMode('Distribusi');
    setHargaSatuan(0);
    setHargaDasar(0);
    setSumbangan(0);
    setAdjustDate(new Date().toISOString().split('T')[0]);
    setIsAdjustOpen(true);
    // Load FEFO batches for Keluar
    if (type === 'Keluar') {
      (async () => {
        try {
          const { data, error } = await (supabase as any)
            .from('receive_entries')
            .select('id, expiry_date, qty')
            .eq('item_id', item.id)
            .order('expiry_date', { ascending: true });
          if (!error) setBatches((data || []) as any);
        } catch {}
      })();
    } else {
      setBatches([]);
    }
  };

  const submitAdjust = async () => {
    if (!adjustItem) return;
    try {
      setIsAdjustSubmitting(true);

      let payload: any = {
        item_id: adjustItem.id,
        tipe: adjustType,
        tanggal: adjustDate,
        catatan: adjustReason ? adjustReason : (adjustNote || null),
        penerima: adjustRecipient || null,
      };

      if (adjustType === "Masuk" || adjustType === "Keluar") {
        const jumlah = Math.max(1, Math.floor(adjustJumlah || 0));
        payload = { ...payload, jumlah };
        // Create batch on Masuk when expiry provided
        if (adjustType === 'Masuk' && adjustExpiry) {
          const { data: batchIns, error: be } = await (supabase as any).from('receive_entries').insert([
            {
              item_id: adjustItem.id,
              expiry_date: adjustExpiry,
              qty: jumlah,
            } as any,
          ]).select('id').single();
          if (be) throw be;
          payload.batch_id = batchIns.id;
        }
        // FEFO default or manual batch for Keluar
        if (adjustType === 'Keluar') {
          // Validate recipient for Distribusi
          if (keluarMode === 'Distribusi' && !adjustRecipient) {
            toast.error('Mohon isi Penerima/Unit Tujuan untuk distribusi');
            setIsAdjustSubmitting(false);
            return;
          }
          if (manualBatch && selectedBatchId) {
            payload.batch_id = selectedBatchId;
          } else if (batches.length > 0) {
            payload.batch_id = batches[0].id; // FEFO
          }
          // Harga hanya untuk Penjualan
          if (keluarMode === 'Penjualan') {
            // Hitung harga satuan efektif dari breakdown
            const totalPemasukan = (hargaDasar * adjustJumlah) + sumbangan;
            payload.harga_satuan = Math.max(0, Math.floor(totalPemasukan / adjustJumlah));
            
            // Catatan dengan breakdown yang transparan
            const breakdownNote = sumbangan > 0 
              ? `Penjualan - Harga Dasar: ${formatRupiah(hargaDasar)}/unit, Sumbangan: ${formatRupiah(sumbangan)}`
              : `Penjualan - Harga: ${formatRupiah(hargaDasar)}/unit`;
            
            payload.catatan = payload.catatan ? `${payload.catatan} · ${breakdownNote}` : breakdownNote;
          } else {
            payload.harga_satuan = null;
            payload.catatan = payload.catatan ? `${payload.catatan} · Distribusi` : 'Distribusi';
          }
        }
      } else {
        // Stocktake requires before and after, and jumlah for constraint
        const beforeQty = Math.max(0, Math.floor(adjustBeforeQty || 0));
        const afterQty = Math.max(0, Math.floor(adjustAfterQty || 0));
        const diff = afterQty - beforeQty; // delta
        // Convert Stocktake to IN/OUT transaction with reason
        if (diff === 0) {
          toast.info('Tidak ada perubahan stok');
          setIsAdjustOpen(false);
          setIsAdjustSubmitting(false);
          return;
        }
        const finalType = diff > 0 ? 'Masuk' : 'Keluar';
        const jumlah = Math.abs(diff);
        payload = { ...payload, tipe: finalType, jumlah, catatan: 'Stocktake' };
      }

      const { error } = await supabase.from('transaksi_inventaris').insert([payload]);
      if (error) throw error;

      toast.success('Transaksi stok berhasil disimpan');
      setIsAdjustOpen(false);
      await fetchInventarisData();
      await fetchTransactions();
    } catch (e) {
      console.error('Gagal menyimpan transaksi:', e);
      toast.error('Gagal menyimpan transaksi');
    } finally {
      setIsAdjustSubmitting(false);
    }
  };

  const handleDelete = async () => {
    if (!itemToDelete) return;

    try {
      const { error } = await supabase
        .from("inventaris")
        .delete()
        .eq("id", itemToDelete);

      if (error) throw error;

      toast.success("Item berhasil dihapus!");
      fetchInventarisData();
    } catch (error) {
      console.error("Error deleting item:", error);
      toast.error("Gagal menghapus item");
    } finally {
      setItemToDelete(null);
    }
  };

  const handleExportCSV = () => {
    const exportData = filteredData.map((item) => ({
      "Nama Barang": item.nama_barang,
      "Tipe Item": item.tipe_item,
      Kategori: item.kategori,
      Zona: item.zona,
      Lokasi: item.lokasi || "-",
      Kondisi: item.kondisi || "-",
      Jumlah: item.jumlah || 0,
      Satuan: item.satuan || "-",
      "Min Stock": item.min_stock ?? 10,
      Supplier: item.supplier || "-",
      "Memiliki Kedaluwarsa": item.has_expiry ? "Ya" : "Tidak",
      "Tanggal Kedaluwarsa": item.tanggal_kedaluwarsa
        ? formatDate(item.tanggal_kedaluwarsa)
        : "-",
      Keterangan: item.keterangan || "-",
    }));

    exportToCSV(exportData, "inventaris");
    toast.success("Data berhasil diekspor!");
  };

  const handleExportRiwayatCSV = (rows: any[]) => {
    const exportData = rows.map((t) => ({
      Item: t.item?.nama_barang || '-',
      Tipe: t.tipe,
      Jumlah: t.jumlah || 0,
      Satuan: t.item?.satuan || '-',
      HargaSatuan: t.harga_satuan ?? '-',
      Total: t.harga_satuan ? Number(t.harga_satuan) * Number(t.jumlah || 0) : '-',
      Penerima: t.penerima || '-',
      Tanggal: t.tanggal ? formatDate(t.tanggal) : '-',
      Catatan: t.catatan || '-',
    }));
    exportToCSV(exportData, 'riwayat_transaksi');
    toast.success('Riwayat diekspor');
  };

  return (
    <div className="p-6 lg:p-8 space-y-6 animate-fade-in">
      {/* Header */}
      <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold text-foreground mb-2">
            Sistem Inventaris
          </h1>
          <p className="text-muted-foreground">
            Yayasan Pesantren Anak Yatim Al-Bisri
          </p>
        </div>
        <div className="flex gap-2">
          <Button
            variant="outline"
            onClick={handleExportCSV}
            disabled={filteredData.length === 0}
          >
            <FileDown className="w-4 h-4 mr-2" />
            Export CSV
          </Button>
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="outline">Advanced</Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuItem onClick={() => setIsMultiReceiptOpen(true)}>
                <ShoppingCart className="w-4 h-4 mr-2" /> Penerimaan Multi-Item
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
          <Dialog
            open={isDialogOpen}
            onOpenChange={(open) => {
              setIsDialogOpen(open);
              if (!open) {
                resetForm();
              }
            }}
          >
            <DialogTrigger asChild>
              <Button className="bg-primary hover:bg-primary/90 text-primary-foreground shadow-medium">
                <Plus className="w-4 h-4 mr-2" />
                Tambah Item
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
              <DialogHeader>
                <DialogTitle>
                  {formMode === "edit"
                    ? "Edit Inventaris"
                    : "Tambahkan item baru ke inventaris."}
                </DialogTitle>
              </DialogHeader>

              <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
                {/* Nama Item */}
                <div className="space-y-2">
                  <Label htmlFor="nama_barang">
                    Nama Item <span className="text-red-500">*</span>
                  </Label>
                  <Input
                    id="nama_barang"
                    placeholder="Masukkan nama item..."
                    {...register("nama_barang")}
                    className={errors.nama_barang ? "border-red-500" : ""}
                  />
                  {errors.nama_barang && (
                    <p className="text-sm text-red-500">
                      {errors.nama_barang.message}
                    </p>
                  )}
                </div>

                {/* Tipe Item */}
                <div className="space-y-2">
                  <Label htmlFor="tipe_item">
                    Tipe Item <span className="text-red-500">*</span>
                  </Label>
                  <Select
                    value={watch("tipe_item")}
                    onValueChange={(value) => {
                      setValue("tipe_item", value as "Aset" | "Komoditas", { shouldDirty: true });
                      // Reset kategori when tipe_item changes
                      setValue("kategori", "", { shouldDirty: true });
                    }}
                  >
                    <SelectTrigger
                      className={errors.tipe_item ? "border-red-500" : ""}
                    >
                      <SelectValue placeholder="Pilih tipe item" />
                    </SelectTrigger>
                    <SelectContent>
                      {TIPE_ITEM_OPTIONS.map((tipe) => (
                        <SelectItem key={tipe.value} value={tipe.value}>
                          {tipe.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  {errors.tipe_item && (
                    <p className="text-sm text-red-500">
                      {errors.tipe_item.message}
                    </p>
                  )}
                </div>

                {/* Grid 2 columns */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {/* Kategori */}
                  <div className="space-y-2">
                    <Label htmlFor="kategori">
                      Kategori <span className="text-red-500">*</span>
                    </Label>
                    <Select
                      value={watch("kategori")}
                      onValueChange={(value) => setValue("kategori", value, { shouldDirty: true })}
                      disabled={!watch("tipe_item")}
                    >
                      <SelectTrigger
                        className={errors.kategori ? "border-red-500" : ""}
                      >
                        <SelectValue placeholder={watch("tipe_item") ? "Pilih kategori" : "Pilih tipe item terlebih dahulu"} />
                      </SelectTrigger>
                      <SelectContent>
                        {watch("tipe_item") && getKategoriOptions(watch("tipe_item")).map((kat) => (
                          <SelectItem key={kat} value={kat}>
                            {kat}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    {errors.kategori && (
                      <p className="text-sm text-red-500">
                        {errors.kategori.message}
                      </p>
                    )}
                  </div>

                  {/* Zona */}
                  <div className="space-y-2">
                    <Label htmlFor="zona">
                      Zona <span className="text-red-500">*</span>
                    </Label>
                    <Select
                      value={watch("zona")}
                      onValueChange={(value) => setValue("zona", value as "Gedung Putra" | "Gedung Putri" | "Area luar", { shouldDirty: true })}
                    >
                      <SelectTrigger
                        className={errors.zona ? "border-red-500" : ""}
                      >
                        <SelectValue placeholder="Pilih zona" />
                      </SelectTrigger>
                      <SelectContent>
                        {ZONA_OPTIONS.map((zona) => (
                          <SelectItem key={zona.value} value={zona.value}>
                            {zona.label}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    {errors.zona && (
                      <p className="text-sm text-red-500">
                        {errors.zona.message}
                      </p>
                    )}
                  </div>
                </div>

                {/* Lokasi Detail */}
                <div className="space-y-2">
                  <Label htmlFor="lokasi">
                    Lokasi Detail <span className="text-red-500">*</span>
                  </Label>
                  <Input
                    id="lokasi"
                    placeholder="Contoh: Lt. 3 Gudang, Ruang 101, dll"
                    {...register("lokasi")}
                    className={errors.lokasi ? "border-red-500" : ""}
                  />
                  <p className="text-xs text-muted-foreground">
                    Zona: {watch("zona") || "Belum dipilih"} | Lokasi: {watch("lokasi") || "Belum diisi"}
                  </p>
                  {errors.lokasi && (
                    <p className="text-sm text-red-500">
                      {errors.lokasi.message}
                    </p>
                  )}
                </div>

                {/* Kondisi */}
                <div className="space-y-2">
                  <Label htmlFor="kondisi">Kondisi</Label>
                  <Select
                    value={watch("kondisi")}
                    onValueChange={(value: any) =>
                      setValue("kondisi", value, { shouldDirty: true })
                    }
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Pilih kondisi" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="Baik">Baik</SelectItem>
                      <SelectItem value="Butuh Perbaikan">Butuh Perbaikan</SelectItem>
                      <SelectItem value="Rusak">Rusak</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                {/* Satuan */}
                <div className="space-y-2">
                  <Label htmlFor="satuan">
                    Satuan <span className="text-red-500">*</span>
                  </Label>
                  <Select
                    value={watch("satuan")}
                    onValueChange={(value) => setValue("satuan", value, { shouldDirty: true })}
                  >
                    <SelectTrigger
                      className={errors.satuan ? "border-red-500" : ""}
                    >
                      <SelectValue placeholder="Pilih satuan" />
                    </SelectTrigger>
                    <SelectContent>
                      {SATUAN_OPTIONS.map((sat) => (
                        <SelectItem key={sat} value={sat}>
                          {sat}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  {errors.satuan && (
                    <p className="text-sm text-red-500">
                      {errors.satuan.message}
                    </p>
                  )}
                </div>

                {/* Min Stock */}
                <div className="space-y-2">
                  <Label htmlFor="min_stock">Min Stock</Label>
                  <Input
                    id="min_stock"
                    type="number"
                    {...register("min_stock", { valueAsNumber: true })}
                    className={errors as any && (errors as any).min_stock ? "border-red-500" : ""}
                  />
                </div>

                {/* Jumlah */}
                <div className="space-y-2">
                  <Label htmlFor="jumlah">Jumlah</Label>
                  <Input
                    id="jumlah"
                    type="number"
                    {...register("jumlah", { valueAsNumber: true })}
                    className={errors.jumlah ? "border-red-500" : ""}
                  />
                  {errors.jumlah && (
                    <p className="text-sm text-red-500">
                      {errors.jumlah.message}
                    </p>
                  )}
                </div>

                {/* Supplier */}
                <div className="space-y-2">
                  <Label htmlFor="supplier">Supplier</Label>
                  <Input
                    id="supplier"
                    placeholder="Nama supplier (opsional)"
                    {...register("supplier")}
                  />
                </div>

                {/* Expiry Tracking */}
                <div className="space-y-4 p-4 border rounded-lg bg-muted/20">
                  <div className="flex items-center space-x-2">
                    <Checkbox
                      id="has_expiry"
                      checked={watch("has_expiry") || false}
                      onCheckedChange={(checked) => {
                        setValue("has_expiry", checked as boolean, { shouldDirty: true });
                        if (!checked) {
                          setValue("tanggal_kedaluwarsa", "", { shouldDirty: true });
                        }
                      }}
                    />
                    <Label htmlFor="has_expiry" className="text-sm font-medium">
                      Item memiliki tanggal kedaluwarsa
                    </Label>
                  </div>
                  
                  {watch("has_expiry") && (
                    <div className="space-y-2">
                      <Label htmlFor="tanggal_kedaluwarsa">
                        Tanggal Kedaluwarsa <span className="text-red-500">*</span>
                      </Label>
                      <Input
                        id="tanggal_kedaluwarsa"
                        type="date"
                        {...register("tanggal_kedaluwarsa")}
                        className={errors.tanggal_kedaluwarsa ? "border-red-500" : ""}
                      />
                      {errors.tanggal_kedaluwarsa && (
                        <p className="text-sm text-red-500">
                          {errors.tanggal_kedaluwarsa.message}
                        </p>
                      )}
                      <p className="text-xs text-muted-foreground">
                        Hanya untuk komoditas yang memiliki masa kedaluwarsa
                      </p>
                    </div>
                  )}
                </div>

                {/* Keterangan */}
                <div className="space-y-2">
                  <Label htmlFor="keterangan">Keterangan</Label>
                  <Textarea
                    id="keterangan"
                    placeholder="Tambahkan keterangan (opsional)"
                    {...register("keterangan")}
                    rows={3}
                    className={errors.keterangan ? "border-red-500" : ""}
                  />
                  {errors.keterangan && (
                    <p className="text-sm text-red-500">
                      {errors.keterangan.message}
                    </p>
                  )}
                </div>

                <DialogFooter className="gap-2">
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => {
                      setIsDialogOpen(false);
                      resetForm();
                    }}
                    disabled={isSubmitting}
                  >
                    Batal
                  </Button>
                  <Button type="submit" disabled={isSubmitting || !isDirty}>
                    {isSubmitting && (
                      <RefreshCw className="w-4 h-4 mr-2 animate-spin" />
                    )}
                    {formMode === "edit" ? "Update Item" : "Simpan Item"}
                  </Button>
                </DialogFooter>
              </form>
            </DialogContent>
          </Dialog>
        </div>
      </div>

      {/* Old four-wallet stats removed; Ringkasan becomes the main summary */}

      {/* Filters */}
      <Card className="border-border bg-gradient-card">
        <CardContent className="pt-6">
          <div className="flex flex-col lg:flex-row gap-4">
            <div className="flex-1">
              <div className="relative">
                <Search className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Cari nama, kategori, atau lokasi..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-10"
                />
              </div>
            </div>
            <div className="flex gap-2 flex-wrap">
              <Select value={filterKategori} onValueChange={setFilterKategori}>
                <SelectTrigger className="w-[160px]">
                  <SelectValue placeholder="Semua Kategori" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Semua Kategori</SelectItem>
                  {categoriesInData.map((cat) => (
                    <SelectItem key={cat} value={cat}>
                      {cat}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>

              <Select value={filterKondisi} onValueChange={setFilterKondisi}>
                <SelectTrigger className="w-[140px]">
                  <SelectValue placeholder="Semua Kondisi" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Semua Kondisi</SelectItem>
                  <SelectItem value="Baik">Baik</SelectItem>
                  <SelectItem value="Butuh Perbaikan">Butuh Perbaikan</SelectItem>
                  <SelectItem value="Rusak">Rusak</SelectItem>
                </SelectContent>
              </Select>

              <Select value={timePeriod} onValueChange={(value) => {
                setTimePeriod(value as "mingguan" | "bulanan" | "tahunan");
                setSelectedPeriod(""); // Reset selected period
              }}>
                <SelectTrigger className="w-[120px]">
                  <SelectValue placeholder="Periode" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="mingguan">Mingguan</SelectItem>
                  <SelectItem value="bulanan">Bulanan</SelectItem>
                  <SelectItem value="tahunan">Tahunan</SelectItem>
                </SelectContent>
              </Select>
              
              {timePeriod && (
                <Select value={selectedPeriod} onValueChange={setSelectedPeriod}>
                  <SelectTrigger className="w-[160px]">
                    <SelectValue placeholder="Pilih periode" />
                  </SelectTrigger>
                  <SelectContent>
                    {getPeriodOptions().map((option) => (
                      <SelectItem key={option.value} value={option.value}>
                        {option.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              )}
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Ringkasan Section - split per tab */}
      {activeTab === "inventaris" && (
      <div className="space-y-6">

        {/* Summary Cards - Inventaris */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <Card className="border-border bg-gradient-card">
            <CardHeader className="pb-2">
              <CardTitle className="text-sm text-muted-foreground">
                Total Item Inventaris
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{totalItem}</div>
              <div className="text-sm text-muted-foreground">Item</div>
            </CardContent>
          </Card>

          <Card className="border-border bg-gradient-card">
            <CardHeader className="pb-2">
              <CardTitle className="text-sm text-muted-foreground">
                Penjualan {timePeriod === "mingguan" ? "Minggu Ini" : timePeriod === "bulanan" ? "Bulan Ini" : "Tahun Ini"}
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{formatRupiah(
                selectedPeriod 
                  ? transactions
                      .filter(t => t.tipe === "Keluar" && t.harga_satuan !== null && t.tanggal && isInSelectedPeriod(t.tanggal))
                      .reduce((acc, t) => acc + (Number(t.harga_satuan || 0) * Number(t.jumlah || 0)), 0)
                  : salesAmount
              )}</div>
              <div className="text-sm text-muted-foreground">
                Qty: {selectedPeriod 
                  ? transactions
                      .filter(t => t.tipe === "Keluar" && t.harga_satuan !== null && t.tanggal && isInSelectedPeriod(t.tanggal))
                      .reduce((acc, t) => acc + Number(t.jumlah || 0), 0)
                  : salesQty} {(() => {
                    // Tampilkan satuan dominan jika konsisten, fallback 'unit'
                    const keluars = (selectedPeriod 
                      ? transactions.filter(t => t.tipe === "Keluar" && t.harga_satuan !== null && t.tanggal && isInSelectedPeriod(t.tanggal))
                      : salesTxMonth).map(t => t.item?.satuan).filter(Boolean) as string[];
                    const unique = Array.from(new Set(keluars));
                    return unique.length === 1 ? unique[0] : 'unit';
                  })()}
              </div>
            </CardContent>
          </Card>
          
          <Card className="border-border bg-gradient-card">
            <CardHeader className="pb-2">
              <CardTitle className="text-sm text-muted-foreground">
                Distribusi {timePeriod === "mingguan" ? "Minggu Ini" : timePeriod === "bulanan" ? "Bulan Ini" : "Tahun Ini"}
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">
                {selectedPeriod 
                  ? transactions
                      .filter(t => t.tipe === "Keluar" && (t.harga_satuan === null || typeof t.harga_satuan === 'undefined') && t.tanggal && isInSelectedPeriod(t.tanggal))
                      .reduce((acc, t) => acc + Number(t.jumlah || 0), 0)
                  : distribusiQty}
              </div>
              <div className="text-sm text-muted-foreground">Unit</div>
            </CardContent>
          </Card>
          
          <Card className="border-border bg-gradient-card">
            <CardHeader className="pb-2">
              <CardTitle className="text-sm text-muted-foreground">Near-Expiry (≤30 hari)</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-amber-600">{nearExpiryCount}</div>
              <div className="text-sm text-muted-foreground">Batch</div>
            </CardContent>
          </Card>
        </div>
      </div>
      )}

      {/* Tabs: Inventaris | Riwayat */}
      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList className="mb-4">
          <TabsTrigger value="inventaris">Inventaris</TabsTrigger>
          <TabsTrigger value="riwayat">Riwayat Transaksi</TabsTrigger>
        </TabsList>

        <TabsContent value="inventaris">
          {/* Data Section */}
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <h2 className="text-xl font-semibold">Daftar Inventaris</h2>
              <p className="text-sm text-muted-foreground">
                Menampilkan {filteredData.length} dari {totalItem} item
              </p>
            </div>

            <Card className="border-border bg-gradient-card">
              <CardContent className="p-0">
                {loading ? (
                  <div className="p-6 space-y-4">
                    {[1, 2, 3].map((i) => (
                      <Skeleton key={i} className="h-20 w-full" />
                    ))}
                  </div>
                ) : filteredData.length === 0 ? (
                  <div className="text-center py-12">
                    <Package className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
                    <p className="text-muted-foreground">
                      {searchTerm || filterKategori !== "all" || filterKondisi !== "all"
                        ? "Tidak ada data yang sesuai dengan filter"
                        : "Belum ada data inventaris"}
                    </p>
                  </div>
                ) : (
                  <div className="overflow-x-auto">
                    <table className="w-full">
                      <thead className="bg-muted/50 border-b">
                        <tr>
                          <th className="px-6 py-4 text-left text-sm font-semibold text-muted-foreground">Nama Item</th>
                          <th className="px-4 py-4 text-left text-sm font-semibold text-muted-foreground">Tipe</th>
                          <th className="px-4 py-4 text-left text-sm font-semibold text-muted-foreground">Kategori</th>
                          <th className="px-4 py-4 text-left text-sm font-semibold text-muted-foreground">Lokasi</th>
                          <th className="px-4 py-4 text-left text-sm font-semibold text-muted-foreground">Kondisi</th>
                          <th className="px-4 py-4 text-left text-sm font-semibold text-muted-foreground">Stok</th>
                          <th className="px-4 py-4 text-center text-sm font-semibold text-muted-foreground">Aksi</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-border">
                        {filteredData.map((item) => (
                          <tr key={item.id} className="hover:bg-muted/30 transition-colors">
                            <td className="px-6 py-4">
                              <div className="font-semibold text-foreground">{item.nama_barang}</div>
                                {item.supplier && (
                                <div className="text-xs text-muted-foreground mt-1">{item.supplier}</div>
                                )}
                            </td>
                            <td className="px-4 py-4">
                              <Badge 
                                variant={item.tipe_item === "Aset" ? "default" : "secondary"} 
                                className="text-xs font-medium"
                              >
                                {item.tipe_item}
                              </Badge>
                            </td>
                            <td className="px-4 py-4">
                              <Badge variant="outline" className="text-xs">{item.kategori}</Badge>
                            </td>
                            <td className="px-4 py-4 text-sm">
                              <div className="space-y-1">
                                <div className="text-xs text-muted-foreground font-medium">{item.zona}</div>
                                <div className="text-foreground">{item.lokasi || "-"}</div>
                              </div>
                            </td>
                            <td className="px-4 py-4">
                              <Badge className={`${getKondisiColor(item.kondisi || "Baik")} text-xs font-medium`}>
                                    {item.kondisi || "Baik"}
                                  </Badge>
                            </td>
                            <td className="px-4 py-4">
                              <div className="space-y-2">
                                <div className="font-semibold text-foreground">
                                  {item.jumlah || 0} {item.satuan || "pcs"}
                                </div>
                                <div className="flex flex-col gap-1">
                                {isStockBelowMin(item.jumlah, item.min_stock ?? 10) && !isOutOfStock(item.jumlah) && (
                                    <Badge variant="outline" className="text-orange-600 border-orange-200 text-xs w-fit">
                                      <AlertTriangle className="w-3 h-3 mr-1" />Rendah
                                      </Badge>
                                )}
                                {isOutOfStock(item.jumlah) && (
                                    <Badge variant="outline" className="text-red-600 border-red-200 text-xs w-fit">
                                      Habis
                                      </Badge>
                                )}
                                  </div>
                              </div>
                            </td>
                            <td className="px-4 py-4">
                              <div className="flex items-center justify-center">
                                <DropdownMenu>
                                  <DropdownMenuTrigger asChild>
                                    <Button size="sm" variant="ghost" className="h-8 w-8 p-0">
                                      <span className="sr-only">Buka menu</span>
                                      <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                        <circle cx="12" cy="12" r="1" />
                                        <circle cx="12" cy="5" r="1" />
                                        <circle cx="12" cy="19" r="1" />
                                      </svg>
                                    </Button>
                                  </DropdownMenuTrigger>
                                  <DropdownMenuContent align="end" className="w-48">
                                    <DropdownMenuItem onClick={() => handleEdit(item)}>
                                      <Edit className="w-4 h-4 mr-2" />
                                      Edit Item
                                    </DropdownMenuItem>
                                    <DropdownMenuSeparator />
                                    <DropdownMenuItem onClick={() => handleQuickAdjust(item, 'Masuk')}>
                                      <ShoppingCart className="w-4 h-4 mr-2" />
                                      Stok Masuk
                                    </DropdownMenuItem>
                                    <DropdownMenuItem onClick={() => handleQuickAdjust(item, 'Keluar')}>
                                      <TrendingDown className="w-4 h-4 mr-2" />
                                      Stok Keluar
                                    </DropdownMenuItem>
                                    <DropdownMenuItem onClick={() => handleQuickAdjust(item, 'Stocktake')}>
                                      <RefreshCw className="w-4 h-4 mr-2" />
                                      Stocktake
                                    </DropdownMenuItem>
                                    <DropdownMenuSeparator />
                                    <DropdownMenuItem 
                                      onClick={() => setItemToDelete(item.id)}
                                      className="text-red-600 focus:text-red-600"
                                    >
                                      <Trash2 className="w-4 h-4 mr-2" />
                                      Hapus Item
                                    </DropdownMenuItem>
                                  </DropdownMenuContent>
                                </DropdownMenu>
                              </div>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </CardContent>
            </Card>
          </div>
        </TabsContent>


        <TabsContent value="riwayat">
          {/* Dynamic Summary Cards based on time period */}
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
            <Card className="border-border bg-gradient-card">
              <CardHeader className="pb-2">
                <CardTitle className="text-sm text-muted-foreground">
                  Total Transaksi {selectedPeriod ? `(${getPeriodOptions().find(opt => opt.value === selectedPeriod)?.label})` : ''}
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">
                  {selectedPeriod 
                    ? transactions.filter(t => t.tanggal && isInSelectedPeriod(t.tanggal)).length
                    : transactions.length}
                </div>
                <div className="text-sm text-muted-foreground">Transaksi</div>
              </CardContent>
            </Card>
            
            <Card className="border-border bg-gradient-card">
              <CardHeader className="pb-2">
                <CardTitle className="text-sm text-muted-foreground">
                  Total Penjualan {selectedPeriod ? `(${getPeriodOptions().find(opt => opt.value === selectedPeriod)?.label})` : '(Keseluruhan)'}
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-green-600">
                  {formatRupiah(
                    selectedPeriod 
                      ? transactions
                          .filter(t => t.tipe === "Keluar" && t.keluar_mode === "Penjualan" && t.harga_total > 0 && t.tanggal && isInSelectedPeriod(t.tanggal))
                          .reduce((acc, t) => acc + Number(t.harga_total || 0), 0)
                      : totalSalesAmount
                  )}
                </div>
                <div className="text-sm text-muted-foreground">
                  {selectedPeriod 
                    ? transactions
                        .filter(t => t.tipe === "Keluar" && t.keluar_mode === "Penjualan" && t.harga_total > 0 && t.tanggal && isInSelectedPeriod(t.tanggal))
                        .length
                    : totalSalesCount} transaksi
                </div>
              </CardContent>
            </Card>
            
            <Card className="border-border bg-gradient-card">
              <CardHeader className="pb-2">
                <CardTitle className="text-sm text-muted-foreground">
                  Total Distribusi {selectedPeriod ? `(${getPeriodOptions().find(opt => opt.value === selectedPeriod)?.label})` : ''}
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-blue-600">
                  {selectedPeriod 
                    ? transactions
                        .filter(t => t.tipe === "Keluar" && (t.harga_satuan === null || typeof t.harga_satuan === 'undefined') && t.tanggal && isInSelectedPeriod(t.tanggal))
                        .reduce((acc, t) => acc + Number(t.jumlah || 0), 0)
                    : distribusiQty}
                </div>
                <div className="text-sm text-muted-foreground">Unit</div>
              </CardContent>
            </Card>

            <Card className="border-border bg-gradient-card">
              <CardHeader className="pb-2">
                <CardTitle className="text-sm text-muted-foreground">
                  Pendapatan Bulan Ini
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-purple-600">
                  {formatRupiah(
                    selectedPeriod 
                      ? transactions
                          .filter(t => t.tipe === "Keluar" && t.keluar_mode === "Penjualan" && t.harga_total > 0 && t.tanggal && isInSelectedPeriod(t.tanggal))
                          .reduce((acc, t) => acc + Number(t.harga_total || 0), 0)
                      : salesAmount
                  )}
                </div>
                <div className="text-sm text-muted-foreground">
                  {selectedPeriod 
                    ? transactions
                        .filter(t => t.tipe === "Keluar" && t.keluar_mode === "Penjualan" && t.harga_total > 0 && t.tanggal && isInSelectedPeriod(t.tanggal))
                        .length
                    : salesTxMonth.length} transaksi {selectedPeriod ? `(${getPeriodOptions().find(opt => opt.value === selectedPeriod)?.label})` : 'bulan ini'}
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Trend Analysis and Top Transactions */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
            {/* Trend Analysis */}
            <Card className="border-border bg-gradient-card">
              <CardHeader>
                <CardTitle className="text-lg flex items-center gap-2">
                  <TrendingUp className="w-5 h-5 text-blue-500" />
                  Tren Transaksi {selectedPeriod ? `(${getPeriodOptions().find(opt => opt.value === selectedPeriod)?.label})` : '7 Hari Terakhir'}
                </CardTitle>
              </CardHeader>
              <CardContent className="p-0">
                <div className="space-y-4">
                    <div className="p-4">
                      <div className="grid grid-cols-2 gap-4 text-center">
                        <div>
                        <div className="text-2xl font-bold text-green-600">
                          {selectedPeriod 
                            ? transactions.filter(t => t.tipe === 'Masuk' && t.tanggal && isInSelectedPeriod(t.tanggal)).length
                            : transactions.filter(t => t.tipe === 'Masuk' && new Date(t.tanggal) >= new Date(Date.now() - 7 * 24 * 60 * 60 * 1000)).length}
                        </div>
                          <div className="text-xs text-muted-foreground">Masuk</div>
                        </div>
                        <div>
                        <div className="text-2xl font-bold text-red-600">
                          {selectedPeriod 
                            ? transactions.filter(t => t.tipe === 'Keluar' && t.tanggal && isInSelectedPeriod(t.tanggal)).length
                            : transactions.filter(t => t.tipe === 'Keluar' && new Date(t.tanggal) >= new Date(Date.now() - 7 * 24 * 60 * 60 * 1000)).length}
                        </div>
                          <div className="text-xs text-muted-foreground">Keluar</div>
                        </div>
                      </div>
                    </div>
                  </div>
              </CardContent>
            </Card>

            {/* Top Transactions */}
            <Card className="border-border bg-gradient-card">
              <CardHeader>
                <CardTitle className="text-lg flex items-center gap-2">
                  <DollarSign className="w-5 h-5 text-green-500" />
                  Transaksi Terbesar {selectedPeriod ? `(${getPeriodOptions().find(opt => opt.value === selectedPeriod)?.label})` : ''}
                </CardTitle>
              </CardHeader>
              <CardContent className="p-0">
                    {(() => {
                  const filteredTransactions = selectedPeriod 
                    ? transactions.filter(t => t.tanggal && isInSelectedPeriod(t.tanggal))
                    : transactions;
                  
                  const topTransactions = filteredTransactions
                    .filter(t => t.tipe === 'Keluar' && t.harga_satuan !== null)
                    .sort((a, b) => (Number(b.harga_satuan || 0) * Number(b.jumlah || 0)) - (Number(a.harga_satuan || 0) * Number(a.jumlah || 0)))
                        .slice(0, 5);
                      
                  return topTransactions.length === 0 ? (
                    <div className="text-center py-6 text-muted-foreground text-sm">Belum ada transaksi penjualan</div>
                      ) : (
                        <div className="max-h-48 overflow-y-auto">
                      {topTransactions.map((transaction, index) => (
                        <div key={transaction.id} className="px-4 py-3 border-b last:border-b-0 hover:bg-muted/20">
                              <div className="flex items-center justify-between">
                                <div className="flex items-center gap-2">
                              <div className="w-6 h-6 bg-green-100 rounded-full flex items-center justify-center text-xs font-medium text-green-700">
                                    {index + 1}
                                  </div>
                                  <div>
                                <div className="font-medium text-sm">{transaction.item?.nama_barang || 'Unknown'}</div>
                                <div className="text-xs text-muted-foreground">
                                  {transaction.jumlah} unit × {formatRupiah(Number(transaction.harga_satuan || 0))}
                                  </div>
                              </div>
                            </div>
                            <div className="text-right">
                              <div className="font-medium text-green-600">
                                {formatRupiah(Number(transaction.harga_satuan || 0) * Number(transaction.jumlah || 0))}
                              </div>
                              <div className="text-xs text-muted-foreground">{formatDate(transaction.tanggal)}</div>
                                </div>
                              </div>
                            </div>
                          ))}
                        </div>
                      );
                    })()}
              </CardContent>
            </Card>
          </div>

          <Card className="border-border bg-gradient-card">
            <CardHeader>
              <div className="flex items-center justify-between">
                <CardTitle>Riwayat Transaksi</CardTitle>
                  <div className="flex items-center gap-2">
                    <Select value={riwayatFilterTipe} onValueChange={setRiwayatFilterTipe}>
                      <SelectTrigger className="w-32">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="all">Semua</SelectItem>
                        <SelectItem value="Penjualan">Penjualan</SelectItem>
                        <SelectItem value="Distribusi">Distribusi</SelectItem>
                        <SelectItem value="Masuk">Masuk</SelectItem>
                      </SelectContent>
                    </Select>
                </div>
              </div>
            </CardHeader>
            <CardContent className="p-0">
              {loadingTx ? (
                <div className="p-6 space-y-4">{[1,2,3].map(i => <Skeleton key={i} className="h-16 w-full" />)}</div>
              ) : (() => {
                // Filter transactions based on selected filters
                let filteredTx = transactions;
                
                // Apply time period filter first (only if a period is selected)
                if (selectedPeriod && selectedPeriod !== "") {
                  filteredTx = filteredTx.filter(t => t.tanggal && isInSelectedPeriod(t.tanggal));
                }
                
                if (riwayatFilterTipe !== "all") {
                  if (riwayatFilterTipe === "Penjualan" || riwayatFilterTipe === "Distribusi") {
                    filteredTx = filteredTx.filter(t => t.tipe === 'Keluar' && t.catatan?.includes(riwayatFilterTipe));
                  } else {
                    filteredTx = filteredTx.filter(t => t.tipe === riwayatFilterTipe);
                  }
                }
                
                
                return filteredTx.length === 0 ? (
                  <div className="text-center py-12">
                    <Package className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
                    <p className="text-muted-foreground">
                      {selectedPeriod ? 'Tidak ada transaksi pada periode yang dipilih' : 'Belum ada transaksi'}
                    </p>
                  </div>
                ) : (
                  <>
                    <div className="p-4 border-b bg-muted/20 flex items-center justify-between">
                      <div className="text-sm text-muted-foreground">
                        Menampilkan {filteredTx.length} dari {transactions.length} transaksi
                        {selectedPeriod && ` • Periode: ${getPeriodOptions().find(opt => opt.value === selectedPeriod)?.label}`}
                      </div>
                      <Button size="sm" variant="outline" onClick={() => handleExportRiwayatCSV(filteredTx)}>Export CSV</Button>
                    </div>
                  <div className="overflow-x-auto">
                    <table className="w-full">
                      <thead className="bg-muted/50 border-b">
                        <tr>
                          <th className="px-6 py-4 text-left text-sm font-semibold text-muted-foreground">Item</th>
                          <th className="px-4 py-4 text-left text-sm font-semibold text-muted-foreground">Jumlah</th>
                          <th className="px-4 py-4 text-left text-sm font-semibold text-muted-foreground">Harga Satuan</th>
                          <th className="px-4 py-4 text-left text-sm font-semibold text-muted-foreground">Total</th>
                          <th className="px-4 py-4 text-left text-sm font-semibold text-muted-foreground">Sumbangan</th>
                          <th className="px-4 py-4 text-left text-sm font-semibold text-muted-foreground">Penerima</th>
                          <th className="px-4 py-4 text-left text-sm font-semibold text-muted-foreground">Tanggal</th>
                          <th className="px-4 py-4 text-center text-sm font-semibold text-muted-foreground">Aksi</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-border">
                        {filteredTx.map((t) => {
                          const breakdown = parseBreakdown(t.catatan || "", t.harga_satuan || 0, t.jumlah || 0);
                          const totalAmount = t.harga_satuan ? Number(t.harga_satuan) * Number(t.jumlah || 0) : 0;
                          
                          return (
                            <tr key={t.id} className="hover:bg-muted/30 transition-colors">
                              <td className="px-6 py-4">
                                <div className="font-semibold text-foreground">{t.item?.nama_barang || '-'}</div>
                                <div className="flex items-center gap-2 mt-1">
                                  <Badge 
                                    variant={t.tipe === 'Masuk' ? 'secondary' : 'outline'} 
                                    className="text-xs"
                                  >
                                    {t.tipe === 'Keluar' && t.catatan?.includes('Penjualan') ? 'Penjualan' : 
                                     t.tipe === 'Keluar' && t.catatan?.includes('Distribusi') ? 'Distribusi' : 
                                     t.tipe}
                              </Badge>
                                </div>
                            </td>
                              <td className="px-4 py-4">
                                <div className="font-semibold text-foreground">{t.jumlah || 0}</div>
                                <div className="text-xs text-muted-foreground">{t.item?.satuan || 'pcs'}</div>
                              </td>
                              <td className="px-4 py-4">
                                {t.harga_satuan ? (
                                  <div className="space-y-1">
                                    <div className="font-semibold text-foreground">
                                      {formatRupiah(Number(t.harga_satuan))}
                                    </div>
                                    {breakdown.hasBreakdown && (
                                      <div className="text-xs text-muted-foreground">
                                        Dasar: {formatRupiah(breakdown.hargaDasar)}
                                </div>
                                    )}
                                  </div>
                                ) : (
                                  <span className="text-muted-foreground text-sm">-</span>
                              )}
                            </td>
                              <td className="px-4 py-4">
                                {t.harga_satuan ? (
                                  <div className="space-y-1">
                                    <div className="font-semibold text-green-600">
                                      {formatRupiah(totalAmount)}
                                </div>
                                    {breakdown.hasBreakdown && breakdown.sumbangan > 0 && (
                                      <div className="text-xs text-muted-foreground">
                                        + {formatRupiah(breakdown.sumbangan)} sumbangan
                                  </div>
                                )}
                              </div>
                                ) : (
                                  <span className="text-muted-foreground text-sm">-</span>
                                )}
                            </td>
                              <td className="px-4 py-4">
                                {breakdown.hasBreakdown && breakdown.sumbangan > 0 ? (
                                  <div className="space-y-1">
                                    <div className="font-semibold text-blue-600">
                                      {formatRupiah(breakdown.sumbangan)}
                                    </div>
                                    <div className="text-xs text-muted-foreground">
                                      Sumbangan tambahan
                                    </div>
                                  </div>
                                ) : (
                                  <span className="text-muted-foreground text-sm">-</span>
                                )}
                              </td>
                              <td className="px-4 py-4">
                                <div className="text-sm">
                                  {t.tipe === 'Keluar' && t.catatan?.includes('Distribusi') ? (
                                    t.penerima ? (
                                      <Badge variant="outline" className="text-xs border-blue-200 text-blue-700 bg-blue-50">
                                        Penerima: {t.penerima}
                                      </Badge>
                                    ) : (
                                      <span className="text-muted-foreground">-</span>
                                    )
                                  ) : (
                                    t.penerima ? <span className="font-medium text-foreground">{t.penerima}</span> : <span className="text-muted-foreground">-</span>
                                  )}
                                </div>
                              </td>
                              <td className="px-4 py-4">
                                <div className="text-sm text-muted-foreground">
                                  {formatDate(t.tanggal)}
                                </div>
                              </td>
                              <td className="px-4 py-4">
                              <div className="flex items-center justify-center">
                                <DropdownMenu>
                                  <DropdownMenuTrigger asChild>
                                    <Button size="sm" variant="ghost" className="h-8 w-8 p-0">
                                        <span className="sr-only">Buka menu</span>
                                        <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                          <circle cx="12" cy="12" r="1" />
                                          <circle cx="12" cy="5" r="1" />
                                          <circle cx="12" cy="19" r="1" />
                                        </svg>
                                    </Button>
                                  </DropdownMenuTrigger>
                                    <DropdownMenuContent align="end" className="w-48">
                                      <DropdownMenuItem 
                                        onClick={() => {
                                      setTxDetail(t);
                                      setTxDetailOpen(true);
                                        }}
                                      >
                                        <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                                        </svg>
                                        Detail Transaksi
                                    </DropdownMenuItem>
                                    <DropdownMenuItem onClick={() => openEditTx(t)}>
                                      <Edit className="w-4 h-4 mr-2" />
                                        Edit Transaksi
                                    </DropdownMenuItem>
                                      <DropdownMenuSeparator />
                                    <DropdownMenuItem 
                                      onClick={() => deleteTx(t)}
                                      className="text-red-600 focus:text-red-600"
                                    >
                                      <Trash2 className="w-4 h-4 mr-2" />
                                        Hapus Transaksi
                                    </DropdownMenuItem>
                                  </DropdownMenuContent>
                                </DropdownMenu>
                              </div>
                            </td>
                          </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>
                  </>
                );
              })()}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* Delete Confirmation Dialog */}
      <AlertDialog
        open={!!itemToDelete}
        onOpenChange={() => setItemToDelete(null)}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Konfirmasi Hapus</AlertDialogTitle>
            <AlertDialogDescription>
              Apakah Anda yakin ingin menghapus item ini? Tindakan ini tidak
              dapat dibatalkan.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Batal</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDelete}
              className="bg-red-600 hover:bg-red-700"
            >
              Hapus
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
      {/* Quick Adjust Dialog */}
      <Dialog open={isAdjustOpen} onOpenChange={setIsAdjustOpen}>
        <DialogContent className="max-w-md max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>
              {adjustType === 'Masuk' && 'Tambah Stok (Masuk)'}
              {adjustType === 'Keluar' && 'Kurangi Stok (Keluar)'}
              {adjustType === 'Stocktake' && 'Stocktake (Penyesuaian)'}
            </DialogTitle>
          </DialogHeader>

          <div className="space-y-4 overflow-y-auto max-h-[calc(90vh-200px)] pr-2">
            <div className="text-sm text-muted-foreground">
              Item: <span className="font-medium text-foreground">{adjustItem?.nama_barang}</span>
            </div>

            <div className="space-y-2">
              <Label htmlFor="adjust_date">Tanggal</Label>
              <Input id="adjust_date" type="date" value={adjustDate} onChange={(e) => setAdjustDate(e.target.value)} />
            </div>

            {adjustType !== 'Stocktake' ? (
              <div className="space-y-2">
                <Label htmlFor="adjust_jumlah">Jumlah</Label>
                <Input id="adjust_jumlah" type="number" value={adjustJumlah}
                  onChange={(e) => setAdjustJumlah(parseInt(e.target.value || '0', 10))} />
                {/* Expiry for Masuk (optional) */}
                {adjustType === 'Masuk' && (
                  <div className="space-y-2 mt-2">
                    <Label htmlFor="adjust_expiry">Tanggal Kedaluwarsa (opsional)</Label>
                    <Input id="adjust_expiry" type="date" value={adjustExpiry} onChange={(e) => setAdjustExpiry(e.target.value)} />
                  </div>
                )}
                {/* Recipient and Reason for Keluar */}
                {adjustType === 'Keluar' && (
                  <div className="space-y-2 mt-2">
                    <Label htmlFor="keluar_mode">Tipe Transaksi</Label>
                    <Select value={keluarMode} onValueChange={(v) => setKeluarMode(v as any)}>
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="Penjualan">Penjualan</SelectItem>
                        <SelectItem value="Distribusi">Distribusi</SelectItem>
                      </SelectContent>
                    </Select>
                    {keluarMode === 'Penjualan' && (
                      <div className="space-y-4">
                        <div className="grid grid-cols-2 gap-4">
                          <div className="space-y-2">
                            <Label htmlFor="harga_dasar">Harga Dasar per Unit (Rp)</Label>
                            <Input 
                              id="harga_dasar" 
                              type="number" 
                              value={hargaDasar}
                              onChange={(e) => setHargaDasar(parseFloat(e.target.value) || 0)}
                              placeholder="0"
                            />
                          </div>
                          
                          <div className="space-y-2">
                            <Label htmlFor="sumbangan">Sumbangan Tambahan (Rp)</Label>
                            <Input 
                              id="sumbangan" 
                              type="number" 
                              value={sumbangan}
                              onChange={(e) => setSumbangan(parseFloat(e.target.value) || 0)}
                              placeholder="0"
                            />
                          </div>
                        </div>
                        
                        {/* Breakdown yang transparan */}
                        <div className="p-3 bg-blue-50 rounded-lg border">
                          <div className="text-sm space-y-1">
                            <div className="flex justify-between">
                              <span>Harga Dasar:</span>
                              <span>{formatRupiah(hargaDasar)} × {adjustJumlah} = {formatRupiah(hargaDasar * adjustJumlah)}</span>
                            </div>
                            <div className="flex justify-between">
                              <span>Sumbangan:</span>
                              <span>{formatRupiah(sumbangan)}</span>
                            </div>
                            <div className="font-semibold border-t pt-1 flex justify-between">
                              <span>Total Pemasukan:</span>
                              <span>{formatRupiah((hargaDasar * adjustJumlah) + sumbangan)}</span>
                            </div>
                            <div className="text-xs text-muted-foreground flex justify-between">
                              <span>Harga satuan efektif:</span>
                              <span>{formatRupiah(adjustJumlah > 0 ? ((hargaDasar * adjustJumlah) + sumbangan) / adjustJumlah : 0)}</span>
                            </div>
                          </div>
                        </div>
                      </div>
                    )}
                    <Label htmlFor="recipient">Penerima/Unit Tujuan {keluarMode === 'Distribusi' && <span className="text-red-600">*</span>}</Label>
                    <Input id="recipient" value={adjustRecipient} onChange={(e) => setAdjustRecipient(e.target.value)} placeholder="Mis. Bagian Dapur" />
                    {keluarMode === 'Distribusi' && !adjustRecipient && (
                      <p className="text-xs text-red-600 mt-1">Wajib diisi untuk distribusi.</p>
                    )}
                    <Label htmlFor="reason">Alasan/Keperluan (opsional)</Label>
                    <Input id="reason" value={adjustReason} onChange={(e) => setAdjustReason(e.target.value)} placeholder="Mis. Kebutuhan operasional" />
                    <div className="flex items-center space-x-2">
                      <Checkbox id="manual_batch" checked={manualBatch} onCheckedChange={(v) => setManualBatch(Boolean(v))} />
                      <Label htmlFor="manual_batch">Pilih batch manual (FEFO default bila tidak dipilih)</Label>
                    </div>
                    {manualBatch && (
                      <div className="space-y-2">
                        <Label htmlFor="batch_id">Batch</Label>
                        <Select value={selectedBatchId} onValueChange={setSelectedBatchId}>
                          <SelectTrigger>
                            <SelectValue placeholder="Pilih batch" />
                          </SelectTrigger>
                          <SelectContent>
                            {batches.map((b) => (
                              <SelectItem key={b.id} value={b.id}>
                                {(b.expiry_date ? `Exp: ${formatDate(b.expiry_date)}` : 'Tanpa Expiry')} · Qty: {b.qty}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>
                    )}
                  </div>
                )}
              </div>
            ) : (
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="before_qty">Sebelum</Label>
                  <Input id="before_qty" type="number" value={adjustBeforeQty}
                    onChange={(e) => setAdjustBeforeQty(parseInt(e.target.value || '0', 10))} />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="after_qty">Sesudah</Label>
                  <Input id="after_qty" type="number" value={adjustAfterQty}
                    onChange={(e) => setAdjustAfterQty(parseInt(e.target.value || '0', 10))} />
                </div>
              </div>
            )}

            <div className="space-y-2">
              <Label htmlFor="adjust_note">Catatan</Label>
              <Textarea id="adjust_note" rows={2} value={adjustNote}
                onChange={(e) => setAdjustNote(e.target.value)} />
            </div>
          </div>

          <DialogFooter className="gap-2 sticky bottom-0 bg-background border-t pt-4 mt-4">
            <Button variant="outline" onClick={() => setIsAdjustOpen(false)} disabled={isAdjustSubmitting}>Batal</Button>
            <Button onClick={submitAdjust} disabled={isAdjustSubmitting || (adjustType === 'Keluar' && keluarMode === 'Distribusi' && !adjustRecipient)}>
              {isAdjustSubmitting && (<RefreshCw className="w-4 h-4 mr-2 animate-spin" />)}
              Simpan
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
      {/* Penerimaan Multi-Item */}
      <Dialog open={isMultiReceiptOpen} onOpenChange={setIsMultiReceiptOpen}>
        <DialogContent className="max-w-4xl">
          <DialogHeader>
            <DialogTitle>Penerimaan Multi-Item</DialogTitle>
          </DialogHeader>
          <MultiReceiptForm items={inventarisData.map(i => ({ id: i.id, nama_barang: i.nama_barang, satuan: i.satuan }))} onClose={() => setIsMultiReceiptOpen(false)} onSaved={async () => { setIsMultiReceiptOpen(false); await fetchInventarisData(); await fetchTransactions(); }} />
        </DialogContent>
      </Dialog>

      {/* Detail Transaksi Dialog */}
      <Dialog open={txDetailOpen} onOpenChange={setTxDetailOpen}>
        <DialogContent className="max-w-2xl max-h-[85vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
              </svg>
              Detail Transaksi
            </DialogTitle>
          </DialogHeader>
          {txDetail && (
            <div className="space-y-6">
              {/* Header Info */}
              <div className="grid grid-cols-3 gap-6 p-6 bg-gradient-to-r from-muted/30 to-muted/20 rounded-lg border">
                <div>
                  <div className="text-sm text-muted-foreground font-medium">Item</div>
                  <div className="font-semibold text-lg text-foreground">{txDetail.item?.nama_barang || '-'}</div>
                  <div className="text-xs text-muted-foreground mt-1">{txDetail.item?.satuan || 'unit'}</div>
              </div>
                <div>
                  <div className="text-sm text-muted-foreground font-medium">Tipe Transaksi</div>
                  <div className="mt-1">
                    <Badge 
                      variant={txDetail.tipe === 'Masuk' ? 'secondary' : 'outline'} 
                      className="text-sm font-medium"
                    >
                      {txDetail.tipe === 'Keluar' && txDetail.catatan?.includes('Penjualan') ? 'Penjualan' : 
                       txDetail.tipe === 'Keluar' && txDetail.catatan?.includes('Distribusi') ? 'Distribusi' : 
                       txDetail.tipe}
                  </Badge>
                </div>
                </div>
                  <div>
                  <div className="text-sm text-muted-foreground font-medium">Tanggal</div>
                  <div className="font-semibold text-lg text-foreground">{formatDate(txDetail.tanggal)}</div>
                  </div>
              </div>

              {/* Transaction Details */}
              <div className="grid grid-cols-2 gap-6">
                <div className="space-y-4">
                  <div className="p-4 bg-muted/20 rounded-lg">
                    <div className="text-sm text-muted-foreground font-medium mb-2">Jumlah Transaksi</div>
                    <div className="text-2xl font-bold text-foreground">{txDetail.jumlah} {txDetail.item?.satuan || 'unit'}</div>
                  </div>
                  
                  {txDetail.penerima && (
                    <div className="p-4 bg-muted/20 rounded-lg">
                      <div className="text-sm text-muted-foreground font-medium mb-2">Penerima/Tujuan</div>
                      <div className="font-semibold text-foreground">{txDetail.penerima}</div>
                    </div>
                  )}
                </div>

                <div className="space-y-4">
                  {txDetail.alasan && (
                    <div className="p-4 bg-muted/20 rounded-lg">
                      <div className="text-sm text-muted-foreground font-medium mb-2">Alasan</div>
                      <div className="font-semibold text-foreground">{txDetail.alasan}</div>
              </div>
                  )}
                  
                  {txDetail.batch_id && (
                    <div className="p-4 bg-muted/20 rounded-lg">
                      <div className="text-sm text-muted-foreground font-medium mb-2">Batch ID</div>
                      <div className="font-mono text-sm text-foreground">{txDetail.batch_id}</div>
                    </div>
                  )}
                </div>
              </div>

              {/* Price Breakdown (jika ada) */}
              {txDetail.tipe === 'Keluar' && txDetail.harga_satuan && (
                <div className="space-y-4">
                  <div className="font-semibold text-lg flex items-center gap-2">
                    <DollarSign className="w-5 h-5 text-green-600" />
                    Detail Harga & Pemasukan
                  </div>
                  <div className="p-6 bg-gradient-to-r from-green-50 to-blue-50 rounded-lg border border-green-200 space-y-4">
                  {(() => {
                    const breakdown = parseBreakdown(txDetail.catatan || "", txDetail.harga_satuan, txDetail.jumlah);
                      const totalAmount = txDetail.harga_satuan * txDetail.jumlah;
                      
                    if (breakdown.hasBreakdown && breakdown.sumbangan > 0) {
                      return (
                          <div className="space-y-3">
                            <div className="grid grid-cols-2 gap-4">
                              <div className="p-4 bg-white/50 rounded-lg">
                                <div className="text-sm text-muted-foreground font-medium">Harga Dasar</div>
                                <div className="text-lg font-semibold text-foreground">
                                  {formatRupiah(breakdown.hargaDasar)}/unit
                          </div>
                                <div className="text-xs text-muted-foreground">
                                  × {txDetail.jumlah} = {formatRupiah(breakdown.hargaDasar * txDetail.jumlah)}
                          </div>
                          </div>
                              
                              <div className="p-4 bg-white/50 rounded-lg">
                                <div className="text-sm text-muted-foreground font-medium">Sumbangan Tambahan</div>
                                <div className="text-lg font-semibold text-blue-600">
                                  {formatRupiah(breakdown.sumbangan)}
                                </div>
                                <div className="text-xs text-muted-foreground">
                                  Sumbangan dari pembeli
                                </div>
                              </div>
                            </div>
                            
                            <div className="p-4 bg-white/70 rounded-lg border-t-2 border-green-300">
                              <div className="flex justify-between items-center">
                                <span className="text-lg font-semibold text-foreground">Total Pemasukan:</span>
                                <span className="text-2xl font-bold text-green-600">
                              {formatRupiah((breakdown.hargaDasar * txDetail.jumlah) + breakdown.sumbangan)}
                            </span>
                          </div>
                              <div className="flex justify-between text-sm text-muted-foreground mt-1">
                                <span>Harga Satuan Efektif:</span>
                            <span>{formatRupiah(txDetail.harga_satuan)}/unit</span>
                              </div>
                            </div>
                          </div>
                        );
                      } else if (breakdown.hasBreakdown) {
                        return (
                          <div className="space-y-3">
                            <div className="p-4 bg-white/50 rounded-lg">
                              <div className="text-sm text-muted-foreground font-medium">Harga Satuan</div>
                              <div className="text-xl font-semibold text-foreground">
                                {formatRupiah(breakdown.hargaDasar)}/unit
                              </div>
                            </div>
                            
                            <div className="p-4 bg-white/70 rounded-lg border-t-2 border-green-300">
                              <div className="flex justify-between items-center">
                                <span className="text-lg font-semibold text-foreground">Total:</span>
                                <span className="text-2xl font-bold text-green-600">
                                  {formatRupiah(breakdown.hargaDasar * txDetail.jumlah)}
                                </span>
                              </div>
                          </div>
                        </div>
                      );
                    } else {
                      return (
                          <div className="p-4 bg-white/70 rounded-lg border-t-2 border-green-300">
                            <div className="flex justify-between items-center">
                              <span className="text-lg font-semibold text-foreground">Total:</span>
                              <span className="text-2xl font-bold text-green-600">
                                {formatRupiah(totalAmount)}
                          </span>
                            </div>
                        </div>
                      );
                    }
                  })()}
                  </div>
                </div>
              )}

              {/* Catatan dan Informasi Tambahan */}
              {txDetail.catatan && (
                <div className="space-y-4">
                  <div className="font-semibold text-lg flex items-center gap-2">
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                    </svg>
                    Catatan Transaksi
                  </div>
                  <div className="p-4 bg-muted/20 rounded-lg border">
                    <div className="text-sm text-foreground whitespace-pre-wrap">
                      {txDetail.catatan}
                    </div>
                  </div>
                </div>
              )}

              {/* Informasi Institusi */}
              <div className="p-4 bg-gradient-to-r from-blue-50 to-indigo-50 rounded-lg border border-blue-200">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 bg-blue-100 rounded-full flex items-center justify-center">
                    <svg className="w-5 h-5 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
                    </svg>
                  </div>
                  <div>
                    <div className="font-semibold text-foreground">Yayasan Pesantren Anak Yatim Al-Bisri</div>
                    <div className="text-sm text-muted-foreground">Sistem Inventaris Terintegrasi</div>
                  </div>
                </div>
              </div>
            </div>
          )}
          <DialogFooter>
            <Button variant="outline" onClick={() => setTxDetailOpen(false)}>Tutup</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Edit Transaksi Dialog (admin/testing): edit penerima & catatan */}
      <Dialog open={txEditOpen} onOpenChange={setTxEditOpen}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Edit Transaksi</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 overflow-y-auto max-h-[calc(90vh-200px)] pr-2">
            <div className="grid grid-cols-3 gap-4 text-sm text-muted-foreground">
              <div>Item: <span className="text-foreground font-medium">{txEditing?.item?.nama_barang || '-'}</span></div>
              <div>Tipe: <span className="text-foreground font-medium">{txEditing?.tipe || '-'}</span></div>
              <div>Tanggal: <span className="text-foreground font-medium">{txEditing?.tanggal ? formatDate(txEditing.tanggal) : '-'}</span></div>
            </div>
            
            <div className="space-y-2">
              <Label htmlFor="edit_jumlah">Jumlah</Label>
              <Input 
                id="edit_jumlah" 
                type="number" 
                value={txEditJumlah} 
                onChange={(e) => setTxEditJumlah(parseFloat(e.target.value) || 0)} 
              />
            </div>
            
            {/* Show breakdown form for sales transactions */}
            {txEditing?.tipe === 'Keluar' && txEditing?.harga_satuan && txEditHasBreakdown && (
              <div className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="edit_harga_dasar">Harga Dasar per Unit (Rp)</Label>
                    <Input 
                      id="edit_harga_dasar" 
                      type="number" 
                      value={txEditHargaDasar}
                      onChange={(e) => setTxEditHargaDasar(parseFloat(e.target.value) || 0)}
                      placeholder="0"
                    />
                  </div>
                  
                  <div className="space-y-2">
                    <Label htmlFor="edit_sumbangan">Sumbangan Tambahan (Rp)</Label>
                    <Input 
                      id="edit_sumbangan" 
                      type="number" 
                      value={txEditSumbangan}
                      onChange={(e) => setTxEditSumbangan(parseFloat(e.target.value) || 0)}
                      placeholder="0"
                    />
                  </div>
                </div>
                
                {/* Breakdown yang transparan */}
                <div className="p-3 bg-blue-50 rounded-lg border">
                  <div className="text-sm space-y-1">
                    <div className="flex justify-between">
                      <span>Harga Dasar:</span>
                      <span>{formatRupiah(txEditHargaDasar)} × {txEditJumlah} = {formatRupiah(txEditHargaDasar * txEditJumlah)}</span>
                    </div>
                    <div className="flex justify-between">
                      <span>Sumbangan:</span>
                      <span>{formatRupiah(txEditSumbangan)}</span>
                    </div>
                    <div className="font-semibold border-t pt-1 flex justify-between">
                      <span>Total Pemasukan:</span>
                      <span>{formatRupiah((txEditHargaDasar * txEditJumlah) + txEditSumbangan)}</span>
                    </div>
                    <div className="text-xs text-muted-foreground flex justify-between">
                      <span>Harga satuan efektif:</span>
                      <span>{formatRupiah(txEditJumlah > 0 ? ((txEditHargaDasar * txEditJumlah) + txEditSumbangan) / txEditJumlah : 0)}</span>
                    </div>
                  </div>
                </div>
              </div>
            )}
            
            <div className="space-y-2">
              <Label htmlFor="edit_recipient">Penerima</Label>
              <Input id="edit_recipient" value={txEditRecipient} onChange={(e) => setTxEditRecipient(e.target.value)} />
            </div>
            <div className="space-y-2">
              <Label htmlFor="edit_note">Catatan Tambahan</Label>
              <Textarea id="edit_note" rows={2} value={txEditNote} onChange={(e) => setTxEditNote(e.target.value)} placeholder="Catatan tambahan (opsional)" />
              <p className="text-xs text-muted-foreground">Breakdown harga akan otomatis ditambahkan ke catatan</p>
            </div>
          </div>
          <DialogFooter className="gap-2 sticky bottom-0 bg-background border-t pt-4 mt-4">
            <Button variant="outline" onClick={() => setTxEditOpen(false)} disabled={txSaving}>Batal</Button>
            <Button onClick={saveEditTx} disabled={txSaving}>{txSaving ? 'Menyimpan...' : 'Simpan Perubahan'}</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default InventarisRefactored;


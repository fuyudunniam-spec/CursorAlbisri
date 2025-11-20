import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Checkbox } from "@/components/ui/checkbox";
import { Package, Plus, Search, Filter, Download, Eye, Edit, Trash2, Calendar, MapPin, DollarSign, AlertTriangle, CheckCircle, XCircle, ShoppingCart, TrendingUp, TrendingDown, BarChart3 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

interface InventarisData {
  id: string;
  nama_barang: string;
  kategori: string;
  lokasi: string | null;
  kondisi: string | null;
  jumlah: number | null;
  satuan: string | null;
  harga_perolehan: number | null;
  supplier: string | null;
  tanggal_perolehan: string | null;
  keterangan: string | null;
  created_at: string | null;
  updated_at: string | null;
  created_by: string | null;
  updated_by: string | null;
}

interface TransaksiData {
  id: string;
  item_id: string;
  jumlah: number;
  harga?: number;
  tipe: 'Jual' | 'Distribusi';
  penerima?: string;
  tanggal: string;
  catatan?: string;
  created_at: string;
}

const formatRupiah = (amount: number) => {
  return new Intl.NumberFormat('id-ID', {
    style: 'currency',
    currency: 'IDR',
    minimumFractionDigits: 0
  }).format(amount);
};

const kondisiColors: Record<string, string> = {
  "Baik": "bg-green-500/10 text-green-500 border-green-500/20",
  "Rusak Ringan": "bg-yellow-500/10 text-yellow-500 border-yellow-500/20",
  "Rusak Berat": "bg-red-500/10 text-red-500 border-red-500/20",
  "Perlu Perbaikan": "bg-orange-500/10 text-orange-500 border-orange-500/20",
};

const tipeColors: Record<string, string> = {
  "Aset": "bg-blue-500/10 text-blue-500 border-blue-500/20",
  "Komoditas": "bg-purple-500/10 text-purple-500 border-purple-500/20",
};

const sourceColors: Record<string, string> = {
  "Donasi": "bg-green-500/10 text-green-500 border-green-500/20",
  "Manual": "bg-gray-500/10 text-gray-500 border-gray-500/20",
};

const Inventaris = () => {
  const [inventarisData, setInventarisData] = useState<InventarisData[]>([]);
  const [transaksiData, setTransaksiData] = useState<TransaksiData[]>([]);
  const [loading, setLoading] = useState(true);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [isTransaksiDialogOpen, setIsTransaksiDialogOpen] = useState(false);
  const [selectedItem, setSelectedItem] = useState<InventarisData | null>(null);
  const [selectedTransaksi, setSelectedTransaksi] = useState<TransaksiData | null>(null);
  const [searchTerm, setSearchTerm] = useState("");
  const [filterTipe, setFilterTipe] = useState<string>("all");
  const [filterKategori, setFilterKategori] = useState<string>("all");
  const [filterKondisi, setFilterKondisi] = useState<string>("all");
  const [activeTab, setActiveTab] = useState("inventaris");

  // Form state for inventaris
  const [formData, setFormData] = useState({
    tipe_item: "Aset",
    nama_barang: "",
    kategori: "",
    zona: "Gedung Putra",
    lokasi: "",
    kondisi: "Baik",
    jumlah: "",
    satuan: "",
    harga_perolehan: "",
    supplier: "",
    tanggal_perolehan: new Date().toISOString().split('T')[0],
    keterangan: ""
  });

  // Form state for transaksi
  const [transaksiForm, setTransaksiForm] = useState({
    item_id: "",
    jumlah: "",
    harga: "",
    tipe: "Distribusi" as "Jual" | "Distribusi",
    penerima: "",
    tanggal: new Date().toISOString().split('T')[0],
    catatan: ""
  });

  // Fetch data
  useEffect(() => {
    fetchInventarisData();
    fetchTransaksiData();
  }, []);

  const fetchInventarisData = async () => {
    try {
      setLoading(true);
      const { data, error } = await supabase
        .from('inventaris')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) throw error;
      setInventarisData((data || []) as InventarisData[]);
    } catch (error) {
      console.error('Error fetching inventaris data:', error);
      toast.error('Gagal memuat data inventaris');
    } finally {
      setLoading(false);
    }
  };

  const fetchTransaksiData = async () => {
    try {
      // TODO: Uncomment when transaksi_inventaris table is created
      // Run migration: supabase/migrations/20250107000000_create_transaksi_inventaris.sql
      
      setTransaksiData([]); // Temporary: set empty until table exists
      return;
      
      /* UNCOMMENT WHEN TABLE EXISTS:
      const { data, error } = await supabase
        .from('transaksi_inventaris')
        .select(`
          *,
          inventaris:nama_barang
        `)
        .order('created_at', { ascending: false });

      if (error) {
        if (error.code === 'PGRST205') {
          console.warn('Table transaksi_inventaris does not exist yet. Please run the migration.');
          setTransaksiData([]);
          return;
        }
        throw error;
      }
      setTransaksiData(data || []);
      */
    } catch (error) {
      console.error('Error fetching transaksi data:', error);
      toast.error('Gagal memuat data transaksi');
      setTransaksiData([]);
    }
  };

  // Calculate stats
  const totalItem = inventarisData.length;
  const kondisiBaik = inventarisData.filter(item => item.kondisi === "Baik").length;
  const perluPerbaikan = inventarisData.filter(item => item.kondisi === "Rusak Ringan" || item.kondisi === "Perlu Perbaikan").length;
  const rusakBerat = inventarisData.filter(item => item.kondisi === "Rusak Berat").length;
  const totalNilaiAset = inventarisData
    .filter(item => item.harga_perolehan)
    .reduce((sum, item) => sum + (item.harga_perolehan! * (item.jumlah || 1)), 0);

  // Filter data
  const filteredData = inventarisData.filter(item => {
    const matchesSearch = item.nama_barang.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         item.kategori.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         (item.lokasi && item.lokasi.toLowerCase().includes(searchTerm.toLowerCase()));
    const matchesKategori = filterKategori === "all" || item.kategori === filterKategori;
    const matchesKondisi = filterKondisi === "all" || item.kondisi === filterKondisi;
    
    return matchesSearch && matchesKategori && matchesKondisi;
  });

  // Get unique categories
  const categories = Array.from(new Set(inventarisData.map(item => item.kategori)));

  const handleSubmitInventaris = async (e: React.FormEvent) => {
    e.preventDefault();
    
    try {
      const submitData = {
        tipe_item: formData.tipe_item || "Aset",
        nama_barang: formData.nama_barang,
        zona: formData.zona || "Gedung Putra",
        kategori: formData.kategori,
        lokasi: formData.lokasi || null,
        kondisi: formData.kondisi || null,
        jumlah: formData.jumlah ? parseInt(formData.jumlah) : null,
        satuan: formData.satuan || null,
        harga_perolehan: formData.harga_perolehan ? parseFloat(formData.harga_perolehan) : null,
        supplier: formData.supplier || null,
        tanggal_perolehan: formData.tanggal_perolehan || null,
        keterangan: formData.keterangan || null,
        updated_at: new Date().toISOString(),
        updated_by: (await supabase.auth.getUser()).data.user?.id
      };

      if (selectedItem) {
        // Update existing item
        const { error } = await supabase
          .from('inventaris')
          .update(submitData)
          .eq('id', selectedItem.id);

        if (error) throw error;
        toast.success('Inventaris berhasil diupdate!');
      } else {
        // Insert new item
        const { error } = await supabase
          .from('inventaris')
          .insert([{
            ...submitData,
            created_at: new Date().toISOString(),
            created_by: (await supabase.auth.getUser()).data.user?.id
          }]);

        if (error) throw error;
        toast.success('Inventaris berhasil ditambahkan!');
      }

      setIsDialogOpen(false);
      resetForm();
      fetchInventarisData();

    } catch (error) {
      console.error('Error submitting inventaris:', error);
      toast.error('Gagal menyimpan inventaris');
    }
  };

  const handleSubmitTransaksi = async (e: React.FormEvent) => {
    e.preventDefault();
    
    // TODO: Enable when transaksi_inventaris table is created
    toast.error('Fitur transaksi belum tersedia. Jalankan migration database terlebih dahulu.');
    return;
    
    /* UNCOMMENT WHEN TABLE EXISTS:
    try {
      const submitData = {
        ...transaksiForm,
        jumlah: parseInt(transaksiForm.jumlah),
        harga_satuan: transaksiForm.harga ? parseFloat(transaksiForm.harga) : null,
        created_at: new Date().toISOString(),
        created_by: (await supabase.auth.getUser()).data.user?.id
      };

      if (selectedTransaksi) {
        const { error } = await supabase
          .from('transaksi_inventaris')
          .update(submitData)
          .eq('id', selectedTransaksi.id);

        if (error) throw error;
        toast.success('Transaksi berhasil diupdate!');
      } else {
        const { error } = await supabase
          .from('transaksi_inventaris')
          .insert([submitData]);

        if (error) throw error;
        toast.success('Transaksi berhasil dicatat!');

        // Update stock
        const item = inventarisData.find(i => i.id === transaksiForm.item_id);
        if (item) {
          const newJumlah = (item.jumlah || 0) - parseInt(transaksiForm.jumlah);
          await supabase
            .from('inventaris')
            .update({ jumlah: Math.max(0, newJumlah) })
            .eq('id', transaksiForm.item_id);
        }
      }

      setIsTransaksiDialogOpen(false);
      resetTransaksiForm();
      fetchInventarisData();
      fetchTransaksiData();
    } catch (error) {
      console.error('Error submitting transaksi:', error);
      toast.error('Gagal menyimpan transaksi');
    }
    */
  };

  const resetForm = () => {
    setFormData({
      tipe_item: "Aset",
      nama_barang: "",
      kategori: "",
      zona: "Gedung Putra",
      lokasi: "",
      kondisi: "Baik",
      jumlah: "",
      satuan: "",
      harga_perolehan: "",
      supplier: "",
      tanggal_perolehan: new Date().toISOString().split('T')[0],
      keterangan: ""
    });
    setSelectedItem(null);
  };

  const resetTransaksiForm = () => {
    setTransaksiForm({
      item_id: "",
      jumlah: "",
      harga: "",
      tipe: "Distribusi",
      penerima: "",
      tanggal: new Date().toISOString().split('T')[0],
      catatan: ""
    });
    setSelectedTransaksi(null);
  };

  const handleEdit = (item: InventarisData) => {
    setSelectedItem(item);
    setFormData({
      tipe_item: (item as any).tipe_item || "Aset",
      nama_barang: item.nama_barang,
      kategori: item.kategori,
      zona: (item as any).zona || "Gedung Putra",
      lokasi: item.lokasi || "",
      kondisi: item.kondisi || "Baik",
      jumlah: item.jumlah?.toString() || "",
      satuan: item.satuan || "",
      harga_perolehan: item.harga_perolehan?.toString() || "",
      supplier: item.supplier || "",
      tanggal_perolehan: item.tanggal_perolehan || new Date().toISOString().split('T')[0],
      keterangan: item.keterangan || ""
    });
    setIsDialogOpen(true);
  };

  const handleDelete = async (id: string) => {
    if (confirm('Apakah Anda yakin ingin menghapus item ini?')) {
      try {
        const { error } = await supabase
          .from('inventaris')
          .delete()
          .eq('id', id);

        if (error) throw error;

        toast.success('Item berhasil dihapus!');
        fetchInventarisData();
      } catch (error) {
        console.error('Error deleting item:', error);
        toast.error('Gagal menghapus item');
      }
    }
  };

  const handleAddTransaksi = (item: InventarisData) => {
    setTransaksiForm({
      ...transaksiForm,
      item_id: item.id
    });
    setIsTransaksiDialogOpen(true);
  };

  // Check for expired items - DISABLED (fields not in current schema)
  // TODO: Add perishable & tanggal_kedaluwarsa fields if needed
  const expiredItems: InventarisData[] = [];

  return (
    <div className="p-6 lg:p-8 space-y-6 animate-fade-in">
      {/* Header */}
      <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold text-foreground mb-2">Inventaris</h1>
          <p className="text-muted-foreground">Kelola inventaris pesantren</p>
        </div>
        <div className="flex gap-2">
          <Dialog open={isTransaksiDialogOpen} onOpenChange={setIsTransaksiDialogOpen}>
            <DialogTrigger asChild>
              <Button variant="outline" className="shadow-medium">
                <ShoppingCart className="w-4 h-4 mr-2" />
                Transaksi
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-2xl">
              <DialogHeader>
                <DialogTitle>
                  {selectedTransaksi ? 'Edit Transaksi' : 'Catat Transaksi Baru'}
                </DialogTitle>
              </DialogHeader>
              <form onSubmit={handleSubmitTransaksi} className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="item_id">Item *</Label>
                    <Select value={transaksiForm.item_id} onValueChange={(value) => setTransaksiForm({...transaksiForm, item_id: value})}>
                      <SelectTrigger>
                        <SelectValue placeholder="Pilih item" />
                      </SelectTrigger>
                      <SelectContent>
                        {inventarisData.map((item) => (
                          <SelectItem key={item.id} value={item.id}>
                            {item.nama_barang} (Stok: {item.jumlah || 0})
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="jumlah">Jumlah *</Label>
                    <Input
                      id="jumlah"
                      type="number"
                      value={transaksiForm.jumlah}
                      onChange={(e) => setTransaksiForm({...transaksiForm, jumlah: e.target.value})}
                      required
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="harga">Harga (Rp)</Label>
                    <Input
                      id="harga"
                      type="number"
                      value={transaksiForm.harga}
                      onChange={(e) => setTransaksiForm({...transaksiForm, harga: e.target.value})}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="tipe">Tipe *</Label>
                    <Select value={transaksiForm.tipe} onValueChange={(value: "Jual" | "Distribusi") => setTransaksiForm({...transaksiForm, tipe: value})}>
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="Jual">Jual</SelectItem>
                        <SelectItem value="Distribusi">Distribusi</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="penerima">Penerima</Label>
                    <Input
                      id="penerima"
                      value={transaksiForm.penerima}
                      onChange={(e) => setTransaksiForm({...transaksiForm, penerima: e.target.value})}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="tanggal">Tanggal *</Label>
                    <Input
                      id="tanggal"
                      type="date"
                      value={transaksiForm.tanggal}
                      onChange={(e) => setTransaksiForm({...transaksiForm, tanggal: e.target.value})}
                      required
                    />
                  </div>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="catatan">Catatan</Label>
                  <Textarea
                    id="catatan"
                    value={transaksiForm.catatan}
                    onChange={(e) => setTransaksiForm({...transaksiForm, catatan: e.target.value})}
                  />
                </div>
                <div className="flex gap-2 pt-4">
                  <Button type="submit" className="flex-1">
                    {selectedTransaksi ? 'Update Transaksi' : 'Simpan Transaksi'}
                  </Button>
                  <Button type="button" variant="outline" onClick={() => {
                    setIsTransaksiDialogOpen(false);
                    setSelectedTransaksi(null);
                    resetTransaksiForm();
                  }}>
                    Batal
                  </Button>
                </div>
              </form>
            </DialogContent>
          </Dialog>
          
          <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
            <DialogTrigger asChild>
              <Button className="bg-primary hover:bg-primary/90 text-primary-foreground shadow-medium">
                <Plus className="w-4 h-4 mr-2" />
                Tambah Barang
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
              <DialogHeader>
                <DialogTitle>
                  {selectedItem ? 'Edit Inventaris' : 'Tambah Barang Baru'}
                </DialogTitle>
              </DialogHeader>
              <form onSubmit={handleSubmitInventaris} className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="nama_barang">Nama Barang *</Label>
                    <Input
                      id="nama_barang"
                      value={formData.nama_barang}
                      onChange={(e) => setFormData({...formData, nama_barang: e.target.value})}
                      required
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="kategori">Kategori *</Label>
                    <Input
                      id="kategori"
                      value={formData.kategori}
                      onChange={(e) => setFormData({...formData, kategori: e.target.value})}
                      required
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="lokasi">Lokasi</Label>
                    <Input
                      id="lokasi"
                      value={formData.lokasi}
                      onChange={(e) => setFormData({...formData, lokasi: e.target.value})}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="kondisi">Kondisi</Label>
                    <Select value={formData.kondisi} onValueChange={(value) => setFormData({...formData, kondisi: value})}>
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="Baik">Baik</SelectItem>
                        <SelectItem value="Rusak Ringan">Rusak Ringan</SelectItem>
                        <SelectItem value="Perlu Perbaikan">Perlu Perbaikan</SelectItem>
                        <SelectItem value="Rusak Berat">Rusak Berat</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="jumlah">Jumlah</Label>
                    <Input
                      id="jumlah"
                      type="number"
                      value={formData.jumlah}
                      onChange={(e) => setFormData({...formData, jumlah: e.target.value})}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="satuan">Satuan</Label>
                    <Input
                      id="satuan"
                      value={formData.satuan}
                      onChange={(e) => setFormData({...formData, satuan: e.target.value})}
                      placeholder="pcs, kg, liter, dll"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="harga_perolehan">Harga Perolehan (Rp)</Label>
                    <Input
                      id="harga_perolehan"
                      type="number"
                      value={formData.harga_perolehan}
                      onChange={(e) => setFormData({...formData, harga_perolehan: e.target.value})}
                      placeholder="0"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="supplier">Supplier</Label>
                    <Input
                      id="supplier"
                      value={formData.supplier}
                      onChange={(e) => setFormData({...formData, supplier: e.target.value})}
                      placeholder="Nama supplier (opsional)"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="tanggal_perolehan">Tanggal Perolehan</Label>
                    <Input
                      id="tanggal_perolehan"
                      type="date"
                      value={formData.tanggal_perolehan}
                      onChange={(e) => setFormData({...formData, tanggal_perolehan: e.target.value})}
                    />
                  </div>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="keterangan">Keterangan</Label>
                  <Textarea
                    id="keterangan"
                    value={formData.keterangan}
                    onChange={(e) => setFormData({...formData, keterangan: e.target.value})}
                  />
                </div>
                <div className="flex gap-2 pt-4">
                  <Button type="submit" className="flex-1">
                    {selectedItem ? 'Update Inventaris' : 'Simpan Inventaris'}
                  </Button>
                  <Button type="button" variant="outline" onClick={() => {
                    setIsDialogOpen(false);
                    setSelectedItem(null);
                    resetForm();
                  }}>
                    Batal
                  </Button>
                </div>
              </form>
            </DialogContent>
          </Dialog>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card className="border-border bg-gradient-card">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Total Item</CardTitle>
            <Package className="w-4 h-4 text-primary" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-foreground">{totalItem}</div>
            <p className="text-xs text-muted-foreground mt-1">Semua kategori</p>
          </CardContent>
        </Card>
        <Card className="border-border bg-gradient-card">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Kondisi Baik</CardTitle>
            <CheckCircle className="w-4 h-4 text-green-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-foreground">{kondisiBaik}</div>
            <p className="text-xs text-muted-foreground mt-1">{((kondisiBaik/totalItem)*100).toFixed(1)}% dari total</p>
          </CardContent>
        </Card>
        <Card className="border-border bg-gradient-card">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Perlu Perbaikan</CardTitle>
            <AlertTriangle className="w-4 h-4 text-orange-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-foreground">{perluPerbaikan}</div>
            <p className="text-xs text-muted-foreground mt-1">Rusak ringan/perbaikan</p>
          </CardContent>
        </Card>
        <Card className="border-border bg-gradient-card">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Total Nilai Aset</CardTitle>
            <DollarSign className="w-4 h-4 text-primary" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-foreground">{formatRupiah(totalNilaiAset)}</div>
            <p className="text-xs text-muted-foreground mt-1">Nilai aset</p>
          </CardContent>
        </Card>
      </div>

      {/* Expired Items Alert */}
      {expiredItems.length > 0 && (
        <Card className="border-red-200 bg-red-50">
          <CardContent className="pt-6">
            <div className="flex items-center gap-2">
              <XCircle className="w-5 h-5 text-red-500" />
              <div>
                <h4 className="font-semibold text-red-800">Ada {expiredItems.length} item yang sudah kedaluwarsa</h4>
                <p className="text-sm text-red-600">Periksa item-item berikut: {expiredItems.map(item => item.nama_barang).join(', ')}</p>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Tabs */}
      <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-4">
        <TabsList className="grid w-full grid-cols-2">
          <TabsTrigger value="inventaris">Inventaris</TabsTrigger>
          <TabsTrigger value="transaksi">Transaksi</TabsTrigger>
        </TabsList>

        <TabsContent value="inventaris" className="space-y-4">
          {/* Filters and Search */}
          <Card className="border-border bg-gradient-card">
            <CardHeader>
              <CardTitle className="text-foreground">Filter & Pencarian</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex flex-col lg:flex-row gap-4">
                <div className="flex-1">
                  <div className="relative">
                    <Search className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                    <Input
                      placeholder="Cari nama barang atau kategori..."
                      value={searchTerm}
                      onChange={(e) => setSearchTerm(e.target.value)}
                      className="pl-10"
                    />
                  </div>
                </div>
                <div className="flex gap-2">
                  <Select value={filterTipe} onValueChange={setFilterTipe}>
                    <SelectTrigger className="w-[140px]">
                      <SelectValue placeholder="Tipe" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">Semua Tipe</SelectItem>
                      <SelectItem value="Aset">Aset</SelectItem>
                      <SelectItem value="Komoditas">Komoditas</SelectItem>
                    </SelectContent>
                  </Select>
                  <Select value={filterKategori} onValueChange={setFilterKategori}>
                    <SelectTrigger className="w-[140px]">
                      <SelectValue placeholder="Kategori" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">Semua Kategori</SelectItem>
                      {categories.map((cat) => (
                        <SelectItem key={cat} value={cat}>{cat}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <Select value={filterKondisi} onValueChange={setFilterKondisi}>
                    <SelectTrigger className="w-[140px]">
                      <SelectValue placeholder="Kondisi" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">Semua Kondisi</SelectItem>
                      <SelectItem value="Baik">Baik</SelectItem>
                      <SelectItem value="Rusak Ringan">Rusak Ringan</SelectItem>
                      <SelectItem value="Perlu Perbaikan">Perlu Perbaikan</SelectItem>
                      <SelectItem value="Rusak Berat">Rusak Berat</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Items List */}
          <Card className="border-border bg-gradient-card shadow-medium">
            <CardHeader>
              <CardTitle className="text-foreground">Daftar Inventaris ({filteredData.length})</CardTitle>
            </CardHeader>
            <CardContent>
              {loading ? (
                <div className="text-center py-8">
                  <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto"></div>
                  <p className="text-muted-foreground mt-2">Memuat data...</p>
                </div>
              ) : (
                <div className="space-y-4">
                  {filteredData.length === 0 ? (
                    <div className="text-center py-8">
                      <Package className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
                      <p className="text-muted-foreground">Belum ada data inventaris</p>
                    </div>
                  ) : (
                    filteredData.map((item) => (
                      <div key={item.id} className="flex items-center justify-between p-4 rounded-lg border border-border bg-background hover:shadow-soft transition-all">
                        <div className="flex items-start gap-4">
                          <div className="p-3 bg-primary/10 rounded-lg">
                            <Package className="w-5 h-5 text-primary" />
                          </div>
                          <div className="flex-1">
                            <h4 className="font-semibold text-foreground">{item.nama_barang}</h4>
                            <div className="flex items-center gap-4 text-sm text-muted-foreground mt-1">
                              <span className="flex items-center gap-1">
                                <MapPin className="w-3 h-3" />
                                {item.lokasi || 'Belum ditentukan'}
                              </span>
                              <span className="flex items-center gap-1">
                                <Calendar className="w-3 h-3" />
                                {new Date(item.created_at).toLocaleDateString('id-ID')}
                              </span>
                            </div>
                            <div className="flex items-center gap-2 mt-2">
                              <Badge variant="outline">
                                {item.kategori}
                              </Badge>
                              {item.supplier && (
                                <Badge variant="outline" className="bg-blue-50">
                                  {item.supplier}
                                </Badge>
                              )}
                            </div>
                          </div>
                        </div>
                        <div className="text-right space-y-2">
                          <div className="font-bold text-lg text-foreground">
                            {item.jumlah || 0} {item.satuan || 'unit'}
                          </div>
                          {item.harga_perolehan && (
                            <div className="text-sm text-muted-foreground">
                              {formatRupiah(item.harga_perolehan)} / {item.satuan || 'unit'}
                            </div>
                          )}
                          <div className="flex items-center gap-2">
                            <Badge className={kondisiColors[item.kondisi || 'Baik']}>
                              {item.kondisi || 'Baik'}
                            </Badge>
                          </div>
                          <div className="flex items-center gap-1">
                            <Button
                              size="sm"
                              variant="ghost"
                              onClick={() => handleAddTransaksi(item)}
                            >
                              <ShoppingCart className="w-3 h-3" />
                            </Button>
                            <Button
                              size="sm"
                              variant="ghost"
                              onClick={() => handleEdit(item)}
                            >
                              <Edit className="w-3 h-3" />
                            </Button>
                            <Button
                              size="sm"
                              variant="ghost"
                              onClick={() => handleDelete(item.id)}
                            >
                              <Trash2 className="w-3 h-3" />
                            </Button>
                          </div>
                        </div>
                      </div>
                    ))
                  )}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="transaksi" className="space-y-4">
          {/* Transaksi List */}
          <Card className="border-border bg-gradient-card shadow-medium">
            <CardHeader>
              <CardTitle className="text-foreground">Daftar Transaksi ({transaksiData.length})</CardTitle>
            </CardHeader>
            <CardContent>
              {loading ? (
                <div className="text-center py-8">
                  <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto"></div>
                  <p className="text-muted-foreground mt-2">Memuat data...</p>
                </div>
              ) : (
                <div className="space-y-4">
                  {transaksiData.length === 0 ? (
                    <div className="text-center py-8">
                      <ShoppingCart className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
                      <p className="text-muted-foreground">Belum ada data transaksi</p>
                    </div>
                  ) : (
                    transaksiData.map((transaksi) => {
                      const item = inventarisData.find(i => i.id === transaksi.item_id);
                      return (
                        <div key={transaksi.id} className="flex items-center justify-between p-4 rounded-lg border border-border bg-background hover:shadow-soft transition-all">
                          <div className="flex items-start gap-4">
                            <div className="p-3 bg-accent/10 rounded-lg">
                              {transaksi.tipe === "Jual" ? (
                                <TrendingUp className="w-5 h-5 text-accent" />
                              ) : (
                                <TrendingDown className="w-5 h-5 text-accent" />
                              )}
                            </div>
                            <div className="flex-1">
                              <h4 className="font-semibold text-foreground">{item?.nama_barang || 'Item tidak ditemukan'}</h4>
                              <div className="flex items-center gap-4 text-sm text-muted-foreground mt-1">
                                <span className="flex items-center gap-1">
                                  <Calendar className="w-3 h-3" />
                                  {new Date(transaksi.tanggal).toLocaleDateString('id-ID')}
                                </span>
                                {transaksi.penerima && (
                                  <span>Penerima: {transaksi.penerima}</span>
                                )}
                              </div>
                              {transaksi.catatan && (
                                <p className="text-sm text-muted-foreground mt-1 italic">"{transaksi.catatan}"</p>
                              )}
                            </div>
                          </div>
                          <div className="text-right space-y-2">
                            <div className="font-bold text-lg text-foreground">
                              {transaksi.jumlah} {item?.satuan || 'unit'}
                            </div>
                            {transaksi.harga && (
                              <div className="text-sm text-muted-foreground">
                                {formatRupiah(transaksi.harga)}
                              </div>
                            )}
                            <Badge className={transaksi.tipe === "Jual" ? "bg-green-500/10 text-green-500 border-green-500/20" : "bg-blue-500/10 text-blue-500 border-blue-500/20"}>
                              {transaksi.tipe}
                            </Badge>
                          </div>
                        </div>
                      );
                    })
                  )}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
};

export default Inventaris;

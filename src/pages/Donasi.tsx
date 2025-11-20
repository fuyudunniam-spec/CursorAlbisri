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
import { Heart, Users, TrendingUp, Plus, Search, Filter, Download, Eye, Edit, Trash2, Calendar, MapPin, Phone, Mail, Gift, DollarSign, PackageOpen } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

interface DonasiData {
  id: string;
  nama_donatur: string;
  email_donatur?: string;
  no_telepon?: string;
  jenis_donasi: 'Uang' | 'Barang';
  jumlah?: number;
  deskripsi?: string;
  hajat_doa?: string;
  tanggal_donasi: string;
  tanggal_diterima?: string;
  status: string;
  created_at: string;
}

const formatRupiah = (amount: number) => {
  return new Intl.NumberFormat('id-ID', {
    style: 'currency',
    currency: 'IDR',
    minimumFractionDigits: 0
  }).format(amount);
};

const kategoriColors: Record<string, string> = {
  "Umum": "bg-primary/10 text-primary border-primary/20",
  "Pendidikan": "bg-accent/10 text-accent border-accent/20",
  "Operasional": "bg-blue-500/10 text-blue-500 border-blue-500/20",
  "Infrastruktur": "bg-purple-500/10 text-purple-500 border-purple-500/20",
  "Uang": "bg-green-500/10 text-green-500 border-green-500/20",
  "Barang": "bg-orange-500/10 text-orange-500 border-orange-500/20",
};

const statusColors: Record<string, string> = {
  "Diterima": "bg-green-500/10 text-green-500 border-green-500/20",
  "Pending": "bg-yellow-500/10 text-yellow-500 border-yellow-500/20",
  "Ditolak": "bg-red-500/10 text-red-500 border-red-500/20",
};

const Donasi = () => {
  const [donasiData, setDonasiData] = useState<DonasiData[]>([]);
  const [loading, setLoading] = useState(true);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [selectedDonasi, setSelectedDonasi] = useState<DonasiData | null>(null);
  const [searchTerm, setSearchTerm] = useState("");
  const [filterJenis, setFilterJenis] = useState<string>("all");
  const [filterStatus, setFilterStatus] = useState<string>("all");

  // Inventaris linkage (untuk donasi Barang)
  const [inventarisItems, setInventarisItems] = useState<Array<{ id: string; nama_barang: string; satuan?: string | null }>>([]);

  // Form state
  const [formData, setFormData] = useState({
    nama_donatur: "",
    email_donatur: "",
    no_telepon: "",
    jenis_donasi: "Uang" as "Uang" | "Barang",
    jumlah: "",
    deskripsi: "",
    hajat_doa: "",
    tanggal_donasi: new Date().toISOString().split('T')[0],
    tanggal_diterima: new Date().toISOString().split('T')[0],
    status: "Diterima"
  });

  // Fetch donasi data
  useEffect(() => {
    fetchDonasiData();
    (async () => {
      try {
        const { data } = await supabase.from('inventaris').select('id,nama_barang,satuan').order('nama_barang', { ascending: true });
        setInventarisItems((data || []) as any);
      } catch {}
    })();
  }, []);

  const fetchDonasiData = async () => {
    try {
      setLoading(true);
      const { data, error } = await supabase
        .from('donasi')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) throw error;
      setDonasiData((data || []) as DonasiData[]);
    } catch (error) {
      console.error('Error fetching donasi data:', error);
      toast.error('Gagal memuat data donasi');
    } finally {
      setLoading(false);
    }
  };

  // Calculate stats
  const totalDonasi = donasiData.reduce((sum, item) => sum + (item.jumlah || 0), 0);
  const bulanIni = new Date().getMonth();
  const tahunIni = new Date().getFullYear();
  const donasiBulanIni = donasiData
    .filter(item => {
      const itemDate = new Date(item.tanggal_donasi);
      return itemDate.getMonth() === bulanIni && itemDate.getFullYear() === tahunIni;
    })
    .reduce((sum, item) => sum + (item.jumlah || 0), 0);
  
  const uniqueDonatur = new Set(donasiData.map(item => item.nama_donatur)).size;
  const rataRata = uniqueDonatur > 0 ? totalDonasi / uniqueDonatur : 0;

  // Filter data
  const filteredData = donasiData.filter(item => {
    const matchesSearch = item.nama_donatur.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         item.email_donatur?.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesJenis = filterJenis === "all" || item.jenis_donasi === filterJenis;
    const matchesStatus = filterStatus === "all" || item.status === filterStatus;
    
    return matchesSearch && matchesJenis && matchesStatus;
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    try {
      // Only send fields that exist in the donasi table
      const submitData = {
        nama_donatur: formData.nama_donatur,
        email_donatur: formData.email_donatur || null,
        no_telepon: formData.no_telepon || null,
        jenis_donasi: formData.jenis_donasi,
        jumlah: formData.jenis_donasi === "Uang" ? parseFloat(formData.jumlah) : null,
        deskripsi: formData.deskripsi || null,
        hajat_doa: formData.hajat_doa || null,
        tanggal_donasi: formData.tanggal_donasi,
        tanggal_diterima: formData.tanggal_diterima || null,
        status: formData.status,
        created_at: new Date().toISOString(),
        created_by: (await supabase.auth.getUser()).data.user?.id
      };

      const { error } = await supabase
        .from('donasi')
        .insert([submitData]);

      if (error) throw error;

      toast.success('Donasi berhasil dicatat!');
      setIsDialogOpen(false);
      resetForm();
      fetchDonasiData();

      // FIXED: Removed auto-insert to keuangan to prevent double entry
      // Donasi uang hanya disimpan di tabel donasi
      // User bisa manual input ke keuangan jika diperlukan

      // Auto-create transaksi Masuk ke inventaris jika donasi Barang terhubung ke item
      if (formData.jenis_donasi === 'Barang' && linkBarang.active && linkBarang.item_id && linkBarang.jumlah_barang > 0) {
        try {
          const payload: any = {
            item_id: linkBarang.item_id,
            tipe: 'Masuk',
            jumlah: Math.max(1, Math.floor(linkBarang.jumlah_barang || 0)),
            tanggal: formData.tanggal_diterima || formData.tanggal_donasi,
            catatan: `Donasi dari ${formData.nama_donatur}`,
            penerima: null,
          };
          // Optional expiry → create batch on receive_entries jika ada tabelnya
          if (linkBarang.expiry) {
            try {
              const { data: batchIns, error: be } = await (supabase as any)
                .from('receive_entries')
                .insert([{ item_id: linkBarang.item_id, expiry_date: linkBarang.expiry, qty: payload.jumlah }])
                .select('id')
                .single();
              if (!be && batchIns?.id) payload.batch_id = batchIns.id;
            } catch {}
          }
          const { error: te } = await supabase.from('transaksi_inventaris').insert([payload]);
          if (te) throw te;
          toast.success('Transaksi inventaris (Masuk) dibuat dari donasi barang');
        } catch {
          toast.error('Gagal membuat transaksi inventaris dari donasi barang');
        }
      }

    } catch (error) {
      console.error('Error submitting donasi:', error);
      toast.error('Gagal mencatat donasi');
    }
  };

  const resetForm = () => {
    setFormData({
      nama_donatur: "",
      email_donatur: "",
      no_telepon: "",
      jenis_donasi: "Uang",
      jumlah: "",
      deskripsi: "",
      hajat_doa: "",
      tanggal_donasi: new Date().toISOString().split('T')[0],
      tanggal_diterima: new Date().toISOString().split('T')[0],
      status: "Diterima"
    });
    setLinkBarang({ active: false, item_id: '', jumlah_barang: 0, expiry: '' });
  };

  // Link to Inventaris state
  const [linkBarang, setLinkBarang] = useState<{ active: boolean; item_id: string; jumlah_barang: number; expiry: string }>({ active: false, item_id: '', jumlah_barang: 0, expiry: '' });

  const handleEdit = (donasi: DonasiData) => {
    setSelectedDonasi(donasi);
    setFormData({
      nama_donatur: donasi.nama_donatur,
      email_donatur: donasi.email_donatur || "",
      no_telepon: donasi.no_telepon || "",
      jenis_donasi: donasi.jenis_donasi,
      jumlah: donasi.jumlah?.toString() || "",
      deskripsi: donasi.deskripsi || "",
      hajat_doa: donasi.hajat_doa || "",
      tanggal_donasi: donasi.tanggal_donasi,
      tanggal_diterima: donasi.tanggal_diterima || "",
      status: donasi.status
    });
    setIsDialogOpen(true);
  };

  const handleDelete = async (id: string) => {
    if (confirm('Apakah Anda yakin ingin menghapus donasi ini?')) {
      try {
        const { error } = await supabase
          .from('donasi')
          .delete()
          .eq('id', id);

        if (error) throw error;

        toast.success('Donasi berhasil dihapus!');
        fetchDonasiData();
      } catch (error) {
        console.error('Error deleting donasi:', error);
        toast.error('Gagal menghapus donasi');
      }
    }
  };

  return (
    <div className="p-6 lg:p-8 space-y-6 animate-fade-in">
      {/* Header */}
      <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold text-foreground mb-2">Donasi</h1>
          <p className="text-muted-foreground">Kelola donasi untuk pesantren</p>
        </div>
        <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
          <DialogTrigger asChild>
            <Button className="bg-primary hover:bg-primary/90 text-primary-foreground shadow-medium">
              <Plus className="w-4 h-4 mr-2" />
              Catat Donasi
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>
                {selectedDonasi ? 'Edit Donasi' : 'Catat Donasi Baru'}
              </DialogTitle>
            </DialogHeader>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="nama_donatur">Nama Donatur *</Label>
                  <Input
                    id="nama_donatur"
                    value={formData.nama_donatur}
                    onChange={(e) => setFormData({...formData, nama_donatur: e.target.value})}
                    required
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="email_donatur">Email Donatur</Label>
                  <Input
                    id="email_donatur"
                    type="email"
                    value={formData.email_donatur}
                    onChange={(e) => setFormData({...formData, email_donatur: e.target.value})}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="no_telepon">No. Telepon</Label>
                  <Input
                    id="no_telepon"
                    value={formData.no_telepon}
                    onChange={(e) => setFormData({...formData, no_telepon: e.target.value})}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="jenis_donasi">Jenis Donasi *</Label>
                  <Select value={formData.jenis_donasi} onValueChange={(value: "Uang" | "Barang") => setFormData({...formData, jenis_donasi: value})}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="Uang">Uang</SelectItem>
                      <SelectItem value="Barang">Barang</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                {formData.jenis_donasi === "Uang" && (
                  <div className="space-y-2">
                    <Label htmlFor="jumlah">Jumlah (Rp) *</Label>
                    <Input
                      id="jumlah"
                      type="number"
                      value={formData.jumlah}
                      onChange={(e) => setFormData({...formData, jumlah: e.target.value})}
                      required
                    />
                  </div>
                )}
                {formData.jenis_donasi === "Barang" && (
                  <div className="space-y-2">
                    <Label htmlFor="deskripsi">Deskripsi Barang *</Label>
                    <Textarea
                      id="deskripsi"
                      value={formData.deskripsi}
                      onChange={(e) => setFormData({...formData, deskripsi: e.target.value})}
                      required
                    />
                    {/* Link ke inventaris (opsional) */}
                    <div className="mt-2 p-3 border rounded-md">
                      <div className="flex items-center justify-between">
                        <div className="text-sm font-medium">Hubungkan ke Inventaris</div>
                        <Button type="button" size="sm" variant={linkBarang.active ? 'secondary' : 'outline'} onClick={() => setLinkBarang({ ...linkBarang, active: !linkBarang.active })}>
                          <PackageOpen className="w-4 h-4 mr-1" /> {linkBarang.active ? 'Aktif' : 'Nonaktif'}
                        </Button>
                      </div>
                      {linkBarang.active && (
                        <div className="grid grid-cols-1 md:grid-cols-3 gap-3 mt-3">
                          <div className="space-y-1 md:col-span-2">
                            <Label>Item Inventaris</Label>
                            <Select value={linkBarang.item_id} onValueChange={(v) => setLinkBarang({ ...linkBarang, item_id: v })}>
                              <SelectTrigger>
                                <SelectValue placeholder="Pilih item" />
                              </SelectTrigger>
                              <SelectContent>
                                {inventarisItems.map(it => (
                                  <SelectItem key={it.id} value={it.id}>{it.nama_barang}</SelectItem>
                                ))}
                              </SelectContent>
                            </Select>
                          </div>
                          <div className="space-y-1">
                            <Label>Jumlah</Label>
                            <Input type="number" value={linkBarang.jumlah_barang} onChange={(e) => setLinkBarang({ ...linkBarang, jumlah_barang: parseInt(e.target.value || '0', 10) })} />
                          </div>
                          <div className="space-y-1 md:col-span-1">
                            <Label>Expiry (opsional)</Label>
                            <Input type="date" value={linkBarang.expiry} onChange={(e) => setLinkBarang({ ...linkBarang, expiry: e.target.value })} />
                          </div>
                        </div>
                      )}
                    </div>
                  </div>
                )}
                <div className="space-y-2">
                  <Label htmlFor="hajat_doa">Hajat/Doa</Label>
                  <Textarea
                    id="hajat_doa"
                    value={formData.hajat_doa}
                    onChange={(e) => setFormData({...formData, hajat_doa: e.target.value})}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="tanggal_donasi">Tanggal Donasi *</Label>
                  <Input
                    id="tanggal_donasi"
                    type="date"
                    value={formData.tanggal_donasi}
                    onChange={(e) => setFormData({...formData, tanggal_donasi: e.target.value})}
                    required
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="tanggal_diterima">Tanggal Diterima</Label>
                  <Input
                    id="tanggal_diterima"
                    type="date"
                    value={formData.tanggal_diterima}
                    onChange={(e) => setFormData({...formData, tanggal_diterima: e.target.value})}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="status">Status</Label>
                  <Select value={formData.status} onValueChange={(value) => setFormData({...formData, status: value})}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="Diterima">Diterima</SelectItem>
                      <SelectItem value="Pending">Pending</SelectItem>
                      <SelectItem value="Ditolak">Ditolak</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
              <div className="flex gap-2 pt-4">
                <Button type="submit" className="flex-1">
                  {selectedDonasi ? 'Update Donasi' : 'Simpan Donasi'}
                </Button>
                <Button type="button" variant="outline" onClick={() => {
                  setIsDialogOpen(false);
                  setSelectedDonasi(null);
                  resetForm();
                }}>
                  Batal
                </Button>
              </div>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card className="border-border bg-gradient-card">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Total Donasi</CardTitle>
            <Heart className="w-4 h-4 text-primary" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-foreground">{formatRupiah(totalDonasi)}</div>
            <p className="text-xs text-muted-foreground mt-1">Semua waktu</p>
          </CardContent>
        </Card>
        <Card className="border-border bg-gradient-card">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Bulan Ini</CardTitle>
            <TrendingUp className="w-4 h-4 text-accent" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-foreground">{formatRupiah(donasiBulanIni)}</div>
            <p className="text-xs text-muted-foreground mt-1">Januari 2025</p>
          </CardContent>
        </Card>
        <Card className="border-border bg-gradient-card">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Total Donatur</CardTitle>
            <Users className="w-4 h-4 text-primary" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-foreground">{uniqueDonatur}</div>
            <p className="text-xs text-muted-foreground mt-1">Unik</p>
          </CardContent>
        </Card>
        <Card className="border-border bg-gradient-card">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Rata-rata</CardTitle>
            <Heart className="w-4 h-4 text-accent" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-foreground">{formatRupiah(rataRata)}</div>
            <p className="text-xs text-muted-foreground mt-1">Per donatur</p>
          </CardContent>
        </Card>
      </div>

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
                  placeholder="Cari nama donatur atau email..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-10"
                />
              </div>
            </div>
            <div className="flex gap-2">
              <Select value={filterJenis} onValueChange={setFilterJenis}>
                <SelectTrigger className="w-[140px]">
                  <SelectValue placeholder="Jenis" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Semua Jenis</SelectItem>
                  <SelectItem value="Uang">Uang</SelectItem>
                  <SelectItem value="Barang">Barang</SelectItem>
                </SelectContent>
              </Select>
              <Select value={filterStatus} onValueChange={setFilterStatus}>
                <SelectTrigger className="w-[140px]">
                  <SelectValue placeholder="Status" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Semua Status</SelectItem>
                  <SelectItem value="Diterima">Diterima</SelectItem>
                  <SelectItem value="Pending">Pending</SelectItem>
                  <SelectItem value="Ditolak">Ditolak</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Donations List */}
      <Card className="border-border bg-gradient-card shadow-medium">
        <CardHeader>
          <CardTitle className="text-foreground">Daftar Donasi ({filteredData.length})</CardTitle>
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
                  <Heart className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
                  <p className="text-muted-foreground">Belum ada data donasi</p>
                </div>
              ) : (
                filteredData.map((item) => (
                  <div key={item.id} className="flex items-center justify-between p-4 rounded-lg border border-border bg-background hover:shadow-soft transition-all">
                    <div className="flex items-start gap-4">
                      <div className="p-3 bg-primary/10 rounded-lg">
                        {item.jenis_donasi === "Uang" ? (
                          <DollarSign className="w-5 h-5 text-primary" />
                        ) : (
                          <Gift className="w-5 h-5 text-primary" />
                        )}
                      </div>
                      <div className="flex-1">
                        <h4 className="font-semibold text-foreground">{item.nama_donatur}</h4>
                        <div className="flex items-center gap-4 text-sm text-muted-foreground mt-1">
                          <span className="flex items-center gap-1">
                            <Calendar className="w-3 h-3" />
                            {new Date(item.tanggal_donasi).toLocaleDateString('id-ID')}
                          </span>
                          {item.email_donatur && (
                            <span className="flex items-center gap-1">
                              <Mail className="w-3 h-3" />
                              {item.email_donatur}
                            </span>
                          )}
                          {item.no_telepon && (
                            <span className="flex items-center gap-1">
                              <Phone className="w-3 h-3" />
                              {item.no_telepon}
                            </span>
                          )}
                        </div>
                        {item.hajat_doa && (
                          <p className="text-sm text-muted-foreground mt-1 italic">"{item.hajat_doa}"</p>
                        )}
                      </div>
                    </div>
                    <div className="text-right space-y-2">
                      <div className="font-bold text-lg text-foreground">
                        {item.jenis_donasi === "Uang" && item.jumlah ? formatRupiah(item.jumlah) : "Barang"}
                      </div>
                      <div className="flex items-center gap-2">
                        <Badge className={kategoriColors[item.jenis_donasi]}>
                          {item.jenis_donasi}
                        </Badge>
                        <Badge className={statusColors[item.status]}>
                          {item.status}
                        </Badge>
                      </div>
                      <div className="flex items-center gap-1">
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
    </div>
  );
};

export default Donasi;

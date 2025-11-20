import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Checkbox } from "@/components/ui/checkbox";
import { 
  Search, 
  DollarSign,
  Plus,
  Edit,
  Trash2,
  CheckCircle,
  AlertCircle,
  Calendar,
  CreditCard,
  FileText
} from "lucide-react";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import {
  Alert,
  AlertDescription,
} from "@/components/ui/alert";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { toast } from 'sonner';
import { TagihanService, TagihanSantri, PembayaranSantri } from '@/services/tagihan.service';

const TagihanSantri: React.FC = () => {
  const [tagihanList, setTagihanList] = useState<TagihanSantri[]>([]);
  const [santriList, setSantriList] = useState<any[]>([]);
  const [selectedTagihan, setSelectedTagihan] = useState<TagihanSantri | null>(null);
  const [selectedSantriIds, setSelectedSantriIds] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [filterStatus, setFilterStatus] = useState<string>('all');
  const [filterPeriode, setFilterPeriode] = useState<string>('all');
  
  // Dialog states
  const [showGenerateDialog, setShowGenerateDialog] = useState(false);
  const [showPaymentDialog, setShowPaymentDialog] = useState(false);
  
  // Form states
  const [generateForm, setGenerateForm] = useState({
    periode: '',
    bulan: '',
    tahun_ajaran: '',
    komponen_spp: '',
    komponen_buku: '',
    komponen_seragam: '',
    komponen_lainnya: '',
    tanggal_jatuh_tempo: '',
  });
  
  const [paymentForm, setPaymentForm] = useState<Partial<PembayaranSantri>>({
    jumlah_bayar: 0,
    tanggal_bayar: new Date().toISOString().split('T')[0],
    metode_pembayaran: 'Tunai',
    nomor_referensi: '',
    catatan: '',
  });
  
  // Stats
  const [stats, setStats] = useState({
    total_tagihan: 0,
    total_dibayar: 0,
    total_sisa: 0,
    belum_bayar: 0,
    dibayar_sebagian: 0,
    lunas: 0,
    terlambat: 0,
  });

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      setLoading(true);
      const [tagihanData, santriData, statsData] = await Promise.all([
        TagihanService.getTagihan(),
        TagihanService.getSantriForTagihan(),
        TagihanService.getTagihanStats(),
      ]);
      
      setTagihanList(tagihanData);
      setSantriList(santriData);
      setStats(statsData);
    } catch (error: any) {
      toast.error('Gagal memuat data: ' + error.message);
    } finally {
      setLoading(false);
    }
  };

  const handleGenerateTagihan = async () => {
    if (selectedSantriIds.length === 0) {
      toast.error('Pilih minimal 1 santri');
      return;
    }

    if (!generateForm.periode || !generateForm.bulan) {
      toast.error('Periode dan bulan harus diisi');
      return;
    }

    try {
      const komponenTagihan = {
        spp: parseFloat(generateForm.komponen_spp) || 0,
        buku: parseFloat(generateForm.komponen_buku) || 0,
        seragam: parseFloat(generateForm.komponen_seragam) || 0,
        lainnya: parseFloat(generateForm.komponen_lainnya) || 0,
      };

      const totalTagihan = Object.values(komponenTagihan).reduce((sum, val) => sum + val, 0);

      await TagihanService.generateTagihan({
        santri_ids: selectedSantriIds,
        periode: generateForm.periode,
        bulan: generateForm.bulan,
        tahun_ajaran: generateForm.tahun_ajaran,
        komponen_tagihan: komponenTagihan,
        total_tagihan: totalTagihan,
        tanggal_jatuh_tempo: generateForm.tanggal_jatuh_tempo,
      });

      toast.success(`Tagihan berhasil dibuat untuk ${selectedSantriIds.length} santri`);
      setShowGenerateDialog(false);
      setSelectedSantriIds([]);
      setGenerateForm({
        periode: '',
        bulan: '',
        tahun_ajaran: '',
        komponen_spp: '',
        komponen_buku: '',
        komponen_seragam: '',
        komponen_lainnya: '',
        tanggal_jatuh_tempo: '',
      });
      loadData();
    } catch (error: any) {
      toast.error('Gagal generate tagihan: ' + error.message);
    }
  };

  const handleRecordPayment = async () => {
    if (!selectedTagihan || !paymentForm.jumlah_bayar) {
      toast.error('Jumlah bayar harus diisi');
      return;
    }

    try {
      await TagihanService.recordPayment({
        tagihan_id: selectedTagihan.id,
        santri_id: selectedTagihan.santri_id,
        jumlah_bayar: paymentForm.jumlah_bayar,
        tanggal_bayar: paymentForm.tanggal_bayar!,
        metode_pembayaran: paymentForm.metode_pembayaran!,
        nomor_referensi: paymentForm.nomor_referensi,
        catatan: paymentForm.catatan,
      });

      toast.success('Pembayaran berhasil dicatat');
      setShowPaymentDialog(false);
      setPaymentForm({
        jumlah_bayar: 0,
        tanggal_bayar: new Date().toISOString().split('T')[0],
        metode_pembayaran: 'Tunai',
        nomor_referensi: '',
        catatan: '',
      });
      loadData();
    } catch (error: any) {
      toast.error('Gagal catat pembayaran: ' + error.message);
    }
  };

  const handleDeleteTagihan = async (id: string) => {
    if (!confirm('Hapus tagihan ini?')) return;

    try {
      await TagihanService.deleteTagihan(id);
      toast.success('Tagihan berhasil dihapus');
      loadData();
    } catch (error: any) {
      toast.error('Gagal hapus tagihan: ' + error.message);
    }
  };

  const toggleSelectSantri = (santriId: string) => {
    setSelectedSantriIds(prev => 
      prev.includes(santriId)
        ? prev.filter(id => id !== santriId)
        : [...prev, santriId]
    );
  };

  const filteredTagihan = tagihanList.filter(tagihan => {
    const matchSearch = tagihan.santri?.nama_lengkap.toLowerCase().includes(searchTerm.toLowerCase()) ||
                       tagihan.santri?.nisn?.toLowerCase().includes(searchTerm.toLowerCase());
    const matchStatus = filterStatus === 'all' || tagihan.status === filterStatus;
    const matchPeriode = filterPeriode === 'all' || tagihan.periode === filterPeriode;
    
    return matchSearch && matchStatus && matchPeriode;
  });

  const uniquePeriodes = Array.from(new Set(tagihanList.map(t => t.periode))).sort().reverse();

  const formatRupiah = (amount: number) => {
    return new Intl.NumberFormat('id-ID', {
      style: 'currency',
      currency: 'IDR',
      minimumFractionDigits: 0,
    }).format(amount);
  };

  const getStatusBadge = (status: string) => {
    const colors: Record<string, string> = {
      'belum_bayar': 'bg-gray-100 text-gray-800 border-gray-200',
      'dibayar_sebagian': 'bg-blue-100 text-blue-800 border-blue-200',
      'lunas': 'bg-green-100 text-green-800 border-green-200',
      'terlambat': 'bg-red-100 text-red-800 border-red-200',
    };
    const labels: Record<string, string> = {
      'belum_bayar': 'Belum Bayar',
      'dibayar_sebagian': 'Dibayar Sebagian',
      'lunas': 'Lunas',
      'terlambat': 'Terlambat',
    };
    return (
      <Badge className={colors[status] || 'bg-gray-100 text-gray-800 border-gray-200'}>
        {labels[status] || status}
      </Badge>
    );
  };

  return (
    <div className="p-6 lg:p-8 space-y-6 animate-fade-in">
      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-3xl lg:text-4xl font-bold text-foreground mb-2 flex items-center gap-3">
            <DollarSign className="w-8 h-8 text-primary" />
            Tagihan Santri
          </h1>
          <p className="text-muted-foreground">
            Kelola tagihan dan pembayaran santri Reguler/Mahasiswa
          </p>
        </div>
        <Button 
          onClick={() => setShowGenerateDialog(true)}
          className="bg-gradient-primary hover:opacity-90"
        >
          <Plus className="w-4 h-4 mr-2" />
          Generate Tagihan
        </Button>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        <Card className="border-0 shadow-soft">
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-muted-foreground">Total Tagihan</p>
                <p className="text-lg font-bold text-primary">{formatRupiah(stats.total_tagihan)}</p>
              </div>
              <div className="p-3 bg-primary/10 rounded-lg">
                <FileText className="w-6 h-6 text-primary" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="border-0 shadow-soft">
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-muted-foreground">Total Dibayar</p>
                <p className="text-lg font-bold text-green-600">{formatRupiah(stats.total_dibayar)}</p>
              </div>
              <div className="p-3 bg-green-100 rounded-lg">
                <CheckCircle className="w-6 h-6 text-green-600" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="border-0 shadow-soft">
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-muted-foreground">Sisa Tagihan</p>
                <p className="text-lg font-bold text-amber-600">{formatRupiah(stats.total_sisa)}</p>
              </div>
              <div className="p-3 bg-amber-100 rounded-lg">
                <AlertCircle className="w-6 h-6 text-amber-600" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="border-0 shadow-soft">
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-muted-foreground">Lunas</p>
                <p className="text-2xl font-bold text-green-600">{stats.lunas}</p>
              </div>
              <div className="p-3 bg-green-100 rounded-lg">
                <CheckCircle className="w-6 h-6 text-green-600" />
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Filters */}
      <Card className="border-0 shadow-soft">
        <CardContent className="p-6">
          <div className="flex flex-col sm:flex-row gap-4">
            <div className="flex-1">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground w-4 h-4" />
                <Input
                  placeholder="Cari santri..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-10"
                />
              </div>
            </div>
            <Select value={filterPeriode} onValueChange={setFilterPeriode}>
              <SelectTrigger className="w-full sm:w-[180px]">
                <SelectValue placeholder="Periode" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Semua Periode</SelectItem>
                {uniquePeriodes.map(periode => (
                  <SelectItem key={periode} value={periode}>{periode}</SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Select value={filterStatus} onValueChange={setFilterStatus}>
              <SelectTrigger className="w-full sm:w-[180px]">
                <SelectValue placeholder="Status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Semua Status</SelectItem>
                <SelectItem value="belum_bayar">Belum Bayar</SelectItem>
                <SelectItem value="dibayar_sebagian">Dibayar Sebagian</SelectItem>
                <SelectItem value="lunas">Lunas</SelectItem>
                <SelectItem value="terlambat">Terlambat</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>

      {/* Tagihan List */}
      <Card className="border-0 shadow-soft">
        <CardHeader>
          <CardTitle>Daftar Tagihan</CardTitle>
          <CardDescription>
            {filteredTagihan.length} tagihan ditemukan
          </CardDescription>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="text-center py-8">
              <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
              <p className="mt-2 text-sm text-muted-foreground">Memuat data...</p>
            </div>
          ) : filteredTagihan.length === 0 ? (
            <div className="text-center py-8">
              <DollarSign className="w-12 h-12 mx-auto text-muted-foreground mb-3" />
              <p className="text-muted-foreground">Belum ada tagihan</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Santri</TableHead>
                    <TableHead>Periode</TableHead>
                    <TableHead>Total Tagihan</TableHead>
                    <TableHead>Dibayar</TableHead>
                    <TableHead>Sisa</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Jatuh Tempo</TableHead>
                    <TableHead className="text-right">Aksi</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredTagihan.map((tagihan) => (
                    <TableRow key={tagihan.id}>
                      <TableCell>
                        <div>
                          <div className="font-semibold">{tagihan.santri?.nama_lengkap}</div>
                          <div className="text-xs text-muted-foreground">{tagihan.santri?.nisn}</div>
                        </div>
                      </TableCell>
                      <TableCell>
                        <div>
                          <div className="font-medium">{tagihan.bulan}</div>
                          <div className="text-xs text-muted-foreground">{tagihan.periode}</div>
                        </div>
                      </TableCell>
                      <TableCell className="font-semibold">{formatRupiah(tagihan.total_tagihan)}</TableCell>
                      <TableCell className="text-green-600">{formatRupiah(tagihan.total_dibayar)}</TableCell>
                      <TableCell className="text-amber-600">{formatRupiah(tagihan.sisa_tagihan)}</TableCell>
                      <TableCell>{getStatusBadge(tagihan.status)}</TableCell>
                      <TableCell>
                        {tagihan.tanggal_jatuh_tempo ? (
                          <div className="text-sm">
                            {new Date(tagihan.tanggal_jatuh_tempo).toLocaleDateString('id-ID')}
                          </div>
                        ) : (
                          <span className="text-muted-foreground">-</span>
                        )}
                      </TableCell>
                      <TableCell className="text-right">
                        <div className="flex items-center justify-end gap-2">
                          {tagihan.status !== 'lunas' && (
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => {
                                setSelectedTagihan(tagihan);
                                setPaymentForm({
                                  ...paymentForm,
                                  jumlah_bayar: tagihan.sisa_tagihan,
                                });
                                setShowPaymentDialog(true);
                              }}
                            >
                              <CreditCard className="w-4 h-4 mr-2" />
                              Bayar
                            </Button>
                          )}
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => handleDeleteTagihan(tagihan.id)}
                          >
                            <Trash2 className="w-4 h-4 text-red-600" />
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Generate Tagihan Dialog */}
      <Dialog open={showGenerateDialog} onOpenChange={setShowGenerateDialog}>
        <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Generate Tagihan Bulanan</DialogTitle>
            <DialogDescription>
              Pilih santri dan isi detail tagihan
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-6 py-4">
            {/* Santri Selection */}
            <div>
              <Label className="text-base font-semibold mb-3 block">Pilih Santri ({selectedSantriIds.length} dipilih)</Label>
              <div className="border rounded-lg p-4 max-h-60 overflow-y-auto">
                {santriList.map((santri) => (
                  <div key={santri.id} className="flex items-center gap-3 py-2">
                    <Checkbox
                      checked={selectedSantriIds.includes(santri.id)}
                      onCheckedChange={() => toggleSelectSantri(santri.id)}
                    />
                    <div className="flex-1">
                      <div className="font-medium">{santri.nama_lengkap}</div>
                      <div className="text-xs text-muted-foreground">{santri.nisn} - {santri.kategori}</div>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Periode & Tanggal */}
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label>Periode (YYYY-MM) *</Label>
                <Input
                  type="month"
                  value={generateForm.periode}
                  onChange={(e) => setGenerateForm({ ...generateForm, periode: e.target.value })}
                />
              </div>
              <div>
                <Label>Bulan *</Label>
                <Select
                  value={generateForm.bulan}
                  onValueChange={(value) => setGenerateForm({ ...generateForm, bulan: value })}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Pilih bulan" />
                  </SelectTrigger>
                  <SelectContent>
                    {['Januari', 'Februari', 'Maret', 'April', 'Mei', 'Juni', 'Juli', 'Agustus', 'September', 'Oktober', 'November', 'Desember'].map(bulan => (
                      <SelectItem key={bulan} value={bulan}>{bulan}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label>Tahun Ajaran</Label>
                <Input
                  value={generateForm.tahun_ajaran}
                  onChange={(e) => setGenerateForm({ ...generateForm, tahun_ajaran: e.target.value })}
                  placeholder="2024/2025"
                />
              </div>
              <div>
                <Label>Tanggal Jatuh Tempo</Label>
                <Input
                  type="date"
                  value={generateForm.tanggal_jatuh_tempo}
                  onChange={(e) => setGenerateForm({ ...generateForm, tanggal_jatuh_tempo: e.target.value })}
                />
              </div>
            </div>

            {/* Komponen Tagihan */}
            <div>
              <Label className="text-base font-semibold mb-3 block">Komponen Tagihan</Label>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label>SPP</Label>
                  <Input
                    type="number"
                    value={generateForm.komponen_spp}
                    onChange={(e) => setGenerateForm({ ...generateForm, komponen_spp: e.target.value })}
                    placeholder="300000"
                  />
                </div>
                <div>
                  <Label>Buku</Label>
                  <Input
                    type="number"
                    value={generateForm.komponen_buku}
                    onChange={(e) => setGenerateForm({ ...generateForm, komponen_buku: e.target.value })}
                    placeholder="100000"
                  />
                </div>
                <div>
                  <Label>Seragam</Label>
                  <Input
                    type="number"
                    value={generateForm.komponen_seragam}
                    onChange={(e) => setGenerateForm({ ...generateForm, komponen_seragam: e.target.value })}
                    placeholder="150000"
                  />
                </div>
                <div>
                  <Label>Lainnya</Label>
                  <Input
                    type="number"
                    value={generateForm.komponen_lainnya}
                    onChange={(e) => setGenerateForm({ ...generateForm, komponen_lainnya: e.target.value })}
                    placeholder="50000"
                  />
                </div>
              </div>
              <div className="mt-4 p-4 bg-primary/5 rounded-lg">
                <div className="flex justify-between items-center">
                  <span className="font-semibold">Total Tagihan:</span>
                  <span className="text-xl font-bold text-primary">
                    {formatRupiah(
                      (parseFloat(generateForm.komponen_spp) || 0) +
                      (parseFloat(generateForm.komponen_buku) || 0) +
                      (parseFloat(generateForm.komponen_seragam) || 0) +
                      (parseFloat(generateForm.komponen_lainnya) || 0)
                    )}
                  </span>
                </div>
              </div>
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setShowGenerateDialog(false)}>
              Batal
            </Button>
            <Button onClick={handleGenerateTagihan}>
              <CheckCircle className="w-4 h-4 mr-2" />
              Generate Tagihan
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Payment Dialog */}
      <Dialog open={showPaymentDialog} onOpenChange={setShowPaymentDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Catat Pembayaran</DialogTitle>
            <DialogDescription>
              {selectedTagihan?.santri?.nama_lengkap} - {selectedTagihan?.bulan} {selectedTagihan?.periode}
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-4">
            <Alert>
              <AlertCircle className="h-4 w-4" />
              <AlertDescription>
                Sisa tagihan: <strong>{formatRupiah(selectedTagihan?.sisa_tagihan || 0)}</strong>
              </AlertDescription>
            </Alert>

            <div>
              <Label>Jumlah Bayar *</Label>
              <Input
                type="number"
                value={paymentForm.jumlah_bayar}
                onChange={(e) => setPaymentForm({ ...paymentForm, jumlah_bayar: parseFloat(e.target.value) })}
              />
            </div>

            <div>
              <Label>Tanggal Bayar *</Label>
              <Input
                type="date"
                value={paymentForm.tanggal_bayar}
                onChange={(e) => setPaymentForm({ ...paymentForm, tanggal_bayar: e.target.value })}
              />
            </div>

            <div>
              <Label>Metode Pembayaran *</Label>
              <Select
                value={paymentForm.metode_pembayaran}
                onValueChange={(value) => setPaymentForm({ ...paymentForm, metode_pembayaran: value })}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="Tunai">Tunai</SelectItem>
                  <SelectItem value="Transfer Bank">Transfer Bank</SelectItem>
                  <SelectItem value="E-Wallet">E-Wallet</SelectItem>
                  <SelectItem value="Lainnya">Lainnya</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div>
              <Label>Nomor Referensi</Label>
              <Input
                value={paymentForm.nomor_referensi}
                onChange={(e) => setPaymentForm({ ...paymentForm, nomor_referensi: e.target.value })}
                placeholder="Nomor transaksi/referensi"
              />
            </div>

            <div>
              <Label>Catatan</Label>
              <Textarea
                value={paymentForm.catatan}
                onChange={(e) => setPaymentForm({ ...paymentForm, catatan: e.target.value })}
                placeholder="Catatan tambahan..."
                rows={3}
              />
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setShowPaymentDialog(false)}>
              Batal
            </Button>
            <Button onClick={handleRecordPayment}>
              <CheckCircle className="w-4 h-4 mr-2" />
              Catat Pembayaran
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default TagihanSantri;


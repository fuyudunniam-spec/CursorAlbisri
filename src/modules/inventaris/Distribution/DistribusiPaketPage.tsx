import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import {
  Alert,
  AlertDescription,
  AlertTitle,
} from '@/components/ui/alert';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import {
  Package,
  Plus,
  Search,
  AlertTriangle,
  CheckCircle,
  ShoppingCart,
  ExternalLink,
  TrendingUp,
  Users,
  BarChart3,
  Edit,
  Trash2,
} from 'lucide-react';
import { toast } from 'sonner';
import { useNavigate } from 'react-router-dom';
import ModuleHeader from '@/components/ModuleHeader';
import {
  listPaketSembako,
  getPaketSembakoWithKomponen,
  createDistribusiPaket,
  updateDistribusiPaket,
  deleteDistribusiPaket,
  listDistribusiPaket,
  cekStokPaket,
  getStatistikDistribusiPaket,
  DistribusiPaketFormData,
  PaketSembakoWithKomponen,
} from '@/services/paketDistribusi.service';
import { listInventory, InventoryItem } from '@/services/inventaris.service';

const DistribusiPaketPage = () => {
  const navigate = useNavigate();
  const [paketList, setPaketList] = useState<PaketSembakoWithKomponen[]>([]);
  const [distribusiList, setDistribusiList] = useState<any[]>([]);
  const [inventoryItems, setInventoryItems] = useState<InventoryItem[]>([]);
  const [statistik, setStatistik] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');

  // Dialog states
  const [showFormDialog, setShowFormDialog] = useState(false);
  const [showEditDialog, setShowEditDialog] = useState(false);
  const [editingDistribusiId, setEditingDistribusiId] = useState<string | null>(null);
  const [selectedPaketId, setSelectedPaketId] = useState<string | null>(null);
  const [selectedPaket, setSelectedPaket] = useState<PaketSembakoWithKomponen | null>(null);
  const [stokCek, setStokCek] = useState<any>(null);
  const [submitting, setSubmitting] = useState(false);

  // Form states
  const [formData, setFormData] = useState<DistribusiPaketFormData>({
    paket_id: '',
    penerima: '',
    tipe_penerima: 'santri', // Harus lowercase sesuai constraint database
    alamat: '',
    kriteria: '',
    tanggal_distribusi: new Date().toISOString().split('T')[0],
    catatan: '',
  });

  const tabs = [
    { label: 'Dashboard', path: '/inventaris' },
    { label: 'Master Data', path: '/inventaris/master' },
    { label: 'Transfer', path: '/inventaris/transfer' },
    { label: 'Distribusi', path: '/inventaris/distribution' },
    { label: 'Master Paket', path: '/inventaris/distribution/master-paket' },
  ];

  // Load data
  useEffect(() => {
    loadData();
  }, []);

  const loadData = async (skipLoadingState = false) => {
    try {
      if (!skipLoadingState) {
        setLoading(true);
      }
      
      // Load data secara paralel untuk performa lebih baik
      const [paketListData, distribusiData, statistikData, inventoryData] = await Promise.all([
        listPaketSembako(false), // Hanya load paket aktif
        listDistribusiPaket(),
        getStatistikDistribusiPaket(),
        listInventory({ page: 1, pageSize: 1000 }),
      ]);

      // Load komponen untuk setiap paket secara paralel (lebih cepat dari sequential)
      const paketData = await Promise.all(
        paketListData.map((p) => getPaketSembakoWithKomponen(p.id))
      );

      setPaketList(
        paketData.filter((p): p is PaketSembakoWithKomponen => p !== null)
      );
      setDistribusiList(distribusiData || []);
      setStatistik(statistikData);
      setInventoryItems(inventoryData.data || []);
    } catch (error: any) {
      console.error('Error loading data:', error);
      toast.error('Gagal memuat data: ' + error.message);
    } finally {
      if (!skipLoadingState) {
        setLoading(false);
      }
    }
  };

  // Handle form dialog
  const handleOpenForm = async (paketId: string) => {
    setSelectedPaketId(paketId);
    const paket = await getPaketSembakoWithKomponen(paketId);
    if (!paket) {
      toast.error('Paket tidak ditemukan');
      return;
    }

    setSelectedPaket(paket);

    // Cek stok
    const cek = await cekStokPaket(paketId);
    setStokCek(cek);

    setFormData({
      paket_id: paketId,
      penerima: '',
      tipe_penerima: 'santri', // Harus lowercase sesuai constraint database
      alamat: '',
      kriteria: '',
      tanggal_distribusi: new Date().toISOString().split('T')[0],
      catatan: '',
    });

    setShowFormDialog(true);
  };

  const handleSubmitForm = async () => {
    if (submitting) {
      toast.warning('Sedang memproses, harap tunggu...');
      return; // Prevent double submission
    }
    
    try {
      setSubmitting(true);
      
      if (!formData.penerima.trim()) {
        toast.error('Nama penerima harus diisi');
        setSubmitting(false);
        return;
      }

      if (!stokCek?.cukup) {
        toast.error('Stok tidak mencukupi untuk distribusi paket ini');
        setSubmitting(false);
        return;
      }

      const distribusi = await createDistribusiPaket(formData);
      
      // Tampilkan detail transaksi yang dibuat
      const komponen = selectedPaket?.komponen || [];
      const detailTransaksi = komponen.map((k) => {
        const item = inventoryItems.find((i) => i.id === k.item_id);
        return `${k.inventaris?.nama_barang}: ${k.jumlah} ${k.inventaris?.satuan || 'pcs'}`;
      }).join(', ');

      toast.success(
        `Distribusi paket berhasil! Stok otomatis berkurang untuk: ${detailTransaksi}`,
        { duration: 5000 }
      );
      
      setShowFormDialog(false);
      resetForm();
      await loadData(); // Wait for reload to prevent duplicate
    } catch (error: any) {
      console.error('Error creating distribusi:', error);
      toast.error('Gagal membuat distribusi: ' + error.message);
    } finally {
      setSubmitting(false);
    }
  };

  const resetForm = () => {
    setFormData({
      paket_id: '',
      penerima: '',
      tipe_penerima: 'santri',
      alamat: '',
      kriteria: '',
      tanggal_distribusi: new Date().toISOString().split('T')[0],
      catatan: '',
    });
    setSelectedPaket(null);
    setStokCek(null);
  };

  const handleEditDistribusi = async (distribusiId: string) => {
    const distribusi = distribusiList.find((d) => d.id === distribusiId);
    if (!distribusi) return;

    setEditingDistribusiId(distribusiId);
    setFormData({
      paket_id: distribusi.paket_id,
      penerima: distribusi.penerima,
      tipe_penerima: distribusi.tipe_penerima || 'santri',
      alamat: distribusi.alamat || '',
      kriteria: distribusi.kriteria || '',
      tanggal_distribusi: distribusi.tanggal_distribusi,
      catatan: distribusi.catatan || '',
    });

    // Load paket info
    const paket = await getPaketSembakoWithKomponen(distribusi.paket_id);
    if (paket) {
      setSelectedPaket(paket);
      const cek = await cekStokPaket(distribusi.paket_id);
      setStokCek(cek);
    }

    setShowEditDialog(true);
  };

  const handleUpdateDistribusi = async () => {
    if (!editingDistribusiId || submitting) return;

    try {
      setSubmitting(true);
      
      if (!formData.penerima.trim()) {
        toast.error('Nama penerima harus diisi');
        return;
      }

      await updateDistribusiPaket(editingDistribusiId, formData);
      toast.success('Distribusi paket berhasil diperbarui');
      
      setShowEditDialog(false);
      setEditingDistribusiId(null);
      resetForm();
      loadData();
    } catch (error: any) {
      console.error('Error updating distribusi:', error);
      toast.error('Gagal memperbarui distribusi: ' + error.message);
    } finally {
      setSubmitting(false);
    }
  };

  const handleDeleteDistribusi = async (distribusiId: string) => {
    if (!confirm('Apakah Anda yakin ingin menghapus distribusi ini? Transaksi inventaris terkait juga akan dihapus dan stok akan dikembalikan.')) {
      return;
    }

    try {
      setLoading(true);
      
      // Hapus distribusi
      await deleteDistribusiPaket(distribusiId);
      
      // Update UI langsung tanpa reload penuh untuk respons yang lebih cepat
      setDistribusiList(distribusiList.filter((d) => d.id !== distribusiId));
      
      // Update statistik lokal
      if (statistik) {
        setStatistik({
          ...statistik,
          total_distribusi: Math.max(0, statistik.total_distribusi - 1),
        });
      }
      
      toast.success('Distribusi paket berhasil dihapus');
      
      // Reload data di background untuk sinkronisasi (tanpa blocking UI)
      loadData(true).catch((err) => {
        console.warn('Background reload failed:', err);
        // Jika background reload gagal, tetap tampilkan data yang sudah diupdate
      });
    } catch (error: any) {
      console.error('Error deleting distribusi:', error);
      toast.error('Gagal menghapus distribusi: ' + error.message);
      // Reload data jika ada error untuk memastikan sinkronisasi
      loadData();
    } finally {
      setLoading(false);
    }
  };

  // Filter
  const filteredPaket = paketList.filter(
    (p) =>
      p.nama_paket.toLowerCase().includes(searchTerm.toLowerCase()) ||
      p.deskripsi?.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const filteredDistribusi = distribusiList.filter(
    (d) =>
      d.penerima?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      d.paket_sembako?.nama_paket?.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <div className="space-y-6">
      <ModuleHeader title="Distribusi Paket" tabs={tabs} />

      {/* Stats Cards */}
      {statistik && (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Total Distribusi</CardTitle>
              <Package className="h-4 w-4 text-blue-600" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-blue-600">
                {statistik.total_distribusi}
              </div>
              <p className="text-xs text-muted-foreground">Paket didistribusikan</p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Total Penerima</CardTitle>
              <Users className="h-4 w-4 text-green-600" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-green-600">
                {statistik.total_penerima}
              </div>
              <p className="text-xs text-muted-foreground">Penerima unik</p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Jenis Paket</CardTitle>
              <BarChart3 className="h-4 w-4 text-purple-600" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-purple-600">
                {Object.keys(statistik.paket_terdistribusi || {}).length}
              </div>
              <p className="text-xs text-muted-foreground">Jenis paket berbeda</p>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Quick Actions */}
      <div className="flex justify-between items-center">
        <div className="flex-1 max-w-md">
          <div className="relative">
            <Search className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Cari paket atau distribusi..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-10"
            />
          </div>
        </div>
        <div className="flex gap-2">
          <Button
            variant="outline"
            onClick={() => navigate('/inventaris/distribution/master-paket')}
          >
            <Package className="h-4 w-4 mr-2" />
            Master Paket
          </Button>
        </div>
      </div>

      {/* Paket List untuk Distribusi */}
      <Card>
        <CardHeader>
          <CardTitle>Daftar Paket Tersedia</CardTitle>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="text-center py-8">Memuat data...</div>
          ) : filteredPaket.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              <Package className="h-12 w-12 mx-auto mb-4 opacity-50" />
              <p>Tidak ada paket aktif ditemukan</p>
              <Button
                className="mt-4"
                onClick={() => navigate('/inventaris/distribution/master-paket')}
              >
                Buat Paket Baru
              </Button>
            </div>
          ) : (
            <div className="grid gap-4">
              {filteredPaket.map((paket) => {
                const semuaCukup = paket.komponen.every((k) => k.stok_cukup);
                const totalKurang = paket.komponen.reduce(
                  (sum, k) => sum + (k.kurang || 0),
                  0
                );

                // Hitung berapa paket bisa dibuat dari stok tersedia
                const paketBisaDibuat = paket.komponen.length > 0
                  ? Math.min(
                      ...paket.komponen.map((k) => {
                        if (k.stok_tersedia === 0 || k.jumlah === 0) return 0;
                        return Math.floor(k.stok_tersedia / k.jumlah);
                      })
                    )
                  : 0;

                return (
                  <Card key={paket.id} className="border-l-4 border-l-blue-500">
                    <CardHeader>
                      <div className="flex justify-between items-start">
                        <div className="flex-1">
                          <CardTitle className="flex items-center gap-2">
                            {paket.nama_paket}
                            {semuaCukup ? (
                              <Badge variant="outline" className="text-green-600">
                                <CheckCircle className="h-3 w-3 mr-1" />
                                Stok Cukup
                              </Badge>
                            ) : (
                              <Badge variant="outline" className="text-red-600">
                                <AlertTriangle className="h-3 w-3 mr-1" />
                                Stok Kurang
                              </Badge>
                            )}
                          </CardTitle>
                          {paket.deskripsi && (
                            <p className="text-sm text-muted-foreground mt-1">
                              {paket.deskripsi}
                            </p>
                          )}
                          {/* Info Berapa Paket Bisa Dibuat */}
                          {semuaCukup && paketBisaDibuat > 0 && (
                            <div className="mt-2 p-2 bg-blue-50 rounded-md">
                              <p className="text-sm font-medium text-blue-900">
                                📦 Maksimal bisa dibuat: <strong>{paketBisaDibuat} paket</strong>
                              </p>
                              <p className="text-xs text-blue-700 mt-1">
                                Stok akan otomatis berkurang saat distribusi paket
                              </p>
                            </div>
                          )}
                        </div>
                        <Button
                          onClick={() => handleOpenForm(paket.id)}
                          disabled={!semuaCukup}
                        >
                          <Plus className="h-4 w-4 mr-2" />
                          Distribusi
                        </Button>
                      </div>
                    </CardHeader>
                    <CardContent>
                      {!semuaCukup && (
                        <Alert className="mb-4 border-yellow-500">
                          <AlertTriangle className="h-4 w-4 text-yellow-600" />
                          <AlertTitle>Stok Tidak Mencukupi</AlertTitle>
                          <AlertDescription>
                            Total kurang: {totalKurang} item. Silakan beli barang terlebih dahulu.
                            <Button
                              variant="link"
                              className="p-0 ml-2 h-auto"
                              onClick={() => navigate('/inventaris/master')}
                            >
                              <ShoppingCart className="h-4 w-4 mr-1" />
                              Beli Barang
                            </Button>
                          </AlertDescription>
                        </Alert>
                      )}

                      <div className="text-sm space-y-1">
                        <p className="font-medium">Komposisi Paket:</p>
                        <ul className="list-disc list-inside space-y-1 text-muted-foreground">
                          {paket.komponen.map((k) => {
                            const bisaBuatPaket = k.jumlah > 0 
                              ? Math.floor(k.stok_tersedia / k.jumlah)
                              : 0;
                            
                            return (
                              <li key={k.id}>
                                {k.inventaris?.nama_barang}: <strong>{k.jumlah} {k.inventaris?.satuan || 'pcs'}</strong>{' '}
                                (
                                {k.stok_cukup ? (
                                  <>
                                    <span className="text-green-600">
                                      Stok: {k.stok_tersedia} {k.inventaris?.satuan || 'pcs'}
                                    </span>
                                    {k.jumlah > 0 && (
                                      <span className="text-blue-600 ml-1">
                                        → Bisa buat {bisaBuatPaket} paket
                                      </span>
                                    )}
                                  </>
                                ) : (
                                  <span className="text-red-600">
                                    Kurang {k.kurang} {k.inventaris?.satuan || 'pcs'}
                                  </span>
                                )}
                                )
                              </li>
                            );
                          })}
                        </ul>
                      </div>
                    </CardContent>
                  </Card>
                );
              })}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Distribusi List */}
      <Card>
        <CardHeader>
          <div className="flex justify-between items-center">
            <CardTitle>Riwayat Distribusi Paket</CardTitle>
            {filteredDistribusi.length > 0 && (
              <Badge variant="outline">
                Total: {filteredDistribusi.length} distribusi
              </Badge>
            )}
          </div>
        </CardHeader>
        <CardContent>
          {filteredDistribusi.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              <Package className="h-12 w-12 mx-auto mb-4 opacity-50" />
              <p>Belum ada distribusi paket</p>
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Paket</TableHead>
                  <TableHead>Penerima</TableHead>
                  <TableHead>Tipe</TableHead>
                  <TableHead>Tanggal</TableHead>
                  <TableHead>Catatan</TableHead>
                  <TableHead>Aksi</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredDistribusi.map((dist) => (
                  <TableRow key={dist.id}>
                    <TableCell className="font-medium">
                      {dist.paket_sembako?.nama_paket || 'Tidak diketahui'}
                    </TableCell>
                    <TableCell>{dist.penerima}</TableCell>
                    <TableCell>
                      <Badge variant="outline">
                        {dist.tipe_penerima === 'santri' ? 'Santri' : 
                         dist.tipe_penerima === 'keluarga' ? 'Keluarga' : 
                         dist.tipe_penerima || '-'}
                      </Badge>
                    </TableCell>
                    <TableCell>{dist.tanggal_distribusi}</TableCell>
                    <TableCell className="text-muted-foreground">
                      {dist.catatan || '-'}
                    </TableCell>
                    <TableCell>
                      <div className="flex gap-2">
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => handleEditDistribusi(dist.id)}
                        >
                          <Edit className="h-4 w-4" />
                        </Button>
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => handleDeleteDistribusi(dist.id)}
                          className="text-red-600 hover:text-red-700"
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      {/* Form Dialog */}
      <Dialog open={showFormDialog} onOpenChange={setShowFormDialog}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Distribusi Paket: {selectedPaket?.nama_paket}</DialogTitle>
          </DialogHeader>

          {selectedPaket && (
            <div className="space-y-4">
              {/* Stok Status */}
              {stokCek && (
                <Alert
                  className={
                    stokCek.cukup
                      ? 'border-green-500 bg-green-50'
                      : 'border-red-500 bg-red-50'
                  }
                >
                  {stokCek.cukup ? (
                    <>
                      <CheckCircle className="h-4 w-4 text-green-600" />
                      <AlertTitle className="text-green-800">
                        Stok Mencukupi
                      </AlertTitle>
                      <AlertDescription className="text-green-700">
                        Semua komponen paket memiliki stok yang cukup untuk distribusi.
                      </AlertDescription>
                    </>
                  ) : (
                    <>
                      <AlertTriangle className="h-4 w-4 text-red-600" />
                      <AlertTitle className="text-red-800">
                        Stok Tidak Mencukupi
                      </AlertTitle>
                      <AlertDescription className="text-red-700">
                        Beberapa komponen memiliki stok yang tidak mencukupi. Total kurang:{' '}
                        {stokCek.total_kurang} item.
                        <Button
                          variant="link"
                          className="p-0 ml-2 h-auto text-red-700"
                          onClick={() => navigate('/inventaris/master')}
                        >
                          <ShoppingCart className="h-4 w-4 mr-1" />
                          Beli Barang
                        </Button>
                      </AlertDescription>
                    </>
                  )}
                </Alert>
              )}

              {/* Komposisi Preview */}
              <div>
                <Label>Komposisi Paket</Label>
                <div className="mt-2 space-y-2">
                  {selectedPaket.komponen.map((k) => (
                    <div
                      key={k.id}
                      className="flex justify-between items-center p-2 bg-muted rounded"
                    >
                      <span className="text-sm">
                        {k.inventaris?.nama_barang}: {k.jumlah}{' '}
                        {k.inventaris?.satuan || 'pcs'}
                      </span>
                      {k.stok_cukup ? (
                        <Badge variant="outline" className="text-green-600">
                          <CheckCircle className="h-3 w-3 mr-1" />
                          Cukup
                        </Badge>
                      ) : (
                        <Badge variant="outline" className="text-red-600">
                          <AlertTriangle className="h-3 w-3 mr-1" />
                          Kurang {k.kurang}
                        </Badge>
                      )}
                    </div>
                  ))}
                </div>
              </div>

              {/* Form Fields */}
              <div className="space-y-4">
                <div>
                  <Label htmlFor="penerima">Nama Penerima *</Label>
                  <Input
                    id="penerima"
                    value={formData.penerima}
                    onChange={(e) =>
                      setFormData({ ...formData, penerima: e.target.value })
                    }
                    placeholder="Nama penerima"
                  />
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label htmlFor="tipe_penerima">Tipe Penerima</Label>
                    <Select
                      value={formData.tipe_penerima}
                      onValueChange={(value) =>
                        setFormData({ ...formData, tipe_penerima: value })
                      }
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="santri">Santri</SelectItem>
                        <SelectItem value="keluarga">Keluarga</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  <div>
                    <Label htmlFor="tanggal_distribusi">Tanggal Distribusi *</Label>
                    <Input
                      id="tanggal_distribusi"
                      type="date"
                      value={formData.tanggal_distribusi}
                      onChange={(e) =>
                        setFormData({
                          ...formData,
                          tanggal_distribusi: e.target.value,
                        })
                      }
                    />
                  </div>
                </div>

                <div>
                  <Label htmlFor="alamat">Alamat</Label>
                  <Textarea
                    id="alamat"
                    value={formData.alamat}
                    onChange={(e) =>
                      setFormData({ ...formData, alamat: e.target.value })
                    }
                    placeholder="Alamat penerima (opsional)"
                    rows={2}
                  />
                </div>

                <div>
                  <Label htmlFor="kriteria">Kriteria</Label>
                  <Input
                    id="kriteria"
                    value={formData.kriteria}
                    onChange={(e) =>
                      setFormData({ ...formData, kriteria: e.target.value })
                    }
                    placeholder="Kriteria penerima (opsional)"
                  />
                </div>

                <div>
                  <Label htmlFor="catatan">Catatan</Label>
                  <Textarea
                    id="catatan"
                    value={formData.catatan}
                    onChange={(e) =>
                      setFormData({ ...formData, catatan: e.target.value })
                    }
                    placeholder="Catatan distribusi (opsional)"
                    rows={2}
                  />
                </div>
              </div>
            </div>
          )}

          <DialogFooter>
            <Button variant="outline" onClick={() => {
              setShowFormDialog(false);
              resetForm();
            }}>
              Batal
            </Button>
            <Button
              onClick={handleSubmitForm}
              disabled={!stokCek?.cukup || submitting}
            >
              {submitting ? 'Menyimpan...' : 'Distribusi Paket'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Edit Dialog */}
      <Dialog open={showEditDialog} onOpenChange={setShowEditDialog}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Edit Distribusi Paket: {selectedPaket?.nama_paket}</DialogTitle>
          </DialogHeader>

          {selectedPaket && (
            <div className="space-y-4">
              {/* Komposisi Preview */}
              <div>
                <Label>Komposisi Paket</Label>
                <div className="mt-2 space-y-2">
                  {selectedPaket.komponen.map((k) => (
                    <div
                      key={k.id}
                      className="flex justify-between items-center p-2 bg-muted rounded"
                    >
                      <span className="text-sm">
                        {k.inventaris?.nama_barang}: {k.jumlah}{' '}
                        {k.inventaris?.satuan || 'pcs'}
                      </span>
                      {k.stok_cukup ? (
                        <Badge variant="outline" className="text-green-600">
                          <CheckCircle className="h-3 w-3 mr-1" />
                          Cukup
                        </Badge>
                      ) : (
                        <Badge variant="outline" className="text-red-600">
                          <AlertTriangle className="h-3 w-3 mr-1" />
                          Kurang {k.kurang}
                        </Badge>
                      )}
                    </div>
                  ))}
                </div>
              </div>

              {/* Form Fields */}
              <div className="space-y-4">
                <div>
                  <Label htmlFor="edit_penerima">Nama Penerima *</Label>
                  <Input
                    id="edit_penerima"
                    value={formData.penerima}
                    onChange={(e) =>
                      setFormData({ ...formData, penerima: e.target.value })
                    }
                    placeholder="Nama penerima"
                  />
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label htmlFor="edit_tipe_penerima">Tipe Penerima</Label>
                    <Select
                      value={formData.tipe_penerima}
                      onValueChange={(value) =>
                        setFormData({ ...formData, tipe_penerima: value })
                      }
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="santri">Santri</SelectItem>
                        <SelectItem value="keluarga">Keluarga</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  <div>
                    <Label htmlFor="edit_tanggal_distribusi">Tanggal Distribusi *</Label>
                    <Input
                      id="edit_tanggal_distribusi"
                      type="date"
                      value={formData.tanggal_distribusi}
                      onChange={(e) =>
                        setFormData({
                          ...formData,
                          tanggal_distribusi: e.target.value,
                        })
                      }
                    />
                  </div>
                </div>

                <div>
                  <Label htmlFor="edit_alamat">Alamat</Label>
                  <Textarea
                    id="edit_alamat"
                    value={formData.alamat}
                    onChange={(e) =>
                      setFormData({ ...formData, alamat: e.target.value })
                    }
                    placeholder="Alamat penerima (opsional)"
                    rows={2}
                  />
                </div>

                <div>
                  <Label htmlFor="edit_kriteria">Kriteria</Label>
                  <Input
                    id="edit_kriteria"
                    value={formData.kriteria}
                    onChange={(e) =>
                      setFormData({ ...formData, kriteria: e.target.value })
                    }
                    placeholder="Kriteria penerima (opsional)"
                  />
                </div>

                <div>
                  <Label htmlFor="edit_catatan">Catatan</Label>
                  <Textarea
                    id="edit_catatan"
                    value={formData.catatan}
                    onChange={(e) =>
                      setFormData({ ...formData, catatan: e.target.value })
                    }
                    placeholder="Catatan distribusi (opsional)"
                    rows={2}
                  />
                </div>
              </div>
            </div>
          )}

          <DialogFooter>
            <Button variant="outline" onClick={() => {
              setShowEditDialog(false);
              setEditingDistribusiId(null);
              resetForm();
            }}>
              Batal
            </Button>
            <Button
              onClick={handleUpdateDistribusi}
              disabled={submitting}
            >
              {submitting ? 'Menyimpan...' : 'Simpan Perubahan'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default DistribusiPaketPage;


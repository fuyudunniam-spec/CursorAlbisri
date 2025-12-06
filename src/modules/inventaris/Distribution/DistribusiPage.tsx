import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import {
  Users,
  Plus,
  Package,
  TrendingUp,
  Search,
  Edit,
  Trash2,
  Eye,
  Box,
  AlertTriangle,
} from 'lucide-react';
import { toast } from 'sonner';
import ModuleHeader from '@/components/ModuleHeader';
import {
  getDistributionTransactions,
  createDistributionTransaction,
  updateDistributionTransaction,
  deleteDistributionTransaction,
  getDistributionTransaction,
  getSantriForDistribution,
} from '@/services/distribution.service';
import { DistributionTransaction, DistributionFormData } from '@/types/distribution.types';
import { listInventory, InventoryItem, createTransaction } from '@/services/inventaris.service';
import { listPaketSembako, PaketSembako } from '@/services/paketDistribusi.service';

const DistribusiPage = () => {
  const navigate = useNavigate();
  const [searchTerm, setSearchTerm] = useState('');
  const [showForm, setShowForm] = useState(false);
  const [loading, setLoading] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [showViewModal, setShowViewModal] = useState(false);
  const [showEditForm, setShowEditForm] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [selectedDistribution, setSelectedDistribution] = useState<DistributionTransaction | null>(null);
  const [editingDistribution, setEditingDistribution] = useState<DistributionTransaction | null>(null);

  // Data states
  const [inventoryItems, setInventoryItems] = useState<InventoryItem[]>([]);
  const [santriList, setSantriList] = useState<any[]>([]);
  const [paketList, setPaketList] = useState<PaketSembako[]>([]);
  const [distribusiList, setDistribusiList] = useState<DistributionTransaction[]>([]);
  const [statistik, setStatistik] = useState({
    hariIni: 0,
    bulanIni: 0,
    penerimaAktif: 0,
  });

  // Form states
  const [formData, setFormData] = useState({
    mode: 'single' as 'single' | 'paket', // Mode distribusi
    paket_id: '', // Jika mode paket
    item_id: '', // Jika mode single
    jumlah: '',
    penerima: '',
    santri_id: '',
    tanggal: new Date().toISOString().split('T')[0],
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

  const loadData = async () => {
    try {
      setLoading(true);
      const today = new Date();
      const startOfMonth = new Date(today.getFullYear(), today.getMonth(), 1);

      // Load data secara bertahap untuk performa lebih baik
      // 1. Load data penting dulu (untuk form dan statistik) - hanya kolom yang diperlukan
      const [inventoryData, santriData] = await Promise.all([
        listInventory(
          { page: 1, pageSize: 200 }, // Kurangi dari 1000 ke 200
          {}, // No filters untuk initial load
          { column: "nama_barang", direction: "asc" } // Sort by name untuk UX lebih baik
        ),
        getSantriForDistribution(), // Sudah ada limit 50, OK
      ]);

      setInventoryItems(inventoryData.data || []);
      setSantriList(santriData || []);

      // 2. Load data sekunder secara paralel (paket dan distribusi)
      const [paketData, distribusiData] = await Promise.all([
        listPaketSembako(true),
        getDistributionTransactions(
          { page: 1, pageSize: 100 }, // Kurangi dari 1000 ke 100 untuk initial load
          {
            startDate: startOfMonth.toISOString().split('T')[0],
          }
        ),
      ]);

      setPaketList((paketData || []).filter((p) => p.is_active));
      setDistribusiList(distribusiData.data || []);

      // Calculate statistics
      const distribusiHariIni = distribusiData.data?.filter(
        (d) => d.tanggal === today.toISOString().split('T')[0]
      ).length || 0;

      const distribusiBulanIni = distribusiData.total || 0; // Gunakan total dari query, bukan length data

      const uniquePenerima = new Set(
        distribusiData.data?.map((d) => d.penerima).filter(Boolean) || []
      );

      setStatistik({
        hariIni: distribusiHariIni,
        bulanIni: distribusiBulanIni,
        penerimaAktif: uniquePenerima.size,
      });
    } catch (error: any) {
      console.error('Error loading data:', error);
      toast.error('Gagal memuat data: ' + error.message);
    } finally {
      setLoading(false);
    }
  };

  // Handle form submission
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      setSubmitting(true);

      if (formData.mode === 'paket') {
        // Redirect ke distribusi paket jika mode paket
        navigate('/inventaris/distribution/distribusi-paket');
        return;
      }

      // Validasi single item
      if (!formData.item_id) {
        toast.error('Pilih item terlebih dahulu');
        return;
      }

      if (!formData.jumlah || parseFloat(formData.jumlah) <= 0) {
        toast.error('Jumlah harus lebih dari 0');
        return;
      }

      if (!formData.penerima.trim()) {
        toast.error('Nama penerima harus diisi');
        return;
      }

      // Cek stok
      const selectedItem = inventoryItems.find((i) => i.id === formData.item_id);
      if (!selectedItem) {
        toast.error('Item tidak ditemukan');
        return;
      }

      const stokTersedia = selectedItem.jumlah || 0;
      const jumlahDistribusi = parseFloat(formData.jumlah);

      if (stokTersedia < jumlahDistribusi) {
        toast.error(
          `Stok tidak mencukupi! Tersedia: ${stokTersedia} ${selectedItem.satuan || 'pcs'}, Dibutuhkan: ${jumlahDistribusi}`
        );
        return;
      }

      // Create distribution transaction
      await createDistributionTransaction({
        item_id: formData.item_id,
        jumlah: jumlahDistribusi,
        penerima: formData.penerima,
        penerima_santri_id: formData.santri_id || undefined,
        tanggal: formData.tanggal,
        catatan: formData.catatan || undefined,
      });

      toast.success('Distribusi berhasil disimpan');
      setShowForm(false);
      resetForm();
      loadData();
    } catch (error: any) {
      console.error('Error submitting distribution:', error);
      toast.error('Gagal menyimpan distribusi: ' + error.message);
    } finally {
      setSubmitting(false);
    }
  };

  const resetForm = () => {
    setFormData({
      mode: 'single',
      paket_id: '',
      item_id: '',
      jumlah: '',
      penerima: '',
      santri_id: '',
      tanggal: new Date().toISOString().split('T')[0],
      catatan: '',
    });
  };

  // Handle santri selection
  const handleSantriSelect = (santriId: string) => {
    const santri = santriList.find((s) => s.id === santriId);
    if (santri) {
      setFormData({
        ...formData,
        santri_id: santriId,
        penerima: santri.nama_lengkap,
      });
    }
  };

  // Filter distributions
  const filteredDistributions = distribusiList.filter(
    (dist) =>
      dist.nama_barang?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      dist.penerima?.toLowerCase().includes(searchTerm.toLowerCase())
  );

  // Handle View
  const handleViewDistribution = async (dist: DistributionTransaction) => {
    try {
      const fullData = await getDistributionTransaction(dist.id);
      setSelectedDistribution(fullData);
      setShowViewModal(true);
    } catch (error: any) {
      console.error('Error loading distribution details:', error);
      toast.error('Gagal memuat detail distribusi');
    }
  };

  // Handle Edit
  const handleEditDistribution = async (dist: DistributionTransaction) => {
    try {
      const fullData = await getDistributionTransaction(dist.id);
      setEditingDistribution(fullData);
      setFormData({
        mode: 'single',
        paket_id: '',
        item_id: fullData.item_id,
        jumlah: fullData.jumlah.toString(),
        penerima: fullData.penerima,
        santri_id: fullData.penerima_santri_id || '',
        tanggal: fullData.tanggal,
        catatan: fullData.catatan || '',
      });
      setShowEditForm(true);
      setShowForm(true);
    } catch (error: any) {
      console.error('Error loading distribution for edit:', error);
      toast.error('Gagal memuat data distribusi');
    }
  };

  // Handle Delete
  const handleDeleteDistribution = (dist: DistributionTransaction) => {
    setSelectedDistribution(dist);
    setShowDeleteConfirm(true);
  };

  const confirmDelete = async () => {
    if (!selectedDistribution) return;
    
    try {
      await deleteDistributionTransaction(selectedDistribution.id);
      toast.success('Distribusi berhasil dihapus');
      setShowDeleteConfirm(false);
      setSelectedDistribution(null);
      loadData();
    } catch (error: any) {
      console.error('Error deleting distribution:', error);
      toast.error('Gagal menghapus distribusi: ' + error.message);
    }
  };

  // Handle Update
  const handleUpdateDistribution = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingDistribution) return;

    try {
      setSubmitting(true);

      if (!formData.item_id) {
        toast.error('Pilih item terlebih dahulu');
        return;
      }

      if (!formData.jumlah || parseFloat(formData.jumlah) <= 0) {
        toast.error('Jumlah harus lebih dari 0');
        return;
      }

      if (!formData.penerima.trim()) {
        toast.error('Nama penerima harus diisi');
        return;
      }

      await updateDistributionTransaction(editingDistribution.id, {
        item_id: formData.item_id,
        jumlah: parseFloat(formData.jumlah),
        penerima: formData.penerima,
        penerima_santri_id: formData.santri_id || undefined,
        tanggal: formData.tanggal,
        catatan: formData.catatan || undefined,
      });

      toast.success('Distribusi berhasil diperbarui');
      setShowEditForm(false);
      setEditingDistribution(null);
      setShowForm(false);
      resetForm();
      loadData();
    } catch (error: any) {
      console.error('Error updating distribution:', error);
      toast.error('Gagal memperbarui distribusi: ' + error.message);
    } finally {
      setSubmitting(false);
    }
  };

  // Get selected item info
  const selectedItem = inventoryItems.find((i) => i.id === formData.item_id);
  const stokTersedia = selectedItem?.jumlah || 0;

  return (
    <div className="space-y-6">
      <ModuleHeader title="Distribusi Inventaris" tabs={tabs} />

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Distribusi Hari Ini</CardTitle>
            <Users className="h-4 w-4 text-blue-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-blue-600">{statistik.hariIni}</div>
            <p className="text-xs text-muted-foreground">Item didistribusikan</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Distribusi Bulan Ini</CardTitle>
            <TrendingUp className="h-4 w-4 text-green-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-green-600">{statistik.bulanIni}</div>
            <p className="text-xs text-muted-foreground">Item didistribusikan</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Penerima Aktif</CardTitle>
            <Package className="h-4 w-4 text-purple-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-purple-600">
              {statistik.penerimaAktif}
            </div>
            <p className="text-xs text-muted-foreground">Santri/Unit</p>
          </CardContent>
        </Card>
      </div>

      {/* Quick Actions */}
      <Card>
        <CardHeader>
          <CardTitle>Quick Actions</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex gap-4 flex-wrap">
            <Button
              className="flex items-center gap-2"
              onClick={() => {
                setShowForm(!showForm);
                if (showForm) resetForm();
              }}
            >
              <Plus className="h-4 w-4" />
              {showForm ? 'Batal' : 'Distribusi Single Item'}
            </Button>
            <Button
              variant="outline"
              onClick={() => navigate('/inventaris/distribution/distribusi-paket')}
            >
              <Box className="h-4 w-4 mr-2" />
              Distribusi Paket
            </Button>
            <Button
              variant="outline"
              onClick={() => navigate('/inventaris/distribution/master-paket')}
            >
              <Package className="h-4 w-4 mr-2" />
              Master Paket
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* View Detail Modal */}
      <Dialog open={showViewModal} onOpenChange={setShowViewModal}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Detail Distribusi</DialogTitle>
          </DialogHeader>
          {selectedDistribution && (
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label className="text-muted-foreground">Item</Label>
                  <p className="font-medium">{selectedDistribution.nama_barang}</p>
                </div>
                <div>
                  <Label className="text-muted-foreground">Kategori</Label>
                  <p className="font-medium">{selectedDistribution.kategori}</p>
                </div>
                <div>
                  <Label className="text-muted-foreground">Jumlah</Label>
                  <p className="font-medium">{selectedDistribution.jumlah} {selectedDistribution.kategori || 'pcs'}</p>
                </div>
                <div>
                  <Label className="text-muted-foreground">Tanggal</Label>
                  <p className="font-medium">{selectedDistribution.tanggal}</p>
                </div>
                <div>
                  <Label className="text-muted-foreground">Penerima</Label>
                  <p className="font-medium">{selectedDistribution.penerima}</p>
                  {selectedDistribution.penerima_santri_id_santri && (
                    <p className="text-sm text-muted-foreground mt-1">
                      ID Santri: {selectedDistribution.penerima_santri_id_santri}
                    </p>
                  )}
                </div>
                <div>
                  <Label className="text-muted-foreground">Tanggal Dibuat</Label>
                  <p className="font-medium text-sm">{new Date(selectedDistribution.created_at).toLocaleString('id-ID')}</p>
                </div>
              </div>
              {selectedDistribution.catatan && (
                <div>
                  <Label className="text-muted-foreground">Catatan</Label>
                  <p className="mt-1 text-sm bg-muted/50 p-3 rounded-md">{selectedDistribution.catatan}</p>
                </div>
              )}
              <div className="flex gap-2 pt-4 border-t">
                <Button variant="outline" onClick={() => setShowViewModal(false)} className="w-full">
                  Tutup
                </Button>
                <Button
                  variant="default"
                  onClick={() => {
                    setShowViewModal(false);
                    handleEditDistribution(selectedDistribution);
                  }}
                  className="w-full"
                >
                  <Edit className="h-4 w-4 mr-2" />
                  Edit Distribusi
                </Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation Modal */}
      {showDeleteConfirm && selectedDistribution && (
        <Dialog open={showDeleteConfirm} onOpenChange={setShowDeleteConfirm}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2 text-red-600">
                <AlertTriangle className="h-5 w-5" />
                Konfirmasi Hapus
              </DialogTitle>
            </DialogHeader>
            <div className="space-y-4">
              <p className="text-sm text-muted-foreground">
                Apakah Anda yakin ingin menghapus distribusi ini?
              </p>
              
              <div className="bg-muted/50 p-3 rounded-md">
                <p className="text-sm font-medium">{selectedDistribution.nama_barang}</p>
                <p className="text-xs text-muted-foreground">
                  Penerima: {selectedDistribution.penerima} • {selectedDistribution.tanggal}
                </p>
              </div>
              
              <div className="bg-red-50 border border-red-200 rounded-lg p-3">
                <p className="text-sm text-red-800">
                  <strong>Peringatan:</strong> Tindakan ini tidak dapat dibatalkan. 
                  Distribusi akan dihapus secara permanen dan stok akan dikembalikan.
                </p>
              </div>

              <div className="flex gap-2 pt-4">
                <Button
                  variant="destructive"
                  onClick={confirmDelete}
                  className="flex items-center gap-2"
                >
                  <AlertTriangle className="h-4 w-4" />
                  Ya, Hapus
                </Button>
                <Button variant="outline" onClick={() => {
                  setShowDeleteConfirm(false);
                  setSelectedDistribution(null);
                }}>
                  Batal
                </Button>
              </div>
            </div>
          </DialogContent>
        </Dialog>
      )}

      {/* Distribution Form */}
      {showForm && (
        <Card>
          <CardHeader>
            <CardTitle>{editingDistribution ? 'Edit Distribusi' : 'Form Distribusi Single Item'}</CardTitle>
          </CardHeader>
          <CardContent>
            <form onSubmit={editingDistribution ? handleUpdateDistribution : handleSubmit} className="space-y-4">
              {/* Mode Selection */}
              <div>
                <Label>Mode Distribusi</Label>
                <div className="flex gap-4 mt-2">
                  <Button
                    type="button"
                    variant={formData.mode === 'single' ? 'default' : 'outline'}
                    onClick={() => setFormData({ ...formData, mode: 'single' })}
                  >
                    Single Item
                  </Button>
                  <Button
                    type="button"
                    variant={formData.mode === 'paket' ? 'default' : 'outline'}
                    onClick={() => {
                      setFormData({ ...formData, mode: 'paket' });
                      navigate('/inventaris/distribution/distribusi-paket');
                    }}
                  >
                    Paket
                  </Button>
                </div>
              </div>

              {formData.mode === 'single' && (
                <>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <Label htmlFor="item_id">Pilih Item *</Label>
                      <Select
                        value={formData.item_id}
                        onValueChange={(value) =>
                          setFormData({ ...formData, item_id: value })
                        }
                      >
                        <SelectTrigger>
                          <SelectValue placeholder="Pilih item" />
                        </SelectTrigger>
                        <SelectContent>
                          {inventoryItems.map((item) => (
                            <SelectItem key={item.id} value={item.id}>
                              {item.nama_barang} (Stok: {item.jumlah || 0}{' '}
                              {item.satuan || 'pcs'})
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      {selectedItem && (
                        <p className="text-xs text-muted-foreground mt-1">
                          Stok tersedia: {stokTersedia} {selectedItem.satuan || 'pcs'}
                        </p>
                      )}
                    </div>

                    <div>
                      <Label htmlFor="jumlah">Jumlah *</Label>
                      <Input
                        id="jumlah"
                        type="number"
                        min="1"
                        value={formData.jumlah}
                        onChange={(e) =>
                          setFormData({ ...formData, jumlah: e.target.value })
                        }
                        placeholder="Masukkan jumlah"
                      />
                      {selectedItem && formData.jumlah && (
                        <p
                          className={`text-xs mt-1 ${
                            parseFloat(formData.jumlah) > stokTersedia
                              ? 'text-red-600'
                              : 'text-muted-foreground'
                          }`}
                        >
                          {parseFloat(formData.jumlah) > stokTersedia ? (
                            <span className="flex items-center gap-1">
                              <AlertTriangle className="h-3 w-3" />
                              Stok tidak mencukupi!
                            </span>
                          ) : (
                            `Sisa stok: ${stokTersedia - parseFloat(formData.jumlah)} ${selectedItem.satuan || 'pcs'}`
                          )}
                        </p>
                      )}
                    </div>

                    <div>
                      <Label htmlFor="santri_id">Santri (Opsional)</Label>
                      <Select
                        value={formData.santri_id}
                        onValueChange={handleSantriSelect}
                      >
                        <SelectTrigger>
                          <SelectValue placeholder="Pilih santri (opsional)" />
                        </SelectTrigger>
                        <SelectContent>
                          {santriList.map((santri) => (
                            <SelectItem key={santri.id} value={santri.id}>
                              {santri.id_santri} - {santri.nama_lengkap}
                              {santri.kategori && ` (${santri.kategori})`}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>

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

                    <div>
                      <Label htmlFor="tanggal">Tanggal Distribusi *</Label>
                      <Input
                        id="tanggal"
                        type="date"
                        value={formData.tanggal}
                        onChange={(e) =>
                          setFormData({ ...formData, tanggal: e.target.value })
                        }
                      />
                    </div>

                    <div className="md:col-span-2">
                      <Label htmlFor="catatan">Catatan</Label>
                      <Textarea
                        id="catatan"
                        value={formData.catatan}
                        onChange={(e) =>
                          setFormData({ ...formData, catatan: e.target.value })
                        }
                        placeholder="Catatan distribusi (opsional)"
                        rows={3}
                      />
                    </div>
                  </div>

                  <div className="flex gap-2">
                    <Button type="submit" disabled={submitting}>
                      {submitting 
                        ? 'Menyimpan...' 
                        : editingDistribution 
                          ? 'Update Distribusi' 
                          : 'Simpan Distribusi'}
                    </Button>
                    <Button
                      type="button"
                      variant="outline"
                      onClick={() => {
                        setShowForm(false);
                        setShowEditForm(false);
                        setEditingDistribution(null);
                        resetForm();
                      }}
                    >
                      Batal
                    </Button>
                  </div>
                </>
              )}
            </form>
          </CardContent>
        </Card>
      )}

      {/* Distribution List */}
      <Card>
        <CardHeader>
          <CardTitle>Riwayat Distribusi</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex gap-4 mb-4">
            <div className="flex-1">
              <Label htmlFor="search">Cari Distribusi</Label>
              <div className="relative">
                <Search className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                <Input
                  id="search"
                  placeholder="Cari item atau penerima..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-10"
                />
              </div>
            </div>
          </div>

          {loading ? (
            <div className="text-center py-8">Memuat data...</div>
          ) : filteredDistributions.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              <Users className="h-12 w-12 mx-auto mb-4 opacity-50" />
              <p>Tidak ada distribusi yang ditemukan</p>
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Item</TableHead>
                  <TableHead>Jumlah</TableHead>
                  <TableHead>Penerima</TableHead>
                  <TableHead>Tanggal</TableHead>
                  <TableHead>Catatan</TableHead>
                  <TableHead>Aksi</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredDistributions.map((dist) => (
                  <TableRow key={dist.id}>
                    <TableCell className="font-medium">{dist.nama_barang}</TableCell>
                    <TableCell>
                      {dist.jumlah} {dist.kategori || 'pcs'}
                    </TableCell>
                    <TableCell>
                      <div>
                        <div className="font-medium">{dist.penerima}</div>
                        {dist.penerima_santri_id_santri && (
                          <div className="text-sm text-muted-foreground">
                            ID Santri: {dist.penerima_santri_id_santri}
                          </div>
                        )}
                      </div>
                    </TableCell>
                    <TableCell>{dist.tanggal}</TableCell>
                    <TableCell className="text-muted-foreground">
                      {dist.catatan || '-'}
                    </TableCell>
                    <TableCell>
                      <div className="flex gap-2">
                        <Button
                          size="sm"
                          variant="outline"
                          title="Lihat Detail"
                          onClick={() => handleViewDistribution(dist)}
                        >
                          <Eye className="h-4 w-4" />
                        </Button>
                        <Button
                          size="sm"
                          variant="outline"
                          title="Edit Distribusi"
                          onClick={() => handleEditDistribution(dist)}
                        >
                          <Edit className="h-4 w-4" />
                        </Button>
                        <Button
                          size="sm"
                          variant="outline"
                          className="text-red-600 hover:text-red-700 hover:bg-red-50"
                          title="Hapus Distribusi"
                          onClick={() => handleDeleteDistribution(dist)}
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
    </div>
  );
};

export default DistribusiPage;

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
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Alert,
  AlertDescription,
  AlertTitle,
} from '@/components/ui/alert';
import {
  Package,
  Plus,
  Edit,
  Trash2,
  Search,
  AlertTriangle,
  CheckCircle,
  X,
} from 'lucide-react';
import { toast } from 'sonner';
import ModuleHeader from '@/components/ModuleHeader';
import {
  listPaketSembako,
  getPaketSembakoWithKomponen,
  createPaketSembako,
  updatePaketSembako,
  deletePaketSembako,
  replaceKomponenPaket,
  PaketSembakoWithKomponen,
  PaketKomponenWithStock,
} from '@/services/paketDistribusi.service';
import { listInventory, InventoryItem } from '@/services/inventaris.service';

const MasterPaketPage = () => {
  const [paketList, setPaketList] = useState<PaketSembakoWithKomponen[]>([]);
  const [inventoryItems, setInventoryItems] = useState<InventoryItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');

  // Dialog states
  const [showFormDialog, setShowFormDialog] = useState(false);
  const [showKomponenDialog, setShowKomponenDialog] = useState(false);
  const [editingPaket, setEditingPaket] = useState<string | null>(null);
  const [selectedPaket, setSelectedPaket] = useState<string | null>(null);

  // Form states
  const [formData, setFormData] = useState({
    nama_paket: '',
    deskripsi: '',
    nilai_paket: '',
  });

  const [komponenForm, setKomponenForm] = useState<
    Array<{ item_id: string; jumlah: number }>
  >([]);

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
      const [paketData, inventoryData] = await Promise.all([
        Promise.all(
          (await listPaketSembako(false)) // Hanya load paket aktif
            .map((p) => getPaketSembakoWithKomponen(p.id))
        ),
        listInventory({ page: 1, pageSize: 1000 }),
      ]);

      setPaketList(
        paketData.filter((p): p is PaketSembakoWithKomponen => p !== null && p.is_active)
      );
      setInventoryItems(inventoryData.data || []);
    } catch (error: any) {
      console.error('Error loading data:', error);
      toast.error('Gagal memuat data: ' + error.message);
    } finally {
      setLoading(false);
    }
  };

  // Filter paket (hanya aktif dan sesuai search term)
  const filteredPaket = paketList.filter(
    (p) =>
      p.is_active && // Pastikan hanya paket aktif
      (p.nama_paket.toLowerCase().includes(searchTerm.toLowerCase()) ||
        p.deskripsi?.toLowerCase().includes(searchTerm.toLowerCase()))
  );

  // Handle form
  const handleOpenForm = (paketId?: string) => {
    if (paketId) {
      const paket = paketList.find((p) => p.id === paketId);
      if (paket) {
        setEditingPaket(paketId);
        setFormData({
          nama_paket: paket.nama_paket,
          deskripsi: paket.deskripsi || '',
          nilai_paket: paket.nilai_paket?.toString() || '',
        });
      }
    } else {
      setEditingPaket(null);
      setFormData({
        nama_paket: '',
        deskripsi: '',
        nilai_paket: '',
      });
    }
    setShowFormDialog(true);
  };

  const handleSubmitForm = async () => {
    try {
      if (!formData.nama_paket.trim()) {
        toast.error('Nama paket harus diisi');
        return;
      }

      if (editingPaket) {
        await updatePaketSembako(editingPaket, {
          nama_paket: formData.nama_paket,
          deskripsi: formData.deskripsi || null,
          nilai_paket: formData.nilai_paket
            ? parseFloat(formData.nilai_paket)
            : null,
        });
        toast.success('Paket berhasil diperbarui');
      } else {
        await createPaketSembako({
          nama_paket: formData.nama_paket,
          deskripsi: formData.deskripsi || null,
          nilai_paket: formData.nilai_paket
            ? parseFloat(formData.nilai_paket)
            : null,
          is_active: true,
        });
        toast.success('Paket berhasil dibuat');
      }

      setShowFormDialog(false);
      loadData();
    } catch (error: any) {
      console.error('Error saving paket:', error);
      toast.error('Gagal menyimpan paket: ' + error.message);
    }
  };

  const handleDeletePaket = async (id: string) => {
    if (!confirm('Apakah Anda yakin ingin menghapus paket ini? Paket yang dihapus tidak akan muncul lagi di daftar.')) return;

    try {
      await deletePaketSembako(id);
      toast.success('Paket berhasil dihapus');
      
      // Remove dari state langsung untuk update UI yang lebih cepat
      setPaketList(paketList.filter((p) => p.id !== id));
      
      // Reload data untuk memastikan sinkronisasi
      await loadData();
    } catch (error: any) {
      console.error('Error deleting paket:', error);
      toast.error('Gagal menghapus paket: ' + error.message);
    }
  };

  // Handle komponen
  const handleOpenKomponenDialog = async (paketId: string) => {
    setSelectedPaket(paketId);
    const paket = await getPaketSembakoWithKomponen(paketId);
    if (paket) {
      setKomponenForm(
        paket.komponen.map((k) => ({
          item_id: k.item_id,
          jumlah: k.jumlah,
        }))
      );
    } else {
      setKomponenForm([]);
    }
    setShowKomponenDialog(true);
  };

  const handleAddKomponen = () => {
    setKomponenForm([...komponenForm, { item_id: '', jumlah: 1 }]);
  };

  const handleRemoveKomponen = (index: number) => {
    setKomponenForm(komponenForm.filter((_, i) => i !== index));
  };

  const handleUpdateKomponen = (
    index: number,
    field: 'item_id' | 'jumlah',
    value: string | number
  ) => {
    const updated = [...komponenForm];
    updated[index] = {
      ...updated[index],
      [field]: field === 'jumlah' ? Number(value) : value,
    };
    setKomponenForm(updated);
  };

  const handleSaveKomponen = async () => {
    if (!selectedPaket) return;

    try {
      // Validasi
      if (komponenForm.length === 0) {
        toast.error('Minimal harus ada 1 komponen');
        return;
      }

      const invalidKomponen = komponenForm.find(
        (k) => !k.item_id || k.jumlah <= 0
      );
      if (invalidKomponen) {
        toast.error('Semua komponen harus memiliki item dan jumlah > 0');
        return;
      }

      await replaceKomponenPaket(selectedPaket, komponenForm);
      toast.success('Komposisi paket berhasil disimpan');
      setShowKomponenDialog(false);
      loadData();
    } catch (error: any) {
      console.error('Error saving komponen:', error);
      toast.error('Gagal menyimpan komponen: ' + error.message);
    }
  };

  // Get komponen dengan stok info
  const getKomponenWithStock = (paket: PaketSembakoWithKomponen) => {
    return paket.komponen.map((k) => {
      const item = inventoryItems.find((i) => i.id === k.item_id);
      const stokTersedia = item?.jumlah || 0;
      const stokCukup = stokTersedia >= k.jumlah;
      const kurang = stokCukup ? 0 : k.jumlah - stokTersedia;

      return {
        ...k,
        stok_tersedia: stokTersedia,
        stok_cukup: stokCukup,
        kurang: kurang > 0 ? kurang : undefined,
        item_name: item?.nama_barang || 'Tidak diketahui',
        satuan: item?.satuan || '',
      };
    });
  };

  return (
    <div className="space-y-6">
      <ModuleHeader title="Master Paket Distribusi" tabs={tabs} />

      {/* Header Actions */}
      <div className="flex justify-between items-center">
        <div className="flex-1 max-w-md">
          <div className="relative">
            <Search className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Cari paket..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-10"
            />
          </div>
        </div>
        <Button onClick={() => handleOpenForm()}>
          <Plus className="h-4 w-4 mr-2" />
          Buat Paket Baru
        </Button>
      </div>

      {/* Paket List */}
      {loading ? (
        <div className="text-center py-8">Memuat data...</div>
      ) : filteredPaket.length === 0 ? (
        <Card>
          <CardContent className="py-8 text-center text-muted-foreground">
            <Package className="h-12 w-12 mx-auto mb-4 opacity-50" />
            <p>Tidak ada paket ditemukan</p>
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-4">
          {filteredPaket.map((paket) => {
            const komponenWithStock = getKomponenWithStock(paket);
            const semuaCukup = komponenWithStock.every((k) => k.stok_cukup);

            return (
              <Card key={paket.id}>
                <CardHeader>
                  <div className="flex justify-between items-start">
                    <div>
                      <CardTitle className="flex items-center gap-2">
                        {paket.nama_paket}
                        {paket.is_active ? (
                          <Badge variant="outline" className="text-green-600">
                            Aktif
                          </Badge>
                        ) : (
                          <Badge variant="outline" className="text-gray-500">
                            Non-Aktif
                          </Badge>
                        )}
                      </CardTitle>
                      {paket.deskripsi && (
                        <p className="text-sm text-muted-foreground mt-1">
                          {paket.deskripsi}
                        </p>
                      )}
                      {paket.nilai_paket && (
                        <p className="text-sm font-medium mt-1">
                          Nilai Paket: Rp{' '}
                          {paket.nilai_paket.toLocaleString('id-ID')}
                        </p>
                      )}
                    </div>
                    <div className="flex gap-2">
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => handleOpenKomponenDialog(paket.id)}
                      >
                        <Edit className="h-4 w-4 mr-2" />
                        Komposisi
                      </Button>
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => handleOpenForm(paket.id)}
                      >
                        <Edit className="h-4 w-4" />
                      </Button>
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => handleDeletePaket(paket.id)}
                        className="text-red-600"
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                </CardHeader>
                <CardContent>
                  {/* Stok Status Alert */}
                  {!semuaCukup && (
                    <Alert className="mb-4 border-yellow-500">
                      <AlertTriangle className="h-4 w-4 text-yellow-600" />
                      <AlertTitle>Stok Tidak Mencukupi</AlertTitle>
                      <AlertDescription>
                        Beberapa komponen paket memiliki stok yang tidak
                        mencukupi untuk distribusi.
                      </AlertDescription>
                    </Alert>
                  )}

                  {/* Komposisi Table */}
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Item</TableHead>
                        <TableHead>Jumlah</TableHead>
                        <TableHead>Stok Tersedia</TableHead>
                        <TableHead>Status</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {komponenWithStock.length === 0 ? (
                        <TableRow>
                          <TableCell colSpan={4} className="text-center">
                            Belum ada komponen
                          </TableCell>
                        </TableRow>
                      ) : (
                        komponenWithStock.map((k) => (
                          <TableRow key={k.id}>
                            <TableCell className="font-medium">
                              {k.item_name}
                            </TableCell>
                            <TableCell>
                              {k.jumlah} {k.satuan}
                            </TableCell>
                            <TableCell>
                              {k.stok_tersedia} {k.satuan}
                            </TableCell>
                            <TableCell>
                              {k.stok_cukup ? (
                                <Badge
                                  variant="outline"
                                  className="text-green-600"
                                >
                                  <CheckCircle className="h-3 w-3 mr-1" />
                                  Cukup
                                </Badge>
                              ) : (
                                <Badge
                                  variant="outline"
                                  className="text-red-600"
                                >
                                  <AlertTriangle className="h-3 w-3 mr-1" />
                                  Kurang {k.kurang} {k.satuan}
                                </Badge>
                              )}
                            </TableCell>
                          </TableRow>
                        ))
                      )}
                    </TableBody>
                  </Table>
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}

      {/* Form Dialog */}
      <Dialog open={showFormDialog} onOpenChange={setShowFormDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>
              {editingPaket ? 'Edit Paket' : 'Buat Paket Baru'}
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label htmlFor="nama_paket">Nama Paket *</Label>
              <Input
                id="nama_paket"
                value={formData.nama_paket}
                onChange={(e) =>
                  setFormData({ ...formData, nama_paket: e.target.value })
                }
                placeholder="Contoh: Paket Sembako Bulanan"
              />
            </div>
            <div>
              <Label htmlFor="deskripsi">Deskripsi</Label>
              <Textarea
                id="deskripsi"
                value={formData.deskripsi}
                onChange={(e) =>
                  setFormData({ ...formData, deskripsi: e.target.value })
                }
                placeholder="Deskripsi paket..."
                rows={3}
              />
            </div>
            <div>
              <Label htmlFor="nilai_paket">Nilai Paket (Rp)</Label>
              <Input
                id="nilai_paket"
                type="number"
                value={formData.nilai_paket}
                onChange={(e) =>
                  setFormData({ ...formData, nilai_paket: e.target.value })
                }
                placeholder="0"
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowFormDialog(false)}>
              Batal
            </Button>
            <Button onClick={handleSubmitForm}>Simpan</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Komponen Dialog */}
      <Dialog open={showKomponenDialog} onOpenChange={setShowKomponenDialog}>
        <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Komposisi Paket</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div className="flex justify-between items-center">
              <p className="text-sm text-muted-foreground">
                Tambahkan item dan jumlah untuk setiap komponen paket
              </p>
              <Button size="sm" onClick={handleAddKomponen}>
                <Plus className="h-4 w-4 mr-2" />
                Tambah Item
              </Button>
            </div>

            {komponenForm.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground">
                Belum ada komponen. Klik "Tambah Item" untuk menambahkan.
              </div>
            ) : (
              <div className="space-y-3">
                {komponenForm.map((komponen, index) => {
                  const item = inventoryItems.find(
                    (i) => i.id === komponen.item_id
                  );
                  const stokTersedia = item?.jumlah || 0;
                  const stokCukup = stokTersedia >= komponen.jumlah;
                  const kurang = stokCukup ? 0 : komponen.jumlah - stokTersedia;

                  return (
                    <Card key={index}>
                      <CardContent className="pt-4">
                        <div className="grid grid-cols-12 gap-4 items-start">
                          <div className="col-span-5">
                            <Label>Item *</Label>
                            <Select
                              value={komponen.item_id}
                              onValueChange={(value) =>
                                handleUpdateKomponen(index, 'item_id', value)
                              }
                            >
                              <SelectTrigger>
                                <SelectValue placeholder="Pilih item" />
                              </SelectTrigger>
                              <SelectContent>
                                {inventoryItems.map((item) => (
                                  <SelectItem key={item.id} value={item.id}>
                                    {item.nama_barang} (Stok: {item.jumlah}{' '}
                                    {item.satuan || 'pcs'})
                                  </SelectItem>
                                ))}
                              </SelectContent>
                            </Select>
                          </div>
                          <div className="col-span-3">
                            <Label>Jumlah *</Label>
                            <Input
                              type="number"
                              min="1"
                              value={komponen.jumlah}
                              onChange={(e) =>
                                handleUpdateKomponen(
                                  index,
                                  'jumlah',
                                  e.target.value
                                )
                              }
                            />
                          </div>
                          <div className="col-span-3">
                            <Label>Stok Tersedia</Label>
                            <div className="flex items-center gap-2 mt-2">
                              {stokCukup ? (
                                <Badge
                                  variant="outline"
                                  className="text-green-600"
                                >
                                  <CheckCircle className="h-3 w-3 mr-1" />
                                  {stokTersedia} {item?.satuan || 'pcs'}
                                </Badge>
                              ) : (
                                <Badge
                                  variant="outline"
                                  className="text-red-600"
                                >
                                  <AlertTriangle className="h-3 w-3 mr-1" />
                                  Kurang {kurang} {item?.satuan || 'pcs'}
                                </Badge>
                              )}
                            </div>
                          </div>
                          <div className="col-span-1 flex justify-end">
                            <Button
                              size="sm"
                              variant="ghost"
                              onClick={() => handleRemoveKomponen(index)}
                            >
                              <X className="h-4 w-4" />
                            </Button>
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  );
                })}
              </div>
            )}
          </div>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setShowKomponenDialog(false)}
            >
              Batal
            </Button>
            <Button onClick={handleSaveKomponen}>Simpan Komposisi</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default MasterPaketPage;


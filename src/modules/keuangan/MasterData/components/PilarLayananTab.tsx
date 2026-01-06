import React, { useState, useEffect } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
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
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import {
  Plus,
  Edit,
  Trash2,
  MoreVertical,
  Loader2,
  Search,
  CheckCircle2,
  XCircle,
  AlertTriangle,
} from 'lucide-react';
import { toast } from 'sonner';
import { MasterDataKeuanganService, type MasterPilarLayanan } from '@/services/masterDataKeuangan.service';

const PilarLayananTab: React.FC = () => {
  const queryClient = useQueryClient();
  const [searchQuery, setSearchQuery] = useState('');
  const [filterAktif, setFilterAktif] = useState<'all' | 'aktif' | 'nonaktif'>('all');
  const [showFormDialog, setShowFormDialog] = useState(false);
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);
  const [editingPilar, setEditingPilar] = useState<MasterPilarLayanan | null>(null);
  const [deletingPilar, setDeletingPilar] = useState<MasterPilarLayanan | null>(null);
  const [usageInfo, setUsageInfo] = useState<{
    ledger_layanan_santri: number;
    rancangan_anggaran: number;
    kategori_pengeluaran: number;
    sub_kategori_pengeluaran: number;
  } | null>(null);

  // Form state
  const [formData, setFormData] = useState({
    kode: '',
    nama: '',
    deskripsi: '',
    urutan: 0,
    warna_badge: '',
  });

  // Fetch pilar layanan
  const {
    data: pilarList,
    isLoading,
    refetch,
  } = useQuery({
    queryKey: ['master-pilar-layanan', filterAktif],
    queryFn: () => MasterDataKeuanganService.getPilarLayanan(filterAktif !== 'all'),
  });

  // Filtered data
  const filteredPilar = React.useMemo(() => {
    if (!pilarList) return [];
    let filtered = pilarList;

    if (searchQuery) {
      filtered = filtered.filter(
        (p) =>
          p.nama.toLowerCase().includes(searchQuery.toLowerCase()) ||
          p.kode.toLowerCase().includes(searchQuery.toLowerCase())
      );
    }

    if (filterAktif === 'aktif') {
      filtered = filtered.filter((p) => p.aktif);
    } else if (filterAktif === 'nonaktif') {
      filtered = filtered.filter((p) => !p.aktif);
    }

    return filtered;
  }, [pilarList, searchQuery, filterAktif]);

  // Reset form
  const resetForm = () => {
    setFormData({
      kode: '',
      nama: '',
      deskripsi: '',
      urutan: 0,
      warna_badge: '',
    });
    setEditingPilar(null);
  };

  // Open form dialog
  const handleOpenForm = (pilar?: MasterPilarLayanan) => {
    if (pilar) {
      setEditingPilar(pilar);
      setFormData({
        kode: pilar.kode,
        nama: pilar.nama,
        deskripsi: pilar.deskripsi || '',
        urutan: pilar.urutan,
        warna_badge: pilar.warna_badge || '',
      });
    } else {
      resetForm();
    }
    setShowFormDialog(true);
  };

  // Save pilar
  const handleSave = async () => {
    if (!formData.nama.trim()) {
      toast.error('Nama pilar layanan wajib diisi');
      return;
    }

    if (!formData.kode.trim() && !editingPilar) {
      toast.error('Kode pilar layanan wajib diisi');
      return;
    }

    try {
      if (editingPilar) {
        // Update
        await MasterDataKeuanganService.updatePilarLayanan(editingPilar.id, {
          nama: formData.nama,
          deskripsi: formData.deskripsi || undefined,
          urutan: formData.urutan,
          warna_badge: formData.warna_badge || undefined,
        });
        toast.success('Pilar layanan berhasil diperbarui');
      } else {
        // Create
        const kode = formData.kode.trim().toLowerCase().replace(/\s+/g, '_');
        await MasterDataKeuanganService.createPilarLayanan({
          kode,
          nama: formData.nama,
          deskripsi: formData.deskripsi || undefined,
          urutan: formData.urutan,
          warna_badge: formData.warna_badge || undefined,
        });
        toast.success('Pilar layanan berhasil dibuat');
      }

      setShowFormDialog(false);
      resetForm();
      refetch();
      queryClient.invalidateQueries({ queryKey: ['master-pilar-layanan'] });
    } catch (error: any) {
      console.error('Error saving pilar:', error);
      toast.error(error.message || 'Gagal menyimpan pilar layanan');
    }
  };

  // Toggle aktif
  const handleToggleAktif = async (pilar: MasterPilarLayanan) => {
    try {
      await MasterDataKeuanganService.updatePilarLayanan(pilar.id, {
        aktif: !pilar.aktif,
      });
      toast.success(`Pilar layanan ${!pilar.aktif ? 'diaktifkan' : 'dinonaktifkan'}`);
      refetch();
      queryClient.invalidateQueries({ queryKey: ['master-pilar-layanan'] });
    } catch (error: any) {
      console.error('Error toggling aktif:', error);
      toast.error(error.message || 'Gagal mengubah status pilar layanan');
    }
  };

  // Check usage before delete
  const handleDeleteClick = async (pilar: MasterPilarLayanan) => {
    try {
      const usage = await MasterDataKeuanganService.checkPilarLayananUsage(pilar.kode);
      setUsageInfo(usage);
      setDeletingPilar(pilar);
      setShowDeleteDialog(true);
    } catch (error: any) {
      console.error('Error checking usage:', error);
      toast.error('Gagal memeriksa penggunaan pilar layanan');
    }
  };

  // Delete pilar
  const handleDelete = async () => {
    if (!deletingPilar) return;

    if (usageInfo && Object.values(usageInfo).some((v) => v > 0)) {
      toast.error('Pilar layanan tidak dapat dihapus karena masih digunakan');
      setShowDeleteDialog(false);
      setDeletingPilar(null);
      setUsageInfo(null);
      return;
    }

    try {
      await MasterDataKeuanganService.deletePilarLayanan(deletingPilar.id);
      toast.success('Pilar layanan berhasil dihapus');
      setShowDeleteDialog(false);
      setDeletingPilar(null);
      setUsageInfo(null);
      refetch();
      queryClient.invalidateQueries({ queryKey: ['master-pilar-layanan'] });
    } catch (error: any) {
      console.error('Error deleting pilar:', error);
      toast.error(error.message || 'Gagal menghapus pilar layanan');
    }
  };

  return (
    <div className="space-y-4">
      {/* Toolbar */}
      <div className="flex items-center justify-between gap-4">
        <div className="flex items-center gap-2 flex-1 max-w-md">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Cari pilar layanan..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-9"
            />
          </div>
          <select
            value={filterAktif}
            onChange={(e) => setFilterAktif(e.target.value as any)}
            className="h-10 rounded-md border border-input bg-background px-3 py-2 text-sm"
          >
            <option value="all">Semua</option>
            <option value="aktif">Aktif</option>
            <option value="nonaktif">Non-Aktif</option>
          </select>
        </div>
        <Button onClick={() => handleOpenForm()} className="flex items-center gap-2">
          <Plus className="h-4 w-4" />
          Tambah Pilar
        </Button>
      </div>

      {/* Table */}
      <Card>
        <CardContent className="p-0">
          {isLoading ? (
            <div className="flex items-center justify-center py-12">
              <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
            </div>
          ) : filteredPilar.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-12 text-center">
              <Layers className="h-12 w-12 text-muted-foreground mb-4" />
              <p className="text-muted-foreground">
                {searchQuery ? 'Tidak ada pilar layanan yang sesuai dengan pencarian' : 'Belum ada pilar layanan'}
              </p>
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="w-12">No</TableHead>
                  <TableHead>Kode</TableHead>
                  <TableHead>Nama</TableHead>
                  <TableHead>Deskripsi</TableHead>
                  <TableHead className="w-24">Urutan</TableHead>
                  <TableHead className="w-24">Status</TableHead>
                  <TableHead className="w-24 text-right">Aksi</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredPilar.map((pilar, index) => (
                  <TableRow key={pilar.id}>
                    <TableCell className="text-muted-foreground">{index + 1}</TableCell>
                    <TableCell>
                      <code className="text-xs bg-muted px-2 py-1 rounded">{pilar.kode}</code>
                    </TableCell>
                    <TableCell className="font-medium">{pilar.nama}</TableCell>
                    <TableCell className="text-muted-foreground text-sm">
                      {pilar.deskripsi || '-'}
                    </TableCell>
                    <TableCell>{pilar.urutan}</TableCell>
                    <TableCell>
                      {pilar.aktif ? (
                        <Badge variant="default" className="bg-green-500">
                          <CheckCircle2 className="h-3 w-3 mr-1" />
                          Aktif
                        </Badge>
                      ) : (
                        <Badge variant="secondary">
                          <XCircle className="h-3 w-3 mr-1" />
                          Non-Aktif
                        </Badge>
                      )}
                    </TableCell>
                    <TableCell className="text-right">
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button variant="ghost" size="sm">
                            <MoreVertical className="h-4 w-4" />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                          <DropdownMenuItem onClick={() => handleOpenForm(pilar)}>
                            <Edit className="h-4 w-4 mr-2" />
                            Edit
                          </DropdownMenuItem>
                          <DropdownMenuItem onClick={() => handleToggleAktif(pilar)}>
                            {pilar.aktif ? (
                              <>
                                <XCircle className="h-4 w-4 mr-2" />
                                Nonaktifkan
                              </>
                            ) : (
                              <>
                                <CheckCircle2 className="h-4 w-4 mr-2" />
                                Aktifkan
                              </>
                            )}
                          </DropdownMenuItem>
                          <DropdownMenuItem
                            onClick={() => handleDeleteClick(pilar)}
                            className="text-red-600 focus:text-red-600"
                          >
                            <Trash2 className="h-4 w-4 mr-2" />
                            Hapus
                          </DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
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
            <DialogTitle>
              {editingPilar ? 'Edit Pilar Layanan' : 'Tambah Pilar Layanan'}
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="kode">
                Kode <span className="text-red-500">*</span>
              </Label>
              <Input
                id="kode"
                value={formData.kode}
                onChange={(e) => setFormData({ ...formData, kode: e.target.value })}
                placeholder="pendidikan_formal"
                disabled={!!editingPilar}
                className="font-mono"
              />
              {!editingPilar && (
                <p className="text-xs text-muted-foreground">
                  Format: lowercase, underscore, no spaces (contoh: pendidikan_formal)
                </p>
              )}
              {editingPilar && (
                <p className="text-xs text-muted-foreground">
                  Kode tidak dapat diubah setelah dibuat
                </p>
              )}
            </div>
            <div className="space-y-2">
              <Label htmlFor="nama">
                Nama <span className="text-red-500">*</span>
              </Label>
              <Input
                id="nama"
                value={formData.nama}
                onChange={(e) => setFormData({ ...formData, nama: e.target.value })}
                placeholder="Pendidikan Formal"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="deskripsi">Deskripsi</Label>
              <Textarea
                id="deskripsi"
                value={formData.deskripsi}
                onChange={(e) => setFormData({ ...formData, deskripsi: e.target.value })}
                placeholder="Deskripsi pilar layanan..."
                rows={3}
              />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="urutan">Urutan</Label>
                <Input
                  id="urutan"
                  type="number"
                  value={formData.urutan}
                  onChange={(e) =>
                    setFormData({ ...formData, urutan: parseInt(e.target.value) || 0 })
                  }
                  min={0}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="warna_badge">Warna Badge (optional)</Label>
                <Input
                  id="warna_badge"
                  value={formData.warna_badge}
                  onChange={(e) => setFormData({ ...formData, warna_badge: e.target.value })}
                  placeholder="bg-blue-500"
                />
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowFormDialog(false)}>
              Batal
            </Button>
            <Button onClick={handleSave}>
              {editingPilar ? 'Simpan Perubahan' : 'Buat Pilar'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation Dialog */}
      <AlertDialog open={showDeleteDialog} onOpenChange={setShowDeleteDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Hapus Pilar Layanan?</AlertDialogTitle>
            <AlertDialogDescription>
              {usageInfo && Object.values(usageInfo).some((v) => v > 0) ? (
                <div className="space-y-2 mt-2">
                  <div className="flex items-start gap-2 text-amber-600">
                    <AlertTriangle className="h-4 w-4 mt-0.5" />
                    <div>
                      <p className="font-medium">Pilar ini tidak dapat dihapus karena sudah memiliki riwayat:</p>
                      <ul className="list-disc list-inside mt-2 space-y-1">
                        {usageInfo.ledger_layanan_santri > 0 && (
                          <li>{usageInfo.ledger_layanan_santri} transaksi di ledger_layanan_santri</li>
                        )}
                        {usageInfo.rancangan_anggaran > 0 && (
                          <li>{usageInfo.rancangan_anggaran} rancangan anggaran</li>
                        )}
                        {usageInfo.kategori_pengeluaran > 0 && (
                          <li>{usageInfo.kategori_pengeluaran} kategori pengeluaran terhubung</li>
                        )}
                        {usageInfo.sub_kategori_pengeluaran > 0 && (
                          <li>{usageInfo.sub_kategori_pengeluaran} sub kategori pengeluaran terhubung</li>
                        )}
                      </ul>
                      <p className="mt-2 text-sm">Gunakan toggle aktif untuk menonaktifkan pilar ini.</p>
                    </div>
                  </div>
                </div>
              ) : (
                <p>
                  Apakah Anda yakin ingin menghapus pilar layanan "{deletingPilar?.nama}"? Tindakan
                  ini tidak dapat dibatalkan.
                </p>
              )}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Batal</AlertDialogCancel>
            {usageInfo && Object.values(usageInfo).some((v) => v > 0) ? (
              <AlertDialogAction onClick={() => setShowDeleteDialog(false)}>
                Tutup
              </AlertDialogAction>
            ) : (
              <AlertDialogAction onClick={handleDelete} className="bg-red-600 hover:bg-red-700">
                Hapus
              </AlertDialogAction>
            )}
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
};

export default PilarLayananTab;


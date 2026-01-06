import React, { useState, useEffect } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
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
  Users,
  Tag,
  ChevronRight,
} from 'lucide-react';
import { toast } from 'sonner';
import { supabase } from '@/integrations/supabase/client';
import {
  MasterDataKeuanganService,
  type MasterKategoriPengeluaran,
  type MasterSubKategoriPengeluaran,
  type MasterPilarLayanan,
} from '@/services/masterDataKeuangan.service';
import MappingSantriDialog from './MappingSantriDialog';

// Wrapper untuk MappingSantriDialog dengan async initial data
const MappingSantriDialogWrapper: React.FC<{
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSave: (data: {
    tipe_alokasi: 'tidak_dialokasikan' | 'seluruh_binaan_mukim' | 'pilih_santri';
    deskripsi?: string;
    santri_ids?: string[];
  }) => Promise<void>;
  mappingTarget: { type: 'kategori' | 'sub_kategori'; id: string; nama: string };
}> = ({ open, onOpenChange, onSave, mappingTarget }) => {
  const [initialData, setInitialData] = useState<any>(undefined);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (open && mappingTarget) {
      setLoading(true);
      (async () => {
        try {
          const mapping =
            mappingTarget.type === 'kategori'
              ? await MasterDataKeuanganService.getSantriMappingByKategori(mappingTarget.id)
              : await MasterDataKeuanganService.getSantriMappingBySubKategori(mappingTarget.id);
          if (mapping) {
            setInitialData({
              tipe_alokasi: mapping.tipe_alokasi,
              deskripsi: mapping.deskripsi,
              santri_list: mapping.santri_list,
            });
          } else {
            setInitialData(undefined);
          }
        } catch (error) {
          console.error('Error loading mapping:', error);
          setInitialData(undefined);
        } finally {
          setLoading(false);
        }
      })();
    } else {
      setInitialData(undefined);
    }
  }, [open, mappingTarget]);

  if (loading) {
    return (
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="sr-only">Memuat data mapping</DialogTitle>
          </DialogHeader>
          <div className="flex items-center justify-center py-8">
            <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
          </div>
        </DialogContent>
      </Dialog>
    );
  }

  return (
    <MappingSantriDialog
      open={open}
      onOpenChange={onOpenChange}
      onSave={onSave}
      title={`Mapping Santri - ${mappingTarget.nama}`}
      isSubKategori={mappingTarget.type === 'sub_kategori'}
      initialData={initialData}
    />
  );
};

const KategoriPengeluaranTab: React.FC = () => {
  const queryClient = useQueryClient();
  const [searchQuery, setSearchQuery] = useState('');
  const [filterJenis, setFilterJenis] = useState<'all' | 'Pemasukan' | 'Pengeluaran'>('all');
  const [filterAktif, setFilterAktif] = useState<'all' | 'aktif' | 'nonaktif'>('all');
  const [showKategoriForm, setShowKategoriForm] = useState(false);
  const [showSubKategoriForm, setShowSubKategoriForm] = useState(false);
  const [showMappingDialog, setShowMappingDialog] = useState(false);
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);
  const [editingKategori, setEditingKategori] = useState<MasterKategoriPengeluaran | null>(null);
  const [editingSubKategori, setEditingSubKategori] = useState<{
    kategori: MasterKategoriPengeluaran;
    subKategori?: MasterSubKategoriPengeluaran;
  } | null>(null);
  const [mappingTarget, setMappingTarget] = useState<{
    type: 'kategori' | 'sub_kategori';
    id: string;
    nama: string;
  } | null>(null);
  const [deletingItem, setDeletingItem] = useState<{
    type: 'kategori' | 'sub_kategori';
    id: string;
    nama: string;
  } | null>(null);
  const [usageCount, setUsageCount] = useState<number | null>(null);
  const [expandedKategori, setExpandedKategori] = useState<Set<string>>(new Set());

  // Form state
  const [kategoriForm, setKategoriForm] = useState({
    nama: '',
    jenis: 'Pengeluaran' as 'Pemasukan' | 'Pengeluaran',
    pilar_layanan_kode: '',
    deskripsi: '',
    urutan: 0,
  });

  const [subKategoriForm, setSubKategoriForm] = useState({
    nama: '',
    pilar_layanan_kode: '',
    deskripsi: '',
    urutan: 0,
  });

  // Fetch data
  const {
    data: kategoriList,
    isLoading,
    refetch,
  } = useQuery({
    queryKey: ['master-kategori-pengeluaran', filterJenis, filterAktif],
    queryFn: () =>
      MasterDataKeuanganService.getKategoriPengeluaran({
        jenis: filterJenis !== 'all' ? filterJenis : undefined,
        aktifOnly: filterAktif === 'aktif',
      }),
  });

  const { data: pilarList } = useQuery({
    queryKey: ['master-pilar-layanan', true],
    queryFn: () => MasterDataKeuanganService.getPilarLayanan(true),
  });

  // Fetch sub kategori count untuk semua kategori
  const allKategoriIds = React.useMemo(() => {
    return kategoriList?.map(k => k.id) || [];
  }, [kategoriList]);

  const subKategoriCountQuery = useQuery({
    queryKey: ['master-sub-kategori-count', allKategoriIds],
    queryFn: () => MasterDataKeuanganService.getSubKategoriCountByKategori(allKategoriIds),
    enabled: allKategoriIds.length > 0,
  });

  // Fetch sub kategori untuk kategori yang expanded
  const expandedKategoriIds = Array.from(expandedKategori);
  const subKategoriQueries = useQuery({
    queryKey: ['master-sub-kategori', expandedKategoriIds],
    queryFn: async () => {
      const results: Record<string, MasterSubKategoriPengeluaran[]> = {};
      for (const kategoriId of expandedKategoriIds) {
        const subKategori = await MasterDataKeuanganService.getSubKategoriByKategori(kategoriId);
        results[kategoriId] = subKategori;
      }
      return results;
    },
    enabled: expandedKategoriIds.length > 0,
  });

  // Filtered data
  const filteredKategori = React.useMemo(() => {
    if (!kategoriList) return [];
    let filtered = kategoriList;

    if (searchQuery) {
      filtered = filtered.filter((k) =>
        k.nama.toLowerCase().includes(searchQuery.toLowerCase())
      );
    }

    return filtered;
  }, [kategoriList, searchQuery]);

  // Reset form
  const resetKategoriForm = () => {
    setKategoriForm({
      nama: '',
      jenis: 'Pengeluaran',
      pilar_layanan_kode: '',
      deskripsi: '',
      urutan: 0,
    });
    setEditingKategori(null);
  };

  const resetSubKategoriForm = () => {
    setSubKategoriForm({
      nama: '',
      pilar_layanan_kode: '',
      deskripsi: '',
      urutan: 0,
    });
    setEditingSubKategori(null);
  };

  // Open kategori form
  const handleOpenKategoriForm = (kategori?: MasterKategoriPengeluaran) => {
    if (kategori) {
      setEditingKategori(kategori);
      setKategoriForm({
        nama: kategori.nama,
        jenis: kategori.jenis,
        pilar_layanan_kode: kategori.pilar_layanan_kode || '',
        deskripsi: kategori.deskripsi || '',
        urutan: kategori.urutan,
      });
    } else {
      resetKategoriForm();
    }
    setShowKategoriForm(true);
  };

  // Open sub kategori form
  const handleOpenSubKategoriForm = (
    kategori: MasterKategoriPengeluaran,
    subKategori?: MasterSubKategoriPengeluaran
  ) => {
    setEditingSubKategori({
      kategori,
      subKategori,
    });
    if (subKategori) {
      setSubKategoriForm({
        nama: subKategori.nama,
        pilar_layanan_kode: subKategori.pilar_layanan_kode || '',
        deskripsi: subKategori.deskripsi || '',
        urutan: subKategori.urutan,
      });
    } else {
      setSubKategoriForm({
        nama: '',
        pilar_layanan_kode: kategori.pilar_layanan_kode || '',
        deskripsi: '',
        urutan: 0,
      });
    }
    setShowSubKategoriForm(true);
  };

  // Save kategori
  const handleSaveKategori = async () => {
    if (!kategoriForm.nama.trim()) {
      toast.error('Nama kategori wajib diisi');
      return;
    }

    try {
      if (editingKategori) {
        await MasterDataKeuanganService.updateKategoriPengeluaran(editingKategori.id, {
          nama: kategoriForm.nama,
          pilar_layanan_kode: kategoriForm.pilar_layanan_kode || undefined,
          deskripsi: kategoriForm.deskripsi || undefined,
          urutan: kategoriForm.urutan,
        });
        toast.success('Kategori berhasil diperbarui');
      } else {
        await MasterDataKeuanganService.createKategoriPengeluaran({
          nama: kategoriForm.nama,
          jenis: kategoriForm.jenis,
          pilar_layanan_kode: kategoriForm.pilar_layanan_kode || undefined,
          deskripsi: kategoriForm.deskripsi || undefined,
          urutan: kategoriForm.urutan,
        });
        toast.success('Kategori berhasil dibuat');
      }

      setShowKategoriForm(false);
      resetKategoriForm();
      refetch();
      queryClient.invalidateQueries({ queryKey: ['master-kategori-pengeluaran'] });
    } catch (error: any) {
      console.error('Error saving kategori:', error);
      toast.error(error.message || 'Gagal menyimpan kategori');
    }
  };

  // Save sub kategori
  const handleSaveSubKategori = async () => {
    if (!subKategoriForm.nama.trim()) {
      toast.error('Nama sub kategori wajib diisi');
      return;
    }

    if (!editingSubKategori) return;

    try {
      if (editingSubKategori.subKategori) {
        await MasterDataKeuanganService.updateSubKategori(
          editingSubKategori.subKategori.id,
          {
            nama: subKategoriForm.nama,
            pilar_layanan_kode: subKategoriForm.pilar_layanan_kode || undefined,
            deskripsi: subKategoriForm.deskripsi || undefined,
            urutan: subKategoriForm.urutan,
          }
        );
        toast.success('Sub kategori berhasil diperbarui');
      } else {
        await MasterDataKeuanganService.createSubKategori({
          kategori_id: editingSubKategori.kategori.id,
          nama: subKategoriForm.nama,
          pilar_layanan_kode: subKategoriForm.pilar_layanan_kode || undefined,
          deskripsi: subKategoriForm.deskripsi || undefined,
          urutan: subKategoriForm.urutan,
        });
        toast.success('Sub kategori berhasil dibuat');
      }

      setShowSubKategoriForm(false);
      resetSubKategoriForm();
      subKategoriQueries.refetch();
      queryClient.invalidateQueries({ queryKey: ['master-sub-kategori'] });
    } catch (error: any) {
      console.error('Error saving sub kategori:', error);
      toast.error(error.message || 'Gagal menyimpan sub kategori');
    }
  };

  // Toggle aktif
  const handleToggleAktif = async (
    type: 'kategori' | 'sub_kategori',
    id: string,
    currentAktif: boolean
  ) => {
    try {
      if (type === 'kategori') {
        await MasterDataKeuanganService.updateKategoriPengeluaran(id, {
          aktif: !currentAktif,
        });
      } else {
        await MasterDataKeuanganService.updateSubKategori(id, {
          aktif: !currentAktif,
        });
      }
      toast.success(`${type === 'kategori' ? 'Kategori' : 'Sub kategori'} ${!currentAktif ? 'diaktifkan' : 'dinonaktifkan'}`);
      refetch();
      subKategoriQueries.refetch();
      queryClient.invalidateQueries({ queryKey: ['master-kategori-pengeluaran'] });
      queryClient.invalidateQueries({ queryKey: ['master-sub-kategori'] });
    } catch (error: any) {
      console.error('Error toggling aktif:', error);
      toast.error(error.message || 'Gagal mengubah status');
    }
  };

  // Open mapping dialog
  const handleOpenMapping = async (
    type: 'kategori' | 'sub_kategori',
    id: string,
    nama: string
  ) => {
    setMappingTarget({ type, id, nama });
    setShowMappingDialog(true);
  };

  // Save mapping
  const handleSaveMapping = async (data: {
    tipe_alokasi: 'tidak_dialokasikan' | 'seluruh_binaan_mukim' | 'pilih_santri';
    deskripsi?: string;
    santri_ids?: string[];
  }) => {
    if (!mappingTarget) return;

    try {
      if (mappingTarget.type === 'kategori') {
        await MasterDataKeuanganService.saveKategoriSantriMapping({
          kategori_id: mappingTarget.id,
          ...data,
        });
      } else {
        await MasterDataKeuanganService.saveSubKategoriSantriMapping({
          sub_kategori_id: mappingTarget.id,
          ...data,
        });
      }
      toast.success('Mapping santri berhasil disimpan');
      refetch();
      subKategoriQueries.refetch();
      queryClient.invalidateQueries({ queryKey: ['master-kategori-pengeluaran'] });
      queryClient.invalidateQueries({ queryKey: ['master-sub-kategori'] });
    } catch (error: any) {
      console.error('Error saving mapping:', error);
      throw error;
    }
  };


  // Check usage before delete
  const handleDeleteClick = async (
    type: 'kategori' | 'sub_kategori',
    id: string,
    nama: string
  ) => {
    try {
      if (type === 'kategori') {
        const count = await MasterDataKeuanganService.checkKategoriUsage(id);
        setUsageCount(count);
      } else {
        // Untuk sub kategori, cek di keuangan table dengan sub_kategori
        const { count } = await supabase
          .from('keuangan')
          .select('*', { count: 'exact', head: true })
          .eq('sub_kategori', id);
        setUsageCount(count || 0);
      }
      setDeletingItem({ type, id, nama });
      setShowDeleteDialog(true);
    } catch (error: any) {
      console.error('Error checking usage:', error);
      toast.error('Gagal memeriksa penggunaan');
    }
  };

  // Delete item
  const handleDelete = async () => {
    if (!deletingItem) return;

    if (usageCount && usageCount > 0) {
      toast.error(`${deletingItem.type === 'kategori' ? 'Kategori' : 'Sub kategori'} tidak dapat dihapus karena sudah memiliki ${usageCount} transaksi`);
      setShowDeleteDialog(false);
      setDeletingItem(null);
      setUsageCount(null);
      return;
    }

    try {
      if (deletingItem.type === 'kategori') {
        await MasterDataKeuanganService.deleteKategoriPengeluaran(deletingItem.id);
      } else {
        await MasterDataKeuanganService.deleteSubKategori(deletingItem.id);
      }
      toast.success(`${deletingItem.type === 'kategori' ? 'Kategori' : 'Sub kategori'} berhasil dihapus`);
      setShowDeleteDialog(false);
      setDeletingItem(null);
      setUsageCount(null);
      refetch();
      subKategoriQueries.refetch();
      queryClient.invalidateQueries({ queryKey: ['master-kategori-pengeluaran'] });
      queryClient.invalidateQueries({ queryKey: ['master-sub-kategori'] });
    } catch (error: any) {
      console.error('Error deleting:', error);
      toast.error(error.message || 'Gagal menghapus');
    }
  };

  // Toggle expand kategori
  const handleToggleExpand = (kategoriId: string) => {
    const newExpanded = new Set(expandedKategori);
    if (newExpanded.has(kategoriId)) {
      newExpanded.delete(kategoriId);
    } else {
      newExpanded.add(kategoriId);
    }
    setExpandedKategori(newExpanded);
  };

  return (
    <div className="space-y-4">
      {/* Toolbar */}
      <div className="flex items-center justify-between gap-4">
        <div className="flex items-center gap-2 flex-1 max-w-md">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Cari kategori..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-9"
            />
          </div>
          <select
            value={filterJenis}
            onChange={(e) => setFilterJenis(e.target.value as any)}
            className="h-10 rounded-md border border-input bg-background px-3 py-2 text-sm"
          >
            <option value="all">Semua Jenis</option>
            <option value="Pemasukan">Pemasukan</option>
            <option value="Pengeluaran">Pengeluaran</option>
          </select>
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
        <Button onClick={() => handleOpenKategoriForm()} className="flex items-center gap-2">
          <Plus className="h-4 w-4" />
          Tambah Kategori
        </Button>
      </div>

      {/* Table */}
      <Card>
        <CardContent className="p-0">
          {isLoading ? (
            <div className="flex items-center justify-center py-12">
              <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
            </div>
          ) : filteredKategori.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-12 text-center">
              <Tag className="h-12 w-12 text-muted-foreground mb-4" />
              <p className="text-muted-foreground">
                {searchQuery ? 'Tidak ada kategori yang sesuai dengan pencarian' : 'Belum ada kategori pengeluaran'}
              </p>
            </div>
          ) : (
            <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="w-12"></TableHead>
                    <TableHead className="w-12">No</TableHead>
                    <TableHead>Nama Kategori</TableHead>
                    <TableHead>Jenis</TableHead>
                    <TableHead>Pilar Layanan</TableHead>
                    <TableHead>Sub Kategori</TableHead>
                    <TableHead className="w-24">Status</TableHead>
                    <TableHead className="w-32 text-right">Aksi</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredKategori.map((kategori, index) => {
                    const isExpanded = expandedKategori.has(kategori.id);
                    const subKategoriList = subKategoriQueries.data?.[kategori.id] || [];
                    const subKategoriCount = subKategoriCountQuery.data?.[kategori.id] || 0;

                    return (
                      <React.Fragment key={kategori.id}>
                        <TableRow>
                          <TableCell>
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => handleToggleExpand(kategori.id)}
                              className="h-8 w-8 p-0"
                            >
                              <ChevronRight
                                className={`h-4 w-4 transition-transform ${
                                  isExpanded ? 'rotate-90' : ''
                                }`}
                              />
                            </Button>
                          </TableCell>
                          <TableCell className="text-muted-foreground">{index + 1}</TableCell>
                          <TableCell className="font-medium">{kategori.nama}</TableCell>
                          <TableCell>
                            <Badge
                              variant={kategori.jenis === 'Pemasukan' ? 'default' : 'secondary'}
                            >
                              {kategori.jenis}
                            </Badge>
                          </TableCell>
                          <TableCell>
                            {kategori.pilar_layanan ? (
                              <Badge variant="outline">{kategori.pilar_layanan.nama}</Badge>
                            ) : (
                              <span className="text-muted-foreground text-sm">-</span>
                            )}
                          </TableCell>
                          <TableCell>
                            <Badge variant="outline">{subKategoriCount} sub kategori</Badge>
                          </TableCell>
                          <TableCell>
                            {kategori.aktif ? (
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
                                <DropdownMenuItem onClick={() => handleOpenKategoriForm(kategori)}>
                                  <Edit className="h-4 w-4 mr-2" />
                                  Edit Kategori
                                </DropdownMenuItem>
                                <DropdownMenuItem
                                  onClick={() => handleOpenMapping('kategori', kategori.id, kategori.nama)}
                                >
                                  <Users className="h-4 w-4 mr-2" />
                                  Mapping Santri
                                </DropdownMenuItem>
                                <DropdownMenuItem
                                  onClick={() => handleOpenSubKategoriForm(kategori)}
                                >
                                  <Plus className="h-4 w-4 mr-2" />
                                  Tambah Sub Kategori
                                </DropdownMenuItem>
                                <DropdownMenuItem
                                  onClick={() => handleToggleAktif('kategori', kategori.id, kategori.aktif)}
                                >
                                  {kategori.aktif ? (
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
                                  onClick={() => handleDeleteClick('kategori', kategori.id, kategori.nama)}
                                  className="text-red-600 focus:text-red-600"
                                >
                                  <Trash2 className="h-4 w-4 mr-2" />
                                  Hapus
                                </DropdownMenuItem>
                              </DropdownMenuContent>
                            </DropdownMenu>
                          </TableCell>
                        </TableRow>
                        {isExpanded && subKategoriList.length > 0 && (
                          <TableRow>
                            <TableCell colSpan={8} className="bg-muted/30 p-0">
                              <div className="p-4 space-y-2">
                                <div className="text-sm font-medium mb-3">Sub Kategori</div>
                                <div className="space-y-2">
                                  {subKategoriList.map((subKategori) => (
                                    <div
                                      key={subKategori.id}
                                      className="flex items-center justify-between p-3 bg-background border rounded-md"
                                    >
                                      <div className="flex-1">
                                        <div className="font-medium">{subKategori.nama}</div>
                                        <div className="text-xs text-muted-foreground flex items-center gap-2 mt-1">
                                          {subKategori.pilar_layanan && (
                                            <Badge variant="outline" className="text-xs">
                                              {subKategori.pilar_layanan.nama}
                                            </Badge>
                                          )}
                                          {subKategori.deskripsi && (
                                            <span>{subKategori.deskripsi}</span>
                                          )}
                                        </div>
                                      </div>
                                      <div className="flex items-center gap-2">
                                        {subKategori.aktif ? (
                                          <Badge variant="default" className="bg-green-500 text-xs">
                                            Aktif
                                          </Badge>
                                        ) : (
                                          <Badge variant="secondary" className="text-xs">
                                            Non-Aktif
                                          </Badge>
                                        )}
                                        <DropdownMenu>
                                          <DropdownMenuTrigger asChild>
                                            <Button variant="ghost" size="sm">
                                              <MoreVertical className="h-4 w-4" />
                                            </Button>
                                          </DropdownMenuTrigger>
                                          <DropdownMenuContent align="end">
                                            <DropdownMenuItem
                                              onClick={() =>
                                                handleOpenSubKategoriForm(kategori, subKategori)
                                              }
                                            >
                                              <Edit className="h-4 w-4 mr-2" />
                                              Edit
                                            </DropdownMenuItem>
                                            <DropdownMenuItem
                                              onClick={() =>
                                                handleOpenMapping(
                                                  'sub_kategori',
                                                  subKategori.id,
                                                  subKategori.nama
                                                )
                                              }
                                            >
                                              <Users className="h-4 w-4 mr-2" />
                                              Mapping Santri
                                            </DropdownMenuItem>
                                            <DropdownMenuItem
                                              onClick={() =>
                                                handleToggleAktif(
                                                  'sub_kategori',
                                                  subKategori.id,
                                                  subKategori.aktif
                                                )
                                              }
                                            >
                                              {subKategori.aktif ? (
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
                                              onClick={() =>
                                                handleDeleteClick(
                                                  'sub_kategori',
                                                  subKategori.id,
                                                  subKategori.nama
                                                )
                                              }
                                              className="text-red-600 focus:text-red-600"
                                            >
                                              <Trash2 className="h-4 w-4 mr-2" />
                                              Hapus
                                            </DropdownMenuItem>
                                          </DropdownMenuContent>
                                        </DropdownMenu>
                                      </div>
                                    </div>
                                  ))}
                                </div>
                              </div>
                            </TableCell>
                          </TableRow>
                        )}
                      </React.Fragment>
                    );
                  })}
                </TableBody>
              </Table>
          )}
        </CardContent>
      </Card>

      {/* Kategori Form Dialog */}
      <Dialog open={showKategoriForm} onOpenChange={setShowKategoriForm}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>
              {editingKategori ? 'Edit Kategori Pengeluaran' : 'Tambah Kategori Pengeluaran'}
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="kategori-nama">
                Nama Kategori <span className="text-red-500">*</span>
              </Label>
              <Input
                id="kategori-nama"
                value={kategoriForm.nama}
                onChange={(e) => setKategoriForm({ ...kategoriForm, nama: e.target.value })}
                placeholder="Pendidikan Formal"
              />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="kategori-jenis">
                  Jenis <span className="text-red-500">*</span>
                </Label>
                <Select
                  value={kategoriForm.jenis || ''}
                  onValueChange={(v) =>
                    setKategoriForm({ ...kategoriForm, jenis: v as 'Pemasukan' | 'Pengeluaran' })
                  }
                  disabled={!!editingKategori}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="Pemasukan">Pemasukan</SelectItem>
                    <SelectItem value="Pengeluaran">Pengeluaran</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label htmlFor="kategori-urutan">Urutan</Label>
                <Input
                  id="kategori-urutan"
                  type="number"
                  value={kategoriForm.urutan}
                  onChange={(e) =>
                    setKategoriForm({ ...kategoriForm, urutan: parseInt(e.target.value) || 0 })
                  }
                  min={0}
                />
              </div>
            </div>
            <div className="space-y-2">
              <Label htmlFor="kategori-pilar">Pilar Layanan (Optional)</Label>
              <Select
                value={kategoriForm.pilar_layanan_kode || undefined}
                onValueChange={(v) => setKategoriForm({ ...kategoriForm, pilar_layanan_kode: v })}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Pilih pilar layanan (opsional)" />
                </SelectTrigger>
                <SelectContent>
                  {pilarList && pilarList.length > 0 ? (
                    pilarList.map((pilar) => (
                      <SelectItem key={pilar.id} value={pilar.kode}>
                        {pilar.nama}
                      </SelectItem>
                    ))
                  ) : (
                    <div className="px-2 py-1.5 text-sm text-muted-foreground">
                      Tidak ada pilar layanan
                    </div>
                  )}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label htmlFor="kategori-deskripsi">Deskripsi</Label>
              <Textarea
                id="kategori-deskripsi"
                value={kategoriForm.deskripsi}
                onChange={(e) => setKategoriForm({ ...kategoriForm, deskripsi: e.target.value })}
                placeholder="Deskripsi kategori..."
                rows={3}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowKategoriForm(false)}>
              Batal
            </Button>
            <Button onClick={handleSaveKategori}>
              {editingKategori ? 'Simpan Perubahan' : 'Buat Kategori'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Sub Kategori Form Dialog */}
      <Dialog open={showSubKategoriForm} onOpenChange={setShowSubKategoriForm}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>
              {editingSubKategori?.subKategori
                ? 'Edit Sub Kategori'
                : 'Tambah Sub Kategori'}
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="p-3 bg-muted rounded-md">
              <p className="text-sm text-muted-foreground">
                Kategori: <span className="font-medium">{editingSubKategori?.kategori.nama}</span>
              </p>
            </div>
            <div className="space-y-2">
              <Label htmlFor="sub-kategori-nama">
                Nama Sub Kategori <span className="text-red-500">*</span>
              </Label>
              <Input
                id="sub-kategori-nama"
                value={subKategoriForm.nama}
                onChange={(e) => setSubKategoriForm({ ...subKategoriForm, nama: e.target.value })}
                placeholder="SPP MI Al-Bukhori"
              />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="sub-kategori-pilar">Pilar Layanan (Optional)</Label>
                <Select
                  value={subKategoriForm.pilar_layanan_kode || undefined}
                  onValueChange={(v) =>
                    setSubKategoriForm({ ...subKategoriForm, pilar_layanan_kode: v })
                  }
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Pilih pilar layanan (opsional)" />
                  </SelectTrigger>
                  <SelectContent>
                    {pilarList && pilarList.length > 0 ? (
                      pilarList.map((pilar) => (
                        <SelectItem key={pilar.id} value={pilar.kode}>
                          {pilar.nama}
                        </SelectItem>
                      ))
                    ) : (
                      <div className="px-2 py-1.5 text-sm text-muted-foreground">
                        Tidak ada pilar layanan
                      </div>
                    )}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label htmlFor="sub-kategori-urutan">Urutan</Label>
                <Input
                  id="sub-kategori-urutan"
                  type="number"
                  value={subKategoriForm.urutan}
                  onChange={(e) =>
                    setSubKategoriForm({
                      ...subKategoriForm,
                      urutan: parseInt(e.target.value) || 0,
                    })
                  }
                  min={0}
                />
              </div>
            </div>
            <div className="space-y-2">
              <Label htmlFor="sub-kategori-deskripsi">Deskripsi</Label>
              <Textarea
                id="sub-kategori-deskripsi"
                value={subKategoriForm.deskripsi}
                onChange={(e) =>
                  setSubKategoriForm({ ...subKategoriForm, deskripsi: e.target.value })
                }
                placeholder="Deskripsi sub kategori..."
                rows={3}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowSubKategoriForm(false)}>
              Batal
            </Button>
            <Button onClick={handleSaveSubKategori}>
              {editingSubKategori?.subKategori ? 'Simpan Perubahan' : 'Buat Sub Kategori'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Mapping Santri Dialog */}
      {mappingTarget && (
        <MappingSantriDialogWrapper
          open={showMappingDialog}
          onOpenChange={setShowMappingDialog}
          onSave={handleSaveMapping}
          mappingTarget={mappingTarget}
        />
      )}

      {/* Delete Confirmation Dialog */}
      <AlertDialog open={showDeleteDialog} onOpenChange={setShowDeleteDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>
              Hapus {deletingItem?.type === 'kategori' ? 'Kategori' : 'Sub Kategori'}?
            </AlertDialogTitle>
            <AlertDialogDescription>
              {usageCount && usageCount > 0 ? (
                <div className="space-y-2 mt-2">
                  <div className="flex items-start gap-2 text-amber-600">
                    <AlertTriangle className="h-4 w-4 mt-0.5" />
                    <div>
                      <div className="font-medium">
                        {deletingItem?.type === 'kategori' ? 'Kategori' : 'Sub kategori'} ini tidak dapat dihapus karena sudah memiliki {usageCount} transaksi.
                      </div>
                      <div className="mt-2 text-sm">Gunakan toggle aktif untuk menonaktifkan.</div>
                    </div>
                  </div>
                </div>
              ) : (
                <div>
                  Apakah Anda yakin ingin menghapus {deletingItem?.type === 'kategori' ? 'kategori' : 'sub kategori'}{' '}
                  "{deletingItem?.nama}"? Tindakan ini tidak dapat dibatalkan.
                </div>
              )}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Batal</AlertDialogCancel>
            {usageCount && usageCount > 0 ? (
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

export default KategoriPengeluaranTab;


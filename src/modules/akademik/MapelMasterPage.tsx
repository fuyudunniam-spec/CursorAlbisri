import React, { useCallback, useEffect, useState } from 'react';
import { AkademikAgendaService } from '@/services/akademikAgenda.service';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { toast } from 'sonner';
import { Plus, Edit, Trash2, Search, X, Loader2 } from 'lucide-react';
import { useAuth } from '@/hooks/useAuth';

// Constants
const ITEMS_PER_PAGE = 20;
const PROGRAM_OPTIONS: Array<{ value: 'Madin' | 'TPQ' | 'Tahfid' | 'Tahsin' | 'Umum'; label: string }> = [
  { value: 'Madin', label: 'Madin' },
  { value: 'TPQ', label: 'TPQ' },
  { value: 'Tahfid', label: 'Tahfid' },
  { value: 'Tahsin', label: 'Tahsin' },
  { value: 'Umum', label: 'Umum' },
] as const;

const STATUS_OPTIONS: Array<{ value: 'Aktif' | 'Non-Aktif'; label: string }> = [
  { value: 'Aktif', label: 'Aktif' },
  { value: 'Non-Aktif', label: 'Non-Aktif' },
] as const;

type ProgramType = 'Madin' | 'TPQ' | 'Tahfid' | 'Tahsin' | 'Umum';
type StatusType = 'Aktif' | 'Non-Aktif';

interface Mapel {
  id: string;
  nama_mapel: string;
  program: string;
  status: StatusType;
}

interface MapelFormData {
  nama_mapel: string;
  kode_mapel: string;
  program: ProgramType;
  status: StatusType;
  catatan: string;
}

interface ErrorWithMessage {
  message?: string;
}

const MapelMasterPage: React.FC = () => {
  const { user } = useAuth();
  const isAdminOrStaff = user?.role === 'admin' || user?.role === 'staff';
  
  const [mapelList, setMapelList] = useState<Mapel[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [currentPage, setCurrentPage] = useState(1);
  const [saving, setSaving] = useState(false);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [togglingId, setTogglingId] = useState<string | null>(null);

  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingMapel, setEditingMapel] = useState<Mapel | null>(null);
  const [formData, setFormData] = useState<MapelFormData>({
    nama_mapel: '',
    kode_mapel: '',
    program: 'Madin',
    status: 'Aktif',
    catatan: '',
  });

  const loadMapel = useCallback(async () => {
    try {
      setLoading(true);
      const data = await AkademikAgendaService.listMapel({ status: 'Semua' });
      setMapelList(data);
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : (error as ErrorWithMessage).message || 'Gagal memuat data mapel';
      toast.error(errorMessage);
      console.error('Error loading mapel:', error);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadMapel();
  }, [loadMapel]);

  const filteredMapel = React.useMemo(() => {
    if (!searchTerm) return mapelList;
    const term = searchTerm.toLowerCase();
    return mapelList.filter(m => m.nama_mapel.toLowerCase().includes(term));
  }, [mapelList, searchTerm]);

  const paginatedMapel = React.useMemo(() => {
    const start = (currentPage - 1) * ITEMS_PER_PAGE;
    return filteredMapel.slice(start, start + ITEMS_PER_PAGE);
  }, [filteredMapel, currentPage]);

  const totalPages = Math.ceil(filteredMapel.length / ITEMS_PER_PAGE);

  const paginationInfo = React.useMemo(() => {
    const start = (currentPage - 1) * ITEMS_PER_PAGE + 1;
    const end = Math.min(currentPage * ITEMS_PER_PAGE, filteredMapel.length);
    return { start, end, total: filteredMapel.length };
  }, [currentPage, filteredMapel.length]);

  const handleOpenDialog = (mapel?: Mapel) => {
    if (mapel) {
      setEditingMapel(mapel);
      setFormData({
        nama_mapel: mapel.nama_mapel,
        kode_mapel: '',
        program: mapel.program as ProgramType,
        status: mapel.status,
        catatan: '',
      });
    } else {
      setEditingMapel(null);
      setFormData({
        nama_mapel: '',
        kode_mapel: '',
        program: 'Madin',
        status: 'Aktif',
        catatan: '',
      });
    }
    setDialogOpen(true);
  };

  const handleSave = async () => {
    const trimmedNama = formData.nama_mapel.trim();
    if (!trimmedNama) {
      toast.error('Nama mapel wajib diisi');
      return;
    }

    if (trimmedNama.length < 2) {
      toast.error('Nama mapel minimal 2 karakter');
      return;
    }

    try {
      setSaving(true);
      const payload = {
        nama_mapel: trimmedNama,
        kode_mapel: formData.kode_mapel.trim() || null,
        program: formData.program,
        status: formData.status,
        catatan: formData.catatan.trim() || null,
      };

      if (editingMapel) {
        await AkademikAgendaService.updateMapel(editingMapel.id, payload);
        toast.success('Mapel berhasil diperbarui');
      } else {
        await AkademikAgendaService.createMapel(payload);
        toast.success('Mapel berhasil ditambahkan');
      }
      setDialogOpen(false);
      await loadMapel();
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : (error as ErrorWithMessage).message || 'Gagal menyimpan mapel';
      toast.error(errorMessage);
      console.error('Error saving mapel:', error);
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (id: string) => {
    if (!window.confirm('Hapus mapel ini? Tindakan ini tidak dapat dibatalkan.')) {
      return;
    }

    try {
      setDeletingId(id);
      await AkademikAgendaService.deleteMapel(id);
      toast.success('Mapel berhasil dihapus');
      await loadMapel();
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : (error as ErrorWithMessage).message || 'Gagal menghapus mapel';
      toast.error(errorMessage);
      console.error('Error deleting mapel:', error);
    } finally {
      setDeletingId(null);
    }
  };

  const handleToggleStatus = async (mapel: Mapel) => {
    try {
      setTogglingId(mapel.id);
      const newStatus = mapel.status === 'Aktif' ? 'Non-Aktif' : 'Aktif';
      await AkademikAgendaService.updateMapel(mapel.id, {
        status: newStatus,
      });
      toast.success(`Mapel ${mapel.status === 'Aktif' ? 'dinonaktifkan' : 'diaktifkan'}`);
      await loadMapel();
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : (error as ErrorWithMessage).message || 'Gagal mengubah status';
      toast.error(errorMessage);
      console.error('Error toggling status:', error);
    } finally {
      setTogglingId(null);
    }
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-bold">Master Mapel</h2>
          <p className="text-sm text-muted-foreground">Kelola data mata pelajaran</p>
        </div>
        {isAdminOrStaff && (
          <Button onClick={() => handleOpenDialog()} aria-label="Tambah mapel baru">
            <Plus className="w-4 h-4 mr-2" />
            Tambah Mapel
          </Button>
        )}
      </div>

      <div className="flex items-center gap-2">
        <div className="relative flex-1 max-w-sm">
          <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
          <Input
            value={searchTerm}
            onChange={(e) => {
              setSearchTerm(e.target.value);
              setCurrentPage(1);
            }}
            placeholder="Cari mapel..."
            className="pl-8"
            aria-label="Cari mapel"
          />
          {searchTerm && (
            <Button
              variant="ghost"
              size="sm"
              className="absolute right-1 top-1 h-7 w-7 p-0"
              onClick={() => {
                setSearchTerm('');
                setCurrentPage(1);
              }}
            >
              <X className="h-4 w-4" />
            </Button>
          )}
        </div>
      </div>

      <div className="border rounded-lg overflow-hidden">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Nama Mapel</TableHead>
              <TableHead>Program</TableHead>
              <TableHead>Status</TableHead>
              {isAdminOrStaff && <TableHead className="text-right">Aksi</TableHead>}
            </TableRow>
          </TableHeader>
          <TableBody>
            {loading ? (
              <TableRow>
                <TableCell colSpan={isAdminOrStaff ? 4 : 3} className="text-center text-muted-foreground">
                  <div className="flex items-center justify-center gap-2">
                    <Loader2 className="w-4 h-4 animate-spin" />
                    Memuat...
                  </div>
                </TableCell>
              </TableRow>
            ) : paginatedMapel.length === 0 ? (
              <TableRow>
                <TableCell colSpan={isAdminOrStaff ? 4 : 3} className="text-center text-muted-foreground">
                  {searchTerm ? 'Tidak ada mapel yang cocok' : 'Belum ada mapel'}
                </TableCell>
              </TableRow>
            ) : (
              paginatedMapel.map((mapel) => (
                <TableRow key={mapel.id}>
                  <TableCell className="font-medium">{mapel.nama_mapel}</TableCell>
                  <TableCell>{mapel.program}</TableCell>
                  <TableCell>
                    <Badge variant={mapel.status === 'Aktif' ? 'default' : 'secondary'}>
                      {mapel.status}
                    </Badge>
                  </TableCell>
                  {isAdminOrStaff && (
                    <TableCell className="text-right">
                      <div className="flex justify-end gap-2">
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleToggleStatus(mapel)}
                          disabled={togglingId === mapel.id}
                          aria-label={mapel.status === 'Aktif' ? 'Nonaktifkan mapel' : 'Aktifkan mapel'}
                        >
                          {togglingId === mapel.id ? (
                            <Loader2 className="w-4 h-4 animate-spin" />
                          ) : (
                            mapel.status === 'Aktif' ? 'Nonaktifkan' : 'Aktifkan'
                          )}
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleOpenDialog(mapel)}
                          aria-label="Edit mapel"
                        >
                          <Edit className="w-4 h-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleDelete(mapel.id)}
                          disabled={deletingId === mapel.id}
                          aria-label="Hapus mapel"
                        >
                          {deletingId === mapel.id ? (
                            <Loader2 className="w-4 h-4 animate-spin text-red-600" />
                          ) : (
                            <Trash2 className="w-4 h-4 text-red-600" />
                          )}
                        </Button>
                      </div>
                    </TableCell>
                  )}
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>

      {totalPages > 1 && (
        <div className="flex items-center justify-between">
          <p className="text-sm text-muted-foreground">
            Menampilkan {paginationInfo.start} - {paginationInfo.end} dari {paginationInfo.total} mapel
          </p>
          <div className="flex gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => setCurrentPage(prev => Math.max(1, prev - 1))}
              disabled={currentPage === 1}
              aria-label="Halaman sebelumnya"
            >
              Sebelumnya
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={() => setCurrentPage(prev => Math.min(totalPages, prev + 1))}
              disabled={currentPage === totalPages}
              aria-label="Halaman selanjutnya"
            >
              Selanjutnya
            </Button>
          </div>
        </div>
      )}

      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>{editingMapel ? 'Edit Mapel' : 'Tambah Mapel Baru'}</DialogTitle>
            <DialogDescription>
              {editingMapel ? 'Perbarui informasi mapel' : 'Tambahkan mapel baru ke master data'}
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div>
              <Label htmlFor="nama-mapel">Nama Mapel *</Label>
              <Input
                id="nama-mapel"
                value={formData.nama_mapel}
                onChange={(e) => setFormData(prev => ({ ...prev, nama_mapel: e.target.value }))}
                placeholder="Contoh: Fiqih"
                maxLength={100}
                required
              />
            </div>
            <div>
              <Label htmlFor="kode-mapel">Kode Mapel</Label>
              <Input
                id="kode-mapel"
                value={formData.kode_mapel}
                onChange={(e) => setFormData(prev => ({ ...prev, kode_mapel: e.target.value }))}
                placeholder="Contoh: FQH"
                maxLength={20}
              />
            </div>
            <div>
              <Label htmlFor="program">Program</Label>
              <Select
                value={formData.program}
                onValueChange={(value) => setFormData(prev => ({ ...prev, program: value as ProgramType }))}
              >
                <SelectTrigger id="program">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {PROGRAM_OPTIONS.map((option) => (
                    <SelectItem key={option.value} value={option.value}>
                      {option.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label htmlFor="status">Status</Label>
              <Select
                value={formData.status}
                onValueChange={(value) => setFormData(prev => ({ ...prev, status: value as StatusType }))}
              >
                <SelectTrigger id="status">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {STATUS_OPTIONS.map((option) => (
                    <SelectItem key={option.value} value={option.value}>
                      {option.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label htmlFor="catatan">Catatan</Label>
              <Textarea
                id="catatan"
                value={formData.catatan}
                onChange={(e) => setFormData(prev => ({ ...prev, catatan: e.target.value }))}
                rows={3}
                placeholder="Catatan opsional"
                maxLength={500}
              />
            </div>
          </div>
          <DialogFooter>
            <Button 
              variant="outline" 
              onClick={() => setDialogOpen(false)}
              disabled={saving}
            >
              Batal
            </Button>
            <Button onClick={handleSave} disabled={saving}>
              {saving && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
              Simpan
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default MapelMasterPage;


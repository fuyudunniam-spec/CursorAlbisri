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
import { Plus, Edit, Trash2, Search, X } from 'lucide-react';
import { useAuth } from '@/hooks/useAuth';

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

const MapelMasterPage: React.FC = () => {
  const { user } = useAuth();
  const isAdminOrStaff = user?.role === 'admin' || user?.role === 'staff';
  
  const [mapelList, setMapelList] = useState<Mapel[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 20;

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
    } catch (e: any) {
      toast.error(e.message || 'Gagal memuat data mapel');
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
    const start = (currentPage - 1) * itemsPerPage;
    return filteredMapel.slice(start, start + itemsPerPage);
  }, [filteredMapel, currentPage]);

  const totalPages = Math.ceil(filteredMapel.length / itemsPerPage);

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
    if (!formData.nama_mapel.trim()) {
      toast.error('Nama mapel wajib diisi');
      return;
    }

    try {
      if (editingMapel) {
        await AkademikAgendaService.updateMapel(editingMapel.id, {
          nama_mapel: formData.nama_mapel.trim(),
          kode_mapel: formData.kode_mapel.trim() || null,
          program: formData.program,
          status: formData.status,
          catatan: formData.catatan.trim() || null,
        });
        toast.success('Mapel berhasil diperbarui');
      } else {
        await AkademikAgendaService.createMapel({
          nama_mapel: formData.nama_mapel.trim(),
          kode_mapel: formData.kode_mapel.trim() || null,
          program: formData.program,
          status: formData.status,
          catatan: formData.catatan.trim() || null,
        });
        toast.success('Mapel berhasil ditambahkan');
      }
      setDialogOpen(false);
      loadMapel();
    } catch (e: any) {
      toast.error(e.message || 'Gagal menyimpan mapel');
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Hapus mapel ini? Tindakan ini tidak dapat dibatalkan.')) return;
    try {
      await AkademikAgendaService.deleteMapel(id);
      toast.success('Mapel berhasil dihapus');
      loadMapel();
    } catch (e: any) {
      toast.error(e.message || 'Gagal menghapus mapel');
    }
  };

  const handleToggleStatus = async (mapel: Mapel) => {
    try {
      await AkademikAgendaService.updateMapel(mapel.id, {
        status: mapel.status === 'Aktif' ? 'Non-Aktif' : 'Aktif',
      });
      toast.success(`Mapel ${mapel.status === 'Aktif' ? 'dinonaktifkan' : 'diaktifkan'}`);
      loadMapel();
    } catch (e: any) {
      toast.error(e.message || 'Gagal mengubah status');
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
          <Button onClick={() => handleOpenDialog()}>
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
                  Memuat...
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
                        >
                          {mapel.status === 'Aktif' ? 'Nonaktifkan' : 'Aktifkan'}
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleOpenDialog(mapel)}
                        >
                          <Edit className="w-4 h-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleDelete(mapel.id)}
                        >
                          <Trash2 className="w-4 h-4 text-red-600" />
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
            Menampilkan {((currentPage - 1) * itemsPerPage) + 1} - {Math.min(currentPage * itemsPerPage, filteredMapel.length)} dari {filteredMapel.length} mapel
          </p>
          <div className="flex gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => setCurrentPage(prev => Math.max(1, prev - 1))}
              disabled={currentPage === 1}
            >
              Sebelumnya
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={() => setCurrentPage(prev => Math.min(totalPages, prev + 1))}
              disabled={currentPage === totalPages}
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
              <Label>Nama Mapel *</Label>
              <Input
                value={formData.nama_mapel}
                onChange={(e) => setFormData(prev => ({ ...prev, nama_mapel: e.target.value }))}
                placeholder="Contoh: Fiqih"
              />
            </div>
            <div>
              <Label>Program</Label>
              <Select
                value={formData.program}
                onValueChange={(value) => setFormData(prev => ({ ...prev, program: value as ProgramType }))}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="Madin">Madin</SelectItem>
                  <SelectItem value="TPQ">TPQ</SelectItem>
                  <SelectItem value="Tahfid">Tahfid</SelectItem>
                  <SelectItem value="Tahsin">Tahsin</SelectItem>
                  <SelectItem value="Umum">Umum</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label>Status</Label>
              <Select
                value={formData.status}
                onValueChange={(value) => setFormData(prev => ({ ...prev, status: value as StatusType }))}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="Aktif">Aktif</SelectItem>
                  <SelectItem value="Non-Aktif">Non-Aktif</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label>Catatan</Label>
              <Textarea
                value={formData.catatan}
                onChange={(e) => setFormData(prev => ({ ...prev, catatan: e.target.value }))}
                rows={3}
                placeholder="Catatan opsional"
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDialogOpen(false)}>
              Batal
            </Button>
            <Button onClick={handleSave}>
              Simpan
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default MapelMasterPage;


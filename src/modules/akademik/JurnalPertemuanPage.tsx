import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/hooks/useAuth';
import { AkademikPertemuanService, KelasPertemuan, PertemuanStatus } from '@/services/akademikPertemuan.service';
import { AkademikKelasService, KelasMaster } from '@/services/akademikKelas.service';
import { AkademikAgendaService, AkademikAgenda } from '@/services/akademikAgenda.service';
import { AkademikSemesterService, Semester } from '@/services/akademikSemester.service';
import { AkademikPengajarService } from '@/services/akademikPengajar.service';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Textarea } from '@/components/ui/textarea';
import { toast } from 'sonner';
import { Calendar, Plus, Edit, Trash2, BookOpen, CheckCircle2, AlertCircle, Clock, Users, CalendarDays } from 'lucide-react';

type ProgramValue = 'Madin' | 'TPQ' | 'Tahfid' | 'Tahsin' | 'Semua';

const toDateInputValue = (date: Date) => date.toISOString().split('T')[0];

const startOfCurrentMonth = () => {
  const now = new Date();
  return toDateInputValue(new Date(now.getFullYear(), now.getMonth(), 1));
};

const endOfCurrentMonth = () => {
  const now = new Date();
  return toDateInputValue(new Date(now.getFullYear(), now.getMonth() + 1, 0));
};

interface PertemuanFormData {
  agenda_id: string;
  tanggal: string;
  status: PertemuanStatus;
  pengajar_nama?: string;
  materi?: string;
  catatan?: string;
}

const formatStatusBadge = (status: PertemuanStatus) => {
  switch (status) {
    case 'Berjalan':
      return <Badge className="bg-purple-100 text-purple-800">Berjalan</Badge>;
    case 'Selesai':
      return <Badge className="bg-emerald-100 text-emerald-800">Selesai</Badge>;
    case 'Batal':
      return <Badge className="bg-red-100 text-red-800">Batal</Badge>;
    case 'Tunda':
      return <Badge className="bg-orange-100 text-orange-800">Tunda</Badge>;
    default:
      return <Badge className="bg-blue-100 text-blue-800">Terjadwal</Badge>;
  }
};

const JurnalPertemuanPage: React.FC = () => {
  const navigate = useNavigate();
  const { user } = useAuth();
  const isPengajar = user?.role === 'pengajar' || user?.roles?.includes('pengajar');
  const [pengajarId, setPengajarId] = useState<string | null>(null);
  const [classes, setClasses] = useState<KelasMaster[]>([]);
  const [agendas, setAgendas] = useState<AkademikAgenda[]>([]);
  const [pertemuanList, setPertemuanList] = useState<KelasPertemuan[]>([]);
  const [semesters, setSemesters] = useState<Semester[]>([]);
  const [loading, setLoading] = useState(false);
  const [selectedSemesterId, setSelectedSemesterId] = useState<string>('');
  const [kelasId, setKelasId] = useState<string>('all');
  const [agendaId, setAgendaId] = useState<string>('all');

  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingPertemuan, setEditingPertemuan] = useState<KelasPertemuan | null>(null);
  const [formData, setFormData] = useState<PertemuanFormData>({
    agenda_id: '',
    tanggal: new Date().toISOString().split('T')[0],
    status: 'Terjadwal',
    pengajar_nama: '',
    materi: '',
    catatan: '',
  });
  const [quickEditDialog, setQuickEditDialog] = useState<{ open: boolean; pertemuan: KelasPertemuan | null }>({
    open: false,
    pertemuan: null,
  });
  const [quickEditTanggal, setQuickEditTanggal] = useState('');

  const loadSemesters = useCallback(async () => {
    try {
      const list = await AkademikSemesterService.listSemester();
      setSemesters(list);
      // Set semester aktif sebagai default
      const aktif = list.find(s => s.is_aktif);
      if (aktif) {
        setSelectedSemesterId(aktif.id);
      } else if (list.length > 0) {
        setSelectedSemesterId(list[0].id);
      }
    } catch (error: any) {
      toast.error(error.message || 'Gagal memuat semester');
    }
  }, []);

  // Load pengajar_id jika user adalah pengajar
  useEffect(() => {
    const loadPengajarId = async () => {
      if (!isPengajar || !user?.id) return;
      
      try {
        const id = await AkademikPengajarService.getPengajarIdByUserId(user.id);
        setPengajarId(id);
      } catch (error: any) {
        console.error('Error loading pengajar ID:', error);
      }
    };

    loadPengajarId();
  }, [isPengajar, user]);

  const loadClasses = useCallback(async (semesterId?: string) => {
    try {
      let list: KelasMaster[];
      
      // Jika pengajar, hanya ambil kelas yang di-assign ke mereka
      if (isPengajar && pengajarId) {
        list = await AkademikKelasService.listKelasByPengajar(pengajarId);
      } else {
        list = await AkademikKelasService.listKelas();
      }
      
      // Filter kelas berdasarkan semester jika dipilih
      let filtered = list;
      if (semesterId) {
        filtered = list.filter(k => k.semester_id === semesterId);
      }
      setClasses(filtered);
      if (kelasId === 'all' && filtered.length > 0) {
        // Biarkan "all" jika ada kelas, atau set ke kelas pertama jika sebelumnya kosong
      } else if (kelasId !== 'all' && !filtered.some(k => k.id === kelasId)) {
        setKelasId('all');
      }
    } catch (error: any) {
      toast.error(error.message || 'Gagal memuat kelas');
    }
  }, [kelasId, isPengajar, pengajarId]);

  const loadAgendas = useCallback(async (targetKelasId: string) => {
    try {
      let list: AkademikAgenda[];
      
      // Jika pengajar, hanya ambil agenda yang di-assign ke mereka
      if (isPengajar && pengajarId) {
        const allAgendas = await AkademikAgendaService.listAgendaByPengajar(pengajarId, { aktifOnly: false });
        
        // Jika kelas dipilih (bukan 'all'), filter hanya agenda untuk kelas tersebut
        if (targetKelasId && targetKelasId !== 'all') {
          list = allAgendas.filter(a => a.kelas_id === targetKelasId);
        } else {
          // Jika 'all', tampilkan semua agenda pengajar
          list = allAgendas;
        }
      } else {
        // Untuk admin/non-pengajar, hanya load jika kelas dipilih
        if (!targetKelasId || targetKelasId === 'all') {
      setAgendas([]);
      setAgendaId('all');
      return;
    }
        list = await AkademikAgendaService.listAgendaByKelas(targetKelasId, { aktifOnly: false });
      }
      
      setAgendas(list);
      if (list.length > 0) {
        // Jika agenda yang dipilih sebelumnya masih ada di list, pertahankan
        // Jika tidak, reset ke 'all'
        setAgendaId(prev => (prev !== 'all' && list.some(a => a.id === prev)) ? prev : 'all');
      } else {
        setAgendaId('all');
      }
    } catch (error: any) {
      toast.error(error.message || 'Gagal memuat agenda kelas');
      setAgendas([]);
      setAgendaId('all');
    }
  }, [isPengajar, pengajarId]);

  const loadPertemuan = useCallback(async () => {
    if (!selectedSemesterId) {
      setPertemuanList([]);
      return;
    }
    try {
      setLoading(true);
      const semester = semesters.find(s => s.id === selectedSemesterId);
      if (!semester) {
        setPertemuanList([]);
        return;
      }
      
      let data = await AkademikPertemuanService.listPertemuan({
        kelasId: kelasId && kelasId !== 'all' ? kelasId : undefined,
        agendaId: agendaId === 'all' ? undefined : agendaId,
        startDate: semester.tanggal_mulai,
        endDate: semester.tanggal_selesai,
      });
      
      // Jika pengajar, filter hanya pertemuan yang terkait dengan agenda mereka
      if (isPengajar && pengajarId && agendas.length > 0) {
        const agendaIds = agendas.map(a => a.id);
        data = data.filter(p => p.agenda_id && agendaIds.includes(p.agenda_id));
      }
      
      setPertemuanList(data);
    } catch (error: any) {
      toast.error(error.message || 'Gagal memuat daftar pertemuan');
    } finally {
      setLoading(false);
    }
  }, [selectedSemesterId, semesters, kelasId, agendaId, isPengajar, pengajarId, agendas]);

  useEffect(() => {
    loadSemesters();
  }, [loadSemesters]);

  useEffect(() => {
    if (selectedSemesterId && (!isPengajar || pengajarId)) {
      loadClasses(selectedSemesterId);
    }
  }, [selectedSemesterId, loadClasses, isPengajar, pengajarId]);

  useEffect(() => {
    // Untuk pengajar, load semua agenda mereka jika kelasId adalah 'all'
    // Untuk admin, hanya load jika kelasId dipilih
    if (isPengajar && pengajarId) {
      loadAgendas(kelasId);
    } else {
    if (kelasId && kelasId !== 'all') {
      loadAgendas(kelasId);
    } else {
      setAgendas([]);
      setAgendaId('all');
    }
    }
  }, [kelasId, loadAgendas, isPengajar, pengajarId]);

  useEffect(() => {
    if (selectedSemesterId) loadPertemuan();
  }, [loadPertemuan, selectedSemesterId]);

  const agendaLabel = (agenda: AkademikAgenda) => {
    // Prioritas: mapel > nama_agenda
    const displayName = agenda.mapel_nama || agenda.mapel?.nama_mapel || agenda.nama_agenda || 'Agenda';
    
    const meta: string[] = [];
    if (agenda.hari) meta.push(agenda.hari);
    if (agenda.jam_mulai) {
      const start = agenda.jam_mulai.slice(0, 5);
      const end = agenda.jam_selesai ? agenda.jam_selesai.slice(0, 5) : undefined;
      meta.push(end ? `${start} - ${end}` : start);
    }
    
    // Tampilkan nama agenda hanya jika berbeda dengan mapel
    const showAgendaName = (agenda.mapel_nama || agenda.mapel?.nama_mapel) && 
                           agenda.nama_agenda && 
                           agenda.nama_agenda !== (agenda.mapel_nama || agenda.mapel?.nama_mapel);
    
    if (showAgendaName) {
      return meta.length 
        ? `${displayName} (${agenda.nama_agenda}) — ${meta.join(' • ')}` 
        : `${displayName} (${agenda.nama_agenda})`;
    }
    
    return meta.length ? `${displayName} — ${meta.join(' • ')}` : displayName;
  };

  const handleOpenDialog = (pertemuan?: KelasPertemuan) => {
    if (pertemuan) {
      setEditingPertemuan(pertemuan);
      setFormData({
        agenda_id: pertemuan.agenda_id,
        tanggal: pertemuan.tanggal,
        status: pertemuan.status,
        pengajar_nama: pertemuan.pengajar_nama || '',
        materi: pertemuan.materi || '',
        catatan: pertemuan.catatan || '',
      });
    } else {
      setEditingPertemuan(null);
      setFormData({
        agenda_id: agendaId && agendaId !== 'all' ? agendaId : agendas[0]?.id || '',
        tanggal: new Date().toISOString().split('T')[0],
        status: 'Terjadwal',
        pengajar_nama: '',
        materi: '',
        catatan: '',
      });
    }
    setDialogOpen(true);
  };

  const handleSavePertemuan = async () => {
    if (!formData.agenda_id || !formData.tanggal) {
      toast.error('Agenda dan tanggal wajib diisi');
      return;
    }
    try {
      if (editingPertemuan) {
        await AkademikPertemuanService.updatePertemuan(editingPertemuan.id, formData);
        toast.success('Pertemuan diperbarui');
      } else {
        const agenda = agendas.find(a => a.id === formData.agenda_id);
        await AkademikPertemuanService.createPertemuan({
          ...formData,
          kelas_id: agenda?.kelas?.id || kelasId,
        });
        toast.success('Pertemuan ditambahkan');
      }
      setDialogOpen(false);
      loadPertemuan();
    } catch (error: any) {
      toast.error(error.message || 'Gagal menyimpan pertemuan');
    }
  };

  const handleDeletePertemuan = async (id: string) => {
    if (!confirm('Hapus pertemuan ini?')) return;
    try {
      await AkademikPertemuanService.deletePertemuan(id);
      toast.success('Pertemuan dihapus');
      loadPertemuan();
    } catch (error: any) {
      toast.error(error.message || 'Gagal menghapus pertemuan');
    }
  };

  const handleGoToAbsensi = (pertemuan: KelasPertemuan) => {
    const params = new URLSearchParams();
    if (pertemuan.kelas?.id) params.set('kelasId', pertemuan.kelas.id);
    if (pertemuan.id) params.set('pertemuanId', pertemuan.id);
    if (pertemuan.agenda_id) params.set('agendaId', pertemuan.agenda_id);
    if (pertemuan.tanggal) params.set('tanggal', pertemuan.tanggal);
    navigate(`/akademik/presensi?${params.toString()}`);
  };

  const handleGoToSetoran = (pertemuan: KelasPertemuan) => {
    const params = new URLSearchParams();
    if (pertemuan.kelas?.program) params.set('program', pertemuan.kelas.program);
    if (pertemuan.tanggal) params.set('tanggal', pertemuan.tanggal);
    if (pertemuan.agenda_id) params.set('agendaId', pertemuan.agenda_id);
    navigate(`/akademik/setoran?${params.toString()}`);
  };

  // Quick action: Tandai selesai
  const handleQuickMarkSelesai = async (pertemuan: KelasPertemuan) => {
    if (pertemuan.status === 'Selesai') {
      toast.info('Pertemuan sudah selesai');
      return;
    }
    try {
      await AkademikPertemuanService.updatePertemuan(pertemuan.id, {
        status: 'Selesai',
      });
      toast.success('Pertemuan ditandai selesai');
      loadPertemuan();
    } catch (error: any) {
      toast.error(error.message || 'Gagal memperbarui status');
    }
  };

  // Quick action: Edit jadwal (hanya tanggal)
  const handleQuickEditJadwal = async (pertemuan: KelasPertemuan, newTanggal: string) => {
    try {
      await AkademikPertemuanService.updatePertemuan(pertemuan.id, {
        tanggal: newTanggal,
      });
      toast.success('Jadwal diperbarui');
      loadPertemuan();
    } catch (error: any) {
      toast.error(error.message || 'Gagal memperbarui jadwal');
    }
  };

  const handleOpenQuickEditJadwal = (pertemuan: KelasPertemuan) => {
    setQuickEditDialog({ open: true, pertemuan });
    setQuickEditTanggal(pertemuan.tanggal);
  };

  const handleSaveQuickEditJadwal = async () => {
    if (!quickEditDialog.pertemuan) return;
    await handleQuickEditJadwal(quickEditDialog.pertemuan, quickEditTanggal);
    setQuickEditDialog({ open: false, pertemuan: null });
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-semibold">Jurnal Pertemuan</h2>
          <p className="text-sm text-muted-foreground">Kelola dan catat pertemuan per agenda secara terpusat.</p>
        </div>
        <Button onClick={() => handleOpenDialog()}>
          <Plus className="w-4 h-4 mr-2" />
          Tambah Pertemuan
        </Button>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Filter</CardTitle>
          <CardDescription>Pilih semester untuk melihat jurnal pertemuan. Kelas dan agenda bersifat opsional.</CardDescription>
        </CardHeader>
        <CardContent className="grid gap-4 md:grid-cols-3">
          <div>
            <Label>Semester *</Label>
            <Select value={selectedSemesterId} onValueChange={setSelectedSemesterId}>
              <SelectTrigger>
                <SelectValue placeholder="Pilih semester" />
              </SelectTrigger>
              <SelectContent>
                {semesters.map(semester => (
                  <SelectItem key={semester.id} value={semester.id}>
                    {semester.nama} • {semester.tahun_ajaran?.nama || 'Tahun Ajaran'}
                    {semester.is_aktif && ' (Aktif)'}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            {selectedSemesterId && (
              <p className="text-xs text-muted-foreground mt-1">
                {semesters.find(s => s.id === selectedSemesterId)?.tanggal_mulai && 
                  new Date(semesters.find(s => s.id === selectedSemesterId)!.tanggal_mulai).toLocaleDateString('id-ID')} — {' '}
                {semesters.find(s => s.id === selectedSemesterId)?.tanggal_selesai && 
                  new Date(semesters.find(s => s.id === selectedSemesterId)!.tanggal_selesai).toLocaleDateString('id-ID')}
              </p>
            )}
          </div>
          <div>
            <Label>Kelas (Opsional)</Label>
            <Select value={kelasId} onValueChange={setKelasId}>
              <SelectTrigger>
                <SelectValue placeholder="Semua kelas" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Semua Kelas</SelectItem>
                {classes.map(k => (
                  <SelectItem key={k.id} value={k.id}>
                    {k.nama_kelas} {k.rombel ? `- ${k.rombel}` : ''} ({k.program})
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div>
            <Label>Agenda (Opsional)</Label>
            <Select value={agendaId} onValueChange={setAgendaId}>
              <SelectTrigger>
                <SelectValue placeholder="Semua agenda" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Semua Agenda</SelectItem>
                {agendas.map(agenda => (
                  <SelectItem key={agenda.id} value={agenda.id}>
                    {agendaLabel(agenda)}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            {kelasId === 'all' && (
              <p className="text-xs text-muted-foreground mt-1">
                Pilih kelas terlebih dahulu untuk melihat agenda
              </p>
            )}
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Daftar Pertemuan</CardTitle>
          <CardDescription>Ringkasan pertemuan berdasarkan filter yang dipilih.</CardDescription>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="text-center py-8 text-muted-foreground">Memuat pertemuan...</div>
          ) : pertemuanList.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              Tidak ada pertemuan untuk filter ini. Klik “Tambah Pertemuan” untuk menjadwalkan.
            </div>
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Tanggal</TableHead>
                    <TableHead>Agenda</TableHead>
                    <TableHead>Pengajar</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Materi</TableHead>
                    <TableHead>Catatan</TableHead>
                    <TableHead className="text-right">Aksi</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {pertemuanList.map(pertemuan => (
                    <TableRow key={pertemuan.id}>
                      <TableCell>
                        <div className="font-medium">
                          {new Date(pertemuan.tanggal).toLocaleDateString('id-ID', {
                            weekday: 'short',
                            day: '2-digit',
                            month: 'short',
                          })}
                        </div>
                      </TableCell>
                      <TableCell>
                        <div className="space-y-1">
                          {/* Nama agenda atau mapel dengan quick actions */}
                          <div className="flex items-center gap-2">
                            <div className="font-semibold flex-1">
                              {pertemuan.agenda?.mapel_nama || pertemuan.agenda?.mapel?.nama_mapel || pertemuan.agenda?.nama_agenda || '-'}
                            </div>
                            <div className="flex items-center gap-1">
                              {/* Quick action: Tandai Selesai */}
                              {pertemuan.status !== 'Selesai' && (
                                <Button
                                  size="icon"
                                  variant="ghost"
                                  className="h-7 w-7"
                                  onClick={() => handleQuickMarkSelesai(pertemuan)}
                                  title="Tandai selesai"
                                >
                                  <CheckCircle2 className="w-4 h-4 text-green-600" />
                                </Button>
                              )}
                              {/* Quick action: Absensi */}
                              <Button
                                size="icon"
                                variant="ghost"
                                className="h-7 w-7"
                                onClick={() => handleGoToAbsensi(pertemuan)}
                                title="Input absensi"
                              >
                                <Users className="w-4 h-4 text-blue-600" />
                              </Button>
                              {/* Quick action: Edit Jadwal */}
                              <Button
                                size="icon"
                                variant="ghost"
                                className="h-7 w-7"
                                onClick={() => handleOpenQuickEditJadwal(pertemuan)}
                                title="Edit jadwal (tanggal)"
                              >
                                <CalendarDays className="w-4 h-4 text-orange-600" />
                              </Button>
                            </div>
                          </div>
                          
                          {/* Tampilkan nama agenda hanya jika berbeda dengan mapel */}
                          {(pertemuan.agenda?.mapel_nama || pertemuan.agenda?.mapel?.nama_mapel) && 
                           pertemuan.agenda?.nama_agenda &&
                           pertemuan.agenda.nama_agenda !== (pertemuan.agenda.mapel_nama || pertemuan.agenda.mapel?.nama_mapel) && (
                            <p className="text-xs text-muted-foreground">
                              {pertemuan.agenda.nama_agenda}
                            </p>
                          )}
                          
                          {/* Info kelas jika berbeda dari filter */}
                          {pertemuan.kelas && (kelasId === 'all' || pertemuan.kelas.id !== kelasId) && (
                            <p className="text-xs text-primary font-medium">
                              {pertemuan.kelas.nama_kelas}
                              {pertemuan.kelas.rombel && ` - ${pertemuan.kelas.rombel}`}
                          </p>
                          )}
                          
                          {/* Jadwal (hari dan jam) */}
                        {pertemuan.agenda?.hari && (
                          <p className="text-xs text-muted-foreground">
                              {pertemuan.agenda.hari}
                            {pertemuan.agenda.jam_mulai
                                ? ` (${pertemuan.agenda.jam_mulai.slice(0, 5)} - ${
                                  pertemuan.agenda.jam_selesai
                                    ? pertemuan.agenda.jam_selesai.slice(0, 5)
                                    : 'Selesai'
                                })`
                              : ''}
                          </p>
                        )}
                        </div>
                      </TableCell>
                      <TableCell>
                        {pertemuan.pengajar_nama ? (
                          pertemuan.pengajar_nama
                        ) : (
                          <span className="text-muted-foreground">-</span>
                        )}
                      </TableCell>
                      <TableCell>{formatStatusBadge(pertemuan.status)}</TableCell>
                      <TableCell className="max-w-xs whitespace-pre-wrap text-sm">
                        {pertemuan.materi || <span className="text-muted-foreground">-</span>}
                      </TableCell>
                      <TableCell className="max-w-xs whitespace-pre-wrap text-sm">
                        {pertemuan.catatan || <span className="text-muted-foreground">-</span>}
                      </TableCell>
                      <TableCell className="text-right">
                        <div className="inline-flex items-center gap-2">
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => handleGoToSetoran(pertemuan)}
                          >
                            Setoran
                          </Button>
                          <Button 
                            size="icon" 
                            variant="ghost" 
                            onClick={() => handleOpenDialog(pertemuan)}
                            title="Edit lengkap"
                          >
                            <Edit className="w-4 h-4 text-blue-600" />
                          </Button>
                          <Button 
                            size="icon" 
                            variant="ghost" 
                            onClick={() => handleDeletePertemuan(pertemuan.id)}
                            title="Hapus"
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

      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="max-w-xl">
          <DialogHeader>
            <DialogTitle>{editingPertemuan ? 'Edit Pertemuan' : 'Tambah Pertemuan'}</DialogTitle>
            <DialogDescription>
              Atur jadwal pertemuan untuk agenda kelas ini. Data ini akan membantu rekap dan pengajar.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label>Agenda *</Label>
              <Select
                value={formData.agenda_id}
                onValueChange={(value) => setFormData({ ...formData, agenda_id: value })}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Pilih agenda" />
                </SelectTrigger>
                <SelectContent>
                  {agendas.map(agenda => (
                    <SelectItem key={agenda.id} value={agenda.id}>
                      {agendaLabel(agenda)}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label>Tanggal *</Label>
              <Input
                type="date"
                value={formData.tanggal}
                onChange={(e) => setFormData({ ...formData, tanggal: e.target.value })}
              />
            </div>
            <div>
              <Label>Status *</Label>
              <Select
                value={formData.status}
                onValueChange={(value: PertemuanStatus) => setFormData({ ...formData, status: value })}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="Terjadwal">Terjadwal</SelectItem>
                  <SelectItem value="Berjalan">Berjalan</SelectItem>
                  <SelectItem value="Selesai">Selesai</SelectItem>
                  <SelectItem value="Batal">Batal</SelectItem>
                  <SelectItem value="Tunda">Tunda</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label>Pengajar</Label>
              <Input
                value={formData.pengajar_nama || ''}
                onChange={(e) => setFormData({ ...formData, pengajar_nama: e.target.value })}
                placeholder="Contoh: Ust. Ahmad"
              />
            </div>
            <div>
              <Label>Materi</Label>
              <Textarea
                rows={3}
                value={formData.materi || ''}
                onChange={(e) => setFormData({ ...formData, materi: e.target.value })}
              />
            </div>
            <div>
              <Label>Catatan</Label>
              <Textarea
                rows={3}
                value={formData.catatan || ''}
                onChange={(e) => setFormData({ ...formData, catatan: e.target.value })}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDialogOpen(false)}>
              Batal
            </Button>
            <Button onClick={handleSavePertemuan}>
              Simpan Pertemuan
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Dialog Quick Edit Jadwal */}
      <Dialog open={quickEditDialog.open} onOpenChange={(open) => setQuickEditDialog({ open, pertemuan: null })}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Edit Jadwal Pertemuan</DialogTitle>
            <DialogDescription>
              Ubah tanggal pertemuan. Agenda dan pengaturan lain tetap sama.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label>Tanggal Baru *</Label>
              <Input
                type="date"
                value={quickEditTanggal}
                onChange={(e) => setQuickEditTanggal(e.target.value)}
              />
            </div>
            {quickEditDialog.pertemuan && (
              <div className="text-sm text-muted-foreground">
                <p>Agenda: {quickEditDialog.pertemuan.agenda?.mapel_nama || quickEditDialog.pertemuan.agenda?.nama_agenda || '-'}</p>
                <p>Tanggal lama: {new Date(quickEditDialog.pertemuan.tanggal).toLocaleDateString('id-ID')}</p>
              </div>
            )}
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setQuickEditDialog({ open: false, pertemuan: null })}>
              Batal
            </Button>
            <Button onClick={handleSaveQuickEditJadwal} disabled={!quickEditTanggal}>
              Simpan
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default JurnalPertemuanPage;



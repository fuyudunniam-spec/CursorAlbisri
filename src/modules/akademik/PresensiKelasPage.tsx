import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { useAuth } from '@/hooks/useAuth';
import { AkademikPertemuanService, KelasPertemuan } from '@/services/akademikPertemuan.service';
import { AkademikKelasService, KelasMaster } from '@/services/akademikKelas.service';
import { AkademikSemesterService, Semester } from '@/services/akademikSemester.service';
import { AbsensiMadinService, AbsensiMadinInput } from '@/services/absensiMadin.service';
import { AkademikPengajarService } from '@/services/akademikPengajar.service';
import { AkademikAgendaService } from '@/services/akademikAgenda.service';
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
import { Users, Save, RefreshCw, CheckCircle2, XCircle, AlertCircle, Clock, Search } from 'lucide-react';

interface AnggotaKelas {
  id: string;
  nama_lengkap: string;
  id_santri?: string;
}

interface AbsensiData {
  santri_id: string;
  status: 'Hadir' | 'Izin' | 'Sakit' | 'Alfa';
}

const formatDate = (tanggal: string) =>
  new Date(tanggal).toLocaleDateString('id-ID', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' });

const formatTime = (iso?: string | null) => {
  if (!iso) return '-';
  try {
    return new Date(iso).toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' });
  } catch {
    return '-';
  }
};

const normalizeTanggal = (tanggal: string): string => {
  if (/^\d{4}-\d{2}-\d{2}$/.test(tanggal)) {
    return tanggal;
  }
  return tanggal.split('T')[0];
};

const PresensiKelasPage: React.FC = () => {
  const [searchParams] = useSearchParams();
  const { user } = useAuth();
  const isPengajar = user?.role === 'pengajar' || user?.roles?.includes('pengajar');
  const [pengajarId, setPengajarId] = useState<string | null>(null);
  const urlKelasId = searchParams.get('kelasId') || '';
  const urlPertemuanId = searchParams.get('pertemuanId') || '';
  const urlAgendaId = searchParams.get('agendaId') || '';
  const urlTanggal = searchParams.get('tanggal') || '';

  const [semesters, setSemesters] = useState<Semester[]>([]);
  const [selectedSemesterId, setSelectedSemesterId] = useState<string>('');
  const [classes, setClasses] = useState<KelasMaster[]>([]);
  const [kelasId, setKelasId] = useState<string>(urlKelasId || '');
  const [pertemuanList, setPertemuanList] = useState<KelasPertemuan[]>([]);
  const [loading, setLoading] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');

  // Dialog absensi
  const [absensiDialogOpen, setAbsensiDialogOpen] = useState(false);
  const [selectedPertemuan, setSelectedPertemuan] = useState<KelasPertemuan | null>(null);
  const [anggota, setAnggota] = useState<AnggotaKelas[]>([]);
  const [absensiData, setAbsensiData] = useState<Record<string, AbsensiData>>({});
  const [materi, setMateri] = useState<string>('');
  const [saving, setSaving] = useState(false);
  const [loadingAnggota, setLoadingAnggota] = useState(false);
  const [hasAutoOpened, setHasAutoOpened] = useState(false);

  const selectedKelas = classes.find(k => k.id === kelasId);

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

  const loadSemesters = useCallback(async () => {
    try {
      const list = await AkademikSemesterService.listSemester();
      setSemesters(list);
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

  const loadClasses = useCallback(async (semesterId?: string) => {
    try {
      let list: KelasMaster[];
      
      // Jika pengajar, hanya ambil kelas yang di-assign ke mereka
      if (isPengajar && pengajarId) {
        list = await AkademikKelasService.listKelasByPengajar(pengajarId);
      } else {
        list = await AkademikKelasService.listKelas();
      }
      
      let filtered = list;
      if (semesterId) {
        filtered = list.filter(k => k.semester_id === semesterId);
      }
      setClasses(filtered);
      
      // Set kelasId jika belum ada atau kelas yang dipilih tidak ada lagi
      if (urlKelasId && filtered.some(k => k.id === urlKelasId)) {
        setKelasId(urlKelasId);
      } else if (!kelasId && filtered.length > 0) {
        setKelasId(filtered[0].id);
      } else if (kelasId && !filtered.some(k => k.id === kelasId)) {
        setKelasId(filtered.length > 0 ? filtered[0].id : '');
      }
    } catch (error: any) {
      toast.error(error.message || 'Gagal memuat kelas');
      setClasses([]);
    }
  }, [isPengajar, pengajarId]);

  const loadPertemuan = useCallback(async () => {
    if (!kelasId || !selectedSemesterId) {
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
        kelasId: kelasId,
        startDate: semester.tanggal_mulai,
        endDate: semester.tanggal_selesai,
      });
      
      // Jika pengajar, filter hanya pertemuan yang terkait dengan agenda mereka
      if (isPengajar && pengajarId) {
        // Ambil agenda yang di-assign ke pengajar untuk kelas ini
        const pengajarAgendas = await AkademikAgendaService.listAgendaByPengajar(pengajarId, { aktifOnly: false });
        const agendaIds = pengajarAgendas.filter(a => a.kelas_id === kelasId).map(a => a.id);
        data = data.filter(p => p.agenda_id && agendaIds.includes(p.agenda_id));
      }
      
      setPertemuanList(data);
    } catch (error: any) {
      toast.error(error.message || 'Gagal memuat daftar pertemuan');
    } finally {
      setLoading(false);
    }
  }, [kelasId, selectedSemesterId, semesters, isPengajar, pengajarId]);

  const handleOpenAbsensiDialog = useCallback(async (pertemuan: KelasPertemuan): Promise<void> => {
    // Cek apakah pertemuan sudah Berjalan atau Selesai
    if (pertemuan.status !== 'Berjalan' && pertemuan.status !== 'Selesai') {
      toast.error('Absensi hanya dapat dilakukan untuk pertemuan yang sudah ditandai sebagai Berjalan atau Selesai');
      return;
    }

    setSelectedPertemuan(pertemuan);
    setMateri(pertemuan.materi || '');
    setAbsensiDialogOpen(true);
    setLoadingAnggota(true);

    try {
      // Load anggota kelas
      const anggotaList = await AbsensiMadinService.getAnggotaKelas(pertemuan.kelas?.id || kelasId);
      setAnggota(anggotaList);

      // Load absensi yang sudah ada
      const tanggal = normalizeTanggal(pertemuan.tanggal);
      const existingAbsensi = await AbsensiMadinService.listAbsensi(
        pertemuan.kelas?.id || kelasId,
        tanggal,
        pertemuan.agenda_id || undefined
      );

      const absensiMap: Record<string, AbsensiData> = {};
      existingAbsensi.forEach(ab => {
        absensiMap[ab.santri_id] = {
          santri_id: ab.santri_id,
          status: ab.status,
        };
      });

      // Set default status Hadir untuk santri yang belum memiliki data absensi
      anggotaList.forEach(santri => {
        if (!absensiMap[santri.id]) {
          absensiMap[santri.id] = {
            santri_id: santri.id,
            status: 'Hadir',
          };
        }
      });

      setAbsensiData(absensiMap);
    } catch (error: any) {
      toast.error(error.message || 'Gagal memuat data peserta kelas');
    } finally {
      setLoadingAnggota(false);
    }
  }, [kelasId]);

  useEffect(() => {
    loadSemesters();
  }, [loadSemesters]);

  useEffect(() => {
    if (selectedSemesterId) {
      loadClasses(selectedSemesterId);
    } else {
      setClasses([]);
      setKelasId('');
    }
  }, [selectedSemesterId, loadClasses]);

  useEffect(() => {
    if (kelasId && selectedSemesterId) {
      loadPertemuan();
    }
  }, [kelasId, selectedSemesterId, loadPertemuan]);

  // Auto-open absensi dialog jika ada parameter pertemuanId dari URL
  useEffect(() => {
    if (hasAutoOpened || !kelasId || pertemuanList.length === 0) return;

    let pertemuan: KelasPertemuan | undefined;

    if (urlPertemuanId) {
      pertemuan = pertemuanList.find(p => p.id === urlPertemuanId);
    } else if (urlAgendaId && urlTanggal) {
      // Fallback: cari berdasarkan agendaId dan tanggal
      const normalizedTanggal = normalizeTanggal(urlTanggal);
      pertemuan = pertemuanList.find(
        p => p.agenda_id === urlAgendaId && normalizeTanggal(p.tanggal) === normalizedTanggal
      );
    }

    if (pertemuan) {
      setHasAutoOpened(true);
      handleOpenAbsensiDialog(pertemuan).then(() => {
        // Hapus parameter dari URL setelah dialog dibuka
        const newParams = new URLSearchParams(searchParams);
        newParams.delete('pertemuanId');
        newParams.delete('agendaId');
        newParams.delete('tanggal');
        window.history.replaceState({}, '', `${window.location.pathname}?${newParams.toString()}`);
      });
    }
  }, [urlPertemuanId, urlAgendaId, urlTanggal, pertemuanList, kelasId, hasAutoOpened, searchParams, handleOpenAbsensiDialog]);

  const handleStatusChange = (santriId: string, status: 'Hadir' | 'Izin' | 'Sakit' | 'Alfa') => {
    setAbsensiData(prev => ({
      ...prev,
      [santriId]: {
        ...prev[santriId],
        santri_id: santriId,
        status,
      },
    }));
  };

  const handleSaveAbsensi = async () => {
    if (!selectedPertemuan || !kelasId) {
      toast.error('Data pertemuan tidak valid');
      return;
    }

    try {
      setSaving(true);
      const tanggal = normalizeTanggal(selectedPertemuan.tanggal);
      const agendaId = selectedPertemuan.agenda_id || null;
      const pengajarId = selectedPertemuan.pengajar_id || undefined;

      // Simpan absensi untuk setiap santri
      for (const santri of anggota) {
        const data = absensiData[santri.id];
        if (!data || !data.status) {
          continue;
        }

        const input: AbsensiMadinInput = {
          santri_id: santri.id,
          kelas_id: selectedPertemuan.kelas?.id || kelasId,
          tanggal: tanggal,
          status: data.status,
          materi: materi.trim() || undefined,
          agenda_id: agendaId,
          pengajar_id: pengajarId,
        };

        const existing = await AbsensiMadinService.getAbsensiBySantri(
          santri.id,
          tanggal,
          selectedPertemuan.kelas?.id || kelasId,
          agendaId
        );

        if (existing) {
          await AbsensiMadinService.updateAbsensi(existing.id, input);
        } else {
          await AbsensiMadinService.createAbsensi(input);
        }
      }

      // Update status pertemuan menjadi Selesai
      if (selectedPertemuan.status !== 'Selesai') {
        await AkademikPertemuanService.updatePertemuan(selectedPertemuan.id, {
          status: 'Selesai',
          materi: materi.trim() || null,
        });
      }

      toast.success('Absensi berhasil disimpan');
      setAbsensiDialogOpen(false);
      setHasAutoOpened(false);
      loadPertemuan();
    } catch (error: any) {
      toast.error(error.message || 'Gagal menyimpan absensi');
    } finally {
      setSaving(false);
    }
  };

  const getStatusBadge = (status?: string) => {
    switch (status) {
      case 'Hadir':
        return <Badge className="bg-green-100 text-green-800">Hadir</Badge>;
      case 'Izin':
        return <Badge className="bg-yellow-100 text-yellow-800">Izin</Badge>;
      case 'Sakit':
        return <Badge className="bg-blue-100 text-blue-800">Sakit</Badge>;
      case 'Alfa':
        return <Badge className="bg-red-100 text-red-800">Alfa</Badge>;
      default:
        return <Badge variant="outline">-</Badge>;
    }
  };

  const getPertemuanStatusBadge = (status: string) => {
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

  // Hitung statistik absensi untuk setiap pertemuan
  const getAbsensiStats = useCallback(async (pertemuan: KelasPertemuan) => {
    try {
      const tanggal = normalizeTanggal(pertemuan.tanggal);
      const absensi = await AbsensiMadinService.listAbsensi(
        pertemuan.kelas?.id || kelasId,
        tanggal,
        pertemuan.agenda_id || undefined
      );
      const hadir = absensi.filter(a => a.status === 'Hadir').length;
      const total = absensi.length;
      return { hadir, total, percentage: total > 0 ? Math.round((hadir / total) * 100) : 0 };
    } catch {
      return { hadir: 0, total: 0, percentage: 0 };
    }
  }, [kelasId]);

  // Filter pertemuan berdasarkan search term
  const filteredPertemuan = useMemo(() => {
    if (!searchTerm) return pertemuanList;
    const term = searchTerm.toLowerCase();
    return pertemuanList.filter(p => {
      const tanggalStr = formatDate(p.tanggal).toLowerCase();
      const agendaStr = p.agenda?.nama_agenda?.toLowerCase() || '';
      const materiStr = p.materi?.toLowerCase() || '';
      const pengajarStr = p.pengajar_nama?.toLowerCase() || '';
      return (
        tanggalStr.includes(term) ||
        agendaStr.includes(term) ||
        materiStr.includes(term) ||
        pengajarStr.includes(term)
      );
    });
  }, [pertemuanList, searchTerm]);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-semibold">Presensi Kelas</h2>
          <p className="text-sm text-muted-foreground">Lihat dan kelola presensi peserta kelas untuk setiap pertemuan</p>
        </div>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Filter</CardTitle>
          <CardDescription>Pilih semester dan kelas untuk melihat daftar pertemuan</CardDescription>
        </CardHeader>
        <CardContent className="grid gap-4 md:grid-cols-3">
          <div>
            <Label>Semester *</Label>
            <Select value={selectedSemesterId} onValueChange={setSelectedSemesterId}>
              <SelectTrigger><SelectValue placeholder="Pilih semester" /></SelectTrigger>
              <SelectContent>
                {semesters.map(semester => (
                  <SelectItem key={semester.id} value={semester.id}>
                    {semester.nama} • {semester.tahun_ajaran?.nama || 'Tahun Ajaran'}
                    {semester.is_aktif && ' (Aktif)'}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div>
            <Label>Kelas *</Label>
            <Select value={kelasId || undefined} onValueChange={(value) => setKelasId(value)} disabled={!selectedSemesterId || classes.length === 0}>
              <SelectTrigger><SelectValue placeholder={!selectedSemesterId ? "Pilih semester dulu" : classes.length === 0 ? "Tidak ada kelas" : "Pilih kelas"} /></SelectTrigger>
              <SelectContent>
                {classes.length === 0 ? (
                  <div className="px-2 py-1.5 text-sm text-muted-foreground">Tidak ada kelas untuk semester ini</div>
                ) : (
                  classes.map(k => (
                    <SelectItem key={k.id} value={k.id}>
                      {k.nama_kelas} {k.rombel ? `- ${k.rombel}` : ''} ({k.program})
                    </SelectItem>
                  ))
                )}
              </SelectContent>
            </Select>
            {!selectedSemesterId && (
              <p className="text-xs text-muted-foreground mt-1">Pilih semester terlebih dahulu</p>
            )}
          </div>
          <div>
            <Label>Cari</Label>
            <div className="relative">
              <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Cari pertemuan..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-8"
              />
            </div>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Presensi Kelas</CardTitle>
          <CardDescription>
            {selectedKelas
              ? `${selectedKelas.nama_kelas} ${selectedKelas.rombel ? `- ${selectedKelas.rombel}` : ''} (${selectedKelas.program})`
              : 'Pilih kelas terlebih dahulu'}
          </CardDescription>
        </CardHeader>
        <CardContent>
          {!selectedSemesterId ? (
            <div className="text-center py-8 text-muted-foreground">Pilih semester terlebih dahulu</div>
          ) : !kelasId ? (
            <div className="text-center py-8 text-muted-foreground">Pilih kelas terlebih dahulu</div>
          ) : loading ? (
            <div className="text-center py-8 text-muted-foreground">Memuat data...</div>
          ) : filteredPertemuan.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              Tidak ada pertemuan untuk kelas ini pada semester yang dipilih
            </div>
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="w-12">No</TableHead>
                    <TableHead>Hari / Tanggal</TableHead>
                    <TableHead>Mulai</TableHead>
                    <TableHead>Selesai</TableHead>
                    <TableHead>Rencana & Realisasi Materi</TableHead>
                    <TableHead>Pengajar</TableHead>
                    <TableHead>Ruang</TableHead>
                    <TableHead className="text-center">Hadir</TableHead>
                    <TableHead className="text-center">%</TableHead>
                    <TableHead className="text-center">Absen</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredPertemuan.map((pertemuan, index) => {
                    const canAbsensi = pertemuan.status === 'Berjalan' || pertemuan.status === 'Selesai';
                    return (
                      <TableRow key={pertemuan.id}>
                        <TableCell>{index + 1}</TableCell>
                        <TableCell>
                          <div className="font-medium">{formatDate(pertemuan.tanggal)}</div>
                          {getPertemuanStatusBadge(pertemuan.status)}
                        </TableCell>
                        <TableCell>
                          {pertemuan.agenda?.jam_mulai
                            ? pertemuan.agenda.jam_mulai.slice(0, 5)
                            : '-'}
                        </TableCell>
                        <TableCell>
                          {pertemuan.agenda?.jam_selesai
                            ? pertemuan.agenda.jam_selesai.slice(0, 5)
                            : '-'}
                        </TableCell>
                        <TableCell className="max-w-xs">
                          <div className="text-sm whitespace-pre-wrap">
                            {pertemuan.materi || <span className="text-muted-foreground">-</span>}
                          </div>
                        </TableCell>
                        <TableCell>
                          {pertemuan.pengajar_nama || <span className="text-muted-foreground">-</span>}
                        </TableCell>
                        <TableCell>
                          {pertemuan.agenda?.lokasi || <span className="text-muted-foreground">-</span>}
                        </TableCell>
                        <TableCell className="text-center">
                          <PertemuanAbsensiStats pertemuan={pertemuan} kelasId={kelasId} />
                        </TableCell>
                        <TableCell className="text-center">
                          <PertemuanAbsensiPercentage pertemuan={pertemuan} kelasId={kelasId} />
                        </TableCell>
                        <TableCell className="text-center">
                          <Button
                            size="sm"
                            variant={canAbsensi ? 'default' : 'outline'}
                            onClick={() => handleOpenAbsensiDialog(pertemuan)}
                            disabled={!canAbsensi}
                            className={canAbsensi ? 'bg-blue-600 hover:bg-blue-700' : ''}
                          >
                            <Users className="w-4 h-4" />
                          </Button>
                        </TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Dialog Absensi */}
      <Dialog open={absensiDialogOpen} onOpenChange={(open) => {
        setAbsensiDialogOpen(open);
        if (!open) {
          setHasAutoOpened(false);
        }
      }}>
        <DialogContent className="max-w-4xl max-h-[90vh] flex flex-col">
          <DialogHeader>
            <DialogTitle>Absensi Peserta Kelas</DialogTitle>
            <DialogDescription>
              {selectedPertemuan && (
                <>
                  {selectedPertemuan.agenda?.nama_agenda || 'Pertemuan'} • {formatDate(selectedPertemuan.tanggal)}
                  {selectedPertemuan.agenda?.jam_mulai && (
                    <> • {selectedPertemuan.agenda.jam_mulai.slice(0, 5)} - {selectedPertemuan.agenda.jam_selesai?.slice(0, 5) || 'Selesai'}</>
                  )}
                </>
              )}
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 flex-1 overflow-hidden flex flex-col">
            <div>
              <Label>Materi Pembelajaran</Label>
              <Textarea
                value={materi}
                onChange={(e) => setMateri(e.target.value)}
                placeholder="Masukkan materi pembelajaran"
                rows={2}
              />
            </div>

            {loadingAnggota ? (
              <div className="text-center py-8 text-muted-foreground">Memuat data peserta...</div>
            ) : anggota.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground">Tidak ada peserta kelas</div>
            ) : (
              <div className="flex-1 overflow-y-auto border rounded-lg">
                <Table>
                  <TableHeader className="sticky top-0 bg-background">
                    <TableRow>
                      <TableHead className="w-12">No</TableHead>
                      <TableHead>Nama Santri</TableHead>
                      <TableHead>ID Santri</TableHead>
                      <TableHead>Status</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {anggota.map((santri, index) => (
                      <TableRow key={santri.id}>
                        <TableCell>{index + 1}</TableCell>
                        <TableCell className="font-medium">{santri.nama_lengkap}</TableCell>
                        <TableCell>{santri.id_santri || '-'}</TableCell>
                        <TableCell>
                          <Select
                            value={absensiData[santri.id]?.status || 'Hadir'}
                            onValueChange={(v: any) => handleStatusChange(santri.id, v)}
                          >
                            <SelectTrigger className="w-32">
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="Hadir">Hadir</SelectItem>
                              <SelectItem value="Izin">Izin</SelectItem>
                              <SelectItem value="Sakit">Sakit</SelectItem>
                              <SelectItem value="Alfa">Alfa</SelectItem>
                            </SelectContent>
                          </Select>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            )}
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => {
              setAbsensiDialogOpen(false);
              setHasAutoOpened(false);
            }}>
              Batal
            </Button>
            <Button onClick={handleSaveAbsensi} disabled={saving || anggota.length === 0}>
              <Save className="w-4 h-4 mr-2" />
              {saving ? 'Menyimpan...' : 'Simpan Absensi'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

// Komponen untuk menampilkan statistik absensi per pertemuan
const PertemuanAbsensiStats: React.FC<{ pertemuan: KelasPertemuan; kelasId: string }> = ({ pertemuan, kelasId }) => {
  const [stats, setStats] = useState<{ hadir: number; total: number }>({ hadir: 0, total: 0 });

  useEffect(() => {
    let cancelled = false;
    const loadStats = async () => {
      try {
        const tanggal = normalizeTanggal(pertemuan.tanggal);
        const absensi = await AbsensiMadinService.listAbsensi(
          pertemuan.kelas?.id || kelasId,
          tanggal,
          pertemuan.agenda_id || undefined
        );
        if (!cancelled) {
          const hadir = absensi.filter(a => a.status === 'Hadir').length;
          setStats({ hadir, total: absensi.length });
        }
      } catch {
        if (!cancelled) {
          setStats({ hadir: 0, total: 0 });
        }
      }
    };
    loadStats();
    return () => {
      cancelled = true;
    };
  }, [pertemuan.id, pertemuan.tanggal, pertemuan.kelas?.id, pertemuan.agenda_id, kelasId]);

  return <span>{stats.hadir}/{stats.total}</span>;
};

// Komponen untuk menampilkan persentase absensi per pertemuan
const PertemuanAbsensiPercentage: React.FC<{ pertemuan: KelasPertemuan; kelasId: string }> = ({ pertemuan, kelasId }) => {
  const [percentage, setPercentage] = useState<number>(0);

  useEffect(() => {
    let cancelled = false;
    const loadPercentage = async () => {
      try {
        const tanggal = normalizeTanggal(pertemuan.tanggal);
        const absensi = await AbsensiMadinService.listAbsensi(
          pertemuan.kelas?.id || kelasId,
          tanggal,
          pertemuan.agenda_id || undefined
        );
        if (!cancelled) {
          const hadir = absensi.filter(a => a.status === 'Hadir').length;
          const total = absensi.length;
          setPercentage(total > 0 ? Math.round((hadir / total) * 100) : 0);
        }
      } catch {
        if (!cancelled) {
          setPercentage(0);
        }
      }
    };
    loadPercentage();
    return () => {
      cancelled = true;
    };
  }, [pertemuan.id, pertemuan.tanggal, pertemuan.kelas?.id, pertemuan.agenda_id, kelasId]);

  return <span>{percentage}%</span>;
};

export default PresensiKelasPage;


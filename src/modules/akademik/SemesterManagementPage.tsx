import React, { useCallback, useEffect, useMemo, useState } from 'react';
import {
  AkademikSemesterService,
  Semester,
  SemesterInput,
  SemesterNama,
  TahunAjaran,
  TahunAjaranInput,
} from '@/services/akademikSemester.service';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { toast } from 'sonner';
import { format } from 'date-fns';
import { id as localeID } from 'date-fns/locale';
import { CalendarPlus, CheckCircle2, Copy, Loader2, Pencil, Trash2, AlertCircle } from 'lucide-react';
import { useAuth } from '@/hooks/useAuth';

const formatDate = (dateStr: string) => {
  try {
    return format(new Date(dateStr), 'd MMMM yyyy', { locale: localeID });
  } catch {
    return dateStr;
  }
};

const DEFAULT_SEMESTER_OPTIONS: SemesterNama[] = ['Ganjil', 'Genap', 'Pendek'];

const SemesterManagementPage: React.FC = () => {
  const { user } = useAuth();
  const isAdmin = user?.role === 'admin' || user?.roles?.includes('admin');
  
  const [tahunList, setTahunList] = useState<TahunAjaran[]>([]);
  const [semesterMap, setSemesterMap] = useState<Record<string, Semester[]>>({});
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [createYearDialog, setCreateYearDialog] = useState(false);
  const [createSemesterDialog, setCreateSemesterDialog] = useState<{
    open: boolean;
    tahunId?: string;
    editingSemester?: Semester | null;
  }>({ open: false });
  const [duplicateDialog, setDuplicateDialog] = useState<{ open: boolean; source?: Semester }>({ open: false });

  const [yearForm, setYearForm] = useState<TahunAjaranInput>({
    nama: '',
    kode: '',
    tanggal_mulai: '',
    tanggal_selesai: '',
    status: 'Aktif',
    is_aktif: false,
    catatan: '',
  });

  const [semesterForm, setSemesterForm] = useState<SemesterInput>({
    tahun_ajaran_id: '',
    nama: 'Ganjil',
    tanggal_mulai: '',
    tanggal_selesai: '',
    status: 'Aktif',
    is_aktif: false,
    kode: '',
    catatan: '',
    template_source_id: null,
  });

  const [duplicateTarget, setDuplicateTarget] = useState<SemesterInput>({
    tahun_ajaran_id: '',
    nama: 'Ganjil',
    tanggal_mulai: '',
    tanggal_selesai: '',
    status: 'Aktif',
    is_aktif: false,
    kode: '',
    catatan: '',
    template_source_id: null,
  });

  const loadData = useCallback(async () => {
    try {
      setLoading(true);
      const tahun = await AkademikSemesterService.listTahunAjaran();
      setTahunList(tahun);

      const semesterResult: Record<string, Semester[]> = {};
      await Promise.all(
        tahun.map(async (ta) => {
          const rows = await AkademikSemesterService.listSemester(ta.id);
          semesterResult[ta.id] = rows;
        }),
      );
      setSemesterMap(semesterResult);
    } catch (error: any) {
      toast.error(error.message || 'Gagal memuat data semester');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const activeYearId = useMemo(() => tahunList.find(t => t.is_aktif)?.id, [tahunList]);
  const activeSemesterId = useMemo(() => {
    const sems = Object.values(semesterMap).flat();
    return sems.find(s => s.is_aktif)?.id;
  }, [semesterMap]);

  const handleCreateYear = async () => {
    if (!yearForm.nama || !yearForm.tanggal_mulai || !yearForm.tanggal_selesai) {
      toast.error('Lengkapi nama dan tanggal tahun ajaran.');
      return;
    }
    try {
      setSaving(true);
      const data = await AkademikSemesterService.createTahunAjaran(yearForm);
      if (yearForm.is_aktif) {
        await AkademikSemesterService.setTahunAjaranAktif(data.id);
      }
      toast.success('Tahun ajaran berhasil dibuat');
      setCreateYearDialog(false);
      setYearForm({
        nama: '',
        kode: '',
        tanggal_mulai: '',
        tanggal_selesai: '',
        status: 'Aktif',
        is_aktif: false,
        catatan: '',
      });
      loadData();
    } catch (error: any) {
      toast.error(error.message || 'Gagal membuat tahun ajaran');
    } finally {
      setSaving(false);
    }
  };

  const handleCreateSemester = async () => {
    if (
      !semesterForm.tahun_ajaran_id ||
      !semesterForm.nama ||
      !semesterForm.tanggal_mulai ||
      !semesterForm.tanggal_selesai
    ) {
      toast.error('Lengkapi data semester.');
      return;
    }
    try {
      setSaving(true);
      const editingSemester = createSemesterDialog.editingSemester;
      
      if (editingSemester) {
        // Update existing semester
        await AkademikSemesterService.updateSemester(editingSemester.id, {
          tahun_ajaran_id: semesterForm.tahun_ajaran_id,
          nama: semesterForm.nama,
          kode: semesterForm.kode || null,
          tanggal_mulai: semesterForm.tanggal_mulai,
          tanggal_selesai: semesterForm.tanggal_selesai,
          status: semesterForm.status,
          catatan: semesterForm.catatan || null,
        });
        
        // Handle active status separately
        if (semesterForm.is_aktif && !editingSemester.is_aktif) {
          await AkademikSemesterService.setSemesterAktif(editingSemester.id);
        }
        
        toast.success('Semester berhasil diperbarui');
      } else {
        // Create new semester
        const semester = await AkademikSemesterService.createSemester(semesterForm);
        if (semesterForm.is_aktif) {
          await AkademikSemesterService.setSemesterAktif(semester.id);
        }
        if (semesterForm.template_source_id) {
          try {
            await AkademikSemesterService.duplicateStructure({
              source_semester_id: semesterForm.template_source_id,
              target_semester_id: semester.id,
            });
            toast.success('Struktur semester berhasil di duplikasi');
          } catch (dupError: any) {
            toast.error(dupError.message || 'Struktur terbuat, tapi gagal duplikasi agenda');
          }
        }
        toast.success('Semester berhasil dibuat');
      }
      
      setCreateSemesterDialog({ open: false, editingSemester: null });
      setSemesterForm({
        tahun_ajaran_id: '',
        nama: 'Ganjil',
        tanggal_mulai: '',
        tanggal_selesai: '',
        status: 'Aktif',
        is_aktif: false,
        kode: '',
        catatan: '',
        template_source_id: null,
      });
      loadData();
    } catch (error: any) {
      toast.error(error.message || (createSemesterDialog.editingSemester ? 'Gagal memperbarui semester' : 'Gagal membuat semester'));
    } finally {
      setSaving(false);
    }
  };

  const handleSetYearActive = async (id: string) => {
    try {
      await AkademikSemesterService.setTahunAjaranAktif(id);
      toast.success('Tahun ajaran aktif diperbarui');
      loadData();
    } catch (error: any) {
      toast.error(error.message || 'Gagal mengubah tahun ajaran aktif');
    }
  };

  const handleSetSemesterActive = async (id: string) => {
    try {
      await AkademikSemesterService.setSemesterAktif(id);
      toast.success('Semester aktif diperbarui');
      loadData();
    } catch (error: any) {
      toast.error(error.message || 'Gagal mengubah semester aktif');
    }
  };

  const handleCloseSemester = async (semester: Semester) => {
    try {
      await AkademikSemesterService.updateSemester(semester.id, {
        status: 'Ditutup',
        is_aktif: false,
      });
      toast.success('Semester ditutup');
      loadData();
    } catch (error: any) {
      toast.error(error.message || 'Gagal menutup semester');
    }
  };

  const handleEditSemester = (semester: Semester) => {
    setCreateSemesterDialog({
      open: true,
      tahunId: semester.tahun_ajaran_id,
      editingSemester: semester,
    });
    setSemesterForm({
      tahun_ajaran_id: semester.tahun_ajaran_id,
      nama: semester.nama,
      tanggal_mulai: semester.tanggal_mulai,
      tanggal_selesai: semester.tanggal_selesai,
      status: semester.status,
      is_aktif: semester.is_aktif,
      kode: semester.kode || '',
      catatan: semester.catatan || '',
      template_source_id: null, // Tidak bisa duplikasi saat edit
    });
  };

  const handleDeleteSemester = async (semester: Semester) => {
    if (!confirm(`Apakah Anda yakin ingin menghapus semester "${semester.nama}"?`)) {
      return;
    }
    try {
      await AkademikSemesterService.deleteSemester(semester.id);
      toast.success('Semester berhasil dihapus');
      loadData();
    } catch (error: any) {
      toast.error(error.message || 'Gagal menghapus semester');
    }
  };

  const handleDuplicateSemester = async () => {
    if (!duplicateDialog.source) return;
    if (!duplicateTarget.tanggal_mulai || !duplicateTarget.tanggal_selesai || !duplicateTarget.tahun_ajaran_id) {
      toast.error('Lengkapi data target semester');
      return;
    }
    try {
      setSaving(true);
      // create target semester
      const newSemester = await AkademikSemesterService.createSemester({
        ...duplicateTarget,
        template_source_id: null,
      });
      await AkademikSemesterService.duplicateStructure({
        source_semester_id: duplicateDialog.source.id,
        target_semester_id: newSemester.id,
      });
      toast.success('Semester baru dibuat dan struktur berhasil digandakan.');
      setDuplicateDialog({ open: false });
      loadData();
    } catch (error: any) {
      toast.error(error.message || 'Gagal menggandakan struktur semester');
    } finally {
      setSaving(false);
    }
  };

  // Jika bukan admin, tampilkan pesan akses ditolak
  if (!isAdmin) {
    return (
      <div className="space-y-6">
        <Card>
          <CardContent className="py-12 flex flex-col items-center justify-center gap-4">
            <AlertCircle className="w-12 h-12 text-red-500" />
            <div className="text-center">
              <h2 className="text-xl font-semibold mb-2">Akses Ditolak</h2>
              <p className="text-muted-foreground">
                Hanya Administrator yang dapat mengakses halaman Manajemen Tahun Ajaran & Semester.
              </p>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Manajemen Tahun Ajaran & Semester</h1>
          <p className="text-muted-foreground">
            Atur tahun ajaran, semester aktif, dan duplikasi struktur kelas/agenda per semester.
          </p>
          <div className="mt-2 p-3 bg-blue-50 border border-blue-200 rounded-lg">
            <p className="text-sm text-blue-800">
              <strong>Catatan Penting:</strong> Hanya semester aktif yang digunakan sebagai default saat membuat kelas baru. 
              Semester tidak aktif masih dapat digunakan untuk melihat history dan mengelola jurnal pertemuan yang sudah ada.
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline" onClick={() => setCreateYearDialog(true)}>
            <CalendarPlus className="w-4 h-4 mr-2" />
            Tahun Ajaran Baru
          </Button>
        </div>
      </div>

      {loading ? (
        <Card>
          <CardContent className="py-12 flex items-center justify-center gap-2 text-muted-foreground">
            <Loader2 className="w-5 h-5 animate-spin" />
            Memuat data tahun ajaran...
          </CardContent>
        </Card>
      ) : tahunList.length === 0 ? (
        <Card>
          <CardContent className="py-12 text-center text-muted-foreground">
            Belum ada tahun ajaran. Tambahkan tahun ajaran baru untuk memulai.
          </CardContent>
        </Card>
      ) : (
        tahunList.map(tahun => {
          const semesters = semesterMap[tahun.id] || [];
          return (
            <Card key={tahun.id}>
              <CardHeader className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
                <div>
                  <CardTitle className="flex items-center gap-2">
                    {tahun.nama}
                    {tahun.is_aktif && <Badge className="bg-green-100 text-green-800">Aktif</Badge>}
                    {tahun.status === 'Ditutup' && <Badge variant="outline">Ditutup</Badge>}
                  </CardTitle>
                  <CardDescription>
                    {formatDate(tahun.tanggal_mulai)} — {formatDate(tahun.tanggal_selesai)}
                  </CardDescription>
                </div>
                <div className="flex items-center gap-2">
                  {!tahun.is_aktif && (
                    <Button size="sm" variant="outline" onClick={() => handleSetYearActive(tahun.id)}>
                      Jadikan Aktif
                    </Button>
                  )}
                  <Button
                    size="sm"
                    onClick={() => {
                      setCreateSemesterDialog({ open: true, tahunId: tahun.id });
                      setSemesterForm(prev => ({
                        ...prev,
                        tahun_ajaran_id: tahun.id,
                        nama: 'Ganjil',
                        tanggal_mulai: tahun.tanggal_mulai,
                        tanggal_selesai: tahun.tanggal_selesai,
                        status: 'Aktif',
                        is_aktif: false,
                        template_source_id: null,
                        kode: '',
                        catatan: '',
                      }));
                    }}
                  >
                    Semester Baru
                  </Button>
                </div>
              </CardHeader>
              <CardContent className="space-y-4">
                {semesters.length === 0 ? (
                  <div className="text-sm text-muted-foreground">
                    Belum ada semester di tahun ajaran ini. Tambahkan semester baru.
                  </div>
                ) : (
                  <div className="overflow-x-auto">
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>Semester</TableHead>
                          <TableHead>Rentang</TableHead>
                          <TableHead>Status</TableHead>
                          <TableHead>Catatan</TableHead>
                          <TableHead className="text-right">Aksi</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {semesters.map(semester => (
                          <TableRow key={semester.id}>
                            <TableCell>
                              <div className="font-medium flex items-center gap-2">
                                {semester.nama}
                                {semester.is_aktif && (
                                  <Badge className="bg-green-100 text-green-800 flex items-center gap-1">
                                    <CheckCircle2 className="w-3 h-3" />
                                    Aktif
                                  </Badge>
                                )}
                              </div>
                              {semester.kode && (
                                <p className="text-xs text-muted-foreground">Kode: {semester.kode}</p>
                              )}
                            </TableCell>
                            <TableCell>
                              <div>{formatDate(semester.tanggal_mulai)}</div>
                              <div>{formatDate(semester.tanggal_selesai)}</div>
                            </TableCell>
                            <TableCell>
                              <Badge variant={semester.status === 'Aktif' ? 'default' : 'outline'}>
                                {semester.status}
                              </Badge>
                            </TableCell>
                            <TableCell className="text-sm text-muted-foreground">
                              {semester.catatan || '-'}
                            </TableCell>
                            <TableCell className="text-right">
                              <div className="flex justify-end gap-2">
                                {!semester.is_aktif && (
                                  <Button
                                    size="sm"
                                    variant="outline"
                                    onClick={() => handleSetSemesterActive(semester.id)}
                                  >
                                    Set Aktif
                                  </Button>
                                )}
                                {semester.status === 'Aktif' && (
                                  <Button
                                    size="sm"
                                    variant="outline"
                                    onClick={() => handleCloseSemester(semester)}
                                  >
                                    Tutup
                                  </Button>
                                )}
                                <Button
                                  size="sm"
                                  variant="outline"
                                  onClick={() => handleEditSemester(semester)}
                                >
                                  <Pencil className="w-4 h-4 mr-1" />
                                  Edit
                                </Button>
                                <Button
                                  size="sm"
                                  variant="outline"
                                  onClick={() => {
                                    setDuplicateDialog({ open: true, source: semester });
                                    setDuplicateTarget({
                                      tahun_ajaran_id: tahun.id,
                                      nama: semester.nama,
                                      tanggal_mulai: semester.tanggal_mulai,
                                      tanggal_selesai: semester.tanggal_selesai,
                                      status: 'Aktif',
                                      is_aktif: false,
                                      kode: '',
                                      catatan: `Salinan dari ${semester.nama} ${tahun.nama}`,
                                      template_source_id: null,
                                    });
                                  }}
                                >
                                  <Copy className="w-4 h-4 mr-1" />
                                  Duplikasi
                                </Button>
                                {!semester.is_aktif && (
                                  <Button
                                    size="sm"
                                    variant="outline"
                                    onClick={() => handleDeleteSemester(semester)}
                                  >
                                    <Trash2 className="w-4 h-4 mr-1" />
                                    Hapus
                                  </Button>
                                )}
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
          );
        })
      )}

      {/* Dialog Tahun Ajaran */}
      <Dialog open={createYearDialog} onOpenChange={setCreateYearDialog}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>Tahun Ajaran Baru</DialogTitle>
            <DialogDescription>Masukkan informasi tahun ajaran yang akan digunakan.</DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label>Nama Tahun Ajaran *</Label>
              <Input
                value={yearForm.nama}
                onChange={(e) => setYearForm(prev => ({ ...prev, nama: e.target.value }))}
                placeholder="Contoh: 2025/2026"
              />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label>Tanggal Mulai *</Label>
                <Input
                  type="date"
                  value={yearForm.tanggal_mulai}
                  onChange={(e) => setYearForm(prev => ({ ...prev, tanggal_mulai: e.target.value }))}
                />
              </div>
              <div>
                <Label>Tanggal Selesai *</Label>
                <Input
                  type="date"
                  value={yearForm.tanggal_selesai}
                  onChange={(e) => setYearForm(prev => ({ ...prev, tanggal_selesai: e.target.value }))}
                  min={yearForm.tanggal_mulai}
                />
              </div>
            </div>
            <div className="flex items-center gap-2">
              <input
                id="year-active"
                type="checkbox"
                className="h-4 w-4"
                checked={yearForm.is_aktif}
                onChange={(e) => setYearForm(prev => ({ ...prev, is_aktif: e.target.checked }))}
              />
              <Label htmlFor="year-active" className="text-sm cursor-pointer">
                Jadikan tahun ajaran aktif setelah dibuat
              </Label>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setCreateYearDialog(false)}>
              Batal
            </Button>
            <Button onClick={handleCreateYear} disabled={saving}>
              {saving ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : null}
              Simpan
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Dialog Semester */}
      <Dialog 
        open={createSemesterDialog.open} 
        onOpenChange={(open) => {
          if (!open) {
            setCreateSemesterDialog({ open: false, editingSemester: null });
            setSemesterForm({
              tahun_ajaran_id: '',
              nama: 'Ganjil',
              tanggal_mulai: '',
              tanggal_selesai: '',
              status: 'Aktif',
              is_aktif: false,
              kode: '',
              catatan: '',
              template_source_id: null,
            });
          }
        }}
      >
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>
              {createSemesterDialog.editingSemester ? 'Edit Semester' : 'Semester Baru'}
            </DialogTitle>
            <DialogDescription>
              {createSemesterDialog.editingSemester 
                ? 'Perbarui informasi semester yang dipilih.'
                : 'Masukkan informasi semester untuk tahun ajaran terpilih.'}
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label>Tahun Ajaran *</Label>
              <Select
                value={semesterForm.tahun_ajaran_id || undefined}
                onValueChange={(value) => setSemesterForm(prev => ({ ...prev, tahun_ajaran_id: value }))}
                disabled={!!createSemesterDialog.tahunId}
              >
                <SelectTrigger><SelectValue placeholder="Pilih tahun ajaran" /></SelectTrigger>
                <SelectContent>
                  {tahunList.map(ta => (
                    <SelectItem key={ta.id} value={ta.id}>
                      {ta.nama}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label>Semester *</Label>
              <Select
                value={semesterForm.nama}
                onValueChange={(value) => setSemesterForm(prev => ({ ...prev, nama: value as SemesterNama }))}
              >
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {DEFAULT_SEMESTER_OPTIONS.map(opt => (
                    <SelectItem key={opt} value={opt}>
                      {opt}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label>Tanggal Mulai *</Label>
                <Input
                  type="date"
                  value={semesterForm.tanggal_mulai}
                  onChange={(e) => setSemesterForm(prev => ({ ...prev, tanggal_mulai: e.target.value }))}
                />
              </div>
              <div>
                <Label>Tanggal Selesai *</Label>
                <Input
                  type="date"
                  value={semesterForm.tanggal_selesai}
                  min={semesterForm.tanggal_mulai}
                  onChange={(e) => setSemesterForm(prev => ({ ...prev, tanggal_selesai: e.target.value }))}
                />
              </div>
            </div>
            <div className="flex items-center gap-2">
              <input
                id="semester-active"
                type="checkbox"
                className="h-4 w-4"
                checked={semesterForm.is_aktif}
                onChange={(e) => setSemesterForm(prev => ({ ...prev, is_aktif: e.target.checked }))}
              />
              <Label htmlFor="semester-active" className="text-sm cursor-pointer">
                Jadikan semester aktif setelah dibuat
              </Label>
            </div>
                onValueChange={(value) => setSemesterForm(prev => ({ ...prev, status: value as SemesterStatus }))}
              >
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="Aktif">Aktif</SelectItem>
                  <SelectItem value="Ditutup">Ditutup</SelectItem>
                </SelectContent>
              </Select>
            </div>
            {!createSemesterDialog.editingSemester && (
              <div>
                <Label>Salin Struktur Dari</Label>
                <Select
                  value={semesterForm.template_source_id || 'none'}
                  onValueChange={(value) =>
                    setSemesterForm(prev => ({ ...prev, template_source_id: value === 'none' ? null : value }))
                  }
                >
                  <SelectTrigger><SelectValue placeholder="Tanpa duplikasi" /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="none">Tanpa duplikasi</SelectItem>
                    {Object.values(semesterMap)
                      .flat()
                      .map(sem => (
                        <SelectItem key={sem.id} value={sem.id}>
                          {sem.nama} • {sem.tahun_ajaran?.nama || '-'}
                        </SelectItem>
                      ))}
                  </SelectContent>
                </Select>
                <p className="text-muted-foreground text-xs mt-1">
                  Opsional: gandakan kelas & agenda dari semester lain.
                </p>
              </div>
            )}
            <div className="flex items-center gap-2">
              <input
                id="semester-active"
                type="checkbox"
                className="h-4 w-4"
                checked={semesterForm.is_aktif}
                onChange={(e) => setSemesterForm(prev => ({ ...prev, is_aktif: e.target.checked }))}
              />
              <Label htmlFor="semester-active" className="text-sm cursor-pointer">Jadikan semester aktif setelah dibuat</Label>
            </div>
          </div>
          <DialogFooter>
            <Button 
              variant="outline" 
              onClick={() => {
                setCreateSemesterDialog({ open: false, editingSemester: null });
                setSemesterForm({
                  tahun_ajaran_id: '',
                  nama: 'Ganjil',
                  tanggal_mulai: '',
                  tanggal_selesai: '',
                  status: 'Aktif',
                  is_aktif: false,
                  kode: '',
                  catatan: '',
                  template_source_id: null,
                });
              }}
            >
              Batal
            </Button>
            <Button onClick={handleCreateSemester} disabled={saving}>
              {saving ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : null}
              {createSemesterDialog.editingSemester ? 'Perbarui' : 'Simpan'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Dialog Duplikasi */}
      <Dialog open={duplicateDialog.open} onOpenChange={(open) => setDuplicateDialog({ open })}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>Duplikasi Struktur Semester</DialogTitle>
            <DialogDescription>
              Buat semester baru berdasarkan struktur {duplicateDialog.source?.nama} (
              {duplicateDialog.source?.tahun_ajaran?.nama}).
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label>Tahun Ajaran Tujuan *</Label>
              <Select
                value={duplicateTarget.tahun_ajaran_id}
                onValueChange={(value) => setDuplicateTarget(prev => ({ ...prev, tahun_ajaran_id: value }))}
              >
                <SelectTrigger><SelectValue placeholder="Pilih tahun ajaran" /></SelectTrigger>
                <SelectContent>
                  {tahunList.map(ta => (
                    <SelectItem key={ta.id} value={ta.id}>
                      {ta.nama}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label>Nama Semester *</Label>
                <Select
                  value={duplicateTarget.nama}
                  onValueChange={(value) => setDuplicateTarget(prev => ({ ...prev, nama: value as SemesterNama }))}
                >
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {DEFAULT_SEMESTER_OPTIONS.map(opt => (
                      <SelectItem key={opt} value={opt}>
                        {opt}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label>Kode (Opsional)</Label>
                <Input
                  value={duplicateTarget.kode || ''}
                  onChange={(e) => setDuplicateTarget(prev => ({ ...prev, kode: e.target.value }))}
                />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label>Tanggal Mulai *</Label>
                <Input
                  type="date"
                  value={duplicateTarget.tanggal_mulai}
                  onChange={(e) => setDuplicateTarget(prev => ({ ...prev, tanggal_mulai: e.target.value }))}
                />
              </div>
              <div>
                <Label>Tanggal Selesai *</Label>
                <Input
                  type="date"
                  min={duplicateTarget.tanggal_mulai}
                  value={duplicateTarget.tanggal_selesai}
                  onChange={(e) => setDuplicateTarget(prev => ({ ...prev, tanggal_selesai: e.target.value }))}
                />
              </div>
            </div>
            <div className="flex items-center gap-2">
              <input
                id="duplicate-active"
                type="checkbox"
                className="h-4 w-4"
                checked={duplicateTarget.is_aktif}
                onChange={(e) => setDuplicateTarget(prev => ({ ...prev, is_aktif: e.target.checked }))}
              />
              <Label htmlFor="duplicate-active" className="text-sm cursor-pointer">
                Jadikan semester baru aktif
              </Label>
            </div>
            <div>
              <Label>Catatan</Label>
              <Input
                value={duplicateTarget.catatan || ''}
                onChange={(e) => setDuplicateTarget(prev => ({ ...prev, catatan: e.target.value }))}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDuplicateDialog({ open: false })}>
              Batal
            </Button>
            <Button onClick={handleDuplicateSemester} disabled={saving}>
              {saving ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : null}
              Gandakan
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default SemesterManagementPage;




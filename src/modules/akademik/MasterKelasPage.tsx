import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { AkademikKelasService, KelasMasterInput } from '@/services/akademikKelas.service';
import { AkademikAgendaService, AgendaFrekuensi, AgendaJenis, AgendaHari, AgendaPertemuanSummary } from '@/services/akademikAgenda.service';
import { AkademikSemesterService, Semester } from '@/services/akademikSemester.service';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Checkbox } from '@/components/ui/checkbox';
import { Badge } from '@/components/ui/badge';
import { Textarea } from '@/components/ui/textarea';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { toast } from 'sonner';
import { Plus, Trash2 } from 'lucide-react';
import {
  AGENDA_FREKUENSI_OPTIONS,
  AGENDA_JENIS_OPTIONS,
  AGENDA_HARI_OPTIONS,
} from '@/constants/akademik.constants';
import { format } from 'date-fns';
import { id as localeID } from 'date-fns/locale';
import KelasDetailDialog from './KelasDetailDialog';

const formatDate = (dateStr: string) => {
  try {
    return format(new Date(dateStr), 'd MMMM yyyy', { locale: localeID });
  } catch {
    return dateStr;
  }
};

interface AgendaFormItem {
  id: string;
  sourceId?: string;
  nama_agenda: string;
  jenis: AgendaJenis;
  frekuensi: AgendaFrekuensi;
  hari: AgendaHari;
  jam_mulai?: string;
  jam_selesai?: string;
  lokasi?: string;
  catatan?: string;
  pengajar_id?: string | null;
  mapel_id?: string | null;
  pengajar_nama?: string;
  mapel_nama?: string;
  kitab?: string;
  is_setoran: boolean;
  isNew?: boolean;
  tanggal_mulai: string;
  tanggal_selesai: string;
}

type AgendaSetter = React.Dispatch<React.SetStateAction<AgendaFormItem[]>>;

const generateAgendaTempId = () =>
  typeof crypto !== 'undefined' && 'randomUUID' in crypto
    ? crypto.randomUUID()
    : `agenda-${Date.now()}-${Math.random()}`;

const normalizeTimeValue = (value?: string | null) => {
  if (!value) return '';
  return value.length >= 5 ? value.slice(0, 5) : value;
};

const todayDateString = () => new Date().toISOString().split('T')[0];

const createEmptyAgendaItem = (): AgendaFormItem => ({
  id: generateAgendaTempId(),
  nama_agenda: '',
  jenis: 'Absensi',
  frekuensi: 'Mingguan',
  hari: 'Senin',
  jam_mulai: '',
  jam_selesai: '',
  lokasi: '',
  catatan: '',
  pengajar_id: null,
  mapel_id: null,
  pengajar_nama: '',
  mapel_nama: '',
  kitab: '',
  is_setoran: false,
  isNew: true,
  tanggal_mulai: todayDateString(),
  tanggal_selesai: todayDateString(),
});

const validateAgendaItems = (items: AgendaFormItem[]): string[] => {
  const messages = items.map(item => {
    if (!item.nama_agenda.trim()) return 'Nama agenda wajib diisi';
    if (!item.hari) return 'Hari wajib dipilih';
    if (!item.jam_mulai || !item.jam_selesai) return 'Jam mulai dan selesai wajib diisi';
    if (item.jam_selesai && item.jam_mulai && item.jam_mulai > item.jam_selesai) {
      return 'Jam selesai harus sesudah jam mulai';
    }
    if (!item.tanggal_mulai || !item.tanggal_selesai) return 'Tanggal agenda wajib diisi';
    if (item.tanggal_mulai > item.tanggal_selesai) return 'Tanggal selesai harus setelah tanggal mulai';
    return null;
  });
  return messages.filter(Boolean) as string[];
};

const applyAgendaChange = <K extends keyof AgendaFormItem>(
  setter: AgendaSetter,
  id: string,
  key: K,
  value: AgendaFormItem[K],
) => {
  setter(prev =>
    prev.map(item =>
      item.id === id
        ? {
            ...item,
            [key]: value,
            ...(key === 'tanggal_mulai' && typeof value === 'string' && item.tanggal_selesai < value
              ? { tanggal_selesai: value }
              : {}),
            ...(key === 'jenis'
              ? { is_setoran: value !== 'Absensi' }
              : {}),
          }
        : item,
    ),
  );
};

interface AgendaItemsListProps {
  items: AgendaFormItem[];
  onRemove: (id: string) => void;
  onChange: <K extends keyof AgendaFormItem>(id: string, key: K, value: AgendaFormItem[K]) => void;
}

const AgendaItemsList: React.FC<AgendaItemsListProps> = ({
  items,
  onRemove,
  onChange,
}) => (
  <>
    {items.map((item, index) => (
      <div key={item.id} className="rounded-lg border p-4 space-y-4">
        <div className="flex items-start justify-between">
          <div>
            <p className="font-semibold">Agenda #{index + 1}</p>
            <p className="text-xs text-muted-foreground">
              Lengkapi informasi berikut untuk jadwal pertemuan.
            </p>
          </div>
          <Button
            variant="ghost"
            size="icon"
            onClick={() => onRemove(item.id)}
            className="text-muted-foreground hover:text-red-600"
          >
            <Trash2 className="w-4 h-4" />
          </Button>
        </div>

        <div className="grid gap-4 md:grid-cols-2">
          <div>
            <Label>Nama Agenda *</Label>
            <Input
              value={item.nama_agenda}
              onChange={(e) => onChange(item.id, 'nama_agenda', e.target.value)}
              placeholder="Contoh: Madin Senin Malam"
            />
          </div>
          <div>
            <Label>Jenis *</Label>
            <Select
              value={item.jenis}
              onValueChange={(value) => onChange(item.id, 'jenis', value as AgendaJenis)}
            >
              <SelectTrigger>
                <SelectValue placeholder="Pilih jenis agenda" />
              </SelectTrigger>
              <SelectContent>
                {AGENDA_JENIS_OPTIONS.map(opt => (
                  <SelectItem key={opt.value} value={opt.value}>
                    {opt.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div>
            <Label>Frekuensi *</Label>
            <Select
              value={item.frekuensi}
              onValueChange={(value) => onChange(item.id, 'frekuensi', value as AgendaFrekuensi)}
            >
              <SelectTrigger>
                <SelectValue placeholder="Pilih frekuensi" />
              </SelectTrigger>
              <SelectContent>
                {AGENDA_FREKUENSI_OPTIONS.map(opt => (
                  <SelectItem key={opt.value} value={opt.value}>
                    {opt.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div>
            <Label>Hari *</Label>
            <Select
              value={item.hari}
              onValueChange={(value) => onChange(item.id, 'hari', value as AgendaHari)}
            >
              <SelectTrigger>
                <SelectValue placeholder="Pilih hari" />
              </SelectTrigger>
              <SelectContent>
                {AGENDA_HARI_OPTIONS.map(opt => (
                  <SelectItem key={opt} value={opt}>
                    {opt}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>

        <div className="grid md:grid-cols-2 gap-4">
          <div>
            <Label>Jam Mulai *</Label>
            <Input
              type="time"
              value={item.jam_mulai || ''}
              onChange={(e) => onChange(item.id, 'jam_mulai', e.target.value)}
            />
          </div>
          <div>
            <Label>Jam Selesai *</Label>
            <Input
              type="time"
              value={item.jam_selesai || ''}
              onChange={(e) => onChange(item.id, 'jam_selesai', e.target.value)}
            />
          </div>
        </div>

        <div className="grid md:grid-cols-2 gap-4">
          <div>
            <Label>Tanggal Mulai *</Label>
            <Input
              type="date"
              value={item.tanggal_mulai}
              onChange={(e) => onChange(item.id, 'tanggal_mulai', e.target.value)}
            />
          </div>
          <div>
            <Label>Tanggal Selesai *</Label>
            <Input
              type="date"
              value={item.tanggal_selesai}
              min={item.tanggal_mulai}
              onChange={(e) => onChange(item.id, 'tanggal_selesai', e.target.value)}
            />
          </div>
        </div>

        <div className="grid md:grid-cols-2 gap-4">
          <div>
            <Label>Nama Pengajar</Label>
            <Input
              value={item.pengajar_nama || ''}
              onChange={(e) => onChange(item.id, 'pengajar_nama', e.target.value)}
              placeholder="Contoh: Ust. Ahmad"
            />
          </div>
          <div>
            <Label>Nama Mapel</Label>
            <Input
              value={item.mapel_nama || ''}
              onChange={(e) => onChange(item.id, 'mapel_nama', e.target.value)}
              placeholder="Contoh: Fiqih"
            />
          </div>
        </div>

        <div>
          <Label>Kitab / Materi (opsional)</Label>
          <Input
            value={item.kitab || ''}
            onChange={(e) => onChange(item.id, 'kitab', e.target.value)}
            placeholder="Contoh: Fathul Mu'in"
          />
        </div>

        <div className="flex items-center gap-2">
          <Checkbox
            id={`is-setoran-${item.id}`}
            checked={item.is_setoran}
            onCheckedChange={(checked) => onChange(item.id, 'is_setoran', Boolean(checked))}
          />
          <Label htmlFor={`is-setoran-${item.id}`} className="text-sm cursor-pointer">
            Tandai sebagai agenda setoran
          </Label>
        </div>

        <div>
          <Label>Catatan</Label>
          <Textarea
            value={item.catatan || ''}
            onChange={(e) => onChange(item.id, 'catatan', e.target.value)}
            rows={2}
          />
        </div>
      </div>
    ))}
  </>
);

const MasterKelasPage: React.FC = () => {
  const [loading, setLoading] = useState(true);
  const [kelas, setKelas] = useState<Array<any>>([]);
  const [form, setForm] = useState<KelasMasterInput>({
    nama_kelas: '',
    program: '',
    rombel: '',
    tingkat: '',
    tahun_ajaran: '',
    semester: '',
    status: 'Aktif',
    tahun_ajaran_id: undefined,
    semester_id: undefined,
  });
  const [rombelMassal, setRombelMassal] = useState<string>('');
  const [autoGenerateName, setAutoGenerateName] = useState<boolean>(true);
  const [agendaItems, setAgendaItems] = useState<AgendaFormItem[]>([]);
  const [manageDialogOpen, setManageDialogOpen] = useState(false);
  const [selectedKelas, setSelectedKelas] = useState<any | null>(null);
  const [manageAgendaItems, setManageAgendaItems] = useState<AgendaFormItem[]>([]);
  const [manageAgendaLoading, setManageAgendaLoading] = useState(false);
  const [savingManageAgenda, setSavingManageAgenda] = useState(false);
  const [manageOriginalIds, setManageOriginalIds] = useState<string[]>([]);
  const [detailDialogOpen, setDetailDialogOpen] = useState(false);
  const [detailKelas, setDetailKelas] = useState<any | null>(null);
  const [templateDialogOpen, setTemplateDialogOpen] = useState(false);
  const [templateTarget, setTemplateTarget] = useState<'create' | 'manage'>('create');
  const [templateForm, setTemplateForm] = useState<{
    nama_agenda: string;
    jenis: AgendaJenis;
    frekuensi: AgendaFrekuensi;
    days: AgendaHari[];
    jam_mulai: string;
    jam_selesai: string;
    lokasi: string;
    catatan: string;
    pengajar_nama: string;
    mapel_nama: string;
    kitab: string;
    is_setoran: boolean;
  tanggal_mulai: string;
  tanggal_selesai: string;
  }>({
    nama_agenda: '',
    jenis: 'Absensi',
    frekuensi: 'Mingguan',
    days: [],
    jam_mulai: '',
    jam_selesai: '',
    lokasi: '',
    catatan: '',
    pengajar_nama: '',
    mapel_nama: '',
    kitab: '',
  is_setoran: false,
  tanggal_mulai: todayDateString(),
  tanggal_selesai: todayDateString(),
  });
  const [templateErrors, setTemplateErrors] = useState<string[]>([]);
  const [agendaSummaryMap, setAgendaSummaryMap] = useState<Record<string, AgendaPertemuanSummary[]>>({});
  const [summaryLoading, setSummaryLoading] = useState(false);
  const [activeSemester, setActiveSemester] = useState<Semester | null>(null);
  const [semesterLoading, setSemesterLoading] = useState(false);
  const [allSemesters, setAllSemesters] = useState<Semester[]>([]);
  const [selectedSemesterId, setSelectedSemesterId] = useState<string | null>(null);

  const buildAutoName = (p: string, tingkat: string, rombel?: string) => {
    if (!p || !tingkat) return '';
    const parts = [p, tingkat];
    if (rombel) parts.push(rombel);
    return parts.join(' ').trim();
  };

  const handleFormChange = (field: keyof KelasMasterInput, value: string) => {
    const newForm = { ...form, [field]: value };
    
    // Auto-generate nama kelas jika auto-generate aktif
    if (autoGenerateName && (field === 'program' || field === 'tingkat' || field === 'rombel')) {
      const autoName = buildAutoName(
        newForm.program || '',
        newForm.tingkat || '',
        newForm.rombel || undefined
      );
      if (autoName) {
        newForm.nama_kelas = autoName;
      }
    }
    
    setForm(newForm);
  };

  const loadAgendaSummaries = useCallback(async () => {
    try {
      setSummaryLoading(true);
      const summaries = await AkademikAgendaService.listAgendaSummary();
      const map: Record<string, AgendaPertemuanSummary[]> = {};
      summaries.forEach(summary => {
        if (!summary.kelas_id) return;
        if (!map[summary.kelas_id]) {
          map[summary.kelas_id] = [];
        }
        map[summary.kelas_id].push(summary);
      });
      setAgendaSummaryMap(map);
    } catch (e: any) {
      console.error(e);
      toast.error(e.message || 'Gagal memuat rekap agenda');
    } finally {
      setSummaryLoading(false);
    }
  }, []);

  const loadKelas = useCallback(async () => {
    try {
      setLoading(true);
      const rows = await AkademikKelasService.listKelas();
      setKelas(rows);
      await loadAgendaSummaries();
    } catch (e: any) {
      toast.error(e.message || 'Gagal memuat data kelas');
    } finally {
      setLoading(false);
    }
  }, [loadAgendaSummaries]);

  const loadActiveSemester = useCallback(async () => {
    try {
      setSemesterLoading(true);
      const semester = await AkademikSemesterService.getSemesterAktif();
      setActiveSemester(semester);
      if (semester) {
        setSelectedSemesterId(semester.id);
      }
    } catch (error: any) {
      toast.error(error.message || 'Gagal memuat semester aktif');
    } finally {
      setSemesterLoading(false);
    }
  }, []);

  const loadAllSemesters = useCallback(async () => {
    try {
      // Load semua semester sekaligus tanpa filter tahun ajaran untuk menghindari multiple queries
      const tahunList = await AkademikSemesterService.listTahunAjaran();
      if (tahunList.length === 0) {
        setAllSemesters([]);
        return;
      }
      
      // Load semua semester tanpa filter tahun_ajaran_id untuk menghindari multiple POST requests
      const allSemestersList = await AkademikSemesterService.listSemester();
      
      // Sort by tanggal_mulai descending (terbaru di atas)
      allSemestersList.sort((a, b) => 
        new Date(b.tanggal_mulai).getTime() - new Date(a.tanggal_mulai).getTime()
      );
      setAllSemesters(allSemestersList);
    } catch (error: any) {
      console.error('Gagal memuat semua semester:', error);
      // Jangan tampilkan toast error karena ini opsional untuk filter
      // Hanya set empty array jika error
      setAllSemesters([]);
    }
  }, []);

  useEffect(() => { 
    loadKelas(); 
    loadActiveSemester(); 
    loadAllSemesters(); 
  }, [loadKelas, loadActiveSemester, loadAllSemesters]);

  useEffect(() => {
    if (activeSemester) {
      setForm(prev => ({
        ...prev,
        tahun_ajaran: activeSemester.tahun_ajaran?.nama || prev.tahun_ajaran || '',
        semester: activeSemester.nama,
        tahun_ajaran_id: activeSemester.tahun_ajaran_id,
        semester_id: activeSemester.id,
      }));
    }
  }, [activeSemester]);

  const handleAddAgenda = () => {
    setAgendaItems(prev => [...prev, createEmptyAgendaItem()]);
  };

  const handleRemoveAgenda = (id: string) => {
    setAgendaItems(prev => prev.filter(item => item.id !== id));
  };

  const handleAgendaChange = <K extends keyof AgendaFormItem>(id: string, key: K, value: AgendaFormItem[K]) => {
    applyAgendaChange(setAgendaItems, id, key, value);
  };

  const agendaValidationErrors = useMemo(() => validateAgendaItems(agendaItems), [agendaItems]);

  const handleAddManageAgenda = () => {
    setManageAgendaItems(prev => [...prev, createEmptyAgendaItem()]);
  };

  const handleRemoveManageAgenda = (id: string) => {
    setManageAgendaItems(prev => prev.filter(item => item.id !== id));
  };

  const handleManageAgendaChange = <K extends keyof AgendaFormItem>(id: string, key: K, value: AgendaFormItem[K]) => {
    applyAgendaChange(setManageAgendaItems, id, key, value);
  };

  const manageValidationErrors = useMemo(
    () => validateAgendaItems(manageAgendaItems),
    [manageAgendaItems],
  );

  const resetManageDialog = () => {
    setManageDialogOpen(false);
    setSelectedKelas(null);
    setManageAgendaItems([]);
    setManageOriginalIds([]);
    setManageAgendaLoading(false);
    setSavingManageAgenda(false);
  };

  const openManageAgenda = async (kelasRow: any) => {
    setSelectedKelas(kelasRow);
    setManageDialogOpen(true);
    setManageAgendaLoading(true);
    try {
      const agendas = await AkademikAgendaService.listAgendaByKelas(kelasRow.id, { aktifOnly: false });
      setManageAgendaItems(
        agendas.map(agenda => ({
          id: generateAgendaTempId(),
          sourceId: agenda.id,
          nama_agenda: agenda.nama_agenda,
          jenis: agenda.jenis,
          frekuensi: agenda.frekuensi,
          hari: (agenda.hari as AgendaHari) || 'Senin',
          jam_mulai: normalizeTimeValue(agenda.jam_mulai),
          jam_selesai: normalizeTimeValue(agenda.jam_selesai),
          lokasi: agenda.lokasi || '',
          catatan: agenda.catatan || '',
          pengajar_id: agenda.pengajar_id || null,
          mapel_id: agenda.mapel_id || null,
          pengajar_nama: agenda.pengajar_nama || agenda.pengajar?.nama_lengkap || '',
          mapel_nama: agenda.mapel_nama || agenda.mapel?.nama_mapel || '',
          kitab: agenda.kitab || '',
          is_setoran: agenda.is_setoran ?? agenda.jenis !== 'Absensi',
          isNew: false,
          tanggal_mulai: agenda.tanggal_mulai || todayDateString(),
          tanggal_selesai: agenda.tanggal_selesai || agenda.tanggal_mulai || todayDateString(),
        })),
      );
      setManageOriginalIds(agendas.map(agenda => agenda.id));
    } catch (e: any) {
      toast.error(e.message || 'Gagal memuat agenda kelas');
    } finally {
      setManageAgendaLoading(false);
    }
  };

  const openDetailDialog = (kelasRow: any) => {
    setDetailKelas(kelasRow);
    setDetailDialogOpen(true);
  };

  const resetTemplateForm = () => {
    setTemplateForm({
      nama_agenda: '',
      jenis: 'Absensi',
      frekuensi: 'Mingguan',
      days: [],
      jam_mulai: '',
      jam_selesai: '',
      lokasi: '',
      catatan: '',
      pengajar_nama: '',
      mapel_nama: '',
      kitab: '',
    is_setoran: false,
    tanggal_mulai: todayDateString(),
    tanggal_selesai: todayDateString(),
    });
    setTemplateErrors([]);
  };

  const openTemplateDialog = (target: 'create' | 'manage', defaults?: Partial<typeof templateForm>) => {
    setTemplateTarget(target);
    setTemplateForm(prev => ({
      ...prev,
      ...defaults,
      days: defaults?.days || [],
    }));
    setTemplateErrors([]);
    setTemplateDialogOpen(true);
  };

  const handleSaveManageAgenda = async () => {
    if (!selectedKelas) return;

    if (manageAgendaItems.length > 0 && manageValidationErrors.length > 0) {
      toast.error(manageValidationErrors[0]);
      return;
    }

    setSavingManageAgenda(true);
    try {
      const kelasId = selectedKelas.id;
      const currentIds = manageAgendaItems
        .map(item => item.sourceId)
        .filter((id): id is string => Boolean(id));
      const toDelete = manageOriginalIds.filter(id => !currentIds.includes(id));

      await Promise.all([
        ...manageAgendaItems.map(item => {
          const payload = {
            nama_agenda: item.nama_agenda.trim(),
            jenis: item.jenis,
            frekuensi: item.frekuensi,
            hari: item.hari,
            jam_mulai: item.jam_mulai || null,
            jam_selesai: item.jam_selesai || null,
            lokasi: item.lokasi || null,
            catatan: item.catatan || null,
            pengajar_id: item.pengajar_id || null,
            mapel_id: item.mapel_id || null,
            pengajar_nama: item.pengajar_nama ? item.pengajar_nama.trim() : null,
            mapel_nama: item.mapel_nama ? item.mapel_nama.trim() : null,
            kitab: item.kitab ? item.kitab.trim() : null,
            is_setoran: item.is_setoran,
            aktif: true,
            tanggal_mulai: item.tanggal_mulai,
            tanggal_selesai: item.tanggal_selesai,
          };
          if (item.sourceId) {
            return AkademikAgendaService.updateAgenda(item.sourceId, payload);
          }
          return AkademikAgendaService.createAgenda({
            kelas_id: kelasId,
            ...payload,
          });
        }),
        ...toDelete.map(id => AkademikAgendaService.deleteAgenda(id)),
      ]);

      toast.success('Agenda kelas berhasil diperbarui');
      resetManageDialog();
      loadKelas();
    } catch (e: any) {
      toast.error(e.message || 'Gagal menyimpan agenda');
    } finally {
      setSavingManageAgenda(false);
    }
  };

  const handleTemplateSubmit = () => {
    const errors: string[] = [];
    if (!templateForm.nama_agenda.trim()) errors.push('Nama agenda wajib diisi');
    if (templateForm.days.length === 0) errors.push('Pilih minimal satu hari');
    if (!templateForm.jam_mulai || !templateForm.jam_selesai) errors.push('Jam mulai dan selesai wajib diisi');
    if (
      templateForm.jam_mulai &&
      templateForm.jam_selesai &&
      templateForm.jam_mulai > templateForm.jam_selesai
    ) {
      errors.push('Jam selesai harus setelah jam mulai');
    }
  if (!templateForm.tanggal_mulai || !templateForm.tanggal_selesai) {
    errors.push('Tanggal mulai dan selesai agenda wajib diisi');
  } else if (templateForm.tanggal_mulai > templateForm.tanggal_selesai) {
    errors.push('Tanggal selesai agenda harus setelah tanggal mulai');
  }

    if (errors.length > 0) {
      setTemplateErrors(errors);
      return;
    }

    const newItems = templateForm.days.map(day => ({
      id: generateAgendaTempId(),
      nama_agenda: templateForm.nama_agenda,
      jenis: templateForm.jenis,
      frekuensi: templateForm.frekuensi,
      hari: day,
      jam_mulai: templateForm.jam_mulai,
      jam_selesai: templateForm.jam_selesai,
      lokasi: templateForm.lokasi,
      catatan: templateForm.catatan,
      pengajar_id: null,
      mapel_id: null,
      pengajar_nama: templateForm.pengajar_nama,
      mapel_nama: templateForm.mapel_nama,
      kitab: templateForm.kitab,
      is_setoran: templateForm.is_setoran,
      isNew: true,
    tanggal_mulai: templateForm.tanggal_mulai,
    tanggal_selesai: templateForm.tanggal_selesai,
    }));

    if (templateTarget === 'create') {
      setAgendaItems(prev => [...prev, ...newItems]);
    } else {
      setManageAgendaItems(prev => [...prev, ...newItems]);
    }

    setTemplateDialogOpen(false);
    resetTemplateForm();
  };

  const toggleTemplateDay = (value: AgendaHari) => {
    setTemplateForm(prev => {
      const exists = prev.days.includes(value);
      return {
        ...prev,
        days: exists ? prev.days.filter(day => day !== value) : [...prev.days, value],
      };
    });
  };

  const handleCreate = async () => {
    try {
      // Validasi
      if (!form.nama_kelas?.trim()) {
        toast.error('Nama kelas wajib diisi');
        return;
      }
      if (!form.program?.trim()) {
        toast.error('Program wajib diisi');
        return;
      }
      if (!form.semester_id) {
        toast.error('Semester wajib dipilih');
        return;
      }

      const selectedSem = allSemesters.find(s => s.id === form.semester_id);
      if (!selectedSem) {
        toast.error('Semester tidak valid');
        return;
      }

      const payload: KelasMasterInput = {
        ...form,
        tahun_ajaran: selectedSem.tahun_ajaran?.nama || '',
        semester: selectedSem.nama,
        tahun_ajaran_id: selectedSem.tahun_ajaran_id,
        semester_id: selectedSem.id,
      };
      
      await AkademikKelasService.createKelas(payload);
      toast.success('Kelas berhasil dibuat. Tambahkan agenda melalui tombol "Kelola Agenda".');

      // Reset form
      const resetForm: KelasMasterInput = {
        nama_kelas: '',
        program: '',
        rombel: '',
        tingkat: '',
        tahun_ajaran: '',
        semester: '',
        tahun_ajaran_id: undefined,
        semester_id: activeSemester?.id,
        status: 'Aktif'
      };
      setForm(resetForm);
      loadKelas();
    } catch (e: any) {
      toast.error(e.message || 'Gagal membuat kelas');
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Hapus kelas ini? Kelas dan keanggotaan akan ikut terhapus.')) return;
    try {
      await AkademikKelasService.deleteKelas(id);
      toast.success('Kelas dihapus');
      loadKelas();
    } catch (e: any) {
      toast.error(e.message || 'Gagal menghapus kelas');
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Master Kelas</h1>
          <p className="text-muted-foreground">Buat kelas (mis. Madin I’dad) dan kelola daftar kelas.</p>
        </div>
      </div>

      {semesterLoading ? (
        <Card>
          <CardContent className="py-6 text-sm text-muted-foreground">
            Memuat informasi semester aktif...
          </CardContent>
        </Card>
      ) : activeSemester ? (
        <Card className="border-green-200 bg-green-50">
          <CardContent className="py-4 flex flex-col md:flex-row md:items-center md:justify-between gap-3">
            <div>
              <p className="text-sm text-muted-foreground">Semester Aktif</p>
              <h3 className="text-lg font-semibold text-green-800">
                {activeSemester.nama} • {activeSemester.tahun_ajaran?.nama || 'Tahun Ajaran'}
              </h3>
              <p className="text-xs text-muted-foreground">
                {formatDate(activeSemester.tanggal_mulai)} — {formatDate(activeSemester.tanggal_selesai)}
              </p>
            </div>
            <div className="text-sm text-muted-foreground">
              Kelas baru akan otomatis menggunakan semester ini.
            </div>
          </CardContent>
        </Card>
      ) : (
        <Card className="border-yellow-300 bg-yellow-50">
          <CardContent className="py-4 text-sm text-yellow-800">
            Belum ada semester aktif. Silakan atur melalui menu Tahun & Semester sebelum membuat kelas baru.
          </CardContent>
        </Card>
      )}

      <Card>
        <CardHeader>
          <CardTitle>Buat Kelas</CardTitle>
          <CardDescription>Isi data kelas lalu klik Buat. Agenda bisa ditambahkan setelah kelas dibuat.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid gap-4 md:grid-cols-2">
            <div>
              <Label>Semester *</Label>
              <Select
                value={form.semester_id || undefined}
                onValueChange={(value) => {
                  const selectedSem = allSemesters.find(s => s.id === value);
                  if (selectedSem) {
                    setForm({
                      ...form,
                      semester_id: selectedSem.id,
                      semester: selectedSem.nama,
                      tahun_ajaran_id: selectedSem.tahun_ajaran_id,
                      tahun_ajaran: selectedSem.tahun_ajaran?.nama || '',
                    });
                  }
                }}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Pilih semester" />
                </SelectTrigger>
                <SelectContent>
                  {allSemesters.map(sem => (
                    <SelectItem key={sem.id} value={sem.id}>
                      {sem.nama} • {sem.tahun_ajaran?.nama || '-'}
                      {sem.is_aktif && ' (Aktif)'}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <p className="text-xs text-muted-foreground mt-1">
                Tahun ajaran akan terisi otomatis
              </p>
            </div>
            <div>
              <Label>Program *</Label>
              <Input
                value={form.program}
                onChange={(e) => handleFormChange('program', e.target.value)}
                placeholder="Contoh: Madin, TPQ, Tahfid"
              />
            </div>
            <div>
              <Label>Tingkat</Label>
              <Input
                value={form.tingkat}
                onChange={(e) => handleFormChange('tingkat', e.target.value)}
                placeholder="Contoh: I'dad, Wustho, Iqra 1"
              />
            </div>
            <div>
              <Label>Rombel</Label>
              <Input
                value={form.rombel}
                onChange={(e) => handleFormChange('rombel', e.target.value)}
                placeholder="Contoh: A, B, C"
              />
            </div>
            <div className="md:col-span-2">
              <div className="flex items-center gap-2 mb-2">
                <Checkbox
                  id="auto-generate"
                  checked={autoGenerateName}
                  onCheckedChange={(checked) => {
                    const isChecked = Boolean(checked);
                    setAutoGenerateName(isChecked);
                    if (isChecked) {
                      const autoName = buildAutoName(
                        form.program || '',
                        form.tingkat || '',
                        form.rombel || undefined,
                      );
                      if (autoName) {
                        setForm({ ...form, nama_kelas: autoName });
                      }
                    }
                  }}
                />
                <Label htmlFor="auto-generate" className="cursor-pointer text-sm">
                  Auto-generate nama dari Program + Tingkat + Rombel
                </Label>
              </div>
              <Label>Nama Kelas *</Label>
              <Input
                value={form.nama_kelas}
                onChange={(e) => setForm({ ...form, nama_kelas: e.target.value })}
                placeholder="Contoh: Madin I'dad A"
              />
            </div>
          </div>

          <div className="flex justify-end pt-2">
            <Button onClick={handleCreate} className="gap-2" disabled={!form.semester_id || !form.program || !form.nama_kelas}>
              <Plus className="w-4 h-4" />
              Buat Kelas
            </Button>
          </div>
          <p className="text-xs text-muted-foreground text-center">
            Agenda kelas bisa ditambahkan setelah kelas dibuat melalui tombol "Kelola Agenda"
          </p>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle>Daftar Kelas</CardTitle>
              <CardDescription>
                {loading ? 'Memuat...' : `${kelas.filter(k => !selectedSemesterId || k.semester_id === selectedSemesterId).length} kelas ditemukan`}
              </CardDescription>
            </div>
            <div className="flex items-center gap-2">
              <Label htmlFor="semester-filter" className="text-sm">Filter Semester:</Label>
              <Select
                value={selectedSemesterId || 'all'}
                onValueChange={(value) => setSelectedSemesterId(value === 'all' ? null : value)}
              >
                <SelectTrigger id="semester-filter" className="w-[250px]">
                  <SelectValue placeholder="Semua Semester" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">
                    Semua Semester
                    {activeSemester && ` (Aktif: ${activeSemester.nama})`}
                  </SelectItem>
                  {allSemesters.map(sem => (
                    <SelectItem key={sem.id} value={sem.id}>
                      {sem.nama} • {sem.tahun_ajaran?.nama || '-'}
                      {sem.is_aktif && ' (Aktif)'}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Nama Kelas</TableHead>
                  <TableHead>Program</TableHead>
                  <TableHead>Semester</TableHead>
                  <TableHead>Anggota</TableHead>
                  <TableHead className="text-right">Aksi</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {kelas
                  .filter(row => !selectedSemesterId || row.semester_id === selectedSemesterId)
                  .map((row) => {
                  const summaries = agendaSummaryMap[row.id] || [];
                  const totalTarget = summaries.reduce((sum, item) => sum + (item.total_pertemuan || 0), 0);
                  const totalSelesai = summaries.reduce((sum, item) => sum + (item.total_selesai || 0), 0);
                  const totalBerjalan = summaries.reduce((sum, item) => sum + (item.total_berjalan || 0), 0);
                  const totalBatal = summaries.reduce((sum, item) => sum + (item.total_batal || 0), 0);
                  const totalOutstanding = Math.max(0, totalTarget - totalSelesai - totalBatal);

                  return (
                  <TableRow key={row.id}>
                    <TableCell className="font-medium">
                      <div className="font-semibold">{row.nama_kelas}</div>
                      <div className="flex items-center gap-2 mt-1">
                        {row.rombel && (
                          <Badge variant="outline" className="text-xs">Rombel: {row.rombel}</Badge>
                        )}
                        {row.tingkat && (
                          <Badge variant="outline" className="text-xs">Tingkat: {row.tingkat}</Badge>
                        )}
                      </div>
                    </TableCell>
                    <TableCell>
                      <div className="font-medium">{row.program}</div>
                    </TableCell>
                    <TableCell>
                      <div className="font-medium text-sm">{row.semester}</div>
                      <div className="text-xs text-muted-foreground">{row.tahun_ajaran}</div>
                      {row.semester_id === activeSemester?.id && (
                        <Badge className="mt-1 text-xs bg-green-100 text-green-800">Aktif</Badge>
                      )}
                    </TableCell>
                    <TableCell>
                      <div className="font-medium">{row.jumlah_anggota || 0}</div>
                      <div className="text-xs text-muted-foreground">santri</div>
                    </TableCell>
                    <TableCell className="text-right">
                      <div className="flex justify-end gap-2">
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => openManageAgenda(row)}
                        >
                          Kelola Agenda
                        </Button>
                        <Button variant="ghost" size="sm" onClick={() => handleDelete(row.id)}>
                          <Trash2 className="w-4 h-4 text-red-600" />
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                );})}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>

      <Dialog
        open={manageDialogOpen}
        onOpenChange={(open) => {
          if (open) {
            setManageDialogOpen(true);
          } else {
            resetManageDialog();
          }
        }}
      >
        <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Kelola Agenda Kelas</DialogTitle>
            <DialogDescription>
              {selectedKelas
                ? `${selectedKelas.nama_kelas} • ${selectedKelas.program}`
                : 'Atur agenda kelas'}
            </DialogDescription>
          </DialogHeader>

          {manageAgendaLoading ? (
            <p className="text-sm text-muted-foreground">Memuat agenda kelas...</p>
          ) : (
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-muted-foreground">
                    Tambahkan, ubah, atau hapus agenda yang terhubung ke kelas ini.
                  </p>
                </div>
                <div className="flex items-center gap-2">
                  <Button variant="outline" size="sm" onClick={handleAddManageAgenda}>
                    <Plus className="w-4 h-4 mr-2" />
                    Agenda Tunggal
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => {
                      resetTemplateForm();
                      openTemplateDialog('manage');
                    }}
                  >
                    <Plus className="w-4 h-4 mr-2" />
                    Agenda Multi Hari
                  </Button>
                </div>
              </div>

              {manageAgendaItems.length === 0 ? (
                <p className="text-sm text-muted-foreground">
                  Belum ada agenda terdaftar. Tambahkan agenda baru untuk kelas ini.
                </p>
              ) : (
                <AgendaItemsList
                  items={manageAgendaItems}
                  onRemove={handleRemoveManageAgenda}
                  onChange={handleManageAgendaChange}
                />
              )}

              {manageAgendaItems.length > 0 && manageValidationErrors.length > 0 && (
                <p className="text-xs text-red-500">{manageValidationErrors[0]}</p>
              )}
            </div>
          )}

          <DialogFooter>
            <Button variant="outline" onClick={resetManageDialog} disabled={savingManageAgenda}>
              Batal
            </Button>
            <Button
              onClick={handleSaveManageAgenda}
              disabled={savingManageAgenda || manageAgendaLoading}
            >
              {savingManageAgenda ? 'Menyimpan...' : 'Simpan Perubahan'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <KelasDetailDialog
        open={detailDialogOpen}
        kelasId={detailKelas?.id}
        kelasName={detailKelas?.nama_kelas}
        onClose={() => {
          setDetailDialogOpen(false);
          setDetailKelas(null);
        }}
      />

      <Dialog
        open={templateDialogOpen}
        onOpenChange={(open) => {
          if (open) {
            setTemplateDialogOpen(true);
          } else {
            setTemplateDialogOpen(false);
            resetTemplateForm();
          }
        }}
      >
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Buat Agenda Multi Hari</DialogTitle>
            <DialogDescription>
              Buat beberapa agenda sekaligus dengan pengaturan yang sama.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            {templateErrors.length > 0 && (
              <div className="rounded-md border border-red-200 bg-red-50 p-3 text-sm text-red-700">
                {templateErrors.map((err, idx) => (
                  <p key={idx}>{err}</p>
                ))}
              </div>
            )}
            <div className="grid gap-4 md:grid-cols-2">
              <div className="md:col-span-2">
                <Label>Nama Agenda *</Label>
                <Input
                  value={templateForm.nama_agenda}
                  onChange={(e) => setTemplateForm(prev => ({ ...prev, nama_agenda: e.target.value }))}
                  placeholder="Contoh: Setoran Subuh Mukim"
                />
              </div>
              <div>
                <Label>Jenis *</Label>
                <Select
                  value={templateForm.jenis}
                  onValueChange={(value) =>
                    setTemplateForm(prev => ({
                      ...prev,
                      jenis: value as AgendaJenis,
                      is_setoran: value !== 'Absensi' ? true : prev.is_setoran,
                    }))
                  }
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Pilih jenis" />
                  </SelectTrigger>
                  <SelectContent>
                    {AGENDA_JENIS_OPTIONS.map(opt => (
                      <SelectItem key={opt.value} value={opt.value}>
                        {opt.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label>Frekuensi *</Label>
                <Select
                  value={templateForm.frekuensi}
                  onValueChange={(value) =>
                    setTemplateForm(prev => ({ ...prev, frekuensi: value as AgendaFrekuensi }))
                  }
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Pilih frekuensi" />
                  </SelectTrigger>
                  <SelectContent>
                    {AGENDA_FREKUENSI_OPTIONS.map(opt => (
                      <SelectItem key={opt.value} value={opt.value}>
                        {opt.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div>
              <Label>Hari Agenda *</Label>
              <div className="mt-2 grid grid-cols-2 sm:grid-cols-3 gap-2">
                {AGENDA_HARI_OPTIONS.map(day => (
                  <label
                    key={day}
                    className="flex items-center gap-2 rounded-md border border-border px-3 py-2 text-sm cursor-pointer hover:bg-accent"
                  >
                    <Checkbox
                      checked={templateForm.days.includes(day as AgendaHari)}
                      onCheckedChange={() => toggleTemplateDay(day as AgendaHari)}
                    />
                    {day}
                  </label>
                ))}
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label>Jam Mulai *</Label>
                <Input
                  type="time"
                  value={templateForm.jam_mulai}
                  onChange={(e) => setTemplateForm(prev => ({ ...prev, jam_mulai: e.target.value }))}
                />
              </div>
              <div>
                <Label>Jam Selesai *</Label>
                <Input
                  type="time"
                  value={templateForm.jam_selesai}
                  onChange={(e) => setTemplateForm(prev => ({ ...prev, jam_selesai: e.target.value }))}
                />
              </div>
            </div>
            <div className="grid md:grid-cols-2 gap-4">
              <div>
                <Label>Nama Pengajar</Label>
                <Input
                  value={templateForm.pengajar_nama}
                  onChange={(e) => setTemplateForm(prev => ({ ...prev, pengajar_nama: e.target.value }))}
                  placeholder="Contoh: Ust. Ahmad"
                />
              </div>
              <div>
                <Label>Nama Mapel</Label>
                <Input
                  value={templateForm.mapel_nama}
                  onChange={(e) => setTemplateForm(prev => ({ ...prev, mapel_nama: e.target.value }))}
                  placeholder="Contoh: Fiqih"
                />
              </div>
            </div>
            <div className="grid md:grid-cols-2 gap-4">
              <div>
                <Label>Tanggal Mulai *</Label>
                <Input
                  type="date"
                  value={templateForm.tanggal_mulai}
                  onChange={(e) =>
                    setTemplateForm(prev => ({
                      ...prev,
                      tanggal_mulai: e.target.value,
                      tanggal_selesai:
                        prev.tanggal_selesai < e.target.value ? e.target.value : prev.tanggal_selesai,
                    }))
                  }
                />
              </div>
              <div>
                <Label>Tanggal Selesai *</Label>
                <Input
                  type="date"
                  value={templateForm.tanggal_selesai}
                  min={templateForm.tanggal_mulai}
                  onChange={(e) => setTemplateForm(prev => ({ ...prev, tanggal_selesai: e.target.value }))}
                />
              </div>
            </div>
            <div>
              <Label>Kitab / Materi</Label>
              <Input
                value={templateForm.kitab}
                onChange={(e) => setTemplateForm(prev => ({ ...prev, kitab: e.target.value }))}
                placeholder="Contoh: Fathul Mu'in"
              />
            </div>
            <div>
              <Label>Lokasi</Label>
              <Input
                value={templateForm.lokasi}
                onChange={(e) => setTemplateForm(prev => ({ ...prev, lokasi: e.target.value }))}
                placeholder="Contoh: Masjid Besar"
              />
            </div>
            <div>
              <Label>Catatan</Label>
              <Textarea
                value={templateForm.catatan}
                onChange={(e) => setTemplateForm(prev => ({ ...prev, catatan: e.target.value }))}
                rows={2}
              />
            </div>
            <div className="flex items-center gap-2">
              <Checkbox
                id="template-is-setoran"
                checked={templateForm.is_setoran}
                onCheckedChange={(checked) =>
                  setTemplateForm(prev => ({ ...prev, is_setoran: Boolean(checked) }))
                }
              />
              <Label htmlFor="template-is-setoran" className="text-sm cursor-pointer">
                Tandai agenda ini sebagai setoran
              </Label>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => { setTemplateDialogOpen(false); resetTemplateForm(); }}>
              Batal
            </Button>
            <Button onClick={handleTemplateSubmit}>
              Tambahkan {templateForm.days.length ? `(${templateForm.days.length})` : ''}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default MasterKelasPage;



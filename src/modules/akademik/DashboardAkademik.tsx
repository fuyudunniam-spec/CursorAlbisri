import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Progress } from '@/components/ui/progress';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import {
  CalendarRange,
  Layers,
  Users,
  Activity,
  AlertTriangle,
  UserCheck,
  Clock,
  Loader2,
  ArrowUpRight,
  RefreshCw,
  BookOpen,
} from 'lucide-react';
import { toast } from 'sonner';
import { AkademikKelasService } from '@/services/akademikKelas.service';
import { AbsensiMadinService, AbsensiMadin } from '@/services/absensiMadin.service';
import KelasDetailDialog from './KelasDetailDialog';
import AkademikSummaryCards from '@/components/dashboard/akademik/AkademikSummaryCards';
import AkademikTotalDisplay from '@/components/dashboard/akademik/AkademikTotalDisplay';

const STATUS_KEYS = ['Hadir', 'Izin', 'Sakit', 'Dispen', 'Alfa'] as const;
type StatusKey = typeof STATUS_KEYS[number];

interface KelasSummary {
  id: string;
  nama_kelas: string;
  program: string;
  rombel?: string | null;
  totalSantri: number;
  agendaAktif: number;
  totalPertemuan: number;
  totalRecords: number;
  rataHadir: number;
  statusCounts: Record<StatusKey, number>;
  lastPertemuan?: {
    tanggal: string;
    agenda: string;
    pengajar?: string | null;
  };
}

interface MeetingSummary {
  key: string;
  kelas_id: string;
  kelas_nama: string;
  program: string;
  tanggal: string;
  agenda: string;
  pengajar?: string | null;
  mapel?: string | null;
  kitab?: string | null;
  counts: Record<StatusKey, number>;
}

interface SantriAttention {
  santri_id: string;
  nama: string;
  kelas_id: string;
  kelas_nama: string;
  program: string;
  hadir: number;
  alfa: number;
  totalPertemuan: number;
  persentase: number;
}

interface GlobalStats {
  totalKelas: number;
  totalSantri: number;
  totalAgendaAktif: number;
  totalPertemuan: number;
  rataKehadiran: number;
  totalAlfa: number;
}

const DashboardAkademik: React.FC = () => {
  const navigate = useNavigate();
  const [month, setMonth] = useState(() => {
    const now = new Date();
    return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
  });
  const [program, setProgram] = useState<string>('all');
  const [programOptions, setProgramOptions] = useState<string[]>([]);
  const [loading, setLoading] = useState(false);
  const [kelasSummaries, setKelasSummaries] = useState<KelasSummary[]>([]);
  const [recentMeetings, setRecentMeetings] = useState<MeetingSummary[]>([]);
  const [attentionList, setAttentionList] = useState<SantriAttention[]>([]);
  const [globalStats, setGlobalStats] = useState<GlobalStats>({
    totalKelas: 0,
    totalSantri: 0,
    totalAgendaAktif: 0,
    totalPertemuan: 0,
    rataKehadiran: 0,
    totalAlfa: 0,
  });
  const [detailOpen, setDetailOpen] = useState(false);
  const [detailKelas, setDetailKelas] = useState<{ id: string; nama_kelas: string } | null>(null);

  const loadDashboard = useCallback(async () => {
    try {
      setLoading(true);
      const [yearStr, monthStr] = month.split('-');
      const year = parseInt(yearStr, 10);
      const monthNum = parseInt(monthStr, 10);
      const startDate = `${month}-01`;
      const endDate = new Date(year, monthNum, 0).toISOString().split('T')[0];

      const kelasList = await AkademikKelasService.listKelas();
      const programs = Array.from(new Set(kelasList.map(k => k.program).filter(Boolean)));
      setProgramOptions(programs);

      const filteredKelas =
        program === 'all' ? kelasList : kelasList.filter(k => k.program === program);

      const kelasData = await Promise.all(
        filteredKelas.map(async kelas => {
          const absensiList = await AbsensiMadinService.listAbsensiByKelas(kelas.id, {
            startDate,
            endDate,
          });

          const statusCounts: Record<StatusKey, number> = {
            Hadir: 0,
            Izin: 0,
            Sakit: 0,
            Dispen: 0,
            Alfa: 0,
          };

          const santriMap = new Map<
            string,
            { santri_id: string; nama: string; hadir: number; alfa: number; total: number }
          >();

          const pertemuanMap = new Map<
            string,
            {
              key: string;
              tanggal: string;
              agenda: string;
              pengajar?: string | null;
              mapel?: string | null;
              kitab?: string | null;
              counts: Record<StatusKey, number>;
            }
          >();

          absensiList.forEach((row: AbsensiMadin) => {
            const status = row.status as StatusKey;
            if (statusCounts[status] !== undefined) statusCounts[status] += 1;

            const santriKey = row.santri_id;
            if (!santriMap.has(santriKey)) {
              santriMap.set(santriKey, {
                santri_id: santriKey,
                nama: row.santri?.nama_lengkap || 'Tanpa Nama',
                hadir: 0,
                alfa: 0,
                total: 0,
              });
            }
            const santriSummary = santriMap.get(santriKey)!;
            santriSummary.total += 1;
            if (status === 'Hadir') santriSummary.hadir += 1;
            if (status === 'Alfa') santriSummary.alfa += 1;

            // Membuat key unik dengan kombinasi tanggal, agenda_id, dan kelas_id
            const agendaKey = `${row.tanggal}_${row.agenda_id || 'manual'}_${kelas.id}`;
            if (!pertemuanMap.has(agendaKey)) {
              pertemuanMap.set(agendaKey, {
                key: agendaKey,
                tanggal: row.tanggal,
                agenda: row.agenda?.nama_agenda || 'Input Manual',
                pengajar: row.agenda?.pengajar_nama || null,
                mapel: row.agenda?.mapel_nama || null,
                kitab: row.agenda?.kitab || null,
                counts: {
                  Hadir: 0,
                  Izin: 0,
                  Sakit: 0,
                  Dispen: 0,
                  Alfa: 0,
                },
              });
            }
            const pertemuan = pertemuanMap.get(agendaKey)!;
            pertemuan.counts[status] += 1;
          });

          const totalRecords = absensiList.length;
          const totalPertemuan = pertemuanMap.size;
          const rataHadir =
            totalRecords > 0 ? Math.round((statusCounts.Hadir / totalRecords) * 1000) / 10 : 0;

          const meetings: MeetingSummary[] = Array.from(pertemuanMap.values())
            .map(item => ({
              ...item,
              kelas_id: kelas.id,
              kelas_nama: kelas.nama_kelas,
              program: kelas.program,
            }))
            .sort((a, b) => new Date(b.tanggal).getTime() - new Date(a.tanggal).getTime());

          const santriStats: SantriAttention[] = Array.from(santriMap.values()).map(item => ({
            santri_id: item.santri_id,
            nama: item.nama,
            kelas_id: kelas.id,
            kelas_nama: kelas.nama_kelas,
            program: kelas.program,
            hadir: item.hadir,
            alfa: item.alfa,
            totalPertemuan: item.total,
            persentase: item.total ? Math.round((item.hadir / item.total) * 1000) / 10 : 0,
          }));

          const summary: KelasSummary = {
            id: kelas.id,
            nama_kelas: kelas.nama_kelas,
            program: kelas.program,
            rombel: kelas.rombel,
            totalSantri: kelas.jumlah_anggota || 0,
            agendaAktif: kelas.jumlah_agenda || 0,
            totalPertemuan,
            totalRecords,
            rataHadir,
            statusCounts,
            lastPertemuan: meetings[0]
              ? {
                  tanggal: meetings[0].tanggal,
                  agenda: meetings[0].agenda,
                  pengajar: meetings[0].pengajar,
                }
              : undefined,
          };

          return { summary, meetings, santriStats };
        }),
      );

      const summaries = kelasData.map(item => item.summary);
      const allMeetings = kelasData.flatMap(item => item.meetings);
      const allSantriStats = kelasData.flatMap(item => item.santriStats);

      const totalRecords = summaries.reduce((acc, curr) => acc + curr.totalRecords, 0);
      const totalHadir = summaries.reduce((acc, curr) => acc + curr.statusCounts.Hadir, 0);
      const totalAlfa = summaries.reduce((acc, curr) => acc + curr.statusCounts.Alfa, 0);

      const stats: GlobalStats = {
        totalKelas: summaries.length,
        totalSantri: summaries.reduce((acc, curr) => acc + curr.totalSantri, 0),
        totalAgendaAktif: summaries.reduce((acc, curr) => acc + curr.agendaAktif, 0),
        totalPertemuan: summaries.reduce((acc, curr) => acc + curr.totalPertemuan, 0),
        rataKehadiran: totalRecords ? Math.round((totalHadir / totalRecords) * 1000) / 10 : 0,
        totalAlfa,
      };

      const sortedMeetings = allMeetings
        .sort((a, b) => new Date(b.tanggal).getTime() - new Date(a.tanggal).getTime())
        .slice(0, 8);

      const attention = allSantriStats
        .filter(item => item.alfa > 0 || item.persentase < 75)
        .sort((a, b) => {
          if (b.alfa !== a.alfa) return b.alfa - a.alfa;
          return a.persentase - b.persentase;
        })
        .slice(0, 10);

      setKelasSummaries(
        summaries.sort((a, b) => b.rataHadir - a.rataHadir || a.nama_kelas.localeCompare(b.nama_kelas)),
      );
      setRecentMeetings(sortedMeetings);
      setAttentionList(attention);
      setGlobalStats(stats);
    } catch (error: any) {
      toast.error(error.message || 'Gagal memuat dashboard akademik');
    } finally {
      setLoading(false);
    }
  }, [month, program]);

  useEffect(() => {
    loadDashboard();
  }, [loadDashboard]);

  const monthLabel = useMemo(() => {
    const [yearStr, monthStr] = month.split('-');
    const date = new Date(parseInt(yearStr, 10), parseInt(monthStr, 10) - 1, 1);
    return date.toLocaleDateString('id-ID', { month: 'long', year: 'numeric' });
  }, [month]);

  return (
    <div className="container mx-auto px-4 sm:px-6 lg:px-8 py-6 space-y-8 bg-white min-h-screen">
      {/* Header */}
      <div className="mb-8">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <h1 className="text-3xl font-light tracking-tight text-gray-900">Akademik</h1>
            <p className="text-sm text-gray-500 mt-1">Dashboard manajemen akademik dan kehadiran</p>
          </div>
          
          {/* Action Buttons */}
          <div className="flex items-center gap-2 flex-wrap justify-end ml-auto">
            <div className="flex items-center gap-2 flex-shrink-0">
              <Button 
                size="sm" 
                variant="outline"
                onClick={() => navigate('/akademik/pengajar')}
                className="border-gray-200 hover:bg-gray-50 text-gray-700 whitespace-nowrap text-xs sm:text-sm"
              >
                <Users className="h-4 w-4 sm:mr-2" />
                <span className="hidden sm:inline">Dashboard Pengajar</span>
              </Button>
              <Button 
                size="sm" 
                variant="outline"
                onClick={() => navigate('/akademik/presensi')}
                className="border-gray-200 hover:bg-gray-50 text-gray-700 whitespace-nowrap text-xs sm:text-sm"
              >
                <CalendarRange className="h-4 w-4 sm:mr-2" />
                <span className="hidden sm:inline">Presensi</span>
              </Button>
              <Button 
                size="sm" 
                variant="outline"
                onClick={() => navigate('/akademik/kelas')}
                className="border-gray-200 hover:bg-gray-50 text-gray-700 whitespace-nowrap text-xs sm:text-sm"
              >
                <BookOpen className="h-4 w-4 sm:mr-2" />
                <span className="hidden sm:inline">Master Kelas</span>
              </Button>
            </div>
            
            <div className="flex items-center gap-2 border-l border-gray-200 pl-2 flex-shrink-0">
              <Button
                variant="ghost"
                size="sm"
                onClick={loadDashboard}
                disabled={loading}
                className="text-gray-600 hover:text-gray-900 hover:bg-gray-50 flex-shrink-0"
              >
                <RefreshCw className={`h-4 w-4 ${loading ? 'animate-spin' : ''}`} />
              </Button>
            </div>
          </div>
        </div>
      </div>

      {/* Filter Card */}
      <Card className="rounded-lg border border-gray-200 shadow-sm bg-white">
        <CardHeader className="pb-4 pt-4 px-4">
          <CardTitle className="text-sm font-medium text-gray-900">Filter Rekap</CardTitle>
          <CardDescription className="text-xs text-gray-500 mt-0.5">
            Pilih rentang bulan dan program untuk melihat ringkasan
          </CardDescription>
        </CardHeader>
        <CardContent className="grid gap-4 md:grid-cols-4 px-4 pb-4">
          <div className="space-y-2">
            <Label className="text-xs text-gray-600">Bulan</Label>
            <Input 
              type="month" 
              value={month} 
              onChange={(e) => setMonth(e.target.value)}
              className="border-gray-200 text-sm"
            />
          </div>
          <div className="space-y-2">
            <Label className="text-xs text-gray-600">Program</Label>
            <Select value={program} onValueChange={setProgram}>
              <SelectTrigger className="border-gray-200 text-sm">
                <SelectValue placeholder="Pilih program" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Semua Program</SelectItem>
                {programOptions.map(opt => (
                  <SelectItem key={opt} value={opt}>
                    {opt}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="flex items-end">
            <Button 
              variant="outline" 
              className="w-full border-gray-200 hover:bg-gray-50 text-gray-700 text-sm"
              onClick={loadDashboard}
              disabled={loading}
            >
              {loading ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Memuat...
                </>
              ) : (
                'Refresh'
              )}
            </Button>
          </div>
        </CardContent>
      </Card>

      {loading && (
        <Card className="rounded-lg border border-gray-200 shadow-sm bg-white">
          <CardContent className="py-10 flex items-center justify-center gap-2 text-gray-500">
            <Loader2 className="w-4 h-4 animate-spin" />
            <span className="text-sm">Memuat data dashboard...</span>
          </CardContent>
        </Card>
      )}

      {/* Section 1: Total Display & Summary Cards */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Total Display */}
        <div>
          <AkademikTotalDisplay
            totalKelas={globalStats.totalKelas}
            totalSantri={globalStats.totalSantri}
            rataKehadiran={globalStats.rataKehadiran}
            monthLabel={monthLabel}
            onNavigateToPresensi={() => navigate('/akademik/presensi')}
            onNavigateToKelas={() => navigate('/akademik/kelas')}
          />
        </div>

        {/* Placeholder untuk komponen tambahan */}
        <div className="flex items-center justify-center">
          {/* Placeholder untuk komponen tambahan */}
        </div>
      </div>

      {/* Section 2: Summary Cards */}
      <AkademikSummaryCards stats={globalStats} monthLabel={monthLabel} />

      {/* Section 3: Kinerja Kelas */}
      <Card className="rounded-lg border border-gray-200 shadow-sm bg-white">
        <CardHeader className="pb-4 pt-4 px-4">
          <CardTitle className="text-sm font-medium text-gray-900">Kinerja Kelas</CardTitle>
          <CardDescription className="text-xs text-gray-500 mt-0.5">
            Ringkasan kehadiran tiap kelas untuk {monthLabel}
          </CardDescription>
        </CardHeader>
        <CardContent className="px-4 pb-4">
          {kelasSummaries.length === 0 ? (
            <div className="text-center py-8 text-gray-500 text-sm">
              Belum ada data kelas untuk filter yang dipilih.
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
              {kelasSummaries.map(summary => (
                <Card key={summary.id} className="border border-gray-200 rounded-lg hover:shadow-md transition-shadow">
                  <CardHeader className="space-y-1 pb-3 pt-4 px-4">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <CardTitle className="text-base font-semibold text-gray-900">{summary.nama_kelas}</CardTitle>
                        <Badge variant="secondary" className="text-xs">{summary.program}</Badge>
                      </div>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-7 w-7"
                        onClick={() => {
                          setDetailKelas({ id: summary.id, nama_kelas: summary.nama_kelas });
                          setDetailOpen(true);
                        }}
                      >
                        <ArrowUpRight className="w-4 h-4" />
                      </Button>
                    </div>
                    <p className="text-xs text-gray-500">
                      {summary.totalSantri} santri • {summary.agendaAktif} agenda aktif
                    </p>
                  </CardHeader>
                  <CardContent className="space-y-4 px-4 pb-4">
                    <div className="space-y-2">
                      <div className="flex items-center justify-between text-sm">
                        <span className="text-gray-600">Kehadiran</span>
                        <span className="font-semibold text-gray-900">{summary.rataHadir.toFixed(1)}%</span>
                      </div>
                      <Progress value={summary.rataHadir} className="h-2" />
                    </div>
                    <div className="grid grid-cols-2 gap-3 text-xs">
                      <div className="rounded-lg border border-gray-200 p-3 bg-gray-50">
                        <p className="text-gray-500 mb-1 font-medium">Status Kehadiran</p>
                        <div className="space-y-1">
                          <div className="flex items-center justify-between">
                            <span className="text-gray-600">Hadir</span>
                            <span className="font-medium text-gray-900">{summary.statusCounts.Hadir}</span>
                          </div>
                          <div className="flex items-center justify-between">
                            <span className="text-gray-600">Izin</span>
                            <span className="font-medium text-gray-900">{summary.statusCounts.Izin}</span>
                          </div>
                          <div className="flex items-center justify-between">
                            <span className="text-gray-600">Sakit</span>
                            <span className="font-medium text-gray-900">{summary.statusCounts.Sakit}</span>
                          </div>
                          <div className="flex items-center justify-between">
                            <span className="text-gray-600">Alfa</span>
                            <span className="font-medium text-red-600">{summary.statusCounts.Alfa}</span>
                          </div>
                        </div>
                      </div>
                      <div className="rounded-lg border border-gray-200 p-3 bg-gray-50">
                        <p className="text-gray-500 mb-1 font-medium">Ringkasan Agenda</p>
                        <div className="space-y-1 text-sm">
                          <div className="flex items-center gap-2">
                            <CalendarRange className="w-4 h-4 text-gray-400" />
                            <span className="text-gray-700">{summary.totalPertemuan} pertemuan</span>
                          </div>
                          {summary.lastPertemuan ? (
                            <div className="space-y-1 text-xs">
                              <p className="font-medium text-gray-700">Pertemuan Terakhir</p>
                              <p className="text-gray-600">{summary.lastPertemuan.agenda}</p>
                              <p className="text-gray-500">
                                {new Date(summary.lastPertemuan.tanggal).toLocaleDateString('id-ID')}
                              </p>
                            </div>
                          ) : (
                            <p className="text-gray-500 text-xs">Belum ada presensi bulan ini.</p>
                          )}
                        </div>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Section 4: Tables */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card className="rounded-lg border border-gray-200 shadow-sm bg-white">
          <CardHeader className="pb-4 pt-4 px-4">
            <CardTitle className="text-sm font-medium text-gray-900">Pertemuan Terbaru</CardTitle>
            <CardDescription className="text-xs text-gray-500 mt-0.5">
              Daftar pertemuan lintas kelas pada {monthLabel}
            </CardDescription>
          </CardHeader>
          <CardContent className="overflow-x-auto px-4 pb-4">
            <Table>
              <TableHeader>
                <TableRow className="border-gray-200">
                  <TableHead className="text-xs text-gray-500 font-medium">Tanggal</TableHead>
                  <TableHead className="text-xs text-gray-500 font-medium">Agenda</TableHead>
                  <TableHead className="text-xs text-gray-500 font-medium">Kelas</TableHead>
                  <TableHead className="text-xs text-gray-500 font-medium">Pengajar</TableHead>
                  <TableHead className="text-right text-xs text-gray-500 font-medium">Hadir</TableHead>
                  <TableHead className="text-right text-xs text-gray-500 font-medium">Alfa</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {recentMeetings.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={6} className="text-center text-gray-500 text-sm py-8">
                      Belum ada pertemuan tercatat.
                    </TableCell>
                  </TableRow>
                ) : (
                  recentMeetings.map(meeting => (
                    <TableRow key={`${meeting.kelas_id}-${meeting.key}`} className="border-gray-100">
                      <TableCell className="text-sm text-gray-700">
                        {new Date(meeting.tanggal).toLocaleDateString('id-ID', {
                          weekday: 'short',
                          day: '2-digit',
                          month: 'short',
                        })}
                      </TableCell>
                      <TableCell className="text-sm">
                        <div className="font-medium text-gray-900">{meeting.agenda}</div>
                        {meeting.mapel && (
                          <p className="text-xs text-gray-500">{meeting.mapel}</p>
                        )}
                      </TableCell>
                      <TableCell className="text-sm">
                        <div className="font-medium text-gray-900">{meeting.kelas_nama}</div>
                        <p className="text-xs text-gray-500">{meeting.program}</p>
                      </TableCell>
                      <TableCell className="text-sm text-gray-700">{meeting.pengajar || '-'}</TableCell>
                      <TableCell className="text-right text-sm text-gray-900 font-medium">{meeting.counts.Hadir}</TableCell>
                      <TableCell className="text-right text-sm text-red-600 font-medium">{meeting.counts.Alfa}</TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </CardContent>
        </Card>

        <Card className="rounded-lg border border-gray-200 shadow-sm bg-white">
          <CardHeader className="pb-4 pt-4 px-4">
            <CardTitle className="text-sm font-medium text-gray-900">Santri Perlu Perhatian</CardTitle>
            <CardDescription className="text-xs text-gray-500 mt-0.5">
              Daftar santri dengan alfa tinggi atau kehadiran rendah
            </CardDescription>
          </CardHeader>
          <CardContent className="overflow-x-auto px-4 pb-4">
            <Table>
              <TableHeader>
                <TableRow className="border-gray-200">
                  <TableHead className="text-xs text-gray-500 font-medium">Santri</TableHead>
                  <TableHead className="text-xs text-gray-500 font-medium">Kelas</TableHead>
                  <TableHead className="text-right text-xs text-gray-500 font-medium">Pertemuan</TableHead>
                  <TableHead className="text-right text-xs text-gray-500 font-medium">Alfa</TableHead>
                  <TableHead className="text-right text-xs text-gray-500 font-medium">Hadir</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {attentionList.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={5} className="text-center text-gray-500 text-sm py-8">
                      Tidak ada santri yang perlu perhatian khusus.
                    </TableCell>
                  </TableRow>
                ) : (
                  attentionList.map(item => (
                    <TableRow key={`${item.kelas_id}-${item.santri_id}`} className="border-gray-100">
                      <TableCell className="text-sm">
                        <div className="font-medium text-gray-900">{item.nama}</div>
                        <p className="text-xs text-gray-500">
                          Kehadiran {item.persentase.toFixed(1)}%
                        </p>
                      </TableCell>
                      <TableCell className="text-sm">
                        <div className="font-medium text-gray-900">{item.kelas_nama}</div>
                        <p className="text-xs text-gray-500">{item.program}</p>
                      </TableCell>
                      <TableCell className="text-right text-sm text-gray-900 font-medium">{item.totalPertemuan}</TableCell>
                      <TableCell className="text-right text-sm text-red-600 font-medium">{item.alfa}</TableCell>
                      <TableCell className="text-right text-sm text-gray-900 font-medium">{item.hadir}</TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      </div>

      {/* Section 5: Aksi Cepat */}
      <Card className="rounded-lg border border-gray-200 shadow-sm bg-white">
        <CardHeader className="pb-4 pt-4 px-4">
          <CardTitle className="text-sm font-medium text-gray-900">Aksi Cepat</CardTitle>
          <CardDescription className="text-xs text-gray-500 mt-0.5">
            Kelola modul akademik sehari-hari
          </CardDescription>
        </CardHeader>
        <CardContent className="grid grid-cols-1 md:grid-cols-3 gap-4 px-4 pb-4">
          <Button
            variant="outline"
            className="h-auto py-4 flex flex-col items-start gap-1 border-gray-200 hover:bg-gray-50"
            onClick={() => navigate('/akademik/presensi')}
          >
            <UserCheck className="h-5 w-5 text-gray-600" />
            <span className="font-semibold text-gray-900">Presensi Kelas</span>
            <span className="text-xs text-gray-500">Input presensi setiap agenda</span>
          </Button>
          <Button
            variant="outline"
            className="h-auto py-4 flex flex-col items-start gap-1 border-gray-200 hover:bg-gray-50"
            onClick={() => navigate('/akademik/setoran')}
          >
            <Clock className="h-5 w-5 text-gray-600" />
            <span className="font-semibold text-gray-900">Setoran Harian</span>
            <span className="text-xs text-gray-500">Catat setoran santri dan progres hafalan</span>
          </Button>
          <Button
            variant="outline"
            className="h-auto py-4 flex flex-col items-start gap-1 border-gray-200 hover:bg-gray-50"
            onClick={() => navigate('/akademik/kelas')}
          >
            <Layers className="h-5 w-5 text-gray-600" />
            <span className="font-semibold text-gray-900">Master Kelas</span>
            <span className="text-xs text-gray-500">Kelola kelas, agenda, dan anggota</span>
          </Button>
        </CardContent>
      </Card>

      <KelasDetailDialog
        open={detailOpen}
        kelasId={detailKelas?.id}
        kelasName={detailKelas?.nama_kelas}
        onClose={() => {
          setDetailOpen(false);
          setDetailKelas(null);
        }}
      />
    </div>
  );
};

export default DashboardAkademik;

import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { 
  TrendingUp, 
  Download,
  Calendar,
  DollarSign,
  Users,
  CreditCard,
  HandCoins,
  BarChart3,
  PieChart,
  FileText,
  RefreshCw
} from "lucide-react";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

interface ReportData {
  periode: string;
  total_tagihan: number;
  total_bayar: number;
  total_beasiswa: number;
  total_santri: number;
  santri_reguler: number;
  santri_binaan: number;
  tagihan_lunas: number;
  tagihan_belum_lunas: number;
}

interface SantriReport {
  id: string;
  nama_lengkap: string;
  kategori: string;
  id_santri?: string;
  total_tagihan: number;
  total_bayar: number;
  total_beasiswa: number;
  status_pembayaran: string;
}

interface SummaryStats {
  total_pendapatan: number;
  total_beasiswa_distribusi: number;
  total_santri_aktif: number;
  persentase_pembayaran: number;
}

const LaporanKeuanganManager = () => {
  const [reportData, setReportData] = useState<ReportData[]>([]);
  const [santriReport, setSantriReport] = useState<SantriReport[]>([]);
  const [summaryStats, setSummaryStats] = useState<SummaryStats>({
    total_pendapatan: 0,
    total_beasiswa_distribusi: 0,
    total_santri_aktif: 0,
    persentase_pembayaran: 0
  });
  const [loading, setLoading] = useState(true);
  const [filterPeriode, setFilterPeriode] = useState('all');
  const [filterKategori, setFilterKategori] = useState('all');

  // Load comprehensive report data
  const loadReportData = async () => {
    try {
      setLoading(true);
      
      // Load tagihan summary
      const { data: tagihanData, error: tagihanError } = await supabase
        .from('tagihan_santri')
        .select(`
          periode,
          total_tagihan,
          total_bayar,
          status,
          santri:kategori
        `)
        .order('periode', { ascending: false });

      if (tagihanError) throw tagihanError;

      // Load beasiswa summary
      const { data: beasiswaData, error: beasiswaError } = await supabase
        .from('distribusi_beasiswa')
        .select(`
          periode_distribusi,
          nominal_distribusi,
          santri:santri_id (kategori)
        `)
        .eq('status', 'terdistribusi')
        .order('periode_distribusi', { ascending: false });

      if (beasiswaError) throw beasiswaError;

      // Load santri detailed report
      const { data: santriData, error: santriError } = await supabase
        .from('santri')
        .select(`
          id,
          nama_lengkap,
          kategori,
          id_santri,
          status_approval
        `)
        .eq('status_approval', 'disetujui')
        .order('nama_lengkap', { ascending: true });

      if (santriError) throw santriError;

      // Process data
      const processedReportData = processReportData(tagihanData || [], beasiswaData || []);
      const processedSantriReport = await processSantriReport(santriData || []);
      const processedSummaryStats = calculateSummaryStats(processedReportData, processedSantriReport);

      setReportData(processedReportData);
      setSantriReport(processedSantriReport);
      setSummaryStats(processedSummaryStats);

    } catch (error) {
      console.error('Error loading report data:', error);
      toast.error('Gagal memuat data laporan');
    } finally {
      setLoading(false);
    }
  };

  // Process report data by periode
  const processReportData = (tagihanData: any[], beasiswaData: any[]) => {
    const periodeMap = new Map();

    // Process tagihan data
    tagihanData.forEach(item => {
      const periode = item.periode;
      if (!periodeMap.has(periode)) {
        periodeMap.set(periode, {
          periode,
          total_tagihan: 0,
          total_bayar: 0,
          total_beasiswa: 0,
          total_santri: 0,
          santri_reguler: 0,
          santri_binaan: 0,
          tagihan_lunas: 0,
          tagihan_belum_lunas: 0
        });
      }

      const data = periodeMap.get(periode);
      data.total_tagihan += item.total_tagihan || 0;
      data.total_bayar += item.total_bayar || 0;
      data.total_santri += 1;

      if (item.santri?.kategori === 'Reguler' || item.santri?.kategori === 'Mahasiswa') {
        data.santri_reguler += 1;
      } else if (item.santri?.kategori?.includes('Binaan')) {
        data.santri_binaan += 1;
      }

      if (item.status === 'lunas') {
        data.tagihan_lunas += 1;
      } else {
        data.tagihan_belum_lunas += 1;
      }
    });

    // Process beasiswa data
    beasiswaData.forEach(item => {
      const periode = item.periode_distribusi;
      if (!periodeMap.has(periode)) {
        periodeMap.set(periode, {
          periode,
          total_tagihan: 0,
          total_bayar: 0,
          total_beasiswa: 0,
          total_santri: 0,
          santri_reguler: 0,
          santri_binaan: 0,
          tagihan_lunas: 0,
          tagihan_belum_lunas: 0
        });
      }

      const data = periodeMap.get(periode);
      data.total_beasiswa += item.nominal_distribusi || 0;
    });

    return Array.from(periodeMap.values()).sort((a, b) => b.periode.localeCompare(a.periode));
  };

  // Process santri detailed report
  const processSantriReport = async (santriData: any[]) => {
    const santriReports = [];

    for (const santri of santriData) {
      // Get tagihan summary for this santri
      const { data: tagihanSummary } = await supabase
        .from('tagihan_santri')
        .select('total_tagihan, total_bayar, status')
        .eq('santri_id', santri.id);

      // Get beasiswa summary for this santri
      const { data: beasiswaSummary } = await supabase
        .from('distribusi_beasiswa')
        .select('nominal_distribusi')
        .eq('santri_id', santri.id)
        .eq('status', 'terdistribusi');

      const totalTagihan = tagihanSummary?.reduce((sum, t) => sum + (t.total_tagihan || 0), 0) || 0;
      const totalBayar = tagihanSummary?.reduce((sum, t) => sum + (t.total_bayar || 0), 0) || 0;
      const totalBeasiswa = beasiswaSummary?.reduce((sum, b) => sum + (b.nominal_distribusi || 0), 0) || 0;
      
      const statusPembayaran = totalBayar >= totalTagihan ? 'lunas' : 'belum_lunas';

      santriReports.push({
        id: santri.id,
        nama_lengkap: santri.nama_lengkap,
        kategori: santri.kategori,
        id_santri: santri.id_santri,
        total_tagihan: totalTagihan,
        total_bayar: totalBayar,
        total_beasiswa: totalBeasiswa,
        status_pembayaran: statusPembayaran
      });
    }

    return santriReports;
  };

  // Calculate summary statistics
  const calculateSummaryStats = (reportData: ReportData[], santriReport: SantriReport[]) => {
    const totalPendapatan = reportData.reduce((sum, item) => sum + item.total_bayar, 0);
    const totalBeasiswaDistribusi = reportData.reduce((sum, item) => sum + item.total_beasiswa, 0);
    const totalSantriAktif = santriReport.length;
    const totalTagihan = reportData.reduce((sum, item) => sum + item.total_tagihan, 0);
    const persentasePembayaran = totalTagihan > 0 ? (totalPendapatan / totalTagihan) * 100 : 0;

    return {
      total_pendapatan: totalPendapatan,
      total_beasiswa_distribusi: totalBeasiswaDistribusi,
      total_santri_aktif: totalSantriAktif,
      persentase_pembayaran: persentasePembayaran
    };
  };

  useEffect(() => {
    loadReportData();
  }, []);

  // Format currency
  const formatRupiah = (amount: number) => {
    return new Intl.NumberFormat('id-ID', {
      style: 'currency',
      currency: 'IDR',
      minimumFractionDigits: 0
    }).format(amount);
  };

  // Filter data
  const filteredReportData = reportData.filter(item => 
    filterPeriode === 'all' || item.periode.includes(filterPeriode)
  );

  const filteredSantriReport = santriReport.filter(item =>
    filterKategori === 'all' || item.kategori === filterKategori
  );

  if (loading) {
    return (
      <div className="flex items-center justify-center p-8">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto mb-4"></div>
          <p className="text-muted-foreground">Memuat laporan...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold flex items-center gap-2">
            <BarChart3 className="w-6 h-6" />
            Laporan Keuangan Terintegrasi
          </h2>
          <p className="text-muted-foreground">
            Laporan komprehensif tagihan dan distribusi beasiswa
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline" onClick={loadReportData}>
            <RefreshCw className="w-4 h-4 mr-2" />
            Refresh
          </Button>
          <Button>
            <Download className="w-4 h-4 mr-2" />
            Export PDF
          </Button>
        </div>
      </div>

      {/* Summary Stats */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center gap-4">
              <div className="p-2 bg-green-100 rounded-lg">
                <DollarSign className="w-6 h-6 text-green-600" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Total Pendapatan</p>
                <p className="text-2xl font-bold">{formatRupiah(summaryStats.total_pendapatan)}</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center gap-4">
              <div className="p-2 bg-blue-100 rounded-lg">
                <HandCoins className="w-6 h-6 text-blue-600" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Total Beasiswa</p>
                <p className="text-2xl font-bold">{formatRupiah(summaryStats.total_beasiswa_distribusi)}</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center gap-4">
              <div className="p-2 bg-purple-100 rounded-lg">
                <Users className="w-6 h-6 text-purple-600" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Total Santri Aktif</p>
                <p className="text-2xl font-bold">{summaryStats.total_santri_aktif}</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center gap-4">
              <div className="p-2 bg-orange-100 rounded-lg">
                <TrendingUp className="w-6 h-6 text-orange-600" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">% Pembayaran</p>
                <p className="text-2xl font-bold">{summaryStats.persentase_pembayaran.toFixed(1)}%</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Main Report Tabs */}
      <Tabs defaultValue="summary" className="space-y-4">
        <TabsList>
          <TabsTrigger value="summary">Ringkasan Periode</TabsTrigger>
          <TabsTrigger value="santri">Detail Santri</TabsTrigger>
          <TabsTrigger value="analytics">Analytics</TabsTrigger>
        </TabsList>

        <TabsContent value="summary">
          <Card>
            <CardHeader>
              <CardTitle>Ringkasan per Periode</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Periode</TableHead>
                      <TableHead>Total Tagihan</TableHead>
                      <TableHead>Total Bayar</TableHead>
                      <TableHead>Total Beasiswa</TableHead>
                      <TableHead>Santri Reguler</TableHead>
                      <TableHead>Santri Binaan</TableHead>
                      <TableHead>Status</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {filteredReportData.map((item) => (
                      <TableRow key={item.periode}>
                        <TableCell className="font-mono">{item.periode}</TableCell>
                        <TableCell className="font-semibold">{formatRupiah(item.total_tagihan)}</TableCell>
                        <TableCell className="font-semibold">{formatRupiah(item.total_bayar)}</TableCell>
                        <TableCell className="font-semibold">{formatRupiah(item.total_beasiswa)}</TableCell>
                        <TableCell>{item.santri_reguler}</TableCell>
                        <TableCell>{item.santri_binaan}</TableCell>
                        <TableCell>
                          <div className="flex flex-col gap-1">
                            <Badge variant="outline" className="w-fit">
                              Lunas: {item.tagihan_lunas}
                            </Badge>
                            <Badge variant="destructive" className="w-fit">
                              Belum: {item.tagihan_belum_lunas}
                            </Badge>
                          </div>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="santri">
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <CardTitle>Detail per Santri</CardTitle>
                <Select value={filterKategori} onValueChange={setFilterKategori}>
                  <SelectTrigger className="w-48">
                    <SelectValue placeholder="Filter Kategori" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">Semua Kategori</SelectItem>
                    <SelectItem value="Reguler">Reguler</SelectItem>
                    <SelectItem value="Binaan Mukim">Binaan Mukim</SelectItem>
                    <SelectItem value="Binaan Non-Mukim">Binaan Non-Mukim</SelectItem>
                    <SelectItem value="Mahasiswa">Mahasiswa</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </CardHeader>
            <CardContent>
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Santri</TableHead>
                      <TableHead>Kategori</TableHead>
                      <TableHead>Total Tagihan</TableHead>
                      <TableHead>Total Bayar</TableHead>
                      <TableHead>Total Beasiswa</TableHead>
                      <TableHead>Status</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {filteredSantriReport.map((santri) => (
                      <TableRow key={santri.id}>
                        <TableCell>
                          <div>
                            <p className="font-medium">{santri.nama_lengkap}</p>
                            <p className="text-sm text-muted-foreground">ID Santri: {santri.id_santri || 'Belum ada'}</p>
                          </div>
                        </TableCell>
                        <TableCell>
                          <Badge variant={santri.kategori.includes('Binaan') ? 'default' : 'secondary'}>
                            {santri.kategori}
                          </Badge>
                        </TableCell>
                        <TableCell className="font-semibold">{formatRupiah(santri.total_tagihan)}</TableCell>
                        <TableCell className="font-semibold">{formatRupiah(santri.total_bayar)}</TableCell>
                        <TableCell className="font-semibold">{formatRupiah(santri.total_beasiswa)}</TableCell>
                        <TableCell>
                          <Badge variant={santri.status_pembayaran === 'lunas' ? 'default' : 'destructive'}>
                            {santri.status_pembayaran === 'lunas' ? 'Lunas' : 'Belum Lunas'}
                          </Badge>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="analytics">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* Revenue vs Beasiswa Chart */}
            <Card>
              <CardHeader>
                <CardTitle>Pendapatan vs Distribusi Beasiswa</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  <div className="flex items-center justify-between p-3 bg-green-50 rounded-lg">
                    <span className="font-medium">Total Pendapatan</span>
                    <span className="font-bold text-green-600">{formatRupiah(summaryStats.total_pendapatan)}</span>
                  </div>
                  <div className="flex items-center justify-between p-3 bg-blue-50 rounded-lg">
                    <span className="font-medium">Total Beasiswa</span>
                    <span className="font-bold text-blue-600">{formatRupiah(summaryStats.total_beasiswa_distribusi)}</span>
                  </div>
                  <div className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                    <span className="font-medium">Net Income</span>
                    <span className="font-bold">{formatRupiah(summaryStats.total_pendapatan - summaryStats.total_beasiswa_distribusi)}</span>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Payment Status Distribution */}
            <Card>
              <CardHeader>
                <CardTitle>Status Pembayaran</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {santriReport.reduce((acc, santri) => {
                    acc[santri.kategori] = (acc[santri.kategori] || 0) + 1;
                    return acc;
                  }, {} as Record<string, number>).map(([kategori, count]) => (
                    <div key={kategori} className="flex items-center justify-between p-3 bg-muted/50 rounded-lg">
                      <span className="font-medium">{kategori}</span>
                      <Badge variant="outline">{count} santri</Badge>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
};

export default LaporanKeuanganManager;

import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { 
  Download,
  RefreshCw,
  TrendingUp,
  TrendingDown,
  DollarSign,
  Users,
  PieChart,
  Calendar,
  FileText
} from 'lucide-react';
import { supabase } from '../integrations/supabase/client';
import { AlokasiPengeluaranService, AkumulasiBantuanSantri } from '../services/alokasiPengeluaran.service';
import { toast } from 'sonner';

const getByPeriod = async (startDate: string, endDate: string) => {
  const { data, error } = await supabase
    .from('keuangan')
    .select(`
      *,
      akun_kas:akun_kas_id(nama)
    `)
    .gte('tanggal', startDate)
    .lte('tanggal', endDate)
    .order('tanggal', { ascending: false });
  
  if (error) throw error;
  return data || [];
};

interface CashFlowData {
  periode: string;
  pemasukan: number;
  pengeluaran: number;
  saldo: number;
}

interface KategoriData {
  kategori: string;
  total: number;
  persentase: number;
}

const LaporanKeuanganV3: React.FC = () => {
  const [activeTab, setActiveTab] = useState('cashflow');
  const [selectedYear, setSelectedYear] = useState(new Date().getFullYear().toString());
  const [cashFlowData, setCashFlowData] = useState<CashFlowData[]>([]);
  const [kategoriData, setKategoriData] = useState<KategoriData[]>([]);
  const [bantuanSantriData, setBantuanSantriData] = useState<AkumulasiBantuanSantri[]>([]);
  const [loading, setLoading] = useState(true);

  // Generate year options
  const yearOptions = Array.from({ length: 5 }, (_, i) => {
    const year = new Date().getFullYear() - i;
    return year.toString();
  });

  useEffect(() => {
    loadData();
  }, [selectedYear]);

  const loadData = async () => {
    try {
      setLoading(true);
      
      // Load cash flow data
      await loadCashFlowData();
      
      // Load kategori data
      await loadKategoriData();
      
      // Load bantuan santri data
      await loadBantuanSantriData();
      
    } catch (error) {
      console.error('Error loading data:', error);
      toast.error('Gagal memuat data laporan');
    } finally {
      setLoading(false);
    }
  };

  const loadCashFlowData = async () => {
    try {
      const startDate = `${selectedYear}-01-01`;
      const endDate = `${selectedYear}-12-31`;
      
      const data = await getByPeriod(startDate, endDate);
      
      // Group by month
      const monthlyData: { [key: string]: CashFlowData } = {};
      
      data.forEach(item => {
        const month = new Date(item.tanggal).toISOString().substring(0, 7); // YYYY-MM
        
        if (!monthlyData[month]) {
          monthlyData[month] = {
            periode: month,
            pemasukan: 0,
            pengeluaran: 0,
            saldo: 0
          };
        }
        
        if (item.jenis_transaksi === 'Pemasukan') {
          monthlyData[month].pemasukan += item.jumlah;
        } else if (item.jenis_transaksi === 'Pengeluaran') {
          monthlyData[month].pengeluaran += item.jumlah;
        }
      });
      
      // Calculate running balance
      const sortedData = Object.values(monthlyData).sort((a, b) => a.periode.localeCompare(b.periode));
      let runningBalance = 0;
      
      sortedData.forEach(item => {
        item.saldo = runningBalance + item.pemasukan - item.pengeluaran;
        runningBalance = item.saldo;
      });
      
      setCashFlowData(sortedData);
    } catch (error) {
      console.error('Error loading cash flow data:', error);
    }
  };

  const loadKategoriData = async () => {
    try {
      const startDate = `${selectedYear}-01-01`;
      const endDate = `${selectedYear}-12-31`;
      
      const data = await getByPeriod(startDate, endDate);
      const pengeluaranData = data.filter(item => item.jenis_transaksi === 'Pengeluaran');
      
      // Group by kategori
      const kategoriMap: { [key: string]: number } = {};
      let totalPengeluaran = 0;
      
      pengeluaranData.forEach(item => {
        const kategori = item.kategori || 'Lainnya';
        kategoriMap[kategori] = (kategoriMap[kategori] || 0) + item.jumlah;
        totalPengeluaran += item.jumlah;
      });
      
      const kategoriArray = Object.entries(kategoriMap).map(([kategori, total]) => ({
        kategori,
        total,
        persentase: totalPengeluaran > 0 ? (total / totalPengeluaran) * 100 : 0
      })).sort((a, b) => b.total - a.total);
      
      setKategoriData(kategoriArray);
    } catch (error) {
      console.error('Error loading kategori data:', error);
    }
  };

  const loadBantuanSantriData = async () => {
    try {
      const data = await AlokasiPengeluaranService.getAkumulasiBantuan();
      
      // Filter by selected year
      const filteredData = data.filter(item => {
        const itemYear = item.periode_bulan.substring(0, 4);
        return itemYear === selectedYear;
      });
      
      setBantuanSantriData(filteredData);
    } catch (error) {
      console.error('Error loading bantuan santri data:', error);
    }
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('id-ID', {
      style: 'currency',
      currency: 'IDR',
      minimumFractionDigits: 0,
    }).format(amount);
  };

  const formatMonth = (periode: string) => {
    const [year, month] = periode.split('-');
    const monthNames = [
      'Januari', 'Februari', 'Maret', 'April', 'Mei', 'Juni',
      'Juli', 'Agustus', 'September', 'Oktober', 'November', 'Desember'
    ];
    return `${monthNames[parseInt(month) - 1]} ${year}`;
  };

  const exportToPDF = async (type: string) => {
    // Simple implementation - in real app, use jsPDF
    toast.success(`Export ${type} berhasil (PDF generation akan ditambahkan)`);
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-8">
        <div className="flex flex-col items-center space-y-4">
          <RefreshCw className="h-8 w-8 animate-spin" />
          <p className="text-muted-foreground">Memuat data laporan...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold tracking-tight">Laporan Keuangan</h2>
          <p className="text-muted-foreground">
            Analisis keuangan dan bantuan yayasan per santri
          </p>
        </div>
        <div className="flex items-center space-x-2">
          <Select value={selectedYear} onValueChange={setSelectedYear}>
            <SelectTrigger className="w-32">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {yearOptions.map(year => (
                <SelectItem key={year} value={year}>{year}</SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Button
            variant="outline"
            size="sm"
            onClick={loadData}
          >
            <RefreshCw className="h-4 w-4 mr-2" />
            Refresh
          </Button>
        </div>
      </div>

      {/* Main Tabs */}
      <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-4">
        <TabsList className="grid w-full grid-cols-3">
          <TabsTrigger value="cashflow">Cash Flow</TabsTrigger>
          <TabsTrigger value="kategori">Per Kategori</TabsTrigger>
          <TabsTrigger value="bantuan">Bantuan Santri</TabsTrigger>
        </TabsList>

        {/* Cash Flow Tab */}
        <TabsContent value="cashflow" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center justify-between">
                <span className="flex items-center gap-2">
                  <TrendingUp className="h-5 w-5" />
                  Cash Flow Bulanan {selectedYear}
                </span>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => exportToPDF('Cash Flow')}
                >
                  <Download className="h-4 w-4 mr-2" />
                  Export PDF
                </Button>
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="rounded-md border">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Bulan</TableHead>
                      <TableHead className="text-right">Pemasukan</TableHead>
                      <TableHead className="text-right">Pengeluaran</TableHead>
                      <TableHead className="text-right">Saldo</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {cashFlowData.length === 0 ? (
                      <TableRow>
                        <TableCell colSpan={4} className="text-center py-8 text-muted-foreground">
                          Tidak ada data untuk tahun {selectedYear}
                        </TableCell>
                      </TableRow>
                    ) : (
                      cashFlowData.map((item) => (
                        <TableRow key={item.periode}>
                          <TableCell className="font-medium">
                            {formatMonth(item.periode)}
                          </TableCell>
                          <TableCell className="text-right text-green-600">
                            {formatCurrency(item.pemasukan)}
                          </TableCell>
                          <TableCell className="text-right text-red-600">
                            {formatCurrency(item.pengeluaran)}
                          </TableCell>
                          <TableCell className="text-right font-medium">
                            <span className={item.saldo >= 0 ? 'text-green-600' : 'text-red-600'}>
                              {formatCurrency(item.saldo)}
                            </span>
                          </TableCell>
                        </TableRow>
                      ))
                    )}
                  </TableBody>
                </Table>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Per Kategori Tab */}
        <TabsContent value="kategori" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center justify-between">
                <span className="flex items-center gap-2">
                  <PieChart className="h-5 w-5" />
                  Pengeluaran per Kategori {selectedYear}
                </span>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => exportToPDF('Per Kategori')}
                >
                  <Download className="h-4 w-4 mr-2" />
                  Export PDF
                </Button>
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="rounded-md border">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Kategori</TableHead>
                      <TableHead className="text-right">Total</TableHead>
                      <TableHead className="text-right">Persentase</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {kategoriData.length === 0 ? (
                      <TableRow>
                        <TableCell colSpan={3} className="text-center py-8 text-muted-foreground">
                          Tidak ada data pengeluaran untuk tahun {selectedYear}
                        </TableCell>
                      </TableRow>
                    ) : (
                      kategoriData.map((item) => (
                        <TableRow key={item.kategori}>
                          <TableCell className="font-medium">
                            <Badge variant="outline">{item.kategori}</Badge>
                          </TableCell>
                          <TableCell className="text-right font-medium">
                            {formatCurrency(item.total)}
                          </TableCell>
                          <TableCell className="text-right">
                            <Badge variant="secondary">
                              {item.persentase.toFixed(1)}%
                            </Badge>
                          </TableCell>
                        </TableRow>
                      ))
                    )}
                  </TableBody>
                </Table>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Bantuan Santri Tab */}
        <TabsContent value="bantuan" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center justify-between">
                <span className="flex items-center gap-2">
                  <Users className="h-5 w-5" />
                  Bantuan Yayasan per Santri {selectedYear}
                </span>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => exportToPDF('Bantuan Santri')}
                >
                  <Download className="h-4 w-4 mr-2" />
                  Export PDF
                </Button>
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="rounded-md border">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Santri</TableHead>
                      <TableHead>ID Santri</TableHead>
                      <TableHead>Periode</TableHead>
                      <TableHead className="text-right">Total Bantuan</TableHead>
                      <TableHead className="text-right">Jumlah Transaksi</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {bantuanSantriData.length === 0 ? (
                      <TableRow>
                        <TableCell colSpan={5} className="text-center py-8 text-muted-foreground">
                          Tidak ada data bantuan untuk tahun {selectedYear}
                        </TableCell>
                      </TableRow>
                    ) : (
                      bantuanSantriData
                        .sort((a, b) => b.total_bantuan - a.total_bantuan)
                        .map((item) => (
                          <TableRow key={`${item.santri_id}-${item.periode_bulan}`}>
                            <TableCell className="font-medium">
                              {item.nama_lengkap}
                            </TableCell>
                            <TableCell>
                              <Badge variant="secondary">{item.nisn}</Badge>
                            </TableCell>
                            <TableCell>
                              {formatMonth(item.periode_bulan)}
                            </TableCell>
                            <TableCell className="text-right font-medium text-blue-600">
                              {formatCurrency(item.total_bantuan)}
                            </TableCell>
                            <TableCell className="text-right">
                              <Badge variant="outline">
                                {item.jumlah_transaksi} transaksi
                              </Badge>
                            </TableCell>
                          </TableRow>
                        ))
                    )}
                  </TableBody>
                </Table>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
};

export default LaporanKeuanganV3;

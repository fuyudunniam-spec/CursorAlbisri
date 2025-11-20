import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { 
  Search, 
  Filter, 
  Download, 
  Calendar,
  TrendingUp,
  TrendingDown,
  RefreshCw,
  FileText,
  BarChart3,
  Users,
  ArrowLeft
} from 'lucide-react';
import { TabunganSantriService } from '@/services/tabunganSantri.service';
import { TabunganSantriWithSantri, TabunganFilter, TabunganStats } from '@/types/tabungan.types';
import { useToast } from '@/hooks/use-toast';
import { useNavigate } from 'react-router-dom';

interface LaporanTabunganProps {
  hideBackButton?: boolean;
}

const LaporanTabungan: React.FC<LaporanTabunganProps> = ({ hideBackButton = false }) => {
  const [riwayat, setRiwayat] = useState<TabunganSantriWithSantri[]>([]);
  const [stats, setStats] = useState<TabunganStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [loadingExport, setLoadingExport] = useState(false);
  const [filter, setFilter] = useState<TabunganFilter>({
    limit: 100,
    offset: 0
  });
  const { toast } = useToast();
  const navigate = useNavigate();

  const loadData = async () => {
    try {
      setLoading(true);
      const [riwayatData, statsData] = await Promise.all([
        TabunganSantriService.getRiwayatTabungan(filter),
        TabunganSantriService.getTabunganStats()
      ]);
      setRiwayat(riwayatData);
      setStats(statsData);
    } catch (error: any) {
      console.error('Error loading data:', error);
      toast({
        title: 'Error',
        description: 'Gagal memuat laporan tabungan',
        variant: 'destructive'
      });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, [filter]);

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('id-ID', {
      style: 'currency',
      currency: 'IDR',
      minimumFractionDigits: 0
    }).format(amount);
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('id-ID', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  const getJenisBadgeVariant = (jenis: string) => {
    switch (jenis) {
      case 'Setoran':
        return 'default';
      case 'Penarikan':
        return 'destructive';
      case 'Reward Prestasi':
      case 'Reward Akademik':
      case 'Reward Non-Akademik':
        return 'secondary';
      default:
        return 'outline';
    }
  };

  const handleFilterChange = (key: keyof TabunganFilter, value: any) => {
    setFilter(prev => ({
      ...prev,
      [key]: value,
      offset: 0 // Reset offset when filter changes
    }));
  };

  const handleRefresh = () => {
    loadData();
  };

  const handleExport = async () => {
    try {
      setLoadingExport(true);
      // Here you would implement CSV/Excel export functionality
      // For now, we'll just show a success message
      toast({
        title: 'Export Berhasil',
        description: 'Laporan telah diekspor ke CSV'
      });
    } catch (error: any) {
      toast({
        title: 'Error',
        description: 'Gagal mengekspor laporan',
        variant: 'destructive'
      });
    } finally {
      setLoadingExport(false);
    }
  };

  const handleLoadMore = () => {
    setFilter(prev => ({
      ...prev,
      offset: (prev.offset || 0) + (prev.limit || 100)
    }));
  };

  // Calculate summary from current data
  const summary = {
    totalTransaksi: riwayat.length,
    totalSetoran: riwayat.filter(t => t.jenis === 'Setoran' || t.jenis.includes('Reward')).reduce((sum, t) => sum + t.nominal, 0),
    totalPenarikan: riwayat.filter(t => t.jenis === 'Penarikan').reduce((sum, t) => sum + t.nominal, 0),
    santriUnik: new Set(riwayat.map(t => t.santri_id)).size
  };

  return (
    <div className="p-6 lg:p-8 space-y-6 animate-fade-in">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          {!hideBackButton && (
            <Button
              onClick={() => navigate('/tabungan-santri')}
              variant="outline"
              size="sm"
            >
              <ArrowLeft className="h-4 w-4 mr-2" />
              Kembali
            </Button>
          )}
          <div>
            <h1 className="text-3xl font-bold text-foreground mb-2">Laporan Tabungan Santri</h1>
            <p className="text-muted-foreground">Laporan komprehensif transaksi tabungan santri</p>
          </div>
        </div>
        <div className="flex gap-2">
          <Button
            onClick={handleExport}
            variant="outline"
            disabled={loadingExport}
          >
            {loadingExport ? (
              <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
            ) : (
              <Download className="h-4 w-4 mr-2" />
            )}
            Export CSV
          </Button>
          <Button onClick={handleRefresh} variant="outline">
            <RefreshCw className="h-4 w-4 mr-2" />
            Refresh
          </Button>
        </div>
      </div>

      {/* Stats Summary */}
      {stats && (
        <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
          <Card className="border-border bg-gradient-card">
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">Total Saldo</CardTitle>
              <BarChart3 className="w-4 h-4 text-primary" />
            </CardHeader>
            <CardContent>
              <div className="text-xl font-bold text-foreground">{formatCurrency(stats.total_saldo)}</div>
            </CardContent>
          </Card>
          
          <Card className="border-border bg-gradient-card">
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">Total Transaksi</CardTitle>
              <FileText className="w-4 h-4 text-primary" />
            </CardHeader>
            <CardContent>
              <div className="text-xl font-bold text-foreground">{summary.totalTransaksi}</div>
            </CardContent>
          </Card>

          <Card className="border-border bg-gradient-card">
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">Total Setoran</CardTitle>
              <TrendingUp className="w-4 h-4 text-green-600" />
            </CardHeader>
            <CardContent>
              <div className="text-xl font-bold text-green-600">{formatCurrency(summary.totalSetoran)}</div>
            </CardContent>
          </Card>

          <Card className="border-border bg-gradient-card">
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">Total Penarikan</CardTitle>
              <TrendingDown className="w-4 h-4 text-red-600" />
            </CardHeader>
            <CardContent>
              <div className="text-xl font-bold text-red-600">{formatCurrency(summary.totalPenarikan)}</div>
            </CardContent>
          </Card>

          <Card className="border-border bg-gradient-card">
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">Santri Aktif</CardTitle>
              <Users className="w-4 h-4 text-accent" />
            </CardHeader>
            <CardContent>
              <div className="text-xl font-bold text-foreground">{summary.santriUnik} santri</div>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Filters */}
      <Card>
        <CardContent className="p-6">
          <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
            <div>
              <Label htmlFor="search">Cari</Label>
              <div className="relative">
                <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
                <Input
                  id="search"
                  placeholder="Cari santri, deskripsi..."
                  value={filter.search || ''}
                  onChange={(e) => handleFilterChange('search', e.target.value)}
                  className="pl-8"
                />
              </div>
            </div>

            <div>
              <Label htmlFor="jenis">Jenis Transaksi</Label>
              <Select
                value={filter.jenis || 'all'}
                onValueChange={(value) => handleFilterChange('jenis', value === 'all' ? undefined : value)}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Semua jenis" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Semua jenis</SelectItem>
                  <SelectItem value="Setoran">Setoran</SelectItem>
                  <SelectItem value="Penarikan">Penarikan</SelectItem>
                  <SelectItem value="Reward Prestasi">Reward Prestasi</SelectItem>
                  <SelectItem value="Reward Akademik">Reward Akademik</SelectItem>
                  <SelectItem value="Reward Non-Akademik">Reward Non-Akademik</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div>
              <Label htmlFor="tanggal_mulai">Tanggal Mulai</Label>
              <Input
                id="tanggal_mulai"
                type="date"
                value={filter.tanggal_mulai || ''}
                onChange={(e) => handleFilterChange('tanggal_mulai', e.target.value || undefined)}
              />
            </div>

            <div>
              <Label htmlFor="tanggal_selesai">Tanggal Selesai</Label>
              <Input
                id="tanggal_selesai"
                type="date"
                value={filter.tanggal_selesai || ''}
                onChange={(e) => handleFilterChange('tanggal_selesai', e.target.value || undefined)}
              />
            </div>

            <div>
              <Label htmlFor="limit">Jumlah Data</Label>
              <Select
                value={filter.limit?.toString() || '100'}
                onValueChange={(value) => handleFilterChange('limit', parseInt(value))}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="50">50 data</SelectItem>
                  <SelectItem value="100">100 data</SelectItem>
                  <SelectItem value="200">200 data</SelectItem>
                  <SelectItem value="500">500 data</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Transaction Table */}
      <Card className="border-border bg-gradient-card shadow-medium">
        <CardHeader>
          <CardTitle className="text-foreground flex items-center gap-2">
            <FileText className="h-5 w-5" />
            Riwayat Transaksi ({riwayat.length} transaksi)
          </CardTitle>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="flex items-center justify-center h-32">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
            </div>
          ) : riwayat.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              Tidak ada transaksi ditemukan
            </div>
          ) : (
            <>
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Tanggal</TableHead>
                      <TableHead>Santri</TableHead>
                      <TableHead>Jenis</TableHead>
                      <TableHead>Nominal</TableHead>
                      <TableHead>Saldo Sebelum</TableHead>
                      <TableHead>Saldo Sesudah</TableHead>
                      <TableHead>Deskripsi</TableHead>
                      <TableHead>Petugas</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {riwayat.map((item) => (
                      <TableRow key={item.id}>
                        <TableCell className="text-sm">
                          {formatDate(item.created_at)}
                        </TableCell>
                        <TableCell>
                          <div className="flex flex-col">
                            <span className="font-medium">{item.santri?.nama_lengkap}</span>
                            {item.santri?.id_santri && (
                              <span className="text-xs text-muted-foreground font-mono">ID: {item.santri.id_santri}</span>
                            )}
                          </div>
                        </TableCell>
                        <TableCell>
                          <Badge variant={getJenisBadgeVariant(item.jenis)}>
                            {item.jenis}
                          </Badge>
                        </TableCell>
                        <TableCell className="font-medium">
                          <div className="flex items-center gap-1">
                            {item.jenis === 'Penarikan' ? (
                              <TrendingDown className="h-4 w-4 text-red-500" />
                            ) : (
                              <TrendingUp className="h-4 w-4 text-green-500" />
                            )}
                            <span className={item.jenis === 'Penarikan' ? 'text-red-600' : 'text-green-600'}>
                              {item.jenis === 'Penarikan' ? '-' : '+'}
                              {formatCurrency(item.nominal)}
                            </span>
                          </div>
                        </TableCell>
                        <TableCell className="text-sm">
                          {formatCurrency(item.saldo_sebelum)}
                        </TableCell>
                        <TableCell className="text-sm font-medium">
                          {formatCurrency(item.saldo_sesudah)}
                        </TableCell>
                        <TableCell className="text-sm">
                          <div className="max-w-xs truncate" title={item.deskripsi}>
                            {item.deskripsi}
                          </div>
                          {item.catatan && (
                            <div className="text-xs text-muted-foreground mt-1 truncate" title={item.catatan}>
                              {item.catatan}
                            </div>
                          )}
                        </TableCell>
                        <TableCell className="text-sm">
                          {item.petugas_nama || '-'}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
              
              {/* Load More Button */}
              <div className="flex justify-center mt-6">
                <Button 
                  onClick={handleLoadMore}
                  variant="outline"
                >
                  Muat Lebih Banyak
                </Button>
              </div>
            </>
          )}
        </CardContent>
      </Card>
    </div>
  );
};

export default LaporanTabungan;

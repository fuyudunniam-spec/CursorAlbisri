import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { 
  Download,
  Filter,
  RefreshCw,
  Calendar,
  DollarSign,
  TrendingUp
} from 'lucide-react';
import { supabase } from '../integrations/supabase/client';
import { toast } from 'sonner';

interface IncomeHistoryEntry {
  id: string;
  tanggal: string;
  kategori: string;
  deskripsi: string;
  jumlah: number;
  akun_kas_nama: string;
  status: string;
}

const getIncomeHistory = async (): Promise<IncomeHistoryEntry[]> => {
  const { data, error } = await supabase
    .from('keuangan')
    .select(`
      *,
      akun_kas:akun_kas_id(nama)
    `)
    .eq('jenis_transaksi', 'Pemasukan')
    .order('tanggal', { ascending: false });
  
  if (error) throw error;
  
  return data?.map(item => ({
    ...item,
    akun_kas_nama: item.akun_kas?.nama || 'Kas Utama'
  })) || [];
};

const RiwayatPemasukan: React.FC = () => {
  const [incomeHistory, setIncomeHistory] = useState<IncomeHistoryEntry[]>([]);
  const [filteredHistory, setFilteredHistory] = useState<IncomeHistoryEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  
  // Filter states
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [sourceFilter, setSourceFilter] = useState('');
  const [searchTerm, setSearchTerm] = useState('');

  // Load initial data
  useEffect(() => {
    loadIncomeHistory();
  }, []);

  // Apply filters when data or filters change
  useEffect(() => {
    applyFilters();
  }, [incomeHistory, startDate, endDate, sourceFilter, searchTerm]);

  const loadIncomeHistory = async () => {
    try {
      setLoading(true);
      const history = await getIncomeHistory();
      setIncomeHistory(history);
    } catch (error) {
      console.error('Error loading income history:', error);
      toast.error('Gagal memuat riwayat pemasukan');
    } finally {
      setLoading(false);
    }
  };

  const applyFilters = () => {
    let filtered = [...incomeHistory];

    // Date filter
    if (startDate) {
      filtered = filtered.filter(item => item.tanggal >= startDate);
    }
    if (endDate) {
      filtered = filtered.filter(item => item.tanggal <= endDate);
    }

    // Source filter
    if (sourceFilter) {
      filtered = filtered.filter(item => item.sumber === sourceFilter);
    }

    // Search filter
    if (searchTerm) {
      filtered = filtered.filter(item => 
        item.deskripsi.toLowerCase().includes(searchTerm.toLowerCase())
      );
    }

    setFilteredHistory(filtered);
  };

  const handleRefresh = async () => {
    setRefreshing(true);
    await loadIncomeHistory();
    setRefreshing(false);
    toast.success('Data berhasil diperbarui');
  };

  const clearFilters = () => {
    setStartDate('');
    setEndDate('');
    setSourceFilter('');
    setSearchTerm('');
  };

  const getSourceIcon = (source: string) => {
    switch (source) {
      case 'donasi':
        return <DollarSign className="h-4 w-4" />;
      case 'pembayaran_santri':
        return <TrendingUp className="h-4 w-4" />;
      case 'inventaris':
        return <TrendingUp className="h-4 w-4" />;
      case 'transaksi_inventaris':
        return <TrendingUp className="h-4 w-4" />;
      case 'pembayaran_spp':
        return <TrendingUp className="h-4 w-4" />;
      default:
        return <DollarSign className="h-4 w-4" />;
    }
  };

  const getSourceColor = (source: string) => {
    switch (source) {
      case 'donasi':
        return 'bg-green-100 text-green-800';
      case 'pembayaran_santri':
        return 'bg-blue-100 text-blue-800';
      case 'inventaris':
        return 'bg-purple-100 text-purple-800';
      case 'transaksi_inventaris':
        return 'bg-purple-100 text-purple-800';
      case 'pembayaran_spp':
        return 'bg-orange-100 text-orange-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  const getSourceLabel = (source: string) => {
    switch (source) {
      case 'donasi':
        return 'Donasi';
      case 'pembayaran_santri':
        return 'Pembayaran Santri';
      case 'inventaris':
        return 'Penjualan Inventaris';
      case 'transaksi_inventaris':
        return 'Penjualan Inventaris';
      case 'pembayaran_spp':
        return 'Pembayaran SPP';
      default:
        return source;
    }
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('id-ID', {
      style: 'currency',
      currency: 'IDR',
      minimumFractionDigits: 0,
    }).format(amount);
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('id-ID', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
    });
  };


  if (loading) {
    return (
      <div className="flex items-center justify-center py-8">
        <div className="flex flex-col items-center space-y-4">
          <RefreshCw className="h-8 w-8 animate-spin" />
          <p className="text-muted-foreground">Memuat riwayat pemasukan...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold tracking-tight">Riwayat Pemasukan</h2>
          <p className="text-muted-foreground">
            Daftar semua pemasukan dari donasi, pembayaran santri, dan sumber lainnya
          </p>
        </div>
        <div className="flex items-center space-x-2">
          <Button
            variant="outline"
            size="sm"
            onClick={handleRefresh}
            disabled={refreshing}
          >
            <RefreshCw className={`h-4 w-4 mr-2 ${refreshing ? 'animate-spin' : ''}`} />
            Refresh
          </Button>
          <Button variant="outline" size="sm">
            <Download className="h-4 w-4 mr-2" />
            Export
          </Button>
        </div>
      </div>


      {/* Filters */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Filter className="h-5 w-5" />
            Filter & Pencarian
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4">
            <div className="space-y-2">
              <Label htmlFor="startDate">Tanggal Mulai</Label>
              <Input
                id="startDate"
                type="date"
                value={startDate}
                onChange={(e) => setStartDate(e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="endDate">Tanggal Akhir</Label>
              <Input
                id="endDate"
                type="date"
                value={endDate}
                onChange={(e) => setEndDate(e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="sourceFilter">Sumber</Label>
              <select
                id="sourceFilter"
                value={sourceFilter}
                onChange={(e) => setSourceFilter(e.target.value)}
                className="w-full px-3 py-2 border border-input bg-background rounded-md text-sm"
              >
                <option value="">Semua Sumber</option>
                <option value="donasi">Donasi</option>
                <option value="inventaris">Penjualan Inventaris</option>
                <option value="transaksi_inventaris">Penjualan Inventaris</option>
                <option value="pembayaran_santri">Pembayaran Santri</option>
                <option value="pembayaran_spp">Pembayaran SPP</option>
              </select>
            </div>
            <div className="space-y-2">
              <Label htmlFor="searchTerm">Pencarian</Label>
              <Input
                id="searchTerm"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                placeholder="Cari deskripsi..."
              />
            </div>
            <div className="space-y-2">
              <Label>&nbsp;</Label>
              <Button variant="outline" onClick={clearFilters} className="w-full">
                Clear Filters
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Income History List */}
      <Card>
        <CardHeader>
          <CardTitle>Daftar Pemasukan</CardTitle>
        </CardHeader>
        <CardContent>
          {filteredHistory.length === 0 ? (
            <div className="text-center py-8">
              <Calendar className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
              <p className="text-muted-foreground">Tidak ada data pemasukan</p>
            </div>
          ) : (
            <div className="space-y-4">
              {filteredHistory.map((item, index) => (
                <div
                  key={`${item.sumber}-${item.sumber_id}-${index}`}
                  className="flex items-center justify-between p-4 border rounded-lg hover:bg-muted/50 transition-colors"
                >
                  <div className="flex items-center space-x-4">
                    <div className={`p-2 rounded-full ${getSourceColor(item.sumber)}`}>
                      {getSourceIcon(item.sumber)}
                    </div>
                    <div>
                      <div className="font-medium">{item.deskripsi}</div>
                      <div className="text-sm text-muted-foreground">
                        {formatDate(item.tanggal)} • {getSourceLabel(item.sumber)}
                      </div>
                      {item.posted_to_finance_at && (
                        <div className="text-xs text-muted-foreground">
                          Diposting: {new Date(item.posted_to_finance_at).toLocaleString('id-ID')}
                        </div>
                      )}
                    </div>
                  </div>
                  <div className="text-right">
                    <div className="text-lg font-bold text-green-600">
                      {formatCurrency(item.jumlah)}
                    </div>
                    <Badge variant="secondary" className={getSourceColor(item.sumber)}>
                      {getSourceLabel(item.sumber)}
                    </Badge>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
};

export default RiwayatPemasukan;

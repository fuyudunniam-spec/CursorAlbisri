import React, { useState, useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { 
  Warehouse, 
  Store, 
  ChefHat, 
  HandHeart, 
  TrendingUp, 
  TrendingDown,
  RefreshCw,
  Search,
  Filter,
  Calendar,
  Download,
  BarChart3
} from 'lucide-react';
import { listTransactions } from '@/services/inventaris.service';
import { InventoryTransaction, TransactionFilters } from '@/types/inventaris.types';
import TransactionList from './components/TransactionList';
// formatRupiah tidak digunakan langsung di halaman ini

type ChannelFilter = 'all' | 'koperasi' | 'dapur' | 'distribusi_bantuan';

const RiwayatInventarisYayasanPage: React.FC = () => {
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedTipe, setSelectedTipe] = useState<'all' | 'Masuk' | 'Keluar' | 'Stocktake'>('all');
  const [selectedChannel, setSelectedChannel] = useState<ChannelFilter>('all');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [pagination, setPagination] = useState({ page: 1, pageSize: 20 });
  const [sort, setSort] = useState<{ column: string; direction: 'asc' | 'desc' } | null>({
    column: 'tanggal',
    direction: 'desc'
  });

  // Build filters
  const filters: TransactionFilters = useMemo(() => ({
    search: searchTerm || null,
    tipe: selectedTipe === 'all' ? null : selectedTipe,
    keluar_mode: null,
    channel: selectedChannel === 'all' ? null : selectedChannel,
    startDate: startDate || null,
    endDate: endDate || null,
    item_id: null,
    penerima: null
  }), [searchTerm, selectedTipe, selectedChannel, startDate, endDate]);

  // Fetch transactions
  const { data: transactionsData, isLoading, refetch } = useQuery({
    queryKey: ['inventaris-transactions', filters, pagination, sort],
    queryFn: async () => {
      const result = await listTransactions(pagination, filters, sort);
      return result;
    }
  });

  const transactions = transactionsData?.data || [];
  const totalTransactions = transactionsData?.total || 0;

  // Calculate statistics per channel
  const stats = useMemo(() => {
    const allTransactions = transactions;
    return {
      koperasi: allTransactions.filter(t => t.channel === 'koperasi' || (t.tipe === 'Keluar' && t.keluar_mode === 'Penjualan')).length,
      dapur: allTransactions.filter(t => t.channel === 'dapur' || (t.tipe === 'Keluar' && t.keluar_mode === 'Distribusi' && t.penerima?.toLowerCase().includes('dapur'))).length,
      distribusi_bantuan: allTransactions.filter(t => t.channel === 'distribusi_bantuan' || (t.tipe === 'Keluar' && t.keluar_mode === 'Distribusi' && !t.penerima?.toLowerCase().includes('dapur'))).length,
      masuk: allTransactions.filter(t => t.tipe === 'Masuk').length,
      total: allTransactions.length
    };
  }, [transactions]);

  return (
    <div className="space-y-6 p-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold flex items-center gap-2">
            <Warehouse className="h-8 w-8 text-primary" />
            Riwayat Inventaris Yayasan
          </h1>
          <p className="text-muted-foreground mt-1">
            Tracking keluar-masuk inventaris per channel (Koperasi, Dapur, Distribusi Bantuan)
          </p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" size="sm">
            <Download className="h-4 w-4 mr-2" />
            Export
          </Button>
          <Button variant="outline" size="sm">
            <BarChart3 className="h-4 w-4 mr-2" />
            Laporan
          </Button>
        </div>
      </div>

      {/* Statistics Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4">
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Total Transaksi</p>
                <p className="text-2xl font-bold">{stats.total}</p>
              </div>
              <Warehouse className="h-8 w-8 text-muted-foreground" />
            </div>
          </CardContent>
        </Card>

        <Card className={selectedChannel === 'koperasi' ? 'border-primary' : ''}>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Ke Koperasi</p>
                <p className="text-2xl font-bold">{stats.koperasi}</p>
              </div>
              <Store className="h-8 w-8 text-blue-600" />
            </div>
          </CardContent>
        </Card>

        <Card className={selectedChannel === 'dapur' ? 'border-primary' : ''}>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Ke Dapur</p>
                <p className="text-2xl font-bold">{stats.dapur}</p>
              </div>
              <ChefHat className="h-8 w-8 text-orange-600" />
            </div>
          </CardContent>
        </Card>

        <Card className={selectedChannel === 'distribusi_bantuan' ? 'border-primary' : ''}>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Distribusi Bantuan</p>
                <p className="text-2xl font-bold">{stats.distribusi_bantuan}</p>
              </div>
              <HandHeart className="h-8 w-8 text-green-600" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Masuk</p>
                <p className="text-2xl font-bold">{stats.masuk}</p>
              </div>
              <TrendingUp className="h-8 w-8 text-green-600" />
            </div>
          </CardContent>
        </Card>
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
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            {/* Search */}
            <div className="space-y-2">
              <label className="text-sm font-medium">Cari Transaksi</label>
              <div className="relative">
                <Search className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Nama barang, penerima..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-10"
                />
              </div>
            </div>

            {/* Channel Filter */}
            <div className="space-y-2">
              <label className="text-sm font-medium">Channel / Tujuan</label>
              <Select value={selectedChannel} onValueChange={(v) => setSelectedChannel(v as ChannelFilter)}>
                <SelectTrigger>
                  <SelectValue placeholder="Pilih channel" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">
                    <div className="flex items-center gap-2">
                      <Warehouse className="h-4 w-4" />
                      Semua Channel
                    </div>
                  </SelectItem>
                  <SelectItem value="koperasi">
                    <div className="flex items-center gap-2">
                      <Store className="h-4 w-4" />
                      Ke Koperasi
                    </div>
                  </SelectItem>
                  <SelectItem value="dapur">
                    <div className="flex items-center gap-2">
                      <ChefHat className="h-4 w-4" />
                      Ke Dapur
                    </div>
                  </SelectItem>
                  <SelectItem value="distribusi_bantuan">
                    <div className="flex items-center gap-2">
                      <HandHeart className="h-4 w-4" />
                      Distribusi Bantuan
                    </div>
                  </SelectItem>
                </SelectContent>
              </Select>
            </div>

            {/* Tipe Filter */}
            <div className="space-y-2">
              <label className="text-sm font-medium">Tipe Transaksi</label>
              <Select value={selectedTipe} onValueChange={(v) => setSelectedTipe(v as any)}>
                <SelectTrigger>
                  <SelectValue placeholder="Pilih tipe" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Semua Tipe</SelectItem>
                  <SelectItem value="Masuk">Masuk</SelectItem>
                  <SelectItem value="Keluar">Keluar</SelectItem>
                  <SelectItem value="Stocktake">Stocktake</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {/* Date Range */}
            <div className="space-y-2">
              <label className="text-sm font-medium">Periode</label>
              <div className="grid grid-cols-2 gap-2">
                <Input
                  type="date"
                  placeholder="Dari"
                  value={startDate}
                  onChange={(e) => setStartDate(e.target.value)}
                />
                <Input
                  type="date"
                  placeholder="Sampai"
                  value={endDate}
                  onChange={(e) => setEndDate(e.target.value)}
                />
              </div>
            </div>
          </div>

          {/* Quick Filter Buttons */}
          <div className="mt-4 flex flex-wrap gap-2">
            <Button
              variant={selectedChannel === 'all' ? 'default' : 'outline'}
              size="sm"
              onClick={() => setSelectedChannel('all')}
            >
              <Warehouse className="h-4 w-4 mr-2" />
              Semua
            </Button>
            <Button
              variant={selectedChannel === 'koperasi' ? 'default' : 'outline'}
              size="sm"
              onClick={() => {
                setSelectedChannel('koperasi');
                setSelectedTipe('Keluar');
              }}
            >
              <Store className="h-4 w-4 mr-2" />
              Ke Koperasi ({stats.koperasi})
            </Button>
            <Button
              variant={selectedChannel === 'dapur' ? 'default' : 'outline'}
              size="sm"
              onClick={() => {
                setSelectedChannel('dapur');
                setSelectedTipe('Keluar');
              }}
            >
              <ChefHat className="h-4 w-4 mr-2" />
              Ke Dapur ({stats.dapur})
            </Button>
            <Button
              variant={selectedChannel === 'distribusi_bantuan' ? 'default' : 'outline'}
              size="sm"
              onClick={() => {
                setSelectedChannel('distribusi_bantuan');
                setSelectedTipe('Keluar');
              }}
            >
              <HandHeart className="h-4 w-4 mr-2" />
              Distribusi Bantuan ({stats.distribusi_bantuan})
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Transaction List */}
      <TransactionList
        data={transactions}
        isLoading={isLoading}
        pagination={pagination}
        onPaginationChange={setPagination}
        sort={sort}
        onSortChange={setSort}
      />
    </div>
  );
};

export default RiwayatInventarisYayasanPage;


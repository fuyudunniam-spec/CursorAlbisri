import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { FileText, Plus, BarChart3, TrendingUp, Search, Edit, Trash2, Eye, Download, History, AlertTriangle } from 'lucide-react';
import ModuleHeader from '@/components/ModuleHeader';
import { useQuery } from '@tanstack/react-query';
import { listTransactions, deleteTransaction } from '@/services/inventaris.service';
import { toast } from 'sonner';

const TransactionHistoryPage = () => {
  const [searchTerm, setSearchTerm] = useState('');
  const [filterType, setFilterType] = useState('all');
  const [filterMode, setFilterMode] = useState('all');
  const [currentPage, setCurrentPage] = useState(1);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [deleteTransactionId, setDeleteTransactionId] = useState<string | null>(null);
  const pageSize = 20;
  
  const tabs = [
    { label: 'Dashboard', path: '/inventaris' },
    { label: 'Master Data', path: '/inventaris/master' },
    { label: 'Penjualan', path: '/inventaris/sales' },
    { label: 'Distribusi', path: '/inventaris/distribution' },
    { label: 'Riwayat', path: '/inventaris/transactions' }
  ];

  // Fetch real data from database
  const { data: transactionsData, isLoading, refetch } = useQuery({
    queryKey: ['transactions-history', currentPage, searchTerm, filterType, filterMode],
    queryFn: () => {
      console.log('Fetching transactions with filters:', {
        page: currentPage,
        pageSize,
        searchTerm,
        filterType,
        filterMode
      });
      
      return listTransactions(
        { page: currentPage, pageSize },
        {
          search: searchTerm || null,
          tipe: filterType === 'all' ? null : filterType,
          keluar_mode: filterMode === 'all' ? null : filterMode
        }
      );
    },
    staleTime: 30000
  });

  const transactions = transactionsData?.data || [];
  const totalTransactions = transactionsData?.total || 0;

  // Handle search and filter changes
  const handleSearchChange = (value: string) => {
    setSearchTerm(value);
    setCurrentPage(1);
  };

  const handleFilterChange = (type: string, value: string) => {
    if (type === 'tipe') {
      setFilterType(value);
    } else if (type === 'mode') {
      setFilterMode(value);
    }
    setCurrentPage(1);
  };

  const handleDeleteTransaction = (transactionId: string) => {
    setDeleteTransactionId(transactionId);
    setShowDeleteConfirm(true);
  };

  const confirmDelete = async () => {
    if (!deleteTransactionId) return;
    
    try {
      await deleteTransaction(deleteTransactionId);
      toast.success('Transaksi berhasil dihapus');
      refetch();
      setShowDeleteConfirm(false);
      setDeleteTransactionId(null);
    } catch (error) {
      console.error('Error deleting transaction:', error);
      toast.error('Gagal menghapus transaksi');
    }
  };

  const resetFilters = () => {
    setSearchTerm('');
    setFilterType('all');
    setFilterMode('all');
    setCurrentPage(1);
  };

  const getTypeBadge = (tipe: string) => {
    switch (tipe) {
      case 'Masuk':
        return <Badge variant="default" className="bg-green-600">Masuk</Badge>;
      case 'Keluar':
        return <Badge variant="destructive">Keluar</Badge>;
      default:
        return <Badge variant="outline">{tipe}</Badge>;
    }
  };

  const getModeBadge = (mode: string) => {
    switch (mode) {
      case 'Penjualan':
        return <Badge variant="outline" className="text-blue-600">Penjualan</Badge>;
      case 'Distribusi':
        return <Badge variant="outline" className="text-purple-600">Distribusi</Badge>;
      case 'Pembelian':
        return <Badge variant="outline" className="text-green-600">Pembelian</Badge>;
      case 'Donasi':
        return <Badge variant="outline" className="text-orange-600">Donasi</Badge>;
      default:
        return <Badge variant="outline">{mode}</Badge>;
    }
  };

  return (
    <div className="space-y-6">
      <ModuleHeader title="Riwayat Transaksi Inventaris" tabs={tabs} />
      
      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Transaksi</CardTitle>
            <History className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{totalTransactions}</div>
            <p className="text-xs text-muted-foreground">
              Semua jenis transaksi
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Masuk</CardTitle>
            <History className="h-4 w-4 text-green-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-green-600">
              {transactions.filter(t => t.tipe === 'Masuk').length}
            </div>
            <p className="text-xs text-muted-foreground">
              Transaksi masuk
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Penjualan</CardTitle>
            <History className="h-4 w-4 text-blue-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-blue-600">
              {transactions.filter(t => t.keluar_mode === 'Penjualan').length}
            </div>
            <p className="text-xs text-muted-foreground">
              Transaksi penjualan
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Distribusi</CardTitle>
            <History className="h-4 w-4 text-purple-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-purple-600">
              {transactions.filter(t => t.keluar_mode === 'Distribusi').length}
            </div>
            <p className="text-xs text-muted-foreground">
              Transaksi distribusi
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Quick Actions */}
      <Card>
        <CardHeader>
          <CardTitle>Quick Actions</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex gap-4">
            <Button className="flex items-center gap-2">
              <Plus className="h-4 w-4" />
              Transaksi Baru
            </Button>
            <Button variant="outline" className="flex items-center gap-2">
              <Download className="h-4 w-4" />
              Export Laporan
            </Button>
            <Button variant="outline">
              Filter Lanjutan
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Filters */}
      <Card>
        <CardHeader>
          <CardTitle>Filter & Pencarian</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <div>
              <Label htmlFor="search">Cari Transaksi</Label>
              <div className="relative">
                <Search className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                <Input
                  id="search"
                  placeholder="Cari item atau catatan..."
                  value={searchTerm}
                  onChange={(e) => handleSearchChange(e.target.value)}
                  className="pl-10"
                />
              </div>
            </div>
            <div>
              <Label htmlFor="filterType">Filter Tipe</Label>
              <Select value={filterType} onValueChange={(value) => handleFilterChange('tipe', value)}>
                <SelectTrigger>
                  <SelectValue placeholder="Pilih tipe" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Semua Tipe</SelectItem>
                  <SelectItem value="masuk">Masuk</SelectItem>
                  <SelectItem value="keluar">Keluar</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label htmlFor="filterMode">Filter Mode</Label>
              <Select value={filterMode} onValueChange={(value) => handleFilterChange('mode', value)}>
                <SelectTrigger>
                  <SelectValue placeholder="Pilih mode" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Semua Mode</SelectItem>
                  <SelectItem value="penjualan">Penjualan</SelectItem>
                  <SelectItem value="distribusi">Distribusi</SelectItem>
                  <SelectItem value="pembelian">Pembelian</SelectItem>
                  <SelectItem value="donasi">Donasi</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="flex items-end">
              <Button variant="outline" className="w-full" onClick={resetFilters}>
                Reset Filter
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Transaction List */}
      <Card>
        <CardHeader>
          <CardTitle>Riwayat Transaksi</CardTitle>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="flex items-center justify-center h-64">
              <div className="text-center">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto mb-4"></div>
                <p className="text-muted-foreground">Loading transaksi...</p>
              </div>
            </div>
          ) : (
            <div className="border rounded-lg">
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead className="bg-muted/50">
                    <tr>
                      <th className="text-left p-4 font-medium">Item</th>
                      <th className="text-left p-4 font-medium">Tipe</th>
                      <th className="text-left p-4 font-medium">Mode</th>
                      <th className="text-left p-4 font-medium">Jumlah</th>
                      <th className="text-left p-4 font-medium">Tanggal</th>
                      <th className="text-left p-4 font-medium">Penerima</th>
                      <th className="text-left p-4 font-medium">Status</th>
                      <th className="text-left p-4 font-medium">Aksi</th>
                    </tr>
                  </thead>
                  <tbody>
                    {transactions.map((trans) => (
                    <tr key={trans.id} className="border-t hover:bg-muted/25">
                      <td className="p-4">
                        <div>
                          <div className="font-medium">{trans.nama_barang || 'N/A'}</div>
                          <div className="text-sm text-muted-foreground">{trans.catatan || 'Tidak ada catatan'}</div>
                        </div>
                      </td>
                      <td className="p-4">{getTypeBadge(trans.tipe)}</td>
                      <td className="p-4">{getModeBadge(trans.keluar_mode || 'N/A')}</td>
                      <td className="p-4 font-medium">{trans.jumlah || 0}</td>
                      <td className="p-4">{trans.tanggal}</td>
                      <td className="p-4">{trans.penerima || 'N/A'}</td>
                      <td className="p-4">
                        <Badge variant="outline" className="text-green-600">
                          Selesai
                        </Badge>
                      </td>
                      <td className="p-4">
                        <div className="flex gap-2">
                          <Button size="sm" variant="outline" title="Lihat Detail">
                            <Eye className="h-4 w-4" />
                          </Button>
                          <Button size="sm" variant="outline" title="Edit Transaksi">
                            <Edit className="h-4 w-4" />
                          </Button>
                          <Button 
                            size="sm" 
                            variant="outline" 
                            className="text-red-600"
                            onClick={() => handleDeleteTransaction(trans.id)}
                            title="Hapus Transaksi"
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {transactions.length === 0 && (
              <div className="text-center py-8 text-muted-foreground">
                <FileText className="h-12 w-12 mx-auto mb-4 opacity-50" />
                <p>Tidak ada transaksi yang ditemukan</p>
                <div className="text-sm mt-2">
                  <p>Filter: {filterType === 'all' ? 'Semua Tipe' : filterType} | {filterMode === 'all' ? 'Semua Mode' : filterMode}</p>
                  <p>Search: {searchTerm || 'Tidak ada'}</p>
                  <p>Total transaksi di database: {totalTransactions}</p>
                </div>
              </div>
            )}

            {/* Pagination */}
            {totalTransactions > pageSize && (
              <div className="flex items-center justify-between mt-4">
                <div className="text-sm text-muted-foreground">
                  Showing {((currentPage - 1) * pageSize) + 1} to {Math.min(currentPage * pageSize, totalTransactions)} of {totalTransactions} transactions
                </div>
                <div className="flex gap-2">
                  <Button 
                    variant="outline" 
                    size="sm"
                    onClick={() => setCurrentPage(prev => Math.max(1, prev - 1))}
                    disabled={currentPage === 1}
                  >
                    Previous
                  </Button>
                  <Button 
                    variant="outline" 
                    size="sm"
                    onClick={() => setCurrentPage(prev => prev + 1)}
                    disabled={currentPage * pageSize >= totalTransactions}
                  >
                    Next
                  </Button>
                </div>
              </div>
            )}
          </div>
          )}
        </CardContent>
      </Card>

      {/* Delete Confirmation Modal */}
      {showDeleteConfirm && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <Card className="w-full max-w-md">
            <CardHeader className="flex flex-row items-center justify-between">
              <CardTitle className="flex items-center gap-2 text-red-600">
                <AlertTriangle className="h-5 w-5" />
                Konfirmasi Hapus
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <p className="text-sm text-muted-foreground">
                  Apakah Anda yakin ingin menghapus transaksi ini?
                </p>
                
                <div className="bg-red-50 border border-red-200 rounded-lg p-3">
                  <p className="text-sm text-red-800">
                    <strong>Peringatan:</strong> Tindakan ini tidak dapat dibatalkan. 
                    Transaksi akan dihapus secara permanen.
                  </p>
                </div>

                <div className="flex gap-2 pt-4">
                  <Button 
                    variant="destructive" 
                    onClick={confirmDelete}
                    className="flex items-center gap-2"
                  >
                    <AlertTriangle className="h-4 w-4" />
                    Ya, Hapus
                  </Button>
                  <Button variant="outline" onClick={() => setShowDeleteConfirm(false)}>
                    Batal
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      )}
    </div>
  );
};

export default TransactionHistoryPage;
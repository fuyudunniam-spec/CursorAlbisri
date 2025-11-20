import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Search, Filter, MoreHorizontal, Eye, Edit, Trash2, ArrowUpRight, ArrowDownLeft, X, Calendar, Download, FileText } from 'lucide-react';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Calendar as CalendarComponent } from '@/components/ui/calendar';
import { cn } from '@/lib/utils';

interface Transaction {
  id: string;
  tanggal: string;
  jenis_transaksi: 'Pemasukan' | 'Pengeluaran';
  kategori: string;
  deskripsi: string;
  jumlah: number;
  akun_kas_id: string;
  akun_kas_nama: string;
  status: string;
  created_at: string;
  sub_kategori?: string;
  penerima_pembayar?: string;
  rincian_items?: any[];
  alokasi_santri?: any[];
  display_category?: string;
  source_type?: string;
  display_description?: string;
}

interface RiwayatTransaksiProps {
  transactions: Transaction[];
  selectedAccountId?: string;
  selectedAccountName?: string;
  onClearFilter?: () => void;
  onViewDetail?: (transaction: Transaction) => void;
  onEditTransaction?: (transaction: Transaction) => void;
  onDeleteTransaction?: (transaction: Transaction) => void;
  onExportPDF?: (reportType: string, period?: any) => void;
  onExportExcel?: (reportType: string, period?: any) => void;
  onExportAll?: (format: 'pdf' | 'excel', period?: any) => void;
}

const RiwayatTransaksi: React.FC<RiwayatTransaksiProps> = ({
  transactions,
  selectedAccountId,
  selectedAccountName,
  onClearFilter,
  onViewDetail,
  onEditTransaction,
  onDeleteTransaction,
  onExportPDF,
  onExportExcel,
  onExportAll
}) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [filterType, setFilterType] = useState<string>('all');
  const [filterStatus, setFilterStatus] = useState<string>('all');
  const [filterCategory, setFilterCategory] = useState<string>('all');
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage, setItemsPerPage] = useState(10);
  const [sortBy, setSortBy] = useState<string>('tanggal');
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('desc');
  
  // Date filter states
  const [dateFilter, setDateFilter] = useState<string>('all');
  const [customStartDate, setCustomStartDate] = useState<Date>();
  const [customEndDate, setCustomEndDate] = useState<Date>();
  const [showDatePicker, setShowDatePicker] = useState(false);

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('id-ID', {
      style: 'currency',
      currency: 'IDR',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(amount);
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('id-ID', {
      day: 'numeric',
      month: 'short',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  const getTransactionIcon = (jenis: string) => {
    return jenis === 'Pemasukan' ? 
      <ArrowUpRight className="h-4 w-4 text-green-600" /> : 
      <ArrowDownLeft className="h-4 w-4 text-red-600" />;
  };

  const getStatusBadge = (status: string) => {
    const statusConfig = {
      'Posted': { color: 'bg-green-100 text-green-800', label: 'Posted' },
      'Pending': { color: 'bg-yellow-100 text-yellow-800', label: 'Pending' },
      'Draft': { color: 'bg-gray-100 text-gray-800', label: 'Draft' },
      'Cancelled': { color: 'bg-red-100 text-red-800', label: 'Cancelled' },
    };
    
    const config = statusConfig[status as keyof typeof statusConfig] || statusConfig['Draft'];
    return <Badge className={config.color} variant="secondary">{config.label}</Badge>;
  };

  // Get unique categories for filter
  const uniqueCategories = Array.from(new Set(transactions.map(t => t.kategori)));

  // Date filter logic
  const getDateFilter = (transaction: Transaction) => {
    const transactionDate = new Date(transaction.tanggal);
    const now = new Date();
    
    switch (dateFilter) {
      case 'today':
        return transactionDate.toDateString() === now.toDateString();
      case 'week':
        const weekAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
        return transactionDate >= weekAgo;
      case 'month':
        const monthAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
        return transactionDate >= monthAgo;
      case 'custom':
        if (!customStartDate || !customEndDate) return true;
        return transactionDate >= customStartDate && transactionDate <= customEndDate;
      default:
        return true;
    }
  };

  const filteredTransactions = transactions.filter(transaction => {
    // EXCLUDE transactions from tabungan module
    // Filter by source_module
    if (transaction.source_module && 
        typeof transaction.source_module === 'string' &&
        transaction.source_module.toLowerCase().includes('tabungan')) {
      return false;
    }
    // Filter by kategori
    if (transaction.kategori === 'Tabungan Santri') {
      return false;
    }
    // Filter by akun kas managed_by if available
    if ((transaction as any).akun_kas?.managed_by === 'tabungan') {
      return false;
    }
    
    // Apply other filters
    const s = (searchTerm || '').toLowerCase();
    const desc = ((transaction.deskripsi ?? '') as string).toString().toLowerCase();
    const kat = ((transaction.kategori ?? '') as string).toString().toLowerCase();
    const akun = ((transaction.akun_kas_nama ?? '') as string).toString().toLowerCase();
    const matchesSearch = desc.includes(s) || kat.includes(s) || akun.includes(s);
    const matchesType = filterType === 'all' || transaction.jenis_transaksi === filterType;
    const matchesStatus = filterStatus === 'all' || transaction.status === filterStatus;
    const matchesCategory = filterCategory === 'all' || transaction.kategori === filterCategory;
    const matchesAccount = !selectedAccountId || transaction.akun_kas_id === selectedAccountId;
    const matchesDate = getDateFilter(transaction);
    
    return matchesSearch && matchesType && matchesStatus && matchesCategory && matchesAccount && matchesDate;
  });

  // Sort transactions
  const sortedTransactions = [...filteredTransactions].sort((a, b) => {
    let aValue, bValue;
    
    switch (sortBy) {
      case 'tanggal':
        aValue = new Date(a.tanggal).getTime();
        bValue = new Date(b.tanggal).getTime();
        break;
      case 'jumlah':
        aValue = a.jumlah;
        bValue = b.jumlah;
        break;
      case 'kategori':
        aValue = a.kategori;
        bValue = b.kategori;
        break;
      default:
        aValue = new Date(a.tanggal).getTime();
        bValue = new Date(b.tanggal).getTime();
    }
    
    if (sortOrder === 'asc') {
      return aValue > bValue ? 1 : -1;
    } else {
      return aValue < bValue ? 1 : -1;
    }
  });

  // Pagination logic
  const totalPages = Math.ceil(sortedTransactions.length / itemsPerPage);
  const startIndex = (currentPage - 1) * itemsPerPage;
  const endIndex = startIndex + itemsPerPage;
  const currentTransactions = sortedTransactions.slice(startIndex, endIndex);

  // Reset to first page when filters change
  useEffect(() => {
    setCurrentPage(1);
  }, [searchTerm, filterType, filterStatus, filterCategory, selectedAccountId, dateFilter]);

  const handlePreviousPage = () => {
    if (currentPage > 1) {
      setCurrentPage(currentPage - 1);
    }
  };

  const handleNextPage = () => {
    if (currentPage < totalPages) {
      setCurrentPage(currentPage + 1);
    }
  };

  const handleSort = (field: string) => {
    if (sortBy === field) {
      setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc');
    } else {
      setSortBy(field);
      setSortOrder('desc');
    }
  };

  const getCurrentPeriod = () => {
    if (dateFilter === 'custom' && customStartDate && customEndDate) {
      return { start: customStartDate, end: customEndDate };
    }
    
    const now = new Date();
    const presets = {
      'today': { start: now, end: now },
      'week': { start: new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000), end: now },
      'month': { start: new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000), end: now },
    };
    
    return presets[dateFilter as keyof typeof presets] || { start: new Date(2025, 0, 1), end: now };
  };

  const handleExportAll = (format: 'pdf' | 'excel') => {
    const period = getCurrentPeriod();
    onExportAll?.(format, period);
  };

  return (
    <Card className="rounded-2xl shadow-md border-0">
      <CardHeader className="pb-4">
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="text-lg font-semibold">Riwayat Transaksi</CardTitle>
            <p className="text-sm text-muted-foreground">
              Daftar lengkap transaksi keuangan dengan filter dan CRUD
            </p>
          </div>
          <div className="flex items-center space-x-2">
            {selectedAccountId && selectedAccountName && (
              <Badge className="bg-blue-100 text-blue-800 border-blue-200 text-xs">
                {selectedAccountName}
              </Badge>
            )}
            <div className="flex space-x-2">
              <Button
                variant="outline" 
                size="sm"
                onClick={() => handleExportAll('pdf')}
              >
                <Download className="h-4 w-4 mr-2" />
                Export PDF
              </Button>
              <Button
                variant="outline" 
                size="sm"
                onClick={() => handleExportAll('excel')}
              >
                <Download className="h-4 w-4 mr-2" />
                Export Excel
              </Button>
            </div>
          </div>
        </div>
      </CardHeader>
      <CardContent>
        {/* Advanced Filters */}
        <div className="space-y-4 mb-6">
          {/* Search and Basic Filters */}
          <div className="flex flex-wrap gap-4">
            <div className="relative flex-1 min-w-[200px]">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Cari transaksi, kategori, atau akun..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10"
              />
            </div>
            
            {/* Type Filter */}
            <Select value={filterType} onValueChange={setFilterType}>
              <SelectTrigger className="w-[140px]">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Semua Jenis</SelectItem>
                <SelectItem value="Pemasukan">Pemasukan</SelectItem>
                <SelectItem value="Pengeluaran">Pengeluaran</SelectItem>
              </SelectContent>
            </Select>

            {/* Status Filter */}
            <Select value={filterStatus} onValueChange={setFilterStatus}>
              <SelectTrigger className="w-[140px]">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Semua Status</SelectItem>
                <SelectItem value="Posted">Posted</SelectItem>
                <SelectItem value="Pending">Pending</SelectItem>
                <SelectItem value="Draft">Draft</SelectItem>
                <SelectItem value="Cancelled">Cancelled</SelectItem>
              </SelectContent>
            </Select>

            {/* Category Filter */}
            <Select value={filterCategory} onValueChange={setFilterCategory}>
              <SelectTrigger className="w-[160px]">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Semua Kategori</SelectItem>
                {uniqueCategories.map(category => (
                  <SelectItem key={category} value={category}>{category}</SelectItem>
                ))}
              </SelectContent>
            </Select>

            {/* Date Filter */}
            <Select value={dateFilter} onValueChange={setDateFilter}>
              <SelectTrigger className="w-[140px]">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Semua Tanggal</SelectItem>
                <SelectItem value="today">Hari Ini</SelectItem>
                <SelectItem value="week">7 Hari</SelectItem>
                <SelectItem value="month">30 Hari</SelectItem>
                <SelectItem value="custom">Custom</SelectItem>
              </SelectContent>
            </Select>

            {/* Custom Date Picker */}
            {dateFilter === 'custom' && (
              <Popover open={showDatePicker} onOpenChange={setShowDatePicker}>
                <PopoverTrigger asChild>
                  <Button variant="outline" size="sm">
                    <Calendar className="h-4 w-4 mr-2" />
                    {customStartDate && customEndDate 
                      ? `${customStartDate.toLocaleDateString('id-ID')} - ${customEndDate.toLocaleDateString('id-ID')}`
                      : 'Pilih Periode'
                    }
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0" align="start">
                  <div className="p-4">
                    <div className="space-y-4">
                      <div>
                        <label className="text-sm font-medium">Tanggal Mulai:</label>
                        <CalendarComponent
                          mode="single"
                          selected={customStartDate}
                          onSelect={setCustomStartDate}
                          className="rounded-md border"
                        />
                      </div>
                      <div>
                        <label className="text-sm font-medium">Tanggal Akhir:</label>
                        <CalendarComponent
                          mode="single"
                          selected={customEndDate}
                          onSelect={setCustomEndDate}
                          className="rounded-md border"
                        />
                      </div>
                      <Button 
                        size="sm" 
                        onClick={() => setShowDatePicker(false)}
                        disabled={!customStartDate || !customEndDate}
                      >
                        Terapkan
                      </Button>
                    </div>
                  </div>
                </PopoverContent>
              </Popover>
            )}
          </div>

          {/* Active Filters Display */}
          <div className="flex flex-wrap gap-2">
            {selectedAccountId && selectedAccountName && (
              <Badge variant="secondary" className="bg-blue-100 text-blue-800">
                Akun: {selectedAccountName}
                <Button 
                  variant="ghost" 
                  size="sm" 
                  onClick={onClearFilter}
                  className="h-4 w-4 p-0 ml-2"
                >
                  <X className="h-3 w-3" />
                </Button>
              </Badge>
            )}
            {filterType !== 'all' && (
              <Badge variant="secondary">
                Jenis: {filterType}
                <Button 
                  variant="ghost" 
                  size="sm" 
                  onClick={() => setFilterType('all')}
                  className="h-4 w-4 p-0 ml-2"
                >
                  <X className="h-3 w-3" />
                </Button>
              </Badge>
            )}
            {filterStatus !== 'all' && (
              <Badge variant="secondary">
                Status: {filterStatus}
                <Button 
                  variant="ghost" 
                  size="sm" 
                  onClick={() => setFilterStatus('all')}
                  className="h-4 w-4 p-0 ml-2"
                >
                  <X className="h-3 w-3" />
                </Button>
              </Badge>
            )}
            {filterCategory !== 'all' && (
              <Badge variant="secondary">
                Kategori: {filterCategory}
                <Button 
                  variant="ghost" 
                  size="sm" 
                  onClick={() => setFilterCategory('all')}
                  className="h-4 w-4 p-0 ml-2"
                >
                  <X className="h-3 w-3" />
                </Button>
              </Badge>
            )}
            {dateFilter !== 'all' && (
              <Badge variant="secondary">
                Periode: {dateFilter === 'custom' ? 'Custom' : dateFilter}
                <Button 
                  variant="ghost" 
                  size="sm" 
                  onClick={() => setDateFilter('all')}
                  className="h-4 w-4 p-0 ml-2"
                >
                  <X className="h-3 w-3" />
                </Button>
              </Badge>
            )}
          </div>
        </div>

        {/* Table Header with Sort */}
        <div className="grid grid-cols-12 gap-4 p-4 bg-gray-50 rounded-lg font-medium text-sm text-gray-600">
          <div className="col-span-1">
            <input type="checkbox" className="rounded border-gray-300" />
          </div>
          <div 
            className="col-span-2 cursor-pointer hover:text-gray-900 flex items-center space-x-1"
            onClick={() => handleSort('tanggal')}
          >
            <span>Tanggal</span>
            {sortBy === 'tanggal' && (
              <span className="text-xs">{sortOrder === 'asc' ? '↑' : '↓'}</span>
            )}
          </div>
          <div 
            className="col-span-2 cursor-pointer hover:text-gray-900 flex items-center space-x-1"
            onClick={() => handleSort('kategori')}
          >
            <span>Kategori</span>
            {sortBy === 'kategori' && (
              <span className="text-xs">{sortOrder === 'asc' ? '↑' : '↓'}</span>
            )}
          </div>
          <div className="col-span-3">Deskripsi</div>
          <div className="col-span-1">Status</div>
          <div 
            className="col-span-2 cursor-pointer hover:text-gray-900 flex items-center space-x-1"
            onClick={() => handleSort('jumlah')}
          >
            <span>Jumlah</span>
            {sortBy === 'jumlah' && (
              <span className="text-xs">{sortOrder === 'asc' ? '↑' : '↓'}</span>
            )}
          </div>
        </div>

        {/* Transactions Table */}
        <div className="space-y-2">
          {currentTransactions.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              Tidak ada transaksi ditemukan
            </div>
          ) : (
            currentTransactions.map((transaction) => (
              <div
                key={transaction.id}
                className={`grid grid-cols-12 gap-4 p-4 rounded-lg border hover:bg-gray-50 transition-all duration-200 ${
                  transaction.jenis_transaksi === 'Pemasukan' 
                    ? 'bg-green-50 border-green-100' 
                    : 'bg-white border-gray-200'
                }`}
              >
                {/* Checkbox */}
                <div className="col-span-1 flex items-center">
                  <input
                    type="checkbox"
                    className="rounded border-gray-300"
                  />
                </div>
                
                {/* Date */}
                <div className="col-span-2 flex items-center space-x-2">
                  {getTransactionIcon(transaction.jenis_transaksi)}
                  <span className="text-sm font-medium">
                    {formatDate(transaction.tanggal)}
                  </span>
                </div>
                
                {/* Category */}
                <div className="col-span-2">
                  <div className="text-sm font-medium">
                    {transaction.display_category || transaction.kategori}
                  </div>
                  {transaction.source_type && (
                    <Badge variant="outline" className="text-xs mt-1">
                      {transaction.source_type}
                    </Badge>
                  )}
                </div>
                
                {/* Description */}
                <div className="col-span-3">
                  <div className="text-sm">
                    {transaction.display_description || transaction.deskripsi}
                  </div>
                  {transaction.penerima_pembayar && (
                    <div className="text-xs text-muted-foreground mt-1">
                      {transaction.penerima_pembayar}
                    </div>
                  )}
                </div>
                
                {/* Status */}
                <div className="col-span-1 flex items-center">
                  {getStatusBadge(transaction.status)}
                </div>
                
                {/* Amount */}
                <div className="col-span-2 text-right">
                  <div className={`font-semibold ${
                    transaction.jenis_transaksi === 'Pemasukan' 
                      ? 'text-green-600' 
                      : 'text-red-600'
                  }`}>
                    {formatCurrency(transaction.jumlah)}
                  </div>
                  <div className="text-xs text-muted-foreground mt-1">
                    {transaction.akun_kas_nama}
                  </div>
                </div>
                
                {/* Actions - Compact */}
                <div className="col-span-1 flex items-center justify-end space-x-1">
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => onEditTransaction?.(transaction)}
                    className="h-8 w-8 p-0 hover:bg-blue-100"
                    title="Edit transaksi"
                  >
                    <Edit className="h-4 w-4 text-blue-600" />
                  </Button>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => onDeleteTransaction?.(transaction)}
                    className="h-8 w-8 p-0 hover:bg-red-100"
                    title="Hapus transaksi"
                  >
                    <Trash2 className="h-4 w-4 text-red-600" />
                  </Button>
                </div>
              </div>
            ))
          )}
        </div>

        {/* Pagination and Items Per Page */}
        <div className="flex items-center justify-between mt-6 pt-4 border-t">
          <div className="flex items-center space-x-4">
            <span className="text-sm text-muted-foreground">
              Menampilkan {startIndex + 1}-{Math.min(endIndex, sortedTransactions.length)} dari {sortedTransactions.length} transaksi
            </span>
            <Select value={itemsPerPage.toString()} onValueChange={(value) => setItemsPerPage(Number(value))}>
              <SelectTrigger className="w-[80px]">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="5">5</SelectItem>
                <SelectItem value="10">10</SelectItem>
                <SelectItem value="25">25</SelectItem>
                <SelectItem value="50">50</SelectItem>
                <SelectItem value="100">100</SelectItem>
              </SelectContent>
            </Select>
          </div>
          
          <div className="flex space-x-2">
            <Button 
              variant="outline" 
              size="sm" 
              onClick={handlePreviousPage}
              disabled={currentPage === 1}
            >
              ← Sebelumnya
            </Button>
            <span className="flex items-center px-3 text-sm">
              Halaman {currentPage} dari {totalPages}
            </span>
            <Button 
              variant="outline" 
              size="sm"
              onClick={handleNextPage}
              disabled={currentPage === totalPages}
            >
              Selanjutnya →
            </Button>
          </div>
        </div>
      </CardContent>
    </Card>
  );
};

export default RiwayatTransaksi;

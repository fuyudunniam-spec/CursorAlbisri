import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Search, Edit, Trash2, ArrowUpRight, ArrowDownLeft, X, Calendar, CheckSquare, Square, CalendarDays, Users } from 'lucide-react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { toast } from 'sonner';
import { supabase } from '@/integrations/supabase/client';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Calendar as CalendarComponent } from '@/components/ui/calendar';

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
  auto_posted?: boolean;
  source_module?: string;
  source_id?: string; // ID dari modul sumber (misalnya donation.id)
  referensi?: string;
  is_pengeluaran_riil?: boolean; // Baru: untuk tracking nominal vs pengeluaran riil
  jenis_alokasi?: string; // 'overhead' = auto-post, 'langsung' atau null/undefined = manual selection
}

// Helper function to extract source from referensi or kategori
const getSourceFromReferensi = (referensi?: string, kategori?: string, sourceModule?: string): string | null => {
  // Check kategori first for Penjualan Inventaris (to catch all cases)
  if (kategori === 'Penjualan Inventaris') return 'Penjualan Inventaris';
  
  // Check kategori untuk Donasi (menangkap semua transaksi donasi)
  if (kategori === 'Donasi' || kategori === 'Donasi Tunai') return 'Donasi';
  
  // Check source_module untuk Donasi
  if (sourceModule === 'donasi') return 'Donasi';
  
  if (!referensi) return null;
  if (referensi.startsWith('donation:') || referensi.startsWith('donasi:')) return 'Donasi';
  if (referensi.startsWith('inventory_sale:') || referensi.startsWith('inventaris:')) return 'Penjualan Inventaris';
  if (referensi.startsWith('pembayaran_santri:')) return 'Pembayaran Santri';
  return null;
};

interface RiwayatTransaksiProps {
  transactions: Transaction[];
  selectedAccountId?: string;
  selectedAccountName?: string;
  onClearFilter?: () => void;
  onViewDetail?: (transaction: Transaction) => void;
  onEditTransaction?: (transaction: Transaction) => void;
  onDeleteTransaction?: (transaction: Transaction) => void;
  onEditTanggalDonasi?: (transaction: Transaction) => void; // New: untuk edit tanggal transfer donasi
  initialDateFilter?: string; // For syncing date filter from parent
  onDateFilterChange?: (filter: string) => void; // Callback when date filter changes
  initialCustomStartDate?: string; // For syncing custom start date from parent
  initialCustomEndDate?: string; // For syncing custom end date from parent
  onCustomDateChange?: (startDate: string, endDate: string) => void; // Callback when custom dates change
}

const RiwayatTransaksi: React.FC<RiwayatTransaksiProps> = ({
  transactions,
  selectedAccountId,
  selectedAccountName,
  onClearFilter,
  onViewDetail,
  onEditTransaction,
  onDeleteTransaction,
  onEditTanggalDonasi,
  initialDateFilter,
  onDateFilterChange,
  initialCustomStartDate,
  initialCustomEndDate,
  onCustomDateChange
}) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [filterType, setFilterType] = useState<string>('all');
  // Status filter removed - not used in this system
  const [filterCategory, setFilterCategory] = useState<string>('all');
  const [filterSource, setFilterSource] = useState<string>('all'); // New: filter by source (donation, inventory, etc.)
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage, setItemsPerPage] = useState(10);
  const [sortBy, setSortBy] = useState<string>('tanggal');
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('desc');
  
  // Batch selection states
  const [selectedTransactions, setSelectedTransactions] = useState<Set<string>>(new Set());
  
  // State untuk dropdown rincian santri Bantuan Langsung
  const [expandedBantuanLangsung, setExpandedBantuanLangsung] = useState<Set<string>>(new Set());
  const [bantuanLangsungAllocations, setBantuanLangsungAllocations] = useState<Record<string, any[]>>({});
  const [showBatchEditDialog, setShowBatchEditDialog] = useState(false);
  const [batchEditData, setBatchEditData] = useState({
    kategori: '',
    sub_kategori: ''
  });
  const [isBatchUpdating, setIsBatchUpdating] = useState(false);
  
  // Date filter states - sync with parent if provided
  // Default to 'all' if no initialDateFilter provided, otherwise use initialDateFilter
  const [dateFilter, setDateFilter] = useState<string>(initialDateFilter || 'all');
  const [customStartDate, setCustomStartDate] = useState<Date>(
    initialCustomStartDate ? new Date(initialCustomStartDate) : undefined
  );
  const [customEndDate, setCustomEndDate] = useState<Date>(
    initialCustomEndDate ? new Date(initialCustomEndDate) : undefined
  );
  const [showDatePicker, setShowDatePicker] = useState(false);

  // Sync date filter with parent
  useEffect(() => {
    if (initialDateFilter !== undefined && initialDateFilter !== dateFilter) {
      setDateFilter(initialDateFilter);
    }
  }, [initialDateFilter]);

  // Sync custom dates with parent
  useEffect(() => {
    if (initialCustomStartDate) {
      const newStartDate = new Date(initialCustomStartDate);
      if (!customStartDate || newStartDate.getTime() !== customStartDate.getTime()) {
        setCustomStartDate(newStartDate);
      }
    }
    if (initialCustomEndDate) {
      const newEndDate = new Date(initialCustomEndDate);
      if (!customEndDate || newEndDate.getTime() !== customEndDate.getTime()) {
        setCustomEndDate(newEndDate);
      }
    }
  }, [initialCustomStartDate, initialCustomEndDate]);

  // Handle date filter change
  const handleDateFilterChange = (newFilter: string) => {
    setDateFilter(newFilter);
    if (onDateFilterChange) {
      onDateFilterChange(newFilter);
    }
  };

  // Handle custom date change
  const handleCustomDateChange = (start: Date | undefined, end: Date | undefined) => {
    setCustomStartDate(start);
    setCustomEndDate(end);
    if (onCustomDateChange && start && end) {
      onCustomDateChange(start.toISOString().split('T')[0], end.toISOString().split('T')[0]);
    }
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('id-ID', {
      style: 'currency',
      currency: 'IDR',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(amount);
  };

  const formatDate = (dateString: string, useTime: boolean = false) => {
    if (!dateString) return '';
    const date = new Date(dateString);
    // If date is DATE type (no time), it will show as midnight
    // Use created_at for time if available
    const options: Intl.DateTimeFormatOptions = {
      day: 'numeric',
      month: 'short',
      year: 'numeric'
    };
    if (useTime) {
      options.hour = '2-digit';
      options.minute = '2-digit';
    }
    return date.toLocaleDateString('id-ID', options);
  };
  
  // Format date with time from created_at if available
  const formatDateWithTime = (transaction: Transaction) => {
    const dateStr = transaction.tanggal;
    const createdStr = (transaction as any).created_at;
    
    if (!dateStr) return '';
    
    const date = new Date(dateStr);
    let timeStr = '';
    
    // Use created_at for accurate time if available
    if (createdStr) {
      const createdDate = new Date(createdStr);
      timeStr = createdDate.toLocaleTimeString('id-ID', {
        hour: '2-digit',
        minute: '2-digit',
        hour12: false
      });
    } else {
      // Fallback: use date's time (might be 00:00 for DATE type)
      timeStr = date.toLocaleTimeString('id-ID', {
      hour: '2-digit',
        minute: '2-digit',
        hour12: false
      });
    }
    
    const dateFormatted = date.toLocaleDateString('id-ID', {
      day: 'numeric',
      month: 'short',
      year: 'numeric'
    });
    
    return `${dateFormatted}, ${timeStr}`;
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
  
  // Get unique sources for filter
  const uniqueSources = Array.from(new Set(
    transactions
      .map(t => getSourceFromReferensi(t.referensi, t.kategori, t.source_module))
      .filter((source): source is string => source !== null)
  ));

  // Date filter logic
  const getDateFilter = (transaction: Transaction) => {
    const transactionDate = new Date(transaction.tanggal);
    const now = new Date();
    
    switch (dateFilter) {
      case 'bulan-ini': {
        const startOfCurrentMonth = new Date(now.getFullYear(), now.getMonth(), 1);
        const endOfCurrentMonth = new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59);
        return transactionDate >= startOfCurrentMonth && transactionDate <= endOfCurrentMonth;
      }
      case 'bulan-lalu': {
        const lastMonth = new Date(now.getFullYear(), now.getMonth() - 1, 1);
        const endOfLastMonth = new Date(now.getFullYear(), now.getMonth(), 0, 23, 59, 59);
        return transactionDate >= lastMonth && transactionDate <= endOfLastMonth;
      }
      case '3-bulan': {
        const threeMonthsAgo = new Date(now.getFullYear(), now.getMonth() - 2, 1);
        const endOfCurrentMonth = new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59);
        return transactionDate >= threeMonthsAgo && transactionDate <= endOfCurrentMonth;
      }
      case 'custom':
        if (!customStartDate || !customEndDate) return true;
        const start = new Date(customStartDate);
        start.setHours(0, 0, 0, 0);
        const end = new Date(customEndDate);
        end.setHours(23, 59, 59, 999);
        return transactionDate >= start && transactionDate <= end;
      case 'today':
        return transactionDate.toDateString() === now.toDateString();
      case 'week':
        const weekAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
        return transactionDate >= weekAgo;
      case 'month':
        const monthAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
        return transactionDate >= monthAgo;
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
    
    // Status filter removed - not used
    const matchesStatus = true;
    
    const matchesCategory = filterCategory === 'all' || transaction.kategori === filterCategory;
    const matchesAccount = !selectedAccountId || transaction.akun_kas_id === selectedAccountId;
    const matchesDate = getDateFilter(transaction);
    
    // Filter by source (donation, inventory, etc.)
    const transactionSource = getSourceFromReferensi(transaction.referensi, transaction.kategori, transaction.source_module);
    const matchesSource = filterSource === 'all' || 
                         (filterSource === 'manual' && !transactionSource) ||
                         transactionSource === filterSource;
    
    return matchesSearch && matchesType && matchesStatus && matchesCategory && matchesAccount && matchesDate && matchesSource;
  });

  // Sort transactions
  const sortedTransactions = [...filteredTransactions].sort((a, b) => {
    let aValue, bValue;
    let aTieBreaker, bTieBreaker;
    
    switch (sortBy) {
      case 'tanggal':
        aValue = new Date(a.tanggal).getTime();
        bValue = new Date(b.tanggal).getTime();
        // Use created_at as tie-breaker for same date
        aTieBreaker = (a as any).created_at ? new Date((a as any).created_at).getTime() : 0;
        bTieBreaker = (b as any).created_at ? new Date((b as any).created_at).getTime() : 0;
        break;
      case 'jumlah':
        aValue = a.jumlah;
        bValue = b.jumlah;
        // Use created_at as tie-breaker for same amount
        aTieBreaker = (a as any).created_at ? new Date((a as any).created_at).getTime() : 0;
        bTieBreaker = (b as any).created_at ? new Date((b as any).created_at).getTime() : 0;
        break;
      case 'kategori':
        aValue = a.kategori;
        bValue = b.kategori;
        // Use created_at as tie-breaker for same category
        aTieBreaker = (a as any).created_at ? new Date((a as any).created_at).getTime() : 0;
        bTieBreaker = (b as any).created_at ? new Date((b as any).created_at).getTime() : 0;
        break;
      default:
        // Default: sort by tanggal, then created_at
        aValue = new Date(a.tanggal).getTime();
        bValue = new Date(b.tanggal).getTime();
        aTieBreaker = (a as any).created_at ? new Date((a as any).created_at).getTime() : 0;
        bTieBreaker = (b as any).created_at ? new Date((b as any).created_at).getTime() : 0;
    }
    
    // Primary sort
    let result = 0;
    if (sortOrder === 'asc') {
      result = aValue > bValue ? 1 : (aValue < bValue ? -1 : 0);
    } else {
      result = aValue < bValue ? 1 : (aValue > bValue ? -1 : 0);
    }
    
    // Tie-breaker: if primary values are equal, use created_at (newest first for desc, oldest first for asc)
    if (result === 0 && aTieBreaker !== bTieBreaker) {
      return sortOrder === 'asc' 
        ? (aTieBreaker > bTieBreaker ? 1 : -1)
        : (aTieBreaker < bTieBreaker ? 1 : -1);
    }
    
    return result;
  });

  // Pagination logic
  const totalPages = Math.ceil(sortedTransactions.length / itemsPerPage);
  const startIndex = (currentPage - 1) * itemsPerPage;
  const endIndex = startIndex + itemsPerPage;
  const currentTransactions = sortedTransactions.slice(startIndex, endIndex);

  // Reset to first page when filters change
  useEffect(() => {
    setCurrentPage(1);
  }, [searchTerm, filterType, filterCategory, filterSource, selectedAccountId, dateFilter]);

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

  // Handle select/deselect transaction
  const handleSelectTransaction = (transactionId: string) => {
    setSelectedTransactions(prev => {
      const newSet = new Set(prev);
      if (newSet.has(transactionId)) {
        newSet.delete(transactionId);
      } else {
        newSet.add(transactionId);
      }
      return newSet;
    });
  };

  // Handle select all
  const handleSelectAll = () => {
    if (selectedTransactions.size === currentTransactions.length) {
      setSelectedTransactions(new Set());
    } else {
      setSelectedTransactions(new Set(currentTransactions.map(t => t.id)));
    }
  };

  // Handle batch edit
  const handleBatchEdit = async () => {
    if (selectedTransactions.size === 0) {
      toast.error('Pilih minimal 1 transaksi');
      return;
    }

    if (!batchEditData.kategori) {
      toast.error('Pilih kategori terlebih dahulu');
      return;
    }

    try {
      setIsBatchUpdating(true);
      const transactionIds = Array.from(selectedTransactions);
      
      // Filter transactions yang bisa di-edit
      // Izinkan auto-posted jika jenis_transaksi === 'Pemasukan'
      // Hapus filter donasi karena transaksi donasi pemasukan auto_posted bisa di-edit/di-delete
      const editableTransactions = currentTransactions.filter(t => 
        transactionIds.includes(t.id) &&
        (
          !t.auto_posted || 
          (t.auto_posted && t.jenis_transaksi === 'Pemasukan')
        ) &&
        !t.referensi?.startsWith('inventory_sale:') &&
        !t.referensi?.startsWith('inventaris:') &&
        !t.referensi?.startsWith('pembayaran_santri:') &&
        t.kategori !== 'Penjualan Inventaris'
      );

      if (editableTransactions.length === 0) {
        toast.error('Tidak ada transaksi yang bisa di-edit.');
        return;
      }

      const updateData: any = {
        kategori: batchEditData.kategori
      };

      // Hanya update sub_kategori jika diisi
      if (batchEditData.sub_kategori) {
        updateData.sub_kategori = batchEditData.sub_kategori;
      }

      // Update transactions
      const { error } = await supabase
        .from('keuangan')
        .update(updateData)
        .in('id', editableTransactions.map(t => t.id));

      if (error) throw error;

      // Jika kategori diubah menjadi "Operasional Yayasan", hapus semua alokasi
      // karena kategori ini tidak dialokasikan ke santri
      if (updateData.kategori === 'Operasional Yayasan') {
        const { error: deleteAlokasiError } = await supabase
          .from('alokasi_pengeluaran_santri')
          .delete()
          .in('keuangan_id', editableTransactions.map(t => t.id));

        if (deleteAlokasiError) {
          // Failed to delete alokasi, but main update already succeeded
          // Error is non-critical, continue silently
        }
      }
      // Jika kategori adalah "Operasional dan Konsumsi Santri" dan ada sub_kategori,
      // update juga jenis_bantuan di alokasi_pengeluaran_santri
      else if (updateData.kategori === 'Operasional dan Konsumsi Santri' && updateData.sub_kategori) {
        const { error: alokasiError } = await supabase
          .from('alokasi_pengeluaran_santri')
          .update({ jenis_bantuan: updateData.sub_kategori })
          .in('keuangan_id', editableTransactions.map(t => t.id))
          .eq('alokasi_ke', 'asrama_konsumsi');

        if (alokasiError) {
          // Failed to update jenis_bantuan, but main update already succeeded
          // Error is non-critical, continue silently
        }
      }

      toast.success(`Berhasil mengupdate ${editableTransactions.length} transaksi`);
      setShowBatchEditDialog(false);
      setSelectedTransactions(new Set());
      setBatchEditData({ kategori: '', sub_kategori: '' });
      
      // Refresh page
      window.location.reload();
    } catch (error: any) {
      toast.error('Gagal mengupdate transaksi: ' + (error.message || 'Unknown error'));
    } finally {
      setIsBatchUpdating(false);
    }
  };

  return (
    <Card className="rounded-lg border border-gray-200 shadow-sm bg-white">
      <CardHeader className="pb-4 pt-4 px-4">
        <div className="flex items-center justify-between">
        <div>
          <CardTitle className="text-base font-medium text-gray-900">Riwayat Transaksi</CardTitle>
          <p className="text-xs text-gray-500 mt-0.5">
            Daftar lengkap transaksi keuangan
          </p>
        </div>
        {selectedAccountId && selectedAccountName && (
          <Badge variant="outline" className="bg-gray-50 text-gray-600 border-gray-200 text-xs px-2 py-0.5">
            {selectedAccountName}
          </Badge>
        )}
        </div>
      </CardHeader>
      <CardContent>
        {/* Filters */}
        <div className="space-y-3 mb-5">
          {/* Search and Basic Filters */}
          <div className="flex flex-wrap gap-3">
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
              <SelectTrigger className="w-[130px] h-9 text-xs border-gray-200">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Semua Jenis</SelectItem>
                <SelectItem value="Pemasukan">Pemasukan</SelectItem>
                <SelectItem value="Pengeluaran">Pengeluaran</SelectItem>
              </SelectContent>
            </Select>

            {/* Category Filter */}
            <Select value={filterCategory} onValueChange={setFilterCategory}>
              <SelectTrigger className="w-[150px] h-9 text-xs border-gray-200">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Semua Kategori</SelectItem>
                {uniqueCategories.map(category => (
                  <SelectItem key={category} value={category}>{category}</SelectItem>
                ))}
              </SelectContent>
            </Select>

            {/* Source Filter - NEW */}
            <Select value={filterSource} onValueChange={setFilterSource}>
              <SelectTrigger className="w-[150px] h-9 text-xs border-gray-200">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Semua Sumber</SelectItem>
                <SelectItem value="manual">Manual</SelectItem>
                {uniqueSources.map(source => (
                  <SelectItem key={source} value={source}>{source}</SelectItem>
                ))}
              </SelectContent>
            </Select>

            {/* Date Filter */}
            <Select value={dateFilter} onValueChange={handleDateFilterChange}>
              <SelectTrigger className="w-[150px] h-9 text-xs border-gray-200">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="bulan-ini">Bulan Ini</SelectItem>
                <SelectItem value="bulan-lalu">Bulan Lalu</SelectItem>
                <SelectItem value="3-bulan">3 Bulan</SelectItem>
                <SelectItem value="custom">Custom</SelectItem>
                <SelectItem value="all">Semua Tanggal</SelectItem>
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
                          onSelect={(date) => handleCustomDateChange(date, customEndDate)}
                          className="rounded-md border"
                        />
                      </div>
                      <div>
                        <label className="text-sm font-medium">Tanggal Akhir:</label>
                        <CalendarComponent
                          mode="single"
                          selected={customEndDate}
                          onSelect={(date) => handleCustomDateChange(customStartDate, date)}
                          className="rounded-md border"
                        />
                      </div>
                      <Button 
                        size="sm" 
                        onClick={() => {
                          setShowDatePicker(false);
                          if (customStartDate && customEndDate && onCustomDateChange) {
                            onCustomDateChange(
                              customStartDate.toISOString().split('T')[0],
                              customEndDate.toISOString().split('T')[0]
                            );
                          }
                        }}
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
              <Badge variant="outline" className="bg-gray-50 text-gray-700 border-gray-200 text-xs px-2 py-0.5">
                Akun: {selectedAccountName}
                <Button 
                  variant="ghost" 
                  size="sm" 
                  onClick={onClearFilter}
                  className="h-4 w-4 p-0 ml-1.5 hover:bg-transparent"
                >
                  <X className="h-3 w-3" />
                </Button>
              </Badge>
            )}
            {filterType !== 'all' && (
              <Badge variant="outline" className="bg-gray-50 text-gray-700 border-gray-200 text-xs px-2 py-0.5">
                Jenis: {filterType}
                <Button 
                  variant="ghost" 
                  size="sm" 
                  onClick={() => setFilterType('all')}
                  className="h-4 w-4 p-0 ml-1.5 hover:bg-transparent"
                >
                  <X className="h-3 w-3" />
                </Button>
              </Badge>
            )}
            {filterCategory !== 'all' && (
              <Badge variant="outline" className="bg-gray-50 text-gray-700 border-gray-200 text-xs px-2 py-0.5">
                Kategori: {filterCategory}
                <Button 
                  variant="ghost" 
                  size="sm" 
                  onClick={() => setFilterCategory('all')}
                  className="h-4 w-4 p-0 ml-1.5 hover:bg-transparent"
                >
                  <X className="h-3 w-3" />
                </Button>
              </Badge>
            )}
            {filterSource !== 'all' && (
              <Badge variant="outline" className="bg-gray-50 text-gray-700 border-gray-200 text-xs px-2 py-0.5">
                Sumber: {filterSource}
                <Button 
                  variant="ghost" 
                  size="sm" 
                  onClick={() => setFilterSource('all')}
                  className="h-4 w-4 p-0 ml-1.5 hover:bg-transparent"
                >
                  <X className="h-3 w-3" />
                </Button>
              </Badge>
            )}
            {dateFilter !== 'all' && (
              <Badge variant="outline" className="bg-gray-50 text-gray-700 border-gray-200 text-xs px-2 py-0.5">
                Periode: {dateFilter === 'custom' ? 'Custom' : dateFilter}
                <Button 
                  variant="ghost" 
                  size="sm" 
                  onClick={() => setDateFilter('all')}
                  className="h-4 w-4 p-0 ml-1.5 hover:bg-transparent"
                >
                  <X className="h-3 w-3" />
                </Button>
              </Badge>
            )}
          </div>
        </div>

        {/* Table Wrapper with Horizontal Scroll for Mobile */}
        <div className="overflow-x-auto -mx-4 sm:mx-0">
          <div className="min-w-full inline-block align-middle">
            <div className="overflow-hidden">
              {/* Desktop Table View - Hidden on Mobile */}
              <div className="hidden lg:block">
                <table className="min-w-full divide-y divide-gray-200">
                  <thead className="bg-gray-50">
                    <tr>
                      <th className="w-10 px-3 py-3 text-left">
                        <button
                          onClick={handleSelectAll}
                          className="flex items-center justify-center"
                          title={selectedTransactions.size === currentTransactions.length ? "Batal pilih semua" : "Pilih semua"}
                        >
                          {selectedTransactions.size === currentTransactions.length && currentTransactions.length > 0 ? (
                            <CheckSquare className="h-4 w-4 text-blue-600" />
                          ) : (
                            <Square className="h-4 w-4 text-gray-400" />
                          )}
                        </button>
                      </th>
                      <th 
                        className="px-3 py-3 text-left text-xs font-medium text-gray-600 cursor-pointer hover:text-gray-900"
                        onClick={() => handleSort('tanggal')}
                      >
                        <div className="flex items-center space-x-1">
                          <span>Tanggal</span>
                          {sortBy === 'tanggal' && (
                            <span className="text-xs">{sortOrder === 'asc' ? '↑' : '↓'}</span>
                          )}
                        </div>
                      </th>
                      <th 
                        className="px-3 py-3 text-left text-xs font-medium text-gray-600 cursor-pointer hover:text-gray-900"
                        onClick={() => handleSort('kategori')}
                      >
                        <div className="flex items-center space-x-1">
                          <span>Kategori</span>
                          {sortBy === 'kategori' && (
                            <span className="text-xs">{sortOrder === 'asc' ? '↑' : '↓'}</span>
                          )}
                        </div>
                      </th>
                      <th className="px-3 py-3 text-left text-xs font-medium text-gray-600">
                        Deskripsi
                      </th>
                      <th 
                        className="px-3 py-3 text-right text-xs font-medium text-gray-600 cursor-pointer hover:text-gray-900"
                        onClick={() => handleSort('jumlah')}
                      >
                        <div className="flex items-center justify-end space-x-1">
                          <span>Jumlah</span>
                          {sortBy === 'jumlah' && (
                            <span className="text-xs">{sortOrder === 'asc' ? '↑' : '↓'}</span>
                          )}
                        </div>
                      </th>
                      <th className="px-3 py-3 text-right text-xs font-medium text-gray-600">
                        Aksi
                      </th>
                    </tr>
                  </thead>
                  <tbody className="bg-white divide-y divide-gray-200">
                    {currentTransactions.length === 0 ? (
                      <tr>
                        <td colSpan={6} className="px-3 py-8 text-center text-muted-foreground">
                          Tidak ada transaksi ditemukan
                        </td>
                      </tr>
                    ) : (
                      currentTransactions.map((transaction) => (
                        <tr 
                          key={transaction.id}
                          className={`transition-colors ${
                            transaction.jenis_transaksi === 'Pemasukan' 
                              ? 'bg-emerald-50/30 hover:bg-emerald-50/50' 
                              : 'hover:bg-gray-50'
                          }`}
                        >
                          <td className="px-3 py-3 whitespace-nowrap">
                            <button
                              onClick={() => handleSelectTransaction(transaction.id)}
                              className="flex items-center justify-center"
                              disabled={
                                // Izinkan auto-posted jika jenis_transaksi === 'Pemasukan'
                                // Hapus filter donasi karena transaksi donasi pemasukan auto_posted bisa di-edit/di-delete
                                (transaction.auto_posted && transaction.jenis_transaksi !== 'Pemasukan') ||
                                transaction.referensi?.startsWith('inventory_sale:') ||
                                transaction.referensi?.startsWith('inventaris:') ||
                                transaction.referensi?.startsWith('pembayaran_santri:') ||
                                transaction.kategori === 'Penjualan Inventaris'
                              }
                              title={
                                (transaction.auto_posted && transaction.jenis_transaksi !== 'Pemasukan') ||
                                transaction.referensi?.startsWith('inventory_sale:') ||
                                transaction.referensi?.startsWith('inventaris:') ||
                                transaction.referensi?.startsWith('pembayaran_santri:') ||
                                transaction.kategori === 'Penjualan Inventaris'
                                  ? "Transaksi ini tidak bisa di-edit"
                                  : selectedTransactions.has(transaction.id)
                                  ? "Batal pilih"
                                  : "Pilih"
                              }
                            >
                              {selectedTransactions.has(transaction.id) ? (
                                <CheckSquare className="h-4 w-4 text-blue-600" />
                              ) : (
                                <Square className={`h-4 w-4 ${
                                  (transaction.auto_posted && transaction.jenis_transaksi !== 'Pemasukan') ||
                                  transaction.referensi?.startsWith('inventory_sale:') ||
                                  transaction.referensi?.startsWith('inventaris:') ||
                                  transaction.referensi?.startsWith('pembayaran_santri:') ||
                                  transaction.kategori === 'Penjualan Inventaris'
                                    ? 'text-gray-300 cursor-not-allowed'
                                    : 'text-gray-400 hover:text-gray-600'
                                }`} />
                              )}
                            </button>
                          </td>
                          <td className="px-3 py-3 whitespace-nowrap">
                            <div className="flex items-center gap-2">
                              {getTransactionIcon(transaction.jenis_transaksi)}
                              <span className="text-xs font-medium text-gray-900">
                                {formatDateWithTime(transaction)}
                              </span>
                            </div>
                          </td>
                          <td className="px-3 py-3">
                            <div className="text-xs font-medium text-gray-900 mb-1">
                              {transaction.display_category || transaction.kategori}
                            </div>
                            <div className="flex flex-wrap gap-1">
                              {/* Badge ungu untuk semua transaksi donasi (lama dan baru) */}
                              {(transaction.kategori === 'Donasi' || 
                                transaction.kategori === 'Donasi Tunai' ||
                                transaction.referensi?.startsWith('donation:') ||
                                transaction.referensi?.startsWith('donasi:') ||
                                transaction.source_module === 'donasi') && (
                                <Badge className="text-[10px] px-1.5 py-0 bg-purple-100 text-purple-800 border-purple-200">
                                  Donasi
                                </Badge>
                              )}
                              {(transaction.referensi?.startsWith('inventory_sale:') || 
                                transaction.referensi?.startsWith('inventaris:') ||
                                transaction.kategori === 'Penjualan Inventaris') && (
                                <Badge className="text-[10px] px-1.5 py-0 bg-blue-100 text-blue-800 border-blue-200">
                                  Inventaris
                                </Badge>
                              )}
                              {transaction.referensi?.startsWith('pembayaran_santri:') && (
                                <Badge className="text-[10px] px-1.5 py-0 bg-green-100 text-green-800 border-green-200">
                                  Pembayaran
                                </Badge>
                              )}
                              {transaction.kategori === 'Pendidikan Pesantren' && transaction.is_pengeluaran_riil === false && (
                                <Badge className="text-[10px] px-1.5 py-0 bg-purple-100 text-purple-800 border-purple-200">
                                  Beasiswa
                                </Badge>
                              )}
                            </div>
                          </td>
                          <td className="px-3 py-3">
                            <div className="text-xs text-gray-700 max-w-md">
                              {transaction.display_description || transaction.deskripsi}
                            </div>
                            {transaction.penerima_pembayar && (
                              <div className="text-xs text-gray-500 mt-0.5">
                                {transaction.penerima_pembayar}
                              </div>
                            )}
                            {/* Dropdown rincian santri untuk PENGELUARAN dengan jenis_alokasi === 'langsung' (manual selection) */}
                            {(() => {
                              // Hanya tampilkan link untuk PENGELUARAN dengan jenis_alokasi === 'langsung'
                              // 'langsung' = manual selection (pilih santri tertentu) → tampilkan detail
                              // 'overhead' = auto-post ke seluruh santri binaan mukim → tidak tampilkan (bisa dilihat di realisasi layanan)
                              // '' atau null/undefined = tidak dialokasikan → tidak tampilkan
                              // Pemasukan tidak memiliki alokasi santri, jadi tidak tampilkan link
                              const isPengeluaran = transaction.jenis_transaksi === 'Pengeluaran';
                              const jenisAlokasi = transaction.jenis_alokasi as string | undefined;
                              const shouldShowSantriDetail = isPengeluaran && jenisAlokasi === 'langsung';
                              
                              return shouldShowSantriDetail;
                            })() && (
                              <div className="mt-2">
                                <Button
                                  variant="outline"
                                  size="sm"
                                  onClick={async () => {
                                    if (expandedBantuanLangsung.has(transaction.id)) {
                                      setExpandedBantuanLangsung(prev => {
                                        const newSet = new Set(prev);
                                        newSet.delete(transaction.id);
                                        return newSet;
                                      });
                                    } else {
                                      setExpandedBantuanLangsung(prev => new Set(prev).add(transaction.id));
                                      // Fetch alokasi santri jika belum ada
                                      if (!bantuanLangsungAllocations[transaction.id]) {
                                        try {
                                          const { data, error } = await supabase
                                            .from('alokasi_pengeluaran_santri')
                                            .select(`
                                              id,
                                              santri_id,
                                              nominal_alokasi,
                                              jenis_bantuan,
                                              periode,
                                              keterangan,
                                              santri:santri_id(
                                                nama_lengkap,
                                                id_santri
                                              )
                                            `)
                                            .eq('keuangan_id', transaction.id);
                                          
                                          if (!error && data) {
                                            setBantuanLangsungAllocations(prev => ({
                                              ...prev,
                                              [transaction.id]: data
                                            }));
                                          }
                                        } catch (err) {
                                          console.error('Error loading alokasi santri:', err);
                                        }
                                      }
                                    }
                                  }}
                                  className="h-6 text-xs"
                                >
                                  <Users className="h-3 w-3 mr-1" />
                                  {expandedBantuanLangsung.has(transaction.id) ? 'Sembunyikan' : 'Lihat Rincian Santri'}
                                </Button>
                                {expandedBantuanLangsung.has(transaction.id) && bantuanLangsungAllocations[transaction.id] && (
                                  <div className="mt-2 p-2 bg-blue-50 rounded border border-blue-200">
                                    <div className="text-xs font-semibold text-blue-900 mb-2">
                                      Daftar Santri yang Memperoleh Bantuan:
                                    </div>
                                    <div className="space-y-1 max-h-40 overflow-y-auto">
                                      {bantuanLangsungAllocations[transaction.id].length > 0 ? (
                                        bantuanLangsungAllocations[transaction.id].map((alloc: any, idx: number) => (
                                          <div key={alloc.id || idx} className="text-xs p-1.5 bg-white rounded border border-blue-100">
                                            <div className="font-medium text-gray-900">
                                              {alloc.santri?.nama_lengkap || 'Tidak Diketahui'}
                                            </div>
                                            <div className="text-gray-600">
                                              {alloc.santri?.id_santri || ''} • {alloc.jenis_bantuan || 'Bantuan'}
                                            </div>
                                            <div className="text-gray-500 text-[10px]">
                                              {alloc.periode && `Periode: ${alloc.periode}`}
                                              {alloc.keterangan && ` • ${alloc.keterangan}`}
                                            </div>
                                            <div className="font-semibold text-blue-700 mt-0.5">
                                              {formatCurrency(alloc.nominal_alokasi || 0)}
                                            </div>
                                          </div>
                                        ))
                                      ) : (
                                        <div className="text-xs text-gray-500 italic">
                                          Tidak ada alokasi santri
                                        </div>
                                      )}
                                    </div>
                                    {bantuanLangsungAllocations[transaction.id].length > 0 && (
                                      <div className="mt-2 pt-2 border-t border-blue-200 text-xs font-semibold text-blue-900">
                                        Total: {formatCurrency(
                                          bantuanLangsungAllocations[transaction.id].reduce(
                                            (sum: number, alloc: any) => sum + (alloc.nominal_alokasi || 0),
                                            0
                                          )
                                        )}
                                      </div>
                                    )}
                                  </div>
                                )}
                              </div>
                            )}
                          </td>
                          <td className="px-3 py-3 whitespace-nowrap text-right">
                            <div className={`text-sm font-semibold ${
                              transaction.jenis_transaksi === 'Pemasukan' 
                                ? 'text-emerald-600' 
                                : 'text-rose-600'
                            }`}>
                              {formatCurrency(transaction.jumlah)}
                            </div>
                            <div className="text-xs text-gray-500 mt-0.5">
                              {transaction.akun_kas_nama}
                            </div>
                          </td>
                          <td className="px-3 py-3 whitespace-nowrap text-right">
                            <div className="flex items-center justify-end space-x-1">
                              {/* Cek apakah transaksi bisa di-edit/di-delete */}
                              {/* Untuk transaksi pemasukan auto_posted, tetap izinkan edit/delete */}
                              {/* Hanya nonaktifkan untuk transaksi pengeluaran auto_posted atau transaksi dari modul tertentu */}
                              {(transaction.auto_posted && transaction.jenis_transaksi !== 'Pemasukan') || 
                               transaction.referensi?.startsWith('inventory_sale:') ||
                               transaction.referensi?.startsWith('inventaris:') ||
                               transaction.referensi?.startsWith('pembayaran_santri:') ||
                               transaction.kategori === 'Penjualan Inventaris' ? (
                                <span className="text-xs text-muted-foreground">-</span>
                              ) : (
                                <>
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
                                </>
                              )}
                            </div>
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>

              {/* Mobile Card View - Visible on Mobile/Tablet */}
              <div className="lg:hidden space-y-3 px-4 sm:px-0">
                {currentTransactions.length === 0 ? (
                  <div className="text-center py-8 text-muted-foreground">
                    Tidak ada transaksi ditemukan
                  </div>
                ) : (
                  currentTransactions.map((transaction) => (
                    <div
                      key={transaction.id}
                      className={`rounded-lg border p-4 space-y-3 ${
                        transaction.jenis_transaksi === 'Pemasukan' 
                          ? 'bg-emerald-50/50 border-emerald-200' 
                          : 'bg-white border-gray-200'
                      }`}
                    >
                      {/* Header: Date and Amount */}
                      <div className="flex items-start justify-between gap-3">
                        <div className="flex items-center gap-2 flex-1 min-w-0">
                          {getTransactionIcon(transaction.jenis_transaksi)}
                          <div className="flex-1 min-w-0">
                            <div className="text-xs font-medium text-gray-900">
                              {formatDateWithTime(transaction)}
                            </div>
                            <div className="text-xs text-gray-500 mt-0.5">
                              {transaction.akun_kas_nama}
                            </div>
                          </div>
                        </div>
                        <div className={`text-right flex-shrink-0 text-sm font-semibold ${
                          transaction.jenis_transaksi === 'Pemasukan' 
                            ? 'text-emerald-600' 
                            : 'text-rose-600'
                        }`}>
                          {formatCurrency(transaction.jumlah)}
                        </div>
                      </div>

                      {/* Category and Badges */}
                      <div>
                        <div className="text-xs font-medium text-gray-900 mb-1.5">
                          {transaction.display_category || transaction.kategori}
                        </div>
                        <div className="flex flex-wrap gap-1">
                          {/* Badge ungu untuk semua transaksi donasi (lama dan baru) */}
                          {(transaction.kategori === 'Donasi' || 
                            transaction.kategori === 'Donasi Tunai' ||
                            transaction.referensi?.startsWith('donation:') ||
                            transaction.referensi?.startsWith('donasi:') ||
                            transaction.source_module === 'donasi') && (
                            <Badge className="text-[10px] px-1.5 py-0 bg-purple-100 text-purple-800 border-purple-200">
                              Donasi
                            </Badge>
                          )}
                          {(transaction.referensi?.startsWith('inventory_sale:') || 
                            transaction.referensi?.startsWith('inventaris:') ||
                            transaction.kategori === 'Penjualan Inventaris') && (
                            <Badge className="text-[10px] px-1.5 py-0 bg-blue-100 text-blue-800 border-blue-200">
                              Inventaris
                            </Badge>
                          )}
                          {transaction.referensi?.startsWith('pembayaran_santri:') && (
                            <Badge className="text-[10px] px-1.5 py-0 bg-green-100 text-green-800 border-green-200">
                              Pembayaran
                            </Badge>
                          )}
                          {transaction.kategori === 'Pendidikan Pesantren' && transaction.is_pengeluaran_riil === false && (
                            <Badge className="text-[10px] px-1.5 py-0 bg-purple-100 text-purple-800 border-purple-200">
                              Beasiswa
                            </Badge>
                          )}
                        </div>
                      </div>

                      {/* Description */}
                      <div>
                        <div className="text-xs text-gray-700">
                          {transaction.display_description || transaction.deskripsi}
                        </div>
                        {transaction.penerima_pembayar && (
                          <div className="text-xs text-gray-500 mt-1">
                            {transaction.penerima_pembayar}
                          </div>
                        )}
                        {/* Dropdown rincian santri untuk PENGELUARAN dengan jenis_alokasi === 'langsung' (manual selection) */}
                        {(() => {
                          // Hanya tampilkan link untuk PENGELUARAN dengan jenis_alokasi === 'langsung'
                          // 'langsung' = manual selection (pilih santri tertentu) → tampilkan detail
                          // 'overhead' = auto-post ke seluruh santri binaan mukim → tidak tampilkan (bisa dilihat di realisasi layanan)
                          // '' atau null/undefined = tidak dialokasikan → tidak tampilkan
                          // Pemasukan tidak memiliki alokasi santri, jadi tidak tampilkan link
                          const isPengeluaran = transaction.jenis_transaksi === 'Pengeluaran';
                          const jenisAlokasi = transaction.jenis_alokasi as string | undefined;
                          const shouldShowSantriDetail = isPengeluaran && jenisAlokasi === 'langsung';
                          
                          return shouldShowSantriDetail;
                        })() && (
                          <div className="mt-2">
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={async () => {
                                if (expandedBantuanLangsung.has(transaction.id)) {
                                  setExpandedBantuanLangsung(prev => {
                                    const newSet = new Set(prev);
                                    newSet.delete(transaction.id);
                                    return newSet;
                                  });
                                } else {
                                  setExpandedBantuanLangsung(prev => new Set(prev).add(transaction.id));
                                  // Fetch alokasi santri jika belum ada
                                  if (!bantuanLangsungAllocations[transaction.id]) {
                                    try {
                                      const { data, error } = await supabase
                                        .from('alokasi_pengeluaran_santri')
                                        .select(`
                                          id,
                                          santri_id,
                                          nominal_alokasi,
                                          jenis_bantuan,
                                          periode,
                                          keterangan,
                                          santri:santri_id(
                                            nama_lengkap,
                                            id_santri
                                          )
                                        `)
                                        .eq('keuangan_id', transaction.id);
                                      
                                      if (!error && data) {
                                        setBantuanLangsungAllocations(prev => ({
                                          ...prev,
                                          [transaction.id]: data
                                        }));
                                      }
                                    } catch (err) {
                                      console.error('Error loading alokasi santri:', err);
                                    }
                                  }
                                }
                              }}
                              className="h-6 text-xs w-full"
                            >
                              <Users className="h-3 w-3 mr-1" />
                              {expandedBantuanLangsung.has(transaction.id) ? 'Sembunyikan' : 'Lihat Rincian Santri'}
                            </Button>
                            {expandedBantuanLangsung.has(transaction.id) && bantuanLangsungAllocations[transaction.id] && (
                              <div className="mt-2 p-2 bg-blue-50 rounded border border-blue-200">
                                <div className="text-xs font-semibold text-blue-900 mb-2">
                                  Daftar Santri yang Memperoleh Bantuan:
                                </div>
                                <div className="space-y-1 max-h-40 overflow-y-auto">
                                  {bantuanLangsungAllocations[transaction.id].length > 0 ? (
                                    bantuanLangsungAllocations[transaction.id].map((alloc: any, idx: number) => (
                                      <div key={alloc.id || idx} className="text-xs p-1.5 bg-white rounded border border-blue-100">
                                        <div className="font-medium text-gray-900">
                                          {alloc.santri?.nama_lengkap || 'Tidak Diketahui'}
                                        </div>
                                        <div className="text-gray-600">
                                          {alloc.santri?.id_santri || ''} • {alloc.jenis_bantuan || 'Bantuan'}
                                        </div>
                                        <div className="text-gray-500 text-[10px]">
                                          {alloc.periode && `Periode: ${alloc.periode}`}
                                          {alloc.keterangan && ` • ${alloc.keterangan}`}
                                        </div>
                                        <div className="font-semibold text-blue-700 mt-0.5">
                                          {formatCurrency(alloc.nominal_alokasi || 0)}
                                        </div>
                                      </div>
                                    ))
                                  ) : (
                                    <div className="text-xs text-gray-500 italic">
                                      Tidak ada alokasi santri
                                    </div>
                                  )}
                                </div>
                                {bantuanLangsungAllocations[transaction.id].length > 0 && (
                                  <div className="mt-2 pt-2 border-t border-blue-200 text-xs font-semibold text-blue-900">
                                    Total: {formatCurrency(
                                      bantuanLangsungAllocations[transaction.id].reduce(
                                        (sum: number, alloc: any) => sum + (alloc.nominal_alokasi || 0),
                                        0
                                      )
                                    )}
                                  </div>
                                )}
                              </div>
                            )}
                          </div>
                        )}
                      </div>

                      {/* Actions */}
                      {/* Untuk transaksi pemasukan auto_posted, tetap izinkan edit/delete */}
                      {!((transaction.auto_posted && transaction.jenis_transaksi !== 'Pemasukan') || 
                         transaction.referensi?.startsWith('inventory_sale:') ||
                         transaction.referensi?.startsWith('inventaris:') ||
                         transaction.referensi?.startsWith('pembayaran_santri:') ||
                         transaction.kategori === 'Penjualan Inventaris') && (
                        <div className="flex items-center gap-2 pt-2 border-t border-gray-200">
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => onEditTransaction?.(transaction)}
                            className="flex-1 h-8 text-xs"
                          >
                            <Edit className="h-3 w-3 mr-1" />
                            Edit
                          </Button>
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => onDeleteTransaction?.(transaction)}
                            className="flex-1 h-8 text-xs text-red-600 hover:bg-red-50"
                          >
                            <Trash2 className="h-3 w-3 mr-1" />
                            Hapus
                          </Button>
                        </div>
                      )}
                    </div>
                  ))
                )}
              </div>
            </div>
          </div>
        </div>

        {/* Pagination and Items Per Page */}
        <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-4 mt-6 pt-4 border-t pb-2">
          <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3 sm:space-x-4">
            <span className="text-sm text-muted-foreground whitespace-nowrap">
              Menampilkan {startIndex + 1}-{Math.min(endIndex, sortedTransactions.length)} dari {sortedTransactions.length} transaksi
            </span>
            <Select value={itemsPerPage.toString()} onValueChange={(value) => setItemsPerPage(Number(value))}>
              <SelectTrigger className="w-full sm:w-[80px]">
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
          
          <div className="flex items-center justify-center sm:justify-end space-x-2 flex-wrap gap-2">
            <Button 
              variant="outline" 
              size="sm" 
              onClick={handlePreviousPage}
              disabled={currentPage === 1}
              className="flex-shrink-0"
            >
              ← Sebelumnya
            </Button>
            <span className="flex items-center px-3 text-sm whitespace-nowrap">
              Halaman {currentPage} dari {totalPages}
            </span>
            <Button 
              variant="outline" 
              size="sm"
              onClick={handleNextPage}
              disabled={currentPage === totalPages}
              className="flex-shrink-0"
            >
              Selanjutnya →
            </Button>
          </div>
        </div>
      </CardContent>

      {/* Batch Edit Dialog */}
      <Dialog open={showBatchEditDialog} onOpenChange={setShowBatchEditDialog}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Edit Bersama {selectedTransactions.size} Transaksi</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="batch_kategori">Kategori *</Label>
              <Select 
                value={batchEditData.kategori} 
                onValueChange={(value) => setBatchEditData(prev => ({ ...prev, kategori: value, sub_kategori: '' }))}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Pilih kategori" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="Pendidikan Pesantren">Pendidikan Pesantren</SelectItem>
                  <SelectItem value="Pendidikan Formal">Pendidikan Formal</SelectItem>
                  <SelectItem value="Operasional dan Konsumsi Santri">Operasional dan Konsumsi Santri</SelectItem>
                  <SelectItem value="Bantuan Langsung Yayasan">Bantuan Langsung Yayasan</SelectItem>
                  <SelectItem value="Operasional Yayasan">Operasional Yayasan</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="batch_sub_kategori">Sub Kategori</Label>
              {batchEditData.kategori === 'Operasional dan Konsumsi Santri' ? (
                <Select 
                  value={batchEditData.sub_kategori} 
                  onValueChange={(value) => setBatchEditData(prev => ({ ...prev, sub_kategori: value }))}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Pilih sub kategori (opsional)" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="">Kosongkan</SelectItem>
                    <SelectItem value="Konsumsi">Konsumsi</SelectItem>
                    <SelectItem value="Operasional">Operasional</SelectItem>
                  </SelectContent>
                </Select>
              ) : batchEditData.kategori === 'Operasional Yayasan' ? (
                <Select 
                  value={batchEditData.sub_kategori} 
                  onValueChange={(value) => setBatchEditData(prev => ({ ...prev, sub_kategori: value }))}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Pilih sub kategori (opsional)" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="">Kosongkan</SelectItem>
                    <SelectItem value="Gaji & Honor">Gaji & Honor</SelectItem>
                    <SelectItem value="Utilitas">Utilitas</SelectItem>
                    <SelectItem value="Maintenance">Maintenance</SelectItem>
                    <SelectItem value="Administrasi">Administrasi</SelectItem>
                    <SelectItem value="Lain-lain">Lain-lain</SelectItem>
                  </SelectContent>
                </Select>
              ) : (
                <Input
                  id="batch_sub_kategori"
                  value={batchEditData.sub_kategori}
                  onChange={(e) => setBatchEditData(prev => ({ ...prev, sub_kategori: e.target.value }))}
                  placeholder="Sub kategori (opsional)"
                />
              )}
              <p className="text-xs text-muted-foreground">
                Kosongkan jika tidak ingin mengubah sub kategori
              </p>
            </div>

            <div className="p-3 bg-amber-50 border border-amber-200 rounded-md">
              <p className="text-xs text-amber-800">
                <strong>Catatan:</strong> Hanya transaksi yang bisa di-edit yang akan diupdate. 
                Transaksi auto-posted (dari donasi, inventaris, pembayaran santri) akan dilewati.
              </p>
            </div>
          </div>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => {
                setShowBatchEditDialog(false);
                setBatchEditData({ kategori: '', sub_kategori: '' });
              }}
            >
              Batal
            </Button>
            <Button
              onClick={handleBatchEdit}
              disabled={isBatchUpdating || !batchEditData.kategori}
              className="bg-blue-600 hover:bg-blue-700"
            >
              {isBatchUpdating ? 'Mengupdate...' : `Update ${selectedTransactions.size} Transaksi`}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </Card>
  );
};

export default RiwayatTransaksi;

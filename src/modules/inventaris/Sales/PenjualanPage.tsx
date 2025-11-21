import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { ShoppingCart, Plus, DollarSign, TrendingUp, Search, Edit, Trash2, Eye, Package } from 'lucide-react';
import ModuleHeader from '@/components/ModuleHeader';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { 
  listInventory, 
  getCombinedSalesHistory, 
  getSalesSummary, 
  createTransaction, 
  updateTransaction, 
  deleteTransaction,
  createMultiItemSale,
  getMultiItemSale
} from '@/services/inventaris.service';
import { toast } from 'sonner';
import { AlertTriangle } from 'lucide-react';
import SaleDetailModal from './components/SaleDetailModal';
import {
  validateSalesForm,
  showValidationError,
  showStockWarning,
  showStockError,
  showDatabaseError,
  showFinancialError,
  showSuccess,
  showLoading,
  getStockWarning,
  ValidationError,
  StockError,
  DatabaseError,
  FinancialError
} from '@/utils/inventaris-error-handling';
import type { MultiItemSalePayload } from '@/types/inventaris.types';

const PenjualanPage = () => {
  const [searchTerm, setSearchTerm] = useState('');
  const [showForm, setShowForm] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [editingSale, setEditingSale] = useState<any>(null);
  const [deletingSale, setDeletingSale] = useState<any>(null);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [viewingSale, setViewingSale] = useState<any>(null);
  
  // Multi-item form state
  const [isMultiItemMode, setIsMultiItemMode] = useState(false);
  const [multiItemFormData, setMultiItemFormData] = useState<{
    pembeli: string;
    tanggal: string;
    catatan: string;
    items: Array<{
      tempId: string;
      item_id: string;
      nama_barang: string;
      jumlah: number;
      harga_dasar: number;
      sumbangan: number;
      stok_tersedia: number;
    }>;
  }>({
    pembeli: '',
    tanggal: new Date().toISOString().split('T')[0],
    catatan: '',
    items: []
  });
  
  // Filter states
  const [dateFilter, setDateFilter] = useState<'all' | 'today' | 'week' | 'month'>('all');
  const [statusFilter, setStatusFilter] = useState<'all' | 'success' | 'pending'>('all');
  const [formData, setFormData] = useState({
    item: '',
    jumlah: '',
    harga_dasar: '',
    sumbangan: '',
    pembeli: '',
    tanggal: new Date().toISOString().split('T')[0]
  });
  
  const queryClient = useQueryClient();
  
  const tabs = [
    { label: 'Dashboard', path: '/inventaris' },
    { label: 'Master Data', path: '/inventaris/master' },
    { label: 'Penjualan', path: '/inventaris/sales' },
    { label: 'Distribusi', path: '/inventaris/distribution' }
  ];

  // Helper functions for multi-item form
  const addItemToMultiItemForm = (itemId: string) => {
    const selectedItem = items.find(i => i.id === itemId);
    if (!selectedItem) return;

    // Check if item already exists
    if (multiItemFormData.items.some(i => i.item_id === itemId)) {
      toast.warning('Item sudah ditambahkan', {
        description: 'Item ini sudah ada dalam daftar penjualan'
      });
      return;
    }

    const newItem = {
      tempId: `temp-${Date.now()}`,
      item_id: itemId,
      nama_barang: selectedItem.nama_barang,
      jumlah: 1,
      harga_dasar: 0,
      sumbangan: 0,
      stok_tersedia: selectedItem.jumlah || 0
    };

    setMultiItemFormData(prev => ({
      ...prev,
      items: [...prev.items, newItem]
    }));
  };

  const removeItemFromMultiItemForm = (tempId: string) => {
    setMultiItemFormData(prev => ({
      ...prev,
      items: prev.items.filter(i => i.tempId !== tempId)
    }));
  };

  const updateItemInMultiItemForm = (tempId: string, updates: Partial<typeof multiItemFormData.items[0]>) => {
    setMultiItemFormData(prev => ({
      ...prev,
      items: prev.items.map(i => 
        i.tempId === tempId ? { ...i, ...updates } : i
      )
    }));
  };

  const calculateMultiItemTotals = () => {
    const total_harga_dasar = multiItemFormData.items.reduce(
      (sum, item) => sum + (item.harga_dasar * item.jumlah),
      0
    );
    const total_sumbangan = multiItemFormData.items.reduce(
      (sum, item) => sum + item.sumbangan,
      0
    );
    const grand_total = total_harga_dasar + total_sumbangan;
    
    return { total_harga_dasar, total_sumbangan, grand_total };
  };

  const resetMultiItemForm = () => {
    setMultiItemFormData({
      pembeli: '',
      tanggal: new Date().toISOString().split('T')[0],
      catatan: '',
      items: []
    });
    setIsMultiItemMode(false);
    setShowForm(false);
    setEditingSale(null);
  };

  // Fetch real data from database
  const { data: inventoryData, isLoading: inventoryLoading } = useQuery({
    queryKey: ['inventory-items'],
    queryFn: () => listInventory({ page: 1, pageSize: 100 }, {}),
    staleTime: 30000
  });

  const { data: salesData, isLoading: salesLoading } = useQuery({
    queryKey: ['sales-transactions', searchTerm],
    queryFn: () => getCombinedSalesHistory(
      { page: 1, pageSize: 50 },
      { 
        search: searchTerm || null
      }
    ),
    staleTime: 30000
  });

  const { data: salesStats, isLoading: statsLoading } = useQuery({
    queryKey: ['sales-stats'],
    queryFn: () => getSalesSummary({}),
    staleTime: 60000
  });

  const isLoading = inventoryLoading || salesLoading || statsLoading;
  const items = inventoryData?.data || [];
  const sales = salesData?.data || [];

  const handleMultiItemSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);

    try {
      // Validate form
      if (!multiItemFormData.pembeli.trim()) {
        showValidationError(['Nama pembeli harus diisi']);
        return;
      }

      if (multiItemFormData.items.length === 0) {
        showValidationError(['Minimal harus ada 1 item dalam transaksi']);
        return;
      }

      // Validate each item
      const errors: string[] = [];
      multiItemFormData.items.forEach((item, index) => {
        if (item.jumlah <= 0) {
          errors.push(`Item ${index + 1}: Jumlah harus lebih dari 0`);
        }
        if (item.harga_dasar < 0) {
          errors.push(`Item ${index + 1}: Harga dasar tidak boleh negatif`);
        }
        if (item.sumbangan < 0) {
          errors.push(`Item ${index + 1}: Sumbangan tidak boleh negatif`);
        }
        if (item.jumlah > item.stok_tersedia) {
          errors.push(`Item ${index + 1} (${item.nama_barang}): Stok tidak mencukupi`);
        }
      });

      if (errors.length > 0) {
        showValidationError(errors);
        return;
      }

      // Prepare payload
      const payload: MultiItemSalePayload = {
        pembeli: multiItemFormData.pembeli,
        tanggal: multiItemFormData.tanggal,
        catatan: multiItemFormData.catatan,
        items: multiItemFormData.items.map(item => ({
          item_id: item.item_id,
          jumlah: item.jumlah,
          harga_dasar: item.harga_dasar,
          sumbangan: item.sumbangan
        }))
      };

      const dismissLoading = showLoading(
        editingSale ? 'Memperbarui transaksi multi-item...' : 'Menyimpan transaksi multi-item...'
      );

      try {
        if (editingSale && editingSale.id) {
          // Update existing multi-item transaction
          // TODO: Implement updateMultiItemSale in service layer (Task 8)
          dismissLoading();
          toast.error('Fitur edit multi-item belum tersedia', {
            description: 'Fungsi updateMultiItemSale belum diimplementasikan (Task 8)'
          });
          return;
        } else {
          // Create new multi-item transaction
          await createMultiItemSale(payload);
          dismissLoading();
          showSuccess('Transaksi multi-item berhasil disimpan!');
        }
      } catch (transactionError: any) {
        dismissLoading();
        throw transactionError;
      }

      // Refresh data
      await queryClient.invalidateQueries({ queryKey: ['sales-transactions'] });
      await queryClient.invalidateQueries({ queryKey: ['sales-stats'] });
      await queryClient.invalidateQueries({ queryKey: ['inventory-items'] });
      await queryClient.invalidateQueries({ queryKey: ['transactions-history'] });
      await queryClient.invalidateQueries({ queryKey: ['keuangan-dashboard'] });
      await queryClient.invalidateQueries({ queryKey: ['keuangan-transactions'] });

      // Reset form
      resetMultiItemForm();

    } catch (error: any) {
      console.error('Error creating multi-item sales transaction:', error);
      
      if (error instanceof ValidationError) {
        showValidationError([error.message]);
      } else if (error instanceof StockError) {
        if (error.details?.errors) {
          showStockError(error.details.errors);
        } else {
          toast.error(error.message);
        }
      } else if (error instanceof FinancialError) {
        showFinancialError(error);
      } else if (error instanceof DatabaseError) {
        showDatabaseError(error);
      } else {
        toast.error('Gagal menyimpan transaksi multi-item', {
          description: error.message || 'Terjadi kesalahan yang tidak diketahui'
        });
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    
    try {
      // Validasi form menggunakan utility function
      const validation = validateSalesForm(formData);
      if (!validation.valid) {
        showValidationError(validation.errors);
        return;
      }
      
      const jumlah = parseInt(formData.jumlah);
      const hargaDasar = parseInt(formData.harga_dasar);
      const sumbangan = parseInt(formData.sumbangan || '0');
      
      // Check stock availability and show warning if needed
      const selectedItem = items.find(item => item.id === formData.item);
      if (selectedItem) {
        const stockWarning = getStockWarning(
          jumlah,
          selectedItem.jumlah || 0,
          selectedItem.nama_barang
        );
        if (stockWarning) {
          showStockWarning(stockWarning);
          // If stock is insufficient, prevent submission
          if (jumlah > (selectedItem.jumlah || 0)) {
            return;
          }
        }
      }
      
      // Hitung total dan harga satuan - FIXED: preserve exact total value
      const totalNilai = (hargaDasar * jumlah) + sumbangan;
      const hargaSatuan = Math.max(0, Math.round((totalNilai / jumlah) * 100) / 100); // Round to 2 decimal places
      
      // Format catatan: hanya tampilkan sumbangan jika > 0
      const catatanSumbangan = sumbangan > 0 
        ? `, Sumbangan: Rp ${sumbangan.toLocaleString('id-ID')}` 
        : '';
      const catatan = `Penjualan - Harga Dasar: Rp ${hargaDasar.toLocaleString('id-ID')}/unit${catatanSumbangan}`;
      
      // Buat payload untuk transaksi
      const transactionData = {
        item_id: formData.item,
        tipe: 'Keluar' as const,
        keluar_mode: 'Penjualan',
        jumlah: jumlah,
        harga_dasar: hargaDasar,
        sumbangan: sumbangan,
        harga_satuan: hargaSatuan,
        penerima: formData.pembeli,
        tanggal: formData.tanggal,
        catatan: catatan
      };
      
      console.log('Creating/updating sales transaction:', transactionData);
      
      // Show loading toast
      const dismissLoading = showLoading(
        editingSale ? 'Memperbarui transaksi...' : 'Menyimpan transaksi...'
      );
      
      try {
        // Validasi: pastikan editingSale memiliki ID yang valid jika ini adalah update
        if (editingSale && editingSale.id) {
          // Update existing transaction
          console.log('Updating transaction with ID:', editingSale.id);
          try {
            const result = await updateTransaction(editingSale.id, transactionData);
            console.log('Update result:', result);
            dismissLoading();
            showSuccess('Transaksi berhasil diperbarui!');
          } catch (updateError: any) {
            // Jika update gagal karena transaksi tidak ditemukan, coba create sebagai fallback
            if (updateError.message?.includes('not found') || updateError.code === 'PGRST116') {
              console.warn('Transaction not found for update, creating new transaction instead');
              await createTransaction(transactionData);
              dismissLoading();
              showSuccess('Transaksi penjualan berhasil disimpan!');
            } else {
              dismissLoading();
              throw updateError;
            }
          }
        } else {
          // Create new transaction
          await createTransaction(transactionData);
          dismissLoading();
          showSuccess('Transaksi penjualan berhasil disimpan!');
        }
      } catch (transactionError: any) {
        dismissLoading();
        throw transactionError;
      }
      
      // Refresh data with debug logging
      console.log('Invalidating queries...');
      await queryClient.invalidateQueries({ queryKey: ['sales-transactions'] }); // This will invalidate all sales-transactions queries
      await queryClient.invalidateQueries({ queryKey: ['sales-stats'] });
      await queryClient.invalidateQueries({ queryKey: ['inventory-items'] });
      await queryClient.invalidateQueries({ queryKey: ['transactions-history'] });
      
      // Also invalidate keuangan queries to reflect changes
      await queryClient.invalidateQueries({ queryKey: ['keuangan-dashboard'] });
      await queryClient.invalidateQueries({ queryKey: ['keuangan-transactions'] });
      
      console.log('All queries invalidated - data should refresh now');
      
      // Reset form
      setShowForm(false);
      setEditingSale(null);
      setFormData({
        item: '',
        jumlah: '',
        harga_dasar: '',
        sumbangan: '',
        pembeli: '',
        tanggal: new Date().toISOString().split('T')[0]
      });
      
    } catch (error: any) {
      console.error('Error creating sales transaction:', error);
      
      // Handle specific error types
      if (error instanceof ValidationError) {
        showValidationError([error.message]);
      } else if (error instanceof StockError) {
        if (error.details?.errors) {
          showStockError(error.details.errors);
        } else {
          toast.error(error.message);
        }
      } else if (error instanceof FinancialError) {
        showFinancialError(error);
      } else if (error instanceof DatabaseError) {
        showDatabaseError(error);
      } else {
        // Generic error
        toast.error('Gagal menyimpan transaksi penjualan', {
          description: error.message || 'Terjadi kesalahan yang tidak diketahui'
        });
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  // Handler for edit
  const handleEditSale = async (sale: any) => {
    console.log('handleEditSale called with sale:', sale);
    console.log('Sale ID type:', typeof sale.id, 'Value:', sale.id);
    
    // Check if it's a multi-item sale
    const isMultiItem = sale.type === 'multi' || sale.penjualan_header_id;
    
    if (isMultiItem) {
      // Load multi-item sale data
      // TODO: Edit functionality requires updateMultiItemSale (Task 8)
      toast.error('Fitur edit multi-item belum tersedia', {
        description: 'Fungsi updateMultiItemSale belum diimplementasikan (Task 8)'
      });
      return;
    } else {
      // Populate single-item form with sale data
      setFormData({
        item: sale.item_id,
        jumlah: sale.jumlah.toString(),
        harga_dasar: sale.harga_dasar?.toString() || '0',
        sumbangan: sale.sumbangan?.toString() || '0',
        pembeli: sale.penerima || '',
        tanggal: sale.tanggal
      });
      
      setIsMultiItemMode(false);
      setEditingSale(sale);
      setShowForm(true);
    }
  };

  // Handler for delete
  const handleDeleteSale = (sale: any) => {
    setDeletingSale(sale);
    setShowDeleteConfirm(true);
  };

  // Handler for view
  const handleViewSale = (sale: any) => {
    setViewingSale(sale);
  };

  const confirmDelete = async () => {
    if (!deletingSale) return;
    
    const dismissLoading = showLoading('Menghapus transaksi...');
    
    try {
      // Check if it's a multi-item sale
      const isMultiItem = deletingSale.type === 'multi' || deletingSale.penjualan_header_id;
      
      if (isMultiItem) {
        // Delete multi-item sale
        // TODO: Implement deleteMultiItemSale in service layer (Task 9)
        dismissLoading();
        toast.error('Fitur hapus multi-item belum tersedia', {
          description: 'Fungsi deleteMultiItemSale belum diimplementasikan (Task 9)'
        });
        setShowDeleteConfirm(false);
        setDeletingSale(null);
        return;
      } else {
        // Delete single-item transaction
        await deleteTransaction(deletingSale.id);
      }
      
      // Refresh data
      await queryClient.invalidateQueries({ queryKey: ['sales-transactions'] });
      await queryClient.invalidateQueries({ queryKey: ['sales-stats'] });
      await queryClient.invalidateQueries({ queryKey: ['inventory-items'] });
      await queryClient.invalidateQueries({ queryKey: ['transactions-history'] });
      await queryClient.invalidateQueries({ queryKey: ['keuangan-dashboard'] });
      await queryClient.invalidateQueries({ queryKey: ['keuangan-transactions'] });
      
      dismissLoading();
      showSuccess('Transaksi berhasil dihapus', 'Stok dan keuangan telah disesuaikan');
      setShowDeleteConfirm(false);
      setDeletingSale(null);
    } catch (error: any) {
      dismissLoading();
      console.error('Error deleting transaction:', error);
      
      // Handle specific error types
      if (error instanceof DatabaseError) {
        showDatabaseError(error);
      } else if (error instanceof FinancialError) {
        showFinancialError(error);
      } else {
        toast.error('Gagal menghapus transaksi', {
          description: error.message || 'Terjadi kesalahan yang tidak diketahui'
        });
      }
    }
  };

  if (isLoading) {
    return (
      <div className="space-y-6">
        <ModuleHeader title="Penjualan Inventaris" tabs={tabs} />
        <div className="flex items-center justify-center h-64">
          <div className="text-center">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto mb-4"></div>
            <p className="text-muted-foreground">Loading sales data...</p>
          </div>
        </div>
      </div>
    );
  }

  const today = new Date().toISOString().split('T')[0];
  
  // Enhanced filtering with date and status
  const getFilteredSales = () => {
    let filtered = sales;
    
    // Date filter
    if (dateFilter === 'today') {
      filtered = filtered.filter(sale => sale.tanggal === today);
    } else if (dateFilter === 'week') {
      const weekAgo = new Date();
      weekAgo.setDate(weekAgo.getDate() - 7);
      const weekAgoStr = weekAgo.toISOString().split('T')[0];
      filtered = filtered.filter(sale => sale.tanggal >= weekAgoStr);
    } else if (dateFilter === 'month') {
      const thisMonth = new Date().getMonth();
      const thisYear = new Date().getFullYear();
      filtered = filtered.filter(sale => {
        const saleDate = new Date(sale.tanggal);
        return saleDate.getMonth() === thisMonth && saleDate.getFullYear() === thisYear;
      });
    }
    
    return filtered;
  };
  
  const filteredSales = getFilteredSales();
  
  // Dynamic card calculations based on current filter
  const getCardStats = () => {
    const currentData = filteredSales;
    const totalFiltered = currentData.reduce((sum, sale) => sum + sale.total, 0);
    
    // Get period label
    const getPeriodLabel = () => {
      switch(dateFilter) {
        case 'today': return 'Hari Ini';
        case 'week': return '7 Hari Terakhir';
        case 'month': return 'Bulan Ini';
        default: return 'Semua Waktu';
      }
    };
    
    return {
      totalAmount: totalFiltered,
      totalCount: currentData.length,
      periodLabel: getPeriodLabel(),
      avgPerTransaction: currentData.length > 0 ? totalFiltered / currentData.length : 0
    };
  };
  
  const cardStats = getCardStats();

  return (
    <div className="space-y-6">
      <ModuleHeader title="Penjualan Inventaris" tabs={tabs} />
      
      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Penjualan {cardStats.periodLabel}</CardTitle>
            <ShoppingCart className="h-4 w-4 text-green-600" />
          </CardHeader>
          <CardContent>
             <div className="text-2xl font-bold text-green-600">Rp {Math.round(cardStats.totalAmount).toLocaleString('id-ID')}</div>
            <p className="text-xs text-muted-foreground">
              {cardStats.totalCount} transaksi {cardStats.periodLabel.toLowerCase()}
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Penjualan {cardStats.periodLabel}</CardTitle>
            <TrendingUp className="h-4 w-4 text-blue-600" />
          </CardHeader>
          <CardContent>
             <div className="text-2xl font-bold text-blue-600">Rp {Math.round(cardStats.totalAmount).toLocaleString('id-ID')}</div>
            <p className="text-xs text-muted-foreground">
              {cardStats.totalCount} transaksi {cardStats.periodLabel.toLowerCase()}
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Rata-rata per Transaksi</CardTitle>
            <DollarSign className="h-4 w-4 text-purple-600" />
          </CardHeader>
          <CardContent>
             <div className="text-2xl font-bold text-purple-600">Rp {Math.round(cardStats.avgPerTransaction).toLocaleString('id-ID')}</div>
            <p className="text-xs text-muted-foreground">
              Per transaksi {cardStats.periodLabel.toLowerCase()}
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
            <Button 
              className="flex items-center gap-2"
              onClick={() => {
                if (showForm && !isMultiItemMode) {
                  // Jika form single-item sedang terbuka, tutup dan reset
                  setShowForm(false);
                  setEditingSale(null);
                  setFormData({
                    item: '',
                    jumlah: '',
                    harga_dasar: '',
                    sumbangan: '',
                    pembeli: '',
                    tanggal: new Date().toISOString().split('T')[0]
                  });
                } else {
                  // Jika form tertutup, buka untuk create baru single-item
                  setShowForm(true);
                  setIsMultiItemMode(false);
                  setEditingSale(null);
                  setFormData({
                    item: '',
                    jumlah: '',
                    harga_dasar: '',
                    sumbangan: '',
                    pembeli: '',
                    tanggal: new Date().toISOString().split('T')[0]
                  });
                }
              }}
            >
              <Plus className="h-4 w-4" />
              {showForm && !isMultiItemMode ? 'Batal' : 'Transaksi Single Item'}
            </Button>
            <Button 
              className="flex items-center gap-2"
              variant="outline"
              onClick={() => {
                if (showForm && isMultiItemMode) {
                  // Jika form multi-item sedang terbuka, tutup dan reset
                  resetMultiItemForm();
                } else {
                  // Jika form tertutup, buka untuk create baru multi-item
                  setShowForm(true);
                  setIsMultiItemMode(true);
                  setEditingSale(null);
                  setMultiItemFormData({
                    pembeli: '',
                    tanggal: new Date().toISOString().split('T')[0],
                    catatan: '',
                    items: []
                  });
                }
              }}
            >
              <Package className="h-4 w-4" />
              {showForm && isMultiItemMode ? 'Batal' : 'Transaksi Multi-Item'}
            </Button>
            <Button variant="outline">
              Lihat Riwayat
            </Button>
            <Button variant="outline">
              Export Laporan
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Multi-Item Sales Form */}
      {showForm && isMultiItemMode && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Package className="h-5 w-5" />
              {editingSale ? 'Edit Penjualan Multi-Item' : 'Form Penjualan Multi-Item'}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleMultiItemSubmit} className="space-y-6">
              {/* Header Information */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div>
                  <Label htmlFor="multi-pembeli">Pembeli *</Label>
                  <Input
                    id="multi-pembeli"
                    value={multiItemFormData.pembeli}
                    onChange={(e) => setMultiItemFormData(prev => ({ ...prev, pembeli: e.target.value }))}
                    placeholder="Nama pembeli"
                  />
                </div>

                <div>
                  <Label htmlFor="multi-tanggal">Tanggal Penjualan *</Label>
                  <Input
                    id="multi-tanggal"
                    type="date"
                    value={multiItemFormData.tanggal}
                    onChange={(e) => setMultiItemFormData(prev => ({ ...prev, tanggal: e.target.value }))}
                  />
                </div>

                <div>
                  <Label htmlFor="multi-catatan">Catatan</Label>
                  <Input
                    id="multi-catatan"
                    value={multiItemFormData.catatan}
                    onChange={(e) => setMultiItemFormData(prev => ({ ...prev, catatan: e.target.value }))}
                    placeholder="Catatan (opsional)"
                  />
                </div>
              </div>

              {/* Item Selector */}
              <div>
                <Label htmlFor="item-selector">Tambah Item</Label>
                <div className="flex gap-2">
                  <Select onValueChange={(value) => {
                    addItemToMultiItemForm(value);
                  }}>
                    <SelectTrigger className="flex-1">
                      <SelectValue placeholder="Pilih item untuk ditambahkan" />
                    </SelectTrigger>
                    <SelectContent>
                      {items.map(item => {
                        const stockLevel = item.jumlah || 0;
                        const isOutOfStock = stockLevel === 0;
                        const isAlreadyAdded = multiItemFormData.items.some(i => i.item_id === item.id);
                        
                        return (
                          <SelectItem 
                            key={item.id} 
                            value={item.id}
                            disabled={isOutOfStock || isAlreadyAdded}
                          >
                            <div className="flex items-center justify-between w-full">
                              <span>{item.nama_barang}</span>
                              <span className={`ml-2 text-sm ${
                                isOutOfStock ? 'text-red-600 font-medium' :
                                isAlreadyAdded ? 'text-muted-foreground' :
                                'text-muted-foreground'
                              }`}>
                                {isAlreadyAdded ? '(Sudah ditambahkan)' : `Stok: ${stockLevel}`}
                              </span>
                            </div>
                          </SelectItem>
                        );
                      })}
                    </SelectContent>
                  </Select>
                </div>
              </div>

              {/* Items List */}
              {multiItemFormData.items.length > 0 ? (
                <div className="border rounded-lg overflow-hidden">
                  <div className="overflow-x-auto">
                    <table className="w-full">
                      <thead className="bg-muted/50">
                        <tr>
                          <th className="text-left p-3 font-medium">Item</th>
                          <th className="text-left p-3 font-medium">Jumlah</th>
                          <th className="text-left p-3 font-medium">Harga Dasar/Unit</th>
                          <th className="text-left p-3 font-medium">Sumbangan</th>
                          <th className="text-left p-3 font-medium">Subtotal</th>
                          <th className="text-left p-3 font-medium">Aksi</th>
                        </tr>
                      </thead>
                      <tbody>
                        {multiItemFormData.items.map((item) => {
                          const subtotal = (item.harga_dasar * item.jumlah) + item.sumbangan;
                          const hasStockIssue = item.jumlah > item.stok_tersedia;
                          
                          return (
                            <tr key={item.tempId} className="border-t">
                              <td className="p-3">
                                <div className="font-medium">{item.nama_barang}</div>
                                <div className="text-sm text-muted-foreground">
                                  Stok: {item.stok_tersedia}
                                </div>
                              </td>
                              <td className="p-3">
                                <Input
                                  type="number"
                                  min="1"
                                  value={item.jumlah}
                                  onChange={(e) => updateItemInMultiItemForm(item.tempId, { 
                                    jumlah: parseInt(e.target.value) || 0 
                                  })}
                                  className={`w-24 ${hasStockIssue ? 'border-red-500' : ''}`}
                                />
                                {hasStockIssue && (
                                  <p className="text-xs text-red-600 mt-1">Melebihi stok</p>
                                )}
                              </td>
                              <td className="p-3">
                                <Input
                                  type="number"
                                  min="0"
                                  value={item.harga_dasar}
                                  onChange={(e) => updateItemInMultiItemForm(item.tempId, { 
                                    harga_dasar: parseFloat(e.target.value) || 0 
                                  })}
                                  className="w-32"
                                />
                              </td>
                              <td className="p-3">
                                <Input
                                  type="number"
                                  min="0"
                                  value={item.sumbangan}
                                  onChange={(e) => updateItemInMultiItemForm(item.tempId, { 
                                    sumbangan: parseFloat(e.target.value) || 0 
                                  })}
                                  className="w-32"
                                />
                              </td>
                              <td className="p-3 font-medium">
                                Rp {Math.round(subtotal).toLocaleString('id-ID')}
                              </td>
                              <td className="p-3">
                                <Button
                                  type="button"
                                  size="sm"
                                  variant="outline"
                                  className="text-red-600"
                                  onClick={() => removeItemFromMultiItemForm(item.tempId)}
                                >
                                  <Trash2 className="h-4 w-4" />
                                </Button>
                              </td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>
                </div>
              ) : (
                <div className="text-center py-8 text-muted-foreground border rounded-lg">
                  <Package className="h-12 w-12 mx-auto mb-4 opacity-50" />
                  <p>Belum ada item yang ditambahkan</p>
                  <p className="text-sm">Pilih item dari dropdown di atas untuk menambahkan</p>
                </div>
              )}

              {/* Total Summary */}
              {multiItemFormData.items.length > 0 && (
                <Card className="bg-muted/50">
                  <CardHeader>
                    <CardTitle className="text-sm">Ringkasan Total</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-2 text-sm">
                      <div className="flex justify-between">
                        <span>Total Harga Dasar:</span>
                        <span>Rp {Math.round(calculateMultiItemTotals().total_harga_dasar).toLocaleString('id-ID')}</span>
                      </div>
                      <div className="flex justify-between">
                        <span>Total Sumbangan:</span>
                        <span>Rp {Math.round(calculateMultiItemTotals().total_sumbangan).toLocaleString('id-ID')}</span>
                      </div>
                      <div className="flex justify-between font-medium border-t pt-2 text-lg">
                        <span>Grand Total:</span>
                        <span className="text-green-600">
                          Rp {Math.round(calculateMultiItemTotals().grand_total).toLocaleString('id-ID')}
                        </span>
                      </div>
                      <div className="text-xs text-muted-foreground mt-2">
                        {multiItemFormData.items.length} item dalam transaksi ini
                      </div>
                    </div>
                  </CardContent>
                </Card>
              )}

              <div className="flex gap-2">
                <Button type="submit" disabled={isSubmitting || multiItemFormData.items.length === 0}>
                  {isSubmitting && (
                    <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                  )}
                  {isSubmitting ? 'Menyimpan...' : (editingSale ? 'Update Transaksi' : 'Simpan Transaksi')}
                </Button>
                <Button 
                  type="button" 
                  variant="outline" 
                  onClick={resetMultiItemForm}
                  disabled={isSubmitting}
                >
                  Batal
                </Button>
              </div>
            </form>
          </CardContent>
        </Card>
      )}

      {/* Single-Item Sales Form */}
      {showForm && !isMultiItemMode && (
        <Card>
          <CardHeader>
            <CardTitle>{editingSale ? 'Edit Penjualan' : 'Form Penjualan'}</CardTitle>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="item">Pilih Item</Label>
                  <Select value={formData.item} onValueChange={(value) => setFormData({...formData, item: value})}>
                    <SelectTrigger>
                      <SelectValue placeholder="Pilih item" />
                    </SelectTrigger>
                    <SelectContent>
                      {items.map(item => {
                        const stockLevel = item.jumlah || 0;
                        const isLowStock = stockLevel <= (item.min_stock || 10);
                        const isOutOfStock = stockLevel === 0;
                        
                        return (
                          <SelectItem 
                            key={item.id} 
                            value={item.id}
                            disabled={isOutOfStock}
                          >
                            <div className="flex items-center justify-between w-full">
                              <span>{item.nama_barang}</span>
                              <span className={`ml-2 text-sm ${
                                isOutOfStock ? 'text-red-600 font-medium' :
                                isLowStock ? 'text-orange-600' :
                                'text-muted-foreground'
                              }`}>
                                Stok: {stockLevel}
                                {isOutOfStock && ' (Habis)'}
                                {isLowStock && !isOutOfStock && ' (Rendah)'}
                              </span>
                            </div>
                          </SelectItem>
                        );
                      })}
                    </SelectContent>
                  </Select>
                  {formData.item && (() => {
                    const selectedItem = items.find(i => i.id === formData.item);
                    if (selectedItem && formData.jumlah) {
                      const requested = parseInt(formData.jumlah);
                      const available = selectedItem.jumlah || 0;
                      const warning = getStockWarning(requested, available, selectedItem.nama_barang);
                      if (warning) {
                        return (
                          <p className="text-sm text-orange-600 mt-1 flex items-center gap-1">
                            <AlertTriangle className="h-3 w-3" />
                            {warning}
                          </p>
                        );
                      }
                    }
                    return null;
                  })()}
                </div>

                <div>
                  <Label htmlFor="jumlah">Jumlah</Label>
                  <Input
                    id="jumlah"
                    type="number"
                    min="1"
                    value={formData.jumlah}
                    onChange={(e) => setFormData({...formData, jumlah: e.target.value})}
                    placeholder="Masukkan jumlah"
                    className={
                      formData.item && formData.jumlah && 
                      parseInt(formData.jumlah) > (items.find(i => i.id === formData.item)?.jumlah || 0)
                        ? 'border-red-500 focus:border-red-500'
                        : ''
                    }
                  />
                  {formData.item && formData.jumlah && 
                   parseInt(formData.jumlah) > (items.find(i => i.id === formData.item)?.jumlah || 0) && (
                    <p className="text-sm text-red-600 mt-1 flex items-center gap-1">
                      <AlertTriangle className="h-3 w-3" />
                      Jumlah melebihi stok tersedia
                    </p>
                  )}
                </div>

                <div>
                  <Label htmlFor="harga_dasar">Harga Dasar per Unit</Label>
                  <Input
                    id="harga_dasar"
                    type="number"
                    min="0"
                    step="0.01"
                    value={formData.harga_dasar}
                    onChange={(e) => setFormData({...formData, harga_dasar: e.target.value})}
                    placeholder="Harga dasar"
                    className={
                      formData.harga_dasar && parseFloat(formData.harga_dasar) < 0
                        ? 'border-red-500 focus:border-red-500'
                        : ''
                    }
                  />
                  {formData.harga_dasar && parseFloat(formData.harga_dasar) < 0 && (
                    <p className="text-sm text-red-600 mt-1">Harga tidak boleh negatif</p>
                  )}
                </div>

                <div>
                  <Label htmlFor="sumbangan">Sumbangan/Infaq</Label>
                  <Input
                    id="sumbangan"
                    type="number"
                    min="0"
                    step="0.01"
                    value={formData.sumbangan}
                    onChange={(e) => setFormData({...formData, sumbangan: e.target.value})}
                    placeholder="Sumbangan (opsional)"
                    className={
                      formData.sumbangan && parseFloat(formData.sumbangan) < 0
                        ? 'border-red-500 focus:border-red-500'
                        : ''
                    }
                  />
                  {formData.sumbangan && parseFloat(formData.sumbangan) < 0 && (
                    <p className="text-sm text-red-600 mt-1">Sumbangan tidak boleh negatif</p>
                  )}
                </div>

                <div>
                  <Label htmlFor="pembeli">Pembeli</Label>
                  <Input
                    id="pembeli"
                    value={formData.pembeli}
                    onChange={(e) => setFormData({...formData, pembeli: e.target.value})}
                    placeholder="Nama pembeli"
                  />
                </div>

                <div>
                  <Label htmlFor="tanggal">Tanggal Penjualan</Label>
                  <Input
                    id="tanggal"
                    type="date"
                    value={formData.tanggal}
                    onChange={(e) => setFormData({...formData, tanggal: e.target.value})}
                  />
                </div>
              </div>

              {/* Price Breakdown */}
              {formData.jumlah && formData.harga_dasar && (
                <Card className="bg-muted/50">
                  <CardHeader>
                    <CardTitle className="text-sm">Breakdown Harga</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-2 text-sm">
                      <div className="flex justify-between">
                         <span>Harga Dasar ({formData.jumlah} × Rp {parseInt(formData.harga_dasar || '0').toLocaleString('id-ID')}):</span>
                         <span>Rp {(parseInt(formData.jumlah || '0') * parseInt(formData.harga_dasar || '0')).toLocaleString('id-ID')}</span>
                        </div>
                        <div className="flex justify-between">
                          <span>Sumbangan:</span>
                          <span>Rp {parseInt(formData.sumbangan || '0').toLocaleString('id-ID')}</span>
                        </div>
                        <div className="flex justify-between font-medium border-t pt-2">
                          <span>Total:</span>
                          <span>Rp {((parseInt(formData.jumlah || '0') * parseInt(formData.harga_dasar || '0')) + parseInt(formData.sumbangan || '0')).toLocaleString('id-ID')}</span>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              )}

              <div className="flex gap-2">
                <Button type="submit" disabled={isSubmitting}>
                  {isSubmitting && (
                    <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                  )}
                  {isSubmitting ? 'Menyimpan...' : (editingSale ? 'Update Transaksi' : 'Simpan Transaksi')}
                </Button>
                <Button 
                  type="button" 
                  variant="outline" 
                  onClick={() => {
                    setShowForm(false);
                    setEditingSale(null); // Reset editingSale saat batal
                    setFormData({
                      item: '',
                      jumlah: '',
                      harga_dasar: '',
                      sumbangan: '',
                      pembeli: '',
                      tanggal: new Date().toISOString().split('T')[0]
                    });
                  }} 
                  disabled={isSubmitting}
                >
                  Batal
                </Button>
              </div>
            </form>
          </CardContent>
        </Card>
      )}

      {/* Sales List */}
      <Card>
        <CardHeader>
          <CardTitle>Riwayat Penjualan</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex gap-4 mb-4">
            <div className="flex-1">
              <Label htmlFor="search">Cari Penjualan</Label>
              <div className="relative">
                <Search className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                <Input
                  id="search"
                  placeholder="Cari item atau pembeli..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-10"
                />
              </div>
            </div>
            
            <div className="w-48">
              <Label htmlFor="dateFilter">Filter Tanggal</Label>
              <Select value={dateFilter} onValueChange={(value: any) => setDateFilter(value)}>
                <SelectTrigger>
                  <SelectValue placeholder="Pilih periode" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Semua Waktu</SelectItem>
                  <SelectItem value="today">Hari Ini</SelectItem>
                  <SelectItem value="week">7 Hari Terakhir</SelectItem>
                  <SelectItem value="month">Bulan Ini</SelectItem>
                </SelectContent>
              </Select>
            </div>
            
            <div className="w-48">
              <Label htmlFor="statusFilter">Filter Status</Label>
              <Select value={statusFilter} onValueChange={(value: any) => setStatusFilter(value)}>
                <SelectTrigger>
                  <SelectValue placeholder="Pilih status" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Semua Status</SelectItem>
                  <SelectItem value="success">Berhasil</SelectItem>
                  <SelectItem value="pending">Pending</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="border rounded-lg">
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="bg-muted/50">
                  <tr>
                    <th className="text-left p-4 font-medium">Item</th>
                    <th className="text-left p-4 font-medium">Jumlah</th>
                    <th className="text-left p-4 font-medium">Harga Dasar</th>
                    <th className="text-left p-4 font-medium">Sumbangan</th>
                    <th className="text-left p-4 font-medium">Total</th>
                    <th className="text-left p-4 font-medium">Pembeli</th>
                    <th className="text-left p-4 font-medium">Tanggal</th>
                    <th className="text-left p-4 font-medium">Status</th>
                    <th className="text-left p-4 font-medium">Aksi</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredSales.map((sale) => {
                    const isMultiItem = sale.type === 'multi';
                    const singleItemData = !isMultiItem && 'jumlah' in sale.originalData ? sale.originalData : null;
                    
                    return (
                      <tr key={sale.id} className="border-t hover:bg-muted/25">
                        <td className="p-4">
                          <div className="flex items-center gap-2">
                            {isMultiItem ? (
                              <>
                                <Badge variant="secondary" className="flex items-center gap-1">
                                  <Package className="h-3 w-3" />
                                  {sale.itemCount} items
                                </Badge>
                                <span className="text-sm text-muted-foreground">
                                  {sale.items?.slice(0, 2).map(i => i.nama_barang).join(', ')}
                                  {sale.itemCount > 2 && ` +${sale.itemCount - 2} lainnya`}
                                </span>
                              </>
                            ) : (
                              <span className="font-medium">{sale.itemName}</span>
                            )}
                          </div>
                        </td>
                        <td className="p-4">
                          {isMultiItem ? (
                            <span className="text-muted-foreground">-</span>
                          ) : (
                            singleItemData?.jumlah || 0
                          )}
                        </td>
                        <td className="p-4">
                          {isMultiItem ? (
                            <span className="text-muted-foreground">-</span>
                          ) : (
                            `Rp ${Math.round(singleItemData?.harga_satuan || 0).toLocaleString('id-ID')}`
                          )}
                        </td>
                        <td className="p-4">
                          {isMultiItem ? (
                            <span className="text-muted-foreground">-</span>
                          ) : (
                            `Rp ${Math.round((singleItemData as any)?.sumbangan || 0).toLocaleString('id-ID')}`
                          )}
                        </td>
                        <td className="p-4 font-medium">
                          Rp {Math.round(sale.total).toLocaleString('id-ID')}
                        </td>
                        <td className="p-4">{sale.pembeli}</td>
                        <td className="p-4">{sale.tanggal}</td>
                        <td className="p-4">
                          <Badge variant="outline" className="text-green-600">
                            Selesai
                          </Badge>
                        </td>
                        <td className="p-4">
                          <div className="flex gap-2">
                            <Button 
                              size="sm" 
                              variant="outline"
                              onClick={() => handleViewSale(sale.originalData)}
                              title="Lihat Detail"
                            >
                              <Eye className="h-4 w-4" />
                            </Button>
                            <Button 
                              size="sm" 
                              variant="outline"
                              onClick={() => handleEditSale(sale.originalData as any)}
                              title="Edit Transaksi"
                            >
                              <Edit className="h-4 w-4" />
                            </Button>
                            <Button 
                              size="sm" 
                              variant="outline" 
                              className="text-red-600"
                              onClick={() => handleDeleteSale(sale.originalData as any)}
                              title="Hapus Transaksi"
                            >
                              <Trash2 className="h-4 w-4" />
                            </Button>
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>

          {filteredSales.length === 0 && (
            <div className="text-center py-8 text-muted-foreground">
              <ShoppingCart className="h-12 w-12 mx-auto mb-4 opacity-50" />
              <p>Tidak ada penjualan yang ditemukan</p>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Delete Confirmation Modal */}
      {showDeleteConfirm && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <Card className="w-full max-w-md">
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-red-600">
                <AlertTriangle className="h-5 w-5" />
                Konfirmasi Hapus
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-sm text-muted-foreground mb-4">
                Apakah Anda yakin ingin menghapus transaksi penjualan ini?
              </p>
              <div className="bg-red-50 border border-red-200 rounded-lg p-3 mb-4">
                <p className="text-sm text-red-800">
                  <strong>Peringatan:</strong> Tindakan ini tidak dapat dibatalkan.
                  Entry keuangan yang terkait juga akan dihapus.
                </p>
              </div>
              <div className="flex gap-2">
                <Button 
                  variant="destructive" 
                  onClick={confirmDelete}
                  disabled={isSubmitting}
                >
                  Ya, Hapus
                </Button>
                <Button 
                  variant="outline" 
                  onClick={() => setShowDeleteConfirm(false)}
                  disabled={isSubmitting}
                >
                  Batal
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {/* View Detail Modal */}
      <SaleDetailModal 
        sale={viewingSale}
        onClose={() => setViewingSale(null)}
      />
    </div>
  );
};

export default PenjualanPage;
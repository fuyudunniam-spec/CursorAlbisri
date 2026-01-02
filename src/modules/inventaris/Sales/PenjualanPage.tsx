import React, { useState, useEffect } from 'react';
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
  getMultiItemSale,
  deleteMultiItemSale,
  updateMultiItemSale
} from '@/services/inventaris.service';
import { supabase } from '@/integrations/supabase/client';
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
  const [dateFilter, setDateFilter] = useState<'all' | 'today' | 'week' | 'month' | 'last-month' | 'year' | 'last-year'>('all');
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

  const { data: salesData, isLoading: salesLoading, refetch: refetchSales } = useQuery({
    queryKey: ['sales-transactions', searchTerm, dateFilter],
    queryFn: () => getCombinedSalesHistory(
      { page: 1, pageSize: 500 }, // Increased to 500 to show more history
      { 
        search: searchTerm || null
      }
    ),
    staleTime: 5000, // Reduced from 30000 to 5000 for faster updates
    refetchOnWindowFocus: true // Refetch when window regains focus
  });

  const { data: salesStats, isLoading: statsLoading } = useQuery({
    queryKey: ['sales-stats'],
    queryFn: () => getSalesSummary({}),
    staleTime: 60000
  });

  const isLoading = inventoryLoading || salesLoading || statsLoading;
  const items = inventoryData?.data || [];
  const sales = salesData?.data || [];
  
  // Debug: Log sales data to verify it's loaded
  useEffect(() => {
    if (sales && sales.length > 0) {
      console.log('[PenjualanPage] Sales loaded:', {
        total: sales.length,
        dateFilter,
        sampleDates: sales.slice(0, 5).map(s => s.tanggal)
      });
    } else if (!salesLoading && salesData) {
      console.log('[PenjualanPage] No sales data found:', {
        dateFilter,
        salesDataTotal: salesData?.total
      });
    }
  }, [sales, dateFilter, salesLoading, salesData]);

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
          console.log(`[DEBUG] Stock validation failed for item ${index + 1}:`, {
            nama_barang: item.nama_barang,
            jumlah: item.jumlah,
            stok_tersedia: item.stok_tersedia,
            isEditMode: !!editingSale
          });
          errors.push(`Stok tidak mencukupi untuk ${item.nama_barang}. Tersedia: ${item.stok_tersedia}, Diminta: ${item.jumlah}`);
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
          await updateMultiItemSale(editingSale.id, payload);
          dismissLoading();
          showSuccess('Transaksi multi-item berhasil diperbarui!');
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
      console.log('🔄 Refreshing data after multi-item save...');
      await queryClient.invalidateQueries({ queryKey: ['sales-transactions'] });
      await queryClient.invalidateQueries({ queryKey: ['sales-stats'] });
      await queryClient.invalidateQueries({ queryKey: ['inventory-items'] });
      await queryClient.invalidateQueries({ queryKey: ['transactions-history'] });
      await queryClient.invalidateQueries({ queryKey: ['keuangan-dashboard'] });
      await queryClient.invalidateQueries({ queryKey: ['keuangan-transactions'] });

      // Force immediate refetch
      await refetchSales();
      console.log('✅ Data refreshed successfully');

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
        // For edit mode, add the quantity being edited back to available stock
        const currentStock = selectedItem.jumlah || 0;
        const editingQuantity = editingSale ? (editingSale.jumlah || 0) : 0;
        const availableStock = currentStock + editingQuantity;
        
        console.log('[DEBUG] Stock check:', {
          currentStock,
          editingQuantity,
          availableStock,
          requestedQuantity: jumlah,
          isEditMode: !!editingSale
        });
        
        const stockWarning = getStockWarning(
          jumlah,
          availableStock,
          selectedItem.nama_barang
        );
        if (stockWarning) {
          showStockWarning(stockWarning);
          // If stock is insufficient, prevent submission
          if (jumlah > availableStock) {
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
      console.log('🔄 Invalidating queries...');
      await queryClient.invalidateQueries({ queryKey: ['sales-transactions'] }); // This will invalidate all sales-transactions queries
      await queryClient.invalidateQueries({ queryKey: ['sales-stats'] });
      await queryClient.invalidateQueries({ queryKey: ['inventory-items'] });
      await queryClient.invalidateQueries({ queryKey: ['transactions-history'] });
      
      // Also invalidate keuangan queries to reflect changes
      await queryClient.invalidateQueries({ queryKey: ['keuangan-dashboard'] });
      await queryClient.invalidateQueries({ queryKey: ['keuangan-transactions'] });
      
      // Force immediate refetch
      await refetchSales();
      console.log('✅ All queries invalidated and refetched - data should refresh now');
      
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
    console.log('[DEBUG] handleEditSale called with sale:', sale);
    console.log('[DEBUG] Sale ID type:', typeof sale.id, 'Value:', sale.id);
    
    // Validate sale object
    if (!sale || !sale.id) {
      console.error('[ERROR] Invalid sale object - missing ID');
      toast.error('Data transaksi tidak valid', {
        description: 'ID transaksi tidak ditemukan'
      });
      return;
    }
    
    // Type detection: Check multiple indicators for multi-item sales
    // 1. type === 'multi' (from getCombinedSalesHistory)
    // 2. penjualan_header_id exists (from transaksi_inventaris)
    // 3. itemCount > 1 (from getCombinedSalesHistory)
    // 4. items array exists (from penjualan_headers direct data)
    // 5. grand_total exists (from penjualan_headers)
    const isMultiItem = 
      sale.type === 'multi' || 
      !!sale.penjualan_header_id || 
      (sale.itemCount && sale.itemCount > 1) ||
      (sale.items && Array.isArray(sale.items) && sale.items.length > 0) ||
      (sale.grand_total !== undefined && !sale.item_id);
    
    console.log('[DEBUG] Type detection - isMultiItem:', isMultiItem, {
      type: sale.type,
      penjualan_header_id: sale.penjualan_header_id,
      itemCount: sale.itemCount,
      hasItems: sale.items && Array.isArray(sale.items),
      itemsLength: sale.items?.length,
      hasGrandTotal: sale.grand_total !== undefined,
      hasItemId: !!sale.item_id
    });
    
    if (isMultiItem) {
      // Load multi-item sale data
      try {
        console.log('[DEBUG] Loading multi-item sale for edit:', sale.id);
        
        // Check if sale already has items array (direct from penjualan_headers)
        let saleDetail;
        if (sale.items && Array.isArray(sale.items) && sale.items.length > 0) {
          console.log('[DEBUG] Using existing items data from sale object');
          saleDetail = sale; // Use the sale object directly if it already has items
        } else {
          // Fetch from API if items not present
          try {
            saleDetail = await getMultiItemSale(sale.id);
          } catch (loadError: any) {
            console.error('[ERROR] Failed to load multi-item sale:', loadError);
            
            // Handle "transaction not found" errors with user-friendly messages
            if (loadError.message?.includes('not found') || loadError.code === 'PGRST116') {
              toast.error('Transaksi tidak ditemukan', {
                description: 'Transaksi yang Anda cari tidak ada atau telah dihapus'
              });
            } else {
              toast.error('Gagal memuat data transaksi', {
                description: loadError.message || 'Terjadi kesalahan saat mengambil data'
              });
            }
            
            // Prevent form display when data is invalid or incomplete
            return;
          }
        }
        
        console.log('[DEBUG] Sale detail loaded:', saleDetail);
        
        // Handle "transaction not found" errors with user-friendly messages
        if (!saleDetail) {
          console.error('[ERROR] Transaction not found - null response');
          toast.error('Transaksi tidak ditemukan', {
            description: 'Transaksi yang Anda cari tidak ada atau telah dihapus'
          });
          // Prevent form display when data is invalid or incomplete
          return;
        }
        
        // Validate that items array exists and has data
        if (!saleDetail.items || saleDetail.items.length === 0) {
          console.error('[ERROR] Invalid transaction data - no items found');
          toast.error('Data transaksi tidak valid', {
            description: 'Tidak ada item dalam transaksi ini'
          });
          // Prevent form display when data is invalid or incomplete
          return;
        }
        
        // Fetch current stock for each item
        const itemIds = saleDetail.items.map(item => item.item_id);
        console.log('[DEBUG] Fetching stock for items:', itemIds);
        
        // Handle stock data fetch failures gracefully
        let inventoryItems = [];
        try {
          const { data, error: stockError } = await supabase
            .from('inventaris')
            .select('id, jumlah')
            .in('id', itemIds);
          
          if (stockError) {
            // Handle stock data fetch failures gracefully
            console.error('[ERROR] Stock fetch error:', stockError);
            // Add error logging for debugging
            console.error('[ERROR] Stock fetch details:', {
              itemIds,
              error: stockError.message,
              code: stockError.code
            });
            
            toast.warning('Peringatan: Data stok tidak dapat dimuat', {
              description: 'Stok akan ditampilkan sebagai 0. Data transaksi tetap dapat diedit.'
            });
            // Continue with 0 stock as fallback
          } else {
            inventoryItems = data || [];
          }
        } catch (stockFetchError: any) {
          // Handle stock data fetch failures gracefully
          console.error('[ERROR] Exception during stock fetch:', stockFetchError);
          // Add error logging for debugging
          console.error('[ERROR] Stock fetch exception details:', {
            itemIds,
            error: stockFetchError.message
          });
          
          toast.warning('Peringatan: Data stok tidak dapat dimuat', {
            description: 'Stok akan ditampilkan sebagai 0. Data transaksi tetap dapat diedit.'
          });
          // Continue with 0 stock as fallback
        }
        
        console.log('[DEBUG] Inventory items:', inventoryItems);
        
        const stockMap = new Map(
          inventoryItems.map(item => [item.id, item.jumlah || 0])
        );
        
        console.log('[DEBUG] Stock map created:', Array.from(stockMap.entries()));
        
        // Populate multi-item form with sale data - ensure all items are loaded with correct data structure
        const formData = {
          pembeli: saleDetail.pembeli,
          tanggal: saleDetail.tanggal,
          catatan: saleDetail.catatan || '',
          items: saleDetail.items.map((item, index) => {
            const currentStock = stockMap.get(item.item_id) || 0;
            const editingQuantity = item.jumlah;
            const availableStock = currentStock + editingQuantity;
            
            console.log(`[DEBUG] Item ${index + 1} (${item.nama_barang}):`, {
              item_id: item.item_id,
              currentStock,
              editingQuantity,
              availableStock
            });
            
            return {
              tempId: `edit-${Date.now()}-${index}`, // Use timestamp to ensure unique tempId for React keys
              item_id: item.item_id,
              nama_barang: item.nama_barang,
              jumlah: item.jumlah,
              harga_dasar: item.harga_dasar,
              sumbangan: item.sumbangan,
              stok_tersedia: availableStock // Current stock + quantity being edited
            };
          })
        };
        
        console.log('[DEBUG] Setting multi-item form data:', formData);
        console.log('[DEBUG] Number of items loaded:', formData.items.length);
        
        // Update state in correct order - set isMultiItemMode to true for multi-item transactions
        setMultiItemFormData(formData);
        setIsMultiItemMode(true);
        setEditingSale(saleDetail);
        setShowForm(true);
        
        console.log('[DEBUG] Multi-item form state populated and form visibility set to true');
        console.log('[DEBUG] isMultiItemMode set to:', true);
      } catch (error: any) {
        // Add error logging for debugging
        console.error('[ERROR] Unexpected error loading multi-item sale:', error);
        console.error('[ERROR] Error details:', {
          message: error.message,
          code: error.code,
          stack: error.stack
        });
        
        toast.error('Gagal memuat data transaksi', {
          description: error.message || 'Terjadi kesalahan yang tidak diketahui'
        });
        
        // Prevent form display when data is invalid or incomplete
        return;
      }
    } else {
      // Populate single-item form with sale data
      console.log('[DEBUG] Loading single-item sale for edit');
      
      try {
        // Validate item_id exists - check originalData first for getCombinedSalesHistory format
        const itemId = sale.item_id || sale.originalData?.item_id;
        if (!itemId) {
          console.error('[ERROR] Invalid transaction data - missing item_id');
          console.error('[ERROR] Sale object:', sale);
          toast.error('Data transaksi tidak valid', {
            description: 'ID item tidak ditemukan dalam transaksi'
          });
          // Prevent form display when data is invalid or incomplete
          return;
        }
        
        console.log('[DEBUG] Fetching stock for single item:', itemId);
        
        // Handle stock data fetch failures gracefully
        let inventoryItem = null;
        try {
          const { data, error: stockError } = await supabase
            .from('inventaris')
            .select('id, jumlah, nama_barang')
            .eq('id', itemId)
            .single();
          
          if (stockError) {
            // Handle stock data fetch failures gracefully
            console.error('[ERROR] Stock fetch error:', stockError);
            // Add error logging for debugging
            console.error('[ERROR] Stock fetch details:', {
              itemId,
              error: stockError.message,
              code: stockError.code
            });
            
            toast.warning('Peringatan: Data stok tidak dapat dimuat', {
              description: 'Stok akan ditampilkan sebagai 0. Data transaksi tetap dapat diedit.'
            });
            // Continue with 0 stock as fallback
          } else {
            inventoryItem = data;
          }
        } catch (stockFetchError: any) {
          // Handle stock data fetch failures gracefully
          console.error('[ERROR] Exception during stock fetch:', stockFetchError);
          // Add error logging for debugging
          console.error('[ERROR] Stock fetch exception details:', {
            itemId,
            error: stockFetchError.message
          });
          
          toast.warning('Peringatan: Data stok tidak dapat dimuat', {
            description: 'Stok akan ditampilkan sebagai 0. Data transaksi tetap dapat diedit.'
          });
          // Continue with 0 stock as fallback
        }
        
        console.log('[DEBUG] Inventory item:', inventoryItem);
        
        const currentStock = inventoryItem?.jumlah || 0;
        
        // Populate single-item form fields from transaction data
        // Convert numeric values to strings for input fields
        const singleItemFormData = {
          item: itemId, // Ensure item_id is correctly mapped to 'item' field
          jumlah: String(sale.jumlah || 0),
          harga_dasar: String(sale.harga_dasar || 0),
          sumbangan: String(sale.sumbangan || 0),
          pembeli: sale.penerima || sale.pembeli || '',
          tanggal: sale.tanggal || new Date().toISOString().split('T')[0]
        };
        
        console.log('[DEBUG] Setting single-item form data:', singleItemFormData);
        console.log('[DEBUG] Available stock for editing:', currentStock + (sale.jumlah || 0));
        
        // Update state in correct order
        // Set isMultiItemMode to false for single-item transactions
        setFormData(singleItemFormData);
        setIsMultiItemMode(false);
        setEditingSale(sale);
        setShowForm(true);
        
        console.log('[DEBUG] Single-item form state populated and form visibility set to true');
        console.log('[DEBUG] isMultiItemMode set to:', false);
      } catch (error: any) {
        // Add error logging for debugging
        console.error('[ERROR] Unexpected error loading single-item sale:', error);
        console.error('[ERROR] Error details:', {
          message: error.message,
          code: error.code,
          stack: error.stack
        });
        
        toast.error('Gagal memuat data transaksi', {
          description: error.message || 'Terjadi kesalahan yang tidak diketahui'
        });
        
        // Prevent form display when data is invalid or incomplete
        return;
      }
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
        await deleteMultiItemSale(deletingSale.id);
      } else {
        // Delete single-item transaction
        await deleteTransaction(deletingSale.id);
      }
      
      // Refresh data - invalidate and refetch immediately
      console.log('🔄 Refreshing data after delete...');
      await queryClient.invalidateQueries({ queryKey: ['sales-transactions'] });
      await queryClient.invalidateQueries({ queryKey: ['sales-stats'] });
      await queryClient.invalidateQueries({ queryKey: ['inventory-items'] });
      await queryClient.invalidateQueries({ queryKey: ['transactions-history'] });
      await queryClient.invalidateQueries({ queryKey: ['keuangan-dashboard'] });
      await queryClient.invalidateQueries({ queryKey: ['keuangan-transactions'] });
      
      // Force immediate refetch
      await refetchSales();
      console.log('✅ Data refreshed successfully');
      
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
    if (!sales || sales.length === 0) {
      return [];
    }
    
    let filtered = [...sales]; // Create copy to avoid mutation
    
    // IMPORTANT: If filter is 'all', only apply search filter, no date filtering
    // This ensures all data is shown when filter is 'all'
    
    // Search filter (applies to all filter types)
    if (searchTerm) {
      const searchLower = searchTerm.toLowerCase();
      filtered = filtered.filter(sale => {
        const pembeliMatch = sale.pembeli?.toLowerCase().includes(searchLower);
        const itemMatch = sale.itemName?.toLowerCase().includes(searchLower);
        const tanggalMatch = sale.tanggal?.includes(searchLower);
        return pembeliMatch || itemMatch || tanggalMatch;
      });
    }
    
    // Date filter (only apply if NOT 'all')
    if (dateFilter === 'all') {
      // No date filtering - show all data
      return filtered;
    } else if (dateFilter === 'today') {
      filtered = filtered.filter(sale => sale.tanggal === today);
    } else if (dateFilter === 'week') {
      const weekAgo = new Date();
      weekAgo.setDate(weekAgo.getDate() - 7);
      const weekAgoStr = weekAgo.toISOString().split('T')[0];
      filtered = filtered.filter(sale => sale.tanggal >= weekAgoStr);
    } else if (dateFilter === 'month') {
      const now = new Date();
      const thisMonth = now.getMonth();
      const thisYear = now.getFullYear();
      filtered = filtered.filter(sale => {
        if (!sale.tanggal) return false;
        const saleDate = new Date(sale.tanggal);
        return saleDate.getMonth() === thisMonth && saleDate.getFullYear() === thisYear;
      });
    } else if (dateFilter === 'last-month') {
      const now = new Date();
      const lastMonth = now.getMonth() === 0 ? 11 : now.getMonth() - 1;
      const lastMonthYear = now.getMonth() === 0 ? now.getFullYear() - 1 : now.getFullYear();
      filtered = filtered.filter(sale => {
        if (!sale.tanggal) return false;
        const saleDate = new Date(sale.tanggal);
        return saleDate.getMonth() === lastMonth && saleDate.getFullYear() === lastMonthYear;
      });
    } else if (dateFilter === 'year') {
      const now = new Date();
      const thisYear = now.getFullYear();
      filtered = filtered.filter(sale => {
        if (!sale.tanggal) return false;
        const saleDate = new Date(sale.tanggal);
        return saleDate.getFullYear() === thisYear;
      });
    } else if (dateFilter === 'last-year') {
      const now = new Date();
      const lastYear = now.getFullYear() - 1;
      filtered = filtered.filter(sale => {
        if (!sale.tanggal) return false;
        const saleDate = new Date(sale.tanggal);
        return saleDate.getFullYear() === lastYear;
      });
    }
    
    // Status filter (if needed in the future)
    // Currently all sales are considered 'success' based on the UI
    // if (statusFilter !== 'all') {
    //   filtered = filtered.filter(sale => {
    //     // Add status logic here when status field is available
    //     return true;
    //   });
    // }
    
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
        case 'last-month': return 'Bulan Lalu';
        case 'year': return 'Tahun Ini';
        case 'last-year': return 'Tahun Lalu';
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
                if (showForm) {
                  // Tutup form dan reset
                  resetMultiItemForm();
                } else {
                  // Buka form unified (default: multi-item mode)
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
              <Plus className="h-4 w-4" />
              {showForm ? 'Batal' : 'Transaksi Penjualan'}
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

      {/* Unified Sales Form */}
      {showForm && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <ShoppingCart className="h-5 w-5" />
              {editingSale ? 'Edit Penjualan' : 'Form Penjualan'}
            </CardTitle>
            <p className="text-sm text-muted-foreground mt-1">
              {isMultiItemMode 
                ? 'Tambahkan satu atau lebih item untuk transaksi penjualan'
                : 'Isi form untuk transaksi penjualan single-item'
              }
            </p>
          </CardHeader>
          <CardContent>
            {isMultiItemMode ? (
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
            ) : (
              <form onSubmit={handleSubmit} className="space-y-6">
                {/* Single-Item Form */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <Label htmlFor="item">Item *</Label>
                    <Select 
                      value={formData.item} 
                      onValueChange={(value) => setFormData(prev => ({ ...prev, item: value }))}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Pilih item" />
                      </SelectTrigger>
                      <SelectContent>
                        {items.map(item => {
                          const stockLevel = item.jumlah || 0;
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
                                  isOutOfStock ? 'text-red-600 font-medium' : 'text-muted-foreground'
                                }`}>
                                  Stok: {stockLevel}
                                </span>
                              </div>
                            </SelectItem>
                          );
                        })}
                      </SelectContent>
                    </Select>
                  </div>

                  <div>
                    <Label htmlFor="jumlah">Jumlah *</Label>
                    <Input
                      id="jumlah"
                      type="number"
                      min="1"
                      value={formData.jumlah}
                      onChange={(e) => setFormData(prev => ({ ...prev, jumlah: e.target.value }))}
                      placeholder="Jumlah"
                    />
                  </div>

                  <div>
                    <Label htmlFor="harga_dasar">Harga Dasar per Unit *</Label>
                    <Input
                      id="harga_dasar"
                      type="number"
                      min="0"
                      value={formData.harga_dasar}
                      onChange={(e) => setFormData(prev => ({ ...prev, harga_dasar: e.target.value }))}
                      placeholder="Harga dasar"
                    />
                  </div>

                  <div>
                    <Label htmlFor="sumbangan">Sumbangan (Opsional)</Label>
                    <Input
                      id="sumbangan"
                      type="number"
                      min="0"
                      value={formData.sumbangan}
                      onChange={(e) => setFormData(prev => ({ ...prev, sumbangan: e.target.value }))}
                      placeholder="Sumbangan"
                    />
                  </div>

                  <div>
                    <Label htmlFor="pembeli">Pembeli *</Label>
                    <Input
                      id="pembeli"
                      value={formData.pembeli}
                      onChange={(e) => setFormData(prev => ({ ...prev, pembeli: e.target.value }))}
                      placeholder="Nama pembeli"
                    />
                  </div>

                  <div>
                    <Label htmlFor="tanggal">Tanggal Penjualan *</Label>
                    <Input
                      id="tanggal"
                      type="date"
                      value={formData.tanggal}
                      onChange={(e) => setFormData(prev => ({ ...prev, tanggal: e.target.value }))}
                    />
                  </div>
                </div>

                {/* Total Preview for Single-Item */}
                {formData.item && formData.jumlah && formData.harga_dasar && (
                  <Card className="bg-muted/50">
                    <CardHeader>
                      <CardTitle className="text-sm">Ringkasan Total</CardTitle>
                    </CardHeader>
                    <CardContent>
                      <div className="space-y-2 text-sm">
                        <div className="flex justify-between">
                          <span>Total Harga Dasar:</span>
                          <span>Rp {Math.round(parseInt(formData.harga_dasar || '0') * parseInt(formData.jumlah || '0')).toLocaleString('id-ID')}</span>
                        </div>
                        <div className="flex justify-between">
                          <span>Sumbangan:</span>
                          <span>Rp {Math.round(parseInt(formData.sumbangan || '0')).toLocaleString('id-ID')}</span>
                        </div>
                        <div className="flex justify-between font-medium border-t pt-2 text-lg">
                          <span>Grand Total:</span>
                          <span className="text-green-600">
                            Rp {Math.round((parseInt(formData.harga_dasar || '0') * parseInt(formData.jumlah || '0')) + parseInt(formData.sumbangan || '0')).toLocaleString('id-ID')}
                          </span>
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
                      setEditingSale(null);
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
            )}
          </CardContent>
        </Card>
      )}

      {/* Sales List */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle>Riwayat Penjualan</CardTitle>
            {filteredSales && filteredSales.length > 0 && (
              <div className="text-sm text-muted-foreground">
                Menampilkan {filteredSales.length} dari {sales?.length || 0} transaksi
                {dateFilter !== 'all' && ` (Filter: ${dateFilter === 'today' ? 'Hari Ini' : 
                  dateFilter === 'week' ? '7 Hari Terakhir' :
                  dateFilter === 'month' ? 'Bulan Ini' :
                  dateFilter === 'last-month' ? 'Bulan Lalu' :
                  dateFilter === 'year' ? 'Tahun Ini' :
                  dateFilter === 'last-year' ? 'Tahun Lalu' : ''})`}
              </div>
            )}
          </div>
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
              <Select value={dateFilter} onValueChange={(value: any) => {
                console.log('[PenjualanPage] Filter changed:', value);
                setDateFilter(value);
              }}>
                <SelectTrigger>
                  <SelectValue placeholder="Pilih periode" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Semua Waktu</SelectItem>
                  <SelectItem value="today">Hari Ini</SelectItem>
                  <SelectItem value="week">7 Hari Terakhir</SelectItem>
                  <SelectItem value="month">Bulan Ini</SelectItem>
                  <SelectItem value="last-month">Bulan Lalu</SelectItem>
                  <SelectItem value="year">Tahun Ini</SelectItem>
                  <SelectItem value="last-year">Tahun Lalu</SelectItem>
                </SelectContent>
              </Select>
              {dateFilter !== 'all' && (
                <p className="text-xs text-muted-foreground mt-1">
                  Menampilkan: {dateFilter === 'today' ? 'Hari Ini' : 
                                dateFilter === 'week' ? '7 Hari Terakhir' :
                                dateFilter === 'month' ? 'Bulan Ini' :
                                dateFilter === 'last-month' ? 'Bulan Lalu' :
                                dateFilter === 'year' ? 'Tahun Ini' :
                                dateFilter === 'last-year' ? 'Tahun Lalu' : ''}
                </p>
              )}
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
                  {filteredSales && filteredSales.length > 0 ? filteredSales.map((sale) => {
                    const isMultiItem = sale.type === 'multi';
                    const singleItemData = !isMultiItem && 'jumlah' in sale.originalData ? sale.originalData : null;
                    
                    return (
                      <tr key={sale.id} className="border-t hover:bg-muted/25">
                        <td className="p-4">
                          <div className="flex items-center gap-2">
                            {isMultiItem ? (
                              <div className="flex items-center gap-2">
                                <Badge variant="secondary" className="flex items-center gap-1">
                                  <Package className="h-3 w-3" />
                                  {sale.itemCount} items
                                </Badge>
                                <span className="text-sm text-muted-foreground">
                                  Multi-item sale
                                </span>
                              </div>
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
                        <td className="p-4 font-medium text-green-600">
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
                  }) : (
                    <tr>
                      <td colSpan={9} className="p-8 text-center text-muted-foreground">
                        <ShoppingCart className="h-12 w-12 mx-auto mb-4 opacity-50" />
                        <p>Tidak ada penjualan yang ditemukan</p>
                        {sales && sales.length > 0 && (
                          <p className="text-xs mt-2 text-gray-500">
                            Coba ubah filter tanggal atau kata kunci pencarian
                          </p>
                        )}
                        {(!sales || sales.length === 0) && (
                          <p className="text-xs mt-2 text-gray-500">
                            Belum ada data penjualan
                          </p>
                        )}
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
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
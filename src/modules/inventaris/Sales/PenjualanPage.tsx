import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { ShoppingCart, Plus, DollarSign, TrendingUp, Search, Edit, Trash2, Eye } from 'lucide-react';
import ModuleHeader from '@/components/ModuleHeader';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { listInventory, listTransactions, getSalesSummary, createTransaction, updateTransaction, deleteTransaction } from '@/services/inventaris.service';
import { toast } from 'sonner';
import { X, AlertTriangle } from 'lucide-react';

const PenjualanPage = () => {
  const [searchTerm, setSearchTerm] = useState('');
  const [showForm, setShowForm] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [editingSale, setEditingSale] = useState<any>(null);
  const [deletingSale, setDeletingSale] = useState<any>(null);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [viewingSale, setViewingSale] = useState<any>(null);
  
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
    { label: 'Distribusi', path: '/inventaris/distribution' },
    { label: 'Riwayat', path: '/inventaris/transactions' }
  ];

  // Fetch real data from database
  const { data: inventoryData, isLoading: inventoryLoading } = useQuery({
    queryKey: ['inventory-items'],
    queryFn: () => listInventory({ page: 1, pageSize: 100 }, {}),
    staleTime: 30000
  });

  const { data: salesData, isLoading: salesLoading } = useQuery({
    queryKey: ['sales-transactions', searchTerm],
    queryFn: () => listTransactions(
      { page: 1, pageSize: 50 },
      { 
        tipe: 'Keluar',
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

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    
    try {
      // Validasi form
      if (!formData.item || !formData.jumlah || !formData.harga_dasar) {
        toast.error('Item, jumlah, dan harga dasar harus diisi');
        return;
      }
      
      const jumlah = parseInt(formData.jumlah);
      const hargaDasar = parseInt(formData.harga_dasar);
      const sumbangan = parseInt(formData.sumbangan || '0');
      
      if (jumlah <= 0 || hargaDasar <= 0) {
        toast.error('Jumlah dan harga dasar harus lebih dari 0');
        return;
      }
      
      // Hitung total dan harga satuan - FIXED: preserve exact total value
      const totalNilai = (hargaDasar * jumlah) + sumbangan;
      const hargaSatuan = Math.max(0, Math.round((totalNilai / jumlah) * 100) / 100); // Round to 2 decimal places
      
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
        catatan: `Penjualan - Harga Dasar: Rp ${hargaDasar.toLocaleString('id-ID')}/unit, Sumbangan: Rp ${sumbangan.toLocaleString('id-ID')}`
      };
      
      console.log('Creating/updating sales transaction:', transactionData);
      
      if (editingSale) {
        // Update existing transaction
        console.log('Updating transaction with ID:', editingSale.id);
        const result = await updateTransaction(editingSale.id, transactionData);
        console.log('Update result:', result);
        toast.success('Transaksi berhasil diperbarui!');
      } else {
        // Create new transaction
        await createTransaction(transactionData);
        toast.success('Transaksi penjualan berhasil disimpan!');
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
      
    } catch (error) {
      console.error('Error creating sales transaction:', error);
      toast.error('Gagal menyimpan transaksi penjualan');
    } finally {
      setIsSubmitting(false);
    }
  };

  // Handler for edit
  const handleEditSale = (sale: any) => {
    console.log('handleEditSale called with sale:', sale);
    console.log('Sale ID type:', typeof sale.id, 'Value:', sale.id);
    
    // Populate form with sale data
    setFormData({
      item: sale.item_id,
      jumlah: sale.jumlah.toString(),
      harga_dasar: sale.harga_dasar?.toString() || '0',
      sumbangan: sale.sumbangan?.toString() || '0',
      pembeli: sale.penerima || '',
      tanggal: sale.tanggal
    });
    
    setEditingSale(sale);
    setShowForm(true);
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
    
    try {
      await deleteTransaction(deletingSale.id);
      
      // Refresh data
      await queryClient.invalidateQueries({ queryKey: ['sales-transactions'] }); // This will invalidate all sales-transactions queries
      await queryClient.invalidateQueries({ queryKey: ['sales-stats'] });
      await queryClient.invalidateQueries({ queryKey: ['inventory-items'] });
      await queryClient.invalidateQueries({ queryKey: ['transactions-history'] });
      
      // Also invalidate keuangan queries
      await queryClient.invalidateQueries({ queryKey: ['keuangan-dashboard'] });
      await queryClient.invalidateQueries({ queryKey: ['keuangan-transactions'] });
      
      toast.success('Transaksi berhasil dihapus');
      setShowDeleteConfirm(false);
      setDeletingSale(null);
    } catch (error) {
      console.error('Error deleting transaction:', error);
      toast.error('Gagal menghapus transaksi');
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
    let filtered = sales.filter(sale => 
      (sale.nama_barang?.toLowerCase().includes(searchTerm.toLowerCase()) ||
       sale.penerima?.toLowerCase().includes(searchTerm.toLowerCase())) &&
      sale.keluar_mode === 'Penjualan'
    );
    
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
    const totalFiltered = currentData.reduce((sum, sale) => 
      sum + (sale.harga_total || ((sale.jumlah || 0) * (sale.harga_satuan || 0))), 0
    );
    
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
              onClick={() => setShowForm(!showForm)}
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

      {/* Sales Form */}
      {showForm && (
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
                      {items.map(item => (
                        <SelectItem key={item.id} value={item.id}>
                          {item.nama_barang} (Stok: {item.jumlah || 0})
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div>
                  <Label htmlFor="jumlah">Jumlah</Label>
                  <Input
                    id="jumlah"
                    type="number"
                    value={formData.jumlah}
                    onChange={(e) => setFormData({...formData, jumlah: e.target.value})}
                    placeholder="Masukkan jumlah"
                  />
                </div>

                <div>
                  <Label htmlFor="harga_dasar">Harga Dasar per Unit</Label>
                  <Input
                    id="harga_dasar"
                    type="number"
                    value={formData.harga_dasar}
                    onChange={(e) => setFormData({...formData, harga_dasar: e.target.value})}
                    placeholder="Harga dasar"
                  />
                </div>

                <div>
                  <Label htmlFor="sumbangan">Sumbangan/Infaq</Label>
                  <Input
                    id="sumbangan"
                    type="number"
                    value={formData.sumbangan}
                    onChange={(e) => setFormData({...formData, sumbangan: e.target.value})}
                    placeholder="Sumbangan (opsional)"
                  />
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
                  {isSubmitting ? 'Menyimpan...' : (editingSale ? 'Update Transaksi' : 'Simpan Transaksi')}
                </Button>
                <Button type="button" variant="outline" onClick={() => setShowForm(false)} disabled={isSubmitting}>
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
                  {filteredSales.map((sale) => (
                    <tr key={sale.id} className="border-t hover:bg-muted/25">
                      <td className="p-4 font-medium">{sale.nama_barang}</td>
                      <td className="p-4">{sale.jumlah}</td>
                       <td className="p-4">Rp {Math.round(sale.harga_satuan || 0).toLocaleString('id-ID')}</td>
                       <td className="p-4">Rp {Math.round(sale.sumbangan || 0).toLocaleString('id-ID')}</td>
                       <td className="p-4 font-medium">Rp {Math.round(sale.harga_total || ((sale.jumlah || 0) * (sale.harga_satuan || 0))).toLocaleString('id-ID')}</td>
                      <td className="p-4">{sale.penerima}</td>
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
                            onClick={() => handleViewSale(sale)}
                            title="Lihat Detail"
                          >
                            <Eye className="h-4 w-4" />
                          </Button>
                          <Button 
                            size="sm" 
                            variant="outline"
                            onClick={() => handleEditSale(sale)}
                            title="Edit Transaksi"
                          >
                            <Edit className="h-4 w-4" />
                          </Button>
                          <Button 
                            size="sm" 
                            variant="outline" 
                            className="text-red-600"
                            onClick={() => handleDeleteSale(sale)}
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
      {viewingSale && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <Card className="w-full max-w-2xl">
            <CardHeader>
              <CardTitle>Detail Transaksi Penjualan</CardTitle>
              <Button 
                variant="ghost" 
                size="icon" 
                className="absolute right-4 top-4"
                onClick={() => setViewingSale(null)}
              >
                <X className="h-4 w-4" />
              </Button>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label>Item</Label>
                  <p className="font-medium">{viewingSale.nama_barang}</p>
                </div>
                <div>
                  <Label>Jumlah</Label>
                  <p className="font-medium">{viewingSale.jumlah} unit</p>
                </div>
                  <div>
                    <Label>Harga Satuan</Label>
                    <p className="font-medium">Rp {Math.round(viewingSale.harga_satuan || 0).toLocaleString('id-ID')}</p>
                  </div>
                  <div>
                    <Label>Sumbangan</Label>
                    <p className="font-medium">Rp {Math.round(viewingSale.sumbangan || 0).toLocaleString('id-ID')}</p>
                  </div>
                  <div>
                    <Label>Total</Label>
                    <p className="font-medium text-green-600">
                      Rp {Math.round(viewingSale.harga_total || ((viewingSale.jumlah || 0) * (viewingSale.harga_satuan || 0))).toLocaleString('id-ID')}
                    </p>
                  </div>
                <div>
                  <Label>Pembeli</Label>
                  <p className="font-medium">{viewingSale.penerima || '-'}</p>
                </div>
                <div>
                  <Label>Tanggal</Label>
                  <p className="font-medium">{viewingSale.tanggal}</p>
                </div>
                <div>
                  <Label>Catatan</Label>
                  <p className="text-sm text-muted-foreground">{viewingSale.catatan || '-'}</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      )}
    </div>
  );
};

export default PenjualanPage;
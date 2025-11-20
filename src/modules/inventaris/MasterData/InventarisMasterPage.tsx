import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Package, Plus, AlertTriangle, Clock, Search, Edit, Trash2, Eye, Upload, Download, ClipboardList } from 'lucide-react';
import ModuleHeader from '@/components/ModuleHeader';
import { Link } from 'react-router-dom';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { listInventory, getLowStock, getNearExpiry } from '@/services/inventaris.service';
import ItemForm from './components/ItemForm';
import StockOpname from './components/StockOpname';
import ImportExport from './components/ImportExport';
import DeleteConfirmDialog from './components/DeleteConfirmDialog';

const InventarisMasterPage = () => {
  const [searchTerm, setSearchTerm] = useState('');
  const [filterType, setFilterType] = useState('all');
  const [currentPage, setCurrentPage] = useState(1);
  const pageSize = 10;
  const queryClient = useQueryClient();
  
  // Modal states
  const [showItemForm, setShowItemForm] = useState(false);
  const [showStockOpname, setShowStockOpname] = useState(false);
  const [showImportExport, setShowImportExport] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [importExportMode, setImportExportMode] = useState<'import' | 'export'>('import');
  const [editItem, setEditItem] = useState<any>(null);
  const [deleteItem, setDeleteItem] = useState<any>(null);
  
  const tabs = [
    { label: 'Dashboard', path: '/inventaris' },
    { label: 'Master Data', path: '/inventaris/master' },
    { label: 'Penjualan', path: '/inventaris/sales' },
    { label: 'Distribusi', path: '/inventaris/distribution' },
    { label: 'Riwayat', path: '/inventaris/transactions' }
  ];

  // Fetch real data from database
  const { data: inventoryData, isLoading: inventoryLoading, refetch } = useQuery({
    queryKey: ['inventory-master', currentPage, searchTerm, filterType],
    queryFn: async () => {
      console.log('Fetching inventory with params:', {
        page: currentPage,
        pageSize,
        searchTerm,
        filterType
      });
      
      const result = await listInventory(
        { page: currentPage, pageSize },
        {
          search: searchTerm || null,
          tipe_item: filterType === 'all' ? null : (filterType === 'aset' ? 'Aset' : filterType === 'komoditas' ? 'Komoditas' : filterType)
        }
      );
      
      console.log('Inventory fetch result:', result);
      return result;
    },
    staleTime: 0, // Always refetch to get latest data
  });

  const { data: lowStockItems, isLoading: lowStockLoading } = useQuery({
    queryKey: ['low-stock'],
    queryFn: () => getLowStock(10),
    staleTime: 60000
  });

  const { data: nearExpiryItems, isLoading: expiryLoading } = useQuery({
    queryKey: ['near-expiry'],
    queryFn: () => getNearExpiry(30),
    staleTime: 60000
  });

  const isLoading = inventoryLoading || lowStockLoading || expiryLoading;

  if (isLoading) {
    return (
      <div className="space-y-6">
        <ModuleHeader title="Master Data Inventaris" tabs={tabs} />
        <div className="flex items-center justify-center h-64">
          <div className="text-center">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto mb-4"></div>
            <p className="text-muted-foreground">Loading inventory data...</p>
          </div>
        </div>
      </div>
    );
  }

  const items = inventoryData?.data || [];
  const totalItems = inventoryData?.total || 0;
  const asetCount = items.filter(item => item.tipe_item === 'Aset').length;
  const komoditasCount = items.filter(item => item.tipe_item === 'Komoditas').length;
  const lowStockCount = lowStockItems?.length || 0;
  const nearExpiryCount = nearExpiryItems?.length || 0;

  // Debug logging
  console.log('Current state:', {
    filterType,
    searchTerm,
    currentPage,
    itemsCount: items.length,
    totalItems,
    items: items.map(item => ({ id: item.id, nama: item.nama_barang, tipe: item.tipe_item }))
  });

  // Handle search and filter changes
  const handleSearchChange = (value: string) => {
    console.log('Search changed:', value);
    setSearchTerm(value);
    setCurrentPage(1); // Reset to first page when searching
  };

  const handleFilterChange = (value: string) => {
    console.log('Filter changed:', value);
    setFilterType(value);
    setCurrentPage(1); // Reset to first page when filtering
  };

  const handleDeleteItem = (item: any) => {
    setDeleteItem(item);
    setShowDeleteConfirm(true);
  };

  return (
    <div className="space-y-6">
      <ModuleHeader title="Master Data Inventaris" tabs={tabs} />
      
      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Items</CardTitle>
            <Package className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{totalItems}</div>
            <p className="text-xs text-muted-foreground">
              {asetCount} Aset, {komoditasCount} Komoditas
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Stok Rendah</CardTitle>
            <AlertTriangle className="h-4 w-4 text-orange-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-orange-600">{lowStockCount}</div>
            <p className="text-xs text-muted-foreground">
              Perlu restock
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Mendekati Expiry</CardTitle>
            <Clock className="h-4 w-4 text-red-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-red-600">{nearExpiryCount}</div>
            <p className="text-xs text-muted-foreground">
              Akan kadaluarsa
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Nilai</CardTitle>
            <Package className="h-4 w-4 text-green-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-green-600">
              Rp {items.reduce((sum, item) => sum + ((item.jumlah || 0) * (item.harga_perolehan || 0)), 0).toLocaleString('id-ID')}
            </div>
            <p className="text-xs text-muted-foreground">
              Nilai total inventaris
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
                        setEditItem(null);
                        setShowItemForm(true);
                      }}
                    >
                      <Plus className="h-4 w-4" />
                      Tambah Item
                    </Button>
                    <Button 
                      variant="outline"
                      onClick={() => setShowStockOpname(true)}
                      className="flex items-center gap-2"
                    >
                      <ClipboardList className="h-4 w-4" />
                      Stock Opname
                    </Button>
                    <Button 
                      variant="outline"
                      onClick={() => {
                        setImportExportMode('import');
                        setShowImportExport(true);
                      }}
                      className="flex items-center gap-2"
                    >
                      <Upload className="h-4 w-4" />
                      Import Data
                    </Button>
                    <Button 
                      variant="outline"
                      onClick={() => {
                        setImportExportMode('export');
                        setShowImportExport(true);
                      }}
                      className="flex items-center gap-2"
                    >
                      <Download className="h-4 w-4" />
                      Export Data
                    </Button>
                    <Button 
                      variant="outline" 
                      onClick={() => {
                        console.log('Testing data fetch...');
                        refetch();
                      }}
                    >
                      Test Data
                    </Button>
                  </div>
                </CardContent>
              </Card>

      {/* Search and Filter */}
      <Card>
        <CardHeader>
          <CardTitle>Daftar Items</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex gap-4 mb-4">
            <div className="flex-1">
              <Label htmlFor="search">Cari Item</Label>
              <div className="relative">
                <Search className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                        <Input
                          id="search"
                          placeholder="Cari nama atau kategori..."
                          value={searchTerm}
                          onChange={(e) => handleSearchChange(e.target.value)}
                          className="pl-10"
                        />
              </div>
            </div>
            <div className="w-48">
              <Label htmlFor="filter">Filter Tipe</Label>
              <Select value={filterType} onValueChange={handleFilterChange}>
                <SelectTrigger>
                  <SelectValue placeholder="Pilih tipe" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Semua Tipe</SelectItem>
                  <SelectItem value="aset">Aset</SelectItem>
                  <SelectItem value="komoditas">Komoditas</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          {/* Items Table */}
          <div className="border rounded-lg">
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="bg-muted/50">
                  <tr>
                    <th className="text-left p-4 font-medium">Nama Item</th>
                    <th className="text-left p-4 font-medium">Kategori</th>
                    <th className="text-left p-4 font-medium">Tipe</th>
                    <th className="text-left p-4 font-medium">Stok</th>
                    <th className="text-left p-4 font-medium">Harga</th>
                    <th className="text-left p-4 font-medium">Lokasi</th>
                    <th className="text-left p-4 font-medium">Kondisi</th>
                    <th className="text-left p-4 font-medium">Aksi</th>
                  </tr>
                </thead>
                <tbody>
                  {items.map((item) => (
                    <tr key={item.id} className="border-t hover:bg-muted/25">
                      <td className="p-4">
                        <div>
                          <div className="font-medium">{item.nama_barang}</div>
                          <div className="text-sm text-muted-foreground">{item.supplier || 'No supplier'}</div>
                        </div>
                      </td>
                      <td className="p-4">
                        <Badge variant="secondary">{item.kategori}</Badge>
                      </td>
                      <td className="p-4">
                        <Badge variant={item.tipe_item === 'Aset' ? 'default' : 'outline'}>
                          {item.tipe_item}
                        </Badge>
                      </td>
                      <td className="p-4">
                        <div className="flex items-center gap-2">
                          <span className={(item.jumlah || 0) <= (item.min_stock || 0) ? 'text-orange-600 font-medium' : ''}>
                            {item.jumlah || 0}
                          </span>
                          {(item.jumlah || 0) <= (item.min_stock || 0) && (
                            <AlertTriangle className="h-4 w-4 text-orange-600" />
                          )}
                        </div>
                        <div className="text-xs text-muted-foreground">Min: {item.min_stock || 0}</div>
                      </td>
                      <td className="p-4">
                        <div className="font-medium">Rp {(item.harga_perolehan || 0).toLocaleString('id-ID')}</div>
                        <div className="text-xs text-muted-foreground">per unit</div>
                      </td>
                      <td className="p-4">{item.lokasi}</td>
                      <td className="p-4">
                        <Badge variant="outline" className="text-green-600">
                          {item.kondisi}
                        </Badge>
                      </td>
                              <td className="p-4">
                                <div className="flex gap-2">
                                  <Button size="sm" variant="outline">
                                    <Eye className="h-4 w-4" />
                                  </Button>
                                  <Button 
                                    size="sm" 
                                    variant="outline"
                                    onClick={() => {
                                      setEditItem(item);
                                      setShowItemForm(true);
                                    }}
                                  >
                                    <Edit className="h-4 w-4" />
                                  </Button>
                                  <Button 
                                    size="sm" 
                                    variant="outline" 
                                    className="text-red-600"
                                    onClick={() => handleDeleteItem(item)}
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

                  {items.length === 0 && (
                    <div className="text-center py-8 text-muted-foreground">
                      <Package className="h-12 w-12 mx-auto mb-4 opacity-50" />
                      <p>Tidak ada item yang ditemukan</p>
                      <div className="text-sm mt-2">
                        <p>Filter: {filterType === 'all' ? 'Semua Tipe' : filterType}</p>
                        <p>Search: {searchTerm || 'Tidak ada'}</p>
                        <p>Total items di database: {totalItems}</p>
                      </div>
                    </div>
                  )}

          {/* Pagination */}
          {totalItems > pageSize && (
            <div className="flex items-center justify-between mt-4">
              <div className="text-sm text-muted-foreground">
                Showing {((currentPage - 1) * pageSize) + 1} to {Math.min(currentPage * pageSize, totalItems)} of {totalItems} items
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
                  disabled={currentPage * pageSize >= totalItems}
                >
                  Next
                </Button>
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Modals */}
      {showItemForm && (
        <ItemForm 
          onClose={() => {
            setShowItemForm(false);
            setEditItem(null);
          }}
          editItem={editItem}
        />
      )}

      {showStockOpname && (
        <StockOpname 
          onClose={() => setShowStockOpname(false)}
          onSuccess={async () => {
            // Refetch data setelah stock opname berhasil
            console.log('Stock opname success callback, waiting before refetch...');
            
            // Tunggu untuk memastikan semua proses selesai
            await new Promise(resolve => setTimeout(resolve, 500));
            
            console.log('Force removing and invalidating cache...');
            
            // Remove cache untuk memastikan data benar-benar fresh
            queryClient.removeQueries({ queryKey: ['inventory-master'], exact: false });
            
            // Tunggu sedikit
            await new Promise(resolve => setTimeout(resolve, 100));
            
            // Invalidate dan refetch
            queryClient.invalidateQueries({ queryKey: ['inventory-master'], exact: false });
            
            console.log('Force refetching inventory data...');
            
            // Refetch dengan force - ini akan memaksa query baru
            const refetchResult = await refetch();
            console.log('Refetch result:', {
              status: refetchResult.status,
              dataCount: refetchResult.data?.data?.length,
              total: refetchResult.data?.total,
              firstItem: refetchResult.data?.data?.[0] ? {
                id: refetchResult.data.data[0].id,
                nama: refetchResult.data.data[0].nama_barang,
                jumlah: refetchResult.data.data[0].jumlah
              } : null
            });
            
            // Juga refetch low stock dan near expiry
            await Promise.all([
              queryClient.refetchQueries({ 
                queryKey: ['low-stock'], 
                type: 'active',
                exact: false
              }),
              queryClient.refetchQueries({ 
                queryKey: ['near-expiry'], 
                type: 'active',
                exact: false
              }),
            ]);
            
            console.log('Data refetch completed from onSuccess callback');
          }}
        />
      )}

      {showImportExport && (
        <ImportExport 
          onClose={() => setShowImportExport(false)}
          mode={importExportMode}
        />
      )}

      {showDeleteConfirm && deleteItem && (
        <DeleteConfirmDialog 
          item={deleteItem}
          onClose={() => {
            setShowDeleteConfirm(false);
            setDeleteItem(null);
          }}
        />
      )}
    </div>
  );
};

export default InventarisMasterPage;
import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { 
  Package, 
  AlertTriangle, 
  FileSpreadsheet, 
  Plus, 
  Search, 
  Pencil, 
  Trash2,
  TrendingDown,
  PackageX,
  Tag,
  Store,
  ClipboardList,
  Building2,
  DollarSign
} from 'lucide-react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import ProdukFormDialog from './components/ProdukFormDialog';
import StockOpnameKoperasi from './components/StockOpnameKoperasi';
import KategoriManagement from './components/KategoriManagement';
import SupplierManagement from './components/SupplierManagement';
import ImportExportData from './components/ImportExportData';
import PengajuanItemYayasanApproval from './components/PengajuanItemYayasanApproval';
import AjukanTransferDialog from './components/AjukanTransferDialog';
import type { KoperasiProduk } from '@/types/koperasi.types';

export default function MasterProdukPage() {
  const [activeTab, setActiveTab] = useState('products');
  const [search, setSearch] = useState('');
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingProduk, setEditingProduk] = useState<KoperasiProduk | null>(null);
  const [yayasanSearch, setYayasanSearch] = useState('');
  const [ajukanTransferDialogOpen, setAjukanTransferDialogOpen] = useState(false);
  const [selectedYayasanItem, setSelectedYayasanItem] = useState<any>(null);
  const queryClient = useQueryClient();

  // Fetch total count (for display)
  const { data: totalCount = 0 } = useQuery({
    queryKey: ['koperasi-produk-total-count'],
    queryFn: async () => {
      const { count, error } = await supabase
        .from('kop_barang')
        .select('*', { count: 'exact', head: true })
        .eq('is_active', true);
      
      if (error) throw error;
      return count || 0;
    },
  });

  // Fetch produk list with stock
  const { data: produkList = [], isLoading } = useQuery({
    queryKey: ['koperasi-produk-with-stock', search],
    queryFn: async () => {
      // Query from kop_barang with join to kop_kategori to get kategori name
      // Note: Supabase PostgREST doesn't support 'as' alias, so we map in client side
      let query = supabase
        .from('kop_barang')
        .select(`
          id,
          kode_barang,
          nama_barang,
          kategori_id,
          satuan_dasar,
          harga_beli,
          harga_jual_ecer,
          harga_jual_grosir,
          stok,
          stok_minimum,
          owner_type,
          inventaris_id,
          is_active,
          kop_kategori:kategori_id(nama)
        `)
        .eq('is_active', true)
        .order('nama_barang');

      if (search) {
        query = query.or(`nama_barang.ilike.%${search}%,kode_barang.ilike.%${search}%`);
      }

      const { data, error } = await query;
      if (error) throw error;
      
      // Fetch all kategori untuk mapping (fallback jika join tidak berfungsi)
      const { data: kategoriList } = await supabase
        .from('kop_kategori')
        .select('id, nama');
      
      const kategoriMap = new Map(
        (kategoriList || []).map((k: any) => [k.id, k.nama])
      );
      
      // Map to include stock status, calculate values, and rename columns
      return (data || []).map((item: any) => {
        const stock = Number(item.stok || 0);
        const stockMin = Number(item.stok_minimum || 5);
        let statusStock = 'aman';
        if (stock === 0) statusStock = 'habis';
        else if (stock <= stockMin) statusStock = 'menipis';
        
        // Get kategori name from join or fallback to map
        const kategoriName = item.kop_kategori?.nama || 
                            (item.kategori_id ? kategoriMap.get(item.kategori_id) : null) || 
                            null;
        
        return {
          produk_id: item.id,
          kode_produk: item.kode_barang,
          nama_produk: item.nama_barang,
          kategori_id: item.kategori_id,
          kategori: kategoriName,
          satuan: item.satuan_dasar,
          harga_beli: item.harga_beli,
          harga_jual: item.harga_jual_ecer,
          harga_jual_ecer: item.harga_jual_ecer,
          harga_jual_grosir: item.harga_jual_grosir,
          stock: stock,
          stok: stock, // Add stok field for form compatibility
          stock_minimum: stockMin,
          status_stock: statusStock,
          nilai_stock: stock * Number(item.harga_beli || 0),
          owner_type: item.owner_type || 'koperasi',
          inventaris_id: item.inventaris_id,
          is_active: item.is_active,
        };
      });
    },
  });

  // Fetch stock alerts
  const { data: stockAlerts = [], isLoading: isLoadingAlerts } = useQuery({
    queryKey: ['koperasi-stock-alerts'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('v_koperasi_stock')
        .select('*')
        .in('status_stock', ['habis', 'menipis'])
        .order('stock');

      if (error) throw error;
      return data || [];
    },
    enabled: activeTab === 'alerts',
  });

  // Fetch yayasan items (komoditas yang bisa dijual koperasi)
  const { data: yayasanItems = [], isLoading: isLoadingYayasan } = useQuery({
    queryKey: ['koperasi-yayasan-items', yayasanSearch],
    queryFn: async () => {
      let query = supabase
        .from('inventaris')
        .select(`
          *,
          kop_barang!left(
            id,
            kode_barang,
            stok,
            harga_beli,
            harga_jual_ecer,
            harga_jual_grosir,
            owner_type
          )
        `)
        .or('is_komoditas.eq.true,boleh_dijual_koperasi.eq.true')
        .order('nama_barang');

      if (yayasanSearch) {
        query = query.or(`nama_barang.ilike.%${yayasanSearch}%,kode_inventaris.ilike.%${yayasanSearch}%`);
      }

      const { data, error } = await query;
      if (error) throw error;

      // Get latest pengajuan status for each item
      const itemIds = (data || []).map((item: any) => item.id);
      if (itemIds.length > 0) {
        const { data: pengajuanData } = await supabase
          .from('pengajuan_item_yayasan')
          .select('inventaris_item_id, status, created_at')
          .in('inventaris_item_id', itemIds)
          .order('created_at', { ascending: false });

        // Create map of latest status per item
        const statusMap = new Map<string, string>();
        if (pengajuanData) {
          pengajuanData.forEach((p: any) => {
            if (!statusMap.has(p.inventaris_item_id)) {
              statusMap.set(p.inventaris_item_id, p.status);
            }
          });
        }

        // Add status to each item
        return (data || []).map((item: any) => ({
          ...item,
          pengajuan_status: statusMap.get(item.id) || null,
        }));
      }

      return data || [];
    },
    enabled: activeTab === 'yayasan-items',
  });

  // Delete mutation
  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from('kop_barang')
        .update({ is_active: false })
        .eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['koperasi-produk'] });
      queryClient.invalidateQueries({ queryKey: ['koperasi-produk-with-stock'] });
      queryClient.invalidateQueries({ queryKey: ['koperasi-produk-total-count'] });
      toast.success('Produk berhasil dihapus');
    },
    onError: (error: any) => {
      toast.error(error.message || 'Gagal menghapus produk');
    },
  });

  const handleEdit = (produk: KoperasiProduk) => {
    setEditingProduk(produk);
    setIsDialogOpen(true);
  };

  const handleDelete = async (id: string, nama: string) => {
    if (confirm(`Hapus produk "${nama}"?`)) {
      deleteMutation.mutate(id);
    }
  };

  const handleCloseDialog = () => {
    setIsDialogOpen(false);
    setEditingProduk(null);
  };

  const calculateMargin = (hargaBeli: number, hargaJual: number) => {
    if (hargaBeli === 0) return 0;
    return ((hargaJual - hargaBeli) / hargaBeli * 100).toFixed(1);
  };

  // Handle ajukan transfer ke koperasi
  const handleAjukanTransfer = (item: any) => {
    setSelectedYayasanItem({
      id: item.id,
      nama_barang: item.nama_barang,
      jumlah: item.jumlah || 0,
      satuan: item.satuan || '',
      harga_perolehan: item.harga_perolehan || null,
    });
    setAjukanTransferDialogOpen(true);
  };


  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold">Master Data Koperasi</h1>
          <p className="text-muted-foreground">Kelola produk dan stok koperasi</p>
        </div>
        <Button onClick={() => setIsDialogOpen(true)}>
          <Plus className="w-4 h-4 mr-2" />
          Tambah Produk
        </Button>
      </div>

      <Tabs defaultValue="products" value={activeTab} onValueChange={setActiveTab} className="w-full">
        <TabsList className="grid w-full grid-cols-8 lg:w-auto">
          <TabsTrigger value="products" className="flex items-center gap-2">
            <Package className="h-4 w-4" />
            <span className="hidden sm:inline">Produk</span>
          </TabsTrigger>
          <TabsTrigger value="approval" className="flex items-center gap-2">
            <Building2 className="h-4 w-4" />
            <span className="hidden sm:inline">Approval</span>
          </TabsTrigger>
          <TabsTrigger value="yayasan-items" className="flex items-center gap-2">
            <Store className="h-4 w-4" />
            <span className="hidden sm:inline">Item Yayasan</span>
          </TabsTrigger>
          <TabsTrigger value="alerts" className="flex items-center gap-2">
            <AlertTriangle className="h-4 w-4" />
            <span className="hidden sm:inline">Alert</span>
            {stockAlerts.length > 0 && (
              <Badge variant="destructive" className="ml-1">{stockAlerts.length}</Badge>
            )}
          </TabsTrigger>
          <TabsTrigger value="stock-opname" className="flex items-center gap-2">
            <ClipboardList className="h-4 w-4" />
            <span className="hidden sm:inline">Opname</span>
          </TabsTrigger>
          <TabsTrigger value="kategori" className="flex items-center gap-2">
            <Tag className="h-4 w-4" />
            <span className="hidden sm:inline">Kategori</span>
          </TabsTrigger>
          <TabsTrigger value="supplier" className="flex items-center gap-2">
            <Store className="h-4 w-4" />
            <span className="hidden sm:inline">Supplier</span>
          </TabsTrigger>
          <TabsTrigger value="import-export" className="flex items-center gap-2">
            <FileSpreadsheet className="h-4 w-4" />
            <span className="hidden sm:inline">I/E</span>
          </TabsTrigger>
        </TabsList>

        {/* Tab: Data Produk */}
        <TabsContent value="products" className="mt-6">
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between gap-4">
                <div className="relative flex-1">
                  <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground w-4 h-4" />
                  <Input
                    placeholder="Cari produk..."
                    value={search}
                    onChange={(e) => setSearch(e.target.value)}
                    className="pl-10"
                  />
                </div>
                <div className="text-sm text-muted-foreground">
                  {search ? (
                    <>
                      Menampilkan: <span className="font-semibold text-foreground">{produkList.length}</span> dari{' '}
                      <span className="font-semibold text-foreground">{totalCount}</span> produk
                    </>
                  ) : (
                    <>
                      Total: <span className="font-semibold text-foreground">{totalCount}</span> produk
                    </>
                  )}
                </div>
              </div>
            </CardHeader>
            <CardContent>
              {isLoading ? (
                <div className="text-center py-8">Loading...</div>
              ) : produkList.length === 0 ? (
                <div className="text-center py-12 text-muted-foreground">
                  <Package className="w-12 h-12 mx-auto mb-4 opacity-50" />
                  <p>Belum ada produk. Klik "Tambah Produk" untuk memulai.</p>
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full">
                    <thead>
                      <tr className="border-b">
                        <th className="text-left p-3">Kode</th>
                        <th className="text-left p-3">Nama Produk</th>
                        <th className="text-left p-3">Kategori</th>
                        <th className="text-right p-3">Stock</th>
                        <th className="text-left p-3">Satuan</th>
                        <th className="text-right p-3">Harga Beli</th>
                        <th className="text-right p-3">Harga Ecer</th>
                        <th className="text-right p-3">Harga Grosir</th>
                        <th className="text-center p-3">Aksi</th>
                      </tr>
                    </thead>
                    <tbody>
                      {produkList
                        .filter((produk: any) => {
                          const kode = String(produk.kode_produk || '');
                          // Tab Produk menampilkan semua produk (KOP- dan YYS-)
                          return kode.startsWith('KOP-') || kode.startsWith('YYS-');
                        })
                        .map((produk: any) => {
                          const ownerType = produk.owner_type || 'koperasi';
                          return (
                          <tr key={produk.produk_id} className="border-b hover:bg-muted/50">
                            <td className="p-3 font-mono text-sm">{produk.kode_produk}</td>
                            <td className="p-3">
                              <div className="flex items-center gap-2 flex-wrap">
                                <span>{produk.nama_produk}</span>
                                <Badge 
                                  variant={ownerType === 'yayasan' ? 'outline' : 'secondary'} 
                                  className="text-xs shrink-0"
                                >
                                  {ownerType === 'yayasan' ? 'Yayasan' : 'Koperasi'}
                                </Badge>
                              </div>
                            </td>
                            <td className="p-3">
                              <Badge variant="outline">{produk.kategori || '-'}</Badge>
                            </td>
                          <td className="p-3 text-right">
                            <div className="flex flex-col items-end gap-1">
                              <span className={`font-semibold ${
                                produk.status_stock === 'habis' ? 'text-red-600' :
                                produk.status_stock === 'menipis' ? 'text-orange-600' :
                                'text-green-600'
                              }`}>
                                {Number(produk.stock || 0).toLocaleString('id-ID')}
                              </span>
                              {produk.owner_type === 'yayasan' && produk.inventaris_id && (
                                <span className="text-xs text-muted-foreground">
                                  (Stok Koperasi)
                                </span>
                              )}
                            </div>
                          </td>
                          <td className="p-3">{produk.satuan}</td>
                          <td className="p-3 text-right">
                            Rp {Number(produk.harga_beli || 0).toLocaleString('id-ID')}
                          </td>
                          <td className="p-3 text-right">
                            <div className="text-sm">
                              <div>Rp {Number(produk.harga_jual_ecer || produk.harga_jual || 0).toLocaleString('id-ID')}</div>
                              <div className="text-xs text-muted-foreground">
                                ({calculateMargin(Number(produk.harga_beli || 0), Number(produk.harga_jual_ecer || produk.harga_jual || 0))}%)
                              </div>
                            </div>
                          </td>
                          <td className="p-3 text-right">
                            <div className="text-sm">
                              <div>
                                {produk.harga_jual_grosir === 0 
                                  ? 'Rp 0 (Eceran saja)' 
                                  : `Rp ${Number(produk.harga_jual_grosir || produk.harga_jual || 0).toLocaleString('id-ID')}`}
                              </div>
                              <div className="text-xs text-muted-foreground">
                                {produk.harga_jual_grosir === 0 
                                  ? '(Hanya eceran)'
                                  : `(${calculateMargin(Number(produk.harga_beli || 0), Number(produk.harga_jual_grosir || produk.harga_jual || 0))}%)`}
                              </div>
                            </div>
                          </td>
                          <td className="p-3">
                            <div className="flex justify-center gap-2">
                              <Button
                                size="sm"
                                variant="ghost"
                                onClick={() => handleEdit({ ...produk, id: produk.produk_id })}
                              >
                                <Pencil className="w-4 h-4" />
                              </Button>
                              <Button
                                size="sm"
                                variant="ghost"
                                onClick={() => handleDelete(produk.produk_id, produk.nama_produk)}
                              >
                                <Trash2 className="w-4 h-4" />
                              </Button>
                            </div>
                          </td>
                        </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* Tab: Item Yayasan (Approval) */}
        <TabsContent value="approval" className="mt-6">
          <PengajuanItemYayasanApproval />
        </TabsContent>

        {/* Tab: Item Yayasan (Komoditas) */}
        <TabsContent value="yayasan-items" className="mt-6">
          <Card>
            <CardHeader>
              <div className="flex items-center gap-4">
                <div className="relative flex-1">
                  <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground w-4 h-4" />
                  <Input
                    placeholder="Cari item yayasan..."
                    value={yayasanSearch}
                    onChange={(e) => setYayasanSearch(e.target.value)}
                    className="pl-10"
                  />
                </div>
              </div>
            </CardHeader>
            <CardContent>
              {isLoadingYayasan ? (
                <div className="text-center py-8">Loading...</div>
              ) : yayasanItems.length === 0 ? (
                <div className="text-center py-12 text-muted-foreground">
                  <Building2 className="w-12 h-12 mx-auto mb-4 opacity-50" />
                  <p>Belum ada item yayasan yang bisa dijual koperasi.</p>
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full">
                    <thead>
                      <tr className="border-b">
                        <th className="text-left p-3">Kode Inventaris</th>
                        <th className="text-left p-3">Nama Barang</th>
                        <th className="text-left p-3">Kategori</th>
                        <th className="text-right p-3">Stok Yayasan</th>
                        <th className="text-center p-3">Aksi</th>
                      </tr>
                    </thead>
                    <tbody>
                      {yayasanItems.map((item: any) => {
                        const kopBarang = item.kop_barang?.[0];
                        const stokKoperasi = kopBarang?.stok || 0;
                        const pengajuanStatus = item.pengajuan_status;

                        // Determine status badge
                        let statusBadge = null;
                        if (!pengajuanStatus) {
                          statusBadge = <Badge variant="outline">Belum diajukan</Badge>;
                        } else if (pengajuanStatus === 'pending_koperasi') {
                          statusBadge = <Badge variant="default" className="bg-yellow-500">Menunggu approval</Badge>;
                        } else if (pengajuanStatus === 'disetujui' || pengajuanStatus === 'selesai') {
                          statusBadge = <Badge variant="default" className="bg-green-500">Disetujui</Badge>;
                        } else if (pengajuanStatus === 'ditolak') {
                          statusBadge = <Badge variant="destructive">Ditolak</Badge>;
                        }

                        return (
                          <tr key={item.id} className="border-b hover:bg-muted/50">
                            <td className="p-3 font-mono text-sm">{item.kode_inventaris || '-'}</td>
                            <td className="p-3">{item.nama_barang}</td>
                            <td className="p-3">
                              <Badge variant="outline">{item.kategori || '-'}</Badge>
                            </td>
                            <td className="p-3 text-right">
                              <div className="flex flex-col items-end gap-1">
                                <span className={`font-semibold ${
                                  (item.jumlah || 0) === 0 ? 'text-red-600' :
                                  (item.jumlah || 0) <= (item.min_stock || 10) ? 'text-orange-600' :
                                  'text-green-600'
                                }`}>
                                  {Number(item.jumlah || 0).toLocaleString('id-ID')} {item.satuan || ''}
                                </span>
                                {stokKoperasi > 0 && (
                                  <span className="text-xs text-muted-foreground">
                                    (Stok Koperasi: {Number(stokKoperasi).toLocaleString('id-ID')})
                                  </span>
                                )}
                              </div>
                            </td>
                            <td className="p-3">
                              {statusBadge}
                            </td>
                            <td className="p-3">
                              <div className="flex justify-center">
                                <Button
                                  size="sm"
                                  onClick={() => handleAjukanTransfer(item)}
                                  disabled={(item.jumlah || 0) === 0 || pengajuanStatus === 'pending_koperasi'}
                                  variant={pengajuanStatus === 'pending_koperasi' ? 'outline' : 'default'}
                                >
                                  <Plus className="w-4 h-4 mr-1" />
                                  {pengajuanStatus === 'pending_koperasi' ? 'Sudah diajukan' : 'Ajukan ke Koperasi'}
                                </Button>
                              </div>
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* Tab: Alert Stok */}
        <TabsContent value="alerts" className="mt-6">
          <div className="grid gap-4 md:grid-cols-2">
            {/* Stok Habis */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-destructive">
                  <PackageX className="h-5 w-5" />
                  Stok Habis
                </CardTitle>
              </CardHeader>
              <CardContent>
                {isLoadingAlerts ? (
                  <div className="text-center py-4">Loading...</div>
                ) : (
                  <div className="space-y-2">
                    {stockAlerts.filter((item: any) => item.status_stock === 'habis').length === 0 ? (
                      <p className="text-sm text-muted-foreground">Tidak ada stok habis</p>
                    ) : (
                      stockAlerts
                        .filter((item: any) => item.status_stock === 'habis')
                        .map((item: any) => (
                          <div key={item.produk_id} className="flex justify-between items-center p-3 border rounded-lg">
                            <div>
                              <p className="font-medium">{item.nama_produk}</p>
                              <p className="text-sm text-muted-foreground">{item.kode_produk}</p>
                            </div>
                            <Badge variant="destructive">Habis</Badge>
                          </div>
                        ))
                    )}
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Stok Menipis */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-orange-600">
                  <TrendingDown className="h-5 w-5" />
                  Stok Menipis
                </CardTitle>
              </CardHeader>
              <CardContent>
                {isLoadingAlerts ? (
                  <div className="text-center py-4">Loading...</div>
                ) : (
                  <div className="space-y-2">
                    {stockAlerts.filter((item: any) => item.status_stock === 'menipis').length === 0 ? (
                      <p className="text-sm text-muted-foreground">Tidak ada stok menipis</p>
                    ) : (
                      stockAlerts
                        .filter((item: any) => item.status_stock === 'menipis')
                        .map((item: any) => (
                          <div key={item.produk_id} className="flex justify-between items-center p-3 border rounded-lg">
                            <div>
                              <p className="font-medium">{item.nama_produk}</p>
                              <p className="text-sm text-muted-foreground">
                                Stok: {item.stock} / Min: {item.stock_minimum}
                              </p>
                            </div>
                            <Badge variant="outline" className="text-orange-600 border-orange-600">
                              Menipis
                            </Badge>
                          </div>
                        ))
                    )}
                  </div>
                )}
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        {/* Tab: Stock Opname */}
        <TabsContent value="stock-opname" className="mt-6">
          <StockOpnameKoperasi />
        </TabsContent>

        {/* Tab: Kategori */}
        <TabsContent value="kategori" className="mt-6">
          <KategoriManagement />
        </TabsContent>

        {/* Tab: Supplier */}
        <TabsContent value="supplier" className="mt-6">
          <SupplierManagement />
        </TabsContent>

        {/* Tab: Import/Export */}
        <TabsContent value="import-export" className="mt-6">
          <ImportExportData />
        </TabsContent>
      </Tabs>

      <ProdukFormDialog
        key={editingProduk?.id || 'new'} // Force re-render when produk changes
        open={isDialogOpen}
        onClose={handleCloseDialog}
        produk={editingProduk}
      />

      {/* Dialog untuk ajukan transfer ke koperasi */}
      <AjukanTransferDialog
        open={ajukanTransferDialogOpen}
        onClose={() => {
          setAjukanTransferDialogOpen(false);
          setSelectedYayasanItem(null);
        }}
        item={selectedYayasanItem}
      />
    </div>
  );
}

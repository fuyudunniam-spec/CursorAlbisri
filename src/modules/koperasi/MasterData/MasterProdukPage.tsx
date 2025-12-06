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
import type { KoperasiProduk } from '@/types/koperasi.types';

export default function MasterProdukPage() {
  const [activeTab, setActiveTab] = useState('products');
  const [search, setSearch] = useState('');
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingProduk, setEditingProduk] = useState<KoperasiProduk | null>(null);
  const [yayasanSearch, setYayasanSearch] = useState('');
  const [hargaDialogOpen, setHargaDialogOpen] = useState(false);
  const [selectedYayasanItem, setSelectedYayasanItem] = useState<any>(null);
  const [hargaJualEcer, setHargaJualEcer] = useState('');
  const [hargaJualGrosir, setHargaJualGrosir] = useState('');
  const [hargaHppKoperasi, setHargaHppKoperasi] = useState('');
  const queryClient = useQueryClient();

  // Fetch produk list with stock
  const { data: produkList = [], isLoading } = useQuery({
    queryKey: ['koperasi-produk-with-stock', search],
    queryFn: async () => {
      // Use view to get stock info
      let query = supabase
        .from('v_koperasi_stock')
        .select('*')
        .order('nama_produk');

      if (search) {
        query = query.or(`nama_produk.ilike.%${search}%,kode_produk.ilike.%${search}%`);
      }

      const { data, error } = await query;
      if (error) throw error;
      return data || [];
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

  // Handle tambah item yayasan ke daftar jual
  const handleTambahKeDaftarJual = (item: any) => {
    setSelectedYayasanItem(item);
    const kopBarang = item.kop_barang?.[0];
    setHargaJualEcer(kopBarang?.harga_jual_ecer?.toString() || '');
    setHargaJualGrosir(kopBarang?.harga_jual_grosir?.toString() || '');
    // Default HPP koperasi dari kop_barang jika sudah ada, jika belum pakai hpp_yayasan (jika ada)
    const defaultHpp = (kopBarang?.harga_beli ?? item.hpp_yayasan ?? 0) as number;
    setHargaHppKoperasi(defaultHpp ? defaultHpp.toString() : '');
    setHargaDialogOpen(true);
  };

  // Handle ubah harga item yayasan
  const handleUbahHarga = (item: any) => {
    setSelectedYayasanItem(item);
    const kopBarang = item.kop_barang?.[0];
    setHargaJualEcer(kopBarang?.harga_jual_ecer?.toString() || '');
    setHargaJualGrosir(kopBarang?.harga_jual_grosir?.toString() || '');
    const defaultHpp = (kopBarang?.harga_beli ?? item.hpp_yayasan ?? 0) as number;
    setHargaHppKoperasi(defaultHpp ? defaultHpp.toString() : '');
    setHargaDialogOpen(true);
  };

  // Save harga jual koperasi + HPP koperasi
  const saveHargaMutation = useMutation({
    mutationFn: async ({ itemId, hargaEcer, hargaGrosir, hppKoperasi }: { itemId: string; hargaEcer: number; hargaGrosir: number; hppKoperasi: number }) => {
      const existingKopBarang = selectedYayasanItem?.kop_barang?.[0];
      
      if (existingKopBarang) {
        // Update existing kop_barang (termasuk HPP koperasi)
        const { error } = await supabase
          .from('kop_barang')
          .update({ 
            harga_beli: hppKoperasi,
            harga_transfer: hppKoperasi,
            harga_jual_ecer: hargaEcer,
            harga_jual_grosir: hargaGrosir,
            is_active: true // Pastikan item aktif setelah update harga
          })
          .eq('id', existingKopBarang.id);
        if (error) throw error;
      } else {
        // Create new kop_barang
        const { data: kategoriData } = await supabase
          .from('kop_kategori')
          .select('id')
          .limit(1)
          .single();

        const { data: sumberModalData } = await supabase
          .from('kop_sumber_modal')
          .select('id')
          .limit(1)
          .single();

        // Generate kode barang YYS-0001, YYS-0002, dst jika belum ada kode_inventaris
        let kodeBarang = selectedYayasanItem.kode_inventaris as string | null;
        if (!kodeBarang) {
          const prefix = 'YYS-';
          const { data: lastKodeData, error: kodeError } = await supabase
            .from('kop_barang')
            .select('kode_barang')
            .like('kode_barang', `${prefix}%`)
            .order('kode_barang', { ascending: false })
            .limit(1);

          if (kodeError) throw kodeError;

          let nextNum = 1;
          if (lastKodeData && lastKodeData.length > 0 && lastKodeData[0].kode_barang) {
            const match = lastKodeData[0].kode_barang.match(/^YYS-(\\d+)$/);
            if (match) {
              nextNum = parseInt(match[1], 10) + 1;
            }
          }

          kodeBarang = `${prefix}${nextNum.toString().padStart(4, '0')}`;
        }

        const finalHpp = hppKoperasi || 0;
        const { error } = await supabase
          .from('kop_barang')
          .insert({
            inventaris_id: itemId,
            kode_barang: kodeBarang,
            nama_barang: selectedYayasanItem.nama_barang,
            kategori_id: kategoriData?.id || null,
            sumber_modal_id: sumberModalData?.id || null,
            harga_beli: finalHpp, // HPP koperasi (transaksi ke yayasan)
            harga_transfer: finalHpp,
            harga_jual_ecer: hargaEcer,
            harga_jual_grosir: hargaGrosir,
            satuan_dasar: selectedYayasanItem.satuan || 'pcs',
            owner_type: 'yayasan',
            stok: selectedYayasanItem.jumlah || 0,
            is_active: true,
          });
        if (error) throw error;

        // Update inventaris flags
        await supabase
          .from('inventaris')
          .update({
            is_komoditas: true,
            boleh_dijual_koperasi: true
          })
          .eq('id', itemId);
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['koperasi-yayasan-items'] });
      queryClient.invalidateQueries({ queryKey: ['koperasi-produk'] });
      queryClient.invalidateQueries({ queryKey: ['koperasi-produk-with-stock'] });
      toast.success('Harga jual berhasil disimpan');
      setHargaDialogOpen(false);
      setSelectedYayasanItem(null);
      setHargaJualEcer('');
      setHargaJualGrosir('');
    },
    onError: (error: any) => {
      toast.error(error.message || 'Gagal menyimpan harga jual');
    },
  });

  const handleSaveHarga = () => {
    if (!selectedYayasanItem || !hargaJualEcer || !hargaJualGrosir) {
      toast.error('Harga ecer dan grosir harus diisi');
      return;
    }
    const hargaEcer = parseFloat(hargaJualEcer);
    const hargaGrosir = parseFloat(hargaJualGrosir);
    const hppKoperasi = hargaHppKoperasi ? parseFloat(hargaHppKoperasi) : 0;

    if (isNaN(hargaEcer) || hargaEcer <= 0) {
      toast.error('Harga ecer harus berupa angka positif');
      return;
    }
    if (isNaN(hargaGrosir) || hargaGrosir <= 0) {
      toast.error('Harga grosir harus berupa angka positif');
      return;
    }
    if (hargaGrosir >= hargaEcer) {
      toast.error('Harga grosir harus lebih kecil dari harga ecer');
      return;
    }
    if (hppKoperasi < 0) {
      toast.error('HPP koperasi tidak boleh negatif');
      return;
    }

    saveHargaMutation.mutate({
      itemId: selectedYayasanItem.id,
      hargaEcer,
      hargaGrosir,
      hppKoperasi,
    });
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
        <TabsList className="grid w-full grid-cols-7 lg:w-auto">
          <TabsTrigger value="products" className="flex items-center gap-2">
            <Package className="h-4 w-4" />
            <span className="hidden sm:inline">Produk</span>
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
              <div className="flex items-center gap-4">
                <div className="relative flex-1">
                  <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground w-4 h-4" />
                  <Input
                    placeholder="Cari produk..."
                    value={search}
                    onChange={(e) => setSearch(e.target.value)}
                    className="pl-10"
                  />
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
                          // Tab Produk hanya menampilkan item koperasi dengan kode KOP-xxxx
                          return kode.startsWith('KOP-') || (!kode.startsWith('YYS-') && !kode.startsWith('PRD-'));
                        })
                        .map((produk: any) => (
                        <tr key={produk.produk_id} className="border-b hover:bg-muted/50">
                          <td className="p-3 font-mono text-sm">{produk.kode_produk}</td>
                          <td className="p-3">{produk.nama_produk}</td>
                          <td className="p-3">
                            <Badge variant="outline">{produk.kategori || '-'}</Badge>
                          </td>
                          <td className="p-3 text-right">
                            <span className={`font-semibold ${
                              produk.status_stock === 'habis' ? 'text-red-600' :
                              produk.status_stock === 'menipis' ? 'text-orange-600' :
                              'text-green-600'
                            }`}>
                              {Number(produk.stock || 0).toLocaleString('id-ID')}
                            </span>
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
                              <div>Rp {Number(produk.harga_jual_grosir || produk.harga_jual || 0).toLocaleString('id-ID')}</div>
                              <div className="text-xs text-muted-foreground">
                                ({calculateMargin(Number(produk.harga_beli || 0), Number(produk.harga_jual_grosir || produk.harga_jual || 0))}%)
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
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </CardContent>
          </Card>
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
                        <th className="text-right p-3">Stok</th>
                        <th className="text-right p-3">HPP Koperasi</th>
                        <th className="text-right p-3">Harga Jual</th>
                        <th className="text-left p-3">Status</th>
                        <th className="text-center p-3">Aksi</th>
                      </tr>
                    </thead>
                    <tbody>
                      {yayasanItems.map((item: any) => {
                        const kopBarang = item.kop_barang?.[0];
                        const isConfigured = !!kopBarang;
                        const hppKoperasi = kopBarang?.harga_beli ?? null;

                        return (
                          <tr key={item.id} className="border-b hover:bg-muted/50">
                            <td className="p-3 font-mono text-sm">{item.kode_inventaris || '-'}</td>
                            <td className="p-3">{item.nama_barang}</td>
                            <td className="p-3">
                              <Badge variant="outline">{item.kategori || '-'}</Badge>
                            </td>
                            <td className="p-3 text-right">
                              <span className={`font-semibold ${
                                (item.jumlah || 0) === 0 ? 'text-red-600' :
                                (item.jumlah || 0) <= (item.min_stock || 10) ? 'text-orange-600' :
                                'text-green-600'
                              }`}>
                                {Number(item.jumlah || 0).toLocaleString('id-ID')} {item.satuan || ''}
                              </span>
                            </td>
                            <td className="p-3 text-right">
                              {hppKoperasi && hppKoperasi > 0 ? (
                                <span className="text-sm font-medium">
                                  Rp {Number(hppKoperasi).toLocaleString('id-ID')}
                                </span>
                              ) : (
                                <span className="text-muted-foreground text-sm">-</span>
                              )}
                            </td>
                            <td className="p-3 text-right">
                              {isConfigured ? (
                                <div className="text-sm font-medium space-y-1">
                                  <div>
                                    Rp {Number(kopBarang.harga_jual_ecer || 0).toLocaleString('id-ID')}
                                    <span className="text-xs text-muted-foreground ml-1">(Ecer)</span>
                                  </div>
                                  {kopBarang.harga_jual_grosir ? (
                                    <div className="text-xs text-muted-foreground">
                                      Grosir: Rp {Number(kopBarang.harga_jual_grosir).toLocaleString('id-ID')}
                                    </div>
                                  ) : (
                                    <div className="text-xs text-muted-foreground">
                                      Grosir belum diatur
                                    </div>
                                  )}
                                </div>
                              ) : (
                                <span className="text-muted-foreground text-sm">-</span>
                              )}
                            </td>
                            <td className="p-3">
                              {isConfigured ? (
                                <Badge variant="default" className="gap-1">
                                  <Store className="h-3 w-3" />
                                  Terkonfigurasi
                                </Badge>
                              ) : (
                                <Badge variant="secondary">Belum Dikonfigurasi</Badge>
                              )}
                            </td>
                            <td className="p-3">
                              <div className="flex justify-center gap-2">
                                {isConfigured ? (
                                  <Button
                                    size="sm"
                                    variant="outline"
                                    onClick={() => handleUbahHarga(item)}
                                  >
                                    <DollarSign className="w-4 h-4 mr-1" />
                                    Ubah Harga
                                  </Button>
                                ) : (
                                  <Button
                                    size="sm"
                                    onClick={() => handleTambahKeDaftarJual(item)}
                                  >
                                    <Plus className="w-4 h-4 mr-1" />
                                    Tambah ke Daftar Jual
                                  </Button>
                                )}
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
        open={isDialogOpen}
        onClose={handleCloseDialog}
        produk={editingProduk}
      />

      {/* Dialog untuk set harga jual koperasi */}
      <Dialog open={hargaDialogOpen} onOpenChange={setHargaDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>
              {selectedYayasanItem?.kop_barang?.[0] ? 'Ubah Harga Jual' : 'Tambah ke Daftar Jual'}
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div>
              <Label>Nama Barang</Label>
              <p className="text-sm font-medium mt-1">{selectedYayasanItem?.nama_barang}</p>
            </div>
            <div>
              <Label>Kode Inventaris</Label>
              <p className="text-sm text-muted-foreground font-mono mt-1">
                {selectedYayasanItem?.kode_inventaris || '-'}
              </p>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div>
                <Label htmlFor="hpp-koperasi">HPP Koperasi (Rp)</Label>
                <Input
                  id="hpp-koperasi"
                  type="number"
                  value={hargaHppKoperasi}
                  onChange={(e) => setHargaHppKoperasi(e.target.value)}
                  placeholder="Contoh: 15000"
                  min="0"
                  step="100"
                />
                <p className="mt-1 text-[11px] text-muted-foreground">
                  HPP = harga yang disepakati antara Yayasan dan Koperasi.
                  Selisih antara harga jual dan HPP menjadi laba koperasi, HPP dicatat sebagai beban ke Yayasan.
                </p>
              </div>
              <div>
                <Label htmlFor="harga-ecer">Harga Ecer (Rp) *</Label>
                <Input
                  id="harga-ecer"
                  type="number"
                  value={hargaJualEcer}
                  onChange={(e) => setHargaJualEcer(e.target.value)}
                  placeholder="Harga ecer"
                  min="0"
                  step="100"
                />
              </div>
              <div>
                <Label htmlFor="harga-grosir">Harga Grosir (Rp) *</Label>
                <Input
                  id="harga-grosir"
                  type="number"
                  value={hargaJualGrosir}
                  onChange={(e) => setHargaJualGrosir(e.target.value)}
                  placeholder="Harga grosir"
                  min="0"
                  step="100"
                />
              </div>
            </div>
            {(hargaHppKoperasi || selectedYayasanItem?.hpp_yayasan) && (
              <div className="bg-muted/50 p-3 rounded-lg space-y-1">
                {hargaHppKoperasi && !isNaN(parseFloat(hargaHppKoperasi)) && (
                  <p className="text-xs text-muted-foreground flex justify-between">
                    <span>HPP Koperasi (transaksi ke Yayasan)</span>
                    <span className="font-medium">Rp {Number(parseFloat(hargaHppKoperasi)).toLocaleString('id-ID')}</span>
                  </p>
                )}
                {selectedYayasanItem?.hpp_yayasan && (
                  <p className="text-xs text-muted-foreground flex justify-between">
                    <span>HPP Referensi Yayasan</span>
                    <span className="font-medium">Rp {Number(selectedYayasanItem.hpp_yayasan).toLocaleString('id-ID')}</span>
                  </p>
                )}
                {hargaHppKoperasi && !isNaN(parseFloat(hargaHppKoperasi)) && hargaJualEcer && !isNaN(parseFloat(hargaJualEcer)) && (
                  <p className="text-xs text-muted-foreground flex justify-between">
                    <span>Margin Ecer (vs HPP Koperasi)</span>
                    <span className="font-medium text-green-600">
                      {((parseFloat(hargaJualEcer) - parseFloat(hargaHppKoperasi || '0')) / (parseFloat(hargaHppKoperasi || '1')) * 100).toFixed(1)}%
                    </span>
                  </p>
                )}
                {hargaHppKoperasi && !isNaN(parseFloat(hargaHppKoperasi)) && hargaJualGrosir && !isNaN(parseFloat(hargaJualGrosir)) && (
                  <p className="text-xs text-muted-foreground flex justify-between">
                    <span>Margin Grosir (vs HPP Koperasi)</span>
                    <span className="text-green-600 font-medium">
                      {((parseFloat(hargaJualGrosir) - parseFloat(hargaHppKoperasi || '0')) / (parseFloat(hargaHppKoperasi || '1')) * 100).toFixed(1)}%
                    </span>
                  </p>
                )}
              </div>
            )}
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => {
              setHargaDialogOpen(false);
              setSelectedYayasanItem(null);
              setHargaJualEcer('');
              setHargaJualGrosir('');
              setHargaHppKoperasi('');
            }}>
              Batal
            </Button>
            <Button 
              onClick={handleSaveHarga}
              disabled={saveHargaMutation.isPending}
            >
              {saveHargaMutation.isPending ? 'Menyimpan...' : 'Simpan'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

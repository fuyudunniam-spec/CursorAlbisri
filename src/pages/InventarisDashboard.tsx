import React, { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { RefreshCw, Package, AlertTriangle, Clock, TrendingUp, ShoppingCart, Gift, ArrowRight, FileText } from 'lucide-react';
import { toast } from 'sonner';
import { useNavigate } from 'react-router-dom';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Checkbox } from '@/components/ui/checkbox';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import ModuleHeader from '@/components/ModuleHeader';
import DonationItemsModal from '@/components/dashboard/inventaris/DonationItemsModal';
import RiwayatTransaksiInventaris from '@/components/dashboard/inventaris/RiwayatTransaksiInventaris';
import InventorySummaryCards from '@/components/dashboard/inventaris/InventorySummaryCards';
import InventoryChartsSection from '@/components/dashboard/inventaris/InventoryChartsSection';
import { 
  getInventoryDashboardStats, 
  getInventoryMonthlyData, 
  getInventoryConditionData,
  getPendingDonations
} from '@/services/inventarisDashboard.service';
import type {
  InventoryStats,
  InventoryMonthlyData,
  InventoryCategoryData,
  InventoryConditionData,
  PendingDonation
} from '@/services/inventarisDashboard.service';
import { getLowStock, getNearExpiry, listTransactions } from '@/services/inventaris.service';
import { supabase } from '@/integrations/supabase/client';

interface LowStockItem {
  id: string;
  nama_barang: string;
  jumlah: number | null;
  min_stock: number | null;
}

interface NearExpiryItem {
  id: string;
  nama_barang: string;
  tanggal_kedaluwarsa: string | null;
}

interface RecentTransaction {
  id: string;
  tipe: string;
  tanggal: string;
  jumlah: number | null;
  masuk_mode?: string | null;
  keluar_mode?: string | null;
  referensi_donation_id?: string | null;
  nama_barang?: string;
  kategori?: string;
  satuan?: string;
  penerima?: string | null;
  catatan?: string | null;
  harga_satuan?: number | null;
  harga_total?: number | null;
  before_qty?: number | null;
  after_qty?: number | null;
  created_at: string;
  inventaris?: {
    nama_barang: string;
    satuan: string;
  } | null;
}

const InventarisDashboard: React.FC = () => {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  
  const [statistics, setStatistics] = useState<InventoryStats | null>(null);
  const [monthlyData, setMonthlyData] = useState<InventoryMonthlyData[]>([]);
  const [categoryData, setCategoryData] = useState<InventoryCategoryData[]>([]);
  const [pendingDonations, setPendingDonations] = useState<PendingDonation[]>([]);
  const [lowStockItems, setLowStockItems] = useState<LowStockItem[]>([]);
  const [nearExpiryItems, setNearExpiryItems] = useState<NearExpiryItem[]>([]);
  const [recentTransactions, setRecentTransactions] = useState<RecentTransaction[]>([]);
  const [selectedDonation, setSelectedDonation] = useState<PendingDonation | null>(null);
  const [showDonationModal, setShowDonationModal] = useState(false);
  const [selectedDonationIds, setSelectedDonationIds] = useState<Set<string>>(new Set());
  const [postingBulk, setPostingBulk] = useState(false);
  
  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      setLoading(true);
      
      // Load data utama secara parallel untuk performa lebih baik
      const [stats, monthly, condition, pending] = await Promise.all([
        getInventoryDashboardStats(),
        getInventoryMonthlyData(),
        getInventoryConditionData(),
        getPendingDonations()
      ]);
      
      setStatistics(stats);
      setMonthlyData(monthly);
      setCategoryData(condition); // Using condition data instead of category
      setPendingDonations(pending);
      
      // Set loading false setelah data utama selesai (tidak perlu tunggu data sekunder)
      setLoading(false);
      
      // Load data sekunder secara parallel di background (tidak blocking UI)
      Promise.all([
        getLowStock(10).then(result => {
          setLowStockItems((result || []) as LowStockItem[]);
        }).catch(() => {
          setLowStockItems([]);
        }),
        getNearExpiry(30).then(result => {
          setNearExpiryItems((result || []) as NearExpiryItem[]);
        }).catch(() => {
          setNearExpiryItems([]);
        }),
        // Load transaksi dengan jumlah lebih sedikit untuk initial load (bisa di-load lebih banyak saat user scroll/filter)
        listTransactions(
          { page: 1, pageSize: 100 }, // Kurangi dari 500 ke 100 untuk initial load yang lebih cepat
          {} // Tidak ada filter tanggal, ambil semua transaksi
        ).then(transactionsResult => {
          if (transactionsResult?.data) {
            // Transform data untuk kompatibilitas dengan komponen tabel
            const transformed = transactionsResult.data.map((tx: any) => ({
              id: tx.id,
              tipe: tx.tipe,
              tanggal: tx.tanggal,
              jumlah: tx.jumlah,
              masuk_mode: tx.masuk_mode,
              keluar_mode: tx.keluar_mode,
              nama_barang: tx.inventaris?.nama_barang || tx.nama_barang || 'Item',
              kategori: tx.inventaris?.kategori || tx.kategori,
              satuan: tx.inventaris?.satuan || tx.satuan,
              penerima: tx.penerima,
              catatan: tx.catatan,
              harga_satuan: tx.harga_satuan,
              harga_total: tx.harga_total,
              before_qty: tx.before_qty,
              after_qty: tx.after_qty,
              created_at: tx.created_at,
              referensi_distribusi_paket_id: tx.referensi_distribusi_paket_id,
              distribusi_paket: tx.distribusi_paket
            }));
            
            setRecentTransactions(transformed as RecentTransaction[]);
          }
        }).catch(err => {
          console.error('Error loading transactions:', err);
          setRecentTransactions([]);
        })
      ]).catch(err => {
        console.error('Error loading secondary data:', err);
      });
      
    } catch (error) {
      console.error('Error loading data:', error);
      toast.error('Gagal memuat data inventaris');
      setLoading(false);
    }
  };

  const handleRefresh = async () => {
    setRefreshing(true);
    await loadData();
    setRefreshing(false);
    toast.success('Data berhasil diperbarui');
  };

  const handlePostToStock = async (donationId: string) => {
    try {
      const { data: userData } = await supabase.auth.getUser();
      const userId = userData.user?.id;

      const { data, error } = await supabase
        .rpc('process_all_donation_items', {
          p_donation_id: donationId,
          p_default_location: 'Gudang Utama',
          p_user_id: userId
        });

      if (error) throw error;

      const inventoryCount = data.inventory_posted || 0;
      const consumptionCount = data.consumption_processed || 0;

      if (inventoryCount > 0 && consumptionCount > 0) {
        toast.success(`${inventoryCount} item masuk inventaris, ${consumptionCount} item langsung dikonsumsi`);
      } else if (inventoryCount > 0) {
        toast.success(`${inventoryCount} item berhasil diterima ke gudang!`);
      } else if (consumptionCount > 0) {
        toast.success(`${consumptionCount} item langsung dikonsumsi dicatat!`);
      }

      if (data.total_errors > 0) {
        toast.warning(`${data.total_errors} item gagal diproses`);
      }

      // Refresh semua data setelah posting
      await loadData();
      
      // Close modal jika terbuka
      setShowDonationModal(false);
      setSelectedDonation(null);
    } catch (error) {
      console.error("Error posting to stock:", error);
      toast.error("Gagal memposting ke gudang");
    }
  };

  const handleBulkPostToStock = async () => {
    if (selectedDonationIds.size === 0) {
      toast.error("Pilih minimal 1 donasi untuk diposting");
      return;
    }

    try {
      setPostingBulk(true);
      const { data: userData } = await supabase.auth.getUser();
      const userId = userData.user?.id;

      let totalInventoryPosted = 0;
      let totalConsumptionProcessed = 0;
      let totalErrors = 0;
      let successCount = 0;

      // Post setiap donasi yang dipilih
      for (const donationId of selectedDonationIds) {
        try {
          const { data, error } = await supabase
            .rpc('process_all_donation_items', {
              p_donation_id: donationId,
              p_default_location: 'Gudang Utama',
              p_user_id: userId
            });

          if (error) throw error;

          totalInventoryPosted += data.inventory_posted || 0;
          totalConsumptionProcessed += data.consumption_processed || 0;
          totalErrors += data.total_errors || 0;
          successCount++;
        } catch (error) {
          console.error(`Error posting donation ${donationId}:`, error);
          totalErrors++;
        }
      }

      // Tampilkan hasil
      if (successCount > 0) {
        const messages = [];
        if (totalInventoryPosted > 0) {
          messages.push(`${totalInventoryPosted} item masuk inventaris`);
        }
        if (totalConsumptionProcessed > 0) {
          messages.push(`${totalConsumptionProcessed} item langsung dikonsumsi`);
        }
        toast.success(`${successCount} donasi berhasil diposting. ${messages.join(', ')}`);
      }

      if (totalErrors > 0) {
        toast.warning(`${totalErrors} donasi gagal diproses`);
      }

      // Refresh semua data setelah posting masal
      await loadData();
      
      // Reset seleksi
      setSelectedDonationIds(new Set());
      
      // Close modal jika terbuka
      setShowDonationModal(false);
      setSelectedDonation(null);
    } catch (error) {
      console.error("Error bulk posting to stock:", error);
      toast.error("Gagal memposting donasi ke gudang");
    } finally {
      setPostingBulk(false);
    }
  };

  const handleToggleDonationSelection = (donationId: string) => {
    const newSelection = new Set(selectedDonationIds);
    if (newSelection.has(donationId)) {
      newSelection.delete(donationId);
    } else {
      newSelection.add(donationId);
    }
    setSelectedDonationIds(newSelection);
  };

  const handleSelectAll = () => {
    if (selectedDonationIds.size === pendingDonations.length) {
      setSelectedDonationIds(new Set());
    } else {
      setSelectedDonationIds(new Set(pendingDonations.map(d => d.id)));
    }
  };

  const handleViewDonationItems = (donation: PendingDonation) => {
    setSelectedDonation(donation);
    setShowDonationModal(true);
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('id-ID', {
      style: 'currency',
      currency: 'IDR',
      minimumFractionDigits: 0,
    }).format(amount);
  };

  const formatDate = (dateString: string) => {
    try {
      return new Date(dateString).toLocaleDateString('id-ID', {
        day: 'numeric',
        month: 'short',
        year: 'numeric'
      });
    } catch {
      return dateString;
    }
  };

  const tabs = [
    { label: 'Dashboard', path: '/inventaris' },
    { label: 'Master Data', path: '/inventaris/master' },
    { label: 'Transfer', path: '/inventaris/transfer' },
    { label: 'Distribusi', path: '/inventaris/distribution' }
  ];

  if (loading) {
    return (
      <div className="space-y-6">
        <ModuleHeader title="Inventaris" tabs={tabs} />
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          {[...Array(4)].map((_, i) => (
            <Card key={i}>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <div className="h-4 w-24 bg-gray-200 rounded animate-pulse"></div>
                <div className="h-4 w-4 bg-gray-200 rounded animate-pulse"></div>
              </CardHeader>
              <CardContent>
                <div className="h-8 w-32 bg-gray-200 rounded animate-pulse mb-2"></div>
                <div className="h-3 w-20 bg-gray-200 rounded animate-pulse"></div>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <ModuleHeader title="Inventaris" tabs={tabs} />
      
      {/* Header dengan Action Buttons */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-gray-900">Dashboard</h2>
          <p className="text-sm text-gray-600 mt-1">Ringkasan Inventaris Bulan Ini</p>
        </div>
        <div className="flex items-center gap-2">
          <Button
            variant="ghost"
            size="sm"
            onClick={handleRefresh}
            disabled={refreshing}
            className="text-gray-600 hover:text-gray-900"
          >
            <RefreshCw className={`h-4 w-4 mr-2 ${refreshing ? 'animate-spin' : ''}`} />
            Refresh
          </Button>
        </div>
      </div>

      {/* Pending Donations Table - Minimalis & Elegan */}
      {pendingDonations.length > 0 && (
        <Card className="border-orange-200 bg-orange-50/50">
          <CardHeader className="pb-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Gift className="h-5 w-5 text-orange-600" />
                <CardTitle className="text-base font-semibold text-orange-900">
                  Donasi Belum Diposting
                </CardTitle>
                <Badge className="bg-orange-200 text-orange-800">{pendingDonations.length}</Badge>
              </div>
              <div className="flex items-center gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => {
                    const firstDonation = pendingDonations[0];
                    if (firstDonation) {
                      handleViewDonationItems(firstDonation);
                    }
                  }}
                  className="text-xs h-7 border-gray-300"
                >
                  <FileText className="h-3 w-3 mr-1" />
                  Lihat Rincian
                </Button>
                <Button
                  size="sm"
                  onClick={handleBulkPostToStock}
                  disabled={postingBulk || selectedDonationIds.size === 0}
                  className="bg-orange-600 hover:bg-orange-700 text-white text-xs h-7"
                >
                  {postingBulk ? (
                    <>
                      <RefreshCw className="h-3 w-3 mr-1 animate-spin" />
                      Memproses...
                    </>
                  ) : (
                    <>
                      Post ke Gudang ({selectedDonationIds.size})
                    </>
                  )}
                </Button>
              </div>
            </div>
          </CardHeader>
          <CardContent>
            <div className="border border-orange-200 rounded-lg bg-white overflow-hidden">
              <Table>
                <TableHeader>
                  <TableRow className="bg-orange-50/50">
                    <TableHead className="w-12">
                      <Checkbox
                        checked={selectedDonationIds.size === pendingDonations.length && pendingDonations.length > 0}
                        onCheckedChange={handleSelectAll}
                      />
                    </TableHead>
                    <TableHead className="font-semibold">Donatur</TableHead>
                    <TableHead className="font-semibold">Tanggal</TableHead>
                    <TableHead className="font-semibold">Jumlah Item</TableHead>
                    <TableHead className="font-semibold text-right">Aksi</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {pendingDonations.map((donation) => (
                    <TableRow key={donation.id} className="hover:bg-orange-50/30">
                      <TableCell>
                        <Checkbox
                          checked={selectedDonationIds.has(donation.id)}
                          onCheckedChange={() => handleToggleDonationSelection(donation.id)}
                        />
                      </TableCell>
                      <TableCell className="font-medium">{donation.donor_name}</TableCell>
                      <TableCell className="text-sm text-gray-600">
                        {formatDate(donation.donation_date)}
                      </TableCell>
                      <TableCell>
                        <Badge variant="outline" className="bg-blue-50 text-blue-700 border-blue-200">
                          {donation.items_count} item
                        </Badge>
                      </TableCell>
                      <TableCell className="text-right">
                        <Button
                          size="sm"
                          variant="ghost"
                          onClick={() => handleViewDonationItems(donation)}
                          className="text-xs h-7 text-gray-600 hover:text-gray-900"
                        >
                          Detail
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Donation Items Modal - Single Donation */}
      <DonationItemsModal
        donation={selectedDonation}
        open={showDonationModal}
        onClose={() => {
          setShowDonationModal(false);
          setSelectedDonation(null);
        }}
      />

      {/* Main Stats Cards */}
      {statistics && (
        <InventorySummaryCards stats={statistics} />
      )}

      {/* Secondary Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card className="hover:shadow-md transition-shadow duration-200 rounded-lg border border-gray-200 bg-white">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-3 pt-4 px-4">
            <CardTitle className="text-xs font-medium text-gray-500 uppercase tracking-wide">Kedaluwarsa</CardTitle>
            <Clock className="h-5 w-5 text-red-600 opacity-70" />
          </CardHeader>
          <CardContent className="px-4 pb-4">
            <div className="text-xl font-semibold text-gray-900 mb-1.5 tracking-tight text-red-600">
              {statistics?.nearExpiryItems || 0}
            </div>
            <div className="text-xs text-gray-600">&lt; 30 hari</div>
          </CardContent>
        </Card>

        <Card className="hover:shadow-md transition-shadow duration-200 rounded-lg border border-gray-200 bg-white">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-3 pt-4 px-4">
            <CardTitle className="text-xs font-medium text-gray-500 uppercase tracking-wide">Total Transaksi</CardTitle>
            <FileText className="h-5 w-5 text-gray-600 opacity-70" />
          </CardHeader>
          <CardContent className="px-4 pb-4">
            <div className="text-xl font-semibold text-gray-900 mb-1.5 tracking-tight">
              {statistics?.totalTransactions || 0}
            </div>
            <div className="text-xs text-gray-600">Semua waktu</div>
          </CardContent>
        </Card>

        <Card className="hover:shadow-md transition-shadow duration-200 rounded-lg border border-gray-200 bg-white">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-3 pt-4 px-4">
            <CardTitle className="text-xs font-medium text-gray-500 uppercase tracking-wide">Donasi Pending</CardTitle>
            <Gift className="h-5 w-5 text-orange-600 opacity-70" />
          </CardHeader>
          <CardContent className="px-4 pb-4">
            <div className="text-xl font-semibold text-gray-900 mb-1.5 tracking-tight text-orange-600">
              {statistics?.pendingDonations || 0}
            </div>
            <div className="text-xs text-gray-600">{statistics?.pendingDonationItems || 0} item menunggu</div>
          </CardContent>
        </Card>
      </div>

      {/* Charts Section */}
      <InventoryChartsSection 
        monthlyData={monthlyData}
        categoryData={categoryData}
      />

      {/* Tabs untuk Alerts dan Riwayat Transaksi */}
      <Tabs defaultValue="riwayat" className="space-y-4">
        <TabsList className="grid w-full grid-cols-2">
          <TabsTrigger value="riwayat" className="flex items-center gap-2">
            <FileText className="h-4 w-4" />
            Riwayat Transaksi
            {recentTransactions.length > 0 && (
              <Badge variant="secondary" className="ml-1">{recentTransactions.length}</Badge>
            )}
          </TabsTrigger>
          <TabsTrigger value="alerts" className="flex items-center gap-2">
            <AlertTriangle className="h-4 w-4" />
            Peringatan
            {(lowStockItems.length > 0 || nearExpiryItems.length > 0) && (
              <Badge variant="destructive" className="ml-1">
                {lowStockItems.length + nearExpiryItems.length}
              </Badge>
            )}
          </TabsTrigger>
        </TabsList>

        <TabsContent value="riwayat" className="space-y-4">
          <RiwayatTransaksiInventaris
            transactions={recentTransactions.map(tx => ({
              id: tx.id,
              tanggal: tx.tanggal,
              tipe: tx.tipe as 'Masuk' | 'Keluar' | 'Stocktake',
              keluar_mode: tx.keluar_mode,
              masuk_mode: tx.masuk_mode,
              nama_barang: tx.nama_barang || tx.inventaris?.nama_barang || 'Item',
              kategori: tx.kategori,
              jumlah: tx.jumlah || 0,
              satuan: tx.satuan || tx.inventaris?.satuan,
              penerima: tx.penerima,
              catatan: tx.catatan,
              harga_satuan: tx.harga_satuan,
              harga_total: tx.harga_total,
              before_qty: tx.before_qty,
              after_qty: tx.after_qty,
              created_at: tx.created_at,
              referensi_distribusi_paket_id: tx.referensi_donation_id
            }))}
            compact={false}
            onRefresh={loadData}
            onNavigateToModule={(module) => {
              if (module === 'distribusi') {
                navigate('/inventaris/distribution');
              } else if (module === 'master') {
                navigate('/inventaris/master');
              } else if (module === 'penjualan') {
                navigate('/koperasi/kasir');
              } else if (module === 'transactions') {
                // Stay on current page (already showing transactions)
              }
            }}
          />
        </TabsContent>

        <TabsContent value="alerts" className="space-y-4">
          {(lowStockItems.length > 0 || nearExpiryItems.length > 0) ? (
            <Card className="rounded-lg border border-gray-200 shadow-sm bg-white">
              <CardHeader className="pb-3">
                <div className="flex items-center justify-between">
                  <CardTitle className="text-base font-semibold flex items-center gap-2">
                    <AlertTriangle className="h-5 w-5 text-orange-600" />
                    Peringatan
                  </CardTitle>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => {
                      if (lowStockItems.length > 0 && nearExpiryItems.length > 0) {
                        navigate('/inventaris/master?filter=alerts');
                      } else if (lowStockItems.length > 0) {
                        navigate('/inventaris/master?filter=low_stock');
                      } else if (nearExpiryItems.length > 0) {
                        navigate('/inventaris/master?filter=near_expiry');
                      } else {
                        navigate('/inventaris/master');
                      }
                    }}
                    className="text-xs h-7"
                  >
                    Lihat Semua
                    <ArrowRight className="h-3 w-3 ml-1" />
                  </Button>
                </div>
              </CardHeader>
              <CardContent className="space-y-3">
                {lowStockItems.length > 0 && (
                  <div>
                    <div className="flex items-center gap-2 mb-2">
                      <AlertTriangle className="h-4 w-4 text-orange-600" />
                      <span className="text-sm font-medium">Stok Menipis ({lowStockItems.length})</span>
                    </div>
                    <div className="space-y-1.5">
                      {lowStockItems.slice(0, 5).map((item) => {
                        const qty = item.jumlah || 0;
                        const displayQty = qty === 0 ? 'Habis' : qty.toString();
                        return (
                          <div key={item.id} className="flex items-center justify-between p-2 bg-orange-50 rounded text-sm">
                            <span className="font-medium text-gray-900">{item.nama_barang}</span>
                            <span className="text-gray-600">
                              {displayQty}
                              {qty !== 0 && item.min_stock && ` / ${item.min_stock}`}
                            </span>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                )}
                
                {nearExpiryItems.length > 0 && (
                  <div>
                    <div className="flex items-center gap-2 mb-2">
                      <Clock className="h-4 w-4 text-red-600" />
                      <span className="text-sm font-medium">Kedaluwarsa ({nearExpiryItems.length})</span>
                    </div>
                    <div className="space-y-1.5">
                      {nearExpiryItems.slice(0, 5).map((item) => (
                        <div key={item.id} className="flex items-center justify-between p-2 bg-red-50 rounded text-sm">
                          <span className="font-medium text-gray-900">{item.nama_barang}</span>
                          <span className="text-gray-600">
                            {item.tanggal_kedaluwarsa ? formatDate(item.tanggal_kedaluwarsa) : 'Tidak diketahui'}
                          </span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>
          ) : (
            <Card className="rounded-lg border border-gray-200 shadow-sm bg-white">
              <CardContent className="py-12 text-center">
                <AlertTriangle className="h-12 w-12 mx-auto mb-4 text-gray-400 opacity-50" />
                <p className="text-gray-600">Tidak ada peringatan saat ini</p>
              </CardContent>
            </Card>
          )}
        </TabsContent>
      </Tabs>
    </div>
  );
};

export default InventarisDashboard;

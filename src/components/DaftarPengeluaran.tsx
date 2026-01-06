import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { 
  Search,
  Filter,
  Download,
  Eye,
  Edit,
  Trash2,
  RefreshCw,
  Calendar,
  DollarSign,
  Users,
  FileText
} from 'lucide-react';
import { supabase } from '../integrations/supabase/client';
import { AkunKasService, AkunKas } from '../services/akunKas.service';
import { toast } from 'sonner';

interface FilterState {
  search: string;
  startDate: string;
  endDate: string;
  kategori: string;
  akun_kas_id: string;
}

const DaftarPengeluaran: React.FC = () => {
  const [data, setData] = useState<KeuanganWithDetails[]>([]);
  const [akunKasOptions, setAkunKasOptions] = useState<AkunKas[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [selectedItem, setSelectedItem] = useState<KeuanganWithDetails | null>(null);
  const [showDetailModal, setShowDetailModal] = useState(false);
  
  const [filters, setFilters] = useState<FilterState>({
    search: '',
    startDate: '',
    endDate: '',
    kategori: 'all',
    akun_kas_id: 'all'
  });

  // Load initial data
  useEffect(() => {
    loadData();
    loadAkunKas();
  }, []);

  const loadData = async () => {
    try {
      setLoading(true);
      const { data: result, error } = await supabase
        .from('keuangan')
        .select(`
          *,
          akun_kas:akun_kas_id(nama),
          rincian_pengeluaran(*),
          alokasi_pengeluaran_santri(
            id,
            santri_id,
            nominal_alokasi,
            jenis_bantuan,
            periode,
            keterangan,
            santri:santri_id(
              id,
              nama_lengkap,
              nisn,
              id_santri
            )
          )
        `)
        .eq('jenis_transaksi', 'Pengeluaran')
        .order('tanggal', { ascending: false });
      
      if (error) throw error;
      // Filter hanya pengeluaran dan map alokasi_santri
      const pengeluaranData = result
        .filter(item => item.jenis_transaksi === 'Pengeluaran')
        .map(item => {
          const alokasiSantri = item.alokasi_pengeluaran_santri || [];
          // Debug log untuk melihat apakah data alokasi ter-fetch
          if (alokasiSantri.length > 0) {
            console.log('[DaftarPengeluaran] Found alokasi santri:', {
              keuangan_id: item.id,
              kategori: item.kategori,
              jumlah_alokasi: alokasiSantri.length,
              alokasi: alokasiSantri
            });
          }
          return {
            ...item,
            alokasi_santri: alokasiSantri
          };
        });
      setData(pengeluaranData);
    } catch (error) {
      console.error('Error loading data:', error);
      toast.error('Gagal memuat data pengeluaran');
    } finally {
      setLoading(false);
    }
  };

  const loadAkunKas = async () => {
    try {
      const akunKas = await AkunKasService.getAll();
      setAkunKasOptions(akunKas);
    } catch (error) {
      console.error('Error loading akun kas:', error);
    }
  };

  const handleRefresh = async () => {
    setRefreshing(true);
    await loadData();
    setRefreshing(false);
    toast.success('Data berhasil diperbarui');
  };

  const handleFilterChange = (key: keyof FilterState, value: string) => {
    setFilters(prev => ({ ...prev, [key]: value }));
  };

  const filteredData = data.filter(item => {
    // Search filter
    if (filters.search) {
      const searchLower = filters.search.toLowerCase();
      const matchesSearch = 
        item.deskripsi?.toLowerCase().includes(searchLower) ||
        item.kategori?.toLowerCase().includes(searchLower) ||
        item.referensi?.toLowerCase().includes(searchLower);
      if (!matchesSearch) return false;
    }

    // Date filter
    if (filters.startDate && item.tanggal < filters.startDate) return false;
    if (filters.endDate && item.tanggal > filters.endDate) return false;

    // Kategori filter
    if (filters.kategori && filters.kategori !== 'all' && item.kategori !== filters.kategori) return false;

    // Akun kas filter
    if (filters.akun_kas_id && filters.akun_kas_id !== 'all' && item.akun_kas_id !== filters.akun_kas_id) return false;

    return true;
  });

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('id-ID', {
      style: 'currency',
      currency: 'IDR',
      minimumFractionDigits: 0,
    }).format(amount);
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('id-ID');
  };

  const handleViewDetail = async (item: KeuanganWithDetails) => {
    // Selalu fetch alokasi santri secara terpisah untuk memastikan data ter-update
    // karena mungkin ada masalah dengan nested query di Supabase
    let alokasiSantri: any[] = [];
    
    try {
      // Fetch alokasi santri secara terpisah untuk kategori yang seharusnya punya alokasi
      if (item.kategori === 'Pendidikan Formal' || 
          item.kategori === 'Bantuan Langsung Yayasan' ||
          item.kategori === 'Operasional dan Konsumsi Santri') {
        const { data: alokasiData, error: alokasiError } = await supabase
          .from('alokasi_pengeluaran_santri')
          .select(`
            id,
            santri_id,
            nominal_alokasi,
            jenis_bantuan,
            periode,
            keterangan,
            santri:santri_id(
              id,
              nama_lengkap,
              nisn,
              id_santri
            )
          `)
          .eq('keuangan_id', item.id);
        
        if (!alokasiError && alokasiData) {
          alokasiSantri = alokasiData;
          console.log('[DaftarPengeluaran] Fetched alokasi santri:', {
            keuangan_id: item.id,
            kategori: item.kategori,
            jumlah: alokasiSantri.length,
            data: alokasiSantri
          });
        } else if (alokasiError) {
          console.error('[DaftarPengeluaran] Error fetching alokasi santri:', alokasiError);
        }
      } else {
        // Untuk kategori lain, gunakan data dari item jika ada
        alokasiSantri = item.alokasi_santri || [];
      }
    } catch (error) {
      console.error('[DaftarPengeluaran] Error fetching alokasi santri:', error);
      // Fallback ke data dari item jika error
      alokasiSantri = item.alokasi_santri || [];
    }
    
    // Debug log untuk melihat data alokasi saat view detail
    console.log('[DaftarPengeluaran] View detail:', {
      keuangan_id: item.id,
      kategori: item.kategori,
      alokasi_santri: alokasiSantri,
      alokasi_length: alokasiSantri?.length || 0,
      original_alokasi: item.alokasi_santri
    });
    
    setSelectedItem({
      ...item,
      alokasi_santri: alokasiSantri
    });
    setShowDetailModal(true);
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Apakah Anda yakin ingin menghapus transaksi ini?')) return;

    try {
      const { error } = await supabase
        .from('keuangan')
        .delete()
        .eq('id', id);
      
      if (error) throw error;
      toast.success('Transaksi berhasil dihapus');
      await loadData();
    } catch (error) {
      console.error('Error deleting transaction:', error);
      toast.error('Gagal menghapus transaksi');
    }
  };

  const handleExport = () => {
    // Simple CSV export
    const csvContent = [
      ['Tanggal', 'Kategori', 'Deskripsi', 'Nominal', 'Akun Kas', 'Status'].join(','),
      ...filteredData.map(item => [
        formatDate(item.tanggal),
        item.kategori || '',
        item.deskripsi || '',
        item.jumlah,
        item.akun_kas?.nama || '',
        item.status || ''
      ].join(','))
    ].join('\n');

    const blob = new Blob([csvContent], { type: 'text/csv' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `pengeluaran_${new Date().toISOString().split('T')[0]}.csv`;
    a.click();
    window.URL.revokeObjectURL(url);
    
    toast.success('Data berhasil diekspor');
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-8">
        <div className="flex flex-col items-center space-y-4">
          <RefreshCw className="h-8 w-8 animate-spin" />
          <p className="text-muted-foreground">Memuat data pengeluaran...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold tracking-tight">Daftar Pengeluaran</h2>
          <p className="text-muted-foreground">
            Riwayat semua pengeluaran dengan detail rincian dan alokasi santri
          </p>
        </div>
        <div className="flex items-center space-x-2">
          <Button
            variant="outline"
            size="sm"
            onClick={handleExport}
            disabled={filteredData.length === 0}
          >
            <Download className="h-4 w-4 mr-2" />
            Export CSV
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={handleRefresh}
            disabled={refreshing}
          >
            <RefreshCw className={`h-4 w-4 mr-2 ${refreshing ? 'animate-spin' : ''}`} />
            Refresh
          </Button>
        </div>
      </div>

      {/* Filters */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Filter className="h-5 w-5" />
            Filter Data
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4">
            <div className="space-y-2">
              <label className="text-sm font-medium">Pencarian</label>
              <Input
                placeholder="Cari deskripsi, kategori..."
                value={filters.search}
                onChange={(e) => handleFilterChange('search', e.target.value)}
                className="h-9"
              />
            </div>
            
            <div className="space-y-2">
              <label className="text-sm font-medium">Tanggal Mulai</label>
              <Input
                type="date"
                value={filters.startDate}
                onChange={(e) => handleFilterChange('startDate', e.target.value)}
                className="h-9"
              />
            </div>
            
            <div className="space-y-2">
              <label className="text-sm font-medium">Tanggal Akhir</label>
              <Input
                type="date"
                value={filters.endDate}
                onChange={(e) => handleFilterChange('endDate', e.target.value)}
                className="h-9"
              />
            </div>
            
            <div className="space-y-2">
              <label className="text-sm font-medium">Kategori</label>
              <Select value={filters.kategori} onValueChange={(value) => handleFilterChange('kategori', value)}>
                <SelectTrigger className="h-9">
                  <SelectValue placeholder="Semua kategori" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Semua kategori</SelectItem>
                  <SelectItem value="Operasional">Operasional</SelectItem>
                  <SelectItem value="Kebutuhan Santri Bantuan">Kebutuhan Santri Bantuan</SelectItem>
                  <SelectItem value="Gaji & Honor">Gaji & Honor</SelectItem>
                  <SelectItem value="Utilitas">Utilitas</SelectItem>
                  <SelectItem value="Lainnya">Lainnya</SelectItem>
                </SelectContent>
              </Select>
            </div>
            
            <div className="space-y-2">
              <label className="text-sm font-medium">Akun Kas</label>
              <Select value={filters.akun_kas_id} onValueChange={(value) => handleFilterChange('akun_kas_id', value)}>
                <SelectTrigger className="h-9">
                  <SelectValue placeholder="Semua akun" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Semua akun</SelectItem>
                  {akunKasOptions.map(akun => (
                    <SelectItem key={akun.id} value={akun.id}>
                      {akun.nama}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Data Table */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center justify-between">
            <span>Riwayat Pengeluaran ({filteredData.length} data)</span>
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="rounded-md border">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Tanggal</TableHead>
                  <TableHead>Kategori</TableHead>
                  <TableHead>Deskripsi</TableHead>
                  <TableHead className="text-right">Nominal</TableHead>
                  <TableHead>Akun Kas</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead className="text-center">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredData.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={7} className="text-center py-8 text-muted-foreground">
                      Tidak ada data pengeluaran
                    </TableCell>
                  </TableRow>
                ) : (
                  filteredData.map((item) => (
                    <TableRow key={item.id}>
                      <TableCell>{formatDate(item.tanggal)}</TableCell>
                      <TableCell>
                        <Badge variant="outline">{item.kategori}</Badge>
                      </TableCell>
                      <TableCell className="max-w-xs truncate">
                        {item.deskripsi || `${item.sub_kategori || ''}${item.penerima_pembayar ? ` - ${item.penerima_pembayar}` : ''}`}
                      </TableCell>
                      <TableCell className="text-right font-medium">
                        {formatCurrency(item.jumlah)}
                      </TableCell>
                      <TableCell>
                        <Badge variant="secondary">
                          {item.akun_kas?.nama || 'N/A'}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        <Badge variant={item.status === 'posted' ? 'default' : 'secondary'}>
                          {item.status}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-center">
                        <div className="flex items-center justify-center gap-2">
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => handleViewDetail(item)}
                          >
                            <Eye className="h-4 w-4" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => handleDelete(item.id)}
                            className="text-red-600 hover:text-red-700"
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>

      {/* Detail Modal */}
      <Dialog open={showDetailModal} onOpenChange={setShowDetailModal}>
        <DialogContent className="max-w-4xl max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Detail Pengeluaran</DialogTitle>
          </DialogHeader>
          
          {selectedItem && (
            <div className="space-y-6">
              {/* Basic Info */}
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="text-sm font-medium text-muted-foreground">Tanggal</label>
                  <p className="text-sm">{formatDate(selectedItem.tanggal)}</p>
                </div>
                <div>
                  <label className="text-sm font-medium text-muted-foreground">Kategori</label>
                  <p className="text-sm">{selectedItem.kategori}</p>
                </div>
                <div>
                  <label className="text-sm font-medium text-muted-foreground">Nominal</label>
                  <p className="text-sm font-medium">{formatCurrency(selectedItem.jumlah)}</p>
                </div>
                <div>
                  <label className="text-sm font-medium text-muted-foreground">Akun Kas</label>
                  <p className="text-sm">{selectedItem.akun_kas?.nama}</p>
                </div>
              </div>

              {/* Deskripsi */}
              <div>
                <label className="text-sm font-medium text-muted-foreground">Deskripsi</label>
                <p className="text-sm">{selectedItem.deskripsi}</p>
              </div>

              {/* Rincian Items */}
              {selectedItem.rincian_items && selectedItem.rincian_items.length > 0 && (
                <div>
                  <h4 className="text-sm font-medium mb-2">Rincian Items</h4>
                  <div className="border rounded-md">
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>Item</TableHead>
                          <TableHead>Jumlah</TableHead>
                          <TableHead>Harga Satuan</TableHead>
                          <TableHead className="text-right">Total</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {selectedItem.rincian_items.map((item, index) => (
                          <TableRow key={index}>
                            <TableCell>{item.nama_item}</TableCell>
                            <TableCell>{item.jumlah} {item.satuan}</TableCell>
                            <TableCell>{formatCurrency(item.harga_satuan)}</TableCell>
                            <TableCell className="text-right font-medium">
                              {formatCurrency(item.total)}
                            </TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </div>
                </div>
              )}

              {/* Alokasi Santri */}
              {(() => {
                const alokasiSantri = selectedItem.alokasi_santri || [];
                const hasAlokasi = Array.isArray(alokasiSantri) && alokasiSantri.length > 0;
                
                // Debug untuk kategori yang seharusnya punya alokasi
                if ((selectedItem.kategori === 'Pendidikan Formal' || 
                     selectedItem.kategori === 'Bantuan Langsung Yayasan') && 
                    !hasAlokasi) {
                  console.warn('[DaftarPengeluaran] Expected alokasi but not found:', {
                    keuangan_id: selectedItem.id,
                    kategori: selectedItem.kategori,
                    alokasi_santri: alokasiSantri,
                    alokasi_pengeluaran_santri: (selectedItem as any).alokasi_pengeluaran_santri
                  });
                }
                
                return hasAlokasi;
              })() && (
                <div>
                  <h4 className="text-sm font-medium mb-2">Alokasi Santri</h4>
                  <div className="border rounded-md">
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>Santri</TableHead>
                          <TableHead>ID Santri</TableHead>
                          <TableHead>Jenis Bantuan</TableHead>
                          <TableHead>Periode</TableHead>
                          <TableHead className="text-right">Nominal</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {(selectedItem.alokasi_santri || []).map((alloc: any, index: number) => (
                          <TableRow key={alloc.id || index}>
                            <TableCell>{alloc.santri?.nama_lengkap || 'Tidak Diketahui'}</TableCell>
                            <TableCell>{alloc.santri?.id_santri || alloc.santri?.nisn || '-'}</TableCell>
                            <TableCell>{alloc.jenis_bantuan || '-'}</TableCell>
                            <TableCell>{alloc.periode || '-'}</TableCell>
                            <TableCell className="text-right font-medium">
                              {formatCurrency(alloc.nominal_alokasi || 0)}
                            </TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </div>
                </div>
              )}
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default DaftarPengeluaran;

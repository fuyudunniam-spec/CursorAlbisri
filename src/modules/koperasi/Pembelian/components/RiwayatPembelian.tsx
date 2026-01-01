import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Search, Eye, Trash2, Package, X, Calendar } from 'lucide-react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { format } from 'date-fns';
import { id as localeId } from 'date-fns/locale';

export default function RiwayatPembelian() {
  const [search, setSearch] = useState('');
  const [selectedPembelian, setSelectedPembelian] = useState<any>(null);
  const [isDetailOpen, setIsDetailOpen] = useState(false);
  const queryClient = useQueryClient();

  const { data: pembelianList = [], isLoading } = useQuery({
    queryKey: ['koperasi-pembelian', search],
    queryFn: async () => {
      let query = supabase
        .from('kop_pembelian')
        .select(`
          *,
          supplier:kop_supplier(nama_supplier)
        `)
        .order('tanggal', { ascending: false });

      if (search) {
        query = query.or(`nomor_faktur.ilike.%${search}%,supplier_nama.ilike.%${search}%`);
      }

      const { data, error } = await query;
      if (error) throw error;
      return data || [];
    },
  });

  // Fetch detail pembelian
  const { data: pembelianDetail } = useQuery({
    queryKey: ['koperasi-pembelian-detail', selectedPembelian?.id],
    queryFn: async () => {
      if (!selectedPembelian?.id) return null;

      const { data, error } = await supabase
        .from('kop_pembelian_detail')
        .select(`
          *,
          kop_barang!inner(
            id,
            kode_barang,
            nama_barang,
            satuan_dasar
          )
        `)
        .eq('pembelian_id', selectedPembelian.id)
        .order('created_at', { ascending: true });

      if (error) throw error;
      return data || [];
    },
    enabled: !!selectedPembelian?.id && isDetailOpen,
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from('kop_pembelian')
        .delete()
        .eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['koperasi-pembelian'] });
      toast.success('Pembelian berhasil dihapus');
    },
    onError: (error: any) => {
      toast.error(error.message || 'Gagal menghapus pembelian');
    },
  });

  const handleDelete = (id: string, nomor: string) => {
    if (confirm(`Hapus pembelian ${nomor}? Data detail dan pembayaran juga akan terhapus.`)) {
      deleteMutation.mutate(id);
    }
  };

  const handleViewDetail = (pembelian: any) => {
    setSelectedPembelian(pembelian);
    setIsDetailOpen(true);
  };

  const getStatusBadge = (status: string) => {
    const statusConfig: Record<string, { variant: any; className: string }> = {
      lunas: {
        variant: 'default',
        className: 'bg-green-100 text-green-700 border-green-200 hover:bg-green-100'
      },
      hutang: {
        variant: 'destructive',
        className: 'bg-red-100 text-red-700 border-red-200 hover:bg-red-100'
      },
      cicilan: {
        variant: 'secondary',
        className: 'bg-orange-100 text-orange-700 border-orange-200 hover:bg-orange-100'
      },
    };
    
    const config = statusConfig[status] || statusConfig.lunas;
    return (
      <Badge variant={config.variant} className={config.className}>
        {status.toUpperCase()}
      </Badge>
    );
  };

  return (
    <>
      <Card className="border border-gray-200 shadow-sm">
        <CardHeader className="border-b bg-gray-50/50">
          <div className="flex items-center gap-4">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground w-4 h-4" />
              <Input
                placeholder="Cari nomor faktur atau supplier..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="pl-10 h-10 bg-white"
              />
            </div>
          </div>
        </CardHeader>
        <CardContent className="p-0">
          {isLoading ? (
            <div className="text-center py-12">
              <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-gray-900"></div>
              <p className="text-sm text-gray-500 mt-2">Memuat data...</p>
            </div>
          ) : pembelianList.length === 0 ? (
            <div className="text-center py-16 text-muted-foreground">
              <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-gray-100 flex items-center justify-center">
                <Package className="w-8 h-8 text-gray-400" />
              </div>
              <p className="font-medium text-gray-900">Belum ada data pembelian</p>
              <p className="text-sm text-gray-500 mt-1">Mulai dengan membuat pembelian baru</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow className="bg-gray-50/50 hover:bg-gray-50/50">
                    <TableHead className="font-semibold text-gray-700">Tanggal</TableHead>
                    <TableHead className="font-semibold text-gray-700">No. Faktur</TableHead>
                    <TableHead className="font-semibold text-gray-700">Supplier</TableHead>
                    <TableHead className="text-right font-semibold text-gray-700">Total</TableHead>
                    <TableHead className="text-right font-semibold text-gray-700">Dibayar</TableHead>
                    <TableHead className="text-right font-semibold text-gray-700">Sisa</TableHead>
                    <TableHead className="text-center font-semibold text-gray-700">Status</TableHead>
                    <TableHead className="text-center font-semibold text-gray-700">Aksi</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {pembelianList.map((item: any) => (
                    <TableRow 
                      key={item.id} 
                      className="hover:bg-gray-50/50 transition-colors border-b border-gray-100"
                    >
                      <TableCell>
                        <div className="flex items-center gap-2">
                          <Calendar className="h-4 w-4 text-gray-400" />
                          <span className="text-sm">
                            {format(new Date(item.tanggal), 'dd MMM yyyy', { locale: localeId })}
                          </span>
                        </div>
                      </TableCell>
                      <TableCell>
                        <span className="font-mono text-sm font-semibold text-gray-900">
                          {item.nomor_faktur}
                        </span>
                      </TableCell>
                      <TableCell>
                        <span className="text-sm font-medium text-gray-900">
                          {item.supplier?.nama_supplier || item.supplier_nama || '-'}
                        </span>
                      </TableCell>
                      <TableCell className="text-right">
                        <span className="font-semibold text-gray-900">
                          Rp {Number(item.total_pembelian || 0).toLocaleString('id-ID')}
                        </span>
                      </TableCell>
                      <TableCell className="text-right">
                        <span className="text-sm text-green-600 font-medium">
                          Rp {Number(item.total_bayar || 0).toLocaleString('id-ID')}
                        </span>
                      </TableCell>
                      <TableCell className="text-right">
                        {item.sisa_hutang > 0 ? (
                          <span className="font-semibold text-red-600">
                            Rp {Number(item.sisa_hutang || 0).toLocaleString('id-ID')}
                          </span>
                        ) : (
                          <span className="text-sm text-gray-400">-</span>
                        )}
                      </TableCell>
                      <TableCell className="text-center">
                        {getStatusBadge(item.status_pembayaran || 'lunas')}
                      </TableCell>
                      <TableCell>
                        <div className="flex justify-center gap-1">
                          <Button 
                            size="sm" 
                            variant="ghost"
                            onClick={() => handleViewDetail(item)}
                            className="h-8 w-8 p-0 hover:bg-blue-50 hover:text-blue-600"
                            title="Lihat Detail"
                          >
                            <Eye className="w-4 h-4" />
                          </Button>
                          <Button
                            size="sm"
                            variant="ghost"
                            onClick={() => handleDelete(item.id, item.nomor_faktur)}
                            className="h-8 w-8 p-0 hover:bg-red-50 hover:text-red-600"
                            title="Hapus"
                          >
                            <Trash2 className="w-4 h-4" />
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Detail Dialog */}
      <Dialog open={isDetailOpen} onOpenChange={setIsDetailOpen}>
        <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
          <DialogHeader className="border-b pb-4">
            <div className="flex items-center justify-between">
              <div>
                <DialogTitle className="text-xl font-bold text-gray-900">Detail Pembelian</DialogTitle>
                <p className="text-sm text-gray-500 mt-1">Informasi lengkap transaksi pembelian</p>
              </div>
              <Button 
                variant="ghost" 
                size="icon" 
                onClick={() => setIsDetailOpen(false)}
                className="h-8 w-8"
              >
                <X className="h-4 w-4" />
              </Button>
            </div>
          </DialogHeader>
          
          {selectedPembelian && (
            <div className="space-y-6 pt-4">
              {/* Informasi Header */}
              <Card className="border border-gray-200 shadow-sm">
                <CardContent className="pt-6">
                  <div className="grid grid-cols-2 md:grid-cols-3 gap-6">
                    <div>
                      <p className="text-xs font-medium text-gray-500 uppercase tracking-wide mb-1">No. Faktur</p>
                      <p className="font-semibold font-mono text-gray-900">{selectedPembelian.nomor_faktur}</p>
                    </div>
                    <div>
                      <p className="text-xs font-medium text-gray-500 uppercase tracking-wide mb-1">Tanggal</p>
                      <p className="font-semibold text-gray-900">
                        {format(new Date(selectedPembelian.tanggal), 'dd MMMM yyyy', { locale: localeId })}
                      </p>
                    </div>
                    <div>
                      <p className="text-xs font-medium text-gray-500 uppercase tracking-wide mb-1">Supplier</p>
                      <p className="font-semibold text-gray-900">
                        {selectedPembelian.supplier?.nama_supplier || selectedPembelian.supplier_nama || '-'}
                      </p>
                    </div>
                    <div>
                      <p className="text-xs font-medium text-gray-500 uppercase tracking-wide mb-1">Status Pembayaran</p>
                      <div className="mt-1">
                        {getStatusBadge(selectedPembelian.status_pembayaran || 'lunas')}
                      </div>
                    </div>
                    {selectedPembelian.jatuh_tempo && (
                      <div>
                        <p className="text-xs font-medium text-gray-500 uppercase tracking-wide mb-1">Jatuh Tempo</p>
                        <p className="font-semibold text-red-600">
                          {format(new Date(selectedPembelian.jatuh_tempo), 'dd MMMM yyyy', { locale: localeId })}
                        </p>
                      </div>
                    )}
                  </div>
                </CardContent>
              </Card>

              {/* Daftar Item */}
              <Card className="border border-gray-200 shadow-sm">
                <CardHeader className="border-b bg-gray-50/50">
                  <CardTitle className="text-base font-semibold text-gray-900 flex items-center gap-2">
                    <Package className="h-4 w-4" />
                    Daftar Barang
                    {pembelianDetail && (
                      <Badge variant="outline" className="ml-2">
                        {pembelianDetail.length} item
                      </Badge>
                    )}
                  </CardTitle>
                </CardHeader>
                <CardContent className="p-0">
                  {pembelianDetail && pembelianDetail.length > 0 ? (
                    <div className="overflow-x-auto">
                      <Table>
                        <TableHeader>
                          <TableRow className="bg-gray-50/50 hover:bg-gray-50/50">
                            <TableHead className="font-semibold text-gray-700">Kode</TableHead>
                            <TableHead className="font-semibold text-gray-700">Nama Barang</TableHead>
                            <TableHead className="text-right font-semibold text-gray-700">Jumlah</TableHead>
                            <TableHead className="text-center font-semibold text-gray-700">Satuan</TableHead>
                            <TableHead className="text-right font-semibold text-gray-700">Harga Satuan</TableHead>
                            <TableHead className="text-right font-semibold text-gray-700">Subtotal</TableHead>
                          </TableRow>
                        </TableHeader>
                        <TableBody>
                          {pembelianDetail.map((detail: any) => (
                            <TableRow key={detail.id} className="hover:bg-gray-50/50">
                              <TableCell className="font-mono text-sm text-gray-600">
                                {detail.kop_barang?.kode_barang || '-'}
                              </TableCell>
                              <TableCell className="font-medium text-gray-900">
                                {detail.kop_barang?.nama_barang || 'Barang tidak ditemukan'}
                              </TableCell>
                              <TableCell className="text-right font-semibold text-gray-900">
                                {detail.jumlah}
                              </TableCell>
                              <TableCell className="text-center text-sm text-gray-600">
                                {detail.kop_barang?.satuan_dasar || 'pcs'}
                              </TableCell>
                              <TableCell className="text-right text-sm text-gray-700">
                                Rp {Number(detail.harga_satuan_beli || 0).toLocaleString('id-ID')}
                              </TableCell>
                              <TableCell className="text-right font-semibold text-gray-900">
                                Rp {Number(detail.subtotal || 0).toLocaleString('id-ID')}
                              </TableCell>
                            </TableRow>
                          ))}
                        </TableBody>
                      </Table>
                    </div>
                  ) : (
                    <div className="text-center py-12 text-gray-500">
                      <div className="w-12 h-12 mx-auto mb-3 rounded-full bg-gray-100 flex items-center justify-center">
                        <Package className="h-6 w-6 text-gray-400" />
                      </div>
                      <p className="text-sm">Memuat detail...</p>
                    </div>
                  )}
                </CardContent>
              </Card>

              {/* Summary */}
              {selectedPembelian && (
                <Card className="bg-gradient-to-br from-blue-50/50 via-indigo-50/30 to-white border border-blue-100 shadow-sm">
                  <CardContent className="pt-6">
                    <div className="space-y-3">
                      <div className="flex justify-between items-center text-sm">
                        <span className="text-gray-600 font-medium">Subtotal Barang:</span>
                        <span className="font-semibold text-gray-900">
                          Rp {(
                            (pembelianDetail || []).reduce((sum: number, d: any) => sum + Number(d.subtotal || 0), 0)
                          ).toLocaleString('id-ID')}
                        </span>
                      </div>
                      {selectedPembelian.ongkir > 0 && (
                        <div className="flex justify-between items-center text-sm">
                          <span className="text-gray-600 font-medium">Ongkir:</span>
                          <span className="font-semibold text-gray-900">Rp {Number(selectedPembelian.ongkir || 0).toLocaleString('id-ID')}</span>
                        </div>
                      )}
                      <div className="border-t border-blue-200 pt-4 flex justify-between items-center">
                        <span className="text-lg font-bold text-gray-900">Total Pembelian:</span>
                        <span className="text-2xl font-bold text-blue-600">
                          Rp {Number(selectedPembelian.total_pembelian || 0).toLocaleString('id-ID')}
                        </span>
                      </div>
                      {selectedPembelian.status_pembayaran !== 'lunas' && (
                        <div className="pt-4 border-t border-blue-200 space-y-2">
                          <div className="flex justify-between items-center text-sm">
                            <span className="text-gray-600 font-medium">Total Dibayar:</span>
                            <span className="font-semibold text-green-600">
                              Rp {Number(selectedPembelian.total_bayar || 0).toLocaleString('id-ID')}
                            </span>
                          </div>
                          <div className="flex justify-between items-center text-sm">
                            <span className="text-gray-600 font-medium">Sisa Hutang:</span>
                            <span className="font-semibold text-red-600">
                              Rp {Number(selectedPembelian.sisa_hutang || 0).toLocaleString('id-ID')}
                            </span>
                          </div>
                        </div>
                      )}
                    </div>
                  </CardContent>
                </Card>
              )}
            </div>
          )}
        </DialogContent>
      </Dialog>
    </>
  );
}























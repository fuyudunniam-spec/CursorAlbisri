import React from 'react';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { 
  TrendingUp, 
  TrendingDown, 
  RefreshCw,
  ChevronLeft,
  ChevronRight,
  ArrowUpDown,
  Eye,
  ExternalLink
} from 'lucide-react';
import { InventoryTransaction, Pagination, Sort } from '@/types/inventaris.types';

interface TransactionListProps {
  data: InventoryTransaction[];
  isLoading: boolean;
  pagination: Pagination;
  onPaginationChange: (pagination: Pagination) => void;
  sort: Sort;
  onSortChange: (sort: Sort) => void;
}

const TransactionList: React.FC<TransactionListProps> = ({
  data,
  isLoading,
  pagination,
  onPaginationChange,
  sort,
  onSortChange
}) => {
  const formatRupiah = (amount: number) => {
    return new Intl.NumberFormat('id-ID', {
      style: 'currency',
      currency: 'IDR',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0
    }).format(amount);
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('id-ID', {
      day: 'numeric',
      month: 'short',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  const getTipeIcon = (tipe: string) => {
    switch (tipe) {
      case 'Masuk': return <TrendingUp className="h-4 w-4 text-green-600" />;
      case 'Keluar': return <TrendingDown className="h-4 w-4 text-red-600" />;
      case 'Stocktake': return <RefreshCw className="h-4 w-4 text-blue-600" />;
      default: return null;
    }
  };

  const getTipeBadge = (tipe: string) => {
    const variants = {
      'Masuk': 'default',
      'Keluar': 'destructive',
      'Stocktake': 'secondary'
    } as const;

    return (
      <Badge variant={variants[tipe as keyof typeof variants] || 'default'}>
        {tipe}
      </Badge>
    );
  };

  const getKeluarModeBadge = (keluarMode: string) => {
    const variants = {
      'Penjualan': 'default',
      'Distribusi': 'outline'
    } as const;

    return (
      <Badge variant={variants[keluarMode as keyof typeof variants] || 'outline'}>
        {keluarMode}
      </Badge>
    );
  };

  const handleSort = (column: string) => {
    const newDirection = sort?.column === column && sort?.direction === 'asc' ? 'desc' : 'asc';
    onSortChange({ column, direction: newDirection });
  };

  const handlePageChange = (newPage: number) => {
    onPaginationChange({ ...pagination, page: newPage });
  };

  const handleViewKeuangan = (keuanganId: string) => {
    // TODO: Navigate to keuangan detail or open modal
    console.log('View keuangan:', keuanganId);
  };

  if (isLoading) {
    return (
      <Card>
        <CardContent className="p-6">
          <div className="space-y-4">
            {[...Array(5)].map((_, i) => (
              <div key={i} className="h-16 bg-gray-200 rounded animate-pulse" />
            ))}
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <History className="h-5 w-5" />
          Daftar Transaksi ({data.length})
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead 
                  className="cursor-pointer hover:bg-gray-50"
                  onClick={() => handleSort('tanggal')}
                >
                  <div className="flex items-center gap-1">
                    Tanggal
                    <ArrowUpDown className="h-4 w-4" />
                  </div>
                </TableHead>
                <TableHead>Tipe</TableHead>
                <TableHead>Item</TableHead>
                <TableHead>Jumlah</TableHead>
                <TableHead>Penerima</TableHead>
                <TableHead>Nilai</TableHead>
                <TableHead>Keuangan</TableHead>
                <TableHead className="text-right">Aksi</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {data.map((transaction) => (
                <TableRow key={transaction.id}>
                  <TableCell>
                    <div className="flex items-center gap-2">
                      {getTipeIcon(transaction.tipe)}
                      <div>
                        <div className="font-medium">{formatDate(transaction.tanggal)}</div>
                        <div className="text-sm text-muted-foreground">
                          {transaction.created_at ? formatDate(transaction.created_at) : ''}
                        </div>
                      </div>
                    </div>
                  </TableCell>
                  <TableCell>
                    <div className="space-y-1">
                      {getTipeBadge(transaction.tipe)}
                      {transaction.keluar_mode && (
                        <div>{getKeluarModeBadge(transaction.keluar_mode)}</div>
                      )}
                    </div>
                  </TableCell>
                  <TableCell>
                    <div>
                      <div className="font-medium">{transaction.nama_barang || 'Item tidak ditemukan'}</div>
                      <div className="text-sm text-muted-foreground">
                        {transaction.kategori_barang || transaction.kategori}
                      </div>
                    </div>
                  </TableCell>
                  <TableCell>
                    <div className="font-medium">
                      {transaction.jumlah || 0} {transaction.satuan || 'unit'}
                    </div>
                    {transaction.before_qty !== null && transaction.after_qty !== null && (
                      <div className="text-sm text-muted-foreground">
                        {transaction.before_qty} → {transaction.after_qty}
                      </div>
                    )}
                  </TableCell>
                  <TableCell>
                    {transaction.penerima ? (
                      <div>
                        <div className="font-medium">{transaction.penerima}</div>
                        {transaction.penerima_santri_id && (
                          <div className="text-sm text-muted-foreground">
                            ID: {transaction.penerima_santri_id}
                          </div>
                        )}
                      </div>
                    ) : (
                      <span className="text-muted-foreground">-</span>
                    )}
                  </TableCell>
                  <TableCell>
                    {transaction.harga_satuan ? (
                      <div>
                        <div className="font-medium">
                          {formatRupiah(transaction.harga_satuan)}/unit
                        </div>
                        {transaction.total_nilai && (
                          <div className="text-sm text-muted-foreground">
                            Total: {formatRupiah(transaction.total_nilai)}
                          </div>
                        )}
                      </div>
                    ) : (
                      <span className="text-muted-foreground">-</span>
                    )}
                  </TableCell>
                  <TableCell>
                    {transaction.keuangan_id ? (
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => handleViewKeuangan(transaction.keuangan_id!)}
                        className="text-blue-600 hover:text-blue-700"
                      >
                        <ExternalLink className="h-4 w-4 mr-1" />
                        Lihat
                      </Button>
                    ) : (
                      <span className="text-muted-foreground">-</span>
                    )}
                  </TableCell>
                  <TableCell className="text-right">
                    <Button size="sm" variant="outline">
                      <Eye className="h-4 w-4" />
                    </Button>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>

        {/* Pagination */}
        <div className="flex items-center justify-between mt-4">
          <div className="text-sm text-muted-foreground">
            Menampilkan {((pagination.page - 1) * pagination.pageSize) + 1} - {Math.min(pagination.page * pagination.pageSize, data.length)} dari {data.length} transaksi
          </div>
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => handlePageChange(pagination.page - 1)}
              disabled={pagination.page <= 1}
            >
              <ChevronLeft className="h-4 w-4" />
              Sebelumnya
            </Button>
            <span className="text-sm">
              Halaman {pagination.page}
            </span>
            <Button
              variant="outline"
              size="sm"
              onClick={() => handlePageChange(pagination.page + 1)}
              disabled={data.length < pagination.pageSize}
            >
              Selanjutnya
              <ChevronRight className="h-4 w-4" />
            </Button>
          </div>
        </div>
      </CardContent>
    </Card>
  );
};

export default TransactionList;

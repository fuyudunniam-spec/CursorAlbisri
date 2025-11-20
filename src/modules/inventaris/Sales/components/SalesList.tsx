import React from 'react';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { 
  ShoppingCart, 
  ChevronLeft,
  ChevronRight,
  ArrowUpDown,
  Eye,
  ExternalLink,
  DollarSign,
  Heart
} from 'lucide-react';
import { SalesTransaction, Pagination, Sort } from '@/types/sales.types';

interface SalesListProps {
  data: SalesTransaction[];
  isLoading: boolean;
  pagination: Pagination;
  onPaginationChange: (pagination: Pagination) => void;
  sort: Sort;
  onSortChange: (sort: Sort) => void;
}

const SalesList: React.FC<SalesListProps> = ({
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

  const getKategoriBadge = (kategori: string) => {
    const variants = {
      'Elektronik & IT': 'default',
      'Furniture': 'secondary',
      'Alat Tulis & Kantor': 'outline',
      'Peralatan Dapur': 'destructive',
      'Peralatan Olahraga': 'default',
      'Buku & Perpustakaan': 'secondary',
      'Peralatan Kebersihan': 'outline',
      'Peralatan Medis': 'destructive',
      'Kendaraan': 'default',
      'Lainnya': 'secondary'
    } as const;

    return (
      <Badge variant={variants[kategori as keyof typeof variants] || 'outline'}>
        {kategori}
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
          <ShoppingCart className="h-5 w-5" />
          Daftar Penjualan ({data.length})
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
                <TableHead>Item</TableHead>
                <TableHead>Pembeli</TableHead>
                <TableHead>Jumlah</TableHead>
                <TableHead>Harga Breakdown</TableHead>
                <TableHead>Total</TableHead>
                <TableHead>Keuangan</TableHead>
                <TableHead className="text-right">Aksi</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {data.map((sale) => (
                <TableRow key={sale.id}>
                  <TableCell>
                    <div>
                      <div className="font-medium">{formatDate(sale.tanggal)}</div>
                      <div className="text-sm text-muted-foreground">
                        {formatDate(sale.created_at)}
                      </div>
                    </div>
                  </TableCell>
                  <TableCell>
                    <div>
                      <div className="font-medium">{sale.nama_barang}</div>
                      <div className="flex items-center gap-2 mt-1">
                        {getKategoriBadge(sale.kategori)}
                      </div>
                    </div>
                  </TableCell>
                  <TableCell>
                    <div className="font-medium">{sale.pembeli}</div>
                  </TableCell>
                  <TableCell>
                    <div className="font-medium">
                      {sale.jumlah} unit
                    </div>
                  </TableCell>
                  <TableCell>
                    <div className="space-y-1">
                      <div className="flex items-center gap-1 text-sm">
                        <DollarSign className="h-3 w-3 text-green-600" />
                        <span>Dasar: {formatRupiah(sale.harga_dasar)}/unit</span>
                      </div>
                      {sale.sumbangan > 0 && (
                        <div className="flex items-center gap-1 text-sm text-blue-600">
                          <Heart className="h-3 w-3" />
                          <span>Sumbangan: {formatRupiah(sale.sumbangan)}</span>
                        </div>
                      )}
                      <div className="text-xs text-muted-foreground">
                        Satuan: {formatRupiah(sale.harga_satuan)}
                      </div>
                    </div>
                  </TableCell>
                  <TableCell>
                    <div className="font-medium text-green-600">
                      {formatRupiah(sale.total_nilai)}
                    </div>
                  </TableCell>
                  <TableCell>
                    {sale.keuangan_id ? (
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => handleViewKeuangan(sale.keuangan_id!)}
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
            Menampilkan {((pagination.page - 1) * pagination.pageSize) + 1} - {Math.min(pagination.page * pagination.pageSize, data.length)} dari {data.length} penjualan
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

export default SalesList;

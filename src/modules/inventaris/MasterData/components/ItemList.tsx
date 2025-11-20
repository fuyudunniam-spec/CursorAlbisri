import React from 'react';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { 
  Edit, 
  Trash2, 
  Package, 
  AlertTriangle, 
  Clock,
  ChevronLeft,
  ChevronRight,
  ArrowUpDown
} from 'lucide-react';
import { InventoryItem, Pagination, Sort } from '@/types/inventaris.types';

interface ItemListProps {
  data: InventoryItem[];
  isLoading: boolean;
  onEdit: (item: InventoryItem) => void;
  onDelete?: (item: InventoryItem) => void;
  pagination: Pagination;
  onPaginationChange: (pagination: Pagination) => void;
  sort: Sort;
  onSortChange: (sort: Sort) => void;
}

const ItemList: React.FC<ItemListProps> = ({
  data,
  isLoading,
  onEdit,
  onDelete,
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

  const getKondisiBadge = (kondisi: string) => {
    const variants = {
      'Baik': 'default',
      'Rusak Ringan': 'secondary',
      'Perlu Perbaikan': 'destructive',
      'Rusak Berat': 'destructive'
    } as const;

    return (
      <Badge variant={variants[kondisi as keyof typeof variants] || 'default'}>
        {kondisi}
      </Badge>
    );
  };

  const getTipeBadge = (tipe: string) => {
    return (
      <Badge variant={tipe === 'Aset' ? 'default' : 'outline'}>
        {tipe}
      </Badge>
    );
  };

  const getStockStatus = (jumlah: number, minStock: number) => {
    if (jumlah === 0) {
      return <Badge variant="destructive" className="gap-1"><AlertTriangle className="h-3 w-3" />Habis</Badge>;
    }
    if (jumlah <= minStock) {
      return <Badge variant="secondary" className="gap-1"><AlertTriangle className="h-3 w-3" />Rendah</Badge>;
    }
    return <Badge variant="default">Normal</Badge>;
  };

  const handleSort = (column: string) => {
    const newDirection = sort?.column === column && sort?.direction === 'asc' ? 'desc' : 'asc';
    onSortChange({ column, direction: newDirection });
  };

  const handlePageChange = (newPage: number) => {
    onPaginationChange({ ...pagination, page: newPage });
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
          <Package className="h-5 w-5" />
          Daftar Items ({data.length})
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead 
                  className="cursor-pointer hover:bg-gray-50"
                  onClick={() => handleSort('nama_barang')}
                >
                  <div className="flex items-center gap-1">
                    Nama Barang
                    <ArrowUpDown className="h-4 w-4" />
                  </div>
                </TableHead>
                <TableHead>Tipe</TableHead>
                <TableHead>Kategori</TableHead>
                <TableHead>Lokasi</TableHead>
                <TableHead>Kondisi</TableHead>
                <TableHead 
                  className="cursor-pointer hover:bg-gray-50"
                  onClick={() => handleSort('jumlah')}
                >
                  <div className="flex items-center gap-1">
                    Stok
                    <ArrowUpDown className="h-4 w-4" />
                  </div>
                </TableHead>
                <TableHead>Status Stok</TableHead>
                <TableHead>Harga</TableHead>
                <TableHead>Expiry</TableHead>
                <TableHead className="text-right">Aksi</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {data.map((item) => (
                <TableRow key={item.id}>
                  <TableCell className="font-medium">
                    <div>
                      <div className="font-semibold">{item.nama_barang}</div>
                      {item.supplier && (
                        <div className="text-sm text-muted-foreground">
                          Supplier: {item.supplier}
                        </div>
                      )}
                    </div>
                  </TableCell>
                  <TableCell>{getTipeBadge(item.tipe_item)}</TableCell>
                  <TableCell>{item.kategori}</TableCell>
                  <TableCell>
                    <div>
                      <div className="font-medium">{item.zona}</div>
                      <div className="text-sm text-muted-foreground">{item.lokasi}</div>
                    </div>
                  </TableCell>
                  <TableCell>{getKondisiBadge(item.kondisi)}</TableCell>
                  <TableCell>
                    <div className="font-medium">
                      {item.jumlah || 0} {item.satuan}
                    </div>
                  </TableCell>
                  <TableCell>
                    {getStockStatus(item.jumlah || 0, item.min_stock || 10)}
                  </TableCell>
                  <TableCell>
                    {item.harga_perolehan ? formatRupiah(item.harga_perolehan) : '-'}
                  </TableCell>
                  <TableCell>
                    {item.has_expiry && item.tanggal_kedaluwarsa ? (
                      <div className="flex items-center gap-1">
                        <Clock className="h-3 w-3" />
                        <span className="text-sm">
                          {new Date(item.tanggal_kedaluwarsa).toLocaleDateString('id-ID')}
                        </span>
                      </div>
                    ) : (
                      '-'
                    )}
                  </TableCell>
                  <TableCell className="text-right">
                    <div className="flex justify-end gap-1">
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => onEdit(item)}
                      >
                        <Edit className="h-4 w-4" />
                      </Button>
                      {onDelete && (
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => onDelete(item)}
                          className="text-red-600 hover:text-red-700"
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      )}
                    </div>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>

        {/* Pagination */}
        <div className="flex items-center justify-between mt-4">
          <div className="text-sm text-muted-foreground">
            Menampilkan {((pagination.page - 1) * pagination.pageSize) + 1} - {Math.min(pagination.page * pagination.pageSize, data.length)} dari {data.length} item
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

export default ItemList;

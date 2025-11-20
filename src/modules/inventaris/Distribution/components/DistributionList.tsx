import React from 'react';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { 
  Users, 
  ChevronLeft,
  ChevronRight,
  ArrowUpDown,
  Eye,
  User,
  Building,
  Package
} from 'lucide-react';
import { DistributionTransaction, Pagination, Sort } from '@/types/distribution.types';

interface DistributionListProps {
  data: DistributionTransaction[];
  isLoading: boolean;
  pagination: Pagination;
  onPaginationChange: (pagination: Pagination) => void;
  sort: Sort;
  onSortChange: (sort: Sort) => void;
}

const DistributionList: React.FC<DistributionListProps> = ({
  data,
  isLoading,
  pagination,
  onPaginationChange,
  sort,
  onSortChange
}) => {
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

  const getRecipientIcon = (penerima: string, penerimaSantriId?: string) => {
    if (penerimaSantriId) {
      return <User className="h-4 w-4 text-blue-600" />;
    }
    if (penerima.includes('Kelas') || penerima.includes('Unit')) {
      return <Building className="h-4 w-4 text-green-600" />;
    }
    return <Users className="h-4 w-4 text-gray-600" />;
  };

  const getRecipientType = (penerima: string, penerimaSantriId?: string) => {
    if (penerimaSantriId) {
      return 'Santri';
    }
    if (penerima.includes('Kelas') || penerima.includes('Unit')) {
      return 'Unit/Kelas';
    }
    return 'Manual';
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
          <Users className="h-5 w-5" />
          Daftar Distribusi ({data.length})
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
                <TableHead>Penerima</TableHead>
                <TableHead>Jumlah</TableHead>
                <TableHead>Catatan</TableHead>
                <TableHead className="text-right">Aksi</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {data.map((distribution) => (
                <TableRow key={distribution.id}>
                  <TableCell>
                    <div>
                      <div className="font-medium">{formatDate(distribution.tanggal)}</div>
                      <div className="text-sm text-muted-foreground">
                        {formatDate(distribution.created_at)}
                      </div>
                    </div>
                  </TableCell>
                  <TableCell>
                    <div>
                      <div className="font-medium">{distribution.nama_barang}</div>
                      <div className="flex items-center gap-2 mt-1">
                        {getKategoriBadge(distribution.kategori)}
                      </div>
                    </div>
                  </TableCell>
                  <TableCell>
                    <div className="flex items-center gap-2">
                      {getRecipientIcon(distribution.penerima, distribution.penerima_santri_id)}
                      <div>
                        <div className="font-medium">{distribution.penerima}</div>
                        <div className="text-sm text-muted-foreground">
                          {getRecipientType(distribution.penerima, distribution.penerima_santri_id)}
                        </div>
                        {distribution.penerima_santri_id && (
                          <div className="text-xs text-blue-600">
                            ID: {distribution.penerima_santri_id}
                          </div>
                        )}
                      </div>
                    </div>
                  </TableCell>
                  <TableCell>
                    <div className="font-medium">
                      {distribution.jumlah} unit
                    </div>
                  </TableCell>
                  <TableCell>
                    {distribution.catatan ? (
                      <div className="text-sm text-muted-foreground max-w-xs truncate">
                        {distribution.catatan}
                      </div>
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
            Menampilkan {((pagination.page - 1) * pagination.pageSize) + 1} - {Math.min(pagination.page * pagination.pageSize, data.length)} dari {data.length} distribusi
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

export default DistributionList;
